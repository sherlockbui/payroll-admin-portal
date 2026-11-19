import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, afterEach } from "vitest";
import {
  RowCellEditor,
  WorkdayRuleCellEditor,
  SelectCellEditor,
  DEFAULT_WORKDAY_OPTIONS,
} from "@/components/tabs/policies-tab";
import { DatePicker } from "@/components/ui";
import { api } from "@/lib/api";
import type { ProjectPolicyRow } from "@/lib/types";

afterEach(() => {
  cleanup();
});

describe("WorkdayRuleCellEditor & Project Policies Configuration", () => {
  it("renders exact label from options for CALC_NO_SUN without altering text", () => {
    const onChange = vi.fn();
    render(
      <WorkdayRuleCellEditor
        value="CALC_NO_SUN"
        onChange={onChange}
      />
    );

    const trigger = screen.getByRole("combobox", { name: /Chọn quy tắc ngày công chuẩn/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger.textContent).toContain("Theo chu kỳ: Trừ CN");
  });

  it("renders custom API label verbatim when provided by API options", () => {
    const onChange = vi.fn();
    const customOptions = [
      { group: "Chính sách đặc thù", value: "SPECIAL_2026", label: "Theo thỏa thuận riêng 2026 (Toàn thời gian)" },
    ];
    render(
      <WorkdayRuleCellEditor
        options={customOptions}
        value="SPECIAL_2026"
        onChange={onChange}
      />
    );

    const trigger = screen.getByRole("combobox", { name: /Chọn quy tắc ngày công chuẩn/i });
    expect(trigger.textContent).toContain("Theo thỏa thuận riêng 2026 (Toàn thời gian)");
  });

  it("opens dropdown and triggers onChange when selecting an option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <WorkdayRuleCellEditor
        value="CALC_NO_SUN"
        onChange={onChange}
      />
    );

    const trigger = screen.getByRole("combobox", { name: /Chọn quy tắc ngày công chuẩn/i });
    await user.click(trigger);

    // Menu should be open with dynamic options
    const satSunOption = screen.getByText(/Theo chu kỳ: Trừ Thứ 7 & CN/i);
    expect(satSunOption).toBeInTheDocument();

    await user.click(satSunOption);
    expect(onChange).toHaveBeenCalledWith("CALC_NO_SAT_SUN");
  });

  it("handles custom numeric value (e.g. 25.5) and displays custom label", () => {
    const onChange = vi.fn();
    render(
      <WorkdayRuleCellEditor
        value="25.5"
        onChange={onChange}
      />
    );

    const trigger = screen.getByRole("combobox", { name: /Chọn quy tắc ngày công chuẩn/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger.textContent).toContain("Cố định 25.5 ngày");
  });

  it("allows entering custom workday value via modal dialog and applies it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <WorkdayRuleCellEditor
        value="26"
        onChange={onChange}
      />
    );

    const trigger = screen.getByRole("combobox", { name: /Chọn quy tắc ngày công chuẩn/i });
    await user.click(trigger);

    const customOption = screen.getByText(/Nhập số ngày khác\.\.\./i);
    expect(customOption).toBeInTheDocument();
    await user.click(customOption);

    const customInput = screen.getByPlaceholderText("VD: 25.5");
    expect(customInput).toBeInTheDocument();

    await user.clear(customInput);
    await user.type(customInput, "25.5");

    const applyBtn = screen.getByRole("button", { name: "Áp dụng" });
    await user.click(applyBtn);

    expect(onChange).toHaveBeenCalledWith("25.5");
  });

  it("renders WorkdayRuleCellEditor when row.controlType is 'workday-rule-picker'", () => {
    const onChange = vi.fn();
    const row: ProjectPolicyRow = {
      policyId: 24,
      policyCode: "POL_STANDARD_WORKDAYS",
      policyName: "Số ngày công chuẩn định mức",
      dataType: "string",
      controlType: "workday-rule-picker",
      effectiveFrom: "2026-11-17",
      effectiveTo: "2026-11-17",
      values: { "1": "CALC_NO_SUN" },
    };

    render(
      <RowCellEditor
        row={row}
        dataType={row.dataType}
        value="CALC_NO_SUN"
        onChange={onChange}
      />
    );

    expect(screen.getByRole("combobox", { name: /Chọn quy tắc ngày công chuẩn/i })).toBeInTheDocument();
  });

  it("renders SelectCellEditor when row.controlType is 'select'", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const row: ProjectPolicyRow = {
      policyId: 30,
      policyCode: "POL_NET_ROUND_MODE",
      policyName: "Quy tắc làm tròn lương",
      dataType: "string",
      controlType: "select",
      options: [
        { value: "ROUND_1000", label: "Làm tròn đến 1.000 VNĐ" },
        { value: "ROUND_10000", label: "Làm tròn đến 10.000 VNĐ" },
      ],
      effectiveFrom: "2026-11-17",
      effectiveTo: "2026-11-17",
      values: { "1": "ROUND_1000" },
    };

    render(
      <RowCellEditor
        row={row}
        dataType={row.dataType}
        value="ROUND_1000"
        onChange={onChange}
      />
    );

    const trigger = screen.getByRole("combobox", { name: /Chọn giá trị chế độ/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger.textContent).toContain("Làm tròn đến 1.000 VNĐ");

    await user.click(trigger);
    const opt10000 = screen.getByText("Làm tròn đến 10.000 VNĐ");
    await user.click(opt10000);

    expect(onChange).toHaveBeenCalledWith("ROUND_10000");
  });

  it("renders DatePicker with allowClear without overlapping X button and clears date via modal", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DatePicker
        value="2026-11-18"
        onChange={onChange}
        placeholder="Không thời hạn"
        allowClear
      />
    );

    const trigger = screen.getByRole("button");
    expect(trigger).toBeInTheDocument();
    expect(trigger.textContent).toBe("18/11/2026");
    // Ensure no overlapping X text or extra X button in the trigger
    expect(trigger.textContent).not.toContain("X");

    // Open modal
    await user.click(trigger);
    const clearBtn = screen.getByRole("button", { name: "Để trống" });
    expect(clearBtn).toBeInTheDocument();

    await user.click(clearBtn);
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("sends EffectiveTo as null in api.updateProjectPolicyValues when empty/null", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: "OK" }),
    } as any);

    await api.updateProjectPolicyValues("1", [
      {
        PolicyId: 24,
        EffectiveFrom: "2026-11-18",
        EffectiveTo: null,
        Note: "",
        Values: [{ TargetGroupId: 1, PolicyValue: "CALC_NO_SUN" }],
      },
    ]);

    expect(fetchSpy).toHaveBeenCalled();
    const bodySent = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(bodySent[0].EffectiveTo).toBeNull();
    expect(bodySent[0].EffectiveFrom).toBe("2026-11-18");

    fetchSpy.mockRestore();
  });
});
