import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EmployeePoliciesSubtab,
  isDateOrderInvalid,
  isMoneyDataType,
} from "@/components/employees/policies-subtab";
import { ToastContext } from "@/components/providers";
import { api } from "@/lib/api";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderSubtab(notify = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return {
    notify,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ToastContext.Provider value={{ notify }}>
          <EmployeePoliciesSubtab projectId="1017" />
        </ToastContext.Provider>
      </QueryClientProvider>
    ),
  };
}

describe("EmployeePoliciesSubtab UI & Date Validation", () => {
  it("treats only currency/money data types as money inputs", () => {
    expect(isMoneyDataType("currency")).toBe(true);
    expect(isMoneyDataType("MONEY")).toBe(true);
    expect(isMoneyDataType("integer")).toBe(false);
    expect(isMoneyDataType("percentage")).toBe(false);
    expect(isMoneyDataType("boolean")).toBe(false);
    expect(isMoneyDataType("string")).toBe(false);
  });

  it("detects when effectiveTo is earlier than effectiveFrom", () => {
    expect(isDateOrderInvalid("2026-11-26", "2026-11-25")).toBe(true);
    expect(isDateOrderInvalid("2026-11-26", "2026-11-26")).toBe(false);
    expect(isDateOrderInvalid("2026-11-26", "2026-12-31")).toBe(false);
    expect(isDateOrderInvalid("2026-11-26", "")).toBe(false);
    expect(isDateOrderInvalid("2026-11-26", null)).toBe(false);
  });

  it("shows true group default, sums group + custom allowances, and restores unchecked overrides on save", async () => {
    const user = userEvent.setup();

    vi.spyOn(api, "getProjectEmployeeGroups").mockResolvedValue([]);
    vi.spyOn(api, "getEmployeePolicies").mockResolvedValue({
      summary: { totalEmployees: 1, customPolicyCount: 1, projectPolicyCount: 0 },
      items: [
        {
          employeeCode: "T140-90001",
          employeeName: "Nguyễn Văn A",
          policyGroupId: 2,
          policyGroupName: "Chính thức",
          basicSalary: 8500000,
          hasBasicSalaryOverride: true,
          hasCustomPolicy: true,
          appliedCount: 3,
          totalAllowance: 1500000,
          effectiveFrom: "2026-10-01",
          policies: [
            {
              policyItemId: 1,
              policyCode: "POL_BASIC_SALARY",
              policyName: "Lương cơ bản",
              policyTypeCode: "SALARY_BASE",
              dataType: "currency",
              value: 8500000,
              policyValue: "8500000",
              hasOverride: true,
            },
            {
              policyItemId: 12,
              policyCode: "POL_ALLOWANCE_GASOLINE",
              policyName: "Phụ cấp xăng xe",
              policyTypeCode: "ALLOWANCE",
              dataType: "currency",
              value: 1000000,
              policyValue: "1000000",
              hasOverride: true,
            },
            {
              policyItemId: 14,
              policyCode: "POL_ALLOWANCE_HOUSING",
              policyName: "Phụ cấp nhà ở",
              policyTypeCode: "ALLOWANCE",
              dataType: "currency",
              value: 500000,
              policyValue: "500000",
              hasOverride: false,
            },
          ],
        },
      ],
      pageIndex: 1,
      pageSize: 20,
      totalRow: 1,
      totalPages: 1,
    });

    vi.spyOn(api, "getEmployeePolicyDetail").mockResolvedValue({
      employeeCode: "T140-90001",
      employeeName: "Nguyễn Văn A",
      policyGroupId: 2,
      policyGroupName: "Chính thức",
      basicSalary: 8500000,
      insuranceSalary: 5000000,
      policies: [
        {
          policyItemId: 1,
          policyCode: "POL_BASIC_SALARY",
          policyName: "Lương cơ bản",
          dataType: "currency",
          groupValue: "7000000",
          employeeValue: "8500000",
          effectiveValue: "8500000",
          hasOverride: true,
          effectiveFrom: "2026-10-01",
          effectiveTo: null,
          note: "Phụ lục 01",
        },
        {
          policyItemId: 12,
          policyCode: "POL_ALLOWANCE_GASOLINE",
          policyName: "Phụ cấp xăng xe",
          dataType: "currency",
          groupValue: "500000",
          employeeValue: "1000000",
          effectiveValue: "1000000",
          hasOverride: true,
          effectiveFrom: "2026-11-01",
          effectiveTo: "2026-12-31",
          note: "Q4",
        },
        {
          policyItemId: 14,
          policyCode: "POL_ALLOWANCE_HOUSING",
          policyName: "Phụ cấp nhà ở",
          dataType: "currency",
          groupValue: "500000",
          employeeValue: null,
          effectiveValue: "500000",
          hasOverride: false,
          effectiveFrom: null,
          effectiveTo: null,
          note: null,
        },
      ],
    });

    const restoreSpy = vi.spyOn(api, "restoreEmployeePolicy").mockResolvedValue({});
    const saveSpy = vi.spyOn(api, "saveEmployeePolicy").mockResolvedValue({ success: true });

    renderSubtab();

    await waitFor(() => {
      expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument();
    });

    // Open row actions -> Tùy chỉnh chế độ & lương
    await user.click(screen.getByRole("button", { name: "Thao tác" }));
    await user.click(screen.getByText("Tùy chỉnh chế độ & lương"));

    await waitFor(() => {
      expect(screen.getByText(/Cấu hình thỏa thuận chế độ & lương: Nguyễn Văn A/)).toBeInTheDocument();
    });

    // Group basic salary (7.000.000 đ) and effective total fixed income (8.5M + 1M + 0.5M = 10.000.000 đ)
    expect(screen.getAllByText("7.000.000 đ").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("10.000.000 đ").length).toBeGreaterThanOrEqual(1);

    // Verify invalid effectiveTo < effectiveFrom disables Save and shows error
    // Initially effectiveFrom is 2026-11-01 (latest among overrides) and GAS effectiveTo is 2026-12-31.
    // Let's also verify unchecking GAS and keeping POL_BASIC_SALARY works on Save:
    const gasCheckbox = screen.getByRole("checkbox", {
      name: /Bật thỏa thuận riêng cho Phụ cấp xăng xe/i,
    });
    await user.click(gasCheckbox);

    await user.click(screen.getByRole("button", { name: /Lưu cấu hình lương/i }));

    await waitFor(() => {
      expect(restoreSpy).toHaveBeenCalledWith("T140-90001", 12, "1017");
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    const savedPayload = saveSpy.mock.calls[0][1];
    expect(savedPayload.basicSalary).toBeNull();
    expect(savedPayload.insuranceSalary).toBeNull();
    expect(savedPayload.effectiveFrom).toBe("2026-10-01");
    expect(savedPayload.policies).toEqual([
      {
        policyItemId: 1,
        value: "8500000",
        effectiveTo: null,
        note: "Phụ lục 01",
        status: 1,
      },
    ]);
  });

  it("allows editing GsDatePicker inside Modal and saves policies grouped by their own effectiveFrom", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "getProjectEmployeeGroups").mockResolvedValue([]);
    vi.spyOn(api, "getEmployeePolicies").mockResolvedValue({
      summary: { totalEmployees: 1, customPolicyCount: 1, projectPolicyCount: 0 },
      items: [
        {
          employeeCode: "T140-90003",
          employeeName: "Lê Văn C",
          policyGroupId: 2,
          policyGroupName: "Chính thức",
          basicSalary: 8000000,
          hasBasicSalaryOverride: true,
          hasCustomPolicy: true,
          appliedCount: 2,
          totalAllowance: 500000,
          effectiveFrom: "2026-06-01",
          policies: [],
        },
      ],
      pageIndex: 1,
      pageSize: 20,
      totalRow: 1,
      totalPages: 1,
    });

    vi.spyOn(api, "getEmployeePolicyDetail").mockResolvedValue({
      employeeCode: "T140-90003",
      employeeName: "Lê Văn C",
      policyGroupId: 2,
      policyGroupName: "Chính thức",
      basicSalary: 8000000,
      insuranceSalary: 5000000,
      policies: [
        {
          policyItemId: 1,
          policyCode: "POL_BASIC_SALARY",
          policyName: "Lương cơ bản",
          dataType: "currency",
          groupValue: "7000000",
          employeeValue: "8000000",
          effectiveValue: "8000000",
          hasOverride: true,
          effectiveFrom: "2026-06-01",
          effectiveTo: null,
          note: null,
        },
        {
          policyItemId: 12,
          policyCode: "POL_ALLOWANCE_GASOLINE",
          policyName: "Phụ cấp xăng xe",
          dataType: "currency",
          groupValue: "500000",
          employeeValue: "900000",
          effectiveValue: "900000",
          hasOverride: true,
          effectiveFrom: "2026-11-01",
          effectiveTo: null,
          note: null,
        },
      ],
    });

    const saveSpy = vi.spyOn(api, "saveEmployeePolicy").mockResolvedValue({ success: true });

    renderSubtab();

    await waitFor(() => {
      expect(screen.getByText("Lê Văn C")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Thao tác" }));
    await user.click(screen.getByText("Tùy chỉnh chế độ & lương"));

    await waitFor(() => {
      expect(screen.getByText(/Cấu hình thỏa thuận chế độ & lương: Lê Văn C/)).toBeInTheDocument();
    });

    // Click the per-row effectiveFrom trigger showing 01/11/2026 (second occurrence after top bar)
    const novButtons = screen.getAllByRole("button", { name: /01\/11\/2026/i });
    await user.click(novButtons[novButtons.length - 1]);

    // Click day 15 in the portaled calendar popover
    const day15 = Array.from(document.querySelectorAll<HTMLButtonElement>(".gs-date-cell-btn")).find(
      (btn) => btn.textContent === "15" && !btn.classList.contains("is-other-month")
    );
    expect(day15).toBeDefined();
    await user.click(day15!);

    // Trigger text should now update to 15/11/2026
    expect(screen.getByRole("button", { name: /15\/11\/2026/i })).toBeInTheDocument();

    // Save should issue 2 grouped PUTs: one for 2026-06-01, one for 2026-11-15
    await user.click(screen.getByRole("button", { name: /Lưu cấu hình lương/i }));

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledTimes(2);
    });

    expect(saveSpy.mock.calls[0][1].effectiveFrom).toBe("2026-06-01");
    expect(saveSpy.mock.calls[0][1].policies?.[0].policyItemId).toBe(1);
    expect(saveSpy.mock.calls[1][1].effectiveFrom).toBe("2026-11-15");
    expect(saveSpy.mock.calls[1][1].policies?.[0].policyItemId).toBe(12);
  });

  it("displays 'Chưa phân nhóm' status instead of 'Chuẩn nhóm' for unassigned employees without overrides", async () => {
    vi.spyOn(api, "getProjectEmployeeGroups").mockResolvedValue([]);
    vi.spyOn(api, "getEmployeePolicies").mockResolvedValue({
      summary: { totalEmployees: 1, customPolicyCount: 0, projectPolicyCount: 1 },
      items: [
        {
          employeeCode: "T140-06811",
          employeeName: "Bùi Hoàng Oanh",
          policyGroupId: null,
          policyGroupName: null,
          basicSalary: null,
          hasBasicSalaryOverride: false,
          hasCustomPolicy: false,
          appliedCount: 0,
          totalAllowance: 0,
          effectiveFrom: null,
          policies: [],
        },
      ],
      pageIndex: 1,
      pageSize: 20,
      totalRow: 1,
      totalPages: 1,
    });

    renderSubtab();

    await waitFor(() => {
      expect(screen.getByText("Bùi Hoàng Oanh")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Chưa phân nhóm").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("Chuẩn nhóm")).not.toBeInTheDocument();
  });

  it("blocks saving when effectiveTo is earlier than effectiveFrom and supports turning off custom mode", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "getProjectEmployeeGroups").mockResolvedValue([]);
    vi.spyOn(api, "getEmployeePolicies").mockResolvedValue({
      summary: { totalEmployees: 1, customPolicyCount: 1, projectPolicyCount: 0 },
      items: [
        {
          employeeCode: "T140-90002",
          employeeName: "Trần Thị B",
          policyGroupId: 2,
          policyGroupName: "Chính thức",
          basicSalary: 7000000,
          hasBasicSalaryOverride: false,
          hasCustomPolicy: true,
          appliedCount: 1,
          totalAllowance: 1000000,
          effectiveFrom: "2026-11-20",
          policies: [
            {
              policyItemId: 12,
              policyCode: "POL_ALLOWANCE_GASOLINE",
              policyName: "Phụ cấp xăng xe",
              policyTypeCode: "ALLOWANCE",
              dataType: "currency",
              value: 1000000,
              policyValue: "1000000",
              hasOverride: true,
            },
          ],
        },
      ],
      pageIndex: 1,
      pageSize: 20,
      totalRow: 1,
      totalPages: 1,
    });

    vi.spyOn(api, "getEmployeePolicyDetail").mockResolvedValue({
      employeeCode: "T140-90002",
      employeeName: "Trần Thị B",
      policyGroupId: 2,
      policyGroupName: "Chính thức",
      basicSalary: 7000000,
      insuranceSalary: 5000000,
      policies: [
        {
          policyItemId: 12,
          policyCode: "POL_ALLOWANCE_GASOLINE",
          policyName: "Phụ cấp xăng xe",
          dataType: "currency",
          groupValue: "500000",
          employeeValue: "1000000",
          effectiveValue: "1000000",
          hasOverride: true,
          effectiveFrom: "2026-11-25",
          effectiveTo: "2026-11-20",
          note: null,
        },
      ],
    });

    const restoreSpy = vi.spyOn(api, "restoreEmployeePolicy").mockResolvedValue({});
    const saveSpy = vi.spyOn(api, "saveEmployeePolicy").mockResolvedValue({ success: true });

    renderSubtab();

    await waitFor(() => {
      expect(screen.getByText("Trần Thị B")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Thao tác" }));
    await user.click(screen.getByText("Tùy chỉnh chế độ & lương"));

    await waitFor(() => {
      expect(screen.getByText(/Cấu hình thỏa thuận chế độ & lương: Trần Thị B/)).toBeInTheDocument();
    });

    // Should show inline date validation error and disable Save
    expect(screen.getByText("Phải ≥ Hiệu lực từ")).toBeInTheDocument();
    const saveBtn = screen.getByRole("button", { name: /Lưu cấu hình lương/i });
    expect(saveBtn).toBeDisabled();

    // Turning OFF "Bật thỏa thuận riêng" clears invalid date error and restores on Save
    const masterToggle = screen.getByRole("checkbox", { name: /Bật thỏa thuận riêng$/i });
    await user.click(masterToggle);
    expect(saveBtn).not.toBeDisabled();

    await user.click(saveBtn);

    await waitFor(() => {
      expect(restoreSpy).toHaveBeenCalledWith("T140-90002", 12, "1017");
    });
    expect(saveSpy).not.toHaveBeenCalled();
  });
});
