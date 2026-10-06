"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Info,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  Upload,
  UploadCloud,
  Users,
  Wallet,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useState, type ReactNode } from "react";
import { useToast } from "@/components/providers";
import {
  Badge,
  Button,
  EmptyState,
  GsDatePicker,
  GsMoneyInput,
  LoadingBlock,
  Modal,
  SearchInput,
  TablePaginationFooter,
  TableRowActions,
} from "@/components/ui";
import { api, ApiRequestError } from "@/lib/api";
import type {
  EmployeePolicyDetailDto,
  EmployeePolicyDetailItemDto,
  EmployeePolicyListItemDto,
  ImportPolicyErrorDetail,
  SaveEmployeePolicyItemDto,
  SaveEmployeePolicyRequest,
} from "@/lib/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export type SalaryPolicyMode = "ALL" | "CUSTOM" | "PROJECT_DEFAULT";

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

  // Primary Query from Server
  const policiesQuery = useQuery({
    queryKey: ["employee-policies", projectId, debouncedSearch, currentPage, pageSize],
    queryFn: () =>
      api.getEmployeePolicies({
        projectId: projectId !== "all" ? projectId : undefined,
        keyword: debouncedSearch || undefined,
        pageIndex: currentPage,
        pageSize: pageSize,
      }),
  });

  const isLoading = policiesQuery.isLoading;
  const data = policiesQuery.data;
  const rawItems = data?.items || [];
  const totalRow = data?.totalRow || 0;

  // Client-side Mode Filter (Tất cả / Thỏa thuận riêng / Chuẩn nhóm) on current page
  const displayedItems = useMemo(() => {
    if (selectedMode === "CUSTOM") {
      return rawItems.filter(
        (i) => i.hasBasicSalaryOverride || i.policies.some((p) => p.hasOverride)
      );
    }
    if (selectedMode === "PROJECT_DEFAULT") {
      return rawItems.filter(
        (i) => !i.hasBasicSalaryOverride && !i.policies.some((p) => p.hasOverride)
      );
    }
    return rawItems;
  }, [rawItems, selectedMode]);

  // KPI Summary Statistics
  const stats = useMemo(() => {
    const defaultCount = rawItems.filter(
      (i) => !i.hasBasicSalaryOverride && !i.policies.some((p) => p.hasOverride)
    ).length;
    const customCount = rawItems.filter(
      (i) => i.hasBasicSalaryOverride || i.policies.some((p) => p.hasOverride)
    ).length;

    const totalMonthlySalary = rawItems.reduce((sum, i) => {
      const allows = i.policies
        .filter((p) => isAllowancePolicy(p) && (Number(p.value) > 0 || p.hasOverride))
        .reduce((s, p) => s + (Number(p.value) || 0), 0);
      return sum + (i.basicSalary || 0) + allows;
    }, 0);

    return {
      total: totalRow,
      defaultCount,
      customCount,
      totalMonthlySalary,
    };
  }, [rawItems, totalRow]);

  // ================= EDIT MODAL STATE =================
  const [editEmployeeCode, setEditEmployeeCode] = useState<string | null>(null);
  const [editDetail, setEditDetail] = useState<EmployeePolicyDetailDto | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editIsCustom, setEditIsCustom] = useState(false);
  const [editBaseSalary, setEditBaseSalary] = useState(0);
  const [editInsuranceSalary, setEditInsuranceSalary] = useState(0);
  const [editEffectiveFrom, setEditEffectiveFrom] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Editable Policy Items state
  interface EditablePolicyItem extends EmployeePolicyDetailItemDto {
    isEnabled: boolean;
    amount: number;
    isExpanded?: boolean;
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

      const hasAnyOverride =
        detail.policies.some((p) => p.hasOverride) ||
        Boolean(detail.basicSalary && detail.basicSalary > 0) ||
        Boolean(detail.insuranceSalary && detail.insuranceSalary > 0);

      setEditIsCustom(hasAnyOverride);
      setEditBaseSalary(detail.basicSalary || 0);
      setEditInsuranceSalary(detail.insuranceSalary || 0);
      setEditEffectiveFrom(
        detail.policies.find((p) => p.effectiveFrom)?.effectiveFrom || new Date().toISOString().slice(0, 10)
      );

      const mappedPolicies: EditablePolicyItem[] = detail.policies
        .filter(isAllowancePolicy)
        .map((p) => {
          const valNum = Number(p.employeeValue || p.effectiveValue || p.groupValue || 0);
          return {
            ...p,
            isEnabled: p.hasOverride || (p.groupValue !== null && p.groupValue !== "" && p.groupValue !== "0"),
            amount: isNaN(valNum) ? 0 : valNum,
            effectiveTo: p.effectiveTo || "",
            note: p.note || "",
            isExpanded: Boolean(p.note || p.effectiveTo),
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

  // Save Edit Handler
  const handleSaveEdit = async () => {
    if (!editDetail || !projectId || projectId === "all") return;

    setSavingEdit(true);
    try {
      const payload: SaveEmployeePolicyRequest = {
        projectId: Number(projectId),
        employeeCode: editDetail.employeeCode,
        effectiveFrom: editEffectiveFrom || new Date().toISOString().slice(0, 10),
        basicSalary: editIsCustom ? editBaseSalary : null,
        insuranceSalary: editIsCustom ? editInsuranceSalary : null,
        policies: editablePolicies
          .filter((p) => p.isEnabled)
          .map((p) => ({
            policyItemId: p.policyItemId,
            value: String(p.amount || 0),
            effectiveTo: p.effectiveTo || null,
            note: p.note || null,
            status: 1,
          })),
      };

      await api.saveEmployeePolicy(editDetail.employeeCode, payload);
      notify(`Đã lưu cấu hình thỏa thuận riêng cho nhân sự ${editDetail.employeeName}!`);
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
      // Refresh modal detail
      const updated = await api.getEmployeePolicyDetail(editDetail.employeeCode, projectId);
      setEditDetail(updated);
      setEditablePolicies((prev) =>
        prev.map((p) => {
          if (p.policyItemId === policyItemId) {
            const defVal = Number(p.groupValue || 0);
            return {
              ...p,
              hasOverride: false,
              employeeValue: null,
              effectiveValue: p.groupValue,
              amount: isNaN(defVal) ? 0 : defVal,
              note: null,
              effectiveTo: null,
            };
          }
          return p;
        })
      );
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

      if (overriddenItems.length === 0 && !detail.basicSalary && !detail.insuranceSalary) {
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

  const handleDownloadTemplate = () => {
    const url = api.downloadEmployeePolicyTemplate();
    window.open(url, "_blank");
    notify("Đang tải xuống biểu mẫu Excel chuẩn...");
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
      notify(`Import thành công ${res.successRows}/${res.totalRows} bản ghi thỏa thuận riêng!`);
      queryClient.invalidateQueries({ queryKey: ["employee-policies"] });
      setImportModalOpen(false);
      setImportFile(null);
    } catch (err: any) {
      if (err.errorData?.errors && Array.isArray(err.errorData.errors)) {
        setImportErrors(err.errorData.errors);
        notify(err.message || "File import có dòng bị lỗi dữ liệu.", "error");
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
          onClick={handleOpenImport}
          className="gap-1.5 font-semibold text-xs h-8 px-3"
        >
          <UploadCloud className="w-3.5 h-3.5 text-primary" /> Import Excel
        </Button>
      </div>
    );
    return () => setHeaderAction(null);
  }, [setHeaderAction, projectId]);

  // Live calculation in Edit Modal
  const editCalculations = useMemo(() => {
    const totalAllowance = editablePolicies
      .filter((a) => a.isEnabled)
      .reduce((s, a) => s + (Number(a.amount) || 0), 0);

    const defaultAllowanceTotal = editablePolicies
      .filter((a) => a.isEnabled)
      .reduce((s, a) => s + (Number(a.groupValue) || 0), 0);

    const deltaTotal = totalAllowance - defaultAllowanceTotal;

    return { totalAllowance, deltaTotal };
  }, [editablePolicies]);

  return (
    <div className="space-y-4">
      {/* 1. KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Employees */}
        <div
          onClick={() => setSelectedMode("ALL")}
          className={cn(
            "p-3.5 rounded-xl border bg-white dark:bg-slate-900 shadow-xs cursor-pointer transition-all hover:border-slate-400",
            selectedMode === "ALL" ? "ring-2 ring-primary/40 border-primary" : "border-slate-200 dark:border-slate-800"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Tổng nhân sự</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</div>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">Toàn bộ nhân sự trong phạm vi lọc</p>
        </div>

        {/* Project Default */}
        <div
          onClick={() => setSelectedMode("PROJECT_DEFAULT")}
          className={cn(
            "p-3.5 rounded-xl border bg-white dark:bg-slate-900 shadow-xs cursor-pointer transition-all hover:border-emerald-400",
            selectedMode === "PROJECT_DEFAULT" ? "ring-2 ring-emerald-500/40 border-emerald-500" : "border-slate-200 dark:border-slate-800"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Theo chuẩn Nhóm</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.defaultCount}</div>
          <p className="mt-1 text-xs text-emerald-700/80 leading-relaxed">Kế thừa 100% định mức nhóm quy định</p>
        </div>

        {/* Custom Override */}
        <div
          onClick={() => setSelectedMode("CUSTOM")}
          className={cn(
            "p-3.5 rounded-xl border bg-white dark:bg-slate-900 shadow-xs cursor-pointer transition-all hover:border-primary/60",
            selectedMode === "CUSTOM" ? "ring-2 ring-primary/40 border-primary" : "border-slate-200 dark:border-slate-800"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary">Thỏa thuận riêng</span>
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-primary">{stats.customCount}</div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">Có lương hoặc phụ cấp thỏa thuận riêng</p>
        </div>

        {/* Total Salary Fund */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tổng thu nhập cố định</span>
            <Wallet className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-foreground font-mono">
            {formatCurrency(stats.totalMonthlySalary)}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Lương cơ bản &amp; các khoản phụ cấp cố định
          </div>
        </div>
      </div>

      {/* 2. Main Integrated Table Card */}
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
                Tất cả ({rawItems.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedMode("PROJECT_DEFAULT")}
                className={`pill-btn success ${selectedMode === "PROJECT_DEFAULT" ? "active" : ""}`}
              >
                Theo chuẩn nhóm ({stats.defaultCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedMode("CUSTOM")}
                className={`pill-btn ${selectedMode === "CUSTOM" ? "active" : ""}`}
              >
                Thỏa thuận riêng ({stats.customCount})
              </button>
            </div>

            {/* Right: Search Input */}
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Tìm theo mã NV (GID), họ tên..."
              containerClassName="min-w-[260px] max-w-[340px]"
            />
          </div>
        </div>

        {/* Loading / Error / Table Content */}
        {isLoading ? (
          <div className="py-12">
            <LoadingBlock rows={6} />
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="py-14">
            <EmptyState
              title="Không tìm thấy dữ liệu"
              description={
                searchTerm || selectedMode !== "ALL"
                  ? "Không tìm thấy nhân sự phù hợp với từ khóa tìm kiếm hoặc bộ lọc hiện tại."
                  : "Chưa có dữ liệu nhân sự và chế độ lương cho phạm vi dự án này."
              }
              action={
                searchTerm || selectedMode !== "ALL" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedMode("ALL");
                    }}
                    className="gap-1.5 text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Xóa bộ lọc
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="data-table-wrap">
            <div className="data-table-scroll">
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
                        <td>
                          {validAllowances.length === 0 ? (
                            <span className="text-muted-foreground italic text-xs">
                              — Không có phụ cấp —
                            </span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5 py-0.5 max-w-[420px]">
                              {validAllowances.slice(0, 3).map((p) => {
                                const shortName = getShortPolicyName(p.policyName);
                                const isCustom = p.hasOverride;
                                return (
                                  <span
                                    key={p.policyItemId}
                                    className={cn(
                                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border transition-colors shrink-0",
                                      isCustom
                                        ? "bg-primary/10 text-primary border-primary/25 font-semibold"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                    )}
                                    title={`${p.policyName}: ${formatCurrency(p.value || 0)}${isCustom ? " (Thỏa thuận riêng)" : " (Chuẩn nhóm)"}`}
                                  >
                                    <span>{shortName}:</span>
                                    <span className="font-mono font-bold text-foreground">
                                      {formatCurrency(p.value || 0)}
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
                                        `${p.policyName}: ${formatCurrency(p.value || 0)}${p.hasOverride ? " (Thỏa thuận riêng)" : ""}`
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
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <div>
                {editIsCustom && (
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
                  disabled={savingEdit || loadingDetail}
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
            <div className="space-y-4 py-1 text-xs">
              {/* Mode Switcher Banner */}
              <div
                className={cn(
                  "p-3 rounded-xl border flex items-center justify-between transition-colors",
                  editIsCustom
                    ? "bg-primary/5 border-primary/20 text-slate-900 dark:text-slate-100"
                    : "bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                )}
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    {editIsCustom ? <Sparkles className="w-4 h-4 text-primary" /> : <Building2 className="w-4 h-4 text-slate-500" />}
                    <span>{editIsCustom ? "Chế độ: Thỏa thuận riêng (Ghi đè định mức chuẩn của nhóm)" : "Chế độ: Kế thừa theo chuẩn Nhóm"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground m-0">
                    {editIsCustom
                      ? "Nhân sự này sẽ nhận mức lương cơ bản và các khoản phụ cấp thỏa thuận riêng dưới đây."
                      : "Mức lương và phụ cấp tự động đồng bộ theo bảng quy chế của nhóm đối tượng."}
                  </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer shrink-0 ml-3 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                  <input
                    type="checkbox"
                    checked={editIsCustom}
                    onChange={(e) => setEditIsCustom(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                  <span className="font-semibold text-xs text-foreground">Bật thỏa thuận riêng</span>
                </label>
              </div>

              {/* Side-by-Side Comparison Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* LEFT COLUMN: MỨC CHUẨN CỦA NHÓM (THAM CHIẾU) */}
                <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" /> 1. Định mức Chuẩn Nhóm
                    </span>
                    <span className="text-[11px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-medium">Khóa</span>
                  </div>

                  {/* Group Default Policy Summary */}
                  <div className="space-y-2">
                    <label className="block text-slate-500 text-[11px] font-medium">Các khoản phụ cấp chuẩn nhóm:</label>
                    <div className="space-y-1.5 bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 max-h-[260px] overflow-y-auto">
                      {editDetail.policies.filter(isAllowancePolicy).map((p) => (
                        <div key={p.policyItemId} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs py-1">
                          <span className="text-slate-600 dark:text-slate-300 font-medium mr-2" title={p.policyName}>{p.policyName}</span>
                          <span className="font-bold font-mono text-slate-700 dark:text-slate-300 shrink-0">
                            {p.groupValue && Number(p.groupValue) > 0 ? formatCurrency(p.groupValue) : "0 đ"}
                          </span>
                        </div>
                      ))}
                      {editDetail.policies.filter(isAllowancePolicy).length === 0 && (
                        <div className="text-slate-400 italic text-center py-2">Dự án không có phụ cấp mặc định</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: MỨC ÁP DỤNG RIÊNG CHO NHÂN SỰ NÀY */}
                <div
                  className={cn(
                    "p-3.5 rounded-xl border space-y-3 transition-colors",
                    editIsCustom
                      ? "bg-white dark:bg-slate-900 border-primary/30 ring-1 ring-primary/20 shadow-xs"
                      : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700"
                  )}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-primary uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" /> 2. Mức thỏa thuận riêng
                    </span>
                    {editCalculations.deltaTotal !== 0 && (
                      <span className={cn(
                        "text-[11px] px-2 py-0.5 rounded font-bold font-mono",
                        editCalculations.deltaTotal > 0
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                          : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                      )}>
                        {editCalculations.deltaTotal > 0 ? `+${formatCurrency(editCalculations.deltaTotal)}` : formatCurrency(editCalculations.deltaTotal)}
                      </span>
                    )}
                  </div>

                  {/* Base Salary & Insurance Salary Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <GsMoneyInput
                        label="Lương cơ bản riêng"
                        disabled={!editIsCustom}
                        value={editBaseSalary}
                        onChange={setEditBaseSalary}
                        placeholder="0"
                        inputClassName="font-bold text-xs"
                      />
                    </div>
                    <div>
                      <GsMoneyInput
                        label="Lương đóng BHXH riêng"
                        disabled={!editIsCustom}
                        value={editInsuranceSalary}
                        onChange={setEditInsuranceSalary}
                        placeholder="0"
                        inputClassName="font-bold text-xs"
                      />
                    </div>
                  </div>

                  {/* Allowances List Editable */}
                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Khoản phụ cấp áp dụng:
                    </label>
                    <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                      {editablePolicies.map((a, i) => (
                        <div
                          key={a.policyItemId}
                          className={cn(
                            "p-2.5 rounded-lg border transition-colors space-y-1.5",
                            a.isEnabled
                              ? "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-xs"
                              : "bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none min-w-0 flex-1">
                              <input
                                type="checkbox"
                                disabled={!editIsCustom}
                                checked={a.isEnabled}
                                onChange={(e) => {
                                  const copy = [...editablePolicies];
                                  copy[i].isEnabled = e.target.checked;
                                  setEditablePolicies(copy);
                                }}
                                className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5 shrink-0"
                              />
                              <span
                                className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate"
                                title={a.policyName}
                              >
                                {a.policyName}
                                {a.hasOverride && (
                                  <span className="ml-1 text-[10px] text-primary font-bold">
                                    ★ (Ghi đè)
                                  </span>
                                )}
                              </span>
                            </label>

                            <div className="flex items-center gap-1 shrink-0">
                              <div className="w-28">
                                <GsMoneyInput
                                  showWords={false}
                                  disabled={!editIsCustom || !a.isEnabled}
                                  value={a.amount}
                                  onChange={(val) => {
                                    const copy = [...editablePolicies];
                                    copy[i].amount = val;
                                    setEditablePolicies(copy);
                                  }}
                                  className="h-7 text-xs"
                                  inputClassName="text-right font-bold h-7 py-1 px-2 text-xs"
                                  placeholder="0"
                                />
                              </div>

                              {/* Expand Note/Date */}
                              <button
                                type="button"
                                onClick={() => {
                                  const copy = [...editablePolicies];
                                  copy[i].isExpanded = !copy[i].isExpanded;
                                  setEditablePolicies(copy);
                                }}
                                title="Ghi chú & Kỳ hạn"
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                              >
                                {a.isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>

                              {/* Inline Restore Button */}
                              {a.hasOverride && (
                                <button
                                  type="button"
                                  onClick={() => handleInlineRestorePolicy(a.policyItemId, a.policyName)}
                                  title="Khôi phục về mức chuẩn nhóm"
                                  className="p-1 rounded text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Expanded Details: Note & Effective To */}
                          {a.isExpanded && a.isEnabled && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <label className="text-slate-500 block mb-0.5">Hạn áp dụng:</label>
                                <input
                                  type="date"
                                  value={a.effectiveTo ? a.effectiveTo.slice(0, 10) : ""}
                                  onChange={(e) => {
                                    const copy = [...editablePolicies];
                                    copy[i].effectiveTo = e.target.value;
                                    setEditablePolicies(copy);
                                  }}
                                  className="w-full h-7 px-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                />
                              </div>
                              <div>
                                <label className="text-slate-500 block mb-0.5">Lý do / Căn cứ:</label>
                                <input
                                  type="text"
                                  placeholder="VD: Phụ lục HĐLĐ..."
                                  value={a.note || ""}
                                  onChange={(e) => {
                                    const copy = [...editablePolicies];
                                    copy[i].note = e.target.value;
                                    setEditablePolicies(copy);
                                  }}
                                  className="w-full h-7 px-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Estimated Summary */}
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">Tổng thu nhập cố định dự tính:</span>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    (Lương CB: {formatCurrency(editIsCustom ? editBaseSalary : 0)} + Phụ cấp: {formatCurrency(editCalculations.totalAllowance)})
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-primary font-mono">
                    {formatCurrency((editIsCustom ? editBaseSalary : 0) + editCalculations.totalAllowance)}
                  </div>
                </div>
              </div>

              {/* Effective From */}
              {editIsCustom && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="max-w-xs">
                    <GsDatePicker
                      label="Ngày bắt đầu hiệu lực thỏa thuận"
                      required
                      value={editEffectiveFrom}
                      onChange={setEditEffectiveFrom}
                      placeholder="dd/mm/yyyy"
                    />
                  </div>
                </div>
              )}
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
              onClick={handleDownloadTemplate}
              className="gap-1 text-xs shrink-0 font-medium"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" /> Tải file mẫu (.xlsx)
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
