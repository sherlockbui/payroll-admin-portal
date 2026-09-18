"use client";

import { useEffect, useMemo, useRef } from "react";
import { Check, RefreshCw, Search } from "lucide-react";
import type { PayrollMatrix, PayrollMatrixColumn } from "@/lib/payroll-types";
import { Button, TablePaginationFooter } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

interface ColumnCategory {
  id: string;
  label: string;
  tone: string;
}

function getColumnCategory(col: PayrollMatrixColumn): ColumnCategory {
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
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  isFetching,
  selectedEmployeeCodes,
  onSelectedEmployeeCodesChange,
  onCalculateSelected,
  isCalculating,
  canCalculate = true,
}: {
  matrix: PayrollMatrix;
  query: string;
  onQueryChange: (value: string) => void;
  canViewSensitive: boolean;
  page?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  isFetching?: boolean;
  selectedEmployeeCodes?: Set<string>;
  onSelectedEmployeeCodesChange?: (codes: Set<string>) => void;
  onCalculateSelected?: (codes: string[]) => void;
  isCalculating?: boolean;
  canCalculate?: boolean;
}) {
  const total = totalItems ?? matrix.total ?? matrix.totalRecords ?? (matrix.rows ? matrix.rows.length : 0);
  const currentPage = page ?? matrix.page ?? 1;
  const currentPageSize = pageSize ?? matrix.pageSize ?? 50;

  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const visibleRows = useMemo(() => {
    if (!onPageChange && normalizedQuery) {
      return (matrix.rows || []).filter((row) =>
        `${row.employeeCode || ""} ${row.fullName || ""}`.toLocaleLowerCase("vi").includes(normalizedQuery),
      );
    }
    return matrix.rows || [];
  }, [matrix.rows, normalizedQuery, onPageChange]);

  const selectedSet = selectedEmployeeCodes ?? useMemo(() => new Set<string>(), []);
  const canSelect = Boolean(onSelectedEmployeeCodesChange && canCalculate);

  const pageEmployeeCodes = useMemo(() => {
    return (visibleRows || [])
      .map((r) => r.employeeCode)
      .filter((code): code is string => Boolean(code));
  }, [visibleRows]);

  const isAllPageSelected =
    pageEmployeeCodes.length > 0 &&
    pageEmployeeCodes.every((code) => selectedSet.has(code));

  const isSomePageSelected =
    pageEmployeeCodes.some((code) => selectedSet.has(code)) && !isAllPageSelected;

  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomePageSelected;
    }
  }, [isSomePageSelected]);

  const toggleSelectAllPage = () => {
    if (!onSelectedEmployeeCodesChange) return;
    const next = new Set(selectedSet);
    if (isAllPageSelected) {
      pageEmployeeCodes.forEach((code) => next.delete(code));
    } else {
      pageEmployeeCodes.forEach((code) => next.add(code));
    }
    onSelectedEmployeeCodesChange(next);
  };

  const toggleSelectEmployee = (code: string) => {
    if (!onSelectedEmployeeCodesChange) return;
    const next = new Set(selectedSet);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    onSelectedEmployeeCodesChange(next);
  };

  const clearSelection = () => {
    if (onSelectedEmployeeCodesChange) {
      onSelectedEmployeeCodesChange(new Set());
    }
  };

  // Exclude employeeCode and fullName from dataColumns as they are merged into the sticky "Người lao động" column
  const dataColumns = useMemo(() => {
    return matrix.columns.filter((c) => c.key !== "employeeCode" && c.key !== "fullName");
  }, [matrix.columns]);

  // Build group headers for row 1
  const groupHeaders = useMemo(() => {
    const groups: Array<{
      id: string;
      label: string;
      tone: string;
      colSpan: number;
    }> = [];

    for (const col of dataColumns) {
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
        });
      }
    }
    return groups;
  }, [dataColumns]);

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
      <div className="payroll-section-toolbar">
        <div className="flex items-center gap-3">
          <h2>Bảng lương chi tiết</h2>
          {selectedSet.size > 0 && (
            <span className="selection-counter-tag">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Đã chọn <strong>{selectedSet.size}</strong> NLĐ</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedSet.size > 0 && onCalculateSelected && canCalculate && (
            <Button
              variant="primary"
              size="sm"
              disabled={isCalculating}
              onClick={() => onCalculateSelected(Array.from(selectedSet))}
              className="gap-1.5 h-9 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCalculating ? "spin" : ""}`} />
              {isCalculating ? "Đang tính..." : `Tính lại (${selectedSet.size} đã chọn)`}
            </Button>
          )}
          {selectedSet.size > 0 && onSelectedEmployeeCodesChange && (
            <Button
              variant="secondary"
              size="sm"
              onClick={clearSelection}
              className="h-9 text-xs"
            >
              Bỏ chọn
            </Button>
          )}
          <label className="search-field payroll-line-search">
            <Search />
            <input 
              value={query} 
              onChange={(event) => onQueryChange(event.target.value)} 
              placeholder="Tìm theo mã hoặc họ tên nhân viên…" 
              aria-label="Tìm người lao động trong bảng lương" 
            />
          </label>
        </div>
      </div>

      {visibleRows.length === 0 ? (
        <div className="payroll-empty compact">
          <Search />
          <h3>Không tìm thấy người lao động</h3>
          <p>Thử thay đổi từ khóa tìm kiếm trong bảng lương.</p>
        </div>
      ) : (
        <>
          <div className="payroll-table-wrap payroll-lines-table-wrap payroll-full-table-wrap overflow-x-auto">
          <table className="payroll-table payroll-lines-table payroll-unified-table w-full" style={{ minWidth: "max-content" }}>
            <thead>
              {/* TIER 1: Group / Section Headers */}
              <tr className="payroll-unified-section-row">
                <th className="payroll-line-employee-sticky" rowSpan={2}>
                  <div className="flex items-center gap-2.5 px-1">
                    {canSelect && (
                      <input
                        ref={headerCheckboxRef}
                        type="checkbox"
                        className="rounded accent-teal-600 cursor-pointer w-4 h-4 shrink-0"
                        checked={isAllPageSelected}
                        onChange={toggleSelectAllPage}
                        title="Chọn tất cả người lao động trên trang này"
                      />
                    )}
                    <span>Người lao động</span>
                  </div>
                </th>
                {groupHeaders.map((group, idx) => (
                  <th
                    key={`${group.id}-${idx}`}
                    colSpan={group.colSpan}
                    className={`payroll-unified-section ${group.tone}`}
                  >
                    {group.label}
                  </th>
                ))}
              </tr>

              {/* TIER 2: Detailed Column Titles */}
              <tr className="payroll-unified-column-row">
                {dataColumns.map((col) => {
                  const isDaily = col.group === "DAILY_TIMESHEET";

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
              {visibleRows.map((row, idx) => {
                const isSelected = row.employeeCode ? selectedSet.has(row.employeeCode) : false;
                return (
                  <tr
                    key={row.employeeCode || idx}
                    className={`hover:bg-muted/30 transition-colors ${isSelected ? "is-selected bg-teal-50/50 dark:bg-teal-950/30" : ""}`}
                  >
                    {/* Sticky combined employee column without avatar */}
                    <td className={`payroll-line-employee-sticky ${isSelected ? "!bg-teal-50/90 dark:!bg-slate-900" : ""}`}>
                      <div className="line-employee flex items-center gap-2.5 px-1">
                        {canSelect && row.employeeCode && (
                          <input
                            type="checkbox"
                            className="rounded accent-teal-600 cursor-pointer w-4 h-4 shrink-0"
                            checked={isSelected}
                            onChange={() => toggleSelectEmployee(row.employeeCode)}
                            onClick={(e) => e.stopPropagation()}
                            title={`Chọn ${row.fullName || row.employeeCode}`}
                          />
                        )}
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <strong className="truncate block" title={row.fullName}>{row.fullName || "—"}</strong>
                          <small className="block font-mono text-xs">{row.employeeCode || "—"}</small>
                        </div>
                      </div>
                    </td>

                    {dataColumns.map((col) => {
                      const val = row[col.key];
                      const isBankAcc = col.key === "bankAccountNumber";
                      const isDaily = col.group === "DAILY_TIMESHEET";
                      const isGross = col.key === "grossSalary";
                      const isNet = col.key === "netSalary";
                      const isDeduction = col.group === "DEDUCTIONS";

                      if (isBankAcc) {
                        return (
                          <td key={col.key} className="text-center font-mono text-xs px-3 py-2 border-b">
                            {maskValue(val, canViewSensitive)}
                          </td>
                        );
                      }

                      if (isDaily) {
                        const hours = Number(val);
                        return (
                          <td
                            key={col.key}
                            className="payroll-full-day-cell text-center text-xs"
                          >
                            {val == null || val === "" || hours === 0 ? "—" : hours}
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
                );
              })}
            </tbody>

            <tfoot>
              <tr className="bg-muted/70 font-semibold border-t-2 border-border">
                {/* Sticky employee total footer cell */}
                <td className="payroll-line-employee-sticky">
                  <strong>Tổng cộng</strong>
                  <small>{visibleRows.length} NLĐ {selectedSet.size > 0 ? `· (${selectedSet.size} đã chọn)` : ""}</small>
                </td>

                {dataColumns.map((col) => {
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
        {onPageChange && (
          <TablePaginationFooter
            totalItems={total}
            selectedCount={selectedSet.size}
            currentPage={currentPage}
            pageSize={currentPageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        )}
      </>
    )}
    </section>
  );
}
