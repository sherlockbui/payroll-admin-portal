import { describe, expect, it } from "vitest";
import { api } from "@/lib/api";

describe("OpenAPI 3.0 Annual Leave (02-phep-nam.yaml) Suite", () => {
  it("1. Lấy tổng quan số liệu thống kê phép năm (Summary KPI)", async () => {
    const summary = await api.getAnnualLeaveSummaryV3();
    expect(summary).toBeDefined();
    expect(typeof summary.total).toBe("number");
    expect(summary.total).toBeGreaterThan(0);
    expect(typeof summary.officialEligible).toBe("number");
    expect(typeof summary.probationOrNoContract).toBe("number");
    expect(typeof summary.terminated).toBe("number");
    expect(typeof summary.hasAvailableLeave).toBe("number");
    expect(typeof summary.exhausted).toBe("number");
    expect(Array.isArray(summary.counts)).toBe(true);

    const totalFromCounts = summary.counts?.find((c) => c.key === "ALL")?.count;
    expect(totalFromCounts).toBe(summary.total);
  });

  it("2. Lấy thống kê phép năm theo dự án (Filter by projectId)", async () => {
    const summary = await api.getAnnualLeaveSummaryV3("1017");
    expect(summary).toBeDefined();
    expect(typeof summary.total).toBe("number");
    expect(summary.total).toBeGreaterThan(0);
  });

  it("3. Lấy danh sách nhân viên phép năm có phân trang", async () => {
    const res = await api.getAnnualLeaveEmployeesV3({ page: 1, pageSize: 5 });
    expect(res).toBeDefined();
    expect(Array.isArray(res.items)).toBe(true);
    expect(res.page).toBe(1);
    expect(res.pageSize).toBe(5);
    expect(res.total).toBeGreaterThan(0);
    expect(res.totalPages).toBeGreaterThanOrEqual(1);

    const first = res.items[0];
    expect(first).toHaveProperty("employee");
    expect(first).toHaveProperty("employmentType");
    expect(first).toHaveProperty("joinDate");
  });

  it("4. Lọc nhân sự đủ điều kiện hưởng phép (view=OFFICIAL_ELIGIBLE)", async () => {
    const res = await api.getAnnualLeaveEmployeesV3({ view: "OFFICIAL_ELIGIBLE" });
    expect(res).toBeDefined();
    expect(res.items.length).toBeGreaterThan(0);
    for (const item of res.items) {
      expect(item.employmentType).toBe("OFFICIAL_CONTRACT");
      expect(item.terminationDate).toBeFalsy();
    }
  });

  it("5. Lọc nhân sự thử việc / chưa hợp đồng (view=PROBATION_OR_NO_CONTRACT)", async () => {
    const res = await api.getAnnualLeaveEmployeesV3({ view: "PROBATION_OR_NO_CONTRACT" });
    expect(res).toBeDefined();
    expect(res.items.length).toBeGreaterThan(0);
    for (const item of res.items) {
      expect(item.employmentType).not.toBe("OFFICIAL_CONTRACT");
    }
  });

  it("6. Lọc nhân sự đã thôi việc (view=TERMINATED)", async () => {
    const res = await api.getAnnualLeaveEmployeesV3({ view: "TERMINATED" });
    expect(res).toBeDefined();
    expect(res.items.length).toBeGreaterThan(0);
    for (const item of res.items) {
      expect(item.terminationDate).toBeDefined();
    }
  });

  it("7. Lọc nhân sự còn ngày phép khả dụng (view=HAS_AVAILABLE_LEAVE)", async () => {
    const res = await api.getAnnualLeaveEmployeesV3({ view: "HAS_AVAILABLE_LEAVE" });
    expect(res).toBeDefined();
    expect(res.items.length).toBeGreaterThan(0);
    for (const item of res.items) {
      expect((item.availableDays ?? 0)).toBeGreaterThan(0);
    }
  });

  it("8. Lọc nhân sự đã dùng hết ngày phép (view=EXHAUSTED)", async () => {
    const res = await api.getAnnualLeaveEmployeesV3({ view: "EXHAUSTED" });
    expect(res).toBeDefined();
    expect(res.items.length).toBeGreaterThan(0);
    for (const item of res.items) {
      expect((item.availableDays ?? 0)).toBeLessThanOrEqual(0);
    }
  });

  it("9. Tìm kiếm nhân viên theo mã hoặc họ tên", async () => {
    const res = await api.getAnnualLeaveEmployeesV3({ search: "NV-00124" });
    expect(res).toBeDefined();
    expect(res.items.length).toBe(1);
    expect(res.items[0].employee.employeeCode).toBe("NV-00124");
    expect(res.items[0].employee.fullName).toBe("Nguyễn Văn An");
  });

  it("10. Lấy chi tiết thông tin phép năm của nhân viên", async () => {
    const detail = await api.getAnnualLeaveDetailV3("NV-00124");
    expect(detail).toBeDefined();
    expect(detail.employee.employeeCode).toBe("NV-00124");
    expect(detail.employmentType).toBe("OFFICIAL_CONTRACT");
    expect(detail.annualEntitlementDays).toBe(12);
    expect(detail.availableDays).toBe(8.5);
  });

  it("11. Lấy lịch sử sử dụng ngày phép theo năm (History)", async () => {
    const history2026 = await api.getAnnualLeaveHistoryV3("NV-00124", { year: 2026 });
    expect(history2026).toBeDefined();
    expect(Array.isArray(history2026.items)).toBe(true);
    expect(history2026.items.length).toBe(2);
    expect(history2026.items[0].fromDate.startsWith("2026")).toBe(true);
    expect(history2026.items[0].approvedBy.fullName).toBeDefined();

    const history2025 = await api.getAnnualLeaveHistoryV3("NV-00124", { year: 2025 });
    expect(history2025.items.length).toBe(1);
    expect(history2025.items[0].fromDate.startsWith("2025")).toBe(true);
  });

  it("12. Xuất báo cáo phép năm ra Excel (Export)", async () => {
    const exportResult = await api.exportAnnualLeaveExcelV3({ year: 2026 });
    expect(exportResult).toBeDefined();
    expect(exportResult.fileName).toContain(".xlsx");
    expect(exportResult.fileUrl).toBeDefined();
    expect(exportResult.totalRecords).toBeGreaterThan(0);
    expect(exportResult.exportedAt).toBeDefined();
  });
});
