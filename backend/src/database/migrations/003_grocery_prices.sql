-- =====================================================================
-- Grocery price tracking
--
-- Replaces the unused shopping-list tables with a price log:
--   grocery_stores    where you shop
--   grocery_products  what you buy (milk, eggs, chicken breast...)
--   grocery_prices    one row per price you saw: product, store, price,
--                     package size, date, and whether it was on sale
--
-- Prices are compared per unit so package sizes don't matter:
--   weight products -> price per kg   (package_unit g, kg, lb, oz)
--   volume products -> price per L    (package_unit ml, l)
--   count products  -> price per item (package_unit each)
-- A product's unit_kind decides which package units its prices may use
-- (checked in the API, since a CHECK can't look at another table).
--
-- Database: Amazon Aurora DSQL (one DDL statement per transaction;
-- run each statement on its own).
-- =====================================================================


-- grocery_lists / grocery_items were never used by the app.
-- Make sure both are empty before running these.
DROP TABLE f_wallet.grocery_items;
DROP TABLE f_wallet.grocery_lists;


-- =====================================================================
-- 1. STORES
-- =====================================================================

CREATE TABLE f_wallet.grocery_stores (
    store_id     uuid NOT NULL,
    user_id      varchar(128) NOT NULL,
    store_name   varchar(100) NOT NULL,
    location     varchar(150),
    notes        text,
    is_archived  boolean NOT NULL DEFAULT false,
    archived_at  timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT grocery_stores_pkey PRIMARY KEY (store_id),

    CONSTRAINT uq_grocery_stores_user_id
        UNIQUE (user_id, store_id),

    CONSTRAINT uq_grocery_stores_user_name
        UNIQUE (user_id, store_name),

    CONSTRAINT fk_grocery_stores_user
        FOREIGN KEY (user_id)
        REFERENCES f_wallet.users (user_id),

    CONSTRAINT chk_grocery_stores_archived_at
        CHECK (
            (is_archived = true AND archived_at IS NOT NULL)
            OR
            (is_archived = false AND archived_at IS NULL)
        )
);


-- =====================================================================
-- 2. PRODUCTS
-- =====================================================================

CREATE TABLE f_wallet.grocery_products (
    product_id    uuid NOT NULL,
    user_id       varchar(128) NOT NULL,
    product_name  varchar(150) NOT NULL,
    brand         varchar(100),
    unit_kind     varchar(10) NOT NULL,
    notes         text,
    is_archived   boolean NOT NULL DEFAULT false,
    archived_at   timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT grocery_products_pkey PRIMARY KEY (product_id),

    CONSTRAINT uq_grocery_products_user_id
        UNIQUE (user_id, product_id),

    -- Two products with the same name and no brand aren't caught here
    -- (NULLs never clash in UNIQUE); the API checks that case.
    CONSTRAINT uq_grocery_products_user_name_brand
        UNIQUE (user_id, product_name, brand),

    CONSTRAINT fk_grocery_products_user
        FOREIGN KEY (user_id)
        REFERENCES f_wallet.users (user_id),

    CONSTRAINT chk_grocery_products_unit_kind
        CHECK (unit_kind IN ('weight', 'volume', 'count')),

    CONSTRAINT chk_grocery_products_archived_at
        CHECK (
            (is_archived = true AND archived_at IS NOT NULL)
            OR
            (is_archived = false AND archived_at IS NULL)
        )
);


-- =====================================================================
-- 3. PRICES
-- =====================================================================

CREATE TABLE f_wallet.grocery_prices (
    price_id          uuid NOT NULL,
    user_id           varchar(128) NOT NULL,
    product_id        uuid NOT NULL,
    store_id          uuid NOT NULL,
    price_cents       bigint NOT NULL,
    package_quantity  numeric(10, 3) NOT NULL DEFAULT 1,
    package_unit      varchar(10) NOT NULL DEFAULT 'each',
    is_sale           boolean NOT NULL DEFAULT false,
    observed_on       date NOT NULL,
    notes             text,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT grocery_prices_pkey PRIMARY KEY (price_id),

    CONSTRAINT uq_grocery_prices_user_id
        UNIQUE (user_id, price_id),

    CONSTRAINT fk_grocery_prices_user
        FOREIGN KEY (user_id)
        REFERENCES f_wallet.users (user_id),

    CONSTRAINT fk_grocery_prices_product
        FOREIGN KEY (user_id, product_id)
        REFERENCES f_wallet.grocery_products (user_id, product_id),

    CONSTRAINT fk_grocery_prices_store
        FOREIGN KEY (user_id, store_id)
        REFERENCES f_wallet.grocery_stores (user_id, store_id),

    CONSTRAINT chk_grocery_prices_price
        CHECK (price_cents > 0),

    CONSTRAINT chk_grocery_prices_package_quantity
        CHECK (package_quantity > 0),

    CONSTRAINT chk_grocery_prices_package_unit
        CHECK (package_unit IN ('each', 'g', 'kg', 'lb', 'oz', 'ml', 'l'))
);


-- Best-price lookups: latest price per product and store.
CREATE INDEX ASYNC idx_grocery_prices_product_store_date
    ON f_wallet.grocery_prices (user_id, product_id, store_id, observed_on);
