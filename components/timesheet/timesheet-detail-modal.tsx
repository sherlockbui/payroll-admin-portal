"use client";

import { Check, Clock, Edit2, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Modal } from "@/components/ui";
import type { TimesheetDailyEntry, TimesheetSummaryItem } from "@/lib/types";

interface TimesheetDetailModalProps {
  item: TimesheetSummaryItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (updatedItem: TimesheetSummaryItem) => void;
  isSaving?: boolean;
}

export function TimesheetDetailModal({
  item,
  open,
  onClose,
  onSave,
  isSaving = false,
}: TimesheetDetailModalProps) {
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entries, setEntries] = useState<TimesheetDailyEntry[]>([]);
  const [editForm, setEditForm] = useState<{
    checkIn: string;
    checkOut: string;
    standardHours: number;
    otNormalHours: number;
    otWeekendHours: number;
    nightHours: number;
    status: TimesheetDailyEntry["status"];
    notes: string;
  }>({
    checkIn: "",
    checkOut: "",
    standardHours: 8,
    otNormalHours: 0,
    otWeekendHours: 0,
    nightHours: 0,
    status: "present",
    notes: "",
  });

  // Sync state when modal opens
  const activeItem = item;
  if (open && activeItem && entries.length === 0 && activeItem.dailyEntries) {
    setEntries(structuredClone(activeItem.dailyEntries));
  }

  const handleStartEdit = (entry: TimesheetDailyEntry) => {
    setEditingEntryId(entry.id);
    setEditForm({
      checkIn: entry.checkIn || "08:00",
      checkOut: entry.checkOut || "17:00",
      standardHours: entry.standardHours,
      otNormalHours: entry.otNormalHours,
      otWeekendHours: entry.otWeekendHours,
      nightHours: entry.nightHours,
      status: entry.status,
      notes: entry.notes || "",
    });
  };

  const handleSaveEntry = (entryId: string) => {
    const updatedEntries = entries.map((e) => {
      if (e.id === entryId) {
        return {
          ...e,
          checkIn: editForm.checkIn,
          checkOut: editForm.checkOut,
          standardHours: Number(editForm.standardHours) || 0,
          otNormalHours: Number(editForm.otNormalHours) || 0,
          otWeekendHours: Number(editForm.otWeekendHours) || 0,
          nightHours: Number(editForm.nightHours) || 0,
          status: editForm.status,
          notes: editForm.notes || undefined,
        };
      }
      return e;
    });

    setEntries(updatedEntries);
    setEditingEntryId(null);
  };

  const handleFinalSave = () => {
    if (!activeItem) return;
    const stdHours = entries.reduce((s, e) => s + e.standardHours, 0);
    const otNorm = entries.reduce((s, e) => s + e.otNormalHours, 0);
    const otWk = entries.reduce((s, e) => s + e.otWeekendHours, 0);
    const night = entries.reduce((s, e) => s + e.nightHours, 0);
    const paidLeave = entries.filter((e) => e.status === "leave_paid").length;
    const unpaidLeave = entries.filter((e) => e.status === "leave_unpaid").length;
    const actualWorkdays = entries.filter(
      (e) => (e.standardHours > 0 || e.otWeekendHours > 0) && e.status !== "leave_paid"
    ).length;

    const updated: TimesheetSummaryItem = {
      ...activeItem,
      totalStandardHours: stdHours,
      totalOtNormal: otNorm,
      totalOtWeekend: otWk,
      totalNightHours: night,
      paidLeaveDays: paidLeave,
      unpaidLeaveDays: unpaidLeave,
      actualWorkdays,
      dailyEntries: entries,
    };

    onSave(updated);
  };

  const handleModalClose = () => {
    setEntries([]);
    setEditingEntryId(null);
    onClose();
  };

  if (!activeItem) return null;

  return (
    <Modal
      open={open}
      onOpenChange={(isOpen) => !isOpen && handleModalClose()}
      title={`Chi tiết chấm công tháng: ${activeItem.employeeName}`}
      description={`${activeItem.employeeCode} · ${activeItem.department} · Vị trí: ${activeItem.position} · Dự án: ${activeItem.projectName}`}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-muted">
            Tổng giờ chuẩn: <strong>{entries.reduce((s, e) => s + e.standardHours, 0)}h</strong> · OT thường:{" "}
            <strong>{entries.reduce((s, e) => s + e.otNormalHours, 0)}h</strong> · OT cuối tuần:{" "}
            <strong>{entries.reduce((s, e) => s + e.otWeekendHours, 0)}h</strong>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleModalClose}>
              Đóng
            </Button>
            <Button variant="primary" disabled={isSaving} onClick={handleFinalSave}>
              {isSaving ? "Đang lưu..." : "Lưu bảng công"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/40 rounded-lg border border-border/50 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Clock className="w-4 h-4 text-primary" />
            <span>Kỳ công: {activeItem.period}</span>
          </div>
          <span className="text-muted-foreground/40">|</span>
          <span>Công chuẩn: <strong>{activeItem.standardWorkdays} ngày</strong></span>
          <span className="text-muted-foreground/40">|</span>
          <span>Công thực tế: <strong className="text-emerald-600">{activeItem.actualWorkdays} ngày</strong></span>
          <span className="text-muted-foreground/40">|</span>
          <span>Nghỉ phép: <strong>{activeItem.paidLeaveDays} ngày</strong></span>
          <span className="text-muted-foreground/40">|</span>
          <span>Đi trễ/sớm: <strong className={activeItem.lateEarlyCount > 0 ? "text-amber-600" : ""}>{activeItem.lateEarlyCount} lần</strong></span>
        </div>

        <div className="max-h-[480px] overflow-y-auto border border-border rounded-lg">
          <table className="w-full text-xs text-left">
            <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm border-b border-border text-muted-foreground uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-3">Ngày</th>
                <th className="py-2.5 px-2">Thứ</th>
                <th className="py-2.5 px-2">Ca</th>
                <th className="py-2.5 px-3">Giờ vào</th>
                <th className="py-2.5 px-3">Giờ ra</th>
                <th className="py-2.5 px-2 text-right">Giờ chuẩn</th>
                <th className="py-2.5 px-2 text-right">OT Thường</th>
                <th className="py-2.5 px-2 text-right">OT Tuần</th>
                <th className="py-2.5 px-3">Trạng thái</th>
                <th className="py-2.5 px-3">Ghi chú</th>
                <th className="py-2.5 px-2 text-center">Sửa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => {
                const isEditing = editingEntryId === entry.id;
                const isSunday = entry.dayOfWeek === "CN";
                const isSaturday = entry.dayOfWeek === "T7";

                return (
                  <tr
                    key={entry.id}
                    className={`hover:bg-muted/30 transition-colors ${
                      isSunday
                        ? "bg-slate-50/50 dark:bg-slate-900/30 text-muted-foreground"
                        : isSaturday
                        ? "bg-amber-50/20 dark:bg-amber-950/10"
                        : ""
                    } ${isEditing ? "bg-amber-50/80 dark:bg-amber-950/40" : ""}`}
                  >
                    <td className="py-2 px-3 font-mono font-medium">{entry.date.slice(8)}/{entry.date.slice(5, 7)}</td>
                    <td className="py-2 px-2">
                      <span className={`font-medium ${isSunday ? "text-rose-600 dark:text-rose-400" : isSaturday ? "text-amber-600" : ""}`}>
                        {entry.dayOfWeek}
                      </span>
                    </td>
                    <td className="py-2 px-2 font-mono text-[11px] text-muted-foreground">{entry.shiftCode}</td>

                    {isEditing ? (
                      <>
                        <td className="py-1 px-2">
                          <input
                            type="time"
                            className="w-20 px-1 py-0.5 border rounded text-xs bg-background"
                            value={editForm.checkIn}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, checkIn: e.target.value }))}
                          />
                        </td>
                        <td className="py-1 px-2">
                          <input
                            type="time"
                            className="w-20 px-1 py-0.5 border rounded text-xs bg-background"
                            value={editForm.checkOut}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, checkOut: e.target.value }))}
                          />
                        </td>
                        <td className="py-1 px-2 text-right">
                          <input
                            type="number"
                            step="0.5"
                            className="w-14 px-1 py-0.5 border rounded text-xs text-right bg-background"
                            value={editForm.standardHours}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, standardHours: Number(e.target.value) }))}
                          />
                        </td>
                        <td className="py-1 px-2 text-right">
                          <input
                            type="number"
                            step="0.5"
                            className="w-14 px-1 py-0.5 border rounded text-xs text-right bg-background"
                            value={editForm.otNormalHours}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, otNormalHours: Number(e.target.value) }))}
                          />
                        </td>
                        <td className="py-1 px-2 text-right">
                          <input
                            type="number"
                            step="0.5"
                            className="w-14 px-1 py-0.5 border rounded text-xs text-right bg-background"
                            value={editForm.otWeekendHours}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, otWeekendHours: Number(e.target.value) }))}
                          />
                        </td>
                        <td className="py-1 px-2">
                          <select
                            className="px-1 py-0.5 border rounded text-xs bg-background"
                            value={editForm.status}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value as any }))}
                          >
                            <option value="present">Đi làm</option>
                            <option value="late">Đi trễ</option>
                            <option value="early_leave">Về sớm</option>
                            <option value="leave_paid">Nghỉ phép</option>
                            <option value="leave_unpaid">Nghỉ không lương</option>
                            <option value="absent">Vắng mặt</option>
                          </select>
                        </td>
                        <td className="py-1 px-2">
                          <input
                            type="text"
                            placeholder="Ghi chú..."
                            className="w-full px-1.5 py-0.5 border rounded text-xs bg-background"
                            value={editForm.notes}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                          />
                        </td>
                        <td className="py-1 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSaveEntry(entry.id)}
                              className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                              title="Lưu dòng này"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingEntryId(null)}
                              className="p-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground"
                              title="Hủy"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 px-3 font-mono">{entry.checkIn || "—"}</td>
                        <td className="py-2 px-3 font-mono">{entry.checkOut || "—"}</td>
                        <td className="py-2 px-2 text-right font-medium">{entry.standardHours > 0 ? `${entry.standardHours}h` : "—"}</td>
                        <td className="py-2 px-2 text-right font-medium text-sky-600 dark:text-sky-400">
                          {entry.otNormalHours > 0 ? `+${entry.otNormalHours}h` : "—"}
                        </td>
                        <td className="py-2 px-2 text-right font-medium text-amber-600 dark:text-amber-400">
                          {entry.otWeekendHours > 0 ? `+${entry.otWeekendHours}h` : "—"}
                        </td>
                        <td className="py-2 px-3">
                          {entry.status === "leave_paid" ? (
                            <Badge tone="info">Nghỉ phép (P)</Badge>
                          ) : entry.status === "leave_unpaid" ? (
                            <Badge tone="neutral">Không lương (KP)</Badge>
                          ) : entry.status === "late" ? (
                            <Badge tone="warning">Đi trễ</Badge>
                          ) : entry.status === "early_leave" ? (
                            <Badge tone="warning">Về sớm</Badge>
                          ) : entry.status === "absent" ? (
                            <Badge tone="danger">Vắng</Badge>
                          ) : entry.otWeekendHours > 0 ? (
                            <Badge tone="info">Tăng ca CN</Badge>
                          ) : entry.standardHours > 0 ? (
                            <Badge tone="success">Đủ công</Badge>
                          ) : (
                            <span className="text-muted-foreground">Nghỉ ca</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground max-w-[180px] truncate" title={entry.notes}>
                          {entry.notes || "—"}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(entry)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                            title="Sửa ngày này"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
