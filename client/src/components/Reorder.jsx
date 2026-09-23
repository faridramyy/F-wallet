import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { cn } from "cn";

/*
  Drag and drop, not up/down buttons.

  The reason buttons were used originally still matters: dragging a whole
  row fights the browser's own scroll on a phone. The fix isn't to give
  that up, it's to only capture the gesture on a small handle rather than
  the whole row - `touch-none` below is scoped to the handle alone, so a
  swipe anywhere else on the row still scrolls the page normally.

  Keyboard reordering still works too: focus the handle, Space to pick
  up, arrow keys to move, Space to drop. That's `KeyboardSensor` below.
*/

export function SortableList({ ids, onReorder, grid = false, children }) {
  const sensors = useSensors(
    // A small movement threshold before a drag "activates" - without
    // this, a plain tap or a click on the handle would immediately
    // start a drag instead of registering as a click.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const from = ids.indexOf(active.id);
    const to = ids.indexOf(over.id);

    onReorder(arrayMove(ids, from, to));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={ids}
        strategy={grid ? rectSortingStrategy : verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  );
}

/*
  Wraps one row/card. `children` is a render function rather than plain
  children so the drag handle's listeners can be placed anywhere inside
  the row's own markup (Accounts puts it in a specific grid area, for
  instance) instead of always being the first child.
*/

export function SortableItem({ id, className, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "relative z-10", className)}
    >
      {children({ attributes, listeners, isDragging })}
    </div>
  );
}

export function DragHandle({ attributes, listeners, isDragging, className }) {
  return (
    <button
      type="button"
      aria-label="Drag to reorder"
      className={cn(
        "flex size-7 shrink-0 touch-none items-center justify-center rounded-lg text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing",
        isDragging ? "cursor-grabbing text-foreground" : "cursor-grab",
        className,
      )}
      {...attributes}
      {...listeners}
    >
      <i className="fa-solid fa-grip-vertical" />
    </button>
  );
}

/*
  Reorders just the items in `subsetIds` (e.g. only expense categories)
  while leaving every other item exactly where it already was in
  `fullItems`. When the subset IS the full list (Accounts has no
  grouping) this still works - it's the same operation either way.
*/

export function reorderWithin(fullItems, subsetIds, newOrder) {
  const byId = new Map(fullItems.map((item) => [item.id, item]));
  const subsetSet = new Set(subsetIds);

  let cursor = 0;

  return fullItems.map((item) =>
    subsetSet.has(item.id) ? byId.get(newOrder[cursor++]) : item,
  );
}
