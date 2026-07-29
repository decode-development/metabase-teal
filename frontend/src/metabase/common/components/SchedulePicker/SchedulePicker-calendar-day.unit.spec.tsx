import userEvent from "@testing-library/user-event";

import { renderWithProviders, screen, within } from "__support__/ui";

import type { SchedulePickerProps } from "./SchedulePicker";
import { SchedulePicker } from "./SchedulePicker";

const setup = (props?: Partial<SchedulePickerProps>) => {
  const onScheduleChange = jest.fn();
  const defaultProps: SchedulePickerProps = {
    schedule: {
      schedule_type: "monthly",
      schedule_day: "mon",
      schedule_frame: "first",
      schedule_hour: 8,
      schedule_minute: 0,
    },
    scheduleOptions: ["hourly", "daily", "weekly", "monthly"],
    onScheduleChange,
    ...props,
  };

  renderWithProviders(<SchedulePicker {...defaultProps} />);

  return { onScheduleChange };
};

describe("SchedulePicker — monthly on a specific calendar day", () => {
  it("should offer every day of the month from the 1st to the 28th", async () => {
    setup();

    await userEvent.click(screen.getByDisplayValue("First"));
    const listbox = await screen.findByRole("listbox");

    expect(within(listbox).getByText("1st")).toBeInTheDocument();
    expect(within(listbox).getByText("5th")).toBeInTheDocument();
    expect(within(listbox).getByText("28th")).toBeInTheDocument();
    // 29-31 don't occur in every month, so they are deliberately absent
    expect(within(listbox).queryByText("29th")).not.toBeInTheDocument();
    expect(within(listbox).queryByText("31st")).not.toBeInTheDocument();
    // the 15th keeps its original label rather than appearing twice
    expect(within(listbox).getByText("15th (Midpoint)")).toBeInTheDocument();
    expect(within(listbox).queryByText("15th")).not.toBeInTheDocument();
  });

  it("should store a calendar day as a day-N frame and clear the weekday", async () => {
    const { onScheduleChange } = setup();

    await userEvent.click(screen.getByDisplayValue("First"));
    const listbox = await screen.findByRole("listbox");
    await userEvent.click(within(listbox).getByText("5th"));

    expect(onScheduleChange).toHaveBeenCalledWith(
      {
        schedule_type: "monthly",
        schedule_frame: "day-5",
        schedule_day: null,
        schedule_hour: 8,
        schedule_minute: 0,
      },
      { name: "schedule_frame", value: "day-5" },
    );
  });

  it("should hide the weekday select for a calendar day", () => {
    setup({
      schedule: {
        schedule_type: "monthly",
        schedule_day: null,
        schedule_frame: "day-5",
        schedule_hour: 8,
        schedule_minute: 0,
      },
    });

    expect(screen.getByDisplayValue("5th")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Calendar Day")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Monday")).not.toBeInTheDocument();
  });

  it("should keep showing the weekday select for the weekday-anchored frames", () => {
    setup();

    expect(screen.getByDisplayValue("First")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Monday")).toBeInTheDocument();
  });
});
