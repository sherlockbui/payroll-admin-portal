"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Coins,
  Check,
  Download,
  FileSpreadsheet,
  History,
  Info,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Upload,
  UploadCloud,
  Users,
  Wallet,
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
  BenefitsAllowanceEmployeeV3,
  BenefitsAllowanceMode,
  Employee,
  EmployeeAllowanceItemV3,
  UpdateBenefitsAllowanceRequestV3,
} from "@/lib/types";

export function EmployeePoliciesSubtab({
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
  const [selectedMode, setSelectedMode] = useState<BenefitsAllowanceMode>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Edit Modal State
  const [editEmployee, setEditEmployee] = useState<BenefitsAllowanceEmployeeV3 | null>(null);
  const [editAllowances, setEditAllowances] = useState<Array<{ policyId: string; policyCode: string; policyName: string; amount: number; isEnabled: boolean }>>([]);
  const [editReason, setEditReason] = useState("");

  // History Modal State
  const [historyEmployee, setHistoryEmployee] = useState<BenefitsAllowanceEmployeeV3 | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreviewRows, setImportPreviewRows] = useState<any[]>([]);

  // Master Allowance Types Query
  const masterTypesQuery = useQuery({
    queryKey: ["master-allowance-types"],
    queryFn: () => api.getMasterAllowanceTypesV3(),
  });

  // Summary Query
  const summaryQuery = useQuery({
    queryKey: ["benefits-allowances-summary", projectId],
    queryFn: () => api.getBenefitsAllowanceSummaryV3(projectId),
  });

  // Employees List Query
  const listQuery = useQuery({
    queryKey: ["benefits-allowances-employees", projectId, selectedMode, searchTerm, currentPage, pageSize],
    queryFn: () =>
      api.getBenefitsAllowanceEmployeesV3({
        projectId: projectId === "all" ? undefined : projectId,
        mode: selectedMode,
        search: searchTerm || undefined,
        page: currentPage,
        pageSize,
      }),
  });

  // Export Mutation
  const handleExport = async () => {
    try {
      const data = await api.exportBenefitsAllowancesExcelV3({
        projectId: projectId === "all" ? undefined : projectId,
        mode: selectedMode,
        search: searchTerm,
      });
      notify(`Đã xuất ${data.totalRecords} bản ghi phụ cấp ra file ${data.fileName}`);
    } catch (err: any) {
      notify(err?.message || "Lỗi khi xuất file Excel", "error");
    }
  };

  // Register Header Actions
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
          onClick={() => setImportModalOpen(true)}
          className="gap-1.5 font-semibold text-xs h-8 px-3"
        >
          <UploadCloud className="w-3.5 h-3.5" /> Import phụ cấp
        </Button>
      </div>
    );
    return () => setHeaderAction(null);
  }, [setHeaderAction, projectId, selectedMode, searchTerm]);

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: UpdateBenefitsAllowanceRequestV3 }) =>
      api.updateBenefitsAllowanceV3(code, payload),
    onSuccess: (res) => {
      notify(`Đã cập nhật phụ cấp cho nhân viên ${res.employee.fullName}`);
      queryClient.invalidateQueries({ queryKey: ["benefits-allowances-employees"] });
      queryClient.invalidateQueries({ queryKey: ["benefits-allowances-summary"] });
      setEditEmployee(null);
    },
    onError: (err: any) => {
      notify(err?.message || "Lỗi cập nhật phụ cấp", "error");
    },
  });

  // Restore Default Mutation
  const restoreMutation = useMutation({
    mutationFn: (code: string) => api.restoreBenefitsAllowanceDefaultV3(code),
    onSuccess: (res) => {
      notify(`Đã khôi phục phụ cấp dự án cho nhân viên ${res.employee.fullName}`);
      queryClient.invalidateQueries({ queryKey: ["benefits-allowances-employees"] });
      queryClient.invalidateQueries({ queryKey: ["benefits-allowances-summary"] });
    },
    onError: (err: any) => {
      notify(err?.message || "Lỗi khôi phục phụ cấp", "error");
    },
  });

  const masterTypes = masterTypesQuery.data || [];

  const handleOpenEdit = (emp: BenefitsAllowanceEmployeeV3) => {
    setEditEmployee(emp);
    setEditReason("");
    const mapped = masterTypes.map((mt) => {
      const existing = emp.allowances.find((a) => a.policyCode === mt.code);
      return {
        policyId: String(existing?.policyId || `pol-${mt.code.toLowerCase()}`),
        policyCode: mt.code,
        policyName: mt.name,
        amount: existing ? existing.amount : mt.defaultAmount,
        isEnabled: Boolean(existing && existing.amount > 0),
      };
    });
    setEditAllowances(mapped);
  };

  const handleSaveEdit = () => {
    if (!editEmployee) return;
    const active = editAllowances
      .filter((a) => a.isEnabled)
      .map((a) => ({
        policyId: a.policyId,
        amount: a.amount,
        isCustomized: true,
      }));

    updateMutation.mutate({
      code: editEmployee.employee.employeeCode,
      payload: {
        allowances: active,
        reason: editReason.trim() || "Điều chỉnh phụ cấp cá nhân",
      },
    });
  };

  const handleViewHistory = async (emp: BenefitsAllowanceEmployeeV3) => {
    setHistoryEmployee(emp);
    setLoadingHistory(true);
    try {
      const res = await api.getBenefitsAllowanceHistoryV3(emp.employee.employeeCode);
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
    { key: "policyCode", label: "Mã phụ cấp", width: "100px" },
    { key: "amount", label: "Mức phụ cấp", align: "right", render: (r) => <span className="font-bold text-primary">{formatCurrency(r.amount)}</span> },
    { key: "reason", label: "Lý do / Căn cứ" },
  ];

  const handleSimulateUpload = () => {
    const mockRows = [
      { employeeCode: "NV-00124", fullName: "Nguyễn Văn An", policyCode: "RESP", amount: 2000000, reason: "Phụ cấp trách nhiệm tổ trưởng" },
      { employeeCode: "NV-00125", fullName: "Trần Thị Mai", policyCode: "HOUSING", amount: 1500000, reason: "Hỗ trợ nhà ở chuyên gia xa nhà" },
      { employeeCode: "NV-00127", fullName: "Phạm Quốc Bảo", policyCode: "PHONE", amount: 500000, reason: "Phụ cấp liên lạc điều phối kho" },
    ];
    setImportPreviewRows(mockRows);
    notify("Đã tải dữ liệu mẫu import thành công (3 dòng).");
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const dummyFile = new File(["dummy"], "import_phu_cap.xlsx");
      return api.importBenefitsAllowancesExcelV3(dummyFile, projectId);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["benefits-allowances-employees"] });
      queryClient.invalidateQueries({ queryKey: ["benefits-allowances-summary"] });
      notify(`Import thành công! Đã xử lý ${res?.totalRows || 3} dòng dữ liệu.`);
      setImportModalOpen(false);
      setImportPreviewRows([]);
    },
    onError: (err: any) => {
      notify(err?.message || "Lỗi khi import file", "error");
    },
  });

  const summary = summaryQuery.data;
  const listData = listQuery.data;
  const items = listData?.items || [];
  const totalRecords = listData?.total || 0;
  const totalCalculated = editAllowances
    .filter((a) => a.isEnabled)
    .reduce((s, a) => s + (Number(a.amount) || 0), 0);

  return (
    <div className="space-y-5">
      {/* 4 KPI Summary Cards */}
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
            <div className="text-xs text-muted-foreground font-medium">Theo chuẩn dự án</div>
            <div className="text-xl font-bold text-emerald-600 mt-0.5">{summary?.projectDefaultCount ?? "..."}</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Tùy chỉnh cá nhân</div>
            <div className="text-xl font-bold text-amber-600 mt-0.5">{summary?.customCount ?? "..."}</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Tổng quỹ phụ cấp/tháng</div>
            <div className="text-xl font-bold text-indigo-600 mt-0.5">
              {formatCurrency(summary?.totalMonthlyAllowanceAmount ?? 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Info Notice Banner */}
      <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl p-3.5 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
          <p className="font-semibold">Nguyên tắc phụ cấp &amp; trợ cấp:</p>
          <p>
            Các khoản phụ cấp theo quy chế dự án được tự động áp dụng khi tính bảng lương hàng tháng.
            Quản trị viên có thể tùy chỉnh hoặc bổ sung các phụ cấp đặc thù (trách nhiệm, nhà ở, chuyên cần) cho từng cá nhân.
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
            <ErrorState message="Không thể tải danh sách phụ cấp nhân viên" retry={() => listQuery.refetch()} />
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
              <table className="data-table min-w-[1050px]">
                <thead>
                  <tr>
                    <th style={{ width: "45px" }} className="text-center">STT</th>
                    <th style={{ minWidth: "200px" }}>NHÂN VIÊN</th>
                    <th style={{ width: "140px" }} className="text-right">LƯƠNG CƠ BẢN</th>
                    <th style={{ minWidth: "240px" }}>CÁC KHOẢN PHỤ CẤP</th>
                    <th style={{ width: "130px" }} className="text-center">CHẾ ĐỘ</th>
                    <th style={{ width: "140px" }} className="text-right">TỔNG PHỤ CẤP</th>
                    <th style={{ width: "80px" }} className="text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const rawStt = (currentPage - 1) * pageSize + idx + 1;
                    const stt = String(rawStt).padStart(2, "0");
                    const isCustom = item.mode === "CUSTOM";

                    return (
                      <tr key={item.employee.employeeCode} className="hover:bg-secondary/40 transition-colors">
                        <td className="text-center text-muted font-medium">{stt}</td>
                        <td>
                          <div className="employee-cell-info">
                            <span className="employee-cell-name font-semibold text-foreground">{item.employee.fullName}</span>
                            <span className="employee-cell-sub">
                              <span className="employee-code-badge">{item.employee.employeeCode}</span>
                              <span className="text-muted text-[11px] font-normal">· {item.employee.department || "Văn phòng"}</span>
                            </span>
                          </div>
                        </td>
                        <td className="text-right font-medium text-foreground">
                          {formatCurrency(item.baseSalary)}
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1.5">
                            {item.allowances.map((a) => (
                              <span
                                key={a.policyCode}
                                className={cn(
                                  "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border font-medium",
                                  a.isCustomized
                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold"
                                    : "bg-secondary/60 text-muted-foreground border-border"
                                )}
                              >
                                <span>{a.policyName}:</span>
                                <span className="font-bold">{formatCurrency(a.amount)}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="text-center">
                          {isCustom ? (
                            <Badge tone="warning">Tùy chỉnh</Badge>
                          ) : (
                            <Badge tone="success">Mặc định dự án</Badge>
                          )}
                        </td>
                        <td className="text-right">
                          <span className="font-bold text-sm text-primary font-mono">
                            +{formatCurrency(item.totalMonthlyAllowance)}
                          </span>
                        </td>
                        <td className="text-center">
                          <TableRowActions
                            items={[
                              {
                                key: "edit",
                                label: "Tùy chỉnh phụ cấp",
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
          </div>
        )}

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

      {/* Subtab Activity / Audit Log */}
      <SubtabActivityLog
        projectId={projectId}
        module="policies"
        title="Nhật ký biến động Chế độ & Phụ cấp"
        description="Lịch sử tùy chỉnh, bổ sung và khôi phục các khoản phụ cấp lương của nhân sự"
      />

      {/* Edit Modal */}
      {editEmployee && (
        <Modal
          open={Boolean(editEmployee)}
          onOpenChange={(open) => !open && setEditEmployee(null)}
          title={`Tùy chỉnh phụ cấp - ${editEmployee.employee.fullName}`}
          description={`Mã NV: ${editEmployee.employee.employeeCode} | Lương cơ bản: ${formatCurrency(editEmployee.baseSalary)}`}
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
                {updateMutation.isPending ? "Đang lưu..." : "Lưu phụ cấp"}
              </Button>
            </>
          }
        >
          <div className="space-y-4 py-2">
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-foreground">
                Danh sách các khoản phụ cấp áp dụng:
              </label>
              <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
                {editAllowances.map((a, i) => (
                  <div key={a.policyCode} className="p-3 flex items-center justify-between gap-3 bg-card hover:bg-muted/30 transition-colors">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={a.isEnabled}
                        onChange={(e) => {
                          const copy = [...editAllowances];
                          copy[i].isEnabled = e.target.checked;
                          setEditAllowances(copy);
                        }}
                        className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                      />
                      <span className="text-xs font-medium text-foreground">{a.policyName}</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step={50000}
                        disabled={!a.isEnabled}
                        value={a.amount}
                        onChange={(e) => {
                          const copy = [...editAllowances];
                          copy[i].amount = Number(e.target.value);
                          setEditAllowances(copy);
                        }}
                        className="w-36 px-2.5 py-1.5 text-xs text-right bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-foreground font-semibold"
                      />
                      <span className="text-xs text-muted-foreground">VNĐ</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total summary */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Tổng phụ cấp hàng tháng:</span>
              <span className="text-sm font-bold text-primary">{formatCurrency(totalCalculated)}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Lý do điều chỉnh tùy chỉnh <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Nhập lý do điều chỉnh chế độ phụ cấp..."
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
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
          title={`Lịch sử điều chỉnh phụ cấp - ${historyEmployee.employee.fullName}`}
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
                  <table className="data-table compact-table min-w-[600px]">
                    <thead>
                      <tr>
                        <th style={{ width: "130px" }}>THỜI GIAN</th>
                        <th style={{ width: "140px" }} className="text-right">TỔNG PHỤ CẤP</th>
                        <th style={{ width: "120px" }} className="text-center">CHẾ ĐỘ</th>
                        <th>LÝ DO ĐIỀU CHỈNH</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyList.map((h, i) => (
                        <tr key={i}>
                          <td className="text-muted">{formatDate(h.updatedAt)}</td>
                          <td className="text-right font-bold text-foreground">{formatCurrency(h.totalMonthlyAllowance)}</td>
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
        title="Import Danh sách phụ cấp nhân viên từ Excel"
        description="Tải lên danh sách các khoản phụ cấp cần tùy chỉnh hoặc cập nhật hàng loạt."
        sampleTemplateName="Mau_Import_Phu_Cap.xlsx"
        sampleTemplateDescription="Biểu mẫu chuẩn bao gồm: Mã NV, Họ tên, Mã phụ cấp, Mức tiền, Lý do."
        columns={excelColumns}
        previewRows={importPreviewRows}
        stats={[
          { label: "Số dòng hợp lệ", value: importPreviewRows.length, tone: "primary" },
        ]}
        onDownloadSample={() => api.downloadBenefitsAllowancesImportTemplateV3()}
        onSimulateUpload={handleSimulateUpload}
        onConfirmImport={() => importMutation.mutate()}
        confirmLoading={importMutation.isPending}
        confirmLabel={`Nhập ${importPreviewRows.length || ""} bản ghi vào hệ thống`}
        onClearPreview={() => setImportPreviewRows([])}
      />
    </div>
  );
}
