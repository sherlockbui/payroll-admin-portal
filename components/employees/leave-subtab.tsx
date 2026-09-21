"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  History,
  Layers,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  AnnualLeaveEmployee,
  AnnualLeaveHistoryItemV3,
  AnnualLeaveViewFilter,
  Employee,
  EmploymentType,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function LeaveSubtab({
  projectId,
  employees,
  setHeaderAction,
}: {
  projectId: string;
  employees: Employee[];
  setHeaderAction?: (node: ReactNode) => void;
}) {
  const { notify } = useToast();

  // Filters & State
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || "all");
  const [viewFilter, setViewFilter] = useState<AnnualLeaveViewFilter>("ALL");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // History & Detail Modal State
  const [selectedEmployee, setSelectedEmployee] = useState<AnnualLeaveEmployee | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyYear, setHistoryYear] = useState<string>("2026");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(10);

  // Sync prop changes for projectId
  useEffect(() => {
    setSelectedProjectId(projectId || "all");
    setCurrentPage(1);
  }, [projectId]);

  // Query: Annual Leave Employees List (via Swagger: GET /api/web/payroll/leaves)
  const {
    data: listResponse,
    isLoading: isListLoading,
    isError: isListError,
    refetch: refetchList,
  } = useQuery({
    queryKey: [
      "leaves-list-v3",
      selectedProjectId,
      selectedYear,
      viewFilter,
      searchTerm,
      currentPage,
      pageSize,
    ],
    queryFn: () =>
      api.getLeavesV3({
        projectId: selectedProjectId,
        year: selectedYear === "all" ? undefined : selectedYear,
        filter: viewFilter,
        search: searchTerm,
        page: currentPage,
        pageSize,
      }),
  });

  // KPI Summary: Computed directly from list data
  const summaryData = useMemo(() => {
    const items = listResponse?.items ?? [];
    const total = listResponse?.total ?? items.length;
    let officialEligible = 0;
    let probationOrNoContract = 0;
    let terminated = 0;
    let hasAvailableLeave = 0;
    let exhausted = 0;

    for (const item of items) {
      const isTerminated = Boolean(item.terminationDate);
      const isOfficial = item.employmentType === "OFFICIAL_CONTRACT" && !isTerminated;
      const avail = item.availableDays ?? 0;

      if (isTerminated) {
        terminated++;
      } else if (isOfficial) {
        officialEligible++;
        if (avail > 0) hasAvailableLeave++;
        else exhausted++;
      } else {
        probationOrNoContract++;
      }
    }

    return {
      total,
      officialEligible,
      probationOrNoContract,
      terminated,
      hasAvailableLeave,
      exhausted,
    };
  }, [listResponse]);

  // Query: History for selected employee modal (via Swagger: GET /api/web/payroll/leaves/history)
  const {
    data: historyResponse,
    isLoading: isHistoryLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: [
      "leaves-history-v3",
      selectedEmployee?.employee.employeeCode,
      historyYear,
      historyPage,
      historyPageSize,
    ],
    queryFn: () =>
      api.getLeaveHistoryV3({
        employeeCode: selectedEmployee!.employee.employeeCode,
        year: historyYear === "all" ? undefined : historyYear,
        page: historyPage,
        pageSize: historyPageSize,
      }),
    enabled: Boolean(historyModalOpen && selectedEmployee?.employee.employeeCode),
  });

  const employeeItems = listResponse?.items ?? [];
  const totalEmployees = listResponse?.total ?? 0;
  const totalPages = listResponse?.totalPages ?? 1;

  // Sync Header Action
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
        </div>
      );
    }
    return () => {
      if (setHeaderAction) setHeaderAction(null);
    };
  }, [setHeaderAction, refetchList]);

  // Helper formatting employment type badge
  const renderEmploymentType = (type: EmploymentType, isTerminated: boolean) => {
    if (isTerminated) {
      return <Badge tone="danger">Đã thôi việc</Badge>;
    }
    switch (type) {
      case "OFFICIAL_CONTRACT":
        return <Badge tone="success">HĐ Chính thức</Badge>;
      case "PROBATION":
        return <Badge tone="warning">Thử việc</Badge>;
      case "SEASONAL":
        return <Badge tone="info">Thời vụ</Badge>;
      case "INTERN":
        return <Badge tone="neutral">Thực tập</Badge>;
      case "NONE":
      default:
        return <Badge tone="neutral">Chưa có HĐ</Badge>;
    }
  };

  const formatDays = (num: number | null | undefined): string => {
    if (typeof num !== "number" || isNaN(num)) return "0.0";
    return num.toFixed(1);
  };

  return (
    <div className="leave-subtab space-y-4">
      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Tổng nhân sự */}
        <div
          onClick={() => {
            setViewFilter("ALL");
            setCurrentPage(1);
          }}
          className={`group cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:shadow-md ${
            viewFilter === "ALL"
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
              {isListLoading ? "—" : summaryData?.total ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">người</span>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">Tất cả nhân sự trong hệ thống</p>
        </div>

        {/* Card 2: Đủ điều kiện hưởng phép */}
        <div
          onClick={() => {
            setViewFilter("OFFICIAL_ELIGIBLE");
            setCurrentPage(1);
          }}
          className={`group cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:shadow-md ${
            viewFilter === "OFFICIAL_ELIGIBLE"
              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20"
              : "border-border bg-card hover:border-emerald-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Đủ điều kiện phép
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {isListLoading ? "—" : summaryData?.officialEligible ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">HĐ chính thức</span>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">Hưởng tiêu chuẩn 12+ ngày/năm</p>
        </div>

        {/* Card 3: Thử việc / Chưa ký HĐ */}
        <div
          onClick={() => {
            setViewFilter("PROBATION_OR_NO_CONTRACT");
            setCurrentPage(1);
          }}
          className={`group cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:shadow-md ${
            viewFilter === "PROBATION_OR_NO_CONTRACT"
              ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-2 ring-amber-500/20"
              : "border-border bg-card hover:border-amber-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Thử việc / Chưa HĐ
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {isListLoading ? "—" : summaryData?.probationOrNoContract ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">người</span>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">Chưa phát sinh hạn mức phép</p>
        </div>

        {/* Card 4: Còn phép khả dụng */}
        <div
          onClick={() => {
            setViewFilter("HAS_AVAILABLE_LEAVE");
            setCurrentPage(1);
          }}
          className={`group cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:shadow-md ${
            viewFilter === "HAS_AVAILABLE_LEAVE"
              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/20"
              : "border-border bg-card hover:border-blue-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              Còn phép khả dụng
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              {isListLoading ? "—" : summaryData?.hasAvailableLeave ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">nhân sự</span>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">Số dư ngày phép khả dụng &gt; 0</p>
        </div>

        {/* Card 5: Hết phép năm */}
        <div
          onClick={() => {
            setViewFilter("EXHAUSTED");
            setCurrentPage(1);
          }}
          className={`group cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:shadow-md ${
            viewFilter === "EXHAUSTED"
              ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 ring-2 ring-rose-500/20"
              : "border-border bg-card hover:border-rose-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              Hết phép năm
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {isListLoading ? "—" : summaryData?.exhausted ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">nhân sự</span>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">Đã sử dụng hết hạn mức năm</p>
        </div>
      </div>

      {/* Main Integrated Table Card */}
      <div className="integrated-table-card">
        {/* Toolbar & Filters */}
        <div className="table-card-toolbar">
          <div className="flex items-center justify-between gap-3 w-full">
            <div className="text-xs font-semibold text-foreground">
              Danh sách nhân sự ({totalEmployees})
            </div>

            {/* Right: Search Box */}
            <SearchInput
              value={searchTerm}
              onChange={(val) => {
                setSearchTerm(val);
                setCurrentPage(1);
              }}
              placeholder="Tìm mã NV, tên, phòng ban..."
              containerClassName="min-w-[260px] max-w-[340px]"
            />
          </div>
        </div>

        {/* Data Table Content */}
        {isListLoading ? (
          <LoadingBlock rows={6} />
        ) : isListError ? (
          <ErrorState
            message="Không thể tải danh sách dữ liệu phép năm."
            retry={() => refetchList()}
          />
        ) : employeeItems.length === 0 ? (
          <EmptyState
            title="Không có dữ liệu phép năm"
            description={
              searchTerm
                ? "Không tìm thấy nhân sự nào phù hợp với từ khóa tìm kiếm."
                : "Không có hồ sơ phép năm trong bộ lọc này."
            }
          />
        ) : (
          <div className="data-table-wrap">
            <div className="data-table-scroll">
              <table className="data-table min-w-[1080px]">
                <thead>
                  <tr>
                    <th style={{ width: "45px" }} className="text-center">STT</th>
                    <th style={{ minWidth: "190px" }}>NGƯỜI LAO ĐỘNG</th>
                    <th style={{ width: "125px" }}>LOẠI HỢP ĐỒNG</th>
                    <th style={{ width: "115px" }}>NGÀY VÀO LÀM</th>
                    <th style={{ width: "125px" }}>THỜI ĐIỂM HƯỞNG</th>
                    <th className="text-center" style={{ width: "120px" }}>TIÊU CHUẨN NĂM</th>
                    <th className="text-center" style={{ width: "110px" }}>TỒN NĂM TRƯỚC</th>
                    <th className="text-center" style={{ width: "110px" }}>ĐÃ SỬ DỤNG</th>
                    <th className="text-center" style={{ width: "130px" }}>PHÉP KHẢ DỤNG</th>
                    <th style={{ width: "70px" }} className="text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeItems.map((item, idx) => {
                    const rawStt = (currentPage - 1) * pageSize + idx + 1;
                    const stt = String(rawStt).padStart(2, "0");
                    const isTerminated = Boolean(item.terminationDate);
                    const avail = item.availableDays ?? 0;
                    const isOfficial = item.employmentType === "OFFICIAL_CONTRACT" && !isTerminated;

                    return (
                      <tr key={item.employee.employeeCode}>
                        <td className="text-center text-muted font-medium">{stt}</td>
                        <td>
                          <div className="employee-cell-info">
                            <div className="flex items-center gap-1.5">
                              <span className="employee-cell-name font-semibold text-foreground">
                                {item.employee.fullName}
                              </span>
                            </div>
                            <span className="employee-cell-sub">
                              <span className="employee-code-badge">{item.employee.employeeCode}</span>
                              {item.employee.department && (
                                <span className="text-muted text-[11px]">· {item.employee.department}</span>
                              )}
                              {item.employee.project?.projectCode && (
                                <span className="text-muted text-[11px] font-medium">
                                  · [{item.employee.project.projectCode}]
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td>{renderEmploymentType(item.employmentType, isTerminated)}</td>
                        <td className="text-[13px] text-foreground">
                          {item.joinDate ? formatDate(item.joinDate) : "—"}
                        </td>
                        <td>
                          {isTerminated ? (
                            <span className="text-[12px] text-rose-600 dark:text-rose-400 font-medium">
                              Thôi việc: {formatDate(item.terminationDate!)}
                            </span>
                          ) : item.entitlementStartDate ? (
                            <span className="text-[13px] text-foreground font-medium">
                              {formatDate(item.entitlementStartDate)}
                            </span>
                          ) : item.employmentType === "PROBATION" ? (
                            <span className="text-[12px] text-muted font-medium">Chờ ký HĐLĐ</span>
                          ) : (
                            <span className="text-[12px] text-muted">Không áp dụng</span>
                          )}
                        </td>
                        <td className="text-center">
                          {isOfficial && item.annualEntitlementDays !== null ? (
                            <span className="font-semibold text-[13px]">
                              {item.annualEntitlementDays} ngày
                            </span>
                          ) : isTerminated && item.annualEntitlementDays !== null ? (
                            <span className="text-[13px] text-muted">
                              {item.annualEntitlementDays} ngày
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="text-center">
                          {isOfficial && typeof item.carryOverDays === "number" ? (
                            <span className="text-[13px] text-muted font-medium">
                              {formatDays(item.carryOverDays)} ngày
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="text-center">
                          {typeof item.usedDays === "number" ? (
                            <strong className="text-amber-600 dark:text-amber-400 font-semibold text-[13px]">
                              {formatDays(item.usedDays)} ngày
                            </strong>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="text-center">
                          {isOfficial ? (
                            avail > 0 ? (
                              <strong className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                {formatDays(avail)} ngày
                              </strong>
                            ) : (
                              <strong className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                0.0 ngày
                              </strong>
                            )
                          ) : isTerminated ? (
                            <span className="text-xs font-medium text-muted">
                              {avail > 0 ? `${formatDays(avail)} ngày tồn` : "0.0 ngày"}
                            </span>
                          ) : (
                            <span className="text-xs text-muted font-medium">Chưa có phép</span>
                          )}
                        </td>
                        <td className="text-center">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedEmployee(item);
                              setHistoryYear(selectedYear !== "all" ? selectedYear : "2026");
                              setHistoryPage(1);
                              setHistoryModalOpen(true);
                            }}
                            className="h-7 text-xs px-2 gap-1 font-medium"
                            title="Xem lịch sử & chi tiết phép năm"
                          >
                            <History className="w-3.5 h-3.5 text-primary" /> Chi tiết
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <TablePaginationFooter
              totalItems={totalEmployees}
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

      {/* Modal: Xem Lịch sử sử dụng ngày phép theo năm */}
      <Modal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        title={`Chi tiết & Lịch sử phép năm: ${selectedEmployee?.employee.fullName ?? ""}`}
        description={`Mã NV: ${selectedEmployee?.employee.employeeCode} · Phòng ban: ${
          selectedEmployee?.employee.department ?? "Khối Sản xuất"
        } · Dự án: ${selectedEmployee?.employee.project?.projectName ?? "JSS"}`}
        size="lg"
        footer={<Button onClick={() => setHistoryModalOpen(false)}>Đóng</Button>}
      >
        <div className="space-y-4">
          {/* Employee Metrics Highlight */}
          {selectedEmployee && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-3 rounded-xl border border-border/60">
              <div className="text-center p-2 rounded-lg bg-card border border-border/40">
                <span className="text-[11px] font-medium text-muted-foreground uppercase block">
                  Tiêu chuẩn năm
                </span>
                <span className="text-lg font-bold text-foreground">
                  {selectedEmployee.annualEntitlementDays !== null
                    ? `${selectedEmployee.annualEntitlementDays} ngày`
                    : "—"}
                </span>
              </div>
              <div className="text-center p-2 rounded-lg bg-card border border-border/40">
                <span className="text-[11px] font-medium text-muted-foreground uppercase block">
                  Tồn năm trước
                </span>
                <span className="text-lg font-bold text-foreground">
                  {selectedEmployee.carryOverDays !== null
                    ? `${formatDays(selectedEmployee.carryOverDays)} ngày`
                    : "—"}
                </span>
              </div>
              <div className="text-center p-2 rounded-lg bg-card border border-border/40">
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase block">
                  Đã sử dụng
                </span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {selectedEmployee.usedDays !== null
                    ? `${formatDays(selectedEmployee.usedDays)} ngày`
                    : "—"}
                </span>
              </div>
              <div className="text-center p-2 rounded-lg bg-card border border-border/40">
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase block">
                  Còn lại khả dụng
                </span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedEmployee.availableDays !== null
                    ? `${formatDays(selectedEmployee.availableDays)} ngày`
                    : "—"}
                </span>
              </div>
            </div>
          )}

          {/* Filter Year Bar */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Lịch sử các đợt nghỉ phép
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Năm:</span>
              <select
                value={historyYear}
                onChange={(e) => {
                  setHistoryYear(e.target.value);
                  setHistoryPage(1);
                }}
                className="select-input text-xs py-1 px-2.5 h-8 rounded-md border border-input bg-background"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="all">Tất cả các năm</option>
              </select>
            </div>
          </div>

          {/* History List Table */}
          {isHistoryLoading ? (
            <LoadingBlock rows={3} />
          ) : historyResponse?.items && historyResponse.items.length > 0 ? (
            <div className="data-table-wrap border rounded-lg overflow-hidden">
              <div className="data-table-scroll">
                <table className="data-table compact-table min-w-[680px]">
                  <thead>
                    <tr>
                      <th style={{ width: "40px" }} className="text-center">STT</th>
                      <th style={{ minWidth: "170px" }}>KHOẢNG THỜI GIAN</th>
                      <th style={{ width: "85px" }} className="text-center">SỐ NGÀY</th>
                      <th style={{ minWidth: "140px" }}>LOẠI NGHỈ</th>
                      <th style={{ minWidth: "180px" }}>LÝ DO NGHỈ</th>
                      <th style={{ minWidth: "150px" }}>NGƯỜI PHÊ DUYỆT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyResponse.items.map((h, i) => (
                      <tr key={h.id}>
                        <td className="text-center font-medium text-muted">
                          {String((historyPage - 1) * historyPageSize + i + 1).padStart(2, "0")}
                        </td>
                        <td>
                          <div className="text-xs font-semibold text-foreground">
                            {formatDate(h.fromDate)} ➔ {formatDate(h.toDate)}
                          </div>
                        </td>
                        <td className="text-center">
                          <Badge tone="info">{h.days} ngày</Badge>
                        </td>
                        <td className="text-xs font-medium text-foreground">{h.leaveType}</td>
                        <td className="text-xs text-muted-foreground">{h.reason}</td>
                        <td>
                          <span className="text-xs text-foreground font-medium block">
                            {h.approvedBy?.fullName || "Quản lý"}
                          </span>
                          <div className="text-[11px] text-muted-foreground">
                            {h.approvedBy?.roleName || "Phê duyệt"} · {formatDate(h.approvedAt)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Chưa có lịch sử nghỉ phép"
              description={`Nhân viên chưa phát sinh đợt nghỉ phép nào trong năm ${
                selectedYear === "all" ? "này" : selectedYear
              }.`}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
