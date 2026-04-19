import { describe, it, expect } from "vitest";
import { checkRateLimit } from "./rateLimit";

describe("checkRateLimit", () => {
  it("allows requests under the limit", () => {
    const key = `test-${Date.now()}-allow`;
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(key, 5, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5 - i - 1);
    }
  });

  it("blocks requests over the limit", () => {
    const key = `test-${Date.now()}-block`;
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, 3, 60000);
    }
    const result = checkRateLimit(key, 3, 60000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("allows requests again after the window expires", async () => {
    const key = `test-${Date.now()}-expire`;
    const windowMs = 50;
    for (let i = 0; i < 2; i++) {
      checkRateLimit(key, 2, windowMs);
    }
    // Blocked immediately
    expect(checkRateLimit(key, 2, windowMs).allowed).toBe(false);
    // Wait for window to pass
    await new Promise((r) => setTimeout(r, windowMs + 10));
    const result = checkRateLimit(key, 2, windowMs);
    expect(result.allowed).toBe(true);
  });
});
