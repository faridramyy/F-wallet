import query from "../../database/query.js";

const settingsColumns = `
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
    // Ensure the authenticated user exists.
    await query(
      `
        INSERT INTO public.app_users (
          user_id,
          email,
          created_at,
          updated_at
        )
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          email = EXCLUDED.email,
          updated_at = CASE
            WHEN public.app_users.email IS DISTINCT FROM EXCLUDED.email
            THEN NOW()
            ELSE public.app_users.updated_at
          END
      `,
      [req.user.sub, req.user.email],
    );

    // Create settings using database defaults if they do not exist.
    await query(
      `
        INSERT INTO public.app_settings (
          user_id,
          created_at,
          updated_at
        )
        VALUES ($1, NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING
      `,
      [req.user.sub],
    );

    const result = await query(
      `
        SELECT ${settingsColumns}
        FROM public.app_settings
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

    assignments.push("updated_at = NOW()");

    const result = await query(
      `
        UPDATE public.app_settings
        SET ${assignments.join(", ")}
        WHERE user_id = $1
        RETURNING ${settingsColumns}
      `,
      [req.user.sub, ...values],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Settings not found. Fetch settings before updating.",
      });
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
