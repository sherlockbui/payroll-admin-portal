import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatNumberVN,
  parseCurrencyInput,
  readVietnameseMoneyNumber,
} from "@/lib/utils";

describe("Vietnamese Currency & Number Formatting Utility Tests", () => {
  it("formatCurrency formats numbers with Vietnamese standard dots and unit", () => {
    expect(formatCurrency(0)).toBe("0 đ");
    expect(formatCurrency(1000)).toBe("1.000 đ");
    expect(formatCurrency(1000000)).toBe("1.000.000 đ");
    expect(formatCurrency(15500000)).toBe("15.500.000 đ");
    expect(formatCurrency(1234567890)).toBe("1.234.567.890 đ");
    expect(formatCurrency(-500000)).toBe("-500.000 đ");
  });

  it("formatCurrency handles custom units and edge cases (null, undefined, string numbers)", () => {
    expect(formatCurrency(1000000, "VNĐ")).toBe("1.000.000 VNĐ");
    expect(formatCurrency(1000000, "₫")).toBe("1.000.000 ₫");
    expect(formatCurrency(1000000, "")).toBe("1.000.000");
    expect(formatCurrency("1000000")).toBe("1.000.000 đ");
    expect(formatCurrency("1,500,000")).toBe("1.500.000 đ");
    expect(formatCurrency(null)).toBe("0 đ");
    expect(formatCurrency(undefined)).toBe("0 đ");
    expect(formatCurrency("")).toBe("0 đ");
    expect(formatCurrency(NaN)).toBe("0 đ");
  });

  it("formatNumberVN returns dot-separated number without unit", () => {
    expect(formatNumberVN(0)).toBe("0");
    expect(formatNumberVN(50000)).toBe("50.000");
    expect(formatNumberVN(12500000)).toBe("12.500.000");
  });

  it("parseCurrencyInput parses raw and masked user inputs reliably", () => {
    expect(parseCurrencyInput("1.000.000")).toBe(1000000);
    expect(parseCurrencyInput("1.000.000 đ")).toBe(1000000);
    expect(parseCurrencyInput("1,500,000 VNĐ")).toBe(1500000);
    expect(parseCurrencyInput("0")).toBe(0);
    expect(parseCurrencyInput("")).toBe(0);
    expect(parseCurrencyInput("-50.000")).toBe(-50000);
    expect(parseCurrencyInput(1000000)).toBe(1000000);
  });

  it("readVietnameseMoneyNumber converts numbers to accurate Vietnamese words", () => {
    expect(readVietnameseMoneyNumber(0)).toBe("Không đồng");
    expect(readVietnameseMoneyNumber(1000000)).toBe("Một triệu đồng");
    expect(readVietnameseMoneyNumber(1500000)).toBe("Một triệu năm trăm nghìn đồng");
    expect(readVietnameseMoneyNumber(23400)).toBe("Hai mươi ba nghìn bốn trăm đồng");
    expect(readVietnameseMoneyNumber(15525000)).toBe("Mười lăm triệu năm trăm hai mươi lăm nghìn đồng");
    expect(readVietnameseMoneyNumber(1000000000)).toBe("Một tỷ đồng");
    expect(readVietnameseMoneyNumber(-500000)).toBe("Âm năm trăm nghìn đồng");
  });
});
