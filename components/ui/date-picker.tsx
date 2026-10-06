"use client";

import React, { useState, useEffect, useRef, useMemo, useId } from "react";
import { Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  value?: string | null; // "YYYY-MM-DD" or Date string
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  allowClear?: boolean;
  minDate?: string;
  maxDate?: string;
  className?: string;
  inputClassName?: string;
  error?: string;
  helperText?: string;
  id?: string;
  name?: string;
}

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTH_NAMES = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

export function GsDatePicker({
  value,
  onChange,
  label,
  placeholder = "dd/mm/yyyy",
  disabled = false,
  readOnly = false,
  required = false,
  allowClear = true,
  className,
  inputClassName,
  error,
  helperText,
  id,
  name,
}: DatePickerProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // Parse value string to Date object
  const parsedDate = useMemo<Date | null>(() => {
    if (!value || typeof value !== "string" || value.trim() === "") return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const [y, m, d] = value.slice(0, 10).split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [d, m, y] = value.split("/").map(Number);
      return new Date(y, m - 1, d);
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }, [value]);

  // View state for calendar navigation
  const [viewYear, setViewYear] = useState<number>(() =>
    parsedDate ? parsedDate.getFullYear() : new Date().getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(() =>
    parsedDate ? parsedDate.getMonth() : new Date().getMonth()
  );

  // Sync view month/year when opening popover or when value changes
  useEffect(() => {
    if (parsedDate) {
      setViewYear(parsedDate.getFullYear());
      setViewMonth(parsedDate.getMonth());
    }
  }, [parsedDate, open]);

  // Display text in Vietnamese DD/MM/YYYY
  const displayString = useMemo(() => {
    if (!parsedDate) return "";
    const d = String(parsedDate.getDate()).padStart(2, "0");
    const m = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const y = parsedDate.getFullYear();
    return `${d}/${m}/${y}`;
  }, [parsedDate]);

  const handleToggle = () => {
    if (disabled || readOnly) return;
    setOpen((prev) => !prev);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || readOnly) return;
    onChange("");
  };

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (!containerRef.current) return;
      const path = e.composedPath ? e.composedPath() : [];
      const isInside =
        containerRef.current.contains(e.target as Node) ||
        (path.length > 0 && path.includes(containerRef.current));
      if (!isInside) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Calendar day grid calculations
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  // Monday is 0, Sunday is 6
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

  const calendarDays = useMemo(() => {
    const days: Array<{
      dayNumber: number;
      monthOffset: -1 | 0 | 1;
      dateStr: string;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const selectedStr = parsedDate
      ? `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}-${String(parsedDate.getDate()).padStart(2, "0")}`
      : "";

    // 1. Prev month trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dStr = `${prevY}-${String(prevM + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        monthOffset: -1,
        dateStr: dStr,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedStr,
      });
    }

    // 2. Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        monthOffset: 0,
        dateStr: dStr,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedStr,
      });
    }

    // 3. Next month leading days to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dStr = `${nextY}-${String(nextM + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        monthOffset: 1,
        dateStr: dStr,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedStr,
      });
    }

    return days;
  }, [viewYear, viewMonth, daysInMonth, daysInPrevMonth, firstDayOfWeek, parsedDate]);

  const handleSelectDate = (dateStr: string) => {
    onChange(dateStr);
    setOpen(false);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handlePrevYear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewYear((y) => y - 1);
  };

  const handleNextYear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewYear((y) => y + 1);
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const dStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    onChange(dStr);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("gs-date-picker-group space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="gs-date-input-wrap">
        <button
          id={inputId}
          name={name}
          type="button"
          disabled={disabled || readOnly}
          onClick={handleToggle}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            "gs-date-input-trigger",
            open && "is-open",
            error && "has-error",
            !displayString && "is-placeholder",
            inputClassName
          )}
        >
          <span className="truncate">{displayString || placeholder}</span>
        </button>

        {/* Leading Calendar Icon */}
        <div className="gs-date-leading-icon">
          <Calendar className="w-4 h-4" />
        </div>

        {/* Trailing Action: Clear or Calendar indicator */}
        <div className="gs-date-trailing-actions">
          {allowClear && displayString && !disabled && !readOnly ? (
            <button
              type="button"
              onClick={handleClear}
              className="gs-date-clear-btn"
              title="Xóa ngày đã chọn"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="gs-date-trailing-glyph">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {/* Calendar Popover (Rendered inline inside container) */}
        {open && (
          <div
            data-radix-scroll-lock-ignore="true"
            className="gs-date-popover"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Month & Year Navigator */}
            <div className="gs-date-popover-header">
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handlePrevYear}
                  className="gs-date-nav-btn"
                  title="Năm trước"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="gs-date-nav-btn"
                  title="Tháng trước"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="gs-date-header-title">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="gs-date-nav-btn"
                  title="Tháng sau"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextYear}
                  className="gs-date-nav-btn"
                  title="Năm sau"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Weekdays Header */}
            <div className="gs-date-weekdays">
              {WEEKDAYS.map((w, index) => (
                <div
                  key={w}
                  className={cn(
                    "gs-date-weekday-cell",
                    index === 6 && "is-weekend"
                  )}
                >
                  {w}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="gs-date-grid">
              {calendarDays.map((cd, idx) => {
                const isCurrentMonth = cd.monthOffset === 0;
                return (
                  <button
                    key={`${cd.dateStr}-${idx}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectDate(cd.dateStr);
                    }}
                    className={cn(
                      "gs-date-cell-btn",
                      !isCurrentMonth && "is-other-month",
                      cd.isToday && !cd.isSelected && "is-today",
                      cd.isSelected && "is-selected"
                    )}
                  >
                    {cd.dayNumber}
                  </button>
                );
              })}
            </div>

            {/* Footer Toolbar */}
            <div className="gs-date-popover-footer">
              <button
                type="button"
                onClick={handleSelectToday}
                className="gs-date-quick-today"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                }}
                className="gs-date-close-btn"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-[11px] font-medium text-rose-500 mt-1">{error}</p>}
      {!error && helperText && <p className="text-[11px] text-muted-foreground mt-1">{helperText}</p>}
    </div>
  );
}

export const DatePicker = GsDatePicker;
export default GsDatePicker;

