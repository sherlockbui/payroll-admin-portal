import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { TimesheetPage } from "@/components/timesheet/timesheet-page";

export const metadata: Metadata = {
  title: "Tổng hợp công | Payroll Admin Portal",
  description: "Bảng chấm công tổng hợp theo dự án, bóc tách OCR từ phiếu scan chữ viết tay & đối soát giờ tăng ca",
};

export default function TimesheetRoute() {
  return (
    <AdminShell detailLabel="Bảng tổng hợp công">
      <TimesheetPage />
    </AdminShell>
  );
}
