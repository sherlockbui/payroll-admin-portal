"use client";

import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Play,
  RefreshCw,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/providers";
import { Badge, Button } from "@/components/ui";
import { api } from "@/lib/api";
import type { TimesheetOcrParsedItem } from "@/lib/types";
import { exportOcrResultsToExcel } from "./excel-export";

interface TimesheetOcrViewProps {
  projectId: string;
  projectName: string;
  period: string;
  onSyncSuccess: () => void;
}

// Sample OCR parsed items representing real-world scanned PDF with handwriting & overlapping signatures
const sampleOcrScanResults: TimesheetOcrParsedItem[] = [
  {
    stt: 1,
    ngay_lam_viec: "22/09/2026",
    ma_nv: "T289-0124",
    ten_nv: "NGUYỄN VĂN AN",
    bo_phan: "RAU & TCN",
    vi_tri: "GHÉP HÀNG",
    gio_den_du_kien: "08:00",
    gio_ve_du_kien: "17:00",
    gio_den_thuc_te: "07:50",
    gio_ve_thuc_te: "19:30", // Hand-written "19h30" overlapping signature
    gio_nghi_trua: "60p",
    ghi_chu: "Tăng ca 2.5h kho lạnh",
    status: "valid",
    validationMessage: "Khớp mã nhân sự & hợp lệ",
  },
  {
    stt: 2,
    ngay_lam_viec: "22/09/2026",
    ma_nv: "T289-0125",
    ten_nv: "TRẦN THỊ MAI",
    bo_phan: "RAU & TCN",
    vi_tri: "CÂN HÀNG",
    gio_den_du_kien: "08:00",
    gio_ve_du_kien: "17:00",
    gio_den_thuc_te: "07:55",
    gio_ve_thuc_te: "19:00", // Hand-written "19h"
    gio_nghi_trua: "60p",
    ghi_chu: null,
    status: "valid",
    validationMessage: "Khớp mã nhân sự & hợp lệ",
  },
  {
    stt: 3,
    ngay_lam_viec: "22/09/2026",
    ma_nv: "T099-0412",
    ten_nv: "LÊ HOÀNG NAM",
    bo_phan: "TCNK",
    vi_tri: "LÁI XE NÂNG",
    gio_den_du_kien: "08:00",
    gio_ve_du_kien: "17:00",
    gio_den_thuc_te: "07:45",
    gio_ve_thuc_te: "21:00", // Hand-written "21ha"
    gio_nghi_trua: "60p",
    ghi_chu: "Hỗ trợ bốc dỡ ca đêm",
    status: "valid",
    validationMessage: "Khớp mã nhân sự & hợp lệ",
  },
  {
    stt: 4,
    ngay_lam_viec: "22/09/2026",
    ma_nv: "VIN-0089",
    ten_nv: "PHẠM THỊ HÀ",
    bo_phan: "TCNK",
    vi_tri: "KIỂM HÀNG",
    gio_den_du_kien: "08:00",
    gio_ve_du_kien: "17:00",
    gio_den_thuc_te: "08:20", // Đi trễ
    gio_ve_thuc_te: "17:00", // "17h"
    gio_nghi_trua: "60p",
    ghi_chu: "Đi trễ 20 phút (kẹt xe)",
    status: "warning",
    validationMessage: "Đi trễ so với giờ dự kiến",
  },
  {
    stt: 5,
    ngay_lam_viec: "22/09/2026",
    ma_nv: "UNC-0452",
    ten_nv: "HOÀNG MINH ĐỨC",
    bo_phan: "KHO LẠNH",
    vi_tri: "BỐC XẾP",
    gio_den_du_kien: "08:00",
    gio_ve_du_kien: "17:00",
    gio_den_thuc_te: "08:00",
    gio_ve_thuc_te: "23:30", // Hand-written "23h30"
    gio_nghi_trua: "0p",
    ghi_chu: "Không nghỉ trưa - kết hết kho lạnh",
    status: "valid",
    validationMessage: "Khớp mã nhân sự & hợp lệ",
  },
  {
    stt: 6,
    ngay_lam_viec: "22/09/2026",
    ma_nv: "VEC-0911",
    ten_nv: "VŨ QUỐC BẢO",
    bo_phan: "KHO LẠNH",
    vi_tri: "THỦ KHO",
    gio_den_du_kien: "13:00",
    gio_ve_du_kien: "22:00",
    gio_den_thuc_te: "13:00",
    gio_ve_thuc_te: "00:00", // Hand-written "24:00" / "00h"
    gio_nghi_trua: "60p",
    ghi_chu: "VÀO CA 13H - trực đêm",
    status: "valid",
    validationMessage: "Khớp mã nhân sự & hợp lệ",
  },
  {
    stt: 7,
    ngay_lam_viec: "22/09/2026",
    ma_nv: "VPG-0331",
    ten_nv: "ĐỖ THỊ LAN",
    bo_phan: "ĐÓNG GÓI",
    vi_tri: "ĐÓNG GÓI",
    gio_den_du_kien: "08:00",
    gio_ve_du_kien: "17:00",
    gio_den_thuc_te: "08:00",
    gio_ve_thuc_te: "17:00",
    gio_nghi_trua: "60p",
    ghi_chu: "Đã làm sạch dấu tick ✓ trên scan",
    status: "valid",
    validationMessage: "Khớp mã nhân sự & hợp lệ",
  },
];

export function TimesheetOcrView({
  projectId,
  projectName,
  period,
  onSyncSuccess,
}: TimesheetOcrViewProps) {
  const { notify } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState<string>("Đang bóc tách...");
  const [ocrRecords, setOcrRecords] = useState<TimesheetOcrParsedItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return (
        window.localStorage.getItem("gs_gemini_api_key") ||
        process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
        ""
      );
    }
    return "";
  });
  const [showKey, setShowKey] = useState(false);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("gs_gemini_api_key", key.trim());
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleRunOcr = async (useSample = false) => {
    if (!useSample && !file) {
      notify("Vui lòng chọn file PDF scan bảng chấm công từ máy tính của bạn", "warning");
      return;
    }

    setIsProcessing(true);

    if (useSample) {
      setProgressStep("Đang nạp bộ dữ liệu scan mẫu...");
      setTimeout(() => {
        setIsProcessing(false);
        setProgressStep("");
        setOcrRecords(structuredClone(sampleOcrScanResults));
        notify(`Đã nạp thành công ${sampleOcrScanResults.length} bản ghi scan mẫu`, "success");
      }, 500);
      return;
    }

    try {
      setProgressStep("Đang tải file lên & Gemini 2.5 Flash đang bóc tách tất cả các trang scan...");
      const formData = new FormData();
      formData.append("file", file!);
      if (apiKey) {
        formData.append("apiKey", apiKey.trim());
      }

      const res = await fetch("/api/ocr/extract", {
        method: "POST",
        body: formData,
      });

      const json: any = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Lỗi khi gọi API Gemini OCR (Status 500)");
      }

      const records = json.data || [];
      setOcrRecords(records);
      notify(`Đã bóc tách thành công ${records.length} dòng nhân viên từ file scan thực tế!`, "success");
    } catch (err: any) {
      notify(err?.message || "Lỗi xử lý bóc tách file PDF", "error");
    } finally {
      setIsProcessing(false);
      setProgressStep("");
    }
  };

  const handleSyncToDatabase = async () => {
    if (ocrRecords.length === 0) return;
    setIsSyncing(true);
    try {
      const res = await api.importOcrTimesheet({
        projectId,
        period,
        records: ocrRecords,
      });
      notify(res.message, "success");
      onSyncSuccess();
    } catch (err: any) {
      notify(err?.message || "Lỗi khi đồng bộ dữ liệu vào hệ thống", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportExcel = () => {
    if (ocrRecords.length === 0) return;
    exportOcrResultsToExcel(ocrRecords, `${projectName}_${period}`);
    notify("Đã xuất file Excel kết quả OCR thành công", "success");
  };

  const handleCellEdit = (index: number, field: keyof TimesheetOcrParsedItem, value: any) => {
    setOcrRecords((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  return (
    <div className="space-y-6">
      {/* Upload & Processing Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 border-2 border-dashed border-border rounded-xl p-6 bg-card/60 flex flex-col items-center justify-center text-center hover:border-primary/60 transition-colors">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {file ? file.name : "Tải lên File PDF Scan Bảng Chấm Công"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mb-4">
            Hỗ trợ file PDF scan nhiều trang (10–40 dòng/trang), bóc tách chữ viết tay (19h, 23h30),
            tách chữ ký đè, làm sạch dấu tick (✓) và lọc dòng gạch xóa.
          </p>

          {/* API Key configuration input */}
          <div className="w-full max-w-md my-3 p-2.5 rounded-lg bg-muted/50 border border-border flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
              Gemini API Key:
            </span>
            <input
              type={showKey ? "text" : "password"}
              placeholder="Dán key AIzaSy... (hoặc đặt trong .env)"
              value={apiKey}
              onChange={(e) => handleSaveApiKey(e.target.value)}
              className="flex-1 px-2 py-1 text-xs border rounded bg-background font-mono focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground px-1"
            >
              {showKey ? "Ẩn" : "Hiện"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md bg-muted hover:bg-muted/80 text-xs font-medium text-foreground transition-colors">
              <FileText className="w-4 h-4 text-primary" />
              <span>{file ? "Chọn file khác" : "Chọn file PDF từ máy"}</span>
              <input type="file" accept=".pdf,image/*" onChange={handleFileChange} className="hidden" />
            </label>

            <Button
              variant="primary"
              disabled={isProcessing}
              onClick={() => handleRunOcr(false)}
              className="gap-1.5"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{isProcessing ? "Đang xử lý AI..." : "Chạy OCR với Gemini 3.6"}</span>
            </Button>

            <Button
              variant="secondary"
              disabled={isProcessing}
              onClick={() => handleRunOcr(true)}
              title="Thử nghiệm ngay với tài liệu scan thực tế mẫu"
              className="gap-1.5 border-dashed"
            >
              <Play className="w-3.5 h-3.5 text-emerald-600" />
              <span>Thử ngay bộ scan mẫu</span>
            </Button>
          </div>

          {isProcessing && (
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full animate-pulse">
              <Cpu className="w-4 h-4" />
              <span>{progressStep}</span>
            </div>
          )}
        </div>

        {/* Technology Specs Card */}
        <div className="border border-border rounded-xl p-5 bg-card/40 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Mô hình &amp; Thuật toán
              </h4>
            </div>
            <ul className="text-xs space-y-2 text-muted-foreground">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Google Gemini 3.6 Flash:</strong> Multimodal Vision OCR tốc độ cao
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Google File API:</strong> Xử lý PDF lớn không tràn RAM
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Structured JSON Schema:</strong> Bắt buộc kiểu dữ liệu 100%
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Visual Layer Separation:</strong> Bóc tách chữ số khỏi nét chữ ký
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">CLI Script độc lập:</span>
            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">
              node scripts/ocr/extract.js
            </span>
          </div>
        </div>
      </div>

      {/* OCR Results Section */}
      {ocrRecords.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-foreground">
                Kết quả bóc tách: {ocrRecords.length} dòng nhân viên
              </span>
              <Badge tone="success">
                {ocrRecords.filter((r) => r.status === "valid").length} Hợp lệ
              </Badge>
              {ocrRecords.filter((r) => r.status === "warning").length > 0 && (
                <Badge tone="warning">
                  {ocrRecords.filter((r) => r.status === "warning").length} Cần kiểm tra
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={handleExportExcel} className="gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Xuất Excel (.xlsx)</span>
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={isSyncing}
                onClick={handleSyncToDatabase}
                className="gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isSyncing ? "Đang đồng bộ..." : "Đồng bộ vào Bảng Tổng Hợp"}</span>
              </Button>
            </div>
          </div>

          <div className="data-table-wrap overflow-hidden border border-border rounded-lg shadow-sm">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-xs text-left border-collapse min-w-[950px]">
                <thead className="sticky top-0 bg-muted/95 backdrop-blur-sm text-muted-foreground border-b border-border font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">STT</th>
                    <th className="py-2.5 px-3">Ngày làm việc</th>
                    <th className="py-2.5 px-3">Mã NV</th>
                    <th className="py-2.5 px-3 min-w-[170px]">Tên nhân viên</th>
                    <th className="py-2.5 px-3">Bộ phận</th>
                    <th className="py-2.5 px-3">Vị trí</th>
                    <th className="py-2.5 px-3">Giờ đến TT</th>
                    <th className="py-2.5 px-3">Giờ về TT (Bóc tách)</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Ghi chú trích xuất</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ocrRecords.map((rec, index) => (
                    <tr key={index} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 text-center font-mono text-muted-foreground">
                        {rec.stt ?? index + 1}
                      </td>
                      <td className="py-2 px-3 font-mono">{rec.ngay_lam_viec}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-foreground">
                        <input
                          type="text"
                          className="w-24 px-1 py-0.5 border rounded text-xs font-mono bg-background"
                          value={rec.ma_nv}
                          onChange={(e) => handleCellEdit(index, "ma_nv", e.target.value)}
                        />
                      </td>
                      <td className="py-2 px-3 font-medium">
                        <input
                          type="text"
                          className="w-full px-1 py-0.5 border rounded text-xs font-semibold bg-background"
                          value={rec.ten_nv}
                          onChange={(e) => handleCellEdit(index, "ten_nv", e.target.value)}
                        />
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{rec.bo_phan}</td>
                      <td className="py-2 px-3 text-muted-foreground">{rec.vi_tri}</td>
                      <td className="py-2 px-3 font-mono">
                        <input
                          type="text"
                          className="w-16 px-1 py-0.5 border rounded text-xs font-mono bg-background"
                          value={rec.gio_den_thuc_te || ""}
                          onChange={(e) => handleCellEdit(index, "gio_den_thuc_te", e.target.value)}
                        />
                      </td>
                      <td className="py-2 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        <input
                          type="text"
                          className="w-16 px-1 py-0.5 border rounded text-xs font-mono font-bold text-emerald-600 bg-background"
                          value={rec.gio_ve_thuc_te || ""}
                          onChange={(e) => handleCellEdit(index, "gio_ve_thuc_te", e.target.value)}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          className="w-full px-1 py-0.5 border rounded text-xs text-muted-foreground bg-background"
                          value={rec.ghi_chu || ""}
                          onChange={(e) => handleCellEdit(index, "ghi_chu", e.target.value)}
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        {rec.status === "valid" ? (
                          <Badge tone="success">Hợp lệ</Badge>
                        ) : (
                          <span title={rec.validationMessage}>
                            <Badge tone="warning">Lệch giờ</Badge>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
