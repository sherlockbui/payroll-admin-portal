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
  variableId?: number;
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

export interface SalaryComponentItem {
  id: number;
  code: string;
  name: string;
  order?: number;
  isDisabled?: boolean;
  isSelected?: boolean;
  defaultFormula?: string;
  expression?: string;
}

export interface SalaryComponentGroup {
  id: number;
  code: "earning" | "deduction" | "employer_cost" | string;
  name: string;
  sign: number;
  order: number;
  components: SalaryComponentItem[];
}

export interface SalaryComponentMaster {
  id: number;
  code: string;
  name: string;
  category: "income" | "deduction" | "net" | "attendance" | "aggregate";
  description?: string | null;
  defaultFormulaText?: string | null;
  outputVariable?: string | null;
  isActive?: boolean;
}

export interface SalaryStructureLine {
  id?: number | string;
  structureId?: number;
  componentId: number;
  componentCode?: string;
  componentName?: string;
  targetGroupId?: number | null;
  targetGroupName?: string | null;
  formulaDefinitionId?: number | null;
  formulaType?: string | null;
  expression: string;
  executionOrder: number;
  displayOrder: number;
  isVisibleOnPayslip: boolean;
  isVisibleOnReport: boolean;
  aggregationTarget?: string | null;
  isEnabled: boolean;
  note?: string | null;
}

export interface SalaryStructureLineItemRequest {
  LineId?: number | null;
  ComponentId: number;
  TargetGroupId?: number | null;
  FormulaDefinitionId?: number | null;
  FormulaType?: string | null;
  Expression?: string | null;
  ExecutionOrder: number;
  DisplayOrder: number;
  IsVisibleOnPayslip: boolean;
  IsVisibleOnReport: boolean;
  AggregationTarget?: string | null;
  IsEnabled: boolean;
  Note?: string | null;
}

export interface ProjectVariableItemRequest {
  VariableId: number;
  Value?: string | null;
  EffectiveFrom?: string | null;
  EffectiveTo?: string | null;
}

export interface BackendVariable {
  id: number;
  code: string;
  name: string;
  group?: string;
  unit?: string;
  dataType?: string;
  defaultValue?: string | number | null;
  description?: string | null;
  isSystem?: boolean;
}

export interface ProjectVariableResponse {
  id: number;
  projectId: number;
  variableId: number;
  code: string;
  name: string;
  group?: string;
  unit?: string;
  value?: string | number | null;
  defaultValue?: string | number | null;
  description?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
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
export type DependentStatusV3 = "PENDING" | "APPROVED" | "REJECTED" | "DRAFT";

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
  | "GKS"
  | "CCCD"
  | "SHK"
  | "GDKKH"
  | "GXN_KHUYETTAT"
  | "GXN_SINHVIEN"
  | "BAN_CAM_KET"
  | "GIAY_KHAI_SINH" 
  | "DANG_KY_KET_HON" 
  | "XAC_NHAN_KHUYET_TAT" 
  | "GIAY_TO_CHUNG_MINH_NUOI_DUONG"
  | string;

export interface DocumentTypeItem {
  id?: number;
  code: DocumentTypeCode;
  name: string;
  isRequired?: boolean;
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
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string | null; // YYYY-MM-DD
  status: DependentStatusV3;
  canApprove?: boolean;
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
  approvedAt?: string | null;
  approvedBy?: {
    id: number;
    fullName: string;
    roleName: string;
  } | null;
}

export interface CreateEmployeeDependentRequest {
  EmployeeCode?: string;
  DependentName?: string;
  Relationship?: string;
  DateOfBirth?: string;
  IdNumber?: string;
  TaxCode?: string;
  EffectiveFrom?: string;
  EffectiveTo?: string;
}

export interface UpdateEmployeeDependentRequest {
  DependentName?: string;
  Relationship?: string;
  DateOfBirth?: string;
  IdNumber?: string;
  TaxCode?: string;
  EffectiveFrom?: string;
  EffectiveTo?: string;
}

export interface RejectEmployeeDependentRequest {
  RejectionReason?: string;
}

export interface ApproveManyDependentsRequest {
  DependentIds?: number[];
}

export interface SaveDependentDocumentRequest {
  DependentId: number;
  DocumentTypeId: number;
  FileName?: string;
  FilePath?: string;
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

export interface BulkApproveRequestV3 {
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

export type LeaveEmployeeItemV3 = AnnualLeaveEmployee;
export type LeaveListResponseV3 = AnnualLeaveListResponse;
export type LeaveHistoryResponseV3 = AnnualLeaveHistoryResponse;
export type LeaveHistoryItemV3 = AnnualLeaveHistoryItemV3;

// ================= WebPayroll - Union Types =================
export type UnionParticipationStatus = "ALL" | "PARTICIPATING" | "NOT_PARTICIPATING";
export type UnionDuesParticipationStatus = UnionParticipationStatus;

export interface UnionMemberItemV3 {
  employee: EmployeeSummaryV3;
  participating: boolean;
  joinDate?: string | null;
  leaveDate?: string | null;
  contributionAmount?: number | null;
  contributionFormula?: string | null;
  note?: string | null;
  updatedAt?: string | null;
}
export type UnionDuesMemberV3 = UnionMemberItemV3;

export interface RegisterUnionRequest {
  employeeCode?: string | null;
  unionJoinDate?: string | null;
  contributionAmount?: number | null;
  note?: string | null;
}

export interface UpdateUnionContributionRequest {
  employeeCode?: string | null;
  contributionAmount?: number | null;
  note?: string | null;
}

export interface DeactivateUnionRequest {
  employeeCode?: string | null;
  note?: string | null;
}

export interface UpdateUnionDuesRequestV3 {
  participating?: boolean;
  effectiveDate?: string;
  joinDate?: string;
  contributionAmount?: number;
  reason?: string;
  note?: string;
}

export interface UnionHistoryItemV3 {
  id: number | string;
  employeeCode?: string;
  occurredAt?: string;
  action?: string;
  eventType?: string;
  contributionAmount?: number | null;
  performedBy?: {
    id?: number;
    fullName?: string;
    roleName?: string;
  };
  note?: string | null;
}
export type UnionDuesHistoryItemV3 = UnionHistoryItemV3;

export interface UnionAuditLogItemV3 {
  id: number | string;
  occurredAt?: string;
  action?: string;
  description?: string;
  actor?: {
    id?: number;
    fullName?: string;
    roleName?: string;
  };
  employee?: {
    id?: number;
    employeeCode?: string;
    fullName?: string;
  };
}

export interface UnionDuesSummaryResponse {
  total: number;
  participatingCount: number;
  notParticipatingCount: number;
  totalMonthlyDues: number;
  counts?: StatusCountV3[];
}

export interface UnionListResponseV3 {
  items: UnionMemberItemV3[];
  total: number;
  page?: number;
  pageIndex?: number;
  pageSize: number;
  totalPages?: number;
}
export type UnionDuesListResponse = UnionListResponseV3;

export interface UnionHistoryResponseV3 {
  items: UnionHistoryItemV3[];
  total: number;
  page?: number;
  pageSize?: number;
}
export type UnionDuesHistoryResponse = UnionHistoryResponseV3;

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

// ================= OpenAPI 3.0 (WebPayroll - Insurance) Types =================
export type InsuranceParticipationStatus = "ALL" | "ACTIVE" | "SUSPENDED" | "STOPPED";
export type SocialInsuranceParticipationStatus = InsuranceParticipationStatus;

export type InsuranceChangeType =
  | "TANG_MOI"
  | "DIEU_CHINH_LUONG"
  | "GIAM_HAN"
  | "THOAI_THU"
  | "NGHI_THAI_SAN"
  | "NGHI_OM_DAU"
  | "INCREASE"
  | "DECREASE"
  | "ADJUST_SALARY"
  | string;
export type SocialInsuranceChangeType = InsuranceChangeType;

export type InsuranceChangeStatus = "ALL" | "PENDING" | "CONFIRMED" | "REJECTED" | "DRAFT" | "SUBMITTED" | "APPROVED" | string;
export type SocialInsuranceChangeStatus = InsuranceChangeStatus;

export interface MedicalFacilityItemV3 {
  id: number;
  facilityCode?: string;
  facilityName: string;
  province?: string;
  address?: string;
}

export interface InsuranceContributionPreview {
  baseSalary: number;
  socialInsuranceEmployee: number; // 8%
  healthInsuranceEmployee: number; // 1.5%
  unemploymentInsuranceEmployee: number; // 1%
  totalEmployeeContribution: number; // 10.5%
  socialInsuranceEmployer: number; // 17.5%
  healthInsuranceEmployer: number; // 3%
  unemploymentInsuranceEmployer: number; // 1%
  totalEmployerContribution: number; // 21.5%
  totalContribution: number; // 32%
}

export interface CreateInsuranceChangeRequest {
  projectId?: number;
  employeeCode: string;
  changeType: string;
  effectiveFrom: string; // YYYY-MM-DD
  newBaseSalary?: number;
  newInsuranceBookNumber?: string;
  newParticipationStatus?: string;
  newMedicalFacilityId?: number;
  reason?: string;
  reasonCode?: string;
}

export interface ConfirmInsuranceChangeRequest {
  externalDossierCode: string;
}

export interface InsuranceParticipantItemV3 {
  id?: number;
  employee: EmployeeSummaryV3;
  insuranceBookNumber?: string;
  socialInsuranceNumber?: string;
  insuranceSalary?: number;
  baseSalary?: number;
  contributionSalary?: number;
  participationStatus?: InsuranceParticipationStatus;
  status?: InsuranceParticipationStatus;
  medicalFacilityId?: number | null;
  medicalFacilityCode?: string | null;
  medicalFacilityName?: string | null;
  medicalRegistrationPlace?: string | null;
  effectiveFrom?: string | null;
  effectiveMonth?: string | null;
  employeeContributionRate: number; // 10.5
  employeeContribution: number;
  employerContributionRate: number; // 21.5
  employerContribution: number;
  totalContributionRate: number; // 32
  totalContribution: number;
  note?: string | null;
  confirmedBy?: { id?: number; fullName: string; roleName?: string };
  confirmedAt?: string | null;
}
export type SocialInsuranceMemberV3 = InsuranceParticipantItemV3;

export interface InsuranceChangeItemV3 {
  id: number;
  employee: EmployeeSummaryV3;
  changeType: string;
  changeTypeName?: string;
  effectiveFrom?: string;
  effectiveMonth?: string;
  oldBaseSalary?: number | null;
  newBaseSalary?: number | null;
  oldSalary?: number | null;
  newSalary?: number | null;
  oldInsuranceBookNumber?: string | null;
  newInsuranceBookNumber?: string | null;
  oldParticipationStatus?: string | null;
  newParticipationStatus?: string | null;
  medicalFacilityId?: number | null;
  medicalFacilityName?: string | null;
  reason?: string;
  reasonCode?: string | null;
  status: string;
  statusName?: string;
  externalDossierCode?: string | null;
  reconciliationCode?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  documents?: DependentDocument[];
  createdAt?: string;
  confirmedAt?: string | null;
  confirmedByName?: string | null;
  approvedAt?: string | null;
}
export type SocialInsuranceChangeV3 = InsuranceChangeItemV3;

export interface InsuranceSummaryResponseV3 {
  total: number;
  activeCount: number;
  suspendedCount: number;
  stoppedCount: number;
  totalMonthlyContribution: number;
  totalInsuranceSalary?: number;
  pendingChangesCount: number;
  counts?: StatusCountV3[];
}
export type SocialInsuranceSummaryResponse = InsuranceSummaryResponseV3;

export interface InsuranceParticipantListResponseV3 {
  items: InsuranceParticipantItemV3[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
  summary?: InsuranceSummaryResponseV3;
}
export type SocialInsuranceMemberListResponse = InsuranceParticipantListResponseV3;

export interface InsuranceChangeListResponseV3 {
  items: InsuranceChangeItemV3[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
}
export type SocialInsuranceChangeListResponse = InsuranceChangeListResponseV3;

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
// ================= WebPayroll - Other Deductions Swagger Types =================
export interface OtherDeductionTypeItem {
  id: number;
  deductionCode: string;
  deductionName: string;
}

export type OtherDeductionType = "DISCIPLINE_FINE" | "ASSET_COMPENSATION" | "ADVANCE_PAYMENT" | "OTHER" | string;

export interface OtherDeductionItemV3 {
  id: number;
  employee: EmployeeSummaryV3;
  month?: string | null; // YYYY-MM
  year?: number | null;
  payrollPeriodId?: number | null;
  deductionTypeId?: number | null;
  deductionCode?: string | null;
  deductionName?: string | null;
  type?: OtherDeductionType;
  typeName?: string;
  amount: number;
  decisionNumber?: string | null;
  decisionDate?: string | null;
  reason?: string | null;
  note?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  attachment?: {
    id?: number;
    fileName?: string;
    fileUrl?: string;
    fileSize?: number;
  } | null;
  updatedBy?: { id?: number; fullName: string; roleName?: string };
  updatedAt?: string | null;
}
export type OtherDeductionV3 = OtherDeductionItemV3;

export interface CreateOtherDeductionRequest {
  employeeCode?: string | null;
  payrollPeriodId?: number | null;
  otherDeductionTypeId?: number | null;
  amount?: number | null;
  decisionNumber?: string | null;
  decisionDate?: string | null;
  note?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  // Legacy fields fallback
  month?: string;
  type?: OtherDeductionType;
  reason?: string;
}
export type CreateOtherDeductionRequestV3 = CreateOtherDeductionRequest;

export interface UpdateOtherDeductionRequest {
  employeeCode?: string | null;
  payrollPeriodId?: number | null;
  otherDeductionTypeId?: number | null;
  amount?: number | null;
  decisionNumber?: string | null;
  decisionDate?: string | null;
  note?: string | null;
  fileName?: string | null;
  filePath?: string | null;
}

export interface SaveOtherDeductionDocumentRequest {
  deductionId: number;
  fileName?: string | null;
  filePath?: string | null;
}

export interface OtherDeductionsSummaryResponse {
  total: number;
  totalAmount: number;
  disciplineFineCount?: number;
  assetCompensationCount?: number;
  advancePaymentCount?: number;
  otherCount?: number;
  counts?: StatusCountV3[];
}

export interface OtherDeductionsListResponseV3 {
  items: OtherDeductionItemV3[];
  total: number;
  page?: number;
  pageIndex?: number;
  pageSize: number;
  totalPages?: number;
}
export type OtherDeductionsListResponse = OtherDeductionsListResponseV3;

// ================= OpenAPI 3.0 WebPayroll - Other Income Types =================
export interface OtherIncomeTypeItem {
  id: number;
  incomeCode?: string;
  incomeName?: string;
  code?: string;
  name?: string;
  description?: string;
}

export interface OtherIncomeItemV3 {
  id: number;
  employeeCode?: string;
  employeeName?: string;
  employee: {
    employeeCode: string;
    fullName: string;
    department?: string;
    position?: string;
    projectCode?: string;
    project?: { projectId: number; projectCode: string; projectName: string };
    email?: string;
    phone?: string;
    status?: any;
  };
  incomeTypeId?: number;
  incomeCode?: string;
  incomeName?: string;
  otherIncomeTypeId?: number;
  type?: string;
  typeName?: string;
  month?: string;
  amount: number;
  decisionNumber?: string | null;
  decisionDate?: string | null;
  note?: string | null;
  reason?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  attachment?: {
    id?: number;
    fileName?: string;
    fileUrl?: string;
    fileSize?: number;
  } | null;
  updatedBy?: string | { id?: number; fullName: string; roleName?: string };
  updatedAt?: string;
}

export type OtherIncomeV3 = OtherIncomeItemV3;
export type OtherIncomeType = string;

export interface CreateOtherIncomeRequest {
  employeeCode?: string;
  payrollPeriodId?: number;
  otherIncomeTypeId?: number;
  amount?: number;
  decisionNumber?: string;
  decisionDate?: string;
  note?: string;
  reason?: string;
  fileName?: string;
  filePath?: string;
  month?: string;
  type?: string;
}
export type CreateOtherIncomeRequestV3 = CreateOtherIncomeRequest;

export interface UpdateOtherIncomeRequest {
  employeeCode?: string;
  payrollPeriodId?: number;
  otherIncomeTypeId?: number;
  amount?: number;
  decisionNumber?: string;
  decisionDate?: string;
  note?: string;
  fileName?: string;
  filePath?: string;
}

export interface SaveOtherIncomeDocumentRequest {
  incomeId: number;
  fileName?: string;
  filePath?: string;
}

export interface OtherIncomesSummaryResponse {
  total: number;
  totalAmount: number;
  hotBonusCount?: number;
  performanceBonusCount?: number;
  holidayBonusCount?: number;
  projectSupportCount?: number;
  otherCount?: number;
  counts?: StatusCountV3[];
}

export interface OtherIncomesListResponseV3 {
  items: OtherIncomeItemV3[];
  total: number;
  page?: number;
  pageIndex?: number;
  pageSize: number;
  totalPages?: number;
}
export type OtherIncomesListResponse = OtherIncomesListResponseV3;



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

export type LegacyInsuranceChangeType =
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
  changeType: LegacyInsuranceChangeType | InsuranceChangeType;
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
  timesheetSummaries?: TimesheetSummaryItem[];
}

export type TimesheetEntryStatus = "present" | "late" | "early_leave" | "absent" | "leave_paid" | "leave_unpaid" | "holiday";

export interface TimesheetDailyEntry {
  id: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // T2, T3, T4, T5, T6, T7, CN
  isWeekend?: boolean;
  isHoliday?: boolean;
  shiftCode: string; // "HC", "CA1", "CA2", "CA3"
  checkIn?: string; // "08:00"
  checkOut?: string; // "17:30"
  standardHours: number; // 8.0
  otNormalHours: number; // 1.5
  otWeekendHours: number; // 0
  otHolidayHours: number; // 0
  nightHours: number; // 0
  status: TimesheetEntryStatus;
  notes?: string;
}

export interface TimesheetSummaryItem {
  id: string;
  projectId: string;
  projectName: string;
  period: string; // "2026-09"
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  position: string;
  standardWorkdays: number;
  actualWorkdays: number;
  totalStandardHours: number;
  totalOtNormal: number;
  totalOtWeekend: number;
  totalOtHoliday: number;
  totalNightHours: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  lateEarlyCount: number;
  status: "draft" | "verified" | "locked";
  updatedAt: string;
  dailyEntries: TimesheetDailyEntry[];
}

export interface TimesheetOcrParsedItem {
  stt?: number;
  ngay_lam_viec: string;
  ma_nv: string;
  ten_nv: string;
  bo_phan?: string;
  vi_tri?: string;
  gio_den_du_kien?: string;
  gio_ve_du_kien?: string;
  gio_den_thuc_te?: string;
  gio_ve_thuc_te?: string;
  gio_nghi_trua?: string;
  ghi_chu?: string | null;
  status: "valid" | "warning" | "error";
  validationMessage?: string;
}

export interface TimesheetSummaryResponse {
  items: TimesheetSummaryItem[];
  meta: {
    totalEmployees: number;
    totalStandardHours: number;
    totalOtHours: number;
    totalWarnings: number;
    lockedCount: number;
  };
}
