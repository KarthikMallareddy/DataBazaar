const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

export async function splitFileIntoChunks(file: File): Promise<ArrayBuffer[]> {
  const chunks: ArrayBuffer[] = [];
  let offset = 0;

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const arrayBuffer = await chunk.arrayBuffer();
    chunks.push(arrayBuffer);
    offset += CHUNK_SIZE;
  }

  return chunks;
}

export async function encryptChunk(chunk: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    chunk
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedData), iv.length);

  return combined.buffer;
}

export async function decryptChunk(encryptedChunk: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
  const iv = new Uint8Array(encryptedChunk.slice(0, 12));
  const data = encryptedChunk.slice(12);

  return await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    data
  );
}

export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function hashChunk(chunk: ArrayBuffer): Promise<Uint8Array> {
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', chunk);
  return new Uint8Array(hashBuffer);
}
