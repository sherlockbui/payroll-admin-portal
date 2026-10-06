import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { GsDatePicker } from "../components/ui/date-picker";

describe("GsDatePicker Component", () => {
  it("renders with placeholder and opens calendar when clicked", () => {
    const handleChange = vi.fn();
    const { container } = render(<GsDatePicker value="" onChange={handleChange} placeholder="dd/mm/yyyy" />);

    const trigger = container.querySelector(".gs-date-input-trigger") as HTMLElement;
    expect(trigger).toBeDefined();
    expect(trigger.textContent).toContain("dd/mm/yyyy");

    // Click trigger to open
    fireEvent.click(trigger);

    // Header title with month should be visible
    expect(screen.getByText(/Tháng/)).toBeDefined();
    expect(screen.getByText("Hôm nay")).toBeDefined();
  });

  it("selects a date when a day is clicked and fires onChange", () => {
    const handleChange = vi.fn();
    const { container } = render(<GsDatePicker value="2026-09-01" onChange={handleChange} />);

    const trigger = container.querySelector(".gs-date-input-trigger") as HTMLElement;
    expect(trigger.textContent).toContain("01/09/2026");

    // Click trigger to open
    fireEvent.click(trigger);

    // Find day button for 15th
    const day15Button = Array.from(container.querySelectorAll<HTMLButtonElement>(".gs-date-cell-btn")).find(
      (btn) => btn.textContent === "15" && !btn.classList.contains("is-other-month")
    );
    expect(day15Button).toBeDefined();

    if (day15Button) {
      fireEvent.click(day15Button);
      expect(handleChange).toHaveBeenCalledWith("2026-09-15");
    }
  });

  it("selects today when Hôm nay button is clicked", () => {
    const handleChange = vi.fn();
    const { container } = render(<GsDatePicker value="" onChange={handleChange} />);

    const trigger = container.querySelector(".gs-date-input-trigger") as HTMLElement;
    fireEvent.click(trigger);

    const todayButton = container.querySelector(".gs-date-quick-today") as HTMLElement;
    fireEvent.click(todayButton);

    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(handleChange).toHaveBeenCalledWith(expected);
  });
});
