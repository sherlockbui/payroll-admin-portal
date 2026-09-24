import * as XLSX from "xlsx";
import type { TimesheetSummaryItem, TimesheetOcrParsedItem } from "@/lib/types";

export function exportTimesheetSummaryToExcel(
  items: TimesheetSummaryItem[],
  projectName: string,
  period: string
) {
  const data = items.map((item, index) => ({
    STT: index + 1,
    "Mã nhân viên": item.employeeCode,
    "Họ và tên": item.employeeName,
    "Bộ phận": item.department,
    "Vị trí": item.position,
    "Công chuẩn": item.standardWorkdays,
    "Công thực tế": item.actualWorkdays,
    "Tổng giờ chuẩn": item.totalStandardHours,
    "Tăng ca ngày thường (h)": item.totalOtNormal,
    "Tăng ca cuối tuần (h)": item.totalOtWeekend,
    "Tăng ca ngày lễ (h)": item.totalOtHoliday,
    "Giờ làm đêm (h)": item.totalNightHours,
    "Nghỉ phép (ngày)": item.paidLeaveDays,
    "Nghỉ không lương (ngày)": item.unpaidLeaveDays,
    "Đi trễ / Về sớm (lần)": item.lateEarlyCount,
    "Trạng thái": item.status === "locked" ? "Đã khóa" : item.status === "verified" ? "Đã xác nhận" : "Bản nháp",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-fit column widths
  const colWidths = [
    { wch: 6 },  // STT
    { wch: 15 }, // Mã NV
    { wch: 25 }, // Họ tên
    { wch: 18 }, // Bộ phận
    { wch: 18 }, // Vị trí
    { wch: 12 }, // Công chuẩn
    { wch: 13 }, // Công thực tế
    { wch: 15 }, // Tổng giờ chuẩn
    { wch: 22 }, // OT thường
    { wch: 22 }, // OT cuối tuần
    { wch: 20 }, // OT ngày lễ
    { wch: 18 }, // Giờ đêm
    { wch: 16 }, // Phép
    { wch: 22 }, // Không lương
    { wch: 20 }, // Đi trễ
    { wch: 15 }, // Trạng thái
  ];
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `TongHopCong_${period}`);

  const cleanProject = projectName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `Bang_Tong_Hop_Cong_${cleanProject}_${period}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function exportOcrResultsToExcel(
  records: TimesheetOcrParsedItem[],
  fileNameSuffix = "OCR_Trich_Xuat"
) {
  const data = records.map((rec, index) => ({
    STT: rec.stt ?? index + 1,
    "Ngày làm việc": rec.ngay_lam_viec,
    "Mã NV": rec.ma_nv,
    "Tên nhân viên": rec.ten_nv,
    "Bộ phận": rec.bo_phan || "",
    "Vị trí": rec.vi_tri || "",
    "Giờ đến thực tế": rec.gio_den_thuc_te || "",
    "Giờ về thực tế": rec.gio_ve_thuc_te || "",
    "Ghi chú": rec.ghi_chu || "",
    "Trạng thái": rec.status === "valid" ? "Hợp lệ" : rec.status === "warning" ? "Cần kiểm tra" : "Lỗi",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet["!cols"] = [
    { wch: 6 },  // STT
    { wch: 15 }, // Ngày
    { wch: 15 }, // Mã NV
    { wch: 25 }, // Tên NV
    { wch: 18 }, // Bộ phận
    { wch: 18 }, // Vị trí
    { wch: 16 }, // Giờ đến
    { wch: 16 }, // Giờ về
    { wch: 30 }, // Ghi chú
    { wch: 14 }, // Trạng thái
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "BangChamCong_OCR");
  XLSX.writeFile(workbook, `Bang_Cham_Cong_${fileNameSuffix}_${Date.now()}.xlsx`);
}
