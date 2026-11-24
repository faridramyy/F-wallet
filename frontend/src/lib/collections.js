// Immutable helpers for lists of API records, keyed by an id field.

export const replaceById = (list, key, record) =>
  list.map((item) => (item[key] === record[key] ? record : item));

export const removeById = (list, key, id) =>
  list.filter((item) => item[key] !== id);
