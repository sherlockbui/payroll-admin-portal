"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  Check,
  CheckCheck,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  History,
  Info,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  TrendingUp,
  Upload,
  UploadCloud,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  TablePaginationFooter,
  TableRowActions,
} from "@/components/ui";
import { api } from "@/lib/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type {
  Employee,
  SocialInsuranceChangeType,
  SocialInsuranceChangeV3,
  SocialInsuranceMemberV3,
  SocialInsuranceParticipationStatus,
} from "@/lib/types";

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
  const [memberStatusFilter, setMemberStatusFilter] = useState<SocialInsuranceParticipationStatus>("ALL");
  const [changeTypeFilter, setChangeTypeFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [declareModalOpen, setDeclareModalOpen] = useState(false);
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState("");
  const [declareType, setDeclareType] = useState<SocialInsuranceChangeType>("INCREASE");
  const [declareMonth, setDeclareMonth] = useState("2026-08");
  const [declareOldSalary, setDeclareOldSalary] = useState<number>(0);
  const [declareNewSalary, setDeclareNewSalary] = useState<number>(6300000);
  const [declareReason, setDeclareReason] = useState("");

  // Reconcile modal
  const [reconcileChange, setReconcileChange] = useState<SocialInsuranceChangeV3 | null>(null);
  const [reconciliationCode, setReconciliationCode] = useState("");

  // History modal
  const [historyMember, setHistoryMember] = useState<SocialInsuranceMemberV3 | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Import modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreviewRows, setImportPreviewRows] = useState<any[]>([]);

  // Summary Query
  const summaryQuery = useQuery({
    queryKey: ["social-insurance-summary", projectId],
    queryFn: () => api.getSocialInsuranceSummaryV3(projectId),
  });

  // Members Query
  const membersQuery = useQuery({
    queryKey: ["social-insurance-members", projectId, memberStatusFilter, searchTerm, currentPage, pageSize],
    queryFn: () =>
      api.getSocialInsuranceMembersV3({
        projectId: projectId === "all" ? undefined : projectId,
        status: memberStatusFilter,
        search: searchTerm || undefined,
        page: currentPage,
        pageSize,
      }),
    enabled: activeView === "members",
  });

  // Changes Query
  const changesQuery = useQuery({
    queryKey: ["social-insurance-changes", projectId, changeTypeFilter, searchTerm, currentPage, pageSize],
    queryFn: () =>
      api.getSocialInsuranceChangesV3({
        projectId: projectId === "all" ? undefined : projectId,
        changeType: changeTypeFilter,
        search: searchTerm || undefined,
        page: currentPage,
        pageSize,
      }),
    enabled: activeView === "changes",
  });

  // Export Mutation
  const handleExport = async () => {
    try {
      const data = await api.exportSocialInsuranceExcelV3({
        projectId: projectId === "all" ? undefined : projectId,
        search: searchTerm,
      });
      notify(`Đã xuất ${data.totalRecords} bản ghi ra file mẫu D02-LT: ${data.fileName}`);
    } catch (err: any) {
      notify(err?.message || "Lỗi khi xuất file Excel", "error");
    }
  };

  // Register Header Action
  useEffect(() => {
    if (!setHeaderAction) return;
    setHeaderAction(
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={handleExport}
          className="gap-1.5 font-semibold text-xs h-8 px-3"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Mẫu D02-LT Excel
        </Button>
        <Button
          variant="secondary"
          onClick={() => setImportModalOpen(true)}
          className="gap-1.5 font-semibold text-xs h-8 px-3"
        >
          <UploadCloud className="w-3.5 h-3.5" /> Import BHXH
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            setSelectedEmployeeCode(employees[0]?.code || "NV-00124");
            setDeclareType("INCREASE");
            setDeclareMonth("2026-08");
            setDeclareNewSalary(6300000);
            setDeclareReason("");
            setDeclareModalOpen(true);
          }}
          className="gap-1.5 font-semibold text-xs h-8 px-3"
        >
          <Plus className="w-3.5 h-3.5" /> Kê khai biến động
        </Button>
      </div>
    );
    return () => setHeaderAction(null);
  }, [setHeaderAction, employees, projectId, searchTerm]);

  // Create change mutation
  const createChangeMutation = useMutation({
    mutationFn: (payload: any) => api.createSocialInsuranceChangeV3(payload),
    onSuccess: () => {
      notify("Đã tạo hồ sơ biến động BHXH D02-LT thành công.");
      queryClient.invalidateQueries({ queryKey: ["social-insurance-changes"] });
      queryClient.invalidateQueries({ queryKey: ["social-insurance-summary"] });
      setDeclareModalOpen(false);
    },
    onError: (err: any) => {
      notify(err?.message || "Lỗi tạo hồ sơ biến động", "error");
    },
  });

  // Reconcile mutation
  const reconcileMutation = useMutation({
    mutationFn: ({ id, code }: { id: number; code: string }) =>
      api.confirmSocialInsuranceReconciliationV3(id, { reconciliationCode: code }),
    onSuccess: () => {
      notify("Đã xác nhận mã đối soát cơ quan BHXH.");
      queryClient.invalidateQueries({ queryKey: ["social-insurance-changes"] });
      setReconcileChange(null);
    },
    onError: (err: any) => {
      notify(err?.message || "Lỗi đối soát", "error");
    },
  });

  // Approve change mutation
  const approveMutation = useMutation({
    mutationFn: (id: number) => api.approveSocialInsuranceChangeV3(id),
    onSuccess: () => {
      notify("Đã phê duyệt biến động và cập nhật sổ BHXH.");
      queryClient.invalidateQueries({ queryKey: ["social-insurance-changes"] });
      queryClient.invalidateQueries({ queryKey: ["social-insurance-members"] });
      queryClient.invalidateQueries({ queryKey: ["social-insurance-summary"] });
    },
    onError: (err: any) => {
      notify(err?.message || "Lỗi phê duyệt", "error");
    },
  });

  // Reject change mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.rejectSocialInsuranceChangeV3(id, { reason }),
    onSuccess: () => {
      notify("Hồ sơ biến động đã được đánh dấu từ chối.");
      queryClient.invalidateQueries({ queryKey: ["social-insurance-changes"] });
      queryClient.invalidateQueries({ queryKey: ["social-insurance-summary"] });
    },
    onError: (err: any) => {
      notify(err?.message || "Lỗi từ chối", "error");
    },
  });

  // Delete change mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteSocialInsuranceChangeV3(id),
    onSuccess: () => {
      notify("Đã xóa hồ sơ biến động BHXH.");
      queryClient.invalidateQueries({ queryKey: ["social-insurance-changes"] });
      queryClient.invalidateQueries({ queryKey: ["social-insurance-summary"] });
    },
    onError: (err: any) => {
      notify(err?.message || "Lỗi xóa hồ sơ", "error");
    },
  });

  const handleViewHistory = async (member: SocialInsuranceMemberV3) => {
    setHistoryMember(member);
    setLoadingHistory(true);
    try {
      const res = await api.getSocialInsuranceMemberHistoryV3(member.employee.employeeCode);
      setHistoryList(res.history || []);
    } catch {
      setHistoryList([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const excelColumns: ExcelImportColumn[] = [
    { key: "employeeCode", label: "Mã NLĐ", width: "120px" },
    { key: "fullName", label: "Họ và tên NLĐ", width: "160px" },
    { key: "socialInsuranceNumber", label: "Mã số BHXH", width: "130px" },
    { key: "insuranceSalary", label: "Lương đóng BHXH", align: "right", render: (r) => <span className="font-bold text-primary">{formatCurrency(r.insuranceSalary)}</span> },
    { key: "hospitalName", label: "Nơi KCB ban đầu" },
  ];

  const handleSimulateUpload = () => {
    const mockRows = [
      { employeeCode: "NV-00124", fullName: "Nguyễn Văn An", socialInsuranceNumber: "7914002931", insuranceSalary: 6300000, hospitalName: "BV Đa Khoa TP.Thủ Đức" },
      { employeeCode: "NV-00125", fullName: "Trần Thị Mai", socialInsuranceNumber: "7914002932", insuranceSalary: 6300000, hospitalName: "BV Quận 9" },
      { employeeCode: "NV-00127", fullName: "Phạm Quốc Bảo", socialInsuranceNumber: "7914002933", insuranceSalary: 7500000, hospitalName: "BV Đa Khoa Bình Dương" },
    ];
    setImportPreviewRows(mockRows);
    notify("Đã tải dữ liệu mẫu import thành công (3 dòng).");
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const dummyFile = new File(["dummy"], "import_bhxh.xlsx");
      return api.importSocialInsuranceExcelV3(dummyFile, projectId);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["social-insurance-members"] });
      queryClient.invalidateQueries({ queryKey: ["social-insurance-changes"] });
      queryClient.invalidateQueries({ queryKey: ["social-insurance-summary"] });
      notify(`Import thành công! Đã xử lý ${res?.totalRows || 3} dòng dữ liệu.`);
      setImportModalOpen(false);
      setImportPreviewRows([]);
    },
    onError: (err: any) => {
      notify(err?.message || "Lỗi khi import file", "error");
    },
  });

  const summary = summaryQuery.data;
  const membersData = membersQuery.data;
  const changesData = changesQuery.data;

  return (
    <div className="space-y-5">
      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Tổng lao động</div>
            <div className="text-lg font-bold text-foreground mt-0.5">{summary?.total ?? "..."}</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Đang tham gia BH</div>
            <div className="text-lg font-bold text-emerald-600 mt-0.5">{summary?.activeCount ?? "..."}</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Tạm dừng / Ngừng</div>
            <div className="text-lg font-bold text-amber-600 mt-0.5">{(summary?.suspendedCount ?? 0) + (summary?.stoppedCount ?? 0)}</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Biến động D02-LT</div>
            <div className="text-lg font-bold text-blue-600 mt-0.5">{summary?.pendingChangesCount ?? "..."}</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Tổng tiền đóng BH</div>
            <div className="text-sm font-bold text-indigo-600 mt-0.5">
              {formatCurrency(summary?.totalMonthlyContribution ?? 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Integrated Table Card */}
      <div className="integrated-table-card">
        {/* Toolbar */}
        <div className="table-card-toolbar">
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            {/* Left: View Mode Selector Pills */}
            <div className="filter-status-pills flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => { setActiveView("members"); setCurrentPage(1); }}
                className={`pill-btn ${activeView === "members" ? "active" : ""}`}
              >
                <Shield className="w-3.5 h-3.5 inline mr-1" /> Sổ BHXH ({summary?.activeCount ?? 0})
              </button>
              <button
                type="button"
                onClick={() => { setActiveView("changes"); setCurrentPage(1); }}
                className={`pill-btn warning ${activeView === "changes" ? "active" : ""}`}
              >
                <FileText className="w-3.5 h-3.5 inline mr-1" /> Biến động D02-LT ({summary?.pendingChangesCount ?? 0})
              </button>
            </div>

            {/* Right: Search */}
            <div className="relative min-w-[240px] max-w-[320px] ml-auto">
              <Search className="search-icon-fixed text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm theo tên, mã NV, số sổ..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="search-box-input w-full pl-10 pr-8 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
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
          </div>
        </div>

        {/* VIEW 1: Sổ BHXH Thành viên */}
        {activeView === "members" && (
          <div>
            {membersQuery.isLoading ? (
              <div className="p-8">
                <LoadingBlock />
              </div>
            ) : membersQuery.isError ? (
              <div className="p-8">
                <ErrorState message="Không thể tải danh sách thành viên BHXH" retry={() => membersQuery.refetch()} />
              </div>
            ) : (membersData?.items || []).length === 0 ? (
              <div className="p-12">
                <EmptyState title="Không tìm thấy nhân sự" description="Chưa có thông tin sổ BHXH nào phù hợp với bộ lọc." />
              </div>
            ) : (
              <div className="data-table-wrap">
                <div className="data-table-scroll">
                  <table className="data-table min-w-[1050px]">
                    <thead>
                      <tr>
                        <th style={{ width: "45px" }} className="text-center">STT</th>
                        <th style={{ minWidth: "180px" }}>NHÂN VIÊN</th>
                        <th style={{ width: "130px" }}>MÃ SỐ BHXH</th>
                        <th style={{ width: "130px" }} className="text-right">LƯƠNG ĐÓNG BH</th>
                        <th style={{ width: "110px" }} className="text-center">TỶ LỆ NLĐ</th>
                        <th style={{ width: "110px" }} className="text-center">TỶ LỆ DN</th>
                        <th style={{ width: "130px" }} className="text-center">TRẠNG THÁI</th>
                        <th style={{ minWidth: "180px" }}>NƠI KCB BAN ĐẦU</th>
                        <th style={{ width: "80px" }} className="text-center">THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(membersData?.items || []).map((m, idx) => {
                        const rawStt = (currentPage - 1) * pageSize + idx + 1;
                        const stt = String(rawStt).padStart(2, "0");
                        return (
                          <tr key={m.employee.employeeCode} className="hover:bg-secondary/40 transition-colors">
                            <td className="text-center text-muted font-medium">{stt}</td>
                            <td>
                              <div className="employee-cell-info">
                                <span className="employee-cell-name font-semibold text-foreground">{m.employee.fullName}</span>
                                <span className="employee-cell-sub">
                                  <span className="employee-code-badge">{m.employee.employeeCode}</span>
                                  <span className="text-muted text-[11px] font-normal">· {m.employee.position || m.employee.project?.projectName || "Nhân viên"}</span>
                                </span>
                              </div>
                            </td>
                            <td className="font-mono font-medium text-foreground">
                              {m.socialInsuranceNumber || <span className="text-muted italic">Chưa cấp sổ</span>}
                            </td>
                            <td className="text-right font-bold text-foreground">
                              {formatCurrency(m.contributionSalary)}
                            </td>
                            <td className="text-center text-muted font-medium">{m.employeeContributionRate}%</td>
                            <td className="text-center text-muted font-medium">{m.employerContributionRate}%</td>
                            <td className="text-center">
                              {m.status === "ACTIVE" ? (
                                <Badge tone="success">Đang tham gia</Badge>
                              ) : m.status === "SUSPENDED" ? (
                                <Badge tone="warning">Tạm dừng</Badge>
                              ) : (
                                <Badge tone="danger">Đã ngừng đóng</Badge>
                              )}
                            </td>
                            <td className="text-foreground">{m.medicalRegistrationPlace || "—"}</td>
                            <td className="text-center">
                              <TableRowActions
                                items={[
                                  {
                                    key: "history",
                                    label: "Xem lịch sử biến động",
                                    icon: <History className="w-3.5 h-3.5" />,
                                    onClick: () => handleViewHistory(m),
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
              </div>
            )}

            {/* Pagination */}
            {(membersData?.total || 0) > 0 && (
              <TablePaginationFooter
                totalItems={membersData?.total || 0}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
              />
            )}
          </div>
        )}

        {/* VIEW 2: Biến động D02-LT */}
        {activeView === "changes" && (
          <div>
            {changesQuery.isLoading ? (
              <div className="p-8">
                <LoadingBlock />
              </div>
            ) : changesQuery.isError ? (
              <div className="p-8">
                <ErrorState message="Lỗi tải danh sách biến động" retry={() => changesQuery.refetch()} />
              </div>
            ) : (changesData?.items || []).length === 0 ? (
              <div className="p-12">
                <EmptyState title="Không có biến động" description="Chưa có hồ sơ biến động BHXH nào trong kỳ này." />
              </div>
            ) : (
              <div className="data-table-wrap">
                <div className="data-table-scroll">
                  <table className="data-table min-w-[1050px]">
                    <thead>
                      <tr>
                        <th style={{ width: "45px" }} className="text-center">STT</th>
                        <th style={{ minWidth: "180px" }}>NHÂN VIÊN</th>
                        <th style={{ width: "140px" }}>LOẠI BIẾN ĐỘNG</th>
                        <th style={{ width: "120px" }} className="text-center">THÁNG HIỆU LỰC</th>
                        <th style={{ width: "130px" }} className="text-right">LƯƠNG CŨ</th>
                        <th style={{ width: "130px" }} className="text-right">LƯƠNG MỚI</th>
                        <th style={{ width: "130px" }} className="text-center">TRẠNG THÁI</th>
                        <th style={{ minWidth: "180px" }}>MÃ ĐỐI SOÁT / LÝ DO</th>
                        <th style={{ width: "90px" }} className="text-center">THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(changesData?.items || []).map((c, idx) => {
                        const rawStt = (currentPage - 1) * pageSize + idx + 1;
                        const stt = String(rawStt).padStart(2, "0");
                        return (
                          <tr key={c.id} className="hover:bg-secondary/40 transition-colors">
                            <td className="text-center text-muted font-medium">{stt}</td>
                            <td>
                              <div className="employee-cell-info">
                                <span className="employee-cell-name font-semibold text-foreground">{c.employee.fullName}</span>
                                <span className="employee-cell-sub">
                                  <span className="employee-code-badge">{c.employee.employeeCode}</span>
                                  <span className="text-muted text-[11px] font-normal">· {c.employee.position || c.employee.project?.projectName || "Nhân viên"}</span>
                                </span>
                              </div>
                            </td>
                            <td>
                              {c.changeType === "INCREASE" ? (
                                <Badge tone="success">Tăng lao động</Badge>
                              ) : c.changeType === "DECREASE" ? (
                                <Badge tone="danger">Giảm lao động</Badge>
                              ) : (
                                <Badge tone="info">Điều chỉnh lương</Badge>
                              )}
                            </td>
                            <td className="text-center font-medium text-foreground">{c.effectiveMonth}</td>
                            <td className="text-right text-muted">
                              {c.oldSalary ? formatCurrency(c.oldSalary) : "—"}
                            </td>
                            <td className="text-right font-bold text-foreground">
                              {c.newSalary ? formatCurrency(c.newSalary) : "—"}
                            </td>
                            <td className="text-center">
                              {c.status === "APPROVED" ? (
                                <Badge tone="success">Đang tham gia</Badge>
                              ) : c.status === "RECONCILED" ? (
                                <Badge tone="info">Đã đối soát</Badge>
                              ) : c.status === "REJECTED" ? (
                                <Badge tone="danger">Bị từ chối</Badge>
                              ) : (
                                <Badge tone="warning">Chờ xử lý</Badge>
                              )}
                            </td>
                            <td>
                              {c.reconciliationCode && (
                                <div className="font-mono text-[11px] text-primary font-semibold">
                                  Mã: {c.reconciliationCode}
                                </div>
                              )}
                              <div className="text-foreground mt-0.5">{c.reason || "—"}</div>
                            </td>
                            <td className="text-center">
                              <TableRowActions
                                items={[
                                  ...(c.status === "SUBMITTED" || c.status === "DRAFT"
                                    ? [
                                        {
                                          key: "reconcile",
                                          label: "Xác nhận đối soát BHXH",
                                          icon: <FileCheck className="w-3.5 h-3.5" />,
                                          onClick: () => {
                                            setReconcileChange(c);
                                            setReconciliationCode(c.reconciliationCode || "");
                                          },
                                        },
                                        {
                                          key: "approve",
                                          label: "Phê duyệt biến động",
                                          icon: <Check className="w-3.5 h-3.5" />,
                                          onClick: () => approveMutation.mutate(c.id),
                                        },
                                        {
                                          key: "reject",
                                          label: "Từ chối hồ sơ",
                                          icon: <X className="w-3.5 h-3.5" />,
                                          danger: true,
                                          onClick: () => {
                                            const r = window.prompt("Nhập lý do từ chối hồ sơ:");
                                            if (r) rejectMutation.mutate({ id: c.id, reason: r });
                                          },
                                        },
                                      ]
                                    : []),
                                  {
                                    key: "delete",
                                    label: "Xóa hồ sơ biến động",
                                    icon: <Trash2 className="w-3.5 h-3.5" />,
                                    danger: true,
                                    onClick: () => {
                                      if (window.confirm("Bạn có chắc chắn muốn xóa hồ sơ biến động này?")) {
                                        deleteMutation.mutate(c.id);
                                      }
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
            </div>
          )}

          {/* Pagination */}
          {(changesData?.total || 0) > 0 && (
            <TablePaginationFooter
              totalItems={changesData?.total || 0}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
            />
          )}
        </div>
      )}
    </div>

      {/* Subtab Activity / Audit Log */}
      <SubtabActivityLog
        projectId={projectId}
        module="insurance"
        title="Nhật ký biến động Bảo hiểm xã hội (D02-LT)"
        description="Lịch sử kê khai báo tăng, báo giảm, điều chỉnh mức đóng và đối soát cơ quan BHXH"
      />

      {/* Modal Kê khai biến động mới */}
      {declareModalOpen && (
        <Modal
          open={declareModalOpen}
          onOpenChange={(open) => !open && setDeclareModalOpen(false)}
          title="Kê khai biến động bảo hiểm xã hội (Mẫu D02-LT)"
          description="Lập hồ sơ báo tăng, báo giảm hoặc điều chỉnh mức lương đóng BHXH"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeclareModalOpen(false)}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                disabled={createChangeMutation.isPending}
                onClick={() => {
                  if (!declareReason.trim()) {
                    notify("Vui lòng nhập lý do biến động", "error");
                    return;
                  }
                  createChangeMutation.mutate({
                    employeeCode: selectedEmployeeCode,
                    changeType: declareType,
                    effectiveMonth: declareMonth,
                    oldSalary: declareOldSalary,
                    newSalary: declareNewSalary,
                    reason: declareReason,
                  });
                }}
              >
                {createChangeMutation.isPending ? "Đang tạo..." : "Tạo hồ sơ biến động"}
              </Button>
            </>
          }
        >
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Nhân viên <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedEmployeeCode}
                onChange={(e) => setSelectedEmployeeCode(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {employees.map((e) => (
                  <option key={e.code} value={e.code}>
                    {e.name} ({e.code}) - {e.department}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Loại biến động <span className="text-rose-500">*</span>
                </label>
                <select
                  value={declareType}
                  onChange={(e) => setDeclareType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="INCREASE">Báo tăng lao động</option>
                  <option value="DECREASE">Báo giảm lao động</option>
                  <option value="ADJUST_SALARY">Điều chỉnh lương đóng</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Tháng hiệu lực <span className="text-rose-500">*</span>
                </label>
                <input
                  type="month"
                  value={declareMonth}
                  onChange={(e) => setDeclareMonth(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Mức lương đóng BHXH mới (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step={100000}
                value={declareNewSalary}
                onChange={(e) => setDeclareNewSalary(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Lý do biến động <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Nhập lý do biến động (ví dụ: Ký HĐLĐ chính thức, Tăng lương theo phụ lục hợp đồng...)"
                value={declareReason}
                onChange={(e) => setDeclareReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Đối soát mã hồ sơ BHXH */}
      {reconcileChange && (
        <Modal
          open={Boolean(reconcileChange)}
          onOpenChange={(open) => !open && setReconcileChange(null)}
          title="Xác nhận đối soát mã hồ sơ cơ quan BHXH"
          description={`Nhân viên: ${reconcileChange.employee.fullName} (${reconcileChange.employee.employeeCode})`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setReconcileChange(null)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                disabled={reconcileMutation.isPending}
                onClick={() => {
                  if (!reconciliationCode.trim()) {
                    notify("Vui lòng nhập mã đối soát BHXH", "error");
                    return;
                  }
                  reconcileMutation.mutate({ id: reconcileChange.id, code: reconciliationCode });
                }}
              >
                {reconcileMutation.isPending ? "Đang xác nhận..." : "Xác nhận đối soát"}
              </Button>
            </>
          }
        >
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Mã tiếp nhận / Mã đối soát BHXH <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: BHXH-7901-202608-0099"
                value={reconciliationCode}
                onChange={(e) => setReconciliationCode(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Xem lịch sử biến động nhân viên */}
      {historyMember && (
        <Modal
          open={Boolean(historyMember)}
          onOpenChange={(open) => !open && setHistoryMember(null)}
          title={`Lịch sử biến động BHXH - ${historyMember.employee.fullName}`}
          description={`Mã NV: ${historyMember.employee.employeeCode} | Số sổ: ${historyMember.socialInsuranceNumber}`}
          footer={
            <Button variant="secondary" onClick={() => setHistoryMember(null)}>
              Đóng
            </Button>
          }
        >
          <div className="py-2 space-y-3">
            {loadingHistory ? (
              <LoadingBlock />
            ) : historyList.length === 0 ? (
              <EmptyState title="Chưa có lịch sử" description="Nhân sự này chưa ghi nhận biến động nào." />
            ) : (
              <div className="data-table-wrap border rounded-lg overflow-hidden">
                <div className="data-table-scroll">
                  <table className="data-table compact-table min-w-[600px]">
                    <thead>
                      <tr>
                        <th style={{ width: "130px" }}>THÁNG HIỆU LỰC</th>
                        <th style={{ width: "140px" }}>LOẠI BIẾN ĐỘNG</th>
                        <th style={{ width: "140px" }} className="text-right">LƯƠNG MỚI</th>
                        <th>MÃ ĐỐI SOÁT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyList.map((h, i) => (
                        <tr key={i}>
                          <td className="text-foreground font-medium">{h.effectiveMonth}</td>
                          <td>
                            <Badge tone="info">{h.changeType}</Badge>
                          </td>
                          <td className="text-right font-bold text-foreground">{formatCurrency(h.newSalary)}</td>
                          <td className="font-mono text-[11px] text-muted">{h.reconciliationCode || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Excel Import Modal */}
      <ExcelImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        title="Import Danh sách BHXH từ Excel"
        description="Tải lên danh sách thành viên tham gia BHXH hoặc danh sách biến động D02-LT."
        sampleTemplateName="Mau_Import_BHXH.xlsx"
        sampleTemplateDescription="Biểu mẫu chuẩn bao gồm: Mã NV, Họ tên, Mã số BHXH, Lương đóng BHXH, Bệnh viện KCB."
        columns={excelColumns}
        previewRows={importPreviewRows}
        stats={[
          { label: "Số dòng hợp lệ", value: importPreviewRows.length, tone: "primary" },
        ]}
        onDownloadSample={() => api.downloadSocialInsuranceImportTemplateV3()}
        onSimulateUpload={handleSimulateUpload}
        onConfirmImport={() => importMutation.mutate()}
        confirmLoading={importMutation.isPending}
        confirmLabel={`Nhập ${importPreviewRows.length || ""} bản ghi vào hệ thống`}
        onClearPreview={() => setImportPreviewRows([])}
      />
    </div>
  );
}
