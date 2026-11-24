import { upsertUser } from "./users.service.js";

export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await upsertUser(req.user);

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};
