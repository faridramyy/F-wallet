import { query } from "../../database/db.js";

export const getCurrentUser = async (req, res, next) => {
  try {
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
      [req.user.sub, req.user.email],
    );

    res.status(200).json({
      success: true,
      data: {
        user: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};
