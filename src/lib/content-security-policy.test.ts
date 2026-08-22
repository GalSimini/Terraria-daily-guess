import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy } from "./content-security-policy";

describe("content security policy", () => {
  it("uses a per-request nonce without unsafe production directives", () => {
    const policy = buildContentSecurityPolicy("test-nonce", false);

    expect(policy).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'");
    expect(policy).toContain("style-src 'self' 'nonce-test-nonce'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("unsafe-inline");
    expect(policy).not.toContain("unsafe-eval");
  });
});
