# TÀI LIỆU API SPECIFICATION — CHẾ ĐỘ & PHỤ CẤP RIÊNG CỦA NGƯỜI LAO ĐỘNG (EMPLOYEE POLICY OVERRIDES)
**Hệ Thống:** Green Speed HRIS — Phân Hệ Web Payroll  
**Phiên bản:** 3.3.0  
**Ngày cập nhật:** 06/10/2026  
**Module:** `WebPayroll - Employee Policies`  

---

## 1. TỔNG QUAN & NGUYÊN TẮC NGHIỆP VỤ

### 1.1. Mục đích
Trong mô hình quản lý dự án outsource và nhân sự tập trung, các chính sách lương, phụ cấp, thưởng và định mức thường được quy định chung theo **Nhóm đối tượng** (`config.policy_target_group`, ví dụ: *Chính thức, Thử việc, Thời vụ, Bảo trì, Văn phòng...*).

Tuy nhiên, trong thực tế sẽ có những nhân viên có **Thỏa thuận riêng** (Special Agreement / Override):
- Mức lương cơ bản thỏa thuận riêng khác với khung chuẩn của nhóm.
- Mức phụ cấp riêng (xăng xe, nhà ở, điện thoại, trách nhiệm...) cao hơn hoặc thấp hơn định mức nhóm.
- Mức thỏa thuận có khoảng thời gian hiệu lực cụ thể (`effective_from` đến `effective_to`).

Module **Employee Policies (Chế độ riêng của người lao động)** cung cấp các API để C&B quản lý, tra cứu, thiết lập, khôi phục và import các thỏa thuận riêng này.

---

### 1.2. Cơ chế Kế thừa & Ghi đè (Inheritance & Override Hierarchy)

Khi Engine tính lương ([PayrollCalculationEngine](file:///d:/Work/Work/Source/Internal/Timetracking/api-hris/HrisApi.Data/PayrollEngine/PayrollCalculationEngine.cs)) và Context Builder ([EmployeeContextBuilder](file:///d:/Work/Work/Source/Internal/Timetracking/api-hris/HrisApi.Data/PayrollEngine/EmployeeContextBuilder.cs)) hoạt động, giá trị chính sách được giải quyết theo thứ tự ưu tiên:

```
┌────────────────────────────────────────────────────────┐
│  1. Chính sách mặc định của Nhóm (Group Policy)       │
│     (Bảng config.project_policy_target)                │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼ [Nếu có thỏa thuận riêng còn hiệu lực]
┌────────────────────────────────────────────────────────┐
│  2. Thỏa thuận riêng của Nhân viên (Employee Override) │
│     (Bảng config.project_policy_employee)              │
│     ==> GHI ĐÈ lên chính sách của nhóm                │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  3. Giá trị thực tế áp dụng (Effective Value)          │
│     Được nạp trực tiếp vào ngữ cảnh tính lương         │
└────────────────────────────────────────────────────────┘
```

- **Khi có thỏa thuận riêng còn hiệu lực (`effective_from <= Hiện tại <= effective_to` và `status = 1`)**: Giá trị của nhân viên sẽ thay thế giá trị nhóm (`HasOverride = true`).
- **Khi khôi phục về chuẩn (API Restore)**: Xóa hoặc vô hiệu hóa bản ghi trong `config.project_policy_employee`, nhân viên tự động quay về nhận giá trị chuẩn của nhóm (`HasOverride = false`).

---

### 1.3. Thông tin kết nối & Xác thực
- **Base Route:** `/api/web/payroll/employees/policies`
- **Controller:** `Api.Controllers.WebPayrollController`
- **Format:** `application/json` (Encoding: `UTF-8`)
- **Authentication:** Bearer JWT Token gửi qua HTTP Request Header:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Context Người dùng:** ID người thực hiện được trích xuất tự động từ Claim `EmployeeId` / `Id` (`CurrentUserId`).

---

## 2. DANH SÁCH CHI TIẾT CÁC ENDPOINT

| STT | Phương thức | Đường dẫn (Endpoint) | Mô tả chức năng |
|:---:|:---:|---|---|
| **1** | `GET` | `/api/web/payroll/employees/policies` | Danh sách chế độ nhân viên (Phân trang, Tìm kiếm, Lọc theo Nhóm) |
| **2** | `GET` | `/api/web/payroll/employees/policies/{employeeCode}` | Chi tiết toàn bộ chế độ & thỏa thuận riêng của một nhân viên |
| **3** | `PUT` | `/api/web/payroll/employees/policies/{employeeCode}` | Lưu / Cập nhật thỏa thuận chế độ riêng cho nhân viên |
| **4** | `DELETE`| `/api/web/payroll/employees/policies/{employeeCode}/{policyItemId}` | Khôi phục chính sách về định mức chuẩn dự án/nhóm |
| **5** | `POST` | `/api/web/payroll/employees/policies/import` | Import danh sách thỏa thuận riêng hàng loạt qua file Excel |

---

### 2.1. GET /api/web/payroll/employees/policies
Lấy danh sách nhân viên trong dự án cùng tóm tắt các chính sách và trạng thái có thỏa thuận riêng hay không.

#### Query Parameters:
| Tham số | Kiểu dữ liệu | Bắt buộc | Mặc định | Mô tả |
|---|:---:|:---:|:---:|---|
| `projectId` | `int` | Không | `0` | ID dự án (nếu `= 0` hoặc bỏ trống sẽ tìm theo phạm vi nhân viên). |
| `keyword` | `string` | Không | `null` | Từ khóa tìm kiếm: Mã nhân viên (`GID`) hoặc Họ và tên (`FullName`). |
| `policyGroupId` | `int` | Không | `null` | Lọc theo ID nhóm đối tượng chính sách (`config.policy_target_group.id`).<br>• `null`: Tất cả các nhóm<br>• `0`: Nhân viên chưa được phân nhóm<br>• `> 0`: ID nhóm cụ thể. |
| `pageIndex` | `int` | Không | `1` | Số trang (bắt đầu từ 1). |
| `pageSize` | `int` | Không | `20` | Số lượng bản ghi trên một trang (tối đa 100). |

#### Response Success (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "employeeCode": "T140-90001",
        "employeeName": "Nguyễn Văn A",
        "policyGroupId": 2,
        "policyGroupName": "Chính thức",
        "basicSalary": 8500000.0,
        "hasBasicSalaryOverride": true,
        "appliedCount": 3,
        "totalAllowance": 1500000.0,
        "effectiveFrom": "2026-10-01",
        "policies": [
          {
            "policyItemId": 1,
            "policyCode": "POL_BASIC_SALARY",
            "policyName": "Lương cơ bản hợp đồng",
            "policyTypeCode": "SALARY",
            "dataType": "MONEY",
            "value": 8500000.0,
            "policyValue": "8500000",
            "hasOverride": true
          },
          {
            "policyItemId": 12,
            "policyCode": "POL_ALLOWANCE_GASOLINE",
            "policyName": "Phụ cấp xăng xe",
            "policyTypeCode": "ALLOWANCE",
            "dataType": "MONEY",
            "value": 1000000.0,
            "policyValue": "1000000",
            "hasOverride": true
          },
          {
            "policyItemId": 14,
            "policyCode": "POL_ALLOWANCE_HOUSING",
            "policyName": "Phụ cấp nhà ở",
            "policyTypeCode": "ALLOWANCE",
            "dataType": "MONEY",
            "value": 500000.0,
            "policyValue": "500000",
            "hasOverride": false
          }
        ]
      }
    ],
    "pageIndex": 1,
    "pageSize": 20,
    "totalRow": 150,
    "totalPages": 8
  },
  "message": "Success"
}
```

---

### 2.2. GET /api/web/payroll/employees/policies/{employeeCode}
Lấy bảng đối chiếu chi tiết giữa **Mức định mức nhóm** và **Mức thỏa thuận riêng** của từng chính sách đối với một nhân viên cụ thể.

#### Route & Query Parameters:
| Tham số | Vị trí | Kiểu | Bắt buộc | Mô tả |
|---|:---:|:---:|:---:|---|
| `employeeCode` | Route | `string` | **Có** | Mã nhân viên (VD: `T140-90001`). |
| `projectId` | Query | `int` | **Có** | ID dự án áp dụng (VD: `1017`). |

#### Response Success (200 OK):
```json
{
  "success": true,
  "data": {
    "employeeCode": "T140-90001",
    "employeeName": "Nguyễn Văn A",
    "policyGroupId": 2,
    "policyGroupName": "Chính thức",
    "basicSalary": 8500000.0,
    "insuranceSalary": 5000000.0,
    "policies": [
      {
        "policyItemId": 1,
        "policyCode": "POL_BASIC_SALARY",
        "policyName": "Lương cơ bản",
        "dataType": "MONEY",
        "groupValue": "7000000",
        "employeeValue": "8500000",
        "effectiveValue": "8500000",
        "hasOverride": true,
        "effectiveFrom": "2026-10-01",
        "effectiveTo": null,
        "note": "Thỏa thuận theo phụ lục HĐLĐ số 02"
      },
      {
        "policyItemId": 2,
        "policyCode": "POL_INSURANCE_BASE",
        "policyName": "Lương đóng bảo hiểm xã hội",
        "dataType": "MONEY",
        "groupValue": "5000000",
        "employeeValue": null,
        "effectiveValue": "5000000",
        "hasOverride": false,
        "effectiveFrom": "2026-06-01",
        "effectiveTo": null,
        "note": null
      },
      {
        "policyItemId": 12,
        "policyCode": "POL_ALLOWANCE_GASOLINE",
        "policyName": "Phụ cấp xăng xe",
        "dataType": "MONEY",
        "groupValue": "500000",
        "employeeValue": "1000000",
        "effectiveValue": "1000000",
        "hasOverride": true,
        "effectiveFrom": "2026-10-01",
        "effectiveTo": "2026-12-31",
        "note": "Hỗ trợ công tác địa bàn xa quý 4"
      }
    ]
  },
  "message": "Success"
}
```

#### Giải thích các trường dữ liệu:
- `groupValue`: Giá trị mặc định quy định cho Nhóm đối tượng của nhân viên (`config.project_policy_target`).
- `employeeValue`: Giá trị thỏa thuận riêng được ghi nhận trong bảng `config.project_policy_employee`.
- `effectiveValue`: Giá trị cuối cùng có hiệu lực sẽ được đưa vào Engine tính lương (`COALESCE(employeeValue, groupValue)`).
- `hasOverride`: `true` nếu nhân viên đang được áp dụng mức riêng (`employeeValue != null`).

---

### 2.3. PUT /api/web/payroll/employees/policies/{employeeCode}
Cập nhật hoặc thiết lập thỏa thuận chế độ riêng cho nhân viên.

#### Route & Request Body:
- **Route:** `/api/web/payroll/employees/policies/{employeeCode}`
- **Content-Type:** `application/json`

#### Body Schema (`SaveEmployeePolicyRequest`):
```json
{
  "projectId": 1017,
  "employeeCode": "T140-90001",
  "effectiveFrom": "2026-10-01",
  "basicSalary": 8500000,
  "insuranceSalary": 5000000,
  "policies": [
    {
      "policyItemId": 12,
      "value": "1000000",
      "effectiveTo": "2026-12-31",
      "note": "Hỗ trợ xăng xe quý 4/2026",
      "status": 1
    },
    {
      "policyItemId": 15,
      "value": "300000",
      "effectiveTo": null,
      "note": "Phụ cấp chuyên cần đặc cách",
      "status": 1
    }
  ]
}
```

#### Chi tiết các trường Body:
| Trường | Kiểu | Bắt buộc | Mô tả |
|---|:---:|:---:|---|
| `projectId` | `int` | **Có** | ID dự án. |
| `employeeCode` | `string` | **Có** | Mã nhân viên (phải khớp với route). |
| `effectiveFrom` | `date` | Không | Ngày bắt đầu áp dụng chung (mặc định lấy ngày hiện tại nếu bỏ trống). |
| `basicSalary` | `decimal` | Không | Mức lương cơ bản riêng. Nếu truyền sẽ tự cập nhật vào chính sách `POL_BASIC_SALARY`. |
| `insuranceSalary` | `decimal` | Không | Mức lương đóng BHXH riêng. Nếu truyền sẽ tự cập nhật vào `POL_INSURANCE_BASE`. |
| `policies` | `array` | Không | Danh sách các chính sách/phụ cấp riêng cần lưu. |
| `policies[].policyItemId` | `int` | **Có** | ID của chính sách (`master.policy_item.id`). |
| `policies[].value` | `string` | **Có** | Giá trị thỏa thuận riêng (kiểu chuỗi biểu diễn số/văn bản). |
| `policies[].effectiveTo` | `date` | Không | Ngày hết hạn thỏa thuận (`null` = vô thời hạn). |
| `policies[].note` | `string` | Không | Lý do / Căn cứ thỏa thuận. |
| `policies[].status` | `int` | Không | `1`: Hoạt động, `0`: Tạm ngưng. |

#### Response Success (200 OK):
```json
{
  "success": true,
  "data": 3,
  "message": "Lưu cấu hình chế độ & phụ cấp thành công."
}
```
*(Trường `data` trả về số lượng chính sách đã được thêm/cập nhật).*

---

### 2.4. DELETE /api/web/payroll/employees/policies/{employeeCode}/{policyItemId}
Khôi phục một chính sách cụ thể của nhân viên về mức chuẩn mặc định của nhóm/dự án (Hủy bỏ thỏa thuận riêng).

#### Route & Query Parameters:
| Tham số | Vị trí | Kiểu | Bắt buộc | Mô tả |
|---|:---:|:---:|:---:|---|
| `employeeCode` | Route | `string` | **Có** | Mã nhân viên (VD: `T140-90001`). |
| `policyItemId` | Route | `int` | **Có** | ID chính sách cần khôi phục (`master.policy_item.id`). |
| `projectId` | Query | `int` | **Có** | ID dự án áp dụng. |

#### Response Success (200 OK):
```json
{
  "success": true,
  "data": {
    "employeeCode": "T140-90001",
    "policyItemId": 12,
    "policyCode": "POL_ALLOWANCE_GASOLINE",
    "policyName": "Phụ cấp xăng xe",
    "projectDefaultValue": "500000"
  },
  "message": "Khôi phục chuẩn dự án thành công."
}
```

---

### 2.5. POST /api/web/payroll/employees/policies/import
Import hàng loạt thỏa thuận chế độ riêng cho nhiều nhân viên từ file Excel.

#### Request Headers & Body:
- **Endpoint:** `/api/web/payroll/employees/policies/import`
- **Content-Type:** `multipart/form-data`
- **Body:** `file` (File Excel định dạng `.xlsx`)

#### Cấu trúc các cột trong File Excel (Bắt đầu từ Dòng 2):
| Cột | Tên Cột | Bắt buộc | Định dạng | Ví dụ |
|:---:|---|:---:|---|---|
| **A** | Mã nhân viên | **Có** | Chuỗi ký tự | `T140-90001` |
| **B** | Mã chính sách | **Có** | Mã code chuẩn hệ thống | `POL_BASIC_SALARY`, `POL_ALLOWANCE_GASOLINE` |
| **C** | Giá trị thỏa thuận | **Có** | Số hoặc chuỗi | `8500000` |
| **D** | Ngày hiệu lực | Không | `yyyy-MM-dd` hoặc `dd/MM/yyyy` | `2026-10-01` |
| **E** | Ghi chú | Không | Văn bản | `Phụ lục HĐ quý 4` |

#### Response Success (200 OK):
```json
{
  "success": true,
  "data": {
    "batchId": 45,
    "totalRows": 120,
    "successRows": 120,
    "errorRows": 0,
    "errors": []
  },
  "message": "Import hoàn tất. Thành công: 120/120 dòng."
}
```

#### Response Validation Error (400 Bad Request):
Nếu có bất kỳ dòng nào không hợp lệ (mã nhân viên không tồn tại, mã chính sách không đúng...), hệ thống sẽ rollback toàn bộ transaction và trả về danh sách chi tiết lỗi:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Import thất bại. Có 2/100 dòng lỗi, không có dòng nào được nhập.",
  "data": {
    "totalRows": 100,
    "successRows": 98,
    "errorRows": 2,
    "errors": [
      {
        "row": 15,
        "column": "B",
        "value": "POL_INVALID_CODE",
        "message": "Mã chính sách không tồn tại trong hệ thống.",
        "errorCode": "POLICY_NOT_FOUND"
      },
      {
        "row": 42,
        "column": "A",
        "value": "NV9999",
        "message": "Mã nhân viên không tồn tại trong hệ thống.",
        "errorCode": "EMPLOYEE_NOT_FOUND"
      }
    ]
  }
}
```

---

## 3. MÃ LỖI THƯỜNG GẶP (ERROR CODES)

| Mã lỗi HTTP | Tình huống xảy ra | Giải pháp xử lý |
|:---:|---|---|
| `400 Bad Request` | Thiếu `projectId`, `policyItemId` không hợp lệ, hoặc dữ liệu Excel sai định dạng. | Kiểm tra lại các tham số bắt buộc và cấu trúc file import. |
| `401 Unauthorized`| Thiếu hoặc hết hạn Bearer JWT Token. | Thực hiện đăng nhập lại để làm mới access token. |
| `403 Forbidden`   | Tài khoản không thuộc quyền C&B/Admin để quản lý chính sách lương. | Kiểm tra phân quyền vai trò (Role: C&B hoặc Admin). |
| `404 Not Found`   | Không tìm thấy `employeeCode` trong hệ thống hoặc nhân viên không thuộc dự án. | Kiểm tra lại mã nhân viên `GID`. |
| `500 Server Error`| Lỗi truy vấn cơ sở dữ liệu hoặc xung đột dữ liệu. | Xem log chi tiết lỗi máy chủ. |
