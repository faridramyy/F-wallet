import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "react-oidc-context";
import {
  Plus,
  Receipt,
  Search,
  ShoppingBasket,
  Store,
  TrendingDown,
} from "lucide-react";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Spinner } from "../components/ui/spinner";
import { TabBar } from "../components/ui/tab-bar";
import { EmptyState } from "../components/ui/empty-state";
import { CountLabel, PageToolbar } from "../components/common/PageToolbar";
import { BestPriceList } from "../components/groceries/BestPriceList";
import { PriceLog } from "../components/groceries/PriceLog";
import { ManageList } from "../components/groceries/ManageList";
import { PriceDialog } from "../components/groceries/PriceDialog";
import { ProductDialog } from "../components/groceries/ProductDialog";
import { StoreDialog } from "../components/groceries/StoreDialog";
import { useNotifications } from "../components/providers/useNotifications";
import { useAppData } from "../components/providers/useAppData";
import { createApi } from "../lib/api";
import { replaceById, removeById } from "../lib/collections";
import { formatCents } from "../lib/formatters";
import { getUnitKind, productLabel, summarizePrices } from "../lib/groceries";

// Newest first, the order the API returns.
const sortPrices = (list) =>
  [...list].sort(
    (a, b) =>
      b.observed_on.localeCompare(a.observed_on) ||
      b.created_at.localeCompare(a.created_at),
  );

const byName = (key) => (a, b) => a[key].localeCompare(b[key]);

// Grocery data is only needed on this page, so it is loaded here (once per
// visit) instead of with the rest of the app's data after sign-in.
function useGroceryData(api) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const apiRef = useRef(api);

  useEffect(() => {
    let cancelled = false;

    apiRef.current
      .get("/groceries")
      .then(({ data: result }) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Unable to load groceries.");
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = () => {
    setError(null);
    setReloadKey((key) => key + 1);
  };

  return { data, setData, error, reload };
}

export function GroceriesPage() {
  const api = createApi(useAuth());
  const { toast, confirm } = useNotifications();
  const { currency } = useAppData();
  const { data, setData, error, reload } = useGroceryData(api);

  const [activeTab, setActiveTab] = useState("best");
  const [search, setSearch] = useState("");
  // null = closed, { item? , defaults? } = open
  const [priceDialog, setPriceDialog] = useState(null);
  const [productDialog, setProductDialog] = useState(null);
  const [storeDialog, setStoreDialog] = useState(null);

  const stores = useMemo(() => data?.stores ?? [], [data]);
  const products = useMemo(() => data?.products ?? [], [data]);
  const prices = useMemo(() => data?.prices ?? [], [data]);

  const productById = useMemo(
    () => new Map(products.map((p) => [p.product_id, p])),
    [products],
  );
  const storeById = useMemo(
    () => new Map(stores.map((s) => [s.store_id, s])),
    [stores],
  );
  const summaries = useMemo(() => summarizePrices(prices), [prices]);

  const storeName = (id) => storeById.get(id)?.store_name ?? "Unknown store";

  const query = search.trim().toLowerCase();
  const matches = (...texts) =>
    !query || texts.some((text) => text?.toLowerCase().includes(query));

  const activeProducts = products.filter((p) => !p.is_archived);
  const activeStores = stores.filter((s) => !s.is_archived);

  const visibleProducts = activeProducts.filter((p) =>
    matches(p.product_name, p.brand),
  );
  const visiblePrices = prices.filter((price) => {
    const product = productById.get(price.product_id);
    return matches(
      product?.product_name,
      product?.brand,
      storeName(price.store_id),
    );
  });

  // Replaces one list inside the loaded data.
  const update = (key, change) =>
    setData((current) => ({ ...current, [key]: change(current[key]) }));

  // ------------------------------------------------------------- prices

  function openLogPrice(defaults = {}) {
    if (activeProducts.length === 0) {
      return toast.error("Add a product first.");
    }
    if (activeStores.length === 0) {
      return toast.error("Add a store first.");
    }
    setPriceDialog({ defaults });
  }

  async function handleSavePrice(body) {
    const editing = priceDialog?.item;

    if (editing) {
      const { data: result } = await api.patch(
        `/groceries/prices/${editing.price_id}`,
        body,
      );
      update("prices", (list) =>
        sortPrices(replaceById(list, "price_id", result.price)),
      );
    } else {
      const { data: result } = await api.post("/groceries/prices", body);
      update("prices", (list) => sortPrices([result.price, ...list]));
    }
  }

  async function handleDeletePrice(price) {
    const product = productById.get(price.product_id);
    const confirmed = await confirm({
      title: "Delete price?",
      description: `Delete the ${formatCents(price.price_cents, currency)} price of "${productLabel(product)}" at ${storeName(price.store_id)}? This can't be undone.`,
      confirmText: "Delete price",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      await api.delete(`/groceries/prices/${price.price_id}`);
      update("prices", (list) => removeById(list, "price_id", price.price_id));
      toast.success("Price deleted.");
    } catch (err) {
      toast.error(err.message || "Unable to delete price.");
    }
  }

  // ------------------------------------------- products and stores

  // Save / archive / restore for products and stores, which work the same.
  const manage = ({ key, path, idKey, nameKey, noun, dialog, sortKey }) => ({
    async save(body) {
      const editing = dialog?.item;
      const { data: result } = editing
        ? await api.patch(`/groceries/${path}/${editing[idKey]}`, body)
        : await api.post(`/groceries/${path}`, body);

      const saved = result[noun];
      update(key, (list) =>
        (editing ? replaceById(list, idKey, saved) : [...list, saved]).sort(
          byName(sortKey),
        ),
      );
    },

    async archive(item) {
      const confirmed = await confirm({
        title: `Archive ${noun}?`,
        description: `"${item[nameKey]}" will be hidden and can't get new prices. Its old prices are kept, and you can restore it later.`,
        confirmText: `Archive ${noun}`,
        variant: "destructive",
      });

      if (!confirmed) return;

      try {
        const { data: result } = await api.delete(
          `/groceries/${path}/${item[idKey]}`,
        );
        update(key, (list) => replaceById(list, idKey, result[noun]));
        toast.success(`${noun[0].toUpperCase()}${noun.slice(1)} archived.`);
      } catch (err) {
        toast.error(err.message || `Unable to archive ${noun}.`);
      }
    },

    async restore(item) {
      try {
        const { data: result } = await api.post(
          `/groceries/${path}/${item[idKey]}/restore`,
        );
        update(key, (list) => replaceById(list, idKey, result[noun]));
        toast.success(`${noun[0].toUpperCase()}${noun.slice(1)} restored.`);
      } catch (err) {
        toast.error(err.message || `Unable to restore ${noun}.`);
      }
    },
  });

  const productActions = manage({
    key: "products",
    path: "products",
    idKey: "product_id",
    nameKey: "product_name",
    noun: "product",
    dialog: productDialog,
    sortKey: "product_name",
  });

  const storeActions = manage({
    key: "stores",
    path: "stores",
    idKey: "store_id",
    nameKey: "store_name",
    noun: "store",
    dialog: storeDialog,
    sortKey: "store_name",
  });

  // ------------------------------------------------------------ render

  if (error) {
    return (
      <EmptyState
        icon={ShoppingBasket}
        title="We couldn't load your groceries"
        description={error}
      >
        <Button variant="outline" onClick={reload}>
          Try again
        </Button>
      </EmptyState>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const tabActions = {
    best: (
      <Button onClick={() => openLogPrice()}>
        <Plus />
        Log price
      </Button>
    ),
    log: (
      <Button onClick={() => openLogPrice()}>
        <Plus />
        Log price
      </Button>
    ),
    products: (
      <Button onClick={() => setProductDialog({})}>
        <Plus />
        New product
      </Button>
    ),
    stores: (
      <Button onClick={() => setStoreDialog({})}>
        <Plus />
        New store
      </Button>
    ),
  };

  const showSearch = activeTab === "best" || activeTab === "log";

  return (
    <div className="space-y-6">
      <PageToolbar actions={tabActions[activeTab]}>
        <TabBar
          variant="segmented"
          aria-label="Groceries view"
          value={activeTab}
          onValueChange={setActiveTab}
          className="lg:w-auto"
          items={[
            { value: "best", icon: TrendingDown, label: "Best prices" },
            {
              value: "log",
              icon: Receipt,
              label: <CountLabel label="Log" count={prices.length} />,
            },
            {
              value: "products",
              icon: ShoppingBasket,
              label: (
                <CountLabel label="Products" count={activeProducts.length} />
              ),
            },
            {
              value: "stores",
              icon: Store,
              label: <CountLabel label="Stores" count={activeStores.length} />,
            },
          ]}
        />

        {showSearch && (
          <div className="relative lg:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products or stores"
              aria-label="Search products or stores"
              className="pl-8"
            />
          </div>
        )}
      </PageToolbar>

      {activeTab === "best" && (
        <BestPriceList
          products={visibleProducts}
          summaries={summaries}
          storeName={storeName}
          currency={currency}
          onLogPrice={(product) =>
            openLogPrice({ product_id: product.product_id })
          }
          onAddProduct={() => setProductDialog({})}
        />
      )}

      {activeTab === "log" && (
        <PriceLog
          prices={visiblePrices}
          productById={productById}
          storeName={storeName}
          currency={currency}
          onEdit={(price) => setPriceDialog({ item: price })}
          onDelete={handleDeletePrice}
        />
      )}

      {activeTab === "products" && (
        <ManageList
          noun="product"
          emptyIcon={ShoppingBasket}
          emptyText="Add the things you buy, like milk, eggs or chicken."
          onEdit={(product) => setProductDialog({ item: product })}
          onArchive={productActions.archive}
          onRestore={productActions.restore}
          items={products.map((product) => ({
            id: product.product_id,
            title: product.product_name,
            subtitle: [
              product.brand,
              `Measured by ${getUnitKind(product.unit_kind).label.toLowerCase()}`,
            ]
              .filter(Boolean)
              .join(" · "),
            archived: product.is_archived,
            archivedAt: product.archived_at,
            source: product,
          }))}
        />
      )}

      {activeTab === "stores" && (
        <ManageList
          noun="store"
          emptyIcon={Store}
          emptyText="Add the stores where you shop."
          onEdit={(store) => setStoreDialog({ item: store })}
          onArchive={storeActions.archive}
          onRestore={storeActions.restore}
          items={stores.map((store) => ({
            id: store.store_id,
            title: store.store_name,
            subtitle: store.location,
            archived: store.is_archived,
            archivedAt: store.archived_at,
            source: store,
          }))}
        />
      )}

      <PriceDialog
        open={priceDialog !== null}
        price={priceDialog?.item ?? null}
        defaults={priceDialog?.defaults}
        products={products}
        stores={stores}
        currency={currency}
        onClose={() => setPriceDialog(null)}
        onSave={handleSavePrice}
      />

      <ProductDialog
        open={productDialog !== null}
        product={productDialog?.item ?? null}
        onClose={() => setProductDialog(null)}
        onSave={productActions.save}
      />

      <StoreDialog
        open={storeDialog !== null}
        store={storeDialog?.item ?? null}
        onClose={() => setStoreDialog(null)}
        onSave={storeActions.save}
      />
    </div>
  );
}
