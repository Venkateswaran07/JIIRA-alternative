import React, { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { ApiGate } from "./workspace";
import { AppDialogHost } from "./components/AppDialog";
import { Shell } from "./Shell";

// Page modules
import { LandingPage } from "./pages/LandingPage";
import { AuthPageLive, GoogleAuthCallback, InvitationAcceptPage } from "./pages/AuthPages";
import { OnboardingFlow } from "./pages/OnboardingFlow";
import { AppRoutes } from "./AppRoutes";

export function App() {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "system");
  const [density, setDensity] = useState(localStorage.getItem("density") || "comfortable");
  const [toasts, setToasts] = useState<any[]>([]);
  const toastSequence = React.useRef(0);

  useEffect(() => {
    document.documentElement.dataset.density = density;
    localStorage.setItem("theme", theme);
    localStorage.setItem("density", density);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => { document.documentElement.dataset.theme = theme === "system" ? (media.matches ? "dark" : "light") : theme; };
    apply();
    if (theme === "system") media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, density]);

  const toast = (message: string) => {
    const id = `${Date.now()}-${toastSequence.current++}`;
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  };

  const dismissToast = (id: string) => setToasts((items) => items.filter((item) => item.id !== id));

  // Determine basename dynamically
  const rawParts = window.location.pathname.split("/").filter(Boolean);
  const parts = rawParts.map((p) => decodeURIComponent(p));
  const savedSlug = localStorage.getItem("itrack_workspace_slug");
  const workspaceRouteRoots = new Set([
    "dashboard", "my-work", "notifications", "projects", "resources", "backlog",
    "board", "cycles", "sprints", "sla", "sprint-risk", "sprints-risk", "sprint risk",
    "tickets", "team", "reports", "ai", "organization", "sessions", "settings",
    "audit-logs", "integrations", "import", "groups", "403", "500", "offline"
  ]);

  let basename = "/";
  if (savedSlug && (parts[0] === savedSlug || rawParts[0] === savedSlug)) {
    basename = `/${rawParts[0]}`;
  } else if (parts.length > 1 && (workspaceRouteRoots.has(parts[1]) || workspaceRouteRoots.has(rawParts[1]))) {
    basename = `/${rawParts[0]}`;
  } else if (
    parts.length === 1 &&
    !workspaceRouteRoots.has(parts[0]) &&
    !workspaceRouteRoots.has(rawParts[0]) &&
    !["login", "register", "forgot-password", "reset-password", "accept-invite", "onboarding", "auth"].includes(parts[0])
  ) {
    basename = `/${rawParts[0]}`;
  }

  return (
    <BrowserRouter basename={basename}>
      <ApiGate toast={toast}>
        <Routes>
          {basename === "/" && <Route path="/" element={<LandingPage />} />}
          <Route path="/login" element={<AuthPageLive type="login" />} />
          <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
          <Route path="/register" element={<AuthPageLive type="register" />} />
          <Route path="/forgot-password" element={<AuthPageLive type="forgot-password" />} />
          <Route path="/reset-password" element={<AuthPageLive type="reset-password" />} />
          <Route path="/accept-invite" element={<InvitationAcceptPage />} />
          <Route path="/onboarding/:step" element={<OnboardingFlow toast={toast} />} />
          <Route
            path="/*"
            element={
              <Shell theme={theme} setTheme={setTheme} toast={toast}>
                <AppRoutes theme={theme} setTheme={setTheme} density={density} setDensity={setDensity} toast={toast} />
              </Shell>
            }
          />
        </Routes>
        <div className="toast-stack" aria-live="polite" aria-atomic="true">
          {toasts.map((t) => (
            <div className="toast" key={t.id} role="status">
              <Icons.CheckCircle2 size={18} />
              <span>{t.message}</span>
              <button className="toast-dismiss" type="button" onClick={() => dismissToast(t.id)} aria-label="Dismiss notification" title="Dismiss">
                <Icons.X size={15} />
              </button>
            </div>
          ))}
        </div>
        <AppDialogHost />
      </ApiGate>
    </BrowserRouter>
  );
}
