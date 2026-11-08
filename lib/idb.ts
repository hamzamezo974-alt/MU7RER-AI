// مخزن بسيط بالمفتاح/القيمة فوق IndexedDB لحفظ صور المخطوطات (كتب كاملة) بدل localStorage.

const DB_NAME = "mu7rer";
const DB_VERSION = 1;
const STORE = "assets";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB not available"));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = run(tx.objectStore(STORE));
    let result: T;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("تعذّر حفظ الملف")); };
  });
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    return await withStore<T>("readonly", (store) => store.get(key) as IDBRequest<T>);
  } catch {
    return undefined;
  }
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  await withStore("readwrite", (store) => store.put(value, key) as IDBRequest<IDBValidKey>);
}

export async function idbDelete(key: string): Promise<void> {
  try {
    await withStore("readwrite", (store) => store.delete(key) as IDBRequest<undefined>);
  } catch {
    /* تجاهل */
  }
}
