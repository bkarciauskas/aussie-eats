import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import {
  ApiError,
  apiFetch,
  apiFetchAuthed,
  authResponseSchema,
  formatApiDetail,
  userPublicSchema,
} from "./api";

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("authResponseSchema accepts FastAPI login/signup payload", () => {
  const parsed = authResponseSchema.parse({
    access_token: "jwt.token.here",
    token_type: "bearer",
    user: {
      id: "u1",
      email: "demo@aussieeats.local",
      name: "Demo",
      role: "CUSTOMER",
    },
  });
  assert.equal(parsed.access_token, "jwt.token.here");
  assert.equal(parsed.user.role, "CUSTOMER");
  assert.equal(parsed.user.isGuest, false);
});

test("authResponseSchema accepts guest checkout payload", () => {
  const parsed = authResponseSchema.parse({
    access_token: "jwt.guest.here",
    token_type: "bearer",
    user: {
      id: "g1",
      email: "guest@example.com",
      name: "Guest",
      role: "CUSTOMER",
      isGuest: true,
    },
  });
  assert.equal(parsed.user.isGuest, true);
});

test("userPublicSchema rejects unknown roles", () => {
  const result = userPublicSchema.safeParse({
    id: "u1",
    email: "a@b.c",
    name: "A",
    role: "SUPERUSER",
  });
  assert.equal(result.success, false);
});

test("formatApiDetail reads string and validation-error arrays", () => {
  assert.equal(formatApiDetail({ detail: "Invalid email or password." }, "x"), "Invalid email or password.");
  assert.equal(
    formatApiDetail({ detail: [{ msg: "field required" }, { message: "too short" }] }, "x"),
    "field required; too short",
  );
  assert.equal(formatApiDetail({ nope: true }, "fallback"), "fallback");
});

test("apiFetch attaches Bearer token and validates the response", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  const data = await apiFetch("/auth/logout", {
    method: "POST",
    token: "test-jwt",
    schema: z.object({ ok: z.boolean() }),
  });

  assert.equal(data.ok, true);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/auth\/logout$/);
  const headers = new Headers(calls[0].init.headers);
  assert.equal(headers.get("Authorization"), "Bearer test-jwt");
});

test("apiFetch maps API error bodies to ApiError", async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ detail: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

  await assert.rejects(
    () =>
      apiFetch("/auth/me", {
        token: "bad",
        schema: userPublicSchema,
      }),
    (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 401);
      assert.equal(err.detail, "Invalid token");
      return true;
    },
  );
});

test("apiFetch rejects unexpected success shapes", async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ unexpected: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

  await assert.rejects(
    () =>
      apiFetch("/auth/me", {
        token: "tok",
        schema: userPublicSchema,
      }),
    (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 502);
      return true;
    },
  );
});

test("apiFetch does not send Authorization when token is missing", async () => {
  const calls: RequestInit[] = [];
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    calls.push(init ?? {});
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  await apiFetch("/health", {
    schema: z.object({ status: z.string() }),
  });

  const headers = new Headers(calls[0].headers);
  assert.equal(headers.get("Authorization"), null);
});

test("apiFetchAuthed rejects missing session tokens without calling fetch", async () => {
  let fetched = false;
  globalThis.fetch = (async () => {
    fetched = true;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;

  await assert.rejects(
    () =>
      apiFetchAuthed("/auth/me", {
        schema: userPublicSchema,
        getToken: async () => null,
      }),
    (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 401);
      assert.equal(err.detail, "Not authenticated");
      return true;
    },
  );
  assert.equal(fetched, false);
});

test("apiFetchAuthed clears session when the API returns 401", async () => {
  let cleared = 0;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ detail: "Token has expired" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

  await assert.rejects(
    () =>
      apiFetchAuthed("/auth/me", {
        schema: userPublicSchema,
        getToken: async () => "expired-jwt",
        onUnauthorized: async () => {
          cleared += 1;
        },
      }),
    (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 401);
      assert.equal(err.detail, "Token has expired");
      return true;
    },
  );
  assert.equal(cleared, 1);
});
