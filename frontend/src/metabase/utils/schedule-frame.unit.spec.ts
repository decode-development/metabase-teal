import type { ScheduleFrameType } from "metabase-types/api";

import {
  MAX_CALENDAR_DAY,
  calendarDayFromFrame,
  formatCalendarDay,
  formatCalendarDayFrame,
  frameForCalendarDay,
  frameFromCronDayOfMonth,
  getMonthDayOptions,
  isCalendarDayFrame,
} from "./schedule-frame";

const everyCalendarDay = Array.from(
  { length: MAX_CALENDAR_DAY },
  (_unused, index) => index + 1,
);

describe("frameForCalendarDay", () => {
  it("should build a day-N frame", () => {
    expect(frameForCalendarDay(1)).toBe("day-1");
    expect(frameForCalendarDay(5)).toBe("day-5");
    expect(frameForCalendarDay(28)).toBe("day-28");
  });

  it("should use the pre-existing 'mid' value for the 15th", () => {
    expect(frameForCalendarDay(15)).toBe("mid");
  });
});

describe("calendarDayFromFrame", () => {
  it("should round-trip every selectable day", () => {
    everyCalendarDay.forEach((day) => {
      expect(calendarDayFromFrame(frameForCalendarDay(day))).toBe(day);
    });
  });

  it("should treat 'mid' as the 15th", () => {
    expect(calendarDayFromFrame("mid")).toBe(15);
  });

  it.each(["first", "last", null, undefined] as const)(
    "should not treat %s as a calendar day",
    (frame) => {
      expect(calendarDayFromFrame(frame)).toBeNull();
    },
  );

  it.each(["day-0", "day-29", "day-31", "day-99"] as ScheduleFrameType[])(
    "should reject %s, which does not occur in every month",
    (frame) => {
      expect(calendarDayFromFrame(frame)).toBeNull();
    },
  );
});

describe("isCalendarDayFrame", () => {
  it("should identify calendar days, including 'mid'", () => {
    expect(isCalendarDayFrame("day-5")).toBe(true);
    expect(isCalendarDayFrame("mid")).toBe(true);
  });

  it("should reject the weekday-anchored frames", () => {
    expect(isCalendarDayFrame("first")).toBe(false);
    expect(isCalendarDayFrame("last")).toBe(false);
    expect(isCalendarDayFrame(null)).toBe(false);
  });
});

describe("frameFromCronDayOfMonth", () => {
  it("should convert a cron day-of-month to a frame", () => {
    expect(frameFromCronDayOfMonth("5")).toBe("day-5");
    expect(frameFromCronDayOfMonth("15")).toBe("mid");
    expect(frameFromCronDayOfMonth("28")).toBe("day-28");
  });

  it.each(["29", "31", "0", "*", "?", "L", "1,15"])(
    "should not convert %s",
    (dayOfMonth) => {
      expect(frameFromCronDayOfMonth(dayOfMonth)).toBeUndefined();
    },
  );
});

describe("formatCalendarDay", () => {
  it("should render an English ordinal", () => {
    expect(formatCalendarDay(1)).toBe("1st");
    expect(formatCalendarDay(2)).toBe("2nd");
    expect(formatCalendarDay(3)).toBe("3rd");
    expect(formatCalendarDay(5)).toBe("5th");
    expect(formatCalendarDay(21)).toBe("21st");
    expect(formatCalendarDay(28)).toBe("28th");
  });

  it("should not depend on the current date", () => {
    expect(everyCalendarDay.map(formatCalendarDay)).toEqual(
      everyCalendarDay.map(formatCalendarDay),
    );
  });
});

describe("formatCalendarDayFrame", () => {
  it("should render a calendar-day frame as an ordinal", () => {
    expect(formatCalendarDayFrame("day-5")).toBe("5th");
    expect(formatCalendarDayFrame("mid")).toBe("15th");
  });

  it("should return null for weekday-anchored frames", () => {
    expect(formatCalendarDayFrame("first")).toBeNull();
    expect(formatCalendarDayFrame("last")).toBeNull();
  });
});

describe("getMonthDayOptions", () => {
  const options = getMonthDayOptions();

  it("should offer First and Last, then every calendar day", () => {
    expect(options).toHaveLength(2 + MAX_CALENDAR_DAY);
    expect(options.slice(0, 2).map((option) => option.value)).toEqual([
      "first",
      "last",
    ]);
  });

  it("should list the calendar days in order", () => {
    expect(options.slice(2).map((option) => option.value)).toEqual(
      everyCalendarDay.map(frameForCalendarDay),
    );
  });

  it("should include each calendar day exactly once, with the 15th keeping its original label", () => {
    const values = options.map((option) => option.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values).not.toContain("day-15");
    expect(options.find((option) => option.value === "mid")?.name).toBe(
      "15th (Midpoint)",
    );
  });

  it("should label the new days with ordinals", () => {
    expect(options.find((option) => option.value === "day-5")?.name).toBe(
      "5th",
    );
  });
});
