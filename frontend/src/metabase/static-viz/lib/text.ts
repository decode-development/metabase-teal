import { init } from "server-text-width";

import {
  CHAR_SIZES,
  CHAR_SIZES_FONT_SIZE,
  CHAR_SIZES_FONT_WEIGHT,
} from "../constants/char-sizes";
import { POPPINS_CHAR_WIDTHS } from "../constants/poppins-char-widths";

const FONT_WEIGHT_WIDTH_FACTOR = 0.039;

export const { getTextWidth } = init(CHAR_SIZES);

// Charts render in Poppins (see ../constants/fonts.ts), which is ~9% wider than
// the Lato that CHAR_SIZES was generated for. Measuring against the Lato table
// would under-report every label and crowd axis margins, truncation and legend
// layout, so prefer the Poppins widths, falling back to Lato per character for
// the scripts Poppins does not cover (Cyrillic, Greek, Vietnamese) — the same
// scripts the renderer itself falls back to sans-serif for. See
// metabase.channel.render.png/wrap-non-brand-font-chars.
const measureBaseWidth = (text: string) => {
  let width = 0;
  let fallback = "";

  for (const char of text) {
    const charWidth = POPPINS_CHAR_WIDTHS[char];

    if (charWidth == null) {
      fallback += char;
    } else {
      width += charWidth;
    }
  }

  if (fallback !== "") {
    width += getTextWidth(fallback, {
      fontSize: `${CHAR_SIZES_FONT_SIZE}px`,
      fontWeight: CHAR_SIZES_FONT_WEIGHT.toString(),
    });
  }

  return width;
};

export const measureTextWidth = (
  text: string,
  fontSize: number,
  fontWeight: number = CHAR_SIZES_FONT_WEIGHT,
) => {
  const sizeFactor = fontSize / CHAR_SIZES_FONT_SIZE;
  const weightFactor =
    1 +
    (fontWeight - CHAR_SIZES_FONT_WEIGHT) *
      (FONT_WEIGHT_WIDTH_FACTOR / CHAR_SIZES_FONT_WEIGHT);

  return sizeFactor * measureBaseWidth(text) * weightFactor;
};

export const measureTextHeight = (fontSize: number) => {
  return fontSize * 1.3;
};

const parseEChartsFontString = (fontString: string) => {
  const parts = fontString.split(/\s+/);

  if (parts.length < 2) {
    throw new Error("Invalid font string format");
  }

  let fontWeightPart: string;
  let fontSizePart: string;
  let fontFamilyParts: string[];

  if (/^\d+$/.test(parts[0])) {
    // Format: "fontWeight fontSize fontFamily", example: 900 12px Lato
    [fontWeightPart, fontSizePart, ...fontFamilyParts] = parts;
  } else {
    // Format: "fontWeight??? fontWeight fontSize fontFamily", example: normal 900 12px Lato
    [, fontWeightPart, fontSizePart, ...fontFamilyParts] = parts;
  }

  let parsedFontWeight: number;
  switch (fontWeightPart.toLowerCase()) {
    case "normal":
      parsedFontWeight = 400;
      break;
    case "bold":
      parsedFontWeight = 700;
      break;
    case "bolder":
      parsedFontWeight = 800;
      break;
    case "lighter":
      parsedFontWeight = 300;
      break;
    default:
      parsedFontWeight = parseInt(fontWeightPart, 10) || 400;
      break;
  }

  return {
    fontFamily: fontFamilyParts.join(" "),
    fontSize: parseFloat(fontSizePart),
    fontWeight: parsedFontWeight,
  };
};

export const measureTextEChartsAdapter = (
  text: string,
  font?: string,
): { width: number } => {
  let fontSize = CHAR_SIZES_FONT_SIZE;
  let fontWeight = CHAR_SIZES_FONT_WEIGHT;

  if (font) {
    const parsedFont = parseEChartsFontString(font);
    fontSize = parsedFont.fontSize;
    fontWeight = parsedFont.fontWeight;
  }

  const width = measureTextWidth(text, fontSize, fontWeight);

  return {
    width,
  };
};
