import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { BankAccountsTab } from "@/components/tabs/bank-accounts-tab";

export const metadata: Metadata = {
  title: "Tài khoản ngân hàng | Payroll Admin Portal",
  description: "Quản trị tài khoản ngân hàng chi trả lương nhân viên, đồng bộ CCCD và lịch sử thay đổi tài khoản",
};

export default function BankAccountsPage() {
  return (
    <AdminShell detailLabel="Tài khoản ngân hàng">
      <BankAccountsTab />
    </AdminShell>
  );
}

