import query from "../../database/query.js";

export const getCurrentUser = async (req, res, next) => {
  try {
    const result = await query(
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
