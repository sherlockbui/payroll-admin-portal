"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Upload,
  UploadCloud,
  UserCheck,
  UserX,
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
  SearchInput,
  SearchableSelect,
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
  const queryClient = useQueryClient();

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

  // Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      await api.downloadLeaveImportTemplateV3();
      notify("Đã tải xuống biểu mẫu import phép năm (.xlsx)");
    } catch (err: any) {
      notify(err?.message || "Không thể tải file mẫu. Vui lòng thử lại sau.", "error");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      return api.importLeaveExcelV3(file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves-list-v3"] });
      setImportModalOpen(false);
      setImportFile(null);
      notify("Nhập dữ liệu phép năm từ Excel thành công!");
    },
    onError: (err: any) => {
      notify(err?.message || "Lỗi khi import file Excel phép năm", "error");
    },
  });

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
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setImportModalOpen(true)}
            className="gap-1.5 font-medium shrink-0"
          >
            <UploadCloud className="w-3.5 h-3.5 text-primary" /> Import Excel
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
        description={`Mã NV: ${selectedEmployee?.employee.employeeCode} · Phòng ban: ${selectedEmployee?.employee.department ?? "Khối Sản xuất"
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
              <SearchableSelect
                options={[
                  { value: "2026", label: "Năm 2026" },
                  { value: "2025", label: "Năm 2025" },
                  { value: "2024", label: "Năm 2024" },
                  { value: "all", label: "Tất cả các năm" },
                ]}
                value={historyYear}
                onChange={(val) => {
                  setHistoryYear(val);
                  setHistoryPage(1);
                }}
                allowClear={false}
                placeholder="Chọn năm"
                className="w-36"
              />
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
              description={`Nhân viên chưa phát sinh đợt nghỉ phép nào trong năm ${selectedYear === "all" ? "này" : selectedYear
                }.`}
            />
          )}
        </div>
      </Modal>

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
        title="Import danh sách Phép năm từ Excel"
        description="Tải lên tệp danh sách số dư ngày phép năm theo biểu mẫu chuẩn để cập nhật hàng loạt vào hệ thống."
        size="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Step 1: Download Template */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-100">1. Tải biểu mẫu Excel chuẩn</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Sử dụng tệp mẫu để đảm bảo đúng định dạng các cột dữ liệu ngày phép năm.
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
                accept=".xlsx,.xls"
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
    </div>
  );
}
