import { describe, expect, it } from "vitest";

import { BASE_SECURITY_HEADERS } from "./security-headers";

describe("baseline security headers", () => {
  it("includes transport, framing, content, privacy, and isolation controls", () => {
    const headers = Object.fromEntries(BASE_SECURITY_HEADERS.map(({ key, value }) => [key, value]));

    expect(headers).toMatchObject({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
      "Strict-Transport-Security": "max-age=31536000",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-DNS-Prefetch-Control": "off",
      "X-Permitted-Cross-Domain-Policies": "none",
    });
    expect(headers["Permissions-Policy"]).toContain("browsing-topics=()");
  });
});
