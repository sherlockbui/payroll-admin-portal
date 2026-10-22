"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Award,
  Download,
  FileSpreadsheet,
  Percent,
  RefreshCw,
  Upload,
  UploadCloud,
  Users,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  EvaluationListItemDto,
  ImportErrorDto,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface EvaluationsSubtabProps {
  projectId?: string;
  setHeaderAction?: (action: ReactNode) => void;
}

export function EvaluationsSubtab({
  projectId,
  setHeaderAction,
}: EvaluationsSubtabProps) {
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [keyword, setKeyword] = useState<string>("");
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Debounce search keyword
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [keyword]);

  const effectiveProjectId = projectId && projectId !== "all" ? Number(projectId) : null;

  const ensureSpecificProject = (actionName: string = "thao tác này") => {
    if (!effectiveProjectId) {
      notify(`Vui lòng chọn một dự án cụ thể ở thanh công cụ phía trên trước khi ${actionName}!`, "warning");
      return false;
    }
    return true;
  };

  // Main Query: Get evaluations list
  const {
    data: pagedData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "evaluations",
      effectiveProjectId,
      selectedMonth,
      selectedYear,
      debouncedKeyword,
      currentPage,
      pageSize,
    ],
    queryFn: () => {
      if (!effectiveProjectId) return Promise.resolve({ items: [], totalRow: 0, pageIndex: 1, pageSize: 20 });
      return api.getEvaluations({
        projectId: effectiveProjectId,
        month: selectedMonth,
        year: selectedYear,
        keyword: debouncedKeyword,
        pageIndex: currentPage,
        pageSize,
      });
    },
    enabled: Boolean(effectiveProjectId),
  });

  const rawItems: EvaluationListItemDto[] = pagedData?.items || [];
  const totalRow = pagedData?.totalRow || 0;

  // Extract unique evaluation type columns dynamically from response
  const dynamicEvalColumns = useMemo(() => {
    const map = new Map<string, { evalName: string; evaluationTypeId?: number }>();
    rawItems.forEach((item) => {
      (item.details || []).forEach((d) => {
        if (d.evalName && !map.has(d.evalName)) {
          map.set(d.evalName, {
            evalName: d.evalName,
            evaluationTypeId: d.evaluationTypeId,
          });
        }
      });
    });
    return Array.from(map.values());
  }, [rawItems]);

  // Statistical calculations for KPI summary cards
  const stats = useMemo(() => {
    const totalEmployees = totalRow;
    let sumActual = 0;
    let actualCount = 0;
    let excellentCount = 0;
    let needImprovementCount = 0;

    rawItems.forEach((item) => {
      (item.details || []).forEach((d) => {
        if (d.actual !== null && d.actual !== undefined) {
          const val = d.actual <= 1 ? d.actual * 100 : d.actual;
          sumActual += val;
          actualCount++;
          if (val >= 100) excellentCount++;
          if (val < 80) needImprovementCount++;
        }
      });
    });

    const avgActual = actualCount > 0 ? (sumActual / actualCount).toFixed(1) : "—";

    return {
      totalEmployees,
      avgActual,
      excellentCount,
      needImprovementCount,
    };
  }, [rawItems, totalRow]);

  // Import Modal & Template Download State (Synchronized Pattern)
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [importMonth, setImportMonth] = useState<number>(selectedMonth);
  const [importYear, setImportYear] = useState<number>(selectedYear);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<ImportErrorDto[]>([]);

  // Download template handler (using authenticated Blob download)
  const handleDownloadTemplate = async () => {
    if (!ensureSpecificProject("tải biểu mẫu Excel")) return;
    try {
      setDownloadingTemplate(true);
      await api.downloadEvaluationTemplate(effectiveProjectId!);
      notify("Đã tải xuống biểu mẫu import đánh giá KPI (.xlsx)");
    } catch (err: any) {
      notify(err.message || "Không thể tải file mẫu. Vui lòng thử lại sau.", "error");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleOpenImport = () => {
    if (!ensureSpecificProject("import đánh giá KPI")) return;
    setImportFile(null);
    setImportErrors([]);
    setImportMonth(selectedMonth);
    setImportYear(selectedYear);
    setImportModalOpen(true);
  };

  const handleExecuteImport = async () => {
    if (!importFile) {
      notify("Vui lòng chọn tệp Excel trước khi thực hiện!", "warning");
      return;
    }
    if (!effectiveProjectId) return;

    setImporting(true);
    setImportErrors([]);

    try {
      const res = await api.importEvaluations({
        file: importFile,
        projectId: effectiveProjectId,
        month: importMonth,
        year: importYear,
      });

      notify(`Import thành công ${res.successRows}/${res.totalRows} bản ghi đánh giá KPI!`);
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      setSelectedMonth(importMonth);
      setSelectedYear(importYear);
      setImportModalOpen(false);
      setImportFile(null);
    } catch (err: any) {
      if (err.errorData?.errors && Array.isArray(err.errorData.errors)) {
        setImportErrors(err.errorData.errors);
        notify(err.message || "File import có dòng bị lỗi dữ liệu.", "error");
      } else {
        notify(err.message || "Import file đánh giá KPI thất bại.", "error");
      }
    } finally {
      setImporting(false);
    }
  };

  // Sync Header Actions (Synchronized Pattern matching other subtabs)
  useEffect(() => {
    if (!setHeaderAction) return;
    setHeaderAction(
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => refetch()}
          className="gap-1.5 font-medium shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Làm mới
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleOpenImport}
          className="gap-1.5 font-medium shrink-0"
        >
          <UploadCloud className="w-3.5 h-3.5 text-primary" /> Import Excel
        </Button>
      </div>
    );
    return () => {
      if (setHeaderAction) setHeaderAction(null);
    };
  }, [setHeaderAction, effectiveProjectId, selectedMonth, selectedYear, refetch]);

  // Format Actual % helper
  const formatActualPercent = (val: number | null | undefined): { text: string; tone: "success" | "info" | "warning" | "danger" | "neutral" } => {
    if (val === null || val === undefined) return { text: "—", tone: "neutral" };
    const pct = val <= 1 ? val * 100 : val;
    const rounded = Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(1);

    if (pct >= 100) return { text: `${rounded}%`, tone: "success" };
    if (pct >= 80) return { text: `${rounded}%`, tone: "info" };
    if (pct >= 60) return { text: `${rounded}%`, tone: "warning" };
    return { text: `${rounded}%`, tone: "danger" };
  };

  // Format Grade Tone helper
  const getGradeTone = (grade: string | null | undefined): "success" | "info" | "warning" | "danger" | "neutral" => {
    if (!grade) return "neutral";
    const g = grade.trim().toUpperCase();
    if (g === "A" || g.includes("XUẤT SẮC") || g.includes("XUAT SAC") || g.includes("TỐT") || g.includes("TOT") || g.includes("HOÀN THÀNH")) {
      return "success";
    }
    if (g === "B" || g.includes("KHÁ") || g.includes("KHA") || g.includes("ĐẠT") || g.includes("DAT")) {
      return "info";
    }
    if (g === "C" || g.includes("TRUNG BÌNH") || g.includes("TRUNG BINH")) {
      return "warning";
    }
    return "danger";
  };

  return (
    <div className="space-y-4">
      {/* Control Toolbar */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month & Year Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-medium text-slate-500 pl-2">Kỳ:</span>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-7 text-xs px-2 py-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded font-semibold text-slate-800 dark:text-slate-200 cursor-pointer min-h-0"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-7 text-xs px-2 py-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded font-semibold text-slate-800 dark:text-slate-200 cursor-pointer min-h-0"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input on the right */}
        <div className="w-64 sm:w-72">
          <SearchInput
            value={keyword}
            onChange={setKeyword}
            placeholder="Tìm mã hoặc tên nhân sự..."
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* 3. Main Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {!effectiveProjectId ? (
          <div className="py-16">
            <EmptyState
              title="Vui lòng chọn dự án"
              description="Chọn một dự án ở thanh công cụ phía trên để xem và quản lý kết quả đánh giá KPI."
            />
          </div>
        ) : isLoading ? (
          <div className="py-12 px-4">
            <LoadingBlock rows={6} />
          </div>
        ) : isError ? (
          <div className="py-12 px-4">
            <ErrorState
              message={(error as any)?.message || "Không thể tải danh sách đánh giá KPI"}
              retry={() => refetch()}
            />
          </div>
        ) : rawItems.length === 0 ? (
          <div className="py-16">
            <EmptyState
              title={`Chưa có dữ liệu đánh giá KPI Tháng ${selectedMonth}/${selectedYear}`}
              description="Chưa có bản ghi đánh giá nào trong kỳ này. Bạn có thể sử dụng tính năng Import Excel để nạp dữ liệu."
              action={
                <div className="flex items-center gap-2 mt-2">
                  <Button variant="secondary" size="sm" onClick={handleOpenImport} className="gap-1.5 text-xs font-semibold">
                    <UploadCloud className="w-3.5 h-3.5 text-primary" /> Import Excel
                  </Button>
                </div>
              }
            />
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  {/* Row 1: Main Column Headers & Group Headers */}
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold">
                    <th rowSpan={2} className="py-2.5 px-3 w-12 text-center border-r border-slate-200 dark:border-slate-700">
                      STT
                    </th>
                    <th rowSpan={2} className="py-2.5 px-3 w-28 border-r border-slate-200 dark:border-slate-700">
                      Mã nhân viên
                    </th>
                    <th rowSpan={2} className="py-2.5 px-3 min-w-[180px] border-r border-slate-200 dark:border-slate-700">
                      Tên nhân viên
                    </th>
                    <th rowSpan={2} className="py-2.5 px-3 min-w-[130px] border-r border-slate-200 dark:border-slate-700">
                      Chức vụ / Vị trí
                    </th>
                    <th rowSpan={2} className="py-2.5 px-3 w-20 text-center border-r border-slate-200 dark:border-slate-700">
                      Kỳ ĐG
                    </th>

                    {/* Dynamic Evaluation Group Headers */}
                    {dynamicEvalColumns.map((col) => (
                      <th
                        key={col.evalName}
                        colSpan={2}
                        className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold"
                      >
                        {col.evalName}
                      </th>
                    ))}

                    <th rowSpan={2} className="py-2.5 px-3 min-w-[140px]">
                      Ghi chú
                    </th>
                  </tr>

                  {/* Row 2: Sub-headers (% Thực đạt, Xếp loại) */}
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/50 text-[11px] text-slate-600 dark:text-slate-400">
                    {dynamicEvalColumns.map((col) => (
                      <React.Fragment key={`${col.evalName}-sub`}>
                        <th className="py-1.5 px-2.5 text-center font-medium border-r border-slate-200 dark:border-slate-700 w-24">
                          % thực đạt
                        </th>
                        <th className="py-1.5 px-2.5 text-center font-medium border-r border-slate-200 dark:border-slate-700 w-24">
                          Xếp loại
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rawItems.map((item, idx) => {
                    const stt = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr
                        key={item.id || `${item.employeeCode}-${idx}`}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* STT */}
                        <td className="py-2.5 px-3 text-center text-slate-400 border-r border-slate-100 dark:border-slate-800 font-mono">
                          {stt}
                        </td>

                        {/* Mã nhân viên */}
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800">
                          {item.employeeCode}
                        </td>

                        {/* Tên nhân viên */}
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800">
                          {item.employeeName}
                        </td>

                        {/* Chức vụ */}
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                          {item.positionName || "—"}
                        </td>

                        {/* Kỳ đánh giá */}
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                          {String(item.month).padStart(2, "0")}/{item.year}
                        </td>

                        {/* Dynamic Evaluation Columns */}
                        {dynamicEvalColumns.map((col) => {
                          const detail = (item.details || []).find((d) => d.evalName === col.evalName);
                          const formattedActual = formatActualPercent(detail?.actual);
                          const gradeTone = getGradeTone(detail?.grade);

                          return (
                            <React.Fragment key={`${item.id}-${col.evalName}`}>
                              {/* % Thực đạt */}
                              <td className="py-2.5 px-2.5 text-center border-r border-slate-100 dark:border-slate-800 font-mono">
                                {detail?.actual !== null && detail?.actual !== undefined ? (
                                  <span
                                    className={cn(
                                      "inline-flex items-center px-2 py-0.5 rounded font-bold text-xs",
                                      formattedActual.tone === "success" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
                                      formattedActual.tone === "info" && "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
                                      formattedActual.tone === "warning" && "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
                                      formattedActual.tone === "danger" && "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                    )}
                                  >
                                    {formattedActual.text}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>

                              {/* Xếp loại */}
                              <td className="py-2.5 px-2.5 text-center border-r border-slate-100 dark:border-slate-800">
                                {detail?.grade ? (
                                  <Badge tone={gradeTone}>{detail.grade}</Badge>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            </React.Fragment>
                          );
                        })}

                        {/* Ghi chú */}
                        <td className="py-2.5 px-3 text-slate-500 truncate max-w-[200px]" title={item.note || ""}>
                          {item.note || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <TablePaginationFooter
              totalItems={totalRow}
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

      {/* ================= MODAL: IMPORT EXCEL (SYNCHRONIZED WIZARD) ================= */}
      <Modal
        open={importModalOpen}
        onOpenChange={(open) => {
          setImportModalOpen(open);
          if (!open) {
            setImportFile(null);
            setIsDragging(false);
            setImportErrors([]);
          }
        }}
        title="Import danh sách Đánh giá KPI từ Excel"
        description="Tải lên tệp đánh giá hiệu quả công việc và kết quả KPI của nhân viên theo biểu mẫu chuẩn để cập nhật hàng loạt."
        size="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Kỳ đánh giá áp dụng */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
            <div className="font-semibold text-slate-800 dark:text-slate-100">Kỳ đánh giá áp dụng:</div>
            <div className="flex items-center gap-2">
              <select
                value={importMonth}
                onChange={(e) => setImportMonth(Number(e.target.value))}
                className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
              <select
                value={importYear}
                onChange={(e) => setImportYear(Number(e.target.value))}
                className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    Năm {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 1: Download Template */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-100">1. Tải biểu mẫu Excel chuẩn</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Sử dụng tệp mẫu để đảm bảo đúng định dạng các cột tiêu chí đánh giá KPI của dự án.
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
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${isDragging
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

          {/* Error List Breakdown Table (if 400 validation error) */}
          {importErrors.length > 0 && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2">
              <div className="font-bold text-rose-700 dark:text-rose-300 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Có {importErrors.length} dòng dữ liệu không hợp lệ trong file Excel:</span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1 text-[11px]">
                {importErrors.map((err, i) => (
                  <div key={i} className="p-1.5 bg-white dark:bg-slate-900 rounded border border-rose-200 dark:border-rose-900 flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-rose-600">Dòng {err.row} {err.column ? `(Cột ${err.column})` : ""}</span>: {err.message}
                    </div>
                    {err.value && (
                      <span className="font-mono text-muted-foreground shrink-0">Giá trị: "{err.value}"</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setImportModalOpen(false);
                setImportFile(null);
                setImportErrors([]);
              }}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!importFile}
              loading={importing}
              onClick={handleExecuteImport}
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
