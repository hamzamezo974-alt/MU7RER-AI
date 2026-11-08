let owner: string | null = null;
export function setStorageOwner(id: string | null) { owner = id; }
export function getStorageOwner() { return owner; }
export function storageKey(key: string) { return owner ? `account:${owner}:${key}` : key; }

export function readStorage(key: string) {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(storageKey(key));
}

export function writeStorage(key: string, value: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(storageKey(key), value);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("workspace-change"));
}

export function removeStorage(key: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(storageKey(key));
  if (typeof window !== "undefined") window.dispatchEvent(new Event("workspace-change"));
}

export function workspaceSnapshot(): Record<string, string> {
  if (typeof localStorage === "undefined") return {};
  const result: Record<string, string> = {};
  const prefix = owner ? `account:${owner}:` : "";
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || (prefix && !key.startsWith(prefix))) continue;
    const name = prefix ? key.slice(prefix.length) : key;
    if (!name.startsWith("mu7rer:") || name.includes("key")) continue;
    result[name] = localStorage.getItem(key) ?? "";
  }
  return result;
}

/** ترحيل البيانات المحلية (ضيف) إلى حساب المستخدم عند تسجيل الدخول. */
export function migrateGuestToAccount(userId: string) {
  if (typeof localStorage === "undefined") return;
  const guestKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("mu7rer:") && !key.includes("key")) {
      guestKeys.push(key);
    }
  }
  if (guestKeys.length === 0) return;
  for (const key of guestKeys) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      localStorage.setItem(`account:${userId}:${key}`, value);
      localStorage.removeItem(key);
    }
  }
}
