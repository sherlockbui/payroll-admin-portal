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
import { ExcelImportModal, type ExcelImportColumn } from "@/components/employees/excel-import-modal";
import { SubtabActivityLog } from "@/components/employees/subtab-activity-log";
import { useToast } from "@/components/providers";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Modal,
  MonthPicker,
  SearchableSelect,
  TablePaginationFooter,
  TableRowActions,
} from "@/components/ui";
import { api } from "@/lib/api";
import type {
  CreateOtherDeductionRequestV3,
  Employee,
  OtherDeductionType,
  OtherDeductionV3,
} from "@/lib/types";
import { formatCurrency, formatDate, formatMonthYear } from "@/lib/utils";

const DEDUCTION_TYPE_OPTIONS: { value: OtherDeductionType; label: string; tone: "danger" | "warning" | "info" | "neutral" }[] = [
  { value: "ADVANCE_PAYMENT", label: "Tạm ứng lương giữa kỳ", tone: "info" },
  { value: "ASSET_COMPENSATION", label: "Bồi thường CCDC", tone: "warning" },
  { value: "DISCIPLINE_FINE", label: "Phạt kỷ luật", tone: "danger" },
  { value: "OTHER", label: "Khoản giảm trừ khác", tone: "neutral" },
];

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

  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("2026-08");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OtherDeductionV3 | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetDeleteRecord, setTargetDeleteRecord] = useState<OtherDeductionV3 | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [previewFileModalOpen, setPreviewFileModalOpen] = useState(false);
  const [previewingRecord, setPreviewingRecord] = useState<OtherDeductionV3 | null>(null);

  // Form state
  const [formEmployeeCode, setFormEmployeeCode] = useState("");
  const [formMonth, setFormMonth] = useState("2026-08");
  const [formType, setFormType] = useState<OtherDeductionType>("DISCIPLINE_FINE");
  const [formAmount, setFormAmount] = useState<number>(500000);
  const [formDecisionNumber, setFormDecisionNumber] = useState("");
  const [formDecisionDate, setFormDecisionDate] = useState("2026-08-15");
  const [formReason, setFormReason] = useState("");
  const [formSelectedFile, setFormSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Summary Query
  const summaryQuery = useQuery({
    queryKey: ["other-deductions-summary", projectId, periodFilter],
    queryFn: () =>
      api.getOtherDeductionsSummaryV3({
        projectId: projectId === "all" ? undefined : projectId,
        month: periodFilter === "all" ? undefined : periodFilter,
      }),
  });

  // List Query
  const listQuery = useQuery({
    queryKey: ["other-deductions-list", projectId, periodFilter, typeFilter, searchTerm, page, pageSize],
    queryFn: () =>
      api.getOtherDeductionsListV3({
        projectId: projectId === "all" ? undefined : projectId,
        month: periodFilter === "all" ? undefined : periodFilter,
        type: typeFilter === "ALL" ? undefined : typeFilter,
        search: searchTerm || undefined,
        page,
        pageSize,
      }),
  });

  // Master deduction types
  const typesQuery = useQuery({
    queryKey: ["master-other-deduction-types"],
    queryFn: () => api.getMasterOtherDeductionTypesV3(),
  });

  const summary = summaryQuery.data;
  const listData = listQuery.data;
  const items = listData?.items ?? [];
  const totalItems = listData?.total ?? 0;

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingRecord(null);
    setFormEmployeeCode(employees[0]?.code || "NV-00124");
    setFormMonth(periodFilter === "all" ? "2026-08" : periodFilter);
    setFormType("DISCIPLINE_FINE");
    setFormAmount(500000);
    setFormDecisionNumber("QĐ-2026/08-01/VP");
    setFormDecisionDate(new Date().toISOString().slice(0, 10));
    setFormReason("");
    setFormSelectedFile(null);
    setFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: OtherDeductionV3) => {
    setEditingRecord(item);
    setFormEmployeeCode(item.employee.employeeCode);
    setFormMonth(item.month);
    setFormType(item.type);
    setFormAmount(item.amount);
    setFormDecisionNumber(item.decisionNumber || "");
    setFormDecisionDate(item.decisionDate || new Date().toISOString().slice(0, 10));
    setFormReason(item.reason);
    setFormSelectedFile(null);
    setFormModalOpen(true);
  };

  // Export Excel
  const handleExportExcel = async () => {
    try {
      const res = await api.exportOtherDeductionsExcelV3({
        projectId: projectId === "all" ? undefined : projectId,
        month: periodFilter === "all" ? undefined : periodFilter,
        type: typeFilter === "ALL" ? undefined : typeFilter,
      });
      notify(`Đã xuất báo cáo ${res.fileName} thành công (${res.totalRecords} bản ghi).`);
    } catch (err: any) {
      notify(err.message || "Lỗi khi xuất báo cáo Excel", "error");
    }
  };

  // Register Header Action
  useEffect(() => {
    if (!setHeaderAction) return;
    setHeaderAction(
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={handleExportExcel}
          className="gap-1.5 font-semibold text-xs h-8 px-3"
        >
          <Download className="w-3.5 h-3.5" /> Xuất Excel
        </Button>
        <Button
          variant="secondary"
          onClick={() => setImportModalOpen(true)}
          className="gap-1.5 font-semibold text-xs h-8 px-3"
        >
          <UploadCloud className="w-3.5 h-3.5" /> Import Excel
        </Button>
        <Button
          variant="primary"
          onClick={handleOpenCreate}
          className="gap-1.5 font-semibold text-xs h-8 px-3"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm khoản giảm trừ
        </Button>
      </div>
    );
    return () => setHeaderAction(null);
  }, [setHeaderAction, projectId, periodFilter, typeFilter]);

  // Save Mutation (Create / Update)
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingRecord) {
        const updated = await api.updateOtherDeductionV3(editingRecord.id, {
          month: formMonth,
          type: formType,
          amount: Number(formAmount) || 0,
          decisionNumber: formDecisionNumber.trim() || undefined,
          decisionDate: formDecisionDate || undefined,
          reason: formReason.trim() || "Khoản giảm trừ tiền lương",
        });
        if (formSelectedFile) {
          await api.uploadOtherDeductionAttachmentV3(editingRecord.id, formSelectedFile);
        }
        return updated;
      } else {
        const payload: CreateOtherDeductionRequestV3 = {
          employeeCode: formEmployeeCode,
          month: formMonth,
          type: formType,
          amount: Number(formAmount) || 0,
          decisionNumber: formDecisionNumber.trim() || undefined,
          decisionDate: formDecisionDate || undefined,
          reason: formReason.trim() || "Khoản giảm trừ tiền lương",
        };
        const created = await api.createOtherDeductionV3(payload);
        if (formSelectedFile && created.id) {
          await api.uploadOtherDeductionAttachmentV3(created.id, formSelectedFile);
        }
        return created;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["other-deductions-summary"] });
      queryClient.invalidateQueries({ queryKey: ["other-deductions-list"] });
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
      queryClient.invalidateQueries({ queryKey: ["other-deductions-summary"] });
      queryClient.invalidateQueries({ queryKey: ["other-deductions-list"] });
      setDeleteModalOpen(false);
      setTargetDeleteRecord(null);
      notify("Đã xóa khoản giảm trừ thành công!");
    },
    onError: (err: any) => {
      notify(err.message || "Lỗi khi xóa khoản giảm trừ", "error");
    },
  });

  // Excel Import Setup
  const [importPreviewRows, setImportPreviewRows] = useState<any[]>([]);
  const excelColumns: ExcelImportColumn[] = [
    { key: "employeeCode", label: "Mã NLĐ", width: "120px" },
    { key: "fullName", label: "Họ và tên NLĐ", width: "160px" },
    {
      key: "month",
      label: "Tháng",
      width: "100px",
      align: "center",
      render: (row) => <Badge tone="neutral">{formatMonthYear(row.month)}</Badge>,
    },
    {
      key: "typeName",
      label: "Loại giảm trừ",
      render: (row) => <span className="font-medium">{row.typeName || "Phạt vi phạm"}</span>,
    },
    {
      key: "amount",
      label: "Số tiền (VND)",
      align: "right",
      render: (row) => <span className="font-mono text-danger font-semibold">-{formatCurrency(row.amount)}</span>,
    },
    { key: "decisionNumber", label: "Số QĐ", width: "130px" },
    { key: "reason", label: "Lý do / Nội dung" },
  ];

  const handleSimulateExcelUpload = () => {
    const mockExcelData = [
      {
        employeeCode: "NV-00124",
        fullName: "Nguyễn Văn An",
        month: "2026-08",
        type: "DISCIPLINE_FINE",
        typeName: "Phạt vi phạm kỷ luật",
        amount: 500000,
        decisionNumber: "QĐ-2026/08-01/VP",
        decisionDate: "2026-08-10",
        reason: "Không mang bảo hộ lao động phòng sạch",
      },
      {
        employeeCode: "NV-00125",
        fullName: "Trần Thị Mai",
        month: "2026-08",
        type: "ADVANCE_PAYMENT",
        typeName: "Tạm ứng tiền lương giữa kỳ",
        amount: 2000000,
        decisionNumber: "ĐN-2026/08-04/TU",
        decisionDate: "2026-08-15",
        reason: "Tạm ứng viện phí gia đình",
      },
      {
        employeeCode: "NV-00126",
        fullName: "Lê Hoàng Nam",
        month: "2026-08",
        type: "ASSET_COMPENSATION",
        typeName: "Bồi thường thiệt hại CCDC",
        amount: 400000,
        decisionNumber: "BB-2026/08-09/BT",
        decisionDate: "2026-08-18",
        reason: "Làm mất dụng cụ đo kiểm",
      },
    ];
    setImportPreviewRows(mockExcelData);
    notify("Đã đọc dữ liệu thành công từ file Excel (3 dòng hợp lệ)");
  };

  const importBatchMutation = useMutation({
    mutationFn: async () => {
      const dummyFile = new File(["dummy"], "import_giam_tru.xlsx");
      return api.importOtherDeductionsExcelV3(dummyFile, projectId === "all" ? undefined : projectId);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["other-deductions-summary"] });
      queryClient.invalidateQueries({ queryKey: ["other-deductions-list"] });
      setImportModalOpen(false);
      setImportPreviewRows([]);
      notify(`Đã nhập khẩu thành công ${res.successRows || importPreviewRows.length} khoản giảm trừ vào hệ thống!`);
    },
    onError: (err: any) => {
      notify(err.message || "Lỗi khi nhập khẩu file Excel", "error");
    },
  });

  return (
    <div className="subtab-container space-y-4">
      {/* 5 KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Tổng số khoản trừ</span>
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ReceiptText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground mt-2 font-mono">
            {summary?.total ?? 0}
          </div>
          <div className="text-xs text-muted mt-0.5 leading-relaxed">Bản ghi trong kỳ</div>
        </div>

        <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Tổng tiền giảm trừ</span>
            <div className="w-7 h-7 rounded-lg bg-danger/10 text-danger flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-danger mt-2 font-mono">
            -{formatCurrency(summary?.totalAmount ?? 0)}
          </div>
          <div className="text-xs text-muted mt-0.5 leading-relaxed">Khấu trừ tiền lương</div>
        </div>

        <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Tạm ứng lương</span>
            <div className="w-7 h-7 rounded-lg bg-info/10 text-info flex items-center justify-center">
              <WalletCards className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-info mt-2 font-mono">
            {summary?.advancePaymentCount ?? 0}
          </div>
          <div className="text-xs text-muted mt-0.5 leading-relaxed">Tạm ứng giữa kỳ</div>
        </div>

        <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Bồi thường CCDC</span>
            <div className="w-7 h-7 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-warning mt-2 font-mono">
            {summary?.assetCompensationCount ?? 0}
          </div>
          <div className="text-xs text-muted mt-0.5 leading-relaxed">Hư hỏng tài sản</div>
        </div>

        <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Phạt kỷ luật</span>
            <div className="w-7 h-7 rounded-lg bg-danger/10 text-danger flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-danger mt-2 font-mono">
            {summary?.disciplineFineCount ?? 0}
          </div>
          <div className="text-xs text-muted mt-0.5 leading-relaxed">Vi phạm quy định</div>
        </div>
      </div>

      {/* Integrated Flat Card Table */}
      <div className="integrated-table-card">
        {/* Toolbar: Single Row */}
        <div className="table-card-toolbar">
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            {/* Left: Category segmentation pills */}
            <div className="filter-status-pills">
              <button
                type="button"
                className={`pill-btn ${typeFilter === "ALL" ? "active" : ""}`}
                onClick={() => {
                  setTypeFilter("ALL");
                  setPage(1);
                }}
              >
                Tất cả ({summary?.total ?? 0})
              </button>
              {DEDUCTION_TYPE_OPTIONS.map((opt) => {
                let count = 0;
                if (opt.value === "ADVANCE_PAYMENT") count = summary?.advancePaymentCount ?? 0;
                if (opt.value === "ASSET_COMPENSATION") count = summary?.assetCompensationCount ?? 0;
                if (opt.value === "DISCIPLINE_FINE") count = summary?.disciplineFineCount ?? 0;
                if (opt.value === "OTHER") count = summary?.otherCount ?? 0;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`pill-btn ${opt.tone === "danger" ? "danger" : opt.tone === "warning" ? "warning" : opt.tone === "info" ? "info" : ""} ${typeFilter === opt.value ? "active" : ""}`}
                    onClick={() => {
                      setTypeFilter(opt.value);
                      setPage(1);
                    }}
                  >
                    {opt.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Right: Search + MonthPicker */}
            <div className="flex items-center gap-2.5 ml-auto">
              <div className="relative min-w-[220px] max-w-[300px]">
                <Search className="search-icon-fixed text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Tìm mã, tên NLĐ, số QĐ, lý do..."
                  className="search-box-input w-full pl-10 pr-8 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div style={{ width: "160px" }}>
                <MonthPicker
                  value={periodFilter}
                  onChange={(val) => {
                    setPeriodFilter(val || "all");
                    setPage(1);
                  }}
                  allowClear
                  clearLabel="Tất cả các tháng"
                  placeholder="Tất cả các tháng"
                  variant="filter"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Table */}
        {listQuery.isLoading ? (
          <LoadingBlock rows={6} />
        ) : listQuery.isError ? (
          <ErrorState
            message="Không thể tải danh sách khoản giảm trừ khác"
            retry={() => listQuery.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="Không tìm thấy khoản giảm trừ nào"
            description={
              searchTerm || periodFilter !== "all" || typeFilter !== "ALL"
                ? "Không có dữ liệu phù hợp với bộ lọc hiện tại."
                : "Chưa có quyết định khấu trừ nào cho người lao động trong kỳ."
            }
            action={
              searchTerm || periodFilter !== "all" || typeFilter !== "ALL" ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchTerm("");
                    setPeriodFilter("all");
                    setTypeFilter("ALL");
                  }}
                >
                  Xóa bộ lọc
                </Button>
              ) : (
                <Button variant="primary" onClick={handleOpenCreate}>
                  <Plus className="w-4 h-4 mr-1.5" /> Thêm khoản giảm trừ đầu tiên
                </Button>
              )
            }
          />
        ) : (
          <div className="data-table-wrap">
            <div className="data-table-scroll">
              <table className="data-table min-w-[1050px]">
                <thead>
                  <tr>
                    <th style={{ width: "45px" }} className="text-center">STT</th>
                    <th style={{ minWidth: "170px" }}>NGƯỜI LAO ĐỘNG</th>
                    <th style={{ width: "120px" }} className="text-center">THÁNG ÁP DỤNG</th>
                    <th style={{ width: "180px" }}>LOẠI GIẢM TRỪ</th>
                    <th style={{ width: "130px" }} className="text-right">SỐ TIỀN</th>
                    <th style={{ width: "220px" }}>CĂN CỨ &amp; FILE QĐ</th>
                    <th>LÝ DO / CĂN CỨ</th>
                    <th style={{ width: "150px" }}>CẬP NHẬT</th>
                    <th style={{ width: "80px" }} className="text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const rawStt = (page - 1) * pageSize + idx + 1;
                    const stt = String(rawStt).padStart(2, "0");
                    const typeDef = DEDUCTION_TYPE_OPTIONS.find((t) => t.value === item.type);

                    return (
                      <tr key={item.id} className="hover:bg-secondary/40 transition-colors">
                        {/* STT */}
                        <td className="text-center text-muted font-medium">{stt}</td>

                        {/* Employee Info */}
                        <td>
                          <div className="employee-cell-info">
                            <span className="employee-cell-name font-semibold">{item.employee.fullName}</span>
                            <span className="employee-cell-sub">
                              <span className="employee-code-badge">{item.employee.employeeCode}</span>
                              {item.employee.project?.projectCode && (
                                <span className="text-muted text-[11px] font-normal">· {item.employee.project.projectCode}</span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Month */}
                        <td className="text-center">
                          <Badge tone="neutral">{formatMonthYear(item.month)}</Badge>
                        </td>

                        {/* Type */}
                        <td>
                          <Badge tone={typeDef?.tone || "neutral"}>
                            {item.typeName || typeDef?.label || item.type}
                          </Badge>
                        </td>

                        {/* Amount */}
                        <td className="text-right">
                          <span className="font-mono font-bold text-danger text-[13.5px]">
                            -{formatCurrency(item.amount)}
                          </span>
                        </td>

                        {/* Decision & Attachment */}
                        <td>
                          <div className="flex flex-col gap-1">
                            {item.decisionNumber ? (
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-foreground flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                                  {item.decisionNumber}
                                </span>
                                {item.decisionDate && (
                                  <span className="text-[11px] text-muted ml-4.5">
                                    Ngày {formatDate(item.decisionDate)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted italic">Chưa có số QĐ</span>
                            )}

                            {item.attachment ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewingRecord(item);
                                  setPreviewFileModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 text-[11.5px] text-primary hover:underline font-medium text-left truncate max-w-[190px]"
                                title={`Xem file: ${item.attachment.fileName}`}
                              >
                                <Paperclip className="w-3 h-3 shrink-0" />
                                <span className="truncate">{item.attachment.fileName}</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-muted">Chưa đính kèm file</span>
                            )}
                          </div>
                        </td>

                        {/* Reason */}
                        <td>
                          <p className="text-xs text-foreground/90 line-clamp-2" title={item.reason}>
                            {item.reason}
                          </p>
                        </td>

                        {/* Updated Info */}
                        <td>
                          <div className="text-[11.5px] text-muted space-y-0.5">
                            <div className="truncate font-medium text-foreground/80">{item.updatedBy?.fullName || "Quản trị viên"}</div>
                            <div>{formatDate(item.updatedAt)}</div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="text-center">
                          <TableRowActions
                            items={[
                              {
                                key: "edit",
                                label: "Chỉnh sửa khoản giảm trừ",
                                icon: <Pencil />,
                                onClick: () => handleOpenEdit(item),
                              },
                              ...(item.attachment
                                ? [
                                    {
                                      key: "preview_doc",
                                      label: "Xem file quyết định",
                                      icon: <Eye />,
                                      onClick: () => {
                                        setPreviewingRecord(item);
                                        setPreviewFileModalOpen(true);
                                      },
                                    },
                                  ]
                                : []),
                              {
                                key: "delete",
                                label: "Xóa khoản giảm trừ",
                                icon: <Trash2 />,
                                danger: true,
                                onClick: () => {
                                  setTargetDeleteRecord(item);
                                  setDeleteModalOpen(true);
                                },
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <TablePaginationFooter
              totalItems={totalItems}
              currentPage={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* BOTTOM AUDIT / ACTIVITY LOG */}
      <SubtabActivityLog
        projectId={projectId}
        module="deductions"
        title="Nhật ký biến động Khoản giảm trừ khác"
        description="Lịch sử thêm mới, điều chỉnh, xóa và import các khoản phạt, bồi thường, tạm ứng tiền lương của người lao động"
      />

      {/* ========================================================================= */}
      {/* MODAL: Thêm mới / Chỉnh sửa khoản giảm trừ                               */}
      {/* ========================================================================= */}
      <Modal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        title={editingRecord ? "Chỉnh sửa khoản giảm trừ khác" : "Thêm mới khoản giảm trừ khác"}
        description="Nhập thông tin quyết định xử phạt / bồi thường / tạm ứng và đính kèm văn bản căn cứ."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              disabled={!formEmployeeCode || !formAmount || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="gap-1.5 font-semibold"
            >
              <Check className="w-3.5 h-3.5" />
              {saveMutation.isPending
                ? "Đang lưu…"
                : editingRecord
                ? "Cập nhật khoản giảm trừ"
                : "Tạo khoản giảm trừ"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-1">
          {/* Row 1: Employee & Period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">
                Người lao động <span className="text-danger">*</span>
              </label>
              {editingRecord ? (
                <div className="p-2.5 rounded-lg border border-border bg-secondary/30 font-medium text-sm">
                  {editingRecord.employee.employeeCode} - {editingRecord.employee.fullName}
                </div>
              ) : (
                <SearchableSelect
                  value={formEmployeeCode}
                  onChange={setFormEmployeeCode}
                  placeholder="Chọn người lao động..."
                  searchPlaceholder="Tìm mã hoặc tên người lao động..."
                  options={employees.map((emp) => ({
                    value: emp.code,
                    label: `${emp.code} - ${emp.name}`,
                    subLabel: emp.position || emp.department,
                  }))}
                />
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Tháng áp dụng <span className="text-danger">*</span>
              </label>
              <MonthPicker
                value={formMonth}
                onChange={setFormMonth}
                variant="form"
                placeholder="Chọn tháng áp dụng..."
              />
            </div>
          </div>

          {/* Row 2: Type & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">
                Loại khoản giảm trừ <span className="text-danger">*</span>
              </label>
              <SearchableSelect
                value={formType}
                onChange={(val) => setFormType(val as OtherDeductionType)}
                options={DEDUCTION_TYPE_OPTIONS.map((c) => ({
                  value: c.value,
                  label: c.label,
                }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Số tiền giảm trừ (VND) <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="10000"
                  className="form-input w-full font-mono font-bold text-danger pr-12"
                  value={formAmount}
                  onChange={(e) => setFormAmount(Number(e.target.value))}
                  placeholder="Nhập số tiền..."
                />
                <span className="absolute right-3 top-2.5 text-xs text-muted font-bold">VND</span>
              </div>
            </div>
          </div>

          {/* Row 3: Decision Number & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Số quyết định / Biên bản căn cứ</label>
              <input
                type="text"
                className="form-input w-full"
                value={formDecisionNumber}
                onChange={(e) => setFormDecisionNumber(e.target.value)}
                placeholder="VD: QĐ-2026/08-01/VP"
              />
            </div>

            <div className="form-group">
              <label className="form-label flex items-center justify-between">
                <span>Ngày ban hành quyết định</span>
                {formDecisionDate && (
                  <span className="text-xs text-primary font-medium">
                    {formatDate(formDecisionDate)}
                  </span>
                )}
              </label>
              <input
                type="date"
                className="form-input w-full"
                value={formDecisionDate}
                onChange={(e) => setFormDecisionDate(e.target.value)}
              />
            </div>
          </div>

          {/* Row 4: Attachment Upload Area */}
          <div className="form-group">
            <label className="form-label flex items-center justify-between">
              <span>Đính kèm file quyết định (PDF, Word, Ảnh)</span>
              {formSelectedFile && (
                <span className="text-xs text-primary font-medium">
                  {formSelectedFile.name} ({(formSelectedFile.size / 1024).toFixed(0)} KB)
                </span>
              )}
            </label>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setFormSelectedFile(file);
                  notify(`Đã chọn file: ${file.name}`);
                }
              }}
            />

            {formSelectedFile || editingRecord?.attachment ? (
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">
                      {formSelectedFile?.name || editingRecord?.attachment?.fileName}
                    </div>
                    <div className="text-[11px] text-muted">
                      {formSelectedFile ? "Tệp mới chọn" : "Tệp đã lưu trên hệ thống"} · Sẵn sàng lưu
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Thay file
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setFormSelectedFile(null)}
                  >
                    <X className="w-4 h-4 text-danger" />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-4 text-center cursor-pointer transition-colors bg-secondary/20 hover:bg-secondary/40 flex flex-col items-center justify-center gap-1.5"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-foreground">
                  Bấm vào đây để tải lên file quyết định
                </div>
                <div className="text-[11px] text-muted">
                  Hỗ trợ định dạng PDF, DOCX, PNG, JPG (Tối đa 15MB)
                </div>
              </div>
            )}
          </div>

          {/* Row 5: Reason */}
          <div className="form-group">
            <label className="form-label">
              Lý do / Nội dung chi tiết <span className="text-danger">*</span>
            </label>
            <textarea
              className="form-textarea w-full"
              rows={2}
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="Ghi rõ lý do xử phạt / căn cứ bồi thường / tạm ứng..."
            />
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Xác nhận xóa khoản giảm trừ                                       */}
      {/* ========================================================================= */}
      <Modal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Xác nhận xóa khoản giảm trừ"
        description="Khoản giảm trừ này sẽ bị xóa khỏi hồ sơ và không còn được áp dụng khi tính bảng lương."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              disabled={deleteMutation.isPending}
              onClick={() => targetDeleteRecord && deleteMutation.mutate(targetDeleteRecord.id)}
            >
              {deleteMutation.isPending ? "Đang xóa…" : "Xác nhận xóa"}
            </Button>
          </>
        }
      >
        {targetDeleteRecord && (
          <div className="p-3 bg-danger/5 border border-danger/20 rounded-lg text-xs space-y-1.5">
            <div>
              <strong>Người lao động:</strong> {targetDeleteRecord.employee.employeeCode} -{" "}
              {targetDeleteRecord.employee.fullName}
            </div>
            <div>
              <strong>Số tiền:</strong>{" "}
              <span className="text-danger font-bold">
                -{formatCurrency(targetDeleteRecord.amount)}
              </span>{" "}
              ({targetDeleteRecord.typeName})
            </div>
            <div>
              <strong>Tháng áp dụng:</strong> {formatMonthYear(targetDeleteRecord.month)}
            </div>
            {targetDeleteRecord.decisionNumber && (
              <div>
                <strong>Số QĐ:</strong> {targetDeleteRecord.decisionNumber}
              </div>
            )}
            {targetDeleteRecord.decisionDate && (
              <div>
                <strong>Ngày ban hành:</strong> {formatDate(targetDeleteRecord.decisionDate)}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Import Excel khoản giảm trừ theo tháng                             */}
      {/* ========================================================================= */}
      <ExcelImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        title="Import danh sách khoản giảm trừ khác từ Excel"
        description="Nhập danh sách nhân sự có các khoản phạt, bồi thường, tạm ứng theo quyết định trong kỳ."
        period={periodFilter === "all" ? "2026-08" : periodFilter}
        sampleTemplateName="Mau_Import_Giam_Tru.xlsx"
        sampleTemplateDescription="Biểu mẫu chuẩn bao gồm: Mã NV, Họ tên, Tháng (YYYY-MM), Loại khoản trừ, Số tiền, Số QĐ, Lý do."
        columns={excelColumns}
        previewRows={importPreviewRows}
        stats={[
          { label: "Tổng dòng dữ liệu", value: importPreviewRows.length, tone: "primary" },
          {
            label: "Tổng tiền khấu trừ",
            value: `-${formatCurrency(importPreviewRows.reduce((s, r) => s + (r.amount || 0), 0))}`,
            tone: "danger",
          },
        ]}
        onDownloadSample={() => api.downloadOtherDeductionsImportTemplateV3()}
        onSimulateUpload={handleSimulateExcelUpload}
        onConfirmImport={() => importBatchMutation.mutate()}
        confirmLoading={importBatchMutation.isPending}
        confirmLabel={`Nhập ${importPreviewRows.length || ""} khoản giảm trừ vào hệ thống`}
        onClearPreview={() => setImportPreviewRows([])}
      />

      {/* ========================================================================= */}
      {/* MODAL: Xem trước file quyết định & văn bản căn cứ                         */}
      {/* ========================================================================= */}
      <DecisionDocumentPreviewModal
        open={previewFileModalOpen}
        onOpenChange={setPreviewFileModalOpen}
        data={
          previewingRecord
            ? {
                type: "deduction",
                employeeCode: previewingRecord.employee.employeeCode,
                employeeName: previewingRecord.employee.fullName,
                position: previewingRecord.employee.position || undefined,
                projectCode: previewingRecord.employee.project?.projectCode,
                period: previewingRecord.month,
                categoryLabel: previewingRecord.typeName || "Khoản giảm trừ khác",
                amount: previewingRecord.amount,
                decisionNo: previewingRecord.decisionNumber || "",
                decisionDate: previewingRecord.decisionDate || "",
                reason: previewingRecord.reason,
                attachmentName: previewingRecord.attachment?.fileName,
                attachmentUrl: previewingRecord.attachment?.fileUrl,
                attachmentSize: previewingRecord.attachment?.fileSize ? `${(previewingRecord.attachment.fileSize / 1024).toFixed(0)} KB` : undefined,
                updatedBy: previewingRecord.updatedBy?.fullName,
                updatedAt: previewingRecord.updatedAt,
              }
            : null
        }
      />
    </div>
  );
}
