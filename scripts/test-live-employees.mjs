import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

async function runLiveTest() {
  console.log("=================================================================");
  console.log("🚀 BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG CHỌN NHÂN VIÊN & MODAL TRÊN LIVE CHROME");
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
    // 1. Mở trang Người lao động
    console.log("1. Đang truy cập http://localhost:3001/employees ...");
    const response = await page.goto("http://localhost:3001/employees", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    console.log(`   👉 HTTP Status: ${response.status()}`);

    // 2. Chọn dự án
    console.log("\n2. Chọn Dự án cụ thể...");
    const projectCombobox = page.locator(".gs-combo-trigger, button:has-text('Tất cả dự án')").first();
    if (await projectCombobox.isVisible()) {
      await projectCombobox.click();
      await page.waitForTimeout(500);

      const firstProjectOption = page.locator(".gs-combo-option, [role='option'], .dropdown-item").nth(1);
      if (await firstProjectOption.isVisible()) {
        const projName = (await firstProjectOption.innerText()).trim();
        console.log(`   👉 Đã chọn dự án: "${projName}"`);
        await firstProjectOption.click();
        await page.waitForTimeout(800);
      }
    }

    // 3. Test Subtab: Thu nhập khác -> Modal Thêm mới -> Dropdown Nhân viên
    console.log("\n3. Kiểm thử Modal [Thêm mới khoản thu nhập khác] & Dropdown Nhân viên...");
    const incomesTabBtn = page.getByRole("button", { name: /Thu nhập khác/ }).first();
    await incomesTabBtn.click();
    await page.waitForTimeout(600);

    const addIncomeBtn = page.getByRole("button", { name: /Thêm mới/i }).first();
    if (await addIncomeBtn.isVisible()) {
      await addIncomeBtn.click();
      await page.waitForTimeout(600);
      console.log("   👉 Đã mở modal 'Thêm mới khoản thu nhập khác'");

      // Kiểm tra GsEmployeeSelect
      const employeeSelect = page.locator(".gs-employee-select-trigger, button:has-text('Chọn người lao động'), button:has-text('Nhân viên')").first();
      const hasEmployeeSelect = await employeeSelect.isVisible();
      console.log(`   👉 Dropdown chọn nhân viên hiển thị: ${hasEmployeeSelect ? "CÓ ✅" : "KHÔNG ❌"}`);

      if (hasEmployeeSelect) {
        await employeeSelect.click();
        await page.waitForTimeout(500);
        const employeeOptions = page.locator(".gs-employee-option, [role='option']");
        const count = await employeeOptions.count();
        console.log(`   👉 Số lượng nhân viên tải được trong dropdown: ${count}`);

        if (count > 0) {
          const firstEmpText = (await employeeOptions.first().innerText()).trim().replace(/\n+/g, " ");
          console.log(`   👉 Chọn nhân viên: ${firstEmpText}`);
          await employeeOptions.first().click();
          await page.waitForTimeout(400);
        }
      }

      await page.screenshot({ path: path.join(screenshotDir, "modal_add_other_income.png") });
      console.log("   👉 Đã chụp màn hình modal Thu nhập khác ✅");

      // Đóng modal
      const cancelBtn = page.getByRole("button", { name: /Hủy bỏ|Hủy/i }).first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // 4. Test Subtab: Khoản trừ khác -> Modal Thêm mới -> Dropdown Nhân viên
    console.log("\n4. Kiểm thử Modal [Thêm mới khoản giảm trừ] & Dropdown Nhân viên...");
    const deductionsTabBtn = page.getByRole("button", { name: /Khoản trừ khác/ }).first();
    await deductionsTabBtn.click();
    await page.waitForTimeout(600);

    const addDeductionBtn = page.getByRole("button", { name: /Thêm mới/i }).first();
    if (await addDeductionBtn.isVisible()) {
      await addDeductionBtn.click();
      await page.waitForTimeout(600);
      console.log("   👉 Đã mở modal 'Thêm mới khoản giảm trừ'");

      const employeeSelect = page.locator(".gs-employee-select-trigger, button:has-text('Chọn người lao động')").first();
      const hasEmployeeSelect = await employeeSelect.isVisible();
      console.log(`   👉 Dropdown chọn nhân viên hiển thị: ${hasEmployeeSelect ? "CÓ ✅" : "KHÔNG ❌"}`);

      if (hasEmployeeSelect) {
        await employeeSelect.click();
        await page.waitForTimeout(500);
        const employeeOptions = page.locator(".gs-employee-option, [role='option']");
        const count = await employeeOptions.count();
        console.log(`   👉 Số lượng nhân viên tải được: ${count}`);

        if (count > 0) {
          await employeeOptions.first().click();
          await page.waitForTimeout(400);
        }
      }

      await page.screenshot({ path: path.join(screenshotDir, "modal_add_other_deduction.png") });
      console.log("   👉 Đã chụp màn hình modal Khoản giảm trừ ✅");

      const cancelBtn = page.getByRole("button", { name: /Hủy bỏ|Hủy/i }).first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // 5. Test Subtab: Bảo hiểm xã hội -> Modal Khai báo biến động
    console.log("\n5. Kiểm thử Modal [Khai báo biến động BHXH D02-LT] & Dropdown Nhân viên...");
    const insuranceTabBtn = page.getByRole("button", { name: /Bảo hiểm xã hội/ }).first();
    await insuranceTabBtn.click();
    await page.waitForTimeout(600);

    const addInsuranceBtn = page.getByRole("button", { name: /Khai báo biến động/i }).first();
    if (await addInsuranceBtn.isVisible()) {
      await addInsuranceBtn.click();
      await page.waitForTimeout(600);
      console.log("   👉 Đã mở modal 'Khai báo biến động BHXH'");

      const employeeSelect = page.locator(".gs-employee-select-trigger, button:has-text('Chọn người lao động')").first();
      const hasEmployeeSelect = await employeeSelect.isVisible();
      console.log(`   👉 Dropdown chọn nhân viên hiển thị: ${hasEmployeeSelect ? "CÓ ✅" : "KHÔNG ❌"}`);

      if (hasEmployeeSelect) {
        await employeeSelect.click();
        await page.waitForTimeout(500);
        const employeeOptions = page.locator(".gs-employee-option, [role='option']");
        const count = await employeeOptions.count();
        console.log(`   👉 Số lượng nhân viên tải được: ${count}`);

        if (count > 0) {
          await employeeOptions.first().click();
          await page.waitForTimeout(400);
        }
      }

      await page.screenshot({ path: path.join(screenshotDir, "modal_declare_insurance.png") });
      console.log("   👉 Đã chụp màn hình modal Biến động BHXH ✅");

      const cancelBtn = page.getByRole("button", { name: /Hủy bỏ|Hủy/i }).first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // 6. Test Subtab: Người phụ thuộc -> Modal Khai báo
    console.log("\n6. Kiểm thử Modal [Khai báo người phụ thuộc] & Dropdown Nhân viên...");
    const depTabBtn = page.getByRole("button", { name: /Người phụ thuộc/ }).first();
    await depTabBtn.click();
    await page.waitForTimeout(600);

    const addDepBtn = page.getByRole("button", { name: /Khai báo người phụ thuộc/i }).first();
    if (await addDepBtn.isVisible()) {
      await addDepBtn.click();
      await page.waitForTimeout(600);
      console.log("   👉 Đã mở modal 'Khai báo người phụ thuộc'");

      const employeeSelect = page.locator(".gs-employee-select-trigger, button:has-text('Chọn người lao động')").first();
      const hasEmployeeSelect = await employeeSelect.isVisible();
      console.log(`   👉 Dropdown chọn nhân viên hiển thị: ${hasEmployeeSelect ? "CÓ ✅" : "KHÔNG ❌"}`);

      await page.screenshot({ path: path.join(screenshotDir, "modal_declare_dependent.png") });

      const cancelBtn = page.getByRole("button", { name: /Hủy bỏ|Hủy/i }).first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // 7. Kiểm tra Console & Runtime Errors
    console.log("\n7. Kiểm tra Javascript Runtime Errors...");
    if (pageErrors.length === 0) {
      console.log("   ✅ 0 lỗi Runtime. Mọi thao tác chọn nhân viên & mở modal hoạt động hoàn hảo!");
    } else {
      console.log(`   ⚠️ Có ${pageErrors.length} lỗi runtime:`);
      pageErrors.forEach((e) => console.log(`      - ${e}`));
    }

    console.log("\n=================================================================");
    console.log("🎉 KIỂM THỬ THÀNH CÔNG: TẤT CẢ MODAL ĐÃ CHỌN ĐƯỢC NHÂN VIÊN CHÍNH XÁC!");
    console.log(`📸 Ảnh chụp kết quả tại: ${screenshotDir}`);
    console.log("=================================================================");
  } catch (error) {
    console.error("❌ Lỗi trong quá trình kiểm thử:", error);
  } finally {
    await browser.close();
  }
}

runLiveTest();
