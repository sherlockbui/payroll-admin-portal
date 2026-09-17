"use client";

import { useMemo } from "react";
import { Search } from "lucide-react";
import type { PayrollMatrix, PayrollMatrixColumn } from "@/lib/payroll-types";
import { formatCurrency } from "@/lib/utils";
import { UserAvatar } from "@/components/ui";

interface ColumnCategory {
  id: string;
  label: string;
  tone: string;
  isSticky?: boolean;
}

function getColumnCategory(col: PayrollMatrixColumn): ColumnCategory {
  if (col.key === "employeeCode" || col.key === "fullName") {
    return { id: "employee", label: "Thông tin nhân sự", tone: "section-employee", isSticky: true };
  }
  if (col.key === "bankAccountNumber" || col.key === "bankName") {
    return { id: "bank", label: "Tài khoản ngân hàng", tone: "section-bank" };
  }
  if (col.group === "DAILY_TIMESHEET") {
    return { id: "daily", label: "Bảng chấm công ngày", tone: "section-daily" };
  }
  if (col.group === "WORKDAYS") {
    return { id: "workdays", label: "Tổng hợp công & giờ", tone: "section-attendance" };
  }
  if (col.key === "grossSalary") {
    return { id: "gross", label: "Tổng thu nhập", tone: "section-income font-bold" };
  }
  if (col.key === "netSalary") {
    return { id: "net", label: "Thực lĩnh (Net)", tone: "section-income font-bold" };
  }
  if (col.group === "EARNINGS") {
    return { id: "earnings", label: "Thu nhập & Phụ cấp", tone: "section-income" };
  }
  if (col.group === "DEDUCTIONS") {
    return { id: "deductions", label: "Các khoản khấu trừ", tone: "section-deduction" };
  }
  return { id: col.group, label: col.group, tone: "section-attendance" };
}

export function PayrollFullTable({
  matrix,
  query,
  onQueryChange,
  canViewSensitive,
}: {
  matrix: PayrollMatrix;
  query: string;
  onQueryChange: (value: string) => void;
  canViewSensitive: boolean;
}) {
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const visibleRows = useMemo(() => {
    if (!normalizedQuery) return matrix.rows;
    return matrix.rows.filter((row) =>
      `${row.employeeCode || ""} ${row.fullName || ""}`.toLocaleLowerCase("vi").includes(normalizedQuery),
    );
  }, [matrix.rows, normalizedQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalEmployees = visibleRows.length;
    const totalGross = visibleRows.reduce((sum, r) => sum + (Number(r.grossSalary) || 0), 0);
    const totalNet = visibleRows.reduce((sum, r) => sum + (Number(r.netSalary) || 0), 0);
    const totalActualDays = visibleRows.reduce((sum, r) => sum + (Number(r.actualWorkdays) || 0), 0);
    const totalHours = visibleRows.reduce((sum, r) => sum + (Number(r.totalHours) || 0), 0);
    return { totalEmployees, totalGross, totalNet, totalActualDays, totalHours };
  }, [visibleRows]);

  // Build group headers for row 1
  const groupHeaders = useMemo(() => {
    const groups: Array<{
      id: string;
      label: string;
      tone: string;
      colSpan: number;
      isSticky?: boolean;
    }> = [];

    for (const col of matrix.columns) {
      const cat = getColumnCategory(col);
      const last = groups[groups.length - 1];
      if (last && last.id === cat.id) {
        last.colSpan += 1;
      } else {
        groups.push({
          id: cat.id,
          label: cat.label,
          tone: cat.tone,
          colSpan: 1,
          isSticky: cat.isSticky,
        });
      }
    }
    return groups;
  }, [matrix.columns]);

  // Helper for day info
  const getDayInfo = (col: PayrollMatrixColumn) => {
    const parts = col.title.split("/");
    const dayNum = parts[0] || col.key.replace("day_", "");
    const monthNum = parts[1] ? Number(parts[1]) : (matrix.month || 7);
    const yearNum = matrix.year || 2026;
    const dateObj = new Date(yearNum, monthNum - 1, Number(dayNum));
    const dayOfWeek = dateObj.getDay();
    const weekdayStr = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][dayOfWeek];
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    return { dayNum, weekdayStr, isWeekend, fullDate: `${col.title}/${yearNum}` };
  };

  const maskValue = (value: any, visible: boolean, keep = 4) => {
    if (value == null || value === "") return "—";
    const str = String(value);
    if (visible || str === "—") return str;
    return `${"•".repeat(Math.max(4, str.length - keep))}${str.slice(-keep)}`;
  };

  const formatCell = (val: any, col: PayrollMatrixColumn) => {
    if (val == null || val === "") return "—";
    if (col.dataType === "currency") {
      const num = Number(val);
      if (num === 0) return "0 ₫";
      return formatCurrency(num);
    }
    if (col.dataType === "number") {
      const num = Number(val);
      return num.toLocaleString("vi-VN");
    }
    return String(val);
  };

  return (
    <section className="payroll-detail-section payroll-full-section">
      {/* Top Header & Search */}
      <div className="payroll-section-toolbar">
        <div>
          <h2>Bảng lương chi tiết</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Phân nhóm cột trực quan: Nhân sự, Ngân hàng, Bảng công ngày, Tổng công, Thu nhập, Khấu trừ và Thực lĩnh.
          </p>
        </div>
        <label className="search-field payroll-line-search">
          <Search />
          <input 
            value={query} 
            onChange={(event) => onQueryChange(event.target.value)} 
            placeholder="Tìm mã hoặc tên nhân viên…" 
            aria-label="Tìm người lao động trong bảng lương" 
          />
        </label>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3 p-3 bg-muted/30 rounded-lg border border-border">
        <div>
          <span className="text-xs text-muted-foreground font-medium">Nhân sự hiển thị</span>
          <p className="text-base font-bold text-foreground">
            {stats.totalEmployees} <small className="text-xs font-normal text-muted">/ {matrix.rows.length} NLĐ</small>
          </p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground font-medium">Tổng ngày công TT</span>
          <p className="text-base font-bold text-sky-700 dark:text-sky-400">
            {stats.totalActualDays.toLocaleString("vi-VN")} công <small className="text-xs font-normal text-muted">({stats.totalHours.toLocaleString("vi-VN")}h)</small>
          </p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground font-medium">Tổng thu nhập (Gross)</span>
          <p className="text-base font-bold text-foreground">
            {formatCurrency(stats.totalGross)}
          </p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground font-medium">Tổng thực lĩnh (Net)</span>
          <p className="text-base font-extrabold text-teal-700 dark:text-teal-400">
            {formatCurrency(stats.totalNet)}
          </p>
        </div>
      </div>

      {/* Meta legend bar */}
      <div className="payroll-full-table-meta flex flex-wrap items-center justify-between gap-3 mb-2 px-1">
        <div className="attendance-code-legend flex items-center gap-3 text-xs">
          <span><i className="work" /> 8h chuẩn</span>
          <span><i className="overtime" /> &gt;8h tăng ca</span>
          <span><i className="off" /> 0h / Nghỉ</span>
        </div>
        <div className="payroll-sensitive-note text-xs text-muted-foreground">
          {canViewSensitive
            ? "Dữ liệu định danh & số tài khoản hiển thị đầy đủ theo quyền Kế toán."
            : "Số tài khoản ngân hàng đang được bảo mật theo vai trò hiện tại."}
        </div>
      </div>

      {visibleRows.length === 0 ? (
        <div className="payroll-empty compact">
          <Search />
          <h3>Không tìm thấy người lao động</h3>
          <p>Thử thay đổi từ khóa tìm kiếm trong bảng lương.</p>
        </div>
      ) : (
        <div className="payroll-table-wrap payroll-lines-table-wrap payroll-full-table-wrap overflow-x-auto">
          <table className="payroll-table payroll-lines-table payroll-unified-table w-full" style={{ minWidth: "max-content" }}>
            <thead>
              {/* TIER 1: Group / Section Headers */}
              <tr className="payroll-unified-section-row">
                {groupHeaders.map((group, idx) => {
                  const isStickyGroup = group.isSticky;
                  return (
                    <th
                      key={`${group.id}-${idx}`}
                      colSpan={group.colSpan}
                      className={`payroll-unified-section ${group.tone} ${
                        isStickyGroup ? "sticky left-0 z-40 shadow-[1px_0_0_0_var(--border)]" : ""
                      }`}
                    >
                      {group.label}
                    </th>
                  );
                })}
              </tr>

              {/* TIER 2: Detailed Column Titles */}
              <tr className="payroll-unified-column-row">
                {matrix.columns.map((col) => {
                  const isEmpCode = col.key === "employeeCode";
                  const isFullName = col.key === "fullName";
                  const isDaily = col.group === "DAILY_TIMESHEET";

                  if (isEmpCode) {
                    return (
                      <th
                        key={col.key}
                        className="sticky left-0 z-35 top-[38px] bg-slate-100 dark:bg-slate-800 border-r border-border text-center font-bold text-xs min-w-[110px] w-[110px]"
                        title={col.title}
                      >
                        {col.title}
                      </th>
                    );
                  }

                  if (isFullName) {
                    return (
                      <th
                        key={col.key}
                        className="sticky left-[110px] z-35 top-[38px] bg-slate-100 dark:bg-slate-800 border-r border-border shadow-[2px_0_4px_rgba(0,0,0,0.06)] text-left font-bold text-xs min-w-[210px] w-[210px] pl-3"
                        title={col.title}
                      >
                        {col.title}
                      </th>
                    );
                  }

                  if (isDaily) {
                    const { dayNum, weekdayStr, isWeekend, fullDate } = getDayInfo(col);
                    return (
                      <th
                        key={col.key}
                        className={`payroll-day-col ${isWeekend ? "weekend" : ""}`}
                        title={`${fullDate} (${weekdayStr})`}
                      >
                        <span>{dayNum}</span>
                        <small>{weekdayStr}</small>
                      </th>
                    );
                  }

                  const isRightAlign = col.dataType === "currency" || col.dataType === "number";
                  const isGross = col.key === "grossSalary";
                  const isNet = col.key === "netSalary";

                  return (
                    <th
                      key={col.key}
                      className={`whitespace-nowrap px-3 py-2 text-xs font-semibold ${
                        isRightAlign ? "text-right" : "text-left"
                      } ${isGross ? "bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold" : ""} ${
                        isNet ? "bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-extrabold" : ""
                      }`}
                      title={col.title}
                    >
                      {col.title}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {visibleRows.map((row, idx) => (
                <tr key={row.employeeCode || idx} className="hover:bg-muted/30 transition-colors">
                  {matrix.columns.map((col) => {
                    let val = row[col.key];
                    const isEmpCode = col.key === "employeeCode";
                    const isFullName = col.key === "fullName";
                    const isBankAcc = col.key === "bankAccountNumber";
                    const isDaily = col.group === "DAILY_TIMESHEET";
                    const isGross = col.key === "grossSalary";
                    const isNet = col.key === "netSalary";
                    const isDeduction = col.group === "DEDUCTIONS";

                    if (isEmpCode) {
                      return (
                        <td
                          key={col.key}
                          className="sticky left-0 z-20 bg-card border-r border-border text-center font-mono font-bold text-xs text-primary min-w-[110px] w-[110px]"
                        >
                          {val}
                        </td>
                      );
                    }

                    if (isFullName) {
                      return (
                        <td
                          key={col.key}
                          className="sticky left-[110px] z-20 bg-card border-r border-border shadow-[2px_0_4px_rgba(0,0,0,0.06)] min-w-[210px] w-[210px] pl-3"
                        >
                          <div className="flex items-center gap-2">
                            <UserAvatar name={String(val || "")} size="sm" />
                            <span className="font-semibold text-foreground text-xs whitespace-nowrap">
                              {val}
                            </span>
                          </div>
                        </td>
                      );
                    }

                    if (isBankAcc) {
                      return (
                        <td key={col.key} className="text-center font-mono text-xs px-3 py-2 border-b">
                          {maskValue(val, canViewSensitive)}
                        </td>
                      );
                    }

                    if (isDaily) {
                      const hours = Number(val) || 0;
                      const statusClass = hours === 0 ? "status-off" : hours > 8 ? "status-overtime" : "status-work";
                      return (
                        <td
                          key={col.key}
                          className={`payroll-full-day-cell ${statusClass}`}
                          title={`${col.title}: ${hours} giờ công`}
                        >
                          <strong>{hours === 0 ? "—" : hours}</strong>
                          {hours > 8 && <small>+{hours - 8}h</small>}
                        </td>
                      );
                    }

                    return (
                      <td
                        key={col.key}
                        className={`whitespace-nowrap px-3 py-2 border-b text-xs ${
                          col.dataType === "currency" || col.dataType === "number" ? "text-right font-mono" : "text-left"
                        } ${isGross ? "font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50" : ""} ${
                          isNet ? "font-extrabold text-teal-800 dark:text-teal-300 bg-teal-50/70" : ""
                        } ${isDeduction && Number(val) > 0 ? "text-amber-800 dark:text-amber-300" : ""}`}
                      >
                        {formatCell(val, col)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>

            <tfoot>
              <tr className="bg-muted/70 font-semibold border-t-2 border-border">
                {matrix.columns.map((col) => {
                  if (col.key === "employeeCode") {
                    return (
                      <td
                        key={col.key}
                        className="sticky left-0 z-20 bg-muted/95 border-r border-border text-center font-bold text-xs min-w-[110px] w-[110px] py-2"
                      >
                        Tổng cộng
                      </td>
                    );
                  }

                  if (col.key === "fullName") {
                    return (
                      <td
                        key={col.key}
                        className="sticky left-[110px] z-20 bg-muted/95 border-r border-border shadow-[2px_0_4px_rgba(0,0,0,0.06)] text-left font-bold text-xs min-w-[210px] w-[210px] pl-3 py-2 text-muted-foreground"
                      >
                        {visibleRows.length} nhân sự
                      </td>
                    );
                  }

                  if (col.group === "DAILY_TIMESHEET") {
                    const totalDayHours = visibleRows.reduce((sum, r) => sum + (Number(r[col.key]) || 0), 0);
                    return (
                      <td key={col.key} className="payroll-full-day-cell text-center py-2">
                        <strong className="text-xs">{totalDayHours > 0 ? totalDayHours : "—"}</strong>
                      </td>
                    );
                  }

                  if (col.dataType === "currency") {
                    const total = visibleRows.reduce((sum, r) => sum + (Number(r[col.key]) || 0), 0);
                    const isGross = col.key === "grossSalary";
                    const isNet = col.key === "netSalary";
                    return (
                      <td
                        key={col.key}
                        className={`px-3 py-2 text-right font-mono text-xs ${
                          isNet
                            ? "font-extrabold text-teal-800 dark:text-teal-300 bg-teal-100/70"
                            : isGross
                            ? "font-bold text-slate-900 dark:text-slate-100 bg-slate-200/50"
                            : ""
                        }`}
                      >
                        {formatCurrency(total)}
                      </td>
                    );
                  }

                  if (col.dataType === "number") {
                    const total = visibleRows.reduce((sum, r) => sum + (Number(r[col.key]) || 0), 0);
                    return (
                      <td key={col.key} className="px-3 py-2 text-right font-mono text-xs">
                        {total.toLocaleString("vi-VN")}
                      </td>
                    );
                  }

                  return <td key={col.key} className="px-3 py-2 text-center text-xs text-muted">—</td>;
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="payroll-full-table-footnote mt-3 text-xs text-muted-foreground">
        Bảng gồm {matrix.columns.length} cột dữ liệu được nhóm tự động theo cấu trúc Excel. Kéo ngang để xem toàn bộ bảng công, các khoản thu nhập và trích nộp.
      </p>
    </section>
  );
}
