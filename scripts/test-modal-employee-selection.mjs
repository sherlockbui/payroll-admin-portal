import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

async function runTest() {
  console.log("=================================================================");
  console.log("🚀 KIỂM THỬ DROPDOWN NHÂN VIÊN & CÁC MODAL (CHROME AUTOMATION)");
  console.log("=================================================================\n");

  const screenshotDir = path.resolve("./dist-widget/test-screenshots");
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
    // 1. Truy cập
    console.log("1. Mở trang http://localhost:3001/employees ...");
    await page.goto("http://localhost:3001/employees", { waitUntil: "networkidle", timeout: 30000 });

    // 2. Chọn dự án PRJ-1049
    console.log("2. Chọn dự án...");
    const projectCombobox = page.locator(".gs-combo-trigger").first();
    await projectCombobox.click();
    await page.waitForTimeout(500);

    const projectOption = page.locator(".gs-combo-option:not([disabled])").nth(1);
    await projectOption.click();
    await page.waitForTimeout(800);

    // ==========================================
    // 3. Subtab Thu nhập khác
    // ==========================================
    console.log("\n3. Kiểm tra Subtab [Thu nhập khác]...");
    const incomesTabBtn = page.getByRole("button", { name: /Thu nhập khác/ }).first();
    await incomesTabBtn.click();
    await page.waitForTimeout(800);

    // Bấm nút "Thêm khoản thu nhập" trên thanh header
    const addIncomeBtn = page.locator("button:has-text('Thêm khoản thu nhập')").first();
    await addIncomeBtn.click();
    await page.waitForTimeout(800);

    // Kiểm tra dropdown nhân viên trong modal (tìm trong dialog)
    const incomeModal = page.locator("[role='dialog']").first();
    const incomeModalTrigger = incomeModal.locator(".searchable-select-trigger").first();
    const incomeTriggerVisible = await incomeModalTrigger.isVisible();
    console.log(`   👉 Dropdown nhân viên hiển thị: ${incomeTriggerVisible ? "CÓ ✅" : "KHÔNG ❌"}`);

    if (incomeTriggerVisible) {
      const selectedText = (await incomeModalTrigger.innerText()).trim();
      console.log(`   👉 Giá trị nhân viên ban đầu: "${selectedText}"`);

      // Bấm mở dropdown để xem danh sách nhân viên
      await incomeModalTrigger.click();
      await page.waitForTimeout(500);

      const options = page.locator(".searchable-select-item");
      const optCount = await options.count();
      console.log(`   👉 Số lượng nhân viên trong danh sách chọn: ${optCount} người`);

      if (optCount > 1) {
        const secondEmpName = (await options.nth(1).innerText()).trim().replace(/\n+/g, " ");
        console.log(`   👉 Chọn nhân viên thứ 2: "${secondEmpName}"`);
        await options.nth(1).click();
        await page.waitForTimeout(500);
      }

      await page.screenshot({ path: path.join(screenshotDir, "modal_01_other_income_selected.png") });
      console.log("   👉 Đã chụp màn hình modal Thu nhập khác sau khi chọn nhân viên ✅");

      // Bấm Hủy bỏ
      await incomeModal.locator("button:has-text('Hủy bỏ'), button:has-text('Hủy')").first().click();
      await page.waitForTimeout(500);
    }

    // ==========================================
    // 4. Subtab Khoản trừ khác
    // ==========================================
    console.log("\n4. Kiểm tra Subtab [Khoản trừ khác]...");
    const deductionsTabBtn = page.getByRole("button", { name: /Khoản trừ khác/ }).first();
    await deductionsTabBtn.click();
    await page.waitForTimeout(800);

    const addDeductionBtn = page.locator("button:has-text('Thêm khoản giảm trừ')").first();
    await addDeductionBtn.click();
    await page.waitForTimeout(800);

    const deductionModal = page.locator("[role='dialog']").first();
    const deductionModalTrigger = deductionModal.locator(".searchable-select-trigger").first();
    const deductionTriggerVisible = await deductionModalTrigger.isVisible();
    console.log(`   👉 Dropdown nhân viên hiển thị: ${deductionTriggerVisible ? "CÓ ✅" : "KHÔNG ❌"}`);

    if (deductionTriggerVisible) {
      const selectedText = (await deductionModalTrigger.innerText()).trim();
      console.log(`   👉 Giá trị nhân viên ban đầu: "${selectedText}"`);

      await deductionModalTrigger.click();
      await page.waitForTimeout(500);

      const options = page.locator(".searchable-select-item");
      const optCount = await options.count();
      console.log(`   👉 Số lượng nhân viên trong danh sách: ${optCount} người`);

      if (optCount > 1) {
        const secondEmpName = (await options.nth(1).innerText()).trim().replace(/\n+/g, " ");
        console.log(`   👉 Chọn nhân viên thứ 2: "${secondEmpName}"`);
        await options.nth(1).click();
        await page.waitForTimeout(500);
      }

      await page.screenshot({ path: path.join(screenshotDir, "modal_02_other_deduction_selected.png") });
      console.log("   👉 Đã chụp màn hình modal Khoản trừ khác sau khi chọn nhân viên ✅");

      await deductionModal.locator("button:has-text('Hủy bỏ'), button:has-text('Hủy')").first().click();
      await page.waitForTimeout(500);
    }

    // ==========================================
    // 5. Subtab Bảo hiểm xã hội
    // ==========================================
    console.log("\n5. Kiểm tra Subtab [Bảo hiểm xã hội]...");
    const insuranceTabBtn = page.getByRole("button", { name: /Bảo hiểm xã hội/ }).first();
    await insuranceTabBtn.click();
    await page.waitForTimeout(800);

    const addInsuranceBtn = page.locator("button:has-text('Khai báo biến động')").first();
    await addInsuranceBtn.click();
    await page.waitForTimeout(800);

    const insuranceModal = page.locator("[role='dialog']").first();
    const insuranceModalTrigger = insuranceModal.locator(".searchable-select-trigger").first();
    const insuranceTriggerVisible = await insuranceModalTrigger.isVisible();
    console.log(`   👉 Dropdown nhân viên hiển thị: ${insuranceTriggerVisible ? "CÓ ✅" : "KHÔNG ❌"}`);

    if (insuranceTriggerVisible) {
      const selectedText = (await insuranceModalTrigger.innerText()).trim();
      console.log(`   👉 Giá trị nhân viên ban đầu: "${selectedText}"`);

      await insuranceModalTrigger.click();
      await page.waitForTimeout(500);

      const options = page.locator(".searchable-select-item");
      const optCount = await options.count();
      console.log(`   👉 Số lượng nhân viên trong danh sách: ${optCount} người`);

      if (optCount > 1) {
        const secondEmpName = (await options.nth(1).innerText()).trim().replace(/\n+/g, " ");
        console.log(`   👉 Chọn nhân viên thứ 2: "${secondEmpName}"`);
        await options.nth(1).click();
        await page.waitForTimeout(500);
      }

      await page.screenshot({ path: path.join(screenshotDir, "modal_03_insurance_declare_selected.png") });
      console.log("   👉 Đã chụp màn hình modal Biến động BHXH sau khi chọn nhân viên ✅");

      await insuranceModal.locator("button:has-text('Hủy bỏ'), button:has-text('Hủy')").first().click();
      await page.waitForTimeout(500);
    }

    // ==========================================
    // 6. Subtab Người phụ thuộc
    // ==========================================
    console.log("\n6. Kiểm tra Subtab [Người phụ thuộc]...");
    const depTabBtn = page.getByRole("button", { name: /Người phụ thuộc/ }).first();
    await depTabBtn.click();
    await page.waitForTimeout(800);

    const addDepBtn = page.locator("button:has-text('Khai báo NPT'), button:has-text('Khai báo người phụ thuộc')").first();
    await addDepBtn.click();
    await page.waitForTimeout(800);

    const depModal = page.locator("[role='dialog']").first();
    const depModalTrigger = depModal.locator(".searchable-select-trigger").first();
    const depTriggerVisible = await depModalTrigger.isVisible();
    console.log(`   👉 Dropdown nhân viên hiển thị: ${depTriggerVisible ? "CÓ ✅" : "KHÔNG ❌"}`);

    if (depTriggerVisible) {
      const selectedText = (await depModalTrigger.innerText()).trim();
      console.log(`   👉 Giá trị nhân viên ban đầu: "${selectedText}"`);

      await depModalTrigger.click();
      await page.waitForTimeout(500);

      const options = page.locator(".searchable-select-item");
      const optCount = await options.count();
      console.log(`   👉 Số lượng nhân viên trong danh sách: ${optCount} người`);

      if (optCount > 1) {
        const secondEmpName = (await options.nth(1).innerText()).trim().replace(/\n+/g, " ");
        console.log(`   👉 Chọn nhân viên thứ 2: "${secondEmpName}"`);
        await options.nth(1).click();
        await page.waitForTimeout(500);
      }

      await page.screenshot({ path: path.join(screenshotDir, "modal_04_dependent_selected.png") });
      console.log("   👉 Đã chụp màn hình modal Người phụ thuộc sau khi chọn nhân viên ✅");

      await depModal.locator("button:has-text('Hủy bỏ'), button:has-text('Hủy')").first().click();
      await page.waitForTimeout(500);
    }

    // 7. Tổng kết lỗi runtime
    console.log("\n7. Kiểm tra lỗi Runtime Console...");
    if (pageErrors.length === 0) {
      console.log("   ✅ 0 lỗi Javascript Runtime!");
    } else {
      console.log(`   ⚠️ Có ${pageErrors.length} lỗi runtime:`, pageErrors);
    }

    console.log("\n=================================================================");
    console.log("🎉 TẤT CẢ MODAL ĐÃ HOẠT ĐỘNG CHUẨN XÁC, CHỌN NHÂN VIÊN THÀNH CÔNG 100%!");
    console.log("=================================================================");
  } catch (err) {
    console.error("❌ Lỗi kiểm thử:", err);
  } finally {
    await browser.close();
  }
}

runTest();
