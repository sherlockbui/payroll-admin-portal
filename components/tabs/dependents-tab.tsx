"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { DependentsSubtab } from "@/components/employees/dependents-subtab";
import { GsProjectCombobox } from "@/components/ui";
import { api } from "@/lib/api";

export function DependentsTab({
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
    <div className="dependents-main-page space-y-4">
      {/* Top Header & Project Filter */}
      <div className="page-heading">
        <div>
          <h1>Người phụ thuộc</h1>
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
        <DependentsSubtab
          projectId={effectiveProjectId}
          employees={[]}
          setHeaderAction={setHeaderAction}
        />
      </section>
    </div>
  );
}
