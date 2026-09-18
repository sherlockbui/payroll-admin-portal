import { seedDatabase } from "@/lib/mock-data";
import type { MockDatabase } from "@/lib/types";

const STORAGE_KEY = "payroll-admin-demo-db-v26";

let memoryDb: MockDatabase = (() => {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MockDatabase;
        if (parsed && parsed.schemaVersion === seedDatabase.schemaVersion) {
          return parsed;
        }
      }
    } catch {}
  }
  return structuredClone(seedDatabase);
})();

export function readMockDatabase(): MockDatabase {
  return memoryDb;
}

export function writeMockDatabase(database: MockDatabase) {
  memoryDb = database;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
    } catch {}
  }
}

export function mutateMockDatabase(mutator: (database: MockDatabase) => void) {
  mutator(memoryDb);
  writeMockDatabase(memoryDb);
  return memoryDb;
}

export function resetMockDatabase() {
  memoryDb = structuredClone(seedDatabase);
  writeMockDatabase(memoryDb);
  return memoryDb;
}
