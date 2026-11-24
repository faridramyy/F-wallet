// Categories as a tree: each top-level category with its sub-categories.
//   node: { category, children: node[] }

const byDisplayOrder = (a, b) =>
  (a.display_order ?? 0) - (b.display_order ?? 0) ||
  a.category_name.localeCompare(b.category_name);

// The categories of one type as a tree, siblings in display order.
export function buildCategoryTree(categories, categoryType) {
  const ofType = categories.filter((c) => c.category_type === categoryType);
  const ids = new Set(ofType.map((c) => c.category_id));
  const childrenOf = new Map();

  for (const category of ofType) {
    const parentId = ids.has(category.parent_category_id)
      ? category.parent_category_id
      : null;

    if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
    childrenOf.get(parentId).push(category);
  }

  const visited = new Set();

  const toNode = (category) => {
    visited.add(category.category_id);

    return {
      category,
      children: (childrenOf.get(category.category_id) ?? [])
        .sort(byDisplayOrder)
        .filter((child) => !visited.has(child.category_id))
        .map(toNode),
    };
  };

  const roots = (childrenOf.get(null) ?? []).sort(byDisplayOrder).map(toNode);

  // Defensive: anything unreachable (e.g. a parent cycle) becomes top-level.
  for (const category of [...ofType].sort(byDisplayOrder)) {
    if (!visited.has(category.category_id)) roots.push(toNode(category));
  }

  return roots;
}

// A copy of the tree with one sibling list reordered. `parentId` is null for
// the top level; siblings never leave their parent.
export function moveWithinParent(nodes, parentId, from, to) {
  if (parentId === null) {
    const next = [...nodes];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  }

  return nodes.map((node) => ({
    ...node,
    children:
      node.category.category_id === parentId
        ? moveWithinParent(node.children, null, from, to)
        : moveWithinParent(node.children, parentId, from, to),
  }));
}

// Parents first, each followed by its descendants: the order display_order
// is saved in.
export function flattenCategoryTree(nodes) {
  return nodes.flatMap((node) => [
    node.category,
    ...flattenCategoryTree(node.children),
  ]);
}

// This month's budget use per category, with each parent showing its whole
// group: its own spending and budget plus all of its sub-categories'.
// Categories with no budget anywhere in their group are left out.
//   nodes:      buildCategoryTree() result
//   spentById:  { [categoryId]: cents spent }
//   limitById:  { [categoryId]: cents budgeted }
// Returns Map(categoryId -> { spentCents, limitCents }).
export function rollUpBudgetUsage(nodes, spentById, limitById) {
  const usage = new Map();

  const visit = (node) => {
    const id = node.category.category_id;
    let spentCents = spentById[id] ?? 0;
    let limitCents = limitById[id] ?? 0;

    for (const child of node.children) {
      const childTotals = visit(child);
      spentCents += childTotals.spentCents;
      limitCents += childTotals.limitCents;
    }

    if (limitCents > 0) usage.set(id, { spentCents, limitCents });
    return { spentCents, limitCents };
  };

  nodes.forEach(visit);
  return usage;
}
