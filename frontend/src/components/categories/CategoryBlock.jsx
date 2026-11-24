import { cn } from "cn";

import { SortableList } from "../common/SortableList";
import { CategoryCard } from "./CategoryCard";

// Sortable sub-categories of one parent. Each list is its own drag area, so
// a sub-category can be reordered among its siblings but never leaves them.
function ChildList({ parent, nodes, ...props }) {
  const { disabled, onReorder } = props;

  return (
    <SortableList
      items={nodes}
      getId={(node) => node.category.category_id}
      disabled={disabled}
      onReorder={(from, to) => onReorder(parent.category_id, from, to)}
      className="divide-y divide-border border-t border-border"
      renderItem={(node, { containerRef, style, isOverlay, ...handle }) => (
        <div
          ref={containerRef}
          style={style}
          className={cn(isOverlay && "overflow-hidden rounded-xl")}
        >
          <CategoryRow node={node} {...handle} isChild {...props} />
        </div>
      )}
    />
  );
}

// A category row plus, nested under it, its own sub-categories.
//   dragHandleRef / dragHandleProps / isDragging: from SortableList
function CategoryRow({
  node,
  dragHandleRef,
  dragHandleProps,
  isDragging,
  isChild = false,
  ...props
}) {
  const { accountNames, onEdit, onArchive } = props;
  const { category, children } = node;

  return (
    <>
      <CategoryCard
        category={category}
        accountName={accountNames.get(category.default_account_id)}
        onEdit={onEdit}
        onArchive={onArchive}
        dragHandleRef={dragHandleRef}
        dragHandleProps={dragHandleProps}
        isDragging={isDragging}
        isChild={isChild}
      />

      {children.length > 0 && (
        <div className={cn(isChild && "pl-6")}>
          <ChildList parent={category} nodes={children} {...props} />
        </div>
      )}
    </>
  );
}

// One top-level category and all its sub-categories in a single bordered
// block. The drag props come from the top-level SortableList, so the whole
// block moves when the parent's handle is dragged.
//   props: accountNames, onEdit, onArchive, onReorder(parentId, from, to), disabled
export function CategoryBlock({
  node,
  containerRef,
  style,
  dragHandleRef,
  dragHandleProps,
  isDragging = false,
  // eslint-disable-next-line no-unused-vars -- the overlay copy looks the same
  isOverlay,
  ...props
}) {
  return (
    <div
      ref={containerRef}
      style={style}
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card",
        isDragging && "opacity-50",
      )}
    >
      <CategoryRow
        node={node}
        dragHandleRef={dragHandleRef}
        dragHandleProps={dragHandleProps}
        {...props}
      />
    </div>
  );
}
