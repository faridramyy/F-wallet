-- Migration 002: Account Opening Balance
--
-- Adds an opening balance to accounts and removes
-- opening_balance from transaction types and entry roles.
--
-- IMPORTANT:
-- These changes have already been applied to the live
-- Aurora DSQL development database.
-- This file records the migration; do not execute it
-- against that database again.
--
-- Aurora DSQL requires the added column to be nullable.
-- The backend must supply a value or rely on the default.
-- 1. Add opening balance column.
ALTER TABLE public.accounts
ADD COLUMN opening_balance_cents BIGINT;

-- 2. Set default for future accounts.
ALTER TABLE public.accounts
ALTER COLUMN opening_balance_cents
SET DEFAULT 0;

-- 3. Initialize existing accounts.
UPDATE public.accounts
SET
    opening_balance_cents = 0
WHERE
    opening_balance_cents IS NULL;

-- 4. Replace transaction type constraint.
ALTER TABLE public.transactions
DROP CONSTRAINT chk_transactions_type;

ALTER TABLE public.transactions ADD CONSTRAINT chk_transactions_type CHECK (
    transaction_type IN (
        'income',
        'expense',
        'transfer',
        'refund',
        'adjustment'
    )
) NOT VALID;

-- 5. Replace transaction entry role constraint.
ALTER TABLE public.transaction_entries
DROP CONSTRAINT chk_transaction_entries_role;

ALTER TABLE public.transaction_entries ADD CONSTRAINT chk_transaction_entries_role CHECK (
    entry_role IN (
        'income',
        'expense',
        'refund',
        'source',
        'destination',
        'adjustment'
    )
) NOT VALID;