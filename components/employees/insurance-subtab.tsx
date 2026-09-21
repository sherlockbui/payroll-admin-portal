"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  Check,
  CheckCheck,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  History,
  Info,
  Paperclip,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  UploadCloud,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
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
  ConfirmInsuranceChangeRequest,
  CreateInsuranceChangeRequest,
  Employee,
  InsuranceChangeItemV3,
  InsuranceChangeStatus,
  InsuranceChangeType,
  InsuranceContributionPreview,
  InsuranceParticipantItemV3,
  InsuranceParticipationStatus,
  MedicalFacilityItemV3,
} from "@/lib/types";
import { cn, formatCurrency, formatDate, formatMonthYear } from "@/lib/utils";

export function InsuranceSubtab({
  projectId,
  employees,
  isAccountant = true,
  setHeaderAction,
}: {
  projectId: string;
  employees: Employee[];
  isAccountant?: boolean;
  setHeaderAction?: (node: ReactNode) => void;
}) {
  const { notify } = useToast();
  const queryClient = useQueryClient();

  // Active view: "members" (Sổ BHXH) | "changes" (Biến động D02-LT)
  const [activeView, setActiveView] = useState<"members" | "changes">("members");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [memberStatusFilter, setMemberStatusFilter] = useState<string>("ALL");
  const [changeStatusFilter, setChangeStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [declareModalOpen, setDeclareModalOpen] = useState(false);
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState("");
  const [declareType, setDeclareType] = useState<string>("TANG_MOI");
  const [declareEffectiveFrom, setDeclareEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [declareNewSalary, setDeclareNewSalary] = useState<number>(5000000);
  const [declareBookNumber, setDeclareBookNumber] = useState("");
  const [declareMedicalFacilityId, setDeclareMedicalFacilityId] = useState<number | undefined>(undefined);
  const [declareReason, setDeclareReason] = useState("");

  // Reconcile modal (Xác nhận đối soát cơ quan BHXH)
  const [reconcileChange, setReconcileChange] = useState<InsuranceChangeItemV3 | null>(null);
  const [reconciliationCode, setReconciliationCode] = useState("");

  // History modal
  const [historyMember, setHistoryMember] = useState<InsuranceParticipantItemV3 | null>(null);
  const [historyList, setHistoryList] = useState<InsuranceChangeItemV3[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Import modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      await api.downloadInsuranceImportTemplateV3();
      notify("Đã tải xuống biểu mẫu khai báo BHXH (.xlsx)");
    } catch {
      notify("Không thể tải file mẫu. Vui lòng thử lại sau.", "error");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // Preview Document Modal
  const [previewDocumentOpen, setPreviewDocumentOpen] = useState(false);
  const [previewingRecord, setPreviewingRecord] = useState<InsuranceChangeItemV3 | null>(null);

  // Reset page when switching views or filters
  useEffect(() => {
    setCurrentPage(1);
  }, [activeView, projectId, memberStatusFilter, changeStatusFilter, searchTerm]);

  // Query: Medical Facilities
  const { data: medicalFacilities = [] } = useQuery({
    queryKey: ["web-payroll-insurance-medical-facilities"],
    queryFn: () => api.getInsuranceMedicalFacilitiesV3(),
    staleTime: 1000 * 60 * 10,
  });

  // Query: Participants List
  const {
    data: participantsResponse,
    isLoading: isParticipantsLoading,
    isError: isParticipantsError,
    refetch: refetchParticipants,
  } = useQuery({
    queryKey: [
      "web-payroll-insurance-participants",
      projectId,
      memberStatusFilter,
      searchTerm,
      currentPage,
      pageSize,
    ],
    queryFn: () =>
      api.getInsuranceParticipantsV3({
        projectId: projectId === "all" ? undefined : projectId,
        status: memberStatusFilter === "ALL" ? undefined : memberStatusFilter,
        keyword: searchTerm,
        pageIndex: currentPage,
        pageSize,
      }),
    enabled: activeView === "members",
  });

  // Query: Changes List (D02-LT)
  const {
    data: changesResponse,
    isLoading: isChangesLoading,
    isError: isChangesError,
    refetch: refetchChanges,
  } = useQuery({
    queryKey: [
      "web-payroll-insurance-changes",
      projectId,
      changeStatusFilter,
      searchTerm,
      currentPage,
      pageSize,
    ],
    queryFn: () =>
      api.getInsuranceChangesV3({
        projectId: projectId === "all" ? undefined : projectId,
        status: changeStatusFilter === "ALL" ? undefined : changeStatusFilter,
        keyword: searchTerm,
        pageIndex: currentPage,
        pageSize,
      }),
    enabled: activeView === "changes",
  });

  // Query: Live Contribution Preview for Form Modal
  const { data: contributionPreview } = useQuery({
    queryKey: ["web-payroll-insurance-preview", declareNewSalary],
    queryFn: () => api.previewInsuranceContributionV3({ baseSalary: declareNewSalary }),
    enabled: declareModalOpen && declareNewSalary > 0,
  });

  const participantsList = participantsResponse?.items ?? [];
  const totalParticipants = participantsResponse?.total ?? 0;
  const summary = participantsResponse?.summary;

  const changesList = changesResponse?.items ?? [];
  const totalChanges = changesResponse?.total ?? 0;

  // Open Declare Modal
  const handleOpenDeclare = () => {
    setSelectedEmployeeCode(employees[0]?.code || "");
    setDeclareType("TANG_MOI");
    setDeclareEffectiveFrom(new Date().toISOString().slice(0, 10));
    setDeclareNewSalary(5000000);
    setDeclareBookNumber("");
    setDeclareMedicalFacilityId(medicalFacilities[0]?.id);
    setDeclareReason("");
    setDeclareModalOpen(true);
  };

  // Mutation: Create Insurance Change
  const createChangeMutation = useMutation({
    mutationFn: async () => {
      const payload: CreateInsuranceChangeRequest = {
        projectId: projectId && projectId !== "all" ? Number(projectId) : undefined,
        employeeCode: selectedEmployeeCode,
        changeType: declareType,
        effectiveFrom: declareEffectiveFrom,
        newBaseSalary: declareNewSalary,
        newInsuranceBookNumber: declareBookNumber.trim() || undefined,
        newMedicalFacilityId: declareMedicalFacilityId,
        reason: declareReason.trim() || undefined,
      };
      return api.createInsuranceChangeV3(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web-payroll-insurance-changes"] });
      queryClient.invalidateQueries({ queryKey: ["web-payroll-insurance-participants"] });
      setDeclareModalOpen(false);
      notify("Đã lập hồ sơ biến động BHXH (D02-LT) thành công!");
    },
    onError: (err: any) => {
      notify(err?.message || "Lỗi khi lập hồ sơ biến động BHXH", "error");
    },
  });

  // Mutation: Confirm Reconcile (Xác nhận đối soát)
  const confirmReconcileMutation = useMutation({
    mutationFn: async ({ id, code }: { id: number; code: string }) => {
      const payload: ConfirmInsuranceChangeRequest = { externalDossierCode: code };
      return api.confirmInsuranceChangeV3(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web-payroll-insurance-changes"] });
      queryClient.invalidateQueries({ queryKey: ["web-payroll-insurance-participants"] });
      setReconcileChange(null);
      setReconciliationCode("");
      notify("Đã xác nhận đối soát hồ sơ cơ quan BHXH thành công!");
    },
    onError: (err: any) => {
      notify(err?.message || "Lỗi khi xác nhận đối soát", "error");
    },
  });

  // Mutation: Import Excel
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      return api.importInsuranceExcelV3(file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web-payroll-insurance-participants"] });
      queryClient.invalidateQueries({ queryKey: ["web-payroll-insurance-changes"] });
      setImportModalOpen(false);
      setImportFile(null);
      notify("Nhập dữ liệu BHXH từ Excel thành công!");
    },
    onError: (err: any) => {
      notify(err?.message || "Lỗi khi import file Excel", "error");
    },
  });

  // View Member History
  const handleViewHistory = async (member: InsuranceParticipantItemV3) => {
    setHistoryMember(member);
    setLoadingHistory(true);
    try {
      const res = await api.getInsuranceChangesV3({
        keyword: member.employee.employeeCode,
        pageSize: 50,
      });
      setHistoryList(res.items || []);
    } catch {
      setHistoryList([]);
    } finally {
      setLoadingHistory(false);
    }
  };

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
            onClick={() => {
              if (activeView === "members") refetchParticipants();
              else refetchChanges();
            }}
            className="gap-1.5 font-medium shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Làm mới
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (!ensureSpecificProject("import dữ liệu BHXH")) return;
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
              if (!ensureSpecificProject("khai báo biến động BHXH")) return;
              handleOpenDeclare();
            }}
            className="gap-1.5 font-semibold shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Khai báo biến động
          </Button>
        </div>
      );
    }
    return () => {
      if (setHeaderAction) setHeaderAction(null);
    };
  }, [setHeaderAction, activeView, refetchParticipants, refetchChanges, projectId]);

  // Helper Badge Color for Change Type
  const renderChangeTypeBadge = (c: InsuranceChangeItemV3) => {
    const t = (c.changeType || "").toUpperCase();
    if (t.includes("TANG") || t.includes("INCREASE")) {
      return <Badge tone="success">Báo tăng mới</Badge>;
    }
    if (t.includes("GIAM") || t.includes("DECREASE")) {
      return <Badge tone="danger">Báo giảm hẳn</Badge>;
    }
    if (t.includes("LUONG") || t.includes("ADJUST") || t.includes("SALARY")) {
      return <Badge tone="info">Điều chỉnh lương</Badge>;
    }
    if (t.includes("THAI_SAN") || t.includes("OM_DAU")) {
      return <Badge tone="warning">Nghỉ chế độ</Badge>;
    }
    return <Badge tone="neutral">{c.changeTypeName || t}</Badge>;
  };

  // Helper Badge Color for Change Status
  const renderChangeStatusBadge = (st: string) => {
    const s = st.toUpperCase();
    if (s === "CONFIRMED" || s === "APPROVED") {
      return <Badge tone="success">Đã xác nhận</Badge>;
    }
    if (s === "REJECTED") {
      return <Badge tone="danger">Từ chối</Badge>;
    }
    return <Badge tone="warning">Chờ đối soát</Badge>;
  };

  return (
    <div className="insurance-subtab space-y-4">
      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Tổng lao động tham gia BHXH */}
        <div className="bg-card border border-border rounded-xl p-4 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Lao động đóng BHXH
            </span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {isParticipantsLoading ? "—" : summary?.activeCount ?? totalParticipants}
            </span>
            <span className="text-xs text-muted-foreground">người</span>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">Đang đóng BHXH bắt buộc</p>
        </div>

        {/* Card 2: Tổng quỹ lương trích nộp */}
        <div className="bg-card border border-border rounded-xl p-4 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Tổng tiền trích nộp
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
              {isParticipantsLoading ? "—" : formatCurrency(summary?.totalMonthlyContribution ?? 0)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">Tổng trích nộp 32% quỹ lương</p>
        </div>

        {/* Card 3: Hồ sơ chờ xác nhận */}
        <div
          onClick={() => {
            setActiveView("changes");
            setChangeStatusFilter("PENDING");
          }}
          className="bg-card border border-border rounded-xl p-4 transition-all duration-200 hover:shadow-md cursor-pointer hover:border-amber-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Hồ sơ chờ xác nhận
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
              {isParticipantsLoading ? "—" : summary?.pendingChangesCount ?? totalChanges}
            </span>
            <span className="text-xs text-muted-foreground">hồ sơ</span>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">Hồ sơ biến động chờ đối soát</p>
        </div>

        {/* Card 4: Tỷ lệ trích nộp */}
        <div className="bg-card border border-border rounded-xl p-4 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              Tỷ lệ trích nộp
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-lg font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono">
              NLĐ 10.5%
            </span>
            <span className="text-xs text-muted-foreground mx-1">|</span>
            <span className="text-lg font-bold tracking-tight text-foreground font-mono">
              DN 21.5%
            </span>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">BHXH 8%, BHYT 1.5%, BHTN 1%</p>
        </div>
      </div>

      {/* Navigation Switcher: Minimalist Underline Tabs */}
      <nav className="subtab-view-switcher" aria-label="Phân hệ bảo hiểm">
        <button
          type="button"
          className={cn("subtab-view-btn", activeView === "members" && "active")}
          onClick={() => {
            setActiveView("members");
            setCurrentPage(1);
          }}
        >
          <Shield />
          <span>Danh sách tham gia BHXH</span>
          <span className="ml-1 px-1.5 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {totalParticipants}
          </span>
          {activeView === "members" && <span className="tab-indicator" />}
        </button>
        <button
          type="button"
          className={cn("subtab-view-btn", activeView === "changes" && "active")}
          onClick={() => {
            setActiveView("changes");
            setCurrentPage(1);
          }}
        >
          <FileCheck />
          <span>Hồ sơ chờ xác nhận</span>
          <span
            className={cn(
              "ml-1 px-1.5 py-0.5 text-[11px] font-semibold rounded-full",
              totalChanges > 0
                ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            )}
          >
            {totalChanges}
          </span>
          {activeView === "changes" && <span className="tab-indicator" />}
        </button>
      </nav>

      {/* Main Integrated Table Card */}
      <div className="integrated-table-card">
        {/* Table Toolbar */}
        <div className="table-card-toolbar">
          <div className="flex items-center justify-between gap-3 w-full">
            {/* Left: Section Title */}
            <div className="text-xs font-semibold text-foreground shrink-0 flex items-center gap-1.5">
              {activeView === "members" ? (
                <>
                  <Shield className="w-4 h-4 text-primary" />
                  <span>Danh sách tham gia BHXH ({totalParticipants})</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4 text-amber-600" />
                  <span>Hồ sơ biến động chờ xác nhận ({totalChanges})</span>
                </>
              )}
            </div>

            {/* Right: Status Filter & Search Box */}
            <div className="flex items-center gap-2 sm:gap-3 ml-auto flex-nowrap shrink-0">
              {/* Status Filter for Participants View */}
              {activeView === "members" ? (
                <SearchableSelect
                  value={memberStatusFilter}
                  onChange={(val) => {
                    setMemberStatusFilter(val || "ALL");
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: "ALL", label: "Tất cả trạng thái" },
                    { value: "ACTIVE", label: "Đang tham gia" },
                    { value: "SUSPENDED", label: "Tạm dừng đóng" },
                    { value: "STOPPED", label: "Đã ngừng đóng" },
                  ]}
                  placeholder="Tất cả trạng thái"
                  className="w-[170px] sm:w-[185px] shrink-0"
                  allowClear={false}
                />
              ) : (
                <SearchableSelect
                  value={changeStatusFilter}
                  onChange={(val) => {
                    setChangeStatusFilter(val || "ALL");
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: "ALL", label: "Tất cả trạng thái" },
                    { value: "PENDING", label: "Chờ đối soát" },
                    { value: "CONFIRMED", label: "Đã xác nhận" },
                    { value: "REJECTED", label: "Từ chối" },
                  ]}
                  placeholder="Tất cả trạng thái"
                  className="w-[170px] sm:w-[185px] shrink-0"
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
                placeholder={activeView === "members" ? "Tìm mã NV, tên, số sổ BHXH..." : "Tìm mã NV, tên, mã đối soát..."}
                containerClassName="w-[190px] sm:w-[230px] lg:w-[260px] shrink min-w-[140px]"
              />
            </div>
          </div>
        </div>

        {/* VIEW 1: Danh sách tham gia BHXH */}
        {activeView === "members" && (
          <div>
            {isParticipantsLoading ? (
              <LoadingBlock rows={6} />
            ) : isParticipantsError ? (
              <ErrorState
                message="Không thể tải danh sách người lao động tham gia BHXH."
                retry={() => refetchParticipants()}
              />
            ) : participantsList.length === 0 ? (
              <EmptyState
                title="Chưa có dữ liệu BHXH"
                description={
                  searchTerm
                    ? "Không tìm thấy nhân sự tham gia BHXH phù hợp với từ khóa tìm kiếm."
                    : "Chưa có nhân sự nào tham gia BHXH trong dự án đã chọn."
                }
              />
            ) : (
              <div className="data-table-wrap">
                <div className="data-table-scroll">
                  <table className="data-table min-w-[1050px]">
                    <thead>
                      <tr>
                        <th style={{ width: "45px" }} className="text-center">STT</th>
                        <th style={{ minWidth: "190px" }}>NGƯỜI LAO ĐỘNG</th>
                        <th style={{ width: "130px" }}>MÃ SỐ BHXH</th>
                        <th style={{ width: "140px" }} className="text-right">LƯƠNG ĐÓNG BH</th>
                        <th style={{ width: "100px" }} className="text-center">TỶ LỆ NLĐ</th>
                        <th style={{ width: "100px" }} className="text-center">TỶ LỆ DN</th>
                        <th style={{ width: "130px" }} className="text-center">TRẠNG THÁI</th>
                        <th style={{ minWidth: "180px" }}>NƠI KCB BAN ĐẦU</th>
                        <th style={{ width: "90px" }} className="text-center">THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participantsList.map((m: InsuranceParticipantItemV3, idx: number) => {
                        const rawStt = (currentPage - 1) * pageSize + idx + 1;
                        const stt = String(rawStt).padStart(2, "0");

                        return (
                          <tr key={m.id || idx}>
                            <td className="text-center text-muted font-medium">{stt}</td>
                            <td>
                              <div className="employee-cell-info">
                                <span className="employee-cell-name font-semibold text-foreground">
                                  {m.employee.fullName || "—"}
                                </span>
                                <span className="employee-cell-sub">
                                  <span className="employee-code-badge">{m.employee.employeeCode}</span>
                                  {m.employee.project?.projectCode && (
                                    <span className="text-muted text-[11px] font-medium">
                                      · [{m.employee.project.projectCode}]
                                    </span>
                                  )}
                                </span>
                              </div>
                            </td>
                            <td className="font-mono font-medium text-foreground">
                              {m.insuranceBookNumber || m.socialInsuranceNumber || (
                                <span className="text-muted italic text-xs">Chưa cấp sổ</span>
                              )}
                            </td>
                            <td className="text-right font-bold font-mono text-foreground">
                              {formatCurrency(m.insuranceSalary || m.contributionSalary || 0)}
                            </td>
                            <td className="text-center text-muted font-medium">
                              {m.employeeContributionRate ?? 10.5}%
                            </td>
                            <td className="text-center text-muted font-medium">
                              {m.employerContributionRate ?? 21.5}%
                            </td>
                            <td className="text-center">
                              {m.participationStatus === "ACTIVE" || m.status === "ACTIVE" ? (
                                <Badge tone="success">Đang tham gia</Badge>
                              ) : m.participationStatus === "SUSPENDED" || m.status === "SUSPENDED" ? (
                                <Badge tone="warning">Tạm dừng</Badge>
                              ) : (
                                <Badge tone="danger">Đã ngừng đóng</Badge>
                              )}
                            </td>
                            <td className="text-xs text-foreground">
                              {m.medicalFacilityName || m.medicalRegistrationPlace || "—"}
                            </td>
                            <td className="text-center">
                              <button
                                type="button"
                                onClick={() => handleViewHistory(m)}
                                className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md shadow-xs transition-colors cursor-pointer"
                                title="Xem lịch sử biến động"
                              >
                                <History className="w-3.5 h-3.5 text-slate-500" /> Lịch sử
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <TablePaginationFooter
                  totalItems={totalParticipants}
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
        )}

        {/* VIEW 2: Sổ biến động D02-LT */}
        {activeView === "changes" && (
          <div>
            {isChangesLoading ? (
              <LoadingBlock rows={6} />
            ) : isChangesError ? (
              <ErrorState
                message="Không thể tải danh sách sổ biến động BHXH."
                retry={() => refetchChanges()}
              />
            ) : changesList.length === 0 ? (
              <EmptyState
                title="Chưa có hồ sơ biến động"
                description={
                  searchTerm
                    ? "Không tìm thấy hồ sơ biến động phù hợp với từ khóa tìm kiếm."
                    : "Chưa ghi nhận hồ sơ biến động BHXH nào trong kỳ."
                }
              />
            ) : (
              <div className="data-table-wrap">
                <div className="data-table-scroll">
                  <table className="data-table min-w-[1050px]">
                    <thead>
                      <tr>
                        <th style={{ width: "45px" }} className="text-center">STT</th>
                        <th style={{ minWidth: "180px" }}>NGƯỜI LAO ĐỘNG</th>
                        <th style={{ width: "140px" }}>LOẠI BIẾN ĐỘNG</th>
                        <th style={{ width: "120px" }} className="text-center">NGÀY HIỆU LỰC</th>
                        <th style={{ width: "130px" }} className="text-right">LƯƠNG CŨ</th>
                        <th style={{ width: "130px" }} className="text-right">LƯƠNG MỚI</th>
                        <th style={{ width: "120px" }} className="text-center">TRẠNG THÁI</th>
                        <th style={{ minWidth: "170px" }}>MÃ ĐỐI SOÁT / LÝ DO</th>
                        <th style={{ width: "130px" }} className="text-center">THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changesList.map((c: InsuranceChangeItemV3, idx: number) => {
                        const rawStt = (currentPage - 1) * pageSize + idx + 1;
                        const stt = String(rawStt).padStart(2, "0");

                        return (
                          <tr key={c.id || idx}>
                            <td className="text-center text-muted font-medium">{stt}</td>
                            <td>
                              <div className="employee-cell-info">
                                <span className="employee-cell-name font-semibold text-foreground">
                                  {c.employee.fullName || "—"}
                                </span>
                                <span className="employee-cell-sub">
                                  <span className="employee-code-badge">{c.employee.employeeCode}</span>
                                </span>
                              </div>
                            </td>
                            <td>{renderChangeTypeBadge(c)}</td>
                            <td className="text-center text-xs font-medium text-foreground">
                              {c.effectiveFrom ? formatDate(c.effectiveFrom) : c.effectiveMonth || "—"}
                            </td>
                            <td className="text-right text-muted text-xs font-mono">
                              {c.oldBaseSalary || c.oldSalary ? formatCurrency(c.oldBaseSalary || c.oldSalary || 0) : "—"}
                            </td>
                            <td className="text-right font-bold text-foreground text-xs font-mono">
                              {c.newBaseSalary || c.newSalary ? formatCurrency(c.newBaseSalary || c.newSalary || 0) : "—"}
                            </td>
                            <td className="text-center">{renderChangeStatusBadge(c.status)}</td>
                            <td>
                              {c.externalDossierCode && (
                                <div className="font-mono text-[11px] text-primary font-semibold">
                                  Mã: {c.externalDossierCode}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground mt-0.5">{c.reason || "—"}</div>
                            </td>
                            <td className="text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {c.status === "PENDING" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReconcileChange(c);
                                      setReconciliationCode(c.externalDossierCode || "");
                                    }}
                                    className="inline-flex items-center gap-1 h-7 px-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-md shadow-xs transition-colors cursor-pointer"
                                    title="Xác nhận đối soát cơ quan BHXH"
                                  >
                                    <FileCheck className="w-3.5 h-3.5 text-emerald-600" /> Đối soát
                                  </button>
                                )}
                                {(c.fileName || c.filePath) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPreviewingRecord(c);
                                      setPreviewDocumentOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 h-7 px-2 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md shadow-xs transition-colors cursor-pointer"
                                    title="Xem file đính kèm"
                                  >
                                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
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

                {/* Pagination */}
                <TablePaginationFooter
                  totalItems={totalChanges}
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
        )}
      </div>

      {/* Modal: Khai báo biến động BHXH D02-LT */}
      <Modal
        open={declareModalOpen}
        onOpenChange={setDeclareModalOpen}
        title="Khai báo biến động Bảo hiểm xã hội (Mẫu D02-LT)"
        description="Lập hồ sơ báo tăng, báo giảm hoặc điều chỉnh mức lương đóng BHXH cho nhân sự."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeclareModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              loading={createChangeMutation.isPending}
              onClick={() => createChangeMutation.mutate()}
              className="gap-1.5"
            >
              <Save className="w-4 h-4" /> Lưu hồ sơ biến động
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
            <select
              value={selectedEmployeeCode}
              onChange={(e) => setSelectedEmployeeCode(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
            >
              {employees.map((emp) => (
                <option key={emp.code || emp.id} value={emp.code || emp.id}>
                  {emp.name || (emp as any).fullName || emp.code} ({emp.code || emp.id})
                </option>
              ))}
            </select>
          </div>

          {/* Loại biến động & Ngày hiệu lực */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Loại biến động <span className="text-rose-500">*</span>
              </label>
              <select
                value={declareType}
                onChange={(e) => setDeclareType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
              >
                <option value="TANG_MOI">Báo tăng mới (Ký HĐLĐ)</option>
                <option value="DIEU_CHINH_LUONG">Điều chỉnh mức lương đóng</option>
                <option value="GIAM_HAN">Báo giảm hẳn (Nghỉ việc)</option>
                <option value="NGHI_THAI_SAN">Nghỉ thai sản</option>
                <option value="NGHI_OM_DAU">Nghỉ ốm đau dài ngày</option>
                <option value="THOAI_THU">Thoái thu tiền đóng</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Ngày hiệu lực <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={declareEffectiveFrom}
                onChange={(e) => setDeclareEffectiveFrom(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
              />
            </div>
          </div>

          {/* Mức lương đóng BHXH mới */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Mức lương đóng BHXH mới (VNĐ) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="100000"
              value={declareNewSalary}
              onChange={(e) => setDeclareNewSalary(Number(e.target.value))}
              placeholder="VD: 5000000"
              className="w-full px-3 py-2 text-xs font-bold text-primary bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Live Contribution Preview Box */}
          {contributionPreview && (
            <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-1.5 text-xs">
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>Dự tính mức trích đóng hàng tháng:</span>
                <span className="font-mono text-primary font-bold">
                  {formatCurrency(contributionPreview.totalContribution)} (32%)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1 border-t border-border/50">
                <div>
                  NLĐ trích (10.5%):{" "}
                  <strong className="text-foreground font-mono">
                    {formatCurrency(contributionPreview.totalEmployeeContribution)}
                  </strong>
                </div>
                <div>
                  DN đóng (21.5%):{" "}
                  <strong className="text-foreground font-mono">
                    {formatCurrency(contributionPreview.totalEmployerContribution)}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Số sổ BHXH & Nơi KCB */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Mã số sổ BHXH (10 số)
              </label>
              <input
                type="text"
                value={declareBookNumber}
                onChange={(e) => setDeclareBookNumber(e.target.value)}
                placeholder="VD: 7914002931"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Nơi KCB ban đầu
              </label>
              <select
                value={declareMedicalFacilityId}
                onChange={(e) => setDeclareMedicalFacilityId(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
              >
                <option value="">-- Chọn bệnh viện/cơ sở KCB --</option>
                {medicalFacilities.map((f: MedicalFacilityItemV3) => (
                  <option key={f.id} value={f.id}>
                    {f.facilityName} {f.province ? `(${f.province})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lý do biến động */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Lý do biến động / Ghi chú
            </label>
            <textarea
              value={declareReason}
              onChange={(e) => setDeclareReason(e.target.value)}
              rows={2}
              placeholder="Nhập lý do biến động (vd: Ký HĐLĐ chính thức, Tăng lương theo phụ lục hợp đồng...)"
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none text-foreground"
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Xác nhận đối soát mã hồ sơ BHXH */}
      {reconcileChange && (
        <Modal
          open={Boolean(reconcileChange)}
          onOpenChange={(open) => !open && setReconcileChange(null)}
          title="Xác nhận đối soát hồ sơ cơ quan BHXH"
          description={`Nhập mã tiếp nhận / biên nhận hồ sơ điện tử trả về từ cơ quan BHXH cho nhân viên ${reconcileChange.employee.fullName}.`}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setReconcileChange(null)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                loading={confirmReconcileMutation.isPending}
                onClick={() => {
                  if (!reconciliationCode.trim()) {
                    notify("Vui lòng nhập mã tiếp nhận hồ sơ BHXH", "error");
                    return;
                  }
                  confirmReconcileMutation.mutate({
                    id: reconcileChange.id,
                    code: reconciliationCode.trim(),
                  });
                }}
              >
                Xác nhận đối soát
              </Button>
            </div>
          }
        >
          <div className="space-y-3 py-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Mã hồ sơ điện tử cơ quan BHXH <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={reconciliationCode}
                onChange={(e) => setReconciliationCode(e.target.value)}
                placeholder="VD: BHXH-7901-202609-0012"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-foreground"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Lịch sử biến động nhân viên */}
      {historyMember && (
        <Modal
          open={Boolean(historyMember)}
          onOpenChange={(open) => !open && setHistoryMember(null)}
          title={`Lịch sử biến động BHXH - ${historyMember.employee.fullName}`}
          description={`Mã NV: ${historyMember.employee.employeeCode} | Mã số BHXH: ${historyMember.insuranceBookNumber || historyMember.socialInsuranceNumber || "Chưa có"}`}
          size="md"
          footer={
            <Button variant="secondary" onClick={() => setHistoryMember(null)}>
              Đóng
            </Button>
          }
        >
          <div className="py-1">
            {loadingHistory ? (
              <LoadingBlock rows={4} />
            ) : historyList.length === 0 ? (
              <EmptyState
                title="Chưa có lịch sử biến động"
                description="Nhân viên này chưa ghi nhận biến động nào trong hệ thống."
              />
            ) : (
              <div className="data-table-wrap border border-border rounded-xl overflow-hidden">
                <table className="data-table min-w-[500px]">
                  <thead>
                    <tr>
                      <th style={{ width: "120px" }}>NGÀY HIỆU LỰC</th>
                      <th style={{ width: "140px" }}>LOẠI BIẾN ĐỘNG</th>
                      <th style={{ width: "130px" }} className="text-right">LƯƠNG MỚI</th>
                      <th>MÃ ĐỐI SOÁT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map((h: InsuranceChangeItemV3, idx: number) => (
                      <tr key={h.id || idx}>
                        <td className="text-xs font-medium text-foreground">
                          {h.effectiveFrom ? formatDate(h.effectiveFrom) : h.effectiveMonth || "—"}
                        </td>
                        <td>{renderChangeTypeBadge(h)}</td>
                        <td className="text-right font-bold text-foreground text-xs font-mono">
                          {formatCurrency(h.newBaseSalary || h.newSalary || 0)}
                        </td>
                        <td className="font-mono text-xs text-muted-foreground">
                          {h.externalDossierCode || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}

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
        title="Import Danh sách BHXH từ Excel"
        description="Tải lên tệp danh sách BHXH hoặc biến động D02-LT theo biểu mẫu chuẩn để cập nhật hàng loạt."
        size="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Step 1: Download Template */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-100">1. Tải biểu mẫu Excel chuẩn</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Sử dụng tệp mẫu để đảm bảo đúng định dạng các cột dữ liệu hồ sơ BHXH.
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
            type: "insurance",
            employeeCode: previewingRecord.employee.employeeCode,
            employeeName: previewingRecord.employee.fullName,
            period: previewingRecord.effectiveFrom || previewingRecord.effectiveMonth || "",
            categoryLabel: previewingRecord.changeTypeName || "Hồ sơ BHXH D02-LT",
            amount: previewingRecord.newBaseSalary || previewingRecord.newSalary || 0,
            decisionNo: previewingRecord.externalDossierCode || undefined,
            reason: previewingRecord.reason || undefined,
            attachmentName: previewingRecord.fileName || undefined,
            attachmentUrl: previewingRecord.filePath || undefined,
          }}
        />
      )}
    </div>
  );
}
