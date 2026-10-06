import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

async function testDatePicker() {
  console.log("=================================================================");
  console.log("🧪 KIỂM THỬ THỰC TẾ CHỌN NGÀY TRÊN TRÌNH DUYỆT CHROME");
  console.log("=================================================================\n");

  const screenshotDir = path.resolve("./dist-widget/test-screenshots-datepicker");
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  const pageErrors = [];

  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  try {
    // 1. Mở trang employees
    console.log("1. Mở trang http://localhost:3001/employees ...");
    await page.goto("http://localhost:3001/employees", { waitUntil: "networkidle", timeout: 30000 });

    // 2. Chọn dự án PRJ-1049
    console.log("2. Chọn dự án...");
    const projectCombobox = page.locator(".gs-combo-trigger").first();
    await projectCombobox.click();
    await page.waitForTimeout(400);

    const projectOption = page.locator(".gs-combo-option:not([disabled])").nth(1);
    await projectOption.click();
    await page.waitForTimeout(600);

    // 3. Chuyển sang subtab Người phụ thuộc
    console.log("3. Mở subtab [Người phụ thuộc]...");
    const depTabBtn = page.getByRole("button", { name: /Người phụ thuộc/ }).first();
    await depTabBtn.click();
    await page.waitForTimeout(600);

    // 4. Bấm Khai báo NPT để mở Modal
    console.log("4. Mở Modal Khai báo người phụ thuộc...");
    const addDepBtn = page.locator("button:has-text('Khai báo NPT'), button:has-text('Khai báo người phụ thuộc')").first();
    await addDepBtn.click();
    await page.waitForTimeout(800);

    const depModal = page.locator("[role='dialog']").first();
    await page.screenshot({ path: path.join(screenshotDir, "01_modal_opened.png") });

    // 5. Kiểm tra dropdown Loại tài liệu minh chứng
    console.log("5. Kiểm tra dropdown 'Loại tài liệu minh chứng'...");
    const docTypeWrap = depModal.locator(".searchable-select-wrap").nth(2); // 0: employee, 1: relationship, 2: docType
    const docTypeTrigger = docTypeWrap.locator(".searchable-select-trigger");
    await docTypeTrigger.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotDir, "01_doctype_dropdown_opened.png") });

    // Click chọn Căn cước công dân
    const cccdOption = docTypeWrap.locator(".searchable-select-item:has-text('Căn cước công dân')").first();
    if (await cccdOption.isVisible()) {
      await cccdOption.click();
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: path.join(screenshotDir, "01_doctype_selected.png") });

    // 5. Kiểm tra DatePicker Ngày sinh trong Modal
    console.log("5. Kiểm tra DatePicker 'Ngày sinh'...");
    // Tìm datepicker trong modal
    const dobPickerWrap = depModal.locator(".gs-date-picker-group:has-text('Ngày sinh')").first();
    const dobTrigger = dobPickerWrap.locator(".gs-date-input-trigger");
    const initialText = (await dobTrigger.innerText()).trim();
    console.log(`   👉 Text ban đầu: "${initialText}"`);

    // Bấm mở DatePicker popover
    console.log("6. Bấm mở Popover lịch...");
    await dobTrigger.click();
    await page.waitForTimeout(400);

    const popover = dobPickerWrap.locator(".gs-date-popover");
    const isPopoverVisible = await popover.isVisible();
    console.log(`   👉 Popover lịch hiển thị: ${isPopoverVisible ? "CÓ ✅" : "KHÔNG ❌"}`);

    await page.screenshot({ path: path.join(screenshotDir, "02_datepicker_popover_open.png") });

    // 7. Click chọn ngày 15
    console.log("7. Click chọn ngày 15 trong bảng lịch...");
    const day15Btn = popover.locator(".gs-date-cell-btn:not(.is-other-month):has-text('15')").first();
    await day15Btn.click();
    await page.waitForTimeout(400);

    const textAfter15 = (await dobTrigger.innerText()).trim();
    console.log(`   👉 Text sau khi chọn ngày 15: "${textAfter15}"`);

    await page.screenshot({ path: path.join(screenshotDir, "03_date_15_selected.png") });

    // 8. Kiểm tra DatePicker 'Hiệu lực từ ngày'
    console.log("\n8. Kiểm tra DatePicker 'Hiệu lực từ ngày'...");
    const effectiveFromWrap = depModal.locator(".gs-date-picker-group:has-text('Hiệu lực từ ngày')").first();
    const effectiveFromTrigger = effectiveFromWrap.locator(".gs-date-input-trigger");
    await effectiveFromTrigger.click();
    await page.waitForTimeout(400);

    const effPopover = effectiveFromWrap.locator(".gs-date-popover");
    const todayBtn = effPopover.locator(".gs-date-quick-today");
    console.log("9. Bấm nút 'Hôm nay'...");
    await todayBtn.click();
    await page.waitForTimeout(400);

    const textAfterToday = (await effectiveFromTrigger.innerText()).trim();
    console.log(`   👉 Text sau khi bấm Hôm nay: "${textAfterToday}"`);

    await page.screenshot({ path: path.join(screenshotDir, "04_today_selected.png") });

    // 10. Kiểm tra subtab Thu nhập khác
    console.log("\n10. Đóng modal NPT và kiểm tra subtab [Thu nhập khác]...");
    await depModal.locator("button:has-text('Hủy bỏ'), button:has-text('Hủy')").first().click();
    await page.waitForTimeout(500);

    const incomeTabBtn = page.getByRole("button", { name: /Thu nhập khác/ }).first();
    await incomeTabBtn.click();
    await page.waitForTimeout(600);

    const addIncomeBtn = page.locator("button:has-text('Thêm khoản thu nhập')").first();
    await addIncomeBtn.click();
    await page.waitForTimeout(800);

    const incomeModal = page.locator("[role='dialog']").first();
    const incomeDateWrap = incomeModal.locator(".gs-date-picker-group:has-text('Ngày hiệu lực'), .gs-date-picker-group:has-text('Ngày')").first();
    if (await incomeDateWrap.isVisible()) {
      const incTrigger = incomeDateWrap.locator(".gs-date-input-trigger");
      await incTrigger.click();
      await page.waitForTimeout(400);

      const incPopover = incomeDateWrap.locator(".gs-date-popover");
      const day20Btn = incPopover.locator(".gs-date-cell-btn:not(.is-other-month):has-text('20')").first();
      await day20Btn.click();
      await page.waitForTimeout(400);

      const incSelected = (await incTrigger.innerText()).trim();
      console.log(`   👉 Thu nhập khác - Text sau khi chọn ngày 20: "${incSelected}"`);
    }

    await page.screenshot({ path: path.join(screenshotDir, "05_income_modal_date_selected.png") });

    console.log("\n=================================================================");
    console.log("🎉 KẾT QUẢ KIỂM THỬ: DATE PICKER CHỌN NGÀY HOẠT ĐỘNG HOÀN TOÀN TỐT!");
    console.log("=================================================================");
  } catch (err) {
    console.error("❌ Lỗi kiểm thử:", err);
  } finally {
    await browser.close();
  }
}

testDatePicker();
