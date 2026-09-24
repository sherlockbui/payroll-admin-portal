"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Filter,
  Grid,
  Layers,
  List,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Unlock,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useToast, useUserRole } from "@/components/providers";
import { Badge, Button, EmptyState, ErrorState, LoadingBlock } from "@/components/ui";
import { api } from "@/lib/api";
import type { Project, TimesheetSummaryItem } from "@/lib/types";
import { exportTimesheetSummaryToExcel } from "./excel-export";
import { TimesheetDetailModal } from "./timesheet-detail-modal";
import { TimesheetMatrixView } from "./timesheet-matrix-view";
import { TimesheetOcrView } from "./timesheet-ocr-view";
import { TimesheetSummaryView } from "./timesheet-summary-view";

type ViewTab = "summary" | "matrix" | "ocr";

export function TimesheetPage() {
  const { notify } = useToast();
  const { role } = useUserRole();
  const queryClient = useQueryClient();

  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("2026-09");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ViewTab>("summary");

  const [inspectingItem, setInspectingItem] = useState<TimesheetSummaryItem | null>(null);

  // Queries
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.getProjects({}),
  });

  const timesheetsQuery = useQuery({
    queryKey: ["timesheets", selectedProjectId, selectedPeriod, search, selectedDept],
    queryFn: () =>
      api.getTimesheets({
        projectId: selectedProjectId,
        period: selectedPeriod,
        search,
        department: selectedDept,
      }),
  });

  const projects: Project[] = projectsQuery.data?.data ?? [];
  const timesheetData = timesheetsQuery.data?.items ?? [];
  const meta = timesheetsQuery.data?.meta ?? {
    totalEmployees: 0,
    totalStandardHours: 0,
    totalOtHours: 0,
    totalWarnings: 0,
    lockedCount: 0,
  };

  const departments = useMemo(() => {
    const set = new Set<string>();
    timesheetData.forEach((item) => {
      if (item.department) set.add(item.department);
    });
    return Array.from(set);
  }, [timesheetData]);

  // Mutations
  const updateTimesheetMutation = useMutation({
    mutationFn: (updated: TimesheetSummaryItem) => api.updateTimesheetSummary(updated),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      setInspectingItem(null);
      notify(`Đã cập nhật bảng công cho nhân viên: ${saved.employeeName}`, "success");
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const lockMutation = useMutation({
    mutationFn: (lock: boolean) => api.lockTimesheets(selectedProjectId, selectedPeriod, lock),
    onSuccess: (_, lock) => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      notify(lock ? "Đã khóa toàn bộ bảng công kỳ này" : "Đã mở khóa bảng công kỳ này", "success");
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const isAllLocked = meta.lockedCount > 0 && meta.lockedCount === meta.totalEmployees;

  const currentProjectName = useMemo(() => {
    if (selectedProjectId === "all") return "Tất cả dự án";
    return projects.find((p) => p.id === selectedProjectId)?.name || "Dự án";
  }, [selectedProjectId, projects]);

  const handleExportExcel = () => {
    if (timesheetData.length === 0) {
      notify("Không có dữ liệu bảng công để xuất Excel", "warning");
      return;
    }
    exportTimesheetSummaryToExcel(timesheetData, currentProjectName, selectedPeriod);
    notify("Đã tải xuống file Excel bảng tổng hợp công thành công", "success");
  };

  return (
    <div className="space-y-6">
      {/* Top Heading & Actions */}
      <div className="tab-heading">
        <div>
          <span className="section-kicker">TIME &amp; ATTENDANCE PLATFORM</span>
          <h2>Tổng hợp công</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Bảng chấm công tổng hợp theo dự án, bóc tách OCR từ phiếu scan chữ viết tay &amp; đối soát giờ tăng ca.
          </p>
        </div>

        <div className="heading-actions flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleExportExcel}
            className="gap-1.5"
            disabled={timesheetData.length === 0}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Xuất Excel</span>
          </Button>

          <Button
            variant={isAllLocked ? "secondary" : "primary"}
            disabled={lockMutation.isPending || timesheetData.length === 0}
            onClick={() => lockMutation.mutate(!isAllLocked)}
            className="gap-1.5"
          >
            {isAllLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            <span>{isAllLocked ? "Mở khóa kỳ công" : "Khóa bảng công"}</span>
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <article className="stat-card border border-border/80 bg-card/60 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng nhân sự có công</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {meta.totalEmployees}{" "}
            <span className="text-xs font-normal text-muted-foreground">người</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {meta.lockedCount}/{meta.totalEmployees} hồ sơ đã khóa công
          </p>
        </article>

        <article className="stat-card border border-border/80 bg-card/60 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng giờ công chuẩn</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {meta.totalStandardHours.toLocaleString("vi-VN")}{" "}
            <span className="text-xs font-normal text-muted-foreground">giờ</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Trung bình ~{meta.totalEmployees > 0 ? (meta.totalStandardHours / meta.totalEmployees).toFixed(1) : 0}h / nhân sự
          </p>
        </article>

        <article className="stat-card border border-border/80 bg-card/60 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng giờ tăng ca OT</span>
            <Layers className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
            +{meta.totalOtHours.toLocaleString("vi-VN")}{" "}
            <span className="text-xs font-normal text-muted-foreground">giờ</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Gồm OT ngày thường &amp; OT cuối tuần
          </p>
        </article>

        <article className="stat-card border border-border/80 bg-card/60 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cần kiểm tra / Đi trễ</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {meta.totalWarnings}{" "}
            <span className="text-xs font-normal text-muted-foreground">lượt</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Cần đối soát phiếu giải trình
          </p>
        </article>
      </div>

      {/* Main Content Workspace */}
      <section className="content-card space-y-4">
        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex flex-wrap items-center gap-3">
            {/* Project Select */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground">Dự án:</label>
              <select
                className="px-2.5 py-1.5 rounded-md border border-border text-xs bg-background font-medium focus:ring-1 focus:ring-primary"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                <option value="all">Tất cả dự án</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Period Select */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground">Kỳ công:</label>
              <select
                className="px-2.5 py-1.5 rounded-md border border-border text-xs bg-background font-medium"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="2026-09">Tháng 09/2026 (Hiện tại)</option>
                <option value="2026-08">Tháng 08/2026</option>
                <option value="2026-07">Tháng 07/2026</option>
              </select>
            </div>

            {/* Department Filter */}
            {departments.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-muted-foreground">Bộ phận:</label>
                <select
                  className="px-2.5 py-1.5 rounded-md border border-border text-xs bg-background font-medium"
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                >
                  <option value="all">Tất cả bộ phận</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2">
            <label className="search-field">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mã NV, tên, vị trí..."
                className="text-xs"
              />
            </label>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-border/80 pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("summary")}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "summary"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Bảng tổng hợp</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("matrix")}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "matrix"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Lưới chấm công 30 ngày</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ocr")}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "ocr"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Bóc tách Scan PDF (Gemini OCR)</span>
            </button>
          </div>

          <div className="text-xs text-muted-foreground">
            Hiển thị <strong>{timesheetData.length}</strong> nhân sự
          </div>
        </div>

        {/* Tab Contents */}
        {timesheetsQuery.isLoading ? (
          <LoadingBlock rows={8} />
        ) : timesheetsQuery.isError ? (
          <ErrorState
            message="Không thể tải dữ liệu bảng tổng hợp công."
            retry={() => timesheetsQuery.refetch()}
          />
        ) : timesheetData.length === 0 && activeTab !== "ocr" ? (
          <EmptyState
            title="Chưa có dữ liệu chấm công"
            description="Không tìm thấy bản ghi chấm công nào phù hợp với bộ lọc hiện tại. Bạn có thể sử dụng tính năng Bóc tách Scan OCR để nạp công tự động."
            action={
              <Button variant="primary" onClick={() => setActiveTab("ocr")} className="gap-1.5">
                <Sparkles className="w-4 h-4" /> Bóc tách bảng scan OCR
              </Button>
            }
          />
        ) : activeTab === "summary" ? (
          <TimesheetSummaryView
            items={timesheetData}
            onSelectEmployee={(item) => setInspectingItem(item)}
            onUpdateItem={(item) => updateTimesheetMutation.mutate(item)}
            isUpdating={updateTimesheetMutation.isPending}
          />
        ) : activeTab === "matrix" ? (
          <TimesheetMatrixView
            items={timesheetData}
            onSelectEmployee={(item) => setInspectingItem(item)}
          />
        ) : (
          <TimesheetOcrView
            projectId={selectedProjectId === "all" ? projects[0]?.id || "prj-jss" : selectedProjectId}
            projectName={currentProjectName}
            period={selectedPeriod}
            onSyncSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["timesheets"] });
              setActiveTab("summary");
            }}
          />
        )}
      </section>

      {/* Detail Day-by-day Modal */}
      <TimesheetDetailModal
        item={inspectingItem}
        open={Boolean(inspectingItem)}
        onClose={() => setInspectingItem(null)}
        onSave={(updated) => updateTimesheetMutation.mutate(updated)}
        isSaving={updateTimesheetMutation.isPending}
      />
    </div>
  );
}
