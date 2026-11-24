import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const strategies = {
  grid: rectSortingStrategy,
  list: verticalListSortingStrategy,
};

function SortableItem({ id, disabled, item, renderItem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  return renderItem(item, {
    containerRef: setNodeRef,
    dragHandleRef: setActivatorNodeRef,
    dragHandleProps: { ...attributes, ...listeners },
    style: {
      transform: CSS.Transform.toString(transform),
      transition,
      position: "relative",
      zIndex: isDragging ? 1 : undefined,
    },
    isDragging,
  });
}

// Drag-and-drop reordering for a list or grid.
//
//   renderItem(item, sortable) -> spread `sortable` onto the card
//                                 (containerRef, dragHandleRef, ...)
//   onReorder(fromIndex, toIndex) is called once a drop changes the order.
export function SortableList({
  items,
  getId,
  layout = "list",
  disabled = false,
  onReorder,
  renderItem,
  className,
}) {
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = items.map(getId);
  const activeItem =
    activeId === null ? null : items.find((item) => getId(item) === activeId);

  function handleDragEnd({ active, over }) {
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const from = ids.indexOf(active.id);
    const to = ids.indexOf(over.id);

    if (from !== -1 && to !== -1) onReorder(from, to);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={strategies[layout]}>
        <div className={className}>
          {items.map((item) => (
            <SortableItem
              key={getId(item)}
              id={getId(item)}
              item={item}
              disabled={disabled}
              renderItem={renderItem}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem && (
          // The floating copy under the pointer; `isOverlay` lets an item
          // style it (the original stays in place, faded, via isDragging).
          <div className="rotate-1 rounded-xl shadow-xl">
            {renderItem(activeItem, { isOverlay: true })}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
