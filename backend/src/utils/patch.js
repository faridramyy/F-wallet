// For PATCH handlers: the new value of a field, or the stored one when the
// request did not send it. `undefined` means "not sent, keep it"; `null`
// means "clear it".
//
//   const pick = pickUpdate(req.validated.body);
//   const notes = pick("notes", existing.notes);
export const pickUpdate = (updates) => (key, current) =>
  updates[key] !== undefined ? updates[key] : current;
