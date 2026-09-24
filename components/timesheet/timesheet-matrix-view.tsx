"use client";

import { Eye, Info } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import type { TimesheetSummaryItem } from "@/lib/types";

interface TimesheetMatrixViewProps {
  items: TimesheetSummaryItem[];
  onSelectEmployee: (item: TimesheetSummaryItem) => void;
}

export function TimesheetMatrixView({ items, onSelectEmployee }: TimesheetMatrixViewProps) {
  // Days of month 1..30
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  const getDayInfo = (day: number) => {
    const dateObj = new Date(2026, 8, day); // Month 8 is Sept
    const dayOfWeek = dateObj.getDay();
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;
    const labels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return { dayOfWeek: labels[dayOfWeek], isSunday, isSaturday };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border/50 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-foreground">Ký hiệu công:</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-5 h-5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-[10px]">8</span>
            <span>Đủ công 8h</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-6 h-5 rounded bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold flex items-center justify-center text-[10px]">8+2</span>
            <span>Công + Tăng ca</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-5 h-5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-[10px]">OT</span>
            <span>Tăng ca Chủ nhật</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-5 h-5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-[10px]">P</span>
            <span>Nghỉ phép</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-5 h-5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold flex items-center justify-center text-[10px]">KP</span>
            <span>Không lương</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold flex items-center justify-center text-[10px]">—</span>
            <span>Nghỉ ca / OFF</span>
          </span>
        </div>
        <div className="text-muted-foreground flex items-center gap-1">
          <Info className="w-3.5 h-3.5" />
          <span>Click vào tên nhân viên để xem & chỉnh sửa chi tiết từng ngày</span>
        </div>
      </div>

      <div className="data-table-wrap overflow-hidden border border-border rounded-lg shadow-sm">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur-sm border-b border-border font-medium text-muted-foreground">
              <tr>
                <th className="sticky left-0 z-30 bg-muted/95 py-2.5 px-3 min-w-[180px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Nhân viên
                </th>
                <th className="py-2.5 px-2 min-w-[90px] text-center">Tổng công</th>
                <th className="py-2.5 px-2 min-w-[80px] text-center">Tổng OT</th>
                {days.map((d) => {
                  const { dayOfWeek, isSunday, isSaturday } = getDayInfo(d);
                  return (
                    <th
                      key={d}
                      className={`py-2 px-1 text-center min-w-[34px] border-l border-border/40 ${
                        isSunday
                          ? "bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 font-bold"
                          : isSaturday
                          ? "bg-amber-50/30 dark:bg-amber-950/10 text-amber-700 font-semibold"
                          : ""
                      }`}
                    >
                      <div className="text-[11px] leading-tight">{d < 10 ? `0${d}` : d}</div>
                      <div className="text-[9px] opacity-75 font-normal">{dayOfWeek}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => {
                const entriesMap = new Map(
                  (item.dailyEntries || []).map((e) => [parseInt(e.date.slice(8), 10), e])
                );

                return (
                  <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                    {/* Fixed Employee Info Column */}
                    <td className="sticky left-0 z-10 bg-background hover:bg-muted/40 py-2 px-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <button
                        type="button"
                        onClick={() => onSelectEmployee(item)}
                        className="text-left group flex flex-col w-full"
                      >
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                          {item.employeeName}
                          <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {item.employeeCode} · {item.department}
                        </span>
                      </button>
                    </td>

                    {/* Summary Total Days & OT */}
                    <td className="py-2 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/20">
                      {item.actualWorkdays}d
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-sky-600 dark:text-sky-400 bg-sky-50/20">
                      {item.totalOtNormal + item.totalOtWeekend}h
                    </td>

                    {/* 30 Days Grid */}
                    {days.map((d) => {
                      const entry = entriesMap.get(d);
                      const { isSunday, isSaturday } = getDayInfo(d);

                      let cellContent = "—";
                      let cellClass = "text-muted-foreground/50 bg-transparent";

                      if (entry) {
                        if (entry.status === "leave_paid") {
                          cellContent = "P";
                          cellClass = "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 font-bold";
                        } else if (entry.status === "leave_unpaid") {
                          cellContent = "KP";
                          cellClass = "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 font-bold";
                        } else if (entry.otWeekendHours > 0) {
                          cellContent = `${entry.otWeekendHours}OT`;
                          cellClass = "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200 font-bold";
                        } else if (entry.standardHours > 0 && entry.otNormalHours > 0) {
                          cellContent = `${entry.standardHours}+${entry.otNormalHours}`;
                          cellClass = "bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200 font-bold";
                        } else if (entry.standardHours > 0) {
                          cellContent = `${entry.standardHours}`;
                          cellClass = "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium";
                        }
                      }

                      return (
                        <td
                          key={d}
                          className={`py-1.5 px-0.5 text-center border-l border-border/30 text-[10px] ${
                            isSunday ? "bg-slate-50/40 dark:bg-slate-900/30" : isSaturday ? "bg-amber-50/10" : ""
                          }`}
                        >
                          <div
                            title={
                              entry
                                ? `Ngày ${d}/09: ${entry.checkIn || "—"} - ${entry.checkOut || "—"} (${entry.notes || "Bình thường"})`
                                : `Ngày ${d}/09`
                            }
                            className={`w-full py-1 rounded cursor-pointer transition-transform hover:scale-105 flex items-center justify-center ${cellClass}`}
                            onClick={() => onSelectEmployee(item)}
                          >
                            {cellContent}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
