import { describe, expect, it } from "vitest";
import { api } from "@/lib/api";

describe("OpenAPI 3.0 Standard Workdays (04-ngay-cong-chuan.yaml) Suite", () => {
  it("1. Lấy tổng quan số liệu thống kê ngày công chuẩn (Summary KPI)", async () => {
    const summary = await api.getStandardWorkdaysSummaryV3();
    expect(summary).toBeDefined();
    expect(typeof summary.total).toBe("number");
    expect(summary.total).toBeGreaterThan(0);
    expect(typeof summary.projectDefaultCount).toBe("number");
    expect(typeof summary.customCount).toBe("number");
    expect(summary.projectDefaultCount + summary.customCount).toBe(summary.total);
    expect(summary.projectStandardDays).toBe(26);
    expect(Array.isArray(summary.counts)).toBe(true);
  });

  it("2. Lấy thống kê ngày công chuẩn theo dự án (Filter by projectId)", async () => {
    const summary = await api.getStandardWorkdaysSummaryV3("1017");
    expect(summary).toBeDefined();
    expect(typeof summary.total).toBe("number");
    expect(summary.total).toBeGreaterThan(0);
  });

  it("3. Lấy thông tin ngày công chuẩn mặc định dự án (Project Default)", async () => {
    const res = await api.getStandardWorkdayProjectDefaultV3("1017");
    expect(res).toBeDefined();
    expect(res.projectId).toBe(1017);
    expect(res.defaultStandardDays).toBe(26);
    expect(typeof res.note).toBe("string");
  });

  it("4. Lấy danh sách nhân viên ngày công chuẩn có phân trang", async () => {
    const res = await api.getStandardWorkdaysEmployeesV3({ page: 1, pageSize: 5 });
    expect(res).toBeDefined();
    expect(Array.isArray(res.items)).toBe(true);
    expect(res.page).toBe(1);
    expect(res.pageSize).toBe(5);
    expect(res.total).toBeGreaterThan(0);
    expect(res.totalPages).toBeGreaterThanOrEqual(1);

    const first = res.items[0];
    expect(first).toHaveProperty("employee");
    expect(first).toHaveProperty("projectStandardDays");
    expect(first).toHaveProperty("appliedStandardDays");
    expect(first).toHaveProperty("mode");
  });

  it("5. Lọc danh sách nhân viên áp dụng mặc định dự án (mode=PROJECT_DEFAULT)", async () => {
    const res = await api.getStandardWorkdaysEmployeesV3({ mode: "PROJECT_DEFAULT" });
    expect(res).toBeDefined();
    expect(res.items.length).toBeGreaterThan(0);
    for (const item of res.items) {
      expect(item.mode).toBe("PROJECT_DEFAULT");
      expect(item.appliedStandardDays).toBe(item.projectStandardDays);
    }
  });

  it("6. Lọc danh sách nhân viên có tùy chỉnh ngày công riêng (mode=CUSTOM)", async () => {
    const res = await api.getStandardWorkdaysEmployeesV3({ mode: "CUSTOM" });
    expect(res).toBeDefined();
    expect(res.items.length).toBeGreaterThan(0);
    for (const item of res.items) {
      expect(item.mode).toBe("CUSTOM");
      expect(typeof item.adjustmentReason).toBe("string");
    }
  });

  it("7. Tìm kiếm nhân viên theo mã hoặc tên", async () => {
    const res = await api.getStandardWorkdaysEmployeesV3({ search: "NV-00124" });
    expect(res).toBeDefined();
    expect(res.items.length).toBe(1);
    expect(res.items[0].employee.employeeCode).toBe("NV-00124");
  });

  it("8. Xem chi tiết thông tin ngày công chuẩn của một nhân viên", async () => {
    const emp = await api.getStandardWorkdayDetailV3("NV-00124");
    expect(emp).toBeDefined();
    expect(emp.employee.employeeCode).toBe("NV-00124");
    expect(emp.projectStandardDays).toBe(26);
    expect(emp.appliedStandardDays).toBe(26);
  });

  it("9. Tùy chỉnh ngày công chuẩn cho nhân viên (Custom Workday Override)", async () => {
    const updated = await api.updateStandardWorkdayV3("NV-00124", {
      standardDays: 22,
      reason: "Điều chỉnh công chuẩn cho vị trí thử nghiệm",
    });
    expect(updated).toBeDefined();
    expect(updated.employee.employeeCode).toBe("NV-00124");
    expect(updated.appliedStandardDays).toBe(22);
    expect(updated.mode).toBe("CUSTOM");
    expect(updated.adjustmentReason).toBe("Điều chỉnh công chuẩn cho vị trí thử nghiệm");
  });

  it("10. Khôi phục ngày công chuẩn về mặc định dự án (Restore Default)", async () => {
    const restored = await api.restoreStandardWorkdayDefaultV3("NV-00124");
    expect(restored).toBeDefined();
    expect(restored.employee.employeeCode).toBe("NV-00124");
    expect(restored.appliedStandardDays).toBe(restored.projectStandardDays);
    expect(restored.mode).toBe("PROJECT_DEFAULT");
    expect(restored.adjustmentReason).toBeNull();
  });

  it("11. Lấy lịch sử biến động điều chỉnh ngày công chuẩn", async () => {
    const history = await api.getStandardWorkdayHistoryV3("NV-00125");
    expect(history).toBeDefined();
    expect(history.employeeCode).toBe("NV-00125");
    expect(Array.isArray(history.history)).toBe(true);
    expect(history.history.length).toBeGreaterThan(0);
  });

  it("12. Xuất dữ liệu ngày công chuẩn ra file Excel", async () => {
    const exportResult = await api.exportStandardWorkdaysExcelV3();
    expect(exportResult).toBeDefined();
    expect(exportResult.fileName).toContain(".xlsx");
    expect(exportResult.fileUrl).toBeDefined();
    expect(exportResult.totalRecords).toBeGreaterThan(0);
  });
});
