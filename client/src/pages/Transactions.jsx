import { useMemo, useState } from "react";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
} from "date-fns";
import { toast } from "sonner";
import {
  Search,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Plus,
  FilterX,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  Receipt,
  X,
  SlidersHorizontal,
} from "lucide-react";

import { useApp } from "../store";
import { PageHeader } from "../components/PageHeader";
import { describePay } from "../lib/calc";
import { money, formatDate, formatHours, fold } from "../lib/format";
import TransactionModal from "../modals/TransactionModal";
import TransferModal from "../modals/TransferModal";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export default function Transactions({ onEdit }) {
  const {
    accounts,
    categories,
    transactions,
    currency,
    deleteTransaction,
    getAccountName,
    getCategoryName,
  } = useApp();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateRange, setDateRange] = useState({
    from: undefined,
    to: undefined,
  });

  const [showModal, setShowModal] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  const fmt = (value) => money(value, { currency });

  // Group accounts by type for the grouped select menu
  const groupedAccounts = useMemo(() => {
    const groups = {};
    accounts.forEach((acc) => {
      const type = acc.type || "Other";
      if (!groups[type]) groups[type] = [];
      groups[type].push(acc);
    });
    return groups;
  }, [accounts]);

  // Group categories by type/kind for the grouped select menu
  const groupedCategories = useMemo(() => {
    const groups = {};
    categories.forEach((cat) => {
      const type = cat.type || "General";
      if (!groups[type]) groups[type] = [];
      groups[type].push(cat);
    });
    return groups;
  }, [categories]);

  const filtered = useMemo(() => {
    const term = fold(search.trim());

    return transactions
      .filter((transaction) => {
        if (typeFilter !== "all" && transaction.type !== typeFilter)
          return false;

        if (accountFilter !== "all") {
          const matches =
            transaction.accountId === accountFilter ||
            transaction.fromAccountId === accountFilter ||
            transaction.toAccountId === accountFilter;

          if (!matches) return false;
        }

        if (
          categoryFilter !== "all" &&
          transaction.categoryId !== categoryFilter
        )
          return false;

        if (dateRange?.from) {
          const fromStr = format(dateRange.from, "yyyy-MM-dd");
          if (String(transaction.date) < fromStr) return false;
        }

        if (dateRange?.to) {
          const toStr = format(dateRange.to, "yyyy-MM-dd");
          if (String(transaction.date) > toStr) return false;
        }

        if (term) {
          const haystack = [
            transaction.notes,
            getCategoryName(transaction.categoryId),
            getAccountName(transaction.accountId),
            getAccountName(transaction.fromAccountId),
            getAccountName(transaction.toAccountId),
            String(transaction.amount),
          ];

          if (!fold(haystack.join(" ")).includes(term)) return false;
        }

        return true;
      })
      .sort((a, b) =>
        a.date === b.date
          ? (b.createdAt || "").localeCompare(a.createdAt || "")
          : b.date.localeCompare(a.date),
      );
  }, [
    transactions,
    search,
    typeFilter,
    accountFilter,
    categoryFilter,
    dateRange,
    getAccountName,
    getCategoryName,
  ]);

  const days = useMemo(() => {
    const groups = [];

    for (const transaction of filtered) {
      let group = groups[groups.length - 1];

      if (!group || group.date !== transaction.date) {
        group = { date: transaction.date, items: [], net: 0 };
        groups.push(group);
      }

      group.items.push(transaction);

      const amount = Number(transaction.amount) || 0;

      if (transaction.type === "income") group.net += amount;
      if (transaction.type === "expense") group.net -= amount;
    }

    return groups;
  }, [filtered]);

  const resetFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setAccountFilter("all");
    setCategoryFilter("all");
    setDateRange({ from: undefined, to: undefined });
  };

  const activeFilterCount = [
    search !== "",
    typeFilter !== "all",
    accountFilter !== "all",
    categoryFilter !== "all",
    Boolean(dateRange?.from || dateRange?.to),
  ].filter(Boolean).length;

  const handleDelete = (transaction) => {
    toast(`Delete ${transaction.type} of ${fmt(transaction.amount)}?`, {
      description: "Balances will update immediately.",
      action: {
        label: "Delete",
        onClick: () => {
          deleteTransaction(transaction.id);
          toast.success("Transaction deleted");
        },
      },
    });
  };

  const handleDatePreset = (preset) => {
    const now = new Date();
    switch (preset) {
      case "this-month":
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case "last-month": {
        const lastMonth = subMonths(now, 1);
        setDateRange({
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        });
        break;
      }
      case "last-30":
        setDateRange({ from: subDays(now, 30), to: now });
        break;
      case "ytd":
        setDateRange({ from: startOfYear(now), to: now });
        break;
      default:
        break;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 space-y-6 duration-200">
      <PageHeader
        eyebrow="Activity"
        title="Transactions"
        description={
          <>
            Showing{" "}
            <span className="font-semibold text-foreground">
              {filtered.length}
            </span>{" "}
            of {transactions.length} total transactions
          </>
        }
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowTransfer(true)}
              disabled={accounts.length < 2}
              className="gap-2"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Transfer
            </Button>

            <Button
              type="button"
              onClick={() => setShowModal(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Transaction
            </Button>
          </>
        }
      />

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Filter & Search</h3>
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="rounded-full px-2 py-0.5 text-xs font-normal"
                >
                  {activeFilterCount} active
                </Badge>
              )}
            </div>

            {activeFilterCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <FilterX className="h-3.5 w-3.5" />
                Reset all
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search notes, category, account, or amount..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex rounded-lg border bg-muted/50 p-1">
              {[
                { label: "All", value: "all" },
                { label: "Income", value: "income" },
                { label: "Expense", value: "expense" },
                { label: "Transfer", value: "transfer" },
              ].map((item) => (
                <Button
                  key={item.value}
                  type="button"
                  variant={typeFilter === item.value ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setTypeFilter(item.value)}
                  className={`h-7 px-3 text-xs font-medium ${
                    typeFilter === item.value ? "bg-background shadow-xs" : ""
                  }`}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Account</Label>
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  {Object.entries(groupedAccounts).map(([type, accs]) => (
                    <SelectGroup key={type}>
                      <SelectLabel className="capitalize text-xs font-bold text-muted-foreground">
                        {type}
                      </SelectLabel>
                      {accs.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {Object.entries(groupedCategories).map(([type, cats]) => (
                    <SelectGroup key={type}>
                      <SelectLabel className="capitalize text-xs font-bold text-muted-foreground">
                        {type}
                      </SelectLabel>
                      {cats.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label className="text-xs text-muted-foreground">
                Date Range
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span className="text-muted-foreground">
                        Select date range
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="flex flex-col border-b p-2 space-y-1">
                    <p className="px-2 text-xs font-semibold text-muted-foreground">
                      Quick Presets
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start text-xs h-7"
                        onClick={() => handleDatePreset("this-month")}
                      >
                        This Month
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start text-xs h-7"
                        onClick={() => handleDatePreset("last-month")}
                      >
                        Last Month
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start text-xs h-7"
                        onClick={() => handleDatePreset("last-30")}
                      >
                        Last 30 Days
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start text-xs h-7"
                        onClick={() => handleDatePreset("ytd")}
                      >
                        Year to Date
                      </Button>
                    </div>
                  </div>
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={1}
                  />
                  {(dateRange?.from || dateRange?.to) && (
                    <div className="border-t p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDateRange({ from: undefined, to: undefined })
                        }
                        className="w-full text-xs h-7 text-destructive hover:text-destructive"
                      >
                        Clear date range
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              <span className="text-xs text-muted-foreground mr-1">
                Active filters:
              </span>
              {typeFilter !== "all" && (
                <Badge
                  variant="secondary"
                  className="gap-1 text-xs font-normal"
                >
                  Type:{" "}
                  <span className="font-semibold capitalize">{typeFilter}</span>
                  <X
                    className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                    onClick={() => setTypeFilter("all")}
                  />
                </Badge>
              )}
              {accountFilter !== "all" && (
                <Badge
                  variant="secondary"
                  className="gap-1 text-xs font-normal"
                >
                  Account:{" "}
                  <span className="font-semibold">
                    {getAccountName(accountFilter)}
                  </span>
                  <X
                    className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                    onClick={() => setAccountFilter("all")}
                  />
                </Badge>
              )}
              {categoryFilter !== "all" && (
                <Badge
                  variant="secondary"
                  className="gap-1 text-xs font-normal"
                >
                  Category:{" "}
                  <span className="font-semibold">
                    {getCategoryName(categoryFilter)}
                  </span>
                  <X
                    className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                    onClick={() => setCategoryFilter("all")}
                  />
                </Badge>
              )}
              {(dateRange?.from || dateRange?.to) && (
                <Badge
                  variant="secondary"
                  className="gap-1 text-xs font-normal"
                >
                  Date:{" "}
                  <span className="font-semibold">
                    {dateRange.from ? format(dateRange.from, "MMM d") : "..."} -{" "}
                    {dateRange.to ? format(dateRange.to, "MMM d") : "..."}
                  </span>
                  <X
                    className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setDateRange({ from: undefined, to: undefined })
                    }
                  />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Receipt className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold">
            {transactions.length === 0
              ? "No transactions yet"
              : "No transactions match your filters"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            {transactions.length === 0
              ? "Add your first transaction to start tracking your finances."
              : "Try adjusting your search term or clearing active filters."}
          </p>
          <div className="mt-6">
            {transactions.length === 0 ? (
              <Button type="button" onClick={() => setShowModal(true)}>
                Add a transaction
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={resetFilters}>
                Clear active filters
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <div key={day.date} className="space-y-2">
              <div className="flex items-center justify-between border-b pb-2 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {formatDate(day.date)}
                </span>

                {day.net !== 0 && (
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                    Net: {day.net > 0 ? "+" : "-"}
                    {fmt(Math.abs(day.net))}
                  </span>
                )}
              </div>

              <div className="divide-y rounded-xl border bg-card px-4">
                {day.items.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center gap-3 py-3.5 transition-colors"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base ${
                        transaction.type === "income"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : transaction.type === "expense"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                      }`}
                    >
                      {transaction.type === "income" && (
                        <ArrowDownRight className="h-5 w-5" />
                      )}
                      {transaction.type === "expense" && (
                        <ArrowUpRight className="h-5 w-5" />
                      )}
                      {transaction.type === "transfer" && (
                        <ArrowLeftRight className="h-5 w-5" />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-tight">
                        {transaction.type === "transfer"
                          ? `${getAccountName(transaction.fromAccountId)} → ${getAccountName(transaction.toAccountId)}`
                          : getCategoryName(transaction.categoryId)}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {transaction.type === "transfer"
                          ? "Transfer"
                          : getAccountName(transaction.accountId)}
                        {transaction.pay
                          ? ` \u00b7 ${describePay(transaction.pay, (v) => fmt(v), formatHours)}`
                          : ""}
                        {transaction.notes
                          ? ` \u00b7 ${transaction.notes}`
                          : ""}
                        {transaction.source === "api" ? " \u00b7 API" : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-bold tabular-nums ${
                          transaction.type === "income"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : transaction.type === "expense"
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-foreground"
                        }`}
                      >
                        {transaction.type === "expense"
                          ? "-"
                          : transaction.type === "income"
                            ? "+"
                            : ""}
                        {fmt(transaction.amount)}
                      </span>

                      <div className="flex items-center gap-1 border-l pl-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(transaction)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(transaction)}
                          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <TransactionModal onClose={() => setShowModal(false)} />}
      {showTransfer && <TransferModal onClose={() => setShowTransfer(false)} />}
    </div>
  );
}
