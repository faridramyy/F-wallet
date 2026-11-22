import { randomUUID } from "node:crypto";
import query from "../../database/query.js";
import transaction from "../../database/transaction.js";

const categoryColumns = `
  category_id,
  category_name,
  category_type,
  parent_category_id,
  default_account_id,
  display_order,
  is_archived,
  archived_at,
  notes,
  created_at,
  updated_at
`;

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const ensureUserExists = async (user) => {
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
    [user.sub, user.email],
  );
};

const handleControllerError = (error, next) => {
  if (error.code === "23505") {
    return next(createError("A category with this name already exists.", 409));
  }

  next(error);
};

// Validate parent category and default account ownership.
const validateCategoryReferences = async (
  client,
  {
    userId,
    categoryType,
    parentCategoryId,
    defaultAccountId,
    currentCategoryId = null,
  },
) => {
  // Validate the parent and walk its ancestry to prevent circular hierarchies.
  if (parentCategoryId) {
    let currentParentId = parentCategoryId;
    const visited = new Set();

    while (currentParentId) {
      if (currentParentId === currentCategoryId) {
        throw createError(
          "A category cannot be its own parent or descendant.",
          400,
        );
      }

      if (visited.has(currentParentId)) {
        throw createError(
          "The existing category hierarchy contains a circular relationship.",
          400,
        );
      }

      visited.add(currentParentId);

      const parentResult = await client.query(
        `
          SELECT
            category_id,
            category_type,
            parent_category_id,
            is_archived
          FROM public.categories
          WHERE category_id = $1
            AND user_id = $2
        `,
        [currentParentId, userId],
      );

      if (parentResult.rowCount === 0) {
        throw createError("Parent category not found.", 404);
      }

      const parent = parentResult.rows[0];

      if (parent.is_archived) {
        throw createError(
          "An archived category cannot be used as a parent.",
          400,
        );
      }

      if (parent.category_type !== categoryType) {
        throw createError(
          "A subcategory must have the same type as its parent.",
          400,
        );
      }

      currentParentId = parent.parent_category_id;
    }
  }

  // Validate the default account.
  if (defaultAccountId) {
    const accountResult = await client.query(
      `
        SELECT account_id
        FROM public.accounts
        WHERE account_id = $1
          AND user_id = $2
          AND is_archived = FALSE
      `,
      [defaultAccountId, userId],
    );

    if (accountResult.rowCount === 0) {
      throw createError("Default account not found or archived.", 404);
    }
  }
};

// GET /api/v1/categories
export const getCategories = async (req, res, next) => {
  try {
    const result = await query(
      `
        SELECT ${categoryColumns}
        FROM public.categories
        WHERE user_id = $1
          AND is_archived = FALSE
        ORDER BY display_order ASC, category_name ASC
      `,
      [req.user.sub],
    );

    res.status(200).json({
      success: true,
      data: {
        categories: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/categories/:categoryId
export const getCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.validated.params;

    const result = await query(
      `
        SELECT ${categoryColumns}
        FROM public.categories
        WHERE category_id = $1
          AND user_id = $2
          AND is_archived = FALSE
      `,
      [categoryId, req.user.sub],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        category: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/categories
export const createCategory = async (req, res, next) => {
  try {
    const data = req.validated.body;
    const userId = req.user.sub;

    await ensureUserExists(req.user);

    const categoryId = randomUUID();

    const result = await transaction(async (client) => {
      await validateCategoryReferences(client, {
        userId,
        categoryType: data.category_type,
        parentCategoryId: data.parent_category_id ?? null,
        defaultAccountId: data.default_account_id ?? null,
      });

      const orderResult = await client.query(
        `
          SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order
          FROM public.categories
          WHERE user_id = $1
        `,
        [userId],
      );

      const nextOrder = Number(orderResult.rows[0].next_order);

      return client.query(
        `
          INSERT INTO public.categories (
            category_id,
            user_id,
            category_name,
            category_type,
            parent_category_id,
            default_account_id,
            display_order,
            notes,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          RETURNING ${categoryColumns}
        `,
        [
          categoryId,
          userId,
          data.category_name,
          data.category_type,
          data.parent_category_id ?? null,
          data.default_account_id ?? null,
          nextOrder,
          data.notes ?? null,
        ],
      );
    });

    res.status(201).json({
      success: true,
      data: {
        category: result.rows[0],
      },
    });
  } catch (error) {
    handleControllerError(error, next);
  }
};

// PATCH /api/v1/categories/order
export const reorderCategories = async (req, res, next) => {
  try {
    const { category_ids: categoryIds } = req.validated.body;
    const userId = req.user.sub;

    if (new Set(categoryIds).size !== categoryIds.length) {
      return next(createError("Duplicate category IDs are not allowed.", 400));
    }

    await transaction(async (client) => {
      const existingResult = await client.query(
        `
          SELECT category_id
          FROM public.categories
          WHERE user_id = $1
            AND is_archived = FALSE
        `,
        [userId],
      );

      const existingIds = existingResult.rows.map(
        (category) => category.category_id,
      );

      if (
        existingIds.length !== categoryIds.length ||
        !categoryIds.every((id) => existingIds.includes(id))
      ) {
        throw createError(
          "The submitted category list does not match your active categories.",
          400,
        );
      }

      for (let index = 0; index < categoryIds.length; index += 1) {
        await client.query(
          `
            UPDATE public.categories
            SET
              display_order = $3,
              updated_at = NOW()
            WHERE category_id = $1
              AND user_id = $2
              AND is_archived = FALSE
          `,
          [categoryIds[index], userId, index],
        );
      }
    });

    const result = await query(
      `
        SELECT ${categoryColumns}
        FROM public.categories
        WHERE user_id = $1
          AND is_archived = FALSE
        ORDER BY display_order ASC, category_name ASC
      `,
      [userId],
    );

    res.status(200).json({
      success: true,
      data: {
        categories: result.rows,
      },
    });
  } catch (error) {
    handleControllerError(error, next);
  }
};

// PATCH /api/v1/categories/:categoryId
export const updateCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.validated.params;
    const updates = req.validated.body;
    const userId = req.user.sub;

    const result = await transaction(async (client) => {
      const existingResult = await client.query(
        `
          SELECT ${categoryColumns}
          FROM public.categories
          WHERE category_id = $1
            AND user_id = $2
            AND is_archived = FALSE
        `,
        [categoryId, userId],
      );

      if (existingResult.rowCount === 0) {
        throw createError("Category not found.", 404);
      }

      const existingCategory = existingResult.rows[0];

      const finalCategoryType =
        updates.category_type ?? existingCategory.category_type;

      const finalParentCategoryId =
        updates.parent_category_id !== undefined
          ? updates.parent_category_id
          : existingCategory.parent_category_id;

      const finalDefaultAccountId =
        updates.default_account_id !== undefined
          ? updates.default_account_id
          : existingCategory.default_account_id;

      await validateCategoryReferences(client, {
        userId,
        categoryType: finalCategoryType,
        parentCategoryId: finalParentCategoryId,
        defaultAccountId: finalDefaultAccountId,
        currentCategoryId: categoryId,
      });

      // A category's type cannot change if it would invalidate its children.
      if (finalCategoryType !== existingCategory.category_type) {
        const childrenResult = await client.query(
          `
            SELECT category_id
            FROM public.categories
            WHERE user_id = $1
              AND parent_category_id = $2
              AND category_type <> $3
          `,
          [userId, categoryId, finalCategoryType],
        );

        if (childrenResult.rowCount > 0) {
          throw createError(
            "Cannot change category type while its children have a different type.",
            400,
          );
        }
      }

      const fields = Object.keys(updates);
      const values = [categoryId, userId];

      const assignments = fields.map((field, index) => {
        values.push(updates[field]);
        return `${field} = $${index + 3}`;
      });

      assignments.push("updated_at = NOW()");

      return client.query(
        `
          UPDATE public.categories
          SET ${assignments.join(", ")}
          WHERE category_id = $1
            AND user_id = $2
            AND is_archived = FALSE
          RETURNING ${categoryColumns}
        `,
        values,
      );
    });

    res.status(200).json({
      success: true,
      data: {
        category: result.rows[0],
      },
    });
  } catch (error) {
    handleControllerError(error, next);
  }
};

// DELETE /api/v1/categories/:categoryId
export const archiveCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.validated.params;
    const userId = req.user.sub;

    const result = await transaction(async (client) => {
      const existingResult = await client.query(
        `
          SELECT category_id
          FROM public.categories
          WHERE category_id = $1
            AND user_id = $2
            AND is_archived = FALSE
        `,
        [categoryId, userId],
      );

      if (existingResult.rowCount === 0) {
        return null;
      }

      const childrenResult = await client.query(
        `
          SELECT category_id
          FROM public.categories
          WHERE user_id = $1
            AND parent_category_id = $2
            AND is_archived = FALSE
        `,
        [userId, categoryId],
      );

      if (childrenResult.rowCount > 0) {
        throw createError(
          "Archive or reassign active subcategories before archiving this category.",
          409,
        );
      }

      return client.query(
        `
          UPDATE public.categories
          SET
            is_archived = TRUE,
            archived_at = NOW(),
            updated_at = NOW()
          WHERE category_id = $1
            AND user_id = $2
            AND is_archived = FALSE
          RETURNING ${categoryColumns}
        `,
        [categoryId, userId],
      );
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        category: result.rows[0],
      },
    });
  } catch (error) {
    handleControllerError(error, next);
  }
};

// PATCH /api/v1/categories/:categoryId/restore
export const restoreCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.validated.params;
    const userId = req.user.sub;

    const result = await transaction(async (client) => {
      const existingResult = await client.query(
        `
          SELECT
            category_id,
            parent_category_id,
            category_type
          FROM public.categories
          WHERE category_id = $1
            AND user_id = $2
            AND is_archived = TRUE
        `,
        [categoryId, userId],
      );

      if (existingResult.rowCount === 0) {
        return null;
      }

      const category = existingResult.rows[0];

      if (category.parent_category_id) {
        const parentResult = await client.query(
          `
            SELECT category_id
            FROM public.categories
            WHERE category_id = $1
              AND user_id = $2
              AND category_type = $3
              AND is_archived = FALSE
          `,
          [category.parent_category_id, userId, category.category_type],
        );

        if (parentResult.rowCount === 0) {
          throw createError(
            "Restore the parent category before restoring this subcategory.",
            409,
          );
        }
      }

      return client.query(
        `
          UPDATE public.categories
          SET
            is_archived = FALSE,
            archived_at = NULL,
            updated_at = NOW()
          WHERE category_id = $1
            AND user_id = $2
            AND is_archived = TRUE
          RETURNING ${categoryColumns}
        `,
        [categoryId, userId],
      );
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Archived category not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        category: result.rows[0],
      },
    });
  } catch (error) {
    handleControllerError(error, next);
  }
};

// GET /api/v1/categories/archived
export const getArchivedCategories = async (req, res, next) => {
  try {
    const result = await query(
      `
        SELECT ${categoryColumns}
        FROM public.categories
        WHERE user_id = $1
          AND is_archived = TRUE
        ORDER BY archived_at DESC, category_name ASC
      `,
      [req.user.sub],
    );

    res.status(200).json({
      success: true,
      data: {
        categories: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};
