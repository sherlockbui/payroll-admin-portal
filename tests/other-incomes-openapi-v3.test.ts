import { describe, expect, it } from "vitest";
import { api } from "@/lib/api";

describe("OpenAPI 3.0 Other Incomes (08-thu-nhap-khac.yaml) Suite", () => {
  let createdIncomeId: number;

  it("1. Lấy tổng quan số liệu thống kê thu nhập khác (Summary KPI)", async () => {
    const summary = await api.getOtherIncomesSummaryV3();
    expect(summary).toBeDefined();
    expect(typeof summary.total).toBe("number");
    expect(summary.total).toBeGreaterThan(0);
    expect(typeof summary.totalAmount).toBe("number");
    expect(summary.totalAmount).toBeGreaterThan(0);
    expect(typeof summary.hotBonusCount).toBe("number");
    expect(typeof summary.performanceBonusCount).toBe("number");
    expect(typeof summary.holidayBonusCount).toBe("number");
    expect(Array.isArray(summary.counts)).toBe(true);
  });

  it("2. Lấy thống kê thu nhập khác theo dự án và tháng", async () => {
    const summary = await api.getOtherIncomesSummaryV3({ projectId: "1017", month: "2026-08" });
    expect(summary).toBeDefined();
    expect(typeof summary.total).toBe("number");
    expect(summary.total).toBeGreaterThan(0);
  });

  it("3. Lấy danh mục các loại thu nhập (Master Data)", async () => {
    const types = await api.getMasterOtherIncomeTypesV3();
    expect(types).toBeDefined();
    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBeGreaterThanOrEqual(4);

    const hotBonus = types.find((t) => t.code === "HOT_BONUS");
    expect(hotBonus).toBeDefined();
    expect(hotBonus?.name).toContain("Thưởng nóng");
  });

  it("4. Lấy danh sách thu nhập khác có phân trang", async () => {
    const res = await api.getOtherIncomesListV3({ page: 1, pageSize: 5 });
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

  it("5. Lọc danh sách thu nhập khác theo loại (type=HOT_BONUS)", async () => {
    const res = await api.getOtherIncomesListV3({ type: "HOT_BONUS" });
    expect(res).toBeDefined();
    expect(res.items.length).toBeGreaterThan(0);
    for (const item of res.items) {
      expect(item.type).toBe("HOT_BONUS");
    }
  });

  it("6. Lọc danh sách theo từ khóa tìm kiếm", async () => {
    const res = await api.getOtherIncomesListV3({ search: "Nguyễn Văn An" });
    expect(res).toBeDefined();
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items[0].employee.fullName).toContain("Nguyễn Văn An");
  });

  it("7. Thêm mới khoản thu nhập khác (Create Other Income)", async () => {
    const newIncome = await api.createOtherIncomeV3({
      employeeCode: "NV-00124",
      month: "2026-08",
      type: "PROJECT_SUPPORT",
      amount: 1200000,
      decisionNumber: "QĐ-2026/08-98/DA",
      decisionDate: "2026-08-25",
      reason: "Hỗ trợ công tác đột xuất triển khai dây chuyền mới",
    });

    expect(newIncome).toBeDefined();
    expect(newIncome.id).toBeDefined();
    expect(newIncome.amount).toBe(1200000);
    expect(newIncome.type).toBe("PROJECT_SUPPORT");
    expect(newIncome.decisionNumber).toBe("QĐ-2026/08-98/DA");

    createdIncomeId = newIncome.id;
  });

  it("8. Xem chi tiết khoản thu nhập vừa tạo", async () => {
    expect(createdIncomeId).toBeDefined();
    const detail = await api.getOtherIncomeDetailV3(createdIncomeId);
    expect(detail).toBeDefined();
    expect(detail.id).toBe(createdIncomeId);
    expect(detail.amount).toBe(1200000);
    expect(detail.reason).toContain("Hỗ trợ công tác đột xuất");
  });

  it("9. Cập nhật khoản thu nhập khác (Update Other Income)", async () => {
    expect(createdIncomeId).toBeDefined();
    const updated = await api.updateOtherIncomeV3(createdIncomeId, {
      amount: 1500000,
      reason: "Bổ sung thêm chi phí phụ cấp lưu trú công tác",
    });

    expect(updated).toBeDefined();
    expect(updated.id).toBe(createdIncomeId);
    expect(updated.amount).toBe(1500000);
    expect(updated.reason).toContain("Bổ sung thêm chi phí");
  });

  it("10. Tải lên và xóa file quyết định khen thưởng đính kèm (Attachment Lifecycle)", async () => {
    expect(createdIncomeId).toBeDefined();
    const dummyFile = new File(["dummy content"], "quyet_dinh_khen_thuong.pdf", { type: "application/pdf" });
    const uploadRes = await api.uploadOtherIncomeAttachmentV3(createdIncomeId, dummyFile);

    expect(uploadRes).toBeDefined();
    expect(uploadRes.fileName).toBeDefined();

    const delRes = await api.deleteOtherIncomeAttachmentV3(createdIncomeId);
    expect(delRes.success).toBe(true);
  });

  it("11. Xóa khoản thu nhập khác (Delete Other Income)", async () => {
    expect(createdIncomeId).toBeDefined();
    const delRes = await api.deleteOtherIncomeV3(createdIncomeId);
    expect(delRes).toBeDefined();
    expect(delRes.id).toBe(createdIncomeId);

    // Xác nhận đã xóa thành công khỏi database
    await expect(api.getOtherIncomeDetailV3(createdIncomeId)).rejects.toThrow();
  });

  it("12. Xuất Excel, Tải mẫu import & Xem lịch sử thao tác (Audit Logs)", async () => {
    const exportRes = await api.exportOtherIncomesExcelV3({ month: "2026-08" });
    expect(exportRes).toBeDefined();
    expect(exportRes.fileName).toContain(".xlsx");

    const auditLogs = await api.getOtherIncomesAuditLogsV3();
    expect(auditLogs).toBeDefined();
    expect(Array.isArray(auditLogs.items)).toBe(true);
    expect(auditLogs.total).toBeGreaterThan(0);
  });
});
