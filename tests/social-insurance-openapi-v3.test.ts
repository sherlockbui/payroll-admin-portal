import { describe, expect, it } from "vitest";
import { api } from "@/lib/api";

describe("OpenAPI 3.0 Social Insurance D02-LT (05-bao-hiem-xa-hoi.yaml) Suite", () => {
  let createdChangeId: number;

  it("1. Lấy tổng quan số liệu thống kê BHXH (Summary KPI)", async () => {
    const summary = await api.getSocialInsuranceSummaryV3();
    expect(summary).toBeDefined();
    expect(typeof summary.total).toBe("number");
    expect(summary.total).toBeGreaterThan(0);
    expect(typeof summary.activeCount).toBe("number");
    expect(typeof summary.totalMonthlyContribution).toBe("number");
    expect(summary.totalMonthlyContribution).toBeGreaterThan(0);
    expect(typeof summary.pendingChangesCount).toBe("number");
    expect(Array.isArray(summary.counts)).toBe(true);
  });

  it("2. Lấy thống kê BHXH theo dự án (Filter by projectId)", async () => {
    const summary = await api.getSocialInsuranceSummaryV3("1017");
    expect(summary).toBeDefined();
    expect(typeof summary.total).toBe("number");
    expect(summary.total).toBeGreaterThan(0);
  });

  it("3. Lấy danh sách thành viên tham gia BHXH có phân trang", async () => {
    const res = await api.getSocialInsuranceMembersV3({ page: 1, pageSize: 5 });
    expect(res).toBeDefined();
    expect(Array.isArray(res.items)).toBe(true);
    expect(res.page).toBe(1);
    expect(res.pageSize).toBe(5);
    expect(res.total).toBeGreaterThan(0);

    const first = res.items[0];
    expect(first).toHaveProperty("employee");
    expect(first).toHaveProperty("socialInsuranceNumber");
    expect(first).toHaveProperty("contributionSalary");
    expect(first).toHaveProperty("employeeContribution");
    expect(first).toHaveProperty("employerContribution");
    expect(first).toHaveProperty("totalContribution");
    expect(first.employeeContributionRate).toBe(10.5);
    expect(first.employerContributionRate).toBe(21.5);
    expect(first.totalContributionRate).toBe(32);
  });

  it("4. Lọc danh sách thành viên đang tham gia (status=ACTIVE)", async () => {
    const res = await api.getSocialInsuranceMembersV3({ status: "ACTIVE" });
    expect(res).toBeDefined();
    expect(res.items.length).toBeGreaterThan(0);
    for (const item of res.items) {
      expect(item.status).toBe("ACTIVE");
    }
  });

  it("5. Xem chi tiết thông tin sổ BHXH của nhân viên", async () => {
    const member = await api.getSocialInsuranceMemberDetailV3("NV-00124");
    expect(member).toBeDefined();
    expect(member.employee.employeeCode).toBe("NV-00124");
    expect(member.socialInsuranceNumber).toBe("7995001234");
    expect(member.contributionSalary).toBe(6300000);
  });

  it("6. Lấy lịch sử biến động BHXH của nhân viên", async () => {
    const history = await api.getSocialInsuranceMemberHistoryV3("NV-00124");
    expect(history).toBeDefined();
    expect(history.employeeCode).toBe("NV-00124");
    expect(Array.isArray(history.history)).toBe(true);
  });

  it("7. Lấy danh sách hồ sơ biến động BHXH D02-LT", async () => {
    const changes = await api.getSocialInsuranceChangesV3({ page: 1, pageSize: 10 });
    expect(changes).toBeDefined();
    expect(Array.isArray(changes.items)).toBe(true);
    expect(changes.total).toBeGreaterThan(0);

    const first = changes.items[0];
    expect(first).toHaveProperty("changeType");
    expect(first).toHaveProperty("effectiveMonth");
    expect(first).toHaveProperty("status");
  });

  it("8. Tạo mới hồ sơ biến động BHXH (Kê khai D02-LT)", async () => {
    const newChange = await api.createSocialInsuranceChangeV3({
      employeeCode: "NV-00126",
      changeType: "ADJUST_SALARY",
      effectiveMonth: "2026-09",
      oldSalary: 6500000,
      newSalary: 7200000,
      reason: "Tăng lương thâm niên và trách nhiệm kỹ thuật",
    });
    expect(newChange).toBeDefined();
    expect(newChange.id).toBeDefined();
    expect(newChange.employee.employeeCode).toBe("NV-00126");
    expect(newChange.changeType).toBe("ADJUST_SALARY");
    expect(newChange.newSalary).toBe(7200000);
    expect(newChange.status).toBe("SUBMITTED");

    createdChangeId = newChange.id;
  });

  it("9. Xác nhận đối soát mã tiếp nhận cơ quan BHXH", async () => {
    expect(createdChangeId).toBeDefined();
    const reconciled = await api.confirmSocialInsuranceReconciliationV3(createdChangeId, {
      reconciliationCode: "BHXH-7901-202609-0888",
    });
    expect(reconciled).toBeDefined();
    expect(reconciled.status).toBe("RECONCILED");
    expect(reconciled.reconciliationCode).toBe("BHXH-7901-202609-0888");
  });

  it("10. Phê duyệt hồ sơ biến động BHXH và cập nhật mức đóng mới", async () => {
    expect(createdChangeId).toBeDefined();
    const approved = await api.approveSocialInsuranceChangeV3(createdChangeId);
    expect(approved).toBeDefined();
    expect(approved.status).toBe("APPROVED");
    expect(approved.approvedAt).toBeDefined();

    // Verify member updated
    const member = await api.getSocialInsuranceMemberDetailV3("NV-00126");
    expect(member.contributionSalary).toBe(7200000);
    expect(member.employeeContribution).toBe(Math.round(7200000 * 0.105));
    expect(member.employerContribution).toBe(Math.round(7200000 * 0.215));
    expect(member.totalContribution).toBe(Math.round(7200000 * 0.32));
  });

  it("11. Từ chối hồ sơ biến động BHXH", async () => {
    const tempChange = await api.createSocialInsuranceChangeV3({
      employeeCode: "NV-00124",
      changeType: "DECREASE",
      effectiveMonth: "2026-10",
      reason: "Báo giảm nhầm",
    });
    const rejected = await api.rejectSocialInsuranceChangeV3(tempChange.id, {
      reason: "Hồ sơ không hợp lệ do nhân viên vẫn đang làm việc",
    });
    expect(rejected).toBeDefined();
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.reason).toContain("Từ chối");
  });

  it("12. Xuất dữ liệu mẫu D02-LT ra file Excel", async () => {
    const exportResult = await api.exportSocialInsuranceExcelV3();
    expect(exportResult).toBeDefined();
    expect(exportResult.fileName).toContain(".xlsx");
    expect(exportResult.fileUrl).toBeDefined();
    expect(exportResult.totalRecords).toBeGreaterThan(0);
  });
});
