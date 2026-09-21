"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  Download,
  FileSpreadsheet,
  History,
  Info,
  Pencil,
  RotateCcw,
  Search,
  Upload,
  UploadCloud,
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
import { formatDate } from "@/lib/utils";
import type {
  Employee,
  StandardWorkdayEmployeeV3,
  StandardWorkdayMode,
  UpdateStandardWorkdayRequestV3,
} from "@/lib/types";

export function StandardWorkdaysSubtab({
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
  const [selectedMode, setSelectedMode] = useState<StandardWorkdayMode>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Edit / Override Modal
  const [editEmployee, setEditEmployee] = useState<StandardWorkdayEmployeeV3 | null>(null);
  const [overrideDays, setOverrideDays] = useState<number>(24);
  const [overrideReason, setOverrideReason] = useState("");

  // History Modal
  const [historyEmployee, setHistoryEmployee] = useState<StandardWorkdayEmployeeV3 | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Import Modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreviewRows, setImportPreviewRows] = useState<any[]>([]);

  // Fetch summary
  const summaryQuery = useQuery({
    queryKey: ["standard-workdays-summary", projectId],
    queryFn: () => api.getStandardWorkdaysSummaryV3(projectId),
  });

  // Fetch project default
  const defaultQuery = useQuery({
    queryKey: ["standard-workdays-project-default", projectId],
    queryFn: () => api.getStandardWorkdayProjectDefaultV3(projectId),
  });

  // Fetch employee list
  const listQuery = useQuery({
    queryKey: ["standard-workdays-employees", projectId, selectedMode, searchTerm, currentPage, pageSize],
    queryFn: () =>
      api.getStandardWorkdaysEmployeesV3({
        projectId: projectId === "all" ? undefined : projectId,
        mode: selectedMode,
        search: searchTerm || undefined,
        page: currentPage,
        pageSize,
      }),
  });

  // Export mutation
  const handleExport = async () => {
    try {
      const data = await api.exportStandardWorkdaysExcelV3({
        projectId: projectId === "all" ? undefined : projectId,
        mode: selectedMode,
        search: searchTerm,
      });
      notify(`Đã xuất ${data.totalRecords} bản ghi ra file ${data.fileName}`);
    } catch (err: any) {
      notify(err?.message || "Lỗi khi xuất file Excel", "error");
    }
  };

  // Register Header Action: Export & Import
  const ensureSpecificProject = (actionName: string = "thao tác này") => {
    if (!projectId || projectId === "all") {
      notify(`Vui lòng chọn một dự án cụ thể ở thanh công cụ phía trên trước khi ${actionName}!`, "warning");
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!setHeaderAction) return;
    setHeaderAction(
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={handleExport}
          className="gap-1.5 font-semibold text-xs h-8 px-3"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Xuất Excel
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            if (!ensureSpecificProject("import ngày công chuẩn")) return;
            setImportModalOpen(true);
          }}
          className="gap-1.5 font-semibold text-xs h-8 px-3"
        >
          <UploadCloud className="w-3.5 h-3.5" /> Import ngày công chuẩn
        </Button>
      </div>
    );
    return () => setHeaderAction(null);
  }, [setHeaderAction, projectId, selectedMode, searchTerm]);

  // Update workday mutation
  const updateMutation = useMutation({
    mutationFn: (payload: { employeeCode: string; data: UpdateStandardWorkdayRequestV3 }) =>
      api.updateStandardWorkdayV3(payload.employeeCode, payload.data),
    onSuccess: (res) => {
      notify(`Đã cập nhật ${res.appliedStandardDays} ngày công cho nhân viên ${res.employee.fullName}`);
      queryClient.invalidateQueries({ queryKey: ["standard-workdays-employees"] });
      queryClient.invalidateQueries({ queryKey: ["standard-workdays-summary"] });
      setEditEmployee(null);
    },
    onError: (err: any) => {
      notify(err?.message || "Lỗi cập nhật ngày công chuẩn", "error");
    },
  });

  // Restore project default mutation
  const restoreMutation = useMutation({
    mutationFn: (employeeCode: string) => api.restoreStandardWorkdayDefaultV3(employeeCode),
    onSuccess: (res) => {
      notify(`Đã khôi phục về ${res.appliedStandardDays} ngày công mặc định dự án cho ${res.employee.fullName}`);
      queryClient.invalidateQueries({ queryKey: ["standard-workdays-employees"] });
      queryClient.invalidateQueries({ queryKey: ["standard-workdays-summary"] });
    },
    onError: (err: any) => {
      notify(err?.message || "Lỗi khôi phục mặc định", "error");
    },
  });

  const handleOpenEdit = (item: StandardWorkdayEmployeeV3) => {
    setEditEmployee(item);
    setOverrideDays(item.appliedStandardDays);
    setOverrideReason(item.adjustmentReason || "");
  };

  const handleSaveEdit = () => {
    if (!editEmployee) return;
    if (overrideDays <= 0 || overrideDays > 31) {
      notify("Số ngày công chuẩn phải từ 1 đến 31 ngày", "error");
      return;
    }
    if (!overrideReason.trim()) {
      notify("Vui lòng nhập lý do tùy chỉnh ngày công chuẩn", "error");
      return;
    }
    updateMutation.mutate({
      employeeCode: editEmployee.employee.employeeCode,
      data: { standardDays: overrideDays, reason: overrideReason },
    });
  };

  const handleViewHistory = async (item: StandardWorkdayEmployeeV3) => {
    setHistoryEmployee(item);
    setLoadingHistory(true);
    try {
      const res = await api.getStandardWorkdayHistoryV3(item.employee.employeeCode);
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
    { key: "standardDays", label: "Ngày công chuẩn", align: "center", width: "120px", render: (r) => <span className="font-bold text-primary">{r.standardDays} ngày</span> },
    { key: "reason", label: "Lý do tùy chỉnh" },
  ];

  const handleSimulateUpload = () => {
    const mockRows = [
      { employeeCode: "NV-00124", fullName: "Nguyễn Văn An", standardDays: 24, reason: "Tùy chỉnh phân ca khối văn phòng" },
      { employeeCode: "NV-00125", fullName: "Trần Thị Mai", standardDays: 26, reason: "Chuẩn sản xuất ca ngày" },
      { employeeCode: "NV-00127", fullName: "Phạm Quốc Bảo", standardDays: 22, reason: "Hợp đồng thử việc chuyên gia" },
    ];
    setImportPreviewRows(mockRows);
    notify("Đã tải dữ liệu mẫu import thành công (3 dòng).");
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const dummyFile = new File(["dummy"], "import_cong_chuan.xlsx");
      return api.importStandardWorkdaysExcelV3(dummyFile, projectId);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["standard-workdays-employees"] });
      queryClient.invalidateQueries({ queryKey: ["standard-workdays-summary"] });
      notify(`Import thành công! Đã xử lý ${res?.totalRows || 3} dòng dữ liệu.`);
      setImportModalOpen(false);
      setImportPreviewRows([]);
    },
    onError: (err: any) => {
      notify(err?.message || "Lỗi khi import file", "error");
    },
  });

  const summary = summaryQuery.data;
  const projectDefaultDays = defaultQuery.data?.defaultStandardDays || summary?.projectStandardDays || 26;
  const listData = listQuery.data;
  const items = listData?.items || [];
  const totalRecords = listData?.total || 0;

  return (
    <div className="space-y-5">
      {/* 4 KPI Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Tổng số nhân sự</div>
            <div className="text-xl font-bold text-foreground mt-0.5">{summary?.total ?? "..."}</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Mặc định dự án</div>
            <div className="text-xl font-bold text-emerald-600 mt-0.5">{summary?.projectDefaultCount ?? "..."}</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Pencil className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Tùy chỉnh riêng</div>
            <div className="text-xl font-bold text-amber-600 mt-0.5">{summary?.customCount ?? "..."}</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Chuẩn dự án</div>
            <div className="text-xl font-bold text-blue-600 mt-0.5">{projectDefaultDays} ngày/tháng</div>
          </div>
        </div>
      </div>

      {/* Info Notice Banner */}
      <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl p-3.5 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
          <p className="font-semibold">Quy định công chuẩn:</p>
          <p>
            Mặc định tất cả nhân sự thuộc dự án được áp dụng mức công chuẩn <strong>{projectDefaultDays} ngày/tháng</strong>.
            Các nhân sự được thiết lập tùy chỉnh riêng sẽ tính lương theo ngày công đã chỉ định.
          </p>
        </div>
      </div>

      {/* Main Table */}
      <div className="integrated-table-card">
        {/* Toolbar */}
        <div className="table-card-toolbar">
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            {/* Left: Mode Filter Pills */}
            <div className="filter-status-pills flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => { setSelectedMode("ALL"); setCurrentPage(1); }}
                className={`pill-btn ${selectedMode === "ALL" ? "active" : ""}`}
              >
                Tất cả ({summary?.total ?? 0})
              </button>
              <button
                type="button"
                onClick={() => { setSelectedMode("PROJECT_DEFAULT"); setCurrentPage(1); }}
                className={`pill-btn success ${selectedMode === "PROJECT_DEFAULT" ? "active" : ""}`}
              >
                Mặc định ({summary?.projectDefaultCount ?? 0})
              </button>
              <button
                type="button"
                onClick={() => { setSelectedMode("CUSTOM"); setCurrentPage(1); }}
                className={`pill-btn warning ${selectedMode === "CUSTOM" ? "active" : ""}`}
              >
                Tùy chỉnh ({summary?.customCount ?? 0})
              </button>
            </div>

            {/* Right: Search */}
            <div className="relative min-w-[240px] max-w-[320px] ml-auto">
              <Search className="search-icon-fixed text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm theo tên, mã NV, phòng ban..."
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

        {listQuery.isLoading ? (
          <div className="p-8">
            <LoadingBlock />
          </div>
        ) : listQuery.isError ? (
          <div className="p-8">
            <ErrorState message="Không thể tải danh sách ngày công chuẩn" retry={() => listQuery.refetch()} />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="Không tìm thấy dữ liệu"
              description="Không có nhân sự nào phù hợp với điều kiện tìm kiếm hoặc bộ lọc hiện tại."
            />
          </div>
        ) : (
          <div className="data-table-wrap">
            <div className="data-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "50px" }} className="text-center">STT</th>
                    <th style={{ minWidth: "190px" }}>NHÂN VIÊN</th>
                    <th style={{ minWidth: "160px" }}>PHÒNG BAN / CHỨC VỤ</th>
                    <th style={{ width: "130px" }} className="text-center">CHUẨN DỰ ÁN</th>
                    <th style={{ width: "130px" }} className="text-center">CÔNG ÁP DỤNG</th>
                    <th style={{ width: "140px" }} className="text-center">CHẾ ĐỘ</th>
                    <th style={{ minWidth: "200px" }}>LÝ DO / CẬP NHẬT</th>
                    <th style={{ width: "80px" }} className="text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const rawStt = (currentPage - 1) * pageSize + idx + 1;
                    const stt = String(rawStt).padStart(2, "0");
                    const isCustom = item.mode === "CUSTOM";

                    return (
                      <tr key={item.employee.employeeCode}>
                        <td className="text-center text-muted font-medium font-mono">{stt}</td>
                        <td>
                          <div className="employee-cell-info">
                            <span className="employee-cell-name font-semibold text-foreground">
                              {item.employee.fullName}
                            </span>
                            <span className="employee-cell-sub">
                              <span className="employee-code-badge">{item.employee.employeeCode}</span>
                              {item.employee.department && (
                                <span className="text-muted text-[11px]">· {item.employee.department}</span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="text-foreground">{item.employee.department || "—"}</div>
                          <div className="text-[11px] text-muted mt-0.5">{item.employee.position || "—"}</div>
                        </td>
                        <td className="text-center font-medium text-muted">
                          {item.projectStandardDays} ngày
                        </td>
                        <td className="text-center">
                          <span
                            className={`font-bold text-sm px-2.5 py-1 rounded-md ${
                              isCustom
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {item.appliedStandardDays} ngày
                          </span>
                        </td>
                        <td className="text-center">
                          {isCustom ? (
                            <Badge tone="warning">Tùy chỉnh riêng</Badge>
                          ) : (
                            <Badge tone="success">Mặc định dự án</Badge>
                          )}
                        </td>
                        <td>
                          {isCustom ? (
                            <div>
                              <div className="text-foreground font-medium">{item.adjustmentReason || "—"}</div>
                              {item.updatedBy && (
                                <div className="text-[11px] text-muted mt-0.5">
                                  Bởi {item.updatedBy.fullName} {item.updatedAt && `(${formatDate(item.updatedAt)})`}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted italic">Áp dụng theo quy chế dự án</span>
                          )}
                        </td>
                        <td className="text-center">
                          <TableRowActions
                            items={[
                              {
                                key: "edit",
                                label: "Tùy chỉnh ngày công",
                                icon: <Pencil className="w-3.5 h-3.5" />,
                                onClick: () => handleOpenEdit(item),
                              },
                              {
                                key: "history",
                                label: "Xem lịch sử thay đổi",
                                icon: <History className="w-3.5 h-3.5" />,
                                onClick: () => handleViewHistory(item),
                              },
                              ...(isCustom
                                ? [
                                    {
                                      key: "restore",
                                      label: "Khôi phục mặc định dự án",
                                      icon: <RotateCcw className="w-3.5 h-3.5" />,
                                      onClick: () => restoreMutation.mutate(item.employee.employeeCode),
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination Footer */}
            {totalRecords > 0 && (
              <TablePaginationFooter
                totalItems={totalRecords}
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
        module="workdays"
        title="Nhật ký biến động Ngày công chuẩn"
        description="Lịch sử điều chỉnh ngày công chuẩn và khôi phục mặc định của các nhân sự trong dự án"
      />

      {/* Edit Modal */}
      {editEmployee && (
        <Modal
          open={Boolean(editEmployee)}
          onOpenChange={(open) => !open && setEditEmployee(null)}
          title={`Tùy chỉnh ngày công chuẩn - ${editEmployee.employee.fullName}`}
          description={`Mã NV: ${editEmployee.employee.employeeCode} | Chuẩn dự án: ${editEmployee.projectStandardDays} ngày`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditEmployee(null)}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Đang lưu..." : "Lưu tùy chỉnh"}
              </Button>
            </>
          }
        >
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Số ngày công chuẩn áp dụng <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={overrideDays}
                onChange={(e) => setOverrideDays(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Chuẩn mặc định dự án là {editEmployee.projectStandardDays} ngày. Hãy nhập số ngày áp dụng thực tế cho nhân sự này.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Lý do điều chỉnh tùy chỉnh <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Nhập lý do điều chỉnh ngày công chuẩn..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground resize-none"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* History Modal */}
      {historyEmployee && (
        <Modal
          open={Boolean(historyEmployee)}
          onOpenChange={(open) => !open && setHistoryEmployee(null)}
          title={`Lịch sử điều chỉnh ngày công - ${historyEmployee.employee.fullName}`}
          description={`Mã NV: ${historyEmployee.employee.employeeCode}`}
          footer={
            <Button variant="secondary" onClick={() => setHistoryEmployee(null)}>
              Đóng
            </Button>
          }
        >
          <div className="py-2 space-y-3">
            {loadingHistory ? (
              <LoadingBlock />
            ) : historyList.length === 0 ? (
              <EmptyState title="Chưa có lịch sử" description="Nhân sự này chưa có ghi nhận điều chỉnh nào." />
            ) : (
              <div className="data-table-wrap border rounded-lg overflow-hidden">
                <div className="data-table-scroll">
                  <table className="data-table compact-table min-w-[550px]">
                    <thead>
                      <tr>
                        <th style={{ width: "130px" }}>THỜI GIAN</th>
                        <th style={{ width: "140px" }} className="text-center">CÔNG ÁP DỤNG</th>
                        <th style={{ width: "120px" }} className="text-center">CHẾ ĐỘ</th>
                        <th>LÝ DO ĐIỀU CHỈNH</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyList.map((h, i) => (
                        <tr key={i}>
                          <td className="text-muted">{formatDate(h.updatedAt)}</td>
                          <td className="text-center font-bold text-foreground">{h.appliedStandardDays} ngày</td>
                          <td className="text-center">
                            {h.mode === "CUSTOM" ? <Badge tone="warning">Tùy chỉnh</Badge> : <Badge tone="success">Mặc định</Badge>}
                          </td>
                          <td className="text-foreground">{h.reason || "—"}</td>
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
        title="Import Danh sách ngày công chuẩn từ Excel"
        description="Tải lên danh sách nhân viên cần tùy chỉnh hoặc đồng bộ ngày công chuẩn."
        sampleTemplateName="Mau_Import_Ngay_Cong_Chuan.xlsx"
        sampleTemplateDescription="Mẫu Excel chuẩn bao gồm: Mã NV, Họ và tên, Ngày công chuẩn, Lý do tùy chỉnh."
        columns={excelColumns}
        previewRows={importPreviewRows}
        stats={[
          { label: "Số dòng hợp lệ", value: importPreviewRows.length, tone: "primary" },
        ]}
        onDownloadSample={() => api.downloadStandardWorkdaysImportTemplateV3()}
        onSimulateUpload={handleSimulateUpload}
        onConfirmImport={() => importMutation.mutate()}
        confirmLoading={importMutation.isPending}
        confirmLabel={`Nhập ${importPreviewRows.length || ""} bản ghi vào hệ thống`}
        onClearPreview={() => setImportPreviewRows([])}
      />
    </div>
  );
}
