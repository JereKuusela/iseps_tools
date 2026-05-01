import { describe, expect, it } from "vitest";
import { LargeNumber } from "./large-number";

describe("LargeNumber.parse", () => {
  it("parses scientific notation", () => {
    const value = LargeNumber.parse("1.23e456");
    expect(value.mantissa).toBeCloseTo(1.23);
    expect(value.exponent).toBe(456);
  });

  it("normalizes plain numbers", () => {
    const value = LargeNumber.parse("1200");
    expect(value.mantissa).toBeCloseTo(1.2);
    expect(value.exponent).toBe(3);
  });

  it("rejects invalid format", () => {
    expect(() => LargeNumber.parse("abc")).toThrow("Invalid number format");
  });
});

describe("LargeNumber arithmetic", () => {
  it("adds values with close exponents", () => {
    const result = LargeNumber.parse("1e10").add("2e10");
    expect(result.mantissa).toBeCloseTo(3);
    expect(result.exponent).toBe(10);
  });

  it("ignores tiny addend when exponent gap is above alignment threshold", () => {
    const result = LargeNumber.parse("9.99e100").add("5e80");
    expect(result.mantissa).toBeCloseTo(9.99);
    expect(result.exponent).toBe(100);
  });

  it("subtracts values", () => {
    const result = LargeNumber.parse("5e6").subtract("2e6");
    expect(result.mantissa).toBeCloseTo(3);
    expect(result.exponent).toBe(6);
  });

  it("multiplies values", () => {
    const result = LargeNumber.parse("2e5").multiply("3e7");
    expect(result.mantissa).toBeCloseTo(6);
    expect(result.exponent).toBe(12);
  });

  it("divides values", () => {
    const result = LargeNumber.parse("9e9").divide("3e2");
    expect(result.mantissa).toBeCloseTo(3);
    expect(result.exponent).toBe(7);
  });

  it("throws on divide by zero", () => {
    expect(() => LargeNumber.parse("1e1").divide("0e0")).toThrow(
      "Division by zero",
    );
  });

  it("handles integer power", () => {
    const result = LargeNumber.parse("2e3").powInt(4);
    expect(result.mantissa).toBeCloseTo(1.6);
    expect(result.exponent).toBe(13);
  });

  it("rejects non-integer power", () => {
    expect(() => LargeNumber.parse("2e3").powInt(1.5)).toThrow(
      "Power must be an integer",
    );
  });
});

describe("LargeNumber compare and format", () => {
  it("compares positive values", () => {
    const a = LargeNumber.parse("5e10");
    const b = LargeNumber.parse("4e10");
    expect(a.compare(b)).toBe(1);
    expect(b.compare(a)).toBe(-1);
  });

  it("compares negative values correctly", () => {
    const a = LargeNumber.parse("-2e8");
    const b = LargeNumber.parse("-5e7");
    expect(a.compare(b)).toBe(-1);
  });

  it("formats with two decimals by default", () => {
    const value = LargeNumber.parse("1.2345e99");
    expect(value.toString()).toBe("1.23e99");
  });
});
