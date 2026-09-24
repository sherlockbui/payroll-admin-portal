import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

export async function POST(req: NextRequest) {
  // Reload .env dynamically so user doesn't need to restart dev server after editing .env
  dotenv.config();

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userApiKey = formData.get("apiKey") as string | null;

    const apiKey =
      userApiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey || apiKey === "your_gemini_api_key_here" || apiKey.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Chưa cấu hình GEMINI_API_KEY! Vui lòng dán API Key vào ô trên giao diện hoặc trong file .env.",
        },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy file PDF được tải lên." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

    // Convert file to Base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");

    const systemPrompt = `
Bạn là chuyên gia OCR tài liệu bảng chấm công và Kế toán C&B.

NHIỆM VỤ:
Đọc tất cả các trang PDF scan bảng chấm công được cung cấp và trích xuất danh sách nhân viên thành JSON chuẩn.

QUY TẮC BÓC TÁCH BẮT BUỘC:
1. Bóc tách chính xác "Giờ về thực tế" khỏi nét chữ ký đè lên nhau.
   Chuẩn hóa mọi dạng viết tay sang định dạng 24h 'HH:mm':
   - '19h' -> '19:00'
   - '19h30' -> '19:30'
   - '21ha' -> '21:00'
   - '23h30' -> '23:30'
   - '24:00' hoặc '00h' -> '00:00'
   - '17h' -> '17:00'
   - '7h30' -> '07:30'
2. Chuẩn hóa Mã NV (ví dụ: 'T289-02615', 'T289-01938', 'VIN-SD00067', 'T099-03539', 'UNC001777', 'VEC000433', 'VPG001578'...).
3. Tên NV: Viết hoa đầy đủ họ tên, loại bỏ ký tự rác hoặc dấu tick ✓.
4. Ngày làm việc: DD/MM/YYYY (ví dụ '22/09/2026').
5. Quy tắc loại trừ:
   - BỎ QUA các dòng trống không có tên nhân viên.
   - BỎ QUA các dòng bị gạch xóa ngang toàn bộ dòng (ví dụ STT 70).
6. Ghi chú: Ghi nhận thông tin nếu có (ví dụ 'VÀO CA 13H', 'Không nghỉ trưa', 'kết hết kho lạnh'...), null nếu không có.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          inlineData: {
            mimeType: file.type || "application/pdf",
            data: base64Data,
          },
        },
        {
          text: systemPrompt,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              stt: { type: Type.INTEGER },
              ngay_lam_viec: { type: Type.STRING },
              ma_nv: { type: Type.STRING },
              ten_nv: { type: Type.STRING },
              bo_phan: { type: Type.STRING },
              vi_tri: { type: Type.STRING },
              gio_den_thuc_te: { type: Type.STRING },
              gio_ve_thuc_te: { type: Type.STRING },
              ghi_chu: { type: Type.STRING, nullable: true },
            },
            required: ["ngay_lam_viec", "ma_nv", "ten_nv", "gio_den_thuc_te", "gio_ve_thuc_te"],
          },
        },
      },
    });

    let rawJsonText = response.text?.trim() || "[]";
    if (rawJsonText.startsWith("```json")) {
      rawJsonText = rawJsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (rawJsonText.startsWith("```")) {
      rawJsonText = rawJsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const records = JSON.parse(rawJsonText);

    // Format & validate records
    const formattedRecords = records.map((r: any, index: number) => ({
      ...r,
      stt: r.stt || index + 1,
      status: "valid",
    }));

    return NextResponse.json({
      success: true,
      data: formattedRecords,
      count: formattedRecords.length,
      message: `Đã bóc tách thành công ${formattedRecords.length} dòng nhân viên từ file scan PDF.`,
    });
  } catch (error: any) {
    console.error("Lỗi OCR Route:", error);
    const errorMessage = error?.message || String(error);
    return NextResponse.json(
      {
        success: false,
        message: `Lỗi xử lý OCR: ${errorMessage}`,
      },
      { status: 400 }
    );
  }
}
