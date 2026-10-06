"use client";

import React, { useState, useEffect, useRef, useId, useImperativeHandle, forwardRef } from "react";
import { cn, formatNumberVN, parseCurrencyInput, readVietnameseMoneyNumber } from "@/lib/utils";
import { Sparkles, X } from "lucide-react";

export interface MoneyInputProps {
  value?: number | string | null;
  onChange?: (value: number) => void;
  placeholder?: string;
  label?: string;
  unit?: string;
  showWords?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  inputClassName?: string;
  error?: string;
  helperText?: string;
  id?: string;
  name?: string;
  autoFocus?: boolean;
  allowClear?: boolean;
}

export interface MoneyInputRef {
  focus: () => void;
  blur: () => void;
  inputElement: HTMLInputElement | null;
}

export const GsMoneyInput = forwardRef<MoneyInputRef, MoneyInputProps>(function GsMoneyInput(
  {
    value,
    onChange,
    placeholder = "Nhập số tiền...",
    label,
    unit,
    showWords = true,
    disabled = false,
    readOnly = false,
    required = false,
    min,
    max,
    className,
    inputClassName,
    error,
    helperText,
    id,
    name,
    autoFocus = false,
    allowClear = false,
  },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const isFocusedRef = useRef<boolean>(false);

  // Convert incoming value to a safe number
  const numericVal = typeof value === "number" ? value : parseCurrencyInput(value);

  // Internal display string formatted with dots (e.g. "1.000.000")
  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (value === undefined || value === null || value === "") return "";
    return numericVal !== 0 ? formatNumberVN(numericVal) : "";
  });

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
    inputElement: inputRef.current,
  }));

  // Sync internal displayValue when external value changes and NOT currently typing
  useEffect(() => {
    if (isFocusedRef.current) return;

    if (value === undefined || value === null || value === "") {
      setDisplayValue("");
    } else {
      const num = typeof value === "number" ? value : parseCurrencyInput(value);
      setDisplayValue(num !== 0 ? formatNumberVN(num) : "");
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawText = e.target.value;
    const input = e.target;
    const prevCursorPos = input.selectionStart ?? rawText.length;
    const prevLen = rawText.length;

    if (rawText.trim() === "") {
      setDisplayValue("");
      onChange?.(0);
      return;
    }

    const num = parseCurrencyInput(rawText);
    if (max !== undefined && num > max) {
      return;
    }

    const formatted = formatNumberVN(num);
    setDisplayValue(formatted);
    onChange?.(num);

    // Maintain natural cursor position after adding/removing dots
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const diff = formatted.length - prevLen;
        const newPos = Math.max(0, Math.min(prevCursorPos + diff, formatted.length));
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    });
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    if (numericVal !== 0) {
      setDisplayValue(formatNumberVN(numericVal));
    } else if (displayValue.trim() === "0" || displayValue.trim() === "") {
      setDisplayValue("");
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDisplayValue("");
    onChange?.(0);
    inputRef.current?.focus();
  };

  const moneyWords = numericVal && numericVal > 0 ? readVietnameseMoneyNumber(numericVal) : "";

  return (
    <div className={cn("gs-money-input-group w-full space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="group relative flex items-center">
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          autoFocus={autoFocus}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            "gs-money-input-field font-mono",
            unit ? "!pr-14" : allowClear ? "!pr-8" : "!pr-3",
            error && "has-error",
            inputClassName
          )}
        />

        {/* Clear Button & Optional Currency Unit Badge */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {allowClear && displayValue && !disabled && !readOnly && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Xóa giá trị"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {unit && (
            <span className="text-[11px] font-bold text-muted-foreground pointer-events-none select-none px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* Live Amount in Vietnamese Words ("Bằng chữ: ...") */}
      {showWords && moneyWords && (
        <div
          className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium animate-fadeIn bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded border border-slate-200 dark:border-slate-700"
          title={`Bằng chữ: ${moneyWords}`}
        >
          <Sparkles className="w-3 h-3 shrink-0 text-primary" />
          <span className="truncate">
            Bằng chữ: <strong className="font-semibold text-foreground">{moneyWords}</strong>
          </span>
        </div>
      )}

      {error && <p className="text-[11px] font-medium text-rose-500">{error}</p>}
      {!error && helperText && !moneyWords && (
        <p className="text-[11px] text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
});

export const MoneyInput = GsMoneyInput;
export default GsMoneyInput;
