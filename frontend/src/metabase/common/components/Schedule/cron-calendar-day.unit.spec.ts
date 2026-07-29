import { cronToBuilderValue, formatCron } from "./cron";

describe("formatCron — monthly on a specific calendar day", () => {
  it("should put a calendar day in the day-of-month field", () => {
    expect(
      formatCron({
        schedule_type: "monthly",
        schedule_frame: "day-5",
        schedule_hour: 8,
        schedule_minute: 0,
      }),
    ).toBe("0 0 8 5 * ? *");
  });

  it("should ignore a stray weekday rather than emitting it as the day-of-week", () => {
    expect(
      formatCron({
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
      formatCron({ ...settings, schedule_frame: "first" }),
    ).toBe("0 0 8 1 * ? *");
    expect(formatCron({ ...settings, schedule_frame: "mid" })).toBe(
      "0 0 8 15 * ? *",
    );
    expect(formatCron({ ...settings, schedule_frame: "last" })).toBe(
      "0 0 8 L * ? *",
    );
    expect(
      formatCron({
        ...settings,
        schedule_frame: "first",
        schedule_day: "mon",
      }),
    ).toBe("0 0 8 ? * 2#1 *");
  });
});

describe("cronToBuilderValue — monthly on a specific calendar day", () => {
  it("should read a calendar day back out of the day-of-month field", () => {
    expect(cronToBuilderValue("0 0 8 5 * ? *")).toMatchObject({
      schedule_type: "monthly",
      schedule_frame: "day-5",
      schedule_hour: 8,
    });
  });

  it("should round-trip a calendar day", () => {
    const cron = "0 0 8 5 * ? *";
    const settings = cronToBuilderValue(cron);
    expect(settings).not.toBeNull();
    expect(formatCron(settings!)).toBe(cron);
  });

  it("should keep mapping the 1st, 15th and last day to their older frames", () => {
    expect(cronToBuilderValue("0 0 8 1 * ? *")).toMatchObject({
      schedule_frame: "first",
    });
    expect(cronToBuilderValue("0 0 8 15 * ? *")).toMatchObject({
      schedule_frame: "mid",
    });
    expect(cronToBuilderValue("0 0 8 L * ? *")).toMatchObject({
      schedule_frame: "last",
    });
    expect(cronToBuilderValue("0 0 8 ? * 2#1 *")).toMatchObject({
      schedule_frame: "first",
      schedule_day: "mon",
    });
  });
});
