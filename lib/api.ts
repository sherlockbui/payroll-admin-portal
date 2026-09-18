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
  AuditLogListResponseV3,
  CreateDependentRequestV3,
  DependentDetailV3,
  DependentDocument,
  DependentListResponseV3,
  DependentSummaryResponseV3,
  DocumentTypeItem,
  ImportDependentResponseV3,
  RelationshipItem,
  UpdateDependentRequestV3,
  AnnualLeaveEmployee,
  AnnualLeaveHistoryResponse,
  AnnualLeaveListResponse,
  AnnualLeaveSummaryResponse,
  AnnualLeaveViewFilter,
  UnionDuesMemberV3,
  UnionDuesHistoryResponse,
  UnionDuesListResponse,
  UnionDuesSummaryResponse,
  UnionDuesParticipationStatus,
  UpdateUnionDuesRequestV3,
  StandardWorkdayEmployeeV3,
  StandardWorkdayMode,
  UpdateStandardWorkdayRequestV3,
  StandardWorkdaySummaryResponse,
  StandardWorkdayListResponse,
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
  OtherDeductionV3,
  OtherDeductionType,
  CreateOtherDeductionRequestV3,
  OtherDeductionsSummaryResponse,
  OtherDeductionsListResponse,
  OtherIncomeV3,
  OtherIncomeType,
  CreateOtherIncomeRequestV3,
  OtherIncomesSummaryResponse,
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

async function request<T>(url: string, init?: RequestInit): Promise<{ data: T; meta?: PaginationMeta }> {
  // 1. Chạy trực tiếp qua MSW handlers in-memory nếu đang ở môi trường nhúng / không có API server
  try {
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
  } catch (err) {
    if (err instanceof ApiRequestError) throw err;
    // Nếu có lỗi parse trong in-memory handler, fallback tiếp tục thử fetch
  }

  // 2. Fallback fetch thông thường
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new ApiRequestError(`API endpoint không tồn tại (Status: ${response.status})`, "NOT_FOUND", response.status);
  }
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || payload.error) {
    throw new ApiRequestError(payload.error?.message ?? "Yêu cầu thất bại", payload.error?.code ?? "UNKNOWN_ERROR", response.status, payload.error?.fields);
  }
  return { data: payload.data, meta: payload.meta };
}

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    if ((window as any).API_BASE_URL) return (window as any).API_BASE_URL;
    const widget = document.querySelector("payroll-projects, payroll-widget, payroll-employees");
    const attrUrl = widget?.getAttribute("api-base-url");
    if (attrUrl) return attrUrl;
  }
  return "https://bruh.thanhf.dev/api/";
}

export function getAuthToken(): string {
  if (typeof window !== "undefined") {
    if ((window as any).__SERVER_TOKEN) return (window as any).__SERVER_TOKEN;
    const widget = document.querySelector("payroll-projects, payroll-widget, payroll-employees");
    const attrToken = widget?.getAttribute("auth-token");
    if (attrToken) return attrToken;
  }
  return "";
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

    // 2. Mock Data danh sách dự án cho Demo UI/UX
    await new Promise((res) => setTimeout(res, 100));
    return [
      { id: "prj-jss", code: "JSS-ST", name: "Jabil Smart Solutions" },
      { id: "prj-swm", code: "SWM-DN", name: "SWM Đồng Nai" },
      { id: "prj-fxt", code: "FXT-HN", name: "Foxconn Tràng Duệ" },
      { id: "prj-lum", code: "LUM-HP", name: "Luxshare ICT" },
      { id: "prj-vtm", code: "VTM-VT", name: "Vietsovpetro Logistics" },
      { id: "prj-cpc", code: "CPC-DN", name: "CP Campuchia Food" },
    ];
  },
  getProjects: async (params: { q?: string; status?: string; page?: number; pageSize?: number }) => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const search = params.q ?? "";
    const pageIndex = params.page ?? 1;
    const pageSize = params.pageSize ?? 8;

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
   getFormulaVariables: () => request<FormulaVariable[]>("/api/formula-variables").then((item) => item.data),
  getProjectCustomVariables: (id: string) => request<ProjectCustomVariable[]>(`/api/projects/${id}/custom-variables`).then((item) => item.data),
  saveProjectCustomVariables: (id: string, payload: Array<{ code: string; value: number | null }>) => request<ProjectCustomVariable[]>(`/api/projects/${id}/custom-variables`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  getFormulas: (id: string) => request<SalaryFormula[]>(`/api/projects/${id}/formulas`).then((item) => item.data),
  saveFormulas: (id: string, payload: SalaryFormula[]) => request<SalaryFormula[]>(`/api/projects/${id}/formulas`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  validateFormulas: (id: string, payload: SalaryFormula[]) => request<{ valid: boolean; errors: string[] }>(`/api/projects/${id}/formulas/validate`, { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  getDataMappings: (id: string) => request<DataMapping[]>(`/api/projects/${id}/data-mappings`).then((item) => item.data),
  saveDataMappings: (id: string, payload: DataMapping[]) => request<DataMapping[]>(`/api/projects/${id}/data-mappings`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  validateDataMappings: (id: string) => request<{ valid: boolean; issues: string[]; checkedAt: string }>(`/api/projects/${id}/data-mappings/validate`, { method: "POST" }).then((item) => item.data),
  getTestEmployees: () => request<TestEmployee[]>("/api/test-employees").then((item) => item.data),
  runTest: (id: string, payload: { employeeId: string; period: string }) => request<TestRunResult>(`/api/projects/${id}/test-runs`, { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),

  // Employee Management APIs (Mocked for Demo UI/UX)
  getProjectEmployees: async (
    projectId: string,
    params?: { pageIndex?: number; pageSize?: number; search?: string; isAssigned?: boolean }
  ): Promise<{ items: Employee[]; totalRow: number; pageIndex: number; pageSize: number }> => {
    await new Promise((res) => setTimeout(res, 120));
    const all = seedDatabase.employees.filter(
      (e) => !projectId || projectId === "all" || e.projectId === projectId || projectId.startsWith("prj-")
    );
    const search = (params?.search || "").toLowerCase().trim();
    const filtered = all.filter((e) => {
      if (
        search &&
        !e.name.toLowerCase().includes(search) &&
        !e.code.toLowerCase().includes(search) &&
        !e.idCard.includes(search)
      )
        return false;
      if (params?.isAssigned === true && !e.groupId) return false;
      if (params?.isAssigned === false && e.groupId) return false;
      return true;
    });
    const pageIndex = params?.pageIndex ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const start = (pageIndex - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    return {
      items,
      totalRow: filtered.length,
      pageIndex,
      pageSize,
    };
  },
  getEmployees: (params?: { projectId?: string; q?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<Employee[]>(`/api/employees?${query}`).then((item) => item.data);
  },
  getDependents: (params?: { projectId?: string; employeeId?: string; status?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<Dependent[]>(`/api/dependents?${query}`).then((item) => item.data);
  },
  createDependent: (payload: Partial<Dependent>) =>
    request<Dependent>("/api/dependents", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  importDependents: (payload: { projectId: string; items: Partial<Dependent>[] }) =>
    request<Dependent[]>("/api/dependents/import", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  importDependentsFile: async (file: File): Promise<{ success: boolean; message?: string; data?: any }> => {
    await new Promise((res) => setTimeout(res, 500));
    return {
      success: true,
      message: `Đã nhập dữ liệu người phụ thuộc từ tệp ${file.name} thành công (Demo)`,
      data: { importedCount: 5 },
    };
  },
  confirmDependents: (ids: string[], verifiedBy?: string) =>
    request<Dependent[]>("/api/dependents/confirm", { method: "POST", body: JSON.stringify({ ids, verifiedBy }) }).then((item) => item.data),
  rejectDependent: (id: string, reason: string) =>
    request<Dependent>(`/api/dependents/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }).then((item) => item.data),
  updateDependent: (id: string, payload: Partial<Dependent>) =>
    request<Dependent>(`/api/dependents/${id}`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  updateDependentAttachment: (id: string, payload: { attachmentType: string; attachmentName: string; attachmentUrl?: string }) =>
    request<Dependent>(`/api/dependents/${id}/attachment`, { method: "PATCH", body: JSON.stringify(payload) }).then((item) => item.data),
  downloadDependentImportTemplate: async (projectId?: string | number): Promise<void> => {
    await new Promise((res) => setTimeout(res, 200));
    const dummyContent = "Mã NV,Tên NV,Họ tên NPT,Mối quan hệ,Ngày sinh,MST,Số CCCD,Thời gian từ,Thời gian đến\n";
    const blob = new Blob([dummyContent], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = "Mau_Nguoi_Phu_Thuoc_Demo.xlsx";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  },

  // ================= OpenAPI 3.0 (01-nguoi-phu-thuoc.yaml) Methods =================
  getDependentRelationshipsV3: () =>
    request<RelationshipItem[]>("/api/web/payroll/master-data/dependent-relationships").then((res) => res.data),

  getDependentDocumentTypesV3: () =>
    request<DocumentTypeItem[]>("/api/web/payroll/master-data/dependent-document-types").then((res) => res.data),

  getPayrollCyclesV3: () =>
    request<Array<{ id: number; code: string; name: string; isCurrent: boolean; startDate?: string; endDate?: string }>>("/api/web/payroll/payroll-cycles").then((res) => res.data),

  getProjectsV3: () =>
    request<Array<{ projectId: number; projectCode: string; projectName: string; active?: boolean }>>("/api/web/payroll/projects").then((res) => res.data),

  getProjectEmployeesV3: (projectId: number | string) =>
    request<Array<{ employeeCode: string; fullName: string; gender?: string; projectId?: number; projectCode?: string; projectName?: string; positionName?: string; taxCode?: string; idNumber?: string }>>(`/api/web/payroll/projects/${projectId}/employees`).then((res) => res.data),

  getDependentsSummaryV3: (projectId?: string | number) => {
    const query = projectId && projectId !== "all" ? `?projectId=${projectId}` : "";
    return request<DependentSummaryResponseV3>(`/api/web/payroll/dependents/summary${query}`).then((res) => res.data);
  },

  getDependentsV3: (params?: { projectId?: string | number; search?: string; relationship?: string; status?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && v !== "" && v !== "all")
        .map(([k, v]) => [k, String(v)])
    );
    return request<DependentListResponseV3>(`/api/web/payroll/dependents?${query}`).then((res) => res.data);
  },

  getDependentDetailV3: (dependentId: number | string) =>
    request<DependentDetailV3>(`/api/web/payroll/dependents/${dependentId}`).then((res) => res.data),

  createDependentV3: (payload: CreateDependentRequestV3) =>
    request<DependentDetailV3>("/api/web/payroll/dependents", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((res) => res.data),

  updateDependentV3: (dependentId: number | string, payload: UpdateDependentRequestV3) =>
    request<DependentDetailV3>(`/api/web/payroll/dependents/${dependentId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }).then((res) => res.data),

  deleteDependentV3: (dependentId: number | string) =>
    request<{ id: number }>(`/api/web/payroll/dependents/${dependentId}`, {
      method: "DELETE",
    }).then((res) => res.data),

  confirmDependentV3: (dependentId: number | string) =>
    request<DependentDetailV3>(`/api/web/payroll/dependents/${dependentId}/confirm`, {
      method: "POST",
    }).then((res) => res.data),

  approveDependentV3: (dependentId: number | string) =>
    request<DependentDetailV3>(`/api/web/payroll/dependents/${dependentId}/approve`, {
      method: "POST",
    }).then((res) => res.data),

  rejectDependentV3: (dependentId: number | string, reason: string) =>
    request<DependentDetailV3>(`/api/web/payroll/dependents/${dependentId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }).then((res) => res.data),

  bulkConfirmDependentsV3: (dependentIds: number[]) =>
    request<{ confirmedCount: number }>("/api/web/payroll/dependents/bulk-confirm", {
      method: "POST",
      body: JSON.stringify({ dependentIds }),
    }).then((res) => res.data),

  getDependentDocumentsV3: (dependentId: number | string) =>
    request<DependentDocument[]>(`/api/web/payroll/dependents/${dependentId}/documents`).then((res) => res.data),

  uploadDependentDocumentV3: (dependentId: number | string, formData: FormData) =>
    request<DependentDocument>(`/api/web/payroll/dependents/${dependentId}/documents`, {
      method: "POST",
      body: formData,
    }).then((res) => res.data),

  deleteDependentDocumentV3: (dependentId: number | string, documentId: number | string) =>
    request<{ documentId: number }>(`/api/web/payroll/dependents/${dependentId}/documents/${documentId}`, {
      method: "DELETE",
    }).then((res) => res.data),

  downloadDependentImportTemplateV3: async (): Promise<void> => {
    const res = await fetch("/api/web/payroll/dependents/import/template");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Template_Import_NguoiPhuThuoc_V3.xlsx";
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

  getDependentAuditLogsV3: (params?: { dependentId?: number | string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => [k, String(v)])
    );
    return request<AuditLogListResponseV3>(`/api/web/payroll/dependents/audit-logs?${query}`).then((res) => res.data);
  },

  // ================= 02. Phép năm (Annual Leave) OpenAPI 3.0 Methods =================
  getAnnualLeaveSummaryV3: (projectId?: string | number) => {
    const query = projectId && projectId !== "all" ? `?projectId=${projectId}` : "";
    return request<AnnualLeaveSummaryResponse>(`/api/web/payroll/annual-leave/summary${query}`).then((res) => res.data);
  },

  getAnnualLeaveEmployeesV3: (params?: {
    projectId?: string | number;
    view?: AnnualLeaveViewFilter | string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && v !== "" && v !== "all")
        .map(([k, v]) => [k, String(v)])
    );
    return request<AnnualLeaveListResponse>(`/api/web/payroll/annual-leave/employees?${query}`).then((res) => res.data);
  },

  getAnnualLeaveDetailV3: (employeeCode: string) =>
    request<AnnualLeaveEmployee>(`/api/web/payroll/annual-leave/employees/${encodeURIComponent(employeeCode)}`).then((res) => res.data),

  getAnnualLeaveHistoryV3: (
    employeeCode: string,
    params?: { year?: number | string; page?: number; pageSize?: number }
  ) => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => [k, String(v)])
    );
    return request<AnnualLeaveHistoryResponse>(
      `/api/web/payroll/annual-leave/employees/${encodeURIComponent(employeeCode)}/history?${query}`
    ).then((res) => res.data);
  },

  exportAnnualLeaveExcelV3: async (params?: {
    projectId?: string | number;
    view?: AnnualLeaveViewFilter | string;
    search?: string;
    year?: number | string;
  }): Promise<{ fileName: string; fileUrl: string; totalRecords: number; exportedAt: string }> => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && v !== "" && v !== "all")
        .map(([k, v]) => [k, String(v)])
    );
    return request<{ fileName: string; fileUrl: string; totalRecords: number; exportedAt: string }>(
      `/api/web/payroll/annual-leave/export?${query}`
    ).then((res) => res.data);
  },

  // ================= 03. Công đoàn phí (Union Dues) OpenAPI 3.0 Methods =================
  getUnionDuesSummaryV3: (projectId?: string | number) => {
    const query = projectId && projectId !== "all" ? `?projectId=${projectId}` : "";
    return request<UnionDuesSummaryResponse>(`/api/web/payroll/union-dues/summary${query}`).then((res) => res.data);
  },

  getUnionDuesMembersV3: (params?: {
    projectId?: string | number;
    participationStatus?: UnionDuesParticipationStatus | string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && v !== "" && v !== "all")
        .map(([k, v]) => [k, String(v)])
    );
    return request<UnionDuesListResponse>(`/api/web/payroll/union-dues/members?${query}`).then((res) => res.data);
  },

  getUnionDuesMemberDetailV3: (employeeCode: string) =>
    request<{ data: UnionDuesMemberV3 }>(`/api/web/payroll/union-dues/members/${encodeURIComponent(employeeCode)}`).then((res) => res.data.data),

  updateUnionDuesMemberV3: (employeeCode: string, payload: UpdateUnionDuesRequestV3) =>
    request<{ data: UnionDuesMemberV3 }>(`/api/web/payroll/union-dues/members/${encodeURIComponent(employeeCode)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }).then((res) => res.data.data),

  getUnionDuesHistoryV3: (employeeCode: string, params?: { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && String(v) !== "")
        .map(([k, v]) => [k, String(v)])
    );
    return request<UnionDuesHistoryResponse>(
      `/api/web/payroll/union-dues/members/${encodeURIComponent(employeeCode)}/history?${query}`
    ).then((res) => res.data);
  },

  exportUnionDuesExcelV3: async (params?: {
    projectId?: string | number;
    participationStatus?: string;
    search?: string;
  }): Promise<{ fileName: string; fileUrl: string; totalRecords: number; exportedAt: string }> => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && String(v) !== "" && v !== "all")
        .map(([k, v]) => [k, String(v)])
    );
    return request<{ fileName: string; fileUrl: string; totalRecords: number; exportedAt: string }>(
      `/api/web/payroll/union-dues/export?${query}`
    ).then((res) => res.data);
  },

  downloadUnionDuesImportTemplateV3: async (): Promise<void> => {
    const res = await fetch("/api/web/payroll/union-dues/import/template");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Template_Import_CongDoanPhi_V3.xlsx";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  importUnionDuesExcelV3: async (file: File, projectId?: number | string): Promise<{ totalRows: number; importedRows: number; errors: any[] }> => {
    const formData = new FormData();
    formData.append("file", file);
    if (projectId) formData.append("projectId", String(projectId));
    return request<{ totalRows: number; importedRows: number; errors: any[] }>("/api/web/payroll/union-dues/import", {
      method: "POST",
      body: formData,
    }).then((res) => res.data);
  },

  getUnionDuesAuditLogsV3: (params?: { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && String(v) !== "")
        .map(([k, v]) => [k, String(v)])
    );
    return request<{ items: any[]; total: number; page: number; pageSize: number }>(
      `/api/web/payroll/union-dues/audit-logs?${query}`
    ).then((res) => res.data);
  },

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

  // ================= 05. Bảo hiểm xã hội (Social Insurance D02-LT) OpenAPI 3.0 Methods =================
  getSocialInsuranceSummaryV3: (projectId?: string | number) => {
    const query = projectId && projectId !== "all" ? `?projectId=${projectId}` : "";
    return request<SocialInsuranceSummaryResponse>(`/api/web/payroll/social-insurance/summary${query}`).then((res) => res.data);
  },

  getSocialInsuranceMembersV3: (params?: {
    projectId?: string | number;
    status?: SocialInsuranceParticipationStatus | string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && String(v) !== "" && v !== "all")
        .map(([k, v]) => [k, String(v)])
    );
    return request<SocialInsuranceMemberListResponse>(`/api/web/payroll/social-insurance/members?${query}`).then((res) => res.data);
  },

  getSocialInsuranceMemberDetailV3: (employeeCode: string) =>
    request<SocialInsuranceMemberV3>(`/api/web/payroll/social-insurance/members/${encodeURIComponent(employeeCode)}`).then((res) => res.data),

  getSocialInsuranceMemberHistoryV3: (employeeCode: string) =>
    request<{ employeeCode: string; history: any[] }>(
      `/api/web/payroll/social-insurance/members/${encodeURIComponent(employeeCode)}/history`
    ).then((res) => res.data),

  getSocialInsuranceChangesV3: (params?: {
    projectId?: string | number;
    changeType?: string;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && String(v) !== "" && v !== "all")
        .map(([k, v]) => [k, String(v)])
    );
    return request<SocialInsuranceChangeListResponse>(`/api/web/payroll/social-insurance/changes?${query}`).then((res) => res.data);
  },

  getSocialInsuranceChangeDetailV3: (changeId: number | string) =>
    request<SocialInsuranceChangeV3>(`/api/web/payroll/social-insurance/changes/${changeId}`).then((res) => res.data),

  createSocialInsuranceChangeV3: (payload: {
    employeeCode: string;
    changeType: SocialInsuranceChangeType;
    effectiveMonth: string;
    oldSalary?: number;
    newSalary?: number;
    reason: string;
    documents?: any[];
  }) =>
    request<SocialInsuranceChangeV3>("/api/web/payroll/social-insurance/changes", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((res) => res.data),

  updateSocialInsuranceChangeV3: (changeId: number | string, payload: Partial<SocialInsuranceChangeV3>) =>
    request<SocialInsuranceChangeV3>(`/api/web/payroll/social-insurance/changes/${changeId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }).then((res) => res.data),

  deleteSocialInsuranceChangeV3: (changeId: number | string) =>
    request<{ id: number }>(`/api/web/payroll/social-insurance/changes/${changeId}`, {
      method: "DELETE",
    }).then((res) => res.data),

  confirmSocialInsuranceReconciliationV3: (changeId: number | string, payload: { reconciliationCode: string; note?: string }) =>
    request<SocialInsuranceChangeV3>(`/api/web/payroll/social-insurance/changes/${changeId}/confirm-reconciliation`, {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((res) => res.data),

  approveSocialInsuranceChangeV3: (changeId: number | string, payload?: { note?: string }) =>
    request<SocialInsuranceChangeV3>(`/api/web/payroll/social-insurance/changes/${changeId}/approve`, {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    }).then((res) => res.data),

  rejectSocialInsuranceChangeV3: (changeId: number | string, payload: { reason: string }) =>
    request<SocialInsuranceChangeV3>(`/api/web/payroll/social-insurance/changes/${changeId}/reject`, {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((res) => res.data),

  getSocialInsuranceChangeDocumentsV3: (changeId: number | string) =>
    request<any[]>(`/api/web/payroll/social-insurance/changes/${changeId}/documents`).then((res) => res.data),

  uploadSocialInsuranceDocumentV3: async (changeId: number | string, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    return request<any>(`/api/web/payroll/social-insurance/changes/${changeId}/documents`, {
      method: "POST",
      body: formData,
    }).then((res) => res.data);
  },

  deleteSocialInsuranceDocumentV3: (changeId: number | string, documentId: string | number) =>
    request<{ success: boolean }>(`/api/web/payroll/social-insurance/changes/${changeId}/documents/${documentId}`, {
      method: "DELETE",
    }).then((res) => res.data),

  exportSocialInsuranceExcelV3: async (params?: {
    projectId?: string | number;
    status?: string;
    search?: string;
  }): Promise<{ fileName: string; fileUrl: string; totalRecords: number }> => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && String(v) !== "" && v !== "all")
        .map(([k, v]) => [k, String(v)])
    );
    return request<{ fileName: string; fileUrl: string; totalRecords: number }>(
      `/api/web/payroll/social-insurance/export?${query}`
    ).then((res) => res.data);
  },

  downloadSocialInsuranceImportTemplateV3: async (): Promise<void> => {
    const res = await fetch("/api/web/payroll/social-insurance/import/template");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Mau_Import_BHXH.xlsx";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  importSocialInsuranceExcelV3: async (file: File, projectId?: number | string): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    if (projectId) formData.append("projectId", String(projectId));
    return request<any>("/api/web/payroll/social-insurance/import", {
      method: "POST",
      body: formData,
    }).then((res) => res.data);
  },

  getSocialInsuranceAuditLogsV3: (params?: { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && String(v) !== "")
        .map(([k, v]) => [k, String(v)])
    );
    return request<{ items: any[]; total: number }>(`/api/web/payroll/social-insurance/audit-logs?${query}`).then((res) => res.data);
  },

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

  // ================= 07. Khoản giảm trừ khác (Other Deductions) OpenAPI 3.0 Methods =================
  getOtherDeductionsSummaryV3: (params?: { projectId?: string | number; month?: string }) => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && String(v) !== "" && v !== "all")
        .map(([k, v]) => [k, String(v)])
    );
    return request<OtherDeductionsSummaryResponse>(`/api/web/payroll/other-deductions/summary?${query}`).then((res) => res.data);
  },

  getMasterOtherDeductionTypesV3: () =>
    request<Array<{ code: string; name: string }>>("/api/web/payroll/master-data/other-deduction-types").then((res) => res.data),

  getOtherDeductionsListV3: (params?: {
    projectId?: string | number;
    employeeCode?: string;
    month?: string;
    type?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && String(v) !== "" && v !== "all")
        .map(([k, v]) => [k, String(v)])
    );
    return request<OtherDeductionsListResponse>(`/api/web/payroll/other-deductions?${query}`).then((res) => res.data);
  },

  getOtherDeductionDetailV3: (deductionId: number | string) =>
    request<OtherDeductionV3>(`/api/web/payroll/other-deductions/${deductionId}`).then((res) => res.data),

  createOtherDeductionV3: (payload: CreateOtherDeductionRequestV3) =>
    request<OtherDeductionV3>("/api/web/payroll/other-deductions", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((res) => res.data),

  updateOtherDeductionV3: (deductionId: number | string, payload: Partial<OtherDeductionV3>) =>
    request<OtherDeductionV3>(`/api/web/payroll/other-deductions/${deductionId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }).then((res) => res.data),

  deleteOtherDeductionV3: (deductionId: number | string) =>
    request<{ id: number }>(`/api/web/payroll/other-deductions/${deductionId}`, {
      method: "DELETE",
    }).then((res) => res.data),

  uploadOtherDeductionAttachmentV3: async (deductionId: number | string, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    return request<any>(`/api/web/payroll/other-deductions/${deductionId}/attachment`, {
      method: "POST",
      body: formData,
    }).then((res) => res.data);
  },

  deleteOtherDeductionAttachmentV3: (deductionId: number | string) =>
    request<{ success: boolean }>(`/api/web/payroll/other-deductions/${deductionId}/attachment`, {
      method: "DELETE",
    }).then((res) => res.data),

  exportOtherDeductionsExcelV3: async (params?: {
    projectId?: string | number;
    month?: string;
    type?: string;
  }): Promise<{ fileName: string; fileUrl: string; totalRecords: number }> => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && String(v) !== "" && v !== "all")
        .map(([k, v]) => [k, String(v)])
    );
    return request<{ fileName: string; fileUrl: string; totalRecords: number }>(
      `/api/web/payroll/other-deductions/export?${query}`
    ).then((res) => res.data);
  },

  downloadOtherDeductionsImportTemplateV3: async (): Promise<void> => {
    const res = await fetch("/api/web/payroll/other-deductions/import/template");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Mau_Import_Giam_Tru.xlsx";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  importOtherDeductionsExcelV3: async (file: File, projectId?: number | string): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    if (projectId) formData.append("projectId", String(projectId));
    return request<any>("/api/web/payroll/other-deductions/import", {
      method: "POST",
      body: formData,
    }).then((res) => res.data);
  },

  getOtherDeductionsAuditLogsV3: (params?: { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && String(v) !== "")
        .map(([k, v]) => [k, String(v)])
    );
    return request<{ items: any[]; total: number }>(`/api/web/payroll/other-deductions/audit-logs?${query}`).then((res) => res.data);
  },

  // ================= 08. Thu nhập khác (Other Incomes) OpenAPI 3.0 Methods =================
  getOtherIncomesSummaryV3: (params?: { projectId?: string | number; month?: string }) => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && String(v) !== "" && v !== "all")
        .map(([k, v]) => [k, String(v)])
    );
    return request<OtherIncomesSummaryResponse>(`/api/web/payroll/other-incomes/summary?${query}`).then((res) => res.data);
  },

  getMasterOtherIncomeTypesV3: () =>
    request<Array<{ code: string; name: string }>>("/api/web/payroll/master-data/other-income-types").then((res) => res.data),

  getOtherIncomesListV3: (params?: {
    projectId?: string | number;
    employeeCode?: string;
    month?: string;
    type?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && String(v) !== "" && v !== "all")
        .map(([k, v]) => [k, String(v)])
    );
    return request<OtherIncomesListResponse>(`/api/web/payroll/other-incomes?${query}`).then((res) => res.data);
  },

  getOtherIncomeDetailV3: (incomeId: number | string) =>
    request<OtherIncomeV3>(`/api/web/payroll/other-incomes/${incomeId}`).then((res) => res.data),

  createOtherIncomeV3: (payload: CreateOtherIncomeRequestV3) =>
    request<OtherIncomeV3>("/api/web/payroll/other-incomes", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((res) => res.data),

  updateOtherIncomeV3: (incomeId: number | string, payload: Partial<OtherIncomeV3>) =>
    request<OtherIncomeV3>(`/api/web/payroll/other-incomes/${incomeId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }).then((res) => res.data),

  deleteOtherIncomeV3: (incomeId: number | string) =>
    request<{ id: number }>(`/api/web/payroll/other-incomes/${incomeId}`, {
      method: "DELETE",
    }).then((res) => res.data),

  uploadOtherIncomeAttachmentV3: async (incomeId: number | string, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    return request<any>(`/api/web/payroll/other-incomes/${incomeId}/attachment`, {
      method: "POST",
      body: formData,
    }).then((res) => res.data);
  },

  deleteOtherIncomeAttachmentV3: (incomeId: number | string) =>
    request<{ success: boolean }>(`/api/web/payroll/other-incomes/${incomeId}/attachment`, {
      method: "DELETE",
    }).then((res) => res.data),

  exportOtherIncomesExcelV3: async (params?: {
    projectId?: string | number;
    month?: string;
    type?: string;
  }): Promise<{ fileName: string; fileUrl: string; totalRecords: number }> => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && String(v) !== "" && v !== "all")
        .map(([k, v]) => [k, String(v)])
    );
    return request<{ fileName: string; fileUrl: string; totalRecords: number }>(
      `/api/web/payroll/other-incomes/export?${query}`
    ).then((res) => res.data);
  },

  downloadOtherIncomesImportTemplateV3: async (): Promise<void> => {
    const res = await fetch("/api/web/payroll/other-incomes/import/template");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Mau_Import_Thu_Nhap.xlsx";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  importOtherIncomesExcelV3: async (file: File, projectId?: number | string): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    if (projectId) formData.append("projectId", String(projectId));
    return request<any>("/api/web/payroll/other-incomes/import", {
      method: "POST",
      body: formData,
    }).then((res) => res.data);
  },

  getOtherIncomesAuditLogsV3: (params?: { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && String(v) !== "")
        .map(([k, v]) => [k, String(v)])
    );
    return request<{ items: any[]; total: number }>(`/api/web/payroll/other-incomes/audit-logs?${query}`).then((res) => res.data);
  },



  getLeaveRecords: (params?: { projectId?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<LeaveRecord[]>(`/api/leave-records?${query}`).then((item) => item.data);
  },
  addLeaveHistory: (employeeId: string, item: Omit<LeaveHistoryItem, "id" | "approvedAt">) =>
    request<LeaveRecord>(`/api/leave-records/${employeeId}/history`, { method: "POST", body: JSON.stringify(item) }).then((item) => item.data),
  getUnionFees: (params?: { projectId?: string; period?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<UnionFeeRecord[]>(`/api/union-fees?${query}`).then((item) => item.data);
  },
  updateUnionFee: (id: string, payload: Partial<UnionFeeRecord> & { note?: string }) =>
    request<UnionFeeRecord>(`/api/union-fees/${id}`, { method: "PATCH", body: JSON.stringify(payload) }).then((item) => item.data),
  importUnionFees: (payload: { projectId: string; period: string; items: Partial<UnionFeeRecord>[] }) =>
    request<UnionFeeRecord[]>("/api/union-fees/import", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  getStandardWorkdays: (params?: { projectId?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<StandardWorkdayRecord[]>(`/api/standard-workdays?${query}`).then((item) => item.data);
  },
  batchImportStandardWorkdays: (payload: { projectId: string; items: Array<{ employeeCode: string; overrideDays: number; reason?: string }> }) =>
    request<StandardWorkdayRecord[]>("/api/standard-workdays/batch-import", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  saveStandardWorkdayOverride: (id: string, payload: { overrideDays?: number; isOverridden: boolean; reason?: string }) =>
    request<StandardWorkdayRecord>(`/api/standard-workdays/${id}`, { method: "PATCH", body: JSON.stringify(payload) }).then((item) => item.data),
  getInsuranceRecords: (params?: { projectId?: string; fromDate?: string; toDate?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<InsuranceRecord[]>(`/api/insurance-records?${query}`).then((item) => item.data);
  },
  getInsuranceMasterRecords: (params?: { projectId?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<InsuranceRecord[]>(`/api/insurance/master?${query}`).then((item) => item.data);
  },
  getInsuranceChanges: (params?: { projectId?: string; period?: string; status?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<InsuranceChangeRecord[]>(`/api/insurance/changes?${query}`).then((item) => item.data);
  },
  createInsuranceChange: (payload: Partial<InsuranceChangeRecord>) =>
    request<InsuranceChangeRecord>("/api/insurance/changes", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  batchImportInsuranceChanges: (items: Partial<InsuranceChangeRecord>[]) =>
    request<InsuranceChangeRecord[]>("/api/insurance/changes/batch-import", { method: "POST", body: JSON.stringify({ items }) }).then((item) => item.data),
  verifyInsuranceChange: (id: string, payload?: { verifiedBy?: string; agencyReceiptCode?: string }) =>
    request<InsuranceChangeRecord>(`/api/insurance/changes/${id}/verify`, { method: "POST", body: JSON.stringify(payload ?? {}) }).then((item) => item.data),
  batchVerifyInsuranceChanges: (payload: { ids: string[]; verifiedBy?: string; agencyReceiptCode?: string }) =>
    request<InsuranceChangeRecord[]>("/api/insurance/changes/batch-verify", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  rejectInsuranceChange: (id: string, payload: { rejectionReason: string }) =>
    request<InsuranceChangeRecord>(`/api/insurance/changes/${id}/reject`, { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  verifyInsuranceRecord: (id: string, verifiedBy?: string) =>
    request<InsuranceRecord>(`/api/insurance-records/${id}/verify`, { method: "POST", body: JSON.stringify({ verifiedBy }) }).then((item) => item.data),
  batchVerifyInsurance: (ids: string[], verifiedBy?: string) =>
    request<InsuranceRecord[]>("/api/insurance-records/batch-verify", { method: "POST", body: JSON.stringify({ ids, verifiedBy }) }).then((item) => item.data),
  getTaxConfigs: (params?: { projectId?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<TaxConfigRecord[]>(`/api/tax-configs?${query}`).then((item) => item.data);
  },
  updateTaxConfig: (id: string, payload: Partial<TaxConfigRecord>) =>
    request<TaxConfigRecord>(`/api/tax-configs/${id}`, { method: "PATCH", body: JSON.stringify(payload) }).then((item) => item.data),
  getEmployeePolicies: (params?: { projectId?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<EmployeePolicyRecord[]>(`/api/employee-policies?${query}`).then((item) => item.data);
  },
  getEmployeePolicyDetail: (employeeId: string) =>
    request<EmployeePolicyRecord>(`/api/employee-policies/${employeeId}`).then((item) => item.data),
  updateEmployeePolicies: (employeeId: string, payload: { policies: EmployeePolicyItem[]; baseSalary?: number; insuranceSalary?: number; effectiveFrom?: string }) =>
    request<EmployeePolicyRecord>(`/api/employee-policies/${employeeId}`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  batchImportEmployeePolicies: (payload: { projectId: string; items: Array<{ employeeCode: string; policyCode: string; amount: number; isEnabled?: boolean; reason?: string }> }) =>
    request<EmployeePolicyRecord[]>("/api/employee-policies/batch-import", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  resetEmployeePoliciesToDefault: (employeeId: string) =>
    request<EmployeePolicyRecord>(`/api/employee-policies/${employeeId}/reset`, { method: "POST" }).then((item) => item.data),
  getProjectEmployeeGroups: async (projectId: string): Promise<ProjectEmployeeGroup[]> => {
    await new Promise((res) => setTimeout(res, 120));
    return (seedDatabase.projectEmployeeGroups ?? []).filter(
      (g) => !projectId || projectId === "all" || g.projectId === projectId || projectId.startsWith("prj-")
    );
  },
  createProjectEmployeeGroup: async (projectId: string, payload: Partial<ProjectEmployeeGroup>): Promise<ProjectEmployeeGroup> => {
    await new Promise((res) => setTimeout(res, 250));
    const newGroup: ProjectEmployeeGroup = {
      id: `grp-${Date.now()}`,
      projectId: String(projectId || "prj-jss"),
      name: payload.name || "Nhóm mới",
      code: payload.code || `GRP_${Date.now().toString().slice(-4)}`,
      colorTone: "primary",
      employeeCount: 0,
    };
    if (!seedDatabase.projectEmployeeGroups) seedDatabase.projectEmployeeGroups = [];
    seedDatabase.projectEmployeeGroups.push(newGroup);
    return newGroup;
  },
  deleteProjectEmployeeGroup: async (projectId: string, groupId: string | number) => {
    await new Promise((res) => setTimeout(res, 200));
    seedDatabase.projectEmployeeGroups = (seedDatabase.projectEmployeeGroups ?? []).filter((g) => g.id !== String(groupId));
    return { success: true };
  },
  updateProjectEmployeeGroup: (projectId: string, groupId: string, payload: Partial<ProjectEmployeeGroup>) =>
    request<ProjectEmployeeGroup>(`/api/projects/${projectId}/employee-groups/${groupId}`, { method: "PATCH", body: JSON.stringify(payload) }).then((item) => item.data),
  assignEmployeesToGroup: async (
    projectId: string,
    groupId: string | number,
    payload: { employeeCodes?: string[]; employeeIds?: string[] }
  ): Promise<{ success: boolean; message?: string; updatedCount?: number }> => {
    await new Promise((res) => setTimeout(res, 250));
    const codes = payload.employeeCodes || payload.employeeIds || [];
    const group = (seedDatabase.projectEmployeeGroups ?? []).find((g) => g.id === String(groupId));
    if (group) {
      group.employeeCount = (group.employeeCount || 0) + codes.length;
    }
    return {
      success: true,
      message: `Đã phân bổ ${codes.length} nhân viên vào nhóm thành công (Demo)`,
      updatedCount: codes.length,
    };
  },
  getActivityLogs: (params?: { projectId?: string; module?: ActivityLogModule; q?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<ActivityLogItem[]>(`/api/activity-logs?${query}`).then((item) => item.data);
  },
  createActivityLog: (payload: Partial<ActivityLogItem>) =>
    request<ActivityLogItem>("/api/activity-logs", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  // Other Deductions API
  getOtherDeductions: (params?: { projectId?: string; period?: string; q?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<OtherDeductionRecord[]>(`/api/other-deductions?${query}`).then((item) => item.data);
  },
  createOtherDeduction: (payload: Partial<OtherDeductionRecord>) =>
    request<OtherDeductionRecord>("/api/other-deductions", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  updateOtherDeduction: (id: string, payload: Partial<OtherDeductionRecord>) =>
    request<OtherDeductionRecord>(`/api/other-deductions/${id}`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  deleteOtherDeduction: (id: string) =>
    request<{ success: boolean }>(`/api/other-deductions/${id}`, { method: "DELETE" }).then((item) => item.data),
  batchImportOtherDeductions: (payload: { projectId: string; period: string; items: Array<Partial<OtherDeductionRecord>> }) =>
    request<OtherDeductionRecord[]>("/api/other-deductions/batch-import", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  // Other Incomes API
  getOtherIncomes: (params?: { projectId?: string; period?: string; q?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<OtherIncomeRecord[]>(`/api/other-incomes?${query}`).then((item) => item.data);
  },
  createOtherIncome: (payload: Partial<OtherIncomeRecord>) =>
    request<OtherIncomeRecord>("/api/other-incomes", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  updateOtherIncome: (id: string, payload: Partial<OtherIncomeRecord>) =>
    request<OtherIncomeRecord>(`/api/other-incomes/${id}`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  deleteOtherIncome: (id: string) =>
    request<{ success: boolean }>(`/api/other-incomes/${id}`, { method: "DELETE" }).then((item) => item.data),
  batchImportOtherIncomes: (payload: { projectId: string; period: string; items: Array<Partial<OtherIncomeRecord>> }) =>
    request<OtherIncomeRecord[]>("/api/other-incomes/batch-import", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),

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
};
