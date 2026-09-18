"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Download,
  FileCheck2,
  FileSpreadsheet,
  History,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  UserCheck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useToast, useUserRole, type UserRole } from "@/components/providers";
import {
  roleActors,
  statusConfig,
  periodStatusConfig,
  workflowStatusConfig,
  getPayrollStatuses,
  workflowSteps,
} from "@/components/payroll/payroll-config";
import { PayrollFullTable } from "@/components/payroll/payroll-full-table";
import { Badge, Button, Modal, StatusBadge, TablePaginationFooter, UserAvatar } from "@/components/ui";
import { cn, formatCurrency, formatDate, formatDateTime, formatMonthYear } from "@/lib/utils";

import {
  usePayrollDetail,
  usePayrollMatrix,
  useWorkflowTimeline,
  useSubmitWorkflow,
  useApproveWorkflow,
  useRejectWorkflow,
  useConfirmationStats,
  useResolveDispute,
  useCalculatePayroll,
} from "@/lib/hooks/use-payroll";
import { payrollApi } from "@/lib/payroll-api";
import type { PayrollPeriod, WorkflowStep, WorkflowInstance, ConfirmationStatus, ConfirmationItem, ConfirmationStats, DisputeRecord } from "@/lib/payroll-types";

type DetailTab = "overview" | "workflow";

const tabs: Array<{ value: DetailTab; label: string; icon: typeof FileSpreadsheet }> = [
  { value: "overview", label: "Bảng lương", icon: FileSpreadsheet },
  { value: "workflow", label: "Quy trình duyệt", icon: History },
];

const validTabs = new Set(tabs.map((item) => item.value));

type WorkflowAction = "submit" | "approve" | "reject";

const recalculationSteps = [
  "Nạp dữ liệu chấm công & ngày làm việc",
  "Đối chiếu thông tin nhân sự & chính sách",
  "Thực thi cây công thức PayrollCalculationEngine",
  "Tính toán Gross, Net và các khoản khấu trừ",
  "Hoàn tất cập nhật dữ liệu bảng lương",
];

export function PayrollDetailPage({ payrollId }: { payrollId: string }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  
  const [actionModal, setActionModal] = useState<{ action: WorkflowAction, open: boolean }>({ action: "approve", open: false });
  const [actionNote, setActionNote] = useState("");

  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationFilter, setConfirmationFilter] = useState("all");
  const [confirmationQuery, setConfirmationQuery] = useState("");
  
  const { role } = useUserRole();
  const { notify } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") as DetailTab | null;
  const activeTab: DetailTab = requestedTab && validTabs.has(requestedTab) ? requestedTab : "overview";

  const id = Number(payrollId);

  const [isExporting, setIsExporting] = useState(false);
  const [selectedEmployeeCodes, setSelectedEmployeeCodes] = useState<Set<string>>(new Set());
  const [confirmCalculateModal, setConfirmCalculateModal] = useState<{
    open: boolean;
    employeeCodes?: string[];
  }>({
    open: false,
  });
  const [calculatingPhase, setCalculatingPhase] = useState<"idle" | "running">("idle");
  const [calcProgress, setCalcProgress] = useState(0);
  const [calcStep, setCalcStep] = useState(0);
  
  // Queries
  const { data: run, isLoading: isRunLoading } = usePayrollDetail(id);
  const { data: matrixData, isLoading: isMatrixLoading, isFetching: isMatrixFetching } = usePayrollMatrix(id, {
    page,
    pageSize,
    search: debouncedQuery.trim() || undefined,
  });
  const { data: timelineData, isLoading: isTimelineLoading, error: timelineError } = useWorkflowTimeline(id);
  
  // Mutations
  const submitMut = useSubmitWorkflow();
  const approveMut = useApproveWorkflow();
  const rejectMut = useRejectWorkflow();
  const calculateMut = useCalculatePayroll();

  const handleExportExcel = async () => {
    if (!run) return;
    try {
      setIsExporting(true);
      await payrollApi.downloadPayrollExcel(
        id,
        `BANG_LUONG_${run.projectCode}_${run.year}${String(run.month).padStart(2, "0")}.xlsx`
      );
      notify("Đã tải xuống file bảng lương Excel thành công.");
    } catch (e: any) {
      notify(e.message || "Không thể tải file Excel", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePromptCalculateAll = () => {
    setConfirmCalculateModal({
      open: true,
      employeeCodes: undefined,
    });
  };

  const handlePromptCalculateSelected = (codes: string[]) => {
    if (!codes || codes.length === 0) return;
    setConfirmCalculateModal({
      open: true,
      employeeCodes: codes,
    });
  };

  const handleConfirmCalculate = async () => {
    const codes = confirmCalculateModal.employeeCodes;
    const isSelectedGroup = Boolean(codes && codes.length > 0);

    setCalculatingPhase("running");
    setCalcProgress(6);
    setCalcStep(0);

    let isCompleted = false;

    // Simulated progress runner while awaiting server response
    (async () => {
      for (let index = 0; index < recalculationSteps.length; index += 1) {
        if (isCompleted) break;
        setCalcStep(index);
        const target = Math.min(88, (index + 1) * 18);
        for (let p = index * 18 + 6; p <= target; p += 3) {
          if (isCompleted) break;
          await new Promise((r) => setTimeout(r, 130));
          setCalcProgress((prev) => Math.min(Math.max(prev, p), 88));
        }
      }
    })();

    try {
      const res = await calculateMut.mutateAsync({
        id,
        employeeCodes: isSelectedGroup ? codes : undefined,
      });

      isCompleted = true;
      setCalcStep(recalculationSteps.length - 1);
      setCalcProgress(100);

      // Brief pause to display 100% checkmark state
      await new Promise((r) => setTimeout(r, 450));

      setConfirmCalculateModal({ open: false });
      setCalculatingPhase("idle");

      const count = res?.totalCalculated ?? (isSelectedGroup ? codes!.length : run?.totalEmployees);
      notify(
        isSelectedGroup
          ? `Đã tính toán lại lương thành công cho ${count} người lao động được chọn.`
          : `Đã tính toán lương thành công cho toàn bộ ${count} nhân viên.`
      );

      if (isSelectedGroup) {
        setSelectedEmployeeCodes(new Set());
      }
    } catch (e: any) {
      isCompleted = true;
      setCalculatingPhase("idle");
      setConfirmCalculateModal({ open: false });
      notify(e.message || "Lỗi khi tính toán bảng lương", "error");
    } finally {
      setCalcProgress(0);
      setCalcStep(0);
    }
  };

  useEffect(() => {
    if (calculatingPhase !== "running") return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Hệ thống đang tính toán lại bảng lương. Bạn có chắc chắn muốn rời đi?";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [calculatingPhase]);

  useEffect(() => {
    if (searchParams.get("dialog") === "confirmations") setConfirmationOpen(true);
  }, [searchParams]);

  const changeTab = (tab: DetailTab) => {
    setQuery("");
    setDebouncedQuery("");
    setPage(1);
    setSelectedEmployeeCodes(new Set());
    router.replace(tab === "overview" ? `/payroll/${payrollId}` : `/payroll/${payrollId}?tab=${tab}`, { scroll: false });
  };

  const openConfirmations = () => {
    setConfirmationFilter("all");
    setConfirmationQuery("");
    setConfirmationOpen(true);
  };

  const closeConfirmations = () => {
    setConfirmationOpen(false);
    if (searchParams.get("dialog") === "confirmations") {
      router.replace(`/payroll/${payrollId}?tab=workflow`, { scroll: false });
    }
  };

  const openActionDialog = (action: WorkflowAction) => {
    setActionNote("");
    setActionModal({ action, open: true });
  };

  const handleActionSubmit = async () => {
    try {
      if (actionModal.action === "submit") {
        await submitMut.mutateAsync({ id, note: actionNote });
        notify("Đã gửi trình duyệt bảng lương");
      } else if (actionModal.action === "approve") {
        await approveMut.mutateAsync({ id, payload: { note: actionNote } });
        notify("Đã duyệt bảng lương bước hiện tại");
      } else if (actionModal.action === "reject") {
        await rejectMut.mutateAsync({ id, reason: actionNote });
        notify("Đã từ chối và trả lại bảng lương");
      }
      setActionModal({ action: "approve", open: false });
    } catch (e: any) {
      notify(e.message || "Lỗi thao tác workflow", "error");
    }
  };

  if (isRunLoading) return <div className="payroll-loading"><RefreshCw className="spin" /> Đang tải chi tiết bảng lương…</div>;
  if (!run) return <section className="content-card payroll-not-found"><FileSpreadsheet /><h1>Không tìm thấy bảng lương</h1><p>Bảng lương có thể đã bị xóa hoặc đường dẫn không còn hợp lệ.</p><Button onClick={() => router.push("/payroll")}><ArrowLeft />Quay lại danh sách</Button></section>;

  const canViewSensitive = role === "accountant" || role === "payment_accountant";

  const { periodStatus } = getPayrollStatuses(run, timelineData);

  return (
    <>
      <div className="payroll-detail-page">
        <header className="payroll-detail-page-header">
          <div className="payroll-detail-title">
            <Link href="/payroll" className="payroll-back-link"><ArrowLeft />Danh sách bảng lương</Link>
            <div className="payroll-detail-title-row">
              <h1>{run.periodCode}</h1>
              <StatusBadge tone={periodStatus.tone}>
                {periodStatus.label}
              </StatusBadge>
            </div>
            <p>{run.projectCode} · {run.projectName} · {run.month}/{run.year}</p>
          </div>
          <div className="payroll-detail-header-action flex items-center gap-2">
            <small className="mr-2">Ngày tạo: {formatDate(run.createdAt)}</small>
            {run.status !== "locked" && (
              <Button
                variant="secondary"
                disabled={calculatingPhase === "running" || calculateMut.isPending}
                onClick={handlePromptCalculateAll}
              >
                <RefreshCw className={calculatingPhase === "running" || calculateMut.isPending ? "spin" : ""} />
                {calculatingPhase === "running" || calculateMut.isPending ? "Đang tính..." : "Tính lại toàn bộ"}
              </Button>
            )}
            <Button
              variant="secondary"
              disabled={isExporting}
              onClick={handleExportExcel}
            >
              {isExporting ? <RefreshCw className="spin" /> : <Download />}
              Xuất Excel
            </Button>
          </div>
        </header>

        <nav className="payroll-page-tabs" aria-label="Nhóm thông tin bảng lương">
          {tabs.map(({ value, label, icon: Icon }) => {
            const isActive = activeTab === value;
            return (
              <button
                type="button"
                className={`payroll-page-tab-btn ${isActive ? "active" : ""}`}
                onClick={() => changeTab(value)}
                key={value}
              >
                <Icon />
                <span>{label}</span>
                {isActive && <span className="tab-indicator" />}
              </button>
            );
          })}
        </nav>

        <main className="payroll-detail-page-content">
          {activeTab === "overview" && (
            <div className="payroll-overview-tab payroll-page-tab-panel">
              {isMatrixLoading && !matrixData ? (
                <div className="payroll-loading"><RefreshCw className="spin" /> Đang tải dữ liệu ma trận...</div>
              ) : matrixData ? (
                <PayrollFullTable
                  matrix={matrixData}
                  query={query}
                  onQueryChange={setQuery}
                  canViewSensitive={canViewSensitive}
                  page={page}
                  pageSize={pageSize}
                  totalItems={matrixData.total ?? matrixData.totalRecords ?? matrixData.rows?.length}
                  onPageChange={setPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setPage(1);
                  }}
                  isFetching={isMatrixFetching}
                  selectedEmployeeCodes={selectedEmployeeCodes}
                  onSelectedEmployeeCodesChange={setSelectedEmployeeCodes}
                  onCalculateSelected={(codes) => handlePromptCalculateSelected(codes)}
                  isCalculating={calculatingPhase === "running" || calculateMut.isPending}
                  canCalculate={run.status !== "locked"}
                />
              ) : null}
            </div>
          )}
          {activeTab === "workflow" && (
            <WorkflowTab 
              run={run} 
              timeline={timelineData} 
              isLoading={isTimelineLoading}
              error={timelineError}
              onAction={openActionDialog} 
              onOpenConfirmations={openConfirmations} 
            />
          )}
        </main>
      </div>

      <Modal open={confirmationOpen} onOpenChange={(open) => { if (!open) closeConfirmations(); }} title="Chi tiết phản hồi từ Người lao động" description={`${run.periodCode} · ${run.projectCode}`} size="xl" footer={<Button onClick={closeConfirmations}>Đóng</Button>}>
        <PayslipConfirmationPanel
          run={run}
          filter={confirmationFilter}
          query={confirmationQuery}
          onFilterChange={setConfirmationFilter}
          onQueryChange={setConfirmationQuery}
        />
      </Modal>

      <Modal open={actionModal.open} onOpenChange={(o) => setActionModal({ ...actionModal, open: o })} title={actionModal.action === "submit" ? "Trình duyệt bảng lương" : actionModal.action === "approve" ? "Phê duyệt bảng lương" : "Từ chối bảng lương"} size="sm" footer={<><Button onClick={() => setActionModal({ ...actionModal, open: false })}>Hủy</Button><Button variant={actionModal.action === "reject" ? "danger" : "primary"} onClick={handleActionSubmit}>{actionModal.action === "reject" ? <XCircle /> : <Send />}{actionModal.action === "submit" ? "Trình duyệt" : actionModal.action === "approve" ? "Phê duyệt" : "Từ chối"}</Button></>}>
        <label className="form-field">
          <span>Ghi chú ({actionModal.action === "reject" ? "Bắt buộc" : "Không bắt buộc"})</span>
          <textarea rows={4} value={actionNote} onChange={(e) => setActionNote(e.target.value)} />
        </label>
      </Modal>

      <Modal
        open={confirmCalculateModal.open}
        onOpenChange={(open) => {
          if (calculatingPhase !== "running" && !calculateMut.isPending) {
            setConfirmCalculateModal((prev) => ({ ...prev, open }));
          }
        }}
        title={
          calculatingPhase === "running"
            ? confirmCalculateModal.employeeCodes && confirmCalculateModal.employeeCodes.length > 0
              ? `Đang tính lại lương cho ${confirmCalculateModal.employeeCodes.length} người lao động…`
              : "Đang tính toán lại toàn bộ bảng lương…"
            : confirmCalculateModal.employeeCodes && confirmCalculateModal.employeeCodes.length > 0
              ? confirmCalculateModal.employeeCodes.length === 1
                ? "Xác nhận tính lại lương cho nhân viên"
                : `Xác nhận tính lại lương cho ${confirmCalculateModal.employeeCodes.length} người lao động`
              : "Xác nhận tính lại toàn bộ bảng lương"
        }
        description={
          calculatingPhase === "running"
            ? "Hệ thống đang thực thi quy trình tính toán qua PayrollCalculationEngine. Vui lòng không đóng trình duyệt hoặc chuyển trang."
            : confirmCalculateModal.employeeCodes && confirmCalculateModal.employeeCodes.length > 0
              ? `Hệ thống sẽ thực thi lại công thức tính lương cho ${confirmCalculateModal.employeeCodes.length} người lao động đã chọn.`
              : `Hệ thống sẽ thực thi lại công thức tính lương cho tất cả nhân viên trong kỳ ${run.periodCode}.`
        }
        size={calculatingPhase === "running" ? "lg" : "sm"}
        footer={
          calculatingPhase === "running" ? undefined : (
            <>
              <Button
                variant="secondary"
                disabled={calculateMut.isPending}
                onClick={() => setConfirmCalculateModal({ open: false })}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                disabled={calculateMut.isPending}
                onClick={handleConfirmCalculate}
              >
                <RefreshCw />
                Xác nhận tính lại
              </Button>
            </>
          )
        }
      >
        {calculatingPhase === "running" ? (
          <div className="generation-panel">
            <div className="generation-orbit">
              <RefreshCw className="spin" />
              <span>{calcProgress}%</span>
            </div>
            <div className="generation-copy">
              <strong>{recalculationSteps[calcStep]}</strong>
              <p>Quá trình tính toán có thể mất vài giây. Vui lòng giữ cửa sổ này mở để tránh yêu cầu bị gián đoạn.</p>
            </div>
            <div
              className="generation-progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={calcProgress}
            >
              <span style={{ width: `${calcProgress}%` }} />
            </div>
            <div className="generation-steps">
              {recalculationSteps.map((step, index) => (
                <div
                  className={index < calcStep ? "done" : index === calcStep ? "active" : ""}
                  key={step}
                >
                  {index < calcStep ? <CheckCircle2 /> : <span>{index + 1}</span>}
                  <small>{step}</small>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-2 text-sm space-y-3">
            <div className="p-3 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40 rounded-lg text-xs space-y-1.5 text-foreground">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kỳ lương:</span>
                <strong className="font-semibold">{run.periodCode}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dự án:</span>
                <span className="font-medium truncate max-w-[200px]">{run.projectName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phạm vi:</span>
                <strong className="text-teal-700 dark:text-teal-300 font-semibold">
                  {confirmCalculateModal.employeeCodes && confirmCalculateModal.employeeCodes.length > 0
                    ? `${confirmCalculateModal.employeeCodes.length} người lao động đã chọn`
                    : `Toàn bộ nhân viên (${run.totalEmployees ?? "Tất cả"})`}
                </strong>
              </div>
            </div>

            {confirmCalculateModal.employeeCodes && confirmCalculateModal.employeeCodes.length > 0 && (
              <div className="text-xs">
                <span className="text-muted-foreground block mb-1 font-medium">Mã nhân viên tính lại:</span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-900 border rounded-md font-mono text-[11px]">
                  {confirmCalculateModal.employeeCodes.map((code) => (
                    <span key={code} className="px-1.5 py-0.5 bg-teal-500/10 text-teal-700 dark:text-teal-300 rounded font-bold">
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded border border-amber-200/50 dark:border-amber-800/40 leading-relaxed">
              <strong>Lưu ý:</strong> Dữ liệu lương tổng hợp (Gross, Net, phụ cấp và các khoản khấu trừ) sẽ được tính toán lại tự động theo ma trận công thức của dự án.
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}

const v3StepMeta: Record<number, { title: string; owner: string; time: string; description: string }> = {
  1: {
    title: "C&B lập & trình duyệt",
    owner: "Kế toán C&B",
    time: "02 ngày",
    description: "C&B lập bảng lương, đối chiếu dữ liệu công và gửi trình duyệt lên cấp quản lý dự án.",
  },
  2: {
    title: "BCSX / Admin xác nhận",
    owner: "Admin dự án / BCSX",
    time: "01 ngày",
    description: "Đối chiếu ngày công, hồ sơ nhân sự, ATM, MST, tạm giữ, vi phạm và các khoản ứng lương.",
  },
  3: {
    title: "CDA / GSDA xác nhận",
    owner: "CDA / GSDA / Quản lý dự án",
    time: "01 ngày",
    description: "Kiểm tra tổng thể dữ liệu bảng lương và xác nhận trước khi phát hành phiếu lương.",
  },
  4: {
    title: "Người lao động xác nhận",
    owner: "Người lao động dự án",
    time: "02 ngày",
    description: "NLĐ nhận phiếu lương qua ứng dụng di động, xác nhận hoặc gửi khiếu nại trong thời hạn.",
  },
  5: {
    title: "Kế toán nhập doanh thu",
    owner: "Kế toán Thanh toán",
    time: "01 ngày",
    description: "Kế toán nhập doanh thu dự án thực tế và đối chiếu tỷ lệ chi phí lương/doanh thu.",
  },
  6: {
    title: "C&B hoàn tất & khóa sổ",
    owner: "Kế toán C&B",
    time: "Ngày chi lương",
    description: "Lưu dữ liệu hoàn tất làm cơ sở lập danh sách chi lương và khóa sổ kỳ lương.",
  },
};

function WorkflowTab({
  run,
  timeline,
  isLoading,
  error,
  onAction,
  onOpenConfirmations,
}: {
  run: PayrollPeriod;
  timeline: any;
  isLoading: boolean;
  error?: any;
  onAction: (action: WorkflowAction) => void;
  onOpenConfirmations: () => void;
}) {
  const { data: confirmStats } = useConfirmationStats(run.id);

  if (isLoading) {
    return (
      <div className="payroll-loading">
        <RefreshCw className="spin" /> Đang tải tiến trình...
      </div>
    );
  }

  if (error && error.status !== 404 && error.code !== "NOT_FOUND") {
    return (
      <section className="payroll-workflow-tab payroll-page-tab-panel">
        <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg border border-red-200">
          <p className="font-medium">Lỗi tải quy trình duyệt: {error.message || "Không thể kết nối máy chủ"}</p>
        </div>
      </section>
    );
  }

  const defaultSteps: WorkflowStep[] = [
    { stepOrder: 1, stepName: "C&B lập & trình duyệt", status: "pending", completedAt: undefined },
    { stepOrder: 2, stepName: "BCSX / Admin xác nhận", status: "pending", completedAt: undefined },
    { stepOrder: 3, stepName: "CDA / GSDA xác nhận", status: "pending", completedAt: undefined },
    { stepOrder: 4, stepName: "Người lao động xác nhận", status: "pending", completedAt: undefined },
    { stepOrder: 5, stepName: "Kế toán nhập doanh thu", status: "pending", completedAt: undefined },
    { stepOrder: 6, stepName: "C&B hoàn tất & khóa sổ", status: "pending", completedAt: undefined },
  ];

  const instance = timeline?.instance;
  const steps = timeline?.steps && timeline.steps.length > 0 ? timeline.steps : defaultSteps;
  const history = timeline?.history || [];

  const isWorkflowStarted = Boolean(
    instance?.id ||
    (timeline as any)?.instanceId ||
    run.wfInstanceId ||
    (run.status !== "draft" && run.status !== "calculated")
  );

  const isWorkflowActive =
    isWorkflowStarted &&
    (instance?.status === "pending" ||
      instance?.status === "in_progress" ||
      run.status === "submitted" ||
      (run.status as string) === "in_progress");

  const currentStepOrder = instance?.currentStepOrder ?? run.wfCurrentStepOrder ?? 1;
  const currentStepName =
    instance?.currentStepName ??
    run.wfCurrentStepName ??
    steps.find((s: WorkflowStep) => s.stepOrder === currentStepOrder)?.stepName ??
    "";
  const currentStepDeadline = instance?.stepDeadline ?? run.wfStepDeadline;

  const totalEmployees = run.totalEmployees ?? confirmStats?.totalEmployees ?? confirmStats?.total ?? 0;
  const confirmedCount = confirmStats?.confirmed ?? 0;
  const progressPercent = totalEmployees > 0 ? Math.round((confirmedCount / totalEmployees) * 100) : 0;

  const { periodStatus, workflowStatus } = getPayrollStatuses(run, timeline);

  const getStepBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <StatusBadge tone="success">Đã hoàn tất</StatusBadge>;
      case "in_progress":
        return <StatusBadge tone="warning">Đang xử lý</StatusBadge>;
      case "rejected":
        return <StatusBadge tone="danger">Từ chối</StatusBadge>;
      default:
        return <StatusBadge tone="neutral">Chờ xử lý</StatusBadge>;
    }
  };

  const getActionConfig = (action: string) => {
    switch (action?.toUpperCase()) {
      case "APPROVE":
      case "APPROVED":
        return {
          label: "Phê duyệt",
          tone: "success" as const,
          verb: "đã phê duyệt",
        };
      case "REJECT":
      case "REJECTED":
        return {
          label: "Từ chối",
          tone: "danger" as const,
          verb: "đã từ chối và yêu cầu điều chỉnh",
        };
      case "SUBMIT":
      case "SUBMITTED":
        return {
          label: "Trình duyệt",
          tone: "info" as const,
          verb: "đã khởi tạo & trình duyệt",
        };
      case "CALCULATE":
      case "CALCULATED":
        return {
          label: "Tính toán",
          tone: "warning" as const,
          verb: "đã tính toán bảng lương",
        };
      case "LOCK":
      case "LOCKED":
      case "FINALIZE":
        return {
          label: "Khóa sổ",
          tone: "neutral" as const,
          verb: "đã hoàn tất và khóa sổ",
        };
      default:
        return {
          label: action || "Thao tác",
          tone: "neutral" as const,
          verb: "đã thực hiện thao tác",
        };
    }
  };

  return (
    <section className="payroll-workflow-tab payroll-page-tab-panel">
      <header className="workflow-table-heading">
        <div>
          <span className="eyebrow"><History /> QUY TRÌNH THEO PKT.QT06</span>
          <h2>Tiến trình phê duyệt</h2>
          <p>
            {isWorkflowStarted
              ? `Bước hiện tại: Bước ${currentStepOrder} · ${currentStepName}${
                  currentStepDeadline ? ` · Hạn chót: ${formatDateTime(currentStepDeadline)}` : ""
                }`
              : "Kỳ lương chưa được khởi tạo quy trình duyệt."}
          </p>
        </div>
        {!isWorkflowStarted && (run.status === "calculated" || run.status === "draft") ? (
          <Button variant="primary" onClick={() => onAction("submit")}>
            <Send /> Trình duyệt ngay
          </Button>
        ) : (
          <StatusBadge tone={workflowStatus.tone}>
            {workflowStatus.label}
          </StatusBadge>
        )}
      </header>

      {!isWorkflowStarted && (
        <div className="m-6 p-4 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 flex items-start gap-3.5">
          <History className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-950">Chưa khởi tạo quy trình duyệt</p>
            <p className="text-amber-800 mt-0.5 leading-relaxed">
              Bảng lương này đang ở trạng thái <strong>{periodStatus.label}</strong>. Bấm <strong>"Trình duyệt ngay"</strong> để bắt đầu bước 1 (C&B lập &amp; trình duyệt).
            </p>
          </div>
        </div>
      )}

      <div className="workflow-table-wrap">
        <table className="workflow-approval-table">
          <thead>
            <tr>
              <th style={{ width: "70px", textAlign: "center" }}>STT</th>
              <th>Bước</th>
              <th style={{ width: "150px", textAlign: "center" }}>Trạng thái</th>
              <th style={{ width: "220px" }}>Người xử lý</th>
              <th style={{ width: "160px", textAlign: "center" }}>Thời gian</th>
              <th style={{ width: "240px" }}>Ghi chú / Kết quả</th>
              <th style={{ width: "185px", textAlign: "center" }}>Xác nhận</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((step: WorkflowStep) => {
              const isActive = isWorkflowActive && currentStepOrder === step.stepOrder;
              const isDone = step.status === "approved" || step.stepOrder < currentStepOrder;
              const isCorrection = step.status === "rejected";
              const stepMeta = v3StepMeta[step.stepOrder] || {
                title: step.stepName,
                owner: "Người phụ trách",
                time: "01 ngày",
                description: "",
              };

              const assignedNames =
                step.assignedApprovers && step.assignedApprovers.length > 0
                  ? step.assignedApprovers.map((a: any) => a.fullName).join(", ")
                  : undefined;
              const assignedRole = step.assignedApprovers?.[0]?.roleName;

              const stepLog = history.find((h: any) => h.stepOrder === step.stepOrder);
              const noteText = stepLog?.note || stepLog?.comment || (isDone ? "Đã xác nhận hoàn tất" : undefined);

              return (
                <tr
                  className={`${isActive ? "active" : ""} ${isDone ? "done" : ""} ${isCorrection ? "correction" : ""}`}
                  key={step.stepOrder}
                >
                  <td style={{ textAlign: "center" }}>
                    <span className="workflow-step-number">{String(step.stepOrder).padStart(2, "0")}</span>
                  </td>
                  <td>
                    <div className="workflow-step-cell">
                      <strong>{step.stepName || stepMeta.title}</strong>
                      {stepMeta.description && <p>{stepMeta.description}</p>}
                      <small>{stepMeta.owner} {stepMeta.time ? `· SLA ${stepMeta.time}` : ""}</small>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {getStepBadge(
                      isDone ? "approved" : isActive ? "in_progress" : isCorrection ? "rejected" : "pending"
                    )}
                  </td>
                  <td>
                    <div className="workflow-assignee">
                      {step.stepOrder === 4 ? (
                        <>
                          <strong>Người lao động dự án</strong>
                          <small>Xác nhận phiếu lương trên ứng dụng</small>
                          <div className="workflow-employee-progress">
                            <span><i style={{ width: `${progressPercent}%` }} /></span>
                            <b>{confirmedCount}/{totalEmployees} · {progressPercent}%</b>
                          </div>
                        </>
                      ) : isDone && (step.approvedByName || stepLog?.actorName) ? (
                        <>
                          <strong>{step.approvedByName || stepLog?.actorName}</strong>
                          <small>{assignedRole || stepMeta.owner}</small>
                        </>
                      ) : assignedNames ? (
                        <>
                          <strong>{assignedNames}</strong>
                          <small>{assignedRole || stepMeta.owner}</small>
                        </>
                      ) : (
                        <>
                          <strong>{stepMeta.owner}</strong>
                          <small>Đang chờ phân công</small>
                        </>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className="workflow-time">
                      {step.completedAt ? formatDateTime(step.completedAt) : "—"}
                    </span>
                  </td>
                  <td>
                    <span className={`workflow-note ${noteText ? "" : "empty"}`}>
                      {noteText ?? "—"}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {isActive ? (
                      <div className="workflow-actions">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button size="sm" variant="primary" onClick={() => onAction("approve")}>
                            <Check /> Duyệt
                          </Button>
                          <Button size="sm" onClick={() => onAction("reject")}>
                            <RotateCcw /> Từ chối
                          </Button>
                        </div>
                        {step.stepOrder === 4 && (
                          <Button size="sm" variant="secondary" onClick={onOpenConfirmations}>
                            <UserCheck /> Xem xác nhận NLĐ
                          </Button>
                        )}
                      </div>
                    ) : step.stepOrder === 4 ? (
                      <Button size="sm" variant="secondary" onClick={onOpenConfirmations}>
                        <UserCheck /> Xem xác nhận NLĐ
                      </Button>
                    ) : isDone ? (
                      <div className="workflow-done-check">
                        <span className="text-xs font-semibold text-emerald-600 inline-flex items-center gap-1">
                          <Check className="w-4 h-4" /> Đã hoàn tất
                        </span>
                      </div>
                    ) : (
                      <span className="workflow-no-action">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="m-6 pt-6 border-t">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">Lịch sử thao tác &amp; phê duyệt</h3>
                {history && history.length > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/60">
                    {history.length} sự kiện
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Nhật ký ghi nhận các hành động trình duyệt, phê duyệt, từ chối và giải trình theo từng bước.
              </p>
            </div>
          </div>
        </div>

        {!history || history.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-border/80 bg-muted/10 text-center">
            <History className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Chưa có lịch sử thao tác</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Các thao tác trình duyệt, phê duyệt hoặc yêu cầu trả lại sẽ được lưu vết tự động tại đây.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((h: any, i: number) => {
              const config = getActionConfig(h.action);
              const stepMeta = v3StepMeta[h.stepOrder];
              const stepTitle = h.stepName || stepMeta?.title;
              const isPlaceholderNote = !h.comment || h.comment === "string" || h.comment === "null";

              return (
                <div
                  key={i}
                  className="rounded-xl border border-border/70 bg-card p-3.5 hover:border-primary/40 hover:shadow-2xs transition-all space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm font-semibold text-foreground">
                        {h.actorName || "Hệ thống"}
                      </strong>
                      <span className="text-xs text-muted-foreground">{config.verb}</span>
                      {stepTitle && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-secondary text-secondary-foreground border border-border/60">
                          {h.stepOrder ? `Bước ${h.stepOrder}: ` : ""}
                          {stepTitle}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge tone={config.tone}>{config.label}</StatusBadge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatDateTime(h.createdAt)}
                      </span>
                    </div>
                  </div>

                  {!isPlaceholderNote && (
                    <div className="text-xs p-2.5 rounded-lg bg-secondary/40 border border-border/50 text-foreground flex items-start gap-2">
                      <MessageSquareText className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-foreground mr-1.5">Ghi chú:</span>
                        <span className="text-muted-foreground leading-relaxed">{h.comment}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function PayslipConfirmationPanel({
  run,
  filter,
  query,
  onFilterChange,
  onQueryChange,
}: {
  run: PayrollPeriod;
  filter: string;
  query: string;
  onFilterChange: (f: string) => void;
  onQueryChange: (q: string) => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const { notify } = useToast();

  const [resolvingItem, setResolvingItem] = useState<ConfirmationItem | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const resolveMut = useResolveDispute();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const statsRef = useRef({
    totalEmployees: 0,
    confirmedCount: 0,
    disputedCount: 0,
    resolvedCount: 0,
    viewedCount: 0,
    publishedCount: 0,
  });

  const { data, isLoading, isFetching } = useConfirmationStats(run.id, {
    search: debouncedQuery.trim() || undefined,
    status: filter !== "all" ? filter : undefined,
    page,
    pageSize,
  });

  if (data) {
    statsRef.current = {
      totalEmployees: data.totalEmployees ?? data.total ?? statsRef.current.totalEmployees,
      confirmedCount: data.confirmed ?? statsRef.current.confirmedCount,
      disputedCount: data.disputed ?? statsRef.current.disputedCount,
      resolvedCount: data.resolved ?? statsRef.current.resolvedCount,
      viewedCount: data.viewed ?? statsRef.current.viewedCount,
      publishedCount: data.published ?? statsRef.current.publishedCount,
    };
  }

  const {
    totalEmployees,
    confirmedCount,
    disputedCount,
    resolvedCount,
    viewedCount,
    publishedCount,
  } = statsRef.current;

  const items = data ? (data.items || (data as any).disputes || []) : [];
  const confirmedPct = totalEmployees > 0 ? Math.round((confirmedCount / totalEmployees) * 100) : 0;

  const handleFilterChange = (newFilter: string) => {
    onFilterChange(newFilter);
    setPage(1);
  };

  const handleSearchChange = (newQuery: string) => {
    onQueryChange(newQuery);
  };

  const handleOpenResolve = (item: ConfirmationItem) => {
    setResolvingItem(item);
    setResolutionNote(item.resolvedNote || "");
  };

  const handleResolveSubmit = async () => {
    if (!resolvingItem || !resolutionNote.trim()) return;
    try {
      await resolveMut.mutateAsync({
        id: run.id,
        confirmationId: resolvingItem.id ?? resolvingItem.confirmationId ?? 0,
        resolvedNote: resolutionNote.trim(),
      });
      notify(`Đã cập nhật kết quả xử lý khiếu nại cho nhân viên ${resolvingItem.fullName}.`);
      setResolvingItem(null);
      setResolutionNote("");
    } catch (err: any) {
      notify(err.message || "Không thể lưu kết quả xử lý khiếu nại.", "error");
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <StatusBadge tone="success">Đã xác nhận</StatusBadge>;
      case "disputed":
        return <StatusBadge tone="danger">Khiếu nại</StatusBadge>;
      case "resolved":
        return <StatusBadge tone="warning">Đã giải quyết</StatusBadge>;
      case "viewed":
        return <StatusBadge tone="info">Đã xem</StatusBadge>;
      case "published":
        return <StatusBadge tone="neutral">Chưa xem</StatusBadge>;
      default:
        return <StatusBadge tone="neutral">{status}</StatusBadge>;
    }
  };

  const renderTimestamp = (item: ConfirmationItem) => {
    const time =
      item.status === "disputed"
        ? item.disputeAt || item.disputedAt
        : item.status === "resolved"
        ? item.resolvedAt
        : item.status === "confirmed"
        ? item.confirmedAt
        : item.status === "viewed"
        ? item.viewedAt
        : null;

    if (!time) return <span className="text-muted-foreground">—</span>;
    return <span className="confirmation-time">{formatDateTime(time)}</span>;
  };

  return (
    <div className="payslip-confirmation-modal">
      <div className="confirmation-summary">
        <article>
          <span>TỔNG NHÂN VIÊN</span>
          <strong>{totalEmployees.toLocaleString("vi-VN")}</strong>
          <small>Được gửi phiếu lương</small>
        </article>
        <article className="confirmed">
          <span>ĐÃ XÁC NHẬN</span>
          <strong>{confirmedCount.toLocaleString("vi-VN")}</strong>
          <small>{confirmedPct}% hoàn thành phản hồi</small>
        </article>
        <article className={disputedCount > 0 ? "needs-action" : ""}>
          <span>KHIẾU NẠI</span>
          <strong>{disputedCount.toLocaleString("vi-VN")}</strong>
          <small>{disputedCount > 0 ? `${disputedCount} phản hồi cần xử lý` : "Không có khiếu nại"}</small>
        </article>
        <article>
          <span>ĐÃ XEM / CHƯA XEM</span>
          <strong>{viewedCount.toLocaleString("vi-VN")} / {publishedCount.toLocaleString("vi-VN")}</strong>
          <small>{resolvedCount > 0 ? `Đã xử lý: ${resolvedCount}` : "Tiến độ tiếp cận phiếu"}</small>
        </article>
      </div>

      <div className="confirmation-toolbar">
        <label className="search-field confirmation-search">
          <Search />
          <input
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Tìm mã hoặc họ tên NV…"
          />
        </label>
        <div className="confirmation-filters">
          <button
            type="button"
            className={filter === "all" ? "active" : ""}
            onClick={() => handleFilterChange("all")}
          >
            Tất cả <span>{totalEmployees}</span>
          </button>
          <button
            type="button"
            className={filter === "disputed" ? "active" : ""}
            onClick={() => handleFilterChange("disputed")}
          >
            Khiếu nại <span>{disputedCount}</span>
          </button>
          {resolvedCount > 0 && (
            <button
              type="button"
              className={filter === "resolved" ? "active" : ""}
              onClick={() => handleFilterChange("resolved")}
            >
              Đã xử lý <span>{resolvedCount}</span>
            </button>
          )}
          <button
            type="button"
            className={filter === "confirmed" ? "active" : ""}
            onClick={() => handleFilterChange("confirmed")}
          >
            Đã xác nhận <span>{confirmedCount}</span>
          </button>
          <button
            type="button"
            className={filter === "viewed" ? "active" : ""}
            onClick={() => handleFilterChange("viewed")}
          >
            Đã xem <span>{viewedCount}</span>
          </button>
          <button
            type="button"
            className={filter === "published" ? "active" : ""}
            onClick={() => handleFilterChange("published")}
          >
            Chưa xem <span>{publishedCount}</span>
          </button>
        </div>
      </div>

      <div className="confirmation-table-wrap relative min-h-[220px]">
        {isFetching && data && (
          <div className="absolute inset-0 bg-card/60 backdrop-blur-[1px] z-10 flex items-center justify-center transition-all">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-popover shadow-md border text-xs font-semibold text-foreground">
              <RefreshCw className="w-3.5 h-3.5 spin text-primary" />
              <span>Đang tải dữ liệu...</span>
            </div>
          </div>
        )}
        <table className="confirmation-table">
          <thead>
            <tr>
              <th style={{ width: "240px" }}>Nhân viên</th>
              <th style={{ width: "130px" }}>Trạng thái</th>
              <th style={{ width: "160px" }}>Thời gian ghi nhận</th>
              <th>Ý kiến / Phản hồi của NLĐ</th>
              <th style={{ width: "140px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {!data && isLoading ? (
              <tr>
                <td colSpan={5}>
                  <div className="confirmation-empty py-16">
                    <RefreshCw className="w-6 h-6 spin text-primary mb-2" />
                    <strong>Đang tải danh sách xác nhận...</strong>
                    <span>Vui lòng chờ trong giây lát.</span>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="confirmation-empty py-10">
                    <MessageSquareText className="w-8 h-8 text-muted-foreground/50 mb-1" />
                    <strong>Không có phản hồi nào</strong>
                    <span>Không tìm thấy bản ghi phù hợp với điều kiện tìm kiếm.</span>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item: ConfirmationItem) => (
                <tr key={item.id ?? item.confirmationId ?? item.employeeCode}>
                  <td>
                    <div className="confirmation-employee">
                      <div>
                        <strong>{item.fullName}</strong>
                        <small className="font-mono">{item.employeeCode}</small>
                      </div>
                    </div>
                  </td>
                  <td>{renderStatusBadge(item.status)}</td>
                  <td>{renderTimestamp(item)}</td>
                  <td>
                    <div className="confirmation-feedback">
                      {item.disputeReason ? (
                        <p className="font-medium text-destructive">{item.disputeReason}</p>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {item.resolvedNote && (
                        <small className="block mt-1.5 p-2 rounded bg-muted/40 text-xs">
                          <strong className="text-foreground">Giải trình của C&amp;B:</strong> {item.resolvedNote}
                          {item.resolvedByName && (
                            <span className="block text-[11px] text-muted-foreground mt-0.5">
                              Xử lý bởi: {item.resolvedByName} {item.resolvedAt ? `(${formatDateTime(item.resolvedAt)})` : ""}
                            </span>
                          )}
                        </small>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {item.status === "disputed" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenResolve(item)}
                      >
                        Xử lý khiếu nại
                      </Button>
                    ) : item.status === "resolved" ? (
                      <span className="text-xs font-semibold text-emerald-600">Đã giải quyết</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <TablePaginationFooter
          totalItems={data.total ?? items.length}
          currentPage={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      {resolvingItem && (
        <Modal
          open={!!resolvingItem}
          onOpenChange={(open) => {
            if (!open) setResolvingItem(null);
          }}
          title="Xử lý và phản hồi khiếu nại phiếu lương"
          description={`${resolvingItem.fullName} · Mã NV: ${resolvingItem.employeeCode}`}
          size="md"
          footer={
            <>
              <Button variant="secondary" onClick={() => setResolvingItem(null)}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                disabled={!resolutionNote.trim() || resolveMut.isPending}
                onClick={handleResolveSubmit}
              >
                {resolveMut.isPending ? <RefreshCw className="spin" /> : <CheckCircle2 />}
                {resolveMut.isPending ? "Đang lưu..." : "Xác nhận xử lý"}
              </Button>
            </>
          }
        >
          <div className="feedback-resolution">
            <blockquote>
              <strong className="block mb-1 text-foreground">Ý kiến khiếu nại từ NLĐ:</strong>
              {resolvingItem.disputeReason}
              {(resolvingItem.disputeAt || resolvingItem.disputedAt) && (
                <span className="block mt-1.5 text-[11px] opacity-80">
                  Thời gian: {formatDateTime(resolvingItem.disputeAt || resolvingItem.disputedAt)}
                </span>
              )}
            </blockquote>

            <label className="form-field">
              <span>
                Nội dung giải trình / Hướng xử lý cho NLĐ <b>*</b>
              </span>
              <textarea
                rows={4}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Nhập nội dung giải trình hoặc hướng xử lý chốt lại cho người lao động..."
              />
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}

