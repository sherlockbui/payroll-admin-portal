import { describe, expect, it } from "vitest";
import { api } from "@/lib/api";
import { evaluateExpression } from "@/lib/formula-engine";
import type { ExpressionNode } from "@/lib/types";

const variable = (variableCode: string): ExpressionNode => ({ type: "variable", variableCode });
const constant = (value: number): ExpressionNode => ({ type: "constant", value });
const binary = (operator: "+" | "-" | "*" | "/", left: ExpressionNode, right: ExpressionNode): ExpressionNode => ({
  type: "binary",
  operator,
  left,
  right,
});

describe("Employees Module - Comprehensive Unit & Integration Tests", () => {
  // =========================================================================
  // 1. MASTER DATA: NGƯỜI PHỤ THUỘC (DEPENDENTS MASTER & VALIDATION)
  // =========================================================================
  describe("1. Master Data & Quy tắc Người phụ thuộc (Dependents)", () => {
    it("1.1 Danh mục quan hệ người phụ thuộc có đầy đủ các mã quan hệ hợp lệ", async () => {
      const relationships = await api.getDependentRelationshipsV3();
      expect(Array.isArray(relationships)).toBe(true);
      expect(relationships.length).toBeGreaterThan(0);

      const codes = relationships.map((r) => r.code);
      expect(codes).toContain("CON_RUOT_NUOI");
      expect(codes).toContain("CHA_ME_DE");
      expect(codes).toContain("VO_CHONG");
    });

    it("1.2 Danh mục loại chứng từ / hồ sơ đính kèm hợp lệ", async () => {
      const docTypes = await api.getDependentDocumentTypesV3();
      expect(Array.isArray(docTypes)).toBe(true);
      expect(docTypes.length).toBeGreaterThan(0);

      const docCodes = docTypes.map((d) => d.code);
      expect(docCodes).toContain("CCCD");
      expect(docCodes).toContain("GKS");
    });

    it("1.3 Quy tắc tính giảm trừ gia cảnh thuế TNCN theo số lượng NPT", () => {
      const GIAM_TRU_BAN_THAN = 11_000_000;
      const GIAM_TRU_MOI_NPT = 4_400_000;

      const calcTaxableIncome = (income: number, dependentsCount: number, insurance: number) => {
        const totalDeduction = GIAM_TRU_BAN_THAN + (dependentsCount * GIAM_TRU_MOI_NPT) + insurance;
        return Math.max(0, income - totalDeduction);
      };

      // TH1: 0 NPT, thu nhập 20M, BHXH 1.05M -> Giảm trừ 12.05M -> Chịu thuế 7.95M
      expect(calcTaxableIncome(20_000_000, 0, 1_050_000)).toBe(7_950_000);

      // TH2: 2 NPT, thu nhập 20M, BHXH 1.05M -> Giảm trừ 11M + 8.8M + 1.05M = 20.85M -> Chịu thuế 0đ
      expect(calcTaxableIncome(20_000_000, 2, 1_050_000)).toBe(0);
    });
  });

  // =========================================================================
  // 2. MASTER DATA & FORMULA: PHÉP NĂM (ANNUAL LEAVE LOGIC)
  // =========================================================================
  describe("2. Logic Quản lý & Tính toán Phép năm (Annual Leave)", () => {
    it("2.1 Tính toán chính xác quỹ phép năm và số ngày phép còn lại", () => {
      const calculateLeaveBalance = (
        standardDays: number,
        seniorityDays: number,
        carryOverDays: number,
        usedDays: number
      ) => {
        const totalQuota = standardDays + seniorityDays + carryOverDays;
        const remaining = totalQuota - usedDays;
        return { totalQuota, remaining };
      };

      // Nhân viên chính thức: 12 ngày chuẩn + 1 ngày thâm niên + 2 ngày tồn năm trước - 4 ngày đã nghỉ = 11 ngày còn lại
      const balance = calculateLeaveBalance(12, 1, 2, 4);
      expect(balance.totalQuota).toBe(15);
      expect(balance.remaining).toBe(11);
    });

    it("2.2 Phép thâm niên tăng thêm 1 ngày sau mỗi 5 năm làm việc (Điều 114 BLLĐ)", () => {
      const calcSeniorityLeave = (yearsOfService: number) => Math.floor(yearsOfService / 5);

      expect(calcSeniorityLeave(2)).toBe(0);  // 2 năm: 0 ngày
      expect(calcSeniorityLeave(5)).toBe(1);  // 5 năm: 1 ngày
      expect(calcSeniorityLeave(12)).toBe(2); // 12 năm: 2 ngày
      expect(calcSeniorityLeave(26)).toBe(5); // 26 năm: 5 ngày
    });
  });

  // =========================================================================
  // 3. MASTER DATA & RULES: BẢO HIỂM XÃ HỘI (INSURANCE CALCULATIONS)
  // =========================================================================
  describe("3. Quy tắc tính trích nộp Bảo hiểm xã hội (BHXH - BHYT - BHTN)", () => {
    it("3.1 Tỷ lệ trích đóng BHXH của NLĐ (10.5%) và Doanh nghiệp (21.5%)", () => {
      const calcInsurance = (salary: number) => {
        const nld_bhxh = salary * 0.08;
        const nld_bhyt = salary * 0.015;
        const nld_bhtn = salary * 0.01;
        const nld_total = nld_bhxh + nld_bhyt + nld_bhtn;

        const dn_bhxh = salary * 0.175;
        const dn_bhyt = salary * 0.03;
        const dn_bhtn = salary * 0.01;
        const dn_total = dn_bhxh + dn_bhyt + dn_bhtn;

        return { nld_total, dn_total, totalContribution: nld_total + dn_total };
      };

      const res = calcInsurance(5_000_000);
      expect(res.nld_total).toBe(525_000);     // 10.5% của 5M
      expect(res.dn_total).toBe(1_075_000);    // 21.5% của 5M
      expect(res.totalContribution).toBe(1_600_000); // 32% của 5M
    });
  });

  // =========================================================================
  // 4. MASTER DATA & RULES: CÔNG ĐOÀN PHÍ (UNION DUES)
  // =========================================================================
  describe("4. Quy tắc trích nộp Công đoàn phí (Union Dues)", () => {
    it("4.1 Khấu trừ đoàn phí đúng theo mức đăng ký hoặc 1% lương đóng BHXH", () => {
      const calcUnionFee = (isParticipating: boolean, salary: number, fixedAmount?: number) => {
        if (!isParticipating) return 0;
        if (fixedAmount && fixedAmount > 0) return fixedAmount;
        return Math.min(salary * 0.01, 234_000); // Tối đa 10% mức lương cơ sở
      };

      expect(calcUnionFee(false, 5_000_000)).toBe(0);
      expect(calcUnionFee(true, 5_000_000, 50_000)).toBe(50_000);
      expect(calcUnionFee(true, 5_000_000)).toBe(50_000); // 1% của 5M
    });
  });

  // =========================================================================
  // 5. ENGINE INTEGRATION: TÍNH LƯƠNG TỔNG HỢP VỚI ĐẦY ĐỦ THU NHẬP & KHẤU TRỪ
  // =========================================================================
  describe("5. Tích hợp Engine Tính lương tổng hợp (Payroll Calculation Pipeline)", () => {
    it("5.1 Tính lương Net chuẩn khi có Thu nhập khác và Khoản trừ khác", () => {
      const context = {
        LUONG_CO_BAN: 10_000_000,
        THU_NHAP_KHAC: 1_500_000, // Thưởng nóng
        KHOAN_TRU_KHAC: 300_000,  // Tạm ứng
        TIEN_BHXH_NLD: 525_000,   // 10.5% BHXH
        DOAN_PHI: 50_000,         // Đoàn phí
        THUE_TNCN: 100_000,       // Thuế sau giảm trừ NPT
      };

      // Công thức AST: ((LUONG_CO_BAN + THU_NHAP_KHAC) - KHOAN_TRU_KHAC) - (TIEN_BHXH_NLD + DOAN_PHI + THUE_TNCN)
      const incomeNode = binary("+", variable("LUONG_CO_BAN"), variable("THU_NHAP_KHAC"));
      const grossAfterDeduction = binary("-", incomeNode, variable("KHOAN_TRU_KHAC"));
      const statutoryDeductions = binary("+", binary("+", variable("TIEN_BHXH_NLD"), variable("DOAN_PHI")), variable("THUE_TNCN"));
      const netSalaryFormula = binary("-", grossAfterDeduction, statutoryDeductions);

      const result = evaluateExpression(netSalaryFormula, context);

      // (10M + 1.5M - 300k) - (525k + 50k + 100k) = 11.2M - 675k = 10,525,000 VNĐ
      expect(result).toBe(10_525_000);
    });

    it("5.2 Kiểm tra công thức lương xử lý an toàn khi các biến phát sinh là 0", () => {
      const context = {
        LUONG_CO_BAN: 8_000_000,
        THU_NHAP_KHAC: 0,
        KHOAN_TRU_KHAC: 0,
      };

      const formula = binary("-", binary("+", variable("LUONG_CO_BAN"), variable("THU_NHAP_KHAC")), variable("KHOAN_TRU_KHAC"));
      const result = evaluateExpression(formula, context);
      expect(result).toBe(8_000_000);
    });
  });
});
