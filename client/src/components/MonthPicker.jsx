import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function MonthPicker({ month, onChange, label }) {
  const shift = (delta) => {
    const [year, monthNumber] = month.split("-").map(Number);

    const date = new Date(year, monthNumber - 1 + delta, 1);

    onChange(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    );
  };

  return (
    <div className="flex items-center gap-1 rounded-full bg-muted p-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => shift(-1)}
        aria-label="Previous month"
      >
        <ChevronLeft className="size-4" />
      </Button>

      <span className="min-w-23 text-center text-sm font-semibold">
        {label}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => shift(1)}
        aria-label="Next month"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
