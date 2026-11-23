import { randomUUID } from "node:crypto";
import query from "../../database/query.js";
import transaction from "../../database/transaction.js";

const budgetColumns = `
  budget_id,
  budget_year,
  budget_month,
  name,
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
    return next(
      createError("A budget already exists for this month and year.", 409),
    );
  }

  next(error);
};

const getBudgetWithAllocations = async (client, userId, budgetId) => {
  const result = await client.query(
    `
      SELECT
        b.budget_id,
        b.budget_year,
        b.budget_month,
        b.name,
        b.created_at,
        b.updated_at,
        bc.budget_category_id,
        bc.category_id,
        bc.allocated_cents,
        c.category_name,
        c.category_type,
        c.is_archived AS category_is_archived
      FROM public.budgets b
      LEFT JOIN public.budget_categories bc
        ON bc.budget_id = b.budget_id
        AND bc.user_id = b.user_id
      LEFT JOIN public.categories c
        ON c.category_id = bc.category_id
        AND c.user_id = bc.user_id
      WHERE b.budget_id = $1
        AND b.user_id = $2
      ORDER BY c.category_name ASC
    `,
    [budgetId, userId],
  );

  if (result.rowCount === 0) {
    return null;
  }

  const firstRow = result.rows[0];

  const allocations = result.rows
    .filter((row) => row.budget_category_id !== null)
    .map((row) => ({
      budget_category_id: row.budget_category_id,
      category_id: row.category_id,
      category_name: row.category_name,
      category_type: row.category_type,
      category_is_archived: row.category_is_archived,
      allocated_cents: row.allocated_cents,
    }));

  return {
    budget_id: firstRow.budget_id,
    budget_year: firstRow.budget_year,
    budget_month: firstRow.budget_month,
    name: firstRow.name,
    created_at: firstRow.created_at,
    updated_at: firstRow.updated_at,
    allocations,
  };
};

// Shared by GET /api/v1/budgets and GET /api/v1/bootstrap.
// Returns every budget (optionally for one year) with its allocations.
export const fetchBudgets = async (userId, year) => {
  const params = [userId];
  let yearCondition = "";

  if (year !== undefined) {
    params.push(year);
    yearCondition = "AND b.budget_year = $2";
  }

  const result = await query(
    `
      SELECT
        b.budget_id,
        b.budget_year,
        b.budget_month,
        b.name,
        b.created_at,
        b.updated_at,
        bc.budget_category_id,
        bc.category_id,
        bc.allocated_cents,
        c.category_name,
        c.category_type,
        c.is_archived AS category_is_archived
      FROM public.budgets b
      LEFT JOIN public.budget_categories bc
        ON bc.budget_id = b.budget_id
        AND bc.user_id = b.user_id
      LEFT JOIN public.categories c
        ON c.category_id = bc.category_id
        AND c.user_id = bc.user_id
      WHERE b.user_id = $1
        ${yearCondition}
      ORDER BY
        b.budget_year DESC,
        b.budget_month DESC,
        c.category_name ASC
    `,
    params,
  );

  const budgetsMap = new Map();

  for (const row of result.rows) {
    if (!budgetsMap.has(row.budget_id)) {
      budgetsMap.set(row.budget_id, {
        budget_id: row.budget_id,
        budget_year: row.budget_year,
        budget_month: row.budget_month,
        name: row.name,
        created_at: row.created_at,
        updated_at: row.updated_at,
        allocations: [],
      });
    }

    if (row.budget_category_id !== null) {
      budgetsMap.get(row.budget_id).allocations.push({
        budget_category_id: row.budget_category_id,
        category_id: row.category_id,
        category_name: row.category_name,
        category_type: row.category_type,
        category_is_archived: row.category_is_archived,
        allocated_cents: row.allocated_cents,
      });
    }
  }

  return Array.from(budgetsMap.values());
};

// GET /api/v1/budgets
export const getBudgets = async (req, res, next) => {
  try {
    const { year } = req.validated.query;

    const budgets = await fetchBudgets(req.user.sub, year);

    res.status(200).json({
      success: true,
      data: { budgets },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/budgets/:budgetId
export const getBudget = async (req, res, next) => {
  try {
    const { budgetId } = req.validated.params;

    const budget = await getBudgetWithAllocations(
      { query },
      req.user.sub,
      budgetId,
    );

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: { budget },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/budgets
export const createBudget = async (req, res, next) => {
  try {
    const { budget_year, budget_month, name } = req.validated.body;

    await ensureUserExists(req.user);

    const budgetId = randomUUID();

    const result = await query(
      `
        INSERT INTO public.budgets (
          budget_id,
          user_id,
          budget_year,
          budget_month,
          name,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING ${budgetColumns}
      `,
      [budgetId, req.user.sub, budget_year, budget_month, name ?? null],
    );

    res.status(201).json({
      success: true,
      data: {
        budget: {
          ...result.rows[0],
          allocations: [],
        },
      },
    });
  } catch (error) {
    handleControllerError(error, next);
  }
};

// PATCH /api/v1/budgets/:budgetId
export const updateBudget = async (req, res, next) => {
  try {
    const { budgetId } = req.validated.params;
    const updates = req.validated.body;

    const allowedFields = ["budget_year", "budget_month", "name"];

    const assignments = [];
    const values = [budgetId, req.user.sub];

    for (const field of allowedFields) {
      if (Object.hasOwn(updates, field)) {
        values.push(updates[field]);
        assignments.push(`${field} = $${values.length}`);
      }
    }

    assignments.push("updated_at = NOW()");

    const result = await query(
      `
        UPDATE public.budgets
        SET ${assignments.join(", ")}
        WHERE budget_id = $1
          AND user_id = $2
        RETURNING ${budgetColumns}
      `,
      values,
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Budget not found.",
      });
    }

    const budget = await getBudgetWithAllocations(
      { query },
      req.user.sub,
      budgetId,
    );

    res.status(200).json({
      success: true,
      data: { budget },
    });
  } catch (error) {
    handleControllerError(error, next);
  }
};

// PUT /api/v1/budgets/:budgetId/allocations
export const replaceBudgetAllocations = async (req, res, next) => {
  try {
    const { budgetId } = req.validated.params;
    const { allocations } = req.validated.body;

    const budget = await transaction(async (client) => {
      const budgetResult = await client.query(
        `
          SELECT budget_id
          FROM public.budgets
          WHERE budget_id = $1
            AND user_id = $2
        `,
        [budgetId, req.user.sub],
      );

      if (budgetResult.rowCount === 0) {
        throw createError("Budget not found.", 404);
      }

      if (allocations.length > 0) {
        const categoryIds = allocations.map(
          (allocation) => allocation.category_id,
        );

        const placeholders = categoryIds
          .map((_, index) => `$${index + 2}`)
          .join(", ");

        const categoryResult = await client.query(
          `
            SELECT category_id
            FROM public.categories
            WHERE user_id = $1
              AND is_archived = FALSE
              AND category_type = 'expense'
              AND category_id IN (${placeholders})
          `,
          [req.user.sub, ...categoryIds],
        );

        if (categoryResult.rowCount !== categoryIds.length) {
          throw createError(
            "One or more categories are invalid, archived, or are not expense categories.",
            400,
          );
        }
      }

      await client.query(
        `
          DELETE FROM public.budget_categories
          WHERE budget_id = $1
            AND user_id = $2
        `,
        [budgetId, req.user.sub],
      );

      for (const allocation of allocations) {
        await client.query(
          `
            INSERT INTO public.budget_categories (
              budget_category_id,
              user_id,
              budget_id,
              category_id,
              allocated_cents,
              created_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          `,
          [
            randomUUID(),
            req.user.sub,
            budgetId,
            allocation.category_id,
            allocation.allocated_cents,
          ],
        );
      }

      return getBudgetWithAllocations(client, req.user.sub, budgetId);
    });

    res.status(200).json({
      success: true,
      data: { budget },
    });
  } catch (error) {
    if (error.statusCode) {
      return next(error);
    }

    handleControllerError(error, next);
  }
};

// DELETE /api/v1/budgets/:budgetId
export const deleteBudget = async (req, res, next) => {
  try {
    const { budgetId } = req.validated.params;

    await transaction(async (client) => {
      const budgetResult = await client.query(
        `
          SELECT budget_id
          FROM public.budgets
          WHERE budget_id = $1
            AND user_id = $2
        `,
        [budgetId, req.user.sub],
      );

      if (budgetResult.rowCount === 0) {
        throw createError("Budget not found.", 404);
      }

      await client.query(
        `
          DELETE FROM public.budget_categories
          WHERE budget_id = $1
            AND user_id = $2
        `,
        [budgetId, req.user.sub],
      );

      await client.query(
        `
          DELETE FROM public.budgets
          WHERE budget_id = $1
            AND user_id = $2
        `,
        [budgetId, req.user.sub],
      );
    });

    res.status(200).json({
      success: true,
      message: "Budget deleted successfully.",
    });
  } catch (error) {
    if (error.statusCode) {
      return next(error);
    }

    handleControllerError(error, next);
  }
};
