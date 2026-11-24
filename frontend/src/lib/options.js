// Option lists shared by forms.

export const CURRENCY_OPTIONS = [
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "AUD", label: "AUD — Australian Dollar" },
];

export const MONTH_OPTIONS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
].map((label, index) => ({ value: String(index + 1), label }));

export const CATEGORY_TYPE_OPTIONS = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
];
