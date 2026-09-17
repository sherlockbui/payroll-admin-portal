"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Calendar,
  Check,
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
  Search,
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
  CreateOtherIncomeRequestV3,
  Employee,
  OtherIncomeType,
  OtherIncomeV3,
} from "@/lib/types";
import { formatCurrency, formatDate, formatMonthYear } from "@/lib/utils";

const INCOME_TYPE_OPTIONS: { value: OtherIncomeType; label: string; tone: "success" | "info" | "warning" | "neutral" }[] = [
  { value: "HOT_BONUS", label: "Thưởng nóng sáng kiến", tone: "success" },
  { value: "PERFORMANCE_BONUS", label: "Thưởng năng suất hiệu quả", tone: "info" },
  { value: "HOLIDAY_BONUS", label: "Thưởng lễ tết", tone: "warning" },
  { value: "PROJECT_SUPPORT", label: "Hỗ trợ dự án", tone: "info" },
  { value: "OTHER", label: "Thu nhập khác", tone: "neutral" },
];

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

  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("2026-08");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OtherIncomeV3 | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetDeleteRecord, setTargetDeleteRecord] = useState<OtherIncomeV3 | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [previewFileModalOpen, setPreviewFileModalOpen] = useState(false);
  const [previewingRecord, setPreviewingRecord] = useState<OtherIncomeV3 | null>(null);

  // Form state
  const [formEmployeeCode, setFormEmployeeCode] = useState("");
  const [formMonth, setFormMonth] = useState("2026-08");
  const [formType, setFormType] = useState<OtherIncomeType>("HOT_BONUS");
  const [formAmount, setFormAmount] = useState<number>(1000000);
  const [formDecisionNumber, setFormDecisionNumber] = useState("");
  const [formDecisionDate, setFormDecisionDate] = useState("2026-08-18");
  const [formReason, setFormReason] = useState("");
  const [formSelectedFile, setFormSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Summary Query
  const summaryQuery = useQuery({
    queryKey: ["other-incomes-summary", projectId, periodFilter],
    queryFn: () =>
      api.getOtherIncomesSummaryV3({
        projectId: projectId === "all" ? undefined : projectId,
        month: periodFilter === "all" ? undefined : periodFilter,
      }),
  });

  // List Query
  const listQuery = useQuery({
    queryKey: ["other-incomes-list", projectId, periodFilter, typeFilter, searchTerm, page, pageSize],
    queryFn: () =>
      api.getOtherIncomesListV3({
        projectId: projectId === "all" ? undefined : projectId,
        month: periodFilter === "all" ? undefined : periodFilter,
        type: typeFilter === "ALL" ? undefined : typeFilter,
        search: searchTerm || undefined,
        page,
        pageSize,
      }),
  });

  // Master income types
  const typesQuery = useQuery({
    queryKey: ["master-other-income-types"],
    queryFn: () => api.getMasterOtherIncomeTypesV3(),
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
    setFormType("HOT_BONUS");
    setFormAmount(1000000);
    setFormDecisionNumber("QĐ-2026/08-02/KT");
    setFormDecisionDate(new Date().toISOString().slice(0, 10));
    setFormReason("");
    setFormSelectedFile(null);
    setFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: OtherIncomeV3) => {
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
      const res = await api.exportOtherIncomesExcelV3({
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
          <Plus className="w-3.5 h-3.5" /> Thêm khoản thu nhập
        </Button>
      </div>
    );
    return () => setHeaderAction(null);
  }, [setHeaderAction, projectId, periodFilter, typeFilter]);

  // Save Mutation (Create / Update)
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingRecord) {
        const updated = await api.updateOtherIncomeV3(editingRecord.id, {
          month: formMonth,
          type: formType,
          amount: Number(formAmount) || 0,
          decisionNumber: formDecisionNumber.trim() || undefined,
          decisionDate: formDecisionDate || undefined,
          reason: formReason.trim() || "Khoản khen thưởng / thu nhập khác",
        });
        if (formSelectedFile) {
          await api.uploadOtherIncomeAttachmentV3(editingRecord.id, formSelectedFile);
        }
        return updated;
      } else {
        const payload: CreateOtherIncomeRequestV3 = {
          employeeCode: formEmployeeCode,
          month: formMonth,
          type: formType,
          amount: Number(formAmount) || 0,
          decisionNumber: formDecisionNumber.trim() || undefined,
          decisionDate: formDecisionDate || undefined,
          reason: formReason.trim() || "Khoản khen thưởng / thu nhập khác",
        };
        const created = await api.createOtherIncomeV3(payload);
        if (formSelectedFile && created.id) {
          await api.uploadOtherIncomeAttachmentV3(created.id, formSelectedFile);
        }
        return created;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["other-incomes-summary"] });
      queryClient.invalidateQueries({ queryKey: ["other-incomes-list"] });
      setFormModalOpen(false);
      notify(editingRecord ? "Đã cập nhật khoản thu nhập thành công!" : "Đã thêm mới khoản thu nhập thành công!");
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
      queryClient.invalidateQueries({ queryKey: ["other-incomes-summary"] });
      queryClient.invalidateQueries({ queryKey: ["other-incomes-list"] });
      setDeleteModalOpen(false);
      setTargetDeleteRecord(null);
      notify("Đã xóa khoản thu nhập thành công!");
    },
    onError: (err: any) => {
      notify(err.message || "Lỗi khi xóa khoản thu nhập", "error");
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
      label: "Loại thu nhập",
      render: (row) => <span className="font-medium">{row.typeName || "Thưởng nóng"}</span>,
    },
    {
      key: "amount",
      label: "Số tiền (VND)",
      align: "right",
      render: (row) => <span className="font-mono text-success font-semibold">+{formatCurrency(row.amount)}</span>,
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
        type: "HOT_BONUS",
        typeName: "Thưởng nóng sáng kiến cải tiến",
        amount: 1500000,
        decisionNumber: "QĐ-2026/08-02/KT",
        decisionDate: "2026-08-10",
        reason: "Sáng kiến tối ưu hóa dây chuyền đóng gói",
      },
      {
        employeeCode: "NV-00125",
        fullName: "Trần Thị Mai",
        month: "2026-08",
        type: "PERFORMANCE_BONUS",
        typeName: "Thưởng năng suất vượt trội",
        amount: 2000000,
        decisionNumber: "QĐ-2026/08-08/NS",
        decisionDate: "2026-08-15",
        reason: "Vượt 120% chỉ tiêu sản lượng đóng gói xuất khẩu",
      },
      {
        employeeCode: "NV-00127",
        fullName: "Phạm Quốc Bảo",
        month: "2026-08",
        type: "HOLIDAY_BONUS",
        typeName: "Thưởng lễ kỷ niệm công ty",
        amount: 1000000,
        decisionNumber: "QĐ-2026/08-19/LE",
        decisionDate: "2026-08-19",
        reason: "Khen thưởng ngày thành lập tập đoàn",
      },
    ];
    setImportPreviewRows(mockExcelData);
    notify("Đã đọc dữ liệu thành công từ file Excel (3 dòng hợp lệ)");
  };

  const importBatchMutation = useMutation({
    mutationFn: async () => {
      const dummyFile = new File(["dummy"], "import_thu_nhap.xlsx");
      return api.importOtherIncomesExcelV3(dummyFile, projectId === "all" ? undefined : projectId);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["other-incomes-summary"] });
      queryClient.invalidateQueries({ queryKey: ["other-incomes-list"] });
      setImportModalOpen(false);
      setImportPreviewRows([]);
      notify(`Đã nhập khẩu thành công ${res.successRows || importPreviewRows.length} khoản thu nhập vào hệ thống!`);
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
            <span className="text-xs font-medium text-muted">Tổng số khoản thưởng</span>
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground mt-2 font-mono">
            {summary?.total ?? 0}
          </div>
          <div className="text-xs text-muted mt-0.5 leading-relaxed">Bản ghi trong kỳ</div>
        </div>

        <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Tổng tiền thu nhập</span>
            <div className="w-7 h-7 rounded-lg bg-success/10 text-success flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-success mt-2 font-mono">
            +{formatCurrency(summary?.totalAmount ?? 0)}
          </div>
          <div className="text-xs text-muted mt-0.5 leading-relaxed">Chi trả ngoài lương</div>
        </div>

        <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Thưởng nóng sáng kiến</span>
            <div className="w-7 h-7 rounded-lg bg-success/10 text-success flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-success mt-2 font-mono">
            {summary?.hotBonusCount ?? 0}
          </div>
          <div className="text-xs text-muted mt-0.5 leading-relaxed">Cải tiến kỹ thuật</div>
        </div>

        <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Thưởng năng suất</span>
            <div className="w-7 h-7 rounded-lg bg-info/10 text-info flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-info mt-2 font-mono">
            {summary?.performanceBonusCount ?? 0}
          </div>
          <div className="text-xs text-muted mt-0.5 leading-relaxed">Vượt chỉ tiêu KPI</div>
        </div>

        <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Thưởng lễ / Dự án</span>
            <div className="w-7 h-7 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-warning mt-2 font-mono">
            {(summary?.holidayBonusCount ?? 0) + (summary?.projectSupportCount ?? 0)}
          </div>
          <div className="text-xs text-muted mt-0.5 leading-relaxed">Sự kiện &amp; phụ cấp dự án</div>
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
              {INCOME_TYPE_OPTIONS.map((opt) => {
                let count = 0;
                if (opt.value === "HOT_BONUS") count = summary?.hotBonusCount ?? 0;
                if (opt.value === "PERFORMANCE_BONUS") count = summary?.performanceBonusCount ?? 0;
                if (opt.value === "HOLIDAY_BONUS") count = summary?.holidayBonusCount ?? 0;
                if (opt.value === "PROJECT_SUPPORT") count = summary?.projectSupportCount ?? 0;
                if (opt.value === "OTHER") count = summary?.otherCount ?? 0;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`pill-btn ${opt.tone === "success" ? "success" : opt.tone === "warning" ? "warning" : opt.tone === "info" ? "info" : ""} ${typeFilter === opt.value ? "active" : ""}`}
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
            message="Không thể tải danh sách khoản thu nhập khác"
            retry={() => listQuery.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="Không tìm thấy khoản thu nhập nào"
            description={
              searchTerm || periodFilter !== "all" || typeFilter !== "ALL"
                ? "Không có dữ liệu phù hợp với bộ lọc hiện tại."
                : "Chưa có quyết định khen thưởng / thu nhập bổ sung nào cho người lao động trong kỳ."
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
                  <Plus className="w-4 h-4 mr-1.5" /> Thêm khoản thu nhập đầu tiên
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
                    <th style={{ width: "190px" }}>LOẠI THU NHẬP</th>
                    <th style={{ width: "130px" }} className="text-right">SỐ TIỀN</th>
                    <th style={{ width: "220px" }}>CĂN CỨ &amp; FILE QĐ</th>
                    <th>LÝ DO / THÀNH TÍCH</th>
                    <th style={{ width: "150px" }}>CẬP NHẬT</th>
                    <th style={{ width: "80px" }} className="text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const rawStt = (page - 1) * pageSize + idx + 1;
                    const stt = String(rawStt).padStart(2, "0");
                    const typeDef = INCOME_TYPE_OPTIONS.find((t) => t.value === item.type);

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
                          <span className="font-mono font-bold text-success text-[13.5px]">
                            +{formatCurrency(item.amount)}
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
                                label: "Chỉnh sửa khoản thu nhập",
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
                                label: "Xóa khoản thu nhập",
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
        module="incomes"
        title="Nhật ký biến động Khoản thu nhập khác"
        description="Lịch sử thêm mới, điều chỉnh, xóa và import các khoản thưởng nóng, thưởng năng suất, hỗ trợ của người lao động"
      />

      {/* ========================================================================= */}
      {/* MODAL: Thêm mới / Chỉnh sửa khoản thu nhập                               */}
      {/* ========================================================================= */}
      <Modal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        title={editingRecord ? "Chỉnh sửa khoản thu nhập khác" : "Thêm mới khoản thu nhập khác"}
        description="Nhập thông tin quyết định khen thưởng / thành tích / hỗ trợ và đính kèm văn bản căn cứ."
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
                ? "Cập nhật khoản thu nhập"
                : "Tạo khoản thu nhập"}
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
                Loại khoản thu nhập <span className="text-danger">*</span>
              </label>
              <SearchableSelect
                value={formType}
                onChange={(val) => setFormType(val as OtherIncomeType)}
                options={INCOME_TYPE_OPTIONS.map((c) => ({
                  value: c.value,
                  label: c.label,
                }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Số tiền thu nhập (VND) <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="10000"
                  className="form-input w-full font-mono font-bold text-success pr-12"
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
                placeholder="VD: QĐ-2026/08-02/KT"
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
              <span>Đính kèm file quyết định khen thưởng (PDF, Word, Ảnh)</span>
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
                  Bấm vào đây để tải lên file quyết định khen thưởng
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
              Lý do / Thành tích khen thưởng <span className="text-danger">*</span>
            </label>
            <textarea
              className="form-textarea w-full"
              rows={2}
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="Ghi rõ lý do khen thưởng / căn cứ thành tích để đối soát..."
            />
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Xác nhận xóa khoản thu nhập                                       */}
      {/* ========================================================================= */}
      <Modal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Xác nhận xóa khoản thu nhập"
        description="Khoản thu nhập này sẽ bị xóa khỏi hồ sơ và không còn được cộng vào bảng tính lương."
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
              <span className="text-success font-bold">
                +{formatCurrency(targetDeleteRecord.amount)}
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
      {/* MODAL: Import Excel khoản thu nhập theo tháng                             */}
      {/* ========================================================================= */}
      <ExcelImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        title="Import danh sách khoản thu nhập khác từ Excel"
        description="Nhập danh sách nhân sự có các khoản thưởng nóng, thưởng năng suất, hỗ trợ trong kỳ."
        period={periodFilter === "all" ? "2026-08" : periodFilter}
        sampleTemplateName="Mau_Import_Thu_Nhap.xlsx"
        sampleTemplateDescription="Biểu mẫu chuẩn bao gồm: Mã NV, Họ tên, Tháng (YYYY-MM), Loại khoản thưởng, Số tiền, Số QĐ, Lý do."
        columns={excelColumns}
        previewRows={importPreviewRows}
        stats={[
          { label: "Tổng dòng dữ liệu", value: importPreviewRows.length, tone: "primary" },
          {
            label: "Tổng tiền thu nhập",
            value: `+${formatCurrency(importPreviewRows.reduce((s, r) => s + (r.amount || 0), 0))}`,
            tone: "success",
          },
        ]}
        onDownloadSample={() => api.downloadOtherIncomesImportTemplateV3()}
        onSimulateUpload={handleSimulateExcelUpload}
        onConfirmImport={() => importBatchMutation.mutate()}
        confirmLoading={importBatchMutation.isPending}
        confirmLabel={`Nhập ${importPreviewRows.length || ""} khoản thu nhập vào hệ thống`}
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
                type: "income",
                employeeCode: previewingRecord.employee.employeeCode,
                employeeName: previewingRecord.employee.fullName,
                position: previewingRecord.employee.position || undefined,
                projectCode: previewingRecord.employee.project?.projectCode,
                period: previewingRecord.month,
                categoryLabel: previewingRecord.typeName || "Khoản thu nhập khác",
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
