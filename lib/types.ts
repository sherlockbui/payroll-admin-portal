export type ProjectStatus = "active" | "draft" | "archived";
export type TabState = "complete" | "warning" | "incomplete" | "unsaved";
export type PolicyCategory = "allowance" | "bonus" | "leave" | "deduction";
export type FieldType = "money" | "number" | "percentage" | "boolean" | "select";

export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
  error?: ApiError;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  location: string;
  manager: string;
  managerEmail?: string;
  managerPhone?: string;
  employeeCount: number;
  status: ProjectStatus;
  payrollCycle: string;
  payrollCycleStartDate?: string;
  payrollCycleEndDate?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  templateName: string;
  updatedAt: string;
  tabStates: Record<ProjectTab, TabState>;
}

export type ProjectTab =
  | "overview"
  | "policies"
  | "attendance"
  | "formulas";

export interface PolicyFieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  min?: number;
  max?: number;
  unit?: string;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | number | boolean;
}

export type TargetRole = "shift_leader" | "chinh_thuc" | "hoc_viec" | string;

export type GroupColorTone = "primary" | "success" | "warning" | "info" | "purple" | "neutral";

export interface ProjectEmployeeGroup {
  id: string;
  projectId: string;
  code: string;
  name: string;
  description?: string;
  colorTone: GroupColorTone;
  isDefault?: boolean;
  employeeCount?: number;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TargetRoleInfo {
  key: string;
  label: string;
  badgeTone: "info" | "success" | "warning" | "neutral";
}

export const TARGET_ROLES: TargetRoleInfo[] = [
  { key: "shift_leader", label: "Quản lý / Shift Leader", badgeTone: "info" },
  { key: "chinh_thuc", label: "Công nhân chính thức", badgeTone: "success" },
  { key: "hoc_viec", label: "Học việc (29 ngày)", badgeTone: "warning" },
];

export interface PolicyDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  category: PolicyCategory;
  fields: PolicyFieldDefinition[];
  formula?: string;
  targetValues?: Partial<Record<string, Record<string, string | number | boolean>>>;
}

export interface ProjectPolicy {
  id: string;
  projectId: string;
  policyId: string;
  values: Record<string, string | number | boolean>;
  targetValues?: Partial<Record<string, Record<string, string | number | boolean>>>;
  effectiveFrom: string;
  effectiveTo?: string;
  enabled: boolean;
}

export interface ProjectPolicyColumn {
  id: number | string;
  name: string;
}

export interface ProjectPolicyRow {
  policyId: number | string;
  policyName: string;
  policyCode: string;
  dataType: "percentage" | "currency" | string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  values: Record<string, string | number>;
}

export interface ProjectPoliciesResponseData {
  columns: ProjectPolicyColumn[];
  rows: ProjectPolicyRow[];
  pageIndex: number;
  pageSize: number;
  totalRow: number;
}

export interface AttendanceConfig {
  projectId: string;
  attendanceType?: string;
  standardWorkDaysOption?: string;
  benefitDeduction?: string;
  standardWorkDays: number;
  hoursPerDay: number;
  weeklyDayOff: string;
  nightShiftFrom: string;
  nightShiftTo: string;
  holidayCalendar: string;
}

export interface OvertimeType {
  id: string;
  code: string;
  name: string;
  defaultMultiplier: number;
  unit: "hour";
  description: string;
}

export interface ProjectOvertimeConfig {
  id: string;
  projectId: string;
  overtimeTypeId: string;
  enabled: boolean;
  multiplier: number;
  base: "base_salary" | "base_plus_responsibility" | "insurance_salary";
  divisor: "monthly_hours" | "fixed_208" | "fixed_26_days";
  formulaOption?: string;
  hoursSource: string;
  taxable: boolean;
  effectiveFrom: string;
}

export type BinaryOperator = "+" | "-" | "*" | "/";
export type ComparisonOperator = ">" | "<" | ">=" | "<=" | "==" | "!=";

export type ExpressionNode =
  | { type: "variable"; variableCode: string }
  | { type: "constant"; value: number }
  | {
      type: "binary";
      operator: BinaryOperator;
      left: ExpressionNode;
      right: ExpressionNode;
    }
  | {
      type: "comparison";
      operator: ComparisonOperator;
      left: ExpressionNode;
      right: ExpressionNode;
    }
  | {
      type: "if";
      condition: ExpressionNode;
      thenBranch: ExpressionNode;
      elseBranch: ExpressionNode;
    };

export interface RoundingRule {
  mode: "none" | "nearest" | "up" | "down";
  precision: 1 | 100 | 1000;
}

export interface SalaryFormula {
  id: string;
  projectId: string;
  code: string;
  name: string;
  outputVariable: string;
  category: "attendance" | "income" | "deduction" | "aggregate" | "net";
  order: number;
  expression: ExpressionNode;
  rounding: RoundingRule;
  enabled: boolean;
}

export interface FormulaVariable {
  code: string;
  name: string;
  group: "employee" | "attendance" | "policy" | "formula" | "custom";
  sampleValue?: number;
  defaultValue?: number;
  value?: number | null;
  unit: string;
  description?: string;
  isCustom?: boolean;
  required?: boolean;
}

export interface ProjectCustomVariable {
  id: string;
  projectId: string;
  code: string;
  name: string;
  description?: string;
  unit: string;
  value: number | null;
  defaultValue?: number;
  updatedAt?: string;
}

export interface SalaryStructure {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  description: string | null;
}

export interface SalaryStructurePayload {
  StructureCode: string;
  StructureName: string;
  Description: string;
  IsActive: boolean;
}

export interface DataMapping {
  id: string;
  projectId: string;
  sourceType: "employee" | "attendance" | "overtime" | "bonus" | "advance" | "deduction";
  sourceName: string;
  joinKey: string;
  status: "valid" | "warning" | "invalid";
  fields: Array<{
    sourceField: string;
    systemField: string;
    dataType: "text" | "number" | "date";
    required: boolean;
  }>;
  sampleRows: Array<Record<string, string | number>>;
}

export interface TestEmployee {
  id: string;
  code: string;
  name: string;
  role: string;
  baseSalary: number;
  workHours: number;
  overtimeHours: number;
}

export interface TestRunResult {
  employee: TestEmployee;
  period: string;
  breakdown: Array<{
    code: string;
    name: string;
    amount: number;
    status: "matched" | "warning";
  }>;
  grossIncome: number;
  totalDeductions: number;
  netPay: number;
  expectedNetPay: number;
  difference: number;
  warnings: string[];
}

export interface Employee {
  id: string;
  code: string;
  name: string;
  gender?: string;
  idCard: string;
  phone: string;
  email?: string;
  projectId: string;
  projectCode: string;
  department: string;
  position: string;
  joinDate: string;
  resignationDate?: string;
  status: "active" | "resigned" | "probation";
  groupId?: string;
  groupName?: string;
}

export interface Dependent {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  employeeIdCard?: string;
  employeeTaxCode?: string;
  projectId: string;
  projectCode?: string;
  fullName: string;
  relationship: "child" | "spouse" | "parent" | "other";
  dob: string;
  idCardOrTaxCode: string;
  taxCode?: string;
  startDate: string; // YYYY-MM
  endDate?: string;  // YYYY-MM
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: "cccd_2_sided" | "disability_cert" | "birth_cert";
  creationMode: "accountant_import" | "bcsx_declare";
  status: "pending_approval" | "approved" | "rejected";
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

// ================= OpenAPI 3.0 (01-nguoi-phu-thuoc.yaml) Types =================
export type DependentStatusV3 = "DRAFT" | "PENDING" | "CONFIRMED" | "APPROVED" | "REJECTED";

export type RelationshipCode = 
  | "CON_RUOT_NUOI" 
  | "VO_CHONG" 
  | "CHA_ME_DE" 
  | "CHA_ME_VO_CHONG" 
  | "NGUOI_NUOI_DUONG_HOP_PHAP" 
  | "KHAC";

export interface RelationshipItem {
  code: RelationshipCode;
  name: string;
  description?: string;
  requiresDocument?: boolean;
}

export type DocumentTypeCode = 
  | "GIAY_KHAI_SINH" 
  | "CCCD" 
  | "DANG_KY_KET_HON" 
  | "XAC_NHAN_KHUYET_TAT" 
  | "GIAY_TO_CHUNG_MINH_NUOI_DUONG";

export interface DocumentTypeItem {
  code: DocumentTypeCode;
  name: string;
  allowedExtensions?: string[];
  maxSizeMb?: number;
}

export interface DependentDocument {
  id: number;
  dependentId: number;
  documentType: DocumentTypeCode;
  documentTypeName: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface EmployeeSummaryV3 {
  employeeCode: string;
  fullName: string;
  project?: {
    projectId: number;
    projectCode: string;
    projectName: string;
  } | null;
  identityNumber?: string | null;
  taxCode?: string | null;
  department?: string | null;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
}

export interface DependentSummaryV3 {
  id: number;
  employee: EmployeeSummaryV3;
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  identityNumber: string;
  taxCode?: string | null;
  relationship: {
    code: RelationshipCode;
    name: string;
  };
  effectiveFrom: string; // YYYY-MM
  effectiveTo?: string | null; // YYYY-MM
  status: DependentStatusV3;
  canConfirm?: boolean;
  canReject?: boolean;
  canEdit?: boolean;
  documentsCount?: number;
  documents?: DependentDocument[];
  rejectionReason?: string | null;
  updatedAt?: string;
}

export interface DependentDetailV3 extends DependentSummaryV3 {
  documentType?: DocumentTypeCode;
  rejectionReason?: string | null;
  confirmedAt?: string | null;
  confirmedBy?: {
    id: number;
    fullName: string;
    roleName: string;
  } | null;
  approvedAt?: string | null;
  approvedBy?: {
    id: number;
    fullName: string;
    roleName: string;
  } | null;
}

export interface CreateDependentRequestV3 {
  projectId: number;
  employeeCode: string;
  fullName: string;
  dateOfBirth: string;
  identityNumber: string;
  taxCode?: string;
  relationshipCode: RelationshipCode;
  effectiveFrom: string;
  effectiveTo?: string;
  documentType?: DocumentTypeCode;
  note?: string;
}

export interface UpdateDependentRequestV3 {
  fullName?: string;
  dateOfBirth?: string;
  identityNumber?: string;
  taxCode?: string;
  relationshipCode?: RelationshipCode;
  effectiveFrom?: string;
  effectiveTo?: string;
  documentType?: DocumentTypeCode;
  note?: string;
}

export interface RejectDependentRequestV3 {
  reason: string;
}

export interface BulkConfirmRequestV3 {
  dependentIds: number[];
}

export interface StatusCountV3 {
  key?: string;
  status?: string;
  count: number;
  label?: string;
}

export interface DependentSummaryResponseV3 {
  total: number;
  counts: StatusCountV3[];
}

export interface DependentListResponseV3 {
  items: DependentSummaryV3[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ImportErrorDetailV3 {
  row: number;
  column: string;
  value?: string | null;
  message: string;
}

export interface ImportDependentResponseV3 {
  success: boolean;
  totalRows: number;
  successRows: number;
  errorRows: number;
  errors?: ImportErrorDetailV3[];
}

export type AuditEventTypeV3 = 
  | "DECLARED" 
  | "UPDATED" 
  | "IMPORTED" 
  | "APPROVED" 
  | "CONFIRMED" 
  | "REJECTED" 
  | "DOCUMENT_UPLOADED" 
  | "DOCUMENT_REPLACED";

export interface AuditLogV3 {
  id: number;
  eventType: AuditEventTypeV3;
  occurredAt: string;
  actor: {
    id?: number;
    fullName: string;
    roleName: string;
  };
  employee?: EmployeeSummaryV3;
  dependent?: {
    id: number;
    fullName: string;
  } | null;
  description: string;
  metadata?: Record<string, any>;
}

export interface AuditLogListResponseV3 {
  items: AuditLogV3[];
  total: number;
  page: number;
  pageSize: number;
}


// ================= OpenAPI 3.0 (02-phep-nam.yaml) Types =================
export type EmploymentType = "OFFICIAL_CONTRACT" | "PROBATION" | "SEASONAL" | "INTERN" | "NONE";

export type AnnualLeaveViewFilter =
  | "ALL"
  | "OFFICIAL_ELIGIBLE"
  | "PROBATION_OR_NO_CONTRACT"
  | "TERMINATED"
  | "HAS_AVAILABLE_LEAVE"
  | "EXHAUSTED";

export interface AnnualLeaveEmployee {
  employee: EmployeeSummaryV3;
  employmentType: EmploymentType;
  joinDate: string; // YYYY-MM-DD
  terminationDate?: string | null; // YYYY-MM-DD
  entitlementStartDate?: string | null; // YYYY-MM-DD
  entitlementStatus?: string;
  annualEntitlementDays?: number | null; // e.g. 12
  carryOverDays?: number | null; // e.g. 1
  usedDays?: number | null; // e.g. 4.5
  availableDays?: number | null; // e.g. 8.5
}

export interface AnnualLeaveHistoryItemV3 {
  id: number;
  fromDate: string;
  toDate: string;
  days: number;
  leaveType: string;
  reason: string;
  approvedBy: {
    id?: number;
    fullName: string;
    roleName: string;
  };
  approvedAt: string;
}

export interface AnnualLeaveSummaryResponse {
  total: number;
  officialEligible: number;
  probationOrNoContract: number;
  terminated: number;
  hasAvailableLeave: number;
  exhausted: number;
  counts?: StatusCountV3[];
}

export interface AnnualLeaveListResponse {
  items: AnnualLeaveEmployee[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AnnualLeaveHistoryResponse {
  items: AnnualLeaveHistoryItemV3[];
  total: number;
  page: number;
  pageSize: number;
  year?: number;
}

// ================= OpenAPI 3.0 (03-cong-doan-phi.yaml) Types =================
export type UnionDuesParticipationStatus = "ALL" | "PARTICIPATING" | "NOT_PARTICIPATING";

export interface UnionDuesMemberV3 {
  employee: EmployeeSummaryV3;
  participating: boolean;
  joinDate?: string | null; // YYYY-MM-DD
  leaveDate?: string | null; // YYYY-MM-DD
  contributionAmount?: number | null; // e.g. 23400 (VNĐ)
  contributionFormula?: string | null; // e.g. "1% Lương cơ bản" hoặc "1% Lương tối thiểu vùng"
  note?: string | null;
  updatedAt?: string | null;
}

export interface UpdateUnionDuesRequestV3 {
  participating?: boolean;
  effectiveDate?: string;
  joinDate?: string;
  contributionAmount?: number;
  reason?: string;
  note?: string;
}

export interface UnionDuesHistoryItemV3 {
  id: number;
  occurredAt: string;
  eventType: string; // "JOINED" | "LEFT" | "ADJUSTED" | "IMPORTED"
  contributionAmount?: number | null;
  performedBy: {
    id?: number;
    fullName: string;
    roleName?: string;
  };
  note?: string | null;
}

export interface UnionDuesSummaryResponse {
  total: number;
  participatingCount: number;
  notParticipatingCount: number;
  totalMonthlyDues: number;
  counts?: StatusCountV3[];
}

export interface UnionDuesListResponse {
  items: UnionDuesMemberV3[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UnionDuesHistoryResponse {
  items: UnionDuesHistoryItemV3[];
  total: number;
  page: number;
  pageSize: number;
}

// ================= OpenAPI 3.0 (04-ngay-cong-chuan.yaml) Types =================
export type StandardWorkdayMode = "ALL" | "CUSTOM" | "PROJECT_DEFAULT";

export interface StandardWorkdayEmployeeV3 {
  employee: EmployeeSummaryV3;
  projectStandardDays: number;
  appliedStandardDays: number;
  mode: "CUSTOM" | "PROJECT_DEFAULT";
  adjustmentReason?: string | null;
  updatedBy?: { id?: number; fullName: string; roleName?: string };
  updatedAt?: string | null;
}

export interface UpdateStandardWorkdayRequestV3 {
  standardDays: number;
  reason: string;
  note?: string;
}

export interface StandardWorkdaySummaryResponse {
  total: number;
  projectDefaultCount: number;
  customCount: number;
  projectStandardDays: number;
  counts?: StatusCountV3[];
}

export interface StandardWorkdayListResponse {
  items: StandardWorkdayEmployeeV3[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts?: { all: number; custom: number; projectDefault: number };
}

// ================= OpenAPI 3.0 (05-bao-hiem-xa-hoi.yaml) Types =================
export type SocialInsuranceParticipationStatus = "ALL" | "ACTIVE" | "SUSPENDED" | "STOPPED";
export type SocialInsuranceChangeType = "INCREASE" | "DECREASE" | "ADJUST_SALARY";
export type SocialInsuranceChangeStatus = "DRAFT" | "SUBMITTED" | "RECONCILED" | "APPROVED" | "REJECTED";

export interface SocialInsuranceMemberV3 {
  employee: EmployeeSummaryV3;
  socialInsuranceNumber: string;
  contributionSalary: number;
  employeeContributionRate: number; // 10.5
  employeeContribution: number;
  employerContributionRate: number; // 21.5
  employerContribution: number;
  totalContributionRate: number; // 32
  totalContribution: number;
  effectiveMonth: string; // YYYY-MM
  status: "ACTIVE" | "SUSPENDED" | "STOPPED";
  medicalRegistrationPlace?: string | null;
  confirmedBy?: { id?: number; fullName: string; roleName?: string };
  confirmedAt?: string | null;
}

export interface SocialInsuranceChangeV3 {
  id: number;
  employee: EmployeeSummaryV3;
  changeType: SocialInsuranceChangeType;
  effectiveMonth: string;
  oldSalary?: number | null;
  newSalary?: number | null;
  status: SocialInsuranceChangeStatus;
  reason: string;
  reconciliationCode?: string | null;
  documents?: DependentDocument[];
  createdAt: string;
  approvedAt?: string | null;
}

export interface SocialInsuranceSummaryResponse {
  total: number;
  activeCount: number;
  suspendedCount: number;
  stoppedCount: number;
  totalMonthlyContribution: number;
  pendingChangesCount: number;
  counts?: StatusCountV3[];
}

export interface SocialInsuranceMemberListResponse {
  items: SocialInsuranceMemberV3[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SocialInsuranceChangeListResponse {
  items: SocialInsuranceChangeV3[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ================= OpenAPI 3.0 (06-che-do-phu-cap.yaml) Types =================
export type BenefitsAllowanceMode = "ALL" | "CUSTOM" | "PROJECT_DEFAULT";

export interface EmployeeAllowanceItemV3 {
  policyId: string | number;
  policyCode: string;
  policyName: string;
  amount: number;
  isCustomized: boolean;
  unit?: string;
}

export interface BenefitsAllowanceEmployeeV3 {
  employee: EmployeeSummaryV3;
  jobTitle?: string | null;
  baseSalary: number;
  socialInsuranceSalary: number;
  effectiveDate: string;
  mode: "CUSTOM" | "PROJECT_DEFAULT";
  allowances: EmployeeAllowanceItemV3[];
  totalMonthlyAllowance: number;
  updatedAt?: string | null;
}

export interface UpdateBenefitsAllowanceRequestV3 {
  allowances: Array<{ policyId: string | number; amount: number; isCustomized?: boolean }>;
  reason?: string;
}

export interface BenefitsAllowanceSummaryResponse {
  total: number;
  projectDefaultCount: number;
  customCount: number;
  totalMonthlyAllowanceAmount: number;
  counts?: StatusCountV3[];
}

export interface BenefitsAllowanceListResponse {
  items: BenefitsAllowanceEmployeeV3[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ================= OpenAPI 3.0 (07-khoan-tru-khac.yaml) Types =================
export type OtherDeductionType = "DISCIPLINE_FINE" | "ASSET_COMPENSATION" | "ADVANCE_PAYMENT" | "OTHER";

export interface OtherDeductionV3 {
  id: number;
  employee: EmployeeSummaryV3;
  month: string; // YYYY-MM
  type: OtherDeductionType;
  typeName: string;
  amount: number;
  decisionNumber?: string | null;
  decisionDate?: string | null;
  reason: string;
  attachment?: {
    id: number;
    fileName: string;
    fileUrl: string;
    fileSize: number;
  } | null;
  updatedBy?: { id?: number; fullName: string; roleName?: string };
  updatedAt: string;
}

export interface CreateOtherDeductionRequestV3 {
  employeeCode: string;
  month: string;
  type: OtherDeductionType;
  amount: number;
  decisionNumber?: string;
  decisionDate?: string;
  reason: string;
}

export interface OtherDeductionsSummaryResponse {
  total: number;
  totalAmount: number;
  disciplineFineCount: number;
  assetCompensationCount: number;
  advancePaymentCount: number;
  otherCount: number;
  counts?: StatusCountV3[];
}

export interface OtherDeductionsListResponse {
  items: OtherDeductionV3[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ================= OpenAPI 3.0 (08-thu-nhap-khac.yaml) Types =================
export type OtherIncomeType = "HOT_BONUS" | "PERFORMANCE_BONUS" | "HOLIDAY_BONUS" | "PROJECT_SUPPORT" | "OTHER";

export interface OtherIncomeV3 {
  id: number;
  employee: EmployeeSummaryV3;
  month: string; // YYYY-MM
  type: OtherIncomeType;
  typeName: string;
  amount: number;
  decisionNumber?: string | null;
  decisionDate?: string | null;
  reason: string;
  attachment?: {
    id: number;
    fileName: string;
    fileUrl: string;
    fileSize: number;
  } | null;
  updatedBy?: { id?: number; fullName: string; roleName?: string };
  updatedAt: string;
}

export interface CreateOtherIncomeRequestV3 {
  employeeCode: string;
  month: string;
  type: OtherIncomeType;
  amount: number;
  decisionNumber?: string;
  decisionDate?: string;
  reason: string;
}

export interface OtherIncomesSummaryResponse {
  total: number;
  totalAmount: number;
  hotBonusCount: number;
  performanceBonusCount: number;
  holidayBonusCount: number;
  projectSupportCount: number;
  otherCount: number;
  counts?: StatusCountV3[];
}

export interface OtherIncomesListResponse {
  items: OtherIncomeV3[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}



export interface LeaveHistoryItem {
  id: string;
  from: string;
  to: string;
  days: number;
  leaveType: "annual" | "compensatory" | "unpaid" | "sick";
  reason: string;
  approvedBy: string;
  approvedAt: string;
}

export interface LeaveRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  projectId: string;
  projectCode?: string;
  contractType: "official" | "probation" | "seasonal"; // Loại hợp đồng lao động
  employeeStatus: "active" | "resigned" | "probation";  // Trạng thái nhân sự
  eligibilityStatus: "eligible" | "probation_ineligible" | "resigned"; // Tình trạng hưởng phép năm
  joinDate?: string;        // YYYY-MM-DD (Ngày vào làm)
  contractEndDate?: string; // YYYY-MM-DD (Ngày hết hạn HĐ)
  endDate?: string;         // YYYY-MM-DD (Ngày kết thúc)
  entitlementDate?: string; // YYYY-MM-DD (Thời điểm bắt đầu được hưởng phép năm)
  resignationDate?: string; // YYYY-MM-DD (Thời điểm nghỉ việc nếu đã thôi việc)
  accruedDays: number;     // Số ngày phép đã tích lũy lũy kế đến kỳ hiện tại (VD: 8 tháng = 8 ngày)
  availableDays: number;   // Số ngày phép khả dụng có thể sử dụng ngay tại thời điểm hiện tại
  totalEntitled: number;   // Tổng số ngày phép tiêu chuẩn cả năm (12 ngày)
  seniorityDays: number;   // Số ngày phép thâm niên
  usedDays: number;        // Số ngày phép đã sử dụng
  remainingDays: number;   // Tổng số ngày phép còn lại cả năm = (totalEntitled + seniorityDays) - usedDays
  history: LeaveHistoryItem[];
}

export interface UnionFeeHistoryItem {
  id: string;
  actionDate: string; // YYYY-MM-DD
  actionType: "join" | "leave" | "import" | "adjust";
  actionLabel: string;
  amount?: number;
  changedBy: string;
  note?: string;
}

export interface UnionFeeRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  projectId: string;
  projectCode?: string;
  joinDate?: string;          // Ngày vào làm công ty
  resignationDate?: string;   // Ngày nghỉ việc
  joinedUnionDate?: string;   // Ngày tham gia công đoàn
  period?: string; // YYYY-MM
  feeType: "percentage" | "fixed";
  amount: number;
  isParticipating: boolean;
  importedAt?: string;
  importedBy?: string;
  history?: UnionFeeHistoryItem[];
}

export interface StandardWorkdayRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  projectId: string;
  projectCode?: string;
  projectStandardDays: number;
  overrideDays?: number;
  isOverridden: boolean;
  reason?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface InsuranceRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  projectId: string;
  projectCode?: string;
  insuranceBookNumber: string; // Mã số BHXH 10 chữ số
  insuranceSalary: number;
  employeeRate: number; // 10.5
  companyRate: number;  // 21.5
  fromDate?: string;     // YYYY-MM-DD
  toDate?: string;       // YYYY-MM-DD
  effectiveMonth: string; // YYYY-MM
  status: "active" | "suspended" | "stopped";
  hospitalName?: string; // Nơi ĐK KCB ban đầu
  verifiedBy?: string;
  verifiedAt?: string;
}

export type InsuranceChangeType =
  | "increase"      // Báo tăng mới (ký HĐLĐ)
  | "decrease"      // Báo giảm hẳn (nghỉ việc)
  | "salary_adjust" // Điều chỉnh mức lương đóng
  | "suspend"       // Tạm dừng (thai sản, nghỉ không lương > 14 ngày)
  | "resume";       // Đóng trở lại sau tạm dừng

export interface InsuranceChangeRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  projectId: string;
  projectCode?: string;
  period: string; // YYYY-MM (Kỳ biến động, vd "2026-08")
  changeType: InsuranceChangeType;
  oldSalary?: number;
  newSalary: number;
  effectiveMonth: string; // YYYY-MM
  reason: string;
  status: "pending_agency_verification" | "verified" | "rejected";
  agencyReceiptCode?: string; // Mã hồ sơ điện tử cơ quan BHXH
  documentName?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface TaxConfigRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  projectId: string;
  projectCode?: string;
  taxCode: string;
  taxType: "progressive" | "flat_10" | "non_resident_20" | "commitment_08";
  hasCommitment08: boolean;
  approvedDependentsCount: number;
  personalDeduction: number;
  dependentDeduction: number;
}

export interface EmployeePolicyItem {
  policyId: string;
  policyCode: string;
  policyName: string;
  category: PolicyCategory;
  isEnabled: boolean;
  isCustom: boolean;
  defaultValue: Record<string, any>;
  customValue: Record<string, any>;
  effectiveFrom?: string;
  effectiveTo?: string;
  reason?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface EmployeePolicyRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  projectId: string;
  projectCode?: string;
  role: TargetRole;
  roleTitle?: string;
  joinDate?: string;
  baseSalary: number;
  insuranceSalary: number;
  totalAllowance: number;
  customPolicyCount: number;
  policies: EmployeePolicyItem[];
  effectiveFrom?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type AttendanceSheetStatus = "approved" | "pending";

export interface PayrollAttendanceSheet {
  id: string;
  projectId: string;
  period: string;
  code: string;
  name: string;
  source: "system" | "excel" | "customer";
  status: AttendanceSheetStatus;
  employeeCount: number;
  approvedAt?: string;
  approvedBy?: string;
  usedByPayrollId?: string;
}

export type PayrollStatus =
  | "admin_review"
  | "correction_required"
  | "project_approval"
  | "payslip_publish"
  | "payslip_confirmation"
  | "revenue_check"
  | "explanation_required"
  | "ready_to_finalize"
  | "locked";

export interface PayrollRun {
  id: string;
  code: string;
  projectId: string;
  period: string;
  attendanceSheetId: string;
  status: PayrollStatus;
  employeeCount: number;
  confirmedPayslipCount: number;
  grossPayroll: number;
  totalDeductions: number;
  netPayroll: number;
  feedbackCount: number;
  previousPayrollCost?: number;
  previousRevenue?: number;
  currentRevenue?: number;
  varianceRate?: number;
  varianceAmount?: number;
  explanation?: string;
  returnToStep?: 3 | 4;
  returnReason?: string;
  returnedAt?: string;
  returnedBy?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  lockedAt?: string;
  lockedBy?: string;
}

export interface PayrollLine {
  id: string;
  payrollId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  position: string;
  workDays: number;
  overtimeHours: number;
  basePay: number;
  overtimePay: number;
  allowances: number;
  deductions: number;
  netPay: number;
  detail?: PayrollLineDetail;
  note?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface PayrollLineAttendanceDetail {
  regularHours: number;
  nightHours: number;
  overtimeWeekdayHours: number;
  overtimeNightWeekdayHours: number;
  overtimeWeekendHours: number;
  overtimeNightWeekendHours: number;
  overtimeHolidayHours: number;
  totalHours: number;
  workDaysForAllowance: number;
  holidayLeaveDays: number;
  regimeLeaveDays: number;
  annualLeaveDays: number;
  rosterLeaveDays: number;
  approvedLeaveDays: number;
  unapprovedLeaveDays: number;
  totalPaidDays: number;
}

export interface PayrollLineIncomeDetail {
  contractualSalary: number;
  regularPay: number;
  attendanceBonus: number;
  performanceBonus: number;
  phoneAllowance: number;
  insuranceAllowance: number;
  otherAllowance: number;
  mealAllowance: number;
  annualLeavePay: number;
  overtimeWeekdayPay: number;
  overtimeNightWeekdayPay: number;
  overtimeWeekendPay: number;
  overtimeNightWeekendPay: number;
  overtimeHolidayPay: number;
  nightAllowance: number;
  annualLeaveSettlement: number;
  productivityBonus: number;
  salaryAdjustment: number;
  benefitPay: number;
  projectBonus: number;
  projectSupport: number;
  grossPay: number;
}

export interface PayrollLineDeductionDetail {
  socialInsurance: number;
  healthInsurance: number;
  unemploymentInsurance: number;
  insuranceTotal: number;
  insuranceAdjustment: number;
  healthCardArrears: number;
  unionFee: number;
  personalIncomeTax: number;
  uniformDepreciation: number;
  violation: number;
  retention: number;
  ekkoAdvance: number;
  salaryAdvance: number;
  total: number;
}

export interface PayrollLinePaymentDetail {
  method: "transfer" | "cash";
  transferAmount: number;
  cashAmount: number;
  bankName: string;
  bankAccount: string;
}

export type PayrollDailyAttendanceStatus = "work" | "overtime" | "off" | "leave" | "unapproved";

export interface PayrollDailyAttendanceEntry {
  date: string;
  day: number;
  weekday: string;
  code: string;
  hours: number;
  overtimeHours: number;
  status: PayrollDailyAttendanceStatus;
}

export interface PayrollLineDetail {
  attendance: PayrollLineAttendanceDetail;
  income: PayrollLineIncomeDetail;
  deductions: PayrollLineDeductionDetail;
  payment: PayrollLinePaymentDetail;
}

export type PayrollFeedbackStatus =
  | "pending_owner"
  | "pending_accounting"
  | "adjusted"
  | "rejected";

export interface PayrollFeedback {
  id: string;
  payrollId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  category: "attendance" | "overtime" | "allowance" | "deduction" | "personal" | "other";
  message: string;
  status: PayrollFeedbackStatus;
  submittedAt: string;
  ownerReviewedAt?: string;
  ownerReviewedBy?: string;
  accountingNote?: string;
  rejectionReason?: string;
  resolvedAt?: string;
}

export interface PayrollAuditEvent {
  id: string;
  payrollId: string;
  type: "create" | "approve" | "publish" | "return" | "resubmit" | "revenue" | "explain" | "edit" | "feedback" | "lock";
  workflowStep?: number;
  title: string;
  description: string;
  actor: string;
  createdAt: string;
}

export type OtherDeductionCategory =
  | "violation" // Phạt vi phạm nội quy
  | "compensation" // Bồi thường tài sản / thiết bị
  | "late_penalty" // Phạt đi trễ / về sớm theo quyết định
  | "uniform" // Khấu trừ đồng phục / dụng cụ
  | "other"; // Khác

export interface OtherDeductionRecord {
  id: string;
  projectId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  position?: string;
  period: string; // YYYY-MM
  category: OtherDeductionCategory;
  categoryLabel?: string;
  amount: number;
  decisionNo?: string;
  decisionDate?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  attachmentSize?: string;
  reason: string;
  updatedBy: string;
  updatedAt: string;
}

export type OtherIncomeCategory =
  | "spot_bonus" // Thưởng nóng / thưởng thành tích đột xuất
  | "project_bonus" // Thưởng tiến độ / thưởng dự án
  | "support" // Hỗ trợ khó khăn / trợ cấp đột xuất
  | "incentive" // Khen thưởng chuyên cần / sáng kiến
  | "other"; // Thu nhập khác

export interface OtherIncomeRecord {
  id: string;
  projectId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  position?: string;
  period: string; // YYYY-MM
  category: OtherIncomeCategory;
  categoryLabel?: string;
  amount: number;
  decisionNo?: string;
  decisionDate?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  attachmentSize?: string;
  reason: string;
  updatedBy: string;
  updatedAt: string;
}

export type ActivityLogModule = "policies" | "workdays" | "union" | "insurance" | "dependents" | "deductions" | "incomes";

export interface ActivityLogItem {
  id: string;
  projectId: string;
  module: ActivityLogModule;
  employeeId?: string;
  employeeCode?: string;
  employeeName?: string;
  actionType: "create" | "update" | "delete" | "approve" | "reject" | "import" | "override" | "restore" | "join" | "leave";
  actionLabel: string;
  details: string;
  oldValue?: string | number;
  newValue?: string | number;
  changedBy: string;
  reason?: string;
  createdAt: string;
}

export interface MockDatabase {
  schemaVersion: number;
  projects: Project[];
  policyDefinitions: PolicyDefinition[];
  projectPolicies: ProjectPolicy[];
  attendanceConfigs: AttendanceConfig[];
  overtimeTypes: OvertimeType[];
  overtimeConfigs: ProjectOvertimeConfig[];
  formulas: SalaryFormula[];
  formulaVariables: FormulaVariable[];
  dataMappings: DataMapping[];
  testEmployees: TestEmployee[];
  employees: Employee[];
  dependents: Dependent[];
  leaveRecords: LeaveRecord[];
  unionFees: UnionFeeRecord[];
  standardWorkdays: StandardWorkdayRecord[];
  insuranceRecords: InsuranceRecord[];
  insuranceChanges: InsuranceChangeRecord[];
  taxConfigs: TaxConfigRecord[];
  employeePolicies: EmployeePolicyRecord[];
  projectEmployeeGroups: ProjectEmployeeGroup[];
  projectCustomVariables?: ProjectCustomVariable[];
  activityLogs: ActivityLogItem[];
  otherDeductions: OtherDeductionRecord[];
  otherIncomes: OtherIncomeRecord[];
  dependentsV3?: DependentDetailV3[];
  auditLogsV3?: AuditLogV3[];
  annualLeaveEmployeesV3?: AnnualLeaveEmployee[];
  annualLeaveHistoryV3?: Record<string, AnnualLeaveHistoryItemV3[]>;
  unionDuesMembersV3?: UnionDuesMemberV3[];
  unionDuesHistoryV3?: Record<string, UnionDuesHistoryItemV3[]>;
  standardWorkdaysV3?: StandardWorkdayEmployeeV3[];
  socialInsuranceMembersV3?: SocialInsuranceMemberV3[];
  socialInsuranceChangesV3?: SocialInsuranceChangeV3[];
  benefitsAllowanceEmployeesV3?: BenefitsAllowanceEmployeeV3[];
  otherDeductionsV3?: OtherDeductionV3[];
  otherIncomesV3?: OtherIncomeV3[];
}
