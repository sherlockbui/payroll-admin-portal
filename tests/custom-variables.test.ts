import { describe, expect, it } from "vitest";
import { api } from "@/lib/api";

describe("Project Custom Formula Variables & Master Data", () => {
  it("lưu và cập nhật giá trị biến tham số cho dự án", async () => {
    const payload = [
      { code: "MUC_PC_NHA_O", value: 280_000 },
      { code: "MUC_PC_DI_LAI", value: 350_000 },
      { code: "TY_LE_BH_NLD", value: 10.5 },
    ];

    const updated = await api.saveProjectCustomVariables("prj-jss", payload);
    expect(Array.isArray(updated)).toBe(true);

    const savedHousing = updated.find((v) => v.code === "MUC_PC_NHA_O");
    expect(savedHousing?.value).toBe(280_000);

    const savedTravel = updated.find((v) => v.code === "MUC_PC_DI_LAI");
    expect(savedTravel?.value).toBe(350_000);

    const savedInsuranceRate = updated.find((v) => v.code === "TY_LE_BH_NLD");
    expect(savedInsuranceRate?.value).toBe(10.5);
  });
});
