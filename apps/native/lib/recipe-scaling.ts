function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }

  return x || 1;
}

function decimalToFraction(value: number): string {
  const epsilon = 1e-6;
  const whole = Math.floor(value);
  const decimal = value - whole;

  if (decimal < epsilon) {
    return String(whole);
  }

  // Keep denominator small for readable cooking quantities.
  const denominator = 16;
  const numerator = Math.round(decimal * denominator);

  if (numerator === 0) {
    return String(whole);
  }

  const divisor = gcd(numerator, denominator);
  const reducedNum = numerator / divisor;
  const reducedDen = denominator / divisor;

  if (whole > 0) {
    return `${whole} ${reducedNum}/${reducedDen}`;
  }

  return `${reducedNum}/${reducedDen}`;
}

function parseQuantityPart(part: string): number | null {
  const cleaned = part.trim().replace(",", ".");

  if (!cleaned) {
    return null;
  }

  if (cleaned.includes("/")) {
    const [numRaw, denRaw] = cleaned.split("/");
    const num = Number(numRaw);
    const den = Number(denRaw);

    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
      return null;
    }

    return num / den;
  }

  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function parseQuantity(quantity: string): number | null {
  const normalized = quantity.trim();
  if (!normalized) {
    return null;
  }

  // Mixed fraction support, e.g. "1 1/2".
  const parts = normalized.split(/\s+/);

  if (parts.length === 2) {
    const first = parseQuantityPart(parts[0]);
    const second = parseQuantityPart(parts[1]);

    if (first !== null && second !== null) {
      return first + second;
    }
  }

  // Simple number or fraction.
  return parseQuantityPart(normalized);
}

function formatScaledQuantity(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }

  const rounded = Math.round(value * 100) / 100;

  if (Math.abs(rounded - Math.round(rounded)) < 1e-6) {
    return String(Math.round(rounded));
  }

  if (rounded > 0 && rounded < 10) {
    return decimalToFraction(rounded);
  }

  return rounded.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export function scaleIngredientQuantity(
  quantity: string | null | undefined,
  fromServings: number,
  toServings: number,
): string | null {
  if (!quantity) {
    return null;
  }

  if (!Number.isFinite(fromServings) || !Number.isFinite(toServings) || fromServings <= 0) {
    return quantity;
  }

  const parsed = parseQuantity(quantity);
  if (parsed === null) {
    return quantity;
  }

  const scaled = (parsed * toServings) / fromServings;
  return formatScaledQuantity(scaled);
}
