"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Check,
  ChevronDown,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

function normalizeSearchText(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .trim();
}

export interface SearchableSelectOption {
  value: string | number;
  label: string;
  subLabel?: string;
  sublabel?: string;
  badge?: string;
  disabled?: boolean;
  raw?: any;
}

export interface SearchableSelectProps<T = any> {
  items?: T[];
  options?: SearchableSelectOption[];
  value?: string | number | null;
  onChange: (value: string, item?: T | null) => void;
  getOptionValue?: (item: T) => string | number;
  getOptionLabel?: (item: T) => string;
  getOptionSublabel?: (item: T) => string | undefined;
  getOptionBadge?: (item: T) => string | undefined;
  getSearchKeywords?: (item: T) => string[];
  renderOption?: (item: T, isSelected: boolean) => ReactNode;
  renderSelected?: (item: T) => ReactNode;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  isLoading?: boolean;
  emptyText?: string;
  className?: string;
  icon?: ReactNode;
}

export function SearchableSelect<T = any>({
  items,
  options,
  value,
  onChange,
  getOptionValue = (item: any) => item?.value ?? item?.id ?? item?.code ?? "",
  getOptionLabel = (item: any) => item?.label ?? item?.name ?? item?.fullName ?? "",
  getOptionSublabel = (item: any) => item?.sublabel ?? item?.subLabel ?? item?.positionName ?? item?.department ?? "",
  getOptionBadge = (item: any) => item?.badge ?? "",
  getSearchKeywords,
  renderOption,
  renderSelected,
  placeholder = "-- Chọn --",
  searchPlaceholder = "Tìm kiếm...",
  disabled = false,
  allowClear = true,
  isLoading = false,
  emptyText = "Không tìm thấy kết quả phù hợp",
  className,
  icon,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const sourceItems: T[] = useMemo(() => {
    if (Array.isArray(items)) return items;
    if (Array.isArray(options)) return options as unknown as T[];
    return [];
  }, [items, options]);

  const selectedItem = useMemo(() => {
    if (value === undefined || value === null || value === "") return null;
    return sourceItems.find((item) => String(getOptionValue(item)) === String(value)) ?? null;
  }, [sourceItems, value, getOptionValue]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return sourceItems;
    const rawQ = search.toLowerCase().trim();
    const normQ = normalizeSearchText(search);
    return sourceItems.filter((item) => {
      const label = String(getOptionLabel(item) || "");
      const sublabel = String(getOptionSublabel(item) || "");
      const badge = String(getOptionBadge(item) || "");
      const val = String(getOptionValue(item) || "");

      const rawCombined = `${badge} ${label} ${sublabel} ${val}`.toLowerCase();
      if (rawCombined.includes(rawQ)) return true;

      const normCombined = `${normalizeSearchText(badge)} ${normalizeSearchText(label)} ${normalizeSearchText(sublabel)} ${normalizeSearchText(val)}`;
      if (normCombined.includes(normQ)) return true;

      if (getSearchKeywords) {
        const extra = getSearchKeywords(item);
        if (Array.isArray(extra)) {
          if (extra.some((k) => k && (k.toLowerCase().includes(rawQ) || normalizeSearchText(k).includes(normQ)))) {
            return true;
          }
        }
      }
      return false;
    });
  }, [sourceItems, search, getOptionLabel, getOptionSublabel, getOptionBadge, getOptionValue, getSearchKeywords]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search, open]);

  const handleToggle = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    if (disabled) return;
    if (!open) {
      setSearch("");
      setHighlightedIndex(0);
      setOpen(true);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 40);
    } else {
      setOpen(false);
    }
  };

  const handleSelect = (item: T) => {
    if ((item as any)?.disabled) return;
    const val = String(getOptionValue(item));
    onChange(val, item);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange("", null);
  };

  // Close on outside click or ESC key (with Shadow DOM / Web Component support)
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (!containerRef.current) return;
      const path = e.composedPath ? e.composedPath() : [];
      const isInside = containerRef.current.contains(e.target as Node) || (path.length > 0 && path.includes(containerRef.current));
      if (!isInside) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn("searchable-select-wrap", className)}>
      {/* Trigger element (Accessible div combobox, avoids invalid HTML nested button issue) */}
      <div
        ref={triggerRef}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        className={cn("searchable-select-trigger", open && "open", disabled && "disabled")}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        {icon && <span className="searchable-select-icon">{icon}</span>}
        
        <div className="searchable-select-value">
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
              <span className="text-xs truncate">Đang tải...</span>
            </div>
          ) : selectedItem ? (
            renderSelected ? (
              renderSelected(selectedItem)
            ) : (
              <span className="truncate">
                {getOptionBadge(selectedItem) ? `${getOptionBadge(selectedItem)} - ` : ""}
                {getOptionLabel(selectedItem)}
                {getOptionSublabel(selectedItem) ? ` (${getOptionSublabel(selectedItem)})` : ""}
              </span>
            )
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {allowClear && selectedItem && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  e.preventDefault();
                  handleClear(e);
                }
              }}
              className="search-clear-btn"
              title="Xóa lựa chọn"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className="searchable-select-chevron" />
        </div>
      </div>

      {/* Popover Dropdown */}
      {open && (
        <div
          data-radix-scroll-lock-ignore="true"
          className="searchable-select-popover"
        >
          {/* Search Box */}
          <div className="searchable-select-search-box">
            <Search className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlightedIndex((prev) => Math.min(filteredItems.length - 1, prev + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlightedIndex((prev) => Math.max(0, prev - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  if (filteredItems.length > 0) {
                    const idx = highlightedIndex >= 0 && highlightedIndex < filteredItems.length ? highlightedIndex : 0;
                    handleSelect(filteredItems[idx]);
                  }
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                }
              }}
              placeholder={searchPlaceholder}
              className="searchable-select-input"
              onClick={(e) => e.stopPropagation()}
            />
            {search && (
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  setSearch("");
                }}
                className="search-clear-btn"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div
            data-radix-scroll-lock-ignore="true"
            onWheelCapture={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            className="searchable-select-options-list"
          >
            {filteredItems.length === 0 ? (
              <div className="searchable-select-empty">{emptyText}</div>
            ) : (
              filteredItems.map((item, idx) => {
                const itemVal = String(getOptionValue(item));
                const isSelected = selectedItem ? String(getOptionValue(selectedItem)) === itemVal : false;
                const isHighlighted = idx === highlightedIndex;
                const isItemDisabled = Boolean((item as any)?.disabled);
                const label = getOptionLabel(item);
                const sublabel = getOptionSublabel(item);
                const badge = getOptionBadge(item);

                return (
                  <button
                    key={`${itemVal}-${idx}`}
                    type="button"
                    tabIndex={-1}
                    disabled={isItemDisabled}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isItemDisabled) handleSelect(item);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isItemDisabled) handleSelect(item);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      "searchable-select-item",
                      isSelected && "selected",
                      isHighlighted && "highlighted",
                      isItemDisabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {renderOption ? (
                      renderOption(item, isSelected)
                    ) : (
                      <div className="item-text-group">
                        <span className="item-label">
                          {badge ? `${badge} - ` : ""}
                          {label}
                        </span>
                        {sublabel && <span className="item-sub">{sublabel}</span>}
                      </div>
                    )}

                    {isSelected && <Check className="item-check" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Component chuyên dụng cho Nhân viên (EmployeeSelect)
 */
export interface GsEmployeeOption {
  employeeCode?: string;
  code?: string;
  id?: string | number;
  fullName?: string;
  name?: string;
  positionName?: string;
  position?: string;
  departmentName?: string;
  department?: string;
  projectName?: string;
  [key: string]: any;
}

export function GsEmployeeSelect({
  employees = [],
  value,
  onChange,
  placeholder = "-- Chọn nhân viên --",
  searchPlaceholder = "Tìm theo mã hoặc tên nhân viên...",
  disabled = false,
  isLoading = false,
  className,
}: {
  employees: GsEmployeeOption[];
  value?: string | null;
  onChange: (employeeCode: string, employee?: GsEmployeeOption | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}) {
  return (
    <SearchableSelect<GsEmployeeOption>
      items={employees}
      value={value}
      onChange={(val, item) => onChange(val, item)}
      getOptionValue={(emp) =>
        emp?.employeeCode || emp?.code || (emp as any)?.EmployeeCode || (emp as any)?.Code || String(emp?.id || "")
      }
      getOptionLabel={(emp) =>
        emp?.fullName || emp?.name || (emp as any)?.FullName || (emp as any)?.EmployeeName || ""
      }
      getOptionBadge={(emp) =>
        emp?.employeeCode || emp?.code || (emp as any)?.EmployeeCode || (emp as any)?.Code || ""
      }
      getOptionSublabel={(emp) => {
        const parts: string[] = [];
        const pos = emp?.positionName || emp?.position || (emp as any)?.PositionName;
        const proj = emp?.projectName || (emp as any)?.ProjectName;
        const dept = emp?.departmentName || emp?.department || (emp as any)?.DepartmentName;
        if (pos) parts.push(pos);
        if (proj) parts.push(proj);
        else if (dept) parts.push(dept);
        return parts.length > 0 ? parts.join(" • ") : undefined;
      }}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      disabled={disabled}
      isLoading={isLoading}
      emptyText="Không tìm thấy nhân viên phù hợp"
      className={className}
    />
  );
}
