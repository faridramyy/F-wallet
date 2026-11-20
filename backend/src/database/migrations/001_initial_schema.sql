-- =====================================================================
-- F-Wallet schema, reconstructed from a live Aurora DSQL database
-- (information_schema + pg_indexes + pg_constraint output)
--
-- Tables are ordered so every foreign key points at a table that
-- already exists (parents before children).
--
-- DSQL note: indexes are created with CREATE INDEX ASYNC. On regular
-- PostgreSQL, delete the word ASYNC.
-- =====================================================================


-- 1. app_users -------------------------------------------------------
CREATE TABLE public.app_users (
    user_id     varchar(128) NOT NULL,
    email       varchar(320) NOT NULL,
    created_at  timestamptz  NOT NULL,
    updated_at  timestamptz  NOT NULL,
    CONSTRAINT app_users_pkey PRIMARY KEY (user_id),
    CONSTRAINT app_users_email_key UNIQUE (email),
    CONSTRAINT chk_app_users_email_lowercase CHECK (email = lower(email))
);


-- 2. app_settings ----------------------------------------------------
CREATE TABLE public.app_settings (
    user_id                          varchar(128) NOT NULL,
    currency                         varchar(3)   NOT NULL DEFAULT 'CAD',
    timezone                         varchar(100) NOT NULL DEFAULT 'America/Toronto',
    date_format                      varchar(20)  NOT NULL DEFAULT 'YYYY-MM-DD',
    theme                            varchar(10)  NOT NULL DEFAULT 'system',
    notify_recurring_reminders       boolean      NOT NULL DEFAULT true,
    notify_budget_thresholds         boolean      NOT NULL DEFAULT true,
    notify_apple_pay_failures        boolean      NOT NULL DEFAULT true,
    notify_unknown_cards             boolean      NOT NULL DEFAULT true,
    notify_unmatched_accounts        boolean      NOT NULL DEFAULT true,
    notify_monthly_reports           boolean      NOT NULL DEFAULT true,
    created_at                       timestamptz  NOT NULL,
    updated_at                       timestamptz  NOT NULL,
    recurring_generation_window_days smallint              DEFAULT 7,
    CONSTRAINT app_settings_pkey PRIMARY KEY (user_id),
    CONSTRAINT chk_app_settings_currency CHECK (char_length(currency) = 3),
    CONSTRAINT chk_app_settings_theme CHECK (theme IN ('light', 'dark', 'system')),
    CONSTRAINT fk_app_settings_user FOREIGN KEY (user_id) REFERENCES public.app_users (user_id)
);


-- 3. accounts --------------------------------------------------------
CREATE TABLE public.accounts (
    account_id            uuid         NOT NULL,
    user_id               varchar(128) NOT NULL,
    account_name          varchar(100) NOT NULL,
    account_type          varchar(20)  NOT NULL,
    institution_name      varchar(100),
    currency              varchar(3)   NOT NULL DEFAULT 'CAD',
    credit_limit_cents    bigint,
    card_last_four        varchar(4),
    statement_closing_day smallint,
    payment_due_day       smallint,
    include_in_net_worth  boolean      NOT NULL DEFAULT true,
    is_archived           boolean      NOT NULL DEFAULT false,
    archived_at           timestamptz,
    notes                 text,
    created_at            timestamptz  NOT NULL,
    updated_at            timestamptz  NOT NULL,
    CONSTRAINT accounts_pkey PRIMARY KEY (account_id),
    CONSTRAINT uq_accounts_user_account UNIQUE (user_id, account_name),
    CONSTRAINT uq_accounts_user_account_id UNIQUE (user_id, account_id),
    CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES public.app_users (user_id),
    CONSTRAINT chk_accounts_type
        CHECK (account_type IN ('checking', 'savings', 'credit_card', 'cash')),
    CONSTRAINT chk_accounts_currency CHECK (char_length(currency) = 3),
    CONSTRAINT chk_accounts_credit_limit
        CHECK (credit_limit_cents IS NULL OR credit_limit_cents >= 0),
    CONSTRAINT chk_accounts_last_four
        CHECK (card_last_four IS NULL OR card_last_four ~ '^[0-9]{4}$'),
    CONSTRAINT chk_accounts_statement_day
        CHECK (statement_closing_day IS NULL OR (statement_closing_day BETWEEN 1 AND 31)),
    CONSTRAINT chk_accounts_payment_day
        CHECK (payment_due_day IS NULL OR (payment_due_day BETWEEN 1 AND 31)),
    -- credit-card-only fields must be NULL for every other account type
    CONSTRAINT chk_accounts_credit_card_fields
        CHECK (account_type = 'credit_card'
               OR (credit_limit_cents IS NULL AND card_last_four IS NULL
                   AND statement_closing_day IS NULL AND payment_due_day IS NULL)),
    -- archived_at is set if and only if is_archived is true
    CONSTRAINT chk_accounts_archive_timestamp
        CHECK ((is_archived = true AND archived_at IS NOT NULL)
               OR (is_archived = false AND archived_at IS NULL))
);


-- 4. categories ------------------------------------------------------
CREATE TABLE public.categories (
    category_id         uuid         NOT NULL,
    user_id             varchar(128) NOT NULL,
    category_name       varchar(100) NOT NULL,
    category_type       varchar(10)  NOT NULL,
    parent_category_id  uuid,
    default_account_id  uuid,
    display_order       integer      NOT NULL DEFAULT 0,
    is_archived         boolean      NOT NULL DEFAULT false,
    archived_at         timestamptz,
    notes               text,
    created_at          timestamptz  NOT NULL,
    updated_at          timestamptz  NOT NULL,
    CONSTRAINT categories_pkey PRIMARY KEY (category_id),
    CONSTRAINT uq_categories_user_category UNIQUE (user_id, category_id),
    CONSTRAINT uq_categories_user_name UNIQUE (user_id, category_name),
    CONSTRAINT fk_categories_user FOREIGN KEY (user_id)
        REFERENCES public.app_users (user_id),
    CONSTRAINT fk_categories_parent FOREIGN KEY (user_id, parent_category_id)
        REFERENCES public.categories (user_id, category_id),
    CONSTRAINT fk_categories_default_account FOREIGN KEY (user_id, default_account_id)
        REFERENCES public.accounts (user_id, account_id),
    CONSTRAINT chk_categories_type CHECK (category_type IN ('income', 'expense')),
    CONSTRAINT chk_categories_not_own_parent
        CHECK (parent_category_id IS NULL OR parent_category_id <> category_id),
    CONSTRAINT chk_categories_archive_timestamp
        CHECK ((is_archived = true AND archived_at IS NOT NULL)
               OR (is_archived = false AND archived_at IS NULL))
);


-- 5. transfer_groups -------------------------------------------------
CREATE TABLE public.transfer_groups (
    transfer_group_id       uuid         NOT NULL,
    user_id                 varchar(128) NOT NULL,
    source_account_id       uuid         NOT NULL,
    destination_account_id  uuid         NOT NULL,
    created_at              timestamptz  NOT NULL,
    updated_at              timestamptz  NOT NULL,
    CONSTRAINT transfer_groups_pkey PRIMARY KEY (transfer_group_id),
    CONSTRAINT uq_transfer_groups_user_id UNIQUE (user_id, transfer_group_id),
    CONSTRAINT fk_transfer_groups_user FOREIGN KEY (user_id)
        REFERENCES public.app_users (user_id),
    CONSTRAINT fk_transfer_groups_source_account FOREIGN KEY (user_id, source_account_id)
        REFERENCES public.accounts (user_id, account_id),
    CONSTRAINT fk_transfer_groups_destination_account FOREIGN KEY (user_id, destination_account_id)
        REFERENCES public.accounts (user_id, account_id),
    CONSTRAINT chk_transfer_groups_different_accounts
        CHECK (source_account_id <> destination_account_id)
);


-- 6. recurring_rules -------------------------------------------------
CREATE TABLE public.recurring_rules (
    recurring_rule_id     uuid         NOT NULL,
    user_id               varchar(128) NOT NULL,
    account_id            uuid         NOT NULL,
    category_id           uuid         NOT NULL,
    transaction_type      varchar(20)  NOT NULL,
    amount_cents          bigint       NOT NULL,
    description           varchar(255),
    merchant              varchar(150),
    notes                 text,
    frequency             varchar(30)  NOT NULL,
    start_date            date         NOT NULL,
    next_occurrence_date  date         NOT NULL,
    end_condition         varchar(20)  NOT NULL,
    end_date              date,
    occurrence_limit      integer,
    status                varchar(20)  NOT NULL DEFAULT 'active',
    reminder_enabled      boolean      NOT NULL DEFAULT false,
    reminder_days_before  smallint     NOT NULL DEFAULT 1,
    created_at            timestamptz  NOT NULL,
    updated_at            timestamptz  NOT NULL,
    generated_occurrences integer               DEFAULT 0,
    CONSTRAINT recurring_rules_pkey PRIMARY KEY (recurring_rule_id),
    CONSTRAINT uq_recurring_rules_user_id UNIQUE (user_id, recurring_rule_id),
    CONSTRAINT fk_recurring_rules_user FOREIGN KEY (user_id)
        REFERENCES public.app_users (user_id),
    CONSTRAINT fk_recurring_rules_account FOREIGN KEY (user_id, account_id)
        REFERENCES public.accounts (user_id, account_id),
    CONSTRAINT fk_recurring_rules_category FOREIGN KEY (user_id, category_id)
        REFERENCES public.categories (user_id, category_id),
    CONSTRAINT chk_recurring_rules_type CHECK (transaction_type IN ('income', 'expense')),
    CONSTRAINT chk_recurring_rules_amount CHECK (amount_cents > 0),
    CONSTRAINT chk_recurring_rules_date CHECK (next_occurrence_date >= start_date),
    CONSTRAINT chk_recurring_rules_frequency
        CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly',
                             'every_two_months', 'quarterly',
                             'every_six_months', 'yearly')),
    CONSTRAINT chk_recurring_rules_end_condition
        CHECK (end_condition IN ('never', 'end_date', 'occurrence_count')),
    -- the end_date / occurrence_limit columns must match end_condition
    CONSTRAINT chk_recurring_rules_end_values
        CHECK ((end_condition = 'never' AND end_date IS NULL AND occurrence_limit IS NULL)
               OR (end_condition = 'end_date' AND end_date IS NOT NULL AND occurrence_limit IS NULL)
               OR (end_condition = 'occurrence_count' AND occurrence_limit > 0 AND end_date IS NULL)),
    CONSTRAINT chk_recurring_rules_status CHECK (status IN ('active', 'paused', 'deleted')),
    CONSTRAINT chk_recurring_rules_reminder_days CHECK (reminder_days_before IN (0, 1, 3, 7))
);


-- 7. transactions ----------------------------------------------------
CREATE TABLE public.transactions (
    transaction_id              uuid         NOT NULL,
    user_id                     varchar(128) NOT NULL,
    category_id                 uuid,
    original_transaction_id     uuid,
    transfer_group_id           uuid,
    transaction_type            varchar(20)  NOT NULL,
    status                      varchar(20)  NOT NULL DEFAULT 'posted',
    amount_cents                bigint       NOT NULL,
    transaction_date            date         NOT NULL,
    effective_date              date         NOT NULL,
    description                 varchar(255),
    merchant                    varchar(150),
    source                      varchar(30)  NOT NULL DEFAULT 'manual',
    notes                       text,
    deleted_at                  timestamptz,
    created_at                  timestamptz  NOT NULL,
    updated_at                  timestamptz  NOT NULL,
    recurring_rule_id           uuid,
    recurrence_occurrence_date  date,
    scheduled_account_id        uuid,
    CONSTRAINT transactions_pkey PRIMARY KEY (transaction_id),
    CONSTRAINT uq_transactions_user_id UNIQUE (user_id, transaction_id),
    CONSTRAINT uq_transactions_transfer_group UNIQUE (user_id, transfer_group_id),
    CONSTRAINT fk_transactions_user FOREIGN KEY (user_id)
        REFERENCES public.app_users (user_id),
    CONSTRAINT fk_transactions_category FOREIGN KEY (user_id, category_id)
        REFERENCES public.categories (user_id, category_id),
    CONSTRAINT fk_transactions_original FOREIGN KEY (user_id, original_transaction_id)
        REFERENCES public.transactions (user_id, transaction_id),
    CONSTRAINT fk_transactions_transfer_group FOREIGN KEY (user_id, transfer_group_id)
        REFERENCES public.transfer_groups (user_id, transfer_group_id),
    CONSTRAINT fk_transactions_recurring_rule FOREIGN KEY (user_id, recurring_rule_id)
        REFERENCES public.recurring_rules (user_id, recurring_rule_id),
    CONSTRAINT fk_transactions_scheduled_account FOREIGN KEY (user_id, scheduled_account_id)
        REFERENCES public.accounts (user_id, account_id),
    CONSTRAINT chk_transactions_type
        CHECK (transaction_type IN ('income', 'expense', 'transfer', 'refund',
                                    'adjustment', 'opening_balance')),
    CONSTRAINT chk_transactions_status
        CHECK (status IN ('scheduled', 'posted', 'deleted')),
    CONSTRAINT chk_transactions_source
        CHECK (source IN ('manual', 'iphone_shortcut', 'system')),
    CONSTRAINT chk_transactions_amount CHECK (amount_cents > 0),
    CONSTRAINT chk_transactions_not_self_refund
        CHECK (original_transaction_id IS NULL OR original_transaction_id <> transaction_id),
    -- refunds must point at an original transaction; nothing else may
    CONSTRAINT chk_transactions_refund_original
        CHECK ((transaction_type = 'refund' AND original_transaction_id IS NOT NULL)
               OR (transaction_type <> 'refund' AND original_transaction_id IS NULL)),
    -- transfers must belong to a transfer group; nothing else may
    CONSTRAINT chk_transactions_transfer_group
        CHECK ((transaction_type = 'transfer' AND transfer_group_id IS NOT NULL)
               OR (transaction_type <> 'transfer' AND transfer_group_id IS NULL)),
    -- soft delete: deleted_at is set if and only if status = 'deleted'
    CONSTRAINT chk_transactions_deleted_timestamp
        CHECK ((status = 'deleted' AND deleted_at IS NOT NULL)
               OR (status <> 'deleted' AND deleted_at IS NULL))
);


-- 8. transaction_entries ---------------------------------------------
CREATE TABLE public.transaction_entries (
    entry_id        uuid         NOT NULL,
    user_id         varchar(128) NOT NULL,
    transaction_id  uuid         NOT NULL,
    account_id      uuid         NOT NULL,
    entry_role      varchar(30)  NOT NULL,
    amount_cents    bigint       NOT NULL,
    created_at      timestamptz  NOT NULL,
    CONSTRAINT transaction_entries_pkey PRIMARY KEY (entry_id),
    CONSTRAINT fk_transaction_entries_user FOREIGN KEY (user_id)
        REFERENCES public.app_users (user_id),
    CONSTRAINT fk_transaction_entries_transaction FOREIGN KEY (user_id, transaction_id)
        REFERENCES public.transactions (user_id, transaction_id),
    CONSTRAINT fk_transaction_entries_account FOREIGN KEY (user_id, account_id)
        REFERENCES public.accounts (user_id, account_id),
    CONSTRAINT chk_transaction_entries_amount CHECK (amount_cents <> 0),
    CONSTRAINT chk_transaction_entries_role
        CHECK (entry_role IN ('income', 'expense', 'refund', 'source',
                              'destination', 'opening_balance', 'adjustment'))
);


-- 9. budgets ---------------------------------------------------------
CREATE TABLE public.budgets (
    budget_id     uuid         NOT NULL,
    user_id       varchar(128) NOT NULL,
    budget_year   integer      NOT NULL,
    budget_month  integer      NOT NULL,
    name          varchar(100),
    created_at    timestamptz  NOT NULL,
    updated_at    timestamptz  NOT NULL,
    CONSTRAINT budgets_pkey PRIMARY KEY (budget_id),
    CONSTRAINT uq_budgets_user_id UNIQUE (user_id, budget_id),
    CONSTRAINT uq_budgets_user_month UNIQUE (user_id, budget_year, budget_month),
    CONSTRAINT fk_budgets_user FOREIGN KEY (user_id) REFERENCES public.app_users (user_id),
    CONSTRAINT chk_budgets_month CHECK (budget_month BETWEEN 1 AND 12),
    CONSTRAINT chk_budgets_year CHECK (budget_year BETWEEN 2000 AND 9999)
);


-- 10. budget_categories ----------------------------------------------
CREATE TABLE public.budget_categories (
    budget_category_id  uuid         NOT NULL,
    user_id             varchar(128) NOT NULL,
    budget_id           uuid         NOT NULL,
    category_id         uuid         NOT NULL,
    allocated_cents     bigint       NOT NULL,
    created_at          timestamptz  NOT NULL,
    updated_at          timestamptz  NOT NULL,
    CONSTRAINT budget_categories_pkey PRIMARY KEY (budget_category_id),
    CONSTRAINT uq_budget_categories_user_id UNIQUE (user_id, budget_category_id),
    CONSTRAINT uq_budget_categories_budget_category UNIQUE (user_id, budget_id, category_id),
    CONSTRAINT fk_budget_categories_user FOREIGN KEY (user_id)
        REFERENCES public.app_users (user_id),
    CONSTRAINT fk_budget_categories_budget FOREIGN KEY (user_id, budget_id)
        REFERENCES public.budgets (user_id, budget_id),
    CONSTRAINT fk_budget_categories_category FOREIGN KEY (user_id, category_id)
        REFERENCES public.categories (user_id, category_id),
    CONSTRAINT chk_budget_categories_allocation CHECK (allocated_cents >= 0)
);


-- 11. reminders ------------------------------------------------------
CREATE TABLE public.reminders (
    reminder_id                 uuid         NOT NULL,
    user_id                     varchar(128) NOT NULL,
    recurring_rule_id           uuid,
    recurrence_occurrence_date  date,
    title                       varchar(150) NOT NULL,
    description                 text,
    due_date                    date         NOT NULL,
    email_send_at               timestamptz,
    email_status                varchar(20)  NOT NULL DEFAULT 'pending',
    email_sent_at               timestamptz,
    status                      varchar(20)  NOT NULL DEFAULT 'pending',
    completed_at                timestamptz,
    created_at                  timestamptz  NOT NULL,
    updated_at                  timestamptz  NOT NULL,
    CONSTRAINT reminders_pkey PRIMARY KEY (reminder_id),
    CONSTRAINT uq_reminders_user_id UNIQUE (user_id, reminder_id),
    CONSTRAINT uq_reminders_recurring_occurrence
        UNIQUE (user_id, recurring_rule_id, recurrence_occurrence_date),
    CONSTRAINT fk_reminders_user FOREIGN KEY (user_id) REFERENCES public.app_users (user_id),
    CONSTRAINT fk_reminders_recurring_rule FOREIGN KEY (user_id, recurring_rule_id)
        REFERENCES public.recurring_rules (user_id, recurring_rule_id),
    CONSTRAINT chk_reminders_email_status
        CHECK (email_status IN ('pending', 'sent', 'failed', 'cancelled')),
    CONSTRAINT chk_reminders_status
        CHECK (status IN ('pending', 'completed', 'cancelled')),
    CONSTRAINT chk_reminders_completed_at
        CHECK ((status = 'completed' AND completed_at IS NOT NULL)
               OR (status <> 'completed' AND completed_at IS NULL)),
    -- the rule id and occurrence date are either both set or both NULL
    CONSTRAINT chk_reminders_recurring_occurrence
        CHECK ((recurring_rule_id IS NULL AND recurrence_occurrence_date IS NULL)
               OR (recurring_rule_id IS NOT NULL AND recurrence_occurrence_date IS NOT NULL))
);


-- 12. grocery_lists --------------------------------------------------
CREATE TABLE public.grocery_lists (
    grocery_list_id  uuid         NOT NULL,
    user_id          varchar(128) NOT NULL,
    name             varchar(100) NOT NULL,
    status           varchar(20)  NOT NULL DEFAULT 'active',
    completed_at     timestamptz,
    created_at       timestamptz  NOT NULL,
    updated_at       timestamptz  NOT NULL,
    CONSTRAINT grocery_lists_pkey PRIMARY KEY (grocery_list_id),
    CONSTRAINT uq_grocery_lists_user_id UNIQUE (user_id, grocery_list_id),
    CONSTRAINT fk_grocery_lists_user FOREIGN KEY (user_id) REFERENCES public.app_users (user_id),
    CONSTRAINT chk_grocery_lists_status CHECK (status IN ('active', 'completed')),
    CONSTRAINT chk_grocery_lists_completed_at
        CHECK ((status = 'completed' AND completed_at IS NOT NULL)
               OR (status = 'active' AND completed_at IS NULL))
);


-- 13. grocery_items --------------------------------------------------
CREATE TABLE public.grocery_items (
    grocery_item_id  uuid         NOT NULL,
    user_id          varchar(128) NOT NULL,
    grocery_list_id  uuid         NOT NULL,
    item_name        varchar(150) NOT NULL,
    quantity         numeric,
    unit             varchar(30),
    notes            text,
    is_purchased     boolean      NOT NULL DEFAULT false,
    display_order    integer      NOT NULL DEFAULT 0,
    created_at       timestamptz  NOT NULL,
    updated_at       timestamptz  NOT NULL,
    CONSTRAINT grocery_items_pkey PRIMARY KEY (grocery_item_id),
    CONSTRAINT uq_grocery_items_user_id UNIQUE (user_id, grocery_item_id),
    CONSTRAINT fk_grocery_items_user FOREIGN KEY (user_id) REFERENCES public.app_users (user_id),
    CONSTRAINT fk_grocery_items_list FOREIGN KEY (user_id, grocery_list_id)
        REFERENCES public.grocery_lists (user_id, grocery_list_id),
    CONSTRAINT chk_grocery_items_quantity CHECK (quantity IS NULL OR quantity > 0),
    CONSTRAINT chk_grocery_items_display_order CHECK (display_order >= 0)
);


-- 14. api_tokens -----------------------------------------------------
CREATE TABLE public.api_tokens (
    api_token_id  uuid         NOT NULL,
    user_id       varchar(128) NOT NULL,
    token_name    varchar(100) NOT NULL,
    token_hash    varchar(64)  NOT NULL,   -- store a hash, never the raw token
    status        varchar(20)  NOT NULL DEFAULT 'active',
    last_used_at  timestamptz,
    expires_at    timestamptz,
    revoked_at    timestamptz,
    created_at    timestamptz  NOT NULL,
    updated_at    timestamptz  NOT NULL,
    CONSTRAINT api_tokens_pkey PRIMARY KEY (api_token_id),
    CONSTRAINT uq_api_tokens_user_id UNIQUE (user_id, api_token_id),
    CONSTRAINT uq_api_tokens_hash UNIQUE (token_hash),
    CONSTRAINT fk_api_tokens_user FOREIGN KEY (user_id) REFERENCES public.app_users (user_id),
    CONSTRAINT chk_api_tokens_status CHECK (status IN ('active', 'revoked')),
    CONSTRAINT chk_api_tokens_revoked_at
        CHECK ((status = 'revoked' AND revoked_at IS NOT NULL)
               OR (status = 'active' AND revoked_at IS NULL))
);


-- 15. api_idempotency_keys -------------------------------------------
CREATE TABLE public.api_idempotency_keys (
    idempotency_key_id  uuid         NOT NULL,
    user_id             varchar(128) NOT NULL,
    api_token_id        uuid         NOT NULL,
    idempotency_key     varchar(255) NOT NULL,
    request_hash        varchar(64)  NOT NULL,
    transaction_id      uuid,
    response_status     integer,
    response_body       text,
    expires_at          timestamptz  NOT NULL,
    created_at          timestamptz  NOT NULL,
    CONSTRAINT api_idempotency_keys_pkey PRIMARY KEY (idempotency_key_id),
    CONSTRAINT uq_api_idempotency_keys_user_id UNIQUE (user_id, idempotency_key_id),
    CONSTRAINT uq_api_idempotency_keys_key UNIQUE (user_id, idempotency_key),
    CONSTRAINT fk_api_idempotency_keys_user FOREIGN KEY (user_id)
        REFERENCES public.app_users (user_id),
    CONSTRAINT fk_api_idempotency_keys_token FOREIGN KEY (user_id, api_token_id)
        REFERENCES public.api_tokens (user_id, api_token_id),
    CONSTRAINT fk_api_idempotency_keys_transaction FOREIGN KEY (user_id, transaction_id)
        REFERENCES public.transactions (user_id, transaction_id),
    CONSTRAINT chk_api_idempotency_keys_response_status
        CHECK (response_status IS NULL OR (response_status BETWEEN 100 AND 599))
);


-- 16. audit_logs -----------------------------------------------------
CREATE TABLE public.audit_logs (
    audit_log_id  uuid         NOT NULL,
    user_id       varchar(128) NOT NULL,
    entity_type   varchar(50)  NOT NULL,
    entity_id     uuid         NOT NULL,
    action        varchar(50)  NOT NULL,
    old_values    jsonb,
    new_values    jsonb,
    ip_address    varchar(45),
    user_agent    text,
    created_at    timestamptz  NOT NULL,
    CONSTRAINT audit_logs_pkey PRIMARY KEY (audit_log_id),
    CONSTRAINT uq_audit_logs_user_id UNIQUE (user_id, audit_log_id),
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES public.app_users (user_id)
);


-- 17. monthly_reports ------------------------------------------------
CREATE TABLE public.monthly_reports (
    monthly_report_id  uuid          NOT NULL,
    user_id            varchar(128)  NOT NULL,
    report_year        integer       NOT NULL,
    report_month       integer       NOT NULL,
    status             varchar(20)   NOT NULL DEFAULT 'pending',
    s3_key             varchar(1024),
    file_size_bytes    bigint,
    generated_at       timestamptz,
    error_message      text,
    created_at         timestamptz   NOT NULL,
    updated_at         timestamptz   NOT NULL,
    CONSTRAINT monthly_reports_pkey PRIMARY KEY (monthly_report_id),
    CONSTRAINT uq_monthly_reports_user_id UNIQUE (user_id, monthly_report_id),
    CONSTRAINT uq_monthly_reports_user_month UNIQUE (user_id, report_year, report_month),
    CONSTRAINT fk_monthly_reports_user FOREIGN KEY (user_id)
        REFERENCES public.app_users (user_id),
    CONSTRAINT chk_monthly_reports_status
        CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    CONSTRAINT chk_monthly_reports_month CHECK (report_month BETWEEN 1 AND 12),
    CONSTRAINT chk_monthly_reports_year CHECK (report_year BETWEEN 2000 AND 9999),
    CONSTRAINT chk_monthly_reports_file_size
        CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0)
);


-- =====================================================================
-- Standalone indexes
-- (primary keys, UNIQUE constraints and the INCLUDE lists on the pkey
--  indexes came from the CREATE TABLE statements above)
-- =====================================================================

-- Unique, but not a constraint in the original: prevents generating the
-- same recurring occurrence twice for one user.
CREATE UNIQUE INDEX ASYNC uq_transactions_recurring_occurrence
    ON public.transactions (user_id, recurring_rule_id, recurrence_occurrence_date);

-- Lets the scheduler find due rules quickly.
CREATE INDEX ASYNC idx_recurring_rules_status_next_date
    ON public.recurring_rules (status, next_occurrence_date);

-- Lets the email job find reminders that are ready to send.
CREATE INDEX ASYNC idx_reminders_email_status_send_at
    ON public.reminders (email_status, email_send_at);
