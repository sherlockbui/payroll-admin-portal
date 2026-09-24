#!/usr/bin/env node

/**
 * ==============================================================================
 * TOOL BÓC TÁCH BẢNG CHẤM CÔNG SCAN PDF BẰNG GEMINI 2.5 FLASH & XUẤT FILE EXCEL
 * ==============================================================================
 *
 * Cú pháp chạy:
 *   node scripts/ocr/extract.js <duong_dan_file_pdf> [ten_file_excel_xuat.xlsx]
 *
 * Yêu cầu:
 *   - GEMINI_API_KEY trong file .env hoặc biến môi trường hệ thống.
 *   - Node.js >= 22.13.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

// Load environment variables from .env
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

function printUsage() {
  console.log(`
\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m
  \x1b[1m\x1b[32mTOOL OCR BẢNG CHẤM CÔNG SCAN (GEMINI API 2.5 FLASH) -> EXCEL\x1b[0m
\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m

  \x1b[1mCú pháp:\x1b[0m
    node scripts/ocr/extract.js <duong_dan_file_pdf> [ten_file_excel_xuat.xlsx]

  \x1b[1mVí dụ:\x1b[0m
    node scripts/ocr/extract.js ./bang_cham_cong_ngay_22_09.pdf
    node scripts/ocr/extract.js ./scan_swm.pdf ./Ket_Qua_Cham_Cong_SWM.xlsx

  \x1b[1mYêu cầu môi trường:\x1b[0m
    Tạo file .env chứa: GEMINI_API_KEY=AIzaSy...
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  if (!apiKey) {
    console.error("\x1b[31m[LỖI] Chưa cấu hình GEMINI_API_KEY trong file .env hoặc biến môi trường!\x1b[0m");
    console.error("Vui lòng lấy API key tại https://aistudio.google.com/app/apikey và gán vào .env\n");
    process.exit(1);
  }

  const inputPdfPath = path.resolve(process.cwd(), args[0]);

  if (!fs.existsSync(inputPdfPath)) {
    console.error(`\x1b[31m[LỖI] Không tìm thấy file PDF tại đường dẫn: ${inputPdfPath}\x1b[0m`);
    process.exit(1);
  }

  const defaultOutputName = `Bang_Cham_Cong_OCR_${path.basename(inputPdfPath, path.extname(inputPdfPath))}.xlsx`;
  const outputExcelPath = args[1]
    ? path.resolve(process.cwd(), args[1].endsWith(".xlsx") ? args[1] : `${args[1]}.xlsx`)
    : path.resolve(process.cwd(), defaultOutputName);

  console.log("\x1b[34m[1/4] Khởi tạo Google Gen AI Client...\x1b[0m");
  const ai = new GoogleGenAI({ apiKey });

  let uploadedFile = null;

  try {
    const fileStats = fs.statSync(inputPdfPath);
    const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
    console.log(`\x1b[34m[2/4] Tải file PDF lên Google File API (${fileSizeMB} MB)...\x1b[0m`);
    console.log(`      File: ${inputPdfPath}`);

    uploadedFile = await ai.files.upload({
      file: inputPdfPath,
      config: {
        mimeType: "application/pdf",
      },
    });

    console.log(`      Upload thành công! Resource ID: \x1b[32m${uploadedFile.name}\x1b[0m`);

    console.log("\x1b[34m[3/4] Gọi mô hình gemini-2.5-flash bóc tách dữ liệu bảng biểu & chữ viết tay...\x1b[0m");

    const systemPrompt = `
Bạn là một chuyên gia OCR cao cấp và Kế toán tiền lương (C&B Specialist) với khả năng đọc và bóc tách tài liệu scan chấm công phức tạp hàng đầu.

NHIỆM VỤ:
Đọc toàn bộ các trang trong tài liệu PDF scan bảng chấm công hàng ngày được cung cấp và trích xuất danh sách tất cả nhân viên thành mảng JSON có cấu trúc chuẩn.

CÁC QUY TẮC BÓC TÁCH & CHUẨN HÓA BẮT BUỘC:
1. Phân tách thị giác (Visual Layer Separation) giữa Giờ về thực tế và Ký nhận:
   - Cột "Giờ về thực tế" và "Kí nhận" thường bị viết tay đè lên nhau hoặc viết tắt.
   - Hãy trích xuất CHÍNH XÁC giờ về thực tế (loại bỏ hoàn toàn nét chữ ký của nhân viên).
   - Chuẩn hóa mọi định dạng viết tay sang định dạng 24h 'HH:mm':
     * '19h' -> '19:00'
     * '19h30' -> '19:30'
     * '21ha' -> '21:00'
     * '23h30' -> '23:30'
     * '24:00' hoặc '00h' -> '00:00'
     * '17h' -> '17:00'
     * '7h30' -> '07:30'
2. Chuẩn hóa Mã nhân viên (ma_nv):
   - Nhận diện chính xác các tiền tố: 'T289-xxxxx', 'T099-xxxxx', 'VIN-xxxxx', 'UNCxxxxx', 'VECxxxxx', 'VPGxxxxx'...
   - Không để sót hoặc dính khoảng trắng thừa giữa mã.
3. Chuẩn hóa Tên nhân viên (ten_nv):
   - Viết in hoa đầy đủ họ và tên.
   - Loại bỏ các dấu tick kiểm tra ('✓', '✔'), dấu gạch bút mực hoặc ký tự rác.
4. Ngày làm việc (ngay_lam_viec):
   - Chuẩn hóa về định dạng 'DD/MM/YYYY' (ví dụ: '22/09/2026'). Nếu ngày chỉ ghi ở đầu bảng, áp dụng đồng nhất cho các dòng thuộc ngày đó.
5. Quy tắc loại trừ:
   - BỎ QUA tuyệt đối các dòng STT bị để trống (không có thông tin người đi làm).
   - BỎ QUA các dòng có nét bút gạch xóa ngang toàn bộ dòng.
6. Ghi chú (ghi_chu):
   - Ghi nhận các nội dung như: "VÀO CA 13H", "Không nghỉ trưa", "kết hết kho lạnh", "Hỗ trợ ca đêm"... Nếu không có ghi chú, trả về null.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        uploadedFile,
        {
          text: systemPrompt,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "Danh sách bản ghi chấm công nhân viên đã chuẩn hóa từ tài liệu scan",
          items: {
            type: Type.OBJECT,
            properties: {
              stt: {
                type: Type.INTEGER,
                description: "Số thứ tự dòng trong bảng",
              },
              ngay_lam_viec: {
                type: Type.STRING,
                description: "Ngày làm việc định dạng DD/MM/YYYY",
              },
              ma_nv: {
                type: Type.STRING,
                description: "Mã nhân viên chuẩn hóa, không có khoảng trắng thừa",
              },
              ten_nv: {
                type: Type.STRING,
                description: "Họ và tên viết hoa, loại bỏ ký tự rác hoặc dấu tick ✓",
              },
              bo_phan: {
                type: Type.STRING,
                description: "Bộ phận (ví dụ: RAU & TCN, TCNK, KHO LẠNH...)",
              },
              vi_tri: {
                type: Type.STRING,
                description: "Vị trí làm việc (ví dụ: GHÉP HÀNG, CÂN HÀNG, LÁI XE NÂNG...)",
              },
              gio_den_thuc_te: {
                type: Type.STRING,
                description: "Giờ đến thực tế chuẩn hóa HH:mm (ví dụ: 07:50, 08:00)",
              },
              gio_ve_thuc_te: {
                type: Type.STRING,
                description: "Giờ về thực tế bóc tách từ chữ viết tay & chữ ký, chuẩn hóa HH:mm",
              },
              ghi_chu: {
                type: Type.STRING,
                nullable: true,
                description: "Ghi chú nếu có, null nếu không có",
              },
            },
            required: ["ngay_lam_viec", "ma_nv", "ten_nv", "gio_den_thuc_te", "gio_ve_thuc_te"],
          },
        },
      },
    });

    const rawJsonText = response.text?.trim() || "[]";
    let records = [];

    try {
      records = JSON.parse(rawJsonText);
    } catch (parseErr) {
      console.error("\x1b[31m[LỖI] Không thể parse kết quả JSON từ mô hình:\x1b[0m", parseErr);
      console.log("Raw Response:\n", rawJsonText);
      process.exit(1);
    }

    console.log(`      Bóc tách hoàn tất! Tìm thấy \x1b[32m${records.length}\x1b[0m bản ghi nhân viên hợp lệ.`);

    console.log("\x1b[34m[4/4] Đang ghi dữ liệu sang file Excel (.xlsx)...\x1b[0m");

    // Convert to Excel Sheet
    const excelRows = records.map((r, i) => ({
      STT: r.stt || i + 1,
      "Ngày làm việc": r.ngay_lam_viec || "",
      "Mã NV": r.ma_nv || "",
      "Tên nhân viên": r.ten_nv || "",
      "Bộ phận": r.bo_phan || "",
      "Vị trí": r.vi_tri || "",
      "Giờ đến thực tế": r.gio_den_thuc_te || "",
      "Giờ về thực tế": r.gio_ve_thuc_te || "",
      "Ghi chú": r.ghi_chu || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);

    // Auto-fit column widths
    worksheet["!cols"] = [
      { wch: 6 },  // STT
      { wch: 15 }, // Ngày làm việc
      { wch: 16 }, // Mã NV
      { wch: 28 }, // Tên nhân viên
      { wch: 18 }, // Bộ phận
      { wch: 20 }, // Vị trí
      { wch: 18 }, // Giờ đến thực tế
      { wch: 18 }, // Giờ về thực tế
      { wch: 35 }, // Ghi chú
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BangChamCong");

    XLSX.writeFile(workbook, outputExcelPath);

    console.log(`
\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m
  \x1b[1m\x1b[32m✔ XUẤT FILE EXCEL THÀNH CÔNG!\x1b[0m
\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m
  \x1b[1m📁 File đầu ra:\x1b[0m  \x1b[36m${outputExcelPath}\x1b[0m
  \x1b[1m📊 Tổng số dòng:\x1b[0m \x1b[32m${records.length} nhân viên\x1b[0m
`);
  } catch (error) {
    console.error("\x1b[31m[LỖI THỰC THI]:\x1b[0m", error);
    process.exit(1);
  } finally {
    // Clean up temporary file on Google Cloud File API
    if (uploadedFile?.name) {
      try {
        console.log(`\x1b[90m[Dọn dẹp] Xóa file tạm trên Google Cloud Storage (${uploadedFile.name})...\x1b[0m`);
        await ai.files.delete({ name: uploadedFile.name });
        console.log(`\x1b[90m[Dọn dẹp] Đã dọn dẹp tài nguyên thành công.\x1b[0m`);
      } catch (cleanErr) {
        console.warn(`\x1b[33m[Cảnh báo] Không thể xóa file tạm trên Google Cloud:\x1b[0m`, cleanErr?.message || cleanErr);
      }
    }
  }
}

main();
