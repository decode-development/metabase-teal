import { measureTextWidth } from "./text";

const fontSize = 11;

describe("measureTextWidth", () => {
  it("should measure text", () => {
    // Poppins advance widths (../constants/poppins-char-widths.ts), not Lato
    expect(Math.round(measureTextWidth("abc", fontSize))).toBe(22);
  });

  it("should fall back to the Lato table for uncovered characters", () => {
    // Cyrillic is absent from Poppins; a missing width must not measure as 0
    expect(measureTextWidth("абв", fontSize)).toBeGreaterThan(0);
  });

  it("should scale with font size and weight", () => {
    expect(measureTextWidth("abc", 22)).toBeCloseTo(
      2 * measureTextWidth("abc", fontSize),
    );
    expect(measureTextWidth("abc", fontSize, 700)).toBeGreaterThan(
      measureTextWidth("abc", fontSize, 400),
    );
  });
});
