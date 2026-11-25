const workspaceName = 'motivationsboost.workspace';
const objectStore = 'records';

function openWorkspace() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(workspaceName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(objectStore);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readLocalRecord(key: string): Promise<unknown> {
  const database = await openWorkspace();
  try {
    return await new Promise((resolve, reject) => {
      const read = database.transaction(objectStore).objectStore(objectStore).get(key);
      read.onsuccess = () => resolve(read.result);
      read.onerror = () => reject(read.error);
    });
  } finally {
    database.close();
  }
}

export async function updateLocalRecord<T>(key: string, update: (stored: unknown) => T) {
  const database = await openWorkspace();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(objectStore, 'readwrite');
      const store = transaction.objectStore(objectStore);
      const read = store.get(key);
      let updated: T;
      let cause: unknown;
      read.onsuccess = () => {
        try {
          updated = update(read.result);
          store.put(updated, key);
        } catch (error) {
          cause = error;
          transaction.abort();
        }
      };
      transaction.oncomplete = () => resolve(updated);
      transaction.onabort = () => reject(cause ?? transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function writeLocalRecords(records: Array<{ key: string; value: unknown }>) {
  const database = await openWorkspace();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(objectStore, 'readwrite');
      const store = transaction.objectStore(objectStore);
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
      for (const { key, value } of records) store.put(value, key);
    });
  } finally {
    database.close();
  }
}
