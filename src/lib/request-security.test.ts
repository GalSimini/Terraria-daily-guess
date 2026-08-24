import { describe, expect, it } from "vitest";

import {
  createFixedWindowRateLimiter,
  getClientIdentifier,
  InvalidJsonRequestError,
  isSameOrigin,
  readCookie,
  readJsonRequest,
  RequestTooLargeError,
} from "./request-security";

describe("request security", () => {
  it("limits a fixed request window and resets it after expiry", () => {
    let currentTime = 0;
    const limiter = createFixedWindowRateLimiter({ limit: 2, windowMs: 1_000, now: () => currentTime });

    expect(limiter.check("client").allowed).toBe(true);
    expect(limiter.check("client").allowed).toBe(true);
    expect(limiter.check("client")).toEqual({ allowed: false, retryAfterSeconds: 1 });

    currentTime = 1_000;
    expect(limiter.check("client").allowed).toBe(true);
  });

  it("requires a same-origin request and reads exact cookie names", () => {
    const request = new Request("https://game.example/api/daily/guess", {
      headers: { origin: "https://game.example", cookie: "other=value; session=trusted" },
    });

    expect(isSameOrigin(request)).toBe(true);
    expect(readCookie(request, "session")).toBe("trusted");
    expect(readCookie(request, "missing")).toBeUndefined();
    expect(isSameOrigin(new Request("https://game.example/api/daily/guess", { headers: { origin: "https://attacker.example" } }))).toBe(false);
  });

  it("uses only normalized proxy-provided client identifiers", () => {
    expect(getClientIdentifier(new Request("https://game.example", { headers: { "x-forwarded-for": "2001:DB8::1, 198.51.100.1" } }))).toBe("2001:db8::1");
    expect(getClientIdentifier(new Request("https://game.example", { headers: { "x-forwarded-for": "unbounded-user-controlled-value" } }))).toBe("unknown-client");
  });

  it("bounds JSON request bodies and rejects malformed payloads", async () => {
    const validRequest = new Request("https://game.example/api/daily/guess", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ guessId: "item:1" }),
    });
    await expect(readJsonRequest(validRequest)).resolves.toEqual({ guessId: "item:1" });

    const malformedRequest = new Request("https://game.example/api/daily/guess", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    await expect(readJsonRequest(malformedRequest)).rejects.toBeInstanceOf(InvalidJsonRequestError);

    const oversizedRequest = new Request("https://game.example/api/daily/guess", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "4097" },
      body: JSON.stringify({ guessId: "item:1" }),
    });
    await expect(readJsonRequest(oversizedRequest)).rejects.toBeInstanceOf(RequestTooLargeError);
  });
});
