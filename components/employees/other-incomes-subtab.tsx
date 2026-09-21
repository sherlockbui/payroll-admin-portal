"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Award,
  Calendar,
  Check,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Gift,
  History,
  Paperclip,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  UploadCloud,
  User,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DecisionDocumentPreviewModal } from "@/components/employees/decision-preview-modal";
import { useToast } from "@/components/providers";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Modal,
  MonthPicker,
  SearchInput,
  SearchableSelect,
  TablePaginationFooter,
} from "@/components/ui";
import { api } from "@/lib/api";
import type {
  CreateOtherIncomeRequest,
  Employee,
  OtherIncomeItemV3,
  OtherIncomeTypeItem,
  UpdateOtherIncomeRequest,
} from "@/lib/types";
import { formatCurrency, formatDate, formatMonthYear } from "@/lib/utils";

export function OtherIncomesSubtab({
  projectId,
  employees,
  setHeaderAction,
}: {
  projectId: string;
  employees: Employee[];
  setHeaderAction?: (node: ReactNode) => void;
}) {
  const { notify } = useToast();
  const queryClient = useQueryClient();

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("2026-09");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OtherIncomeItemV3 | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetDeleteRecord, setTargetDeleteRecord] = useState<OtherIncomeItemV3 | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      await api.downloadOtherIncomesImportTemplateV3();
      notify("Đã tải xuống biểu mẫu import thu nhập khác (.xlsx)");
    } catch {
      notify("Không thể tải file mẫu. Vui lòng thử lại sau.", "error");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const [previewDocumentOpen, setPreviewDocumentOpen] = useState(false);
  const [previewingRecord, setPreviewingRecord] = useState<OtherIncomeItemV3 | null>(null);

  // Form state
  const [formEmployeeCode, setFormEmployeeCode] = useState("");
  const [formIncomeTypeId, setFormIncomeTypeId] = useState<number | undefined>(undefined);
  const [formAmount, setFormAmount] = useState<number>(1000000);
  const [formDecisionNumber, setFormDecisionNumber] = useState("");
  const [formDecisionDate, setFormDecisionDate] = useState(new Date().toISOString().slice(0, 10));
  const [formNote, setFormNote] = useState("");
  const [formFileName, setFormFileName] = useState("");
  const [formFilePath, setFormFilePath] = useState("");

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [projectId, periodFilter, typeFilter]);

  // Query: Income Types
  const { data: incomeTypes = [] } = useQuery({
    queryKey: ["web-payroll-other-income-types"],
    queryFn: () => api.getOtherIncomeTypesV3(),
    staleTime: 1000 * 60 * 10,
  });

  // Parse periodFilter (YYYY-MM)
  const { selectedMonth, selectedYear } = useMemo(() => {
    if (periodFilter && periodFilter.includes("-")) {
      const parts = periodFilter.split("-");
      return { selectedYear: Number(parts[0]), selectedMonth: Number(parts[1]) };
    }
    return { selectedMonth: undefined, selectedYear: undefined };
  }, [periodFilter]);

  // Query: Incomes List
  const {
    data: listResponse,
    isLoading: isListLoading,
    isError: isListError,
    refetch: refetchList,
  } = useQuery({
    queryKey: [
      "web-payroll-other-incomes",
      projectId,
      selectedMonth,
      selectedYear,
      typeFilter,
      searchTerm,
      currentPage,
      pageSize,
    ],
    queryFn: () =>
      api.getOtherIncomesV3({
        projectId: projectId === "all" ? undefined : projectId,
        month: selectedMonth,
        year: selectedYear,
        incomeTypeId: typeFilter === "all" ? undefined : typeFilter,
        keyword: searchTerm,
        pageIndex: currentPage,
        pageSize,
      }),
  });

  const incomeItems = listResponse?.items ?? [];
  const totalItems = listResponse?.total ?? 0;

  // Compute Summary Statistics
  const { totalAmount, bonusAmount, otherAmount } = useMemo(() => {
    let sum = 0;
    let bonus = 0;
    incomeItems.forEach((item) => {
      const amt = Number(item.amount || 0);
      sum += amt;
      const name = (item.incomeName || item.typeName || "").toLowerCase();
      const code = (item.incomeCode || item.type || "").toLowerCase();
      if (name.includes("thưởng") || name.includes("bonus") || name.includes("sáng kiến") || code.includes("bonus")) {
        bonus += amt;
      }
    });
    return {
      totalAmount: sum,
      bonusAmount: bonus,
      otherAmount: sum - bonus,
    };
  }, [incomeItems]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingRecord(null);
    setFormEmployeeCode(employees[0]?.code || "");
    setFormIncomeTypeId(incomeTypes[0]?.id);
    setFormAmount(1000000);
    setFormDecisionNumber("");
    setFormDecisionDate(new Date().toISOString().slice(0, 10));
    setFormNote("");
    setFormFileName("");
    setFormFilePath("");
    setFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: OtherIncomeItemV3) => {
    setEditingRecord(item);
    setFormEmployeeCode(item.employee.employeeCode);
    setFormIncomeTypeId(item.incomeTypeId ?? item.otherIncomeTypeId ?? incomeTypes[0]?.id);
    setFormAmount(item.amount);
    setFormDecisionNumber(item.decisionNumber || "");
    setFormDecisionDate(item.decisionDate ? item.decisionDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setFormNote(item.note || item.reason || "");
    setFormFileName(item.fileName || "");
    setFormFilePath(item.filePath || "");
    setFormModalOpen(true);
  };

  // Save Mutation (Create / Update)
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: CreateOtherIncomeRequest = {
        employeeCode: formEmployeeCode,
        otherIncomeTypeId: formIncomeTypeId,
        amount: Number(formAmount) || 0,
        decisionNumber: formDecisionNumber.trim() || undefined,
        decisionDate: formDecisionDate || undefined,
        note: formNote.trim() || undefined,
        reason: formNote.trim() || undefined,
        fileName: formFileName.trim() || undefined,
        filePath: formFilePath.trim() || undefined,
      };

      if (editingRecord) {
        return api.updateOtherIncomeV3(editingRecord.id, payload as UpdateOtherIncomeRequest);
      } else {
        return api.createOtherIncomeV3(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web-payroll-other-incomes"] });
      setFormModalOpen(false);
      notify(editingRecord ? "Đã cập nhật khoản thu nhập thành công!" : "Đã tạo mới khoản thu nhập thành công!");
    },
    onError: (err: any) => {
      notify(err.message || "Lỗi khi lưu khoản thu nhập", "error");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.deleteOtherIncomeV3(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web-payroll-other-incomes"] });
      setDeleteModalOpen(false);
      setTargetDeleteRecord(null);
      notify("Đã xóa khoản thu nhập thành công!");
    },
    onError: (err: any) => {
      notify(err.message || "Lỗi khi xóa khoản thu nhập", "error");
    },
  });

  // Import Mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      return api.importOtherIncomesExcelV3(file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web-payroll-other-incomes"] });
      setImportModalOpen(false);
      setImportFile(null);
      notify("Nhập khẩu dữ liệu thu nhập từ Excel thành công!");
    },
    onError: (err: any) => {
      notify(err.message || "Lỗi khi import file Excel", "error");
    },
  });

  const ensureSpecificProject = (actionName: string = "thao tác này") => {
    if (!projectId || projectId === "all") {
      notify(`Vui lòng chọn một dự án cụ thể ở thanh công cụ phía trên trước khi ${actionName}!`, "warning");
      return false;
    }
    return true;
  };

  // Sync Header Actions
  useEffect(() => {
    if (setHeaderAction) {
      setHeaderAction(
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetchList()}
            className="gap-1.5 font-medium shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Làm mới
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (!ensureSpecificProject("import thu nhập khác")) return;
              setImportModalOpen(true);
            }}
            className="gap-1.5 font-medium shrink-0"
          >
            <UploadCloud className="w-3.5 h-3.5" /> Import Excel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (!ensureSpecificProject("thêm mới khoản thu nhập khác")) return;
              handleOpenCreate();
            }}
            className="gap-1.5 font-semibold shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm khoản thu nhập
          </Button>
        </div>
      );
    }
    return () => {
      if (setHeaderAction) setHeaderAction(null);
    };
  }, [setHeaderAction, refetchList, projectId]);

  // Helper Badge Color for Income Type
  const renderIncomeTypeBadge = (item: OtherIncomeItemV3) => {
    const code = (item.incomeCode || item.type || "").toUpperCase();
    const name = item.incomeName || item.typeName || "Thu nhập khác";

    if (code.includes("HOT_BONUS") || code.includes("SANG_KIEN")) {
      return <Badge tone="success">{name}</Badge>;
    }
    if (code.includes("PERFORMANCE") || code.includes("NANG_SUAT")) {
      return <Badge tone="info">{name}</Badge>;
    }
    if (code.includes("HOLIDAY") || code.includes("LE_TET")) {
      return <Badge tone="warning">{name}</Badge>;
    }
    if (code.includes("SUPPORT") || code.includes("HO_TRO")) {
      return <Badge tone="info">{name}</Badge>;
    }
    return <Badge tone="neutral">{name}</Badge>;
  };

  return (
    <div className="other-incomes-subtab space-y-4">
      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Tổng số khoản thu nhập */}
        <div className="bg-card border border-border rounded-xl p-4 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tổng số khoản thu nhập
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <ReceiptText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {isListLoading ? "—" : totalItems}
            </span>
            <span className="text-xs text-muted-foreground">khoản</span>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            Trong kỳ {formatMonthYear(periodFilter)}
          </p>
        </div>

        {/* Card 2: Tổng tiền thu nhập */}
        <div className="bg-card border border-border rounded-xl p-4 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Tổng tiền thu nhập
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
              {isListLoading ? "—" : formatCurrency(totalAmount)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">Cộng trực tiếp vào tiền lương</p>
        </div>

        {/* Card 3: Thưởng & Đãi ngộ */}
        <div className="bg-card border border-border rounded-xl p-4 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Thưởng & Đãi ngộ
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
              {isListLoading ? "—" : formatCurrency(bonusAmount)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">Thưởng nóng, năng suất, lễ tết</p>
        </div>

        {/* Card 4: Thu nhập khác */}
        <div className="bg-card border border-border rounded-xl p-4 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              Thu nhập khác
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono">
              {isListLoading ? "—" : formatCurrency(otherAmount)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">Hỗ trợ dự án & thu nhập bổ sung</p>
        </div>
      </div>

      {/* Main Integrated Table Card */}
      <div className="integrated-table-card">
        {/* Table Toolbar */}
        <div className="table-card-toolbar">
          <div className="flex items-center justify-between gap-3 w-full">
            {/* Left: Record Count */}
            <div className="text-xs font-semibold text-foreground shrink-0">
              Danh sách khoản thu nhập ({totalItems})
            </div>

            {/* Right: Filters & Search on a single horizontal line */}
            <div className="flex items-center gap-2 sm:gap-3 ml-auto flex-nowrap shrink-0">
              {/* Month Picker */}
              <MonthPicker
                value={periodFilter}
                onChange={setPeriodFilter}
                className="w-[155px] sm:w-[165px] shrink-0"
              />

              {/* Income Type Select */}
              {incomeTypes.length > 0 && (
                <SearchableSelect
                  value={typeFilter}
                  onChange={(val) => {
                    setTypeFilter(val || "all");
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: "all", label: "Tất cả loại thu nhập" },
                    ...incomeTypes.map((t: OtherIncomeTypeItem) => ({
                      value: String(t.id),
                      label: t.incomeName || t.name || t.incomeCode || `Loại #${t.id}`,
                    })),
                  ]}
                  placeholder="Tất cả loại thu nhập"
                  className="w-[190px] sm:w-[205px] shrink-0"
                  allowClear={false}
                />
              )}

              {/* Search Box */}
              <SearchInput
                value={searchTerm}
                onChange={(val) => {
                  setSearchTerm(val);
                  setCurrentPage(1);
                }}
                placeholder="Tìm mã NV, tên, số QĐ..."
                containerClassName="w-[180px] sm:w-[220px] lg:w-[250px] shrink min-w-[140px]"
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        {isListLoading ? (
          <LoadingBlock rows={6} />
        ) : isListError ? (
          <ErrorState
            message="Không thể tải danh sách khoản thu nhập."
            retry={() => refetchList()}
          />
        ) : incomeItems.length === 0 ? (
          <EmptyState
            title="Chưa có dữ liệu thu nhập"
            description={
              searchTerm
                ? "Không tìm thấy khoản thu nhập phù hợp với từ khóa tìm kiếm."
                : "Chưa ghi nhận khoản thu nhập nào trong kỳ đã chọn."
            }
          />
        ) : (
          <div className="data-table-wrap">
            <div className="data-table-scroll">
              <table className="data-table min-w-[1000px]">
                <thead>
                  <tr>
                    <th style={{ width: "45px" }} className="text-center">STT</th>
                    <th style={{ minWidth: "190px" }}>NGƯỜI LAO ĐỘNG</th>
                    <th style={{ width: "180px" }}>LOẠI THU NHẬP</th>
                    <th style={{ width: "150px" }} className="text-right">SỐ TIỀN THU NHẬP</th>
                    <th style={{ width: "150px" }}>SỐ QĐ / NGÀY</th>
                    <th style={{ minWidth: "180px" }}>LÝ DO / GHI CHÚ</th>
                    <th style={{ width: "100px" }} className="text-center">CHỨNG TỪ</th>
                    <th style={{ width: "120px" }} className="text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeItems.map((item: OtherIncomeItemV3, idx: number) => {
                    const rawStt = (currentPage - 1) * pageSize + idx + 1;
                    const stt = String(rawStt).padStart(2, "0");

                    return (
                      <tr key={item.id || idx}>
                        <td className="text-center text-muted font-medium">{stt}</td>
                        <td>
                          <div className="employee-cell-info">
                            <span className="employee-cell-name font-semibold text-foreground">
                              {item.employee.fullName || "—"}
                            </span>
                            <span className="employee-cell-sub">
                              <span className="employee-code-badge">{item.employee.employeeCode}</span>
                              {item.employee.project?.projectCode && (
                                <span className="text-muted text-[11px] font-medium">
                                  · [{item.employee.project.projectCode}]
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td>{renderIncomeTypeBadge(item)}</td>
                        <td className="text-right">
                          <strong className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-[13px]">
                            +{formatCurrency(item.amount)}
                          </strong>
                        </td>
                        <td>
                          <div className="text-xs font-medium text-foreground">
                            {item.decisionNumber || "—"}
                          </div>
                          {item.decisionDate && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {formatDate(item.decisionDate)}
                            </div>
                          )}
                        </td>
                        <td className="text-xs text-muted-foreground">
                          {item.note || item.reason || "—"}
                        </td>
                        <td className="text-center">
                          {item.fileName || item.filePath || item.attachment ? (
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewingRecord(item);
                                setPreviewDocumentOpen(true);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                              title="Xem file đính kèm"
                            >
                              <Paperclip className="w-3.5 h-3.5" /> Xem
                            </button>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md shadow-xs transition-colors cursor-pointer"
                              title="Chỉnh sửa khoản thu nhập"
                            >
                              <Pencil className="w-3 h-3 text-slate-500 dark:text-slate-400" /> Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTargetDeleteRecord(item);
                                setDeleteModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-md shadow-xs transition-colors cursor-pointer"
                              title="Xóa khoản thu nhập"
                            >
                              <Trash2 className="w-3 h-3 text-rose-500 dark:text-rose-400" /> Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <TablePaginationFooter
            totalItems={totalItems}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* Modal: Create / Edit Record */}
      <Modal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        title={editingRecord ? "Chỉnh sửa khoản thu nhập khác" : "Thêm mới khoản thu nhập khác"}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFormModalOpen(false)}
              className="text-xs"
            >
              Hủy bỏ
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="text-xs bg-primary hover:bg-primary/90 text-white gap-1.5 !text-white"
            >
              <Save className="w-3.5 h-3.5 text-white" />
              <span className="!text-white">{saveMutation.isPending ? "Đang lưu..." : "Lưu dữ liệu"}</span>
            </Button>
          </div>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4 text-xs"
        >
          {/* Nhân viên */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Nhân viên <span className="text-rose-500">*</span>
            </label>
            {editingRecord ? (
              <div className="text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-foreground">
                {editingRecord.employee.fullName} ({editingRecord.employee.employeeCode})
              </div>
            ) : (
              <select
                value={formEmployeeCode}
                onChange={(e) => setFormEmployeeCode(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
              >
                {employees.map((emp) => (
                  <option key={emp.code || emp.id} value={emp.code || emp.id}>
                    {emp.name || (emp as any).fullName || emp.code} ({emp.code || emp.id})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Loại thu nhập */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Loại thu nhập <span className="text-rose-500">*</span>
            </label>
            <select
              value={formIncomeTypeId}
              onChange={(e) => setFormIncomeTypeId(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
            >
              {incomeTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.incomeName || t.name || t.incomeCode || `Loại #${t.id}`}
                </option>
              ))}
            </select>
          </div>

          {/* Số tiền */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Số tiền thu nhập (VNĐ) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={1000}
              step={10000}
              value={formAmount}
              onChange={(e) => setFormAmount(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground font-mono"
              placeholder="Nhập số tiền..."
              required
            />
          </div>

          {/* Số quyết định & Ngày quyết định */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Số quyết định
              </label>
              <input
                type="text"
                value={formDecisionNumber}
                onChange={(e) => setFormDecisionNumber(e.target.value)}
                placeholder="VD: QĐ-TN-2026/01"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Ngày quyết định
              </label>
              <input
                type="date"
                value={formDecisionDate}
                onChange={(e) => setFormDecisionDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
              />
            </div>
          </div>

          {/* Lý do / Ghi chú */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Ghi chú / Lý do
            </label>
            <textarea
              rows={2}
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="Nhập ghi chú chi tiết..."
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground resize-none"
            />
          </div>

          {/* Đính kèm file URL hoặc Tên tệp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Tên tệp chứng từ
              </label>
              <input
                type="text"
                value={formFileName}
                onChange={(e) => setFormFileName(e.target.value)}
                placeholder="VD: QD_Thuong_Nong.pdf"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Đường dẫn tệp (URL / FilePath)
              </label>
              <input
                type="text"
                value={formFilePath}
                onChange={(e) => setFormFilePath(e.target.value)}
                placeholder="VD: /documents/qd-thuong-nong.pdf"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Confirmation */}
      <Modal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Xác nhận xóa khoản thu nhập khác"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={() => targetDeleteRecord && deleteMutation.mutate(targetDeleteRecord.id)}
              disabled={deleteMutation.isPending}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1.5 !text-white"
            >
              <Trash2 className="w-3.5 h-3.5 text-white" />
              <span className="!text-white">{deleteMutation.isPending ? "Đang xóa..." : "Xác nhận xóa"}</span>
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3 py-2">
          <div className="p-2.5 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-1.5">
            <p className="font-semibold text-foreground">
              Bạn có chắc chắn muốn xóa khoản thu nhập này?
            </p>
            {targetDeleteRecord && (
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1 text-muted-foreground">
                <p>
                  Nhân viên:{" "}
                  <strong className="text-foreground">
                    {targetDeleteRecord.employee.fullName} ({targetDeleteRecord.employee.employeeCode})
                  </strong>
                </p>
                <p>
                  Loại thu nhập:{" "}
                  <strong className="text-foreground">
                    {targetDeleteRecord.incomeName || targetDeleteRecord.typeName || "Thu nhập khác"}
                  </strong>
                </p>
                <p>
                  Số tiền:{" "}
                  <strong className="text-emerald-600">
                    {formatCurrency(targetDeleteRecord.amount)}
                  </strong>
                </p>
              </div>
            )}
            <p className="text-muted-foreground text-[11px]">
              Thao tác này không thể hoàn tác và khoản thu nhập sẽ bị xóa khỏi bảng tính lương kỳ này.
            </p>
          </div>
        </div>
      </Modal>

      {/* ================= Modal: Import Excel Wizard ================= */}
      <Modal
        open={importModalOpen}
        onOpenChange={(open) => {
          setImportModalOpen(open);
          if (!open) {
            setImportFile(null);
            setIsDragging(false);
          }
        }}
        title="Import danh sách Thu nhập khác từ Excel"
        description="Tải lên tệp danh sách các khoản thu nhập khác theo biểu mẫu chuẩn để thêm hàng loạt."
        size="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Step 1: Download Template */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-100">1. Tải biểu mẫu Excel chuẩn</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Sử dụng tệp mẫu để đảm bảo đúng định dạng các cột dữ liệu thu nhập khác.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={downloadingTemplate}
              onClick={handleDownloadTemplate}
              className="gap-1.5 text-xs font-semibold shrink-0"
            >
              <Download className="w-3.5 h-3.5" /> Tải file mẫu (.xlsx)
            </Button>
          </div>

          {/* Step 2: Upload File Dropzone */}
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-100 mb-1.5">2. Chọn tệp dữ liệu đã điền</div>
            <div
              onClick={() => importFileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) setImportFile(file);
              }}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : importFile
                  ? "border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20"
                  : "border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              <input
                type="file"
                ref={importFileInputRef}
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              {importFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                  <div className="text-left">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{importFile.name}</div>
                    <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {(importFile.size / 1024).toFixed(1)} KB • Bấm để chọn tệp khác
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700 dark:text-slate-200">Kéo thả tệp Excel vào đây hoặc bấm để chọn</p>
                  <p className="text-[11px] text-slate-400 mt-1">Chấp nhận .xlsx, .xls tối đa 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setImportModalOpen(false);
                setImportFile(null);
              }}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!importFile}
              loading={importMutation.isPending}
              onClick={() => {
                if (importFile) importMutation.mutate(importFile);
              }}
              className="gap-1.5 font-semibold"
            >
              <Upload className="w-3.5 h-3.5" /> Bắt đầu Import
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Preview Document */}
      {previewingRecord && (
        <DecisionDocumentPreviewModal
          open={previewDocumentOpen}
          onOpenChange={setPreviewDocumentOpen}
          data={{
            type: "income",
            employeeCode: previewingRecord.employee.employeeCode,
            employeeName: previewingRecord.employee.fullName,
            period: periodFilter,
            categoryLabel: previewingRecord.incomeName || previewingRecord.typeName || "Khoản thu nhập khác",
            amount: previewingRecord.amount,
            decisionNo: previewingRecord.decisionNumber || undefined,
            decisionDate: previewingRecord.decisionDate || undefined,
            reason: previewingRecord.note || previewingRecord.reason || undefined,
            attachmentName: previewingRecord.fileName || undefined,
            attachmentUrl: previewingRecord.filePath || undefined,
          }}
        />
      )}
    </div>
  );
}
