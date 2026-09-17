"use client";

import { Check, ChevronDown, RefreshCw, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePayrollProjects } from "@/lib/hooks/use-payroll";
import type { ProjectItem } from "@/lib/payroll-types";
import { cn } from "@/lib/utils";
import { usePortalContainer } from "@/components/ui";

export interface ProjectSelectProps {
  value?: number | string | null;
  onChange: (value: any, project?: ProjectItem | null) => void;
  placeholder?: string;
  allLabel?: string;
  allowAll?: boolean;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  icon?: ReactNode;
  variant?: "filter" | "form";
  autoFocus?: boolean;
}

export function ProjectSelect({
  value,
  onChange,
  placeholder = "-- Chọn dự án --",
  allLabel = "-- Tất cả dự án --",
  allowAll = true,
  className,
  triggerClassName,
  disabled = false,
  icon,
  variant = "filter",
}: ProjectSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search input by 250ms to call API with payload { search }
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Query projects from API with payload "search"
  const { data: projectsData, isLoading, isFetching } = usePayrollProjects(
    debouncedSearch.trim() ? { search: debouncedSearch.trim() } : undefined
  );

  const projects = projectsData || [];

  // Cache to remember selected project even if server search results exclude it
  const [projectCache, setProjectCache] = useState<Map<string | number, ProjectItem>>(new Map());

  useEffect(() => {
    if (projects.length > 0) {
      setProjectCache((prev) => {
        const next = new Map(prev);
        for (const p of projects) {
          const pId = p.id ?? p.projectId;
          if (pId != null) {
            next.set(pId, p);
            next.set(String(pId), p);
            if (p.projectId != null) {
              next.set(p.projectId, p);
              next.set(String(p.projectId), p);
            }
          }
        }
        return next;
      });
    }
  }, [projects]);

  // Resolve selected project
  const selectedProject = useMemo(() => {
    if (value === "" || value == null) return null;
    const directMatch = projects.find(
      (p) =>
        p.id === Number(value) ||
        p.projectId === Number(value) ||
        String(p.id) === String(value) ||
        String(p.projectId) === String(value)
    );
    if (directMatch) return directMatch;
    return projectCache.get(value) || projectCache.get(Number(value)) || null;
  }, [value, projects, projectCache]);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = Math.max(rect.width, 280);
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < 280 && rect.top > 280;

    setCoords({
      top: showAbove ? rect.top - 6 : rect.bottom + 6,
      left: Math.min(rect.left, Math.max(10, window.innerWidth - dropdownWidth - 16)),
      width: dropdownWidth,
    });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (!open) {
      updatePosition();
      setSearch("");
      setDebouncedSearch("");
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    function handleOutside(e: MouseEvent | TouchEvent) {
      const path = e.composedPath ? e.composedPath() : [];
      const target = e.target as Node;
      if (
        popoverRef.current &&
        (path.includes(popoverRef.current) || popoverRef.current.contains(target))
      ) {
        return;
      }
      if (
        triggerRef.current &&
        (path.includes(triggerRef.current) || triggerRef.current.contains(target))
      ) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    function handleScroll(e: Event) {
      const path = e.composedPath ? e.composedPath() : [];
      const target = e.target as Node;
      if (
        popoverRef.current &&
        (path.includes(popoverRef.current) || popoverRef.current.contains(target))
      ) {
        return;
      }
      updatePosition();
    }

    function handleResize() {
      updatePosition();
    }

    document.addEventListener("mousedown", handleOutside, true);
    document.addEventListener("touchstart", handleOutside, true);
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize, true);

    return () => {
      document.removeEventListener("mousedown", handleOutside, true);
      document.removeEventListener("touchstart", handleOutside, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize, true);
    };
  }, [open]);

  const portalContainer = usePortalContainer();

  const isAllSelected = value === "" || value == null;

  return (
    <div className={cn("project-select-wrap relative inline-block", variant === "form" && "w-full", className)}>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "project-select-trigger",
          `variant-${variant}`,
          open && "open",
          disabled && "disabled",
          triggerClassName
        )}
        onClick={handleToggle}
        disabled={disabled}
        aria-expanded={open}
      >
        <span className="project-select-display flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          {icon && <span className="project-select-icon text-muted-foreground shrink-0">{icon}</span>}
          {selectedProject ? (
            <span className="truncate">
              <strong className="font-semibold text-primary mr-1.5">{selectedProject.projectCode}</strong>
              <span className="text-muted-foreground">— {selectedProject.projectName}</span>
            </span>
          ) : (
            <span className="text-muted-foreground truncate">{allowAll ? allLabel : placeholder}</span>
          )}
        </span>
        <ChevronDown className={cn("project-select-chevron w-4 h-4 shrink-0 transition-transform text-muted-foreground", open && "rotate-180")} />
      </button>

      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            className="searchable-select-popover project-select-popover"
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
          >
            {/* Search Input Box */}
            <div className="searchable-select-search-box">
              <Search className="search-icon" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo mã hoặc tên dự án..."
                className="searchable-select-input"
                onClick={(e) => e.stopPropagation()}
                aria-label="Tìm kiếm dự án"
              />
              {isFetching && (
                <RefreshCw className="spin w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              {search && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearch("");
                    setDebouncedSearch("");
                    inputRef.current?.focus();
                  }}
                  title="Xóa tìm kiếm"
                >
                  <X />
                </button>
              )}
            </div>

            {/* Options List */}
            <div className="searchable-select-options-list max-h-60 overflow-y-auto">
              {allowAll && (
                <button
                  type="button"
                  className={cn(
                    "searchable-select-item",
                    isAllSelected && "selected"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange("", null);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <div className="item-text-group">
                    <span className="item-label font-medium">{allLabel}</span>
                  </div>
                  {isAllSelected && <Check className="item-check" />}
                </button>
              )}

              {isLoading && projects.length === 0 ? (
                <div className="searchable-select-empty flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                  <RefreshCw className="spin w-3.5 h-3.5" />
                  <span>Đang tải danh mục dự án…</span>
                </div>
              ) : projects.length === 0 ? (
                <div className="searchable-select-empty py-4 text-xs text-muted-foreground text-center">
                  Không tìm thấy dự án phù hợp
                </div>
              ) : (
                projects.map((project) => {
                  const pId = project.id ?? project.projectId;
                  const isSelected =
                    !isAllSelected &&
                    (Number(value) === project.id ||
                      Number(value) === project.projectId ||
                      String(value) === String(project.id) ||
                      String(value) === String(project.projectId));

                  return (
                    <button
                      key={pId}
                      type="button"
                      className={cn("searchable-select-item", isSelected && "selected")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange(pId, project);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <div className="item-text-group flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300">
                            {project.projectCode}
                          </span>
                          <span className="item-label font-medium truncate">{project.projectName}</span>
                        </div>
                      </div>
                      {isSelected && <Check className="item-check" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          portalContainer || document.body
        )}
    </div>
  );
}
