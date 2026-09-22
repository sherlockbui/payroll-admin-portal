"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PortalContainerContext } from "@/components/ui";
import { WidgetNavigationProvider, usePathname, useParams } from "@/src/widget/navigation-adapter";
import { ProjectsList } from "@/components/projects-list";
import { ProjectDetail } from "@/components/project-detail";
import {
  ThemeContext,
  ToastContext,
  UserRoleContext,
  type ThemePreset,
  type ColorMode,
  type UserRole,
  type ToastTone,
  type ToastItem,
} from "@/components/providers";
import { CheckCircle2, X, AlertTriangle } from "lucide-react";

export interface ProjectsWidgetConfig {
  shadowRoot?: ShadowRoot;
  mountElement?: HTMLElement;
  apiBaseUrl?: string;
  authToken?: string;
  projectId?: string;
  userRole?: UserRole;
  themePreset?: ThemePreset;
  colorMode?: ColorMode;
  onEvent?: (name: string, detail: any) => void;
}

export const ProjectsWidgetContext = createContext<ProjectsWidgetConfig>({});

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class WidgetErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[PayrollProjectsWidget] Render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl m-4 text-rose-900 font-sans shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <h3 className="font-semibold text-base text-rose-950">Không thể hiển thị phân hệ Dự án lương</h3>
              <p className="text-xs text-rose-700 mt-0.5">
                {this.state.error?.message || "Đã xảy ra sự cố trong quá trình kết xuất giao diện."}
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition"
            >
              Thử tải lại giao diện
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProjectsRouterView() {
  const pathname = usePathname();
  const params = useParams();

  if (
    (pathname.startsWith("/projects/") && pathname !== "/projects" && pathname !== "/projects/") ||
    params.projectId
  ) {
    const prjId = params.projectId || pathname.replace(/^\/projects\//, "").split("?")[0];
    return <ProjectDetail projectId={prjId} embedded={true} />;
  }

  return <ProjectsList />;
}

export function ProjectsWidgetApp({ config }: { config: ProjectsWidgetConfig }) {
  const [role, setRoleState] = useState<UserRole>(config.userRole || "accountant");
  const [preset, setPresetState] = useState<ThemePreset>(config.themePreset || "corporate");
  const [mode, setModeState] = useState<ColorMode>(config.colorMode || "light");
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (config.userRole && config.userRole !== role) setRoleState(config.userRole);
  }, [config.userRole]);

  useEffect(() => {
    if (config.themePreset && config.themePreset !== preset) setPresetState(config.themePreset);
  }, [config.themePreset]);

  const notify = useMemo(
    () => (message: string, tone: ToastTone = "success") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, tone }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 4000);
    },
    []
  );

  const roleValue = useMemo(
    () => ({
      role,
      setRole: (r: UserRole) => setRoleState(r),
      roleLabel: "Kế toán (C&B)",
      roleSubtitle: "Tính lương & điều chỉnh",
    }),
    [role]
  );

  const themeValue = useMemo(
    () => ({
      preset,
      mode,
      setPreset: (p: ThemePreset) => setPresetState(p),
      toggleMode: () => setModeState((m) => (m === "light" ? "dark" : "light")),
    }),
    [preset, mode]
  );

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
    []
  );

  const initialUrl = config.projectId ? `/projects/${config.projectId}` : "/projects";

  return (
    <WidgetErrorBoundary>
      <ProjectsWidgetContext.Provider value={config}>
        <PortalContainerContext.Provider value={config.mountElement || null}>
          <UserRoleContext.Provider value={roleValue}>
            <ThemeContext.Provider value={themeValue}>
              <ToastContext.Provider value={{ notify }}>
                <QueryClientProvider client={queryClient}>
                  <WidgetNavigationProvider initialUrl={initialUrl}>
                    <div
                      className="payroll-widget-root text-slate-900 font-sans p-2 sm:p-4"
                      data-theme={preset}
                    >
                      <ProjectsRouterView />

                      {/* Toast Viewport */}
                      <div className="toast-viewport" aria-live="polite">
                        {toasts.map((toast) => (
                          <div key={toast.id} className={`toast toast-${toast.tone}`}>
                            {toast.tone === "success" ? <CheckCircle2 /> : <AlertTriangle />}
                            <span>{toast.message}</span>
                            <button
                              type="button"
                              aria-label="Đóng thông báo"
                              onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))}
                            >
                              <X />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </WidgetNavigationProvider>
                </QueryClientProvider>
              </ToastContext.Provider>
            </ThemeContext.Provider>
          </UserRoleContext.Provider>
        </PortalContainerContext.Provider>
      </ProjectsWidgetContext.Provider>
    </WidgetErrorBoundary>
  );
}

export default ProjectsWidgetApp;
