import { describe, it, expect } from "vitest";
import {
  cn,
  formatBytes,
  formatCompact,
  formatNumber,
  formatValue,
  maskToken,
  nanoid,
  slugify,
  truncate,
  uniqueSlug,
} from "./utils";

describe("formatBytes", () => {
  it("formats byte units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(10240)).toBe("10 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0 GB");
  });
  it("handles invalid input", () => {
    expect(formatBytes(-1)).toBe("—");
    expect(formatBytes(Number.NaN)).toBe("—");
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("formatCompact / formatNumber", () => {
  it("formats compactly", () => {
    expect(formatCompact(1200000)).toBe("1.2M");
    expect(formatCompact(1000)).toBe("1K");
  });
  it("formats with thousands separators", () => {
    expect(formatNumber(1200000)).toBe("1,200,000");
    expect(formatNumber(1234.5)).toBe("1,234.5");
  });
});

describe("formatValue", () => {
  it("keeps integers whole and trims floats", () => {
    expect(formatValue(5)).toBe("5");
    expect(formatValue(5.25)).toBe("5.25");
    expect(formatValue(1 / 3)).toBe("0.3333");
  });
});

describe("maskToken", () => {
  it("masks everything but the last 4 chars", () => {
    expect(maskToken("")).toBe("");
    expect(maskToken("abcdef")).toBe("••••••");
    expect(maskToken("abcdefghij")).toBe("••••••••ghij");
  });
});

describe("truncate", () => {
  it("truncates long strings", () => {
    expect(truncate("hello world", 5)).toBe("hell…");
    expect(truncate("hi", 5)).toBe("hi");
    expect(truncate("", 5)).toBe("");
  });
});

describe("slugify", () => {
  it("turns names into URL-safe slugs", () => {
    expect(slugify("Prod Sensors")).toBe("prod-sensors");
    expect(slugify("  Hello  World!  ")).toBe("hello-world");
    expect(slugify("!!!")).toBe("instance");
  });
});

describe("uniqueSlug", () => {
  it("avoids collisions with a numeric suffix", () => {
    expect(uniqueSlug("cpu", [])).toBe("cpu");
    expect(uniqueSlug("cpu", ["cpu"])).toBe("cpu-2");
    expect(uniqueSlug("cpu", ["cpu", "cpu-2"])).toBe("cpu-3");
  });
});

describe("nanoid", () => {
  it("generates ids with an optional prefix", () => {
    expect(nanoid()).toHaveLength(10);
    expect(nanoid("ins")).toMatch(/^ins_[a-zA-Z0-9]{10}$/);
  });
});

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
    expect(cn(false, "x")).toBe("x");
  });
});
