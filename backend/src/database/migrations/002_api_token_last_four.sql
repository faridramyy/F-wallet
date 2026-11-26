-- =====================================================================
-- Last four characters of each API token, so the user can tell their
-- tokens apart in Settings ("fw_…a1b2"). The full token is never stored,
-- only its hash. Tokens created before this migration have NULL here.
-- Database: Amazon Aurora DSQL (ADD COLUMN takes a name and type only)
-- =====================================================================

ALTER TABLE f_wallet.api_tokens
    ADD COLUMN token_last_four varchar(4);
