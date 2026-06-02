import crypto from "crypto";

export function getStorageToken(userId: string): string {
  const secret = process.env.STORAGE_SERVER_SECRET;
  if (!secret) throw new Error("STORAGE_SERVER_SECRET tanımlanmamış");
  return crypto.createHmac("sha256", secret).update(userId).digest("hex");
}

export function buildStorageUrl(
  userId: string,
  fileName: string,
): string {
  const base = process.env.STORAGE_SERVER_URL;
  if (!base) throw new Error("STORAGE_SERVER_URL tanımlanmamış");
  return `${base}/upload?userId=${encodeURIComponent(userId)}&fileName=${encodeURIComponent(fileName)}`;
}

export function buildStorageFileUrl(
  userId: string,
  fileName: string,
): string {
  const base = process.env.STORAGE_SERVER_URL;
  if (!base) throw new Error("STORAGE_SERVER_URL tanımlanmamış");
  return `${base}/storage/${userId}/${fileName}`;
}

export async function uploadToStorageServer(
  userId: string,
  fileName: string,
  buffer: ArrayBuffer | Buffer,
): Promise<string> {
  const token = getStorageToken(userId);
  const url = buildStorageUrl(userId, fileName);

  const uint8Data = buffer instanceof Buffer
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : (buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer));

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "X-Storage-Token": token,
      "X-User-Id": userId,
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    body: uint8Data as unknown as BodyInit,
  });

  if (!response.ok) {
    throw new Error(`Depolama sunucusu hatası: ${response.status}`);
  }

  const result = await response.json() as { url: string };
  return result.url;
}