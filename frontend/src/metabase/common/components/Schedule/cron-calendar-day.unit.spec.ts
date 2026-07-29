import { cronToScheduleSettings, scheduleSettingsToCron } from "./cron";

describe("scheduleSettingsToCron — monthly on a specific calendar day", () => {
  it("should put a calendar day in the day-of-month field", () => {
    expect(
      scheduleSettingsToCron({
        schedule_type: "monthly",
        schedule_frame: "day-5",
        schedule_hour: 8,
        schedule_minute: 0,
      }),
    ).toBe("0 0 8 5 * ? *");
  });

  it("should ignore a stray weekday rather than emitting it as the day-of-week", () => {
    expect(
      scheduleSettingsToCron({
        schedule_type: "monthly",
        schedule_frame: "day-5",
        schedule_day: "mon",
        schedule_hour: 8,
        schedule_minute: 0,
      }),
    ).toBe("0 0 8 5 * ? *");
  });

  it("should keep the pre-existing frames unchanged", () => {
    const settings = {
      schedule_type: "monthly",
      schedule_hour: 8,
      schedule_minute: 0,
    } as const;

    expect(
      scheduleSettingsToCron({ ...settings, schedule_frame: "first" }),
    ).toBe("0 0 8 1 * ? *");
    expect(scheduleSettingsToCron({ ...settings, schedule_frame: "mid" })).toBe(
      "0 0 8 15 * ? *",
    );
    expect(scheduleSettingsToCron({ ...settings, schedule_frame: "last" })).toBe(
      "0 0 8 L * ? *",
    );
    expect(
      scheduleSettingsToCron({
        ...settings,
        schedule_frame: "first",
        schedule_day: "mon",
      }),
    ).toBe("0 0 8 ? * 2#1 *");
  });
});

describe("cronToScheduleSettings — monthly on a specific calendar day", () => {
  it("should read a calendar day back out of the day-of-month field", () => {
    expect(cronToScheduleSettings("0 0 8 5 * ? *")).toMatchObject({
      schedule_type: "monthly",
      schedule_frame: "day-5",
      schedule_hour: 8,
    });
  });

  it("should round-trip a calendar day", () => {
    const cron = "0 0 8 5 * ? *";
    const settings = cronToScheduleSettings(cron);
    expect(settings).not.toBeNull();
    expect(scheduleSettingsToCron(settings!)).toBe(cron);
  });

  it("should keep mapping the 1st, 15th and last day to their older frames", () => {
    expect(cronToScheduleSettings("0 0 8 1 * ? *")).toMatchObject({
      schedule_frame: "first",
    });
    expect(cronToScheduleSettings("0 0 8 15 * ? *")).toMatchObject({
      schedule_frame: "mid",
    });
    expect(cronToScheduleSettings("0 0 8 L * ? *")).toMatchObject({
      schedule_frame: "last",
    });
    expect(cronToScheduleSettings("0 0 8 ? * 2#1 *")).toMatchObject({
      schedule_frame: "first",
      schedule_day: "mon",
    });
  });
});
