import { Button } from "@/components/ui/button";

/*
  Up and down buttons rather than drag and drop. See the original note:
  dragging fights the browser's own scroll/selection on a phone, and two
  buttons work identically on every device and are keyboard reachable.
*/

export function ReorderButtons({ index, total, onMove }) {
  return (
    <span className="flex shrink-0 flex-col gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => onMove(index, index - 1)}
        disabled={index === 0}
        aria-label="Move up"
      >
        <i className="fa-solid fa-chevron-up" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => onMove(index, index + 1)}
        disabled={index === total - 1}
        aria-label="Move down"
      >
        <i className="fa-solid fa-chevron-down" />
      </Button>
    </span>
  );
}

export function moveItem(items, from, to) {
  if (to < 0 || to >= items.length) return items;

  const next = [...items];

  const [moved] = next.splice(from, 1);

  next.splice(to, 0, moved);

  return next;
}
