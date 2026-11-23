-- =====================================================================
-- F-Wallet Complete Database Schema
-- Database: Amazon Aurora DSQL
--
-- How to apply (as the cluster admin, not the app role):
--   * CREATE SCHEMA f_wallet; must already exist.
--   * DSQL allows only ONE DDL statement per transaction, so run this
--     file in autocommit mode (plain `psql -f`, never `--single-transaction`).
--   * Tables are ordered parents-before-children for the foreign keys.
--   * Indexes are at the end and use CREATE INDEX ASYNC (DSQL builds them
--     in the background). On regular PostgreSQL, delete the word ASYNC.
--   * created_at / updated_at default to now(). DSQL has no triggers, so
--     UPDATE statements refresh it with `updated_at = DEFAULT`.
--   * Constraints are cheapest to get right here: DSQL has limited
--     ALTER TABLE support, so adding them later is hard.
-- =====================================================================


-- =====================================================================
-- 1. USERS
-- =====================================================================

CREATE TABLE f_wallet.users (
    user_id     varchar(128) NOT NULL,
    email       varchar(320) NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT users_pkey PRIMARY KEY (user_id),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT chk_users_email_lowercase
        CHECK (email = lower(email))
);


-- =====================================================================
-- 2. USER SETTINGS
-- =====================================================================

CREATE TABLE f_wallet.user_settings (
    user_id                          varchar(128) NOT NULL,
    currency                         varchar(3) NOT NULL DEFAULT 'CAD',
    timezone                         varchar(100) NOT NULL DEFAULT 'America/Toronto',
    date_format                      varchar(20) NOT NULL DEFAULT 'YYYY-MM-DD',
    theme                            varchar(10) NOT NULL DEFAULT 'system',
    notify_recurring_reminders       boolean NOT NULL DEFAULT true,
    notify_budget_thresholds         boolean NOT NULL DEFAULT true,
    notify_apple_pay_failures        boolean NOT NULL DEFAULT true,
    notify_unknown_cards             boolean NOT NULL DEFAULT true,
    notify_unmatched_accounts        boolean NOT NULL DEFAULT true,
    notify_monthly_reports           boolean NOT NULL DEFAULT true,
    created_at                       timestamptz NOT NULL DEFAULT now(),
    updated_at                       timestamptz NOT NULL DEFAULT now(),
    recurring_generation_window_days smallint NOT NULL DEFAULT 7,

    CONSTRAINT user_settings_pkey PRIMARY KEY (user_id),

    CONSTRAINT chk_user_settings_currency
        CHECK (currency ~ '^[A-Z]{3}$'),

    CONSTRAINT chk_user_settings_theme
        CHECK (theme IN ('light', 'dark', 'system')),

    CONSTRAINT chk_user_settings_date_format
        CHECK (date_format IN ('YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY')),

    CONSTRAINT chk_user_settings_generation_window
        CHECK (recurring_generation_window_days BETWEEN 1 AND 90),

    CONSTRAINT fk_user_settings_user
        FOREIGN KEY (user_id)
        REFERENCES f_wallet.users (user_id)
);


-- =====================================================================
-- 3. ACCOUNTS
-- Includes Migration 002: opening_balance_cents
-- Includes Migration 003: display_order
-- opening_balance_cents is signed like ledger entries, so a credit card
-- that starts with debt (or an overdrawn checking account) is negative.
-- =====================================================================

CREATE TABLE f_wallet.accounts (
    account_id              uuid NOT NULL,
    user_id                 varchar(128) NOT NULL,
    account_name            varchar(100) NOT NULL,
    account_type            varchar(20) NOT NULL,
    institution_name        varchar(100),
    currency                varchar(3) NOT NULL DEFAULT 'CAD',

    opening_balance_cents   bigint NOT NULL DEFAULT 0,
    credit_limit_cents      bigint,
    card_last_four          varchar(4),
    statement_closing_day   smallint,
    payment_due_day         smallint,

    display_order           integer NOT NULL,

    include_in_net_worth    boolean NOT NULL DEFAULT true,
    is_archived             boolean NOT NULL DEFAULT false,
    archived_at             timestamptz,
    notes                   text,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT accounts_pkey PRIMARY KEY (account_id),

    CONSTRAINT uq_accounts_user_account
        UNIQUE (user_id, account_name),

    CONSTRAINT uq_accounts_user_account_id
        UNIQUE (user_id, account_id),

    CONSTRAINT fk_accounts_user
        FOREIGN KEY (user_id)
        REFERENCES f_wallet.users (user_id),

    CONSTRAINT chk_accounts_type
        CHECK (account_type IN ('checking', 'savings', 'credit_card', 'cash')),

    CONSTRAINT chk_accounts_currency
        CHECK (currency ~ '^[A-Z]{3}$'),

    CONSTRAINT chk_accounts_credit_limit
        CHECK (credit_limit_cents IS NULL OR credit_limit_cents >= 0),

    CONSTRAINT chk_accounts_last_four
        CHECK (card_last_four IS NULL OR card_last_four ~ '^[0-9]{4}$'),

    CONSTRAINT chk_accounts_statement_day
        CHECK (
            statement_closing_day IS NULL
            OR statement_closing_day BETWEEN 1 AND 31
        ),

    CONSTRAINT chk_accounts_payment_day
        CHECK (
            payment_due_day IS NULL
            OR payment_due_day BETWEEN 1 AND 31
        ),

    CONSTRAINT chk_accounts_display_order
        CHECK (display_order >= 0),

    CONSTRAINT chk_accounts_credit_card_fields
        CHECK (
            account_type = 'credit_card'
            OR (
                credit_limit_cents IS NULL
                AND card_last_four IS NULL
                AND statement_closing_day IS NULL
                AND payment_due_day IS NULL
            )
        ),

    CONSTRAINT chk_accounts_archive_timestamp
        CHECK (
            (is_archived = true AND archived_at IS NOT NULL)
            OR
            (is_archived = false AND archived_at IS NULL)
        )
);


-- =====================================================================
-- 4. CATEGORIES
-- =====================================================================

CREATE TABLE f_wallet.categories (
    category_id         uuid NOT NULL,
    user_id             varchar(128) NOT NULL,
    category_name       varchar(100) NOT NULL,
    category_type       varchar(10) NOT NULL,
    parent_category_id  uuid,
    default_account_id  uuid,
    display_order       integer NOT NULL DEFAULT 0,
    is_archived         boolean NOT NULL DEFAULT false,
    archived_at         timestamptz,
    notes               text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT categories_pkey PRIMARY KEY (category_id),

    CONSTRAINT uq_categories_user_category
        UNIQUE (user_id, category_id),

    CONSTRAINT uq_categories_user_name
        UNIQUE (user_id, category_name),

    CONSTRAINT fk_categories_user
        FOREIGN KEY (user_id)
        REFERENCES f_wallet.users (user_id),

    CONSTRAINT fk_categories_parent
        FOREIGN KEY (user_id, parent_category_id)
        REFERENCES f_wallet.categories (user_id, category_id),

    CONSTRAINT fk_categories_default_account
        FOREIGN KEY (user_id, default_account_id)
        REFERENCES f_wallet.accounts (user_id, account_id),

    CONSTRAINT chk_categories_type
        CHECK (category_type IN ('income', 'expense')),

    CONSTRAINT chk_categories_not_own_parent
        CHECK (
            parent_category_id IS NULL
            OR parent_category_id <> category_id
        ),

    CONSTRAINT chk_categories_archive_timestamp
        CHECK (
            (is_archived = true AND archived_at IS NOT NULL)
            OR
            (is_archived = false AND archived_at IS NULL)
        )
);


-- =====================================================================
-- 5. TRANSFER GROUPS
-- =====================================================================

CREATE TABLE f_wallet.transfer_groups (
    transfer_group_id       uuid NOT NULL,
    user_id                 varchar(128) NOT NULL,
    source_account_id       uuid NOT NULL,
    destination_account_id  uuid NOT NULL,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT transfer_groups_pkey PRIMARY KEY (transfer_group_id),

    CONSTRAINT uq_transfer_groups_user_id
        UNIQUE (user_id, transfer_group_id),

    CONSTRAINT fk_transfer_groups_user
        FOREIGN KEY (user_id)
        REFERENCES f_wallet.users (user_id),

    CONSTRAINT fk_transfer_groups_source_account
        FOREIGN KEY (user_id, source_account_id)
        REFERENCES f_wallet.accounts (user_id, account_id),

    CONSTRAINT fk_transfer_groups_destination_account
        FOREIGN KEY (user_id, destination_account_id)
        REFERENCES f_wallet.accounts (user_id, account_id),

    CONSTRAINT chk_transfer_groups_different_accounts
        CHECK (source_account_id <> destination_account_id)
);


-- =====================================================================
-- 6. RECURRING RULES
-- =====================================================================

CREATE TABLE f_wallet.recurring_rules (
    recurring_rule_id       uuid NOT NULL,
    user_id                 varchar(128) NOT NULL,
    account_id              uuid NOT NULL,
    category_id             uuid NOT NULL,
    transaction_type        varchar(20) NOT NULL,
    amount_cents            bigint NOT NULL,
    description             varchar(255),
    merchant                varchar(150),
    notes                   text,
    frequency               varchar(30) NOT NULL,
    start_date              date NOT NULL,
    next_occurrence_date    date NOT NULL,
    end_condition           varchar(20) NOT NULL,
    end_date                date,
    occurrence_limit        integer,
    status                  varchar(20) NOT NULL DEFAULT 'active',
    reminder_enabled        boolean NOT NULL DEFAULT false,
    reminder_days_before    smallint NOT NULL DEFAULT 1,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    generated_occurrences   integer NOT NULL DEFAULT 0,

    CONSTRAINT recurring_rules_pkey PRIMARY KEY (recurring_rule_id),

    CONSTRAINT uq_recurring_rules_user_id
        UNIQUE (user_id, recurring_rule_id),

    CONSTRAINT fk_recurring_rules_user
        FOREIGN KEY (user_id)
        REFERENCES f_wallet.users (user_id),

    CONSTRAINT fk_recurring_rules_account
        FOREIGN KEY (user_id, account_id)
        REFERENCES f_wallet.accounts (user_id, account_id),

    CONSTRAINT fk_recurring_rules_category
        FOREIGN KEY (user_id, category_id)
        REFERENCES f_wallet.categories (user_id, category_id),

    CONSTRAINT chk_recurring_rules_type
        CHECK (transaction_type IN ('income', 'expense')),

    CONSTRAINT chk_recurring_rules_amount
        CHECK (amount_cents > 0),

    CONSTRAINT chk_recurring_rules_date
        CHECK (next_occurrence_date >= start_date),

    CONSTRAINT chk_recurring_rules_frequency
        CHECK (
            frequency IN (
                'daily',
                'weekly',
                'biweekly',
                'monthly',
                'every_two_months',
                'quarterly',
                'every_six_months',
                'yearly'
            )
        ),

    CONSTRAINT chk_recurring_rules_end_condition
        CHECK (end_condition IN ('never', 'end_date', 'occurrence_count')),

    CONSTRAINT chk_recurring_rules_end_values
        CHECK (
            (
                end_condition = 'never'
                AND end_date IS NULL
                AND occurrence_limit IS NULL
            )
            OR
            (
                end_condition = 'end_date'
                AND end_date IS NOT NULL
                AND occurrence_limit IS NULL
            )
            OR
            (
                end_condition = 'occurrence_count'
                AND occurrence_limit > 0
                AND end_date IS NULL
            )
        ),

    CONSTRAINT chk_recurring_rules_status
        CHECK (status IN ('active', 'paused', 'deleted')),

    CONSTRAINT chk_recurring_rules_reminder_days
        CHECK (reminder_days_before IN (0, 1, 3, 7)),

    CONSTRAINT chk_recurring_rules_generated_occurrences
        CHECK (
            generated_occurrences >= 0
            AND (
                occurrence_limit IS NULL
                OR generated_occurrences <= occurrence_limit
            )
        )
);


-- =====================================================================
-- 7. TRANSACTIONS
-- Migration 002: opening_balance removed from transaction types.
-- =====================================================================

CREATE TABLE f_wallet.transactions (
    transaction_id              uuid NOT NULL,
    user_id                     varchar(128) NOT NULL,
    category_id                 uuid,
    original_transaction_id     uuid,
    transfer_group_id           uuid,
    transaction_type            varchar(20) NOT NULL,
    status                      varchar(20) NOT NULL DEFAULT 'posted',
    amount_cents                bigint NOT NULL,
    transaction_date            date NOT NULL,
    effective_date              date NOT NULL,
    description                 varchar(255),
    merchant                    varchar(150),
    source                      varchar(30) NOT NULL DEFAULT 'manual',
    notes                       text,
    deleted_at                  timestamptz,
    created_at                  timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now(),
    recurring_rule_id           uuid,
    recurrence_occurrence_date  date,
    scheduled_account_id        uuid,

    CONSTRAINT transactions_pkey PRIMARY KEY (transaction_id),

    CONSTRAINT uq_transactions_user_id
        UNIQUE (user_id, transaction_id),

    CONSTRAINT uq_transactions_transfer_group
        UNIQUE (user_id, transfer_group_id),

    CONSTRAINT fk_transactions_user
        FOREIGN KEY (user_id)
        REFERENCES f_wallet.users (user_id),

    CONSTRAINT fk_transactions_category
        FOREIGN KEY (user_id, category_id)
        REFERENCES f_wallet.categories (user_id, category_id),

    CONSTRAINT fk_transactions_original
        FOREIGN KEY (user_id, original_transaction_id)
        REFERENCES f_wallet.transactions (user_id, transaction_id),

    CONSTRAINT fk_transactions_transfer_group
        FOREIGN KEY (user_id, transfer_group_id)
        REFERENCES f_wallet.transfer_groups (user_id, transfer_group_id),

    CONSTRAINT fk_transactions_recurring_rule
        FOREIGN KEY (user_id, recurring_rule_id)
        REFERENCES f_wallet.recurring_rules (user_id, recurring_rule_id),

    CONSTRAINT fk_transactions_scheduled_account
        FOREIGN KEY (user_id, scheduled_account_id)
        REFERENCES f_wallet.accounts (user_id, account_id),

    CONSTRAINT chk_transactions_type
        CHECK (
            transaction_type IN (
                'income',
                'expense',
                'transfer',
                'refund',
                'adjustment'
            )
        ),

    CONSTRAINT chk_transactions_status
        CHECK (status IN ('scheduled', 'posted', 'deleted')),

    CONSTRAINT chk_transactions_source
        CHECK (source IN ('manual', 'iphone_shortcut', 'system')),

    CONSTRAINT chk_transactions_amount
        CHECK (amount_cents > 0),

    CONSTRAINT chk_transactions_not_self_refund
        CHECK (
            original_transaction_id IS NULL
            OR original_transaction_id <> transaction_id
        ),

    CONSTRAINT chk_transactions_refund_original
        CHECK (
            (
                transaction_type = 'refund'
                AND original_transaction_id IS NOT NULL
            )
            OR
            (
                transaction_type <> 'refund'
                AND original_transaction_id IS NULL
            )
        ),

    CONSTRAINT chk_transactions_transfer_group
        CHECK (
            (
                transaction_type = 'transfer'
                AND transfer_group_id IS NOT NULL
            )
            OR
            (
                transaction_type <> 'transfer'
                AND transfer_group_id IS NULL
            )
        ),

    CONSTRAINT chk_transactions_deleted_timestamp
        CHECK (
            (status = 'deleted' AND deleted_at IS NOT NULL)
            OR
            (status <> 'deleted' AND deleted_at IS NULL)
        ),

    CONSTRAINT chk_transactions_recurring_occurrence
        CHECK (
            (recurring_rule_id IS NULL AND recurrence_occurrence_date IS NULL)
            OR
            (recurring_rule_id IS NOT NULL AND recurrence_occurrence_date IS NOT NULL)
        )
);


-- =====================================================================
-- 8. TRANSACTION ENTRIES
-- Migration 002: opening_balance removed from entry roles.
-- =====================================================================

CREATE TABLE f_wallet.transaction_entries (
    entry_id        uuid NOT NULL,
    user_id         varchar(128) NOT NULL,
    transaction_id  uuid NOT NULL,
    account_id      uuid NOT NULL,
    entry_role      varchar(30) NOT NULL,
    amount_cents    bigint NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT transaction_entries_pkey PRIMARY KEY (entry_id),

    CONSTRAINT fk_transaction_entries_user
        FOREIGN KEY (user_id)
        REFERENCES f_wallet.users (user_id),

    CONSTRAINT fk_transaction_entries_transaction
        FOREIGN KEY (user_id, transaction_id)
        REFERENCES f_wallet.transactions (user_id, transaction_id),

    CONSTRAINT fk_transaction_entries_account
        FOREIGN KEY (user_id, account_id)
        REFERENCES f_wallet.accounts (user_id, account_id),

    CONSTRAINT chk_transaction_entries_amount
        CHECK (amount_cents <> 0),

    CONSTRAINT chk_transaction_entries_role
        CHECK (
            entry_role IN (
                'income',
                'expense',
                'refund',
                'source',
                'destination',
                'adjustment'
            )
        )
);


-- =====================================================================
-- 9. BUDGETS
-- =====================================================================

CREATE TABLE f_wallet.budgets (
    budget_id     uuid NOT NULL,
    user_id       varchar(128) NOT NULL,
    budget_year   integer NOT NULL,
    budget_month  integer NOT NULL,
    name          varchar(100),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT budgets_pkey PRIMARY KEY (budget_id),

    CONSTRAINT uq_budgets_user_id
        UNIQUE (user_id, budget_id),

    CONSTRAINT uq_budgets_user_month
        UNIQUE (user_id, budget_year, budget_month),

    CONSTRAINT fk_budgets_user
        FOREIGN KEY (user_id)
        REFERENCES f_wallet.users (user_id),

    CONSTRAINT chk_budgets_month
        CHECK (budget_month BETWEEN 1 AND 12),

    CONSTRAINT chk_budgets_year
        CHECK (budget_year BETWEEN 2000 AND 9999)
);


-- =====================================================================
-- 10. BUDGET CATEGORIES
-- =====================================================================

CREATE TABLE f_wallet.budget_categories (
    budget_category_id  uuid NOT NULL,
    user_id             varchar(128) NOT NULL,
    budget_id           uuid NOT NULL,
    category_id         uuid NOT NULL,
    allocated_cents     bigint NOT NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT budget_categories_pkey PRIMARY KEY (budget_category_id),

    CONSTRAINT uq_budget_categories_user_id
        UNIQUE (user_id, budget_category_id),

    CONSTRAINT uq_budget_categories_budget_category
        UNIQUE (user_id, budget_id, category_id),

    CONSTRAINT fk_budget_categories_user
        FOREIGN KEY (user_id)
        REFERENCES f_wallet.users (user_id),

    CONSTRAINT fk_budget_categories_budget
        FOREIGN KEY (user_id, budget_id)
        REFERENCES f_wallet.budgets (user_id, budget_id),

    CONSTRAINT fk_budget_categories_category
        FOREIGN KEY (user_id, category_id)
        REFERENCES f_wallet.categories (user_id, category_id),

    CONSTRAINT chk_budget_categories_allocation
        CHECK (allocated_cents >= 0)
);


-- =====================================================================
-- 11. REMINDERS
-- =====================================================================

CREATE TABLE f_wallet.reminders (
    reminder_id                 uuid NOT NULL,
    user_id                     varchar(128) NOT NULL,
    recurring_rule_id           uuid,
    recurrence_occurrence_date  date,
    title                       varchar(150) NOT NULL,
    description                 text,
    due_date                    date NOT NULL,
    email_send_at               timestamptz,
    email_status                varchar(20) NOT NULL DEFAULT 'pending',
    email_sent_at               timestamptz,
    status                      varchar(20) NOT NULL DEFAULT 'pending',
    completed_at                timestamptz,
    created_at                  timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT reminders_pkey PRIMARY KEY (reminder_id),

    CONSTRAINT uq_reminders_user_id
        UNIQUE (user_id, reminder_id),

    CONSTRAINT uq_reminders_recurring_occurrence
        UNIQUE (user_id, recurring_rule_id, recurrence_occurrence_date),

    CONSTRAINT fk_reminders_user
        FOREIGN KEY (user_id)
        REFERENCES f_wallet.users (user_id),

    CONSTRAINT fk_reminders_recurring_rule
        FOREIGN KEY (user_id, recurring_rule_id)
        REFERENCES f_wallet.recurring_rules (user_id, recurring_rule_id),

    CONSTRAINT chk_reminders_email_status
        CHECK (email_status IN ('pending', 'sent', 'failed', 'cancelled')),

    CONSTRAINT chk_reminders_email_sent_at
        CHECK (
            (email_status = 'sent' AND email_sent_at IS NOT NULL)
            OR
            (email_status <> 'sent' AND email_sent_at IS NULL)
        ),

    CONSTRAINT chk_reminders_status
        CHECK (status IN ('pending', 'completed', 'cancelled')),

    CONSTRAINT chk_reminders_completed_at
        CHECK (
            (status = 'completed' AND completed_at IS NOT NULL)
            OR
            (status <> 'completed' AND completed_at IS NULL)
        ),

    CONSTRAINT chk_reminders_recurring_occurrence
        CHECK (
            (
                recurring_rule_id IS NULL
                AND recurrence_occurrence_date IS NULL
            )
            OR
            (
                recurring_rule_id IS NOT NULL
                AND recurrence_occurrence_date IS NOT NULL
            )
        )
);


-- =====================================================================
-- 12. GROCERY LISTS
-- =====================================================================

CREATE TABLE f_wallet.grocery_lists (
    grocery_list_id  uuid NOT NULL,
    user_id          varchar(128) NOT NULL,
    name             varchar(100) NOT NULL,
    status           varchar(20) NOT NULL DEFAULT 'active',
    completed_at     timestamptz,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT grocery_lists_pkey PRIMARY KEY (grocery_list_id),

    CONSTRAINT uq_grocery_lists_user_id
        UNIQUE (user_id, grocery_list_id),

    CONSTRAINT fk_grocery_lists_user
        FOREIGN KEY (user_id)
        REFERENCES f_wallet.users (user_id),

    CONSTRAINT chk_grocery_lists_status
        CHECK (status IN ('active', 'completed')),

    CONSTRAINT chk_grocery_lists_completed_at
        CHECK (
            (status = 'completed' AND completed_at IS NOT NULL)
            OR
            (status = 'active' AND completed_at IS NULL)
        )
);


-- =====================================================================
-- 13. GROCERY ITEMS
-- =====================================================================

CREATE TABLE f_wallet.grocery_items (
    grocery_item_id  uuid NOT NULL,
    user_id          varchar(128) NOT NULL,
    grocery_list_id  uuid NOT NULL,
    item_name        varchar(150) NOT NULL,
    quantity         numeric,
    unit             varchar(30),
    notes            text,
    is_purchased     boolean NOT NULL DEFAULT false,
    display_order    integer NOT NULL DEFAULT 0,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT grocery_items_pkey PRIMARY KEY (grocery_item_id),

    CONSTRAINT uq_grocery_items_user_id
        UNIQUE (user_id, grocery_item_id),

    CONSTRAINT fk_grocery_items_user
        FOREIGN KEY (user_id)
        REFERENCES f_wallet.users (user_id),

    CONSTRAINT fk_grocery_items_list
        FOREIGN KEY (user_id, grocery_list_id)
        REFERENCES f_wallet.grocery_lists (user_id, grocery_list_id),

    CONSTRAINT chk_grocery_items_quantity
        CHECK (quantity IS NULL OR quantity > 0),

    CONSTRAINT chk_grocery_items_display_order
        CHECK (display_order >= 0)
);


-- =====================================================================
-- 14. API TOKENS
-- =====================================================================

CREATE TABLE f_wallet.api_tokens (
    api_token_id  uuid NOT NULL,
    user_id       varchar(128) NOT NULL,
    token_name    varchar(100) NOT NULL,
    token_hash    varchar(64) NOT NULL,
    status        varchar(20) NOT NULL DEFAULT 'active',
    last_used_at  timestamptz,
    expires_at    timestamptz,
    revoked_at    timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT api_tokens_pkey PRIMARY KEY (api_token_id),

    CONSTRAINT uq_api_tokens_user_id
        UNIQUE (user_id, api_token_id),

    CONSTRAINT uq_api_tokens_hash
        UNIQUE (token_hash),

    CONSTRAINT fk_api_tokens_user
        FOREIGN KEY (user_id)
        REFERENCES f_wallet.users (user_id),

    CONSTRAINT chk_api_tokens_status
        CHECK (status IN ('active', 'revoked')),

    CONSTRAINT chk_api_tokens_hash_format
        CHECK (token_hash ~ '^[0-9a-f]{64}$'),

    CONSTRAINT chk_api_tokens_revoked_at
        CHECK (
            (status = 'revoked' AND revoked_at IS NOT NULL)
            OR
            (status = 'active' AND revoked_at IS NULL)
        )
);


-- =====================================================================
-- 15. API IDEMPOTENCY KEYS
-- =====================================================================

CREATE TABLE f_wallet.api_idempotency_keys (
    idempotency_key_id  uuid NOT NULL,
    user_id             varchar(128) NOT NULL,
    api_token_id        uuid NOT NULL,
    idempotency_key     varchar(255) NOT NULL,
    request_hash        varchar(64) NOT NULL,
    transaction_id      uuid,
    response_status     integer,
    response_body       text,
    expires_at          timestamptz NOT NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT api_idempotency_keys_pkey PRIMARY KEY (idempotency_key_id),

    CONSTRAINT uq_api_idempotency_keys_user_id
        UNIQUE (user_id, idempotency_key_id),

    CONSTRAINT uq_api_idempotency_keys_key
        UNIQUE (user_id, idempotency_key),

    CONSTRAINT fk_api_idempotency_keys_user
        FOREIGN KEY (user_id)
        REFERENCES f_wallet.users (user_id),

    CONSTRAINT fk_api_idempotency_keys_token
        FOREIGN KEY (user_id, api_token_id)
        REFERENCES f_wallet.api_tokens (user_id, api_token_id),

    CONSTRAINT fk_api_idempotency_keys_transaction
        FOREIGN KEY (user_id, transaction_id)
        REFERENCES f_wallet.transactions (user_id, transaction_id),

    CONSTRAINT chk_api_idempotency_keys_request_hash_format
        CHECK (request_hash ~ '^[0-9a-f]{64}$'),

    CONSTRAINT chk_api_idempotency_keys_response_status
        CHECK (
            response_status IS NULL
            OR response_status BETWEEN 100 AND 599
        )
);


-- =====================================================================
-- 16. AUDIT LOGS
-- =====================================================================

CREATE TABLE f_wallet.audit_logs (
    audit_log_id  uuid NOT NULL,
    user_id       varchar(128) NOT NULL,
    entity_type   varchar(50) NOT NULL,
    entity_id     uuid NOT NULL,
    action        varchar(50) NOT NULL,
    old_values    jsonb,
    new_values    jsonb,
    ip_address    varchar(45),
    user_agent    text,
    created_at    timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT audit_logs_pkey PRIMARY KEY (audit_log_id),

    CONSTRAINT uq_audit_logs_user_id
        UNIQUE (user_id, audit_log_id),

    CONSTRAINT fk_audit_logs_user
        FOREIGN KEY (user_id)
        REFERENCES f_wallet.users (user_id)
);


-- =====================================================================
-- 17. MONTHLY REPORTS
-- =====================================================================

CREATE TABLE f_wallet.monthly_reports (
    monthly_report_id  uuid NOT NULL,
    user_id            varchar(128) NOT NULL,
    report_year        integer NOT NULL,
    report_month       integer NOT NULL,
    status             varchar(20) NOT NULL DEFAULT 'pending',
    s3_key             varchar(1024),
    file_size_bytes    bigint,
    generated_at       timestamptz,
    error_message      text,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT monthly_reports_pkey PRIMARY KEY (monthly_report_id),

    CONSTRAINT uq_monthly_reports_user_id
        UNIQUE (user_id, monthly_report_id),

    CONSTRAINT uq_monthly_reports_user_month
        UNIQUE (user_id, report_year, report_month),

    CONSTRAINT fk_monthly_reports_user
        FOREIGN KEY (user_id)
        REFERENCES f_wallet.users (user_id),

    CONSTRAINT chk_monthly_reports_status
        CHECK (status IN ('pending', 'generating', 'completed', 'failed')),

    CONSTRAINT chk_monthly_reports_month
        CHECK (report_month BETWEEN 1 AND 12),

    CONSTRAINT chk_monthly_reports_year
        CHECK (report_year BETWEEN 2000 AND 9999),

    CONSTRAINT chk_monthly_reports_file_size
        CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0)
);


-- =====================================================================
-- 18. INDEXES
-- Primary keys and UNIQUE constraints above already index their columns
-- (e.g. accounts (user_id, account_id) serves "all accounts of a user").
-- These cover the remaining lookups the API and background jobs make.
-- =====================================================================

-- Every active-or-archived account keeps a unique position per user;
-- accounts.controller.js reorderAccounts relies on this.
CREATE UNIQUE INDEX ASYNC uq_accounts_user_display_order
    ON f_wallet.accounts (user_id, display_order);

-- Child categories of a parent (archive / restore / move checks).
CREATE INDEX ASYNC idx_categories_user_parent
    ON f_wallet.categories (user_id, parent_category_id);

-- Transaction list: WHERE user_id = ? ORDER BY transaction_date DESC.
CREATE INDEX ASYNC idx_transactions_user_date
    ON f_wallet.transactions (user_id, transaction_date, created_at);

-- Prevents generating the same recurring occurrence twice.
CREATE UNIQUE INDEX ASYNC uq_transactions_recurring_occurrence
    ON f_wallet.transactions (user_id, recurring_rule_id, recurrence_occurrence_date);

-- Entries of a transaction (loaded for every transaction returned).
CREATE INDEX ASYNC idx_transaction_entries_user_transaction
    ON f_wallet.transaction_entries (user_id, transaction_id);

-- Entries of an account: account filter and balance = opening + SUM(entries).
CREATE INDEX ASYNC idx_transaction_entries_user_account
    ON f_wallet.transaction_entries (user_id, account_id);

-- Scheduler: find rules that are due.
CREATE INDEX ASYNC idx_recurring_rules_status_next_date
    ON f_wallet.recurring_rules (status, next_occurrence_date);

-- Email job: find reminders ready to send.
CREATE INDEX ASYNC idx_reminders_email_status_send_at
    ON f_wallet.reminders (email_status, email_send_at);

-- Cleanup job: delete expired idempotency keys.
CREATE INDEX ASYNC idx_api_idempotency_keys_expires_at
    ON f_wallet.api_idempotency_keys (expires_at);

-- Audit history of one record.
CREATE INDEX ASYNC idx_audit_logs_user_entity
    ON f_wallet.audit_logs (user_id, entity_type, entity_id, created_at);
