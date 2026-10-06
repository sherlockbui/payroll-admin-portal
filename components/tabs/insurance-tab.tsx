"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { InsuranceSubtab } from "@/components/employees/insurance-subtab";
import { useUserRole } from "@/components/providers";
import { GsProjectCombobox } from "@/components/ui";
import { api } from "@/lib/api";

export function InsuranceTab({
  projectId,
  embedded = false,
}: {
  projectId?: string;
  embedded?: boolean;
}) {
  const { role } = useUserRole();
  const isAccountant = role === "accountant";
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
    <div className="insurance-main-page space-y-4">
      {/* Top Header & Project Filter */}
      <div className="page-heading">
        <div>
          <h1>Bảo hiểm xã hội</h1>
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
        <InsuranceSubtab
          projectId={effectiveProjectId}
          employees={[]}
          isAccountant={isAccountant}
          setHeaderAction={setHeaderAction}
        />
      </section>
    </div>
  );
}
