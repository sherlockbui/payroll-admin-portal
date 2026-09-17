import { describe, expect, it } from "vitest";
import { api } from "@/lib/api";

describe("OpenAPI 3.0 Dependents (01-nguoi-phu-thuoc.yaml) Suite", () => {
  it("1. Lấy danh mục mối quan hệ (Master data relationships)", async () => {
    const relationships = await api.getDependentRelationshipsV3();
    expect(Array.isArray(relationships)).toBe(true);
    expect(relationships.length).toBeGreaterThanOrEqual(5);
    const codes = relationships.map((r) => r.code);
    expect(codes).toContain("CON_RUOT_NUOI");
    expect(codes).toContain("VO_CHONG");
    expect(codes).toContain("CHA_ME_DE");
  });

  it("2. Lấy danh mục loại tài liệu (Master data document types)", async () => {
    const docTypes = await api.getDependentDocumentTypesV3();
    expect(Array.isArray(docTypes)).toBe(true);
    expect(docTypes.length).toBeGreaterThanOrEqual(4);
    const codes = docTypes.map((d) => d.code);
    expect(codes).toContain("GIAY_KHAI_SINH");
    expect(codes).toContain("CCCD");
    expect(codes).toContain("DANG_KY_KET_HON");
  });

  it("3. Lấy tổng quan số liệu thống kê (Summary KPI)", async () => {
    const summary = await api.getDependentsSummaryV3();
    expect(summary).toBeDefined();
    expect(typeof summary.total).toBe("number");
    expect(Array.isArray(summary.counts)).toBe(true);
    const totalCount = summary.counts.find((c) => c.key === "TOTAL")?.count;
    expect(totalCount).toBe(summary.total);
  });

  it("4. Lấy danh sách NPT có phân trang và bộ lọc", async () => {
    const res = await api.getDependentsV3({ page: 1, pageSize: 5 });
    expect(res).toBeDefined();
    expect(Array.isArray(res.items)).toBe(true);
    expect(res.page).toBe(1);
    expect(res.pageSize).toBe(5);
    expect(res.total).toBeGreaterThan(0);
    expect(res.items[0]).toHaveProperty("fullName");
    expect(res.items[0]).toHaveProperty("employee");
    expect(res.items[0]).toHaveProperty("relationship");
    expect(res.items[0]).toHaveProperty("status");
  });

  it("5. Khai báo NPT mới, xem chi tiết, cập nhật và xóa", async () => {
    // A. Create
    const created = await api.createDependentV3({
      projectId: 1017,
      employeeCode: "NV-00124",
      fullName: "Nguyễn Kiểm Thử V3",
      dateOfBirth: "2021-05-15",
      identityNumber: "079221009999",
      taxCode: "8092210099",
      relationshipCode: "CON_RUOT_NUOI",
      effectiveFrom: "2026-08",
      documentType: "GIAY_KHAI_SINH",
    });

    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.fullName).toBe("Nguyễn Kiểm Thử V3");
    expect(created.status).toBe("PENDING");

    // B. Get Detail
    const detail = await api.getDependentDetailV3(created.id);
    expect(detail.id).toBe(created.id);
    expect(detail.identityNumber).toBe("079221009999");

    // C. Update
    const updated = await api.updateDependentV3(created.id, {
      fullName: "Nguyễn Kiểm Thử Đã Đổi Tên",
      taxCode: "8099999999",
    });
    expect(updated.fullName).toBe("Nguyễn Kiểm Thử Đã Đổi Tên");
    expect(updated.taxCode).toBe("8099999999");

    // D. Delete
    const deleteRes = await api.deleteDependentV3(created.id);
    expect(deleteRes.id).toBe(created.id);
  });

  it("6. Luồng phê duyệt (Confirm, Approve, Reject)", async () => {
    // Tạo 1 NPT để test workflow
    const dep = await api.createDependentV3({
      projectId: 1017,
      employeeCode: "NV-00124",
      fullName: "Workflow Tester",
      dateOfBirth: "2022-01-01",
      identityNumber: "079222008888",
      relationshipCode: "CON_RUOT_NUOI",
      effectiveFrom: "2026-08",
    });

    // A. Confirm
    const confirmed = await api.confirmDependentV3(dep.id);
    expect(confirmed.status).toBe("CONFIRMED");
    expect(confirmed.confirmedAt).toBeDefined();

    // B. Approve
    const approved = await api.approveDependentV3(dep.id);
    expect(approved.status).toBe("APPROVED");
    expect(approved.approvedAt).toBeDefined();

    // C. Reject
    const rejected = await api.rejectDependentV3(dep.id, "Giấy khai sinh không có dấu đỏ");
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.rejectionReason).toBe("Giấy khai sinh không có dấu đỏ");
  });

  it("7. Xác nhận hàng loạt (Bulk Confirm)", async () => {
    const dep1 = await api.createDependentV3({
      projectId: 1017,
      employeeCode: "NV-00124",
      fullName: "Bulk Test 1",
      dateOfBirth: "2022-01-01",
      identityNumber: "079222001111",
      relationshipCode: "CON_RUOT_NUOI",
      effectiveFrom: "2026-08",
    });
    const dep2 = await api.createDependentV3({
      projectId: 1017,
      employeeCode: "NV-00125",
      fullName: "Bulk Test 2",
      dateOfBirth: "2022-01-01",
      identityNumber: "079222002222",
      relationshipCode: "CON_RUOT_NUOI",
      effectiveFrom: "2026-08",
    });

    const bulkRes = await api.bulkConfirmDependentsV3([dep1.id, dep2.id]);
    expect(bulkRes.confirmedCount).toBe(2);

    const check1 = await api.getDependentDetailV3(dep1.id);
    const check2 = await api.getDependentDetailV3(dep2.id);
    expect(check1.status).toBe("CONFIRMED");
    expect(check2.status).toBe("CONFIRMED");
  });

  it("8. Quản lý tài liệu đính kèm (Documents API)", async () => {
    const docs = await api.getDependentDocumentsV3(101);
    expect(Array.isArray(docs)).toBe(true);

    const formData = new FormData();
    const fakeFile = new File(["test-content"], "BanSaoCCCD_Test.pdf", { type: "application/pdf" });
    formData.append("file", fakeFile);
    formData.append("documentType", "CCCD");

    const uploaded = await api.uploadDependentDocumentV3(101, formData);
    expect(uploaded.id).toBeDefined();
    expect(uploaded.dependentId).toBe(101);

    const deleteDocRes = await api.deleteDependentDocumentV3(101, uploaded.id);
    expect(deleteDocRes.documentId).toBe(uploaded.id);
  });

  it("9. Truy vấn nhật ký hoạt động (Audit Logs)", async () => {
    const logsRes = await api.getDependentAuditLogsV3();
    expect(logsRes).toBeDefined();
    expect(Array.isArray(logsRes.items)).toBe(true);
    expect(logsRes.items.length).toBeGreaterThan(0);
    expect(logsRes.items[0]).toHaveProperty("eventType");
    expect(logsRes.items[0]).toHaveProperty("occurredAt");
    expect(logsRes.items[0]).toHaveProperty("actor");
    expect(logsRes.items[0]).toHaveProperty("description");
  });
});
