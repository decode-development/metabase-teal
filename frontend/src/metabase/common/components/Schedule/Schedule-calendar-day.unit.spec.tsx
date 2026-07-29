import userEvent from "@testing-library/user-event";

import { screen, within } from "__support__/ui";
import type { ScheduleFrameType } from "metabase-types/api";

import type { ScheduleValue } from "./domain";
import { setup } from "./test-utils";

const monthlyValue = (
  schedule_frame: ScheduleFrameType,
  schedule_day: "mon" | null,
): ScheduleValue => ({
  schedule_type: "monthly",
  schedule_frame,
  schedule_day,
  schedule_hour: 8,
  schedule_minute: 0,
});

const openFrameSelect = async () => {
  await userEvent.click(screen.getByTestId("select-frame"));
  return screen.findByRole("listbox");
};

describe("Schedule — monthly on a specific calendar day", () => {
  describe("when calendar days are allowed", () => {
    it("should offer every day of the month from the 1st to the 28th", async () => {
      setup({
        value: monthlyValue("first", "mon"),
        allowCalendarDays: true,
      });

      const listbox = await openFrameSelect();

      expect(within(listbox).getByText("1st")).toBeInTheDocument();
      expect(within(listbox).getByText("5th")).toBeInTheDocument();
      expect(within(listbox).getByText("28th")).toBeInTheDocument();
      // 29-31 don't occur in every month, so they are deliberately absent
      expect(within(listbox).queryByText("29th")).not.toBeInTheDocument();
      expect(within(listbox).queryByText("31st")).not.toBeInTheDocument();
      // the 15th is upstream's own `mid` option, so it appears exactly once
      expect(within(listbox).getAllByText("15th")).toHaveLength(1);
    });

    it("should store a calendar day as a day-N frame and clear the weekday", async () => {
      const { onScheduleChange } = setup({
        value: monthlyValue("first", "mon"),
        allowCalendarDays: true,
      });

      const listbox = await openFrameSelect();
      await userEvent.click(within(listbox).getByText("5th"));

      expect(onScheduleChange).toHaveBeenCalledWith({
        value: monthlyValue("day-5", null),
        cronString: "0 0 8 5 * ? *",
      });
    });

    it("should clear the weekday when the 15th is picked", async () => {
      const { onScheduleChange } = setup({
        value: monthlyValue("first", "mon"),
        allowCalendarDays: true,
      });

      const listbox = await openFrameSelect();
      await userEvent.click(within(listbox).getByText("15th"));

      expect(onScheduleChange).toHaveBeenCalledWith({
        value: monthlyValue("mid", null),
        cronString: "0 0 8 15 * ? *",
      });
    });

    it("should hide the weekday select for a calendar day", () => {
      setup({
        value: monthlyValue("day-5", null),
        allowCalendarDays: true,
      });

      expect(screen.getByTestId("select-frame")).toHaveValue("5th");
      expect(screen.queryByTestId("select-weekday-of-month")).not.toBeInTheDocument();
    });

    it("should show the weekday select again when switching back to first", async () => {
      setup({
        value: monthlyValue("day-5", null),
        allowCalendarDays: true,
      });

      const listbox = await openFrameSelect();
      await userEvent.click(within(listbox).getByText("first"));

      expect(screen.getByTestId("select-frame")).toHaveValue("first");
      expect(screen.getByTestId("select-weekday-of-month")).toBeInTheDocument();
    });
  });

  describe("when calendar days are not allowed (the default)", () => {
    it("should offer only first, last and the 15th", async () => {
      setup({ value: monthlyValue("first", "mon") });

      const listbox = await openFrameSelect();

      expect(within(listbox).getAllByRole("option")).toHaveLength(3);
      expect(within(listbox).queryByText("5th")).not.toBeInTheDocument();
    });
  });
});
