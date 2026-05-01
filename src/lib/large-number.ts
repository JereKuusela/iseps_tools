const MAX_ALIGN_DIFF = 15;

export class LargeNumber {
  mantissa: number;
  exponent: number;

  constructor(mantissa: number, exponent: number) {
    this.mantissa = mantissa;
    this.exponent = Math.trunc(exponent);
    this.normalize();
  }

  static zero(): LargeNumber {
    return new LargeNumber(0, 0);
  }

  static from(input: string | number | LargeNumber): LargeNumber {
    if (input instanceof LargeNumber)
      return new LargeNumber(input.mantissa, input.exponent);
    if (typeof input === "number") return new LargeNumber(input, 0);
    return LargeNumber.parse(input);
  }

  static parse(raw: string): LargeNumber {
    const value = raw.trim().toLowerCase();
    const match = value.match(/^([+-]?\d+(?:\.\d+)?)(?:e([+-]?\d+))?$/);

    if (!match) {
      throw new Error("Invalid number format. Use forms like 1.23e456");
    }

    const mantissa = Number(match[1]);
    const exponent = match[2] ? Number(match[2]) : 0;

    if (!Number.isFinite(mantissa) || !Number.isInteger(exponent)) {
      throw new Error("Invalid number values");
    }

    return new LargeNumber(mantissa, exponent);
  }

  clone(): LargeNumber {
    return new LargeNumber(this.mantissa, this.exponent);
  }

  isZero(): boolean {
    return this.mantissa === 0;
  }

  negate(): LargeNumber {
    return new LargeNumber(-this.mantissa, this.exponent);
  }

  add(otherInput: string | number | LargeNumber): LargeNumber {
    const other = LargeNumber.from(otherInput);
    if (this.isZero()) return other;
    if (other.isZero()) return this.clone();

    let a = this.clone();
    let b = other.clone();

    if (a.exponent < b.exponent) {
      [a, b] = [b, a];
    }

    const diff = a.exponent - b.exponent;
    if (diff > MAX_ALIGN_DIFF) {
      return a;
    }

    const alignedMantissa = b.mantissa / 10 ** diff;
    return new LargeNumber(a.mantissa + alignedMantissa, a.exponent);
  }

  subtract(otherInput: string | number | LargeNumber): LargeNumber {
    const other = LargeNumber.from(otherInput);
    return this.add(other.negate());
  }

  multiply(otherInput: string | number | LargeNumber): LargeNumber {
    const other = LargeNumber.from(otherInput);
    if (this.isZero() || other.isZero()) return LargeNumber.zero();
    return new LargeNumber(
      this.mantissa * other.mantissa,
      this.exponent + other.exponent,
    );
  }

  divide(otherInput: string | number | LargeNumber): LargeNumber {
    const other = LargeNumber.from(otherInput);
    if (other.isZero()) {
      throw new Error("Division by zero");
    }
    if (this.isZero()) return LargeNumber.zero();
    return new LargeNumber(
      this.mantissa / other.mantissa,
      this.exponent - other.exponent,
    );
  }

  powInt(power: number): LargeNumber {
    if (!Number.isInteger(power)) {
      throw new Error("Power must be an integer");
    }

    if (power === 0) return new LargeNumber(1, 0);

    const sign = this.mantissa < 0 && power % 2 !== 0 ? -1 : 1;
    const magnitudeMantissa = Math.abs(this.mantissa) ** power;
    return new LargeNumber(sign * magnitudeMantissa, this.exponent * power);
  }

  compare(otherInput: string | number | LargeNumber): -1 | 0 | 1 {
    const other = LargeNumber.from(otherInput);
    if (this.mantissa === other.mantissa && this.exponent === other.exponent)
      return 0;

    if (this.mantissa >= 0 && other.mantissa < 0) return 1;
    if (this.mantissa < 0 && other.mantissa >= 0) return -1;

    const bothNegative = this.mantissa < 0 && other.mantissa < 0;

    if (this.exponent !== other.exponent) {
      const result = this.exponent > other.exponent ? 1 : -1;
      return bothNegative ? (result === 1 ? -1 : 1) : result;
    }

    const mantissaResult = this.mantissa > other.mantissa ? 1 : -1;
    return bothNegative ? (mantissaResult === 1 ? -1 : 1) : mantissaResult;
  }

  toString(decimals = 2): string {
    if (this.isZero()) return "0";
    return `${this.mantissa.toFixed(decimals)}e${this.exponent}`;
  }

  private normalize(): void {
    if (!Number.isFinite(this.mantissa)) {
      throw new Error("Mantissa is not finite");
    }

    if (!Number.isInteger(this.exponent)) {
      throw new Error("Exponent must be an integer");
    }

    if (this.mantissa === 0) {
      this.exponent = 0;
      return;
    }

    const magnitude = Math.floor(Math.log10(Math.abs(this.mantissa)));
    this.mantissa /= 10 ** magnitude;
    this.exponent += magnitude;

    while (Math.abs(this.mantissa) >= 10) {
      this.mantissa /= 10;
      this.exponent += 1;
    }

    while (Math.abs(this.mantissa) < 1) {
      this.mantissa *= 10;
      this.exponent -= 1;
    }
  }
}
