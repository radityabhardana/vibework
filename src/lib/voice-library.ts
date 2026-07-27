export type StoredVoiceSample = {
  id: string;
  name: string;
  lang: string;
  audio: Blob;
  createdAt: string;
};

const DATABASE_NAME = 'vibework-voice-library';
const STORE_NAME = 'voices';

function openVoiceDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open the voice library.'));
  });
}

export async function listVoiceSamples() {
  const database = await openVoiceDatabase();
  try {
    return await new Promise<StoredVoiceSample[]>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve((request.result as StoredVoiceSample[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      request.onerror = () => reject(request.error || new Error('Unable to load voice samples.'));
    });
  } finally {
    database.close();
  }
}

export async function saveVoiceSample(sample: Omit<StoredVoiceSample, 'id' | 'createdAt'>) {
  const record: StoredVoiceSample = {
    ...sample,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const database = await openVoiceDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).add(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Unable to save the voice sample.'));
    });
    return record;
  } finally {
    database.close();
  }
}

export async function deleteVoiceSample(id: string) {
  const database = await openVoiceDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Unable to delete the voice sample.'));
    });
  } finally {
    database.close();
  }
}
