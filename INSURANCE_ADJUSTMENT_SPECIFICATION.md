# TÃ€I LIá»†U Äáº¶C Táº¢ NGHIá»†P Vá»¤ & API â€” QUáº¢N LÃ ÄIá»€U CHá»ˆNH Báº¢O HIá»‚M XÃƒ Há»˜I (INSURANCE ADJUSTMENTS)
**Há»‡ Thá»‘ng:** Green Speed HRIS â€” PhÃ¢n Há»‡ Web Payroll & Quáº£n LÃ½ Báº£o Hiá»ƒm  
**PhiÃªn báº£n:** 1.0.0  
**NgÃ y cáº­p nháº­t:** 21/10/2026  
**Module:** `WebPayroll - Insurance Adjustments`  

---

## 1. Tá»”NG QUAN & NGUYÃŠN Táº®C NGHIá»†P Vá»¤

### 1.1. Má»¥c Ä‘Ã­ch
Trong quÃ¡ trÃ¬nh quáº£n lÃ½ há»“ sÆ¡ trÃ­ch ná»™p báº£o hiá»ƒm xÃ£ há»™i (BHXH) hÃ ng thÃ¡ng cá»§a ngÆ°á»i lao Ä‘á»™ng (NLÄ), ngoÃ i viá»‡c Ä‘Ã³ng BHXH Ä‘á»‹nh ká»³ theo ká»³ tÃ­nh lÆ°Æ¡ng, bá»™ pháº­n C&B thÆ°á»ng xuyÃªn phÃ¡t sinh cÃ¡c nghiá»‡p vá»¥ Ä‘iá»u chá»‰nh Ä‘áº·c thÃ¹:
1. **Äiá»u chá»‰nh ká»³ trÆ°á»›c trá»« chi phÃ­ NLÄ (`PREV_PERIOD_ADJ`)**:
   - Truy thu hoáº·c thoÃ¡i thu tiá»n Ä‘Ã³ng BHXH phÃ¡t sinh tá»« cÃ¡c thÃ¡ng trÆ°á»›c (vÃ­ dá»¥: thÃ¡ng trÆ°á»›c bÃ¡o tÄƒng muá»™n, Ä‘iá»u chá»‰nh há»“i tá»‘ má»©c Ä‘Ã³ng BHXH, hoáº·c cÆ¡ quan BHXH tráº£ vá» káº¿t quáº£ truy thu/thoÃ¡i thu).
   - **Äáº·c Ä‘iá»ƒm sá»‘ tiá»n**: CÃ³ thá»ƒ mang **giÃ¡ trá»‹ dÆ°Æ¡ng (+)** (truy thu thÃªm tiá»n tá»« NLÄ) hoáº·c **giÃ¡ trá»‹ Ã¢m (-)** (thoÃ¡i thu/hoÃ n tiá»n láº¡i cho NLÄ).
   - **ThÃ´ng tin ká»³ gá»‘c**: CÃ³ trÆ°á»ng NÄƒm ká»³ gá»‘c (`ref_year`) vÃ  ThÃ¡ng ká»³ gá»‘c (`ref_month`) Ä‘á»ƒ truy váº¿t nghiá»‡p vá»¥ phÃ¡t sinh tá»« ká»³ nÃ o trong quÃ¡ khá»©.
2. **Trá»« tháº» BHYT (`HI_CARD_DEDUCTION`)**:
   - Kháº¥u trá»« tiá»n tháº» báº£o hiá»ƒm y táº¿ cá»§a NLÄ (vÃ­ dá»¥: trÆ°á»ng há»£p NLÄ nghá»‰ viá»‡c khÃ´ng tráº£ láº¡i tháº» BHYT hoáº·c phÃ¡t sinh chi phÃ­ tháº» BHYT cáº§n trá»« vÃ o lÆ°Æ¡ng).
   - **Äáº·c Ä‘iá»ƒm sá»‘ tiá»n**: LuÃ´n lÃ  **sá»‘ tiá»n dÆ°Æ¡ng (> 0)**, kháº¥u trá»« trá»±c tiáº¿p vÃ o thu nháº­p cá»§a NLÄ.
3. **Thá»‘i thu láº¡i tiá»n tháº» BHYT cho NLÄ (`HI_CARD_REFUND`)**:
   - HoÃ n tráº£ láº¡i tiá»n tháº» BHYT Ä‘Ã£ trá»« trÆ°á»›c Ä‘Ã³ khi NLÄ bÃ n giao láº¡i tháº» há»£p lá»‡ theo quy Ä‘á»‹nh.
   - **Äáº·c Ä‘iá»ƒm sá»‘ tiá»n**: Nháº­p vÃ o lÃ  **sá»‘ tiá»n dÆ°Æ¡ng (> 0)**; khi tÃ­nh lÆ°Æ¡ng sáº½ tá»± Ä‘á»™ng Ä‘áº£o dáº¥u Ã¢m Ä‘á»ƒ **lÃ m giáº£m tá»•ng sá»‘ tiá»n bá»‹ kháº¥u trá»«** (tÆ°Æ¡ng Ä‘Æ°Æ¡ng tráº£ tiá»n láº¡i cho NLÄ).

---

### 1.2. CÃ¡c Quyáº¿t Äá»‹nh Nghiá»‡p Vá»¥ Cá»‘t LÃµi (Architecture Decisions)
- **CÆ¡ cháº¿ lÆ°u trá»¯ Ä‘á»™c láº­p**: Quáº£n lÃ½ táº¡i báº£ng riÃªng `insurance.insurance_adjustment` (khÃ´ng gá»™p chung cá»™t vÃ o `insurance.employee_insurance_period`) Ä‘á»ƒ quáº£n lÃ½ Ä‘a báº£n ghi, lÆ°u kÃ¨m sá»‘ quyáº¿t Ä‘á»‹nh, biÃªn báº£n vÃ  tÃ i liá»‡u Ä‘Ã­nh kÃ¨m.
- **KhÃ´ng phÃ¢n loáº¡i theo cáº¥u pháº§n báº£o hiá»ƒm**: TÃ­nh chung **má»™t cá»¥c tiá»n Ä‘iá»u chá»‰nh tá»•ng há»£p** (khÃ´ng tÃ¡ch riÃªng tá»· lá»‡ 8% BHXH, 1.5% BHYT, 1% BHTN).
- **Import Ä‘á»“ng thá»i 1 file Excel (2 Sheet)**:
  - File Excel duy nháº¥t há»— trá»£ 2 nghiá»‡p vá»¥ cÃ¹ng lÃºc:
    - **Sheet 1 (`DongBHXH`)**: Danh sÃ¡ch Ä‘Ã³ng BHXH Ä‘á»‹nh ká»³ hÃ ng thÃ¡ng.
    - **Sheet 2 (`DieuChinhBH`)**: Danh sÃ¡ch Ä‘iá»u chá»‰nh báº£o hiá»ƒm (ká»³ trÆ°á»›c, trá»« tháº», thá»‘i tháº»).
    - **Sheet 3 (`DanhMuc`)**: Sheet áº©n dÃ¹ng cho danh má»¥c cáº¥u hÃ¬nh Data Validation (Dropdown tiáº¿ng Viá»‡t).
  - Cáº£ 2 sheet Ä‘Æ°á»£c thá»±c thi trong **cÃ¹ng má»™t Database Transaction**: náº¿u cÃ³ lá»—i á»Ÿ báº¥t ká»³ dÃ²ng nÃ o cá»§a báº¥t ká»³ sheet nÃ o thÃ¬ rollback toÃ n bá»™ Ä‘á»ƒ báº£o toÃ n dá»¯ liá»‡u.
- **Giao diá»‡n tiáº¿ng Viá»‡t â€” MÃ£ há»‡ thá»‘ng chuáº©n**:
  - TrÃªn Excel template: Dropdown hiá»ƒn thá»‹ hoÃ n toÃ n báº±ng **tiáº¿ng Viá»‡t**.
  - Backend tá»± Ä‘á»™ng chuáº©n hÃ³a vÃ  map vá» mÃ£ code chuáº©n cá»§a há»‡ thá»‘ng (`PREV_PERIOD_ADJ`, `HI_CARD_DEDUCTION`, `HI_CARD_REFUND`).

---

### 1.3. CÆ¡ Cháº¿ TÃ­nh LÆ°Æ¡ng & TÃ­ch Há»£p Payroll Engine

#### Vá»‹ trÃ­ trÃªn Báº£ng LÆ°Æ¡ng (Payroll Sheet):
- Cáº£ 3 khoáº£n Ä‘iá»u chá»‰nh nÃ y Ä‘Æ°á»£c hiá»ƒn thá»‹ thÃ nh **3 cá»™t lÆ°Æ¡ng riÃªng biá»‡t** trÃªn báº£ng lÆ°Æ¡ng.
- Thuá»™c nhÃ³m **Kháº¥u trá»« (Deductions)** (`category_code = 'deduction'`, `sign = -1`).
- **Tuyá»‡t Ä‘á»‘i khÃ´ng Ä‘Æ°a vÃ o Gross**: TrÃ¡nh lÃ m sai lá»‡ch thu nháº­p chá»‹u thuáº¿ vÃ  tiá»n lÆ°Æ¡ng cÄƒn báº£n.
- **KhÃ´ng lÃ m sai lá»‡ch giáº£m trá»« BHXH khi tÃ­nh Thuáº¿ TNCN**: Khoáº£n BHXH Ä‘Æ°á»£c trá»« trÆ°á»›c khi tÃ­nh thuáº¿ TNCN (`InsuranceEmployee`) chá»‰ cÄƒn cá»© vÃ o má»©c Ä‘Ã³ng BHXH Ä‘á»‹nh ká»³ cá»§a thÃ¡ng (`TOTAL_INSURANCE_EMP`), khÃ´ng bá»‹ ghi Ä‘Ã¨ bá»Ÿi cÃ¡c khoáº£n Ä‘iá»u chá»‰nh ká»³ trÆ°á»›c.

#### Cáº¥u hÃ¬nh CÃ´ng thá»©c lÆ°Æ¡ng:
| ThÃ nh pháº§n lÆ°Æ¡ng | MÃ£ biáº¿n (Variable) | Loáº¡i (Sign) | CÃ´ng thá»©c máº«u | Ã nghÄ©a nghiá»‡p vá»¥ |
|---|---|:---:|---|---|
| **Äiá»u chá»‰nh BHXH ká»³ trÆ°á»›c** | `{INSURANCE_PREV_ADJUSTMENT}` | `-1` (Deduction) | `{INSURANCE_PREV_ADJUSTMENT}` | Tiá»n dÆ°Æ¡ng (+) trá»« thÃªm tiá»n cá»§a NLÄ; Tiá»n Ã¢m (-) giáº£m kháº¥u trá»« (hoÃ n tiá»n) |
| **Trá»« tiá»n tháº» BHYT** | `{HI_CARD_DEDUCTION}` | `-1` (Deduction) | `{HI_CARD_DEDUCTION}` | TÄƒng tiá»n kháº¥u trá»« cá»§a NLÄ |
| **Thá»‘i thu tiá»n tháº» BHYT** | `{HI_CARD_REFUND}` | `-1` (Deduction) | `0 - {HI_CARD_REFUND}` | Mang giÃ¡ trá»‹ Ã¢m trÃªn cá»™t kháº¥u trá»«, giÃºp giáº£m tá»•ng tiá»n kháº¥u trá»« cá»§a NLÄ |

#### NguyÃªn táº¯c Ã¡p dá»¥ng theo Ká»³ lÆ°Æ¡ng:
- **Ká»³ lÆ°Æ¡ng ThÃ¡ng chÃ­nh thá»©c / Quyáº¿t toÃ¡n (`monthly` / `is_settlement = 1`)**: Tá»± Ä‘á»™ng tá»•ng há»£p vÃ  náº¡p táº¥t cáº£ cÃ¡c báº£n ghi cÃ³ tráº¡ng thÃ¡i **ÄÃ£ duyá»‡t (`status = 'confirmed'`)** trong thÃ¡ng Ã¡p dá»¥ng.
- **Ká»³ lÆ°Æ¡ng Táº¡m á»©ng / Tuáº§n (`advance` / `weekly`)**: **Bá» qua**, khÃ´ng kháº¥u trá»« cÃ¡c khoáº£n Ä‘iá»u chá»‰nh báº£o hiá»ƒm nÃ y á»Ÿ ká»³ tuáº§n/táº¡m á»©ng.

---

## 2. CÆ  Sá»ž Dá»® LIá»†U & MASTER DATA

### 2.1. Báº£ng `insurance.insurance_adjustment`
Báº£ng lÆ°u trá»¯ thÃ´ng tin Ä‘iá»u chá»‰nh báº£o hiá»ƒm:

```sql
CREATE TABLE insurance.insurance_adjustment (
    [id]                      int IDENTITY(1,1) NOT NULL,
    [employee_code]           varchar(50)       NOT NULL,    -- MÃ£ nhÃ¢n viÃªn (GID)
    [adjustment_type]         varchar(30)       NOT NULL,    -- 'PREV_PERIOD_ADJ' | 'HI_CARD_DEDUCTION' | 'HI_CARD_REFUND'
    [project_id]              int               NULL,        -- Dá»± Ã¡n Ã¡p dá»¥ng
    [apply_year]              int               NOT NULL,    -- NÄƒm tÃ­nh lÆ°Æ¡ng Ã¡p dá»¥ng
    [apply_month]             int               NOT NULL,    -- ThÃ¡ng tÃ­nh lÆ°Æ¡ng Ã¡p dá»¥ng (1-12)
    [ref_year]                int               NULL,        -- NÄƒm ká»³ gá»‘c trÆ°á»›c Ä‘Ã³ (chá»‰ Ã¡p dá»¥ng cho PREV_PERIOD_ADJ)
    [ref_month]               int               NULL,        -- ThÃ¡ng ká»³ gá»‘c trÆ°á»›c Ä‘Ã³ (chá»‰ Ã¡p dá»¥ng cho PREV_PERIOD_ADJ)
    [amount]                  decimal(18,2)     NOT NULL,    -- Sá»‘ tiá»n Ä‘iá»u chá»‰nh
    [status]                  varchar(20)       NOT NULL DEFAULT 'pending', -- 'pending' | 'confirmed' | 'rejected'
    [note]                    nvarchar(500)     NULL,        -- Ghi chÃº / lÃ½ do
    [status_note]             nvarchar(500)     NULL,        -- LÃ½ do duyá»‡t / tá»« chá»‘i
    [decision_number]         nvarchar(100)     NULL,        -- Sá»‘ quyáº¿t Ä‘á»‹nh / biÃªn báº£n
    [decision_date]           date              NULL,        -- NgÃ y ban hÃ nh quyáº¿t Ä‘á»‹nh
    [import_batch_id]         int               NULL,        -- MÃ£ lÃ´ import (náº¿u import tá»« Excel)
    [created_at]              datetime2(3)      NOT NULL DEFAULT SYSDATETIME(),
    [created_by]              int               NULL,
    [updated_at]              datetime2(3)      NULL,
    [updated_by]              int               NULL,

    CONSTRAINT PK_insurance_adjustment PRIMARY KEY (id),
    CONSTRAINT CK_ins_adj_type CHECK (adjustment_type IN ('PREV_PERIOD_ADJ', 'HI_CARD_DEDUCTION', 'HI_CARD_REFUND'))
);
```

### 2.2. Báº£ng `insurance.insurance_adjustment_document`
LÆ°u trá»¯ há»“ sÆ¡, tÃ i liá»‡u, quyáº¿t Ä‘á»‹nh, biÃªn báº£n Ä‘Ã­nh kÃ¨m minh chá»©ng cho Ä‘iá»u chá»‰nh:

```sql
CREATE TABLE insurance.insurance_adjustment_document (
    [id]                      int IDENTITY(1,1) NOT NULL,
    [insurance_adjustment_id] int               NOT NULL,
    [document_type]           varchar(50)       NULL,        -- 'DECISION', 'MINUTES', 'REPORT', 'OTHER'
    [file_name]               nvarchar(255)     NOT NULL,
    [file_path]               nvarchar(1000)    NOT NULL,
    [file_size]               bigint            NULL,
    [mime_type]               varchar(100)      NULL,
    [created_at]              datetime2(3)      NOT NULL DEFAULT SYSDATETIME(),
    [created_by]              int               NULL,

    CONSTRAINT PK_insurance_adjustment_document PRIMARY KEY (id),
    CONSTRAINT FK_ins_adj_doc_adj FOREIGN KEY (insurance_adjustment_id) 
        REFERENCES insurance.insurance_adjustment (id) ON DELETE CASCADE
);
```

### 2.3. Dá»¯ liá»‡u Master Cáº¥u hÃ¬nh LÆ°Æ¡ng
ÄÃ£ Ä‘Æ°á»£c Ä‘á»“ng bá»™ trong migration [Migration_Insurance_Adjustment_Tables.sql](file:///d:/Work/Work/Source/Internal/Timetracking/api-hris/HrisApi/script/Migration/Migration_Insurance_Adjustment_Tables.sql):
- **Cá»™t lÆ°Æ¡ng (`master.salary_component`)**:
  - `INSURANCE_PREV_ADJUSTMENT` â€” Äiá»u chá»‰nh BHXH ká»³ trÆ°á»›c (NLÄ) (`category_id = 2`, `display_order = 47`)
  - `HI_CARD_DEDUCTION` â€” Trá»« tiá»n tháº» BHYT (`category_id = 2`, `display_order = 48`)
  - `HI_CARD_REFUND` â€” Thá»‘i thu tiá»n tháº» BHYT (`category_id = 2`, `display_order = 49`)
- **Biáº¿n lÆ°Æ¡ng (`master.variable_definition`)**:
  - `{INSURANCE_PREV_ADJUSTMENT}` (`variable_group_id = 6`, `source_type = 'insurance_adjustment'`)
  - `{HI_CARD_DEDUCTION}` (`variable_group_id = 6`, `source_type = 'insurance_adjustment'`)
  - `{HI_CARD_REFUND}` (`variable_group_id = 6`, `source_type = 'insurance_adjustment'`)
- **Máº«u cÃ´ng thá»©c (`master.formula_definition`)**:
  - `TPL_INSURANCE_PREV_ADJ` = `{INSURANCE_PREV_ADJUSTMENT}`
  - `TPL_HI_CARD_DEDUCTION` = `{HI_CARD_DEDUCTION}`
  - `TPL_HI_CARD_REFUND` = `0 - {HI_CARD_REFUND}`

---

## 3. QUY CÃCH FILE EXCEL TEMPLATE & IMPORT

### 3.1. Cáº¥u trÃºc Template (`GET /api/v1/webpayroll/insurance/import-template`)
File Excel tráº£ vá» gá»“m 3 Sheet:

#### Sheet 1: `DongBHXH` (ÄÃ³ng BHXH Ä‘á»‹nh ká»³)
| Cá»™t | TiÃªu Ä‘á» cá»™t | Báº¯t buá»™c | Kiá»ƒu dá»¯ liá»‡u | MÃ´ táº£ & RÃ ng buá»™c |
|:---:|---|:---:|---|---|
| A | MÃ£ nhÃ¢n viÃªn | CÃ³ | Text | GID nhÃ¢n viÃªn trong há»‡ thá»‘ng |
| B | TÃªn nhÃ¢n viÃªn | KhÃ´ng | Text | TÃªn hiá»ƒn thá»‹ (Ä‘á»ƒ Ä‘á»‘i chiáº¿u) |
| C | MÃ£ sá»‘ báº£o hiá»ƒm xÃ£ há»™i | KhÃ´ng | Text | Tá»‘i Ä‘a 20 kÃ½ tá»± |
| D | **Loáº¡i biáº¿n Ä‘á»™ng** | CÃ³ | Dropdown | Chá»n tá»« danh má»¥c tiáº¿ng Viá»‡t: `Äang tham gia`, `TÄƒng má»›i`, `Äiá»u chá»‰nh má»©c Ä‘Ã³ng`, `Nghá»‰ thai sáº£n`, `Nghá»‰ khÃ´ng lÆ°Æ¡ng`, `BÃ¡o giáº£m` |
| E | Má»©c Ä‘Ã³ng báº£o hiá»ƒm | CÃ³ | Sá»‘ | Tiá»n lÆ°Æ¡ng lÃ m cÄƒn cá»© trÃ­ch Ä‘Ã³ng BHXH (>= 0) |
| F | ThÃ¡ng | CÃ³ | Sá»‘ | ThÃ¡ng Ã¡p dá»¥ng (1 - 12) |
| G | NÄƒm | CÃ³ | Sá»‘ | NÄƒm Ã¡p dá»¥ng (2000 - 2100) |
| H | LÃ½ do | KhÃ´ng | Text | Tá»‘i Ä‘a 500 kÃ½ tá»± |
| I | Äá»§ Ä‘iá»u kiá»‡n Ä‘Ã³ng báº£o hiá»ƒm | KhÃ´ng | Checkbox | ÄÃ¡nh dáº¥u tham gia (`true`/`false`) |

#### Sheet 2: `DieuChinhBH` (Äiá»u chá»‰nh báº£o hiá»ƒm)
| Cá»™t | TiÃªu Ä‘á» cá»™t | Báº¯t buá»™c | Kiá»ƒu dá»¯ liá»‡u | MÃ´ táº£ & RÃ ng buá»™c |
|:---:|---|:---:|---|---|
| A | MÃ£ nhÃ¢n viÃªn | CÃ³ | Text | GID nhÃ¢n viÃªn trong há»‡ thá»‘ng |
| B | TÃªn nhÃ¢n viÃªn | KhÃ´ng | Text | TÃªn hiá»ƒn thá»‹ (Ä‘á»ƒ Ä‘á»‘i chiáº¿u) |
| C | **Loáº¡i Ä‘iá»u chá»‰nh** | CÃ³ | Dropdown | Chá»n tá»« danh má»¥c tiáº¿ng Viá»‡t:<br>â€¢ `Äiá»u chá»‰nh ká»³ trÆ°á»›c trá»« chi phÃ­ NLÄ`<br>â€¢ `Trá»« tháº» BHYT`<br>â€¢ `Thá»‘i thu láº¡i tiá»n tháº» cho NLÄ` |
| D | ThÃ¡ng Ã¡p dá»¥ng | CÃ³ | Sá»‘ | ThÃ¡ng tÃ­nh lÆ°Æ¡ng Ã¡p dá»¥ng (1 - 12) |
| E | NÄƒm Ã¡p dá»¥ng | CÃ³ | Sá»‘ | NÄƒm tÃ­nh lÆ°Æ¡ng Ã¡p dá»¥ng (2000 - 2100) |
| F | ThÃ¡ng ká»³ gá»‘c | Chá»‰ khi lÃ  `PREV_PERIOD_ADJ` | Sá»‘ | ThÃ¡ng phÃ¡t sinh ká»³ trÆ°á»›c (1 - 12) |
| G | NÄƒm ká»³ gá»‘c | Chá»‰ khi lÃ  `PREV_PERIOD_ADJ` | Sá»‘ | NÄƒm phÃ¡t sinh ká»³ trÆ°á»›c (2000 - 2100) |
| H | Sá»‘ tiá»n (VNÄ) | CÃ³ | Sá»‘ | â€¢ Vá»›i `PREV_PERIOD_ADJ`: cÃ³ thá»ƒ lÃ  sá»‘ Ã¢m hoáº·c dÆ°Æ¡ng (!= 0)<br>â€¢ Vá»›i `HI_CARD_DEDUCTION` & `HI_CARD_REFUND`: pháº£i lÃ  sá»‘ dÆ°Æ¡ng (> 0) |
| I | Sá»‘ quyáº¿t Ä‘á»‹nh / BiÃªn báº£n | KhÃ´ng | Text | Tá»‘i Ä‘a 100 kÃ½ tá»± |
| J | Ghi chÃº | KhÃ´ng | Text | Tá»‘i Ä‘a 500 kÃ½ tá»± |

#### Sheet 3: `DanhMuc` (Sheet áº©n)
- Cá»™t A: Danh má»¥c loáº¡i biáº¿n Ä‘á»™ng Ä‘Ã³ng BHXH Ä‘á»‹nh ká»³.
- Cá»™t B: Danh má»¥c loáº¡i Ä‘iá»u chá»‰nh báº£o hiá»ƒm.

---

### 3.2. Báº£ng Ã¡nh xáº¡ tiáº¿ng Viá»‡t sang MÃ£ Code há»‡ thá»‘ng

#### Ãnh xáº¡ Loáº¡i biáº¿n Ä‘á»™ng (Sheet `DongBHXH`):
| Hiá»ƒn thá»‹ tiáº¿ng Viá»‡t trÃªn Dropdown | MÃ£ Code lÆ°u Database | Ã nghÄ©a |
|---|---|---|
| `Äang tham gia` | `ACTIVE` | NhÃ¢n viÃªn Ä‘ang tiáº¿p tá»¥c tham gia Ä‘Ã³ng BHXH |
| `TÄƒng má»›i` | `NEW_HIRE` | NhÃ¢n viÃªn má»›i báº¯t Ä‘áº§u tham gia Ä‘Ã³ng BHXH |
| `Äiá»u chá»‰nh má»©c Ä‘Ã³ng` | `SALARY_ADJUSTMENT` | Äiá»u chá»‰nh tÄƒng/giáº£m má»©c lÆ°Æ¡ng cÄƒn cá»© Ä‘Ã³ng BHXH |
| `Nghá»‰ thai sáº£n` | `MATERNITY` | NhÃ¢n viÃªn nghá»‰ hÆ°á»Ÿng cháº¿ Ä‘á»™ thai sáº£n |
| `Nghá»‰ khÃ´ng lÆ°Æ¡ng` | `UNPAID_LEAVE` | NhÃ¢n viÃªn nghá»‰ khÃ´ng hÆ°á»Ÿng lÆ°Æ¡ng tá»« 14 ngÃ y/thÃ¡ng trá»Ÿ lÃªn |
| `BÃ¡o giáº£m` | `TERMINATED` | BÃ¡o giáº£m háº³n / thÃ´i viá»‡c |

*(Há»‡ thá»‘ng há»— trá»£ tá»± Ä‘á»™ng nháº­n diá»‡n cáº£ tiáº¿ng Viá»‡t cÃ³ dáº¥u, khÃ´ng dáº¥u, vÃ  mÃ£ tiáº¿ng Anh cÅ©).*

#### Ãnh xáº¡ Loáº¡i Ä‘iá»u chá»‰nh (Sheet `DieuChinhBH`):
| Hiá»ƒn thá»‹ tiáº¿ng Viá»‡t trÃªn Dropdown | MÃ£ Code lÆ°u Database | RÃ ng buá»™c sá»‘ tiá»n |
|---|---|---|
| `Äiá»u chá»‰nh ká»³ trÆ°á»›c trá»« chi phÃ­ NLÄ` | `PREV_PERIOD_ADJ` | KhÃ¡c 0 (cho phÃ©p Ã¢m hoáº·c dÆ°Æ¡ng), báº¯t buá»™c cÃ³ `ref_month`, `ref_year` |
| `Trá»« tháº» BHYT` | `HI_CARD_DEDUCTION` | Lá»›n hÆ¡n 0 (> 0) |
| `Thá»‘i thu láº¡i tiá»n tháº» cho NLÄ` | `HI_CARD_REFUND` | Lá»›n hÆ¡n 0 (> 0) |

---

## 4. DANH SÃCH CHI TIáº¾T CÃC API ENDPOINTS

Base URL: `/api/v1/webpayroll`  
YÃªu cáº§u Header: `Authorization: Bearer <token>`  
Content-Type: `application/json` (hoáº·c `multipart/form-data` vá»›i file upload)

| STT | PhÆ°Æ¡ng thá»©c | ÄÆ°á»ng dáº«n (Route) | MÃ´ táº£ chá»©c nÄƒng |
|:---:|:---:|---|---|
| **1** | `GET` | `/insurance/import-template` | Táº£i file Excel template máº«u (gá»“m 2 sheet cÃ³ sáºµn validation dropdown) |
| **2** | `POST` | `/insurance/import-periods` | Import file Excel chá»©a cáº£ 2 sheet (ÄÃ³ng BHXH & Äiá»u chá»‰nh BHXH) |
| **3** | `GET` | `/insurance/adjustments` | TÃ¬m kiáº¿m, phÃ¢n trang danh sÃ¡ch cÃ¡c khoáº£n Ä‘iá»u chá»‰nh báº£o hiá»ƒm |
| **4** | `GET` | `/insurance/adjustments/{id}` | Láº¥y chi tiáº¿t 1 khoáº£n Ä‘iá»u chá»‰nh vÃ  danh sÃ¡ch tÃ i liá»‡u Ä‘Ã­nh kÃ¨m |
| **5** | `POST` | `/insurance/adjustments` | ThÃªm má»›i thá»§ cÃ´ng 1 khoáº£n Ä‘iá»u chá»‰nh báº£o hiá»ƒm |
| **6** | `PUT` | `/insurance/adjustments/{id}` | Cáº­p nháº­t thÃ´ng tin khoáº£n Ä‘iá»u chá»‰nh (chá»‰ khi Ä‘ang á»Ÿ tráº¡ng thÃ¡i `pending`) |
| **7** | `DELETE`| `/insurance/adjustments/{id}` | XÃ³a khoáº£n Ä‘iá»u chá»‰nh (chá»‰ khi Ä‘ang á»Ÿ tráº¡ng thÃ¡i `pending`) |
| **8** | `POST` | `/insurance/adjustments/{id}/confirm` | Duyá»‡t khoáº£n Ä‘iá»u chá»‰nh (`confirmed`) Ä‘á»ƒ náº¡p vÃ o báº£ng lÆ°Æ¡ng |
| **9** | `POST` | `/insurance/adjustments/{id}/reject` | Tá»« chá»‘i khoáº£n Ä‘iá»u chá»‰nh (`rejected`) kÃ¨m lÃ½ do |
| **10**| `POST` | `/insurance/adjustments/{id}/documents`| Upload quyáº¿t Ä‘á»‹nh/biÃªn báº£n Ä‘Ã­nh kÃ¨m cho khoáº£n Ä‘iá»u chá»‰nh |
| **11**| `DELETE`| `/insurance/adjustments/documents/{documentId}` | XÃ³a tÃ i liá»‡u Ä‘Ã­nh kÃ¨m |

---

### 4.1. GET /insurance/import-template
Táº£i file Excel máº«u gá»“m 2 sheet `DongBHXH` vÃ  `DieuChinhBH`.

- **Response**: Tráº£ vá» binary stream file Excel `.xlsx` (`Insurance_Import_Template.xlsx`).

---

### 4.2. POST /insurance/import-periods
Import Ä‘á»“ng thá»i cáº£ dá»¯ liá»‡u Ä‘Ã³ng BHXH Ä‘á»‹nh ká»³ vÃ  dá»¯ liá»‡u Ä‘iá»u chá»‰nh báº£o hiá»ƒm tá»« file Excel.

- **Content-Type**: `multipart/form-data`
- **Request Parameters**:
  - `file`: File Excel (.xlsx / .xls)
  - `projectId`: ID dá»± Ã¡n (int, báº¯t buá»™c)
- **Response Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "totalRows": 25,
    "successRows": 25,
    "errorRows": 0,
    "batchCode": "IPS_20261021153000123",
    "errors": []
  },
  "message": "Import thÃ nh cÃ´ng 25 dÃ²ng dá»¯ liá»‡u báº£o hiá»ƒm."
}
```
- **Response Failed / Validation Error (400 Bad Request)**:
```json
{
  "success": false,
  "message": "Dá»¯ liá»‡u import cÃ³ lá»—i. Vui lÃ²ng kiá»ƒm tra danh sÃ¡ch lá»—i chi tiáº¿t.",
  "data": {
    "totalRows": 20,
    "successRows": 0,
    "errorRows": 2,
    "errors": [
      {
        "row": 3,
        "column": "Äiá»u chá»‰nh - Cá»™t F",
        "value": "",
        "message": "[Äiá»u chá»‰nh BH] Khoáº£n Ä‘iá»u chá»‰nh ká»³ trÆ°á»›c báº¯t buá»™c pháº£i nháº­p thÃ¡ng ká»³ gá»‘c.",
        "errorCode": "REQUIRED_REF_MONTH"
      }
    ]
  }
}
```

---

### 4.3. GET /insurance/adjustments
Tra cá»©u danh sÃ¡ch Ä‘iá»u chá»‰nh báº£o hiá»ƒm phá»¥c vá»¥ mÃ n hÃ¬nh quáº£n trá»‹ C&B.

- **Query Parameters**:
  - `projectId` (`int`, optional): Lá»c theo ID dá»± Ã¡n
  - `year` (`int`, optional): NÄƒm Ã¡p dá»¥ng
  - `month` (`int`, optional): ThÃ¡ng Ã¡p dá»¥ng
  - `adjustmentType` (`string`, optional): `PREV_PERIOD_ADJ` | `HI_CARD_DEDUCTION` | `HI_CARD_REFUND`
  - `status` (`string`, optional): `pending` | `confirmed` | `rejected`
  - `keyword` (`string`, optional): TÃ¬m theo MÃ£ nhÃ¢n viÃªn (GID) hoáº·c Há» tÃªn
  - `pageIndex` (`int`, default: 1): Trang hiá»‡n táº¡i
  - `pageSize` (`int`, default: 20): KÃ­ch thÆ°á»›c trang
- **Response Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 105,
        "employeeCode": "EMP00123",
        "employeeName": "Tráº§n Thá»‹ Mai",
        "adjustmentType": "PREV_PERIOD_ADJ",
        "adjustmentTypeName": "Äiá»u chá»‰nh ká»³ trÆ°á»›c trá»« chi phÃ­ NLÄ",
        "projectId": 12,
        "projectName": "Dá»± Ã¡n Kho Váº­n Long An",
        "applyYear": 2026,
        "applyMonth": 10,
        "refYear": 2026,
        "refMonth": 8,
        "amount": 250000.0,
        "status": "confirmed",
        "statusName": "ÄÃ£ duyá»‡t",
        "decisionNumber": "QÄ-124/2026/HR",
        "decisionDate": "2026-10-15",
        "note": "Truy thu tiá»n BHXH do bÃ¡o tÄƒng muá»™n ká»³ thÃ¡ng 8",
        "statusNote": "Há»“ sÆ¡ Ä‘á»‘i chiáº¿u BHXH há»£p lá»‡",
        "documentCount": 1,
        "createdAt": "2026-10-21T08:30:00"
      }
    ],
    "totalCount": 1,
    "pageIndex": 1,
    "pageSize": 20
  }
}
```

---

### 4.4. POST /insurance/adjustments
ThÃªm má»›i thá»§ cÃ´ng má»™t khoáº£n Ä‘iá»u chá»‰nh báº£o hiá»ƒm.

- **Request Body**:
```json
{
  "employeeCode": "EMP00123",
  "adjustmentType": "PREV_PERIOD_ADJ",
  "projectId": 12,
  "applyYear": 2026,
  "applyMonth": 10,
  "refYear": 2026,
  "refMonth": 8,
  "amount": 250000,
  "note": "Truy thu tiá»n BHXH thÃ¡ng 8",
  "decisionNumber": "QÄ-124/2026/HR",
  "decisionDate": "2026-10-15"
}
```
- **RÃ ng buá»™c kiá»ƒm tra**:
  - `employeeCode` pháº£i tá»“n táº¡i trong há»‡ thá»‘ng.
  - `applyMonth` (1-12), `applyYear` (2000-2100).
  - Vá»›i `PREV_PERIOD_ADJ`: Báº¯t buá»™c pháº£i cÃ³ `refYear` vÃ  `refMonth`. `amount` != 0.
  - Vá»›i `HI_CARD_DEDUCTION` vÃ  `HI_CARD_REFUND`: `amount` > 0.
- **Response Success (200 OK)**:
```json
{
  "success": true,
  "data": 105,
  "message": "Táº¡o khoáº£n Ä‘iá»u chá»‰nh báº£o hiá»ƒm thÃ nh cÃ´ng."
}
```

---

### 4.5. PUT /insurance/adjustments/{id}
Chá»‰nh sá»­a thÃ´ng tin Ä‘iá»u chá»‰nh báº£o hiá»ƒm.

- **Äiá»u kiá»‡n**: Chá»‰ Ä‘Æ°á»£c phÃ©p chá»‰nh sá»­a khi báº£n ghi Ä‘ang á»Ÿ tráº¡ng thÃ¡i `pending`.
- **Request Body**: TÆ°Æ¡ng tá»± nhÆ° API táº¡o má»›i.

---

### 4.6. DELETE /insurance/adjustments/{id}
XÃ³a khoáº£n Ä‘iá»u chá»‰nh báº£o hiá»ƒm.

- **Äiá»u kiá»‡n**: Chá»‰ Ä‘Æ°á»£c phÃ©p xÃ³a khi báº£n ghi Ä‘ang á»Ÿ tráº¡ng thÃ¡i `pending`.

---

### 4.7. POST /insurance/adjustments/{id}/confirm
PhÃª duyá»‡t khoáº£n Ä‘iá»u chá»‰nh báº£o hiá»ƒm.

- **Má»¥c Ä‘Ã­ch**: Chuyá»ƒn tráº¡ng thÃ¡i sang `confirmed`. Chá»‰ nhá»¯ng khoáº£n á»Ÿ tráº¡ng thÃ¡i `confirmed` má»›i Ä‘Æ°á»£c Engine tá»± Ä‘á»™ng náº¡p vÃ o Báº£ng lÆ°Æ¡ng cá»§a thÃ¡ng.
- **Request Body**:
```json
{
  "note": "ÄÃ£ Ä‘á»‘i chiáº¿u khá»›p sá»‘ liá»‡u vá»›i cÆ¡ quan BHXH"
}
```

---

### 4.8. POST /insurance/adjustments/{id}/reject
Tá»« chá»‘i khoáº£n Ä‘iá»u chá»‰nh báº£o hiá»ƒm.

- **Má»¥c Ä‘Ã­ch**: Chuyá»ƒn tráº¡ng thÃ¡i sang `rejected`, khÃ´ng Ã¡p dá»¥ng vÃ o tÃ­nh lÆ°Æ¡ng.
- **Request Body**:
```json
{
  "note": "Sai thÃ´ng tin sá»‘ tiá»n, yÃªu cáº§u kiá»ƒm tra láº¡i há»“ sÆ¡ gá»‘c"
}
```

---

### 4.9. POST /insurance/adjustments/{id}/documents
Upload quyáº¿t Ä‘á»‹nh / biÃªn báº£n / hÃ³a Ä‘Æ¡n chá»©ng tá»« Ä‘Ã­nh kÃ¨m cho khoáº£n Ä‘iá»u chá»‰nh.

- **Content-Type**: `multipart/form-data`
- **Request Parameters**:
  - `file`: File tÃ i liá»‡u (PDF, Word, Excel, HÃ¬nh áº£nh)
  - `documentType`: MÃ£ loáº¡i tÃ i liá»‡u (`DECISION`, `MINUTES`, `REPORT`, ...)
- **Response Success (200 OK)**:
```json
{
  "success": true,
  "data": 12,
  "message": "Táº£i lÃªn tÃ i liá»‡u thÃ nh cÃ´ng."
}
```

---

## 5. FLOW DIá»„N BIáº¾N TRáº NG THÃI (LIFECYCLE & STATE MACHINE)

```mermaid
stateDiagram-v2
    [*] --> Pending: Nháº­p thá»§ cÃ´ng hoáº·c Import Excel
    
    Pending --> Confirmed: Quáº£n lÃ½ C&B duyá»‡t (API /confirm)
    Pending --> Rejected: Quáº£n lÃ½ C&B tá»« chá»‘i (API /reject)
    Pending --> [*]: XÃ³a bá» (API DELETE)
    
    Rejected --> Pending: Chá»‰nh sá»­a láº¡i sá»‘ liá»‡u (API PUT)
    
    state Confirmed {
        [*] --> InPayrollEngine: Cháº¡y tÃ­nh lÆ°Æ¡ng thÃ¡ng (apply_month, apply_year)
        InPayrollEngine --> DeductedOnPayslip: ÄÆ°a vÃ o 3 cá»™t Kháº¥u trá»« trÃªn báº£ng lÆ°Æ¡ng
    }
```

---

## 6. KIá»‚M THá»¬ & SÃCH HÆ¯á»šNG DáºªN C&B (TEST CASES & FAQ)

### 6.1. TrÆ°á»ng há»£p kiá»ƒm thá»­ tiÃªu biá»ƒu

| STT | Ká»‹ch báº£n kiá»ƒm thá»­ | Dá»¯ liá»‡u Ä‘áº§u vÃ o | Ká»³ vá»ng há»‡ thá»‘ng |
|:---:|---|---|---|
| 1 | Import file Excel há»£p lá»‡ cáº£ 2 sheet | Sheet 1: 5 dÃ²ng, Sheet 2: 3 dÃ²ng | Táº¡o thÃ nh cÃ´ng 5 ká»³ Ä‘Ã³ng BHXH vÃ  3 khoáº£n Ä‘iá»u chá»‰nh á»Ÿ tráº¡ng thÃ¡i `pending`. |
| 2 | Import lá»—i á»Ÿ Sheet 2 (thiáº¿u thÃ¡ng ká»³ gá»‘c) | Sheet 1: Ä‘Ãºng háº¿t, Sheet 2: dÃ²ng 2 thiáº¿u `ref_month` | **Rollback toÃ n bá»™**. KhÃ´ng lÆ°u dÃ²ng nÃ o cá»§a cáº£ Sheet 1 vÃ  Sheet 2. Tráº£ vá» thÃ´ng bÃ¡o lá»—i chi tiáº¿t dÃ²ng 2 Sheet 2. |
| 3 | Äiá»u chá»‰nh ká»³ trÆ°á»›c lÃ  tiá»n Ã¢m (-) | `PREV_PERIOD_ADJ` = -250.000Ä‘ | Cháº¥p nháº­n import. Khi tÃ­nh lÆ°Æ¡ng, `{INSURANCE_PREV_ADJUSTMENT}` = -250.000Ä‘ -> Giáº£m tiá»n kháº¥u trá»« cá»§a NLÄ. |
| 4 | Trá»« tháº» BHYT nháº­p tiá»n Ã¢m | `HI_CARD_DEDUCTION` = -150.000Ä‘ | BÃ¡o lá»—i: "Sá»‘ tiá»n trá»« tháº» BHYT pháº£i lá»›n hÆ¡n 0". |
| 5 | Thá»‘i thu láº¡i tiá»n tháº» BHYT | `HI_CARD_REFUND` = 150.000Ä‘ | Cháº¥p nháº­n. Khi tÃ­nh lÆ°Æ¡ng, cÃ´ng thá»©c `0 - {HI_CARD_REFUND}` = -150.000Ä‘ -> LÃ m giáº£m tá»•ng kháº¥u trá»« cá»§a NLÄ Ä‘Ãºng 150.000Ä‘. |
| 6 | Báº£ng lÆ°Æ¡ng Táº¡m á»©ng / Tuáº§n | Báº£ng lÆ°Æ¡ng loáº¡i `advance` / `weekly` | Tá»± Ä‘á»™ng bá» qua cáº£ 3 khoáº£n Ä‘iá»u chá»‰nh báº£o hiá»ƒm, khÃ´ng trá»« tiá»n á»Ÿ ká»³ tuáº§n. |
| 7 | Báº£ng lÆ°Æ¡ng ThÃ¡ng chÃ­nh thá»©c | Báº£ng lÆ°Æ¡ng loáº¡i `monthly` (thÃ¡ng 10/2026) | Chá»‰ láº¥y cÃ¡c báº£n ghi cÃ³ `status = 'confirmed'`. Báº£n ghi `pending` hoáº·c `rejected` khÃ´ng Ä‘Æ°á»£c trá»« vÃ o lÆ°Æ¡ng. |

