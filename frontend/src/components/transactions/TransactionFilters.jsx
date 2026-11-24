import { Search, X } from "lucide-react";

import { Button } from "../ui/button";
import { DateRangePicker } from "../ui/date-range-picker";
import { Field } from "../ui/field";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { accountOptions, categoryOptions } from "../../lib/select-options";
import {
  EMPTY_FILTERS,
  UNCATEGORIZED,
  hasActiveFilters,
} from "../../lib/transaction-filters";

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
  { value: "refund", label: "Refund" },
];

// One row of filters for the transactions list. Controlled: `filters` is the
// current value (see lib/transaction-filters.js) and onChange gets the next.
export function TransactionFilters({
  filters,
  onChange,
  accounts,
  categories,
}) {
  const set = (key) => (value) => onChange({ ...filters, [key]: value });

  const categorySelectOptions = [
    { value: "", label: "All categories" },
    { value: UNCATEGORIZED, label: "Uncategorized" },
    { section: "Expenses", options: categoryOptions(categories, "expense") },
    { section: "Income", options: categoryOptions(categories, "income") },
  ];

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 text-card-foreground">
      <Field label="Search" htmlFor="filter_search">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="filter_search"
            type="search"
            value={filters.search}
            onChange={(event) => set("search")(event.target.value)}
            placeholder="Description, merchant, notes…"
            className="pl-9"
          />
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Field label="Account" htmlFor="filter_account">
          <Select
            id="filter_account"
            value={filters.accountId}
            options={accountOptions(accounts, { none: "All accounts" })}
            onValueChange={set("accountId")}
          />
        </Field>

        <Field label="Category" htmlFor="filter_category">
          <Select
            id="filter_category"
            value={filters.categoryId}
            options={categorySelectOptions}
            onValueChange={set("categoryId")}
          />
        </Field>

        <Field
          label="Type"
          htmlFor="filter_type"
          className="col-span-2 lg:col-span-1"
        >
          <Select
            id="filter_type"
            value={filters.type}
            options={TYPE_OPTIONS}
            onValueChange={set("type")}
          />
        </Field>

        <Field
          label="Date"
          htmlFor="filter_date"
          className="col-span-2 lg:col-span-1"
        >
          <DateRangePicker
            id="filter_date"
            value={{ from: filters.from, to: filters.to }}
            onChange={({ from, to }) => onChange({ ...filters, from, to })}
          />
        </Field>
      </div>

      {hasActiveFilters(filters) && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(EMPTY_FILTERS)}
          >
            <X />
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
