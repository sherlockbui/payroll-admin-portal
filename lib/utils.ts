import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value?: number | string | null, unit: string = "đ"): string {
  if (value === undefined || value === null || value === "") {
    return unit ? `0 ${unit}` : "0";
  }
  const num = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (isNaN(num)) {
    return unit ? `0 ${unit}` : "0";
  }
  const isNegative = num < 0;
  const absVal = Math.abs(Math.round(num));
  const formatted = absVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = isNegative ? "-" : "";
  return unit ? `${sign}${formatted} ${unit}` : `${sign}${formatted}`;
}

export function formatNumberVN(value?: number | string | null): string {
  return formatCurrency(value, "");
}

export function parseCurrencyInput(input?: string | number | null): number {
  if (input === undefined || input === null || input === "") return 0;
  if (typeof input === "number") return isNaN(input) ? 0 : input;
  const str = String(input).trim();
  const isNegative = str.startsWith("-");
  const digitsOnly = str.replace(/\D/g, "");
  if (!digitsOnly) return 0;
  const num = parseInt(digitsOnly, 10);
  return isNegative ? -num : num;
}

const VI_DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

function readThreeDigitsGroup(group: number, showZeroHundred: boolean): string {
  const hundreds = Math.floor(group / 100);
  const remainder = group % 100;
  const tens = Math.floor(remainder / 10);
  const units = remainder % 10;
  const result: string[] = [];

  if (hundreds > 0 || showZeroHundred) {
    result.push(VI_DIGITS[hundreds], "trăm");
  }

  if (tens > 1) {
    result.push(VI_DIGITS[tens], "mươi");
    if (units === 1) {
      result.push("mốt");
    } else if (units === 4) {
      result.push("tư");
    } else if (units === 5) {
      result.push("lăm");
    } else if (units > 0) {
      result.push(VI_DIGITS[units]);
    }
  } else if (tens === 1) {
    result.push("mười");
    if (units === 1) {
      result.push("một");
    } else if (units === 4) {
      result.push("bốn");
    } else if (units === 5) {
      result.push("lăm");
    } else if (units > 0) {
      result.push(VI_DIGITS[units]);
    }
  } else if (tens === 0 && (hundreds > 0 || showZeroHundred) && units > 0) {
    result.push("lẻ", VI_DIGITS[units]);
  } else if (tens === 0 && !showZeroHundred && hundreds === 0 && units > 0) {
    result.push(VI_DIGITS[units]);
  }

  return result.join(" ");
}

export function readVietnameseMoneyNumber(amount?: number | string | null): string {
  if (amount === undefined || amount === null || amount === "") return "Không đồng";
  const num = typeof amount === "number" ? amount : Number(String(amount).replace(/[^0-9.-]/g, ""));
  if (isNaN(num) || num === 0) return "Không đồng";

  const isNegative = num < 0;
  let absVal = Math.abs(Math.round(num));

  if (absVal === 0) return "Không đồng";

  const scales = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ", "tỷ tỷ"];
  const groups: number[] = [];

  while (absVal > 0) {
    groups.push(absVal % 1000);
    absVal = Math.floor(absVal / 1000);
  }

  const words: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const groupVal = groups[i];
    if (groupVal > 0) {
      const showZeroHundred = i < groups.length - 1;
      const groupWords = readThreeDigitsGroup(groupVal, showZeroHundred);
      if (groupWords) {
        words.push(groupWords);
        if (scales[i]) {
          words.push(scales[i]);
        }
      }
    }
  }

  const resultText = words.join(" ").replace(/\s+/g, " ").trim();
  if (!resultText) return "Không đồng";

  const capitalized = (isNegative ? "âm " : "") + resultText;
  const finalString = capitalized.charAt(0).toUpperCase() + capitalized.slice(1) + " đồng";
  return finalString;
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  // YYYY-MM-DD with time
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const datePart = value.slice(0, 10);
    const [y, m, d] = datePart.split("-");
    return `${d}/${m}/${y}`;
  }
  // YYYY-MM
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [y, m] = value.split("-");
    return `${m}/${y}`;
  }
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  } catch {
    return value;
  }
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${d}/${m}/${y} ${hh}:${mm}`;
  } catch {
    return value;
  }
}

export function formatMonthYear(value?: string | null, includePrefix = false): string {
  if (!value || value === "all") return "Tất cả các tháng";
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [y, m] = value.split("-");
    return includePrefix ? `Tháng ${m}/${y}` : `${m}/${y}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m] = value.split("-");
    return includePrefix ? `Tháng ${m}/${y}` : `${m}/${y}`;
  }
  return value;
}

export function formatFullDateVN(value?: string | null): string {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `Ngày ${d} tháng ${m} năm ${y}`;
  }
  return formatDate(value);
}

export function uid(prefix: string = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function showGsLoading(message?: string) {
  if (typeof window !== "undefined") {
    const win = window as any;
    if (typeof win.showGsLoading === "function") {
      win.showGsLoading(message || "Đang tải dữ liệu...");
    }
  }
}

export function hideGsLoading() {
  if (typeof window !== "undefined") {
    const win = window as any;
    if (typeof win.hideGsLoading === "function") {
      win.hideGsLoading();
    }
  }
}

