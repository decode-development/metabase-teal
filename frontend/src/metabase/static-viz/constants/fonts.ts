// Static viz renders in a headless GraalVM context where the browser's font
// stack is unavailable, so the font is fixed at build time rather than
// following the `application-font` setting. This fork's brand font is Poppins
// (see README-TEAL.md); ./poppins-char-widths.ts is calibrated to it.

export const STATIC_VIZ_FONT_NAME = "Poppins";

const FALLBACKS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export const STATIC_VIZ_FONT_FAMILY = `${STATIC_VIZ_FONT_NAME}, ${FALLBACKS}`;
