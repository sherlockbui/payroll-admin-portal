import React from "react";
import { createRoot, Root } from "react-dom/client";
import { PayrollRunsWidgetApp, PayrollRunsWidgetConfig } from "./PayrollRunsWidgetApp";
import { ensureWidgetFonts, getWidgetInitialAttr } from "../common";
import tailwindStyles from "@/app/globals.css?inline";

class PayrollRunsElement extends HTMLElement {
  private root: Root | null = null;
  private shadow: ShadowRoot | null = null;
  private mountPoint: HTMLDivElement | null = null;
  private lastRenderKey: string = "";

  static get observedAttributes() {
    return ["api-base-url", "auth-token", "project-id", "payroll-id", "user-role", "theme"];
  }

  connectedCallback() {
    // 0. Tự động nạp Google Fonts Manrope & Inter vào document head
    ensureWidgetFonts();

    if (!this.shadow) {
      this.shadow = this.attachShadow({ mode: "open" });
    }

    if (!this.shadow.querySelector("style[data-widget-styles]")) {
      const styleEl = document.createElement("style");
      styleEl.setAttribute("data-widget-styles", "true");
      styleEl.textContent = tailwindStyles;
      this.shadow.appendChild(styleEl);
    }

    if (!this.mountPoint) {
      this.mountPoint = document.createElement("div");
      this.mountPoint.id = "payroll-runs-mount";
      this.shadow.appendChild(this.mountPoint);
    }

    this.renderApp();
  }

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null) {
    if (oldValue !== newValue && this.root && this.mountPoint) {
      this.renderApp();
    }
  }

  private renderApp() {
    if (!this.shadow || !this.mountPoint) return;

    const apiBaseUrl = getWidgetInitialAttr(this, "api-base-url", "API_BASE_URL");
    const authToken = getWidgetInitialAttr(this, "auth-token", "__SERVER_TOKEN", "hdfPayrollToken");
    const projectId = getWidgetInitialAttr(this, "project-id", "__SERVER_PROJECT_ID", "hdfPayrollProjectId");
    const payrollId = getWidgetInitialAttr(this, "payroll-id", "__SERVER_PAYROLL_ID", "hdfPayrollRunId");
    const userRole = (getWidgetInitialAttr(this, "user-role") as any) || "accountant";
    const themePreset = (getWidgetInitialAttr(this, "theme") as any) || "corporate";

    const renderKey = `${apiBaseUrl}|${authToken}|${projectId}|${payrollId}|${userRole}|${themePreset}`;
    if (renderKey === this.lastRenderKey && this.root) {
      return;
    }
    this.lastRenderKey = renderKey;

    const config: PayrollRunsWidgetConfig = {
      shadowRoot: this.shadow,
      mountElement: this.mountPoint,
      apiBaseUrl,
      authToken,
      projectId,
      payrollId,
      userRole,
      themePreset,
      onEvent: (name: string, detail: any) => {
        this.dispatchEvent(
          new CustomEvent(name, {
            bubbles: true,
            composed: true,
            detail,
          })
        );
      },
    };

    if (!this.root) {
      this.root = createRoot(this.mountPoint);
    }

    this.root.render(React.createElement(PayrollRunsWidgetApp, { config }));
  }

  disconnectedCallback() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}

if (typeof window !== "undefined" && !customElements.get("payroll-runs")) {
  customElements.define("payroll-runs", PayrollRunsElement);
}

export { PayrollRunsElement };
