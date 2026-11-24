import { query } from "../../database/db.js";

// Data access shared by every module that writes for the signed-in user.

// Creates the user's row on their first request and keeps the email in sync
// with Cognito. Returns the row. Other tables reference users, so call this
// before the first write that needs it.
//   user: req.user ({ sub, email })
export const upsertUser = async (user) => {
  const result = await query(
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
    [user.sub, user.email],
  );

  return result.rows[0];
};

// Creates the user's settings row with the database defaults if missing.
export const ensureUserSettings = (userId) =>
  query(
    `
      INSERT INTO f_wallet.user_settings (
        user_id
      )
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `,
    [userId],
  );
