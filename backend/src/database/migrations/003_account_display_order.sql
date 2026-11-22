-- Migration 003: Add account display ordering
-- 1. Add the display order column.
ALTER TABLE public.accounts
ADD COLUMN display_order integer;

-- 2. Assign an initial order to existing accounts.
-- Oldest accounts appear first, starting at position 0.
WITH
    ranked_accounts AS (
        SELECT
            account_id,
            ROW_NUMBER() OVER (
                PARTITION BY
                    user_id
                ORDER BY
                    created_at ASC,
                    account_id ASC
            ) - 1 AS new_display_order
        FROM
            public.accounts
    )
UPDATE public.accounts AS accounts
SET
    display_order = ranked_accounts.new_display_order
FROM
    ranked_accounts
WHERE
    accounts.account_id = ranked_accounts.account_id;

-- 3. Ensure every account has a display order.
ALTER TABLE public.accounts ADD CONSTRAINT chk_accounts_display_order_not_null CHECK (display_order IS NOT NULL) NOT VALID;

-- 4. Create a unique index for each user's account positions.
CREATE UNIQUE INDEX ASYNC uq_accounts_user_display_order ON public.accounts (user_id, display_order);