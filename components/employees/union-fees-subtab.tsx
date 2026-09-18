"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  DollarSign,
  Download,
  FileSpreadsheet,
  History,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Upload,
  UserCheck,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useToast } from "@/components/providers";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Modal,
  TablePaginationFooter,
} from "@/components/ui";
import { api } from "@/lib/api";
import type {
  Employee,
  UnionDuesHistoryItemV3,
  UnionDuesMemberV3,
  UnionDuesParticipationStatus,
  UpdateUnionDuesRequestV3,
} from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export function UnionFeesSubtab({
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

  // Filters & State
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || "all");
  const [statusFilter, setStatusFilter] = useState<UnionDuesParticipationStatus>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isExporting, setIsExporting] = useState(false);

  // Modal States
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [targetMember, setTargetMember] = useState<UnionDuesMemberV3 | null>(null);
  const [toggleReason, setToggleReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedMemberForHistory, setSelectedMemberForHistory] = useState<UnionDuesMemberV3 | null>(null);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [auditLogsModalOpen, setAuditLogsModalOpen] = useState(false);

  // Sync prop changes for projectId
  useEffect(() => {
    if (projectId && projectId !== "all") {
      setSelectedProjectId(projectId);
    }
  }, [projectId]);

  // Query: Projects lookup list
  const { data: projectList = [] } = useQuery({
    queryKey: ["web-payroll-projects"],
    queryFn: () => api.getProjectsV3(),
    staleTime: 1000 * 60 * 10,
  });

  // Query: Summary KPIs
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["union-dues-summary-v3", selectedProjectId],
    queryFn: () => api.getUnionDuesSummaryV3(selectedProjectId),
  });

  // Query: Members List
  const {
    data: listResponse,
    isLoading: isListLoading,
    isError: isListError,
    refetch: refetchList,
  } = useQuery({
    queryKey: [
      "union-dues-members-v3",
      selectedProjectId,
      statusFilter,
      searchTerm,
      currentPage,
      pageSize,
    ],
    queryFn: () =>
      api.getUnionDuesMembersV3({
        projectId: selectedProjectId,
        participationStatus: statusFilter,
        search: searchTerm,
        page: currentPage,
        pageSize,
      }),
  });

  // Query: Member History
  const {
    data: historyResponse,
    isLoading: isHistoryLoading,
  } = useQuery({
    queryKey: ["union-dues-history-v3", selectedMemberForHistory?.employee.employeeCode],
    queryFn: () =>
      api.getUnionDuesHistoryV3(selectedMemberForHistory!.employee.employeeCode),
    enabled: Boolean(historyModalOpen && selectedMemberForHistory?.employee.employeeCode),
  });

  // Query: Audit Logs
  const { data: auditLogsData } = useQuery({
    queryKey: ["union-dues-audit-logs-v3"],
    queryFn: () => api.getUnionDuesAuditLogsV3({ pageSize: 50 }),
    enabled: auditLogsModalOpen,
  });

  const memberItems = listResponse?.items ?? [];
  const totalMembers = listResponse?.total ?? 0;

  // Mutation: Toggle participation
  const toggleMutation = useMutation({
    mutationFn: async ({
      employeeCode,
      newStatus,
      date,
      reason,
    }: {
      employeeCode: string;
      newStatus: boolean;
      date: string;
      reason: string;
    }) => {
      return api.updateUnionDuesMemberV3(employeeCode, {
        participating: newStatus,
        effectiveDate: date,
        contributionAmount: newStatus ? 23400 : 0,
        reason,
        note: reason,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["union-dues-members-v3"] });
      queryClient.invalidateQueries({ queryKey: ["union-dues-summary-v3"] });
      setConfirmModalOpen(false);
      setTargetMember(null);
      setToggleReason("");
      notify(
        data.participating
          ? `Đã đăng ký tham gia Công đoàn cho nhân viên ${data.employee.fullName}!`
          : `Đã dừng trích nộp Công đoàn cho nhân viên ${data.employee.fullName}!`
      );
    },
    onError: (err: any) => notify(err?.message || "Không thể cập nhật trạng thái", "error"),
  });

  // Handle Export Excel
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const res = await api.exportUnionDuesExcelV3({
        projectId: selectedProjectId,
        participationStatus: statusFilter,
        search: searchTerm,
      });
      notify(`Đã xuất báo cáo công đoàn phí (${res.totalRecords} nhân sự)!`);
    } catch (err: any) {
      notify(err?.message || "Không thể xuất báo cáo lúc này.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Import
  const handleImport = async () => {
    if (!importFile) return;
    try {
      const res = await api.importUnionDuesExcelV3(importFile, selectedProjectId);
      notify(`Đã import thành công ${res.importedRows}/${res.totalRows} dòng dữ liệu công đoàn phí!`);
      setImportModalOpen(false);
      setImportFile(null);
      refetchSummary();
      refetchList();
    } catch (err: any) {
      notify(err?.message || "Lỗi khi import file Excel", "error");
    }
  };

  // Sync Header Action
  useEffect(() => {
    if (setHeaderAction) {
      setHeaderAction(
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAuditLogsModalOpen(true)}
            className="gap-1.5 font-medium shrink-0"
          >
            <History className="w-3.5 h-3.5" /> Nhật ký
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setImportModalOpen(true)}
            className="gap-1.5 font-medium shrink-0"
          >
            <Upload className="w-3.5 h-3.5" /> Import Excel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportExcel}
            loading={isExporting}
            className="gap-1.5 font-semibold shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> Xuất Excel
          </Button>
        </div>
      );
    }
    return () => {
      if (setHeaderAction) setHeaderAction(null);
    };
  }, [setHeaderAction, isExporting, selectedProjectId, statusFilter, searchTerm]);

  return (
    <div className="union-fees-subtab space-y-4">
      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Tổng nhân sự */}
        <div
          onClick={() => {
            setStatusFilter("ALL");
            setCurrentPage(1);
          }}
          className={`group cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:shadow-md ${
            statusFilter === "ALL"
              ? "border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/20"
              : "border-border bg-card hover:border-border/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tổng nhân sự
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {isSummaryLoading ? "—" : summaryData?.total ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">người</span>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">Toàn bộ nhân sự trong dự án</p>
        </div>

        {/* Card 2: Đang tham gia Công đoàn */}
        <div
          onClick={() => {
            setStatusFilter("PARTICIPATING");
            setCurrentPage(1);
          }}
          className={`group cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:shadow-md ${
            statusFilter === "PARTICIPATING"
              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20"
              : "border-border bg-card hover:border-emerald-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Đang trích nộp (1%)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {isSummaryLoading ? "—" : summaryData?.participatingCount ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">đoàn viên</span>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">Trích nộp 1% lương tối thiểu vùng</p>
        </div>

        {/* Card 3: Không tham gia */}
        <div
          onClick={() => {
            setStatusFilter("NOT_PARTICIPATING");
            setCurrentPage(1);
          }}
          className={`group cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:shadow-md ${
            statusFilter === "NOT_PARTICIPATING"
              ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-2 ring-amber-500/20"
              : "border-border bg-card hover:border-amber-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Không tham gia
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <UserMinus className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {isSummaryLoading ? "—" : summaryData?.notParticipatingCount ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">người</span>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">Chưa gia nhập hoặc đã làm đơn xin rút</p>
        </div>

        {/* Card 4: Tổng trích nộp tháng */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              Tổng trích nộp / tháng
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              {isSummaryLoading
                ? "—"
                : formatCurrency(summaryData?.totalMonthlyDues ?? 0)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">Dự kiến nộp Liên đoàn Lao động</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="integrated-table-card">
        {/* Toolbar */}
        <div className="table-card-toolbar">
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            {/* Left: Filter Pills */}
            <div className="filter-status-pills flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                className={`pill-btn ${statusFilter === "ALL" ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter("ALL");
                  setCurrentPage(1);
                }}
              >
                Tất cả ({summaryData?.total ?? 0})
              </button>
              <button
                type="button"
                className={`pill-btn success ${statusFilter === "PARTICIPATING" ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter("PARTICIPATING");
                  setCurrentPage(1);
                }}
              >
                Đang trích nộp ({summaryData?.participatingCount ?? 0})
              </button>
              <button
                type="button"
                className={`pill-btn neutral ${statusFilter === "NOT_PARTICIPATING" ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter("NOT_PARTICIPATING");
                  setCurrentPage(1);
                }}
              >
                Không tham gia ({summaryData?.notParticipatingCount ?? 0})
              </button>
            </div>

            {/* Right: Project Dropdown & Search */}
            <div className="flex items-center gap-2.5 ml-auto flex-wrap">
              {projectList.length > 0 && (
                <div className="form-field-wrap">
                  <select
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="select-input text-xs py-1.5 px-2.5 h-9 rounded-md border border-input bg-background"
                  >
                    <option value="all">Tất cả dự án</option>
                    {projectList.map((p) => (
                      <option key={p.projectId} value={String(p.projectId)}>
                        {p.projectCode} - {p.projectName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="relative min-w-[240px] max-w-[320px]">
                <Search className="search-icon-fixed text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Tìm theo tên NV, mã NV, phòng ban..."
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
            </div>
          </div>
        </div>

        {/* Data Table */}
        {isListLoading ? (
          <LoadingBlock rows={6} />
        ) : isListError ? (
          <ErrorState
            message="Không thể tải danh sách dữ liệu công đoàn phí."
            retry={() => refetchList()}
          />
        ) : memberItems.length === 0 ? (
          <EmptyState
            title="Chưa có dữ liệu đoàn phí"
            description={
              searchTerm
                ? "Không tìm thấy nhân sự phù hợp với từ khóa tìm kiếm."
                : "Không có hồ sơ công đoàn phí trong bộ lọc này."
            }
          />
        ) : (
          <div className="data-table-wrap">
            <div className="data-table-scroll">
              <table className="data-table min-w-[1020px]">
                <thead>
                  <tr>
                    <th style={{ width: "45px" }} className="text-center">STT</th>
                    <th style={{ minWidth: "190px" }}>NGƯỜI LAO ĐỘNG</th>
                    <th style={{ width: "140px" }} className="text-center">TRẠNG THÁI</th>
                    <th style={{ width: "125px" }}>NGÀY GIA NHẬP</th>
                    <th style={{ width: "125px" }}>NGÀY DỪNG</th>
                    <th style={{ minWidth: "170px" }}>CÔNG THỨC TRÍCH NỘP</th>
                    <th style={{ width: "135px" }} className="text-right">MỨC ĐÓNG/THÁNG</th>
                    <th style={{ minWidth: "170px" }}>GHI CHÚ</th>
                    <th style={{ width: "120px" }} className="text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {memberItems.map((m: UnionDuesMemberV3, idx: number) => {
                    const rawStt = (currentPage - 1) * pageSize + idx + 1;
                    const stt = String(rawStt).padStart(2, "0");

                    return (
                      <tr key={m.employee.employeeCode}>
                        <td className="text-center text-muted font-medium">{stt}</td>
                        <td>
                          <div className="employee-cell-info">
                            <span className="employee-cell-name font-semibold text-foreground">
                              {m.employee.fullName}
                            </span>
                            <span className="employee-cell-sub">
                              <span className="employee-code-badge">{m.employee.employeeCode}</span>
                              {m.employee.department && (
                                <span className="text-muted text-[11px]">· {m.employee.department}</span>
                              )}
                              {m.employee.project?.projectCode && (
                                <span className="text-muted text-[11px] font-medium">
                                  · [{m.employee.project.projectCode}]
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="text-center">
                          {m.participating ? (
                            <Badge tone="success">Đang trích nộp</Badge>
                          ) : (
                            <Badge tone="neutral">Không tham gia</Badge>
                          )}
                        </td>
                        <td className="text-[13px] text-foreground">
                          {m.joinDate ? formatDate(m.joinDate) : "—"}
                        </td>
                        <td className="text-[13px]">
                          {m.leaveDate ? (
                            <span className="text-rose-600 dark:text-rose-400 font-medium">
                              {formatDate(m.leaveDate)}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="text-xs text-foreground font-medium">
                          {m.participating
                            ? m.contributionFormula || "1% Lương tối thiểu vùng"
                            : "—"}
                        </td>
                        <td className="text-right">
                          {m.participating ? (
                            <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-[13px]">
                              {formatCurrency(m.contributionAmount ?? 23400)}
                            </strong>
                          ) : (
                            <span className="text-muted text-xs">0 đ</span>
                          )}
                        </td>
                        <td className="text-xs text-muted-foreground">
                          {m.note || "—"}
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant={m.participating ? "danger" : "primary"}
                              size="sm"
                              onClick={() => {
                                setTargetMember(m);
                                setEffectiveDate(new Date().toISOString().slice(0, 10));
                                setToggleReason(
                                  m.participating
                                    ? "Người lao động làm đơn xin rút khỏi tổ chức Công đoàn cơ sở"
                                    : "Đăng ký tham gia Công đoàn cơ sở"
                                );
                                setConfirmModalOpen(true);
                              }}
                              className="h-7 text-[11px] px-2 font-medium"
                              title={m.participating ? "Dừng tham gia công đoàn" : "Kích hoạt tham gia công đoàn"}
                            >
                              {m.participating ? "Dừng trích" : "Tham gia"}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSelectedMemberForHistory(m);
                                setHistoryModalOpen(true);
                              }}
                              className="h-7 text-[11px] px-1.5"
                              title="Xem lịch sử biến động"
                            >
                              <History className="w-3.5 h-3.5 text-primary" />
                            </Button>
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
              totalItems={totalMembers}
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

      {/* Modal: Xác nhận Thay đổi trạng thái tham gia Công đoàn */}
      <Modal
        open={confirmModalOpen}
        onOpenChange={setConfirmModalOpen}
        title={
          targetMember?.participating
            ? `Dừng trích nộp Công đoàn: ${targetMember?.employee.fullName}`
            : `Đăng ký tham gia Công đoàn: ${targetMember?.employee.fullName}`
        }
        description={`Mã NV: ${targetMember?.employee.employeeCode} · Phòng ban: ${
          targetMember?.employee.department ?? "Khối Sản xuất"
        }`}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant={targetMember?.participating ? "danger" : "primary"}
              loading={toggleMutation.isPending}
              onClick={() => {
                if (!targetMember) return;
                toggleMutation.mutate({
                  employeeCode: targetMember.employee.employeeCode,
                  newStatus: !targetMember.participating,
                  date: effectiveDate,
                  reason: toggleReason,
                });
              }}
            >
              {targetMember?.participating ? "Xác nhận dừng tham gia" : "Xác nhận tham gia"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5">
          <div className="form-field-wrap">
            <label className="text-xs font-semibold text-foreground">Ngày áp dụng</label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="text-input h-9 text-xs"
            />
          </div>

          <div className="form-field-wrap">
            <label className="text-xs font-semibold text-foreground">Lý do thay đổi</label>
            <textarea
              value={toggleReason}
              onChange={(e) => setToggleReason(e.target.value)}
              rows={3}
              placeholder="Nhập lý do thay đổi trạng thái tham gia công đoàn..."
              className="text-input text-xs p-2 rounded-md"
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Lịch sử biến động Công đoàn của nhân viên */}
      <Modal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        title={`Lịch sử công đoàn phí: ${selectedMemberForHistory?.employee.fullName ?? ""}`}
        description={`Mã NV: ${selectedMemberForHistory?.employee.employeeCode} · Trạng thái hiện tại: ${
          selectedMemberForHistory?.participating ? "Đang tham gia" : "Không tham gia"
        }`}
        size="lg"
        footer={<Button onClick={() => setHistoryModalOpen(false)}>Đóng</Button>}
      >
        {isHistoryLoading ? (
          <LoadingBlock rows={3} />
        ) : historyResponse?.items && historyResponse.items.length > 0 ? (
          <div className="data-table-wrap border rounded-lg overflow-hidden">
            <div className="data-table-scroll">
              <table className="data-table compact-table min-w-[600px]">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }} className="text-center">STT</th>
                    <th style={{ width: "130px" }}>THỜI GIAN</th>
                    <th style={{ width: "120px" }}>LOẠI BIẾN ĐỘNG</th>
                    <th style={{ width: "110px" }} className="text-right">MỨC ĐÓNG</th>
                    <th style={{ minWidth: "150px" }}>NGƯỜI THỰC HIỆN</th>
                    <th style={{ minWidth: "160px" }}>GHI CHÚ</th>
                  </tr>
                </thead>
                <tbody>
                  {historyResponse.items.map((h: UnionDuesHistoryItemV3, i: number) => (
                    <tr key={h.id}>
                      <td className="text-center text-muted font-medium">{String(i + 1).padStart(2, "0")}</td>
                      <td className="text-xs font-medium text-foreground">{formatDate(h.occurredAt)}</td>
                      <td>
                        {h.eventType === "JOINED" ? (
                          <Badge tone="success">Gia nhập</Badge>
                        ) : h.eventType === "LEFT" ? (
                          <Badge tone="danger">Rút lui</Badge>
                        ) : (
                          <Badge tone="info">Điều chỉnh</Badge>
                        )}
                      </td>
                      <td className="text-right font-semibold text-xs">
                        {h.contributionAmount ? formatCurrency(h.contributionAmount) : "0 đ"}
                      </td>
                      <td>
                        <span className="text-xs text-foreground font-medium block">
                          {h.performedBy?.fullName}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {h.performedBy?.roleName ?? "Quản trị viên"}
                        </span>
                      </td>
                      <td className="text-xs text-muted-foreground">{h.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Chưa có lịch sử biến động"
            description="Chưa ghi nhận sự kiện thay đổi trạng thái đoàn phí của nhân viên."
          />
        )}
      </Modal>

      {/* Modal: Import Excel */}
      <Modal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        title="Import danh sách Công đoàn phí từ Excel"
        description="Tải lên danh sách nhân viên tham gia/rút lui công đoàn theo biểu mẫu chuẩn."
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => api.downloadUnionDuesImportTemplateV3()}
              className="gap-1.5 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" /> Tải file mẫu (.xlsx)
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setImportModalOpen(false)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                disabled={!importFile}
                onClick={handleImport}
                className="gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Bắt đầu Import
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <input
            type="file"
            ref={importFileInputRef}
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <div
            onClick={() => importFileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors bg-muted/20"
          >
            <FileSpreadsheet className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            {importFile ? (
              <div>
                <p className="text-sm font-semibold text-foreground">{importFile.name}</p>
                <p className="text-xs text-muted-foreground">{(importFile.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-foreground">Click để chọn tệp Excel (.xlsx)</p>
                <p className="text-[11px] text-muted-foreground mt-1">Dung lượng tối đa 10MB</p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal: Audit Logs */}
      <Modal
        open={auditLogsModalOpen}
        onOpenChange={setAuditLogsModalOpen}
        title="Nhật ký hoạt động Công đoàn phí"
        description="Lịch sử các thao tác thay đổi trạng thái tham gia và mức trích nộp."
        size="lg"
        footer={<Button onClick={() => setAuditLogsModalOpen(false)}>Đóng</Button>}
      >
        {auditLogsData?.items && auditLogsData.items.length > 0 ? (
          <div className="data-table-wrap border rounded-lg overflow-hidden">
            <div className="data-table-scroll">
              <table className="data-table compact-table min-w-[600px]">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }} className="text-center">STT</th>
                    <th style={{ width: "135px" }}>THỜI GIAN</th>
                    <th style={{ width: "130px" }}>NGƯỜI THỰC HIỆN</th>
                    <th style={{ width: "140px" }}>NHÂN VIÊN</th>
                    <th style={{ minWidth: "200px" }}>NỘI DUNG</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogsData.items.map((log: any, idx: number) => (
                    <tr key={log.id}>
                      <td className="text-center text-muted font-medium">{String(idx + 1).padStart(2, "0")}</td>
                      <td className="text-xs font-medium text-foreground">{formatDate(log.occurredAt)}</td>
                      <td>
                        <span className="text-xs font-semibold text-foreground block">{log.actor?.fullName}</span>
                        <span className="text-[11px] text-muted-foreground">{log.actor?.roleName}</span>
                      </td>
                      <td>
                        <span className="text-xs font-medium text-foreground block">{log.employee?.fullName}</span>
                        <span className="text-[11px] text-muted-foreground">[{log.employee?.employeeCode}]</span>
                      </td>
                      <td className="text-xs text-muted-foreground">{log.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState title="Chưa có nhật ký hoạt động" description="Không có sự kiện nào được ghi nhận." />
        )}
      </Modal>
    </div>
  );
}
