import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { InsuranceTab } from "@/components/tabs/insurance-tab";

export const metadata: Metadata = {
  title: "Bảo hiểm xã hội | Payroll Admin Portal",
  description: "Quản trị sổ BHXH, biến động D02-LT, đối soát cơ quan BHXH và trích đóng bảo hiểm",
};

export default function InsurancePage() {
  return (
    <AdminShell detailLabel="Bảo hiểm xã hội">
      <InsuranceTab />
    </AdminShell>
  );
}
