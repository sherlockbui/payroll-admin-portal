import type { PaginationMeta } from "@/lib/types";
import { getApiBaseUrl, getAuthToken } from "@/lib/api";
import type {
  ProjectItem,
  ApprovedTimesheet,
  CalculationSummary,
  PayrollPeriod,
  PayrollSummary,
  PayrollEmployeeSummary,
  PayslipDetail,
  PayrollMatrix,
  WorkflowTimeline,
  ConfirmationStats,
  PreviewRevenueResult,
} from "./payroll-types";

export class PayrollApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}

async function payrollRequest<T>(endpoint: string, init?: RequestInit): Promise<{ data: T; meta?: PaginationMeta }> {
  const rawBaseUrl = getApiBaseUrl();
  const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "").replace(/\/api\/?$/, "");
  const token = getAuthToken();

  const customHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "*/*",
    "ngrok-skip-browser-warning": "true",
  };
  if (token) {
    customHeaders["Authorization"] = `Bearer ${token}`;
  }

  const headers: HeadersInit = {
    ...customHeaders,
    ...(init?.headers as Record<string, string>),
  };

  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}/api/web/payroll${endpoint}`;
  const response = await fetch(url, { ...init, headers });
  let payload: any = {};
  try {
    payload = (await response.json()) as any;
  } catch {
    payload = { message: response.statusText || "Lỗi kết nối máy chủ" };
  }

  if (!response.ok || !payload.success) {
    const errorCode = payload.error?.code || payload.code || "UNKNOWN";
    throw new PayrollApiError(payload.message || "Yêu cầu thất bại", errorCode, response.status);
  }

  return { data: payload.data, meta: payload.meta };
}

export const payrollApi = {
  // 1.0 Danh sách Dự án theo phân quyền (Bearer JWT claims)
  getPayrollProjects: (params?: { search?: string }) => {
    const query = new URLSearchParams(
      Object.entries(params || {})
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)])
    );
    const qs = query.toString() ? `?${query.toString()}` : "";
    return payrollRequest<any>(`/projects${qs}`).then((res) => {
      const raw = res.data;
      if (Array.isArray(raw)) return raw as ProjectItem[];
      if (Array.isArray(raw?.items)) return raw.items as ProjectItem[];
      if (Array.isArray(raw?.data)) return raw.data as ProjectItem[];
      if (Array.isArray(raw?.rows)) return raw.rows as ProjectItem[];
      return [] as ProjectItem[];
    });
  },

  // 1.1 Danh sách Bảng công đã chốt
  getApprovedTimesheets: (params: { month: number; year: number; projectId?: number }) => {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    );
    return payrollRequest<any>(`/approved-timesheets?${query}`).then((res) => {
      const raw = res.data;
      if (Array.isArray(raw)) return raw as ApprovedTimesheet[];
      if (Array.isArray(raw?.items)) return raw.items as ApprovedTimesheet[];
      if (Array.isArray(raw?.data)) return raw.data as ApprovedTimesheet[];
      if (Array.isArray(raw?.rows)) return raw.rows as ApprovedTimesheet[];
      return [] as ApprovedTimesheet[];
    });
  },

  // 1.2 Danh sách bảng lương
  getPeriods: (params: { month: number; year: number; projectId?: number; status?: string; search?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)])
    );
    return payrollRequest<any>(`/periods?${query}`).then((res) => {
      const items = (res.data?.items ?? res.data?.data ?? []) as PayrollPeriod[];
      const total = res.data?.total ?? items.length;
      const page = res.data?.page ?? 1;
      const pageSize = res.data?.pageSize ?? 20;
      const totalPages = res.data?.totalPages ?? Math.ceil(total / (pageSize || 1));
      return { data: items, total, page, pageSize, totalPages };
    });
  },

  // 1.3 Xem thông tin chi tiết 1 kỳ lương
  getPeriodDetail: (id: number) =>
    payrollRequest<PayrollPeriod>(`/periods/${id}`).then((res) => res.data),

  // 2.1 Đồng bộ dữ liệu từ Bảng công đã duyệt
  syncTimesheet: (payload: { projectTimesheetId: number; payrollPeriodId?: number; forceResetManual?: boolean }) =>
    payrollRequest<any>("/periods/sync-timesheet", { method: "POST", body: JSON.stringify(payload) }).then((res) => res.data),

  // 2.2 Chạy tính toán bảng lương (hỗ trợ tính toàn bộ hoặc nhóm mã nhân viên)
  calculatePayroll: (id: number, employeeCodes?: string[] | null) => {
    const body: Record<string, any> = {};
    if (employeeCodes && employeeCodes.length > 0) {
      body.employeeCodes = employeeCodes;
    }
    return payrollRequest<CalculationSummary>(`/periods/${id}/calculate`, {
      method: "POST",
      body: JSON.stringify(body),
    }).then((res) => res.data);
  },

  // 2.3 Dashboard KPI tổng quan kỳ lương
  getSummary: (id: number) =>
    payrollRequest<PayrollSummary>(`/periods/${id}/summary`).then((res) => res.data),

  // 2.4 Danh sách nhân viên trong kỳ lương (Paged Result)
  getEmployees: (id: number, params?: { search?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams(
      Object.entries(params || {})
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)])
    );
    return payrollRequest<{ items: PayrollEmployeeSummary[]; page: number; pageSize: number; total: number; totalPages: number }>(
      `/periods/${id}/employees?${query}`
    ).then((res) => res.data);
  },

  // 2.5 Chi tiết Phiếu lương (Payslip) của 1 nhân viên
  getPayslipDetail: (id: number, employeeCode: string) =>
    payrollRequest<PayslipDetail>(`/periods/${id}/employees/${employeeCode}`).then((res) => res.data),

  // 2.6 Bảng lương đầy đủ cột động (Dynamic UI Grid)
  getPayrollMatrix: (id: number, params?: { search?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams(
      Object.entries(params || {})
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)])
    );
    return payrollRequest<PayrollMatrix>(`/periods/${id}/payroll-sheet?${query}`).then((res) => res.data);
  },

  // 2.7 Xuất file Excel Bảng lương chuẩn doanh nghiệp
  exportPayrollExcelUrl: (id: number) => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "").replace(/\/api\/?$/, "");
    return `${baseUrl}/api/web/payroll/periods/${id}/export`;
  },

  downloadPayrollExcel: async (id: number, filename?: string) => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "").replace(/\/api\/?$/, "");
    const token = getAuthToken();
    const headers: Record<string, string> = {
      "ngrok-skip-browser-warning": "true",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${baseUrl}/api/web/payroll/periods/${id}/export`, { headers });
    if (!response.ok) {
      throw new PayrollApiError("Không thể tải file Excel", "EXPORT_FAILED", response.status);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `BANG_LUONG_KY_${id}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // 3. Quy trình phê duyệt
  submitWorkflow: (id: number, note: string) =>
    payrollRequest<any>(`/periods/${id}/workflow/submit`, { method: "POST", body: JSON.stringify({ note }) }).then((res) => res.data),

  approveWorkflow: (id: number, payload: { note?: string; stepData?: any; justification?: string }) =>
    payrollRequest<any>(`/periods/${id}/workflow/approve`, { method: "POST", body: JSON.stringify(payload) }).then((res) => res.data),

  rejectWorkflow: (id: number, reason: string) =>
    payrollRequest<any>(`/periods/${id}/workflow/reject`, { method: "POST", body: JSON.stringify({ reason }) }).then((res) => res.data),

  // 3.4 Xem trước đối soát doanh thu (Preview Revenue)
  previewRevenue: (id: number, revenue: number) =>
    payrollRequest<PreviewRevenueResult>(`/periods/${id}/workflow/preview-revenue?revenue=${revenue}`).then((res) => res.data),

  getWorkflowTimeline: async (id: number): Promise<WorkflowTimeline | null> => {
    try {
      const res = await payrollRequest<any>(`/periods/${id}/workflow`);
      const data = res.data;
      if (!data) return null;

      const instance: WorkflowInstance = data.instance || {
        id: data.instanceId,
        entityType: "MONTHLY_PAYROLL",
        entityId: id,
        status: data.status,
        currentStepOrder: data.currentStepOrder,
        currentStepName: data.currentStepName,
        stepDeadline: data.stepDeadline ?? data.deadlineAt ?? null,
        canApprove: data.canApprove,
        canReject: data.canReject,
        currentApprovers: data.currentApprovers || [],
      };

      const history = data.history || (data.actionLogs || []).map((log: any) => ({
        stepOrder: log.stepOrder,
        stepName: log.stepName,
        action: log.action,
        actorName: log.actorName,
        comment: log.note || log.comment || "",
        note: log.note || log.comment || "",
        createdAt: log.createdAt,
      }));

      const steps = (data.steps || []).map((s: any) => ({
        ...s,
        completedAt: s.completedAt || s.approvedAt,
      }));

      return {
        ...data,
        instance,
        steps,
        history,
      };
    } catch (err: any) {
      if (err instanceof PayrollApiError && (err.status === 404 || err.code === "NOT_FOUND")) {
        return null;
      }
      throw err;
    }
  },

  // 5. Quản lý xác nhận
  getConfirmationStats: (id: number, params?: { status?: string; search?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams(
      Object.entries(params || {})
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)])
    );
    return payrollRequest<ConfirmationStats>(`/periods/${id}/confirmations?${query}`).then((res) => {
      const data = res.data;
      if (data) {
        if (!data.items && (data as any).disputes) {
          data.items = (data as any).disputes;
        }
        if (!data.disputes && data.items) {
          data.disputes = data.items;
        }
      }
      return data;
    });
  },

  resolveDispute: (id: number, confirmationId: number, resolvedNote: string) =>
    payrollRequest<any>(`/periods/${id}/confirmations/${confirmationId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolvedNote }),
    }).then((res) => res.data),
};
