"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  CheckCheck,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  History,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  UploadCloud,
  UserCheck,
  X,
  FilePlus,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useToast, useUserRole } from "@/components/providers";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Modal,
  TablePaginationFooter,
} from "@/components/ui";
import { api } from "@/lib/api";
import type {
  AuditLogV3,
  CreateDependentRequestV3,
  DependentDetailV3,
  DependentDocument,
  DependentStatusV3,
  DocumentTypeCode,
  DocumentTypeItem,
  Employee,
  ImportErrorDetailV3,
  RelationshipCode,
  RelationshipItem,
  UpdateDependentRequestV3,
} from "@/lib/types";
import { formatDate, formatMonthYear } from "@/lib/utils";

export function DependentsSubtab({
  projectId,
  employees,
  setHeaderAction,
}: {
  projectId: string;
  employees: Employee[];
  setHeaderAction?: (node: ReactNode) => void;
}) {
  const { notify } = useToast();
  const { role } = useUserRole();
  const isAccountant = role === "accountant";
  const queryClient = useQueryClient();

  // Filter & Pagination States
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || "all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [relationshipFilter, setRelationshipFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Modal States
  const [declareModalOpen, setDeclareModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [auditLogsDrawerOpen, setAuditLogsDrawerOpen] = useState(false);

  // Active target for actions
  const [activeDependent, setActiveDependent] = useState<DependentDetailV3 | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [bulkConfirming, setBulkConfirming] = useState(false);

  // Form States for Declare
  const [formEmployeeCode, setFormEmployeeCode] = useState("");
  const [formFullName, setFormFullName] = useState("");
  const [formDob, setFormDob] = useState("");
  const [formIdentityNumber, setFormIdentityNumber] = useState("");
  const [formTaxCode, setFormTaxCode] = useState("");
  const [formRelationshipCode, setFormRelationshipCode] = useState<RelationshipCode>("CON_RUOT_NUOI");
  const [formEffectiveFrom, setFormEffectiveFrom] = useState("2026-08");
  const [formEffectiveTo, setFormEffectiveTo] = useState("");
  const [formDocType, setFormDocType] = useState<DocumentTypeCode>("GIAY_KHAI_SINH");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formFilePreview, setFormFilePreview] = useState<string | null>(null);
  const formFileInputRef = useRef<HTMLInputElement>(null);

  // Form States for Edit
  const [editFullName, setEditFullName] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editIdentityNumber, setEditIdentityNumber] = useState("");
  const [editTaxCode, setEditTaxCode] = useState("");
  const [editRelationshipCode, setEditRelationshipCode] = useState<RelationshipCode>("CON_RUOT_NUOI");
  const [editEffectiveFrom, setEditEffectiveFrom] = useState("");
  const [editEffectiveTo, setEditEffectiveTo] = useState("");

  // Upload Document Modal in Documents Manager
  const [uploadingDocType, setUploadingDocType] = useState<DocumentTypeCode>("GIAY_KHAI_SINH");
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const uploadFileInputRef = useRef<HTMLInputElement>(null);

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importErrors, setImportErrors] = useState<ImportErrorDetailV3[] | null>(null);
  const [importSummaryResult, setImportSummaryResult] = useState<{ total: number; success: number; error: number } | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Update selectedProjectId if prop changes
  useEffect(() => {
    if (projectId && projectId !== "all") {
      setSelectedProjectId(projectId);
    }
  }, [projectId]);

  // Sync Header action button
  useEffect(() => {
    if (setHeaderAction) {
      setHeaderAction(
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAuditLogsDrawerOpen(true)}
            className="gap-1.5 font-medium shrink-0"
          >
            <History className="w-3.5 h-3.5" /> Nhật ký
          </Button>
          {isAccountant ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setImportModalOpen(true)}
              className="gap-1.5 font-semibold shrink-0"
            >
              <Upload className="w-3.5 h-3.5" /> Import Excel
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                resetDeclareForm();
                setDeclareModalOpen(true);
              }}
              className="gap-1.5 font-semibold shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Khai báo NPT
            </Button>
          )}
        </div>
      );
    }
    return () => {
      if (setHeaderAction) setHeaderAction(null);
    };
  }, [isAccountant, setHeaderAction]);

  // ================= Queries =================
  const { data: masterRelationships = [] } = useQuery<RelationshipItem[]>({
    queryKey: ["master-dependent-relationships"],
    queryFn: () => api.getDependentRelationshipsV3(),
    staleTime: 1000 * 60 * 30,
  });

  const { data: masterDocTypes = [] } = useQuery<DocumentTypeItem[]>({
    queryKey: ["master-dependent-doctypes"],
    queryFn: () => api.getDependentDocumentTypesV3(),
    staleTime: 1000 * 60 * 30,
  });

  const { data: projectList = [] } = useQuery({
    queryKey: ["web-payroll-projects"],
    queryFn: () => api.getProjectsV3(),
    staleTime: 1000 * 60 * 10,
  });

  const { data: summaryData, refetch: refetchSummary } = useQuery({
    queryKey: ["dependents-summary-v3", selectedProjectId],
    queryFn: () => api.getDependentsSummaryV3(selectedProjectId),
  });

  const {
    data: listResponse,
    isLoading: isListLoading,
    isError: isListError,
    refetch: refetchList,
  } = useQuery({
    queryKey: [
      "dependents-list-v3",
      selectedProjectId,
      searchTerm,
      relationshipFilter,
      statusFilter,
      currentPage,
      pageSize,
    ],
    queryFn: () =>
      api.getDependentsV3({
        projectId: selectedProjectId,
        search: searchTerm,
        relationship: relationshipFilter,
        status: statusFilter,
        page: currentPage,
        pageSize,
      }),
  });

  const { data: projectEmployees = [] } = useQuery({
    queryKey: ["project-employees-v3", selectedProjectId],
    queryFn: () => api.getProjectEmployeesV3(selectedProjectId),
  });

  const { data: auditLogsData } = useQuery({
    queryKey: ["dependents-audit-logs-v3"],
    queryFn: () => api.getDependentAuditLogsV3({ pageSize: 50 }),
    enabled: auditLogsDrawerOpen,
  });

  const dependents = listResponse?.items ?? [];
  const totalItems = listResponse?.total ?? 0;
  const totalPages = listResponse?.totalPages ?? 1;

  // ================= Mutations =================
  const createMutation = useMutation({
    mutationFn: (payload: CreateDependentRequestV3) => api.createDependentV3(payload),
    onSuccess: () => {
      notify("Khai báo người phụ thuộc thành công!");
      setDeclareModalOpen(false);
      resetDeclareForm();
      refetchList();
      refetchSummary();
    },
    onError: (err: any) => {
      notify(err.message || "Lỗi khi khai báo người phụ thuộc", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateDependentRequestV3 }) =>
      api.updateDependentV3(id, payload),
    onSuccess: () => {
      notify("Cập nhật thông tin người phụ thuộc thành công!");
      setEditModalOpen(false);
      refetchList();
      refetchSummary();
    },
    onError: (err: any) => {
      notify(err.message || "Lỗi khi cập nhật thông tin", "error");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (id: number) => api.confirmDependentV3(id),
    onSuccess: () => {
      notify("Đã xác nhận hồ sơ người phụ thuộc thành công!");
      setConfirmModalOpen(false);
      setActiveDependent(null);
      refetchList();
      refetchSummary();
    },
    onError: (err: any) => {
      notify(err.message || "Lỗi khi xác nhận hồ sơ", "error");
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.approveDependentV3(id),
    onSuccess: () => {
      notify("Đã phê duyệt người phụ thuộc thành công!");
      setActiveDependent(null);
      refetchList();
      refetchSummary();
    },
    onError: (err: any) => {
      notify(err.message || "Lỗi khi phê duyệt hồ sơ", "error");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.rejectDependentV3(id, reason),
    onSuccess: () => {
      notify("Đã từ chối hồ sơ người phụ thuộc!");
      setRejectModalOpen(false);
      setRejectionReason("");
      setActiveDependent(null);
      refetchList();
      refetchSummary();
    },
    onError: (err: any) => {
      notify(err.message || "Lỗi khi từ chối hồ sơ", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteDependentV3(id),
    onSuccess: () => {
      notify("Đã xóa người phụ thuộc thành công!");
      refetchList();
      refetchSummary();
    },
    onError: (err: any) => {
      notify(err.message || "Lỗi khi xóa người phụ thuộc", "error");
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: ({ depId, formData }: { depId: number; formData: FormData }) =>
      api.uploadDependentDocumentV3(depId, formData),
    onSuccess: (newDoc) => {
      notify("Tải lên tài liệu đính kèm thành công!");
      if (activeDependent) {
        setActiveDependent({
          ...activeDependent,
          documentsCount: (activeDependent.documentsCount || 0) + 1,
          documents: [...(activeDependent.documents || []), newDoc],
        });
      }
      setUploadingFile(null);
      refetchList();
    },
    onError: (err: any) => {
      notify(err.message || "Lỗi khi tải tài liệu lên", "error");
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: ({ depId, docId }: { depId: number; docId: number }) =>
      api.deleteDependentDocumentV3(depId, docId),
    onSuccess: (_, variables) => {
      notify("Đã xóa tài liệu đính kèm!");
      if (activeDependent) {
        setActiveDependent({
          ...activeDependent,
          documentsCount: Math.max(0, (activeDependent.documentsCount || 1) - 1),
          documents: (activeDependent.documents || []).filter((d) => d.id !== variables.docId),
        });
      }
      refetchList();
    },
    onError: (err: any) => {
      notify(err.message || "Lỗi khi xóa tài liệu", "error");
    },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => api.importDependentsExcelV3(file),
    onSuccess: (res) => {
      setImportSummaryResult({
        total: res.totalRows,
        success: res.successRows,
        error: res.errorRows,
      });
      setImportErrors(res.errors || null);
      if (res.errorRows === 0) {
        notify(`Import thành công ${res.successRows}/${res.totalRows} người phụ thuộc!`);
        setTimeout(() => {
          setImportModalOpen(false);
          resetImportModal();
          refetchList();
          refetchSummary();
        }, 1200);
      } else {
        notify(`Đã xử lý tệp: ${res.successRows} thành công, ${res.errorRows} dòng lỗi. Vui lòng kiểm tra bảng lỗi bên dưới.`, "warning");
      }
    },
    onError: (err: any) => {
      notify(err.message || "Lỗi khi xử lý tệp Excel", "error");
    },
  });

  // ================= Bulk Confirm =================
  const handleBulkConfirm = async () => {
    if (selectedIds.size === 0) return;
    try {
      setBulkConfirming(true);
      const res = await api.bulkConfirmDependentsV3(Array.from(selectedIds));
      notify(`Đã xác nhận hàng loạt ${res.confirmedCount} người phụ thuộc thành công!`);
      setSelectedIds(new Set());
      refetchList();
      refetchSummary();
    } catch (err: any) {
      notify(err.message || "Lỗi khi xác nhận hàng loạt", "error");
    } finally {
      setBulkConfirming(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(dependents.map((d) => d.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // ================= Form Helpers =================
  const resetDeclareForm = () => {
    setFormEmployeeCode(projectEmployees[0]?.employeeCode || "");
    setFormFullName("");
    setFormDob("");
    setFormIdentityNumber("");
    setFormTaxCode("");
    setFormRelationshipCode("CON_RUOT_NUOI");
    setFormEffectiveFrom("2026-08");
    setFormEffectiveTo("");
    setFormDocType("GIAY_KHAI_SINH");
    setFormFile(null);
    setFormFilePreview(null);
    if (formFileInputRef.current) formFileInputRef.current.value = "";
  };

  const handleOpenEdit = (dep: DependentDetailV3) => {
    setActiveDependent(dep);
    setEditFullName(dep.fullName);
    setEditDob(dep.dateOfBirth);
    setEditIdentityNumber(dep.identityNumber);
    setEditTaxCode(dep.taxCode || "");
    setEditRelationshipCode(dep.relationship.code);
    setEditEffectiveFrom(dep.effectiveFrom);
    setEditEffectiveTo(dep.effectiveTo || "");
    setEditModalOpen(true);
  };

  const handleOpenDetail = (dep: DependentDetailV3) => {
    setActiveDependent(dep);
    setDetailModalOpen(true);
  };

  const handleOpenDocuments = (dep: DependentDetailV3) => {
    setActiveDependent(dep);
    setUploadingFile(null);
    setDocumentsModalOpen(true);
  };

  const handleOpenReject = (dep: DependentDetailV3) => {
    setActiveDependent(dep);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const handleOpenConfirm = (dep: DependentDetailV3) => {
    setActiveDependent(dep);
    setConfirmModalOpen(true);
  };

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      await api.downloadDependentImportTemplateV3();
      notify("Đã tải xuống biểu mẫu Excel thành công!");
    } catch (err: any) {
      notify(err.message || "Lỗi khi tải biểu mẫu", "error");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const resetImportModal = () => {
    setImportFile(null);
    setImportErrors(null);
    setImportSummaryResult(null);
    if (importFileInputRef.current) importFileInputRef.current.value = "";
  };

  // Status Counts
  const countsMap = useMemo(() => {
    const map: Record<string, number> = {
      TOTAL: 0,
      PENDING: 0,
      CONFIRMED: 0,
      APPROVED: 0,
      REJECTED: 0,
      DRAFT: 0,
    };
    if (summaryData?.counts) {
      for (const item of summaryData.counts) {
        const k = item.key || item.status;
        if (k && k in map) {
          map[k] = item.count;
        }
      }
    }
    return map;
  }, [summaryData]);

  // Helper status color badge
  const renderStatusBadge = (status: DependentStatusV3) => {
    switch (status) {
      case "APPROVED":
        return <Badge tone="success">Đã phê duyệt</Badge>;
      case "CONFIRMED":
        return <Badge tone="info">Đã xác nhận</Badge>;
      case "PENDING":
        return <Badge tone="warning">Chờ xác nhận</Badge>;
      case "REJECTED":
        return <Badge tone="danger">Bị từ chối</Badge>;
      case "DRAFT":
      default:
        return <Badge tone="neutral">Bản nháp</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div
          onClick={() => {
            setStatusFilter("all");
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-xl border bg-white shadow-xs cursor-pointer transition-all hover:border-slate-400 ${
            statusFilter === "all" ? "ring-2 ring-primary/40 border-primary" : "border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Tổng số NPT</span>
            <UserCheck className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{countsMap.TOTAL}</div>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">Toàn bộ hồ sơ NPT</p>
        </div>

        <div
          onClick={() => {
            setStatusFilter("PENDING");
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-xl border bg-white shadow-xs cursor-pointer transition-all hover:border-amber-400 ${
            statusFilter === "PENDING" ? "ring-2 ring-amber-500/40 border-amber-500" : "border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Chờ xác nhận</span>
            <Clock className="w-4 h-4 text-amber-700" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700">{countsMap.PENDING}</div>
          <p className="mt-1 text-xs text-amber-700/80 leading-relaxed">Cần kế toán rà soát</p>
        </div>

        <div
          onClick={() => {
            setStatusFilter("CONFIRMED");
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-xl border bg-white shadow-xs cursor-pointer transition-all hover:border-blue-400 ${
            statusFilter === "CONFIRMED" ? "ring-2 ring-blue-500/40 border-blue-500" : "border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800">Đã xác nhận</span>
            <CheckCheck className="w-4 h-4 text-blue-700" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-700">{countsMap.CONFIRMED}</div>
          <p className="mt-1 text-xs text-blue-700/80 leading-relaxed">Chờ duyệt C&B</p>
        </div>

        <div
          onClick={() => {
            setStatusFilter("APPROVED");
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-xl border bg-white shadow-xs cursor-pointer transition-all hover:border-emerald-400 ${
            statusFilter === "APPROVED" ? "ring-2 ring-emerald-500/40 border-emerald-500" : "border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Đã phê duyệt</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">{countsMap.APPROVED}</div>
          <p className="mt-1 text-xs text-emerald-700/80 leading-relaxed">Được tính giảm trừ</p>
        </div>

        <div
          onClick={() => {
            setStatusFilter("REJECTED");
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-xl border bg-white shadow-xs cursor-pointer transition-all hover:border-rose-400 ${
            statusFilter === "REJECTED" ? "ring-2 ring-rose-500/40 border-rose-500" : "border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800">Bị từ chối</span>
            <XCircle className="w-4 h-4 text-rose-700" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-700">{countsMap.REJECTED}</div>
          <p className="mt-1 text-xs text-rose-700/80 leading-relaxed">Hồ sơ không hợp lệ</p>
        </div>
      </div>

      {/* 2. Main Integrated Table Card with Toolbar */}
      <div className="integrated-table-card">
        {/* Toolbar */}
        <div className="table-card-toolbar">
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search Box */}
              <div className="relative min-w-[220px] max-w-[300px] flex-1">
                <Search className="search-icon-fixed text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Tìm theo tên, mã NV, CCCD, MST..."
                  className="search-box-input w-full pl-10 pr-8 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Project Filter */}
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">Tất cả dự án</option>
                {projectList.map((p) => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.projectCode} - {p.projectName}
                  </option>
                ))}
              </select>

              {/* Relationship Filter */}
              <select
                value={relationshipFilter}
                onChange={(e) => {
                  setRelationshipFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">Tất cả mối quan hệ</option>
                {masterRelationships.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="PENDING">Chờ xác nhận</option>
                <option value="CONFIRMED">Đã xác nhận</option>
                <option value="APPROVED">Đã phê duyệt</option>
                <option value="REJECTED">Bị từ chối</option>
                <option value="DRAFT">Bản nháp</option>
              </select>

              {(searchTerm || relationshipFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setRelationshipFilter("all");
                    setStatusFilter("all");
                    setCurrentPage(1);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Đặt lại
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAuditLogsDrawerOpen(true)}
                className="gap-1.5 text-xs"
              >
                <History className="w-3.5 h-3.5 text-muted-foreground" /> Nhật ký
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setImportModalOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Upload className="w-3.5 h-3.5 text-muted-foreground" /> Import Excel
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  resetDeclareForm();
                  setDeclareModalOpen(true);
                }}
                className="gap-1.5 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Khai báo NPT
              </Button>
            </div>
          </div>
        </div>
        {isListLoading ? (
          <div className="py-16">
            <LoadingBlock rows={6} />
          </div>
        ) : isListError ? (
          <div className="py-12">
            <ErrorState
              message="Không thể kết nối đến máy chủ. Vui lòng thử lại."
              retry={() => refetchList()}
            />
          </div>
        ) : dependents.length === 0 ? (
          <div className="py-16">
            <EmptyState
              title="Chưa có người phụ thuộc nào"
              description={
                searchTerm || relationshipFilter !== "all" || statusFilter !== "all"
                  ? "Không tìm thấy kết quả phù hợp với bộ lọc hiện tại."
                  : "Bấm 'Khai báo NPT' hoặc 'Import Excel' để thêm người phụ thuộc đầu tiên."
              }
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    resetDeclareForm();
                    setDeclareModalOpen(true);
                  }}
                  className="gap-1.5 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Khai báo người phụ thuộc
                </Button>
              }
            />
          </div>
        ) : (
          <div className="data-table-wrap">
            <div className="data-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }} className="text-center">
                      <input
                        type="checkbox"
                        checked={dependents.length > 0 && selectedIds.size === dependents.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary/30"
                      />
                    </th>
                    <th style={{ width: "50px" }} className="text-center">STT</th>
                    <th style={{ minWidth: "180px" }}>NHÂN VIÊN</th>
                    <th style={{ minWidth: "170px" }}>NGƯỜI PHỤ THUỘC</th>
                    <th style={{ width: "140px" }}>QUAN HỆ</th>
                    <th style={{ width: "140px" }}>SỐ CCCD / MST</th>
                    <th style={{ width: "130px" }}>HIỆU LỰC</th>
                    <th style={{ width: "90px" }} className="text-center">HỒ SƠ</th>
                    <th style={{ width: "130px" }} className="text-center">TRẠNG THÁI</th>
                    <th style={{ width: "120px" }} className="text-center">THAO TÁC</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-border/60 text-xs text-foreground">
                {dependents.map((dep, idx) => {
                  const isChecked = selectedIds.has(dep.id);
                  const rawStt = (currentPage - 1) * pageSize + idx + 1;
                  const stt = String(rawStt).padStart(2, "0");

                  return (
                    <tr
                      key={dep.id}
                      className={`hover:bg-secondary/40 transition-colors ${
                        isChecked ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(dep.id)}
                          className="rounded border-border text-primary focus:ring-primary/30"
                        />
                      </td>

                      <td className="py-3 px-2 text-center font-medium text-muted-foreground font-mono">
                        {stt}
                      </td>

                      {/* Employee Info */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{dep.employee.fullName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">
                            {dep.employee.employeeCode}
                          </span>
                          {dep.employee.project && (
                            <span className="text-slate-400">({dep.employee.project.projectCode})</span>
                          )}
                        </div>
                      </td>

                      {/* Dependent Info */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{dep.fullName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Ngày sinh: {formatDate(dep.dateOfBirth)}
                        </div>
                      </td>

                      {/* Relationship */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-800">
                          {dep.relationship.name}
                        </span>
                      </td>

                      {/* CCCD / MST */}
                      <td className="py-3 px-3">
                        <div className="font-mono text-slate-900">{dep.identityNumber}</div>
                        {dep.taxCode && (
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            MST: {dep.taxCode}
                          </div>
                        )}
                      </td>

                      {/* Effective Date */}
                      <td className="py-3 px-3">
                        <div className="text-slate-800 font-medium">
                          Từ {formatMonthYear(dep.effectiveFrom)}
                        </div>
                        {dep.effectiveTo ? (
                          <div className="text-[11px] text-slate-500">
                            Đến {formatMonthYear(dep.effectiveTo)}
                          </div>
                        ) : (
                          <div className="text-[11px] text-emerald-600">Vô thời hạn</div>
                        )}
                      </td>

                      {/* Documents / Attachments */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenDocuments(dep as DependentDetailV3)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                            (dep.documentsCount || 0) > 0
                              ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                              : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                          }`}
                          title="Quản lý tài liệu hồ sơ"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{dep.documentsCount || (dep.documents?.length ?? 0)} tệp</span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {renderStatusBadge(dep.status)}
                        {dep.status === "REJECTED" && dep.rejectionReason && (
                          <div
                            className="text-[11px] text-rose-600 mt-1 truncate max-w-[140px]"
                            title={dep.rejectionReason}
                          >
                            {dep.rejectionReason}
                          </div>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(dep as DependentDetailV3)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {dep.canEdit !== false && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(dep as DependentDetailV3)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50"
                              title="Chỉnh sửa"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {dep.canConfirm && (
                            <button
                              type="button"
                              onClick={() => handleOpenConfirm(dep as DependentDetailV3)}
                              className="p-1.5 text-amber-600 hover:text-amber-800 rounded-md hover:bg-amber-50"
                              title="Xác nhận hồ sơ"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {dep.status === "CONFIRMED" && (
                            <button
                              type="button"
                              onClick={() => approveMutation.mutate(dep.id)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 rounded-md hover:bg-emerald-50"
                              title="Phê duyệt"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {dep.canReject && (
                            <button
                              type="button"
                              onClick={() => handleOpenReject(dep as DependentDetailV3)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 rounded-md hover:bg-rose-50"
                              title="Từ chối hồ sơ"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn xóa người phụ thuộc ${dep.fullName}?`)) {
                                deleteMutation.mutate(dep.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination Footer */}
          {totalItems > 0 && (
            <TablePaginationFooter
              totalItems={totalItems}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={(p) => setCurrentPage(p)}
              onPageSizeChange={(sz) => {
                setPageSize(sz);
                setCurrentPage(1);
              }}
            />
          )}
        </div>
      )}
    </div>

      {/* 4. Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="text-xs font-semibold">
            Đã chọn <strong className="text-primary font-bold">{selectedIds.size}</strong> người phụ thuộc
          </span>
          <div className="h-4 w-px bg-slate-700" />
          <Button
            variant="primary"
            size="sm"
            loading={bulkConfirming}
            onClick={handleBulkConfirm}
            className="gap-1.5 font-semibold text-xs"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Xác nhận hàng loạt
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-slate-400 hover:text-white"
          >
            Bỏ chọn
          </Button>
        </div>
      )}

      {/* ================= Modal: Khai báo Người phụ thuộc ================= */}
      <Modal
        open={declareModalOpen}
        onOpenChange={setDeclareModalOpen}
        title="Khai báo người phụ thuộc"
        description="Nhập đầy đủ thông tin giảm trừ gia cảnh cho người lao động theo chuẩn quy định."
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!formEmployeeCode) {
              notify("Vui lòng chọn nhân viên.", "error");
              return;
            }
            if (!formFullName.trim()) {
              notify("Vui lòng nhập họ và tên người phụ thuộc.", "error");
              return;
            }
            if (!formIdentityNumber.trim() || formIdentityNumber.length < 9) {
              notify("Số CCCD/Định danh không hợp lệ (tối thiểu 9 số).", "error");
              return;
            }
            createMutation.mutate({
              projectId: Number(selectedProjectId) || 1017,
              employeeCode: formEmployeeCode,
              fullName: formFullName.trim(),
              dateOfBirth: formDob || "2020-01-01",
              identityNumber: formIdentityNumber.trim(),
              taxCode: formTaxCode.trim() || undefined,
              relationshipCode: formRelationshipCode,
              effectiveFrom: formEffectiveFrom || "2026-08",
              effectiveTo: formEffectiveTo || undefined,
              documentType: formDocType,
            });
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chọn Nhân viên */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nhân viên khai báo <span className="text-rose-500">*</span>
              </label>
              <select
                value={formEmployeeCode}
                onChange={(e) => setFormEmployeeCode(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">-- Chọn nhân viên --</option>
                {projectEmployees.map((e) => (
                  <option key={e.employeeCode} value={e.employeeCode}>
                    {e.employeeCode} - {e.fullName} ({e.positionName || "Nhân viên"})
                  </option>
                ))}
              </select>
            </div>

            {/* Mối quan hệ */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mối quan hệ <span className="text-rose-500">*</span>
              </label>
              <select
                value={formRelationshipCode}
                onChange={(e) => setFormRelationshipCode(e.target.value as RelationshipCode)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {masterRelationships.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Họ tên NPT */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Họ và tên NPT <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formFullName}
                onChange={(e) => setFormFullName(e.target.value)}
                placeholder="VD: Nguyễn Minh Khôi"
                required
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Ngày sinh */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngày sinh <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formDob}
                onChange={(e) => setFormDob(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* CCCD / Mã định danh */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số CCCD / Mã định danh <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formIdentityNumber}
                onChange={(e) => setFormIdentityNumber(e.target.value)}
                placeholder="Số CCCD (12 số) hoặc Mã định danh cá nhân"
                required
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Mã số thuế */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mã số thuế NPT <span className="text-slate-400 font-normal">(Nếu có)</span>
              </label>
              <input
                type="text"
                value={formTaxCode}
                onChange={(e) => setFormTaxCode(e.target.value)}
                placeholder="VD: 8092200012"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Hiệu lực từ */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hiệu lực từ tháng <span className="text-rose-500">*</span>
              </label>
              <input
                type="month"
                value={formEffectiveFrom}
                onChange={(e) => setFormEffectiveFrom(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Hiệu lực đến */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hiệu lực đến tháng <span className="text-slate-400 font-normal">(Để trống nếu vô thời hạn)</span>
              </label>
              <input
                type="month"
                value={formEffectiveTo}
                onChange={(e) => setFormEffectiveTo(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Đính kèm tài liệu minh chứng */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                Tài liệu minh chứng đính kèm
              </label>
              <select
                value={formDocType}
                onChange={(e) => setFormDocType(e.target.value as DocumentTypeCode)}
                className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md"
              >
                {masterDocTypes.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div
              onClick={() => formFileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <input
                type="file"
                ref={formFileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFormFile(file);
                    if (file.type.startsWith("image/")) {
                      setFormFilePreview(URL.createObjectURL(file));
                    } else {
                      setFormFilePreview(null);
                    }
                  }
                }}
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
              />
              {formFile ? (
                <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-lg text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="font-medium text-slate-800">{formFile.name}</span>
                    <span className="text-slate-400">({(formFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setFormFile(null);
                      setFormFilePreview(null);
                    }}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-600 font-medium">Bấm để tải tệp minh chứng</p>
                  <p className="text-[11px] text-slate-400">Định dạng JPG, PNG, PDF tối đa 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setDeclareModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={createMutation.isPending}
              className="gap-1.5 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Lưu hồ sơ NPT
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= Modal: Chỉnh sửa Người phụ thuộc ================= */}
      <Modal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        title="Chỉnh sửa thông tin người phụ thuộc"
        description={`Cập nhật thông tin cho người phụ thuộc ${activeDependent?.fullName || ""}.`}
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!activeDependent) return;
            updateMutation.mutate({
              id: activeDependent.id,
              payload: {
                fullName: editFullName.trim(),
                dateOfBirth: editDob,
                identityNumber: editIdentityNumber.trim(),
                taxCode: editTaxCode.trim() || undefined,
                relationshipCode: editRelationshipCode,
                effectiveFrom: editEffectiveFrom,
                effectiveTo: editEffectiveTo || undefined,
              },
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Họ và tên NPT <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mối quan hệ <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editRelationshipCode}
                  onChange={(e) => setEditRelationshipCode(e.target.value as RelationshipCode)}
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {masterRelationships.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngày sinh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={editDob}
                  onChange={(e) => setEditDob(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số CCCD/Định danh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editIdentityNumber}
                  onChange={(e) => setEditIdentityNumber(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mã số thuế</label>
                <input
                  type="text"
                  value={editTaxCode}
                  onChange={(e) => setEditTaxCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hiệu lực từ tháng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="month"
                  value={editEffectiveFrom}
                  onChange={(e) => setEditEffectiveFrom(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hiệu lực đến tháng
                </label>
                <input
                  type="month"
                  value={editEffectiveTo}
                  onChange={(e) => setEditEffectiveTo(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setEditModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={updateMutation.isPending}
              className="gap-1.5 font-semibold"
            >
              <Pencil className="w-3.5 h-3.5" /> Lưu thay đổi
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= Modal: Xem chi tiết Người phụ thuộc ================= */}
      <Modal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        title="Chi tiết hồ sơ Người phụ thuộc"
        size="md"
      >
        {activeDependent && (
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-slate-900">{activeDependent.fullName}</div>
                <div className="text-slate-500 mt-0.5">
                  Quan hệ: <span className="font-semibold text-slate-700">{activeDependent.relationship.name}</span>
                </div>
              </div>
              <div>{renderStatusBadge(activeDependent.status)}</div>
            </div>

            {/* Grid attributes */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block">Nhân viên:</span>
                <span className="font-semibold text-slate-800">
                  {activeDependent.employee.fullName} ({activeDependent.employee.employeeCode})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Dự án:</span>
                <span className="font-semibold text-slate-800">
                  {activeDependent.employee.project?.projectName || "Chưa phân bổ"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Ngày sinh:</span>
                <span className="font-semibold text-slate-800">{formatDate(activeDependent.dateOfBirth)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Số CCCD/Định danh:</span>
                <span className="font-mono font-semibold text-slate-800">{activeDependent.identityNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Mã số thuế:</span>
                <span className="font-mono font-semibold text-slate-800">{activeDependent.taxCode || "Chưa có"}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Thời gian hiệu lực:</span>
                <span className="font-semibold text-slate-800">
                  {formatMonthYear(activeDependent.effectiveFrom)} →{" "}
                  {activeDependent.effectiveTo ? formatMonthYear(activeDependent.effectiveTo) : "Vô thời hạn"}
                </span>
              </div>
            </div>

            {/* Rejection / Confirmation details */}
            {activeDependent.status === "REJECTED" && activeDependent.rejectionReason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
                <div className="font-semibold flex items-center gap-1.5 mb-1">
                  <AlertCircle className="w-4 h-4 text-rose-600" /> Lý do từ chối:
                </div>
                <p className="text-rose-700">{activeDependent.rejectionReason}</p>
              </div>
            )}

            {activeDependent.confirmedBy && (
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-blue-800 flex items-center justify-between text-[11px]">
                <span>
                  Xác nhận bởi: <strong>{activeDependent.confirmedBy.fullName}</strong> ({activeDependent.confirmedBy.roleName})
                </span>
                <span className="text-blue-600">{formatDate(activeDependent.confirmedAt)}</span>
              </div>
            )}

            {activeDependent.approvedBy && (
              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-emerald-800 flex items-center justify-between text-[11px]">
                <span>
                  Phê duyệt bởi: <strong>{activeDependent.approvedBy.fullName}</strong> ({activeDependent.approvedBy.roleName})
                </span>
                <span className="text-emerald-600">{formatDate(activeDependent.approvedAt)}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setDetailModalOpen(false)}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= Modal: Quản lý Hồ sơ Giấy tờ ================= */}
      <Modal
        open={documentsModalOpen}
        onOpenChange={setDocumentsModalOpen}
        title={`Hồ sơ minh chứng - ${activeDependent?.fullName || ""}`}
        description="Quản lý và tải lên các tài liệu xác thực quyền giảm trừ gia cảnh."
        size="lg"
      >
        <div className="space-y-4">
          {/* Upload New Document Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="text-xs font-semibold text-slate-800 mb-2.5 flex items-center gap-1.5">
              <FilePlus className="w-4 h-4 text-primary" /> Tải lên tài liệu mới
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <select
                value={uploadingDocType}
                onChange={(e) => setUploadingDocType(e.target.value as DocumentTypeCode)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              >
                {masterDocTypes.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>

              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  type="file"
                  ref={uploadFileInputRef}
                  onChange={(e) => setUploadingFile(e.target.files?.[0] || null)}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300"
                />
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!uploadingFile}
                  loading={uploadDocMutation.isPending}
                  onClick={() => {
                    if (!activeDependent || !uploadingFile) return;
                    const fd = new FormData();
                    fd.append("file", uploadingFile);
                    fd.append("documentType", uploadingDocType);
                    uploadDocMutation.mutate({ depId: activeDependent.id, formData: fd });
                  }}
                  className="gap-1 shrink-0 font-medium text-xs"
                >
                  <Upload className="w-3 h-3" /> Tải lên
                </Button>
              </div>
            </div>
          </div>

          {/* List of Attached Documents */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700">
              Danh sách tài liệu đã đính kèm ({activeDependent?.documents?.length || 0})
            </div>

            {!activeDependent?.documents || activeDependent.documents.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                Chưa có tài liệu minh chứng nào được đính kèm.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {activeDependent.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 bg-white flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                        PDF
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-slate-900">{doc.fileName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="text-primary font-medium">{doc.documentTypeName}</span>
                          <span>•</span>
                          <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>{formatDate(doc.uploadedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`/api/web/payroll/dependents/${activeDependent.id}/documents/${doc.id}/file`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-500 hover:text-primary rounded-md hover:bg-slate-100"
                        title="Tải / Xem file"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Bạn có chắc muốn xóa tài liệu ${doc.fileName}?`)) {
                            deleteDocMutation.mutate({ depId: activeDependent.id, docId: doc.id });
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                        title="Xóa tài liệu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" size="sm" onClick={() => setDocumentsModalOpen(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================= Modal: Từ chối Người phụ thuộc ================= */}
      <Modal
        open={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        title="Từ chối hồ sơ Người phụ thuộc"
        description="Vui lòng nêu rõ lý do từ chối để nhân sự/nhân viên bổ sung giấy tờ hợp lệ."
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!activeDependent) return;
            if (!rejectionReason.trim()) {
              notify("Vui lòng nhập lý do từ chối.", "error");
              return;
            }
            rejectMutation.mutate({ id: activeDependent.id, reason: rejectionReason.trim() });
          }}
          className="space-y-3"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lý do từ chối <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="VD: Thiếu bản sao công chứng Giấy khai sinh hợp lệ..."
              required
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/30"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              loading={rejectMutation.isPending}
              className="gap-1 font-semibold"
            >
              <X className="w-3.5 h-3.5" /> Xác nhận từ chối
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= Modal: Xác nhận Người phụ thuộc ================= */}
      <Modal
        open={confirmModalOpen}
        onOpenChange={setConfirmModalOpen}
        title="Xác nhận hồ sơ hợp lệ"
        size="sm"
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-700">
            Bạn xác nhận hồ sơ người phụ thuộc <strong>{activeDependent?.fullName}</strong> của nhân viên{" "}
            <strong>{activeDependent?.employee.fullName}</strong> đã đầy đủ giấy tờ hợp lệ?
          </p>

          <div className="pt-3 flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={confirmMutation.isPending}
              onClick={() => {
                if (activeDependent) confirmMutation.mutate(activeDependent.id);
              }}
              className="gap-1 font-semibold"
            >
              <Check className="w-3.5 h-3.5" /> Xác nhận
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================= Modal: Import Excel Wizard ================= */}
      <Modal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        title="Import danh sách người phụ thuộc từ Excel"
        description="Tải lên tệp danh sách NPT theo biểu mẫu chuẩn để thêm hàng loạt."
        size="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Step 1: Download Template */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800">1. Tải biểu mẫu Excel chuẩn</div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Sử dụng tệp mẫu để đảm bảo đúng định dạng các cột dữ liệu.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={downloadingTemplate}
              onClick={handleDownloadTemplate}
              className="gap-1.5 text-xs font-semibold shrink-0"
            >
              <Download className="w-3.5 h-3.5" /> Tải file mẫu (.xlsx)
            </Button>
          </div>

          {/* Step 2: Upload File Dropzone */}
          <div>
            <div className="font-semibold text-slate-800 mb-1.5">2. Chọn tệp dữ liệu đã điền</div>
            <div
              onClick={() => importFileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) setImportFile(file);
              }}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : importFile
                  ? "border-emerald-300 bg-emerald-50/40"
                  : "border-slate-300 hover:bg-slate-50"
              }`}
            >
              <input
                type="file"
                ref={importFileInputRef}
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              {importFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                  <div className="text-left">
                    <div className="font-bold text-slate-900">{importFile.name}</div>
                    <div className="text-slate-500 text-[11px]">
                      {(importFile.size / 1024).toFixed(1)} KB • Bấm để chọn tệp khác
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">Kéo thả tệp Excel vào đây hoặc bấm để chọn</p>
                  <p className="text-[11px] text-slate-400 mt-1">Chấp nhận .xlsx, .xls tối đa 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Error Preview Grid */}
          {importErrors && importErrors.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <div className="font-semibold text-rose-800 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" /> Phát hiện {importErrors.length} dòng lỗi
                trong file:
              </div>
              <div className="max-h-40 overflow-y-auto border border-rose-200 rounded-lg bg-white">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-rose-100/60 text-rose-900 border-b border-rose-200 font-semibold">
                      <th className="py-1.5 px-2 w-16">Dòng</th>
                      <th className="py-1.5 px-2">Cột</th>
                      <th className="py-1.5 px-2">Giá trị</th>
                      <th className="py-1.5 px-2">Lỗi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100">
                    {importErrors.map((err, idx) => (
                      <tr key={idx} className="hover:bg-rose-50/50">
                        <td className="py-1 px-2 font-mono font-bold text-rose-700">#{err.row}</td>
                        <td className="py-1 px-2 font-medium">{err.column}</td>
                        <td className="py-1 px-2 font-mono text-slate-600">{err.value || "(Trống)"}</td>
                        <td className="py-1 px-2 text-rose-700">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <Button variant="secondary" size="sm" onClick={() => setImportModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!importFile}
              loading={importMutation.isPending}
              onClick={() => {
                if (importFile) importMutation.mutate(importFile);
              }}
              className="gap-1.5 font-semibold"
            >
              <Upload className="w-3.5 h-3.5" /> Bắt đầu Import
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================= Drawer: Nhật ký Hoạt động (Audit Logs) ================= */}
      <Modal
        open={auditLogsDrawerOpen}
        onOpenChange={setAuditLogsDrawerOpen}
        title="Nhật ký hoạt động Quản lý Người phụ thuộc"
        description="Lịch sử các thao tác khai báo, phê duyệt, từ chối và cập nhật hồ sơ."
        size="lg"
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {(!auditLogsData?.items || auditLogsData.items.length === 0) ? (
            <div className="py-8 text-center text-slate-400 text-xs">Chưa có nhật ký ghi nhận.</div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {auditLogsData.items.map((log) => (
                <div key={log.id} className="relative text-xs">
                  {/* Dot */}
                  <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-white border-2 border-primary flex items-center justify-center shadow-xs" />
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{log.description}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatDate(log.occurredAt)}
                      </span>
                    </div>
                    <div className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-2">
                      <span>
                        Thực hiện bởi: <strong>{log.actor.fullName}</strong> ({log.actor.roleName})
                      </span>
                      {log.dependent && (
                        <>
                          <span>•</span>
                          <span>NPT: <strong className="text-slate-700">{log.dependent.fullName}</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-200">
            <Button variant="secondary" size="sm" onClick={() => setAuditLogsDrawerOpen(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
