import { describe, expect, it } from "vitest";
import { api } from "@/lib/api";

describe("OpenAPI 3.0 Benefits & Allowances (06-che-do-phu-cap.yaml) Suite", () => {
  it("1. Lấy tổng quan số liệu thống kê phụ cấp (Summary KPI)", async () => {
    const summary = await api.getBenefitsAllowanceSummaryV3();
    expect(summary).toBeDefined();
    expect(typeof summary.total).toBe("number");
    expect(summary.total).toBeGreaterThan(0);
    expect(typeof summary.projectDefaultCount).toBe("number");
    expect(typeof summary.customCount).toBe("number");
    expect(typeof summary.totalMonthlyAllowanceAmount).toBe("number");
    expect(summary.totalMonthlyAllowanceAmount).toBeGreaterThan(0);
    expect(Array.isArray(summary.counts)).toBe(true);
  });

  it("2. Lấy thống kê phụ cấp theo dự án (Filter by projectId)", async () => {
    const summary = await api.getBenefitsAllowanceSummaryV3("1017");
    expect(summary).toBeDefined();
    expect(typeof summary.total).toBe("number");
    expect(summary.total).toBeGreaterThan(0);
  });

  it("3. Lấy danh mục các loại phụ cấp (Master Data)", async () => {
    const types = await api.getMasterAllowanceTypesV3();
    expect(types).toBeDefined();
    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBeGreaterThanOrEqual(3);

    const meal = types.find((t) => t.code === "MEAL");
    expect(meal).toBeDefined();
    expect(meal?.name).toContain("ăn trưa");
  });

  it("4. Lấy cấu hình phụ cấp mặc định dự án (Project Defaults)", async () => {
    const defaults = await api.getBenefitsAllowanceProjectDefaultsV3();
    expect(defaults).toBeDefined();
    expect(Array.isArray(defaults)).toBe(true);
    expect(defaults.length).toBeGreaterThan(0);
  });

  it("5. Lấy danh sách phụ cấp nhân viên có phân trang", async () => {
    const res = await api.getBenefitsAllowanceEmployeesV3({ page: 1, pageSize: 5 });
    expect(res).toBeDefined();
    expect(Array.isArray(res.items)).toBe(true);
    expect(res.page).toBe(1);
    expect(res.pageSize).toBe(5);
    expect(res.total).toBeGreaterThan(0);

    const first = res.items[0];
    expect(first).toHaveProperty("employee");
    expect(first).toHaveProperty("baseSalary");
    expect(first).toHaveProperty("mode");
    expect(Array.isArray(first.allowances)).toBe(true);
    expect(typeof first.totalMonthlyAllowance).toBe("number");
  });

  it("6. Lọc danh sách nhân viên áp dụng phụ cấp mặc định (mode=PROJECT_DEFAULT)", async () => {
    const res = await api.getBenefitsAllowanceEmployeesV3({ mode: "PROJECT_DEFAULT" });
    expect(res).toBeDefined();
    expect(res.items.length).toBeGreaterThan(0);
    for (const item of res.items) {
      expect(item.mode).toBe("PROJECT_DEFAULT");
    }
  });

  it("7. Lọc danh sách nhân viên có phụ cấp tùy chỉnh riêng (mode=CUSTOM)", async () => {
    const res = await api.getBenefitsAllowanceEmployeesV3({ mode: "CUSTOM" });
    expect(res).toBeDefined();
    expect(res.items.length).toBeGreaterThan(0);
    for (const item of res.items) {
      expect(item.mode).toBe("CUSTOM");
    }
  });

  it("8. Xem chi tiết thông tin phụ cấp của một nhân viên", async () => {
    const emp = await api.getBenefitsAllowanceDetailV3("NV-00124");
    expect(emp).toBeDefined();
    expect(emp.employee.employeeCode).toBe("NV-00124");
    expect(emp.baseSalary).toBe(6300000);
    expect(emp.allowances.length).toBeGreaterThan(0);
  });

  it("9. Tùy chỉnh phụ cấp cho nhân viên (Custom Allowances)", async () => {
    const updated = await api.updateBenefitsAllowanceV3("NV-00124", {
      allowances: [
        { policyId: "pol-meal", amount: 730000, isCustomized: false },
        { policyId: "pol-resp", amount: 2000000, isCustomized: true },
      ],
      reason: "Bổ sung phụ cấp trách nhiệm dự án mới",
    });
    expect(updated).toBeDefined();
    expect(updated.employee.employeeCode).toBe("NV-00124");
    expect(updated.mode).toBe("CUSTOM");
    expect(updated.totalMonthlyAllowance).toBe(2730000);
  });

  it("10. Khôi phục phụ cấp về mặc định dự án (Restore Default)", async () => {
    const restored = await api.restoreBenefitsAllowanceDefaultV3("NV-00124");
    expect(restored).toBeDefined();
    expect(restored.employee.employeeCode).toBe("NV-00124");
    expect(restored.mode).toBe("PROJECT_DEFAULT");
    expect(restored.totalMonthlyAllowance).toBe(1230000);
  });

  it("11. Lấy lịch sử biến động điều chỉnh phụ cấp", async () => {
    const history = await api.getBenefitsAllowanceHistoryV3("NV-00125");
    expect(history).toBeDefined();
    expect(history.employeeCode).toBe("NV-00125");
    expect(Array.isArray(history.history)).toBe(true);
  });

  it("12. Xuất dữ liệu phụ cấp ra file Excel", async () => {
    const exportResult = await api.exportBenefitsAllowancesExcelV3();
    expect(exportResult).toBeDefined();
    expect(exportResult.fileName).toContain(".xlsx");
    expect(exportResult.fileUrl).toBeDefined();
    expect(exportResult.totalRecords).toBeGreaterThan(0);
  });
});
