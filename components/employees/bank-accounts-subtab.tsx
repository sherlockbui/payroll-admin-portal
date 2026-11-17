"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  History,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Upload,
  UploadCloud,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useToast } from "@/components/providers";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Modal,
  SearchInput,
  SearchableSelect,
  StatusBadge,
  TablePaginationFooter,
} from "@/components/ui";
import { api, ApiRequestError } from "@/lib/api";
import type {
  EmployeeBankAccountItemDto,
  ImportBankAccountErrorDto,
  SaveBankAccountRequest,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

const POPULAR_BANKS = [
  "Vietcombank",
  "MB Bank",
  "Techcombank",
  "BIDV",
  "VietinBank",
  "Agribank",
  "VPBank",
  "ACB",
  "TPBank",
  "Sacombank",
  "HDBank",
  "VIB",
  "MSB",
  "OCB",
  "SHB",
  "SeABank",
  "Eximbank",
  "LPBank",
  "Shinhan Bank",
  "Woori Bank",
];

export function BankAccountsSubtab({
  projectId,
  setHeaderAction,
}: {
  projectId?: string;
  setHeaderAction?: (node: ReactNode) => void;
}) {
  const { notify } = useToast();
  const queryClient = useQueryClient();

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // "all" | "1" | "0"
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EmployeeBankAccountItemDto | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyEmployeeCode, setHistoryEmployeeCode] = useState<string | null>(null);
  const [historyEmployeeName, setHistoryEmployeeName] = useState<string>("");

  // Import Modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [importErrors, setImportErrors] = useState<ImportBankAccountErrorDto[] | null>(null);
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields state
  const [formEmployeeCode, setFormEmployeeCode] = useState("");
  const [formCitizenId, setFormCitizenId] = useState("");
  const [formBankName, setFormBankName] = useState("");
  const [formBankAccountNumber, setFormBankAccountNumber] = useState("");
  const [formBankBranch, setFormBankBranch] = useState("");
  const [formBankAccountName, setFormBankAccountName] = useState("");
  const [copiedStkId, setCopiedStkId] = useState<number | null>(null);

  // Query: Bank Accounts list
  const {
    data: listResponse,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [
      "web-payroll-bank-accounts",
      projectId,
      debouncedSearch,
      statusFilter,
      currentPage,
      pageSize,
    ],
    queryFn: () =>
      api.getBankAccounts({
        search: debouncedSearch.trim() || undefined,
        projectId: projectId && projectId !== "all" ? projectId : undefined,
        status: statusFilter !== "all" ? Number(statusFilter) : undefined,
        pageIndex: currentPage,
        pageSize,
      }),
  });

  // Query: History for selected employee
  const {
    data: historyRecords = [],
    isLoading: isHistoryLoading,
    isError: isHistoryError,
  } = useQuery({
    queryKey: ["web-payroll-bank-accounts-history", historyEmployeeCode],
    queryFn: () =>
      historyEmployeeCode ? api.getBankAccountHistory(historyEmployeeCode) : Promise.resolve([]),
    enabled: !!historyEmployeeCode && historyModalOpen,
  });

  // Mutation: Save Bank Account
  const saveMutation = useMutation({
    mutationFn: (payload: SaveBankAccountRequest) => api.saveBankAccount(payload),
    onSuccess: (res) => {
      notify("Lưu thông tin tài khoản ngân hàng thành công!");
      queryClient.invalidateQueries({ queryKey: ["web-payroll-bank-accounts"] });
      setFormModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      const msg = err?.message || "Lỗi khi lưu thông tin tài khoản ngân hàng";
      notify(msg, "error");
    },
  });

  // Mutation: Import Excel
  const importMutation = useMutation({
    mutationFn: (file: File) => api.importBankAccountsExcel(file),
    onSuccess: (res) => {
      notify(`Import thành công! Đã xử lý ${res?.successRows ?? res?.totalRows ?? 0} tài khoản.`);
      queryClient.invalidateQueries({ queryKey: ["web-payroll-bank-accounts"] });
      setImportModalOpen(false);
      setImportFile(null);
      setImportErrors(null);
      setImportErrorMessage(null);
    },
    onError: (err: any) => {
      let errorList: ImportBankAccountErrorDto[] = [];
      let message = err?.message || "Import thất bại";

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

  const resetForm = () => {
    setEditingRecord(null);
    setFormEmployeeCode("");
    setFormCitizenId("");
    setFormBankName("");
    setFormBankAccountNumber("");
    setFormBankBranch("");
    setFormBankAccountName("");
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setFormModalOpen(true);
  };

  const handleOpenEditModal = (rec: EmployeeBankAccountItemDto) => {
    setEditingRecord(rec);
    setFormEmployeeCode(rec.employeeCode);
    setFormCitizenId(rec.citizenId || "");
    setFormBankName(rec.bankName || "");
    setFormBankAccountNumber(rec.bankAccountNumber || "");
    setFormBankBranch(rec.bankBranch || "");
    setFormBankAccountName(rec.bankAccountName && rec.bankAccountName !== "N/A" ? rec.bankAccountName : "");
    setFormModalOpen(true);
  };

  const handleOpenHistoryModal = (rec: EmployeeBankAccountItemDto) => {
    setHistoryEmployeeCode(rec.employeeCode);
    setHistoryEmployeeName(rec.employeeName);
    setHistoryModalOpen(true);
  };

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      await api.downloadBankAccountImportTemplate();
      notify("Đã tải xuống biểu mẫu Excel import tài khoản ngân hàng!");
    } catch (err: any) {
      notify(err?.message || "Không thể tải biểu mẫu. Vui lòng thử lại sau.", "error");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleCopyStk = (id: number, stk: string) => {
    if (!stk) return;
    navigator.clipboard?.writeText(stk).then(() => {
      setCopiedStkId(id);
      setTimeout(() => setCopiedStkId(null), 1800);
      notify("Đã sao chép số tài khoản vào clipboard!");
    });
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmployeeCode.trim()) {
      notify("Vui lòng nhập Mã nhân viên (*)", "warning");
      return;
    }
    if (!formCitizenId.trim()) {
      notify("Vui lòng nhập Số CCCD / CMND (*)", "warning");
      return;
    }
    if (!formBankName.trim()) {
      notify("Vui lòng nhập Tên ngân hàng (*)", "warning");
      return;
    }
    if (!formBankAccountNumber.trim()) {
      notify("Vui lòng nhập Số tài khoản ngân hàng (*)", "warning");
      return;
    }

    const payload: SaveBankAccountRequest = {
      employeeCode: formEmployeeCode.trim().toUpperCase(),
      citizenId: formCitizenId.trim(),
      bankName: formBankName.trim(),
      bankAccountNumber: formBankAccountNumber.trim(),
      bankBranch: formBankBranch.trim() || undefined,
      bankAccountName: formBankAccountName.trim() ? formBankAccountName.trim().toUpperCase() : undefined,
    };

    saveMutation.mutate(payload);
  };

  // Mount header actions
  useEffect(() => {
    if (setHeaderAction) {
      setHeaderAction(
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            loading={isFetching}
            className="gap-1.5 text-xs font-semibold"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Làm mới
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
            className="gap-1.5 text-xs font-semibold"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Import Excel
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreateModal}
            className="gap-1.5 text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm tài khoản
          </Button>
        </div>
      );
    }
    return () => {
      if (setHeaderAction) setHeaderAction(null);
    };
  }, [setHeaderAction, downloadingTemplate, isFetching, refetch]);

  const items = listResponse?.items ?? [];
  const totalRow = listResponse?.totalRow ?? 0;

  return (
    <div className="space-y-4">
      <datalist id="popular-banks-list">
        {POPULAR_BANKS.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>

      {/* Toolbar & Filters */}
      <div className="p-3 bg-card border border-border rounded-xl shadow-xs flex flex-wrap items-center justify-end gap-2.5">
        <div style={{ width: "160px" }}>
          <SearchableSelect
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val || "all");
              setCurrentPage(1);
            }}
            options={[
              { value: "all", label: "Tất cả" },
              { value: "1", label: "Đang sử dụng" },
              { value: "0", label: "Đã thay thế" },
            ]}
            placeholder="Tất cả"
            allowClear={false}
            searchable={false}
          />
        </div>

        <div className="w-full sm:w-72">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Tìm mã NV, họ tên, STK, ngân hàng..."
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            <LoadingBlock rows={5} />
          </div>
        ) : isError ? (
          <div className="p-8">
            <ErrorState
              message={(error as any)?.message || "Không thể tải danh sách tài khoản ngân hàng. Vui lòng kiểm tra lại kết nối API."}
              retry={() => refetch()}
            />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="Không có tài khoản ngân hàng nào"
              description={
                debouncedSearch || statusFilter !== "all"
                  ? "Không tìm thấy dữ liệu khớp với bộ lọc tìm kiếm hiện tại."
                  : "Chưa có tài khoản ngân hàng nào trong hệ thống. Hãy thêm mới hoặc import từ file Excel."
              }
              action={
                <Button size="sm" variant="primary" onClick={handleOpenCreateModal} className="gap-1.5 mt-2">
                  <Plus className="w-3.5 h-3.5" /> Thêm tài khoản đầu tiên
                </Button>
              }
            />
          </div>
        ) : (
          <div className="data-table-wrap border-0 rounded-none shadow-none">
            <div className="data-table-scroll">
              <table className="data-table min-w-[1050px] whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="text-center w-12">#</th>
                    <th className="min-w-[100px]">Mã NV</th>
                    <th className="min-w-[150px]">Họ và tên</th>
                    <th className="min-w-[125px]">Số CCCD / CMND</th>
                    <th className="min-w-[180px]">Ngân hàng &amp; Chi nhánh</th>
                    <th className="min-w-[160px]">Số tài khoản</th>
                    <th className="min-w-[150px]">Chủ tài khoản</th>
                    <th className="text-center min-w-[120px]">Trạng thái</th>
                    <th className="min-w-[130px]">Người tạo</th>
                    <th className="text-right min-w-[100px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, idx) => {
                    const stt = (currentPage - 1) * pageSize + idx + 1;
                    const isCurrentCopied = copiedStkId === row.id;

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-muted/30 transition-colors group"
                      >
                        <td className="text-center font-medium text-muted-foreground">
                          {stt}
                        </td>

                        <td className="font-semibold text-foreground">
                          {row.employeeCode}
                        </td>

                        <td className="font-medium text-foreground">
                          {row.employeeName}
                        </td>

                        <td className="font-mono text-muted-foreground">
                          {row.citizenId || "—"}
                        </td>

                        <td>
                          <div className="flex items-center gap-1.5 font-medium text-foreground">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>{row.bankName}</span>
                          </div>
                          {row.bankBranch ? (
                            <div className="text-[11px] text-muted-foreground pl-5">
                              {row.bankBranch}
                            </div>
                          ) : null}
                        </td>

                        <td>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-medium tracking-wide text-foreground">
                              {row.bankAccountNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyStk(row.id, row.bankAccountNumber)}
                              title="Sao chép số tài khoản"
                              className="p-1 rounded text-muted-foreground hover:text-teal-700 hover:bg-teal-50 dark:hover:text-teal-300 dark:hover:bg-teal-950/40 transition-colors"
                            >
                              {isCurrentCopied ? (
                                <Check className="w-3.5 h-3.5 text-teal-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="font-medium text-foreground uppercase">
                          {row.bankAccountName && row.bankAccountName !== "N/A"
                            ? row.bankAccountName
                            : row.employeeName}
                        </td>

                        <td className="text-center">
                          {row.status === 1 ? (
                            <StatusBadge tone="success">Đang sử dụng</StatusBadge>
                          ) : (
                            <StatusBadge tone="neutral">Đã thay thế</StatusBadge>
                          )}
                        </td>

                        <td className="text-muted-foreground text-xs">
                          <div>{row.createdByName || "—"}</div>
                          <div className="text-[10px] text-muted-foreground/75">{formatDate(row.createdAt)}</div>
                        </td>

                        <td className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(row)}
                              title="Chỉnh sửa tài khoản"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-teal-700 hover:bg-teal-50 dark:hover:text-teal-300 dark:hover:bg-teal-950/40 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenHistoryModal(row)}
                              title="Xem lịch sử"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-teal-700 hover:bg-teal-50 dark:hover:text-teal-300 dark:hover:bg-teal-950/40 transition-colors"
                            >
                              <History className="w-3.5 h-3.5" />
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

        {totalRow > 0 && (
          <TablePaginationFooter
            totalItems={totalRow}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
          />
        )}
      </div>

      {/* Modal: Thêm mới / Cập nhật tài khoản */}
      <Modal
        open={formModalOpen}
        onOpenChange={(open) => {
          setFormModalOpen(open);
          if (!open) resetForm();
        }}
        title={editingRecord ? `Cập nhật tài khoản: ${editingRecord.employeeName || editingRecord.employeeCode}` : "Thêm mới tài khoản ngân hàng"}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setFormModalOpen(false);
                resetForm();
              }}
              disabled={saveMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitForm}
              loading={saveMutation.isPending}
              className="gap-1.5 font-semibold"
            >
              {editingRecord ? "Lưu cập nhật" : "Tạo tài khoản"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitForm} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Mã nhân viên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formEmployeeCode}
                onChange={(e) => setFormEmployeeCode(e.target.value.toUpperCase())}
                placeholder="VD: NV001, T140-06304..."
                disabled={!!editingRecord}
                className="w-full h-8 px-2.5 bg-background border border-border rounded-lg text-xs font-semibold uppercase disabled:bg-muted disabled:opacity-75 focus:ring-1 focus:ring-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Số CCCD / CMND <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formCitizenId}
                onChange={(e) => setFormCitizenId(e.target.value.replace(/\D/g, ""))}
                placeholder="Nhập 9 hoặc 12 chữ số..."
                maxLength={12}
                className="w-full h-8 px-2.5 bg-background border border-border rounded-lg text-xs font-mono focus:ring-1 focus:ring-primary focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Tên ngân hàng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                list="popular-banks-list"
                value={formBankName}
                onChange={(e) => setFormBankName(e.target.value)}
                placeholder="VD: Vietcombank, BIDV, MB Bank..."
                className="w-full h-8 px-2.5 bg-background border border-border rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Số tài khoản ngân hàng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formBankAccountNumber}
                onChange={(e) => setFormBankAccountNumber(e.target.value.replace(/[^0-9a-zA-Z]/g, ""))}
                placeholder="VD: 0123456789..."
                className="w-full h-8 px-2.5 bg-background border border-border rounded-lg text-xs font-mono font-bold tracking-wider focus:ring-1 focus:ring-primary focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Chi nhánh ngân hàng
              </label>
              <input
                type="text"
                value={formBankBranch}
                onChange={(e) => setFormBankBranch(e.target.value)}
                placeholder="VD: CN Thủ Thiêm, CN Tân Bình..."
                className="w-full h-8 px-2.5 bg-background border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Tên chủ tài khoản
              </label>
              <input
                type="text"
                value={formBankAccountName}
                onChange={(e) => setFormBankAccountName(e.target.value.toUpperCase())}
                placeholder="Để trống hệ thống sẽ lấy Họ tên NV"
                className="w-full h-8 px-2.5 bg-background border border-border rounded-lg text-xs uppercase font-medium focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal: Lịch sử tài khoản ngân hàng */}
      <Modal
        open={historyModalOpen}
        onOpenChange={(open) => {
          setHistoryModalOpen(open);
          if (!open) {
            setHistoryEmployeeCode(null);
            setHistoryEmployeeName("");
          }
        }}
        title={`Lịch sử tài khoản: ${historyEmployeeName || historyEmployeeCode}`}
        size="lg"
        footer={
          <div className="flex items-center justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setHistoryModalOpen(false)}
            >
              Đóng
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {isHistoryLoading ? (
            <div className="py-6">
              <LoadingBlock rows={3} />
            </div>
          ) : isHistoryError ? (
            <div className="py-4 text-center text-xs text-red-500">
              Không thể tải lịch sử tài khoản. Vui lòng thử lại sau.
            </div>
          ) : historyRecords.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Nhân viên chưa có bản ghi lịch sử tài khoản nào.
            </div>
          ) : (
            <div className="data-table-wrap">
              <div className="data-table-scroll">
                <table className="data-table min-w-[720px] whitespace-nowrap">
                  <thead>
                    <tr>
                      <th className="text-center w-28">Trạng thái</th>
                      <th className="min-w-[150px]">Ngân hàng</th>
                      <th className="min-w-[140px]">Số tài khoản</th>
                      <th className="min-w-[140px]">Chủ tài khoản</th>
                      <th className="min-w-[110px]">CCCD</th>
                      <th className="text-center w-24">Phiên bản</th>
                      <th className="min-w-[160px]">Thời gian hiệu lực</th>
                      <th className="min-w-[140px]">Người cập nhật</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRecords.map((h) => (
                      <tr
                        key={h.id}
                        className="hover:bg-muted/30"
                      >
                        <td className="text-center">
                          {h.status === 1 ? (
                            <StatusBadge tone="success">Đang sử dụng</StatusBadge>
                          ) : (
                            <StatusBadge tone="neutral">Đã thay thế</StatusBadge>
                          )}
                        </td>
                        <td className="font-medium text-foreground">
                          {h.bankName}
                          {h.bankBranch ? <div className="text-[10px] text-muted-foreground font-normal">{h.bankBranch}</div> : null}
                        </td>
                        <td className="font-mono font-medium text-foreground">
                          {h.bankAccountNumber}
                        </td>
                        <td className="uppercase text-foreground">
                          {h.bankAccountName && h.bankAccountName !== "N/A" ? h.bankAccountName : h.employeeName}
                        </td>
                        <td className="font-mono text-muted-foreground">{h.citizenId || "—"}</td>
                        <td className="text-center font-normal text-muted-foreground text-xs">
                          v{h.version}
                        </td>
                        <td className="text-[11px]">
                          <div>Từ: {formatDate(h.effectiveFrom)}</div>
                          {h.effectiveTo ? (
                            <div className="text-muted-foreground">Đến: {formatDate(h.effectiveTo)}</div>
                          ) : (
                            <div className="text-muted-foreground">(Hiện tại)</div>
                          )}
                        </td>
                        <td className="text-[11px] text-muted-foreground">
                          <div>{h.createdByName || "—"}</div>
                          <div className="text-[10px] opacity-75">{formatDate(h.createdAt)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal: Import Excel */}
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
        title="Import tài khoản ngân hàng từ Excel"
        description="Tải lên tệp danh sách tài khoản ngân hàng theo biểu mẫu chuẩn để cập nhật hàng loạt vào hệ thống."
        size="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Step 1: Download Template */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-100">1. Tải biểu mẫu Excel chuẩn</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Biểu mẫu chứa các cột: Mã nhân viên (*), Số CCCD (*), Tên ngân hàng (*), Số tài khoản (*), Chi nhánh, Chủ TK...
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
                    Chấp nhận .xlsx, .xls tối đa 10MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Error List display if Import Failed */}
          {importErrors && importErrors.length > 0 && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-2">
              <div className="font-semibold text-rose-800 dark:text-rose-200 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>{importErrorMessage || `Phát hiện ${importErrors.length} dòng lỗi trong file:`}</span>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto border border-rose-200 dark:border-rose-900/50 rounded-lg bg-white dark:bg-slate-900">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-rose-100/60 text-rose-900 border-b border-rose-200 font-semibold">
                      <th className="py-1.5 px-2 w-16 text-center">Dòng</th>
                      <th className="py-1.5 px-2">Mã NV</th>
                      <th className="py-1.5 px-2">Cột</th>
                      <th className="py-1.5 px-2">Giá trị</th>
                      <th className="py-1.5 px-2">Lỗi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100">
                    {importErrors.map((err, idx) => (
                      <tr key={idx} className="hover:bg-rose-50/50">
                        <td className="py-1 px-2 text-center font-mono font-bold text-rose-700">#{err.row}</td>
                        <td className="py-1 px-2 font-medium">{err.employeeCode || "—"}</td>
                        <td className="py-1 px-2 font-medium">{err.column}</td>
                        <td className="py-1 px-2 font-mono text-slate-600">{err.value || <span className="italic text-muted-foreground/60">(Trống)</span>}</td>
                        <td className="py-1 px-2 text-rose-700 dark:text-rose-400">{err.message}</td>
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
              disabled={importMutation.isPending}
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
