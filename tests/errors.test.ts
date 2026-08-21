import { describe, expect, it } from "vitest";

import { describeError, isTransientError } from "../lib/errors";

/** The shape postgrest-js rejects with -- a plain object, not an Error. */
const postgrestError = {
  message: 'relation "public.attempts" does not exist',
  details: null,
  hint: null,
  code: "42P01",
};

describe("describeError", () => {
  it("never renders an object as [object Object]", () => {
    for (const cause of [
      postgrestError,
      { message: "JWT expired", code: "PGRST301" },
      {},
      { weird: true },
      new Error("boom"),
      "plain string",
      null,
      undefined,
    ]) {
      expect(describeError(cause)).not.toContain("[object Object]");
    }
  });

  it("keeps the message and code of a Supabase error", () => {
    const described = describeError(postgrestError);
    expect(described).toContain('relation "public.attempts" does not exist');
    expect(described).toContain("42P01");
  });

  it("appends a hint when one is present", () => {
    expect(
      describeError({ message: "no", code: "1", hint: "run the migration" }),
    ).toBe("no (1) — run the migration");
  });

  it("unwraps Error instances", () => {
    expect(describeError(new Error("Failed to fetch"))).toBe("Failed to fetch");
  });

  it("falls back to JSON when there is no message field", () => {
    expect(describeError({ weird: true })).toBe('{"weird":true}');
  });

  it("does not crash on circular objects", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(describeError(circular)).toBe("Unknown error");
  });

  it("handles nothing being thrown at all", () => {
    expect(describeError(undefined)).toBe("Unknown error");
    expect(describeError(null)).toBe("Unknown error");
  });
});

describe("isTransientError", () => {
  it("retries an expired token", () => {
    expect(isTransientError({ message: "JWT expired", code: "PGRST301" })).toBe(
      true,
    );
  });

  it("retries a failed fetch and a waking backend", () => {
    expect(isTransientError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isTransientError({ message: "Service Unavailable", code: "503" })).toBe(
      true,
    );
  });

  it("does not retry a missing table, so the migration hint shows at once", () => {
    expect(isTransientError(postgrestError)).toBe(false);
    expect(
      isTransientError({
        message: "Could not find the table 'public.attempts'",
        code: "PGRST205",
      }),
    ).toBe(false);
  });

  it("does not retry an RLS denial", () => {
    expect(
      isTransientError({ message: "new row violates policy", code: "42501" }),
    ).toBe(false);
  });

  it("does not retry an unrecognised error", () => {
    expect(isTransientError({ message: "something odd" })).toBe(false);
  });
});
