import type { TextProps } from "@visx/text";
import { Text as VText } from "@visx/text";

import { STATIC_VIZ_FONT_NAME } from "metabase/static-viz/constants/fonts";
import type { ColorPalette } from "metabase/ui/colors/types";

type Props = Omit<TextProps, "color"> & {
  color?: keyof ColorPalette;
};

export const Text = (props: Props) => {
  // eslint-disable-next-line metabase/no-color-literals
  return (
    <VText
      fontFamily={STATIC_VIZ_FONT_NAME}
      fontSize="13"
      fill="#4C5773"
      {...props}
    />
  );
};
