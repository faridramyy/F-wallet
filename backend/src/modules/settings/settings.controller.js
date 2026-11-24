import { createError } from "../../utils/http-error.js";
import { query } from "../../database/db.js";
import { upsertUser, ensureUserSettings } from "../users/users.service.js";

export const settingsColumns = `
  currency,
  timezone,
  date_format,
  theme,
  notify_recurring_reminders,
  notify_budget_thresholds,
  notify_apple_pay_failures,
  notify_unknown_cards,
  notify_unmatched_accounts,
  notify_monthly_reports,
  recurring_generation_window_days,
  created_at,
  updated_at
`;

export const getSettings = async (req, res, next) => {
  try {
    await upsertUser(req.user);

    await ensureUserSettings(req.user.sub);

    const result = await query(
      `
        SELECT ${settingsColumns}
        FROM f_wallet.user_settings
        WHERE user_id = $1
      `,
      [req.user.sub],
    );

    res.status(200).json({
      success: true,
      data: {
        settings: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const updates = req.validated.body;
    const fields = Object.keys(updates);
    const values = Object.values(updates);

    const assignments = fields.map(
      (field, index) => `${field} = $${index + 2}`,
    );

    assignments.push("updated_at = DEFAULT");

    const result = await query(
      `
        UPDATE f_wallet.user_settings
        SET ${assignments.join(", ")}
        WHERE user_id = $1
        RETURNING ${settingsColumns}
      `,
      [req.user.sub, ...values],
    );

    if (result.rowCount === 0) {
      return next(
        createError("Settings not found. Fetch settings before updating.", 404),
      );
    }

    res.status(200).json({
      success: true,
      data: {
        settings: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};
