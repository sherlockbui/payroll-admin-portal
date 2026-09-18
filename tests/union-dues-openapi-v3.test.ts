import { describe, expect, it } from "vitest";
import { api } from "@/lib/api";

describe("OpenAPI 3.0 Union Dues (03-cong-doan-phi.yaml) Suite", () => {
  it("1. Lấy tổng quan số liệu thống kê công đoàn phí (Summary KPI)", async () => {
    const summary = await api.getUnionDuesSummaryV3();
    expect(summary).toBeDefined();
    expect(typeof summary.total).toBe("number");
    expect(summary.total).toBeGreaterThan(0);
    expect(typeof summary.participatingCount).toBe("number");
    expect(typeof summary.notParticipatingCount).toBe("number");
    expect(typeof summary.totalMonthlyDues).toBe("number");
    expect(summary.participatingCount + summary.notParticipatingCount).toBe(summary.total);
    expect(Array.isArray(summary.counts)).toBe(true);
  });

  it("2. Lấy thống kê công đoàn phí theo dự án (Filter by projectId)", async () => {
    const summary = await api.getUnionDuesSummaryV3("1017");
    expect(summary).toBeDefined();
    expect(typeof summary.total).toBe("number");
    expect(summary.total).toBeGreaterThan(0);
  });

  it("3. Lấy danh sách đoàn viên công đoàn có phân trang", async () => {
    const res = await api.getUnionDuesMembersV3({ page: 1, pageSize: 5 });
    expect(res).toBeDefined();
    expect(Array.isArray(res.items)).toBe(true);
    expect(res.page).toBe(1);
    expect(res.pageSize).toBe(5);
    expect(res.total).toBeGreaterThan(0);
    expect(res.totalPages).toBeGreaterThanOrEqual(1);

    const first = res.items[0];
    expect(first).toHaveProperty("employee");
    expect(first).toHaveProperty("participating");
  });

  it("4. Lọc danh sách nhân viên đang trích nộp công đoàn (participationStatus=PARTICIPATING)", async () => {
    const res = await api.getUnionDuesMembersV3({ participationStatus: "PARTICIPATING" });
    expect(res).toBeDefined();
    expect(res.items.length).toBeGreaterThan(0);
    for (const item of res.items) {
      expect(item.participating).toBe(true);
    }
  });

  it("5. Lọc danh sách nhân viên không tham gia công đoàn (participationStatus=NOT_PARTICIPATING)", async () => {
    const res = await api.getUnionDuesMembersV3({ participationStatus: "NOT_PARTICIPATING" });
    expect(res).toBeDefined();
    expect(res.items.length).toBeGreaterThan(0);
    for (const item of res.items) {
      expect(item.participating).toBe(false);
    }
  });

  it("6. Tìm kiếm đoàn viên theo mã hoặc tên nhân viên", async () => {
    const res = await api.getUnionDuesMembersV3({ search: "NV-00124" });
    expect(res).toBeDefined();
    expect(res.items.length).toBe(1);
    expect(res.items[0].employee.employeeCode).toBe("NV-00124");
    expect(res.items[0].employee.fullName).toBe("Nguyễn Văn An");
  });

  it("7. Lấy chi tiết thông tin đoàn viên công đoàn", async () => {
    const member = await api.getUnionDuesMemberDetailV3("NV-00124");
    expect(member).toBeDefined();
    expect(member.employee.employeeCode).toBe("NV-00124");
    expect(member.participating).toBe(true);
    expect(member.contributionAmount).toBe(23400);
  });

  it("8. Cập nhật trạng thái tham gia công đoàn của nhân viên (Update/Toggle)", async () => {
    const updated = await api.updateUnionDuesMemberV3("NV-00124", {
      participating: false,
      effectiveDate: "2026-09-01",
      reason: "Đơn xin dừng trích nộp công đoàn phí",
    });
    expect(updated).toBeDefined();
    expect(updated.participating).toBe(false);

    // Verify detail
    const detailAfter = await api.getUnionDuesMemberDetailV3("NV-00124");
    expect(detailAfter.participating).toBe(false);

    // Re-enable
    const reEnabled = await api.updateUnionDuesMemberV3("NV-00124", {
      participating: true,
      effectiveDate: "2026-09-17",
      contributionAmount: 23400,
      reason: "Đăng ký gia nhập lại",
    });
    expect(reEnabled.participating).toBe(true);
  });

  it("9. Lấy lịch sử biến động đoàn phí của nhân viên", async () => {
    const history = await api.getUnionDuesHistoryV3("NV-00124");
    expect(history).toBeDefined();
    expect(Array.isArray(history.items)).toBe(true);
    expect(history.items.length).toBeGreaterThan(0);
    expect(history.items[0].performedBy).toBeDefined();
    expect(history.items[0].occurredAt).toBeDefined();
  });

  it("10. Xuất báo cáo danh sách công đoàn phí ra Excel", async () => {
    const exportResult = await api.exportUnionDuesExcelV3();
    expect(exportResult).toBeDefined();
    expect(exportResult.fileName).toContain(".xlsx");
    expect(exportResult.fileUrl).toBeDefined();
    expect(exportResult.totalRecords).toBeGreaterThan(0);
  });

  it("11. Lấy nhật ký audit logs của phân hệ công đoàn phí", async () => {
    const logs = await api.getUnionDuesAuditLogsV3();
    expect(logs).toBeDefined();
    expect(Array.isArray(logs.items)).toBe(true);
    expect(logs.total).toBeGreaterThan(0);
  });
});
