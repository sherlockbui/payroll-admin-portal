import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { DependentsTab } from "@/components/tabs/dependents-tab";

export const metadata: Metadata = {
  title: "Người phụ thuộc | Payroll Admin Portal",
  description: "Quản trị danh sách người phụ thuộc, hồ sơ giảm trừ gia cảnh, xét duyệt và đồng bộ dữ liệu thuế TNCN",
};

export default function DependentsPage() {
  return (
    <AdminShell detailLabel="Người phụ thuộc">
      <DependentsTab />
    </AdminShell>
  );
}
