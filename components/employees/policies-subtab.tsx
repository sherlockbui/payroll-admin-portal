"use client";

import { useQuery, keepPreviousData, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  Download,
  FileSpreadsheet,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import React, { useEffect, useMemo, useState, type ReactNode } from "react";
import { useToast } from "@/components/providers";
import {
  Button,
  EmptyState,
  GsDatePicker,
  GsMoneyInput,
  LoadingBlock,
  Modal,
  SearchableSelect,
  SearchInput,
  TablePaginationFooter,
  TableRowActions,
  usePortalContainer,
} from "@/components/ui";
import { api } from "@/lib/api";
import type {
  EmployeePolicyDetailDto,
  EmployeePolicyDetailItemDto,
  EmployeePolicyListItemDto,
  ImportPolicyErrorDetail,
  SaveEmployeePolicyRequest,
} from "@/lib/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export type SalaryPolicyMode = "ALL" | "CUSTOM" | "PROJECT_DEFAULT";

// Helper to categorize policy items
export function getPolicyCategory(policy: { policyCode?: string; policyName?: string; dataType?: string }): {
  key: "salary" | "allowance" | "bonus" | "overtime" | "other";
  label: string;
} {
  const code = (policy.policyCode || "").toUpperCase();
  const name = (policy.policyName || "").toLowerCase();

  if (
    code.startsWith("POL_BASIC_") ||
    code === "POL_BASIC_SALARY" ||
    code === "POL_INSURANCE_BASE" ||
    code === "POL_INSURANCE_ALLOWANCE" ||
    code.includes("GIO_CHUAN") ||
    code.includes("NGAY_CHUAN") ||
    code.includes("HOURLY_DIVISOR") ||
    name.includes("lương cơ bản") ||
    name.includes("lương đóng bh") ||
    name.includes("giờ chuẩn") ||
    name.includes("ngày chuẩn")
  ) {
    return { key: "salary", label: "Lương & Định mức" };
  }

  if (
    code.startsWith("POL_OT_") ||
    code.startsWith("POL_NIGHT_") ||
    name.includes("tăng ca") ||
    name.includes("làm thêm") ||
    name.includes("ca đêm") ||
    name.includes("overtime")
  ) {
    return { key: "overtime", label: "Tăng ca & Ca đêm" };
  }

  if (
    code.includes("BONUS") ||
    code.includes("KPI") ||
    code.includes("TARGET") ||
    name.includes("thưởng") ||
    name.includes("chuyên cần") ||
    name.includes("kpi")
  ) {
    return { key: "bonus", label: "Thưởng & KPI" };
  }

  if (
    code.includes("ALLOWANCE") ||
    name.includes("phụ cấp") ||
    name.includes("tiền cơm") ||
    name.includes("xăng") ||
    name.includes("điện thoại") ||
    name.includes("nhà ở") ||
    name.includes("độc hại") ||
    name.includes("trách nhiệm")
  ) {
    return { key: "allowance", label: "Phụ cấp & Trợ cấp" };
  }

  return { key: "other", label: "Chế độ khác" };
}

// Helper to format policy values by dataType
export function formatPolicyValue(val: string | number | null | undefined, dataType?: string): string {
  if (val === null || val === undefined || val === "") return "—";
  const num = Number(val);
  const dt = (dataType || "").toUpperCase();

  if (dt === "PERCENTAGE" || dt.includes("PERCENT")) {
    return isNaN(num) ? String(val) : `${num}%`;
  }
  if (dt === "HOURS" || dt.includes("HOUR") || dt.includes("GIO")) {
    return isNaN(num) ? String(val) : `${num} giờ`;
  }
  if (dt === "DAYS" || dt.includes("DAY") || dt.includes("NGAY")) {
    return isNaN(num) ? String(val) : `${num} ngày`;
  }
  if (dt === "COEFFICIENT" || dt.includes("COEFF") || dt === "MULTIPLIER") {
    return isNaN(num) ? String(val) : `x${num}`;
  }
  if (dt === "NUMBER") {
    return isNaN(num) ? String(val) : String(num);
  }

  if (!isNaN(num)) {
    return formatCurrency(num);
  }
  return String(val);
}

// Helper to check if a policy data type is currency / money
export function isMoneyDataType(dataType?: string): boolean {
  if (!dataType) return true;
  const dt = dataType.trim().toUpperCase();
  return dt === "CURRENCY" || dt === "MONEY" || dt === "AMOUNT";
}

export function isBasicSalaryPolicyCode(policyCode?: string): boolean {
  const code = (policyCode || "").trim().toUpperCase();
  return code === "POL_BASIC_SALARY" || code === "LCB" || code === "BASIC_SALARY";
}

export function isInsuranceSalaryPolicyCode(policyCode?: string): boolean {
  const code = (policyCode || "").trim().toUpperCase();
  return code === "POL_INSURANCE_BASE" || code === "LDBH" || code === "INSURANCE_BASE";
}

export function isDateOrderInvalid(effectiveFrom?: string | null, effectiveTo?: string | null): boolean {
  if (!effectiveFrom || !effectiveTo) return false;
  const from = effectiveFrom.slice(0, 10);
  const to = effectiveTo.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return false;
  return to < from;
}

// Helper to filter true allowances & bonus policies (exclude basic salary, insurance base, OT rate coefficients, standard hour thresholds)
export function isAllowancePolicy(policy: {
  policyCode?: string;
  policyTypeCode?: string;
  dataType?: string;
  policyName?: string;
}): boolean {
  const code = (policy.policyCode || "").toUpperCase();
  const name = (policy.policyName || "").toLowerCase();

  // Exclude basic salary and insurance base policies (they have separate designated inputs/columns)
  if (
    code.startsWith("POL_BASIC_") ||
    code === "POL_BASIC_SALARY" ||
    code === "POL_INSURANCE_BASE" ||
    code === "POL_INSURANCE_ALLOWANCE"
  ) {
    return false;
  }

  // Exclude hour divisors, shift multipliers, and standard hour / day thresholds (e.g. standard attendance hours)
  if (
    code.startsWith("POL_HOURLY_DIVISOR") ||
    code.startsWith("POL_NIGHT_SHIFT") ||
    code === "POL_HOURLY_DIVISOR_NORMAL" ||
    code === "POL_HOURLY_DIVISOR_OT" ||
    code.includes("HOUR") ||
    code.includes("GIO_CHUAN") ||
    name.includes("số giờ") ||
    name.includes("giờ chuẩn") ||
    name.includes("ngày chuẩn")
  ) {
    return false;
  }

  // Exclude overtime rate coefficients (e.g. 150%, 200%), except meal rate
  if (code.startsWith("POL_OT_") && !code.includes("MEAL")) {
    return false;
  }

  // Exclude pure percentage system multipliers
  if (
    policy.dataType === "percentage" &&
    !code.includes("BONUS") &&
    !code.includes("ALLOWANCE") &&
    !code.includes("TARGET")
  ) {
    return false;
  }

  return true;
}

// Helper for clean, concise policy names
export function getShortPolicyName(name: string): string {
  if (!name) return "";
  const lower = name.toLowerCase();

  if (lower.includes("điện thoại")) return "Điện thoại";
  if (lower.includes("nhà ở") || lower.includes("đi lại") || lower.includes("lưu trú")) return "Nhà ở";
  if (lower.includes("tiền cơm") || lower.includes("ăn trưa") || lower.includes("tiền ăn")) return "Tiền cơm";
  if (lower.includes("cơm tăng ca") || lower.includes("ăn cơm tăng ca")) return "Cơm tăng ca";
  if (lower.includes("chuyên cần")) return "Chuyên cần";
  if (lower.includes("kpi")) return "KPI";
  if (lower.includes("hoàn thành công việc")) return "Thưởng HTCV";
  if (lower.includes("đoàn phí")) return "Đoàn phí";
  if (lower.includes("xăng xe")) return "Xăng xe";
  if (lower.includes("trách nhiệm")) return "Trách nhiệm";
  if (lower.includes("độc hại") || lower.includes("nặng nhọc")) return "Độc hại";

  const clean = name
    .replace(/^Mức phụ cấp hỗ trợ\s+/i, "")
    .replace(/^Mức phụ cấp\s+/i, "")
    .replace(/^Mức thưởng\s+/i, "Thưởng ")
    .replace(/^Định mức\s+/i, "")
    .replace(/^Đơn giá phụ cấp\s+/i, "")
    .replace(/\s+mục tiêu$/i, "")
    .replace(/\s+khoán tháng$/i, "")
    .replace(/^Mức\s+/i, "")
    .trim();

  return clean.length > 18 ? clean.slice(0, 16) + "..." : clean;
}

export function EmployeePoliciesSubtab({
  projectId,
  employees,
  setHeaderAction,
}: {
  projectId: string;
  employees?: any[];
  setHeaderAction?: (node: ReactNode) => void;
}) {
  const { notify } = useToast();
  const queryClient = useQueryClient();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedMode, setSelectedMode] = useState<SalaryPolicyMode>("ALL");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset page when mode, group, search, or project changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMode, selectedGroupId, debouncedSearch, projectId]);

  // Fetch Project Employee Groups for dropdown filter
  const { data: projectGroups = [] } = useQuery({
    queryKey: ["project-employee-groups", projectId],
    queryFn: () => (projectId && projectId !== "all" ? api.getProjectEmployeeGroups(projectId) : Promise.resolve([])),
    enabled: Boolean(projectId && projectId !== "all"),
  });

  const hasCustomPolicyParam =
    selectedMode === "CUSTOM" ? true : selectedMode === "PROJECT_DEFAULT" ? false : undefined;

  // Primary Query from Server with keepPreviousData to prevent UI flashes & count jumping
  const policiesQuery = useQuery({
    queryKey: [
      "employee-policies",
      projectId,
      debouncedSearch,
      selectedGroupId,
      selectedMode,
      currentPage,
      pageSize,
    ],
    queryFn: () =>
      api.getEmployeePolicies({
        projectId: projectId !== "all" ? projectId : undefined,
        keyword: debouncedSearch || undefined,
        policyGroupId: selectedGroupId !== "all" ? selectedGroupId : undefined,
        hasCustomPolicy: hasCustomPolicyParam,
        pageIndex: currentPage,
        pageSize: pageSize,
      }),
    placeholderData: keepPreviousData,
  });

  const isInitialLoading = policiesQuery.isLoading && !policiesQuery.data;
  const isFetching = policiesQuery.isFetching;
  const data = policiesQuery.data;
  const rawItems = data?.items || [];
  const totalRow = data?.totalRow || 0;
  const displayedItems = rawItems;

  // Persistent summary cache so counts NEVER jump to 0 during fetches or transitions
  const [cachedSummary, setCachedSummary] = useState<any>(null);
  useEffect(() => {
    if (data?.summary) {
      setCachedSummary(data.summary);
    }
  }, [data?.summary]);

  useEffect(() => {
    setCachedSummary(null);
  }, [projectId]);

  const activeSummary = data?.summary || cachedSummary;

  // KPI Summary Statistics (using persistent summary contract)
  const stats = useMemo(() => {
    const total = activeSummary?.totalEmployees ?? (totalRow || 0);
    const customCount = activeSummary?.customPolicyCount ?? (selectedMode === "CUSTOM" ? totalRow : 0);
    const defaultCount = activeSummary?.projectPolicyCount ?? Math.max(0, total - customCount);

    const totalMonthlySalary = rawItems.reduce((sum, i) => {
      const allows = i.policies
        .filter((p) => isAllowancePolicy(p) && (Number(p.value) > 0 || p.hasOverride))
        .reduce((s, p) => s + (Number(p.value) || 0), 0);
      return sum + (i.basicSalary || 0) + allows;
    }, 0);

    return {
      total,
      defaultCount,
      customCount,
      totalMonthlySalary,
    };
  }, [activeSummary, totalRow, rawItems, selectedMode]);

  const portalContainer = usePortalContainer();

  // ================= EDIT MODAL STATE =================
  const [editEmployeeCode, setEditEmployeeCode] = useState<string | null>(null);
  const [editDetail, setEditDetail] = useState<EmployeePolicyDetailDto | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editIsCustom, setEditIsCustom] = useState(false);
  const [editEffectiveFrom, setEditEffectiveFrom] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Editable Policy Items state
  interface EditablePolicyItem extends EmployeePolicyDetailItemDto {
    isEnabled: boolean;
    amount: number;
    valueStr: string;
    effectiveFrom: string;
  }
  const [editablePolicies, setEditablePolicies] = useState<EditablePolicyItem[]>([]);

  // Open Edit Modal & Fetch Detail from API
  const handleOpenEdit = async (item: EmployeePolicyListItemDto) => {
    if (!projectId || projectId === "all") {
      notify("Vui lòng chọn một dự án cụ thể ở thanh công cụ phía trên trước khi tùy chỉnh chế độ!", "warning");
      return;
    }

    setEditEmployeeCode(item.employeeCode);
    setLoadingDetail(true);

    try {
      const detail = await api.getEmployeePolicyDetail(item.employeeCode, projectId);
      setEditDetail(detail);

      const policiesList = detail.policies || [];
      const hasAnyOverride = policiesList.some((p) => p.hasOverride);
      const todayIso = new Date().toISOString().slice(0, 10);

      // Prefer the latest effectiveFrom among active overridden items as default batch date
      const overrideEffectiveDates = policiesList
        .filter((p) => p.hasOverride && p.effectiveFrom)
        .map((p) => String(p.effectiveFrom).slice(0, 10))
        .sort();
      const latestOverrideFrom =
        overrideEffectiveDates.length > 0
          ? overrideEffectiveDates[overrideEffectiveDates.length - 1]
          : todayIso;

      setEditIsCustom(hasAnyOverride);
      setEditEffectiveFrom(latestOverrideFrom);

      const mappedPolicies: EditablePolicyItem[] = policiesList.map((p) => {
        const rawVal = p.hasOverride
          ? (p.employeeValue ?? p.effectiveValue ?? p.groupValue ?? "0")
          : (p.groupValue ?? p.effectiveValue ?? "0");
        const valNum = Number(rawVal);
        return {
          ...p,
          isEnabled: Boolean(p.hasOverride),
          amount: isNaN(valNum) ? 0 : valNum,
          valueStr: String(rawVal),
          effectiveFrom:
            p.hasOverride && p.effectiveFrom
              ? String(p.effectiveFrom).slice(0, 10)
              : todayIso,
          effectiveTo: p.hasOverride && p.effectiveTo ? String(p.effectiveTo).slice(0, 10) : "",
          note: p.hasOverride && p.note ? p.note : "",
        };
      });

      setEditablePolicies(mappedPolicies);
    } catch (err: any) {
      notify(err.message || "Không thể tải chi tiết chế độ nhân sự", "error");
      setEditEmployeeCode(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Apply batch effectiveFrom to all currently enabled rows
  const handleApplyBatchEffectiveFrom = () => {
    const targetDate = (editEffectiveFrom || new Date().toISOString().slice(0, 10)).slice(0, 10);
    setEditablePolicies((prev) =>
      prev.map((p) => (p.isEnabled ? { ...p, effectiveFrom: targetDate } : p))
    );
    notify(`Đã áp dụng ngày hiệu lực ${formatDate(targetDate)} cho các chế độ đang chọn.`);
  };

  // Save Edit Handler
  const handleSaveEdit = async () => {
    if (!editDetail || !projectId || projectId === "all") return;

    const fallbackDate = (editEffectiveFrom || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const enabledItems = editIsCustom ? editablePolicies.filter((p) => p.isEnabled) : [];
    const itemsToRestore = editablePolicies.filter((p) => p.hasOverride && (!editIsCustom || !p.isEnabled));

    // Validate date order & empty values per row before calling API
    if (enabledItems.length > 0) {
      const invalidDateItem = enabledItems.find((p) => {
        const rowFrom = (p.effectiveFrom || fallbackDate).slice(0, 10);
        return isDateOrderInvalid(rowFrom, p.effectiveTo);
      });
      if (invalidDateItem) {
        const rowFrom = (invalidDateItem.effectiveFrom || fallbackDate).slice(0, 10);
        notify(
          `Hạn áp dụng của "${invalidDateItem.policyName}" không được nhỏ hơn ngày hiệu lực (${formatDate(rowFrom)}).`,
          "error"
        );
        return;
      }

      const emptyValueItem = enabledItems.find((p) => {
        if (isMoneyDataType(p.dataType)) return false;
        return !String(p.valueStr ?? "").trim();
      });
      if (emptyValueItem) {
        notify(`Giá trị của "${emptyValueItem.policyName}" không được để trống.`, "error");
        return;
      }
    }

    if (enabledItems.length === 0 && itemsToRestore.length === 0) {
      notify("Vui lòng chọn ít nhất một chế độ để lưu thỏa thuận riêng.", "warning");
      return;
    }

    setSavingEdit(true);
    try {
      // 1. Restore unchecked or disabled overrides back to group default
      for (const item of itemsToRestore) {
        await api.restoreEmployeePolicy(editDetail.employeeCode, item.policyItemId, projectId);
      }

      // 2. Group enabled overrides by their individual effectiveFrom date
      // so policies with different start dates don't overwrite each other
      if (enabledItems.length > 0) {
        const groupedByFrom = new Map<string, EditablePolicyItem[]>();
        for (const p of enabledItems) {
          const rowFrom = (p.effectiveFrom || fallbackDate).slice(0, 10);
          const group = groupedByFrom.get(rowFrom) || [];
          group.push(p);
          groupedByFrom.set(rowFrom, group);
        }

        const sortedDates = Array.from(groupedByFrom.keys()).sort();
        for (const rowFrom of sortedDates) {
          const groupItems = groupedByFrom.get(rowFrom) || [];
          const payload: SaveEmployeePolicyRequest = {
            projectId: Number(projectId),
            employeeCode: editDetail.employeeCode,
            effectiveFrom: rowFrom,
            basicSalary: null,
            insuranceSalary: null,
            policies: groupItems.map((p) => {
              const isMoney = isMoneyDataType(p.dataType);
              const val = isMoney ? String(p.amount || 0) : String(p.valueStr ?? p.amount ?? 0).trim();
              return {
                policyItemId: p.policyItemId,
                value: val,
                effectiveTo: p.effectiveTo && p.effectiveTo.trim() !== "" ? p.effectiveTo.slice(0, 10) : null,
                note: p.note && p.note.trim() !== "" ? p.note.trim() : null,
                status: 1,
              };
            }),
          };

          await api.saveEmployeePolicy(editDetail.employeeCode, payload);
        }
      }

      notify(
        enabledItems.length === 0 && itemsToRestore.length > 0
          ? `Đã khôi phục toàn bộ chế độ của nhân sự ${editDetail.employeeName} về chuẩn nhóm!`
          : `Đã lưu cấu hình thỏa thuận riêng cho nhân sự ${editDetail.employeeName}!`
      );
      queryClient.invalidateQueries({ queryKey: ["employee-policies"] });
      setEditEmployeeCode(null);
      setEditDetail(null);
    } catch (err: any) {
      notify(err.message || "Lỗi khi lưu thỏa thuận riêng", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // Inline Restore a specific policy item
  const handleInlineRestorePolicy = async (policyItemId: number, policyName: string) => {
    if (!editDetail || !projectId || projectId === "all") return;
    try {
      await api.restoreEmployeePolicy(editDetail.employeeCode, policyItemId, projectId);
      notify(`Đã khôi phục chế độ "${policyName}" về chuẩn nhóm!`);
      const updated = await api.getEmployeePolicyDetail(editDetail.employeeCode, projectId);
      setEditDetail(updated);
      setEditablePolicies((prev) =>
        prev.map((p) => {
          if (p.policyItemId === policyItemId) {
            const rawVal = p.groupValue ?? "0";
            const defVal = Number(rawVal);
            return {
              ...p,
              isEnabled: false,
              hasOverride: false,
              employeeValue: null,
              effectiveValue: p.groupValue,
              amount: isNaN(defVal) ? 0 : defVal,
              valueStr: String(rawVal),
              note: "",
              effectiveTo: "",
            };
          }
          return p;
        })
      );
      if (!updated.policies.some((p) => p.hasOverride)) {
        setEditIsCustom(false);
      }
      queryClient.invalidateQueries({ queryKey: ["employee-policies"] });
    } catch (err: any) {
      notify(err.message || "Không thể khôi phục chế độ này", "error");
    }
  };

  // ================= RESTORE BULK CONFIRMATION MODAL =================
  const [restoreEmployee, setRestoreEmployee] = useState<EmployeePolicyListItemDto | null>(null);
  const [restoringBulk, setRestoringBulk] = useState(false);

  const handleConfirmRestoreBulk = async () => {
    if (!restoreEmployee || !projectId || projectId === "all") return;

    setRestoringBulk(true);
    try {
      const detail = await api.getEmployeePolicyDetail(restoreEmployee.employeeCode, projectId);
      const overriddenItems = detail.policies.filter((p) => p.hasOverride);

      if (overriddenItems.length === 0) {
        notify("Nhân sự này hiện không có thỏa thuận riêng nào.", "warning");
        setRestoreEmployee(null);
        return;
      }

      for (const item of overriddenItems) {
        await api.restoreEmployeePolicy(restoreEmployee.employeeCode, item.policyItemId, projectId);
      }

      notify(`Đã khôi phục toàn bộ chế độ của nhân sự ${restoreEmployee.employeeName} về chuẩn dự án!`);
      queryClient.invalidateQueries({ queryKey: ["employee-policies"] });
      setRestoreEmployee(null);
    } catch (err: any) {
      notify(err.message || "Lỗi khi khôi phục chuẩn dự án", "error");
    } finally {
      setRestoringBulk(false);
    }
  };

  // ================= IMPORT EXCEL MODAL (2-STEP WIZARD) =================
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<ImportPolicyErrorDetail[]>([]);

  const handleOpenImport = () => {
    if (!projectId || projectId === "all") {
      notify("Vui lòng chọn một dự án cụ thể ở thanh công cụ phía trên trước khi Import Excel!", "warning");
      return;
    }
    setImportFile(null);
    setImportErrors([]);
    setImportModalOpen(true);
  };

  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      await api.downloadEmployeePolicyTemplate();
      notify("Đã tải xuống biểu mẫu Excel chuẩn thành công!");
    } catch (err: any) {
      notify(err.message || "Không thể tải biểu mẫu Excel", "error");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!importFile) {
      notify("Vui lòng chọn tệp Excel trước khi thực hiện!", "warning");
      return;
    }

    setImporting(true);
    setImportErrors([]);

    try {
      const res = await api.importEmployeePolicies(importFile);
      notify(`Import thành công ${res.successRows ?? res.totalRows}/${res.totalRows} bản ghi thỏa thuận riêng!`);
      queryClient.invalidateQueries({ queryKey: ["employee-policies"] });
      setImportModalOpen(false);
      setImportFile(null);
    } catch (err: any) {
      const errorList = err.details || err.errorData?.errors || (Array.isArray(err.errorData) ? err.errorData : []);
      if (Array.isArray(errorList) && errorList.length > 0) {
        setImportErrors(errorList);
        notify(err.message || `File import có ${errorList.length} dòng bị lỗi dữ liệu.`, "error");
      } else {
        notify(err.message || "Import file thất bại.", "error");
      }
    } finally {
      setImporting(false);
    }
  };

  // Header Actions
  useEffect(() => {
    if (!setHeaderAction) return;
    setHeaderAction(
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={() => policiesQuery.refetch()}
          className="gap-1.5 font-medium text-xs h-8 px-3"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", policiesQuery.isFetching && "animate-spin")} /> Làm mới
        </Button>
        <Button
          variant="secondary"
          onClick={handleOpenImport}
          className="gap-1.5 font-semibold text-xs h-8 px-3"
        >
          <UploadCloud className="w-3.5 h-3.5 text-primary" /> Import Excel
        </Button>
      </div>
    );
    return () => setHeaderAction(null);
  }, [setHeaderAction, projectId, policiesQuery.isFetching]);

  // Live calculation in Edit Modal (combines both group-default & custom-overridden allowances and salaries)
  const editCalculations = useMemo(() => {
    const basicRow = editablePolicies.find((p) => isBasicSalaryPolicyCode(p.policyCode));
    const insRow = editablePolicies.find((p) => isInsuranceSalaryPolicyCode(p.policyCode));

    const groupBasic = basicRow ? Number(basicRow.groupValue) || 0 : editDetail?.basicSalary || 0;
    const groupIns = insRow ? Number(insRow.groupValue) || 0 : editDetail?.insuranceSalary || 0;

    const effectiveBasic =
      editIsCustom && basicRow?.isEnabled ? Number(basicRow.amount) || 0 : groupBasic;
    const effectiveIns =
      editIsCustom && insRow?.isEnabled ? Number(insRow.amount) || 0 : groupIns;

    const allowanceRows = editablePolicies.filter(
      (a) => isAllowancePolicy(a) && isMoneyDataType(a.dataType)
    );

    const totalAllowance = allowanceRows.reduce((s, a) => {
      const val = editIsCustom && a.isEnabled ? Number(a.amount) || 0 : Number(a.groupValue) || 0;
      return s + val;
    }, 0);

    const defaultAllowanceTotal = allowanceRows.reduce(
      (s, a) => s + (Number(a.groupValue) || 0),
      0
    );

    const totalFixedIncome = effectiveBasic + totalAllowance;
    const defaultFixedIncome = groupBasic + defaultAllowanceTotal;
    const deltaTotal = totalFixedIncome - defaultFixedIncome;
    const hasInvalidDates =
      editIsCustom &&
      editablePolicies.some((p) => {
        if (!p.isEnabled) return false;
        const rowFrom = (p.effectiveFrom || editEffectiveFrom || "").slice(0, 10);
        return isDateOrderInvalid(rowFrom, p.effectiveTo);
      });

    return {
      groupBasic,
      groupIns,
      effectiveBasic,
      effectiveIns,
      isBasicOverridden: Boolean(editIsCustom && basicRow?.isEnabled),
      isInsOverridden: Boolean(editIsCustom && insRow?.isEnabled),
      totalAllowance,
      totalFixedIncome,
      deltaTotal,
      hasInvalidDates,
    };
  }, [editablePolicies, editIsCustom, editEffectiveFrom, editDetail]);

  return (
    <div className="space-y-4">
      {/* Main Integrated Table Card */}
      <div className="integrated-table-card">
        {/* Toolbar */}
        <div className="table-card-toolbar">
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            {/* Left: Mode Filter Pills */}
            <div className="filter-status-pills flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedMode("ALL")}
                className={`pill-btn ${selectedMode === "ALL" ? "active" : ""}`}
              >
                Tất cả ({stats.total.toLocaleString("vi-VN")})
              </button>
              <button
                type="button"
                onClick={() => setSelectedMode("PROJECT_DEFAULT")}
                className={`pill-btn success ${selectedMode === "PROJECT_DEFAULT" ? "active" : ""}`}
              >
                Theo chuẩn nhóm ({stats.defaultCount.toLocaleString("vi-VN")})
              </button>
              <button
                type="button"
                onClick={() => setSelectedMode("CUSTOM")}
                className={`pill-btn ${selectedMode === "CUSTOM" ? "active" : ""}`}
              >
                Thỏa thuận riêng ({stats.customCount.toLocaleString("vi-VN")})
              </button>
            </div>

            {/* Right: Group Filter Dropdown & Search Input */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {projectGroups.length > 0 && (
                <div style={{ width: "220px", minWidth: "180px" }}>
                  <SearchableSelect
                    value={selectedGroupId}
                    onChange={(val) => setSelectedGroupId(val || "all")}
                    options={[
                      { value: "all", label: `Tất cả nhóm (${projectGroups.length} nhóm)` },
                      { value: "0", label: "Chưa phân nhóm" },
                      ...projectGroups.map((g) => ({
                        value: String(g.id),
                        label: `${g.groupName || g.name} (${g.employeeCount || 0} NS)`,
                      })),
                    ]}
                    placeholder="Tất cả nhóm"
                    allowClear={false}
                    style={{ width: "100%" }}
                  />
                </div>
              )}
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Tìm mã NV (GID), họ tên..."
                containerClassName="min-w-[235px] max-w-[300px]"
              />
            </div>
          </div>
        </div>

        {/* Loading / Error / Table Content */}
        {isInitialLoading ? (
          <div className="py-12">
            <LoadingBlock rows={6} />
          </div>
        ) : displayedItems.length === 0 && !isFetching ? (
          <div className="py-14">
            <EmptyState
              title="Không tìm thấy dữ liệu"
              description={
                searchTerm || selectedMode !== "ALL" || selectedGroupId !== "all"
                  ? "Không tìm thấy nhân sự phù hợp với từ khóa tìm kiếm hoặc bộ lọc hiện tại."
                  : "Chưa có dữ liệu nhân sự và chế độ lương cho phạm vi dự án này."
              }
              action={
                searchTerm || selectedMode !== "ALL" || selectedGroupId !== "all" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedMode("ALL");
                      setSelectedGroupId("all");
                    }}
                    className="gap-1.5 text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Xóa bộ lọc
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : displayedItems.length === 0 && isFetching ? (
          <div className="py-12">
            <LoadingBlock rows={6} />
          </div>
        ) : (
          <div className="data-table-wrap relative">
            {isFetching && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20 overflow-hidden z-20">
                <div className="h-full bg-primary animate-pulse w-full" />
              </div>
            )}
            <div className={cn("data-table-scroll transition-opacity duration-150", isFetching && "opacity-60")}>
              <table className="data-table min-w-[1100px]">
                <thead>
                  <tr>
                    <th style={{ width: "45px" }} className="text-center">STT</th>
                    <th style={{ minWidth: "210px" }}>NGƯỜI LAO ĐỘNG</th>
                    <th style={{ width: "160px" }}>NHÓM ĐỐI TƯỢNG</th>
                    <th style={{ width: "160px" }} className="text-right">LƯƠNG CƠ BẢN</th>
                    <th style={{ minWidth: "280px" }}>CÁC PHỤ CẤP ÁP DỤNG</th>
                    <th style={{ width: "140px" }} className="text-center">TRẠNG THÁI</th>
                    <th style={{ width: "160px" }} className="text-right">TỔNG THU NHẬP CỐ ĐỊNH</th>
                    <th style={{ width: "100px" }} className="text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs text-foreground">
                  {displayedItems.map((item, idx) => {
                    const rawStt = (currentPage - 1) * pageSize + idx + 1;
                    const stt = String(rawStt).padStart(2, "0");
                    const hasOverride = item.hasBasicSalaryOverride || item.policies.some((p) => p.hasOverride);

                    // Filter valid allowances that have actual money value > 0 or are overridden
                    const validAllowances = item.policies.filter(
                      (p) => isAllowancePolicy(p) && (Number(p.value) > 0 || p.hasOverride)
                    );
                    const totalAllowance = validAllowances.reduce(
                      (s, p) => s + (Number(p.value) || 0),
                      0
                    );
                    const totalFixedIncome = (item.basicSalary || 0) + totalAllowance;

                    return (
                      <tr
                        key={item.employeeCode}
                        className="hover:bg-secondary/40 transition-colors"
                      >
                        {/* STT */}
                        <td className="text-center text-muted-foreground font-mono font-medium">{stt}</td>

                        {/* Employee Info */}
                        <td>
                          <div className="employee-cell-info">
                            <span className="employee-cell-name font-semibold text-foreground">
                              {item.employeeName || "—"}
                            </span>
                            <span className="employee-cell-sub">
                              <span className="employee-code-badge">{item.employeeCode}</span>
                              {item.effectiveFrom && (
                                <span className="text-muted-foreground text-[11px]">
                                  · Từ {formatDate(item.effectiveFrom)}
                                </span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Group Name */}
                        <td>
                          {item.policyGroupName ? (
                            <span className="font-medium text-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">
                              {item.policyGroupName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">Chưa phân nhóm</span>
                          )}
                        </td>

                        {/* Base Salary */}
                        <td className="text-right">
                          <div className="font-semibold text-foreground font-mono text-xs">
                            {Boolean(item.basicSalary && item.basicSalary > 0)
                              ? formatCurrency(item.basicSalary || 0)
                              : "—"}
                          </div>
                          {item.hasBasicSalaryOverride && (
                            <div className="text-[11px] text-primary font-medium flex items-center justify-end gap-0.5 mt-0.5">
                              <Sparkles className="w-3 h-3 text-primary" /> Thỏa thuận riêng
                            </div>
                          )}
                        </td>

                        {/* Allowances Summary: Mini Badges */}
                        <td className="!whitespace-normal">
                          {validAllowances.length === 0 ? (
                            <span className="text-muted-foreground italic text-xs">
                              — Không có phụ cấp —
                            </span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5 py-0.5 max-w-[400px]">
                              {validAllowances.slice(0, 3).map((p) => {
                                const shortName = getShortPolicyName(p.policyName);
                                const isCustom = p.hasOverride;
                                const formattedVal = formatPolicyValue(p.policyValue ?? p.value, p.dataType);
                                return (
                                  <span
                                    key={p.policyItemId}
                                    className={cn(
                                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border transition-colors shrink-0",
                                      isCustom
                                        ? "bg-primary/10 text-primary border-primary/25 font-semibold"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                    )}
                                    title={`${p.policyName}: ${formattedVal}${isCustom ? " (Thỏa thuận riêng)" : " (Chuẩn nhóm)"}`}
                                  >
                                    <span>{shortName}:</span>
                                    <span className="font-mono font-bold text-foreground">
                                      {formattedVal}
                                    </span>
                                    {isCustom && (
                                      <span className="text-primary font-bold ml-0.5">★</span>
                                    )}
                                  </span>
                                );
                              })}
                              {validAllowances.length > 3 && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-secondary text-muted-foreground border border-border cursor-help"
                                  title={validAllowances
                                    .slice(3)
                                    .map(
                                      (p) =>
                                        `${p.policyName}: ${formatPolicyValue(p.policyValue ?? p.value, p.dataType)}${p.hasOverride ? " (Thỏa thuận riêng)" : ""}`
                                    )
                                    .join("\n")}
                                >
                                  +{validAllowances.length - 3} khoản khác
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="text-center">
                          {hasOverride ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                              Thỏa thuận riêng
                            </span>
                          ) : !item.policyGroupId && !item.policyGroupName ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              Chưa phân nhóm
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              Chuẩn nhóm
                            </span>
                          )}
                        </td>

                        {/* Total Fixed Income */}
                        <td className="text-right">
                          <span className="font-bold text-foreground font-mono text-xs">
                            {totalFixedIncome > 0 ? formatCurrency(totalFixedIncome) : "—"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="text-center">
                          <TableRowActions
                            items={[
                              {
                                key: "edit",
                                label: "Tùy chỉnh chế độ & lương",
                                icon: <Pencil className="w-3.5 h-3.5 text-primary" />,
                                onClick: () => handleOpenEdit(item),
                              },
                              ...(hasOverride
                                ? [
                                  {
                                    key: "restore",
                                    label: "Khôi phục chuẩn dự án",
                                    icon: <RotateCcw className="w-3.5 h-3.5 text-slate-500" />,
                                    onClick: () => setRestoreEmployee(item),
                                  },
                                ]
                                : []),
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <TablePaginationFooter
              totalItems={totalRow}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* ================= MODAL: TÙY CHỈNH CHẾ ĐỘ & LƯƠNG RIÊNG ================= */}
      {editEmployeeCode && (
        <Modal
          open={Boolean(editEmployeeCode)}
          onOpenChange={(open) => !open && setEditEmployeeCode(null)}
          title={`Cấu hình thỏa thuận chế độ & lương: ${editDetail?.employeeName || editEmployeeCode}`}
          description={`Mã NV: ${editEmployeeCode} • Nhóm đối tượng: ${editDetail?.policyGroupName || "Chưa phân nhóm"}`}
          size="xl"
          footer={
            <div className="flex items-center justify-between w-full gap-2">
              <div>
                {editDetail?.policies.some((p) => p.hasOverride) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const found = rawItems.find((i) => i.employeeCode === editEmployeeCode);
                      if (found) setRestoreEmployee(found);
                      setEditEmployeeCode(null);
                    }}
                    className="text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1.5 text-xs font-medium"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Khôi phục tất cả về chuẩn nhóm
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditEmployeeCode(null)}>
                  Hủy bỏ
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={savingEdit || loadingDetail || editCalculations.hasInvalidDates}
                  onClick={handleSaveEdit}
                  className="gap-1.5 font-semibold"
                >
                  <Save className="w-3.5 h-3.5" /> {savingEdit ? "Đang lưu..." : "Lưu cấu hình lương"}
                </Button>
              </div>
            </div>
          }
        >
          {loadingDetail ? (
            <div className="py-12">
              <LoadingBlock rows={4} />
            </div>
          ) : !editDetail ? (
            <div className="py-8 text-center text-muted-foreground">Không tìm thấy thông tin nhân sự.</div>
          ) : (
            <div className="space-y-3 py-1 text-xs">
              {/* Top Control Bar: Mode Switcher + Effective From */}
              <div
                className={cn(
                  "px-3.5 py-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 transition-colors",
                  editIsCustom
                    ? "bg-primary/5 border-primary/25 text-slate-900 dark:text-slate-100"
                    : "bg-slate-100/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <label className="flex items-center gap-2 cursor-pointer shrink-0 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                    <input
                      type="checkbox"
                      checked={editIsCustom}
                      onChange={(e) => setEditIsCustom(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <span className="font-semibold text-xs text-foreground">Bật thỏa thuận riêng</span>
                  </label>

                  <div className="font-semibold text-xs flex items-center gap-1.5 min-w-0">
                    {editIsCustom ? (
                      <>
                        <Sparkles className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-primary font-bold truncate">
                          Đang áp dụng thỏa thuận riêng (Tick các chế độ cần ghi đè bên dưới)
                        </span>
                      </>
                    ) : (
                      <>
                        <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="text-slate-600 dark:text-slate-300 truncate">
                          {editDetail.policies.some((p) => p.hasOverride)
                            ? "Kế thừa chuẩn nhóm — Bấm Lưu để khôi phục các thỏa thuận cũ về chuẩn nhóm"
                            : "Kế thừa 100% theo chuẩn nhóm đối tượng"}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {editIsCustom && (
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <span className="text-slate-600 dark:text-slate-300 font-semibold whitespace-nowrap">
                      Áp dụng chung từ:
                    </span>
                    <div className="w-[145px]">
                      <GsDatePicker
                        size="sm"
                        usePortal
                        portalContainer={portalContainer}
                        allowClear={false}
                        value={editEffectiveFrom}
                        onChange={setEditEffectiveFrom}
                        placeholder="dd/mm/yyyy"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleApplyBatchEffectiveFrom}
                      disabled={!editablePolicies.some((p) => p.isEnabled)}
                      className="h-8 px-2.5 text-[11px] font-semibold whitespace-nowrap"
                      title="Gán ngày này cho tất cả các chế độ đang được tick bên dưới"
                    >
                      Áp cho tất cả dòng bật
                    </Button>
                  </div>
                )}
              </div>

              {/* 3-Card Summary Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Lương cơ bản</span>
                    {editCalculations.isBasicOverridden ? (
                      <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary font-bold text-[10px]">★ Riêng</span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[10px]">Chuẩn nhóm</span>
                    )}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
                    {editCalculations.isBasicOverridden && editCalculations.effectiveBasic !== editCalculations.groupBasic && (
                      <span className="line-through text-slate-400 font-mono text-[11px]">
                        {formatCurrency(editCalculations.groupBasic)}
                      </span>
                    )}
                    <span className={cn("font-bold font-mono text-sm", editCalculations.isBasicOverridden ? "text-primary" : "text-foreground")}>
                      {editCalculations.effectiveBasic > 0 ? formatCurrency(editCalculations.effectiveBasic) : "—"}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Lương đóng BHXH</span>
                    {editCalculations.isInsOverridden ? (
                      <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary font-bold text-[10px]">★ Riêng</span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[10px]">Chuẩn nhóm</span>
                    )}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
                    {editCalculations.isInsOverridden && editCalculations.effectiveIns !== editCalculations.groupIns && (
                      <span className="line-through text-slate-400 font-mono text-[11px]">
                        {formatCurrency(editCalculations.groupIns)}
                      </span>
                    )}
                    <span className={cn("font-bold font-mono text-sm", editCalculations.isInsOverridden ? "text-primary" : "text-foreground")}>
                      {editCalculations.effectiveIns > 0 ? formatCurrency(editCalculations.effectiveIns) : "—"}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="font-semibold">Tổng thu nhập cố định dự tính</span>
                    {editCalculations.deltaTotal !== 0 && (
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded font-bold font-mono text-[10px]",
                          editCalculations.deltaTotal > 0
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                        )}
                      >
                        {editCalculations.deltaTotal > 0
                          ? `+${formatCurrency(editCalculations.deltaTotal)}`
                          : formatCurrency(editCalculations.deltaTotal)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 font-bold font-mono text-sm text-primary">
                    {formatCurrency(editCalculations.totalFixedIncome)}
                  </div>
                </div>
              </div>

              {/* Unified Row-Aligned Comparison Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
                <div className="max-h-[380px] overflow-auto">
                  <table className="w-full border-collapse text-xs min-w-[980px]">
                    <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-[0_1px_0_0_rgba(148,163,184,0.2)]">
                      <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="py-2.5 px-3 text-left w-[240px]">Chế độ / Chính sách</th>
                        <th className="py-2.5 px-3 text-right w-[115px]">Chuẩn nhóm</th>
                        <th className="py-2.5 px-3 text-left w-[180px]">Thỏa thuận riêng</th>
                        <th className="py-2.5 px-2.5 text-left w-[142px]">Hiệu lực từ</th>
                        <th className="py-2.5 px-2.5 text-left w-[148px]">Hạn áp dụng</th>
                        <th className="py-2.5 px-2.5 text-left min-w-[130px]">Lý do / Căn cứ</th>
                        <th className="py-2.5 px-2 text-center w-[42px]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {editablePolicies.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                            Nhóm đối tượng hoặc dự án chưa cấu hình chính sách nào.
                          </td>
                        </tr>
                      ) : (
                        editablePolicies.map((a, i) => {
                          const cat = getPolicyCategory(a);
                          const catColors: Record<string, string> = {
                            salary: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
                            allowance: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
                            overtime: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
                            bonus: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
                            other: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
                          };
                          const isMoney = isMoneyDataType(a.dataType);
                          const rowEditable = editIsCustom && a.isEnabled;
                          const rowFrom = (a.effectiveFrom || editEffectiveFrom || "").slice(0, 10);
                          const dateInvalid = rowEditable && isDateOrderInvalid(rowFrom, a.effectiveTo);
                          const isValueDifferent = isMoney
                            ? Number(a.amount || 0) !== Number(a.groupValue || 0)
                            : String(a.valueStr ?? "").trim() !== String(a.groupValue ?? "").trim();
                          const dtUpper = (a.dataType || "").toUpperCase();
                          const unitSuffix = dtUpper.includes("PERCENT")
                            ? "%"
                            : dtUpper.includes("COEFF") || dtUpper === "MULTIPLIER"
                              ? "x"
                              : dtUpper.includes("HOUR") || dtUpper.includes("GIO")
                                ? "h"
                                : dtUpper.includes("DAY") || dtUpper.includes("NGAY")
                                  ? "d"
                                  : "";

                          return (
                            <tr
                              key={a.policyItemId}
                              className={cn(
                                "transition-colors align-middle",
                                rowEditable
                                  ? "bg-primary/[0.03] dark:bg-primary/[0.06]"
                                  : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                              )}
                            >
                              {/* Policy Info (clean 2-line hierarchy) */}
                              <td className="py-2.5 px-3">
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                                    {a.policyName}
                                    {a.hasOverride && (
                                      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 align-middle">
                                        ★ Ghi đè
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={cn(
                                        "px-1.5 py-0.2 rounded text-[10px] font-medium border shrink-0",
                                        catColors[cat.key] || catColors.other
                                      )}
                                    >
                                      {cat.label}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono truncate">
                                      {a.policyCode}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Group Default (Read-only) */}
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                <span
                                  className={cn(
                                    rowEditable && a.groupValue && isValueDifferent
                                      ? "line-through text-slate-400"
                                      : ""
                                  )}
                                >
                                  {formatPolicyValue(a.groupValue, a.dataType)}
                                </span>
                              </td>

                              {/* Custom Override Toggle + Value */}
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    aria-label={`Bật thỏa thuận riêng cho ${a.policyName}`}
                                    disabled={!editIsCustom}
                                    checked={a.isEnabled}
                                    onChange={(e) => {
                                      const copy = [...editablePolicies];
                                      const checked = e.target.checked;
                                      copy[i].isEnabled = checked;
                                      if (checked && (!copy[i].amount || copy[i].amount === 0) && copy[i].groupValue) {
                                        const num = Number(copy[i].groupValue);
                                        if (!isNaN(num)) copy[i].amount = num;
                                        copy[i].valueStr = String(copy[i].groupValue);
                                      }
                                      if (checked && !copy[i].hasOverride && editEffectiveFrom) {
                                        copy[i].effectiveFrom = editEffectiveFrom;
                                      }
                                      setEditablePolicies(copy);
                                    }}
                                    className="rounded border-border text-primary focus:ring-primary w-4 h-4 shrink-0 cursor-pointer disabled:opacity-50"
                                  />
                                  <div className="flex-1 min-w-[115px]">
                                    {isMoney ? (
                                      <GsMoneyInput
                                        size="sm"
                                        unit="đ"
                                        showWords={false}
                                        disabled={!rowEditable}
                                        value={a.amount}
                                        onChange={(val) => {
                                          const copy = [...editablePolicies];
                                          copy[i].amount = val;
                                          copy[i].valueStr = String(val);
                                          setEditablePolicies(copy);
                                        }}
                                        inputClassName="text-right font-bold"
                                        placeholder="0"
                                      />
                                    ) : (
                                      <div
                                        className={cn(
                                          "flex items-center h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary",
                                          !rowEditable && "opacity-55 bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed"
                                        )}
                                      >
                                        <input
                                          type="text"
                                          disabled={!rowEditable}
                                          value={a.valueStr ?? a.amount ?? ""}
                                          onChange={(e) => {
                                            const copy = [...editablePolicies];
                                            copy[i].valueStr = e.target.value;
                                            const parsed = Number(e.target.value);
                                            copy[i].amount = isNaN(parsed) ? 0 : parsed;
                                            setEditablePolicies(copy);
                                          }}
                                          className={cn(
                                            "!h-full !min-h-0 flex-1 min-w-0 !border-0 !rounded-none !bg-transparent !shadow-none !outline-none !ring-0 !py-0 text-xs font-bold",
                                            unitSuffix
                                              ? "!pl-2 !pr-1 text-right font-mono"
                                              : dtUpper === "STRING" || dtUpper === "TEXT"
                                                ? "!px-2 text-left"
                                                : "!px-2 text-right font-mono"
                                          )}
                                          placeholder="Nhập giá trị..."
                                        />
                                        {unitSuffix && (
                                          <span className="pr-2.5 text-[11px] text-muted-foreground font-mono font-semibold select-none shrink-0">
                                            {unitSuffix}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Per-row Effective From */}
                              <td className="py-2.5 px-2.5">
                                <GsDatePicker
                                  size="sm"
                                  usePortal
                                  portalContainer={portalContainer}
                                  disabled={!rowEditable}
                                  value={rowFrom}
                                  onChange={(val) => {
                                    const copy = [...editablePolicies];
                                    copy[i].effectiveFrom = val;
                                    setEditablePolicies(copy);
                                  }}
                                  placeholder="dd/mm/yyyy"
                                  allowClear={false}
                                />
                              </td>

                              {/* Effective To */}
                              <td className="py-2.5 px-2.5">
                                <GsDatePicker
                                  size="sm"
                                  usePortal
                                  portalContainer={portalContainer}
                                  disabled={!rowEditable}
                                  value={a.effectiveTo ? a.effectiveTo.slice(0, 10) : ""}
                                  onChange={(val) => {
                                    const copy = [...editablePolicies];
                                    copy[i].effectiveTo = val;
                                    setEditablePolicies(copy);
                                  }}
                                  placeholder="Vô thời hạn"
                                  allowClear
                                  error={dateInvalid ? "Phải ≥ Hiệu lực từ" : undefined}
                                />
                              </td>

                              {/* Note */}
                              <td className="py-2.5 px-2.5">
                                <input
                                  type="text"
                                  disabled={!rowEditable}
                                  placeholder="VD: Phụ lục HĐLĐ..."
                                  value={a.note || ""}
                                  onChange={(e) => {
                                    const copy = [...editablePolicies];
                                    copy[i].note = e.target.value;
                                    setEditablePolicies(copy);
                                  }}
                                  className="w-full !h-8 !min-h-[32px] !px-2.5 !py-0 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                                />
                              </td>

                              {/* Inline Restore */}
                              <td className="py-2.5 px-2 text-center">
                                {a.hasOverride && (
                                  <button
                                    type="button"
                                    onClick={() => handleInlineRestorePolicy(a.policyItemId, a.policyName)}
                                    title="Khôi phục về mức chuẩn nhóm"
                                    aria-label={`Khôi phục ${a.policyName} về chuẩn nhóm`}
                                    className="p-1.5 rounded-md text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ================= MODAL: XÁC NHẬN KHÔI PHỤC CHUẨN DỰ ÁN ================= */}
      {restoreEmployee && (
        <Modal
          open={Boolean(restoreEmployee)}
          onOpenChange={(open) => !open && setRestoreEmployee(null)}
          title="Xác nhận khôi phục chế độ theo chuẩn Dự án"
          description={`Nhân sự: ${restoreEmployee.employeeName} (${restoreEmployee.employeeCode})`}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setRestoreEmployee(null)}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={restoringBulk}
                onClick={handleConfirmRestoreBulk}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" /> {restoringBulk ? "Đang khôi phục..." : "Xác nhận khôi phục"}
              </Button>
            </div>
          }
        >
          <div className="py-2 space-y-3 text-xs text-slate-700 dark:text-slate-300">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed m-0">
                Toàn bộ các khoản lương cơ bản và phụ cấp thỏa thuận riêng của nhân sự này sẽ bị hủy bỏ.
                Nhân sự sẽ được đưa về nhận <strong>100% định mức chuẩn theo nhóm đối tượng [{restoreEmployee.policyGroupName || "Mặc định"}]</strong>.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL: IMPORT EXCEL (2-STEP WIZARD) ================= */}
      <Modal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        title="Import Chế độ & Lương nhân sự từ Excel"
        description="Nhập danh sách lương cơ bản và các khoản phụ cấp thỏa thuận riêng hàng loạt theo dự án."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setImportModalOpen(false)}>
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!importFile || importing}
              onClick={handleExecuteImport}
              className="gap-1.5 font-semibold text-xs"
            >
              <UploadCloud className="w-3.5 h-3.5" /> {importing ? "Đang Import..." : "Bắt đầu Import"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-1 text-xs">
          {/* STEP 1: Tải biểu mẫu chuẩn từ BE */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Bước 1: Tải biểu mẫu Excel chuẩn</span>
              </div>
              <p className="text-[11px] text-muted-foreground m-0">
                Biểu mẫu chuẩn bao gồm: Mã NV, Mã chính sách, Giá trị thỏa thuận, Ngày hiệu lực, Ghi chú.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={downloadingTemplate}
              onClick={handleDownloadTemplate}
              className="gap-1 text-xs shrink-0 font-medium"
            >
              <Download className={cn("w-3.5 h-3.5 text-emerald-600", downloadingTemplate && "animate-bounce")} />{" "}
              {downloadingTemplate ? "Đang tải..." : "Tải file mẫu (.xlsx)"}
            </Button>
          </div>

          {/* STEP 2: Kéo thả file upload */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 dark:text-slate-200">
              Bước 2: Chọn tệp Excel đã điền dữ liệu
            </label>
            <div
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".xlsx, .xls";
                input.onchange = (e: any) => {
                  const f = e.target?.files?.[0];
                  if (f) setImportFile(f);
                };
                input.click();
              }}
              className={cn(
                "p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors text-center",
                importFile
                  ? "border-emerald-500/60 bg-emerald-50/20 dark:bg-emerald-950/10"
                  : "border-slate-300 dark:border-slate-700 hover:border-primary bg-slate-50/50 dark:bg-slate-900/50"
              )}
            >
              {importFile ? (
                <div className="space-y-1">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div className="font-bold text-foreground text-xs">{importFile.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    ({(importFile.size / 1024).toFixed(1)} KB) • Nhấp để đổi tệp khác
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <UploadCloud className="w-8 h-8 text-primary mx-auto" />
                  <div className="font-semibold text-foreground text-xs">Nhấp hoặc kéo thả file Excel vào đây</div>
                  <div className="text-[11px] text-muted-foreground">Hỗ trợ định dạng .xlsx, .xls (tối đa 10MB)</div>
                </div>
              )}
            </div>
          </div>

          {/* ERROR LIST TABLE IF 400 VALIDATION FAILED */}
          {importErrors.length > 0 && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2">
              <div className="font-bold text-rose-700 dark:text-rose-300 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Có {importErrors.length} dòng dữ liệu không hợp lệ trong file Excel:</span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1 text-[11px]">
                {importErrors.map((err, i) => (
                  <div key={i} className="p-1.5 bg-white dark:bg-slate-900 rounded border border-rose-200 dark:border-rose-900 flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-rose-600">Dòng {err.row} (Cột {err.column})</span>: {err.message}
                    </div>
                    {err.value && (
                      <span className="font-mono text-muted-foreground shrink-0">Giá trị: "{err.value}"</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
