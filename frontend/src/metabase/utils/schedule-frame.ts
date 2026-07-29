import dayjs from "dayjs";

import type {
  CalendarDayFrameType,
  ScheduleFrameType,
} from "metabase-types/api";

import { MONTH_DAY_OPTIONS } from "./date-time";

/**
 * Monthly schedules can be pinned to any of the first 28 days of the month. Days 29-31 are excluded because they do
 * not occur in every month, which would leave a subscription silently skipping February.
 */
export const MAX_CALENDAR_DAY = 28;

/** The 15th predates the other calendar days and keeps its original `"mid"` frame value. */
export const MIDPOINT_CALENDAR_DAY = 15;

const CALENDAR_DAY_FRAME_PATTERN = /^day-(\d{1,2})$/;

/**
 * A month with 31 days, so `formatCalendarDay` can render any day. Fixed rather than "today" so the label never
 * depends on when it is rendered.
 */
const ORDINAL_REFERENCE_MONTH = "2016-01-01";

/** The `schedule_frame` value pinning a monthly schedule to `day`, e.g. `5` -> `"day-5"` and `15` -> `"mid"`. */
export const frameForCalendarDay = (day: number): ScheduleFrameType =>
  day === MIDPOINT_CALENDAR_DAY ? "mid" : `day-${day}`;

/**
 * The calendar day a frame pins to, e.g. `"day-7"` -> `7` and `"mid"` -> `15`.
 *
 * `null` for `"first"` and `"last"`: those only mean the 1st and the last day when no `schedule_day` accompanies
 * them, and paired with a weekday they mean "the first Monday" instead — so they are not calendar days in
 * themselves.
 */
export const calendarDayFromFrame = (
  frame: ScheduleFrameType | null | undefined,
): number | null => {
  if (frame === "mid") {
    return MIDPOINT_CALENDAR_DAY;
  }
  const day = Number(frame?.match(CALENDAR_DAY_FRAME_PATTERN)?.[1]);
  return day >= 1 && day <= MAX_CALENDAR_DAY ? day : null;
};

/**
 * Does this frame pin the schedule to a specific calendar day? Such frames are mutually exclusive with
 * `schedule_day` — the weekday select is hidden for them.
 */
export const isCalendarDayFrame = (
  frame: ScheduleFrameType | null | undefined,
): frame is CalendarDayFrameType | "mid" =>
  calendarDayFromFrame(frame) !== null;

/**
 * The frame for a cron day-of-month field, e.g. `"5"` -> `"day-5"`. `undefined` unless it is a single day we can
 * round-trip, mirroring `metabase.util.cron/cron-day-of-month->frame` on the backend.
 */
export const frameFromCronDayOfMonth = (
  dayOfMonth: string,
): ScheduleFrameType | undefined => {
  const day = CALENDAR_DAY_FRAME_PATTERN.test(`day-${dayOfMonth}`)
    ? Number(dayOfMonth)
    : NaN;
  return day >= 1 && day <= MAX_CALENDAR_DAY
    ? frameForCalendarDay(day)
    : undefined;
};

/**
 * The localized ordinal for a calendar day, e.g. `5` -> `"5th"` in English and `"5."` in German. dayjs' `Do` token
 * reads the ordinal form from the active locale, which `metabase/utils/i18n` sets alongside the ttag locale.
 */
export const formatCalendarDay = (day: number): string =>
  dayjs(ORDINAL_REFERENCE_MONTH).date(day).format("Do");

/** e.g. `"day-5"` -> `"5th"`. `null` when the frame is not a calendar day. */
export const formatCalendarDayFrame = (
  frame: ScheduleFrameType | null | undefined,
): string | null => {
  const day = calendarDayFromFrame(frame);
  return day === null ? null : formatCalendarDay(day);
};

/**
 * Options for the monthly frame select: the weekday-anchored `First` and `Last`, then every calendar day in order.
 *
 * The `First`, `Last` and 15th entries are reused from upstream's `MONTH_DAY_OPTIONS` by reference so they keep
 * their exact labels — and their lazy `get name()` getters, which are what let the labels pick up the user's locale
 * after it loads. This is a function rather than a constant for the same reason.
 */
export const getMonthDayOptions = (): { name: string; value: string }[] => {
  const midpoint = MONTH_DAY_OPTIONS.find((option) => option.value === "mid");
  const weekdayAnchored = MONTH_DAY_OPTIONS.filter(
    (option) => option.value !== "mid",
  );
  const days = Array.from({ length: MAX_CALENDAR_DAY }, (_unused, index) => {
    const day = index + 1;
    if (day === MIDPOINT_CALENDAR_DAY && midpoint) {
      return midpoint;
    }
    return {
      get name() {
        return formatCalendarDay(day);
      },
      value: frameForCalendarDay(day) as string,
    };
  });
  return [...weekdayAnchored, ...days];
};
