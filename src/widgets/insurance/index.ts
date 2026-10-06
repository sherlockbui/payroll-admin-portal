import React from "react";
import { createRoot, Root } from "react-dom/client";
import { InsuranceWidgetApp, InsuranceWidgetConfig } from "./InsuranceWidgetApp";
import { ensureWidgetFonts } from "../common";
import tailwindStyles from "@/app/globals.css?inline";

class PayrollInsuranceElement extends HTMLElement {
  private root: Root | null = null;
  private shadow: ShadowRoot | null = null;
  private mountPoint: HTMLDivElement | null = null;

  static get observedAttributes() {
    return ["api-base-url", "auth-token", "project-id", "user-role", "theme"];
  }

  connectedCallback() {
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
      this.mountPoint.id = "payroll-insurance-mount";
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

    const config: InsuranceWidgetConfig = {
      shadowRoot: this.shadow,
      mountElement: this.mountPoint,
      apiBaseUrl: this.getAttribute("api-base-url") || "",
      authToken: this.getAttribute("auth-token") || "",
      projectId: this.getAttribute("project-id") || "",
      userRole: (this.getAttribute("user-role") as any) || "accountant",
      themePreset: (this.getAttribute("theme") as any) || "corporate",
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

    this.root.render(React.createElement(InsuranceWidgetApp, { config }));
  }

  disconnectedCallback() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}

if (typeof window !== "undefined" && !customElements.get("payroll-insurance")) {
  customElements.define("payroll-insurance", PayrollInsuranceElement);
}

export { PayrollInsuranceElement };
