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
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Upload,
  UploadCloud,
  UserCheck,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useToast } from "@/components/providers";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Modal,
  SearchInput,
  TablePaginationFooter,
} from "@/components/ui";
import { api } from "@/lib/api";
import type {
  Employee,
  UnionAuditLogItemV3,
  UnionHistoryItemV3,
  UnionMemberItemV3,
  UnionParticipationStatus,
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
  const [statusFilter, setStatusFilter] = useState<UnionParticipationStatus>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal States
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [registerMember, setRegisterMember] = useState<UnionMemberItemV3 | null>(null);
  const [registerJoinDate, setRegisterJoinDate] = useState(new Date().toISOString().slice(0, 10));
  const [registerAmount, setRegisterAmount] = useState<number>(23400);
  const [registerNote, setRegisterNote] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editMember, setEditMember] = useState<UnionMemberItemV3 | null>(null);
  const [editAmount, setEditAmount] = useState<number>(23400);
  const [editNote, setEditNote] = useState("");

  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deactivateMember, setDeactivateMember] = useState<UnionMemberItemV3 | null>(null);
  const [deactivateNote, setDeactivateNote] = useState("");

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyMember, setHistoryMember] = useState<UnionMemberItemV3 | null>(null);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      await api.downloadUnionImportTemplateV3();
      notify("Đã tải xuống biểu mẫu import công đoàn phí (.xlsx)");
    } catch {
      notify("Không thể tải file mẫu. Vui lòng thử lại sau.", "error");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const [auditLogsModalOpen, setAuditLogsModalOpen] = useState(false);

  // Reset page when project or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [projectId, statusFilter]);

  // Main Query: Union Members List
  const {
    data: listResponse,
    isLoading: isListLoading,
    isError: isListError,
    refetch: refetchList,
  } = useQuery({
    queryKey: ["web-payroll-unions", projectId, statusFilter, searchTerm, currentPage, pageSize],
    queryFn: () =>
      api.getUnionsV3({
        projectId: projectId === "all" ? undefined : projectId,
        status: statusFilter,
        keyword: searchTerm,
        pageIndex: currentPage,
        pageSize,
      }),
  });

  // KPI Queries for accurate counts
  const { data: allCountData, refetch: refetchAllCount } = useQuery({
    queryKey: ["web-payroll-unions-count-all", projectId],
    queryFn: () =>
      api.getUnionsV3({
        projectId: projectId === "all" ? undefined : projectId,
        status: "ALL",
        pageIndex: 1,
        pageSize: 1,
      }),
    staleTime: 1000 * 30,
  });

  const { data: partCountData, refetch: refetchPartCount } = useQuery({
    queryKey: ["web-payroll-unions-count-part", projectId],
    queryFn: () =>
      api.getUnionsV3({
        projectId: projectId === "all" ? undefined : projectId,
        status: "PARTICIPATING",
        pageIndex: 1,
        pageSize: 1,
      }),
    staleTime: 1000 * 30,
  });

  const { data: notPartCountData, refetch: refetchNotPartCount } = useQuery({
    queryKey: ["web-payroll-unions-count-not-part", projectId],
    queryFn: () =>
      api.getUnionsV3({
        projectId: projectId === "all" ? undefined : projectId,
        status: "NOT_PARTICIPATING",
        pageIndex: 1,
        pageSize: 1,
      }),
    staleTime: 1000 * 30,
  });

  const totalCount = allCountData?.total ?? (statusFilter === "ALL" ? listResponse?.total ?? 0 : 0);
  const participatingCount = partCountData?.total ?? (statusFilter === "PARTICIPATING" ? listResponse?.total ?? 0 : 0);
  const notParticipatingCount = notPartCountData?.total ?? (statusFilter === "NOT_PARTICIPATING" ? listResponse?.total ?? 0 : 0);

  // Member History Query
  const {
    data: historyResponse,
    isLoading: isHistoryLoading,
  } = useQuery({
    queryKey: ["web-payroll-unions-history", historyMember?.employee.employeeCode],
    queryFn: () => api.getUnionHistoryV3(historyMember!.employee.employeeCode),
    enabled: Boolean(historyModalOpen && historyMember?.employee.employeeCode),
  });

  // Audit Logs Query
  const {
    data: auditLogsData,
    isLoading: isAuditLogsLoading,
  } = useQuery({
    queryKey: ["web-payroll-unions-audit-logs", auditLogsModalOpen],
    queryFn: () => api.getUnionAuditLogsV3({ pageIndex: 1, pageSize: 50 }),
    enabled: auditLogsModalOpen,
  });

  const memberItems = listResponse?.items ?? [];
  const totalMembers = listResponse?.total ?? 0;

  // Refetch all queries helper
  const refreshAllData = () => {
    refetchList();
    refetchAllCount();
    refetchPartCount();
    refetchNotPartCount();
  };

  // Mutation: Register Union
  const registerMutation = useMutation({
    mutationFn: (payload: { employeeCode: string; unionJoinDate: string; contributionAmount: number; note: string }) =>
      api.registerUnionV3(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web-payroll-unions"] });
      queryClient.invalidateQueries({ queryKey: ["web-payroll-unions-count-all"] });
      queryClient.invalidateQueries({ queryKey: ["web-payroll-unions-count-part"] });
      queryClient.invalidateQueries({ queryKey: ["web-payroll-unions-count-not-part"] });
      setRegisterModalOpen(false);
      setRegisterMember(null);
      setRegisterNote("");
      notify("Đăng ký tham gia công đoàn thành công!");
    },
    onError: (err: any) => notify(err?.message || "Không thể đăng ký tham gia công đoàn", "error"),
  });

  // Mutation: Update Contribution
  const updateContributionMutation = useMutation({
    mutationFn: (payload: { employeeCode: string; contributionAmount: number; note: string }) =>
      api.updateUnionContributionV3(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web-payroll-unions"] });
      setEditModalOpen(false);
      setEditMember(null);
      setEditNote("");
      notify("Cập nhật mức trích nộp công đoàn thành công!");
    },
    onError: (err: any) => notify(err?.message || "Không thể cập nhật mức đóng", "error"),
  });

  // Mutation: Deactivate Union
  const deactivateMutation = useMutation({
    mutationFn: (payload: { employeeCode: string; note: string }) =>
      api.deactivateUnionV3(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web-payroll-unions"] });
      queryClient.invalidateQueries({ queryKey: ["web-payroll-unions-count-all"] });
      queryClient.invalidateQueries({ queryKey: ["web-payroll-unions-count-part"] });
      queryClient.invalidateQueries({ queryKey: ["web-payroll-unions-count-not-part"] });
      setDeactivateModalOpen(false);
      setDeactivateMember(null);
      setDeactivateNote("");
      notify("Đã dừng trích nộp công đoàn cho nhân viên!");
    },
    onError: (err: any) => notify(err?.message || "Không thể dừng trích nộp", "error"),
  });

  // Mutation: Import Excel
  const importMutation = useMutation({
    mutationFn: (file: File) => api.importUnionExcelV3(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web-payroll-unions"] });
      queryClient.invalidateQueries({ queryKey: ["web-payroll-unions-count-all"] });
      queryClient.invalidateQueries({ queryKey: ["web-payroll-unions-count-part"] });
      queryClient.invalidateQueries({ queryKey: ["web-payroll-unions-count-not-part"] });
      setImportModalOpen(false);
      setImportFile(null);
      notify("Import danh sách đoàn phí thành công!");
    },
    onError: (err: any) => notify(err?.message || "Lỗi khi import file Excel", "error"),
  });

  // Sync Header Actions
  useEffect(() => {
    if (setHeaderAction) {
      setHeaderAction(
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={refreshAllData}
            className="gap-1.5 font-medium shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Làm mới
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAuditLogsModalOpen(true)}
            className="gap-1.5 font-medium shrink-0"
          >
            <History className="w-3.5 h-3.5" /> Nhật ký
          </Button>
          {/* Tạm thời ẩn nút Import Excel theo yêu cầu, không xóa */}
          {/* <Button
            variant="primary"
            size="sm"
            onClick={() => setImportModalOpen(true)}
            className="gap-1.5 font-semibold shrink-0"
          >
            <Upload className="w-3.5 h-3.5" /> Import Excel
          </Button> */}
        </div>
      );
    }
    return () => {
      if (setHeaderAction) setHeaderAction(null);
    };
  }, [setHeaderAction]);

  // Handlers to open modals
  const handleOpenRegister = (m: UnionMemberItemV3) => {
    setRegisterMember(m);
    setRegisterJoinDate(new Date().toISOString().slice(0, 10));
    setRegisterAmount(23400);
    setRegisterNote("Đăng ký tham gia tổ chức Công đoàn cơ sở");
    setRegisterModalOpen(true);
  };

  const handleOpenEdit = (m: UnionMemberItemV3) => {
    setEditMember(m);
    setEditAmount(m.contributionAmount ?? 23400);
    setEditNote(m.note || "");
    setEditModalOpen(true);
  };

  const handleOpenDeactivate = (m: UnionMemberItemV3) => {
    setDeactivateMember(m);
    setDeactivateNote("Người lao động làm đơn xin rút khỏi tổ chức Công đoàn");
    setDeactivateModalOpen(true);
  };

  const handleOpenHistory = (m: UnionMemberItemV3) => {
    setHistoryMember(m);
    setHistoryModalOpen(true);
  };

  return (
    <div className="union-fees-subtab space-y-4">
      {/* 3 KPI Summary Cards (Interactive Filter Selectors) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
              {isListLoading && statusFilter === "ALL" ? "—" : totalCount}
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
              {isListLoading && statusFilter === "PARTICIPATING" ? "—" : participatingCount}
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
              {isListLoading && statusFilter === "NOT_PARTICIPATING" ? "—" : notParticipatingCount}
            </span>
            <span className="text-xs text-muted-foreground">người</span>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">Chưa gia nhập hoặc đã làm đơn xin rút</p>
        </div>
      </div>

      {/* Main Integrated Table Card */}
      <div className="integrated-table-card">
        {/* Table Toolbar */}
        <div className="table-card-toolbar">
          <div className="flex items-center justify-between gap-3 w-full">
            <div className="text-xs font-semibold text-foreground">
              Danh sách đoàn phí ({totalMembers})
            </div>

            {/* Right: Search Box */}
            <SearchInput
              value={searchTerm}
              onChange={(val) => {
                setSearchTerm(val);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo tên NV, mã NV, phòng ban..."
              containerClassName="min-w-[260px] max-w-[340px]"
            />
          </div>
        </div>

        {/* Data Table */}
        {isListLoading ? (
          <LoadingBlock rows={6} />
        ) : isListError ? (
          <ErrorState
            message="Không thể tải danh sách dữ liệu công đoàn phí."
            retry={refreshAllData}
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
              <table className="data-table min-w-[980px]">
                <thead>
                  <tr>
                    <th style={{ width: "45px" }} className="text-center">STT</th>
                    <th style={{ minWidth: "190px" }}>NGƯỜI LAO ĐỘNG</th>
                    <th style={{ width: "135px" }} className="text-center">TRẠNG THÁI</th>
                    <th style={{ width: "125px" }}>NGÀY GIA NHẬP</th>
                    <th style={{ minWidth: "170px" }}>CÔNG THỨC TRÍCH NỘP</th>
                    <th style={{ width: "135px" }} className="text-right">MỨC ĐÓNG/THÁNG</th>
                    <th style={{ minWidth: "160px" }}>GHI CHÚ</th>
                    <th style={{ width: "130px" }} className="text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {memberItems.map((m: UnionMemberItemV3, idx: number) => {
                    const rawStt = (currentPage - 1) * pageSize + idx + 1;
                    const stt = String(rawStt).padStart(2, "0");

                    return (
                      <tr key={m.employee.employeeCode || idx}>
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
                          <div className="flex items-center justify-center gap-1.5">
                            {m.participating ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(m)}
                                  className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md shadow-xs transition-colors cursor-pointer"
                                  title="Chỉnh sửa mức trích nộp"
                                >
                                  <Pencil className="w-3 h-3 text-slate-500 dark:text-slate-400" /> Sửa
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDeactivate(m)}
                                  className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-md shadow-xs transition-colors cursor-pointer"
                                  title="Dừng trích nộp công đoàn"
                                >
                                  <UserMinus className="w-3 h-3 text-rose-500" /> Dừng
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenRegister(m)}
                                className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-semibold !text-white bg-primary hover:bg-primary-hover border border-primary rounded-md shadow-xs transition-colors cursor-pointer"
                                style={{ color: "#ffffff", backgroundColor: "#038b8c", borderColor: "#038b8c" }}
                                title="Đăng ký tham gia công đoàn"
                              >
                                <Plus className="w-3.5 h-3.5 !text-white" style={{ color: "#ffffff" }} />
                                <span className="!text-white" style={{ color: "#ffffff" }}>Tham gia</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenHistory(m)}
                              className="inline-flex items-center justify-center w-7 h-7 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md shadow-xs transition-colors cursor-pointer"
                              title="Xem lịch sử biến động"
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

      {/* Modal 1: Đăng ký tham gia Công đoàn (POST /register) */}
      <Modal
        open={registerModalOpen}
        onOpenChange={setRegisterModalOpen}
        title={`Đăng ký tham gia Công đoàn: ${registerMember?.employee.fullName ?? ""}`}
        description={`Mã NV: ${registerMember?.employee.employeeCode ?? ""}`}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setRegisterModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              loading={registerMutation.isPending}
              onClick={() => {
                if (!registerMember) return;
                registerMutation.mutate({
                  employeeCode: registerMember.employee.employeeCode,
                  unionJoinDate: registerJoinDate,
                  contributionAmount: Number(registerAmount) || 23400,
                  note: registerNote,
                });
              }}
              className="gap-1.5"
            >
              <Save className="w-4 h-4" /> Lưu đăng ký
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Ngày gia nhập công đoàn <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={registerJoinDate}
              onChange={(e) => setRegisterJoinDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Mức đóng hàng tháng (VNĐ) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="1000"
              value={registerAmount}
              onChange={(e) => setRegisterAmount(Number(e.target.value))}
              placeholder="23400"
              className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Mặc định 23.400 đ (1% lương tối thiểu vùng)
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Ghi chú
            </label>
            <textarea
              value={registerNote}
              onChange={(e) => setRegisterNote(e.target.value)}
              rows={3}
              placeholder="Nhập ghi chú đăng ký tham gia..."
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Modal 2: Chỉnh sửa mức trích nộp (PUT /contribution) */}
      <Modal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        title={`Điều chỉnh mức đóng đoàn phí: ${editMember?.employee.fullName ?? ""}`}
        description={`Mã NV: ${editMember?.employee.employeeCode ?? ""}`}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              loading={updateContributionMutation.isPending}
              onClick={() => {
                if (!editMember) return;
                updateContributionMutation.mutate({
                  employeeCode: editMember.employee.employeeCode,
                  contributionAmount: Number(editAmount) || 0,
                  note: editNote,
                });
              }}
              className="gap-1.5"
            >
              <Save className="w-4 h-4" /> Lưu thay đổi
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Mức trích nộp mới (VNĐ) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="1000"
              value={editAmount}
              onChange={(e) => setEditAmount(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Lý do / Ghi chú điều chỉnh
            </label>
            <textarea
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              rows={3}
              placeholder="Nhập lý do điều chỉnh mức đóng..."
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Modal 3: Dừng tham gia Công đoàn (POST /deactivate) */}
      <Modal
        open={deactivateModalOpen}
        onOpenChange={setDeactivateModalOpen}
        title={`Dừng trích nộp Công đoàn: ${deactivateMember?.employee.fullName ?? ""}`}
        description={`Mã NV: ${deactivateMember?.employee.employeeCode ?? ""}`}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeactivateModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              loading={deactivateMutation.isPending}
              onClick={() => {
                if (!deactivateMember) return;
                deactivateMutation.mutate({
                  employeeCode: deactivateMember.employee.employeeCode,
                  note: deactivateNote,
                });
              }}
            >
              Xác nhận dừng trích
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Lý do dừng tham gia công đoàn <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={deactivateNote}
              onChange={(e) => setDeactivateNote(e.target.value)}
              rows={3}
              placeholder="Nhập lý do dừng tham gia công đoàn..."
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Modal 4: Lịch sử biến động Công đoàn (GET /history) */}
      <Modal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        title={`Lịch sử đoàn phí: ${historyMember?.employee.fullName ?? ""}`}
        description={`Mã NV: ${historyMember?.employee.employeeCode} · Trạng thái: ${
          historyMember?.participating ? "Đang trích nộp" : "Không tham gia"
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
                  {historyResponse.items.map((h: UnionHistoryItemV3, i: number) => (
                    <tr key={h.id || i}>
                      <td className="text-center text-muted font-medium">{String(i + 1).padStart(2, "0")}</td>
                      <td className="text-xs font-medium text-foreground">{h.occurredAt ? formatDate(h.occurredAt) : "—"}</td>
                      <td>
                        {h.eventType === "JOINED" ? (
                          <Badge tone="success">Gia nhập</Badge>
                        ) : h.eventType === "LEFT" ? (
                          <Badge tone="danger">Rút lui</Badge>
                        ) : (
                          <Badge tone="info">{h.action || "Điều chỉnh"}</Badge>
                        )}
                      </td>
                      <td className="text-right font-semibold text-xs">
                        {h.contributionAmount ? formatCurrency(h.contributionAmount) : "0 đ"}
                      </td>
                      <td>
                        <span className="text-xs text-foreground font-medium block">
                          {h.performedBy?.fullName || "Hệ thống"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {h.performedBy?.roleName || "Quản trị viên"}
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

      {/* ================= Modal 5: Import Excel Wizard (POST /import) ================= */}
      <Modal
        open={importModalOpen}
        onOpenChange={(open) => {
          setImportModalOpen(open);
          if (!open) {
            setImportFile(null);
            setIsDragging(false);
          }
        }}
        title="Import danh sách Công đoàn phí từ Excel"
        description="Tải lên danh sách nhân viên tham gia/rút lui công đoàn theo biểu mẫu chuẩn để thêm hàng loạt."
        size="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Step 1: Download Template */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-100">1. Tải biểu mẫu Excel chuẩn</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Sử dụng tệp mẫu để đảm bảo đúng định dạng các cột dữ liệu công đoàn phí.
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

      {/* Modal 6: Nhật ký hoạt động (GET /audit-logs) */}
      <Modal
        open={auditLogsModalOpen}
        onOpenChange={setAuditLogsModalOpen}
        title="Nhật ký hoạt động Công đoàn phí"
        description="Lịch sử các thao tác thay đổi trạng thái tham gia và mức trích nộp."
        size="lg"
        footer={<Button onClick={() => setAuditLogsModalOpen(false)}>Đóng</Button>}
      >
        {isAuditLogsLoading ? (
          <LoadingBlock rows={4} />
        ) : auditLogsData?.items && auditLogsData.items.length > 0 ? (
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
                  {auditLogsData.items.map((log: UnionAuditLogItemV3, idx: number) => (
                    <tr key={log.id || idx}>
                      <td className="text-center text-muted font-medium">{String(idx + 1).padStart(2, "0")}</td>
                      <td className="text-xs font-medium text-foreground">
                        {log.occurredAt ? formatDate(log.occurredAt) : "—"}
                      </td>
                      <td>
                        <span className="text-xs font-semibold text-foreground block">
                          {log.actor?.fullName || "Hệ thống"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {log.actor?.roleName || "Quản trị viên"}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs font-medium text-foreground block">
                          {log.employee?.fullName || "—"}
                        </span>
                        {log.employee?.employeeCode && (
                          <span className="text-[11px] text-muted-foreground">
                            [{log.employee.employeeCode}]
                          </span>
                        )}
                      </td>
                      <td className="text-xs text-muted-foreground">{log.description || log.action || "—"}</td>
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
