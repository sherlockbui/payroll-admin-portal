"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCheck,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Info,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  UploadCloud,
  User,
  X,
  XCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DecisionDocumentPreviewModal } from "@/components/employees/decision-preview-modal";
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
  SearchableSelect,
  TablePaginationFooter,
} from "@/components/ui";
import { api } from "@/lib/api";
import type {
  CreateInsuranceAdjustmentRequest,
  Employee,
  InsuranceAdjustmentDocumentItem,
  InsuranceAdjustmentItem,
  InsuranceAdjustmentStatus,
  InsuranceAdjustmentType,
  UpdateInsuranceAdjustmentRequest,
} from "@/lib/types";
import { cn, formatCurrency, formatDate, formatMonthYear } from "@/lib/utils";

interface InsuranceAdjustmentsSubtabProps {
  projectId: string;
  isAccountant?: boolean;
  periodFilter?: string;
  onPeriodChange?: (period: string) => void;
  setHeaderAction?: (node: ReactNode) => void;
  onOpenImport?: () => void;
}

export function InsuranceAdjustmentsSubtab({
  projectId,
  isAccountant = true,
  periodFilter,
  onPeriodChange,
  setHeaderAction,
  onOpenImport,
}: InsuranceAdjustmentsSubtabProps) {
  const { notify } = useToast();
  const queryClient = useQueryClient();

  // Internal period filter if not provided from parent
  const [internalPeriod, setInternalPeriod] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const effectivePeriod = periodFilter || internalPeriod;
  const handlePeriodChange = (val: string) => {
    if (onPeriodChange) onPeriodChange(val);
    else setInternalPeriod(val);
  };

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Parse Year / Month
  const { filterYear, filterMonth } = useMemo(() => {
    if (effectivePeriod && effectivePeriod.includes("-")) {
      const parts = effectivePeriod.split("-");
      return { filterYear: Number(parts[0]), filterMonth: Number(parts[1]) };
    }
    return { filterYear: undefined, filterMonth: undefined };
  }, [effectivePeriod]);

  // Selected row IDs for bulk actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [projectId, effectivePeriod, typeFilter, statusFilter, searchTerm]);

  // Query: Adjustments List
  const {
    data: adjustmentsResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "insurance-adjustments",
      projectId,
      filterYear,
      filterMonth,
      typeFilter,
      statusFilter,
      searchTerm,
      currentPage,
      pageSize,
    ],
    queryFn: () =>
      api.getInsuranceAdjustments({
        projectId: projectId === "all" ? undefined : projectId,
        year: filterYear,
        month: filterMonth,
        adjustmentType: typeFilter === "ALL" ? undefined : typeFilter,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        keyword: searchTerm,
        pageIndex: currentPage,
        pageSize,
      }),
  });

  const adjustmentsList = adjustmentsResponse?.items || [];
  const totalCount = adjustmentsResponse?.totalCount || adjustmentsResponse?.total || 0;

  // Form Modal State (Thêm mới / Sửa)
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InsuranceAdjustmentItem | null>(null);

  // Form Fields
  const [formEmployeeCode, setFormEmployeeCode] = useState("");
  const [formType, setFormType] = useState<InsuranceAdjustmentType>("PREV_PERIOD_ADJ");
  const [formApplyPeriod, setFormApplyPeriod] = useState(() => effectivePeriod);
  const [formRefPeriod, setFormRefPeriod] = useState(() => effectivePeriod);
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formIsNegative, setFormIsNegative] = useState<boolean>(false); // Dành cho thoái thu / hoàn tiền
  const [formDecisionNumber, setFormDecisionNumber] = useState("");
  const [formDecisionDate, setFormDecisionDate] = useState("");
  const [formNote, setFormNote] = useState("");

  // Query: Project Employees for Form Modal
  const { data: projectEmployees = [], isLoading: isEmployeesLoading } = useQuery({
    queryKey: ["project-employees-v3", projectId],
    queryFn: () => api.getProjectEmployeesV3(projectId),
    enabled: formModalOpen,
  });

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingRecord(null);
    setFormEmployeeCode("");
    setFormType("PREV_PERIOD_ADJ");
    setFormApplyPeriod(effectivePeriod);
    setFormRefPeriod(effectivePeriod);
    setFormAmount(0);
    setFormIsNegative(false);
    setFormDecisionNumber("");
    setFormDecisionDate("");
    setFormNote("");
    setFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (rec: InsuranceAdjustmentItem) => {
    setEditingRecord(rec);
    setFormEmployeeCode(rec.employeeCode);
    setFormType(rec.adjustmentType);
    setFormApplyPeriod(`${rec.applyYear}-${String(rec.applyMonth).padStart(2, "0")}`);
    if (rec.refYear && rec.refMonth) {
      setFormRefPeriod(`${rec.refYear}-${String(rec.refMonth).padStart(2, "0")}`);
    } else {
      setFormRefPeriod(effectivePeriod);
    }
    setFormAmount(Math.abs(rec.amount));
    setFormIsNegative(rec.amount < 0);
    setFormDecisionNumber(rec.decisionNumber || "");
    setFormDecisionDate(rec.decisionDate || "");
    setFormNote(rec.note || "");
    setFormModalOpen(true);
  };

  // Mutation: Create / Update
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formEmployeeCode) throw new Error("Vui lòng chọn nhân viên!");
      if (!formApplyPeriod) throw new Error("Vui lòng chọn kỳ áp dụng!");

      const [applyY, applyM] = formApplyPeriod.split("-").map(Number);
      let refY: number | undefined;
      let refM: number | undefined;

      if (formType === "PREV_PERIOD_ADJ") {
        if (!formRefPeriod) throw new Error("Khoản điều chỉnh kỳ trước bắt buộc phải chọn kỳ gốc!");
        const [ry, rm] = formRefPeriod.split("-").map(Number);
        refY = ry;
        refM = rm;
      }

      let finalAmount = Math.abs(formAmount);
      if (finalAmount === 0) throw new Error("Số tiền điều chỉnh không được bằng 0!");

      if (formType === "PREV_PERIOD_ADJ") {
        if (formIsNegative) finalAmount = -finalAmount;
      } else {
        // HI_CARD_DEDUCTION & HI_CARD_REFUND luôn lưu số dương vào DB
        finalAmount = Math.abs(formAmount);
      }

      const emp = projectEmployees.find((e) => e.employeeCode === formEmployeeCode);
      const targetProjId = projectId && projectId !== "all" ? Number(projectId) : (emp?.projectId || undefined);

      if (editingRecord) {
        const payload: UpdateInsuranceAdjustmentRequest = {
          employeeCode: formEmployeeCode,
          adjustmentType: formType,
          projectId: targetProjId,
          applyYear: applyY,
          applyMonth: applyM,
          refYear: refY,
          refMonth: refM,
          amount: finalAmount,
          decisionNumber: formDecisionNumber.trim() || undefined,
          decisionDate: formDecisionDate || undefined,
          note: formNote.trim() || undefined,
        };
        return api.updateInsuranceAdjustment(editingRecord.id, payload);
      } else {
        const payload: CreateInsuranceAdjustmentRequest = {
          employeeCode: formEmployeeCode,
          adjustmentType: formType,
          projectId: targetProjId,
          applyYear: applyY,
          applyMonth: applyM,
          refYear: refY,
          refMonth: refM,
          amount: finalAmount,
          decisionNumber: formDecisionNumber.trim() || undefined,
          decisionDate: formDecisionDate || undefined,
          note: formNote.trim() || undefined,
        };
        return api.createInsuranceAdjustment(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-adjustments"] });
      setFormModalOpen(false);
      notify(editingRecord ? "Cập nhật điều chỉnh thành công!" : "Tạo khoản điều chỉnh BHXH thành công!");
    },
    onError: (err: any) => {
      notify(err?.message || "Lỗi khi lưu khoản điều chỉnh", "error");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteInsuranceAdjustment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-adjustments"] });
      notify("Đã xóa khoản điều chỉnh!");
    },
    onError: (err: any) => {
      notify(err?.message || "Lỗi khi xóa khoản điều chỉnh", "error");
    },
  });

  // Confirm Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<InsuranceAdjustmentItem | null>(null);
  const [confirmNote, setConfirmNote] = useState("");

  const confirmMutation = useMutation({
    mutationFn: async ({ id, note }: { id: number; note: string }) => {
      return api.confirmInsuranceAdjustment(id, { note: note.trim() || undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-adjustments"] });
      setConfirmModalOpen(false);
      setConfirmTarget(null);
      notify("Đã phê duyệt khoản điều chỉnh vào bảng lương!");
    },
    onError: (err: any) => {
      notify(err?.message || "Lỗi khi duyệt khoản điều chỉnh", "error");
    },
  });

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<InsuranceAdjustmentItem | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const rejectMutation = useMutation({
    mutationFn: async ({ id, note }: { id: number; note: string }) => {
      return api.rejectInsuranceAdjustment(id, { note: note.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-adjustments"] });
      setRejectModalOpen(false);
      setRejectTarget(null);
      notify("Đã từ chối khoản điều chỉnh!");
    },
    onError: (err: any) => {
      notify(err?.message || "Lỗi khi từ chối khoản điều chỉnh", "error");
    },
  });

  // Document Management Modal / Drawer
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docTarget, setDocTarget] = useState<InsuranceAdjustmentItem | null>(null);
  const [docList, setDocList] = useState<InsuranceAdjustmentDocumentItem[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  // Preview Document Modal
  const [previewDocumentOpen, setPreviewDocumentOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const handleOpenDocModal = async (rec: InsuranceAdjustmentItem) => {
    setDocTarget(rec);
    setDocList(rec.documents || []);
    setDocModalOpen(true);
    try {
      const detail = await api.getInsuranceAdjustmentDetail(rec.id);
      if (detail && detail.documents) {
        setDocList(detail.documents);
      }
    } catch {
      // Fallback to record documents
    }
  };

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !docTarget) return;

    try {
      setUploadingDoc(true);
      await api.uploadInsuranceAdjustmentDocument(docTarget.id, file, "DECISION");
      notify("Đã tải lên tệp chứng từ thành công!");
      // Reload detail
      const detail = await api.getInsuranceAdjustmentDetail(docTarget.id);
      setDocList(detail.documents || []);
      queryClient.invalidateQueries({ queryKey: ["insurance-adjustments"] });
    } catch (err: any) {
      notify(err?.message || "Lỗi khi tải tài liệu", "error");
    } finally {
      setUploadingDoc(false);
      if (docFileInputRef.current) docFileInputRef.current.value = "";
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa tài liệu này?")) return;
    try {
      await api.deleteInsuranceAdjustmentDocument(docId);
      setDocList((prev) => prev.filter((d) => d.id !== docId));
      notify("Đã xóa tài liệu đính kèm!");
      queryClient.invalidateQueries({ queryKey: ["insurance-adjustments"] });
    } catch (err: any) {
      notify(err?.message || "Lỗi khi xóa tài liệu", "error");
    }
  };

  // Bulk Actions
  const pendingSelected = useMemo(() => {
    return adjustmentsList.filter((item) => selectedIds.includes(item.id) && item.status === "pending");
  }, [adjustmentsList, selectedIds]);

  const handleBulkConfirm = async () => {
    if (pendingSelected.length === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn duyệt ${pendingSelected.length} khoản điều chỉnh đang chờ duyệt?`)) return;

    let successCount = 0;
    for (const item of pendingSelected) {
      try {
        await api.confirmInsuranceAdjustment(item.id, { note: "Duyệt hàng loạt bởi kế toán" });
        successCount++;
      } catch {
        // Continue next
      }
    }
    notify(`Đã phê duyệt thành công ${successCount}/${pendingSelected.length} khoản điều chỉnh.`);
    setSelectedIds([]);
    queryClient.invalidateQueries({ queryKey: ["insurance-adjustments"] });
  };

  // Header Actions sync
  useEffect(() => {
    if (setHeaderAction) {
      setHeaderAction(
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 font-medium shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Làm mới
          </Button>
          {onOpenImport && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenImport}
              className="gap-1.5 font-medium shrink-0"
            >
              <UploadCloud className="w-3.5 h-3.5" /> Import Excel
            </Button>
          )}
          {isAccountant && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreate}
              className="gap-1.5 font-medium shrink-0 bg-primary hover:bg-primary-hover text-white"
            >
              <Plus className="w-3.5 h-3.5 text-white" /> Thêm điều chỉnh
            </Button>
          )}
        </div>
      );
    }
    return () => {
      if (setHeaderAction) setHeaderAction(null);
    };
  }, [setHeaderAction, isAccountant, onOpenImport, refetch]);

  // Badges
  const renderAdjustmentTypeBadge = (type: InsuranceAdjustmentType) => {
    switch (type) {
      case "PREV_PERIOD_ADJ":
        return (
          <Badge tone="info">
            <span className="inline-flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3" /> Điều chỉnh kỳ trước
            </span>
          </Badge>
        );
      case "HI_CARD_DEDUCTION":
        return (
          <Badge tone="danger">
            <span className="inline-flex items-center gap-1 font-medium">
              <ArrowDownLeft className="w-3 h-3 text-rose-600" /> Trừ thẻ BHYT
            </span>
          </Badge>
        );
      case "HI_CARD_REFUND":
        return (
          <Badge tone="success">
            <span className="inline-flex items-center gap-1 font-medium">
              <ArrowUpRight className="w-3 h-3 text-emerald-600" /> Thối thu thẻ BHYT
            </span>
          </Badge>
        );
      default:
        return <Badge tone="neutral">{type}</Badge>;
    }
  };

  const renderStatusBadge = (status: InsuranceAdjustmentStatus) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge tone="success">
            <span className="inline-flex items-center gap-1 font-medium">
              <CheckCheck className="w-3 h-3" /> Đã duyệt
            </span>
          </Badge>
        );
      case "rejected":
        return (
          <Badge tone="danger">
            <span className="inline-flex items-center gap-1 font-medium">
              <XCircle className="w-3 h-3" /> Từ chối
            </span>
          </Badge>
        );
      default:
        return (
          <Badge tone="warning">
            <span className="inline-flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3" /> Chờ duyệt
            </span>
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="p-3 bg-card border border-border rounded-xl shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Kỳ áp dụng lương</label>
            <MonthPicker
              value={effectivePeriod}
              onChange={handlePeriodChange}
              placeholder="Chọn tháng/năm..."
              className="w-full [&>.month-picker-trigger]:w-full [&>.month-picker-trigger]:h-[38px] [&>.month-picker-trigger]:min-h-[38px] [&>.month-picker-trigger]:rounded-lg [&>.month-picker-trigger]:bg-card"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Loại điều chỉnh</label>
            <SearchableSelect
              options={[
                { value: "ALL", label: "Tất cả loại điều chỉnh" },
                { value: "PREV_PERIOD_ADJ", label: "Điều chỉnh kỳ trước trừ chi phí NLĐ" },
                { value: "HI_CARD_DEDUCTION", label: "Trừ thẻ BHYT" },
                { value: "HI_CARD_REFUND", label: "Thối thu lại tiền thẻ cho NLĐ" },
              ]}
              value={typeFilter}
              onChange={(val) => setTypeFilter(val)}
              allowClear={false}
              searchable={false}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Trạng thái phê duyệt</label>
            <SearchableSelect
              options={[
                { value: "ALL", label: "Tất cả trạng thái" },
                { value: "pending", label: "Chờ duyệt (Pending)" },
                { value: "confirmed", label: "Đã duyệt (Confirmed)" },
                { value: "rejected", label: "Từ chối (Rejected)" },
              ]}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              allowClear={false}
              searchable={false}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Tìm kiếm nhân viên</label>
            <SearchInput
              value={searchTerm}
              onChange={(val) => setSearchTerm(val)}
              placeholder="Mã GID hoặc Họ tên..."
              containerClassName="w-full max-w-none"
            />
          </div>
        </div>

        {/* Bulk Action Bar (Hiển thị khi tick chọn các dòng) */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-2.5 bg-primary/5 border border-primary/20 rounded-lg text-xs animate-in fade-in">
            <div className="flex items-center gap-2 text-primary font-medium">
              <Check className="w-4 h-4" />
              <span>
                Đã chọn <b>{selectedIds.length}</b> bản ghi ({pendingSelected.length} bản ghi chờ duyệt)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedIds([])}
                className="text-xs h-7 px-2.5"
              >
                Bỏ chọn
              </Button>
              {pendingSelected.length > 0 && isAccountant && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleBulkConfirm}
                  className="text-xs h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Duyệt hàng loạt ({pendingSelected.length})
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Table Area */}
      <div className="data-table-wrap border border-border rounded-xl bg-card overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-6">
            <LoadingBlock rows={6} />
          </div>
        ) : isError ? (
          <div className="p-6">
            <ErrorState
              message="Không thể tải danh sách điều chỉnh BHXH. Đã xảy ra lỗi kết nối tới máy chủ. Vui lòng thử lại sau."
              retry={() => refetch()}
            />
          </div>
        ) : adjustmentsList.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Chưa có khoản điều chỉnh BHXH nào"
              description={
                searchTerm || typeFilter !== "ALL" || statusFilter !== "ALL"
                  ? "Không tìm thấy bản ghi nào phù hợp với bộ lọc hiện tại."
                  : `Trong kỳ lương ${formatMonthYear(effectivePeriod)}, chưa ghi nhận khoản điều chỉnh BHXH hoặc thẻ BHYT nào.`
              }
              action={
                isAccountant ? (
                  <Button variant="primary" size="sm" onClick={handleOpenCreate} className="gap-1.5 mt-2">
                    <Plus className="w-3.5 h-3.5" /> Thêm khoản điều chỉnh đầu tiên
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[950px] w-full text-xs">
              <thead>
                <tr>
                  <th style={{ width: "40px" }} className="text-center">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả"
                      checked={
                        adjustmentsList.length > 0 &&
                        adjustmentsList.every((it) => selectedIds.includes(it.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(adjustmentsList.map((it) => it.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      className="rounded border-slate-300 text-primary cursor-pointer"
                    />
                  </th>
                  <th style={{ width: "190px" }}>NHÂN VIÊN</th>
                  <th style={{ width: "160px" }}>LOẠI ĐIỀU CHỈNH</th>
                  <th style={{ width: "95px" }} className="text-center">KỲ ÁP DỤNG</th>
                  <th style={{ width: "95px" }} className="text-center">KỲ GỐC</th>
                  <th style={{ width: "135px" }} className="text-right">SỐ TIỀN (VNĐ)</th>
                  <th style={{ width: "160px" }}>CĂN CỨ / QUYẾT ĐỊNH</th>
                  <th style={{ width: "95px" }} className="text-center">CHỨNG TỪ</th>
                  <th style={{ width: "115px" }} className="text-center">TRẠNG THÁI</th>
                  <th style={{ width: "140px" }} className="text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {adjustmentsList.map((rec) => {
                  const isChecked = selectedIds.includes(rec.id);
                  const isNegative = rec.amount < 0;

                  return (
                    <tr
                      key={rec.id}
                      className={cn(
                        "hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors",
                        isChecked && "bg-primary/5"
                      )}
                    >
                      {/* Checkbox */}
                      <td className="text-center">
                        <input
                          type="checkbox"
                          aria-label={`Chọn khoản điều chỉnh ${rec.employeeCode}`}
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds((prev) => [...prev, rec.id]);
                            else setSelectedIds((prev) => prev.filter((id) => id !== rec.id));
                          }}
                          className="rounded border-slate-300 text-primary cursor-pointer"
                        />
                      </td>

                      {/* Nhân viên */}
                      <td>
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>{rec.employeeName || rec.employee?.fullName || rec.employeeCode}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {rec.employeeCode}
                          {rec.projectName && ` • ${rec.projectName}`}
                        </div>
                      </td>

                      {/* Loại điều chỉnh */}
                      <td>{renderAdjustmentTypeBadge(rec.adjustmentType)}</td>

                      {/* Kỳ áp dụng */}
                      <td className="text-center font-mono font-medium">
                        {String(rec.applyMonth).padStart(2, "0")}/{rec.applyYear}
                      </td>

                      {/* Kỳ gốc */}
                      <td className="text-center font-mono text-muted-foreground">
                        {rec.refMonth && rec.refYear
                          ? `${String(rec.refMonth).padStart(2, "0")}/${rec.refYear}`
                          : "—"}
                      </td>

                      {/* Số tiền */}
                      <td className="text-right">
                        <div
                          className={cn(
                            "font-bold font-mono text-xs",
                            isNegative
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          )}
                        >
                          {isNegative ? "" : "+"}
                          {formatCurrency(rec.amount)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {rec.adjustmentType === "HI_CARD_REFUND" || isNegative
                            ? "Giảm trừ lương"
                            : "Khấu trừ thêm"}
                        </div>
                      </td>

                      {/* Căn cứ / Quyết định */}
                      <td>
                        {rec.decisionNumber ? (
                          <div className="font-semibold text-foreground text-[11px]">
                            {rec.decisionNumber}
                            {rec.decisionDate && (
                              <span className="text-muted-foreground font-normal">
                                {" "}
                                ({formatDate(rec.decisionDate)})
                              </span>
                            )}
                          </div>
                        ) : null}
                        <div className="text-[11px] text-muted-foreground truncate max-w-[150px]" title={rec.note || ""}>
                          {rec.note || "—"}
                        </div>
                      </td>

                      {/* Chứng từ đính kèm */}
                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenDocModal(rec)}
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors cursor-pointer",
                            (rec.documentCount || 0) > 0
                              ? "border-primary/40 text-primary bg-primary/5 hover:bg-primary/10"
                              : "border-slate-200 dark:border-slate-700 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                          title="Xem / Quản lý tài liệu đính kèm"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>{rec.documentCount || (rec.documents?.length || 0)}</span>
                        </button>
                      </td>

                      {/* Trạng thái */}
                      <td className="text-center">{renderStatusBadge(rec.status)}</td>

                      {/* Thao tác */}
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {rec.status === "pending" && isAccountant && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmTarget(rec);
                                  setConfirmNote(rec.note || "");
                                  setConfirmModalOpen(true);
                                }}
                                className="inline-flex items-center gap-0.5 h-6 px-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded shadow-xs cursor-pointer"
                                title="Phê duyệt khoản điều chỉnh vào bảng lương"
                              >
                                <Check className="w-3 h-3" /> Duyệt
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectTarget(rec);
                                  setRejectNote("");
                                  setRejectModalOpen(true);
                                }}
                                className="inline-flex items-center gap-0.5 h-6 px-1.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 rounded shadow-xs cursor-pointer"
                                title="Từ chối khoản điều chỉnh"
                              >
                                <X className="w-3 h-3" /> Từ chối
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(rec)}
                                className="p-1 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                title="Chỉnh sửa thông tin"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm("Bạn có chắc chắn muốn xóa khoản điều chỉnh này?")) {
                                    deleteMutation.mutate(rec.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors cursor-pointer"
                                title="Xóa khoản điều chỉnh"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {rec.status !== "pending" && (
                            <button
                              type="button"
                              onClick={() => handleOpenDocModal(rec)}
                              className="text-xs text-muted-foreground hover:text-primary font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> Chi tiết
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <TablePaginationFooter
            totalItems={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>

      {/* ================= Modal: Thêm mới / Chỉnh sửa Điều chỉnh ================= */}
      <Modal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        title={editingRecord ? "Chỉnh sửa khoản điều chỉnh BHXH" : "Thêm mới khoản điều chỉnh BHXH"}
        description="Khai báo khoản điều chỉnh kỳ trước, trừ thẻ BHYT hoặc thối thu thẻ BHYT cho NLĐ."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button variant="secondary" size="sm" onClick={() => setFormModalOpen(false)}>
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={saveMutation.isPending}
              disabled={saveMutation.isPending || !formEmployeeCode || formAmount === 0}
              onClick={() => saveMutation.mutate()}
              className="gap-1.5 font-semibold bg-primary hover:bg-primary-hover text-white cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-white" />
              <span>{editingRecord ? "Cập nhật thay đổi" : "Lưu khoản điều chỉnh"}</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs py-1">
          {/* Chọn nhân viên */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Nhân viên <span className="text-rose-500">*</span>
            </label>
            <GsEmployeeSelect
              employees={projectEmployees}
              value={formEmployeeCode}
              onChange={(code) => setFormEmployeeCode(code)}
              placeholder="-- Tìm và chọn nhân viên theo mã hoặc họ tên --"
              isLoading={isEmployeesLoading}
            />
          </div>

          {/* Loại điều chỉnh & Kỳ áp dụng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Loại điều chỉnh <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                options={[
                  { value: "PREV_PERIOD_ADJ", label: "Điều chỉnh kỳ trước trừ chi phí NLĐ" },
                  { value: "HI_CARD_DEDUCTION", label: "Trừ thẻ BHYT" },
                  { value: "HI_CARD_REFUND", label: "Thối thu lại tiền thẻ cho NLĐ" },
                ]}
                value={formType}
                onChange={(val) => setFormType(val as InsuranceAdjustmentType)}
                allowClear={false}
                searchable={false}
              />
            </div>

            <div>
              <MonthPicker
                label="Tháng áp dụng lương"
                value={formApplyPeriod}
                onChange={setFormApplyPeriod}
                variant="form"
              />
            </div>
          </div>

          {/* Nếu là PREV_PERIOD_ADJ: Hiển thị thêm Kỳ gốc & Toggle Thoái thu */}
          {formType === "PREV_PERIOD_ADJ" && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <MonthPicker
                    label="Tháng kỳ gốc phát sinh"
                    value={formRefPeriod}
                    onChange={setFormRefPeriod}
                    variant="form"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Tháng gốc trong quá khứ phát sinh việc truy thu / thoái thu.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Tính chất số tiền</label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-200">
                      <input
                        type="radio"
                        name="adjPolarity"
                        checked={!formIsNegative}
                        onChange={() => setFormIsNegative(false)}
                        className="text-primary"
                      />
                      <span>Truy thu thêm (+)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-200">
                      <input
                        type="radio"
                        name="adjPolarity"
                        checked={formIsNegative}
                        onChange={() => setFormIsNegative(true)}
                        className="text-emerald-600"
                      />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Thoái thu / Hoàn tiền (-)
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Số tiền điều chỉnh */}
          <div>
            <GsMoneyInput
              label="Số tiền điều chỉnh (VNĐ)"
              required
              value={formAmount}
              onChange={(val) => setFormAmount(val)}
              placeholder="Nhập số tiền (VD: 250.000)..."
              inputClassName="text-primary font-bold font-mono text-base"
            />
            {/* Live Impact Preview */}
            {formAmount > 0 && (
              <div
                className={cn(
                  "mt-2 p-2.5 rounded-lg text-xs flex items-center gap-2 border",
                  formType === "HI_CARD_REFUND" || (formType === "PREV_PERIOD_ADJ" && formIsNegative)
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-300"
                    : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 text-rose-800 dark:text-rose-300"
                )}
              >
                <Info className="w-4 h-4 shrink-0" />
                <span>
                  <b>Tác động bảng lương:</b>{" "}
                  {formType === "HI_CARD_REFUND" || (formType === "PREV_PERIOD_ADJ" && formIsNegative) ? (
                    <>
                      Làm <b>GIẢM tổng khấu trừ</b> của người lao động{" "}
                      <b>{formatCurrency(formAmount)}</b> (tương đương trả lại tiền vào thực nhận).
                    </>
                  ) : (
                    <>
                      Làm <b>TĂNG tổng khấu trừ</b> của người lao động thêm{" "}
                      <b>{formatCurrency(formAmount)}</b> trên bảng lương.
                    </>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Căn cứ quyết định */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Số quyết định / Biên bản
              </label>
              <input
                type="text"
                value={formDecisionNumber}
                onChange={(e) => setFormDecisionNumber(e.target.value)}
                placeholder="VD: QĐ-124/2026/HR..."
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <GsDatePicker
                label="Ngày ban hành quyết định"
                value={formDecisionDate}
                onChange={setFormDecisionDate}
                placeholder="dd/mm/yyyy"
              />
            </div>
          </div>

          {/* Ghi chú lý do */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Ghi chú / Căn cứ giải trình</label>
            <textarea
              rows={2}
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="Nhập lý do điều chỉnh hoặc căn cứ công văn BHXH gửi về..."
              className="w-full p-2.5 rounded-lg border border-border bg-background text-xs focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* ================= Modal: Duyệt Khoản Điều Chỉnh ================= */}
      {confirmTarget && (
        <Modal
          open={confirmModalOpen}
          onOpenChange={(open) => {
            setConfirmModalOpen(open);
            if (!open) setConfirmTarget(null);
          }}
          title="Xác nhận phê duyệt Điều chỉnh BHXH"
          description={`Phê duyệt khoản điều chỉnh cho nhân viên ${confirmTarget.employeeName || confirmTarget.employeeCode} để nạp vào Bảng lương ${confirmTarget.applyMonth}/${confirmTarget.applyYear}.`}
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2.5">
              <Button variant="secondary" size="sm" onClick={() => setConfirmModalOpen(false)}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={confirmMutation.isPending}
                onClick={() =>
                  confirmMutation.mutate({ id: confirmTarget.id, note: confirmNote })
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Đồng ý Duyệt
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs py-1">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 border border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Loại điều chỉnh:</span>
                <span className="font-semibold">{confirmTarget.adjustmentTypeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Số tiền:</span>
                <span className="font-bold font-mono text-sm text-foreground">
                  {formatCurrency(confirmTarget.amount)}
                </span>
              </div>
              {confirmTarget.decisionNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số quyết định:</span>
                  <span>{confirmTarget.decisionNumber}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Ghi chú phê duyệt (Đối soát)
              </label>
              <input
                type="text"
                value={confirmNote}
                onChange={(e) => setConfirmNote(e.target.value)}
                placeholder="VD: Đã đối chiếu khớp số liệu cơ quan BHXH..."
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ================= Modal: Từ Chối Khoản Điều Chỉnh ================= */}
      {rejectTarget && (
        <Modal
          open={rejectModalOpen}
          onOpenChange={(open) => {
            setRejectModalOpen(open);
            if (!open) setRejectTarget(null);
          }}
          title="Từ chối khoản điều chỉnh BHXH"
          description={`Khoản điều chỉnh này sẽ bị từ chối và KHÔNG được nạp vào Bảng lương kỳ ${rejectTarget.applyMonth}/${rejectTarget.applyYear}.`}
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2.5">
              <Button variant="secondary" size="sm" onClick={() => setRejectModalOpen(false)}>
                Hủy bỏ
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={rejectMutation.isPending}
                disabled={!rejectNote.trim()}
                onClick={() =>
                  rejectMutation.mutate({ id: rejectTarget.id, note: rejectNote })
                }
                className="gap-1.5 font-semibold"
              >
                <XCircle className="w-3.5 h-3.5" /> Xác nhận Từ chối
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs py-1">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Lý do từ chối <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Nhập lý do từ chối chi tiết (VD: Sai lệch số tiền, chứng từ gốc chưa hợp lệ)..."
                className="w-full p-2.5 rounded-lg border border-border bg-background text-xs focus:outline-hidden focus:ring-1 focus:ring-rose-500 resize-none"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ================= Modal: Quản lý Chứng từ Đính kèm ================= */}
      {docTarget && (
        <Modal
          open={docModalOpen}
          onOpenChange={(open) => {
            setDocModalOpen(open);
            if (!open) setDocTarget(null);
          }}
          title="Hồ sơ & Chứng từ đính kèm"
          description={`Biên bản, quyết định hoặc công văn minh chứng cho khoản điều chỉnh của ${docTarget.employeeName || docTarget.employeeCode}.`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <div>
                <input
                  type="file"
                  ref={docFileInputRef}
                  onChange={handleUploadDocument}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  className="hidden"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  loading={uploadingDoc}
                  onClick={() => docFileInputRef.current?.click()}
                  className="gap-1.5 text-xs font-medium"
                >
                  <Upload className="w-3.5 h-3.5" /> Tải lên tài liệu mới
                </Button>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setDocModalOpen(false)}>
                Đóng
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs py-1">
            {docList.length === 0 ? (
              <EmptyState
                title="Chưa có tài liệu đính kèm"
                description="Bấm nút 'Tải lên tài liệu mới' bên dưới để đính kèm quyết định hoặc biên bản xác minh."
              />
            ) : (
              <div className="space-y-2">
                {docList.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 bg-card border border-border rounded-xl flex items-center justify-between hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-7 h-7 text-primary/80 shrink-0" />
                      <div>
                        <div className="font-semibold text-foreground text-xs hover:text-primary cursor-pointer">
                          {doc.fileName}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {doc.documentType || "Quyết định / Biên bản"} •{" "}
                          {doc.createdAt ? formatDate(doc.createdAt) : "Gần đây"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewData({
                            type: "insurance",
                            employeeCode: docTarget.employeeCode,
                            employeeName: docTarget.employeeName || "",
                            period: `${docTarget.applyMonth}/${docTarget.applyYear}`,
                            categoryLabel: docTarget.adjustmentTypeName || "Khoản điều chỉnh BHXH",
                            amount: docTarget.amount,
                            decisionNo: docTarget.decisionNumber || undefined,
                            reason: docTarget.note || undefined,
                            attachmentName: doc.fileName,
                            attachmentUrl: doc.filePath,
                          });
                          setPreviewDocumentOpen(true);
                        }}
                        className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors"
                        title="Xem trước tài liệu"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors"
                        title="Xóa tài liệu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal Xem trước file tài liệu */}
      {previewData && (
        <DecisionDocumentPreviewModal
          open={previewDocumentOpen}
          onOpenChange={setPreviewDocumentOpen}
          data={previewData}
        />
      )}
    </div>
  );
}
