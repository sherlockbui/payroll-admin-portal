import { expect, test } from "@playwright/test";

test.describe("E2E Test Suite - Phân hệ Quản trị Người lao động", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/employees");
    await expect(page.getByRole("heading", { name: "Người lao động" })).toBeVisible({ timeout: 10000 });
  });

  test("1. Hiển thị thanh điều hướng subtab và bộ lọc dự án", async ({ page }) => {
    // Check main subtabs exist
    await expect(page.getByRole("button", { name: /Người phụ thuộc/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Phép năm/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Công đoàn phí/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Bảo hiểm xã hội/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Khoản trừ khác/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Thu nhập khác/ })).toBeVisible();
  });

  test("2. Điều hướng và tương tác Subtab Người phụ thuộc", async ({ page }) => {
    await page.getByRole("button", { name: /Người phụ thuộc/ }).click();

    // Check action buttons in Dependents subtab
    const declareButton = page.getByRole("button", { name: /Khai báo NPT/i });
    if (await declareButton.isVisible()) {
      await declareButton.click();
      // Check modal open
      await expect(page.getByText(/Khai báo người phụ thuộc/i).first()).toBeVisible();
      // Close modal
      const closeBtn = page.getByRole("button", { name: /Hủy|Đóng/i }).first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  });

  test("3. Điều hướng và tương tác Subtab Phép năm", async ({ page }) => {
    await page.getByRole("button", { name: /Phép năm/ }).click();
    await expect(page.getByRole("button", { name: /Phép năm/ })).toHaveClass(/active/);
  });

  test("4. Điều hướng và tương tác Subtab Công đoàn phí", async ({ page }) => {
    await page.getByRole("button", { name: /Công đoàn phí/ }).click();
    await expect(page.getByRole("button", { name: /Công đoàn phí/ })).toHaveClass(/active/);
  });

  test("5. Điều hướng và tương tác Subtab Bảo hiểm xã hội", async ({ page }) => {
    await page.getByRole("button", { name: /Bảo hiểm xã hội/ }).click();
    await expect(page.getByRole("button", { name: /Bảo hiểm xã hội/ })).toHaveClass(/active/);
  });

  test("6. Điều hướng và tương tác Subtab Khoản trừ khác", async ({ page }) => {
    await page.getByRole("button", { name: /Khoản trừ khác/ }).click();
    await expect(page.getByRole("button", { name: /Khoản trừ khác/ })).toHaveClass(/active/);

    const addDeductionBtn = page.getByRole("button", { name: /Thêm khoản trừ/i });
    if (await addDeductionBtn.isVisible()) {
      await addDeductionBtn.click();
      await expect(page.getByText(/Tạo khoản khấu trừ/i).first()).toBeVisible();
      const closeBtn = page.getByRole("button", { name: /Hủy|Đóng/i }).first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  });

  test("7. Điều hướng và tương tác Subtab Thu nhập khác", async ({ page }) => {
    await page.getByRole("button", { name: /Thu nhập khác/ }).click();
    await expect(page.getByRole("button", { name: /Thu nhập khác/ })).toHaveClass(/active/);

    const addIncomeBtn = page.getByRole("button", { name: /Thêm thu nhập/i });
    if (await addIncomeBtn.isVisible()) {
      await addIncomeBtn.click();
      await expect(page.getByText(/Tạo khoản thu nhập/i).first()).toBeVisible();
      const closeBtn = page.getByRole("button", { name: /Hủy|Đóng/i }).first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  });
});
