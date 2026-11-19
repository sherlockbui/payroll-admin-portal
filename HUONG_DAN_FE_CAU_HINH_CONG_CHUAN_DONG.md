# HƯỚNG DẪN TÍCH HỢP FRONTEND — CẤU HÌNH NGÀY CÔNG CHUẨN ĐỘNG (DYNAMIC STANDARD WORKDAYS)

**Áp dụng cho:** Màn hình **Web Payroll — Cấu hình Chế độ dự án (Policies)**  
**Đối tượng:** Developer Frontend (React / Vue / Angular)  
**Tài liệu liên quan:** `GET /api/web/payroll/projects/{projectId}/policies` & `PUT /api/web/payroll/projects/{projectId}/policies`

---

## 1. MỤC TIÊU CẢI TIẾN TRÊN GIAO DIỆN

Trước đây, dòng **"Số ngày công chuẩn định mức" (`POL_STANDARD_WORKDAYS`)** hiển thị là ô nhập số (mặc định hiện `0`).

**Sau cải tiến:** Ô này chuyển thành **Dropdown / Combobox (Creatable Select)**:
- Người dùng có thể **chọn nhanh** cách tính động theo chu kỳ công của tháng:
  - 📅 **Theo chu kỳ: Trừ Chủ nhật** (Làm 6 ngày/tuần)
  - 📅 **Theo chu kỳ: Trừ Thứ 7 & CN** (Làm 5 ngày/tuần)
- Hoặc **chọn số ngày cố định**: `26`, `24`, `22` ngày.
- Hoặc **tự gõ một số ngày cố định bất kỳ** (ví dụ: `25.5`, `23`...).

---

## 2. THAY ĐỔI TRONG API BACKEND TRẢ VỀ CHO FE

### Endpoint: `GET /api/web/payroll/projects/{projectId}/policies`

Backend bổ sung 2 trường metadata trong mỗi dòng chế độ:
- **`controlType`**: Loại control hiển thị (`"workday-rule-picker"`, `"select"`, `"input"`).
- **`options`**: Danh sách gợi ý để FE binding trực tiếp vào Dropdown.

#### Ví dụ Response Backend trả về:
```json
{
  "success": true,
  "data": {
    "columns": [
      { "id": 1, "name": "CNSX - CHÍNH THỨC" },
      { "id": 2, "name": "PC - QC - TRƯỞNG CA - BẢO TRÌ" },
      { "id": 3, "name": "CNSX - HĐXĐ 28 NGÀY 2 LẦN" }
    ],
    "rows": [
      {
        "policyId": 24,
        "policyCode": "POL_STANDARD_WORKDAYS",
        "policyName": "Số ngày công chuẩn định mức",
        "dataType": "string",
        "controlType": "workday-rule-picker",
        "options": [
          { "group": "Tính động theo chu kỳ công", "value": "CALC_NO_SUN", "label": "Theo chu kỳ: Trừ CN" },
          { "group": "Tính động theo chu kỳ công", "value": "CALC_NO_SAT_SUN", "label": "Theo chu kỳ: Trừ T& & CN" },
          { "group": "Số ngày cố định", "value": "26", "label": "Cố định 26 ngày" }
        ],
        "effectiveFrom": "2026-11-17",
        "effectiveTo": "2026-11-17",
        "values": {
          "1": "CALC_NO_SUN",
          "2": "24",
          "3": "CALC_NO_SAT_SUN"
        }
      }
    ]
  }
}
```

---

## 3. PAYLOAD GỬI LÊN KHI LƯU (SAVE / UPDATE)

### Endpoint: `PUT /api/web/payroll/projects/{projectId}/policies/{policyId}` (hoặc batch update)

Cấu trúc request **KHÔNG ĐỔI**. FE chỉ cần gửi chuỗi giá trị mà người dùng đã chọn hoặc đã gõ:

```json
{
  "effectiveFrom": "2026-11-17",
  "effectiveTo": "2026-11-17",
  "note": "Cấu hình công chuẩn dự án",
  "values": [
    { "targetGroupId": 1, "policyValue": "CALC_NO_SUN" },
    { "targetGroupId": 2, "policyValue": "24" },
    { "targetGroupId": 3, "policyValue": "CALC_NO_SAT_SUN" }
  ]
}
```

> **Quy ước giá trị `policyValue`:**
> - Nếu chọn tính động theo chu kỳ: Gửi `"CALC_NO_SUN"` hoặc `"CALC_NO_SAT_SUN"`.
> - Nếu chọn/gõ số cố định: Gửi chuỗi số (`"26"`, `"24"`, `"25.5"`...).

---

## 4. CODE MẪU CHO FRONTEND (ANT DESIGN / REACT)

FE kiểm tra `row.controlType` để render component tương ứng tại mỗi cell:

```tsx
import React, { useState } from 'react';
import { Select, Input } from 'antd';

interface PolicyCellProps {
  row: any;               // Dòng policy hiện tại
  targetGroupId: number;  // ID nhóm đối tượng
  value: string;          // Giá trị hiện tại của ô (ví dụ: "CALC_NO_SUN" hoặc "26")
  onChange: (newVal: string) => void;
}

export const PolicyValueCell: React.FC<PolicyCellProps> = ({ row, targetGroupId, value, onChange }) => {
  // 1. Nếu là ô cấu hình ngày công chuẩn:
  if (row.controlType === 'workday-rule-picker') {
    const isCustomNumber = value && !['CALC_NO_SUN', 'CALC_NO_SAT_SUN', '26', '24', '22'].includes(value);

    return (
      <Select
        style={{ width: '100%', minWidth: 150 }}
        value={value || undefined}
        placeholder="Chọn hoặc nhập số..."
        showSearch
        allowClear
        onChange={(val) => {
          if (val === '__CUSTOM__') {
            const inputVal = prompt('Nhập số ngày công cố định (VD: 25.5):', '26');
            if (inputVal && !isNaN(Number(inputVal))) {
              onChange(inputVal.trim());
            }
          } else {
            onChange(val);
          }
        }}
        filterOption={(input, option) =>
          (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
        }
      >
        <Select.OptGroup label="📅 Tính động theo chu kỳ công">
          <Select.Option value="CALC_NO_SUN">Trừ Chủ nhật (6 ngày/tuần)</Select.Option>
          <Select.Option value="CALC_NO_SAT_SUN">Trừ Thứ 7 & CN (5 ngày/tuần)</Select.Option>
        </Select.OptGroup>

        <Select.OptGroup label="🔢 Số ngày cố định">
          <Select.Option value="26">Cố định 26 ngày (Mặc định)</Select.Option>
          <Select.Option value="24">Cố định 24 ngày (Lavie)</Select.Option>
          <Select.Option value="22">Cố định 22 ngày</Select.Option>
          {isCustomNumber && (
            <Select.Option value={value}>Cố định {value} ngày</Select.Option>
          )}
          <Select.Option value="__CUSTOM__">✏️ Nhập số ngày khác...</Select.Option>
        </Select.OptGroup>
      </Select>
    );
  }

  // 2. Nếu là select dropdown thông thường (ví dụ: POL_NET_ROUND_MODE):
  if (row.controlType === 'select') {
    return (
      <Select
        style={{ width: '100%' }}
        value={value}
        options={row.options}
        onChange={onChange}
      />
    );
  }

  // 3. Mặc định là ô input nhập số / text như hiện tại:
  return (
    <Input
      style={{ width: '100%' }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};
```

---

## 5. CÁC ĐIỂM CẦN LƯU Ý CHO FE

1. **Hiển thị nhãn thân thiện:** Khi bảng ở chế độ xem (Display), nếu giá trị là `CALC_NO_SUN`, hiển thị nhãn `📅 Trừ Chủ nhật` thay vì hiển thị chuỗi kỹ thuật `CALC_NO_SUN`.
2. **Kích thước đồng bộ:** Component `<Select>` cần set chiều cao (`height: 32px` hoặc `size="middle"`) và bo góc giống hệt các ô `<Input>` bên dưới để đảm bảo bảng ma trận thẳng hàng và đẹp mắt.
3. **Cơ chế tái sử dụng:** Sau này bất kỳ chế độ nào có `controlType === "select"` (như chính sách làm tròn lương `POL_NET_ROUND_MODE`), FE đều tự động render dropdown lấy từ `row.options` mà không cần viết thêm code.
