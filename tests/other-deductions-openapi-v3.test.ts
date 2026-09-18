import { describe, expect, it } from "vitest";
import { api } from "@/lib/api";

describe("OpenAPI 3.0 Other Deductions (07-khoan-tru-khac.yaml) Suite", () => {
  let createdDeductionId: number;

  it("1. Lấy tổng quan số liệu thống kê khoản giảm trừ (Summary KPI)", async () => {
    const summary = await api.getOtherDeductionsSummaryV3();
    expect(summary).toBeDefined();
    expect(typeof summary.total).toBe("number");
    expect(summary.total).toBeGreaterThan(0);
    expect(typeof summary.totalAmount).toBe("number");
    expect(summary.totalAmount).toBeGreaterThan(0);
    expect(typeof summary.disciplineFineCount).toBe("number");
    expect(typeof summary.assetCompensationCount).toBe("number");
    expect(typeof summary.advancePaymentCount).toBe("number");
    expect(Array.isArray(summary.counts)).toBe(true);
  });

  it("2. Lấy thống kê khoản giảm trừ theo dự án và tháng", async () => {
    const summary = await api.getOtherDeductionsSummaryV3({ projectId: "1017", month: "2026-08" });
    expect(summary).toBeDefined();
    expect(typeof summary.total).toBe("number");
    expect(summary.total).toBeGreaterThan(0);
  });

  it("3. Lấy danh mục các loại giảm trừ (Master Data)", async () => {
    const types = await api.getMasterOtherDeductionTypesV3();
    expect(types).toBeDefined();
    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBeGreaterThanOrEqual(3);

    const advance = types.find((t) => t.code === "ADVANCE_PAYMENT");
    expect(advance).toBeDefined();
    expect(advance?.name).toContain("Tạm ứng");
  });

  it("4. Lấy danh sách khoản giảm trừ có phân trang", async () => {
    const res = await api.getOtherDeductionsListV3({ page: 1, pageSize: 5 });
    expect(res).toBeDefined();
    expect(Array.isArray(res.items)).toBe(true);
    expect(res.page).toBe(1);
    expect(res.pageSize).toBe(5);
    expect(res.total).toBeGreaterThan(0);

    const first = res.items[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("employee");
    expect(first).toHaveProperty("month");
    expect(first).toHaveProperty("type");
    expect(first).toHaveProperty("amount");
    expect(typeof first.amount).toBe("number");
  });

  it("5. Lọc danh sách khoản giảm trừ theo loại (type=DISCIPLINE_FINE)", async () => {
    const res = await api.getOtherDeductionsListV3({ type: "DISCIPLINE_FINE" });
    expect(res).toBeDefined();
    expect(res.items.length).toBeGreaterThan(0);
    for (const item of res.items) {
      expect(item.type).toBe("DISCIPLINE_FINE");
    }
  });

  it("6. Lọc danh sách theo từ khóa tìm kiếm", async () => {
    const res = await api.getOtherDeductionsListV3({ search: "Nguyễn Văn An" });
    expect(res).toBeDefined();
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items[0].employee.fullName).toContain("Nguyễn Văn An");
  });

  it("7. Thêm mới khoản giảm trừ (Create Other Deduction)", async () => {
    const newDeduction = await api.createOtherDeductionV3({
      employeeCode: "NV-00124",
      month: "2026-08",
      type: "DISCIPLINE_FINE",
      amount: 750000,
      decisionNumber: "QĐ-2026/08-99/KL",
      decisionDate: "2026-08-20",
      reason: "Vi phạm quy định an toàn lao động trong xưởng",
    });

    expect(newDeduction).toBeDefined();
    expect(newDeduction.id).toBeDefined();
    expect(newDeduction.amount).toBe(750000);
    expect(newDeduction.type).toBe("DISCIPLINE_FINE");
    expect(newDeduction.decisionNumber).toBe("QĐ-2026/08-99/KL");

    createdDeductionId = newDeduction.id;
  });

  it("8. Xem chi tiết khoản giảm trừ vừa tạo", async () => {
    expect(createdDeductionId).toBeDefined();
    const detail = await api.getOtherDeductionDetailV3(createdDeductionId);
    expect(detail).toBeDefined();
    expect(detail.id).toBe(createdDeductionId);
    expect(detail.amount).toBe(750000);
    expect(detail.reason).toContain("Vi phạm quy định an toàn");
  });

  it("9. Cập nhật khoản giảm trừ (Update Other Deduction)", async () => {
    expect(createdDeductionId).toBeDefined();
    const updated = await api.updateOtherDeductionV3(createdDeductionId, {
      amount: 600000,
      reason: "Giảm mức phạt sau khi xem xét biên bản giải trình",
    });

    expect(updated).toBeDefined();
    expect(updated.id).toBe(createdDeductionId);
    expect(updated.amount).toBe(600000);
    expect(updated.reason).toContain("Giảm mức phạt");
  });

  it("10. Tải lên và xóa file chứng từ đính kèm (Attachment Lifecycle)", async () => {
    expect(createdDeductionId).toBeDefined();
    const dummyFile = new File(["dummy content"], "quyet_dinh_xu_phat.pdf", { type: "application/pdf" });
    const uploadRes = await api.uploadOtherDeductionAttachmentV3(createdDeductionId, dummyFile);

    expect(uploadRes).toBeDefined();
    expect(uploadRes.fileName).toBeDefined();

    const delRes = await api.deleteOtherDeductionAttachmentV3(createdDeductionId);
    expect(delRes.success).toBe(true);
  });

  it("11. Xóa khoản giảm trừ (Delete Other Deduction)", async () => {
    expect(createdDeductionId).toBeDefined();
    const delRes = await api.deleteOtherDeductionV3(createdDeductionId);
    expect(delRes).toBeDefined();
    expect(delRes.id).toBe(createdDeductionId);

    // Xác nhận đã xóa thành công khỏi database
    await expect(api.getOtherDeductionDetailV3(createdDeductionId)).rejects.toThrow();
  });

  it("12. Xuất Excel, Tải mẫu import & Xem lịch sử thao tác (Audit Logs)", async () => {
    const exportRes = await api.exportOtherDeductionsExcelV3({ month: "2026-08" });
    expect(exportRes).toBeDefined();
    expect(exportRes.fileName).toContain(".xlsx");

    const auditLogs = await api.getOtherDeductionsAuditLogsV3();
    expect(auditLogs).toBeDefined();
    expect(Array.isArray(auditLogs.items)).toBe(true);
    expect(auditLogs.total).toBeGreaterThan(0);
  });
});
