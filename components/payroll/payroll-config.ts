import type { UserRole } from "@/components/providers";

// 1. Trạng thái dữ liệu bảng lương (Period / Payroll Data Status)
export const periodStatusConfig: Record<string, { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" }> = {
  draft: { label: "Bản nháp", tone: "neutral" },
  calculated: { label: "Đã tính", tone: "info" },
  submitted: { label: "Đã chốt", tone: "info" },
  locked: { label: "Đã khóa", tone: "success" },
};

// 2. Trạng thái quy trình duyệt (Workflow Approval Status)
export const workflowStatusConfig: Record<string, { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" }> = {
  not_started: { label: "Chưa duyệt", tone: "neutral" },
  pending: { label: "Chờ duyệt", tone: "warning" },
  in_progress: { label: "Đang xử lý", tone: "warning" },
  approved: { label: "Đã duyệt", tone: "success" },
  rejected: { label: "Từ chối", tone: "danger" },
};

// Alias for backwards compatibility
export const statusConfig = periodStatusConfig;

export function getPayrollStatuses(run?: any, timeline?: any) {
  const periodStatus = (run?.status && periodStatusConfig[run.status])
    ? periodStatusConfig[run.status]
    : { label: run?.status || "—", tone: "neutral" as const };

  const isStarted = Boolean(
    timeline?.instance?.id ||
    timeline?.instanceId ||
    run?.wfInstanceId ||
    (run?.status !== "draft" && run?.status !== "calculated")
  );

  const currentStepOrder = timeline?.instance?.currentStepOrder ?? run?.wfCurrentStepOrder;
  const currentStepName = timeline?.instance?.currentStepName ?? run?.wfCurrentStepName;

  let workflowStatus = workflowStatusConfig.not_started;

  if (isStarted) {
    if (run?.status === "locked") {
      workflowStatus = workflowStatusConfig.approved;
    } else {
      const wfStatus = String(timeline?.instance?.status || timeline?.status || "pending").toLowerCase();
      workflowStatus = workflowStatusConfig[wfStatus] || workflowStatusConfig.pending;
    }
  }

  return { 
    periodStatus, 
    workflowStatus, 
    isStarted,
    currentStepOrder,
    currentStepName,
  };
}



export const roleActors: Record<UserRole, string> = {
  accountant: "Trần Thu Trang (Kế toán C&B)",
  bcsx: "Bùi Minh Hạnh (BCSX)",
  project_owner: "Nguyễn Thu Hà (CDA)",
  payment_accountant: "Lê Thanh Tâm (Kế toán Thanh toán)",
};

export const workflowSteps = [
  { step: 1, title: "Chốt dữ liệu công", owner: "CDA / GSDA / BCSX / Admin", time: "03 ngày", description: "Bảng công được phê duyệt cuối cùng và thông tin nhân sự đã cập nhật." },
  { step: 2, title: "Lập bảng lương", owner: "Kế toán C&B", time: "02 ngày", description: "Đối chiếu Master Data, chế độ lương, bảo hiểm và các quyết định đã duyệt." },
  { step: 3, title: "Kiểm tra bảng lương", owner: "Admin dự án / BCSX", time: "01 ngày", description: "Đối chiếu ngày công, hồ sơ, ATM, MST, tạm giữ, vi phạm và ứng lương." },
  { step: 4, title: "Xác nhận bảng lương", owner: "CDA / GSDA", time: "01 ngày", description: "Kiểm tra và xác nhận dữ liệu trước khi phát hành." },
  { step: 5, title: "Phát hành phiếu lương", owner: "CDA / GSDA / C&B", time: "01 ngày", description: "Phân bổ bảng lương thành phiếu lương riêng cho từng NLĐ." },
  { step: 6, title: "Xác nhận phiếu lương", owner: "Người lao động", time: "01 ngày", description: "NLĐ xác nhận hoặc gửi phản hồi điều chỉnh qua ứng dụng." },
  { step: 7, title: "Cập nhật doanh thu", owner: "Kế toán Thanh toán", time: "01 ngày", description: "Kiểm tra chênh lệch tỷ lệ chi phí lương/doanh thu so với tháng trước." },
  { step: 8, title: "Giải trình chênh lệch", owner: "CDA / GSDA / C&B", time: "01 ngày", description: "Thực hiện khi |A| > 1,5% hoặc |B| > 10 triệu đồng." },
  { step: 9, title: "Hoàn tất & khóa", owner: "Kế toán C&B", time: "Ngày chi lương", description: "Lưu dữ liệu hoàn tất làm cơ sở lập danh sách chi lương." },
];

export function getWorkflowStage(run: any): number {
  if (!run) return 1;
  if (run.status === "locked") return 9;
  if (typeof run.wfCurrentStepOrder === "number" && run.wfCurrentStepOrder > 0) {
    return Math.min(9, Math.max(1, run.wfCurrentStepOrder));
  }
  if (run.status === "submitted") return 4;
  if (run.status === "calculated") return 2;
  return 1;
}

export const sourceLabels = { system: "Hệ thống Công ty", excel: "Excel / Scan ký", customer: "Khách hàng xác nhận" } as const;
