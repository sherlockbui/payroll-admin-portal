"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  ChevronDown,
  FolderPlus,
  Layers,
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
import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/providers";
import { Badge, Button, LoadingBlock, Modal, TablePaginationFooter } from "@/components/ui";
import { api } from "@/lib/api";
import { resetMockDatabase } from "@/lib/mock-db";
import type { Employee, ProjectEmployeeGroup } from "@/lib/types";
import { hideGsLoading, showGsLoading } from "@/lib/utils";

interface ManageEmployeeGroupsModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
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

  // Multi-select state for bulk actions
  const [selectedEmpIds, setSelectedEmpIds] = useState<Set<string>>(new Set());
  const [bulkTargetGroupId, setBulkTargetGroupId] = useState<string>("");
  const [isBulkDropdownOpen, setIsBulkDropdownOpen] = useState(false);
  const bulkDropdownRef = useRef<HTMLDivElement>(null);

  // Close bulk dropdown when clicking outside
  useEffect(() => {
    if (!isBulkDropdownOpen) return;
    function handleBulkOutside(e: MouseEvent | TouchEvent) {
      const path = e.composedPath ? e.composedPath() : [];
      const target = e.target as Node;
      if (bulkDropdownRef.current && (path.includes(bulkDropdownRef.current) || bulkDropdownRef.current.contains(target))) {
        return;
      }
      setIsBulkDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleBulkOutside, true);
    document.addEventListener("touchstart", handleBulkOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleBulkOutside, true);
      document.removeEventListener("touchstart", handleBulkOutside, true);
    };
  }, [isBulkDropdownOpen]);

  // Table search
  const [searchQuery, setSearchQuery] = useState("");

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
    queryKey: ["project-employees", projectId, isAssignedParam, groupIdParam, page, pageSize, searchQuery],
    queryFn: () =>
      api.getProjectEmployees(projectId, {
        pageIndex: page,
        pageSize: pageSize,
        isAssigned: isAssignedParam,
        groupId: groupIdParam,
        search: searchQuery.trim() || undefined,
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
      setSelectedEmpIds(new Set());
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
      deleteGroupMutation.isPending ||
      assignMutation.isPending
    ) {
      showGsLoading("Đang xử lý phân bổ nhóm...");
    } else if (employeesQuery.isFetching && Boolean(employeesQuery.data)) {
      showGsLoading("Đang tải danh sách nhân sự...");
    } else {
      hideGsLoading();
    }
    return () => hideGsLoading();
  }, [
    isOpen,
    createGroupMutation.isPending,
    updateGroupMutation.isPending,
    deleteGroupMutation.isPending,
    assignMutation.isPending,
    employeesQuery.isFetching,
    Boolean(employeesQuery.data),
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

  // Bulk Transfer Handler
  const handleExecuteBulkTransfer = () => {
    if (!bulkTargetGroupId || selectedEmpIds.size === 0) return;
    const codes = employees
      .filter((e) => selectedEmpIds.has(e.id) || selectedEmpIds.has(e.code))
      .map((e) => e.code || e.id);
    assignMutation.mutate({
      groupId: bulkTargetGroupId,
      employeeIds: codes.length > 0 ? codes : Array.from(selectedEmpIds),
    });
  };

  const toggleSelectEmp = (id: string) => {
    setSelectedEmpIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedEmpIds.size === employees.length && employees.length > 0) {
      setSelectedEmpIds(new Set());
    } else {
      setSelectedEmpIds(new Set(employees.map((e) => e.id)));
    }
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
        size="lg"
      >
        <div className="space-y-3.5">
          {groupsQuery.isLoading && !groupsQuery.data ? (
            <LoadingBlock rows={8} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 min-h-[480px]">
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
                        setSelectedEmpIds(new Set());
                        setPage(1);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border ${
                        selectedCategory === "all"
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
                        setSelectedEmpIds(new Set());
                        setPage(1);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border ${
                        selectedCategory === "unassigned"
                          ? "bg-card border-primary/50 text-primary shadow-xs font-bold"
                          : "bg-transparent border-transparent text-muted hover:bg-card/70 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <UserMinus className="w-3.5 h-3.5 shrink-0" />
                        <span>Chưa phân nhóm</span>
                      </div>
                      <span
                        className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full border ${
                          totalUnassignedCount > 0
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
                              setSelectedEmpIds(new Set());
                              setPage(1);
                            }}
                            className={`group/item relative px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between border ${
                              isSelected
                                ? "bg-card border-primary/50 text-foreground shadow-xs"
                                : "bg-transparent border-transparent hover:bg-card/70 hover:border-border/60 text-muted hover:text-foreground"
                            }`}
                          >
                            {isSelected && (
                              <span className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
                            )}

                            <div className="min-w-0 flex-1 pr-1.5">
                              <span
                                className={`text-xs truncate block ${
                                   isSelected ? "font-bold text-primary" : "font-semibold text-foreground"
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
                                className={`text-[11px] font-mono px-1.5 py-0.5 rounded-full border ${
                                  isSelected
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
              <main className="md:col-span-8 flex flex-col h-full space-y-3 min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
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

                {/* Toolbar & Search */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <label className="search-field search-field-full flex-1">
                      <Search />
                      <input
                        type="text"
                        placeholder="Tìm theo tên, mã nhân viên, vị trí, xưởng..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setPage(1);
                        }}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setPage(1);
                          }}
                          className="text-muted hover:text-foreground p-0.5 rounded-full hover:bg-secondary shrink-0"
                          title="Xóa tìm kiếm"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </label>
                  </div>

                  {/* PROMINENT BULK ACTION BAR */}
                  {selectedEmpIds.size > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 rounded-xl bg-primary/10 border border-primary/25 shadow-xs animate-in fade-in duration-150">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4" /> Đã chọn {selectedEmpIds.size} nhân sự
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[11px] text-muted hover:text-foreground"
                          onClick={() => setSelectedEmpIds(new Set())}
                        >
                          Bỏ chọn
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* CUSTOM BULK GROUP DROPDOWN */}
                        <div className="relative" ref={bulkDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setIsBulkDropdownOpen(!isBulkDropdownOpen)}
                            className="h-7 pl-2.5 pr-2 text-xs font-semibold rounded-lg border border-border bg-card text-foreground hover:border-primary/50 focus:outline-none focus:border-primary cursor-pointer shadow-2xs flex items-center justify-between gap-2 min-w-[190px]"
                          >
                            <span className="truncate">
                              {!bulkTargetGroupId
                                ? "-- Chọn nhóm chuyển vào --"
                                : `Chuyển vào: ${groupMap.get(bulkTargetGroupId)?.name || "Nhóm"}`}
                            </span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-muted shrink-0 transition-transform ${
                                isBulkDropdownOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {isBulkDropdownOpen && (
                            <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border border-border bg-card shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                              <div className="px-2 py-1 text-[10px] font-bold text-muted uppercase tracking-wider">
                                Chọn nhóm đích
                              </div>

                              <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-0.5">
                                {groups.map((g) => {
                                  const isSelected = bulkTargetGroupId === String(g.id) || bulkTargetGroupId === g.code;
                                  return (
                                    <button
                                      key={g.id}
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setBulkTargetGroupId(String(g.id));
                                        setIsBulkDropdownOpen(false);
                                      }}
                                      onClick={() => {
                                        setBulkTargetGroupId(String(g.id));
                                        setIsBulkDropdownOpen(false);
                                      }}
                                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-left flex items-center justify-between transition-colors cursor-pointer ${
                                        isSelected
                                          ? "bg-primary/10 text-primary font-bold"
                                          : "hover:bg-secondary text-foreground"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                                        <span className="truncate">Nhóm: {g.name}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[10px] text-muted font-mono">
                                          ({g.employeeCount ?? 0})
                                        </span>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="primary"
                          className="h-7 text-xs font-semibold shadow-2xs gap-1.5"
                          onClick={handleExecuteBulkTransfer}
                          disabled={!bulkTargetGroupId || assignMutation.isPending}
                        >
                          <ArrowRight className="w-3.5 h-3.5" /> Chuyển nhóm
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Employees Table */}
                {employeesQuery.isFetching && employees.length === 0 ? (
                  <div className="py-16 px-4 flex flex-col items-center justify-center text-center rounded-2xl bg-secondary/30 border border-border/70 space-y-2 flex-1">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <span className="text-xs text-muted font-medium">Đang tải danh sách nhân sự...</span>
                  </div>
                ) : employees.length === 0 ? (
                  <div className="py-14 px-4 flex flex-col items-center justify-center text-center rounded-2xl bg-secondary/30 border border-border/70 space-y-2 flex-1">
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
                  <div className="rounded-xl border border-border/80 bg-card shadow-2xs flex-1 flex flex-col overflow-hidden">
                    <div className="overflow-y-auto overflow-x-hidden flex-1 max-h-[340px] custom-scrollbar">
                      <table className="w-full border-collapse text-left !min-w-0 table-auto">
                        <thead>
                          <tr className="border-b border-border/60 bg-secondary/40 text-[11px] font-bold text-muted uppercase tracking-wider">
                            <th className="w-9 px-2.5 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={
                                  employees.length > 0 &&
                                  selectedEmpIds.size === employees.length
                                }
                                onChange={toggleSelectAll}
                                className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                              />
                            </th>
                            <th className="px-3 py-2">NHÂN SỰ</th>
                            <th className="w-44 px-3 py-2 text-right">NHÓM LAO ĐỘNG</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {employees.map((emp) => {
                            const isSelected = selectedEmpIds.has(emp.id);

                            return (
                              <tr
                                key={emp.id}
                                className={`transition-colors hover:bg-secondary/30 ${
                                  isSelected ? "bg-primary/5 dark:bg-primary/10" : ""
                                }`}
                              >
                                <td className="px-2.5 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectEmp(emp.id)}
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
                                  {emp.groupId && emp.groupId !== "0" && groupMap.get(String(emp.groupId)) ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                      {groupMap.get(String(emp.groupId))?.name}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                      Chưa phân nhóm
                                    </span>
                                  )}
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
                  <div className="mt-auto pt-1">
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

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border/60">
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
