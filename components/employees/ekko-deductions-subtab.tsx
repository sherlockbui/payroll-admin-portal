"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CreditCard,
  Download,
  Eye,
  FileSpreadsheet,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  UploadCloud,
  User,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useToast } from "@/components/providers";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  GsDatePicker,
  GsEmployeeSelect,
  GsMoneyInput,
  LoadingBlock,
  Modal,
  MonthPicker,
  SearchInput,
  TablePaginationFooter,
} from "@/components/ui";
import { api, ApiRequestError } from "@/lib/api";
import type {
  CreateEkkoDeductionRequest,
  EkkoDeductionListItemDto,
  Employee,
  ImportEkkoDeductionErrorDto,
  UpdateEkkoDeductionRequest,
} from "@/lib/types";
import { formatCurrency, formatDate, formatMonthYear } from "@/lib/utils";

export function EkkoDeductionsSubtab({
  projectId,
  employees = [],
  setHeaderAction,
}: {
  projectId: string;
  employees?: Employee[];
  setHeaderAction?: (node: ReactNode) => void;
}) {
  const { notify } = useToast();
  const queryClient = useQueryClient();

  // Filters (sync periodFilter to 2026-09 to match default of other subtabs)
  const [periodFilter, setPeriodFilter] = useState("2026-09");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Pagination (default 10 to match other subtabs)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EkkoDeductionListItemDto | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetDeleteRecord, setTargetDeleteRecord] = useState<EkkoDeductionListItemDto | null>(null);

  // Import Modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [importErrors, setImportErrors] = useState<ImportEkkoDeductionErrorDto[] | null>(null);
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [formEmployeeCode, setFormEmployeeCode] = useState("");
  const [formProjectId, setFormProjectId] = useState<string>("");
  const [formAmount, setFormAmount] = useState<number>(1000000);
  const [formEffectiveDate, setFormEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [formTransactionCode, setFormTransactionCode] = useState("");
  const [formNote, setFormNote] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [projectId, periodFilter]);

  // Parse Month / Year from periodFilter (YYYY-MM)
  const { filterMonth, filterYear } = useMemo(() => {
    if (!periodFilter || !periodFilter.includes("-")) {
      return { filterMonth: undefined, filterYear: undefined };
    }
    const [yStr, mStr] = periodFilter.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    return {
      filterMonth: !isNaN(m) ? m : undefined,
      filterYear: !isNaN(y) ? y : undefined,
    };
  }, [periodFilter]);

  // Query: Ekko Deductions List
  const {
    data: listResponse,
    isLoading: isListLoading,
    isFetching,
    isError: isListError,
    error: listError,
    refetch: refetchList,
  } = useQuery({
    queryKey: [
      "web-payroll-ekko-deductions",
      projectId,
      filterMonth,
      filterYear,
      debouncedSearch,
      currentPage,
      pageSize,
    ],
    queryFn: () =>
      api.getEkkoDeductions({
        projectId: projectId === "all" ? undefined : projectId,
        month: filterMonth,
        year: filterYear,
        search: debouncedSearch || undefined,
        pageIndex: currentPage,
        pageSize,
      }),
  });

  const items = listResponse?.items ?? [];
  const totalRow = listResponse?.totalRow ?? 0;

  // Query: Project Employees for Form Modal
  const { data: projectEmployees = [], isLoading: isEmployeesLoading } = useQuery({
    queryKey: ["project-employees-v3", projectId],
    queryFn: () => api.getProjectEmployeesV3(projectId),
    enabled: formModalOpen && !editingRecord,
  });

  // Mutations: Create / Update
  const saveMutation = useMutation({
    mutationFn: async () => {
      const selectedEmp = (projectEmployees.find((e: any) => e.employeeCode === formEmployeeCode || e.code === formEmployeeCode) ||
        employees.find((e) => e.code === formEmployeeCode || e.id === formEmployeeCode)) as any;

      const targetProjId = formProjectId && formProjectId !== "all"
        ? Number(formProjectId)
        : selectedEmp?.projectId
        ? Number(selectedEmp.projectId)
        : projectId && projectId !== "all"
        ? Number(projectId)
        : undefined;

      const payload: CreateEkkoDeductionRequest = {
        employeeCode: formEmployeeCode.trim().toUpperCase(),
        projectId: targetProjId,
        amount: Number(formAmount || 0),
        effectiveDate: formEffectiveDate,
        transactionCode: formTransactionCode.trim() || undefined,
        transactionDate: formEffectiveDate,
        note: formNote.trim() || undefined,
      };

      if (editingRecord) {
        return api.updateEkkoDeduction(editingRecord.id, payload);
      }
      return api.createEkkoDeduction(payload);
    },
    onSuccess: () => {
      notify(editingRecord ? "Cập nhật tạm ứng Ekko thành công!" : "Thêm mới bản ghi tạm ứng Ekko thành công!");
      queryClient.invalidateQueries({ queryKey: ["web-payroll-ekko-deductions"] });
      setFormModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      notify(err?.message || "Lỗi khi lưu bản ghi tạm ứng Ekko", "error");
    },
  });

  // Mutation: Delete
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteEkkoDeduction(id),
    onSuccess: () => {
      notify("Đã xóa bản ghi tạm ứng Ekko thành công!");
      queryClient.invalidateQueries({ queryKey: ["web-payroll-ekko-deductions"] });
      setDeleteModalOpen(false);
      setTargetDeleteRecord(null);
    },
    onError: (err: any) => {
      notify(err?.message || "Lỗi khi xóa bản ghi tạm ứng", "error");
    },
  });

  // Mutation: Import Excel
  const importMutation = useMutation({
    mutationFn: (file: File) => api.importEkkoDeductionsExcel(file),
    onSuccess: (res) => {
      notify(res?.message || `Import thành công! Đã xử lý ${res?.successRows ?? res?.totalRows ?? 0} dòng đối soát Ekko.`);
      queryClient.invalidateQueries({ queryKey: ["web-payroll-ekko-deductions"] });
      setImportModalOpen(false);
      setImportFile(null);
      setImportErrors(null);
      setImportErrorMessage(null);
    },
    onError: (err: any) => {
      let errorList: ImportEkkoDeductionErrorDto[] = [];
      const message = err?.message || "Import đối soát Ekko thất bại";

      if (err instanceof ApiRequestError && err.details) {
        if (Array.isArray(err.details.errors)) {
          errorList = err.details.errors;
        } else if (Array.isArray(err.details)) {
          errorList = err.details;
        }
      }

      setImportErrors(errorList.length > 0 ? errorList : null);
      setImportErrorMessage(message);
      notify(message, "error");
    },
  });

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      await api.downloadEkkoTemplate();
      notify("Đã tải xuống biểu mẫu đối soát Ekko (.xlsx)!");
    } catch (err: any) {
      notify(err?.message || "Không thể tải biểu mẫu. Vui lòng thử lại sau.", "error");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const resetForm = () => {
    setEditingRecord(null);
    setFormEmployeeCode("");
    setFormProjectId(projectId !== "all" ? projectId : "");
    setFormAmount(1000000);
    setFormEffectiveDate(new Date().toISOString().slice(0, 10));
    setFormTransactionCode("");
    setFormNote("");
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setFormModalOpen(true);
  };

  const handleOpenEditModal = (rec: EkkoDeductionListItemDto) => {
    setEditingRecord(rec);
    setFormEmployeeCode(rec.employeeCode);
    setFormProjectId(rec.projectId ? String(rec.projectId) : "");
    setFormAmount(rec.amount);
    setFormEffectiveDate(rec.effectiveDate);
    const txn = rec.decisionNumber && rec.decisionNumber.trim().toLowerCase() !== "không có" ? rec.decisionNumber : "";
    setFormTransactionCode(txn);
    setFormNote(rec.note || "");
    setFormModalOpen(true);
  };

  // Sync Header Actions (Làm mới, Import Excel, Thêm tạm ứng)
  useEffect(() => {
    if (setHeaderAction) {
      setHeaderAction(
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetchList()}
            className="gap-1.5 font-medium shrink-0"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} /> Làm mới
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setImportErrors(null);
              setImportErrorMessage(null);
              setImportFile(null);
              setImportModalOpen(true);
            }}
            className="gap-1.5 font-medium shrink-0"
          >
            <UploadCloud className="w-3.5 h-3.5" /> Import Excel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreateModal}
            className="gap-1.5 font-medium shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm tạm ứng
          </Button>
        </div>
      );
    }
    return () => {
      if (setHeaderAction) setHeaderAction(null);
    };
  }, [setHeaderAction, isFetching, projectId]);

  return (
    <div className="ekko-deductions-subtab space-y-4">
      {/* Main Integrated Table Card */}
      <div className="integrated-table-card">
        {/* Table Toolbar */}
        <div className="table-card-toolbar">
          <div className="flex items-center justify-between gap-3 w-full">
            {/* Left: Record Count */}
            <div className="text-xs font-semibold text-foreground shrink-0">
              Danh sách tạm ứng Ekko ({totalRow})
            </div>

            {/* Right: Filters & Search on a single horizontal line */}
            <div className="flex items-center gap-2 sm:gap-3 ml-auto flex-nowrap shrink-0">
              {/* Month Picker */}
              <div style={{ width: "165px", minWidth: "150px", flexShrink: 0 }}>
                <MonthPicker
                  value={periodFilter}
                  onChange={(val) => {
                    setPeriodFilter(val);
                    setCurrentPage(1);
                  }}
                  className="w-full"
                />
              </div>

              {/* Search Box */}
              <div style={{ width: "240px", minWidth: "180px", flexShrink: 1 }}>
                <SearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Tìm mã NV, tên, mã GD..."
                  containerClassName="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content Table / Loading / Empty */}
        {isListLoading ? (
          <div className="p-6">
            <LoadingBlock rows={6} />
          </div>
        ) : isListError ? (
          <div className="p-6">
            <ErrorState
              message={listError instanceof Error ? listError.message : "Không thể tải dữ liệu tạm ứng Ekko."}
              retry={() => refetchList()}
            />
          </div>
        ) : items.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Không có bản ghi tạm ứng Ekko"
              description={
                searchTerm
                  ? "Không tìm thấy giao dịch tạm ứng phù hợp với điều kiện tìm kiếm."
                  : `Chưa có giao dịch tạm ứng nào từ Ekko trong kỳ ${formatMonthYear(periodFilter)}.`
              }
              action={
                <div className="flex items-center justify-center gap-2 mt-2">
                  {searchTerm && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSearchTerm("")}
                    >
                      Xóa tìm kiếm
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setImportErrors(null);
                      setImportErrorMessage(null);
                      setImportFile(null);
                      setImportModalOpen(true);
                    }}
                    className="gap-1.5"
                  >
                    <UploadCloud className="w-3.5 h-3.5" /> Import file đối soát
                  </Button>
                </div>
              }
            />
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table min-w-[1000px]">
              <thead>
                <tr>
                  <th style={{ width: "45px" }} className="text-center">STT</th>
                  <th style={{ minWidth: "220px" }}>NGƯỜI LAO ĐỘNG</th>
                  <th style={{ width: "160px" }} className="text-right">SỐ TIỀN ỨNG</th>
                  <th style={{ width: "130px" }} className="text-center">NGÀY ỨNG</th>
                  <th style={{ width: "180px" }}>MÃ GIAO DỊCH EKKO</th>
                  <th style={{ minWidth: "180px" }}>GHI CHÚ</th>
                  <th style={{ width: "120px" }} className="text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {items.map((rec, idx) => {
                  const rawStt = (currentPage - 1) * pageSize + idx + 1;
                  const stt = String(rawStt).padStart(2, "0");
                  const hasValidTxn =
                    rec.decisionNumber &&
                    rec.decisionNumber.trim() &&
                    rec.decisionNumber.trim().toLowerCase() !== "không có";

                  return (
                    <tr key={rec.id}>
                      <td className="text-center text-muted font-medium">{stt}</td>
                      <td>
                        <div className="employee-cell-info">
                          <span className="employee-cell-name font-semibold text-foreground">
                            {rec.employeeName || rec.employeeCode || "—"}
                          </span>
                          <span className="employee-cell-sub">
                            <span className="employee-code-badge">{rec.employeeCode}</span>
                            {rec.projectCode && (
                              <span className="text-muted text-[11px] font-medium">
                                · [{rec.projectCode}]
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="text-right">
                        <strong className="text-rose-600 dark:text-rose-400 font-bold font-mono text-[13px]">
                          -{formatCurrency(rec.amount)}
                        </strong>
                      </td>
                      <td className="text-center text-xs text-muted-foreground font-mono">
                        {formatDate(rec.effectiveDate)}
                      </td>
                      <td>
                        {hasValidTxn ? (
                          <div className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {rec.decisionNumber}
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {rec.note || "—"}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(rec)}
                            className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md shadow-xs transition-colors cursor-pointer"
                            title="Chỉnh sửa tạm ứng"
                          >
                            <Pencil className="w-3 h-3 text-slate-500 dark:text-slate-400" /> Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTargetDeleteRecord(rec);
                              setDeleteModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 h-7 px-2 text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-md shadow-xs transition-colors cursor-pointer"
                            title="Xóa tạm ứng"
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
        )}

        {/* Footer Pagination */}
        {totalRow > 0 && (
          <TablePaginationFooter
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalRow}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* Modal: Thêm mới / Chỉnh sửa tạm ứng Ekko */}
      <Modal
        open={formModalOpen}
        onOpenChange={(open) => {
          setFormModalOpen(open);
          if (!open) resetForm();
        }}
        title={editingRecord ? "Chỉnh sửa tạm ứng Ekko" : "Thêm mới tạm ứng Ekko"}
        description={
          editingRecord
            ? `Cập nhật thông tin giao dịch tạm ứng của nhân viên ${editingRecord.employeeName || editingRecord.employeeCode}.`
            : "Nhập thủ công thông tin một giao dịch tạm ứng qua ứng dụng Ekko."
        }
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
              variant="primary"
              size="sm"
              loading={saveMutation.isPending}
              disabled={saveMutation.isPending || (!editingRecord && !formEmployeeCode) || formAmount <= 0}
              onClick={() => saveMutation.mutate()}
              className="text-xs bg-primary hover:bg-primary-hover text-white gap-1.5 font-medium px-4 py-2 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-white" />
              <span className="text-white">
                {saveMutation.isPending ? "Đang lưu..." : editingRecord ? "Lưu thay đổi" : "Lưu bản ghi"}
              </span>
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
              <div className="text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-foreground flex items-center justify-between">
                <span>{editingRecord.employeeName || editingRecord.employeeCode}</span>
                <span className="font-mono text-muted-foreground text-[11px] font-normal">
                  [{editingRecord.employeeCode}] {editingRecord.projectCode ? `· ${editingRecord.projectCode}` : ""}
                </span>
              </div>
            ) : (
              <GsEmployeeSelect
                employees={projectEmployees}
                value={formEmployeeCode}
                onChange={(code) => setFormEmployeeCode(code)}
                placeholder="-- Chọn người lao động --"
                isLoading={isEmployeesLoading}
              />
            )}
          </div>

          {/* Số tiền tạm ứng (VNĐ) */}
          <GsMoneyInput
            label="Số tiền tạm ứng (VNĐ)"
            required
            value={formAmount}
            onChange={(val) => setFormAmount(val ?? 0)}
            placeholder="Nhập số tiền tạm ứng (VD: 2.000.000)..."
            inputClassName="text-rose-600 font-bold"
          />

          {/* Ngày phát sinh & Mã giao dịch Ekko */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <GsDatePicker
                label="Ngày phát sinh tạm ứng"
                required
                value={formEffectiveDate}
                onChange={(dateStr) => setFormEffectiveDate(dateStr || new Date().toISOString().slice(0, 10))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Mã giao dịch Ekko / Mã đối soát
              </label>
              <input
                type="text"
                value={formTransactionCode}
                onChange={(e) => setFormTransactionCode(e.target.value)}
                placeholder="VD: EKKO_TXN_001..."
                className="w-full h-[38px] px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xs hover:border-slate-400 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground font-mono transition-colors"
              />
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Ghi chú
            </label>
            <input
              type="text"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="Ghi chú đối soát nội bộ..."
              className="w-full h-[38px] px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xs hover:border-slate-400 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground transition-colors"
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Xác nhận xóa */}
      <Modal
        open={deleteModalOpen}
        onOpenChange={(open) => {
          setDeleteModalOpen(open);
          if (!open) setTargetDeleteRecord(null);
        }}
        title="Xác nhận xóa giao dịch tạm ứng?"
        description="Giao dịch tạm ứng này sẽ bị xóa khỏi kỳ đối soát hiện tại."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDeleteModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleteMutation.isPending}
              onClick={() => targetDeleteRecord && deleteMutation.mutate(targetDeleteRecord.id)}
              className="gap-1.5 font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa bản ghi
            </Button>
          </div>
        }
      >
        <p className="text-xs text-muted-foreground leading-relaxed">
          Bạn có chắc chắn muốn xóa giao dịch tạm ứng của nhân viên{" "}
          <strong className="text-foreground font-semibold">
            {targetDeleteRecord?.employeeName} ({targetDeleteRecord?.employeeCode})
          </strong>{" "}
          với số tiền <strong className="text-rose-600 font-mono">-{formatCurrency(targetDeleteRecord?.amount || 0)}</strong> không?
        </p>
      </Modal>

      {/* Modal: Import Excel đối soát */}
      <Modal
        open={importModalOpen}
        onOpenChange={(open) => {
          setImportModalOpen(open);
          if (!open) {
            setImportFile(null);
            setImportErrors(null);
            setImportErrorMessage(null);
          }
        }}
        title="Import đối soát tạm ứng Ekko từ Excel"
        description="Tải lên tệp Excel đối soát tạm ứng lương Ekko (áp dụng chung toàn bộ dự án) theo biểu mẫu chuẩn."
        size="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Step 1: Download Template */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-100">1. Tải biểu mẫu Excel chuẩn</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                File mẫu chuẩn chứa các cột: Mã dự án (*), Mã nhân viên (*), Họ và tên, Số tiền tạm ứng (*), Ngày áp dụng (*), Mã GD Ekko, Ghi chú.
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
                if (file) {
                  setImportFile(file);
                  setImportErrors(null);
                  setImportErrorMessage(null);
                }
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
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImportFile(file);
                  setImportErrors(null);
                  setImportErrorMessage(null);
                }}
                accept=".xlsx,.xls"
                className="hidden"
              />

              {importFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                  <div className="text-left">
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      {importFile.name}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {(importFile.size / 1024).toFixed(1)} KB • Bấm để chọn tệp khác
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700 dark:text-slate-200">
                    Kéo thả tệp Excel vào đây hoặc bấm để chọn
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Chấp nhận .xlsx, .xls tối đa 10MB • Hỗ trợ đối soát liên dự án cùng lúc
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Error Preview Grid (All-or-Nothing) */}
          {importErrors && importErrors.length > 0 && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-2">
              <div className="font-semibold text-rose-800 dark:text-rose-200 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>{importErrorMessage || `Phát hiện ${importErrors.length} dòng lỗi trong file:`}</span>
                </div>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                Toàn bộ dữ liệu trong file đã bị hủy bỏ để đảm bảo tính toàn vẹn (All-or-Nothing). Vui lòng sửa các dòng lỗi chi tiết bên dưới và tải lên lại.
              </p>
              <div className="max-h-48 overflow-y-auto border border-rose-200 dark:border-rose-900/50 rounded-lg bg-white dark:bg-slate-900">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-rose-100/60 text-rose-900 border-b border-rose-200 font-semibold">
                      <th className="py-1.5 px-2 w-16 text-center">Dòng</th>
                      <th className="py-1.5 px-2 min-w-[90px]">Mã NV</th>
                      <th className="py-1.5 px-2 min-w-[110px]">Cột bị lỗi</th>
                      <th className="py-1.5 px-2 min-w-[100px]">Giá trị</th>
                      <th className="py-1.5 px-2">Nguyên nhân lỗi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100">
                    {importErrors.map((err, idx) => (
                      <tr key={idx} className="hover:bg-rose-50/50">
                        <td className="py-1 px-2 text-center font-mono font-bold text-rose-700">#{err.row}</td>
                        <td className="py-1 px-2 font-mono font-semibold">{err.employeeCode || "—"}</td>
                        <td className="py-1 px-2 font-medium">{err.column}</td>
                        <td className="py-1 px-2 font-mono text-slate-600">{err.value || <span className="italic text-muted-foreground/60">(Trống)</span>}</td>
                        <td className="py-1 px-2 text-rose-700 dark:text-rose-400 font-medium">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setImportModalOpen(false);
                setImportFile(null);
                setImportErrors(null);
                setImportErrorMessage(null);
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
    </div>
  );
}
