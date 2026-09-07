/*
  Up and down buttons rather than drag and drop.

  Dragging is nicer on a desktop and genuinely awkward on a phone, where
  a long press to start a drag fights with the browser's own scroll and
  text selection. Two buttons work identically on every device, are
  reachable with a keyboard, and cannot half-fail the way a dropped drag
  can.
*/

export function ReorderButtons({ index, total, onMove }) {
  return (
    <span className="reorder-controls">
      <button
        type="button"
        className="icon-button"
        onClick={() => onMove(index, index - 1)}
        disabled={index === 0}
        aria-label="Move up"
      >
        <i className="fa-solid fa-chevron-up" />
      </button>

      <button
        type="button"
        className="icon-button"
        onClick={() => onMove(index, index + 1)}
        disabled={index === total - 1}
        aria-label="Move down"
      >
        <i className="fa-solid fa-chevron-down" />
      </button>
    </span>
  );
}

/*
  Returns a new array with the item at `from` moved to `to`. Used by both
  the accounts and categories pages, which then send the resulting id
  order to the server.
*/

export function moveItem(items, from, to) {
  if (to < 0 || to >= items.length) return items;

  const next = [...items];

  const [moved] = next.splice(from, 1);

  next.splice(to, 0, moved);

  return next;
}
