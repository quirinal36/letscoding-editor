import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifySignature } from "../src/lib/server/internal-auth";
import {
  createLoungeHandler,
  type LoungeServices,
} from "../integration/lounge-handler";
const secret = "test-only-secret";
function signed(body: string, timestamp = Date.now()) {
  const nonce = crypto.randomUUID();
  return new Headers({
    "x-editor-timestamp": String(timestamp),
    "x-editor-nonce": nonce,
    "x-editor-signature": createHmac("sha256", secret)
      .update(`${timestamp}.${nonce}.${body}`)
      .digest("hex"),
  });
}
test("HMAC rejects tampering, stale clocks and missing secrets", () => {
  const body = "{}";
  const headers = signed(body);
  assert.equal(verifySignature(headers, body, secret), true);
  assert.equal(verifySignature(headers, '{"x":1}', secret), false);
  assert.equal(
    verifySignature(signed(body, Date.now() - 61000), body, secret),
    false,
  );
  assert.equal(verifySignature(headers, body, ""), false);
});
test("lounge contract rejects replay and owner mismatch; completion has a receipt", async () => {
  const nonces = new Set<string>();
  let allowed = true;
  let completions = 0;
  const services: LoungeServices = {
    claimNonce: async (n) => {
      if (nonces.has(n)) return false;
      nonces.add(n);
      return true;
    },
    authorize: async () => allowed,
    prepare: async () => ({
      projectId: crypto.randomUUID(),
      uploadId: "upload",
      uploadUrl: "https://example.supabase.co/upload",
    }),
    complete: async () => {
      completions++;
      return {
        resultUrl: "https://play.letscoding.kr/hello",
        policyVersion: "test",
      };
    },
  };
  const handler = createLoungeHandler(services, secret);
  const body = JSON.stringify({
    action: "complete",
    userId: crypto.randomUUID(),
    editorProjectId: crypto.randomUUID(),
    uploadId: "upload",
    loungeProjectId: crypto.randomUUID(),
  });
  const headers = signed(body);
  const request = () =>
    new Request("https://lounge.test/internal", {
      method: "POST",
      headers,
      body,
    });
  assert.equal((await handler(request())).status, 200);
  assert.equal(completions, 1);
  assert.equal((await handler(request())).status, 409);
  allowed = false;
  assert.equal(
    (
      await handler(
        new Request("https://lounge.test/internal", {
          method: "POST",
          headers: signed(body),
          body,
        }),
      )
    ).status,
    403,
  );
});
