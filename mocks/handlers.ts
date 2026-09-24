import { delay, http, HttpResponse, passthrough } from "msw";
import { applyRounding, evaluateExpression, validateFormulas } from "@/lib/formula-engine";
import { mutateMockDatabase, readMockDatabase } from "@/lib/mock-db";
import type {
  ActivityLogItem,
  ApiResponse,
  AttendanceConfig,
  AuditLogV3,
  CreateDependentRequestV3,
  DataMapping,
  Dependent,
  DependentDetailV3,
  DependentDocument,
  DependentStatusV3,
  DependentSummaryV3,
  Employee,
  EmployeePolicyItem,
  EmployeePolicyRecord,
  ImportErrorDetailV3,
  InsuranceChangeRecord,
  InsuranceRecord,
  LeaveHistoryItem,
  LeaveRecord,
  Project,
  ProjectCustomVariable,
  ProjectEmployeeGroup,
  ProjectOvertimeConfig,
  ProjectPolicy,
  RejectDependentRequestV3,
  SalaryFormula,
  SalaryStructure,
  SalaryStructurePayload,
  StandardWorkdayRecord,
  TaxConfigRecord,
  TestRunResult,
  UnionFeeRecord,
  UpdateDependentRequestV3,
  OtherDeductionRecord,
  OtherIncomeRecord,
  AnnualLeaveEmployee,
  AnnualLeaveHistoryItemV3,
  AnnualLeaveSummaryResponse,
  AnnualLeaveListResponse,
  AnnualLeaveHistoryResponse,
  AnnualLeaveViewFilter,
  UnionDuesMemberV3,
  UnionDuesHistoryItemV3,
  UnionDuesSummaryResponse,
  UnionDuesListResponse,
  UnionDuesHistoryResponse,
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
  TimesheetSummaryItem,
  TimesheetSummaryResponse,
  TimesheetOcrParsedItem,
} from "@/lib/types";
import {
  defaultCustomVariablesDefinitions,
  dependentDocumentTypesMaster,
  dependentRelationshipsMaster,
  initialAuditLogsV3,
  initialDependentsV3,
  initialAnnualLeaveEmployeesV3,
  initialAnnualLeaveHistoryV3,
  initialUnionDuesMembersV3,
  initialUnionDuesHistoryV3,
  initialStandardWorkdaysV3,
  initialSocialInsuranceMembersV3,
  initialSocialInsuranceChangesV3,
  initialBenefitsAllowanceEmployeesV3,
  initialOtherDeductionsV3,
  initialOtherIncomesV3,
  initialTimesheetSummaries,
} from "@/lib/mock-data";
import { uid } from "@/lib/utils";

const okV3 = <T,>(data: T, message = "Thao tác thành công", code = "SUCCESS") =>
  HttpResponse.json({
    success: true,
    code,
    message,
    data,
  });

const errorV3 = (status: number, message: string, code = "BAD_REQUEST", data: any = null) =>
  HttpResponse.json(
    {
      success: false,
      code,
      message,
      data,
    },
    { status }
  );


let mockSalaryStructuresStore: Array<{
  id: number;
  projectId: string;
  code: string;
  name: string;
  isActive: boolean;
  description: string | null;
}> = [
    {
      id: 1,
      projectId: "1017",
      code: "STR_KCV_NM_2026",
      name: "Cấu trúc bảng lương KCV-NM theo Quy chế V03",
      isActive: true,
      description: "Áp dụng cho toàn bộ khối nhà máy năm 2026",
    },
    {
      id: 2,
      projectId: "1017",
      code: "STR_OFFICE_2026",
      name: "Cấu trúc lương Khối Văn phòng & Quản lý",
      isActive: true,
      description: "Quy chế chi trả cho nhân sự văn phòng và quản lý dự án",
    },
  ];

const ok = <T,>(data: T, init?: ResponseInit) =>
  HttpResponse.json<ApiResponse<T>>({ data }, init);

const fail = (status: number, code: string, message: string, fields?: Record<string, string>) =>
  HttpResponse.json(
    { data: null, error: { code, message, fields } },
    { status },
  );

const projectId = (value: string | readonly string[] | undefined) => String(value ?? "");

export const handlers = [
  http.get("/api/projects", async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const pageSize = Math.max(1, parseInt(url.searchParams.get("pageSize") || "10", 10));
    const database = readMockDatabase();
    const total = database.projects.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paged = database.projects.slice(startIndex, startIndex + pageSize);
    return HttpResponse.json<ApiResponse<Project[]>>({
      data: paged,
      meta: { page, pageSize, total, totalPages },
    });
  }),

  http.get("/api/projects/:projectId", async ({ params }) => {
    await delay(100);
    const id = projectId(params.projectId);
    const database = readMockDatabase();
    const found = database.projects.find((p) => p.id === id);
    if (!found) return fail(404, "PROJECT_NOT_FOUND", "Không tìm thấy dự án.");
    return ok(found);
  }),

  http.get("/api/policy-definitions", async () => {
    await delay(100);
    return ok(readMockDatabase().policyDefinitions);
  }),

  http.post("/api/projects", async ({ request }) => {
    await delay(420);
    const payload = (await request.json()) as Partial<Project>;
    const database = readMockDatabase();
    if (!payload.code || !payload.name || !payload.client) {
      return fail(422, "VALIDATION_ERROR", "Vui lòng nhập đủ thông tin bắt buộc.", {
        code: !payload.code ? "Mã dự án là bắt buộc" : "",
        name: !payload.name ? "Tên dự án là bắt buộc" : "",
        client: !payload.client ? "Khách hàng là bắt buộc" : "",
      });
    }
    if (database.projects.some((item) => item.code.toLocaleLowerCase() === payload.code!.toLocaleLowerCase())) {
      return fail(409, "PROJECT_CODE_EXISTS", "Mã dự án đã tồn tại.", { code: "Mã dự án đã được sử dụng" });
    }
    const now = new Date().toISOString();
    const project: Project = {
      id: uid("prj"), code: payload.code.toUpperCase(), name: payload.name, client: payload.client,
      location: payload.location ?? "Chưa cấu hình", manager: payload.manager ?? "C&B Admin", employeeCount: 0,
      status: "draft", payrollCycle: payload.payrollCycle ?? "Ngày 01 đến ngày cuối tháng",
      effectiveFrom: payload.effectiveFrom ?? now.slice(0, 10), templateName: payload.templateName ?? "Template chuẩn",
      updatedAt: now,
      tabStates: { overview: "complete", policies: "incomplete", attendance: "incomplete", formulas: "incomplete" },
    };
    mutateMockDatabase((db) => db.projects.push(project));
    return ok(project, { status: 201 });
  }),


  http.patch("/api/projects/:projectId", async ({ params, request }) => {
    await delay(300);
    const id = projectId(params.projectId);
    const payload = (await request.json()) as Partial<Project>;
    let updated: Project | undefined;
    mutateMockDatabase((db) => {
      const index = db.projects.findIndex((item) => item.id === id);
      if (index < 0) return;
      updated = { ...db.projects[index], ...payload, id, updatedAt: new Date().toISOString() };
      db.projects[index] = updated;
    });
    return updated ? ok(updated) : fail(404, "PROJECT_NOT_FOUND", "Không tìm thấy dự án.");
  }),

  http.post("/api/projects/:projectId/clone", async ({ params }) => {
    await delay(450);
    const id = projectId(params.projectId);
    const database = readMockDatabase();
    const source = database.projects.find((item) => item.id === id);
    if (!source) return fail(404, "PROJECT_NOT_FOUND", "Không tìm thấy dự án.");
    const cloneId = uid("prj");
    const clone: Project = { ...source, id: cloneId, code: `${source.code}-COPY`, name: `${source.name} (Bản sao)`, employeeCount: 0, status: "draft", updatedAt: new Date().toISOString(), tabStates: { ...source.tabStates } };
    mutateMockDatabase((db) => {
      db.projects.push(clone);
      db.projectPolicies.push(...database.projectPolicies.filter((item) => item.projectId === id).map((item) => ({ ...item, id: uid("pp"), projectId: cloneId })));
      db.attendanceConfigs.push({ ...database.attendanceConfigs.find((item) => item.projectId === id)!, projectId: cloneId });
      db.overtimeConfigs.push(...database.overtimeConfigs.filter((item) => item.projectId === id).map((item) => ({ ...item, id: uid("otc"), projectId: cloneId })));
      db.formulas.push(...database.formulas.filter((item) => item.projectId === id).map((item) => ({ ...item, id: uid("formula"), projectId: cloneId })));
    });
    return ok(clone, { status: 201 });
  }),


  http.get("/api/projects/:projectId/policies", async ({ params }) => {
    await delay(250);
    const id = projectId(params.projectId);
    return ok(readMockDatabase().projectPolicies.filter((item) => item.projectId === id));
  }),

  http.post("/api/projects/:projectId/policies", async ({ params, request }) => {
    await delay(350);
    const id = projectId(params.projectId);
    const payload = (await request.json()) as Omit<ProjectPolicy, "id" | "projectId">;
    const database = readMockDatabase();
    if (database.projectPolicies.some((item) => item.projectId === id && item.policyId === payload.policyId && item.enabled)) {
      return fail(409, "POLICY_EXISTS", "Chế độ này đang được áp dụng cho dự án.");
    }
    const policy: ProjectPolicy = { ...payload, id: uid("pp"), projectId: id };
    mutateMockDatabase((db) => db.projectPolicies.push(policy));
    return ok(policy, { status: 201 });
  }),

  http.patch("/api/projects/:projectId/policies/:policyId", async ({ params, request }) => {
    await delay(300);
    const id = projectId(params.projectId);
    const policyId = projectId(params.policyId);
    const payload = (await request.json()) as Partial<ProjectPolicy>;
    let updated: ProjectPolicy | undefined;
    mutateMockDatabase((db) => {
      const index = db.projectPolicies.findIndex((item) => item.projectId === id && item.id === policyId);
      if (index < 0) return;
      updated = { ...db.projectPolicies[index], ...payload, id: policyId, projectId: id };
      db.projectPolicies[index] = updated;
    });
    return updated ? ok(updated) : fail(404, "POLICY_NOT_FOUND", "Không tìm thấy chế độ dự án.");
  }),

  http.delete("/api/projects/:projectId/policies/:policyId", async ({ params }) => {
    await delay(280);
    const id = projectId(params.projectId);
    const policyId = projectId(params.policyId);
    let found = false;
    mutateMockDatabase((db) => {
      const before = db.projectPolicies.length;
      db.projectPolicies = db.projectPolicies.filter((item) => !(item.projectId === id && item.id === policyId));
      found = db.projectPolicies.length < before;
    });
    return found ? ok({ deleted: true }) : fail(404, "POLICY_NOT_FOUND", "Không tìm thấy chế độ dự án.");
  }),

  http.get("/api/projects/:projectId/attendance-config", async ({ params }) => {
    await delay(180);
    const id = projectId(params.projectId);
    const config = readMockDatabase().attendanceConfigs.find((item) => item.projectId === id);
    return config ? ok(config) : fail(404, "ATTENDANCE_CONFIG_NOT_FOUND", "Chưa có cấu hình chấm công.");
  }),

  http.put("/api/projects/:projectId/attendance-config", async ({ params, request }) => {
    await delay(320);
    const id = projectId(params.projectId);
    const payload = (await request.json()) as AttendanceConfig;
    const config = { ...payload, projectId: id };
    mutateMockDatabase((db) => {
      const index = db.attendanceConfigs.findIndex((item) => item.projectId === id);
      if (index >= 0) db.attendanceConfigs[index] = config;
      else db.attendanceConfigs.push(config);
    });
    return ok(config);
  }),

  http.get("/api/overtime-types", async () => {
    await delay(180);
    return ok(readMockDatabase().overtimeTypes);
  }),

  http.get("/api/projects/:projectId/overtime-configs", async ({ params }) => {
    await delay(220);
    const id = projectId(params.projectId);
    return ok(readMockDatabase().overtimeConfigs.filter((item) => item.projectId === id));
  }),

  http.put("/api/projects/:projectId/overtime-configs", async ({ params, request }) => {
    await delay(360);
    const id = projectId(params.projectId);
    const payload = (await request.json()) as ProjectOvertimeConfig[];
    const configs = payload.map((item) => ({ ...item, projectId: id }));
    mutateMockDatabase((db) => {
      db.overtimeConfigs = db.overtimeConfigs.filter((item) => item.projectId !== id);
      db.overtimeConfigs.push(...configs);
    });
    return ok(configs);
  }),

  http.get("/api/formula-variables", async () => {
    await delay(160);
    return ok(readMockDatabase().formulaVariables);
  }),

  http.get("/api/projects/:projectId/custom-variables", async ({ params }) => {
    await delay(180);
    const id = projectId(params.projectId);
    const db = readMockDatabase();
    let vars = (db.projectCustomVariables ?? []).filter((item) => item.projectId === id);
    if (vars.length === 0) {
      vars = defaultCustomVariablesDefinitions.map((def) => ({
        id: `${id}-${def.code}`,
        projectId: id,
        code: def.code,
        name: def.name,
        unit: def.unit,
        description: def.description,
        defaultValue: def.defaultValue,
        value: null,
        updatedAt: new Date().toISOString(),
      }));
      mutateMockDatabase((d) => {
        if (!d.projectCustomVariables) d.projectCustomVariables = [];
        d.projectCustomVariables.push(...vars);
      });
    }
    return ok(vars);
  }),

  http.put("/api/projects/:projectId/custom-variables", async ({ params, request }) => {
    await delay(280);
    const id = projectId(params.projectId);
    const payload = (await request.json()) as Array<{ code: string; value: number | null }>;
    const now = new Date().toISOString();
    let updatedVars: ProjectCustomVariable[] = [];

    mutateMockDatabase((db) => {
      if (!db.projectCustomVariables) db.projectCustomVariables = [];
      const currentList = db.projectCustomVariables.filter((item) => item.projectId === id);

      payload.forEach((item) => {
        const existing = currentList.find((v) => v.code === item.code);
        if (existing) {
          existing.value = item.value;
          existing.updatedAt = now;
        } else {
          const def = defaultCustomVariablesDefinitions.find((d) => d.code === item.code);
          const newVar: ProjectCustomVariable = {
            id: `${id}-${item.code}`,
            projectId: id,
            code: item.code,
            name: def?.name ?? item.code,
            unit: def?.unit ?? "",
            description: def?.description,
            defaultValue: def?.defaultValue,
            value: item.value,
            updatedAt: now,
          };
          const customList = db.projectCustomVariables ?? [];
          db.projectCustomVariables = customList;
          customList.push(newVar);
        }
      });
      updatedVars = (db.projectCustomVariables ?? []).filter((item) => item.projectId === id);
    });

    return ok(updatedVars);
  }),

  // Salary Structures Mock Handlers
  http.get("*/web/payroll/projects/:projectId/salary-structures", async ({ params }) => {
    await delay(180);
    const id = projectId(params.projectId);
    const list = mockSalaryStructuresStore.filter((item) => !id || item.projectId === id || item.projectId === "1017");
    if (list.length === 0) {
      return ok([
        {
          id: 1,
          code: "STR_KCV_NM_2026",
          name: "Cấu trúc bảng lương KCV-NM theo Quy chế V03",
          isActive: true,
          description: "Áp dụng cho dự án năm 2026",
        },
      ]);
    }
    return ok(list.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      isActive: item.isActive,
      description: item.description,
    })));
  }),

  http.post("*/web/payroll/projects/:projectId/salary-structures", async ({ params, request }) => {
    await delay(250);
    const id = projectId(params.projectId);
    const payload = (await request.json()) as SalaryStructurePayload;
    const newId = Date.now();
    const newItem = {
      id: newId,
      projectId: id || "1017",
      code: payload.StructureCode,
      name: payload.StructureName,
      isActive: Boolean(payload.IsActive),
      description: payload.Description || null,
    };
    mockSalaryStructuresStore.push(newItem);
    return ok({
      id: newId,
      code: newItem.code,
      name: newItem.name,
      isActive: newItem.isActive,
      description: newItem.description,
    });
  }),

  http.put("*/web/payroll/projects/:projectId/salary-structures/:id", async ({ params, request }) => {
    await delay(250);
    const id = Number(params.id);
    const payload = (await request.json()) as SalaryStructurePayload;
    const found = mockSalaryStructuresStore.find((item) => item.id === id);
    if (found) {
      found.code = payload.StructureCode;
      found.name = payload.StructureName;
      found.isActive = Boolean(payload.IsActive);
      found.description = payload.Description || null;
    }
    return ok(true);
  }),

  http.get("/api/projects/:projectId/formulas", async ({ params }) => {
    await delay(220);
    const id = projectId(params.projectId);
    return ok(readMockDatabase().formulas.filter((item) => item.projectId === id).sort((a, b) => a.order - b.order));
  }),

  http.put("/api/projects/:projectId/formulas", async ({ params, request }) => {
    await delay(360);
    const id = projectId(params.projectId);
    const payload = (await request.json()) as SalaryFormula[];
    const validation = validateFormulas(payload, readMockDatabase().formulaVariables);
    if (!validation.valid) return fail(422, "FORMULA_INVALID", validation.errors.join(" · "));
    const formulas = payload.map((item, index) => ({ ...item, projectId: id, order: index + 1 }));
    mutateMockDatabase((db) => {
      db.formulas = db.formulas.filter((item) => item.projectId !== id);
      db.formulas.push(...formulas);
    });
    return ok(formulas);
  }),

  http.post("/api/projects/:projectId/formulas/validate", async ({ params, request }) => {
    await delay(260);
    const id = projectId(params.projectId);
    const payload = (await request.json()) as SalaryFormula[] | undefined;
    const database = readMockDatabase();
    const formulas = payload ?? database.formulas.filter((item) => item.projectId === id);
    return ok(validateFormulas(formulas, database.formulaVariables));
  }),

  http.get("/api/projects/:projectId/data-mappings", async ({ params }) => {
    await delay(220);
    const id = projectId(params.projectId);
    return ok(readMockDatabase().dataMappings.filter((item) => item.projectId === id));
  }),

  http.put("/api/projects/:projectId/data-mappings", async ({ params, request }) => {
    await delay(330);
    const id = projectId(params.projectId);
    const payload = (await request.json()) as DataMapping[];
    const mappings = payload.map((item) => ({ ...item, projectId: id }));
    mutateMockDatabase((db) => {
      db.dataMappings = db.dataMappings.filter((item) => item.projectId !== id);
      db.dataMappings.push(...mappings);
    });
    return ok(mappings);
  }),

  http.post("/api/projects/:projectId/data-mappings/validate", async ({ params }) => {
    await delay(420);
    const id = projectId(params.projectId);
    const mappings = readMockDatabase().dataMappings.filter((item) => item.projectId === id);
    const issues = mappings.flatMap((mapping) => {
      if (mapping.status === "invalid") return [`${mapping.sourceName}: thiếu trường bắt buộc`];
      if (mapping.status === "warning") return [`${mapping.sourceName}: có cột chưa nhận diện`];
      return [];
    });
    return ok({ valid: issues.length === 0, issues, checkedAt: new Date().toISOString() });
  }),

  http.get("/api/test-employees", async () => {
    await delay(180);
    return ok(readMockDatabase().testEmployees);
  }),

  http.post("/api/projects/:projectId/test-runs", async ({ params, request }) => {
    await delay(650);
    const id = projectId(params.projectId);
    const payload = (await request.json()) as { employeeId: string; period: string };
    const database = readMockDatabase();
    const employee = database.testEmployees.find((item) => item.id === payload.employeeId);
    if (!employee) return fail(404, "EMPLOYEE_NOT_FOUND", "Không tìm thấy nhân viên kiểm thử.");
    const formulas = database.formulas.filter((item) => item.projectId === id && item.enabled).sort((a, b) => a.order - b.order);
    const variables: Record<string, number> = Object.fromEntries(
      database.formulaVariables.map((item) => [item.code, item.sampleValue ?? item.defaultValue ?? 0])
    );
    const customVars = (database.projectCustomVariables ?? []).filter((item) => item.projectId === id);
    customVars.forEach((cv) => {
      if (cv.value !== null && cv.value !== undefined) {
        variables[cv.code] = cv.value;
      }
    });
    variables.LUONG_CO_BAN = employee.baseSalary;
    variables.LUONG_DONG_BH = employee.baseSalary;
    variables.MUC_LUONG_TINH_OT = employee.baseSalary;
    variables.NGAY_CONG_THUC_TE = employee.workHours / 8;
    variables.GIO_OT_NGAY_THUONG = employee.overtimeHours;
    const breakdown = formulas.map((formula) => {
      const amount = applyRounding(evaluateExpression(formula.expression, variables), formula.rounding);
      variables[formula.outputVariable] = amount;
      return { code: formula.code, name: formula.name, amount, status: "matched" as const };
    });
    const grossIncome = variables.TONG_THU_NHAP ?? 0;
    const totalDeductions = variables.TONG_KHAU_TRU ?? 0;
    const netPay = variables.THUC_LANH ?? grossIncome - totalDeductions;
    const expectedNetPay = employee.id === "emp-demo-2" ? netPay + 1000 : netPay;
    const result: TestRunResult = { employee, period: payload.period, breakdown, grossIncome, totalDeductions, netPay, expectedNetPay, difference: netPay - expectedNetPay, warnings: employee.id === "emp-demo-2" ? ["Chênh lệch 1.000 ₫ do quy tắc làm tròn của dữ liệu đối chiếu."] : [] };
    return ok(result);
  }),

  // --- EMPLOYEE MANAGEMENT HANDLERS ---
  http.get("/api/employees", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const projId = url.searchParams.get("projectId");
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    const database = readMockDatabase();
    let list = database.employees ?? [];
    if (projId && projId !== "all") {
      list = list.filter((e) => e.projectId === projId);
      // Auto-generate sample employees for this project if none exist
      if (list.length === 0) {
        mutateMockDatabase((db) => {
          if (!db.employees) db.employees = [];
          const projectCode = projId.toUpperCase().replace(/^PRJ-/, "");
          const sampleEmps: Employee[] = [
            {
              id: `emp-${projId}-001`,
              code: `NV-${projectCode}-001`,
              name: "Nguyễn Văn An",
              idCard: "079095001234",
              phone: "0908123456",
              email: `an.nguyen@${projId}.vn`,
              projectId: projId,
              projectCode,
              department: "Xưởng Sản Xuất 1",
              position: "Công nhân bậc 2",
              joinDate: "2023-03-15",
              status: "active",
              groupId: `grp-off-${projId}`,
              groupName: "Công nhân chính thức",
            },
            {
              id: `emp-${projId}-002`,
              code: `NV-${projectCode}-002`,
              name: "Trần Thị Bình",
              idCard: "079198005678",
              phone: "0912345678",
              email: `binh.tran@${projId}.vn`,
              projectId: projId,
              projectCode,
              department: "Xưởng Sản Xuất 1",
              position: "Tổ trưởng dây chuyền",
              joinDate: "2022-06-01",
              status: "active",
              groupId: `grp-mgmt-${projId}`,
              groupName: "Quản lý / Shift Leader",
            },
            {
              id: `emp-${projId}-003`,
              code: `NV-${projectCode}-003`,
              name: "Lê Văn Cường",
              idCard: "080092009876",
              phone: "0987654321",
              email: `cuong.le@${projId}.vn`,
              projectId: projId,
              projectCode,
              department: "Bộ phận Kỹ thuật",
              position: "Kỹ thuật viên bảo trì",
              joinDate: "2024-01-10",
              status: "active",
              groupId: `grp-off-${projId}`,
              groupName: "Công nhân chính thức",
            },
            {
              id: `emp-${projId}-004`,
              code: `NV-${projectCode}-004`,
              name: "Phạm Thu Hà",
              idCard: "079196004321",
              phone: "0933445566",
              email: `ha.pham@${projId}.vn`,
              projectId: projId,
              projectCode,
              department: "Phòng Quản lý chất lượng",
              position: "Chuyên viên QA/QC",
              joinDate: "2023-09-20",
              status: "active",
              groupId: `grp-off-${projId}`,
              groupName: "Công nhân chính thức",
            },
            {
              id: `emp-${projId}-005`,
              code: `NV-${projectCode}-005`,
              name: "Vũ Hoàng Nam",
              idCard: "079099008899",
              phone: "0911223344",
              email: `nam.vu@${projId}.vn`,
              projectId: projId,
              projectCode,
              department: "Xưởng Sản Xuất 2",
              position: "Công nhân thử việc",
              joinDate: "2026-07-01",
              status: "probation",
              groupId: `grp-prob-${projId}`,
              groupName: "Học việc (29 ngày)",
            },
          ];
          db.employees.push(...sampleEmps);
          list = sampleEmps;
        });
      }
    }
    if (q) {
      list = list.filter(
        (e) =>
          e.code.toLowerCase().includes(q) ||
          e.name.toLowerCase().includes(q) ||
          e.phone.includes(q) ||
          e.idCard.includes(q) ||
          e.department.toLowerCase().includes(q) ||
          e.position.toLowerCase().includes(q)
      );
    }
    return ok(list);
  }),



  http.get("/api/leave-records", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const projId = url.searchParams.get("projectId");
    const database = readMockDatabase();
    let list = database.leaveRecords ?? [];
    if (projId && projId !== "all") {
      list = list.filter((l) => l.projectId === projId);
    }
    return ok(list);
  }),

  http.post("/api/leave-records/:employeeId/history", async ({ params, request }) => {
    await delay(300);
    const empId = String(params.employeeId);
    const payload = (await request.json()) as Omit<LeaveHistoryItem, "id" | "approvedAt">;
    const newHistory: LeaveHistoryItem = {
      id: uid("lh"),
      ...payload,
      approvedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
    };
    let updatedRecord: LeaveRecord | undefined;
    mutateMockDatabase((db) => {
      const idx = (db.leaveRecords ?? []).findIndex((l) => l.employeeId === empId);
      if (idx >= 0) {
        const current = db.leaveRecords[idx];
        const usedDays = current.usedDays + payload.days;
        const totalWithSeniority = current.totalEntitled + (current.seniorityDays || 0);
        const remainingDays = Math.max(0, totalWithSeniority - usedDays);
        const availableDays = Math.max(0, (current.accruedDays || 8) - usedDays);
        db.leaveRecords[idx] = {
          ...current,
          usedDays,
          remainingDays,
          availableDays,
          history: [newHistory, ...current.history],
        };
        updatedRecord = db.leaveRecords[idx];
      }
    });
    return updatedRecord ? ok(updatedRecord) : fail(404, "LEAVE_RECORD_NOT_FOUND", "Không tìm thấy bản ghi phép năm");
  }),

  http.get("/api/union-fees", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const projId = url.searchParams.get("projectId");
    const period = url.searchParams.get("period");
    const database = readMockDatabase();
    let list = database.unionFees ?? [];
    if (projId && projId !== "all") {
      list = list.filter((u) => u.projectId === projId);
    }
    if (period) {
      list = list.filter((u) => u.period === period);
    }
    return ok(list);
  }),

  http.post("/api/union-fees/import", async ({ request }) => {
    await delay(400);
    const payload = (await request.json()) as { projectId: string; period: string; items: Partial<UnionFeeRecord>[] };
    const database = readMockDatabase();
    const newRecords: UnionFeeRecord[] = (payload.items ?? []).map((item) => {
      const emp = database.employees.find((e) => e.code === item.employeeCode || e.id === item.employeeId);
      return {
        id: `union-${emp?.id ?? uid("uf")}`,
        employeeId: emp?.id ?? item.employeeId ?? "",
        employeeCode: emp?.code ?? item.employeeCode ?? "",
        employeeName: emp?.name ?? item.employeeName ?? "",
        projectId: payload.projectId,
        period: payload.period,
        feeType: item.feeType ?? "percentage",
        amount: item.amount ?? 23400,
        isParticipating: item.isParticipating !== false,
        importedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
        importedBy: "Kế toán tiền lương",
      };
    });
    mutateMockDatabase((db) => {
      const existing = (db.unionFees ?? []).filter((u) => u.projectId !== payload.projectId || u.period !== payload.period);
      db.unionFees = [...newRecords, ...existing];
    });
    return ok(newRecords);
  }),

  http.patch("/api/union-fees/:id", async ({ params, request }) => {
    await delay(200);
    const { id } = params;
    const payload = (await request.json()) as Partial<UnionFeeRecord> & { note?: string };
    let updated: UnionFeeRecord | null = null;
    mutateMockDatabase((db) => {
      const idx = (db.unionFees ?? []).findIndex((u) => u.id === id);
      if (idx !== -1) {
        const cur = db.unionFees[idx];
        const newIsPart = payload.isParticipating !== undefined ? payload.isParticipating : cur.isParticipating;
        const nowStr = new Date().toISOString().replace("T", " ").slice(0, 16);
        const actionLabel = newIsPart ? "Đăng ký tham gia Công đoàn" : "Hủy tham gia Công đoàn";
        const historyItem = {
          id: `ufh-${Date.now()}`,
          actionDate: nowStr,
          actionType: newIsPart ? ("join" as const) : ("leave" as const),
          actionLabel,
          amount: newIsPart ? cur.amount : 0,
          changedBy: "Trần Minh Anh (Kế toán C&B)",
          note: payload.note || (newIsPart ? "Kích hoạt tham gia lại Công đoàn" : "Hủy tham gia trích nộp Công đoàn"),
        };
        db.unionFees[idx] = {
          ...cur,
          ...payload,
          isParticipating: newIsPart,
          joinedUnionDate: newIsPart ? (cur.joinedUnionDate || nowStr.slice(0, 10)) : undefined,
          history: [historyItem, ...(cur.history ?? [])],
        };
        updated = db.unionFees[idx];

        const logItem: ActivityLogItem = {
          id: uid("act"),
          projectId: cur.projectId || "prj-jss",
          module: "union",
          employeeId: cur.employeeId,
          employeeCode: cur.employeeCode,
          employeeName: cur.employeeName,
          actionType: newIsPart ? "join" : "leave",
          actionLabel: newIsPart ? "Đăng ký tham gia" : "Ngừng tham gia",
          details: newIsPart
            ? `Gia nhập Công đoàn cơ sở, mức đóng ${cur.amount.toLocaleString("vi-VN")}đ/tháng`
            : "Tạm ngưng trích nộp công đoàn phí",
          oldValue: cur.isParticipating ? cur.amount : 0,
          newValue: newIsPart ? cur.amount : 0,
          changedBy: "Trần Minh Anh (Kế toán C&B)",
          reason: payload.note || (newIsPart ? "Đăng ký gia nhập Công đoàn" : "Ngừng tham gia Công đoàn"),
          createdAt: new Date().toISOString(),
        };
        db.activityLogs = [logItem, ...(db.activityLogs ?? [])];
      }
    });
    return updated ? ok(updated) : fail(404, "NOT_FOUND", "Không tìm thấy bản ghi Công đoàn phí");
  }),

  http.get("/api/standard-workdays", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const projId = url.searchParams.get("projectId");
    const database = readMockDatabase();
    let list = database.standardWorkdays ?? [];
    if (projId && projId !== "all") {
      list = list.filter((w) => w.projectId === projId);
    }
    return ok(list);
  }),

  http.patch("/api/standard-workdays/:id", async ({ params, request }) => {
    await delay(300);
    const id = String(params.id);
    const payload = (await request.json()) as { overrideDays?: number; isOverridden: boolean; reason?: string };
    let updated: StandardWorkdayRecord | undefined;
    mutateMockDatabase((db) => {
      const idx = (db.standardWorkdays ?? []).findIndex((w) => w.id === id);
      if (idx >= 0) {
        db.standardWorkdays[idx] = {
          ...db.standardWorkdays[idx],
          overrideDays: payload.overrideDays,
          isOverridden: payload.isOverridden,
          reason: payload.reason,
          updatedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
          updatedBy: "Kế toán tiền lương",
        };
        updated = db.standardWorkdays[idx];

        const logItem: ActivityLogItem = {
          id: uid("act"),
          projectId: updated.projectId || "prj-jss",
          module: "workdays",
          employeeId: updated.employeeId,
          employeeCode: updated.employeeCode,
          employeeName: updated.employeeName,
          actionType: payload.isOverridden ? "override" : "restore",
          actionLabel: payload.isOverridden ? "Chỉnh sửa ngày công" : "Khôi phục chuẩn",
          details: payload.isOverridden
            ? `Ngày công chuẩn riêng: ${updated.projectStandardDays} ngày → ${payload.overrideDays} ngày`
            : `Khôi phục về chuẩn dự án (${updated.projectStandardDays} ngày)`,
          oldValue: updated.projectStandardDays,
          newValue: payload.overrideDays ?? updated.projectStandardDays,
          changedBy: "Kế toán tiền lương",
          reason: payload.reason || (payload.isOverridden ? "Điều chỉnh ngày công chuẩn riêng" : "Hoàn tác về chuẩn dự án"),
          createdAt: new Date().toISOString(),
        };
        db.activityLogs = [logItem, ...(db.activityLogs ?? [])];
      }
    });
    return updated ? ok(updated) : fail(404, "RECORD_NOT_FOUND", "Không tìm thấy bản ghi");
  }),

  http.post("/api/standard-workdays/batch-import", async ({ request }) => {
    await delay(400);
    const payload = (await request.json()) as {
      projectId: string;
      items: Array<{ employeeCode: string; overrideDays: number; reason?: string }>;
    };
    const database = readMockDatabase();
    const updatedList: StandardWorkdayRecord[] = [];
    mutateMockDatabase((db) => {
      payload.items.forEach((item) => {
        const emp = database.employees.find((e) => e.code === item.employeeCode);
        if (emp) {
          const idx = (db.standardWorkdays ?? []).findIndex((w) => w.employeeId === emp.id || w.employeeCode === emp.code);
          const nowStr = new Date().toISOString().replace("T", " ").slice(0, 16);
          if (idx >= 0) {
            db.standardWorkdays[idx] = {
              ...db.standardWorkdays[idx],
              overrideDays: item.overrideDays,
              isOverridden: true,
              reason: item.reason || "Cập nhật ngày công chuẩn từ tệp Excel",
              updatedAt: nowStr,
              updatedBy: "Kế toán C&B",
            };
            updatedList.push(db.standardWorkdays[idx]);
          } else {
            const newRec: StandardWorkdayRecord = {
              id: `workday-${emp.id}`,
              employeeId: emp.id,
              employeeCode: emp.code,
              employeeName: emp.name,
              projectId: payload.projectId,
              projectStandardDays: 26,
              overrideDays: item.overrideDays,
              isOverridden: true,
              reason: item.reason || "Cập nhật ngày công chuẩn từ tệp Excel",
              updatedAt: nowStr,
              updatedBy: "Kế toán C&B",
            };
            db.standardWorkdays = [...(db.standardWorkdays ?? []), newRec];
            updatedList.push(newRec);
          }
        }
      });
    });
    return ok(updatedList);
  }),

  http.get("/api/insurance-records", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const projId = url.searchParams.get("projectId");
    const fromDate = url.searchParams.get("fromDate");
    const toDate = url.searchParams.get("toDate");
    const database = readMockDatabase();
    let list = database.insuranceRecords ?? [];
    if (projId && projId !== "all") {
      list = list.filter((i) => i.projectId === projId);
    }
    if (fromDate) {
      list = list.filter((i) => !i.toDate || i.toDate >= fromDate);
    }
    if (toDate) {
      list = list.filter((i) => !i.fromDate || i.fromDate <= toDate);
    }
    return ok(list);
  }),

  http.get("/api/insurance/master", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const projId = url.searchParams.get("projectId");
    const database = readMockDatabase();
    let list = database.insuranceRecords ?? [];
    if (projId && projId !== "all") {
      list = list.filter((i) => i.projectId === projId);
    }
    return ok(list);
  }),

  http.get("/api/insurance/changes", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const projId = url.searchParams.get("projectId");
    const period = url.searchParams.get("period");
    const status = url.searchParams.get("status");
    const database = readMockDatabase();
    let list = database.insuranceChanges ?? [];
    if (projId && projId !== "all") {
      list = list.filter((c) => c.projectId === projId);
    }
    if (period) {
      list = list.filter((c) => c.period === period);
    }
    if (status && status !== "all") {
      list = list.filter((c) => c.status === status);
    }
    return ok(list);
  }),

  http.post("/api/insurance/changes", async ({ request }) => {
    await delay(300);
    const payload = (await request.json()) as Partial<InsuranceChangeRecord>;
    const database = readMockDatabase();
    const emp = (database.employees ?? []).find((e) => e.id === payload.employeeId);
    const master = (database.insuranceRecords ?? []).find((m) => m.employeeId === payload.employeeId);

    const newRecord: InsuranceChangeRecord = {
      id: `ins-chg-${Date.now()}`,
      employeeId: payload.employeeId ?? "",
      employeeCode: emp?.code ?? payload.employeeCode ?? "",
      employeeName: emp?.name ?? payload.employeeName ?? "",
      projectId: emp?.projectId ?? payload.projectId ?? "prj-jss",
      period: payload.period ?? "2026-08",
      changeType: payload.changeType ?? "salary_adjust",
      oldSalary: master?.insuranceSalary ?? payload.oldSalary ?? 6300000,
      newSalary: payload.newSalary ?? 6300000,
      effectiveMonth: payload.effectiveMonth ?? payload.period ?? "2026-08",
      reason: payload.reason ?? "Điều chỉnh theo thỏa thuận HĐLĐ",
      status: "pending_agency_verification",
      documentName: payload.documentName,
      createdAt: new Date().toISOString().replace("T", " ").slice(0, 16),
    };

    mutateMockDatabase((db) => {
      db.insuranceChanges = [newRecord, ...(db.insuranceChanges ?? [])];
    });

    return ok(newRecord);
  }),

  http.post("/api/insurance/changes/batch-import", async ({ request }) => {
    await delay(400);
    const payload = (await request.json()) as { items: Partial<InsuranceChangeRecord>[] };
    const database = readMockDatabase();
    const created: InsuranceChangeRecord[] = [];

    mutateMockDatabase((db) => {
      payload.items.forEach((item, idx) => {
        const emp = (database.employees ?? []).find((e) => e.id === item.employeeId || e.code === item.employeeCode);
        const master = (database.insuranceRecords ?? []).find((m) => m.employeeId === (emp?.id ?? item.employeeId));

        const rec: InsuranceChangeRecord = {
          id: `ins-chg-${Date.now()}-${idx}`,
          employeeId: emp?.id ?? item.employeeId ?? `emp-${idx}`,
          employeeCode: emp?.code ?? item.employeeCode ?? "",
          employeeName: emp?.name ?? item.employeeName ?? "",
          projectId: emp?.projectId ?? item.projectId ?? "prj-jss",
          period: item.period ?? "2026-08",
          changeType: item.changeType ?? "salary_adjust",
          oldSalary: master?.insuranceSalary ?? item.oldSalary ?? 6300000,
          newSalary: item.newSalary ?? 6300000,
          effectiveMonth: item.effectiveMonth ?? item.period ?? "2026-08",
          reason: item.reason ?? "Import danh sách biến động D02-LT",
          status: "pending_agency_verification",
          documentName: item.documentName ?? "DanhSachBienDong_D02_LT.xlsx",
          createdAt: new Date().toISOString().replace("T", " ").slice(0, 16),
        };
        created.push(rec);
      });

      db.insuranceChanges = [...created, ...(db.insuranceChanges ?? [])];
    });

    return ok(created);
  }),

  http.post("/api/insurance/changes/:id/verify", async ({ params, request }) => {
    await delay(300);
    const id = String(params.id);
    const payload = (await request.json()) as { verifiedBy?: string; agencyReceiptCode?: string };
    let updatedChange: InsuranceChangeRecord | undefined;

    mutateMockDatabase((db) => {
      const idx = (db.insuranceChanges ?? []).findIndex((c) => c.id === id);
      if (idx >= 0) {
        const change = db.insuranceChanges[idx];
        const verifiedBy = payload.verifiedBy ?? "Trần Thu Trang (Kế toán BHXH)";
        const verifiedAt = new Date().toISOString().replace("T", " ").slice(0, 16);
        const agencyReceiptCode = payload.agencyReceiptCode ?? `BHXH-7901-${change.period.replace("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`;

        db.insuranceChanges[idx] = {
          ...change,
          status: "verified",
          agencyReceiptCode,
          verifiedBy,
          verifiedAt,
        };
        updatedChange = db.insuranceChanges[idx];

        // Tự động đồng bộ cập nhật vào Sổ BHXH Master
        const masterIdx = (db.insuranceRecords ?? []).findIndex((m) => m.employeeId === change.employeeId);
        if (masterIdx >= 0) {
          const master = db.insuranceRecords[masterIdx];
          let nextStatus: "active" | "suspended" | "stopped" = master.status;
          let nextSalary = master.insuranceSalary;

          if (change.changeType === "increase" || change.changeType === "salary_adjust" || change.changeType === "resume") {
            nextStatus = "active";
            nextSalary = change.newSalary;
          } else if (change.changeType === "decrease") {
            nextStatus = "stopped";
          } else if (change.changeType === "suspend") {
            nextStatus = "suspended";
          }

          db.insuranceRecords[masterIdx] = {
            ...master,
            insuranceSalary: nextSalary,
            status: nextStatus,
            effectiveMonth: change.effectiveMonth,
            verifiedBy,
            verifiedAt,
          };
        }
      }
    });

    return updatedChange ? ok(updatedChange) : fail(404, "RECORD_NOT_FOUND", "Không tìm thấy hồ sơ biến động BHXH");
  }),

  http.post("/api/insurance/changes/batch-verify", async ({ request }) => {
    await delay(350);
    const payload = (await request.json()) as { ids: string[]; verifiedBy?: string; agencyReceiptCode?: string };
    const idSet = new Set(payload.ids ?? []);
    const verifiedBy = payload.verifiedBy ?? "Trần Thu Trang (Kế toán BHXH)";
    const verifiedAt = new Date().toISOString().replace("T", " ").slice(0, 16);
    let updatedList: InsuranceChangeRecord[] = [];

    mutateMockDatabase((db) => {
      db.insuranceChanges = (db.insuranceChanges ?? []).map((change) => {
        if (idSet.has(change.id)) {
          const agencyReceiptCode = payload.agencyReceiptCode ?? `BHXH-7901-${change.period.replace("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`;
          const updated = {
            ...change,
            status: "verified" as const,
            agencyReceiptCode,
            verifiedBy,
            verifiedAt,
          };

          // Đồng bộ vào Master
          const masterIdx = (db.insuranceRecords ?? []).findIndex((m) => m.employeeId === change.employeeId);
          if (masterIdx >= 0) {
            const master = db.insuranceRecords[masterIdx];
            let nextStatus: "active" | "suspended" | "stopped" = master.status;
            let nextSalary = master.insuranceSalary;

            if (change.changeType === "increase" || change.changeType === "salary_adjust" || change.changeType === "resume") {
              nextStatus = "active";
              nextSalary = change.newSalary;
            } else if (change.changeType === "decrease") {
              nextStatus = "stopped";
            } else if (change.changeType === "suspend") {
              nextStatus = "suspended";
            }

            db.insuranceRecords[masterIdx] = {
              ...master,
              insuranceSalary: nextSalary,
              status: nextStatus,
              effectiveMonth: change.effectiveMonth,
              verifiedBy,
              verifiedAt,
            };
          }

          return updated;
        }
        return change;
      });

      updatedList = db.insuranceChanges.filter((c) => idSet.has(c.id));
    });

    return ok(updatedList);
  }),

  http.post("/api/insurance/changes/:id/reject", async ({ params, request }) => {
    await delay(300);
    const id = String(params.id);
    const payload = (await request.json()) as { rejectionReason: string };
    let updatedChange: InsuranceChangeRecord | undefined;

    mutateMockDatabase((db) => {
      const idx = (db.insuranceChanges ?? []).findIndex((c) => c.id === id);
      if (idx >= 0) {
        db.insuranceChanges[idx] = {
          ...db.insuranceChanges[idx],
          status: "rejected",
          rejectionReason: payload.rejectionReason || "Không khớp thông tin hợp đồng / cơ quan BHXH",
          verifiedBy: "Trần Thu Trang (Kế toán BHXH)",
          verifiedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
        };
        updatedChange = db.insuranceChanges[idx];
      }
    });

    return updatedChange ? ok(updatedChange) : fail(404, "RECORD_NOT_FOUND", "Không tìm thấy bản ghi biến động");
  }),

  http.post("/api/insurance-records/:id/verify", async ({ params, request }) => {
    await delay(300);
    const id = String(params.id);
    const payload = (await request.json()) as { verifiedBy?: string };
    let updated: InsuranceRecord | undefined;
    mutateMockDatabase((db) => {
      const idx = (db.insuranceRecords ?? []).findIndex((i) => i.id === id);
      if (idx >= 0) {
        db.insuranceRecords[idx] = {
          ...db.insuranceRecords[idx],
          status: "active",
          verifiedBy: payload.verifiedBy ?? "Trần Thu Trang (Kế toán BHXH)",
          verifiedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
        };
        updated = db.insuranceRecords[idx];
      }
    });
    return updated ? ok(updated) : fail(404, "RECORD_NOT_FOUND", "Không tìm thấy hồ sơ BHXH");
  }),

  http.post("/api/insurance-records/batch-verify", async ({ request }) => {
    await delay(300);
    const payload = (await request.json()) as { ids: string[]; verifiedBy?: string };
    const idSet = new Set(payload.ids ?? []);
    const verifiedBy = payload.verifiedBy ?? "Trần Thu Trang (Kế toán BHXH)";
    const verifiedAt = new Date().toISOString().replace("T", " ").slice(0, 16);
    let updatedList: InsuranceRecord[] = [];
    mutateMockDatabase((db) => {
      db.insuranceRecords = (db.insuranceRecords ?? []).map((i) => {
        if (idSet.has(i.id)) {
          return {
            ...i,
            status: "active",
            verifiedBy,
            verifiedAt,
          };
        }
        return i;
      });
      updatedList = db.insuranceRecords.filter((i) => idSet.has(i.id));
    });
    return ok(updatedList);
  }),

  http.get("/api/tax-configs", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const projId = url.searchParams.get("projectId");
    const database = readMockDatabase();
    let list = database.taxConfigs ?? [];
    if (projId && projId !== "all") {
      list = list.filter((t) => t.projectId === projId);
    }
    return ok(list);
  }),

  http.patch("/api/tax-configs/:id", async ({ params, request }) => {
    await delay(300);
    const id = String(params.id);
    const payload = (await request.json()) as Partial<TaxConfigRecord>;
    let updated: TaxConfigRecord | undefined;
    mutateMockDatabase((db) => {
      const idx = (db.taxConfigs ?? []).findIndex((t) => t.id === id);
      if (idx >= 0) {
        db.taxConfigs[idx] = {
          ...db.taxConfigs[idx],
          ...payload,
        };
        updated = db.taxConfigs[idx];
      }
    });
    return updated ? ok(updated) : fail(404, "RECORD_NOT_FOUND", "Không tìm thấy cấu hình thuế");
  }),

  http.get("/api/employee-policies", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const projId = url.searchParams.get("projectId");
    const database = readMockDatabase();
    let list = database.employeePolicies ?? [];
    if (projId && projId !== "all") {
      list = list.filter((p) => p.projectId === projId);
    }
    return ok(list);
  }),

  http.get("/api/employee-policies/:employeeId", async ({ params }) => {
    await delay(150);
    const empId = String(params.employeeId);
    const database = readMockDatabase();
    const item = (database.employeePolicies ?? []).find(
      (p) => p.employeeId === empId || p.id === empId || p.employeeCode === empId
    );
    return item ? ok(item) : fail(404, "RECORD_NOT_FOUND", "Không tìm thấy chế độ nhân sự");
  }),

  http.put("/api/employee-policies/:employeeId", async ({ params, request }) => {
    await delay(300);
    const empId = String(params.employeeId);
    const payload = (await request.json()) as {
      policies: EmployeePolicyItem[];
      baseSalary?: number;
      insuranceSalary?: number;
      effectiveFrom?: string;
    };
    let updated: EmployeePolicyRecord | undefined;
    mutateMockDatabase((db) => {
      const idx = (db.employeePolicies ?? []).findIndex(
        (p) => p.employeeId === empId || p.id === empId || p.employeeCode === empId
      );
      if (idx >= 0) {
        const cur = db.employeePolicies[idx];
        const newPolicies = payload.policies ?? cur.policies;

        const baseSalItem = newPolicies.find((i) => i.policyId === "pol-base-salary");
        const insSalItem = newPolicies.find((i) => i.policyId === "pol-insurance-salary");

        const baseSalary =
          payload.baseSalary ??
          Number(
            (baseSalItem?.isCustom ? baseSalItem.customValue?.amount : baseSalItem?.defaultValue?.amount) ||
            cur.baseSalary
          );

        const insuranceSalary =
          payload.insuranceSalary ??
          Number(
            (insSalItem?.isCustom ? insSalItem.customValue?.amount : insSalItem?.defaultValue?.amount) ||
            cur.insuranceSalary
          );

        const totalAllowance = newPolicies
          .filter(
            (i) =>
              i.isEnabled &&
              i.policyId !== "pol-base-salary" &&
              i.policyId !== "pol-insurance-salary" &&
              i.policyId !== "pol-hourly-rate" &&
              !i.policyId.startsWith("pol-ot")
          )
          .reduce((sum, i) => {
            const val = i.isCustom ? i.customValue?.amount : i.defaultValue?.amount;
            return sum + (typeof val === "number" ? val : 0);
          }, 0);

        const customPolicyCount = newPolicies.filter((i) => i.isCustom).length;
        const nowStr = new Date().toISOString().replace("T", " ").slice(0, 16);

        db.employeePolicies[idx] = {
          ...cur,
          baseSalary,
          insuranceSalary,
          totalAllowance,
          customPolicyCount,
          policies: newPolicies,
          effectiveFrom: payload.effectiveFrom ?? cur.effectiveFrom ?? "2026-08-01",
          updatedAt: nowStr,
          updatedBy: "Kế toán tiền lương",
        };
        updated = db.employeePolicies[idx];

        const logItem: ActivityLogItem = {
          id: uid("act"),
          projectId: cur.projectId || "prj-jss",
          module: "policies",
          employeeId: cur.employeeId,
          employeeCode: cur.employeeCode,
          employeeName: cur.employeeName,
          actionType: "update",
          actionLabel: "Cập nhật chế độ & phụ cấp",
          details: `LCB: ${baseSalary.toLocaleString("vi-VN")}đ · Tổng phụ cấp: ${totalAllowance.toLocaleString("vi-VN")}đ (${customPolicyCount} khoản riêng)`,
          newValue: totalAllowance,
          changedBy: "Kế toán tiền lương",
          reason: "Điều chỉnh chế độ đãi ngộ & phụ cấp cá nhân",
          createdAt: new Date().toISOString(),
        };
        db.activityLogs = [logItem, ...(db.activityLogs ?? [])];
      }
    });
    return updated ? ok(updated) : fail(404, "RECORD_NOT_FOUND", "Không tìm thấy chế độ nhân sự");
  }),

  http.post("/api/employee-policies/batch-import", async ({ request }) => {
    await delay(400);
    const payload = (await request.json()) as {
      projectId: string;
      items: Array<{ employeeCode: string; policyCode: string; amount: number; isEnabled?: boolean; reason?: string }>;
    };
    const updatedList: EmployeePolicyRecord[] = [];
    mutateMockDatabase((db) => {
      payload.items.forEach((item) => {
        const idx = (db.employeePolicies ?? []).findIndex((p) => p.employeeCode === item.employeeCode);
        if (idx >= 0) {
          const cur = db.employeePolicies[idx];
          const newPolicies = cur.policies.map((p) => {
            if (p.policyCode === item.policyCode || p.policyId === item.policyCode) {
              return {
                ...p,
                isEnabled: item.isEnabled !== undefined ? item.isEnabled : true,
                isCustom: true,
                customValue: { ...p.customValue, amount: item.amount },
                reason: item.reason || "Cập nhật phụ cấp từ tệp Excel",
                updatedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
                updatedBy: "Kế toán C&B",
              };
            }
            return p;
          });

          const totalAllowance = newPolicies
            .filter(
              (i) =>
                i.isEnabled &&
                i.policyId !== "pol-base-salary" &&
                i.policyId !== "pol-insurance-salary" &&
                i.policyId !== "pol-hourly-rate" &&
                !i.policyId.startsWith("pol-ot")
            )
            .reduce((sum, i) => {
              const val = i.isCustom ? i.customValue?.amount : i.defaultValue?.amount;
              return sum + (typeof val === "number" ? val : 0);
            }, 0);

          db.employeePolicies[idx] = {
            ...cur,
            policies: newPolicies,
            totalAllowance,
            customPolicyCount: newPolicies.filter((i) => i.isCustom).length,
            updatedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
            updatedBy: "Kế toán C&B",
          };
          updatedList.push(db.employeePolicies[idx]);
        }
      });
    });
    return ok(updatedList);
  }),

  http.post("/api/employee-policies/:employeeId/reset", async ({ params }) => {
    await delay(300);
    const empId = String(params.employeeId);
    let updated: EmployeePolicyRecord | undefined;
    mutateMockDatabase((db) => {
      const idx = (db.employeePolicies ?? []).findIndex(
        (p) => p.employeeId === empId || p.id === empId || p.employeeCode === empId
      );
      if (idx >= 0) {
        const cur = db.employeePolicies[idx];
        const resetPolicies = cur.policies.map((p) => ({
          ...p,
          isCustom: false,
          customValue: { ...p.defaultValue },
          isEnabled: (p.policyId !== "pol-responsibility" && p.policyCode !== "RESPONSIBILITY_ALLOWANCE") || cur.role === "shift_leader",
          reason: undefined,
          updatedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
          updatedBy: "Hệ thống (Mặc định dự án)",
        }));

        const totalAllowance = resetPolicies
          .filter(
            (i) =>
              i.isEnabled &&
              i.policyId !== "pol-base-salary" &&
              i.policyId !== "pol-insurance-salary" &&
              i.policyId !== "pol-hourly-rate" &&
              !i.policyId.startsWith("pol-ot")
          )
          .reduce((sum, i) => {
            const val = i.defaultValue?.amount;
            return sum + (typeof val === "number" ? val : 0);
          }, 0);

        db.employeePolicies[idx] = {
          ...cur,
          baseSalary: cur.role === "shift_leader" ? 7000000 : 6300000,
          insuranceSalary: cur.role === "shift_leader" ? 8000000 : 6300000,
          totalAllowance,
          customPolicyCount: 0,
          policies: resetPolicies,
          updatedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
          updatedBy: "Hệ thống (Mặc định dự án)",
        };
        updated = db.employeePolicies[idx];
      }
    });
    return updated ? ok(updated) : fail(404, "RECORD_NOT_FOUND", "Không tìm thấy chế độ nhân sự");
  }),

  // Project Employee Groups APIs
  http.get("/api/projects/:projectId/employee-groups", async ({ params }) => {
    await delay(120);
    const pId = projectId(params.projectId);
    const db = readMockDatabase();
    let groups = (db.projectEmployeeGroups ?? []).filter((g) => g.projectId === pId);

    // Auto-seed default 3 groups for this project if none exist yet!
    if (groups.length === 0) {
      mutateMockDatabase((database) => {
        if (!database.projectEmployeeGroups) database.projectEmployeeGroups = [];
        const defaults: ProjectEmployeeGroup[] = [
          {
            id: `grp-mgmt-${pId}`,
            projectId: pId,
            code: "shift_leader",
            name: "Quản lý / Shift Leader",
            description: "Nhóm trưởng ca, quản lý chuyền sản xuất",
            colorTone: "info",
            isDefault: false,
            sortOrder: 1,
            createdAt: new Date().toISOString().slice(0, 10),
          },
          {
            id: `grp-off-${pId}`,
            projectId: pId,
            code: "chinh_thuc",
            name: "Công nhân chính thức",
            description: "Công nhân ký hợp đồng lao động chính thức",
            colorTone: "success",
            isDefault: true,
            sortOrder: 2,
            createdAt: new Date().toISOString().slice(0, 10),
          },
          {
            id: `grp-prob-${pId}`,
            projectId: pId,
            code: "hoc_viec",
            name: "Học việc (29 ngày)",
            description: "Lao động mới tham gia đào tạo học nghề",
            colorTone: "warning",
            isDefault: false,
            sortOrder: 3,
            createdAt: new Date().toISOString().slice(0, 10),
          },
        ];
        database.projectEmployeeGroups.push(...defaults);
        groups = defaults;
      });
    }

    // Enrich with dynamic employee counts
    const enriched = groups.map((grp) => {
      const count = (db.employees ?? []).filter((emp) => {
        if (emp.projectId !== pId) return false;
        if (emp.groupId === grp.id || emp.groupId === grp.code) return true;
        if (!emp.groupId && grp.isDefault) return true;
        return false;
      }).length;
      return { ...grp, employeeCount: count };
    });

    return ok(enriched);
  }),

  http.post("/api/projects/:projectId/employee-groups", async ({ params, request }) => {
    await delay(180);
    const pId = projectId(params.projectId);
    const body = (await request.json()) as Partial<ProjectEmployeeGroup>;
    if (!body.name) {
      return fail(400, "VALIDATION_ERROR", "Tên nhóm người lao động là bắt buộc");
    }

    let created: ProjectEmployeeGroup | undefined;
    mutateMockDatabase((db) => {
      if (!db.projectEmployeeGroups) db.projectEmployeeGroups = [];
      const newGroup: ProjectEmployeeGroup = {
        id: uid("grp"),
        projectId: pId,
        code: body.code || uid("code"),
        name: body.name!,
        description: body.description || "",
        colorTone: body.colorTone || "primary",
        isDefault: Boolean(body.isDefault),
        sortOrder: db.projectEmployeeGroups.filter((g) => g.projectId === pId).length + 1,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      db.projectEmployeeGroups.push(newGroup);
      created = { ...newGroup, employeeCount: 0 };
    });

    return ok(created, { status: 201 });
  }),

  http.patch("/api/projects/:projectId/employee-groups/:groupId", async ({ params, request }) => {
    await delay(150);
    const pId = projectId(params.projectId);
    const gId = String(params.groupId);
    const body = (await request.json()) as Partial<ProjectEmployeeGroup>;

    let updated: ProjectEmployeeGroup | undefined;
    mutateMockDatabase((db) => {
      const idx = (db.projectEmployeeGroups ?? []).findIndex(
        (g) => g.projectId === pId && (g.id === gId || g.code === gId)
      );
      if (idx >= 0) {
        db.projectEmployeeGroups[idx] = {
          ...db.projectEmployeeGroups[idx],
          ...body,
          updatedAt: new Date().toISOString().slice(0, 10),
        };
        const count = (db.employees ?? []).filter(
          (e) => e.projectId === pId && (e.groupId === gId || e.groupId === db.projectEmployeeGroups[idx].code)
        ).length;
        updated = { ...db.projectEmployeeGroups[idx], employeeCount: count };
      }
    });

    return updated ? ok(updated) : fail(404, "GROUP_NOT_FOUND", "Không tìm thấy nhóm người lao động");
  }),

  http.delete("/api/projects/:projectId/employee-groups/:groupId", async ({ params }) => {
    await delay(150);
    const pId = projectId(params.projectId);
    const gId = String(params.groupId);

    mutateMockDatabase((db) => {
      db.projectEmployeeGroups = (db.projectEmployeeGroups ?? []).filter(
        (g) => !(g.projectId === pId && (g.id === gId || g.code === gId))
      );
      // Reset employee groupId if belonged to deleted group
      db.employees = (db.employees ?? []).map((emp) => {
        if (emp.projectId === pId && (emp.groupId === gId)) {
          return { ...emp, groupId: undefined, groupName: undefined };
        }
        return emp;
      });
    });

    return ok({ success: true });
  }),

  http.post("/api/projects/:projectId/employee-groups/:groupId/assign", async ({ params, request }) => {
    await delay(200);
    const pId = projectId(params.projectId);
    const gId = String(params.groupId);
    const body = (await request.json()) as { employeeIds: string[] };

    let updatedCount = 0;
    mutateMockDatabase((db) => {
      const targetGroup = (db.projectEmployeeGroups ?? []).find(
        (g) => g.projectId === pId && (g.id === gId || g.code === gId)
      );
      const groupName = targetGroup?.name ?? "";

      db.employees = (db.employees ?? []).map((emp) => {
        if (emp.projectId === pId && body.employeeIds.includes(emp.id)) {
          updatedCount++;
          return {
            ...emp,
            groupId: targetGroup?.id ?? gId,
            groupName,
          };
        }
        return emp;
      });
    });

    return ok({ success: true, updatedCount });
  }),

  http.get("/api/activity-logs", async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const prjId = url.searchParams.get("projectId");
    const moduleName = url.searchParams.get("module");
    const q = (url.searchParams.get("q") ?? "").toLocaleLowerCase("vi");
    const database = readMockDatabase();
    let logs = [...(database.activityLogs ?? [])];
    if (prjId && prjId !== "all") {
      logs = logs.filter((item) => !item.projectId || item.projectId === prjId);
    }
    if (moduleName) {
      logs = logs.filter((item) => item.module === moduleName);
    }
    if (q) {
      logs = logs.filter((item) =>
        `${item.employeeName ?? ""} ${item.employeeCode ?? ""} ${item.actionLabel} ${item.details} ${item.changedBy} ${item.reason ?? ""}`
          .toLocaleLowerCase("vi")
          .includes(q)
      );
    }
    logs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return ok(logs);
  }),

  http.post("/api/activity-logs", async ({ request }) => {
    await delay(100);
    const payload = (await request.json()) as Partial<ActivityLogItem>;
    const newLog: ActivityLogItem = {
      id: uid("act"),
      projectId: payload.projectId ?? "prj-jss",
      module: payload.module ?? "policies",
      employeeId: payload.employeeId,
      employeeCode: payload.employeeCode,
      employeeName: payload.employeeName,
      actionType: payload.actionType ?? "update",
      actionLabel: payload.actionLabel ?? "Cập nhật",
      details: payload.details ?? "",
      oldValue: payload.oldValue,
      newValue: payload.newValue,
      changedBy: payload.changedBy ?? "Trần Thu Trang (Kế toán)",
      reason: payload.reason,
      createdAt: new Date().toISOString(),
    };
    mutateMockDatabase((db) => {
      db.activityLogs = [newLog, ...(db.activityLogs ?? [])];
    });
    return ok(newLog);
  }),

  // ==========================================
  // OTHER DEDUCTIONS (Khoản trừ khác)
  // ==========================================
  http.get("/api/other-deductions", async ({ request }) => {
    await delay(180);
    const url = new URL(request.url);
    const projId = url.searchParams.get("projectId");
    const period = url.searchParams.get("period");
    const q = (url.searchParams.get("q") ?? "").toLocaleLowerCase("vi").trim();
    const database = readMockDatabase();
    let list = [...(database.otherDeductions ?? [])];

    if (projId && projId !== "all") {
      list = list.filter((item) => item.projectId === projId);
    }
    if (period && period !== "all") {
      list = list.filter((item) => item.period === period);
    }
    if (q) {
      list = list.filter((item) =>
        `${item.employeeName} ${item.employeeCode} ${item.decisionNo ?? ""} ${item.categoryLabel ?? ""} ${item.reason}`
          .toLocaleLowerCase("vi")
          .includes(q)
      );
    }

    list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return ok(list);
  }),

  http.post("/api/other-deductions", async ({ request }) => {
    await delay(200);
    const payload = (await request.json()) as Partial<OtherDeductionRecord>;
    const database = readMockDatabase();
    const emp = database.employees.find((e) => e.id === payload.employeeId || e.code === payload.employeeCode);

    const categoryLabels: Record<string, string> = {
      violation: "Phạt vi phạm nội quy",
      compensation: "Bồi thường tài sản",
      late_penalty: "Phạt đi trễ theo quyết định",
      uniform: "Khấu trừ đồng phục",
      other: "Khác",
    };

    const newRecord: OtherDeductionRecord = {
      id: `ded-${Date.now()}`,
      projectId: payload.projectId || emp?.projectId || "prj-jss",
      employeeId: emp?.id ?? payload.employeeId ?? "",
      employeeCode: emp?.code ?? payload.employeeCode ?? "",
      employeeName: emp?.name ?? payload.employeeName ?? "",
      position: emp?.position ?? payload.position ?? "Nhân viên",
      period: payload.period || "2026-08",
      category: payload.category || "violation",
      categoryLabel: categoryLabels[payload.category || "violation"] || "Khoản trừ khác",
      amount: payload.amount ?? 0,
      decisionNo: payload.decisionNo,
      decisionDate: payload.decisionDate,
      attachmentName: payload.attachmentName,
      attachmentUrl: payload.attachmentUrl,
      attachmentSize: payload.attachmentSize,
      reason: payload.reason || "Khấu trừ theo quyết định ban hành",
      updatedBy: payload.updatedBy || "Trần Thu Trang (Kế toán)",
      updatedAt: new Date().toISOString(),
    };

    const logItem: ActivityLogItem = {
      id: uid("act"),
      projectId: newRecord.projectId,
      module: "deductions",
      employeeId: newRecord.employeeId,
      employeeCode: newRecord.employeeCode,
      employeeName: newRecord.employeeName,
      actionType: "create",
      actionLabel: "Thêm khoản trừ",
      details: `${newRecord.categoryLabel}: -${newRecord.amount.toLocaleString("vi-VN")}đ (Kỳ: ${newRecord.period}${newRecord.decisionNo ? ` - ${newRecord.decisionNo}` : ""})`,
      newValue: newRecord.amount,
      changedBy: newRecord.updatedBy,
      reason: newRecord.reason,
      createdAt: new Date().toISOString(),
    };

    mutateMockDatabase((db) => {
      db.otherDeductions = [newRecord, ...(db.otherDeductions ?? [])];
      db.activityLogs = [logItem, ...(db.activityLogs ?? [])];
    });

    return ok(newRecord);
  }),

  http.put("/api/other-deductions/:id", async ({ params, request }) => {
    await delay(200);
    const { id } = params;
    const payload = (await request.json()) as Partial<OtherDeductionRecord>;
    let updated: OtherDeductionRecord | null = null;

    const categoryLabels: Record<string, string> = {
      violation: "Phạt vi phạm nội quy",
      compensation: "Bồi thường tài sản",
      late_penalty: "Phạt đi trễ theo quyết định",
      uniform: "Khấu trừ đồng phục",
      other: "Khác",
    };

    mutateMockDatabase((db) => {
      const idx = (db.otherDeductions ?? []).findIndex((item) => item.id === id);
      if (idx !== -1) {
        const cur = db.otherDeductions[idx];
        const updatedCat = payload.category ?? cur.category;
        db.otherDeductions[idx] = {
          ...cur,
          ...payload,
          category: updatedCat,
          categoryLabel: categoryLabels[updatedCat] || cur.categoryLabel,
          updatedAt: new Date().toISOString(),
        };
        updated = db.otherDeductions[idx];

        const logItem: ActivityLogItem = {
          id: uid("act"),
          projectId: cur.projectId,
          module: "deductions",
          employeeId: cur.employeeId,
          employeeCode: cur.employeeCode,
          employeeName: cur.employeeName,
          actionType: "update",
          actionLabel: "Sửa khoản trừ",
          details: `Cập nhật ${updated.categoryLabel}: -${updated.amount.toLocaleString("vi-VN")}đ (QĐ: ${updated.decisionNo || "N/A"})`,
          oldValue: cur.amount,
          newValue: updated.amount,
          changedBy: payload.updatedBy || "Trần Thu Trang (Kế toán)",
          reason: updated.reason,
          createdAt: new Date().toISOString(),
        };
        db.activityLogs = [logItem, ...(db.activityLogs ?? [])];
      }
    });

    return updated ? ok(updated) : fail(404, "NOT_FOUND", "Không tìm thấy bản ghi khoản trừ");
  }),

  http.delete("/api/other-deductions/:id", async ({ params }) => {
    await delay(150);
    const { id } = params;
    let deleted = false;

    mutateMockDatabase((db) => {
      const idx = (db.otherDeductions ?? []).findIndex((item) => item.id === id);
      if (idx !== -1) {
        const cur = db.otherDeductions[idx];
        const logItem: ActivityLogItem = {
          id: uid("act"),
          projectId: cur.projectId,
          module: "deductions",
          employeeId: cur.employeeId,
          employeeCode: cur.employeeCode,
          employeeName: cur.employeeName,
          actionType: "delete",
          actionLabel: "Xóa khoản trừ",
          details: `Xóa ${cur.categoryLabel}: -${cur.amount.toLocaleString("vi-VN")}đ (${cur.decisionNo || "N/A"})`,
          oldValue: cur.amount,
          changedBy: "Trần Thu Trang (Kế toán)",
          createdAt: new Date().toISOString(),
        };
        db.activityLogs = [logItem, ...(db.activityLogs ?? [])];
        db.otherDeductions.splice(idx, 1);
        deleted = true;
      }
    });

    return deleted ? ok({ success: true }) : fail(404, "NOT_FOUND", "Không tìm thấy bản ghi cần xóa");
  }),

  http.post("/api/other-deductions/batch-import", async ({ request }) => {
    await delay(400);
    const payload = (await request.json()) as {
      projectId: string;
      period: string;
      items: Array<Partial<OtherDeductionRecord>>;
    };

    const database = readMockDatabase();
    const categoryLabels: Record<string, string> = {
      violation: "Phạt vi phạm nội quy",
      compensation: "Bồi thường tài sản",
      late_penalty: "Phạt đi trễ theo quyết định",
      uniform: "Khấu trừ đồng phục",
      other: "Khác",
    };

    const createdRecords: OtherDeductionRecord[] = (payload.items ?? []).map((item, idx) => {
      const emp = database.employees.find((e) => e.code === item.employeeCode || e.id === item.employeeId);
      const cat = item.category || "violation";
      return {
        id: `ded-imp-${Date.now()}-${idx}`,
        projectId: payload.projectId || emp?.projectId || "prj-jss",
        employeeId: emp?.id ?? item.employeeId ?? "",
        employeeCode: emp?.code ?? item.employeeCode ?? "",
        employeeName: emp?.name ?? item.employeeName ?? "",
        position: emp?.position ?? item.position ?? "Nhân viên",
        period: payload.period || item.period || "2026-08",
        category: cat,
        categoryLabel: categoryLabels[cat] || "Khoản trừ khác",
        amount: item.amount ?? 0,
        decisionNo: item.decisionNo,
        decisionDate: item.decisionDate,
        attachmentName: item.attachmentName,
        attachmentUrl: item.attachmentUrl,
        attachmentSize: item.attachmentSize,
        reason: item.reason || "Import danh sách khoản trừ hàng loạt từ file Excel",
        updatedBy: "Trần Thu Trang (Kế toán)",
        updatedAt: new Date().toISOString(),
      };
    });

    mutateMockDatabase((db) => {
      db.otherDeductions = [...createdRecords, ...(db.otherDeductions ?? [])];
      const logItem: ActivityLogItem = {
        id: uid("act"),
        projectId: payload.projectId,
        module: "deductions",
        actionType: "import",
        actionLabel: "Import Excel khoản trừ",
        details: `Nhập khẩu ${createdRecords.length} khoản trừ cho kỳ ${payload.period} từ file Excel`,
        changedBy: "Trần Thu Trang (Kế toán)",
        createdAt: new Date().toISOString(),
      };
      db.activityLogs = [logItem, ...(db.activityLogs ?? [])];
    });

    return ok(createdRecords);
  }),

  // ==========================================
  // OTHER INCOMES (Khoản thu nhập khác)
  // ==========================================
  http.get("/api/other-incomes", async ({ request }) => {
    await delay(180);
    const url = new URL(request.url);
    const projId = url.searchParams.get("projectId");
    const period = url.searchParams.get("period");
    const q = (url.searchParams.get("q") ?? "").toLocaleLowerCase("vi").trim();
    const database = readMockDatabase();
    let list = [...(database.otherIncomes ?? [])];

    if (projId && projId !== "all") {
      list = list.filter((item) => item.projectId === projId);
    }
    if (period && period !== "all") {
      list = list.filter((item) => item.period === period);
    }
    if (q) {
      list = list.filter((item) =>
        `${item.employeeName} ${item.employeeCode} ${item.decisionNo ?? ""} ${item.categoryLabel ?? ""} ${item.reason}`
          .toLocaleLowerCase("vi")
          .includes(q)
      );
    }

    list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return ok(list);
  }),

  http.post("/api/other-incomes", async ({ request }) => {
    await delay(200);
    const payload = (await request.json()) as Partial<OtherIncomeRecord>;
    const database = readMockDatabase();
    const emp = database.employees.find((e) => e.id === payload.employeeId || e.code === payload.employeeCode);

    const categoryLabels: Record<string, string> = {
      spot_bonus: "Thưởng nóng thành tích",
      project_bonus: "Thưởng tiến độ dự án",
      support: "Hỗ trợ khó khăn",
      incentive: "Khen thưởng chuyên cần",
      other: "Thu nhập khác",
    };

    const newRecord: OtherIncomeRecord = {
      id: `inc-${Date.now()}`,
      projectId: payload.projectId || emp?.projectId || "prj-jss",
      employeeId: emp?.id ?? payload.employeeId ?? "",
      employeeCode: emp?.code ?? payload.employeeCode ?? "",
      employeeName: emp?.name ?? payload.employeeName ?? "",
      position: emp?.position ?? payload.position ?? "Nhân viên",
      period: payload.period || "2026-08",
      category: payload.category || "spot_bonus",
      categoryLabel: categoryLabels[payload.category || "spot_bonus"] || "Thu nhập khác",
      amount: payload.amount ?? 0,
      decisionNo: payload.decisionNo,
      decisionDate: payload.decisionDate,
      attachmentName: payload.attachmentName,
      attachmentUrl: payload.attachmentUrl,
      attachmentSize: payload.attachmentSize,
      reason: payload.reason || "Khen thưởng / hỗ trợ theo quyết định",
      updatedBy: payload.updatedBy || "Trần Thu Trang (Kế toán)",
      updatedAt: new Date().toISOString(),
    };

    const logItem: ActivityLogItem = {
      id: uid("act"),
      projectId: newRecord.projectId,
      module: "incomes",
      employeeId: newRecord.employeeId,
      employeeCode: newRecord.employeeCode,
      employeeName: newRecord.employeeName,
      actionType: "create",
      actionLabel: "Thêm thu nhập",
      details: `${newRecord.categoryLabel}: +${newRecord.amount.toLocaleString("vi-VN")}đ (Kỳ: ${newRecord.period}${newRecord.decisionNo ? ` - ${newRecord.decisionNo}` : ""})`,
      newValue: newRecord.amount,
      changedBy: newRecord.updatedBy,
      reason: newRecord.reason,
      createdAt: new Date().toISOString(),
    };

    mutateMockDatabase((db) => {
      db.otherIncomes = [newRecord, ...(db.otherIncomes ?? [])];
      db.activityLogs = [logItem, ...(db.activityLogs ?? [])];
    });

    return ok(newRecord);
  }),

  http.put("/api/other-incomes/:id", async ({ params, request }) => {
    await delay(200);
    const { id } = params;
    const payload = (await request.json()) as Partial<OtherIncomeRecord>;
    let updated: OtherIncomeRecord | null = null;

    const categoryLabels: Record<string, string> = {
      spot_bonus: "Thưởng nóng thành tích",
      project_bonus: "Thưởng tiến độ dự án",
      support: "Hỗ trợ khó khăn",
      incentive: "Khen thưởng chuyên cần",
      other: "Thu nhập khác",
    };

    mutateMockDatabase((db) => {
      const idx = (db.otherIncomes ?? []).findIndex((item) => item.id === id);
      if (idx !== -1) {
        const cur = db.otherIncomes[idx];
        const updatedCat = payload.category ?? cur.category;
        db.otherIncomes[idx] = {
          ...cur,
          ...payload,
          category: updatedCat,
          categoryLabel: categoryLabels[updatedCat] || cur.categoryLabel,
          updatedAt: new Date().toISOString(),
        };
        updated = db.otherIncomes[idx];

        const logItem: ActivityLogItem = {
          id: uid("act"),
          projectId: cur.projectId,
          module: "incomes",
          employeeId: cur.employeeId,
          employeeCode: cur.employeeCode,
          employeeName: cur.employeeName,
          actionType: "update",
          actionLabel: "Sửa thu nhập",
          details: `Cập nhật ${updated.categoryLabel}: +${updated.amount.toLocaleString("vi-VN")}đ (QĐ: ${updated.decisionNo || "N/A"})`,
          oldValue: cur.amount,
          newValue: updated.amount,
          changedBy: payload.updatedBy || "Trần Thu Trang (Kế toán)",
          reason: updated.reason,
          createdAt: new Date().toISOString(),
        };
        db.activityLogs = [logItem, ...(db.activityLogs ?? [])];
      }
    });

    return updated ? ok(updated) : fail(404, "NOT_FOUND", "Không tìm thấy bản ghi thu nhập");
  }),

  http.delete("/api/other-incomes/:id", async ({ params }) => {
    await delay(150);
    const { id } = params;
    let deleted = false;

    mutateMockDatabase((db) => {
      const idx = (db.otherIncomes ?? []).findIndex((item) => item.id === id);
      if (idx !== -1) {
        const cur = db.otherIncomes[idx];
        const logItem: ActivityLogItem = {
          id: uid("act"),
          projectId: cur.projectId,
          module: "incomes",
          employeeId: cur.employeeId,
          employeeCode: cur.employeeCode,
          employeeName: cur.employeeName,
          actionType: "delete",
          actionLabel: "Xóa thu nhập",
          details: `Xóa ${cur.categoryLabel}: +${cur.amount.toLocaleString("vi-VN")}đ (${cur.decisionNo || "N/A"})`,
          oldValue: cur.amount,
          changedBy: "Trần Thu Trang (Kế toán)",
          createdAt: new Date().toISOString(),
        };
        db.activityLogs = [logItem, ...(db.activityLogs ?? [])];
        db.otherIncomes.splice(idx, 1);
        deleted = true;
      }
    });

    return deleted ? ok({ success: true }) : fail(404, "NOT_FOUND", "Không tìm thấy bản ghi cần xóa");
  }),

  http.post("/api/other-incomes/batch-import", async ({ request }) => {
    await delay(400);
    const payload = (await request.json()) as {
      projectId: string;
      period: string;
      items: Array<Partial<OtherIncomeRecord>>;
    };

    const database = readMockDatabase();
    const categoryLabels: Record<string, string> = {
      spot_bonus: "Thưởng nóng thành tích",
      project_bonus: "Thưởng tiến độ dự án",
      support: "Hỗ trợ khó khăn",
      incentive: "Khen thưởng chuyên cần",
      other: "Thu nhập khác",
    };

    const createdRecords: OtherIncomeRecord[] = (payload.items ?? []).map((item, idx) => {
      const emp = database.employees.find((e) => e.code === item.employeeCode || e.id === item.employeeId);
      const cat = item.category || "spot_bonus";
      return {
        id: `inc-imp-${Date.now()}-${idx}`,
        projectId: payload.projectId || emp?.projectId || "prj-jss",
        employeeId: emp?.id ?? item.employeeId ?? "",
        employeeCode: emp?.code ?? item.employeeCode ?? "",
        employeeName: emp?.name ?? item.employeeName ?? "",
        position: emp?.position ?? item.position ?? "Nhân viên",
        period: payload.period || item.period || "2026-08",
        category: cat,
        categoryLabel: categoryLabels[cat] || "Thu nhập khác",
        amount: item.amount ?? 0,
        decisionNo: item.decisionNo,
        decisionDate: item.decisionDate,
        attachmentName: item.attachmentName,
        attachmentUrl: item.attachmentUrl,
        attachmentSize: item.attachmentSize,
        reason: item.reason || "Import danh sách thu nhập hàng loạt từ file Excel",
        updatedBy: "Trần Thu Trang (Kế toán)",
        updatedAt: new Date().toISOString(),
      };
    });

    mutateMockDatabase((db) => {
      db.otherIncomes = [...createdRecords, ...(db.otherIncomes ?? [])];
      const logItem: ActivityLogItem = {
        id: uid("act"),
        projectId: payload.projectId,
        module: "incomes",
        actionType: "import",
        actionLabel: "Import Excel thu nhập",
        details: `Nhập khẩu ${createdRecords.length} khoản thu nhập cho kỳ ${payload.period} từ file Excel`,
        changedBy: "Trần Thu Trang (Kế toán)",
        createdAt: new Date().toISOString(),
      };
      db.activityLogs = [logItem, ...(db.activityLogs ?? [])];
    });

    return ok(createdRecords);
  }),

  // =========================================================================
  // OpenAPI 3.0 (01-nguoi-phu-thuoc.yaml) Handlers
  // =========================================================================

  // 1. Master Data: Relationships
  http.get("/api/web/payroll/master-data/dependent-relationships", async () => {
    await delay(150);
    return okV3(dependentRelationshipsMaster);
  }),

  // 2. Master Data: Document Types
  http.get("/api/web/payroll/master-data/dependent-document-types", async () => {
    await delay(150);
    return okV3(dependentDocumentTypesMaster);
  }),

  // 3. Master Data: Payroll Cycles
  http.get("/api/web/payroll/payroll-cycles", async () => {
    await delay(150);
    const cycles = [
      { id: 1, code: "2026-08", name: "Kỳ lương Tháng 08/2026", isCurrent: true, startDate: "2026-08-01", endDate: "2026-08-31" },
      { id: 2, code: "2026-07", name: "Kỳ lương Tháng 07/2026", isCurrent: false, startDate: "2026-07-01", endDate: "2026-07-31" },
      { id: 3, code: "2026-06", name: "Kỳ lương Tháng 06/2026", isCurrent: false, startDate: "2026-06-01", endDate: "2026-06-30" },
    ];
    return okV3(cycles);
  }),

  // 4. Projects list
  http.get("/api/web/payroll/projects", async () => {
    await delay(200);
    const database = readMockDatabase();
    const projectItems = database.projects.map((p, idx) => ({
      projectId: p.code === "JSS-ST" ? 1017 : p.code === "KCV-NM" ? 1018 : 1000 + idx,
      projectCode: p.code,
      projectName: p.name,
      active: p.status !== "archived",
    }));
    return okV3(projectItems);
  }),

  // 5. Project Employees
  http.get("/api/web/payroll/projects/:projectId/employees", async ({ params }) => {
    await delay(250);
    const pId = String(params.projectId);
    const database = readMockDatabase();
    const matchedProject = database.projects.find((p) => String(p.id) === pId || p.code === pId || (p.code === "JSS-ST" && pId === "1017") || (p.code === "KCV-NM" && pId === "1018"));
    const emps = database.employees.filter((e) => !matchedProject || e.projectId === matchedProject.id || pId === "all");
    const items = emps.map((e) => ({
      employeeCode: e.code,
      fullName: e.name,
      gender: e.gender || "Nam",
      joiningDate: e.joinDate || "2022-01-01",
      offDate: null,
      projectId: matchedProject ? (matchedProject.code === "JSS-ST" ? 1017 : 1018) : 1017,
      projectCode: matchedProject?.code || "JSS-ST",
      projectName: matchedProject?.name || "Jabil Smart Solutions",
      positionName: e.position || "Nhân viên",
      taxCode: (e as any).taxCode || "8090001122",
      idNumber: (e as any).idCard || "079090001122",
    }));
    return okV3(items);
  }),


  // ================= 02. Phép năm (Annual Leave) OpenAPI 3.0 Handlers =================
  // 1. Annual Leave Summary
  http.get("/api/web/payroll/annual-leave/summary", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const pId = url.searchParams.get("projectId") || url.searchParams.get("ProjectId");
    const database = readMockDatabase();
    let emps = database.annualLeaveEmployeesV3 ?? initialAnnualLeaveEmployeesV3;

    if (pId && pId !== "all") {
      emps = emps.filter((e) => String(e.employee.project?.projectId) === pId || e.employee.project?.projectCode === pId);
    }

    const officialEligible = emps.filter((e) => e.employmentType === "OFFICIAL_CONTRACT" && !e.terminationDate).length;
    const probationOrNoContract = emps.filter((e) => e.employmentType !== "OFFICIAL_CONTRACT" && !e.terminationDate).length;
    const terminated = emps.filter((e) => Boolean(e.terminationDate)).length;
    const hasAvailableLeave = emps.filter((e) => (e.availableDays ?? 0) > 0).length;
    const exhausted = emps.filter((e) => (e.availableDays ?? 0) <= 0 && e.employmentType === "OFFICIAL_CONTRACT" && !e.terminationDate).length;

    const counts = [
      { key: "ALL", count: emps.length },
      { key: "OFFICIAL_ELIGIBLE", count: officialEligible },
      { key: "PROBATION_OR_NO_CONTRACT", count: probationOrNoContract },
      { key: "TERMINATED", count: terminated },
      { key: "HAS_AVAILABLE_LEAVE", count: hasAvailableLeave },
      { key: "EXHAUSTED", count: exhausted },
    ];

    const responseData: AnnualLeaveSummaryResponse = {
      total: emps.length,
      officialEligible,
      probationOrNoContract,
      terminated,
      hasAvailableLeave,
      exhausted,
      counts,
    };

    return okV3(responseData);
  }),

  // 2. Export Excel Annual Leave
  http.get("/api/web/payroll/annual-leave/export", async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const pId = url.searchParams.get("projectId");
    const view = (url.searchParams.get("view") || "ALL").toUpperCase() as AnnualLeaveViewFilter;
    const search = (url.searchParams.get("search") || "").trim().toLowerCase();
    const year = url.searchParams.get("year") || "2026";

    const database = readMockDatabase();
    let emps = database.annualLeaveEmployeesV3 ?? initialAnnualLeaveEmployeesV3;

    if (pId && pId !== "all") {
      emps = emps.filter((e) => String(e.employee.project?.projectId) === pId || e.employee.project?.projectCode === pId);
    }

    if (view === "OFFICIAL_ELIGIBLE") {
      emps = emps.filter((e) => e.employmentType === "OFFICIAL_CONTRACT" && !e.terminationDate);
    } else if (view === "PROBATION_OR_NO_CONTRACT") {
      emps = emps.filter((e) => e.employmentType !== "OFFICIAL_CONTRACT" && !e.terminationDate);
    } else if (view === "TERMINATED") {
      emps = emps.filter((e) => Boolean(e.terminationDate));
    } else if (view === "HAS_AVAILABLE_LEAVE") {
      emps = emps.filter((e) => (e.availableDays ?? 0) > 0);
    } else if (view === "EXHAUSTED") {
      emps = emps.filter((e) => (e.availableDays ?? 0) <= 0 && e.employmentType === "OFFICIAL_CONTRACT" && !e.terminationDate);
    }

    if (search) {
      emps = emps.filter((e) =>
        e.employee.fullName.toLowerCase().includes(search) ||
        e.employee.employeeCode.toLowerCase().includes(search) ||
        (e.employee.department && e.employee.department.toLowerCase().includes(search)) ||
        (e.employee.project?.projectName && e.employee.project.projectName.toLowerCase().includes(search))
      );
    }

    // Return downloadable mock file info
    return okV3({
      fileName: `Bao_cao_phep_nam_${year}_${Date.now()}.xlsx`,
      fileUrl: `https://example.com/exports/annual-leave-${year}.xlsx`,
      totalRecords: emps.length,
      exportedAt: new Date().toISOString(),
    }, "Xuất báo cáo phép năm thành công.");
  }),

  // 3. List Annual Leave Employees
  http.get("/api/web/payroll/annual-leave/employees", async ({ request }) => {
    await delay(250);
    const url = new URL(request.url);
    const pId = url.searchParams.get("projectId") || url.searchParams.get("ProjectId");
    const view = (url.searchParams.get("view") || url.searchParams.get("View") || "ALL").toUpperCase() as AnnualLeaveViewFilter;
    const search = (url.searchParams.get("search") || url.searchParams.get("Search") || "").trim().toLowerCase();
    const page = Math.max(1, parseInt(url.searchParams.get("page") || url.searchParams.get("Page") || "1", 10));
    const pageSize = Math.max(1, parseInt(url.searchParams.get("pageSize") || url.searchParams.get("PageSize") || "10", 10));

    const database = readMockDatabase();
    let emps = database.annualLeaveEmployeesV3 ?? initialAnnualLeaveEmployeesV3;

    if (pId && pId !== "all") {
      emps = emps.filter((e) => String(e.employee.project?.projectId) === pId || e.employee.project?.projectCode === pId);
    }

    if (view === "OFFICIAL_ELIGIBLE") {
      emps = emps.filter((e) => e.employmentType === "OFFICIAL_CONTRACT" && !e.terminationDate);
    } else if (view === "PROBATION_OR_NO_CONTRACT") {
      emps = emps.filter((e) => e.employmentType !== "OFFICIAL_CONTRACT" && !e.terminationDate);
    } else if (view === "TERMINATED") {
      emps = emps.filter((e) => Boolean(e.terminationDate));
    } else if (view === "HAS_AVAILABLE_LEAVE") {
      emps = emps.filter((e) => (e.availableDays ?? 0) > 0);
    } else if (view === "EXHAUSTED") {
      emps = emps.filter((e) => (e.availableDays ?? 0) <= 0 && e.employmentType === "OFFICIAL_CONTRACT" && !e.terminationDate);
    }

    if (search) {
      emps = emps.filter((e) =>
        e.employee.fullName.toLowerCase().includes(search) ||
        e.employee.employeeCode.toLowerCase().includes(search) ||
        (e.employee.department && e.employee.department.toLowerCase().includes(search)) ||
        (e.employee.position && e.employee.position.toLowerCase().includes(search)) ||
        (e.employee.project?.projectName && e.employee.project.projectName.toLowerCase().includes(search)) ||
        (e.employee.project?.projectCode && e.employee.project.projectCode.toLowerCase().includes(search))
      );
    }

    const total = emps.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const pagedItems = emps.slice(startIndex, startIndex + pageSize);

    const responseData: AnnualLeaveListResponse = {
      items: pagedItems,
      total,
      page,
      pageSize,
      totalPages,
    };

    return okV3(responseData);
  }),

  // 4. Annual Leave History of Employee
  http.get("/api/web/payroll/annual-leave/employees/:employeeCode/history", async ({ params, request }) => {
    await delay(200);
    const code = String(params.employeeCode);
    const url = new URL(request.url);
    const yearParam = url.searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : undefined;
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const pageSize = Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10));

    const database = readMockDatabase();
    const historyMap = database.annualLeaveHistoryV3 ?? initialAnnualLeaveHistoryV3;
    let list = historyMap[code] || [];

    if (year) {
      list = list.filter((item) => item.fromDate.startsWith(String(year)));
    }

    const total = list.length;
    const startIndex = (page - 1) * pageSize;
    const paged = list.slice(startIndex, startIndex + pageSize);

    const responseData: AnnualLeaveHistoryResponse = {
      items: paged,
      total,
      page,
      pageSize,
      year,
    };

    return okV3(responseData);
  }),

  // 5. Annual Leave Detail of Employee
  http.get("/api/web/payroll/annual-leave/employees/:employeeCode", async ({ params }) => {
    await delay(150);
    const code = String(params.employeeCode);
    const database = readMockDatabase();
    const emps = database.annualLeaveEmployeesV3 ?? initialAnnualLeaveEmployeesV3;
    const emp = emps.find((e) => e.employee.employeeCode.toUpperCase() === code.toUpperCase());
    if (!emp) {
      return errorV3(404, "Không tìm thấy thông tin phép năm của nhân viên.", "EMPLOYEE_NOT_FOUND");
    }

    return okV3(emp);
  }),

  // ================= 03. Công đoàn phí (Union Dues) OpenAPI 3.0 Handlers =================
  // 1. Union Dues Summary
  http.get("/api/web/payroll/union-dues/summary", async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const pId = url.searchParams.get("projectId") || url.searchParams.get("ProjectId");
    const database = readMockDatabase();
    let members = database.unionDuesMembersV3 ?? initialUnionDuesMembersV3;

    if (pId && pId !== "all") {
      members = members.filter((m) => String(m.employee.project?.projectId) === pId || m.employee.project?.projectCode === pId);
    }

    const participatingCount = members.filter((m) => m.participating).length;
    const notParticipatingCount = members.filter((m) => !m.participating).length;
    const totalMonthlyDues = members
      .filter((m) => m.participating)
      .reduce((sum, m) => sum + (m.contributionAmount ?? 23400), 0);

    const counts = [
      { key: "ALL", count: members.length },
      { key: "PARTICIPATING", count: participatingCount },
      { key: "NOT_PARTICIPATING", count: notParticipatingCount },
    ];

    const responseData: UnionDuesSummaryResponse = {
      total: members.length,
      participatingCount,
      notParticipatingCount,
      totalMonthlyDues,
      counts,
    };

    return okV3(responseData);
  }),

  // 2. Export Excel Union Dues
  http.get("/api/web/payroll/union-dues/export", async ({ request }) => {
    await delay(250);
    const url = new URL(request.url);
    const pId = url.searchParams.get("projectId");
    const status = (url.searchParams.get("participationStatus") || "ALL").toUpperCase();
    const search = (url.searchParams.get("search") || "").trim().toLowerCase();

    const database = readMockDatabase();
    let members = database.unionDuesMembersV3 ?? initialUnionDuesMembersV3;

    if (pId && pId !== "all") {
      members = members.filter((m) => String(m.employee.project?.projectId) === pId || m.employee.project?.projectCode === pId);
    }
    if (status === "PARTICIPATING") {
      members = members.filter((m) => m.participating);
    } else if (status === "NOT_PARTICIPATING") {
      members = members.filter((m) => !m.participating);
    }
    if (search) {
      members = members.filter((m) =>
        m.employee.fullName.toLowerCase().includes(search) ||
        m.employee.employeeCode.toLowerCase().includes(search) ||
        (m.employee.department && m.employee.department.toLowerCase().includes(search))
      );
    }

    return okV3({
      fileName: `Bao_cao_cong_doan_phi_${Date.now()}.xlsx`,
      fileUrl: `https://example.com/exports/union-dues-${Date.now()}.xlsx`,
      totalRecords: members.length,
      exportedAt: new Date().toISOString(),
    }, "Xuất báo cáo công đoàn phí thành công.");
  }),

  // 3. Import Template & Import
  http.get("/api/web/payroll/union-dues/import/template", async () => {
    await delay(200);
    const fakeExcelContent = "STT,Mã nhân viên,Họ và tên,Tham gia công đoàn,Ngày bắt đầu,Mức đóng,Ghi chú\n1,NV-00124,Nguyễn Văn An,Có,2022-03-01,23400,\n";
    const blob = new Blob([fakeExcelContent], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    return new HttpResponse(blob, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Template_Import_CongDoanPhi_V3.xlsx"',
      },
    });
  }),

  http.post("/api/web/payroll/union-dues/import", async () => {
    await delay(400);
    return okV3({
      totalRows: 10,
      importedRows: 10,
      errors: [],
    }, "Import danh sách công đoàn phí thành công.");
  }),

  // 4. Audit logs
  http.get("/api/web/payroll/union-dues/audit-logs", async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const pageSize = Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10));

    const logs = [
      {
        id: 701,
        eventType: "JOINED",
        occurredAt: "2026-08-01T09:00:00Z",
        actor: { id: 12, fullName: "Trần Thu Trang", roleName: "Kế toán tiền lương" },
        employee: { employeeCode: "NV-00124", fullName: "Nguyễn Văn An" },
        description: "Gia nhập tổ chức công đoàn cơ sở",
      },
      {
        id: 702,
        eventType: "ADJUSTED",
        occurredAt: "2026-07-01T10:30:00Z",
        actor: { id: 12, fullName: "Trần Thu Trang", roleName: "Kế toán tiền lương" },
        employee: { employeeCode: "NV-00124", fullName: "Nguyễn Văn An" },
        description: "Cập nhật mức đóng đoàn phí theo quy định mới 23.400 đ/tháng",
      },
    ];

    return okV3({
      items: logs,
      total: logs.length,
      page,
      pageSize,
    });
  }),

  // 5. List Union Dues Members
  http.get("/api/web/payroll/union-dues/members", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const pId = url.searchParams.get("projectId") || url.searchParams.get("ProjectId");
    const status = (url.searchParams.get("participationStatus") || url.searchParams.get("status") || "ALL").toUpperCase();
    const search = (url.searchParams.get("search") || "").trim().toLowerCase();
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const pageSize = Math.max(1, parseInt(url.searchParams.get("pageSize") || "10", 10));

    const database = readMockDatabase();
    let members = database.unionDuesMembersV3 ?? initialUnionDuesMembersV3;

    if (pId && pId !== "all") {
      members = members.filter((m) => String(m.employee.project?.projectId) === pId || m.employee.project?.projectCode === pId);
    }
    if (status === "PARTICIPATING") {
      members = members.filter((m) => m.participating);
    } else if (status === "NOT_PARTICIPATING") {
      members = members.filter((m) => !m.participating);
    }
    if (search) {
      members = members.filter((m) =>
        m.employee.fullName.toLowerCase().includes(search) ||
        m.employee.employeeCode.toLowerCase().includes(search) ||
        (m.employee.department && m.employee.department.toLowerCase().includes(search)) ||
        (m.employee.position && m.employee.position.toLowerCase().includes(search)) ||
        (m.employee.project?.projectName && m.employee.project.projectName.toLowerCase().includes(search))
      );
    }

    const total = members.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const pagedItems = members.slice(startIndex, startIndex + pageSize);

    const responseData: UnionDuesListResponse = {
      items: pagedItems,
      total,
      page,
      pageSize,
      totalPages,
    };

    return okV3(responseData);
  }),

  // 6. Union Dues History of Member
  http.get("/api/web/payroll/union-dues/members/:employeeCode/history", async ({ params, request }) => {
    await delay(150);
    const code = String(params.employeeCode);
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const pageSize = Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10));

    const database = readMockDatabase();
    const historyMap = database.unionDuesHistoryV3 ?? initialUnionDuesHistoryV3;
    const list = historyMap[code] || [];

    const total = list.length;
    const startIndex = (page - 1) * pageSize;
    const paged = list.slice(startIndex, startIndex + pageSize);

    const responseData: UnionDuesHistoryResponse = {
      items: paged,
      total,
      page,
      pageSize,
    };

    return okV3(responseData);
  }),

  // 7. Member Detail
  http.get("/api/web/payroll/union-dues/members/:employeeCode", async ({ params }) => {
    await delay(100);
    const code = String(params.employeeCode);
    const database = readMockDatabase();
    const members = database.unionDuesMembersV3 ?? initialUnionDuesMembersV3;
    const member = members.find((m) => m.employee.employeeCode.toUpperCase() === code.toUpperCase());

    if (!member) {
      return errorV3(404, "Không tìm thấy thông tin đoàn viên công đoàn.", "MEMBER_NOT_FOUND");
    }

    return okV3({ data: member });
  }),

  // 8. Update Union Dues Member
  http.patch("/api/web/payroll/union-dues/members/:employeeCode", async ({ params, request }) => {
    await delay(200);
    const code = String(params.employeeCode);
    const payload = (await request.json()) as UpdateUnionDuesRequestV3;
    const database = readMockDatabase();
    const members = database.unionDuesMembersV3 ?? initialUnionDuesMembersV3;
    const index = members.findIndex((m) => m.employee.employeeCode.toUpperCase() === code.toUpperCase());

    if (index === -1) {
      return errorV3(404, "Không tìm thấy thông tin đoàn viên công đoàn.", "MEMBER_NOT_FOUND");
    }

    const current = members[index];
    const updated: UnionDuesMemberV3 = {
      ...current,
      participating: payload.participating !== undefined ? payload.participating : current.participating,
      joinDate: payload.joinDate || (payload.participating ? payload.effectiveDate || current.joinDate || new Date().toISOString().slice(0, 10) : current.joinDate),
      leaveDate: payload.participating === false ? payload.effectiveDate || new Date().toISOString().slice(0, 10) : null,
      contributionAmount: payload.contributionAmount !== undefined ? payload.contributionAmount : current.contributionAmount,
      note: payload.note !== undefined ? payload.note : current.note,
      updatedAt: new Date().toISOString(),
    };

    const newHistoryItem: UnionDuesHistoryItemV3 = {
      id: Date.now(),
      occurredAt: new Date().toISOString(),
      eventType: payload.participating !== undefined ? (payload.participating ? "JOINED" : "LEFT") : "ADJUSTED",
      contributionAmount: updated.contributionAmount,
      performedBy: { id: 12, fullName: "Trần Thu Trang", roleName: "Kế toán tiền lương" },
      note: payload.reason || payload.note || "Cập nhật thông tin đoàn phí công đoàn",
    };

    mutateMockDatabase((db) => {
      const list = [...(db.unionDuesMembersV3 ?? initialUnionDuesMembersV3)];
      list[index] = updated;
      db.unionDuesMembersV3 = list;

      const historyMap = { ...(db.unionDuesHistoryV3 ?? initialUnionDuesHistoryV3) };
      historyMap[code] = [newHistoryItem, ...(historyMap[code] || [])];
      db.unionDuesHistoryV3 = historyMap;
    });

    return okV3({ data: updated }, "Cập nhật trạng thái công đoàn phí thành công.");
  }),

  http.put("/api/web/payroll/union-dues/members/:employeeCode", async ({ params, request }) => {
    await delay(200);
    const code = String(params.employeeCode);
    const payload = (await request.json()) as UpdateUnionDuesRequestV3;
    const database = readMockDatabase();
    const members = database.unionDuesMembersV3 ?? initialUnionDuesMembersV3;
    const index = members.findIndex((m) => m.employee.employeeCode.toUpperCase() === code.toUpperCase());

    if (index === -1) {
      return errorV3(404, "Không tìm thấy thông tin đoàn viên công đoàn.", "MEMBER_NOT_FOUND");
    }

    const current = members[index];
    const updated: UnionDuesMemberV3 = {
      ...current,
      participating: payload.participating !== undefined ? payload.participating : current.participating,
      joinDate: payload.joinDate || (payload.participating ? payload.effectiveDate || current.joinDate || new Date().toISOString().slice(0, 10) : current.joinDate),
      leaveDate: payload.participating === false ? payload.effectiveDate || new Date().toISOString().slice(0, 10) : null,
      contributionAmount: payload.contributionAmount !== undefined ? payload.contributionAmount : current.contributionAmount,
      note: payload.note !== undefined ? payload.note : current.note,
      updatedAt: new Date().toISOString(),
    };

    mutateMockDatabase((db) => {
      const list = [...(db.unionDuesMembersV3 ?? initialUnionDuesMembersV3)];
      list[index] = updated;
      db.unionDuesMembersV3 = list;
    });

    return okV3({ data: updated }, "Cập nhật trạng thái công đoàn phí thành công.");
  }),

  // ================= 04. NGÀY CÔNG CHUẨN (STANDARD WORKDAYS) =================
  http.get("/api/web/payroll/standard-workdays/summary", async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const database = readMockDatabase();
    let list = database.standardWorkdaysV3 ?? initialStandardWorkdaysV3;
    if (projectId) {
      list = list.filter((item) => String(item.employee.project?.projectId) === String(projectId));
    }
    const total = list.length;
    const projectDefaultCount = list.filter((i) => i.mode === "PROJECT_DEFAULT").length;
    const customCount = list.filter((i) => i.mode === "CUSTOM").length;

    const summary: StandardWorkdaySummaryResponse = {
      total,
      projectDefaultCount,
      customCount,
      projectStandardDays: 26,
      counts: [
        { status: "ALL", count: total, label: "Tất cả" },
        { status: "PROJECT_DEFAULT", count: projectDefaultCount, label: "Mặc định dự án" },
        { status: "CUSTOM", count: customCount, label: "Tùy chỉnh riêng" },
      ],
    };
    return okV3(summary, "Lấy thông tin tổng quan ngày công chuẩn thành công.");
  }),

  http.get("/api/web/payroll/standard-workdays/project-default", async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId") || "1017";
    return okV3({
      projectId: Number(projectId),
      defaultStandardDays: 26,
      note: "Quy định ngày công chuẩn mặc định cho toàn dự án là 26 ngày/tháng",
    }, "Lấy thông tin ngày công chuẩn mặc định dự án thành công.");
  }),

  http.get("/api/web/payroll/standard-workdays/export", async () => {
    await delay(200);
    return okV3({
      fileUrl: "https://example.com/exports/standard-workdays-2026-08.xlsx",
      fileName: "Danh_sach_ngay_cong_chuan_2026_08.xlsx",
      totalRecords: 5,
    }, "Xuất dữ liệu ngày công chuẩn thành công.");
  }),

  http.get("/api/web/payroll/standard-workdays/import/template", async () => {
    await delay(100);
    return okV3({
      templateUrl: "https://example.com/templates/mau_import_ngay_cong_chuan.xlsx",
      fileName: "Mau_Import_Ngay_Cong_Chuan.xlsx",
    }, "Tải mẫu import ngày công chuẩn thành công.");
  }),

  http.post("/api/web/payroll/standard-workdays/import", async () => {
    await delay(300);
    return okV3({
      totalRows: 5,
      successRows: 5,
      errorRows: 0,
      errors: [],
    }, "Import danh sách ngày công chuẩn thành công.");
  }),

  http.get("/api/web/payroll/standard-workdays/audit-logs", async () => {
    await delay(100);
    return okV3({
      items: [
        {
          id: "log-std-1",
          action: "UPDATE",
          entityType: "STANDARD_WORKDAY",
          employeeCode: "NV-00125",
          employeeName: "Trần Thị Mai",
          oldValue: "26 ngày",
          newValue: "24 ngày",
          reason: "Công việc tổ trưởng văn phòng chốt công 24 ngày/tháng",
          performedBy: { id: 1, fullName: "Trần Minh Anh", roleName: "Quản lý dự án" },
          createdAt: "2026-08-02T10:00:00Z",
        }
      ],
      total: 1,
    }, "Lấy lịch sử thao tác ngày công chuẩn thành công.");
  }),

  http.get("/api/web/payroll/standard-workdays/employees", async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const search = url.searchParams.get("search")?.toLowerCase().trim();
    const mode = (url.searchParams.get("mode") || "ALL").toUpperCase();
    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "10");

    const database = readMockDatabase();
    let list = database.standardWorkdaysV3 ?? initialStandardWorkdaysV3;

    if (projectId) {
      list = list.filter((item) => String(item.employee.project?.projectId) === String(projectId));
    }
    if (mode === "CUSTOM") {
      list = list.filter((item) => item.mode === "CUSTOM");
    } else if (mode === "PROJECT_DEFAULT") {
      list = list.filter((item) => item.mode === "PROJECT_DEFAULT");
    }
    if (search) {
      list = list.filter(
        (item) =>
          item.employee.fullName.toLowerCase().includes(search) ||
          item.employee.employeeCode.toLowerCase().includes(search) ||
          item.employee.department?.toLowerCase().includes(search) ||
          item.employee.position?.toLowerCase().includes(search)
      );
    }

    const total = list.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const items = list.slice(startIndex, startIndex + pageSize);

    const response: StandardWorkdayListResponse = {
      items,
      total,
      page,
      pageSize,
      totalPages,
      counts: {
        all: total,
        custom: list.filter((i) => i.mode === "CUSTOM").length,
        projectDefault: list.filter((i) => i.mode === "PROJECT_DEFAULT").length,
      },
    };
    return okV3(response, "Lấy danh sách ngày công chuẩn nhân viên thành công.");
  }),

  http.get("/api/web/payroll/standard-workdays/employees/:employeeCode/history", async ({ params }) => {
    await delay(100);
    const code = String(params.employeeCode);
    return okV3({
      employeeCode: code,
      history: [
        {
          id: 1,
          appliedStandardDays: 24,
          projectStandardDays: 26,
          mode: "CUSTOM",
          reason: "Điều chỉnh ngày công theo phân công công việc",
          updatedBy: { fullName: "Trần Minh Anh" },
          updatedAt: "2026-08-02T10:00:00Z",
        },
      ],
    }, "Lấy lịch sử điều chỉnh ngày công chuẩn thành công.");
  }),

  http.post("/api/web/payroll/standard-workdays/employees/:employeeCode/restore-project-default", async ({ params }) => {
    await delay(200);
    const code = String(params.employeeCode);
    const database = readMockDatabase();
    const list = database.standardWorkdaysV3 ?? initialStandardWorkdaysV3;
    const index = list.findIndex((item) => item.employee.employeeCode.toUpperCase() === code.toUpperCase());
    if (index === -1) {
      return errorV3(404, "Không tìm thấy nhân viên.", "EMPLOYEE_NOT_FOUND");
    }
    const current = list[index];
    const updated: StandardWorkdayEmployeeV3 = {
      ...current,
      appliedStandardDays: current.projectStandardDays,
      mode: "PROJECT_DEFAULT",
      adjustmentReason: null,
      updatedBy: { fullName: "Quản trị viên" },
      updatedAt: new Date().toISOString(),
    };
    mutateMockDatabase((db) => {
      const copy = [...(db.standardWorkdaysV3 ?? initialStandardWorkdaysV3)];
      copy[index] = updated;
      db.standardWorkdaysV3 = copy;
    });
    return okV3(updated, "Khôi phục ngày công chuẩn mặc định dự án thành công.");
  }),

  http.get("/api/web/payroll/standard-workdays/employees/:employeeCode", async ({ params }) => {
    await delay(100);
    const code = String(params.employeeCode);
    const database = readMockDatabase();
    const list = database.standardWorkdaysV3 ?? initialStandardWorkdaysV3;
    const item = list.find((i) => i.employee.employeeCode.toUpperCase() === code.toUpperCase());
    if (!item) {
      return errorV3(404, "Không tìm thấy nhân viên.", "EMPLOYEE_NOT_FOUND");
    }
    return okV3(item, "Lấy thông tin ngày công chuẩn nhân viên thành công.");
  }),

  http.put("/api/web/payroll/standard-workdays/employees/:employeeCode", async ({ params, request }) => {
    await delay(200);
    const code = String(params.employeeCode);
    const payload = (await request.json()) as UpdateStandardWorkdayRequestV3;
    const database = readMockDatabase();
    const list = database.standardWorkdaysV3 ?? initialStandardWorkdaysV3;
    const index = list.findIndex((item) => item.employee.employeeCode.toUpperCase() === code.toUpperCase());
    if (index === -1) {
      return errorV3(404, "Không tìm thấy nhân viên.", "EMPLOYEE_NOT_FOUND");
    }
    const current = list[index];
    const updated: StandardWorkdayEmployeeV3 = {
      ...current,
      appliedStandardDays: Number(payload.standardDays),
      mode: "CUSTOM",
      adjustmentReason: payload.reason,
      updatedBy: { fullName: "Quản trị viên" },
      updatedAt: new Date().toISOString(),
    };
    mutateMockDatabase((db) => {
      const copy = [...(db.standardWorkdaysV3 ?? initialStandardWorkdaysV3)];
      copy[index] = updated;
      db.standardWorkdaysV3 = copy;
    });
    return okV3(updated, "Cập nhật ngày công chuẩn nhân viên thành công.");
  }),

  // ================= 05. BẢO HIỂM XÃ HỘI (SOCIAL INSURANCE D02-LT) =================
  http.get("/api/web/payroll/social-insurance/summary", async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const database = readMockDatabase();
    let members = database.socialInsuranceMembersV3 ?? initialSocialInsuranceMembersV3;
    let changes = database.socialInsuranceChangesV3 ?? initialSocialInsuranceChangesV3;
    if (projectId) {
      members = members.filter((m) => String(m.employee.project?.projectId) === String(projectId));
      changes = changes.filter((c) => String(c.employee.project?.projectId) === String(projectId));
    }
    const total = members.length;
    const activeCount = members.filter((m) => m.status === "ACTIVE").length;
    const suspendedCount = members.filter((m) => m.status === "SUSPENDED").length;
    const stoppedCount = members.filter((m) => m.status === "STOPPED").length;
    const totalMonthlyContribution = members.reduce((sum, m) => sum + (m.status === "ACTIVE" ? m.totalContribution : 0), 0);
    const pendingChangesCount = changes.filter((c) => c.status === "SUBMITTED" || c.status === "DRAFT").length;

    const summary: SocialInsuranceSummaryResponse = {
      total,
      activeCount,
      suspendedCount,
      stoppedCount,
      totalMonthlyContribution,
      pendingChangesCount,
      counts: [
        { status: "ALL", count: total, label: "Tất cả" },
        { status: "ACTIVE", count: activeCount, label: "Đang tham gia" },
        { status: "SUSPENDED", count: suspendedCount, label: "Tạm hoãn" },
        { status: "STOPPED", count: stoppedCount, label: "Đã báo giảm" },
      ],
    };
    return okV3(summary, "Lấy tổng quan bảo hiểm xã hội thành công.");
  }),

  http.get("/api/web/payroll/social-insurance/export", async () => {
    await delay(200);
    return okV3({
      fileUrl: "https://example.com/exports/social-insurance-d02-2026-08.xlsx",
      fileName: "Mau_D02_LT_Bao_Hiem_Xa_Hoi_2026_08.xlsx",
      totalRecords: 4,
    }, "Xuất dữ liệu mẫu D02-LT bảo hiểm xã hội thành công.");
  }),

  http.get("/api/web/payroll/social-insurance/import/template", async () => {
    await delay(100);
    return okV3({
      templateUrl: "https://example.com/templates/mau_import_bhxh.xlsx",
      fileName: "Mau_Import_BHXH.xlsx",
    }, "Tải mẫu import BHXH thành công.");
  }),

  http.post("/api/web/payroll/social-insurance/import", async () => {
    await delay(300);
    return okV3({
      totalRows: 4,
      successRows: 4,
      errorRows: 0,
      errors: [],
    }, "Import danh sách BHXH thành công.");
  }),

  http.get("/api/web/payroll/social-insurance/audit-logs", async () => {
    await delay(100);
    return okV3({
      items: [
        {
          id: "log-bhxh-1",
          action: "APPROVE",
          entityType: "SOCIAL_INSURANCE_CHANGE",
          employeeCode: "NV-00124",
          employeeName: "Nguyễn Văn An",
          oldValue: "6,000,000 đ",
          newValue: "6,300,000 đ",
          reason: "Tăng lương đóng BHXH theo phụ lục hợp đồng",
          performedBy: { fullName: "Trần Thu Trang" },
          createdAt: "2026-08-05T14:30:00Z",
        }
      ],
      total: 1,
    }, "Lấy nhật ký thao tác BHXH thành công.");
  }),

  http.get("/api/web/payroll/social-insurance/members", async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const search = url.searchParams.get("search")?.toLowerCase().trim();
    const status = (url.searchParams.get("status") || "ALL").toUpperCase();
    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "10");

    const database = readMockDatabase();
    let list = database.socialInsuranceMembersV3 ?? initialSocialInsuranceMembersV3;

    if (projectId) {
      list = list.filter((m) => String(m.employee.project?.projectId) === String(projectId));
    }
    if (status !== "ALL") {
      list = list.filter((m) => m.status === status);
    }
    if (search) {
      list = list.filter(
        (m) =>
          m.employee.fullName.toLowerCase().includes(search) ||
          m.employee.employeeCode.toLowerCase().includes(search) ||
          (m.insuranceBookNumber || m.socialInsuranceNumber || "").includes(search) ||
          m.employee.department?.toLowerCase().includes(search)
      );
    }

    const total = list.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const items = list.slice(startIndex, startIndex + pageSize);

    const response: SocialInsuranceMemberListResponse = {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
    return okV3(response, "Lấy danh sách thành viên BHXH thành công.");
  }),

  http.get("/api/web/payroll/social-insurance/members/:employeeCode/history", async ({ params }) => {
    await delay(100);
    const code = String(params.employeeCode);
    return okV3({
      employeeCode: code,
      history: [
        {
          id: 1,
          changeType: "ADJUST_SALARY",
          effectiveMonth: "2026-08",
          oldSalary: 6000000,
          newSalary: 6300000,
          status: "APPROVED",
          reconciliationCode: "BHXH-7901-202608-0054",
          approvedAt: "2026-08-05T14:30:00Z",
        },
      ],
    }, "Lấy lịch sử biến động BHXH của nhân viên thành công.");
  }),

  http.get("/api/web/payroll/social-insurance/members/:employeeCode", async ({ params }) => {
    await delay(100);
    const code = String(params.employeeCode);
    const database = readMockDatabase();
    const list = database.socialInsuranceMembersV3 ?? initialSocialInsuranceMembersV3;
    const member = list.find((m) => m.employee.employeeCode.toUpperCase() === code.toUpperCase());
    if (!member) {
      return errorV3(404, "Không tìm thấy thông tin BHXH của nhân viên.", "MEMBER_NOT_FOUND");
    }
    return okV3(member, "Lấy thông tin chi tiết BHXH nhân viên thành công.");
  }),

  http.get("/api/web/payroll/social-insurance/changes", async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const search = url.searchParams.get("search")?.toLowerCase().trim();
    const changeType = url.searchParams.get("changeType");
    const status = url.searchParams.get("status");
    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "10");

    const database = readMockDatabase();
    let list = database.socialInsuranceChangesV3 ?? initialSocialInsuranceChangesV3;

    if (projectId) {
      list = list.filter((c) => String(c.employee.project?.projectId) === String(projectId));
    }
    if (changeType && changeType !== "ALL") {
      list = list.filter((c) => c.changeType === changeType);
    }
    if (status && status !== "ALL") {
      list = list.filter((c) => c.status === status);
    }
    if (search) {
      list = list.filter(
        (c) =>
          c.employee.fullName.toLowerCase().includes(search) ||
          c.employee.employeeCode.toLowerCase().includes(search) ||
          (c.reason || "").toLowerCase().includes(search) ||
          c.reconciliationCode?.toLowerCase().includes(search)
      );
    }

    const total = list.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const items = list.slice(startIndex, startIndex + pageSize);

    const response: SocialInsuranceChangeListResponse = {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
    return okV3(response, "Lấy danh sách biến động BHXH thành công.");
  }),

  http.post("/api/web/payroll/social-insurance/changes", async ({ request }) => {
    await delay(200);
    const payload = (await request.json()) as any;
    const database = readMockDatabase();
    const employees = database.employees;
    const emp = employees.find((e) => e.code.toUpperCase() === payload.employeeCode?.toUpperCase());
    const empSummary = emp ? {
      employeeCode: emp.code,
      fullName: emp.name,
      project: { projectId: Number(emp.projectId || 1017), projectCode: emp.projectCode || "JSS-ST", projectName: "Jabil Smart Solutions" },
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      position: emp.position,
      status: (emp.status === "active" ? "ACTIVE" : emp.status === "resigned" ? "TERMINATED" : "PROBATION") as any,
    } : {
      employeeCode: payload.employeeCode || "NV-00124",
      fullName: "Nguyễn Văn An",
      project: { projectId: 1017, projectCode: "JSS-ST", projectName: "Jabil Smart Solutions" },
      email: "an.nguyen@greenspeed.vn",
      phone: "0912 345 001",
      department: "Khối Sản xuất",
      position: "Công nhân bậc 3",
      status: "ACTIVE",
    };

    const newChange: SocialInsuranceChangeV3 = {
      id: Date.now(),
      employee: empSummary,
      changeType: payload.changeType || "INCREASE",
      effectiveMonth: payload.effectiveMonth || new Date().toISOString().slice(0, 7),
      oldSalary: payload.oldSalary !== undefined ? Number(payload.oldSalary) : null,
      newSalary: payload.newSalary !== undefined ? Number(payload.newSalary) : 6300000,
      status: "SUBMITTED",
      reason: payload.reason || "Kê khai biến động bảo hiểm",
      documents: payload.documents || [],
      createdAt: new Date().toISOString(),
    };

    mutateMockDatabase((db) => {
      const copy = [...(db.socialInsuranceChangesV3 ?? initialSocialInsuranceChangesV3)];
      copy.unshift(newChange);
      db.socialInsuranceChangesV3 = copy;
    });

    return okV3(newChange, "Tạo hồ sơ biến động BHXH thành công.");
  }),

  http.get("/api/web/payroll/social-insurance/changes/:changeId", async ({ params }) => {
    await delay(100);
    const id = Number(params.changeId);
    const database = readMockDatabase();
    const list = database.socialInsuranceChangesV3 ?? initialSocialInsuranceChangesV3;
    const item = list.find((c) => c.id === id);
    if (!item) {
      return errorV3(404, "Không tìm thấy hồ sơ biến động BHXH.", "CHANGE_NOT_FOUND");
    }
    return okV3(item, "Lấy thông tin biến động BHXH thành công.");
  }),

  http.put("/api/web/payroll/social-insurance/changes/:changeId", async ({ params, request }) => {
    await delay(200);
    const id = Number(params.changeId);
    const payload = (await request.json()) as any;
    const database = readMockDatabase();
    const list = database.socialInsuranceChangesV3 ?? initialSocialInsuranceChangesV3;
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) {
      return errorV3(404, "Không tìm thấy hồ sơ biến động BHXH.", "CHANGE_NOT_FOUND");
    }
    const current = list[index];
    const updated: SocialInsuranceChangeV3 = {
      ...current,
      ...payload,
      id: current.id,
      employee: current.employee,
    };
    mutateMockDatabase((db) => {
      const copy = [...(db.socialInsuranceChangesV3 ?? initialSocialInsuranceChangesV3)];
      copy[index] = updated;
      db.socialInsuranceChangesV3 = copy;
    });
    return okV3(updated, "Cập nhật hồ sơ biến động BHXH thành công.");
  }),

  http.delete("/api/web/payroll/social-insurance/changes/:changeId", async ({ params }) => {
    await delay(150);
    const id = Number(params.changeId);
    mutateMockDatabase((db) => {
      const copy = (db.socialInsuranceChangesV3 ?? initialSocialInsuranceChangesV3).filter((c) => c.id !== id);
      db.socialInsuranceChangesV3 = copy;
    });
    return okV3({ id }, "Xóa hồ sơ biến động BHXH thành công.");
  }),

  http.post("/api/web/payroll/social-insurance/changes/:changeId/confirm-reconciliation", async ({ params, request }) => {
    await delay(200);
    const id = Number(params.changeId);
    const payload = (await request.json()) as any;
    const database = readMockDatabase();
    const list = database.socialInsuranceChangesV3 ?? initialSocialInsuranceChangesV3;
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) {
      return errorV3(404, "Không tìm thấy hồ sơ biến động.", "CHANGE_NOT_FOUND");
    }
    const current = list[index];
    const updated: SocialInsuranceChangeV3 = {
      ...current,
      status: "RECONCILED",
      reconciliationCode: payload.reconciliationCode || `BHXH-REC-${id}`,
    };
    mutateMockDatabase((db) => {
      const copy = [...(db.socialInsuranceChangesV3 ?? initialSocialInsuranceChangesV3)];
      copy[index] = updated;
      db.socialInsuranceChangesV3 = copy;
    });
    return okV3(updated, "Xác nhận đối soát mã BHXH thành công.");
  }),

  http.post("/api/web/payroll/social-insurance/changes/:changeId/approve", async ({ params }) => {
    await delay(200);
    const id = Number(params.changeId);
    const database = readMockDatabase();
    const list = database.socialInsuranceChangesV3 ?? initialSocialInsuranceChangesV3;
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) {
      return errorV3(404, "Không tìm thấy hồ sơ biến động.", "CHANGE_NOT_FOUND");
    }
    const current = list[index];
    const updated: SocialInsuranceChangeV3 = {
      ...current,
      status: "APPROVED",
      approvedAt: new Date().toISOString(),
    };
    mutateMockDatabase((db) => {
      const copy = [...(db.socialInsuranceChangesV3 ?? initialSocialInsuranceChangesV3)];
      copy[index] = updated;
      db.socialInsuranceChangesV3 = copy;

      // Also reflect in member list
      const members = [...(db.socialInsuranceMembersV3 ?? initialSocialInsuranceMembersV3)];
      const mIdx = members.findIndex((m) => m.employee.employeeCode.toUpperCase() === current.employee.employeeCode.toUpperCase());
      if (mIdx !== -1) {
        const m = members[mIdx];
        const newSal = current.newSalary || current.newBaseSalary || m.contributionSalary || m.insuranceSalary || 0;
        members[mIdx] = {
          ...m,
          contributionSalary: newSal,
          insuranceSalary: newSal,
          employeeContribution: Math.round(newSal * 0.105),
          employerContribution: Math.round(newSal * 0.215),
          totalContribution: Math.round(newSal * 0.32),
          status: current.changeType === "DECREASE" || current.changeType === "GIAM_HAN" ? "STOPPED" : "ACTIVE",
          effectiveMonth: current.effectiveMonth || (current.effectiveFrom ? String(current.effectiveFrom).slice(0, 7) : ""),
        };
        db.socialInsuranceMembersV3 = members;
      }
    });
    return okV3(updated, "Phê duyệt biến động BHXH thành công.");
  }),

  http.post("/api/web/payroll/social-insurance/changes/:changeId/reject", async ({ params, request }) => {
    await delay(200);
    const id = Number(params.changeId);
    const payload = (await request.json()) as any;
    const database = readMockDatabase();
    const list = database.socialInsuranceChangesV3 ?? initialSocialInsuranceChangesV3;
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) {
      return errorV3(404, "Không tìm thấy hồ sơ biến động.", "CHANGE_NOT_FOUND");
    }
    const current = list[index];
    const updated: SocialInsuranceChangeV3 = {
      ...current,
      status: "REJECTED",
      reason: payload.reason ? `${current.reason} (Từ chối: ${payload.reason})` : current.reason,
    };
    mutateMockDatabase((db) => {
      const copy = [...(db.socialInsuranceChangesV3 ?? initialSocialInsuranceChangesV3)];
      copy[index] = updated;
      db.socialInsuranceChangesV3 = copy;
    });
    return okV3(updated, "Từ chối hồ sơ biến động BHXH thành công.");
  }),

  http.get("/api/web/payroll/social-insurance/changes/:changeId/documents", async ({ params }) => {
    await delay(100);
    const id = Number(params.changeId);
    const database = readMockDatabase();
    const list = database.socialInsuranceChangesV3 ?? initialSocialInsuranceChangesV3;
    const item = list.find((c) => c.id === id);
    return okV3(item?.documents || [], "Lấy danh sách hồ sơ đính kèm thành công.");
  }),

  http.post("/api/web/payroll/social-insurance/changes/:changeId/documents", async ({ params }) => {
    await delay(200);
    const id = Number(params.changeId);
    const newDoc = {
      id: String(Date.now()),
      documentTypeId: 1,
      documentTypeName: "Hợp đồng lao động / Quyết định",
      fileName: `Chung_tu_BHXH_${id}.pdf`,
      fileUrl: `https://example.com/docs/bhxh-${id}.pdf`,
      fileSize: 450000,
      mimeType: "application/pdf",
      uploadedAt: new Date().toISOString(),
    };
    return okV3(newDoc, "Tải lên hồ sơ đính kèm thành công.");
  }),

  http.delete("/api/web/payroll/social-insurance/changes/:changeId/documents/:documentId", async () => {
    await delay(100);
    return okV3({ success: true }, "Xóa tài liệu đính kèm thành công.");
  }),

  // ================= 06. CHẾ ĐỘ PHỤ CẤP (BENEFITS & ALLOWANCES) =================
  http.get("/api/web/payroll/benefits-allowances/summary", async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const database = readMockDatabase();
    let list = database.benefitsAllowanceEmployeesV3 ?? initialBenefitsAllowanceEmployeesV3;
    if (projectId) {
      list = list.filter((item) => String(item.employee.project?.projectId) === String(projectId));
    }
    const total = list.length;
    const projectDefaultCount = list.filter((i) => i.mode === "PROJECT_DEFAULT").length;
    const customCount = list.filter((i) => i.mode === "CUSTOM").length;
    const totalMonthlyAllowanceAmount = list.reduce((sum, item) => sum + item.totalMonthlyAllowance, 0);

    const summary: BenefitsAllowanceSummaryResponse = {
      total,
      projectDefaultCount,
      customCount,
      totalMonthlyAllowanceAmount,
      counts: [
        { status: "ALL", count: total, label: "Tất cả" },
        { status: "PROJECT_DEFAULT", count: projectDefaultCount, label: "Mặc định dự án" },
        { status: "CUSTOM", count: customCount, label: "Tùy chỉnh riêng" },
      ],
    };
    return okV3(summary, "Lấy tổng quan chế độ phụ cấp thành công.");
  }),

  http.get("/api/web/payroll/master-data/allowance-types", async () => {
    await delay(100);
    return okV3([
      { code: "MEAL", name: "Phụ cấp ăn trưa", defaultAmount: 730000, unit: "VNĐ/tháng" },
      { code: "PETROL", name: "Phụ cấp xăng xe", defaultAmount: 500000, unit: "VNĐ/tháng" },
      { code: "PHONE", name: "Phụ cấp điện thoại", defaultAmount: 300000, unit: "VNĐ/tháng" },
      { code: "RESPONSIBILITY", name: "Phụ cấp trách nhiệm", defaultAmount: 1500000, unit: "VNĐ/tháng" },
      { code: "ATTENDANCE", name: "Phụ cấp chuyên cần", defaultAmount: 400000, unit: "VNĐ/tháng" },
    ], "Lấy danh mục các loại phụ cấp thành công.");
  }),

  http.get("/api/web/payroll/benefits-allowances/project-defaults", async () => {
    await delay(100);
    return okV3([
      { policyId: "pol-meal", policyCode: "MEAL", policyName: "Phụ cấp ăn trưa", amount: 730000, unit: "VNĐ/tháng" },
      { policyId: "pol-petrol", policyCode: "PETROL", policyName: "Phụ cấp xăng xe", amount: 500000, unit: "VNĐ/tháng" },
    ], "Lấy phụ cấp mặc định dự án thành công.");
  }),

  http.get("/api/web/payroll/benefits-allowances/export", async () => {
    await delay(200);
    return okV3({
      fileUrl: "https://example.com/exports/benefits-allowances-2026-08.xlsx",
      fileName: "Danh_sach_phu_cap_nhan_vien_2026_08.xlsx",
      totalRecords: 2,
    }, "Xuất dữ liệu phụ cấp thành công.");
  }),

  http.get("/api/web/payroll/benefits-allowances/import/template", async () => {
    await delay(100);
    return okV3({
      templateUrl: "https://example.com/templates/mau_import_phu_cap.xlsx",
      fileName: "Mau_Import_Phu_Cap.xlsx",
    }, "Tải mẫu import phụ cấp thành công.");
  }),

  http.post("/api/web/payroll/benefits-allowances/import", async () => {
    await delay(300);
    return okV3({
      totalRows: 2,
      successRows: 2,
      errorRows: 0,
      errors: [],
    }, "Import danh sách phụ cấp thành công.");
  }),

  http.get("/api/web/payroll/benefits-allowances/audit-logs", async () => {
    await delay(100);
    return okV3({
      items: [
        {
          id: "log-allw-1",
          action: "UPDATE",
          entityType: "BENEFITS_ALLOWANCE",
          employeeCode: "NV-00125",
          employeeName: "Trần Thị Mai",
          oldValue: "730,000 đ",
          newValue: "2,230,000 đ",
          reason: "Bổ sung phụ cấp trách nhiệm tổ trưởng",
          performedBy: { fullName: "Trần Minh Anh" },
          createdAt: "2026-08-02T10:00:00Z",
        }
      ],
      total: 1,
    }, "Lấy lịch sử thay đổi phụ cấp thành công.");
  }),

  http.get("/api/web/payroll/benefits-allowances/employees", async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const search = url.searchParams.get("search")?.toLowerCase().trim();
    const mode = (url.searchParams.get("mode") || "ALL").toUpperCase();
    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "10");

    const database = readMockDatabase();
    let list = database.benefitsAllowanceEmployeesV3 ?? initialBenefitsAllowanceEmployeesV3;

    if (projectId) {
      list = list.filter((item) => String(item.employee.project?.projectId) === String(projectId));
    }
    if (mode === "CUSTOM") {
      list = list.filter((item) => item.mode === "CUSTOM");
    } else if (mode === "PROJECT_DEFAULT") {
      list = list.filter((item) => item.mode === "PROJECT_DEFAULT");
    }
    if (search) {
      list = list.filter(
        (item) =>
          item.employee.fullName.toLowerCase().includes(search) ||
          item.employee.employeeCode.toLowerCase().includes(search) ||
          item.employee.department?.toLowerCase().includes(search) ||
          item.employee.position?.toLowerCase().includes(search)
      );
    }

    const total = list.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const items = list.slice(startIndex, startIndex + pageSize);

    const response: BenefitsAllowanceListResponse = {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
    return okV3(response, "Lấy danh sách phụ cấp nhân viên thành công.");
  }),

  http.get("/api/web/payroll/benefits-allowances/employees/:employeeCode/history", async ({ params }) => {
    await delay(100);
    const code = String(params.employeeCode);
    return okV3({
      employeeCode: code,
      history: [
        {
          id: 1,
          mode: "CUSTOM",
          totalMonthlyAllowance: 2230000,
          reason: "Bổ sung phụ cấp trách nhiệm tổ trưởng",
          updatedAt: "2026-08-02T10:00:00Z",
        }
      ],
    }, "Lấy lịch sử điều chỉnh phụ cấp thành công.");
  }),

  http.post("/api/web/payroll/benefits-allowances/employees/:employeeCode/restore-project-default", async ({ params }) => {
    await delay(200);
    const code = String(params.employeeCode);
    const database = readMockDatabase();
    const list = database.benefitsAllowanceEmployeesV3 ?? initialBenefitsAllowanceEmployeesV3;
    const index = list.findIndex((item) => item.employee.employeeCode.toUpperCase() === code.toUpperCase());
    if (index === -1) {
      return errorV3(404, "Không tìm thấy nhân viên.", "EMPLOYEE_NOT_FOUND");
    }
    const current = list[index];
    const defaultAllowances: EmployeeAllowanceItemV3[] = [
      { policyId: "pol-meal", policyCode: "MEAL", policyName: "Phụ cấp ăn trưa", amount: 730000, isCustomized: false, unit: "VNĐ/tháng" },
      { policyId: "pol-petrol", policyCode: "PETROL", policyName: "Phụ cấp xăng xe", amount: 500000, isCustomized: false, unit: "VNĐ/tháng" },
    ];
    const updated: BenefitsAllowanceEmployeeV3 = {
      ...current,
      mode: "PROJECT_DEFAULT",
      allowances: defaultAllowances,
      totalMonthlyAllowance: 1230000,
      updatedAt: new Date().toISOString(),
    };
    mutateMockDatabase((db) => {
      const copy = [...(db.benefitsAllowanceEmployeesV3 ?? initialBenefitsAllowanceEmployeesV3)];
      copy[index] = updated;
      db.benefitsAllowanceEmployeesV3 = copy;
    });
    return okV3(updated, "Khôi phục phụ cấp mặc định dự án thành công.");
  }),

  http.get("/api/web/payroll/benefits-allowances/employees/:employeeCode", async ({ params }) => {
    await delay(100);
    const code = String(params.employeeCode);
    const database = readMockDatabase();
    const list = database.benefitsAllowanceEmployeesV3 ?? initialBenefitsAllowanceEmployeesV3;
    const item = list.find((i) => i.employee.employeeCode.toUpperCase() === code.toUpperCase());
    if (!item) {
      return errorV3(404, "Không tìm thấy nhân viên.", "EMPLOYEE_NOT_FOUND");
    }
    return okV3(item, "Lấy thông tin phụ cấp nhân viên thành công.");
  }),

  http.put("/api/web/payroll/benefits-allowances/employees/:employeeCode", async ({ params, request }) => {
    await delay(200);
    const code = String(params.employeeCode);
    const payload = (await request.json()) as UpdateBenefitsAllowanceRequestV3;
    const database = readMockDatabase();
    const list = database.benefitsAllowanceEmployeesV3 ?? initialBenefitsAllowanceEmployeesV3;
    const index = list.findIndex((item) => item.employee.employeeCode.toUpperCase() === code.toUpperCase());
    if (index === -1) {
      return errorV3(404, "Không tìm thấy nhân viên.", "EMPLOYEE_NOT_FOUND");
    }
    const current = list[index];
    const newAllowances: EmployeeAllowanceItemV3[] = payload.allowances.map((a) => {
      const existing = current.allowances.find((x) => String(x.policyId) === String(a.policyId));
      return {
        policyId: a.policyId,
        policyCode: existing?.policyCode || "OTHER",
        policyName: existing?.policyName || "Phụ cấp",
        amount: Number(a.amount),
        isCustomized: a.isCustomized ?? true,
        unit: existing?.unit || "VNĐ/tháng",
      };
    });
    const totalAmount = newAllowances.reduce((sum, a) => sum + a.amount, 0);
    const updated: BenefitsAllowanceEmployeeV3 = {
      ...current,
      mode: "CUSTOM",
      allowances: newAllowances,
      totalMonthlyAllowance: totalAmount,
      updatedAt: new Date().toISOString(),
    };
    mutateMockDatabase((db) => {
      const copy = [...(db.benefitsAllowanceEmployeesV3 ?? initialBenefitsAllowanceEmployeesV3)];
      copy[index] = updated;
      db.benefitsAllowanceEmployeesV3 = copy;
    });
    return okV3(updated, "Cập nhật phụ cấp nhân viên thành công.");
  }),

  // ================= 07. KHOẢN GIẢM TRỪ KHÁC (OTHER DEDUCTIONS) =================
  http.get("/api/web/payroll/other-deductions/summary", async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const month = url.searchParams.get("month");
    const database = readMockDatabase();
    let list = database.otherDeductionsV3 ?? initialOtherDeductionsV3;
    if (projectId) {
      list = list.filter((i) => String(i.employee.project?.projectId) === String(projectId));
    }
    if (month) {
      list = list.filter((i) => i.month === month);
    }
    const total = list.length;
    const totalAmount = list.reduce((sum, i) => sum + i.amount, 0);
    const disciplineFineCount = list.filter((i) => i.type === "DISCIPLINE_FINE").length;
    const assetCompensationCount = list.filter((i) => i.type === "ASSET_COMPENSATION").length;
    const advancePaymentCount = list.filter((i) => i.type === "ADVANCE_PAYMENT").length;
    const otherCount = list.filter((i) => i.type === "OTHER").length;

    const summary: OtherDeductionsSummaryResponse = {
      total,
      totalAmount,
      disciplineFineCount,
      assetCompensationCount,
      advancePaymentCount,
      otherCount,
      counts: [
        { status: "ALL", count: total, label: "Tất cả" },
        { status: "ADVANCE_PAYMENT", count: advancePaymentCount, label: "Tạm ứng" },
        { status: "ASSET_COMPENSATION", count: assetCompensationCount, label: "Bồi thường CCDC" },
        { status: "DISCIPLINE_FINE", count: disciplineFineCount, label: "Phạt kỷ luật" },
        { status: "OTHER", count: otherCount, label: "Giảm trừ khác" },
      ],
    };
    return okV3(summary, "Lấy tổng quan khoản giảm trừ thành công.");
  }),

  http.get("/api/web/payroll/master-data/other-deduction-types", async () => {
    await delay(100);
    return okV3([
      { code: "ADVANCE_PAYMENT", name: "Tạm ứng lương giữa kỳ" },
      { code: "ASSET_COMPENSATION", name: "Bồi thường hư hỏng CCDC" },
      { code: "DISCIPLINE_FINE", name: "Phạt vi phạm kỷ luật lao động" },
      { code: "OTHER", name: "Khoản giảm trừ khác" },
    ], "Lấy danh mục loại giảm trừ thành công.");
  }),

  http.get("/api/web/payroll/other-deductions/export", async () => {
    await delay(200);
    return okV3({
      fileUrl: "https://example.com/exports/other-deductions-2026-08.xlsx",
      fileName: "Danh_sach_giam_tru_khac_2026_08.xlsx",
      totalRecords: 2,
    }, "Xuất dữ liệu giảm trừ thành công.");
  }),

  http.get("/api/web/payroll/other-deductions/import/template", async () => {
    await delay(100);
    return okV3({
      templateUrl: "https://example.com/templates/mau_import_giam_tru.xlsx",
      fileName: "Mau_Import_Giam_Tru.xlsx",
    }, "Tải mẫu import giảm trừ thành công.");
  }),

  http.post("/api/web/payroll/other-deductions/import", async () => {
    await delay(300);
    return okV3({
      totalRows: 2,
      successRows: 2,
      errorRows: 0,
      errors: [],
    }, "Import danh sách giảm trừ thành công.");
  }),

  http.get("/api/web/payroll/other-deductions/audit-logs", async () => {
    await delay(100);
    return okV3({
      items: [
        {
          id: "log-ded-1",
          action: "CREATE",
          entityType: "OTHER_DEDUCTION",
          employeeCode: "NV-00124",
          employeeName: "Nguyễn Văn An",
          newValue: "2,000,000 đ",
          reason: "Tạm ứng theo đơn đề nghị số 12/TU",
          performedBy: { fullName: "Trần Thu Trang" },
          createdAt: "2026-08-15T10:00:00Z",
        }
      ],
      total: 1,
    }, "Lấy lịch sử thao tác giảm trừ thành công.");
  }),

  http.get("/api/web/payroll/other-deductions", async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const employeeCode = url.searchParams.get("employeeCode");
    const month = url.searchParams.get("month");
    const type = url.searchParams.get("type");
    const search = url.searchParams.get("search")?.toLowerCase().trim();
    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "10");

    const database = readMockDatabase();
    let list = database.otherDeductionsV3 ?? initialOtherDeductionsV3;

    if (projectId) {
      list = list.filter((i) => String(i.employee.project?.projectId) === String(projectId));
    }
    if (employeeCode) {
      list = list.filter((i) => i.employee.employeeCode.toUpperCase() === employeeCode.toUpperCase());
    }
    if (month) {
      list = list.filter((i) => i.month === month);
    }
    if (type && type !== "ALL") {
      list = list.filter((i) => i.type === type);
    }
    if (search) {
      list = list.filter(
        (i) =>
          i.employee.fullName.toLowerCase().includes(search) ||
          i.employee.employeeCode.toLowerCase().includes(search) ||
          (i.reason?.toLowerCase().includes(search) ?? false) ||
          i.decisionNumber?.toLowerCase().includes(search)
      );
    }

    const total = list.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const items = list.slice(startIndex, startIndex + pageSize);

    const response: OtherDeductionsListResponse = {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
    return okV3(response, "Lấy danh sách khoản giảm trừ khác thành công.");
  }),

  http.post("/api/web/payroll/other-deductions", async ({ request }) => {
    await delay(200);
    const payload = (await request.json()) as CreateOtherDeductionRequestV3;
    const database = readMockDatabase();
    const employees = database.employees;
    const emp = employees.find((e) => e.code.toUpperCase() === payload.employeeCode?.toUpperCase());
    const empSummary = emp ? {
      employeeCode: emp.code,
      fullName: emp.name,
      project: { projectId: Number(emp.projectId || 1017), projectCode: emp.projectCode || "JSS-ST", projectName: "Jabil Smart Solutions" },
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      position: emp.position,
      status: (emp.status === "active" ? "ACTIVE" : emp.status === "resigned" ? "TERMINATED" : "PROBATION") as any,
    } : {
      employeeCode: payload.employeeCode || "NV-00124",
      fullName: "Nguyễn Văn An",
      project: { projectId: 1017, projectCode: "JSS-ST", projectName: "Jabil Smart Solutions" },
      email: "an.nguyen@greenspeed.vn",
      phone: "0912 345 001",
      department: "Khối Sản xuất",
      position: "Công nhân bậc 3",
      status: "ACTIVE",
    };

    const typeNames: Record<string, string> = {
      ADVANCE_PAYMENT: "Tạm ứng tiền lương giữa kỳ",
      ASSET_COMPENSATION: "Bồi thường thiệt hại CCDC",
      DISCIPLINE_FINE: "Phạt vi phạm kỷ luật",
      OTHER: "Khoản giảm trừ khác",
    };

    const newDeduction: OtherDeductionV3 = {
      id: Date.now(),
      employee: empSummary,
      month: payload.month || "2026-08",
      type: payload.type || "OTHER",
      typeName: (payload.type ? typeNames[payload.type] : undefined) || "Khoản giảm trừ khác",
      amount: Number(payload.amount),
      decisionNumber: payload.decisionNumber || null,
      decisionDate: payload.decisionDate || null,
      reason: payload.reason || "Giảm trừ tiền lương",
      attachment: null,
      updatedBy: { fullName: "Quản trị viên" },
      updatedAt: new Date().toISOString(),
    };

    mutateMockDatabase((db) => {
      const copy = [...(db.otherDeductionsV3 ?? initialOtherDeductionsV3)];
      copy.unshift(newDeduction);
      db.otherDeductionsV3 = copy;
    });

    return okV3(newDeduction, "Thêm mới khoản giảm trừ thành công.");
  }),

  http.get("/api/web/payroll/other-deductions/:deductionId", async ({ params }) => {
    await delay(100);
    const id = Number(params.deductionId);
    const database = readMockDatabase();
    const list = database.otherDeductionsV3 ?? initialOtherDeductionsV3;
    const item = list.find((i) => i.id === id);
    if (!item) {
      return errorV3(404, "Không tìm thấy khoản giảm trừ.", "DEDUCTION_NOT_FOUND");
    }
    return okV3(item, "Lấy thông tin khoản giảm trừ thành công.");
  }),

  http.put("/api/web/payroll/other-deductions/:deductionId", async ({ params, request }) => {
    await delay(200);
    const id = Number(params.deductionId);
    const payload = (await request.json()) as any;
    const database = readMockDatabase();
    const list = database.otherDeductionsV3 ?? initialOtherDeductionsV3;
    const index = list.findIndex((i) => i.id === id);
    if (index === -1) {
      return errorV3(404, "Không tìm thấy khoản giảm trừ.", "DEDUCTION_NOT_FOUND");
    }
    const current = list[index];
    const updated: OtherDeductionV3 = {
      ...current,
      ...payload,
      id: current.id,
      employee: current.employee,
      amount: payload.amount !== undefined ? Number(payload.amount) : current.amount,
      updatedAt: new Date().toISOString(),
    };
    mutateMockDatabase((db) => {
      const copy = [...(db.otherDeductionsV3 ?? initialOtherDeductionsV3)];
      copy[index] = updated;
      db.otherDeductionsV3 = copy;
    });
    return okV3(updated, "Cập nhật khoản giảm trừ thành công.");
  }),

  http.delete("/api/web/payroll/other-deductions/:deductionId", async ({ params }) => {
    await delay(150);
    const id = Number(params.deductionId);
    mutateMockDatabase((db) => {
      const copy = (db.otherDeductionsV3 ?? initialOtherDeductionsV3).filter((i) => i.id !== id);
      db.otherDeductionsV3 = copy;
    });
    return okV3({ id }, "Xóa khoản giảm trừ thành công.");
  }),

  http.post("/api/web/payroll/other-deductions/:deductionId/attachment", async ({ params }) => {
    await delay(200);
    const id = Number(params.deductionId);
    const attachment = {
      id: Date.now(),
      fileName: `Quyet_dinh_giam_tru_${id}.pdf`,
      fileUrl: `https://example.com/docs/ded-${id}.pdf`,
      fileSize: 420000,
    };
    mutateMockDatabase((db) => {
      const list = [...(db.otherDeductionsV3 ?? initialOtherDeductionsV3)];
      const index = list.findIndex((i) => i.id === id);
      if (index !== -1) {
        list[index] = { ...list[index], attachment };
        db.otherDeductionsV3 = list;
      }
    });
    return okV3(attachment, "Tải lên chứng từ đính kèm thành công.");
  }),

  http.delete("/api/web/payroll/other-deductions/:deductionId/attachment", async ({ params }) => {
    await delay(100);
    const id = Number(params.deductionId);
    mutateMockDatabase((db) => {
      const list = [...(db.otherDeductionsV3 ?? initialOtherDeductionsV3)];
      const index = list.findIndex((i) => i.id === id);
      if (index !== -1) {
        list[index] = { ...list[index], attachment: null };
        db.otherDeductionsV3 = list;
      }
    });
    return okV3({ success: true }, "Xóa chứng từ đính kèm thành công.");
  }),

  // ================= 08. THU NHẬP KHÁC (OTHER INCOMES) =================
  http.get("/api/web/payroll/other-incomes/summary", async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const month = url.searchParams.get("month");
    const database = readMockDatabase();
    let list = database.otherIncomesV3 ?? initialOtherIncomesV3;
    if (projectId) {
      list = list.filter((i) => String(i.employee.project?.projectId) === String(projectId));
    }
    if (month) {
      list = list.filter((i) => i.month === month);
    }
    const total = list.length;
    const totalAmount = list.reduce((sum, i) => sum + i.amount, 0);
    const hotBonusCount = list.filter((i) => i.type === "HOT_BONUS").length;
    const performanceBonusCount = list.filter((i) => i.type === "PERFORMANCE_BONUS").length;
    const holidayBonusCount = list.filter((i) => i.type === "HOLIDAY_BONUS").length;
    const projectSupportCount = list.filter((i) => i.type === "PROJECT_SUPPORT").length;
    const otherCount = list.filter((i) => i.type === "OTHER").length;

    const summary: OtherIncomesSummaryResponse = {
      total,
      totalAmount,
      hotBonusCount,
      performanceBonusCount,
      holidayBonusCount,
      projectSupportCount,
      otherCount,
      counts: [
        { status: "ALL", count: total, label: "Tất cả" },
        { status: "HOT_BONUS", count: hotBonusCount, label: "Thưởng nóng" },
        { status: "PERFORMANCE_BONUS", count: performanceBonusCount, label: "Thưởng hiệu quả" },
        { status: "HOLIDAY_BONUS", count: holidayBonusCount, label: "Thưởng lễ tết" },
        { status: "PROJECT_SUPPORT", count: projectSupportCount, label: "Hỗ trợ dự án" },
        { status: "OTHER", count: otherCount, label: "Thu nhập khác" },
      ],
    };
    return okV3(summary, "Lấy tổng quan thu nhập khác thành công.");
  }),

  http.get("/api/web/payroll/other-income-types", async () => {
    await delay(100);
    return okV3([
      { id: 1, incomeCode: "HOT_BONUS", incomeName: "Thưởng nóng sáng kiến cải tiến" },
      { id: 2, incomeCode: "PERFORMANCE_BONUS", incomeName: "Thưởng năng suất hiệu quả công việc" },
      { id: 3, incomeCode: "HOLIDAY_BONUS", incomeName: "Thưởng lễ tết sự kiện" },
      { id: 4, incomeCode: "PROJECT_SUPPORT", incomeName: "Hỗ trợ công tác dự án đặc thù" },
      { id: 5, incomeCode: "OTHER", incomeName: "Khoản thu nhập khác" },
    ], "Lấy danh mục loại thu nhập thành công.");
  }),

  http.get("/api/web/payroll/master-data/other-income-types", async () => {
    await delay(100);
    return okV3([
      { id: 1, code: "HOT_BONUS", name: "Thưởng nóng sáng kiến cải tiến" },
      { id: 2, code: "PERFORMANCE_BONUS", name: "Thưởng năng suất hiệu quả công việc" },
      { id: 3, code: "HOLIDAY_BONUS", name: "Thưởng lễ tết sự kiện" },
      { id: 4, code: "PROJECT_SUPPORT", name: "Hỗ trợ công tác dự án đặc thù" },
      { id: 5, code: "OTHER", name: "Khoản thu nhập khác" },
    ], "Lấy danh mục loại thu nhập thành công.");
  }),

  http.get("/api/web/payroll/other-incomes/export", async () => {
    await delay(200);
    return okV3({
      fileUrl: "https://example.com/exports/other-incomes-2026-08.xlsx",
      fileName: "Danh_sach_thu_nhap_khac_2026_08.xlsx",
      totalRecords: 2,
    }, "Xuất dữ liệu thu nhập khác thành công.");
  }),

  http.get("/api/web/payroll/other-incomes/import/template", async () => {
    await delay(100);
    return okV3({
      templateUrl: "https://example.com/templates/mau_import_thu_nhap.xlsx",
      fileName: "Mau_Import_Thu_Nhap.xlsx",
    }, "Tải mẫu import thu nhập khác thành công.");
  }),

  http.post("/api/web/payroll/other-incomes/import", async () => {
    await delay(300);
    return okV3({
      totalRows: 2,
      successRows: 2,
      errorRows: 0,
      errors: [],
    }, "Import danh sách thu nhập khác thành công.");
  }),

  http.get("/api/web/payroll/other-incomes/audit-logs", async () => {
    await delay(100);
    return okV3({
      items: [
        {
          id: "log-inc-1",
          action: "CREATE",
          entityType: "OTHER_INCOME",
          employeeCode: "NV-00124",
          employeeName: "Nguyễn Văn An",
          newValue: "1,500,000 đ",
          reason: "Sáng kiến tối ưu hóa dây chuyền đóng gói",
          performedBy: { fullName: "Trần Thu Trang" },
          createdAt: "2026-08-10T09:00:00Z",
        }
      ],
      total: 1,
    }, "Lấy nhật ký thao tác thu nhập khác thành công.");
  }),

  http.get("/api/web/payroll/other-incomes", async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const employeeCode = url.searchParams.get("employeeCode");
    const month = url.searchParams.get("month");
    const type = url.searchParams.get("type");
    const search = url.searchParams.get("search")?.toLowerCase().trim();
    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "10");

    const database = readMockDatabase();
    let list = database.otherIncomesV3 ?? initialOtherIncomesV3;

    if (projectId) {
      list = list.filter((i) => String(i.employee.project?.projectId) === String(projectId));
    }
    if (employeeCode) {
      list = list.filter((i) => i.employee.employeeCode.toUpperCase() === employeeCode.toUpperCase());
    }
    if (month) {
      list = list.filter((i) => i.month === month);
    }
    if (type && type !== "ALL") {
      list = list.filter((i) => i.type === type);
    }
    if (search) {
      list = list.filter(
        (i) =>
          i.employee.fullName.toLowerCase().includes(search) ||
          i.employee.employeeCode.toLowerCase().includes(search) ||
          (i.reason?.toLowerCase().includes(search) ?? false) ||
          i.decisionNumber?.toLowerCase().includes(search)
      );
    }

    const total = list.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const items = list.slice(startIndex, startIndex + pageSize);

    const response: OtherIncomesListResponse = {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
    return okV3(response, "Lấy danh sách khoản thu nhập khác thành công.");
  }),

  http.post("/api/web/payroll/other-incomes", async ({ request }) => {
    await delay(200);
    const payload = (await request.json()) as CreateOtherIncomeRequestV3;
    const database = readMockDatabase();
    const employees = database.employees;
    const emp = employees.find((e) => e.code.toUpperCase() === payload.employeeCode?.toUpperCase());
    const empSummary = emp ? {
      employeeCode: emp.code,
      fullName: emp.name,
      project: { projectId: Number(emp.projectId || 1017), projectCode: emp.projectCode || "JSS-ST", projectName: "Jabil Smart Solutions" },
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      position: emp.position,
      status: (emp.status === "active" ? "ACTIVE" : emp.status === "resigned" ? "TERMINATED" : "PROBATION") as any,
    } : {
      employeeCode: payload.employeeCode || "NV-00124",
      fullName: "Nguyễn Văn An",
      project: { projectId: 1017, projectCode: "JSS-ST", projectName: "Jabil Smart Solutions" },
      email: "an.nguyen@greenspeed.vn",
      phone: "0912 345 001",
      department: "Khối Sản xuất",
      position: "Công nhân bậc 3",
      status: "ACTIVE",
    };

    const typeNames: Record<string, string> = {
      HOT_BONUS: "Thưởng nóng sáng kiến cải tiến",
      PERFORMANCE_BONUS: "Thưởng năng suất hiệu quả công việc",
      HOLIDAY_BONUS: "Thưởng lễ tết sự kiện",
      PROJECT_SUPPORT: "Hỗ trợ công tác dự án đặc thù",
      OTHER: "Khoản thu nhập khác",
    };

    const newIncome: OtherIncomeV3 = {
      id: Date.now(),
      employee: empSummary,
      month: payload.month || "2026-08",
      type: payload.type || "OTHER",
      typeName: (payload.type ? typeNames[payload.type] : undefined) || "Khoản thu nhập khác",
      amount: Number(payload.amount),
      decisionNumber: payload.decisionNumber || null,
      decisionDate: payload.decisionDate || null,
      reason: payload.reason || "Khen thưởng thu nhập",
      attachment: null,
      updatedBy: { fullName: "Quản trị viên" },
      updatedAt: new Date().toISOString(),
    };

    mutateMockDatabase((db) => {
      const copy = [...(db.otherIncomesV3 ?? initialOtherIncomesV3)];
      copy.unshift(newIncome);
      db.otherIncomesV3 = copy;
    });

    return okV3(newIncome, "Thêm mới khoản thu nhập khác thành công.");
  }),

  http.get("/api/web/payroll/other-incomes/:incomeId", async ({ params }) => {
    await delay(100);
    const id = Number(params.incomeId);
    const database = readMockDatabase();
    const list = database.otherIncomesV3 ?? initialOtherIncomesV3;
    const item = list.find((i) => i.id === id);
    if (!item) {
      return errorV3(404, "Không tìm thấy khoản thu nhập.", "INCOME_NOT_FOUND");
    }
    return okV3(item, "Lấy thông tin khoản thu nhập thành công.");
  }),

  http.put("/api/web/payroll/other-incomes/:incomeId", async ({ params, request }) => {
    await delay(200);
    const id = Number(params.incomeId);
    const payload = (await request.json()) as any;
    const database = readMockDatabase();
    const list = database.otherIncomesV3 ?? initialOtherIncomesV3;
    const index = list.findIndex((i) => i.id === id);
    if (index === -1) {
      return errorV3(404, "Không tìm thấy khoản thu nhập.", "INCOME_NOT_FOUND");
    }
    const current = list[index];
    const updated: OtherIncomeV3 = {
      ...current,
      ...payload,
      id: current.id,
      employee: current.employee,
      amount: payload.amount !== undefined ? Number(payload.amount) : current.amount,
      updatedAt: new Date().toISOString(),
    };
    mutateMockDatabase((db) => {
      const copy = [...(db.otherIncomesV3 ?? initialOtherIncomesV3)];
      copy[index] = updated;
      db.otherIncomesV3 = copy;
    });
    return okV3(updated, "Cập nhật khoản thu nhập thành công.");
  }),

  http.delete("/api/web/payroll/other-incomes/:incomeId", async ({ params }) => {
    await delay(150);
    const id = Number(params.incomeId);
    mutateMockDatabase((db) => {
      const copy = (db.otherIncomesV3 ?? initialOtherIncomesV3).filter((i) => i.id !== id);
      db.otherIncomesV3 = copy;
    });
    return okV3({ id }, "Xóa khoản thu nhập thành công.");
  }),

  http.post("/api/web/payroll/other-incomes/:incomeId/attachment", async ({ params }) => {
    await delay(200);
    const id = Number(params.incomeId);
    const attachment = {
      id: Date.now(),
      fileName: `Quyet_dinh_khen_thuong_${id}.pdf`,
      fileUrl: `https://example.com/docs/inc-${id}.pdf`,
      fileSize: 510000,
    };
    mutateMockDatabase((db) => {
      const list = [...(db.otherIncomesV3 ?? initialOtherIncomesV3)];
      const index = list.findIndex((i) => i.id === id);
      if (index !== -1) {
        list[index] = { ...list[index], attachment };
        db.otherIncomesV3 = list;
      }
    });
    return okV3(attachment, "Tải lên quyết định khen thưởng đính kèm thành công.");
  }),

  http.delete("/api/web/payroll/other-incomes/:incomeId/attachment", async ({ params }) => {
    await delay(100);
    const id = Number(params.incomeId);
    mutateMockDatabase((db) => {
      const list = [...(db.otherIncomesV3 ?? initialOtherIncomesV3)];
      const index = list.findIndex((i) => i.id === id);
      if (index !== -1) {
        list[index] = { ...list[index], attachment: null };
        db.otherIncomesV3 = list;
      }
    });
    return okV3({ success: true }, "Xóa quyết định khen thưởng đính kèm thành công.");
  }),

  // ==========================================
  // TIMESHEETS & ATTENDANCE SUMMARY ENDPOINTS
  // ==========================================
  http.get("/api/timesheets", async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const period = url.searchParams.get("period") || "2026-09";
    const search = (url.searchParams.get("search") || "").toLowerCase().trim();
    const department = url.searchParams.get("department");

    const db = readMockDatabase();
    let list: TimesheetSummaryItem[] = db.timesheetSummaries ?? initialTimesheetSummaries;

    if (projectId && projectId !== "all") {
      list = list.filter((item) => item.projectId === projectId);
    }
    if (period) {
      list = list.filter((item) => item.period === period);
    }
    if (department && department !== "all") {
      list = list.filter((item) => item.department === department);
    }
    if (search) {
      list = list.filter(
        (item) =>
          item.employeeName.toLowerCase().includes(search) ||
          item.employeeCode.toLowerCase().includes(search) ||
          item.department.toLowerCase().includes(search) ||
          item.position.toLowerCase().includes(search)
      );
    }

    const totalStandardHours = list.reduce((sum, item) => sum + item.totalStandardHours, 0);
    const totalOtHours = list.reduce((sum, item) => sum + item.totalOtNormal + item.totalOtWeekend + item.totalOtHoliday, 0);
    const totalWarnings = list.reduce((sum, item) => sum + item.lateEarlyCount, 0);
    const lockedCount = list.filter((item) => item.status === "locked").length;

    const responseData: TimesheetSummaryResponse = {
      items: list,
      meta: {
        totalEmployees: list.length,
        totalStandardHours: Math.round(totalStandardHours * 10) / 10,
        totalOtHours: Math.round(totalOtHours * 10) / 10,
        totalWarnings,
        lockedCount,
      },
    };

    return okV3(responseData, "Tải danh sách bảng tổng hợp công thành công.");
  }),

  http.get("/api/timesheets/:id", async ({ params }) => {
    await delay(100);
    const id = params.id as string;
    const db = readMockDatabase();
    const list: TimesheetSummaryItem[] = db.timesheetSummaries ?? initialTimesheetSummaries;
    const item = list.find((i) => i.id === id);
    if (!item) {
      return errorV3(404, "Không tìm thấy bản ghi chấm công.", "NOT_FOUND");
    }
    return okV3(item, "Tải chi tiết chấm công thành công.");
  }),

  http.put("/api/timesheets/:id", async ({ params, request }) => {
    await delay(150);
    const id = params.id as string;
    const updatedData = (await request.json()) as Partial<TimesheetSummaryItem>;

    let resultItem: TimesheetSummaryItem | null = null;
    mutateMockDatabase((db) => {
      const list = [...(db.timesheetSummaries ?? initialTimesheetSummaries)];
      const index = list.findIndex((i) => i.id === id);
      if (index !== -1) {
        list[index] = {
          ...list[index],
          ...updatedData,
          updatedAt: new Date().toISOString(),
        };
        resultItem = list[index];
        db.timesheetSummaries = list;
      }
    });

    if (!resultItem) {
      return errorV3(404, "Không tìm thấy bản ghi để cập nhật.", "NOT_FOUND");
    }
    return okV3(resultItem, "Cập nhật bảng chấm công thành công.");
  }),

  http.post("/api/timesheets/import-ocr", async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as {
      projectId: string;
      period: string;
      records: TimesheetOcrParsedItem[];
    };

    const { projectId, period, records } = body;
    let importedCount = 0;
    let warningsCount = 0;

    mutateMockDatabase((db) => {
      const list = [...(db.timesheetSummaries ?? initialTimesheetSummaries)];
      const project = db.projects.find((p) => p.id === projectId);
      const projectName = project?.name ?? "Dự án";

      records.forEach((rec) => {
        if (!rec.ma_nv) return;
        importedCount++;
        if (rec.status === "warning") warningsCount++;

        const existingIndex = list.findIndex(
          (item) => item.projectId === projectId && item.employeeCode === rec.ma_nv && item.period === period
        );

        if (existingIndex !== -1) {
          // Update existing summary
          const existing = list[existingIndex];
          list[existingIndex] = {
            ...existing,
            employeeName: rec.ten_nv || existing.employeeName,
            department: rec.bo_phan || existing.department,
            position: rec.vi_tri || existing.position,
            status: "verified",
            updatedAt: new Date().toISOString(),
          };
        } else {
          // Add newly scanned employee record
          list.push({
            id: `ts-${projectId}-${rec.ma_nv}-${period}`,
            projectId,
            projectName,
            period,
            employeeId: `emp-${rec.ma_nv}`,
            employeeCode: rec.ma_nv,
            employeeName: rec.ten_nv,
            department: rec.bo_phan || "Sản xuất",
            position: rec.vi_tri || "Nhân viên",
            standardWorkdays: 26,
            actualWorkdays: 1,
            totalStandardHours: 8,
            totalOtNormal: 0,
            totalOtWeekend: 0,
            totalOtHoliday: 0,
            totalNightHours: 0,
            paidLeaveDays: 0,
            unpaidLeaveDays: 0,
            lateEarlyCount: 0,
            status: "verified",
            updatedAt: new Date().toISOString(),
            dailyEntries: [],
          });
        }
      });

      db.timesheetSummaries = list;
    });

    return okV3(
      {
        success: true,
        importedCount,
        warningsCount,
        message: `Đã nạp thành công ${importedCount} bản ghi chấm công từ tài liệu OCR.`,
      },
      "Bóc tách và đồng bộ dữ liệu OCR thành công."
    );
  }),

  // Pass-through real Next.js API route for Gemini OCR extraction
  http.post("/api/ocr/extract", () => {
    return passthrough();
  }),

  http.post("/api/timesheets/lock", async ({ request }) => {
    await delay(150);
    const body = (await request.json()) as { projectId: string; period: string; lock: boolean };
    const { projectId, period, lock } = body;

    mutateMockDatabase((db) => {
      const list = [...(db.timesheetSummaries ?? initialTimesheetSummaries)];
      list.forEach((item) => {
        if (
          (projectId === "all" || item.projectId === projectId) &&
          item.period === period
        ) {
          item.status = lock ? "locked" : "verified";
          item.updatedAt = new Date().toISOString();
        }
      });
      db.timesheetSummaries = list;
    });

    return okV3(
      { success: true, locked: lock },
      lock ? "Đã khóa dữ liệu bảng công của kỳ." : "Đã mở khóa dữ liệu bảng công của kỳ."
    );
  }),
];

function newDocId(depId: number) {
  return `${depId}_${Math.floor(Math.random() * 10000)}`;
}



