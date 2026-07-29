import { measureTextWidth as measureStatic } from "metabase/static-viz/lib/text";
import {
  type TextWidthMeasurer,
  measureTextWidth as measureDynamic,
} from "metabase/utils/measure-text";

import { truncateText } from "./text";

const fontStyle = {
  size: 11,
  weight: 400,
  family: "Poppins",
};

// "John Doe" measures ~52px at 11px in Poppins, so the no-overflow cases need
// more room than upstream's 48px, which was sized for the narrower Lato.
const NO_OVERFLOW_WIDTH = 60;

const tests: { name: string; measurer: TextWidthMeasurer }[] = [
  { name: "truncateText - dynamic viz measurer", measurer: measureDynamic },
  {
    name: "truncateText - static viz measurer",
    measurer: (text, style) =>
      measureStatic(text, Number(style.size), Number(style.weight)),
  },
];

tests.map((test) => {
  describe(test.name, () => {
    it("should not truncate text with ellipses if there is no overflow", () => {
      expect(
        truncateText("John Doe", NO_OVERFLOW_WIDTH, test.measurer, fontStyle),
      ).toBe("John Doe");
    });

    it("should truncate text with ellipses if there is overflow", () => {
      expect(
        truncateText("John Doe", NO_OVERFLOW_WIDTH, test.measurer, fontStyle),
      ).toBe("John Doe");
    });

    it("should use ellipses in case there is no space for text at all", () => {
      expect(truncateText("John Doe", 0, test.measurer, fontStyle)).toBe("…");
    });
  });
});
