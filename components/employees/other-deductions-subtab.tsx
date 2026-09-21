"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Calendar,
  Check,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Paperclip,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  TrendingDown,
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
  CreateOtherDeductionRequest,
  Employee,
  OtherDeductionItemV3,
  OtherDeductionTypeItem,
  UpdateOtherDeductionRequest,
} from "@/lib/types";
import { formatCurrency, formatDate, formatMonthYear } from "@/lib/utils";

export function OtherDeductionsSubtab({
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
  const [editingRecord, setEditingRecord] = useState<OtherDeductionItemV3 | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetDeleteRecord, setTargetDeleteRecord] = useState<OtherDeductionItemV3 | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      await api.downloadOtherDeductionsImportTemplateV3();
      notify("Đã tải xuống biểu mẫu import khoản giảm trừ (.xlsx)");
    } catch {
      notify("Không thể tải file mẫu. Vui lòng thử lại sau.", "error");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const [previewDocumentOpen, setPreviewDocumentOpen] = useState(false);
  const [previewingRecord, setPreviewingRecord] = useState<OtherDeductionItemV3 | null>(null);

  // Form state
  const [formEmployeeCode, setFormEmployeeCode] = useState("");
  const [formDeductionTypeId, setFormDeductionTypeId] = useState<number | undefined>(undefined);
  const [formAmount, setFormAmount] = useState<number>(500000);
  const [formDecisionNumber, setFormDecisionNumber] = useState("");
  const [formDecisionDate, setFormDecisionDate] = useState(new Date().toISOString().slice(0, 10));
  const [formNote, setFormNote] = useState("");
  const [formFileName, setFormFileName] = useState("");
  const [formFilePath, setFormFilePath] = useState("");

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [projectId, periodFilter, typeFilter]);

  // Query: Deduction Types
  const { data: deductionTypes = [] } = useQuery({
    queryKey: ["web-payroll-other-deduction-types"],
    queryFn: () => api.getOtherDeductionTypesV3(),
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

  // Query: Deductions List
  const {
    data: listResponse,
    isLoading: isListLoading,
    isError: isListError,
    refetch: refetchList,
  } = useQuery({
    queryKey: [
      "web-payroll-other-deductions",
      projectId,
      selectedMonth,
      selectedYear,
      typeFilter,
      searchTerm,
      currentPage,
      pageSize,
    ],
    queryFn: () =>
      api.getOtherDeductionsV3({
        projectId: projectId === "all" ? undefined : projectId,
        month: selectedMonth,
        year: selectedYear,
        deductionTypeId: typeFilter === "all" ? undefined : typeFilter,
        keyword: searchTerm,
        pageIndex: currentPage,
        pageSize,
      }),
  });

  const deductionItems = listResponse?.items ?? [];
  const totalItems = listResponse?.total ?? 0;

  // Compute Summary Statistics
  const { totalAmount, countByType } = useMemo(() => {
    let sum = 0;
    const counts: Record<string, number> = {};
    deductionItems.forEach((item) => {
      sum += Number(item.amount || 0);
      const code = item.deductionCode || "OTHER";
      counts[code] = (counts[code] || 0) + 1;
    });
    return { totalAmount: sum, countByType: counts };
  }, [deductionItems]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingRecord(null);
    setFormEmployeeCode(employees[0]?.code || "");
    setFormDeductionTypeId(deductionTypes[0]?.id);
    setFormAmount(500000);
    setFormDecisionNumber("");
    setFormDecisionDate(new Date().toISOString().slice(0, 10));
    setFormNote("");
    setFormFileName("");
    setFormFilePath("");
    setFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: OtherDeductionItemV3) => {
    setEditingRecord(item);
    setFormEmployeeCode(item.employee.employeeCode);
    setFormDeductionTypeId(item.deductionTypeId ?? deductionTypes[0]?.id);
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
      const payload: CreateOtherDeductionRequest = {
        employeeCode: formEmployeeCode,
        otherDeductionTypeId: formDeductionTypeId,
        amount: Number(formAmount) || 0,
        decisionNumber: formDecisionNumber.trim() || undefined,
        decisionDate: formDecisionDate || undefined,
        note: formNote.trim() || undefined,
        fileName: formFileName.trim() || undefined,
        filePath: formFilePath.trim() || undefined,
      };

      if (editingRecord) {
        return api.updateOtherDeductionV3(editingRecord.id, payload as UpdateOtherDeductionRequest);
      } else {
        return api.createOtherDeductionV3(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web-payroll-other-deductions"] });
      setFormModalOpen(false);
      notify(editingRecord ? "Đã cập nhật khoản giảm trừ thành công!" : "Đã tạo mới khoản giảm trừ thành công!");
    },
    onError: (err: any) => {
      notify(err.message || "Lỗi khi lưu khoản giảm trừ", "error");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.deleteOtherDeductionV3(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web-payroll-other-deductions"] });
      setDeleteModalOpen(false);
      setTargetDeleteRecord(null);
      notify("Đã xóa khoản giảm trừ thành công!");
    },
    onError: (err: any) => {
      notify(err.message || "Lỗi khi xóa khoản giảm trừ", "error");
    },
  });

  // Import Mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      return api.importOtherDeductionsExcelV3(file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web-payroll-other-deductions"] });
      setImportModalOpen(false);
      setImportFile(null);
      notify("Nhập khẩu dữ liệu giảm trừ từ Excel thành công!");
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
              if (!ensureSpecificProject("import khoản giảm trừ")) return;
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
              if (!ensureSpecificProject("thêm mới khoản giảm trừ")) return;
              handleOpenCreate();
            }}
            className="gap-1.5 font-semibold shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm khoản giảm trừ
          </Button>
        </div>
      );
    }
    return () => {
      if (setHeaderAction) setHeaderAction(null);
    };
  }, [setHeaderAction, refetchList, projectId]);

  // Helper Badge Color for Deduction Type
  const renderDeductionTypeBadge = (item: OtherDeductionItemV3) => {
    const code = (item.deductionCode || item.type || "").toUpperCase();
    const name = item.deductionName || item.typeName || "Khoản giảm trừ";

    if (code.includes("ADVANCE") || code.includes("TAM_UNG")) {
      return <Badge tone="info">{name}</Badge>;
    }
    if (code.includes("COMPENSATION") || code.includes("BOI_THUONG")) {
      return <Badge tone="warning">{name}</Badge>;
    }
    if (code.includes("UNIFORM") || code.includes("DONG_PHUC")) {
      return <Badge tone="neutral">{name}</Badge>;
    }
    if (code.includes("FINE") || code.includes("KY_LUAT")) {
      return <Badge tone="danger">{name}</Badge>;
    }
    return <Badge tone="neutral">{name}</Badge>;
  };

  return (
    <div className="other-deductions-subtab space-y-4">
      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Tổng số khoản trừ */}
        <div className="bg-card border border-border rounded-xl p-4 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tổng số khoản trừ
            </span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
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

        {/* Card 2: Tổng tiền giảm trừ */}
        <div className="bg-card border border-border rounded-xl p-4 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              Tổng tiền giảm trừ
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono">
              {isListLoading ? "—" : formatCurrency(totalAmount)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">Khấu trừ trực tiếp tiền lương</p>
        </div>

        {/* Card 3: Tạm ứng lương */}
        <div
          onClick={() => {
            const adv = deductionTypes.find((t) => t.deductionCode.includes("ADVANCE"));
            if (adv) setTypeFilter(String(adv.id));
          }}
          className="bg-card border border-border rounded-xl p-4 transition-all duration-200 hover:shadow-md cursor-pointer hover:border-blue-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              Tạm ứng lương
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <WalletCards className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono">
              {isListLoading ? "—" : countByType["ADVANCE_SALARY"] || countByType["ADVANCE_PAYMENT"] || 0}
            </span>
            <span className="text-xs text-muted-foreground">khoản</span>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">Tạm ứng lương giữa kỳ</p>
        </div>

        {/* Card 4: Bồi thường / Đồng phục */}
        <div className="bg-card border border-border rounded-xl p-4 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Khấu trừ khác
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
              {isListLoading
                ? "—"
                : (countByType["COMPENSATION"] || 0) + (countByType["UNIFORM_FEE"] || 0) + (countByType["OTHER"] || 0)}
            </span>
            <span className="text-xs text-muted-foreground">khoản</span>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">Đồng phục, bồi thường CCDC</p>
        </div>
      </div>

      {/* Main Integrated Table Card */}
      <div className="integrated-table-card">
        {/* Table Toolbar */}
        <div className="table-card-toolbar">
          <div className="flex items-center justify-between gap-3 w-full">
            {/* Left: Record Count */}
            <div className="text-xs font-semibold text-foreground shrink-0">
              Danh sách khoản giảm trừ ({totalItems})
            </div>

            {/* Right: Filters & Search on a single horizontal line */}
            <div className="flex items-center gap-2 sm:gap-3 ml-auto flex-nowrap shrink-0">
              {/* Month Picker */}
              <MonthPicker
                value={periodFilter}
                onChange={setPeriodFilter}
                className="w-[155px] sm:w-[165px] shrink-0"
              />

              {/* Deduction Type Select */}
              {deductionTypes.length > 0 && (
                <SearchableSelect
                  value={typeFilter}
                  onChange={(val) => {
                    setTypeFilter(val || "all");
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: "all", label: "Tất cả loại giảm trừ" },
                    ...deductionTypes.map((t: OtherDeductionTypeItem) => ({
                      value: String(t.id),
                      label: t.deductionName || (t as any).name || t.deductionCode || `Loại #${t.id}`,
                    })),
                  ]}
                  placeholder="Tất cả loại giảm trừ"
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
            message="Không thể tải danh sách khoản giảm trừ."
            retry={() => refetchList()}
          />
        ) : deductionItems.length === 0 ? (
          <EmptyState
            title="Chưa có dữ liệu giảm trừ"
            description={
              searchTerm
                ? "Không tìm thấy khoản giảm trừ phù hợp với từ khóa tìm kiếm."
                : "Chưa ghi nhận khoản giảm trừ nào trong kỳ đã chọn."
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
                    <th style={{ width: "160px" }}>LOẠI GIẢM TRỪ</th>
                    <th style={{ width: "140px" }} className="text-right">SỐ TIỀN KHẤU TRỪ</th>
                    <th style={{ width: "150px" }}>SỐ QĐ / NGÀY</th>
                    <th style={{ minWidth: "180px" }}>LÝ DO / GHI CHÚ</th>
                    <th style={{ width: "100px" }} className="text-center">CHỨNG TỪ</th>
                    <th style={{ width: "120px" }} className="text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {deductionItems.map((item: OtherDeductionItemV3, idx: number) => {
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
                        <td>{renderDeductionTypeBadge(item)}</td>
                        <td className="text-right">
                          <strong className="text-rose-600 dark:text-rose-400 font-bold font-mono text-[13px]">
                            -{formatCurrency(item.amount)}
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
                              title="Chỉnh sửa khoản giảm trừ"
                            >
                              <Pencil className="w-3 h-3 text-slate-500 dark:text-slate-400" /> Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTargetDeleteRecord(item);
                                setDeleteModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 h-7 px-2 text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-md shadow-xs transition-colors cursor-pointer"
                              title="Xóa khoản giảm trừ"
                            >
                              <Trash2 className="w-3 h-3 text-rose-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <TablePaginationFooter
              totalItems={totalItems}
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

      {/* Modal: Thêm mới / Chỉnh sửa khoản giảm trừ */}
      <Modal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        title={editingRecord ? "Chỉnh sửa khoản giảm trừ" : "Thêm mới khoản giảm trừ"}
        description={
          editingRecord
            ? `Cập nhật thông tin khoản giảm trừ cho nhân viên ${editingRecord.employee.fullName}`
            : "Khai báo khoản giảm trừ trực tiếp vào tiền lương của nhân viên."
        }
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setFormModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="gap-1.5"
            >
              <Save className="w-4 h-4" /> {editingRecord ? "Lưu thay đổi" : "Lưu hồ sơ"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-1">
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

          {/* Loại giảm trừ */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Loại giảm trừ <span className="text-rose-500">*</span>
            </label>
            <select
              value={formDeductionTypeId}
              onChange={(e) => setFormDeductionTypeId(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
            >
              {deductionTypes.map((t: OtherDeductionTypeItem) => (
                <option key={t.id} value={t.id}>
                  {t.deductionName}
                </option>
              ))}
            </select>
          </div>

          {/* Số tiền khấu trừ */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Số tiền khấu trừ (VNĐ) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="10000"
              value={formAmount}
              onChange={(e) => setFormAmount(Number(e.target.value))}
              placeholder="VD: 500000"
              className="w-full px-3 py-2 text-xs font-bold text-rose-600 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Số QĐ & Ngày QĐ */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Số quyết định / Chứng từ
              </label>
              <input
                type="text"
                value={formDecisionNumber}
                onChange={(e) => setFormDecisionNumber(e.target.value)}
                placeholder="VD: QĐ-2026/09-01"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Lý do / Ghi chú chi tiết
            </label>
            <textarea
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              rows={3}
              placeholder="Nhập lý do giảm trừ tiền lương..."
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none text-foreground"
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Xác nhận xóa */}
      <Modal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Xóa khoản giảm trừ"
        description={`Bạn có chắc chắn muốn xóa khoản giảm trừ của nhân viên ${targetDeleteRecord?.employee.fullName ?? ""}?`}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (targetDeleteRecord) deleteMutation.mutate(targetDeleteRecord.id);
              }}
            >
              Xác nhận xóa
            </Button>
          </div>
        }
      >
        <p className="text-xs text-muted-foreground">
          Thao tác này không thể hoàn tác. Số tiền <strong>{formatCurrency(targetDeleteRecord?.amount ?? 0)}</strong> sẽ được hoàn trả vào bảng lương của nhân viên.
        </p>
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
        title="Import danh sách Khoản giảm trừ từ Excel"
        description="Tải lên tệp danh sách các khoản giảm trừ lương của nhân sự theo biểu mẫu chuẩn để thêm hàng loạt."
        size="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Step 1: Download Template */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-100">1. Tải biểu mẫu Excel chuẩn</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Sử dụng tệp mẫu để đảm bảo đúng định dạng các cột dữ liệu giảm trừ lương.
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
            type: "deduction",
            employeeCode: previewingRecord.employee.employeeCode,
            employeeName: previewingRecord.employee.fullName,
            period: periodFilter,
            categoryLabel: previewingRecord.deductionName || "Khoản giảm trừ",
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
