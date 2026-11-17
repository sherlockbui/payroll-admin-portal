"use client";

import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  Download,
  FileSpreadsheet,
  Upload,
  UploadCloud,
} from "lucide-react";
import React, { useRef, useState } from "react";
import { useToast } from "@/components/providers";
import { Button, Modal } from "@/components/ui";
import { api, ApiRequestError } from "@/lib/api";
import type { ImportEmployeeGroupErrorDto } from "@/lib/types";

interface ImportEmployeeGroupsModalProps {
  projectId: string | number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ImportEmployeeGroupsModal({
  projectId,
  isOpen,
  onClose,
  onSuccess,
}: ImportEmployeeGroupsModalProps) {
  const { notify } = useToast();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [importErrors, setImportErrors] = useState<ImportEmployeeGroupErrorDto[] | null>(null);
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setImportFile(null);
    setIsDragging(false);
    setImportErrors(null);
    setImportErrorMessage(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      await api.downloadEmployeeGroupTemplate(projectId);
      notify("Đã tải xuống biểu mẫu phân nhóm nhân sự của dự án!");
    } catch (err: any) {
      notify(err?.message || "Không thể tải biểu mẫu import", "error");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const importMutation = useMutation({
    mutationFn: (file: File) => api.importEmployeeGroupsExcel(projectId, file),
    onSuccess: (res) => {
      notify(res?.message || `Import hoàn tất thành công! Đã phân nhóm cho ${res?.successRows ?? res?.totalRows ?? 0} nhân sự.`);
      handleClose();
      onSuccess?.();
    },
    onError: (err: any) => {
      let errorList: ImportEmployeeGroupErrorDto[] = [];
      const message = err?.message || "Import thất bại";

      if (err instanceof ApiRequestError && err.details) {
        if (Array.isArray(err.details.errors)) {
          errorList = err.details.errors;
        } else if (Array.isArray(err.details)) {
          errorList = err.details;
        }
      }

      setImportErrors(errorList.length > 0 ? errorList : null);
      setImportErrorMessage(message);
      notify(message, "error");
    },
  });

  const handleStartImport = () => {
    if (!importFile) return;
    importMutation.mutate(importFile);
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      title="Import phân nhóm nhân sự từ Excel"
      description="Tải lên tệp danh sách phân nhóm nhân sự theo biểu mẫu chuẩn để cập nhật hàng loạt vào hệ thống."
      size="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Step 1: Download Template */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-100">
              1. Tải biểu mẫu Excel của dự án
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              File mẫu tự động điền danh mục nhóm đang kích hoạt của dự án. Cột &quot;Tên nhóm&quot; có sẵn danh sách chọn dropdown.
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
          <div className="font-semibold text-slate-800 dark:text-slate-100 mb-1.5">
            2. Chọn tệp dữ liệu đã điền
          </div>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) {
                setImportFile(file);
                setImportErrors(null);
                setImportErrorMessage(null);
              }
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
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setImportFile(file);
                setImportErrors(null);
                setImportErrorMessage(null);
              }}
              accept=".xlsx,.xls"
              className="hidden"
            />

            {importFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                <div className="text-left">
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {importFile.name}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                    {(importFile.size / 1024).toFixed(1)} KB • Bấm để chọn tệp khác
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-200">
                  Kéo thả tệp Excel vào đây hoặc bấm để chọn
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Chấp nhận file định dạng .xlsx, .xls tối đa 10MB
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Error List display if Import Failed (All-or-Nothing) */}
        {importErrors && importErrors.length > 0 && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-2">
            <div className="font-semibold text-rose-800 dark:text-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>{importErrorMessage || `Phát hiện ${importErrors.length} dòng lỗi trong file:`}</span>
              </div>
            </div>
            <p className="text-[11px] text-rose-700 dark:text-rose-300">
              Toàn bộ dữ liệu trong file đã bị hủy bỏ để đảm bảo tính toàn vẹn (All-or-Nothing). Vui lòng sửa các dòng lỗi chi tiết bên dưới và tải lên lại.
            </p>
            <div className="max-h-48 overflow-y-auto border border-rose-200 dark:border-rose-900/50 rounded-lg bg-white dark:bg-slate-900">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-rose-100/60 text-rose-900 border-b border-rose-200 font-semibold">
                    <th className="py-1.5 px-2 w-16 text-center">Dòng</th>
                    <th className="py-1.5 px-2">Mã NV</th>
                    <th className="py-1.5 px-2">Cột</th>
                    <th className="py-1.5 px-2">Giá trị</th>
                    <th className="py-1.5 px-2">Lỗi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100">
                  {importErrors.map((err, i) => (
                    <tr key={i} className="hover:bg-rose-50/50">
                      <td className="py-1 px-2 text-center font-mono font-bold text-rose-700">
                        #{err.row}
                      </td>
                      <td className="py-1 px-2 font-medium">
                        {err.employeeCode || "—"}
                      </td>
                      <td className="py-1 px-2 font-medium">
                        {err.column}
                      </td>
                      <td className="py-1 px-2 font-mono text-slate-600">
                        {err.value || <span className="italic text-muted-foreground/60">(Trống)</span>}
                      </td>
                      <td className="py-1 px-2 text-rose-700 dark:text-rose-400">
                        {err.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2.5">
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Hủy
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!importFile}
            loading={importMutation.isPending}
            onClick={handleStartImport}
            className="gap-1.5 font-semibold"
          >
            <Upload className="w-3.5 h-3.5" /> Bắt đầu Import
          </Button>
        </div>
      </div>
    </Modal>
  );
}
