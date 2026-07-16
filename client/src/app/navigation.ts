export type NavItem = [string, string, string];
export type NavGroup = { group: string; admin?: boolean; items: NavItem[] };
export const nav: NavGroup[] = [
  {
    group: "My workspace",
    items: [
      ["/dashboard", "LayoutDashboard", "Dashboard"],
      ["/my-work", "CircleUserRound", "My work"],
      ["/notifications", "Bell", "Notifications"],
    ],
  },
  {
    group: "Plan and deliver",
    items: [
      ["/projects", "FolderKanban", "Projects"],
      ["/backlog", "ListTodo", "Backlog"],
      ["/board", "Columns3", "Board"],
      ["/cycles", "Repeat2", "Cycles"],
      ["/sprints", "Timer", "Sprints"],
      ["/resources/release", "Rocket", "Releases"],
      ["/resources/epic", "Map", "Roadmap"],
      ["/sla", "ShieldCheck", "SLA"],
      ["/team-hero", "Award", "Team Hero Zone"],
    ],
  },
  {
    group: "Insights",
    items: [
      ["/sprint-risk", "Activity", "Sprint risk"],
      ["/reports", "ChartNoAxesCombined", "Reports"],
      ["/ai", "Sparkles", "AI assistant"],
    ],
  },
  {
    group: "People and assets",
    items: [
      ["/team", "Users", "Team"],
      ["/resources", "Shapes", "Resources"],
    ],
  },
  {
    group: "Administration",
    admin: true,
    items: [
      ["/organization", "Building2", "Organization"],
      ["/integrations", "Webhook", "Integrations"],
      ["/audit-logs", "ScrollText", "Audit logs"],
      ["/import", "ArrowDownToLine", "Import / Export"],
      ["/settings", "Settings", "Settings"],
      ["/resources/workflow", "GitBranch", "Workflow editor"],
      ["/resources/permission-scheme", "KeyRound", "Permission schemes"],
      ["/resources/automation-rule", "Zap", "Automation rules"],
      ["/resources/notification-rule", "BellRing", "Notification rules"],
      ["/resources/saved-filter", "ListFilter", "Saved filters"],
    ],
  },
];
