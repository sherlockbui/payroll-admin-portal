"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  ChevronDown,
  FolderPlus,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/providers";
import { Badge, Button, LoadingBlock, Modal, TablePaginationFooter, usePortalContainer } from "@/components/ui";
import { api } from "@/lib/api";
import { resetMockDatabase } from "@/lib/mock-db";
import type { Employee, ProjectEmployeeGroup } from "@/lib/types";
import { hideGsLoading, showGsLoading } from "@/lib/utils";

interface ManageEmployeeGroupsModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

function RowGroupSelect({
  currentGroupId,
  groups,
  isPending,
  onChange,
}: {
  currentGroupId?: string | null;
  groups: ProjectEmployeeGroup[];
  isPending?: boolean;
  onChange: (groupId: string) => void;
}) {
  const portalContainer = usePortalContainer();
  const isAssigned = Boolean(currentGroupId && currentGroupId !== "0");
  const currentGroup = groups.find(
    (g) => String(g.id) === String(currentGroupId) || g.code === currentGroupId
  );

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild disabled={isPending}>
        <button
          type="button"
          disabled={isPending}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer shadow-2xs hover:shadow-xs outline-none focus:ring-1 focus:ring-primary ${
            isAssigned
              ? "bg-primary/10 text-primary border-primary/25 hover:bg-primary/20"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
          } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
          title="Nhấp để đổi nhóm cho nhân sự này ngay lập tức"
        >
          {isAssigned ? (
            <Layers className="w-3 h-3 text-primary shrink-0" />
          ) : (
            <UserMinus className="w-3 h-3 text-amber-500 shrink-0" />
          )}
          <span className="truncate max-w-[110px]">
            {isAssigned ? currentGroup?.name || "Đã phân nhóm" : "Chưa phân nhóm"}
          </span>
          {isPending ? (
            <Loader2 className="w-3 h-3 animate-spin shrink-0 text-muted" />
          ) : (
            <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal container={portalContainer ?? undefined}>
        <DropdownMenu.Content
          align="end"
          side="bottom"
          sideOffset={6}
          className="z-[99999] w-64 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-2xl p-1.5 animate-in fade-in-50 zoom-in-95 duration-100 focus:outline-none"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold text-muted uppercase tracking-wider border-b border-border/50 mb-1 flex items-center justify-between">
            <span>Đổi nhóm lao động</span>
            <span className="font-mono text-muted text-[10px] font-normal">{groups.length} nhóm</span>
          </div>

          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-0.5">
            {/* Option: Chưa phân nhóm */}
            <DropdownMenu.Item
              onSelect={() => onChange("0")}
              className={`w-full px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer outline-none ${
                !isAssigned
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold"
                  : "hover:bg-amber-500/10 hover:text-amber-600 text-foreground"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <UserMinus className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="block truncate font-medium">Chưa phân nhóm</span>
                </div>
              </div>
              {!isAssigned && <Check className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1.5" />}
            </DropdownMenu.Item>

            <div className="h-px bg-border/50 my-1" />

            {/* Groups */}
            {groups.map((g) => {
              const isSelected = String(g.id) === String(currentGroupId) || g.code === currentGroupId;
              return (
                <DropdownMenu.Item
                  key={g.id}
                  onSelect={() => onChange(String(g.id))}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer outline-none ${
                    isSelected
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-secondary/80 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate font-medium">{g.name}</span>
                      {g.description && (
                        <span className="block text-[10px] text-muted truncate">{g.description}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-secondary border border-border/50 text-muted">
                      {g.employeeCount ?? 0} NS
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </div>
                </DropdownMenu.Item>
              );
            })}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function BulkTargetGroupSelect({
  selectedGroupId,
  groups,
  onSelectGroup,
}: {
  selectedGroupId: string;
  groups: ProjectEmployeeGroup[];
  onSelectGroup: (groupId: string) => void;
}) {
  const portalContainer = usePortalContainer();
  const selectedGroup = groups.find(
    (g) => String(g.id) === String(selectedGroupId) || g.code === selectedGroupId
  );

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="h-8 pl-3 pr-2.5 text-xs font-semibold rounded-xl border border-border/80 bg-card hover:bg-secondary/60 text-foreground hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-2xs flex items-center justify-between gap-2.5 min-w-[220px] max-w-[280px] transition-all"
        >
          <div className="flex items-center gap-2 min-w-0">
            {selectedGroupId === "0" ? (
              <>
                <UserMinus className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate text-amber-600 dark:text-amber-400 font-bold">Chưa phân nhóm</span>
              </>
            ) : selectedGroup ? (
              <>
                <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate text-foreground font-bold">{selectedGroup.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {selectedGroup.employeeCount ?? 0} NS
                </span>
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5 text-muted shrink-0" />
                <span className="truncate text-muted font-normal">-- Chọn nhóm đích chuyển vào --</span>
              </>
            )}
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted shrink-0 transition-transform duration-200" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal container={portalContainer ?? undefined}>
        <DropdownMenu.Content
          side="top"
          align="end"
          sideOffset={8}
          className="z-[99999] w-72 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-2xl p-1.5 animate-in fade-in-50 zoom-in-95 duration-100 focus:outline-none"
        >
          <div className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-wider border-b border-border/50 mb-1 flex items-center justify-between">
            <span>Chọn nhóm đích chuyển vào</span>
            <span className="font-mono font-normal text-muted">{groups.length} nhóm</span>
          </div>

          <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-0.5">
            {/* Option: Chưa phân nhóm */}
            <DropdownMenu.Item
              onSelect={() => onSelectGroup("0")}
              className={`w-full px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer outline-none ${
                selectedGroupId === "0"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold"
                  : "hover:bg-amber-500/10 hover:text-amber-600 text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <UserMinus className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="block truncate font-semibold">Chưa phân nhóm</span>
                  <span className="block text-[10px] text-muted truncate">Hủy phân nhóm của nhân sự</span>
                </div>
              </div>
              {selectedGroupId === "0" && <Check className="w-4 h-4 text-amber-500 shrink-0 ml-2" />}
            </DropdownMenu.Item>

            <div className="h-px bg-border/50 my-1" />

            {/* List Groups */}
            {groups.map((g) => {
              const isSelected = selectedGroupId === String(g.id) || selectedGroupId === g.code;
              return (
                <DropdownMenu.Item
                  key={g.id}
                  onSelect={() => onSelectGroup(String(g.id))}
                  className={`w-full px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer outline-none ${
                    isSelected
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-secondary/80 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate font-semibold">{g.name}</span>
                      {g.description && (
                        <span className="block text-[10px] text-muted truncate">{g.description}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-secondary border border-border/50 text-muted">
                      {g.employeeCount ?? 0} NS
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                </DropdownMenu.Item>
              );
            })}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function ManageEmployeeGroupsModal({
  projectId,
  isOpen,
  onClose,
}: ManageEmployeeGroupsModalProps) {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  // Active Category / Group Filter ("all" | "unassigned" | groupId)
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Multi-select state for bulk actions (retained across searches and pagination)
  const [selectedEmployees, setSelectedEmployees] = useState<
    Map<string, { id: string; code: string; name: string }>
  >(new Map());
  const [bulkTargetGroupId, setBulkTargetGroupId] = useState<string>("");
  const [pendingEmpCode, setPendingEmpCode] = useState<string | null>(null);

  // Table search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Inline Group Create/Edit Form State (Left Sidebar)
  const [isInlineGroupFormOpen, setIsInlineGroupFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProjectEmployeeGroup | null>(null);
  const [groupFormName, setGroupFormName] = useState("");
  const [groupFormDescription, setGroupFormDescription] = useState("");

  // Group Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<ProjectEmployeeGroup | null>(null);

  // Queries
  const groupsQuery = useQuery({
    queryKey: ["project-employee-groups", projectId],
    queryFn: () => api.getProjectEmployeeGroups(projectId),
    enabled: isOpen && !!projectId,
  });

  const groupIdParam = useMemo(() => {
    if (selectedCategory === "all" || selectedCategory === "unassigned") return undefined;
    return selectedCategory;
  }, [selectedCategory]);

  const isAssignedParam = useMemo(() => {
    if (selectedCategory === "unassigned") return false;
    if (selectedCategory === "all") return undefined;
    return undefined;
  }, [selectedCategory]);

  const employeesQuery = useQuery({
    queryKey: ["project-employees", projectId, isAssignedParam, groupIdParam, page, pageSize, debouncedSearch],
    queryFn: () =>
      api.getProjectEmployees(projectId, {
        pageIndex: page,
        pageSize: pageSize,
        isAssigned: isAssignedParam,
        groupId: groupIdParam,
        search: debouncedSearch || undefined,
      }),
    enabled: isOpen && !!projectId,
    placeholderData: (previousData) => previousData,
  });

  const unassignedCountQuery = useQuery({
    queryKey: ["project-employees-unassigned-count", projectId],
    queryFn: () =>
      api.getProjectEmployees(projectId, {
        pageIndex: 1,
        pageSize: 1,
        isAssigned: false,
      }),
    enabled: isOpen && !!projectId,
  });

  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);
  const employees = useMemo(() => employeesQuery.data?.items ?? [], [employeesQuery.data]);
  const totalUnassignedCount = unassignedCountQuery.data?.totalRow ?? 0;

  // Group Helper Map
  const groupMap = useMemo(() => {
    const map = new Map<string, ProjectEmployeeGroup>();
    groups.forEach((g) => {
      map.set(String(g.id), g);
      if (g.code) map.set(g.code, g);
    });
    return map;
  }, [groups]);

  // Active Group object if a specific group is selected
  const activeGroup = useMemo(() => {
    if (selectedCategory === "all" || selectedCategory === "unassigned") return null;
    return groups.find((g) => String(g.id) === String(selectedCategory) || g.code === selectedCategory) ?? null;
  }, [groups, selectedCategory]);

  // Mutations
  const createGroupMutation = useMutation({
    mutationFn: (payload: Partial<ProjectEmployeeGroup>) =>
      api.createProjectEmployeeGroup(projectId, payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["project-employee-groups", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-employees", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-policies", projectId] });
      setIsInlineGroupFormOpen(false);
      if (created?.id) setSelectedCategory(created.id);
      notify("Đã tạo nhóm người lao động mới thành công!");
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ProjectEmployeeGroup> }) =>
      api.updateProjectEmployeeGroup(projectId, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-employee-groups", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-employees", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-policies", projectId] });
      setIsInlineGroupFormOpen(false);
      notify("Đã cập nhật thông tin nhóm lao động!");
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: string) => api.deleteProjectEmployeeGroup(projectId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-employee-groups", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-employees", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-employees-unassigned-count", projectId] });
      queryClient.invalidateQueries({ queryKey: ["employees", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-policies", projectId] });
      setIsDeleteModalOpen(false);
      setDeletingGroup(null);
      setSelectedCategory("all");
      notify("Đã xóa nhóm người lao động thành công!");
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const assignMutation = useMutation({
    mutationFn: ({ groupId, employeeIds }: { groupId: string; employeeIds: string[] }) =>
      api.assignEmployeesToGroup(projectId, groupId, { employeeCodes: employeeIds }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["project-employee-groups", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-employees", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-employees-unassigned-count", projectId] });
      queryClient.invalidateQueries({ queryKey: ["employees", projectId] });
      setSelectedEmployees(new Map());
      setBulkTargetGroupId("");

      if (vars.groupId === "0") {
        notify(`Đã chuyển ${vars.employeeIds.length} nhân sự về trạng thái "Chưa phân nhóm"!`);
      } else {
        const targetGrp = groups.find((g) => String(g.id) === String(vars.groupId) || g.code === vars.groupId);
        notify(`Đã chuyển ${vars.employeeIds.length} nhân sự sang nhóm "${targetGrp?.name ?? "mới"}"!`);
      }
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  useEffect(() => {
    if (!isOpen) return;
    if (
      createGroupMutation.isPending ||
      updateGroupMutation.isPending ||
      deleteGroupMutation.isPending
    ) {
      showGsLoading("Đang xử lý phân bổ nhóm...");
    } else {
      hideGsLoading();
    }
    return () => hideGsLoading();
  }, [
    isOpen,
    createGroupMutation.isPending,
    updateGroupMutation.isPending,
    deleteGroupMutation.isPending,
  ]);

  // Action Handlers
  const handleOpenCreateGroup = () => {
    setEditingGroup(null);
    setGroupFormName("");
    setGroupFormDescription("");
    setIsInlineGroupFormOpen(true);
  };

  const handleOpenEditGroup = (group: ProjectEmployeeGroup, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingGroup(group);
    setGroupFormName(group.name);
    setGroupFormDescription(group.description ?? "");
    setIsInlineGroupFormOpen(true);
  };

  const handleOpenDeleteGroup = (group: ProjectEmployeeGroup, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeletingGroup(group);
    setIsDeleteModalOpen(true);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupFormName.trim()) {
      notify("Vui lòng nhập tên nhóm người lao động", "warning");
      return;
    }

    const payload: Partial<ProjectEmployeeGroup> = {
      name: groupFormName.trim(),
      description: groupFormDescription.trim(),
    };

    if (editingGroup) {
      updateGroupMutation.mutate({ id: editingGroup.id, payload });
    } else {
      createGroupMutation.mutate(payload);
    }
  };

  // Bulk Transfer Handler: retains all selected across multiple searches & pages
  const handleExecuteBulkTransfer = () => {
    if (!bulkTargetGroupId || selectedEmployees.size === 0) return;
    const codes = Array.from(selectedEmployees.values()).map((e) => e.code || e.id);
    assignMutation.mutate({
      groupId: bulkTargetGroupId,
      employeeIds: codes,
    });
  };

  const isEmpSelected = (emp: Employee) => {
    const code = emp.code || emp.id;
    return selectedEmployees.has(code) || selectedEmployees.has(emp.id);
  };

  const toggleSelectEmp = (emp: Employee) => {
    setSelectedEmployees((prev) => {
      const next = new Map(prev);
      const key = emp.code || emp.id;
      if (next.has(key)) {
        next.delete(key);
      } else if (next.has(emp.id)) {
        next.delete(emp.id);
      } else {
        next.set(key, { id: emp.id, code: key, name: emp.name });
      }
      return next;
    });
  };

  const areAllCurrentPageSelected =
    employees.length > 0 && employees.every((e) => isEmpSelected(e));

  const toggleSelectAll = () => {
    setSelectedEmployees((prev) => {
      const next = new Map(prev);
      if (areAllCurrentPageSelected) {
        employees.forEach((e) => {
          next.delete(e.code || e.id);
          next.delete(e.id);
        });
      } else {
        employees.forEach((e) => {
          const key = e.code || e.id;
          next.set(key, { id: e.id, code: key, name: e.name });
        });
      }
      return next;
    });
  };

  // 1-Click Row Group Switcher
  const handleRowGroupChange = (emp: Employee, targetGroupId: string) => {
    const code = emp.code || emp.id;
    setPendingEmpCode(code);
    assignMutation.mutate(
      { groupId: targetGroupId, employeeIds: [code] },
      {
        onSettled: () => {
          setPendingEmpCode(null);
        },
      }
    );
  };

  const getEmployeeAvatar = (gender?: string) => {
    const g = String(gender || "").trim().toLowerCase();
    if (g === "female" || g === "nữ" || g === "nu" || g === "f" || g === "1") {
      return "/Contents/img/avatar_female.png";
    }
    return "/Contents/img/avatar_male.png";
  };

  const formatGenderBadge = (gender?: string) => {
    const g = String(gender || "").trim().toLowerCase();
    if (g === "female" || g === "nữ" || g === "nu" || g === "f" || g === "1") {
      return (
        <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          Nữ
        </span>
      );
    }
    if (g === "male" || g === "nam" || g === "m" || g === "0") {
      return (
        <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
          Nam
        </span>
      );
    }
    return null;
  };

  return (
    <>
      <Modal
        open={isOpen}
        onOpenChange={(open) => !open && onClose()}
        title="Quản lý Nhóm người lao động"
        description="Tổ chức danh mục nhóm và điều chuyển phân bổ nhân sự áp dụng chính sách lương phù hợp"
        size="xl"
      >
        <div className="space-y-3.5">
          {groupsQuery.isLoading && !groupsQuery.data ? (
            <LoadingBlock rows={8} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 h-[530px]">
              {/* ================= LEFT COLUMN: DANH MỤC NHÓM (4 Cols) ================= */}
              <aside className="md:col-span-4 flex flex-col h-full rounded-2xl bg-secondary/35 border border-border/70 p-3 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-border/60 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-foreground uppercase tracking-wider">
                      Phân loại nhân sự
                    </span>
                  </div>
                  {!isInlineGroupFormOpen && (
                    <Button
                      size="sm"
                      variant="primary"
                      className="h-7 text-xs px-2.5 shadow-2xs font-semibold"
                      onClick={handleOpenCreateGroup}
                      title="Tạo nhóm mới"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tạo nhóm
                    </Button>
                  )}
                </div>

                {/* Inline Create / Edit Group Form in Left Column */}
                {isInlineGroupFormOpen ? (
                  <form
                    onSubmit={handleSaveGroup}
                    className="flex flex-col flex-1 pt-3 space-y-3 overflow-y-auto custom-scrollbar animate-in fade-in-50 duration-150"
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-border/50">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <FolderPlus className="w-3.5 h-3.5 text-primary" />
                        {editingGroup ? "Sửa tên nhóm" : "Tạo nhóm mới"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsInlineGroupFormOpen(false)}
                        className="text-muted hover:text-foreground p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2.5 flex-1">
                      <div>
                        <label className="text-[11px] font-semibold text-foreground mb-1 block">
                          Tên nhóm <span className="text-rose-500">*</span>
                        </label>
                        <input
                          className="w-full h-8 px-2.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-primary shadow-2xs"
                          placeholder="VD: Quản lý, Công nhân..."
                          value={groupFormName}
                          onChange={(e) => setGroupFormName(e.target.value)}
                          autoFocus
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-foreground mb-1 block">
                          Mô tả tiêu chuẩn áp dụng
                        </label>
                        <textarea
                          className="w-full min-h-[80px] p-2.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-primary shadow-2xs resize-none"
                          placeholder="Mô tả tiêu chuẩn xếp loại của nhóm này trong bảng chính sách lương..."
                          value={groupFormDescription}
                          onChange={(e) => setGroupFormDescription(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs px-2"
                        onClick={() => setIsInlineGroupFormOpen(false)}
                      >
                        Hủy
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        variant="primary"
                        className="h-7 text-xs px-2.5 font-semibold"
                        disabled={createGroupMutation.isPending || updateGroupMutation.isPending}
                      >
                        <Save className="w-3 h-3" /> Lưu
                      </Button>
                    </div>
                  </form>
                ) : (
                  /* Categories & Groups List */
                  <div className="flex-1 overflow-y-auto custom-scrollbar pt-2 space-y-1">
                    {/* System Filter: Tất cả nhân sự */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory("all");
                        setSelectedEmployees(new Map());
                        setPage(1);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border ${selectedCategory === "all"
                          ? "bg-card border-primary/50 text-primary shadow-xs font-bold"
                          : "bg-transparent border-transparent text-muted hover:bg-card/70 hover:text-foreground"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 shrink-0" />
                        <span>Tất cả nhân sự</span>
                      </div>
                      <span className="text-[11px] font-mono text-muted">
                        {employeesQuery.data?.totalRow ?? 0} nhân sự
                      </span>
                    </button>

                    {/* System Filter: Chưa phân nhóm */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory("unassigned");
                        setSelectedEmployees(new Map());
                        setPage(1);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border ${selectedCategory === "unassigned"
                          ? "bg-card border-primary/50 text-primary shadow-xs font-bold"
                          : "bg-transparent border-transparent text-muted hover:bg-card/70 hover:text-foreground"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <UserMinus className="w-3.5 h-3.5 shrink-0" />
                        <span>Chưa phân nhóm</span>
                      </div>
                      <span
                        className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full border ${totalUnassignedCount > 0
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold"
                            : "text-muted border-transparent"
                          }`}
                      >
                        {totalUnassignedCount} nhân sự
                      </span>
                    </button>

                    {/* Section Divider */}
                    <div className="pt-2 pb-1 px-1 flex items-center justify-between text-[11px] font-bold text-muted uppercase tracking-wider border-t border-border/50">
                      <span>Nhóm lao động ({groups.length})</span>
                    </div>

                    {groups.length === 0 ? (
                      <div className="py-6 text-center text-xs text-muted">
                        Chưa có nhóm nào. Bấm &quot;Tạo nhóm&quot; để thiết lập.
                      </div>
                    ) : (
                      groups.map((group) => {
                        const isSelected = selectedCategory === group.id;
                        const count = group.employeeCount ?? 0;

                        return (
                          <div
                            key={group.id}
                            onClick={() => {
                              setSelectedCategory(group.id);
                              setSelectedEmployees(new Map());
                              setPage(1);
                            }}
                            className={`group/item relative px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between border ${isSelected
                                ? "bg-card border-primary/50 text-foreground shadow-xs"
                                : "bg-transparent border-transparent hover:bg-card/70 hover:border-border/60 text-muted hover:text-foreground"
                              }`}
                          >
                            {isSelected && (
                              <span className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
                            )}

                            <div className="min-w-0 flex-1 pr-1.5">
                              <span
                                className={`text-xs truncate block ${isSelected ? "font-bold text-primary" : "font-semibold text-foreground"
                                  }`}
                              >
                                {group.name}
                              </span>
                              {group.description && (
                                <span className="text-[10px] text-muted truncate block">
                                  {group.description}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span
                                className={`text-[11px] font-mono px-1.5 py-0.5 rounded-full border ${isSelected
                                    ? "bg-primary/10 text-primary border-primary/25 font-bold"
                                    : "bg-secondary text-muted border-border/50"
                                  }`}
                              >
                                {count} nhân sự
                              </span>

                              <button
                                type="button"
                                className="p-1 rounded text-muted hover:text-foreground hover:bg-secondary opacity-0 group-hover/item:opacity-100 transition-opacity"
                                onClick={(e) => handleOpenEditGroup(group, e)}
                                title="Sửa nhóm"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                className="p-1 rounded text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                onClick={(e) => handleOpenDeleteGroup(group, e)}
                                title="Xóa nhóm"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </aside>

              {/* ================= RIGHT MAIN AREA: BẢNG NHÂN SỰ & ĐIỀU CHUYỂN (8 Cols) ================= */}
              <main className="md:col-span-8 flex flex-col h-full space-y-2.5 min-w-0 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-border/60 shrink-0">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-foreground tracking-tight">
                        {selectedCategory === "all"
                          ? "Tất cả nhân sự dự án"
                          : selectedCategory === "unassigned"
                            ? "Nhân sự chưa phân nhóm"
                            : `Nhóm: ${activeGroup?.name || "Danh sách nhân sự"}`}
                      </h4>
                      <Badge tone={selectedCategory === "unassigned" && totalUnassignedCount > 0 ? "warning" : "info"}>
                        {employeesQuery.data?.totalRow ?? employees.length} nhân sự
                      </Badge>
                    </div>
                    <p className="text-xs text-muted max-w-lg leading-relaxed">
                      {selectedCategory === "all"
                        ? "Xem toàn bộ nhân sự và thay đổi nhóm phân bổ tức thì ở cột Nhóm lao động."
                        : selectedCategory === "unassigned"
                          ? "Danh sách nhân sự cần được chỉ định vào nhóm để áp dụng chính sách lương tương ứng."
                          : activeGroup?.description || "Các nhân sự thuộc nhóm này được áp dụng cùng chính sách lương."}
                    </p>
                  </div>

                  {activeGroup && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs font-medium border-border gap-1.5"
                      onClick={() => handleOpenEditGroup(activeGroup)}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Sửa nhóm
                    </Button>
                  )}
                </div>

                {/* Toolbar & Search & Selected Counter */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <label className="search-field search-field-full flex-1">
                    <Search />
                    <input
                      type="text"
                      placeholder="Tìm theo tên, mã nhân viên, vị trí, xưởng..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                      }}
                    />
                    {employeesQuery.isFetching && !employeesQuery.isLoading && (
                      <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                    )}
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setDebouncedSearch("");
                          setPage(1);
                        }}
                        className="text-muted hover:text-foreground p-0.5 rounded-full hover:bg-secondary shrink-0"
                        title="Xóa tìm kiếm"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </label>

                  {selectedEmployees.size > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/25 text-xs font-semibold shrink-0 animate-in fade-in">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{selectedEmployees.size} đã chọn</span>
                      <button
                        type="button"
                        onClick={() => setSelectedEmployees(new Map())}
                        className="p-0.5 ml-0.5 rounded hover:bg-primary/20 text-muted hover:text-foreground transition-colors cursor-pointer"
                        title="Bỏ chọn tất cả"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Employees Table Container (Fixed Flex Height) */}
                {employeesQuery.isFetching && employees.length === 0 ? (
                  <div className="py-16 px-4 flex flex-col items-center justify-center text-center rounded-2xl bg-secondary/30 border border-border/70 space-y-2 flex-1 min-h-0">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <span className="text-xs text-muted font-medium">Đang tải danh sách nhân sự...</span>
                  </div>
                ) : employees.length === 0 ? (
                  <div className="py-14 px-4 flex flex-col items-center justify-center text-center rounded-2xl bg-secondary/30 border border-border/70 space-y-2 flex-1 min-h-0">
                    <Users className="w-8 h-8 text-muted mx-auto" />
                    <h5 className="text-xs font-semibold text-foreground text-center">
                      {searchQuery
                        ? "Không tìm thấy nhân sự phù hợp"
                        : selectedCategory === "unassigned"
                          ? "Tuyệt vời! Toàn bộ nhân sự dự án đã được phân vào nhóm."
                          : `Chưa có nhân sự nào trong nhóm này.`}
                    </h5>
                    <p className="text-[11px] text-muted max-w-md mx-auto text-center leading-relaxed">
                      {selectedCategory === "unassigned"
                        ? "Không có nhân sự nào chưa có nhóm."
                        : "Chọn mục 'Tất cả nhân sự' hoặc 'Chưa phân nhóm' bên trái để chuyển nhân sự vào nhóm này."}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/80 bg-card shadow-2xs flex-1 min-h-0 flex flex-col overflow-hidden">
                    <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 custom-scrollbar">
                      <table className="w-full border-collapse text-left !min-w-0 table-auto">
                        <thead>
                          <tr className="border-b border-border/60 bg-secondary/70 backdrop-blur-xs sticky top-0 z-10 text-[11px] font-bold text-muted uppercase tracking-wider">
                            <th className="w-9 px-2.5 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={areAllCurrentPageSelected}
                                onChange={toggleSelectAll}
                                className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                              />
                            </th>
                            <th className="px-3 py-2">NHÂN SỰ</th>
                            <th className="w-48 px-3 py-2 text-right">NHÓM LAO ĐỘNG</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {employees.map((emp) => {
                            const isSelected = isEmpSelected(emp);
                            const isPending = pendingEmpCode === (emp.code || emp.id);

                            return (
                              <tr
                                key={emp.id}
                                className={`transition-colors hover:bg-secondary/30 ${isSelected ? "bg-primary/5 dark:bg-primary/10" : ""
                                  }`}
                              >
                                <td className="px-2.5 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectEmp(emp)}
                                    className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2.5">
                                    <img
                                      src={getEmployeeAvatar(emp.gender)}
                                      alt={emp.name}
                                      className="w-7 h-7 rounded-full object-cover shrink-0 border border-border/60 bg-secondary"
                                    />
                                    <div className="space-y-0.5 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-xs text-foreground truncate block">
                                          {emp.name}
                                        </span>
                                        {formatGenderBadge(emp.gender)}
                                      </div>
                                      <span className="text-[11px] font-mono text-muted block">
                                        {emp.code}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <RowGroupSelect
                                    currentGroupId={emp.groupId}
                                    groups={groups}
                                    isPending={isPending}
                                    onChange={(targetGroupId) => handleRowGroupChange(emp, targetGroupId)}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Table Pagination */}
                {employeesQuery.data && (
                  <div className="mt-auto pt-1 shrink-0">
                    <TablePaginationFooter
                      totalItems={employeesQuery.data.totalRow}
                      currentPage={page}
                      pageSize={pageSize}
                      onPageChange={setPage}
                      onPageSizeChange={(newPageSize) => {
                        setPageSize(newPageSize);
                        setPage(1);
                      }}
                    />
                  </div>
                )}
              </main>
            </div>
          )}

          {/* Modal Footer (Transforms seamlessly into Bulk Transfer Action Bar when items selected) */}
          <div className="flex items-center justify-between pt-3 border-t border-border/60">
            {selectedEmployees.size > 0 ? (
              <div className="flex flex-wrap items-center justify-between w-full gap-2.5 p-2 rounded-xl bg-primary/10 border border-primary/25 shadow-2xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" /> Đã chọn {selectedEmployees.size} nhân sự
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[11px] text-muted hover:text-foreground cursor-pointer"
                    onClick={() => setSelectedEmployees(new Map())}
                  >
                    Bỏ chọn
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <BulkTargetGroupSelect
                    selectedGroupId={bulkTargetGroupId}
                    groups={groups}
                    onSelectGroup={setBulkTargetGroupId}
                  />

                  <Button
                    size="sm"
                    variant="primary"
                    className="h-8 text-xs font-semibold shadow-2xs gap-1.5 px-3"
                    onClick={handleExecuteBulkTransfer}
                    disabled={!bulkTargetGroupId || assignMutation.isPending}
                  >
                    {assignMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                    Chuyển {selectedEmployees.size} nhân sự
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted hover:text-foreground gap-1.5"
                  onClick={() => {
                    resetMockDatabase();
                    queryClient.invalidateQueries();
                    notify("Đã làm mới và nạp lại toàn bộ dữ liệu mẫu thành công!");
                  }}
                  title="Khôi phục toàn bộ nhóm và nhân sự mẫu về mặc định"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Nạp lại dữ liệu mẫu
                </Button>
                <Button variant="secondary" onClick={onClose}>
                  Đóng
                </Button>
              </>
            )}
          </div>
        </div>
      </Modal>

      {/* DIALOG: DELETE GROUP CONFIRMATION */}
      <Modal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title={`Xác nhận xóa nhóm "${deletingGroup?.name}"?`}
        description="Các nhân sự trong nhóm này sẽ được chuyển về trạng thái 'Chưa phân nhóm'. Dữ liệu nhân sự không bị mất."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={() => deletingGroup && deleteGroupMutation.mutate(deletingGroup.id)}
              disabled={deleteGroupMutation.isPending}
            >
              <Trash2 className="w-3.5 h-3.5" /> Xóa nhóm
            </Button>
          </>
        }
      >
        <p className="text-xs text-muted leading-relaxed">
          Bạn có chắc chắn muốn xóa nhóm <strong>{deletingGroup?.name}</strong>? Thao tác này sẽ xóa cấu hình nhóm khỏi bảng ma trận chính sách của dự án.
        </p>
      </Modal>
    </>
  );
}
