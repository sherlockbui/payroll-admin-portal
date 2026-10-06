import { expect, test } from "@playwright/test";

test.describe("Live IIS Express App - Kiểm thử Phân hệ Người lao động trên ASP.NET", () => {
  test("1. Mở trang live IIS Express và kiểm tra menu sidebar", async ({ page }) => {
    // Navigate to live ASP.NET page
    const response = await page.goto("http://localhost:63021/Pages/PayrollEmployees.aspx", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    expect(response?.status()).toBe(200);

    // Check page title
    const title = await page.title();
    expect(title).toContain("Quản trị người lao động");

    // Check Sidebar has Quản lý lương
    const sidebar = page.locator(".gs-sidebar");
    await expect(sidebar).toBeVisible();

    const payrollGroup = page.locator("#gsNavPayrollGroup");
    await expect(payrollGroup).toBeVisible();

    // Check sublink 'Người lao động' is active
    const employeeLink = page.locator('a[href*="PayrollEmployees.aspx"]');
    await expect(employeeLink).toBeVisible();
    await expect(employeeLink).toHaveClass(/is-active/);

    // Check Widget container & Custom Element <payroll-employees>
    const widget = page.locator("#payrollEmployeesWidget");
    await expect(widget).toBeVisible();
  });
});
