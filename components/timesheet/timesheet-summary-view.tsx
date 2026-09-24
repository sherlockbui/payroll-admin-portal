"use client";

import { Check, Edit2, Eye, Lock, Unlock, X } from "lucide-react";
import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import type { TimesheetSummaryItem } from "@/lib/types";

interface TimesheetSummaryViewProps {
  items: TimesheetSummaryItem[];
  onSelectEmployee: (item: TimesheetSummaryItem) => void;
  onUpdateItem: (item: TimesheetSummaryItem) => void;
  isUpdating?: boolean;
}

export function TimesheetSummaryView({
  items,
  onSelectEmployee,
  onUpdateItem,
  isUpdating = false,
}: TimesheetSummaryViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    actualWorkdays: number;
    totalStandardHours: number;
    totalOtNormal: number;
    totalOtWeekend: number;
    paidLeaveDays: number;
    unpaidLeaveDays: number;
  }>({
    actualWorkdays: 0,
    totalStandardHours: 0,
    totalOtNormal: 0,
    totalOtWeekend: 0,
    paidLeaveDays: 0,
    unpaidLeaveDays: 0,
  });

  const handleStartEdit = (item: TimesheetSummaryItem) => {
    setEditingId(item.id);
    setEditForm({
      actualWorkdays: item.actualWorkdays,
      totalStandardHours: item.totalStandardHours,
      totalOtNormal: item.totalOtNormal,
      totalOtWeekend: item.totalOtWeekend,
      paidLeaveDays: item.paidLeaveDays,
      unpaidLeaveDays: item.unpaidLeaveDays,
    });
  };

  const handleSaveInline = (item: TimesheetSummaryItem) => {
    const updated: TimesheetSummaryItem = {
      ...item,
      actualWorkdays: Number(editForm.actualWorkdays) || 0,
      totalStandardHours: Number(editForm.totalStandardHours) || 0,
      totalOtNormal: Number(editForm.totalOtNormal) || 0,
      totalOtWeekend: Number(editForm.totalOtWeekend) || 0,
      paidLeaveDays: Number(editForm.paidLeaveDays) || 0,
      unpaidLeaveDays: Number(editForm.unpaidLeaveDays) || 0,
    };
    onUpdateItem(updated);
    setEditingId(null);
  };

  return (
    <div className="data-table-wrap overflow-hidden border border-border rounded-lg shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
          <thead className="bg-muted/80 text-muted-foreground border-b border-border font-semibold uppercase">
            <tr>
              <th className="py-3 px-3 w-12 text-center">STT</th>
              <th className="py-3 px-3">Mã NV</th>
              <th className="py-3 px-4 min-w-[180px]">Họ và tên</th>
              <th className="py-3 px-3">Bộ phận</th>
              <th className="py-3 px-3">Vị trí</th>
              <th className="py-3 px-2 text-right">Công TT</th>
              <th className="py-3 px-2 text-right">Giờ chuẩn</th>
              <th className="py-3 px-2 text-right">OT Thường</th>
              <th className="py-3 px-2 text-right">OT Cuối tuần</th>
              <th className="py-3 px-2 text-right">Nghỉ phép</th>
              <th className="py-3 px-2 text-right">Không lương</th>
              <th className="py-3 px-3 text-center">Trạng thái</th>
              <th className="py-3 px-3 text-center w-28">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item, index) => {
              const isEditing = editingId === item.id;
              const isLocked = item.status === "locked";

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-muted/40 transition-colors ${
                    isEditing ? "bg-amber-50/70 dark:bg-amber-950/30" : ""
                  }`}
                >
                  <td className="py-2.5 px-3 text-center text-muted-foreground font-mono font-medium">
                    {index + 1}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-medium text-foreground">
                    {item.employeeCode}
                  </td>
                  <td className="py-2.5 px-4">
                    <button
                      type="button"
                      onClick={() => onSelectEmployee(item)}
                      className="font-semibold text-foreground hover:text-primary transition-colors text-left"
                    >
                      {item.employeeName}
                    </button>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="inline-block px-2 py-0.5 rounded bg-muted/70 text-muted-foreground text-[11px]">
                      {item.department}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">{item.position}</td>

                  {isEditing ? (
                    <>
                      <td className="py-1 px-1 text-right">
                        <input
                          type="number"
                          step="0.5"
                          className="w-14 px-1 py-0.5 border rounded text-xs text-right bg-background"
                          value={editForm.actualWorkdays}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, actualWorkdays: Number(e.target.value) }))}
                        />
                      </td>
                      <td className="py-1 px-1 text-right">
                        <input
                          type="number"
                          step="0.5"
                          className="w-16 px-1 py-0.5 border rounded text-xs text-right bg-background font-medium text-emerald-600"
                          value={editForm.totalStandardHours}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, totalStandardHours: Number(e.target.value) }))}
                        />
                      </td>
                      <td className="py-1 px-1 text-right">
                        <input
                          type="number"
                          step="0.5"
                          className="w-14 px-1 py-0.5 border rounded text-xs text-right bg-background font-medium text-sky-600"
                          value={editForm.totalOtNormal}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, totalOtNormal: Number(e.target.value) }))}
                        />
                      </td>
                      <td className="py-1 px-1 text-right">
                        <input
                          type="number"
                          step="0.5"
                          className="w-14 px-1 py-0.5 border rounded text-xs text-right bg-background font-medium text-amber-600"
                          value={editForm.totalOtWeekend}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, totalOtWeekend: Number(e.target.value) }))}
                        />
                      </td>
                      <td className="py-1 px-1 text-right">
                        <input
                          type="number"
                          step="0.5"
                          className="w-12 px-1 py-0.5 border rounded text-xs text-right bg-background"
                          value={editForm.paidLeaveDays}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, paidLeaveDays: Number(e.target.value) }))}
                        />
                      </td>
                      <td className="py-1 px-1 text-right">
                        <input
                          type="number"
                          step="0.5"
                          className="w-12 px-1 py-0.5 border rounded text-xs text-right bg-background"
                          value={editForm.unpaidLeaveDays}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, unpaidLeaveDays: Number(e.target.value) }))}
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2.5 px-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {item.actualWorkdays} <span className="text-[10px] text-muted-foreground font-normal">/{item.standardWorkdays}</span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-medium">
                        {item.totalStandardHours}h
                      </td>
                      <td className="py-2.5 px-2 text-right font-medium text-sky-600 dark:text-sky-400">
                        {item.totalOtNormal > 0 ? `+${item.totalOtNormal}h` : "0"}
                      </td>
                      <td className="py-2.5 px-2 text-right font-medium text-purple-600 dark:text-purple-400">
                        {item.totalOtWeekend > 0 ? `+${item.totalOtWeekend}h` : "0"}
                      </td>
                      <td className="py-2.5 px-2 text-right text-muted-foreground">
                        {item.paidLeaveDays > 0 ? `${item.paidLeaveDays}d` : "—"}
                      </td>
                      <td className="py-2.5 px-2 text-right text-muted-foreground">
                        {item.unpaidLeaveDays > 0 ? `${item.unpaidLeaveDays}d` : "—"}
                      </td>
                    </>
                  )}

                  <td className="py-2.5 px-3 text-center">
                    {item.status === "locked" ? (
                      <Badge tone="neutral">
                        <Lock className="w-3 h-3 inline mr-1" />Đã khóa
                      </Badge>
                    ) : item.status === "verified" ? (
                      <Badge tone="success">Đã khớp</Badge>
                    ) : (
                      <Badge tone="warning">Bản nháp</Badge>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSaveInline(item)}
                          disabled={isUpdating}
                          className="p-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                          title="Lưu"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground"
                          title="Hủy"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onSelectEmployee(item)}
                          title="Xem chi tiết từng ngày"
                        >
                          <Eye className="w-4 h-4 text-primary" />
                        </Button>
                        {!isLocked && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleStartEdit(item)}
                            title="Sửa nhanh tổng số giờ"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
