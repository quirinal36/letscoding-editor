import { createHmac, timingSafeEqual } from "node:crypto";
export function verifySignature(
  headers: Headers,
  body: string,
  secret: string,
  now = Date.now(),
) {
  const timestamp = headers.get("x-editor-timestamp"),
    nonce = headers.get("x-editor-nonce"),
    signature = headers.get("x-editor-signature");
  if (
    !secret ||
    !timestamp ||
    !/^\d{13}$/.test(timestamp) ||
    Math.abs(now - Number(timestamp)) > 60000 ||
    !nonce ||
    !/^[a-f0-9-]{36}$/.test(nonce) ||
    !signature ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${nonce}.${body}`)
    .digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
