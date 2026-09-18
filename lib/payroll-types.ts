export type PayrollStatus = "draft" | "calculated" | "submitted" | "locked";
export type WorkflowStatus = "pending" | "in_progress" | "approved" | "rejected";
export type ConfirmationStatus = "published" | "viewed" | "confirmed" | "disputed" | "resolved";

export interface ProjectItem {
  id: number;
  projectId: number;
  projectCode: string;
  projectName: string;
}

export interface ApprovedTimesheet {
  projectTimesheetId: number;
  timesheetCode: string;
  timesheetName: string;
  timesheetType: number;
  timesheetTypeName: string;
  startDate: string | null;
  endDate: string | null;
  totalEmployees: number;
  approvedAt: string | null;
  approvedByName: string | null;
  isCreatedPayroll: boolean;
  payrollPeriodId: number | null;
}

export interface CalculationSummary {
  payrollPeriodId: number;
  periodCode: string;
  totalCalculated: number;
  totalGross: number;
  totalNet: number;
  totalDeduction: number;
  executionTimeMs: number;
  calculatedAt: string;
}

export interface PayrollPeriod {
  id: number;
  periodCode: string;
  projectId: number;
  projectCode: string;
  projectName: string;
  sourceTimesheetCode?: string | null;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  standardWorkdays: number;
  status: PayrollStatus;
  wfInstanceId?: number | null;
  wfCurrentStepOrder?: number | null;
  wfCurrentStepName?: string | null;
  wfStepDeadline?: string | null;
  totalEmployees: number;
  totalNet: number;
  totalDeduction?: number;
  disputeCount?: number;
  lockedAt?: string | null;
  lockedBy?: number | null;
  createdAt: string;
  createdByName?: string | null;
  updatedAt?: string | null;
  updatedByName?: string | null;
}

export interface PayrollSummary {
  payrollPeriodId: number;
  periodCode: string;
  totalEmployees: number;
  totalGross: number;
  totalNet: number;
  totalCompanyCost: number;
  totalTax: number;
  totalInsuranceEmployee: number;
  totalActualWorkdays: number;
  totalOvertimeHours: number;
}

export interface PayrollEmployeeSummary {
  payrollEmployeeId: number;
  payrollPeriodId: number;
  employeeCode: string;
  fullName: string;
  targetGroupCode?: string;
  actualWorkdays: number;
  totalHours: number;
  basicSalary?: number;
  hourlyNormalRate?: number;
  hourlyOtRate?: number;
  normalSalary?: number;
  nightShiftAllowance?: number;
  totalOvertime?: number;
  totalAllowance?: number;
  totalBonus?: number;
  mealAllowance?: number;
  attendanceBonus?: number;
  kpiBonus?: number;
  totalOtherIncome?: number;
  grossSalary: number;
  insuranceEmployee?: number;
  unionFee?: number;
  totalOtherDeduction?: number;
  totalDeduction: number;
  netSalary: number;
  calculatedAt?: string;
}

export interface PayslipEarning {
  componentCode: string;
  componentName: string;
  finalAmount: number;
  sign: number;
}

export interface PayslipDeduction {
  componentCode: string;
  componentName: string;
  finalAmount: number;
  sign: number;
}

export interface TimesheetDetail {
  workingDate: string;
  shiftName: string;
  checkIn: string;
  checkOut: string;
  workHours: number;
  dayHours: number;
  nightHours: number;
  overtimeHours: number;
  dayType: number;
}

export interface PayslipDetail {
  summary: {
    payrollEmployeeId: number;
    payrollPeriodId: number;
    employeeCode: string;
    fullName: string;
    actualWorkdays: number;
    paidWorkdays: number;
    totalHours: number;
    grossSalary: number;
    totalDeduction: number;
    netSalary: number;
  };
  earnings: PayslipEarning[];
  deductions: PayslipDeduction[];
  timesheetDetails: TimesheetDetail[];
}

export interface PayrollMatrixColumn {
  key: string;
  title: string;
  group: "INFO" | "DAILY_TIMESHEET" | "WORKDAYS" | "EARNINGS" | "TOTAL" | "DEDUCTIONS";
  dataType: "text" | "number" | "currency";
  isFixed: boolean;
}

export interface PayrollMatrix {
  payrollPeriodId: number;
  periodCode: string;
  projectName: string;
  month: number;
  year: number;
  standardWorkdays: number;
  columns: PayrollMatrixColumn[];
  rows: Record<string, any>[];
  totalRecords: number;
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
}

export interface WorkflowApprover {
  userId: number;
  employeeCode: string;
  fullName: string;
  roleName: string;
  email?: string;
}

export interface WorkflowInstance {
  id: number;
  entityType?: string;
  entityId?: number;
  status: WorkflowStatus | string;
  currentStepOrder: number;
  currentStepName: string;
  stepDeadline?: string | null;
  canApprove?: boolean;
  canReject?: boolean;
  currentApprovers?: WorkflowApprover[];
}

export interface WorkflowStep {
  instanceStepId?: number;
  stepOrder: number;
  stepName: string;
  actorType?: string;
  actorRef?: string;
  status: WorkflowStatus | string;
  deadlineAt?: string | null;
  isOverdue?: boolean;
  approvedByName?: string | null;
  approvedAt?: string | null;
  completedAt?: string | null;
  requiresDataInput?: boolean;
  assignedApprovers?: WorkflowApprover[];
}

export interface WorkflowHistory {
  stepOrder?: number;
  stepName?: string;
  action: string;
  actorName: string;
  comment?: string;
  note?: string;
  createdAt: string;
}

export interface WorkflowTimeline {
  instanceId?: number;
  status?: WorkflowStatus | string;
  currentStepOrder?: number;
  currentStepName?: string;
  canApprove?: boolean;
  canReject?: boolean;
  currentApprovers?: WorkflowApprover[];
  instance?: WorkflowInstance;
  steps: WorkflowStep[];
  history?: WorkflowHistory[];
  actionLogs?: WorkflowHistory[];
}

export interface ConfirmationItem {
  id: number;
  confirmationId?: number;
  payrollPeriodId?: number;
  employeeCode: string;
  fullName: string;
  status: ConfirmationStatus | string;
  viewedAt?: string | null;
  confirmedAt?: string | null;
  disputeReason?: string | null;
  disputeAt?: string | null;
  disputedAt?: string | null;
  resolvedBy?: number | string | null;
  resolvedByName?: string | null;
  resolvedNote?: string | null;
  resolvedAt?: string | null;
}

export type DisputeRecord = ConfirmationItem;

export interface ConfirmationStats {
  periodId?: number;
  periodCode?: string;
  totalEmployees?: number;
  total: number;
  published: number;
  viewed: number;
  confirmed: number;
  disputed: number;
  resolved?: number;
  items: ConfirmationItem[];
  disputes?: ConfirmationItem[];
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

