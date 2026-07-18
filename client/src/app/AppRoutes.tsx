import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";

// Pages
import { DashboardLive } from "./pages/Dashboard";
import { MyWork } from "./pages/MyWork";
import { Notifications } from "./pages/NotificationsPage";
import { Projects, ProjectDetail } from "./pages/ProjectPages";
import { FormPage, ErrorPage, ChangePasswordLive, ImportExportLive } from "./pages/FormPage";
import { BacklogLive, SlaPage, AuditLogsLive, IntegrationsLive } from "./pages/OperationalPages";
import { Board, CyclesLive, SprintsLive, SprintDetail, CompleteSprint } from "./pages/SprintPages";
import { RiskPage } from "./pages/RiskPage";
import { TicketList } from "./pages/TicketPages";
import { TicketDetailLive } from "./pages/TicketDetailLive";
import { Team, UserDetail } from "./pages/TeamPages";
import { Reports } from "./pages/Reports";
import { AIPage } from "./pages/AIPage";
import { ResourcesLive } from "./pages/ResourcesLive";
import { OrganizationLive, GroupsLive } from "./pages/OrganizationPages";
import { Settings, Sessions } from "./pages/SettingsPages";
import { useWorkspace } from "./workspace";

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { role } = useWorkspace();
  return role === "admin" ? <>{children}</> : <Navigate to="/403" replace />;
}

export function AppRoutes({
  density,
  setDensity,
  theme,
  setTheme,
  toast,
}: {
  density: string;
  setDensity: (s: string) => void;
  theme: string;
  setTheme: (s: string) => void;
  toast: (s: string) => void;
}) {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardLive />} />
      <Route path="/my-work" element={<MyWork />} />
      <Route path="/notifications" element={<Notifications toast={toast} />} />
      <Route path="/projects" element={<Projects />} />
      <Route path="/projects/new" element={<FormPage type="project" toast={toast} />} />
      <Route path="/projects/:projectId/*" element={<ProjectDetail />} />
      <Route path="/backlog" element={<BacklogLive toast={toast} />} />
      <Route path="/board" element={<Board toast={toast} />} />
      <Route path="/cycles" element={<CyclesLive toast={toast} />} />
      <Route path="/sprints" element={<SprintsLive toast={toast} />} />
      <Route path="/sla" element={<SlaPage toast={toast} />} />
      <Route path="/sprints/new" element={<FormPage type="sprint" toast={toast} />} />
      <Route path="/sprints/risk" element={<RiskPage />} />
      <Route path="/sprints/sprint-risk" element={<Navigate to="/sprints/risk" replace />} />
      <Route path="/sprints/sprint risk" element={<Navigate to="/sprints/risk" replace />} />
      <Route path="/sprint-risk" element={<Navigate to="/sprints/risk" replace />} />
      <Route path="/sprint risk" element={<Navigate to="/sprints/risk" replace />} />
      <Route path="/sprints/:sprintId" element={<SprintDetail />} />
      <Route path="/sprints/:sprintId/risk" element={<RiskPage />} />
      <Route path="/sprints/:sprintId/complete" element={<CompleteSprint toast={toast} />} />
      <Route path="/tickets" element={<TicketList />} />
      <Route path="/tickets/new" element={<FormPage type="ticket" toast={toast} />} />
      <Route path="/tickets/:ticketId" element={<TicketDetailLive toast={toast} />} />
      <Route path="/team" element={<Team />} />
      <Route path="/team/invite" element={<FormPage type="invite" toast={toast} />} />
      <Route path="/team/:userId" element={<UserDetail />} />
      <Route path="/reports/*" element={<Reports />} />
      <Route path="/ai/*" element={<AIPage />} />
      <Route path="/resources/*" element={<ResourcesLive toast={toast} />} />
      <Route path="/organization" element={<AdminOnly><OrganizationLive toast={toast} /></AdminOnly>} />
      <Route path="/groups" element={<AdminOnly><GroupsLive toast={toast} /></AdminOnly>} />
      <Route path="/settings/*" element={<Settings theme={theme} setTheme={setTheme} density={density} setDensity={setDensity} toast={toast} />} />
      <Route path="/change-password" element={<ChangePasswordLive toast={toast} />} />
      <Route path="/sessions" element={<Sessions toast={toast} />} />
      <Route path="/integrations/*" element={<AdminOnly><IntegrationsLive toast={toast} /></AdminOnly>} />
      <Route path="/audit-logs" element={<AdminOnly><AuditLogsLive /></AdminOnly>} />
      <Route path="/import" element={<AdminOnly><ImportExportLive toast={toast} /></AdminOnly>} />
      <Route path="/export" element={<AdminOnly><ImportExportLive toast={toast} /></AdminOnly>} />
      <Route path="/403" element={<ErrorPage code="403" />} />
      <Route path="/500" element={<ErrorPage code="500" />} />
      <Route path="/offline" element={<ErrorPage code="Offline" />} />
      <Route path="*" element={<ErrorPage code="404" />} />
    </Routes>
  );
}
