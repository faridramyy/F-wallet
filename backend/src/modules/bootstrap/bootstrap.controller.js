import { query } from "../../database/db.js";
import {
  accountColumns,
  activeAccountsWithTotalsSql,
} from "../accounts/accounts.controller.js";
import { categoryColumns } from "../categories/categories.controller.js";
import { settingsColumns } from "../settings/settings.controller.js";
import { fetchBudgets } from "../budgets/budgets.controller.js";

// GET /api/v1/bootstrap
//
// Returns everything the app needs right after sign-in, in one response,
// so the client does not have to make one request per page.
export const getBootstrap = async (req, res, next) => {
  try {
    const userId = req.user.sub;

    // These two writes must run first and in this order: user_settings has a
    // foreign key to users. They also make sure a brand-new user gets a
    // user row and default settings on their very first request.
    const userResult = await query(
      `
        INSERT INTO f_wallet.users (
          user_id,
          email
        )
        VALUES ($1, $2)
        ON CONFLICT (user_id)
        DO UPDATE SET
          email = EXCLUDED.email,
          updated_at = CASE
            WHEN f_wallet.users.email IS DISTINCT FROM EXCLUDED.email
            THEN EXCLUDED.updated_at
            ELSE f_wallet.users.updated_at
          END
        RETURNING
          user_id,
          email,
          created_at,
          updated_at
      `,
      [userId, req.user.email],
    );

    await query(
      `
        INSERT INTO f_wallet.user_settings (
          user_id
        )
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `,
      [userId],
    );

    // The reads do not depend on each other, so they run in parallel.
    // The ORDER BY clauses match the individual list endpoints exactly.
    const [
      settingsResult,
      accountsResult,
      archivedAccountsResult,
      categoriesResult,
      archivedCategoriesResult,
      budgets,
    ] = await Promise.all([
      query(
        `
          SELECT ${settingsColumns}
          FROM f_wallet.user_settings
          WHERE user_id = $1
        `,
        [userId],
      ),
      query(activeAccountsWithTotalsSql, [userId]),
      query(
        `
          SELECT ${accountColumns}
          FROM f_wallet.accounts
          WHERE user_id = $1
            AND is_archived = TRUE
          ORDER BY archived_at DESC, account_name ASC
        `,
        [userId],
      ),
      query(
        `
          SELECT ${categoryColumns}
          FROM f_wallet.categories
          WHERE user_id = $1
            AND is_archived = FALSE
          ORDER BY display_order ASC, category_name ASC
        `,
        [userId],
      ),
      query(
        `
          SELECT ${categoryColumns}
          FROM f_wallet.categories
          WHERE user_id = $1
            AND is_archived = TRUE
          ORDER BY archived_at DESC, category_name ASC
        `,
        [userId],
      ),
      fetchBudgets(userId),
    ]);

    res.status(200).json({
      success: true,
      data: {
        user: userResult.rows[0],
        settings: settingsResult.rows[0],
        accounts: accountsResult.rows,
        archived_accounts: archivedAccountsResult.rows,
        categories: categoriesResult.rows,
        archived_categories: archivedCategoriesResult.rows,
        budgets,
      },
    });
  } catch (error) {
    next(error);
  }
};
