import { describe, expect, it } from "vitest";
import { api } from "@/lib/api";
import { readMockDatabase } from "@/lib/mock-db";

describe("Timesheet & Attendance Summary Module", () => {
  it("lấy danh sách bảng tổng hợp công theo kỳ và dự án", async () => {
    const response = await api.getTimesheets({
      projectId: "prj-jss",
      period: "2026-09",
    });

    expect(response).toBeDefined();
    expect(Array.isArray(response.items)).toBe(true);
    expect(response.items.length).toBeGreaterThan(0);
    expect(response.meta.totalEmployees).toBe(response.items.length);
    expect(response.meta.totalStandardHours).toBeGreaterThan(0);

    const firstEmp = response.items[0];
    expect(firstEmp.projectId).toBe("prj-jss");
    expect(firstEmp.period).toBe("2026-09");
    expect(firstEmp.dailyEntries.length).toBe(30);
  });

  it("lọc bảng tổng hợp công theo từ khóa tìm kiếm", async () => {
    const response = await api.getTimesheets({
      projectId: "prj-jss",
      period: "2026-09",
      search: "NGUYỄN VĂN AN",
    });

    expect(response.items.length).toBe(1);
    expect(response.items[0].employeeName).toBe("NGUYỄN VĂN AN");
    expect(response.items[0].employeeCode).toBe("T289-0124");
  });

  it("cập nhật bản ghi tổng hợp công thành công", async () => {
    const listResponse = await api.getTimesheets({
      projectId: "prj-jss",
      period: "2026-09",
    });
    const target = listResponse.items[0];

    const updated = await api.updateTimesheetSummary({
      ...target,
      totalOtNormal: 35.5,
      actualWorkdays: 25,
    });

    expect(updated.totalOtNormal).toBe(35.5);
    expect(updated.actualWorkdays).toBe(25);
  });

  it("nạp dữ liệu bóc tách OCR vào bảng tổng hợp công", async () => {
    const ocrSample = [
      {
        stt: 1,
        ngay_lam_viec: "22/09/2026",
        ma_nv: "T289-0124",
        ten_nv: "NGUYỄN VĂN AN",
        bo_phan: "RAU & TCN",
        vi_tri: "GHÉP HÀNG",
        gio_den_thuc_te: "07:50",
        gio_ve_thuc_te: "19:30",
        ghi_chu: "Tăng ca kho lạnh",
        status: "valid" as const,
      },
    ];

    const result = await api.importOcrTimesheet({
      projectId: "prj-jss",
      period: "2026-09",
      records: ocrSample,
    });

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1);
  });
});
