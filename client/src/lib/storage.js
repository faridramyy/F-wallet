/*
  Thin wrapper around localStorage.

  localStorage can throw: Safari in some private modes, browsers with site
  data blocked, or a full quota. Reading or writing it directly during
  render would crash the whole app, so every access goes through here and
  falls back to "nothing stored".
*/

export function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key, value) {
  try {
    if (value) {
      window.localStorage.setItem(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Nothing useful to do: the value just will not persist.
  }
}
