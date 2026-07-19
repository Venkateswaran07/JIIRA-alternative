import React from "react";
import { Navigate } from "react-router-dom";
import { useWorkspace } from "../workspace";

export function RoleGuard({
  roles,
  children,
  redirectTo = "/403",
}: {
  roles: string[];
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const { role } = useWorkspace();
  return roles.includes(role) ? <>{children}</> : <Navigate to={redirectTo} replace />;
}
