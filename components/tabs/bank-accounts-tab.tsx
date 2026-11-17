"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { BankAccountsSubtab } from "@/components/employees/bank-accounts-subtab";
import { GsProjectCombobox } from "@/components/ui";
import { api } from "@/lib/api";

export function BankAccountsTab({
  projectId,
  embedded = false,
}: {
  projectId?: string;
  embedded?: boolean;
}) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || "all");
  const [headerAction, setHeaderAction] = useState<ReactNode>(null);

  const effectiveProjectId = embedded ? projectId || "all" : selectedProjectId || "all";

  const projectsQuery = useQuery({
    queryKey: ["projects-lookup"],
    queryFn: () => api.getLookupProjects(),
    enabled: !embedded,
  });

  const projects = projectsQuery.data ?? [];

  return (
    <div className="bank-accounts-main-page space-y-4">
      {/* Top Header & Project Filter */}
      <div className="page-heading">
        <div>
          <h1>Tài khoản ngân hàng</h1>
        </div>

        <div className="heading-actions flex items-center gap-2">
          {headerAction}
          {!embedded && (
            <div style={{ minWidth: "300px" }}>
              <GsProjectCombobox
                items={projects}
                value={selectedProjectId}
                onChange={setSelectedProjectId}
                placeholder="Tất cả dự án"
                allowAll={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <section className="subtab-content-area">
        <BankAccountsSubtab
          projectId={effectiveProjectId}
          setHeaderAction={setHeaderAction}
        />
      </section>
    </div>
  );
}

