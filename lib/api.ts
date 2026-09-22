import type {
  ActivityLogItem,
  ActivityLogModule,
  ApiResponse,
  AttendanceConfig,
  DataMapping,
  Dependent,
  Employee,
  FormulaVariable,
  InsuranceChangeRecord,
  InsuranceRecord,
  LeaveHistoryItem,
  LeaveRecord,
  OvertimeType,
  PaginationMeta,
  PolicyDefinition,
  Project,
  ProjectCustomVariable,
  ProjectOvertimeConfig,
  ProjectPolicy,
  SalaryFormula,
  StandardWorkdayRecord,
  TaxConfigRecord,
  TestEmployee,
  TestRunResult,
  UnionFeeRecord,
  EmployeePolicyItem,
  EmployeePolicyRecord,
  ProjectEmployeeGroup,
  ProjectPoliciesResponseData,
  OtherDeductionRecord,
  OtherIncomeRecord,
  SalaryStructure,
  SalaryStructurePayload,
  SalaryComponentMaster,
  SalaryStructureLine,
  SalaryStructureLineItemRequest,
  ProjectVariableItemRequest,
  BackendVariable,
  ProjectVariableResponse,
  AuditLogListResponseV3,
  AuditLogV3,
  CreateDependentRequestV3,
  DependentDetailV3,
  DependentDocument,
  DependentListResponseV3,
  DependentSummaryResponseV3,
  DocumentTypeCode,
  DocumentTypeItem,
  ImportDependentResponseV3,
  RelationshipItem,
  RelationshipCode,
  DependentStatusV3,
  UpdateDependentRequestV3,
  AnnualLeaveEmployee,
  AnnualLeaveHistoryItemV3,
  AnnualLeaveHistoryResponse,
  AnnualLeaveListResponse,
  AnnualLeaveSummaryResponse,
  AnnualLeaveViewFilter,
  EmploymentType,
  UnionMemberItemV3,
  UnionDuesMemberV3,
  UnionHistoryItemV3,
  UnionAuditLogItemV3,
  UnionListResponseV3,
  UnionHistoryResponseV3,
  UnionDuesHistoryResponse,
  UnionDuesListResponse,
  UnionDuesSummaryResponse,
  UnionParticipationStatus,
  UnionDuesParticipationStatus,
  RegisterUnionRequest,
  UpdateUnionContributionRequest,
  DeactivateUnionRequest,
  UpdateUnionDuesRequestV3,
  StandardWorkdayEmployeeV3,
  StandardWorkdayMode,
  UpdateStandardWorkdayRequestV3,
  StandardWorkdaySummaryResponse,
  StandardWorkdayListResponse,
  InsuranceParticipantItemV3,
  InsuranceChangeItemV3,
  CreateInsuranceChangeRequest,
  ConfirmInsuranceChangeRequest,
  MedicalFacilityItemV3,
  InsuranceContributionPreview,
  InsuranceParticipantListResponseV3,
  InsuranceChangeListResponseV3,
  InsuranceSummaryResponseV3,
  InsuranceParticipationStatus,
  InsuranceChangeType,
  InsuranceChangeStatus,
  SocialInsuranceMemberV3,
  SocialInsuranceChangeV3,
  SocialInsuranceChangeType,
  SocialInsuranceChangeStatus,
  SocialInsuranceParticipationStatus,
  SocialInsuranceSummaryResponse,
  SocialInsuranceMemberListResponse,
  SocialInsuranceChangeListResponse,
  BenefitsAllowanceEmployeeV3,
  BenefitsAllowanceMode,
  UpdateBenefitsAllowanceRequestV3,
  BenefitsAllowanceSummaryResponse,
  BenefitsAllowanceListResponse,
  EmployeeAllowanceItemV3,
  OtherDeductionTypeItem,
  OtherDeductionItemV3,
  OtherDeductionV3,
  OtherDeductionType,
  CreateOtherDeductionRequest,
  CreateOtherDeductionRequestV3,
  UpdateOtherDeductionRequest,
  SaveOtherDeductionDocumentRequest,
  OtherDeductionsSummaryResponse,
  OtherIncomeTypeItem,
  OtherIncomeItemV3,
  OtherIncomeV3,
  OtherIncomeType,
  CreateOtherIncomeRequest,
  CreateOtherIncomeRequestV3,
  UpdateOtherIncomeRequest,
  SaveOtherIncomeDocumentRequest,
  OtherIncomesSummaryResponse,
  OtherIncomesListResponseV3,
  OtherIncomesListResponse,
} from "@/lib/types";

import { handlers } from "@/mocks/handlers";
import { formatDate } from "@/lib/utils";
import { seedDatabase } from "@/lib/mock-data";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    if ((window as any).API_BASE_URL) return (window as any).API_BASE_URL;
    const widget = document.querySelector("payroll-projects, payroll-widget, payroll-employees, payroll-runs");
    const attrUrl = widget?.getAttribute("api-base-url");
    if (attrUrl) return attrUrl;
  }
  return "https://bruh.thanhf.dev/api/";
}

export function getAuthToken(): string {
  if (typeof window !== "undefined") {
    if ((window as any).__SERVER_TOKEN) return (window as any).__SERVER_TOKEN;
    const widget = document.querySelector("payroll-projects, payroll-widget, payroll-employees, payroll-runs");
    const attrToken = widget?.getAttribute("auth-token");
    if (attrToken) return attrToken;
  }
  return "";
}

async function runInMemoryMock<T>(url: string, init?: RequestInit): Promise<{ data: T; meta?: PaginationMeta }> {
  const baseOrigin =
    typeof window !== "undefined" && window.location && window.location.origin && window.location.origin !== "null"
      ? window.location.origin
      : "http://localhost";
  const fullUrl = url.startsWith("http") ? url : new URL(url, baseOrigin).href;
  const req = new Request(fullUrl, init);
  for (const handler of handlers) {
    const result = await (handler as any).run({ request: req });
    if (result && result.response) {
      const payload = (await result.response.json()) as ApiResponse<T>;
      if (!result.response.ok || payload.error) {
        throw new ApiRequestError(
          payload.error?.message ?? "Yêu cầu thất bại",
          payload.error?.code ?? "UNKNOWN_ERROR",
          result.response.status,
          payload.error?.fields
        );
      }
      return { data: payload.data, meta: payload.meta };
    }
  }
  throw new ApiRequestError("Không tìm thấy handler mock phù hợp", "NOT_FOUND", 404);
}

async function request<T>(url: string, init?: RequestInit): Promise<{ data: T; meta?: PaginationMeta }> {
  const isVitest = typeof process !== "undefined" && (process.env.VITEST === "true" || process.env.NODE_ENV === "test");
  const isExplicitMock = typeof window !== "undefined" && ((window as any).__USE_MOCK__ === true || (window as any).USE_MOCK === true);

  // 1. Chạy in-memory MSW khi ở môi trường test tự động (Vitest) hoặc khi chủ động bật mock
  if (isVitest || isExplicitMock) {
    return runInMemoryMock<T>(url, init);
  }

  // 2. Môi trường Browser: Luôn gửi HTTP fetch thật ra ngoài network để DevTools ghi nhận
  try {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();

    let targetUrl = url;
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      const cleanPath = targetUrl.startsWith("/api") ? targetUrl.substring(4) : targetUrl;
      targetUrl = `${baseUrl}${cleanPath.startsWith("/") ? cleanPath : "/" + cleanPath}`;
    }

    const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
    const headers: Record<string, string> = {
      Accept: "*/*",
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers as Record<string, string> || {}),
    };
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(targetUrl, {
      ...init,
      headers,
    });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new ApiRequestError(
        `Máy chủ phản hồi không đúng định dạng (${response.status} ${response.statusText})`,
        "INVALID_RESPONSE",
        response.status
      );
    }
    const payload = (await response.json()) as any;
    if (!response.ok || payload.error || payload.success === false) {
      throw new ApiRequestError(
        payload.error?.message || payload.message || "Yêu cầu thất bại",
        payload.error?.code || payload.errorCode || "API_ERROR",
        response.status,
        payload.error?.fields
      );
    }
    return { data: payload.data !== undefined ? payload.data : payload, meta: payload.meta };
  } catch (err) {
    if (err instanceof ApiRequestError) throw err;
    throw new ApiRequestError(
      err instanceof Error ? err.message : "Lỗi kết nối máy chủ",
      "NETWORK_ERROR",
      500
    );
  }
}

const cachedProjectsMap = new Map<string, Project>();


export const api = {
  getLookupProjects: async (): Promise<Array<{ id: string; code: string; name: string }>> => {
    // 1. Kiểm tra cache window.__SERVER_PROJECTS (nếu có từ môi trường host)
    if (typeof window !== "undefined") {
      const serverProjects = (window as any).__SERVER_PROJECTS;
      if (Array.isArray(serverProjects) && serverProjects.length > 0) {
        return serverProjects.map((p: any) => ({
          id: String(p.id ?? p.ProjectId ?? p.Id ?? ""),
          code: String(p.code ?? p.ProjectCode ?? "").trim(),
          name: String(p.name ?? p.ProjectName ?? p.code ?? `Dự án #${p.id}`).trim(),
        }));
      }
    }

    // 2. Tải trực tiếp từ WebPayroll Projects API
    try {
      const rawBaseUrl = getApiBaseUrl();
      const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
      const token = getAuthToken();
      const headers: Record<string, string> = { Accept: "*/*" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${baseUrl}/web/payroll/projects?pageSize=100`, { headers });
      if (res.ok) {
        const json: any = await res.json();
        const dataObj = json.data || {};
        const rawItems: any[] = Array.isArray(dataObj.items) ? dataObj.items : Array.isArray(dataObj) ? dataObj : [];
        if (rawItems.length > 0) {
          return rawItems.map((p) => ({
            id: String(p.projectId ?? p.id ?? ""),
            code: String(p.projectCode ?? "").trim(),
            name: String(p.projectName ?? p.projectCode ?? `Dự án #${p.projectId}`).trim(),
          }));
        }
      }
    } catch {
      // Fallback
    }

    return [
      { id: "1049", code: "PRJ-1049", name: "Dự án #1049" },
      { id: "1115", code: "ABB-MT", name: "Khu vực Abbott" },
      { id: "1104", code: "AJN-LT", name: "Khu vực Ajinomoto Long Thành" },
      { id: "1038", code: "BCS-BH", name: "Khu vực BCS Biên Hòa" },
    ];
  },
  getProjects: async (params: { q?: string; status?: string; page?: number; pageSize?: number }) => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const search = params.q ?? "";
    const pageIndex = params.page ?? 1;
    const pageSize = params.pageSize ?? 12;

    const query = new URLSearchParams();
    if (search) query.set("search", search);
    query.set("pageIndex", String(pageIndex));
    query.set("pageSize", String(pageSize));

    const url = `${baseUrl}/web/payroll/projects?${query.toString()}`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể tải danh sách dự án (Status: ${response.status})`,
        "FETCH_PROJECTS_FAILED",
        response.status
      );
    }
    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi lấy dữ liệu danh sách dự án",
        "API_ERROR",
        response.status
      );
    }

    const dataObj = resJson.data || {};
    const rawItems: any[] = Array.isArray(dataObj.items) ? dataObj.items : Array.isArray(dataObj) ? dataObj : [];
    const totalRow: number = typeof dataObj.totalRow === "number" ? dataObj.totalRow : rawItems.length;
    const currentPage: number = typeof dataObj.pageIndex === "number" ? dataObj.pageIndex : pageIndex;
    const currentPageSize: number = typeof dataObj.pageSize === "number" ? dataObj.pageSize : pageSize;
    const totalPages = Math.max(1, Math.ceil(totalRow / (currentPageSize || 1)));

    const items: Project[] = rawItems.map((item: any) => {
      const startCycle = item.payrollCycleStartDate;
      const endCycle = item.payrollCycleEndDate;
      let cycle = "Hàng tháng";
      if (startCycle && endCycle) {
        cycle = `${formatDate(startCycle)} - ${formatDate(endCycle)}`;
      } else if (startCycle) {
        cycle = `Từ ${formatDate(startCycle)}`;
      }

      return {
        id: String(item.projectId ?? item.id ?? ""),
        code: item.projectCode || "",
        name: item.projectName || "",
        client: item.projectName || "",
        location: "",
        manager: item.ownerName || "Chưa phân công",
        managerEmail: item.ownerEmail || undefined,
        managerPhone: item.ownerPhone || undefined,
        employeeCount: typeof item.totalActiveEmployees === "number" ? item.totalActiveEmployees : 0,
        status: "active",
        payrollCycle: cycle,
        payrollCycleStartDate: startCycle || undefined,
        payrollCycleEndDate: endCycle || undefined,
        effectiveFrom: "2026-01-01",
        templateName: "Quy chuẩn",
        updatedAt: new Date().toISOString(),
        tabStates: {
          overview: "complete",
          policies: "complete",
          attendance: "complete",
          formulas: "complete",
        },
      };
    });

    // Cache tất cả dự án để sử dụng trực tiếp trong detail mà không cần gọi API riêng
    for (const p of items) {
      cachedProjectsMap.set(p.id, p);
      if (p.code) cachedProjectsMap.set(p.code, p);
    }

    return {
      data: items,
      meta: {
        page: currentPage,
        pageSize: currentPageSize,
        total: totalRow,
        totalPages: totalPages,
      },
    };
  },
  createProject: (payload: Partial<Project>) => request<Project>("/api/projects", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  getProject: async (id: string): Promise<Project> => {
    // 1. Lấy trực tiếp từ cache danh sách dự án
    const cached = cachedProjectsMap.get(String(id));
    if (cached) return cached;

    // 2. Nếu chưa có trong cache (F5 trực tiếp trang detail), lấy từ danh sách dự án
    try {
      const listRes = await api.getProjects({ pageSize: 100 });
      const found = listRes.data.find((p) => String(p.id) === String(id) || String(p.code) === String(id));
      if (found) return found;
    } catch {
      // Fallback
    }

    return {
      id: String(id),
      code: `PRJ-${id}`,
      name: `Dự án #${id}`,
      client: `Dự án #${id}`,
      location: "",
      manager: "Chưa phân công",
      employeeCount: 0,
      status: "active",
      payrollCycle: "Hàng tháng",
      effectiveFrom: "2026-01-01",
      templateName: "Quy chuẩn",
      updatedAt: new Date().toISOString(),
      tabStates: {
        overview: "complete",
        policies: "complete",
        attendance: "complete",
        formulas: "complete",
      },
    };
  },
  updateProject: (id: string, payload: Partial<Project>) => request<Project>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(payload) }).then((item) => item.data),
  cloneProject: (id: string) => request<Project>(`/api/projects/${id}/clone`, { method: "POST" }).then((item) => item.data),
  getPolicyDefinitions: async (
    params?:
      | {
          projectId?: string | number;
          search?: string;
          pageIndex?: number;
          pageSize?: number;
        }
      | string
      | number
  ): Promise<{
    items: PolicyDefinition[];
    totalRow: number;
    pageIndex: number;
    pageSize: number;
  }> => {
    let projectId: string | number | undefined;
    let search: string | undefined;
    let pageIndex = 1;
    let pageSize = 20;

    if (typeof params === "object" && params !== null) {
      projectId = params.projectId;
      search = params.search;
      pageIndex = params.pageIndex ?? 1;
      pageSize = params.pageSize ?? 20;
    } else if (params !== undefined) {
      projectId = params;
    }

    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const query = new URLSearchParams();
    if (projectId !== undefined && projectId !== null && String(projectId).trim() !== "") {
      query.set("projectId", String(projectId).trim());
    }
    if (search && search.trim()) {
      query.set("search", search.trim());
    }
    query.set("pageIndex", String(pageIndex));
    query.set("pageSize", String(pageSize));

    const queryString = query.toString();
    const url = `${baseUrl}/web/payroll/policies${queryString ? `?${queryString}` : ""}`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể tải danh mục chế độ (Status: ${response.status})`,
        "FETCH_POLICIES_FAILED",
        response.status
      );
    }
    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi lấy danh mục chế độ",
        "API_ERROR",
        response.status
      );
    }

    const dataObj = resJson.data || {};
    const rawItems: any[] = Array.isArray(dataObj.items)
      ? dataObj.items
      : Array.isArray(dataObj.rows)
      ? dataObj.rows
      : Array.isArray(dataObj)
      ? dataObj
      : Array.isArray(resJson.data)
      ? resJson.data
      : [];
    const totalRow: number = typeof dataObj.totalRow === "number" ? dataObj.totalRow : rawItems.length;
    const currentPageIndex: number = typeof dataObj.pageIndex === "number" ? dataObj.pageIndex : pageIndex;
    const currentPageSize: number = typeof dataObj.pageSize === "number" ? dataObj.pageSize : pageSize;

    const items: PolicyDefinition[] = rawItems.map((item: any) => {
      const isPercentage = item.dataType === "percentage" || String(item.typeName).toLowerCase().includes("phần trăm");
      return {
        id: String(item.id),
        code: item.policyCode || "",
        name: item.policyName || "",
        category: (isPercentage ? "bonus" : "allowance") as "allowance" | "bonus" | "deduction",
        description: item.description || item.typeName || "",
        fields: [
          {
            key: isPercentage ? "multiplier" : "amount",
            label: item.policyName || "",
            type: (isPercentage ? "percentage" : "money") as "percentage" | "money",
            unit: isPercentage ? "%" : "VNĐ/tháng",
            defaultValue: 0,
          },
        ],
        targetValues: {},
      };
    });

    return {
      items,
      totalRow,
      pageIndex: currentPageIndex,
      pageSize: currentPageSize,
    };
  },
  addPoliciesToProject: async (
    projectId: string,
    payload: {
      PolicyItemIds: number[];
      EffectiveFrom: string;
      EffectiveTo?: string;
    }
  ) => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/policies`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        PolicyItemIds: payload.PolicyItemIds,
        EffectiveFrom: payload.EffectiveFrom,
        EffectiveTo: payload.EffectiveTo || payload.EffectiveFrom,
      }),
    });

    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể thêm chế độ vào dự án (Status: ${response.status})`,
        "ADD_POLICIES_FAILED",
        response.status
      );
    }

    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi thêm chế độ vào dự án",
        "API_ERROR",
        response.status
      );
    }

    return resJson.data;
  },
  getProjectPolicies: async (
    id: string,
    params?: { pageIndex?: number; pageSize?: number; search?: string }
  ): Promise<ProjectPoliciesResponseData> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const pageIndex = params?.pageIndex ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const search = params?.search ?? "";

    const query = new URLSearchParams();
    query.set("pageIndex", String(pageIndex));
    query.set("pageSize", String(pageSize));
    if (search) query.set("search", search);

    const url = `${baseUrl}/web/payroll/projects/${id}/policies?${query.toString()}`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể tải danh sách chế độ dự án (Status: ${response.status})`,
        "FETCH_PROJECT_POLICIES_FAILED",
        response.status
      );
    }
    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi lấy danh sách chế độ dự án",
        "API_ERROR",
        response.status
      );
    }

    const data = resJson.data || {};
    return {
      columns: Array.isArray(data.columns) ? data.columns : [],
      rows: Array.isArray(data.rows) ? data.rows : [],
      pageIndex: typeof data.pageIndex === "number" ? data.pageIndex : pageIndex,
      pageSize: typeof data.pageSize === "number" ? data.pageSize : pageSize,
      totalRow: typeof data.totalRow === "number" ? data.totalRow : (data.rows?.length ?? 0),
    };
  },
  updateProjectPolicyValues: async (
    projectId: string,
    payload: Array<{
      PolicyId: number | string;
      EffectiveFrom: string;
      EffectiveTo?: string;
      Note?: string;
      Values: Array<{
        TargetGroupId: number | string;
        PolicyValue: string;
      }>;
    }>
  ) => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/policies`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const bodyData = payload.map((item) => ({
      PolicyId: Number(item.PolicyId),
      EffectiveFrom: item.EffectiveFrom,
      EffectiveTo: item.EffectiveTo || item.EffectiveFrom,
      Note: item.Note ?? "",
      Values: item.Values.map((v) => ({
        TargetGroupId: Number(v.TargetGroupId),
        PolicyValue: String(v.PolicyValue ?? ""),
      })),
    }));

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(bodyData),
    });

    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể cập nhật chế độ (Status: ${response.status})`,
        "UPDATE_POLICY_FAILED",
        response.status
      );
    }

    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi cập nhật chế độ",
        "API_ERROR",
        response.status
      );
    }

    return resJson;
  },
  deleteProjectPolicy: async (projectId: string, policyId: string | number) => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/policies/${policyId}`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể bỏ chế độ khỏi dự án (Status: ${response.status})`,
        "DELETE_POLICY_FAILED",
        response.status
      );
    }

    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi xóa chế độ khỏi dự án",
        "API_ERROR",
        response.status
      );
    }

    return resJson;
  },
  getAttendanceConfig: (id: string) => request<AttendanceConfig>(`/api/projects/${id}/attendance-config`).then((item) => item.data),
  saveAttendanceConfig: (id: string, payload: AttendanceConfig) => request<AttendanceConfig>(`/api/projects/${id}/attendance-config`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  getOvertimeTypes: () => request<OvertimeType[]>("/api/overtime-types").then((item) => item.data),
  getOvertimeConfigs: (id: string) => request<ProjectOvertimeConfig[]>(`/api/projects/${id}/overtime-configs`).then((item) => item.data),
  saveOvertimeConfigs: (id: string, payload: ProjectOvertimeConfig[]) => request<ProjectOvertimeConfig[]>(`/api/projects/${id}/overtime-configs`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  getFormulaVariables: async () => {
    try {
      const all = await api.getAllVariables();
      return all.map((v) => ({
        code: v.code,
        name: v.name,
        group: (v.group as FormulaVariable["group"]) || "employee",
        unit: v.unit || "đ",
        description: v.description || undefined,
        defaultValue: v.defaultValue !== null && v.defaultValue !== undefined ? Number(v.defaultValue) : undefined,
        sampleValue: v.defaultValue !== null && v.defaultValue !== undefined ? Number(v.defaultValue) : 0,
        isCustom: !v.isSystem,
      }));
    } catch {
      return [];
    }
  },
  getProjectCustomVariables: async (id: string) => {
    try {
      const prj = await api.getProjectVariables(id);
      return prj.map((pv) => ({
        id: String(pv.id || pv.variableId),
        projectId: id,
        variableId: pv.variableId,
        code: pv.code || `VAR_${pv.variableId}`,
        name: pv.name || pv.code,
        description: pv.description || undefined,
        unit: pv.unit || "đ",
        value: pv.value !== null && pv.value !== undefined && pv.value !== "" ? Number(pv.value) : null,
        defaultValue: pv.defaultValue !== null && pv.defaultValue !== undefined ? Number(pv.defaultValue) : undefined,
        updatedAt: pv.effectiveFrom || undefined,
      }));
    } catch {
      return [];
    }
  },
  saveProjectCustomVariables: (id: string, payload: Array<{ code: string; value: number | null }>) => request<ProjectCustomVariable[]>(`/api/projects/${id}/custom-variables`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  getFormulas: (id: string) => request<SalaryFormula[]>(`/api/projects/${id}/formulas`).then((item) => item.data),
  saveFormulas: (id: string, payload: SalaryFormula[]) => request<SalaryFormula[]>(`/api/projects/${id}/formulas`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  validateFormulas: (id: string, payload: SalaryFormula[]) => request<{ valid: boolean; errors: string[] }>(`/api/projects/${id}/formulas/validate`, { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  getDataMappings: (id: string) => request<DataMapping[]>(`/api/projects/${id}/data-mappings`).then((item) => item.data),
  saveDataMappings: (id: string, payload: DataMapping[]) => request<DataMapping[]>(`/api/projects/${id}/data-mappings`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  validateDataMappings: (id: string) => request<{ valid: boolean; issues: string[]; checkedAt: string }>(`/api/projects/${id}/data-mappings/validate`, { method: "POST" }).then((item) => item.data),
  getTestEmployees: () => request<TestEmployee[]>("/api/test-employees").then((item) => item.data),
  runTest: (id: string, payload: { employeeId: string; period: string }) => request<TestRunResult>(`/api/projects/${id}/test-runs`, { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),

  getProjectEmployees: async (
    projectId: string,
    params?: {
      pageIndex?: number;
      pageSize?: number;
      search?: string;
      isAssigned?: boolean;
      groupId?: number | string;
    }
  ): Promise<{ items: Employee[]; totalRow: number; pageIndex: number; pageSize: number }> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const pageIndex = params?.pageIndex ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const search = (params?.search || "").trim();

    const query = new URLSearchParams();
    query.set("pageIndex", String(pageIndex));
    query.set("pageSize", String(pageSize));
    if (search) query.set("search", search);
    if (params?.isAssigned !== undefined) query.set("isAssigned", String(params.isAssigned));
    if (
      params?.groupId !== undefined &&
      params?.groupId !== null &&
      String(params.groupId) !== "" &&
      String(params.groupId) !== "all" &&
      String(params.groupId) !== "unassigned"
    ) {
      query.set("groupId", String(params.groupId));
    }

    const url = `${baseUrl}/web/payroll/projects/${projectId}/employees?${query.toString()}`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể tải danh sách nhân viên dự án (Status: ${response.status})`,
        "FETCH_PROJECT_EMPLOYEES_FAILED",
        response.status
      );
    }
    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi lấy danh sách nhân sự",
        "API_ERROR",
        response.status
      );
    }

    const dataObj = resJson.data || {};
    const rawItems: any[] = Array.isArray(dataObj.items)
      ? dataObj.items
      : Array.isArray(dataObj.rows)
      ? dataObj.rows
      : Array.isArray(dataObj)
      ? dataObj
      : Array.isArray(resJson.data)
      ? resJson.data
      : [];
    const totalRow: number = typeof dataObj.totalRow === "number" ? dataObj.totalRow : rawItems.length;
    const currentPageIndex: number = typeof dataObj.pageIndex === "number" ? dataObj.pageIndex : pageIndex;
    const currentPageSize: number = typeof dataObj.pageSize === "number" ? dataObj.pageSize : pageSize;

    const items: Employee[] = rawItems.map((item: any) => {
      const code = item.employeeCode || item.code || "";
      const rawGroupId = item.currentGroupId ?? item.groupId ?? item.targetGroupId ?? item.employeeGroupId;
      const rawGroupName = item.currentGroupName ?? item.groupName ?? item.targetGroupName ?? item.employeeGroupName;
      const parsedGroupId = (rawGroupId !== null && rawGroupId !== undefined && String(rawGroupId).trim() !== "" && String(rawGroupId) !== "0")
        ? String(rawGroupId)
        : undefined;

      return {
        id: String(code || item.id || item.employeeId || ""),
        code: code,
        name: item.fullName || item.name || "",
        gender: item.gender || "",
        idCard: item.idNumber || item.idCard || "",
        phone: item.phoneNumber || item.phone || "",
        email: item.email || "",
        projectId: String(item.projectId ?? projectId),
        projectCode: item.projectCode || "",
        department: item.departmentName || item.department || "",
        position: item.positionName || item.position || "",
        joinDate: item.joinDate || "",
        resignationDate: item.resignationDate || undefined,
        status: (item.status === "ACTIVE" || item.status === "active") ? "active" : (item.status === "TERMINATED" || item.status === "resigned") ? "resigned" : "probation",
        groupId: parsedGroupId,
        groupName: rawGroupName ? String(rawGroupName) : undefined,
      };
    });

    return {
      items,
      totalRow,
      pageIndex: currentPageIndex,
      pageSize: currentPageSize,
    };
  },

  // ================= OpenAPI 3.0 (01-nguoi-phu-thuoc.yaml) Methods =================
  getPayrollCyclesV3: () =>
    request<Array<{ id: number; code: string; name: string; isCurrent: boolean; startDate?: string; endDate?: string }>>("/api/web/payroll/payroll-cycles").then((res) => res.data),

  getProjectsV3: async (): Promise<Array<{ projectId: number; projectCode: string; projectName: string; active?: boolean }>> => {
    try {
      const rawBaseUrl = getApiBaseUrl();
      const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
      const token = getAuthToken();
      const headers: Record<string, string> = { Accept: "*/*" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${baseUrl}/web/payroll/projects?pageSize=100`, { headers });
      if (res.ok) {
        const json: any = await res.json();
        const dataObj = json.data || {};
        const rawItems: any[] = Array.isArray(dataObj.items) ? dataObj.items : Array.isArray(dataObj) ? dataObj : [];
        return rawItems.map((item: any) => ({
          projectId: Number(item.projectId ?? item.id ?? 0),
          projectCode: item.projectCode || "",
          projectName: item.projectName || "",
          active: true,
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  getProjectEmployeesV3: async (projectId?: number | string) => {
    try {
      const rawBaseUrl = getApiBaseUrl();
      const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
      const token = getAuthToken();
      const headers: Record<string, string> = { Accept: "*/*" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      let targetProjectId = projectId;
      if (!targetProjectId || targetProjectId === "all") {
        const projects = await api.getProjectsV3();
        if (projects && projects.length > 0) {
          targetProjectId = (projects[0] as any).projectId ?? (projects[0] as any).id;
        }
      }
      if (!targetProjectId || targetProjectId === "all") return [];

      const res = await fetch(`${baseUrl}/web/payroll/projects/${targetProjectId}/employees`, { headers });
      if (res.ok) {
        const json: any = await res.json();
        const dataObj = json.data || {};
        const rawItems: any[] = Array.isArray(dataObj.items) ? dataObj.items : Array.isArray(dataObj) ? dataObj : [];
        return rawItems.map((item: any) => ({
          employeeCode: item.employeeCode || item.code || "",
          fullName: item.fullName || item.name || "",
          gender: item.gender,
          projectId: Number(item.projectId ?? targetProjectId),
          projectCode: item.projectCode || "",
          projectName: item.projectName || "",
          positionName: item.positionName || item.position || "",
          taxCode: item.taxCode || "",
          idNumber: item.idNumber || "",
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  getDependentRelationshipsV3: async (): Promise<RelationshipItem[]> => [
    { code: "CON_RUOT_NUOI", name: "Con ruột / Con nuôi", requiresDocument: true },
    { code: "VO_CHONG", name: "Vợ / Chồng", requiresDocument: true },
    { code: "CHA_ME_DE", name: "Cha mẹ đẻ", requiresDocument: true },
    { code: "CHA_ME_VO_CHONG", name: "Cha mẹ vợ / Cha mẹ chồng", requiresDocument: true },
    { code: "NGUOI_NUOI_DUONG_HOP_PHAP", name: "Người nuôi dưỡng hợp pháp", requiresDocument: true },
    { code: "KHAC", name: "Khác", requiresDocument: false },
  ],

  getDependentDocumentTypesV3: (): Promise<DocumentTypeItem[]> =>
    request<any[]>("/api/web/payroll/dependent-document-types")
      .then((res) => {
        const raw = Array.isArray(res.data) ? res.data : [];
        return raw.map((item: any) => ({
          code: (item.documentTypeCode || item.code) as DocumentTypeCode,
          name: (item.documentTypeName || item.name) as string,
          id: item.id,
          isRequired: item.isRequired,
        }));
      })
      .catch(() => [
        { code: "GKS", name: "Giấy khai sinh" },
        { code: "CCCD", name: "Căn cước công dân" },
        { code: "GDKKH", name: "Giấy chứng nhận kết hôn" },
        { code: "SHK", name: "Sổ hộ khẩu" },
        { code: "GXN_KHUYETTAT", name: "Giấy xác nhận khuyết tật" },
        { code: "GXN_SINHVIEN", name: "Giấy xác nhận sinh viên" },
        { code: "BAN_CAM_KET", name: "Bản cam kết" },
      ] as DocumentTypeItem[]),

  getDependentsSummaryV3: async (projectId?: string | number): Promise<DependentSummaryResponseV3> => {
    try {
      const res = await api.getDependentsV3({
        projectId: projectId && projectId !== "all" ? String(projectId) : undefined,
        pageSize: 100,
      });
      const items = res.items || [];
      const total = res.total || items.length;
      const pendingCount = items.filter((d) => d.status === "PENDING").length;
      const approvedCount = items.filter((d) => d.status === "APPROVED").length;
      const rejectedCount = items.filter((d) => d.status === "REJECTED").length;
      const draftCount = items.filter((d) => d.status === "DRAFT").length;
      return {
        total,
        counts: [
          { status: "PENDING", count: pendingCount, label: "Chờ phê duyệt" },
          { status: "APPROVED", count: approvedCount, label: "Đã phê duyệt" },
          { status: "REJECTED", count: rejectedCount, label: "Bị từ chối" },
          { status: "DRAFT", count: draftCount, label: "Bản nháp" },
        ],
      };
    } catch {
      return {
        total: 0,
        counts: [
          { status: "PENDING", count: 0, label: "Chờ phê duyệt" },
          { status: "APPROVED", count: 0, label: "Đã phê duyệt" },
          { status: "REJECTED", count: 0, label: "Bị từ chối" },
          { status: "DRAFT", count: 0, label: "Bản nháp" },
        ],
      };
    }
  },

  getDependentsV3: (params?: { projectId?: string | number; search?: string; keyword?: string; relationship?: string; status?: string; employeeCode?: string; page?: number; pageIndex?: number; pageSize?: number }) => {
    const queryParams: Record<string, string> = {};
    if (params?.projectId && params.projectId !== "all") queryParams.projectId = String(params.projectId);
    if (params?.keyword || params?.search) queryParams.keyword = String(params.keyword || params.search);
    if (params?.relationship && params.relationship !== "all") queryParams.relationship = String(params.relationship);
    if (params?.status && params.status !== "all") queryParams.status = String(params.status);
    if (params?.employeeCode) queryParams.employeeCode = String(params.employeeCode);
    queryParams.pageIndex = String(params?.pageIndex || params?.page || 1);
    queryParams.pageSize = String(params?.pageSize || 10);
    const query = new URLSearchParams(queryParams);
    return request<any>(`/api/web/payroll/dependents?${query}`).then((res) => {
      const d = res.data || {};
      const total = Number(d.totalRow ?? d.total ?? d.totalCount ?? (Array.isArray(d.items) ? d.items.length : 0));
      const pageSize = Number(d.pageSize || params?.pageSize || 10);
      const page = Number(d.pageIndex || d.page || params?.pageIndex || params?.page || 1);
      const totalPages = Math.max(1, Math.ceil(total / (pageSize || 10)));
      const rawList = Array.isArray(d.items) ? d.items : Array.isArray(d) ? d : [];
      const items: DependentDetailV3[] = rawList.map((item: any) => {
        const emp = item.employee || {};
        const rawStatus = String(item.status || item.Status || "PENDING").trim().toUpperCase();
        const validStatus: DependentStatusV3 = (["PENDING", "APPROVED", "REJECTED", "DRAFT"].includes(rawStatus)
          ? rawStatus
          : "PENDING") as DependentStatusV3;

        return {
          id: Number(item.id ?? item.dependentId ?? item.DependentId ?? item.Id ?? 0),
          employee: {
            employeeCode: emp.employeeCode || item.employeeCode || item.EmployeeCode || "",
            fullName: emp.fullName || item.employeeName || item.EmployeeName || emp.name || "",
            project: emp.project || {
              projectId: Number(item.projectId ?? 0),
              projectCode: item.projectCode || "",
              projectName: item.projectName || "",
            },
          },
          fullName: item.fullName || item.dependentName || item.DependentName || "",
          dateOfBirth: item.dateOfBirth || item.DateOfBirth || "",
          identityNumber:
            item.dependentIdNumber ||
            item.DependentIdNumber ||
            item.identityNumber ||
            item.IdentityNumber ||
            item.idNumber ||
            item.IdNumber ||
            "",
          taxCode:
            item.dependentTaxCode ||
            item.DependentTaxCode ||
            item.taxCode ||
            item.TaxCode ||
            "",
          relationship: typeof item.relationship === "object" && item.relationship !== null
            ? item.relationship
            : {
                code: (item.relationship || item.Relationship || "CON_RUOT_NUOI") as RelationshipCode,
                name: (item.relationshipName || item.relationship || item.Relationship || "Người phụ thuộc") as string,
              },
          effectiveFrom: item.effectiveFrom || item.EffectiveFrom || "",
          effectiveTo: item.effectiveTo || item.EffectiveTo || "",
          status: validStatus,
          canApprove: validStatus === "PENDING",
          canReject: validStatus === "PENDING",
          canEdit: true,
          documentsCount: Number(item.documentsCount ?? item.DocumentsCount ?? (Array.isArray(item.documents) ? item.documents.length : 0)),
          documents: Array.isArray(item.documents) ? item.documents : [],
          approvedBy: item.approvedBy,
          approvedAt: item.approvedAt,
          rejectionReason: item.rejectionReason,
        };
      });

      return {
        items,
        total,
        page,
        pageSize,
        totalPages,
        totalRow: total,
      } as DependentListResponseV3;
    });
  },

  getDependentDetailV3: (dependentId: number | string) =>
    request<any>(`/api/web/payroll/dependents/${dependentId}`).then((res) => {
      const item = res.data || {};
      const emp = item.employee || {};
      const rawStatus = String(item.status || item.Status || "PENDING").trim().toUpperCase();
      const validStatus: DependentStatusV3 = (["PENDING", "APPROVED", "REJECTED", "DRAFT"].includes(rawStatus)
        ? rawStatus
        : "PENDING") as DependentStatusV3;

      return {
        id: Number(item.id ?? item.dependentId ?? item.DependentId ?? item.Id ?? dependentId),
        employee: {
          employeeCode: emp.employeeCode || item.employeeCode || item.EmployeeCode || "",
          fullName: emp.fullName || item.employeeName || item.EmployeeName || emp.name || "",
          project: emp.project || {
            projectId: Number(item.projectId ?? 0),
            projectCode: item.projectCode || "",
            projectName: item.projectName || "",
          },
        },
        fullName: item.fullName || item.dependentName || item.DependentName || "",
        dateOfBirth: item.dateOfBirth || item.DateOfBirth || "",
        identityNumber:
          item.dependentIdNumber ||
          item.DependentIdNumber ||
          item.identityNumber ||
          item.IdentityNumber ||
          item.idNumber ||
          item.IdNumber ||
          "",
        taxCode:
          item.dependentTaxCode ||
          item.DependentTaxCode ||
          item.taxCode ||
          item.TaxCode ||
          "",
        relationship: typeof item.relationship === "object" && item.relationship !== null
          ? item.relationship
          : {
              code: (item.relationship || item.Relationship || "CON_RUOT_NUOI") as RelationshipCode,
              name: (item.relationshipName || item.relationship || item.Relationship || "Người phụ thuộc") as string,
            },
        effectiveFrom: item.effectiveFrom || item.EffectiveFrom || "",
        effectiveTo: item.effectiveTo || item.EffectiveTo || "",
        status: validStatus,
        canApprove: validStatus === "PENDING",
        canReject: validStatus === "PENDING",
        canEdit: true,
        documentsCount: Number(item.documentsCount ?? item.DocumentsCount ?? (Array.isArray(item.documents) ? item.documents.length : 0)),
        documents: Array.isArray(item.documents) ? item.documents : [],
        approvedBy: item.approvedBy,
        approvedAt: item.approvedAt,
        rejectionReason: item.rejectionReason,
      } as DependentDetailV3;
    }),

  createDependentV3: (payload: CreateDependentRequestV3 | any) => {
    const body = {
      EmployeeCode: (payload as any).EmployeeCode || (payload as any).employeeCode,
      DependentName: (payload as any).DependentName || (payload as any).fullName,
      Relationship: (payload as any).Relationship || (payload as any).relationshipCode || (payload as any).relationship,
      DateOfBirth: (payload as any).DateOfBirth || (payload as any).dateOfBirth,
      IdNumber: (payload as any).IdNumber || (payload as any).identityNumber,
      TaxCode: (payload as any).TaxCode || (payload as any).taxCode,
      EffectiveFrom: (payload as any).EffectiveFrom || (payload as any).effectiveFrom,
      EffectiveTo: (payload as any).EffectiveTo || (payload as any).effectiveTo,
    };
    return request<DependentDetailV3>("/api/web/payroll/dependents", {
      method: "POST",
      body: JSON.stringify(body),
    }).then((res) => res.data);
  },

  updateDependentV3: (dependentId: number | string, payload: UpdateDependentRequestV3 | any) => {
    const body = {
      DependentName: (payload as any).DependentName || (payload as any).fullName,
      Relationship: (payload as any).Relationship || (payload as any).relationshipCode || (payload as any).relationship,
      DateOfBirth: (payload as any).DateOfBirth || (payload as any).dateOfBirth,
      IdNumber: (payload as any).IdNumber || (payload as any).identityNumber,
      TaxCode: (payload as any).TaxCode || (payload as any).taxCode,
      EffectiveFrom: (payload as any).EffectiveFrom || (payload as any).effectiveFrom,
      EffectiveTo: (payload as any).EffectiveTo || (payload as any).effectiveTo,
    };
    return request<DependentDetailV3>(`/api/web/payroll/dependents/${dependentId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }).then((res) => res.data);
  },

  approveDependentV3: (dependentId: number | string) =>
    request<DependentDetailV3>(`/api/web/payroll/dependents/${dependentId}/approve`, {
      method: "POST",
    }).then((res) => res.data),

  rejectDependentV3: (dependentId: number | string, reason: string) =>
    request<DependentDetailV3>(`/api/web/payroll/dependents/${dependentId}/reject`, {
      method: "POST",
      body: JSON.stringify({ RejectionReason: reason }),
    }).then((res) => res.data),

  approveBulkDependentsV3: (dependentIds: number[]) =>
    request<{ approvedCount?: number }>("/api/web/payroll/dependents/approve-bulk", {
      method: "POST",
      body: JSON.stringify({ DependentIds: dependentIds }),
    }).then((res) => res.data),

  getDependentDocumentsV3: (dependentId: number | string) =>
    request<DependentDocument[]>(`/api/web/payroll/dependents/${dependentId}/documents`).then((res) => res.data),

  saveDependentDocumentV3: (payload: any) =>
    request<DependentDocument>("/api/web/payroll/dependents/documents", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((res) => res.data),

  uploadDependentDocumentV3: (dependentId: number | string, formData: FormData) =>
    request<DependentDocument>(`/api/web/payroll/dependents/${dependentId}/documents`, {
      method: "POST",
      body: formData,
    }).then((res) => res.data),

  downloadDependentImportTemplateV3: async (): Promise<void> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const headers: Record<string, string> = { Accept: "*/*" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}/web/payroll/dependents/download-import-template`, {
      headers,
    });
    if (!res.ok) {
      throw new Error(`Tải template thất bại: ${res.status} ${res.statusText}`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Template_Import_NguoiPhuThuoc.xlsx";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  importDependentsExcelV3: async (file: File): Promise<ImportDependentResponseV3> => {
    const formData = new FormData();
    formData.append("file", file);
    return request<ImportDependentResponseV3>("/api/web/payroll/dependents/import", {
      method: "POST",
      body: formData,
    }).then((res) => res.data);
  },

  getDependentAuditLogsV3: (params?: { keyword?: string; action?: string; fromDate?: string; toDate?: string; dependentId?: number | string; page?: number; pageIndex?: number; pageSize?: number }) => {
    const queryParams: Record<string, string> = {};
    if (params?.keyword) queryParams.keyword = String(params.keyword);
    if (params?.action && params.action !== "all") queryParams.action = String(params.action);
    if (params?.fromDate) queryParams.fromDate = String(params.fromDate);
    if (params?.toDate) queryParams.toDate = String(params.toDate);
    queryParams.pageIndex = String(params?.pageIndex || params?.page || 1);
    queryParams.pageSize = String(params?.pageSize || 20);
    const query = new URLSearchParams(queryParams);
    return request<any>(`/api/web/payroll/dependents/audit-logs?${query}`).then((res) => {
      const rawData = res.data || res || {};
      const rawList = Array.isArray(rawData)
        ? rawData
        : (rawData.items || rawData.Items || rawData.data || rawData.rows || []);
      const items: AuditLogV3[] = rawList.map((item: any, idx: number) => {
        const actorObj = item.actor || item.Actor || {};
        const actorName =
          (typeof actorObj === "string" ? actorObj : actorObj.fullName || actorObj.FullName || actorObj.name || actorObj.Name) ||
          item.actorName ||
          item.ActorName ||
          item.createdByName ||
          item.CreatedByName ||
          item.createdBy ||
          item.CreatedBy ||
          item.userName ||
          item.UserName ||
          item.user ||
          "Hệ thống";
        const actorRole =
          (typeof actorObj === "object" ? actorObj.roleName || actorObj.RoleName || actorObj.role || actorObj.Role : "") ||
          item.actorRole ||
          item.ActorRole ||
          item.roleName ||
          item.RoleName ||
          "Quản trị viên";

        const depObj = item.dependent || item.Dependent;
        const depName =
          (typeof depObj === "object" && depObj !== null
            ? depObj.fullName || depObj.FullName || depObj.dependentName || depObj.DependentName || depObj.name
            : typeof depObj === "string"
            ? depObj
            : "") ||
          item.dependentName ||
          item.DependentName ||
          item.fullName ||
          item.FullName ||
          "";

        return {
          id: Number(item.id ?? item.Id ?? item.logId ?? item.LogId ?? idx + 1),
          eventType: (item.eventType || item.EventType || item.action || item.Action || "UPDATE") as any,
          occurredAt: item.occurredAt || item.OccurredAt || item.createdAt || item.CreatedAt || item.time || new Date().toISOString(),
          actor: {
            id: actorObj.id || actorObj.Id || item.actorId || item.ActorId,
            fullName: actorName,
            roleName: actorRole,
          },
          employee: item.employee || item.Employee,
          dependent: depName
            ? {
                id: Number(depObj?.id || depObj?.Id || item.dependentId || item.DependentId || 0),
                fullName: depName,
              }
            : null,
          description:
            item.description ||
            item.Description ||
            item.message ||
            item.Message ||
            item.actionLabel ||
            item.ActionLabel ||
            item.details ||
            item.Details ||
            "Thao tác hồ sơ người phụ thuộc",
          metadata: item.metadata || item.Metadata,
        };
      });

      return {
        items,
        total: Number(rawData.total ?? rawData.Total ?? rawData.totalRow ?? items.length),
        page: Number(rawData.page ?? rawData.Page ?? rawData.pageIndex ?? 1),
        pageSize: Number(rawData.pageSize ?? rawData.PageSize ?? 20),
      } as AuditLogListResponseV3;
    });
  },

  // ================= 02. Phép năm (Leaves - OpenAPI: WebPayroll - Leave) =================
  getLeavesV3: (params?: {
    projectId?: string | number;
    year?: number | string;
    keyword?: string;
    search?: string;
    filter?: AnnualLeaveViewFilter | string;
    pageIndex?: number;
    page?: number;
    pageSize?: number;
  }) => {
    const queryParams: Record<string, string> = {};
    if (params?.projectId && params.projectId !== "all") queryParams.projectId = String(params.projectId);
    if (params?.year && params.year !== "all") queryParams.year = String(params.year);
    const searchVal = params?.keyword || params?.search;
    if (searchVal) queryParams.keyword = String(searchVal);

    // Map frontend filter name to backend valid enum values: all, official, probation, resigned, available, expired
    const mapFilter = (f?: string): string | undefined => {
      if (!f) return undefined;
      const upper = String(f).toUpperCase();
      if (upper === "ALL") return undefined;
      if (upper === "OFFICIAL_ELIGIBLE" || upper === "OFFICIAL") return "official";
      if (upper === "PROBATION_OR_NO_CONTRACT" || upper === "PROBATION") return "probation";
      if (upper === "TERMINATED" || upper === "RESIGNED") return "resigned";
      if (upper === "HAS_AVAILABLE_LEAVE" || upper === "AVAILABLE") return "available";
      if (upper === "EXHAUSTED" || upper === "EXPIRED") return "expired";
      return f.toLowerCase();
    };

    const backendFilter = mapFilter(params?.filter);
    if (backendFilter) queryParams.filter = backendFilter;

    queryParams.pageIndex = String(params?.pageIndex || params?.page || 1);
    queryParams.pageSize = String(params?.pageSize || 10);

    const query = new URLSearchParams(queryParams);
    return request<any>(`/api/web/payroll/leaves?${query}`).then((res) => {
      const rawData = res.data || res || {};
      const rawList = Array.isArray(rawData)
        ? rawData
        : (rawData.items || rawData.Items || rawData.data || rawData.rows || []);

      const items: AnnualLeaveEmployee[] = rawList.map((item: any) => {
        const emp = item.employee || item.Employee || {};
        const rawStatus = String(item.status || item.Status || emp.status || "").toUpperCase();
        const rawContract = String(item.contractType || item.ContractType || "").toUpperCase();
        const isTerminated = Boolean(
          item.offDate ||
          item.OffDate ||
          item.terminationDate ||
          item.TerminationDate ||
          rawStatus === "RESIGNED" ||
          rawStatus === "TERMINATED"
        );

        let employmentType: EmploymentType = "OFFICIAL_CONTRACT";
        if (rawStatus === "PROBATION" || rawContract === "PROBATION") {
          employmentType = "PROBATION";
        } else if (rawStatus === "RESIGNED" || rawStatus === "TERMINATED" || isTerminated) {
          employmentType = "NONE";
        } else if (rawStatus === "SEASONAL" || rawContract === "SEASONAL") {
          employmentType = "SEASONAL";
        } else if (rawStatus === "INTERN" || rawContract === "INTERN") {
          employmentType = "INTERN";
        }

        const standardDays = Number(
          item.totalAnnualLeave ??
          item.annualEntitlementDays ??
          item.AnnualEntitlementDays ??
          item.standardDays ??
          (employmentType === "OFFICIAL_CONTRACT" ? 12 : 0)
        );
        const used = Number(item.usedDays ?? item.UsedDays ?? item.takenDays ?? 0);
        const carryOver = Number(item.carryOverDays ?? item.CarryOverDays ?? item.transferredDays ?? 0);
        const avail = Number(item.availableDays ?? item.AvailableDays ?? (standardDays + carryOver - used));

        return {
          employee: {
            employeeCode: emp.employeeCode || item.employeeCode || item.EmployeeCode || "",
            fullName: emp.fullName || item.employeeName || item.EmployeeName || emp.name || item.fullName || "",
            project: emp.project || {
              projectId: Number(item.projectId ?? 0),
              projectCode: item.projectCode || item.ProjectCode || "",
              projectName: item.projectName || item.ProjectName || "",
            },
            department: emp.department || item.department || item.Department || "",
            position: emp.position || item.position || item.positionName || item.PositionName || "",
            status: isTerminated ? "TERMINATED" : (emp.status || item.status || "ACTIVE"),
          },
          employmentType,
          joinDate: item.joiningDate || item.JoiningDate || item.joinDate || item.JoinDate || "",
          terminationDate: item.offDate || item.OffDate || item.terminationDate || item.TerminationDate || null,
          entitlementStartDate: item.entitlementFrom || item.EntitlementFrom || item.entitlementStartDate || item.EntitlementStartDate || item.joiningDate || item.joinDate || null,
          entitlementStatus: item.entitlementStatus || item.EntitlementStatus || (isTerminated ? "Đã thôi việc" : employmentType === "OFFICIAL_CONTRACT" ? "Đang hưởng phép" : "Chờ ký HĐLĐ"),
          annualEntitlementDays: standardDays,
          carryOverDays: carryOver,
          usedDays: used,
          availableDays: avail,
        };
      });

      const total = Number(rawData.totalRow ?? rawData.total ?? rawData.Total ?? items.length);
      const page = Number(rawData.pageIndex ?? rawData.page ?? rawData.Page ?? Number(queryParams.pageIndex));
      const pageSize = Number(rawData.pageSize ?? rawData.PageSize ?? Number(queryParams.pageSize));
      const totalPages = Number(rawData.totalPages ?? (Math.ceil(total / (pageSize || 10)) || 1));

      return {
        items,
        total,
        page,
        pageSize,
        totalPages,
      } as AnnualLeaveListResponse;
    });
  },

  // Alias for backward compatibility
  getAnnualLeaveEmployeesV3: (params?: any) => api.getLeavesV3(params),

  getLeaveHistoryV3: (params: {
    employeeCode: string;
    year?: number | string;
    page?: number;
    pageSize?: number;
  }) => {
    const queryParams: Record<string, string> = {
      employeeCode: String(params.employeeCode),
    };
    if (params.year && params.year !== "all") queryParams.year = String(params.year);

    const query = new URLSearchParams(queryParams);
    return request<any>(`/api/web/payroll/leaves/history?${query}`).then((res) => {
      const rawData = res.data || res || {};
      const rawList = Array.isArray(rawData)
        ? rawData
        : (rawData.items || rawData.Items || rawData.data || rawData.rows || []);

      const items: AnnualLeaveHistoryItemV3[] = rawList.map((item: any, idx: number) => ({
        id: Number(item.id ?? item.Id ?? item.leaveId ?? idx + 1),
        fromDate: item.fromDate || item.FromDate || item.startDate || "",
        toDate: item.toDate || item.ToDate || item.endDate || "",
        days: Number(item.days ?? item.Days ?? item.duration ?? 1),
        leaveType: item.leaveType || item.LeaveType || item.typeName || "Nghỉ phép năm",
        reason: item.reason || item.Reason || item.note || "Nghỉ phép",
        approvedBy: {
          id: item.approvedBy?.id || item.approvedById,
          fullName: item.approvedBy?.fullName || item.approvedBy?.name || item.approvedByName || item.approverName || "Quản lý",
          roleName: item.approvedBy?.roleName || item.approverRole || "Phê duyệt",
        },
        approvedAt: item.approvedAt || item.ApprovedAt || item.createdAt || new Date().toISOString(),
      }));

      return {
        items,
        total: Number(rawData.total ?? rawData.Total ?? items.length),
        page: Number(params.page || 1),
        pageSize: Number(params.pageSize || 20),
        year: params.year ? Number(params.year) : undefined,
      } as AnnualLeaveHistoryResponse;
    });
  },

  getAnnualLeaveHistoryV3: (employeeCode: string, params?: { year?: number | string; page?: number; pageSize?: number }) =>
    api.getLeaveHistoryV3({ employeeCode, ...params }),

  // ================= 03. Công đoàn phí (WebPayroll - Union) Swagger Methods =================
  getUnionsV3: (params?: {
    projectId?: string | number;
    keyword?: string;
    status?: UnionParticipationStatus | string;
    pageIndex?: number;
    pageSize?: number;
  }) => {
    const pageIndex = Number(params?.pageIndex ?? 1);
    const pageSize = Number(params?.pageSize ?? 20);

    const queryObj: Record<string, string> = {
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    };

    if (params?.projectId && String(params.projectId) !== "all") {
      queryObj.projectId = String(params.projectId);
    }
    if (params?.keyword && params.keyword.trim()) {
      queryObj.keyword = params.keyword.trim();
    }
    if (params?.status) {
      const rawStatus = String(params.status).trim();
      if (rawStatus === "PARTICIPATING" || rawStatus === "participating") {
        queryObj.status = "participating";
      } else if (
        rawStatus === "NOT_PARTICIPATING" ||
        rawStatus === "notParticipating" ||
        rawStatus === "not_participating"
      ) {
        queryObj.status = "notParticipating";
      } else if (rawStatus === "ALL" || rawStatus === "all") {
        queryObj.status = "all";
      }
    }

    const query = new URLSearchParams(queryObj).toString();
    return request<any>(`/api/web/payroll/unions?${query}`).then((res) => {
      const rawData = res.data || res || {};
      const rawList = Array.isArray(rawData)
        ? rawData
        : rawData.items || rawData.Items || rawData.data || rawData.rows || [];

      const items: UnionMemberItemV3[] = rawList.map((item: any) => {
        const empCode = item.employeeCode || item.EmployeeCode || item.code || "";
        const empName = item.employeeName || item.EmployeeName || item.fullName || item.name || "";
        const joinDate = item.unionJoinDate || item.UnionJoinDate || null;
        const joiningDate = item.joiningDate || item.JoiningDate || null;
        const offDate = item.offDate || item.OffDate || null;
        const amount = item.contributionAmount ?? item.ContributionAmount ?? null;
        const isActive = item.isActive ?? item.IsActive ?? (joinDate !== null || (amount && amount > 0));

        return {
          employee: {
            employeeCode: empCode,
            fullName: empName,
            department: item.departmentName || item.department || "",
            position: item.positionName || item.position || "",
            joinDate: joiningDate,
            terminationDate: offDate,
            isTerminated: Boolean(offDate),
            project: item.projectId
              ? {
                  projectId: Number(item.projectId),
                  projectCode: item.projectCode || String(item.projectId),
                  projectName: item.projectName || "",
                }
              : undefined,
          },
          participating: Boolean(isActive),
          joinDate,
          leaveDate: offDate,
          contributionAmount: amount !== null ? Number(amount) : (isActive ? 23400 : 0),
          contributionFormula: item.contributionFormula || (isActive ? "1% Lương tối thiểu vùng" : "—"),
          note: item.note || item.Note || "",
          updatedAt: item.updatedAt || item.UpdatedAt || null,
        };
      });

      const total = Number(rawData.totalRow ?? rawData.total ?? rawData.Total ?? items.length);

      return {
        items,
        total,
        pageIndex,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      };
    });
  },

  getUnionHistoryV3: (employeeCode: string) => {
    const query = new URLSearchParams({ employeeCode }).toString();
    return request<any>(`/api/web/payroll/unions/history?${query}`).then((res) => {
      const rawData = res.data || res || [];
      const rawList = Array.isArray(rawData)
        ? rawData
        : rawData.items || rawData.Items || rawData.data || [];

      const items: UnionHistoryItemV3[] = rawList.map((item: any, idx: number) => ({
        id: item.id ?? item.Id ?? idx + 1,
        employeeCode: item.employeeCode || item.EmployeeCode || employeeCode,
        occurredAt: item.occurredAt || item.OccurredAt || item.createdAt || new Date().toISOString(),
        action: item.action || item.Action || item.eventType || "",
        eventType: item.eventType || item.EventType || (item.action?.includes("Dừng") ? "LEFT" : "JOINED"),
        contributionAmount: item.contributionAmount ?? item.ContributionAmount ?? null,
        performedBy: {
          id: item.performedBy?.id || item.createdById || 0,
          fullName: item.performedBy?.fullName || item.createdByName || item.actor?.fullName || "Hệ thống",
          roleName: item.performedBy?.roleName || item.actor?.roleName || "Quản trị viên",
        },
        note: item.note || item.Note || item.reason || "",
      }));

      return {
        items,
        total: items.length,
      };
    });
  },

  registerUnionV3: (payload: RegisterUnionRequest) =>
    request<any>("/api/web/payroll/unions/register", {
      method: "POST",
      body: JSON.stringify({
        EmployeeCode: payload.employeeCode,
        UnionJoinDate: payload.unionJoinDate,
        ContributionAmount: payload.contributionAmount,
        Note: payload.note,
      }),
    }).then((res) => res.data),

  updateUnionContributionV3: (payload: UpdateUnionContributionRequest) =>
    request<any>("/api/web/payroll/unions/contribution", {
      method: "PUT",
      body: JSON.stringify({
        EmployeeCode: payload.employeeCode,
        ContributionAmount: payload.contributionAmount,
        Note: payload.note,
      }),
    }).then((res) => res.data),

  deactivateUnionV3: (payload: DeactivateUnionRequest) =>
    request<any>("/api/web/payroll/unions/deactivate", {
      method: "POST",
      body: JSON.stringify({
        EmployeeCode: payload.employeeCode,
        Note: payload.note,
      }),
    }).then((res) => res.data),

  importUnionExcelV3: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    return request<any>("/api/web/payroll/unions/import", {
      method: "POST",
      body: formData,
    }).then((res) => res.data);
  },

  downloadUnionImportTemplateV3: async (): Promise<void> => {
    const baseUrl = getApiBaseUrl().replace(/\/+$/, "");
    const token = getAuthToken();
    try {
      const res = await fetch(`${baseUrl}/web/payroll/unions/import-template`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Mau_Import_Cong_Doan_Phi.xlsx";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return;
      }
    } catch {
      // fallback
    }
  },

  getUnionAuditLogsV3: (params?: {
    keyword?: string;
    action?: string;
    fromDate?: string;
    toDate?: string;
    pageIndex?: number;
    pageSize?: number;
  }) => {
    const pageIndex = Number(params?.pageIndex ?? 1);
    const pageSize = Number(params?.pageSize ?? 20);

    const queryObj: Record<string, string> = {
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    };
    if (params?.keyword && params.keyword.trim()) queryObj.keyword = params.keyword.trim();
    if (params?.action && params.action.trim()) queryObj.action = params.action.trim();
    if (params?.fromDate) queryObj.fromDate = params.fromDate;
    if (params?.toDate) queryObj.toDate = params.toDate;

    const query = new URLSearchParams(queryObj).toString();
    return request<any>(`/api/web/payroll/unions/audit-logs?${query}`).then((res) => {
      const rawData = res.data || res || {};
      const rawList = Array.isArray(rawData)
        ? rawData
        : rawData.items || rawData.Items || rawData.data || [];

      const items: UnionAuditLogItemV3[] = rawList.map((item: any, idx: number) => ({
        id: item.id ?? item.Id ?? idx + 1,
        occurredAt: item.occurredAt || item.OccurredAt || item.createdAt || new Date().toISOString(),
        action: item.action || item.Action || "Thay đổi",
        description: item.description || item.Description || item.note || "",
        actor: {
          id: item.actor?.id || item.createdById || 0,
          fullName: item.actor?.fullName || item.createdByName || "Hệ thống",
          roleName: item.actor?.roleName || "Quản trị viên",
        },
        employee: {
          id: item.employee?.id || item.employeeId || 0,
          employeeCode: item.employeeCode || item.EmployeeCode || item.employee?.employeeCode || "",
          fullName: item.employeeName || item.EmployeeName || item.employee?.fullName || "",
        },
      }));

      const total = Number(rawData.totalRow ?? rawData.total ?? items.length);
      return {
        items,
        total,
        pageIndex,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      };
    });
  },

  // Backward-compatible aliases for legacy callers
  getUnionDuesMembersV3: (params?: {
    projectId?: string | number;
    participationStatus?: UnionDuesParticipationStatus | string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) =>
    api.getUnionsV3({
      projectId: params?.projectId,
      keyword: params?.search,
      status: params?.participationStatus,
      pageIndex: params?.page,
      pageSize: params?.pageSize,
    }),

  getUnionDuesHistoryV3: (employeeCode: string) => api.getUnionHistoryV3(employeeCode),
  getUnionDuesAuditLogsV3: (params?: { page?: number; pageSize?: number }) =>
    api.getUnionAuditLogsV3({ pageIndex: params?.page, pageSize: params?.pageSize }),

  // ================= 04. Ngày công chuẩn (Standard Workdays) OpenAPI 3.0 Methods =================
  getStandardWorkdaysSummaryV3: (projectId?: string | number) => {
    const query = projectId && projectId !== "all" ? `?projectId=${projectId}` : "";
    return request<StandardWorkdaySummaryResponse>(`/api/web/payroll/standard-workdays/summary${query}`).then((res) => res.data);
  },

  getStandardWorkdayProjectDefaultV3: (projectId?: string | number) => {
    const query = projectId && projectId !== "all" ? `?projectId=${projectId}` : "";
    return request<{ projectId: number; defaultStandardDays: number; note: string }>(
      `/api/web/payroll/standard-workdays/project-default${query}`
    ).then((res) => res.data);
  },

  getStandardWorkdaysEmployeesV3: (params?: {
    projectId?: string | number;
    mode?: StandardWorkdayMode | string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && String(v) !== "" && v !== "all")
        .map(([k, v]) => [k, String(v)])
    );
    return request<StandardWorkdayListResponse>(`/api/web/payroll/standard-workdays/employees?${query}`).then((res) => res.data);
  },

  getStandardWorkdayDetailV3: (employeeCode: string) =>
    request<StandardWorkdayEmployeeV3>(`/api/web/payroll/standard-workdays/employees/${encodeURIComponent(employeeCode)}`).then((res) => res.data),

  updateStandardWorkdayV3: (employeeCode: string, payload: UpdateStandardWorkdayRequestV3) =>
    request<StandardWorkdayEmployeeV3>(`/api/web/payroll/standard-workdays/employees/${encodeURIComponent(employeeCode)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }).then((res) => res.data),

  restoreStandardWorkdayDefaultV3: (employeeCode: string) =>
    request<StandardWorkdayEmployeeV3>(
      `/api/web/payroll/standard-workdays/employees/${encodeURIComponent(employeeCode)}/restore-project-default`,
      { method: "POST" }
    ).then((res) => res.data),

  getStandardWorkdayHistoryV3: (employeeCode: string) =>
    request<{ employeeCode: string; history: any[] }>(
      `/api/web/payroll/standard-workdays/employees/${encodeURIComponent(employeeCode)}/history`
    ).then((res) => res.data),

  exportStandardWorkdaysExcelV3: async (params?: {
    projectId?: string | number;
    mode?: string;
    search?: string;
  }): Promise<{ fileName: string; fileUrl: string; totalRecords: number }> => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && String(v) !== "" && v !== "all")
        .map(([k, v]) => [k, String(v)])
    );
    return request<{ fileName: string; fileUrl: string; totalRecords: number }>(
      `/api/web/payroll/standard-workdays/export?${query}`
    ).then((res) => res.data);
  },

  downloadStandardWorkdaysImportTemplateV3: async (): Promise<void> => {
    const res = await fetch("/api/web/payroll/standard-workdays/import/template");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Mau_Import_Ngay_Cong_Chuan.xlsx";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  importStandardWorkdaysExcelV3: async (file: File, projectId?: number | string): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    if (projectId) formData.append("projectId", String(projectId));
    return request<any>("/api/web/payroll/standard-workdays/import", {
      method: "POST",
      body: formData,
    }).then((res) => res.data);
  },

  getStandardWorkdaysAuditLogsV3: (params?: { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && String(v) !== "")
        .map(([k, v]) => [k, String(v)])
    );
    return request<{ items: any[]; total: number }>(`/api/web/payroll/standard-workdays/audit-logs?${query}`).then((res) => res.data);
  },

  // ================= 05. Bảo hiểm xã hội (WebPayroll - Insurance) Swagger Methods =================
  getInsuranceParticipantsV3: (params?: {
    projectId?: string | number;
    status?: InsuranceParticipationStatus | string;
    keyword?: string;
    search?: string;
    pageIndex?: number;
    page?: number;
    pageSize?: number;
  }) => {
    const pageIndex = Number(params?.pageIndex ?? params?.page ?? 1);
    const pageSize = Number(params?.pageSize ?? 20);
    const queryObj: Record<string, string> = {
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    };

    if (params?.projectId && String(params.projectId) !== "all") {
      queryObj.projectId = String(params.projectId);
    }
    if (params?.status && String(params.status) !== "ALL" && String(params.status) !== "all") {
      queryObj.status = String(params.status);
    }
    const kw = params?.keyword || params?.search;
    if (kw && kw.trim()) {
      queryObj.keyword = kw.trim();
    }

    const query = new URLSearchParams(queryObj).toString();
    return request<any>(`/api/web/payroll/insurance/participants?${query}`).then((res) => {
      const rawData = res.data || res || {};
      const rawList = Array.isArray(rawData)
        ? rawData
        : rawData.items || rawData.Items || rawData.data || rawData.rows || [];

      let totalSalary = 0;
      let activeCount = 0;
      let suspendedCount = 0;
      let stoppedCount = 0;

      const items: InsuranceParticipantItemV3[] = rawList.map((item: any, idx: number) => {
        const empCode = item.employeeCode || item.EmployeeCode || item.code || "";
        const empName = item.fullName || item.FullName || item.employeeName || item.EmployeeName || item.name || "";
        const bookNumber = item.insuranceBookNumber || item.InsuranceBookNumber || item.socialInsuranceNumber || "";
        const sal = Number(item.insuranceSalary ?? item.InsuranceSalary ?? item.baseSalary ?? item.BaseSalary ?? item.contributionSalary ?? 0);
        const statusRaw = String(item.participationStatus || item.ParticipationStatus || item.status || "ACTIVE").toUpperCase();
        const status = (statusRaw === "SUSPENDED" ? "SUSPENDED" : statusRaw === "STOPPED" ? "STOPPED" : "ACTIVE") as InsuranceParticipationStatus;

        totalSalary += sal;
        if (status === "ACTIVE") activeCount++;
        else if (status === "SUSPENDED") suspendedCount++;
        else if (status === "STOPPED") stoppedCount++;

        return {
          id: Number(item.id ?? item.Id ?? idx + 1),
          employee: {
            employeeCode: empCode,
            fullName: empName,
            department: item.departmentName || item.department || "",
            position: item.position || item.title || "",
            project: item.projectId
              ? {
                  projectId: Number(item.projectId),
                  projectCode: item.projectCode || String(item.projectId),
                  projectName: item.projectName || "",
                }
              : undefined,
          },
          insuranceBookNumber: bookNumber,
          insuranceSalary: sal,
          baseSalary: sal,
          contributionSalary: sal,
          participationStatus: status,
          status,
          medicalFacilityId: item.medicalFacilityId ?? item.MedicalFacilityId ?? null,
          medicalFacilityCode: item.medicalFacilityCode || item.MedicalFacilityCode || null,
          medicalFacilityName: item.medicalFacilityName || item.MedicalFacilityName || item.medicalRegistrationPlace || null,
          effectiveFrom: item.effectiveFrom || item.EffectiveFrom || item.effectiveMonth || null,
          effectiveMonth: item.effectiveMonth || (item.effectiveFrom ? String(item.effectiveFrom).slice(0, 7) : null),
          employeeContributionRate: Number(item.employeeContributionRate ?? 10.5),
          employeeContribution: Number(item.employeeContribution ?? Math.round(sal * 0.105)),
          employerContributionRate: Number(item.employerContributionRate ?? 21.5),
          employerContribution: Number(item.employerContribution ?? Math.round(sal * 0.215)),
          totalContributionRate: Number(item.totalContributionRate ?? 32),
          totalContribution: Number(item.totalContribution ?? Math.round(sal * 0.32)),
          note: item.note || item.Note || null,
          confirmedBy: item.confirmedBy || (item.confirmedByName ? { fullName: item.confirmedByName } : undefined),
          confirmedAt: item.confirmedAt || item.ConfirmedAt || null,
        };
      });

      const total = Number(rawData.total ?? rawData.Total ?? rawData.totalRow ?? items.length);
      const page = Number(rawData.page ?? rawData.Page ?? pageIndex);
      const pSize = Number(rawData.pageSize ?? rawData.PageSize ?? pageSize);

      return {
        items,
        total,
        page,
        pageSize: pSize,
        totalPages: Math.ceil(total / pSize) || 1,
        summary: {
          total,
          activeCount: rawData.activeCount ?? activeCount,
          suspendedCount: rawData.suspendedCount ?? suspendedCount,
          stoppedCount: rawData.stoppedCount ?? stoppedCount,
          totalMonthlyContribution: rawData.totalMonthlyContribution ?? Math.round(totalSalary * 0.32),
          totalInsuranceSalary: rawData.totalInsuranceSalary ?? totalSalary,
          pendingChangesCount: rawData.pendingChangesCount ?? 0,
        },
      } as InsuranceParticipantListResponseV3;
    });
  },

  searchInsuranceEmployeesV3: (params?: { projectId?: string | number; keyword?: string; limit?: number }) => {
    const queryObj: Record<string, string> = {};
    if (params?.projectId && String(params.projectId) !== "all") queryObj.projectId = String(params.projectId);
    if (params?.keyword) queryObj.keyword = params.keyword.trim();
    if (params?.limit) queryObj.limit = String(params.limit);
    const query = new URLSearchParams(queryObj).toString();
    return request<any>(`/api/web/payroll/insurance/employees/search?${query}`).then((res) => {
      const raw = res.data || res || [];
      return Array.isArray(raw) ? raw : raw.items || raw.data || [];
    });
  },

  previewInsuranceContributionV3: (params: { baseSalary: number; month?: number; year?: number }) => {
    const queryObj: Record<string, string> = {
      baseSalary: String(params.baseSalary || 0),
    };
    if (params.month) queryObj.month = String(params.month);
    if (params.year) queryObj.year = String(params.year);
    const query = new URLSearchParams(queryObj).toString();

    return request<any>(`/api/web/payroll/insurance/contribution-preview?${query}`)
      .then((res) => {
        const d = res.data || res || {};
        const base = Number(d.baseSalary ?? d.BaseSalary ?? params.baseSalary);
        return {
          baseSalary: base,
          socialInsuranceEmployee: Number(d.socialInsuranceEmployee ?? d.SocialInsuranceEmployee ?? Math.round(base * 0.08)),
          healthInsuranceEmployee: Number(d.healthInsuranceEmployee ?? d.HealthInsuranceEmployee ?? Math.round(base * 0.015)),
          unemploymentInsuranceEmployee: Number(d.unemploymentInsuranceEmployee ?? d.UnemploymentInsuranceEmployee ?? Math.round(base * 0.01)),
          totalEmployeeContribution: Number(d.totalEmployeeContribution ?? d.TotalEmployeeContribution ?? Math.round(base * 0.105)),
          socialInsuranceEmployer: Number(d.socialInsuranceEmployer ?? d.SocialInsuranceEmployer ?? Math.round(base * 0.175)),
          healthInsuranceEmployer: Number(d.healthInsuranceEmployer ?? d.HealthInsuranceEmployer ?? Math.round(base * 0.03)),
          unemploymentInsuranceEmployer: Number(d.unemploymentInsuranceEmployer ?? d.UnemploymentInsuranceEmployer ?? Math.round(base * 0.01)),
          totalEmployerContribution: Number(d.totalEmployerContribution ?? d.TotalEmployerContribution ?? Math.round(base * 0.215)),
          totalContribution: Number(d.totalContribution ?? d.TotalContribution ?? Math.round(base * 0.32)),
        } as InsuranceContributionPreview;
      })
      .catch(() => {
        // Safe fallback calculation
        const base = Number(params.baseSalary || 0);
        return {
          baseSalary: base,
          socialInsuranceEmployee: Math.round(base * 0.08),
          healthInsuranceEmployee: Math.round(base * 0.015),
          unemploymentInsuranceEmployee: Math.round(base * 0.01),
          totalEmployeeContribution: Math.round(base * 0.105),
          socialInsuranceEmployer: Math.round(base * 0.175),
          healthInsuranceEmployer: Math.round(base * 0.03),
          unemploymentInsuranceEmployer: Math.round(base * 0.01),
          totalEmployerContribution: Math.round(base * 0.215),
          totalContribution: Math.round(base * 0.32),
        } as InsuranceContributionPreview;
      });
  },

  createInsuranceChangeV3: (payload: CreateInsuranceChangeRequest) =>
    request<any>("/api/web/payroll/insurance/changes", {
      method: "POST",
      body: JSON.stringify({
        ProjectId: payload.projectId,
        EmployeeCode: payload.employeeCode,
        ChangeType: payload.changeType,
        EffectiveFrom: payload.effectiveFrom,
        NewBaseSalary: payload.newBaseSalary,
        NewInsuranceBookNumber: payload.newInsuranceBookNumber,
        NewParticipationStatus: payload.newParticipationStatus,
        NewMedicalFacilityId: payload.newMedicalFacilityId,
        Reason: payload.reason,
        ReasonCode: payload.reasonCode,
      }),
    }).then((res) => res.data || res),

  getInsuranceChangesV3: (params?: {
    projectId?: string | number;
    status?: string;
    keyword?: string;
    search?: string;
    changeType?: string;
    pageIndex?: number;
    page?: number;
    pageSize?: number;
  }) => {
    const pageIndex = Number(params?.pageIndex ?? params?.page ?? 1);
    const pageSize = Number(params?.pageSize ?? 20);
    const queryObj: Record<string, string> = {
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    };

    if (params?.projectId && String(params.projectId) !== "all") {
      queryObj.projectId = String(params.projectId);
    }
    if (params?.status && String(params.status) !== "ALL" && String(params.status) !== "all") {
      queryObj.status = String(params.status);
    }
    const kw = params?.keyword || params?.search;
    if (kw && kw.trim()) {
      queryObj.keyword = kw.trim();
    }

    const query = new URLSearchParams(queryObj).toString();
    return request<any>(`/api/web/payroll/insurance/changes?${query}`).then((res) => {
      const rawData = res.data || res || {};
      const rawList = Array.isArray(rawData)
        ? rawData
        : rawData.items || rawData.Items || rawData.data || rawData.rows || [];

      const items: InsuranceChangeItemV3[] = rawList.map((item: any, idx: number) => {
        const empCode = item.employeeCode || item.EmployeeCode || item.code || "";
        const empName = item.fullName || item.FullName || item.employeeName || item.EmployeeName || item.name || "";
        const chType = item.changeType || item.ChangeType || "TANG_MOI";
        const st = String(item.status || item.Status || "PENDING").toUpperCase();

        return {
          id: Number(item.id ?? item.Id ?? idx + 1),
          employee: {
            employeeCode: empCode,
            fullName: empName,
            department: item.departmentName || item.department || "",
            position: item.position || item.title || "",
          },
          changeType: chType,
          changeTypeName: item.changeTypeName || item.ChangeTypeName || chType,
          effectiveFrom: item.effectiveFrom || item.EffectiveFrom || item.effectiveMonth || "",
          effectiveMonth: item.effectiveMonth || (item.effectiveFrom ? String(item.effectiveFrom).slice(0, 7) : ""),
          oldBaseSalary: item.oldBaseSalary ?? item.OldBaseSalary ?? item.oldSalary ?? null,
          newBaseSalary: item.newBaseSalary ?? item.NewBaseSalary ?? item.newSalary ?? null,
          oldSalary: item.oldBaseSalary ?? item.oldSalary ?? null,
          newSalary: item.newBaseSalary ?? item.newSalary ?? null,
          oldInsuranceBookNumber: item.oldInsuranceBookNumber || item.OldInsuranceBookNumber || null,
          newInsuranceBookNumber: item.newInsuranceBookNumber || item.NewInsuranceBookNumber || null,
          oldParticipationStatus: item.oldParticipationStatus || item.OldParticipationStatus || null,
          newParticipationStatus: item.newParticipationStatus || item.NewParticipationStatus || null,
          medicalFacilityId: item.medicalFacilityId ?? item.MedicalFacilityId ?? null,
          medicalFacilityName: item.medicalFacilityName || item.MedicalFacilityName || null,
          reason: item.reason || item.Reason || "",
          reasonCode: item.reasonCode || item.ReasonCode || null,
          status: st,
          statusName: st === "CONFIRMED" ? "Đã xác nhận" : st === "REJECTED" ? "Từ chối" : "Chờ xác nhận",
          externalDossierCode: item.externalDossierCode || item.ExternalDossierCode || item.reconciliationCode || null,
          reconciliationCode: item.externalDossierCode || item.reconciliationCode || null,
          fileName: item.fileName || item.FileName || null,
          filePath: item.filePath || item.FilePath || null,
          documents: item.documents || [],
          createdAt: item.createdAt || item.CreatedAt || "",
          confirmedAt: item.confirmedAt || item.ConfirmedAt || null,
          confirmedByName: item.confirmedByName || item.ConfirmedByName || null,
          approvedAt: item.approvedAt || item.ApprovedAt || null,
        };
      });

      const total = Number(rawData.total ?? rawData.Total ?? rawData.totalRow ?? items.length);
      const page = Number(rawData.page ?? rawData.Page ?? pageIndex);
      const pSize = Number(rawData.pageSize ?? rawData.PageSize ?? pageSize);

      return {
        items,
        total,
        page,
        pageSize: pSize,
        totalPages: Math.ceil(total / pSize) || 1,
      } as InsuranceChangeListResponseV3;
    });
  },

  getInsuranceChangeDetailV3: (id: number | string) =>
    request<any>(`/api/web/payroll/insurance/changes/${id}`).then((res) => res.data || res),

  confirmInsuranceChangeV3: (id: number | string, payload: ConfirmInsuranceChangeRequest) =>
    request<any>(`/api/web/payroll/insurance/changes/${id}/confirm`, {
      method: "POST",
      body: JSON.stringify({
        ExternalDossierCode: payload.externalDossierCode,
      }),
    }).then((res) => res.data || res),

  uploadInsuranceChangeDocumentV3: async (id: number | string, file: File, documentType?: string): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    if (documentType) formData.append("documentType", documentType);
    return request<any>(`/api/web/payroll/insurance/changes/${id}/documents`, {
      method: "POST",
      body: formData,
    }).then((res) => res.data || res);
  },

  getInsuranceMedicalFacilitiesV3: (keyword?: string) => {
    const query = keyword && keyword.trim() ? `?keyword=${encodeURIComponent(keyword.trim())}` : "";
    return request<any>(`/api/web/payroll/insurance/medical-facilities${query}`).then((res) => {
      const raw = res.data || res || [];
      const list = Array.isArray(raw) ? raw : raw.items || raw.data || [];
      return list.map((item: any) => ({
        id: Number(item.id ?? item.Id ?? 0),
        facilityCode: item.facilityCode || item.FacilityCode || item.code || "",
        facilityName: item.facilityName || item.FacilityName || item.name || "",
        province: item.province || item.Province || "",
        address: item.address || item.Address || "",
      })) as MedicalFacilityItemV3[];
    });
  },

  downloadInsuranceImportTemplateV3: async (): Promise<void> => {
    const baseUrl = getApiBaseUrl().replace(/\/+$/, "");
    const token = getAuthToken();
    const res = await fetch(`${baseUrl}/web/payroll/insurance/import-template`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Mau_Khai_Bao_BHXH.xlsx";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  importInsuranceExcelV3: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    return request<any>("/api/web/payroll/insurance/import", {
      method: "POST",
      body: formData,
    }).then((res) => res.data || res);
  },

  // Backwards-compatible aliases for Insurance
  getSocialInsuranceMembersV3: (params?: any) => api.getInsuranceParticipantsV3(params),
  getSocialInsuranceChangesV3: (params?: any) => api.getInsuranceChangesV3(params),
  getSocialInsuranceSummaryV3: (projectId?: any) =>
    api.getInsuranceParticipantsV3({ projectId, pageSize: 1 }).then((res) => res.summary),
  getSocialInsuranceMemberDetailV3: (employeeCode: string) =>
    api.getInsuranceParticipantsV3({ keyword: employeeCode, pageSize: 1 }).then((res) => res.items[0]),
  getSocialInsuranceMemberHistoryV3: (employeeCode: string) =>
    api.getInsuranceChangesV3({ keyword: employeeCode }).then((res) => ({ employeeCode, history: res.items })),
  getSocialInsuranceChangeDetailV3: (changeId: number | string) => api.getInsuranceChangeDetailV3(changeId),
  createSocialInsuranceChangeV3: (payload: any) =>
    api.createInsuranceChangeV3({
      employeeCode: payload.employeeCode,
      changeType: payload.changeType,
      effectiveFrom: payload.effectiveFrom || (payload.effectiveMonth ? `${payload.effectiveMonth}-01` : new Date().toISOString().slice(0, 10)),
      newBaseSalary: payload.newSalary ?? payload.newBaseSalary,
      reason: payload.reason,
    }),
  confirmSocialInsuranceReconciliationV3: (changeId: number | string, payload: { reconciliationCode: string; note?: string }) =>
    api.confirmInsuranceChangeV3(changeId, { externalDossierCode: payload.reconciliationCode }),
  exportSocialInsuranceExcelV3: async (params?: any) => {
    return { fileName: "Danh_sach_BHXH.xlsx", fileUrl: "", totalRecords: 0 };
  },
  downloadSocialInsuranceImportTemplateV3: () => api.downloadInsuranceImportTemplateV3(),
  importSocialInsuranceExcelV3: (file: File) => api.importInsuranceExcelV3(file),

  // ================= 06. Chế độ phụ cấp (Benefits & Allowances) OpenAPI 3.0 Methods =================
  getBenefitsAllowanceSummaryV3: (projectId?: string | number) => {
    const query = projectId && projectId !== "all" ? `?projectId=${projectId}` : "";
    return request<BenefitsAllowanceSummaryResponse>(`/api/web/payroll/benefits-allowances/summary${query}`).then((res) => res.data);
  },

  getMasterAllowanceTypesV3: () =>
    request<Array<{ code: string; name: string; defaultAmount: number; unit?: string }>>(
      "/api/web/payroll/master-data/allowance-types"
    ).then((res) => res.data),

  getBenefitsAllowanceProjectDefaultsV3: () =>
    request<EmployeeAllowanceItemV3[]>("/api/web/payroll/benefits-allowances/project-defaults").then((res) => res.data),

  getBenefitsAllowanceEmployeesV3: (params?: {
    projectId?: string | number;
    mode?: BenefitsAllowanceMode | string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && String(v) !== "" && v !== "all")
        .map(([k, v]) => [k, String(v)])
    );
    return request<BenefitsAllowanceListResponse>(`/api/web/payroll/benefits-allowances/employees?${query}`).then((res) => res.data);
  },

  getBenefitsAllowanceDetailV3: (employeeCode: string) =>
    request<BenefitsAllowanceEmployeeV3>(`/api/web/payroll/benefits-allowances/employees/${encodeURIComponent(employeeCode)}`).then((res) => res.data),

  updateBenefitsAllowanceV3: (employeeCode: string, payload: UpdateBenefitsAllowanceRequestV3) =>
    request<BenefitsAllowanceEmployeeV3>(`/api/web/payroll/benefits-allowances/employees/${encodeURIComponent(employeeCode)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }).then((res) => res.data),

  restoreBenefitsAllowanceDefaultV3: (employeeCode: string) =>
    request<BenefitsAllowanceEmployeeV3>(
      `/api/web/payroll/benefits-allowances/employees/${encodeURIComponent(employeeCode)}/restore-project-default`,
      { method: "POST" }
    ).then((res) => res.data),

  getBenefitsAllowanceHistoryV3: (employeeCode: string) =>
    request<{ employeeCode: string; history: any[] }>(
      `/api/web/payroll/benefits-allowances/employees/${encodeURIComponent(employeeCode)}/history`
    ).then((res) => res.data),

  exportBenefitsAllowancesExcelV3: async (params?: {
    projectId?: string | number;
    mode?: string;
    search?: string;
  }): Promise<{ fileName: string; fileUrl: string; totalRecords: number }> => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && String(v) !== "" && v !== "all")
        .map(([k, v]) => [k, String(v)])
    );
    return request<{ fileName: string; fileUrl: string; totalRecords: number }>(
      `/api/web/payroll/benefits-allowances/export?${query}`
    ).then((res) => res.data);
  },

  downloadBenefitsAllowancesImportTemplateV3: async (): Promise<void> => {
    const res = await fetch("/api/web/payroll/benefits-allowances/import/template");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Mau_Import_Phu_Cap.xlsx";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  importBenefitsAllowancesExcelV3: async (file: File, projectId?: number | string): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    if (projectId) formData.append("projectId", String(projectId));
    return request<any>("/api/web/payroll/benefits-allowances/import", {
      method: "POST",
      body: formData,
    }).then((res) => res.data);
  },

  getBenefitsAllowancesAuditLogsV3: (params?: { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && String(v) !== "")
        .map(([k, v]) => [k, String(v)])
    );
    return request<{ items: any[]; total: number }>(`/api/web/payroll/benefits-allowances/audit-logs?${query}`).then((res) => res.data);
  },

  // ================= 07. Khoản giảm trừ khác (WebPayroll - Other Deductions) Swagger Methods =================
  getOtherDeductionTypesV3: () =>
    request<any>("/api/web/payroll/other-deduction-types").then((res) => {
      const raw = res.data || res || [];
      const list = Array.isArray(raw) ? raw : raw.items || raw.data || [];
      return list.map((item: any) => ({
        id: Number(item.id ?? item.Id ?? 0),
        deductionCode: item.deductionCode || item.DeductionCode || item.code || "",
        deductionName: item.deductionName || item.DeductionName || item.name || "",
      })) as OtherDeductionTypeItem[];
    }),

  getMasterOtherDeductionTypesV3: () => api.getOtherDeductionTypesV3(),

  getOtherDeductionsV3: (params?: {
    projectId?: string | number;
    month?: number | string;
    year?: number | string;
    deductionTypeId?: number | string;
    keyword?: string;
    pageIndex?: number;
    pageSize?: number;
  }) => {
    const pageIndex = Number(params?.pageIndex ?? 1);
    const pageSize = Number(params?.pageSize ?? 20);

    const queryObj: Record<string, string> = {
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    };

    if (params?.projectId && String(params.projectId) !== "all") {
      queryObj.projectId = String(params.projectId);
    }
    if (params?.month && String(params.month) !== "all") {
      queryObj.month = String(params.month);
    }
    if (params?.year && String(params.year) !== "all") {
      queryObj.year = String(params.year);
    }
    if (params?.deductionTypeId && String(params.deductionTypeId) !== "all") {
      queryObj.deductionTypeId = String(params.deductionTypeId);
    }
    if (params?.keyword && params.keyword.trim()) {
      queryObj.keyword = params.keyword.trim();
    }

    const query = new URLSearchParams(queryObj).toString();
    return request<any>(`/api/web/payroll/other-deductions?${query}`).then((res) => {
      const rawData = res.data || res || {};
      const rawList = Array.isArray(rawData)
        ? rawData
        : rawData.items || rawData.Items || rawData.data || rawData.rows || [];

      const items: OtherDeductionItemV3[] = rawList.map((item: any, idx: number) => {
        const empCode = item.employeeCode || item.EmployeeCode || item.code || "";
        const empName = item.employeeName || item.EmployeeName || item.fullName || item.name || "";
        const dTypeId = item.otherDeductionTypeId ?? item.OtherDeductionTypeId ?? item.deductionTypeId ?? null;
        const dCode = item.deductionCode || item.DeductionCode || item.type || "";
        const dName = item.deductionName || item.DeductionName || item.typeName || "Khoản giảm trừ";

        return {
          id: Number(item.id ?? item.Id ?? item.deductionId ?? idx + 1),
          employee: {
            employeeCode: empCode,
            fullName: empName,
            department: item.departmentName || item.department || "",
            project: item.projectId
              ? {
                  projectId: Number(item.projectId),
                  projectCode: item.projectCode || String(item.projectId),
                  projectName: item.projectName || "",
                }
              : undefined,
          },
          month: item.month ? String(item.month) : undefined,
          year: item.year ? Number(item.year) : undefined,
          payrollPeriodId: item.payrollPeriodId ?? item.PayrollPeriodId ?? null,
          deductionTypeId: dTypeId ? Number(dTypeId) : null,
          deductionCode: dCode,
          deductionName: dName,
          type: dCode,
          typeName: dName,
          amount: Number(item.amount ?? item.Amount ?? 0),
          decisionNumber: item.decisionNumber || item.DecisionNumber || "",
          decisionDate: item.decisionDate || item.DecisionDate || "",
          note: item.note || item.Note || item.reason || "",
          reason: item.note || item.Note || item.reason || "",
          fileName: item.fileName || item.FileName || item.documentFileName || "",
          filePath: item.filePath || item.FilePath || item.documentFilePath || "",
          attachment: (item.fileName || item.FileName || item.filePath || item.FilePath)
            ? {
                fileName: item.fileName || item.FileName || "Chung_tu_dinh_kem.pdf",
                fileUrl: item.filePath || item.FilePath || "",
                fileSize: 1024,
              }
            : null,
          updatedBy: {
            id: item.updatedBy?.id || item.createdById || 0,
            fullName: item.updatedBy?.fullName || item.createdByName || "Hệ thống",
            roleName: item.updatedBy?.roleName || "Quản trị viên",
          },
          updatedAt: item.updatedAt || item.UpdatedAt || item.createdAt || "",
        };
      });

      const total = Number(rawData.totalRow ?? rawData.total ?? rawData.Total ?? items.length);

      return {
        items,
        total,
        pageIndex,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      };
    });
  },

  getOtherDeductionsListV3: (params?: {
    projectId?: string | number;
    month?: string;
    type?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => {
    let parsedMonth: number | undefined;
    let parsedYear: number | undefined;
    if (params?.month && params.month.includes("-")) {
      const parts = params.month.split("-");
      parsedYear = Number(parts[0]);
      parsedMonth = Number(parts[1]);
    }
    return api.getOtherDeductionsV3({
      projectId: params?.projectId,
      month: parsedMonth,
      year: parsedYear,
      deductionTypeId: params?.type,
      keyword: params?.search,
      pageIndex: params?.page,
      pageSize: params?.pageSize,
    });
  },

  getOtherDeductionDetailV3: (id: number | string) =>
    request<any>(`/api/web/payroll/other-deductions/${id}`).then((res) => res.data),

  createOtherDeductionV3: (payload: CreateOtherDeductionRequest) =>
    request<any>("/api/web/payroll/other-deductions", {
      method: "POST",
      body: JSON.stringify({
        EmployeeCode: payload.employeeCode,
        PayrollPeriodId: payload.payrollPeriodId,
        OtherDeductionTypeId: payload.otherDeductionTypeId,
        Amount: payload.amount,
        DecisionNumber: payload.decisionNumber,
        DecisionDate: payload.decisionDate,
        Note: payload.note || payload.reason,
        FileName: payload.fileName,
        FilePath: payload.filePath,
      }),
    }).then((res) => res.data),

  updateOtherDeductionV3: (id: number | string, payload: UpdateOtherDeductionRequest) =>
    request<any>(`/api/web/payroll/other-deductions/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        EmployeeCode: payload.employeeCode,
        PayrollPeriodId: payload.payrollPeriodId,
        OtherDeductionTypeId: payload.otherDeductionTypeId,
        Amount: payload.amount,
        DecisionNumber: payload.decisionNumber,
        DecisionDate: payload.decisionDate,
        Note: payload.note,
        FileName: payload.fileName,
        FilePath: payload.filePath,
      }),
    }).then((res) => res.data),

  deleteOtherDeductionV3: (id: number | string) =>
    request<any>(`/api/web/payroll/other-deductions/${id}`, {
      method: "DELETE",
    }).then((res) => res.data),

  getOtherDeductionDocumentV3: (id: number | string) =>
    request<any>(`/api/web/payroll/other-deductions/${id}/document`).then((res) => res.data),

  saveOtherDeductionDocumentV3: (id: number | string, payload: { fileName?: string; filePath?: string }) =>
    request<any>(`/api/web/payroll/other-deductions/${id}/document`, {
      method: "POST",
      body: JSON.stringify({
        DeductionId: Number(id),
        FileName: payload.fileName,
        FilePath: payload.filePath,
      }),
    }).then((res) => res.data),

  importOtherDeductionsExcelV3: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    return request<any>("/api/web/payroll/other-deductions/import", {
      method: "POST",
      body: formData,
    }).then((res) => res.data);
  },

  downloadOtherDeductionsImportTemplateV3: async (): Promise<void> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const headers: Record<string, string> = { Accept: "*/*" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}/web/payroll/other-deductions/import-template`, {
      method: "GET",
      headers,
    });
    if (!res.ok) {
      throw new ApiRequestError(
        `Không thể tải biểu mẫu import (Status: ${res.status})`,
        "DOWNLOAD_TEMPLATE_FAILED",
        res.status
      );
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Template_Import_KhoanTruKhac.xlsx";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // ================= 08. Thu nhập khác (WebPayroll - Other Income) OpenAPI 3.0 Methods =================
  getOtherIncomeTypesV3: () =>
    request<OtherIncomeTypeItem[]>("/api/web/payroll/other-income-types").then((res) => res.data || []),

  getOtherIncomesV3: async (params?: {
    projectId?: string | number;
    month?: number | string;
    year?: number | string;
    incomeTypeId?: number | string;
    keyword?: string;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<OtherIncomesListResponseV3> => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && String(v) !== "" && v !== "all")
        .map(([k, v]) => [k, String(v)])
    );

    const pageIndex = Number(params?.pageIndex || 1);
    const pageSize = Number(params?.pageSize || 20);

    return request<any>(`/api/web/payroll/other-incomes?${query}`).then((res) => {
      const rawData = res.data;
      if (!rawData) {
        return {
          items: [],
          total: 0,
          pageIndex,
          pageSize,
          totalPages: 1,
        };
      }

      const rawItems = Array.isArray(rawData) ? rawData : (rawData.items || rawData.data || []);
      const items: OtherIncomeItemV3[] = rawItems.map((item: any) => {
        const empCode = item.employeeCode || item.EmployeeCode || item.employee?.employeeCode || item.code || "";
        const empName = item.employeeName || item.EmployeeName || item.employee?.fullName || item.name || "Nhân viên";

        return {
          id: Number(item.id || item.Id || item.incomeId || Date.now()),
          employeeCode: empCode,
          employeeName: empName,
          employee: {
            employeeCode: empCode,
            fullName: empName,
            department: item.employee?.department || item.department || "",
            position: item.employee?.position || item.position || "",
            projectCode: item.employee?.projectCode || item.projectCode || "",
          },
          incomeTypeId: item.incomeTypeId || item.IncomeTypeId || item.otherIncomeTypeId || item.OtherIncomeTypeId,
          incomeCode: item.incomeCode || item.IncomeCode || item.typeCode || "",
          incomeName: item.incomeName || item.IncomeName || item.typeName || item.TypeName || "Thu nhập khác",
          otherIncomeTypeId: item.otherIncomeTypeId || item.OtherIncomeTypeId || item.incomeTypeId || item.IncomeTypeId,
          amount: Number(item.amount ?? item.Amount ?? 0),
          decisionNumber: item.decisionNumber || item.DecisionNumber || null,
          decisionDate: item.decisionDate || item.DecisionDate || null,
          note: item.note || item.Note || item.reason || item.Reason || "",
          reason: item.reason || item.Reason || item.note || item.Note || "",
          fileName: item.fileName || item.FileName || item.documentFileName || "",
          filePath: item.filePath || item.FilePath || item.documentFilePath || "",
          attachment: (item.fileName || item.FileName || item.filePath || item.FilePath)
            ? {
                id: Number(item.attachmentId || item.id || 1),
                fileName: item.fileName || item.FileName || "Chung_tu_thu_nhap.pdf",
                fileUrl: item.filePath || item.FilePath || "",
                fileSize: 1024,
              }
            : null,
          updatedBy: {
            id: item.updatedBy?.id || item.createdById || 0,
            fullName: item.updatedBy?.fullName || item.createdByName || "Hệ thống",
            roleName: item.updatedBy?.roleName || "Quản trị viên",
          },
          updatedAt: item.updatedAt || item.UpdatedAt || item.createdAt || "",
        };
      });

      const total = Number(rawData.totalRow ?? rawData.total ?? rawData.Total ?? items.length);

      return {
        items,
        total,
        pageIndex,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      };
    });
  },

  getOtherIncomesListV3: (params?: {
    projectId?: string | number;
    month?: string;
    type?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => {
    let parsedMonth: number | undefined;
    let parsedYear: number | undefined;
    if (params?.month && params.month.includes("-")) {
      const parts = params.month.split("-");
      parsedYear = Number(parts[0]);
      parsedMonth = Number(parts[1]);
    }
    return api.getOtherIncomesV3({
      projectId: params?.projectId,
      month: parsedMonth,
      year: parsedYear,
      incomeTypeId: params?.type,
      keyword: params?.search,
      pageIndex: params?.page,
      pageSize: params?.pageSize,
    });
  },

  getOtherIncomeDetailV3: (id: number | string) =>
    request<any>(`/api/web/payroll/other-incomes/${id}`).then((res) => res.data),

  createOtherIncomeV3: (payload: CreateOtherIncomeRequest) =>
    request<any>("/api/web/payroll/other-incomes", {
      method: "POST",
      body: JSON.stringify({
        EmployeeCode: payload.employeeCode,
        PayrollPeriodId: payload.payrollPeriodId,
        OtherIncomeTypeId: payload.otherIncomeTypeId,
        Amount: payload.amount,
        DecisionNumber: payload.decisionNumber,
        DecisionDate: payload.decisionDate,
        Note: payload.note || payload.reason,
        FileName: payload.fileName,
        FilePath: payload.filePath,
      }),
    }).then((res) => res.data),

  updateOtherIncomeV3: (id: number | string, payload: UpdateOtherIncomeRequest) =>
    request<any>(`/api/web/payroll/other-incomes/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        EmployeeCode: payload.employeeCode,
        PayrollPeriodId: payload.payrollPeriodId,
        OtherIncomeTypeId: payload.otherIncomeTypeId,
        Amount: payload.amount,
        DecisionNumber: payload.decisionNumber,
        DecisionDate: payload.decisionDate,
        Note: payload.note,
        FileName: payload.fileName,
        FilePath: payload.filePath,
      }),
    }).then((res) => res.data),

  deleteOtherIncomeV3: (id: number | string) =>
    request<any>(`/api/web/payroll/other-incomes/${id}`, {
      method: "DELETE",
    }).then((res) => res.data),

  getOtherIncomeDocumentV3: (id: number | string) =>
    request<any>(`/api/web/payroll/other-incomes/${id}/document`).then((res) => res.data),

  saveOtherIncomeDocumentV3: (id: number | string, payload: { fileName?: string; filePath?: string }) =>
    request<any>(`/api/web/payroll/other-incomes/${id}/document`, {
      method: "POST",
      body: JSON.stringify({
        IncomeId: Number(id),
        FileName: payload.fileName,
        FilePath: payload.filePath,
      }),
    }).then((res) => res.data),

  importOtherIncomesExcelV3: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<any>("/api/web/payroll/other-incomes/import", {
      method: "POST",
      body: formData,
    }).then((res) => res.data);
  },

  downloadOtherIncomesImportTemplateV3: async (): Promise<void> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const headers: Record<string, string> = { Accept: "*/*" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}/web/payroll/other-incomes/import-template`, {
      method: "GET",
      headers,
    });
    if (!res.ok) {
      throw new ApiRequestError(
        `Không thể tải biểu mẫu import thu nhập khác (Status: ${res.status})`,
        "DOWNLOAD_TEMPLATE_FAILED",
        res.status
      );
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Template_Import_ThuNhapKhac.xlsx";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },




  getProjectEmployeeGroups: async (projectId: string): Promise<ProjectEmployeeGroup[]> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/employee-groups`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể tải danh sách nhóm người lao động (Status: ${response.status})`,
        "FETCH_EMPLOYEE_GROUPS_FAILED",
        response.status
      );
    }
    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi lấy danh sách nhóm người lao động",
        "API_ERROR",
        response.status
      );
    }
    const rawItems: any[] = Array.isArray(resJson.data)
      ? resJson.data
      : Array.isArray(resJson.data?.items)
      ? resJson.data.items
      : [];
    return rawItems.map((item: any, idx: number) => ({
      id: String(item.id ?? item.groupId ?? item.Id ?? idx + 1),
      projectId: String(projectId),
      name: item.groupName ?? item.name ?? item.GroupName ?? `Nhóm ${item.id}`,
      code: item.groupCode ?? item.code ?? `GRP_${item.id ?? idx + 1}`,
      description: item.description ?? item.Description ?? null,
      colorTone: (item.colorTone || "primary") as any,
      employeeCount: typeof item.employeeCount === "number" ? item.employeeCount : (item.totalEmployees ?? item.EmployeeCount ?? 0),
    }));
  },
  createProjectEmployeeGroup: async (
    projectId: string,
    payload: Partial<ProjectEmployeeGroup>
  ): Promise<ProjectEmployeeGroup> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/employee-groups`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        GroupName: payload.name || "Nhóm mới",
      }),
    });

    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể tạo nhóm người lao động (Status: ${response.status})`,
        "CREATE_EMPLOYEE_GROUP_FAILED",
        response.status
      );
    }
    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi tạo nhóm người lao động",
        "API_ERROR",
        response.status
      );
    }
    const item = resJson.data || {};
    return {
      id: String(item.id ?? item.groupId ?? item.Id ?? Date.now()),
      projectId: String(projectId),
      name: item.groupName ?? payload.name ?? "Nhóm mới",
      code: item.groupCode ?? payload.code ?? `GRP_${item.id ?? Date.now().toString().slice(-4)}`,
      description: item.description ?? payload.description ?? null,
      colorTone: "primary",
      employeeCount: 0,
    };
  },
  updateProjectEmployeeGroup: async (
    projectId: string,
    groupId: string | number,
    payload: Partial<ProjectEmployeeGroup>
  ): Promise<boolean> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/employee-groups/${groupId}`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        GroupName: payload.name || "",
      }),
    });

    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể cập nhật nhóm người lao động (Status: ${response.status})`,
        "UPDATE_EMPLOYEE_GROUP_FAILED",
        response.status
      );
    }
    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi cập nhật nhóm người lao động",
        "API_ERROR",
        response.status
      );
    }
    return true;
  },
  deleteProjectEmployeeGroup: async (
    projectId: string,
    groupId: string | number
  ): Promise<boolean> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/employee-groups/${groupId}`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể xóa nhóm người lao động (Status: ${response.status})`,
        "DELETE_EMPLOYEE_GROUP_FAILED",
        response.status
      );
    }
    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi xóa nhóm người lao động",
        "API_ERROR",
        response.status
      );
    }
    return true;
  },
  assignEmployeesToGroup: async (
    projectId: string,
    groupId: string | number,
    payload: { employeeCodes?: string[]; employeeIds?: string[] }
  ): Promise<{ success: boolean; message?: string; updatedCount?: number }> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/employee-groups/${groupId}/employees`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const codes = payload.employeeCodes || payload.employeeIds || [];
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        EmployeeCodes: codes,
      }),
    });

    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể phân bổ nhân sự vào nhóm (Status: ${response.status})`,
        "ASSIGN_EMPLOYEES_GROUP_FAILED",
        response.status
      );
    }
    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi phân bổ nhân sự vào nhóm",
        "API_ERROR",
        response.status
      );
    }
    return {
      success: true,
      message: resJson?.message || `Đã phân bổ ${codes.length} nhân viên vào nhóm thành công`,
      updatedCount: codes.length,
    };
  },
  getActivityLogs: async (params?: { projectId?: string; module?: ActivityLogModule; q?: string }): Promise<ActivityLogItem[]> => {
    try {
      if (params?.module === "dependents") {
        const res = await api.getDependentAuditLogsV3();
        return (res?.items || []).map((item: any) => ({
          id: String(item.id),
          projectId: params.projectId || "",
          module: "dependents",
          actionType: (item.eventType === "APPROVE" ? "approve" : item.eventType === "REJECT" ? "reject" : "update") as any,
          actionLabel: item.eventType === "APPROVE" ? "Phê duyệt" : item.eventType === "REJECT" ? "Từ chối" : "Cập nhật",
          details: item.description || "Thao tác người phụ thuộc",
          changedBy: item.actor?.fullName || item.actorName || "Hệ thống",
          createdAt: item.occurredAt || new Date().toISOString(),
          employeeCode: item.employee?.employeeCode,
          employeeName: item.employee?.fullName,
        }));
      }
      if (params?.module === "union") {
        const res = await api.getUnionDuesAuditLogsV3();
        return (res?.items || []).map((item: any) => ({
          id: String(item.id),
          projectId: params.projectId || "",
          module: "union",
          actionType: (item.eventType === "JOINED" ? "join" : item.eventType === "LEFT" ? "leave" : "update") as any,
          actionLabel: item.eventType === "JOINED" ? "Gia nhập" : item.eventType === "LEFT" ? "Ngừng tham gia" : "Cập nhật",
          details: item.description || "Thao tác công đoàn phí",
          changedBy: item.actor?.fullName || item.actorName || "Hệ thống",
          createdAt: item.occurredAt || new Date().toISOString(),
          employeeCode: item.employee?.employeeCode,
          employeeName: item.employee?.fullName,
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  // Salary Structures (Quy chế lương) APIs
  getSalaryStructures: async (projectId: string): Promise<SalaryStructure[]> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/salary-structures`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể tải danh sách quy chế lương (Status: ${response.status})`,
        "FETCH_SALARY_STRUCTURES_FAILED",
        response.status
      );
    }
    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi lấy danh sách quy chế lương",
        "API_ERROR",
        response.status
      );
    }
    const rawItems: any[] = Array.isArray(resJson.data) ? resJson.data : [];
    return rawItems.map((item: any) => ({
      id: Number(item.id),
      code: item.code ?? item.StructureCode ?? "",
      name: item.name ?? item.StructureName ?? "",
      isActive: Boolean(item.isActive ?? item.IsActive ?? true),
      description: item.description ?? item.Description ?? null,
    }));
  },

  createSalaryStructure: async (
    projectId: string,
    payload: SalaryStructurePayload
  ): Promise<SalaryStructure> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/salary-structures`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể tạo quy chế lương (Status: ${response.status})`,
        "CREATE_SALARY_STRUCTURE_FAILED",
        response.status
      );
    }
    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi tạo quy chế lương",
        "API_ERROR",
        response.status
      );
    }
    const item = resJson.data || {};
    return {
      id: Number(item.id),
      code: item.code ?? payload.StructureCode,
      name: item.name ?? payload.StructureName,
      isActive: Boolean(item.isActive ?? payload.IsActive),
      description: item.description ?? payload.Description ?? null,
    };
  },

  updateSalaryStructure: async (
    projectId: string,
    structureId: number | string,
    payload: SalaryStructurePayload
  ): Promise<boolean> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/salary-structures/${structureId}`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể cập nhật quy chế lương (Status: ${response.status})`,
        "UPDATE_SALARY_STRUCTURE_FAILED",
        response.status
      );
    }
    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi cập nhật quy chế lương",
        "API_ERROR",
        response.status
      );
    }
    return true;
  },

  deleteSalaryStructure: async (
    projectId: string,
    structureId: number | string
  ): Promise<boolean> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/salary-structures/${structureId}`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể xóa quy chế lương (Status: ${response.status})`,
        "DELETE_SALARY_STRUCTURE_FAILED",
        response.status
      );
    }
    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi xóa quy chế lương",
        "API_ERROR",
        response.status
      );
    }
    return true;
  },

  // Salary Components (Danh mục thành phần lương Master)
  getSalaryComponents: async (params?: {
    search?: string;
    salaryStructureId?: number;
  }): Promise<SalaryComponentMaster[]> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.salaryStructureId !== undefined) query.set("salaryStructureId", String(params.salaryStructureId));

    const url = `${baseUrl}/web/payroll/salary-components${query.toString() ? `?${query.toString()}` : ""}`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể tải danh mục thành phần lương (Status: ${response.status})`,
        "FETCH_SALARY_COMPONENTS_FAILED",
        response.status
      );
    }
    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi lấy danh mục thành phần lương",
        "API_ERROR",
        response.status
      );
    }
    const rawGroups: any[] = Array.isArray(resJson.data) ? resJson.data : [];
    const allComponents: SalaryComponentMaster[] = [];

    for (const group of rawGroups) {
      const groupCategory: "income" | "deduction" =
        group.code === "deduction" || group.sign === -1 ? "deduction" : "income";

      if (Array.isArray(group.components) && group.components.length > 0) {
        for (const comp of group.components) {
          allComponents.push({
            id: Number(comp.id),
            code: comp.code || `COMP_${comp.id}`,
            name: comp.name || comp.code,
            category: groupCategory,
            description: comp.description || null,
            defaultFormulaText: comp.defaultFormula || comp.expression || `{${comp.code}}`,
            outputVariable: comp.code || `COMP_${comp.id}`,
            isActive: !comp.isDisabled,
          });
        }
      } else if (group.code && !group.components) {
        // Flat item fallback
        allComponents.push({
          id: Number(group.id ?? group.ComponentId),
          code: group.code ?? group.ComponentCode ?? "",
          name: group.name ?? group.ComponentName ?? "",
          category: (group.category ?? group.Category ?? "income").toLowerCase(),
          description: group.description ?? group.Description ?? null,
          defaultFormulaText: group.defaultFormulaText ?? group.DefaultFormulaText ?? null,
          outputVariable: group.outputVariable ?? group.OutputVariable ?? null,
          isActive: Boolean(group.isActive ?? group.IsActive ?? true),
        });
      }
    }

    return allComponents;
  },

  // Salary Structure Lines (Dòng công thức trong quy chế)
  getSalaryStructureLines: async (
    projectId: string,
    structureId: number | string
  ): Promise<SalaryStructureLine[]> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/salary-structures/${structureId}/lines`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể tải dòng công thức quy chế (Status: ${response.status})`,
        "FETCH_SALARY_STRUCTURE_LINES_FAILED",
        response.status
      );
    }
    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi lấy danh sách dòng công thức quy chế",
        "API_ERROR",
        response.status
      );
    }
    const rawItems: any[] = Array.isArray(resJson.data) ? resJson.data : [];
    return rawItems.map((item: any) => ({
      id: item.id ?? item.LineId,
      structureId: Number(item.salaryStructureId ?? item.StructureId ?? structureId),
      componentId: Number(item.componentId ?? item.ComponentId),
      componentCode: item.componentCode ?? item.ComponentCode ?? "",
      componentName: item.componentName ?? item.ComponentName ?? "",
      targetGroupId: item.targetGroupId ?? item.TargetGroupId ?? null,
      targetGroupName: item.targetGroupName ?? item.TargetGroupName ?? null,
      formulaDefinitionId: item.formulaDefinitionId ?? item.FormulaDefinitionId ?? null,
      formulaType: item.formulaType ?? item.FormulaType ?? "EXPRESSION",
      expression: item.expression ?? item.Expression ?? "",
      executionOrder: Number(item.executionOrder ?? item.ExecutionOrder ?? 0),
      displayOrder: Number(item.displayOrder ?? item.DisplayOrder ?? 0),
      isVisibleOnPayslip: Boolean(item.isVisibleOnPayslip ?? item.IsVisibleOnPayslip ?? true),
      isVisibleOnReport: Boolean(item.isVisibleOnReport ?? item.IsVisibleOnReport ?? true),
      aggregationTarget: item.aggregationTarget ?? item.AggregationTarget ?? "INCOME",
      isEnabled: Boolean(item.isEnabled ?? item.IsEnabled ?? true),
      note: item.note ?? item.Note ?? null,
    }));
  },

  saveSalaryStructureLines: async (
    projectId: string,
    structureId: number | string,
    lines: SalaryStructureLineItemRequest[]
  ): Promise<boolean> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/salary-structures/${structureId}/lines`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(lines),
    });

    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể lưu các dòng công thức quy chế (Status: ${response.status})`,
        "SAVE_SALARY_STRUCTURE_LINES_FAILED",
        response.status
      );
    }
    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi lưu các dòng công thức quy chế",
        "API_ERROR",
        response.status
      );
    }
    return true;
  },

  batchUpdateSalaryStructureLines: async (
    projectId: string,
    structureId: number | string,
    lines: SalaryStructureLineItemRequest[]
  ): Promise<boolean> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/salary-structures/${structureId}/lines`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(lines),
    });

    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể cập nhật các dòng công thức quy chế (Status: ${response.status})`,
        "UPDATE_SALARY_STRUCTURE_LINES_FAILED",
        response.status
      );
    }
    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi cập nhật các dòng công thức quy chế",
        "API_ERROR",
        response.status
      );
    }
    return true;
  },

  updateSalaryStructureLine: async (
    projectId: string,
    structureId: number | string,
    lineId: number | string,
    payload: SalaryStructureLineItemRequest
  ): Promise<boolean> => {
    return api.batchUpdateSalaryStructureLines(projectId, structureId, [
      { ...payload, LineId: Number(lineId) },
    ]);
  },

  batchDeleteSalaryStructureLines: async (
    projectId: string,
    structureId: number | string,
    lineIds: number[]
  ): Promise<boolean> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/salary-structures/${structureId}/lines`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "DELETE",
      headers,
      body: JSON.stringify(lineIds),
    });

    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể xóa các dòng công thức quy chế (Status: ${response.status})`,
        "DELETE_SALARY_STRUCTURE_LINES_FAILED",
        response.status
      );
    }
    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi xóa các dòng công thức quy chế",
        "API_ERROR",
        response.status
      );
    }
    return true;
  },

  deleteSalaryStructureLine: async (
    projectId: string,
    structureId: number | string,
    lineId: number | string
  ): Promise<boolean> => {
    return api.batchDeleteSalaryStructureLines(projectId, structureId, [Number(lineId)]);
  },

  // Variables (Biến & Tham số tính toán)
  getAllVariables: async (search?: string): Promise<BackendVariable[]> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const query = new URLSearchParams();
    if (search) query.set("search", search);

    const url = `${baseUrl}/web/payroll/variables/all${query.toString() ? `?${query.toString()}` : ""}`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể tải danh sách biến hệ thống (Status: ${response.status})`,
        "FETCH_VARIABLES_FAILED",
        response.status
      );
    }
    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi lấy danh sách biến",
        "API_ERROR",
        response.status
      );
    }
    const rawItems: any[] = Array.isArray(resJson.data) ? resJson.data : [];
    return rawItems.map((item: any) => {
      const srcType = String(item.sourceType || item.SourceType || "").toLowerCase();
      let groupName = item.group ?? item.Group ?? "custom";
      if (!item.group && !item.Group) {
        if (srcType === "contract") groupName = "employee";
        else if (srcType === "timesheet") groupName = "attendance";
        else if (srcType === "policy") groupName = "policy";
      }

      return {
        id: Number(item.id ?? item.VariableId),
        code: item.code ?? item.VariableCode ?? "",
        name: item.name ?? item.VariableName ?? "",
        group: groupName,
        unit: item.unit ?? item.Unit ?? "",
        dataType: item.dataType ?? item.DataType ?? "decimal",
        defaultValue: item.defaultValue ?? item.DefaultValue ?? null,
        description: item.description ?? item.Description ?? null,
        isSystem: Boolean(item.isSystem ?? item.IsSystem ?? (srcType !== "custom" && srcType !== "")),
      };
    });
  },

  getProjectVariables: async (projectId: string): Promise<ProjectVariableResponse[]> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/variables`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể tải biến dự án (Status: ${response.status})`,
        "FETCH_PROJECT_VARIABLES_FAILED",
        response.status
      );
    }
    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi lấy danh sách biến dự án",
        "API_ERROR",
        response.status
      );
    }
    const rawItems: any[] = Array.isArray(resJson.data) ? resJson.data : [];
    return rawItems.map((item: any) => ({
      id: Number(item.id ?? item.Id ?? 0),
      projectId: Number(item.projectId ?? item.ProjectId ?? projectId),
      variableId: Number(item.variableId ?? item.VariableId ?? 0),
      code: item.code ?? item.VariableCode ?? "",
      name: item.name ?? item.VariableName ?? "",
      group: item.group ?? item.Group ?? "custom",
      unit: item.unit ?? item.Unit ?? "",
      value: item.value ?? item.Value ?? null,
      defaultValue: item.defaultValue ?? item.DefaultValue ?? null,
      description: item.description ?? item.Description ?? null,
      effectiveFrom: item.effectiveFrom ?? item.EffectiveFrom ?? null,
      effectiveTo: item.effectiveTo ?? item.EffectiveTo ?? null,
    }));
  },

  saveProjectVariables: async (
    projectId: string,
    payload: ProjectVariableItemRequest[]
  ): Promise<boolean> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/variables`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Đảm bảo mặc định Value của tham số đầu vào là "0" nếu null/undefined/empty
    const sanitizedPayload = payload.map((item) => ({
      ...item,
      Value: item.Value !== null && item.Value !== undefined && item.Value !== "" ? String(item.Value) : "0",
    }));

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(sanitizedPayload),
    });

    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể lưu biến tham số dự án (Status: ${response.status})`,
        "SAVE_PROJECT_VARIABLES_FAILED",
        response.status
      );
    }
    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi lưu biến tham số dự án",
        "API_ERROR",
        response.status
      );
    }
    return true;
  },

  deleteProjectVariable: async (
    projectId: string,
    variableId: number | string
  ): Promise<boolean> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/variables/${variableId}`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể xóa biến dự án (Status: ${response.status})`,
        "DELETE_PROJECT_VARIABLE_FAILED",
        response.status
      );
    }
    const resJson: any = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi xóa biến dự án",
        "API_ERROR",
        response.status
      );
    }
    return true;
  },
};
