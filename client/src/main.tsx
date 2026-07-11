import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import * as Icons from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, clearSession, getToken, login } from "./api";
import "./styles.css";

type Role = "admin" | "manager" | "engineer" | "designer";
type TicketStatus = "Backlog" | "To Do" | "In Progress" | "In Review" | "Done";
type Priority = "low" | "medium" | "high" | "critical";
type Ticket = {
  id: string;
  key: string;
  title: string;
  status: TicketStatus;
  priority: Priority;
  points: number;
  assignee: string;
  project: string;
  labels: string[];
  blocked?: boolean;
  watched?: boolean;
};
type Toast = { id: number; message: string };

let tickets: Ticket[] = [];
let projects: {
  key: string;
  name: string;
  description: string;
  progress: number;
  risk: string;
  members: number;
  sprint: string;
}[] = [];
let people: {
  name: string;
  email: string;
  role: string;
  skills: string[];
  load: number;
  color: string;
}[] = [];
let velocity: { n: string; v: number }[] = [];
let risk: { n: string; v: number }[] = [];
const serverData: any = {
  user: null,
  organization: null,
  dashboard: null,
  notifications: [],
  resources: {},
  integrations: [],
  auditLogs: [],
  sessions: [],
  reports: null,
};
const cx = (...v: (string | false | undefined)[]) =>
  v.filter(Boolean).join(" ");
const fmt = (s: string) =>
  s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function App() {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [density, setDensity] = useState(
    localStorage.getItem("density") || "comfortable",
  );
  const [role, setRole] = useState<Role>("admin");
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.density = density;
    localStorage.setItem("theme", theme);
  }, [theme, density]);
  const toast = (message: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  };
  return (
    <BrowserRouter>
      <ApiGate>
        <Routes>
          <Route path="/login" element={<AuthPageLive type="login" />} />
          <Route path="/register" element={<AuthPageLive type="register" />} />
          <Route
            path="/forgot-password"
            element={<AuthPageLive type="forgot-password" />}
          />
          <Route
            path="/reset-password"
            element={<AuthPageLive type="reset-password" />}
          />
          <Route
            path="/accept-invite"
            element={<AuthPageLive type="accept-invite" />}
          />
          <Route
            path="/*"
            element={
              <Shell
                theme={theme}
                setTheme={setTheme}
                role={role}
                setRole={setRole}
                toast={toast}
              >
                <AppRoutes
                  density={density}
                  setDensity={setDensity}
                  toast={toast}
                />
              </Shell>
            }
          />
        </Routes>
        <div className="toast-stack">
          {toasts.map((t) => (
            <div className="toast" key={t.id}>
              <Icons.CheckCircle2 size={18} />
              {t.message}
            </div>
          ))}
        </div>
      </ApiGate>
    </BrowserRouter>
  );
}

function ApiGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const publicPath = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/accept-invite",
  ].includes(location.pathname);
  useEffect(() => {
    if (publicPath) {
      setState("ready");
      return;
    }
    if (!getToken()) {
      navigate("/login", { replace: true });
      setState("ready");
      return;
    }
    let active = true;
    (async () => {
      try {
        const [
          me,
          dashboard,
          notifications,
          reports,
          sessions,
          auditLogs,
          apiTokens,
          webhooks,
        ] = await Promise.all([
          api<any>("/auth/me"),
          api<any>("/dashboard"),
          api<any>("/notifications").catch(() => ({ notifications: [] })),
          api<any>("/reports").catch(() => null),
          api<any>("/auth/sessions").catch(() => ({ sessions: [] })),
          api<any>("/audit-logs").catch(() => ({ events: [] })),
          api<any>("/integrations/api-token").catch(() => ({
            integrations: [],
          })),
          api<any>("/integrations/webhook").catch(() => ({ integrations: [] })),
        ]);
        const resourcePairs = await Promise.all(
          resourceKinds.map(async (kind) => [
            kind,
            (
              await api<any>(`/resources/${kind}`).catch(() => ({
                resources: [],
              }))
            ).resources,
          ]),
        );
        serverData.user = me.user;
        serverData.organization = me.organization;
        serverData.dashboard = dashboard;
        serverData.notifications = notifications.notifications || [];
        serverData.reports = reports?.reports;
        serverData.sessions = sessions.sessions || [];
        serverData.auditLogs = auditLogs.events || [];
        serverData.integrations = [
          ...(apiTokens.integrations || []),
          ...(webhooks.integrations || []),
        ];
        serverData.resources = Object.fromEntries(resourcePairs);
        people = (dashboard.users || []).map((u: any) => ({
          name: u.name,
          email: u.email,
          role: u.role,
          skills: u.skills || [],
          load:
            Math.round((1 - (u.availability ?? 1)) * 100) ||
            Math.min(100, Math.round(((u.capacity || 0) / 40) * 100)),
          color: u.avatarColor || "#A47BEF",
        }));
        projects = (dashboard.projects || []).map((p: any) => ({
          key: p.key,
          name: p.name,
          description: p.description,
          progress: p.progress,
          risk: p.riskLevel,
          members: p.members?.length || 0,
          sprint: p.activeSprint,
        }));
        tickets = (dashboard.tickets || []).map((t: any) => ({
          id: t._id,
          key: t.ticketId,
          title: t.title,
          status: t.status,
          priority: t.priority,
          points: t.storyPoints,
          assignee: t.assignee?.name || "Unassigned",
          project: t.project?.name || "",
          labels: t.labels || [],
          blocked: t.blocked,
          watched: (t.watchers || []).some(
            (w: any) => String(w._id || w) === String(me.user.id),
          ),
        }));
        const activeSprint =
          (dashboard.sprints || []).find((s: any) => s.status === "active") ||
          dashboard.sprints?.[0];
        velocity = (activeSprint?.velocityHistory || []).map(
          (v: number, i: number) => ({ n: `S${i + 1}`, v }),
        );
        risk = (dashboard.sprints || [])
          .slice(-5)
          .map((s: any) => ({ n: s.name, v: s.riskScore }));
        if (!risk.length) risk = [{ n: "Current", v: 0 }];
        if (active) setState("ready");
      } catch (e) {
        if (e instanceof Error && e.message.includes("401")) {
          clearSession();
          navigate("/login", { replace: true });
        } else {
          setError(e instanceof Error ? e.message : "Unable to load workspace");
          setState("error");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [location.pathname, publicPath, navigate]);
  if (state === "loading")
    return (
      <div className="app-loading">
        <span className="brand-mark">I</span>
        <b>Loading workspace…</b>
      </div>
    );
  if (state === "error")
    return (
      <div className="app-loading error">
        <Icons.CloudOff />
        <b>Couldn’t load workspace</b>
        <p>{error}</p>
        <button
          className="btn primary"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  return <>{children}</>;
}

type NavItem = [string, string, string];
type NavGroup = { group: string; admin?: boolean; items: NavItem[] };
const nav: NavGroup[] = [
  {
    group: "Overview",
    items: [
      ["/dashboard", "LayoutDashboard", "Dashboard"],
      ["/my-work", "CircleUserRound", "My work"],
      ["/notifications", "Bell", "Notifications"],
    ],
  },
  {
    group: "Planning",
    items: [
      ["/projects", "FolderKanban", "Projects"],
      ["/backlog", "ListTodo", "Backlog"],
      ["/board", "Columns3", "Board"],
      ["/sprints", "Timer", "Sprints"],
    ],
  },
  {
    group: "Intelligence",
    items: [
      ["/sprint-risk", "Activity", "Sprint risk"],
      ["/reports", "ChartNoAxesCombined", "Reports"],
      ["/ai", "Sparkles", "AI assistant"],
    ],
  },
  {
    group: "Workspace",
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
    ],
  },
];
function Shell({
  children,
  theme,
  setTheme,
  role,
  setRole,
  toast,
}: {
  children: React.ReactNode;
  theme: string;
  setTheme: (s: string) => void;
  role: Role;
  setRole: (r: Role) => void;
  toast: (s: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [search, setSearch] = useState(false),
    [workspaceMenu, setWorkspaceMenu] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();
  const label =
    nav
      .flatMap((g) => g.items)
      .find((i) => loc.pathname.startsWith(i[0]))?.[2] ||
    fmt(loc.pathname.split("/").filter(Boolean).at(-1) || "Dashboard");
  return (
    <div className={cx("app", collapsed && "collapsed")}>
      <aside className={cx("sidebar", mobile && "open")}>
        <div className="brand">
          <div className="brand-mark">I</div>
          <span>I-TRACK</span>
          <button
            className="icon-btn collapse"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Icons.PanelLeftClose size={19} />
          </button>
        </div>
        <div className="workspace-switcher">
          <button
            className="org-switch"
            aria-haspopup="menu"
            aria-expanded={workspaceMenu}
            onClick={() => setWorkspaceMenu(!workspaceMenu)}
          >
            <span className="avatar square">
              {(serverData.organization?.name || "Workspace")
                .split(" ")
                .map((x: string) => x[0])
                .join("")
                .slice(0, 2)}
            </span>
            <span>
              <b>{serverData.organization?.name || "Workspace"}</b>
              <small>
                {fmt(serverData.organization?.plan || "starter")} workspace
              </small>
            </span>
            <Icons.ChevronsUpDown size={15} />
          </button>
          {workspaceMenu && (
            <div className="workspace-menu" role="menu">
              <p>WORKSPACE</p>
              <button
                className="selected"
                role="menuitem"
                onClick={() => {
                  setWorkspaceMenu(false);
                  toast(`${serverData.organization?.name} selected`);
                }}
              >
                <span className="avatar square">
                  {(serverData.organization?.name || "W")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <span>
                  <b>{serverData.organization?.name}</b>
                  <small>Current workspace</small>
                </span>
                <Icons.Check size={16} />
              </button>
              <hr />
              <button
                role="menuitem"
                onClick={() => {
                  setWorkspaceMenu(false);
                  navigate("/organization");
                }}
              >
                <Icons.Settings size={17} />
                <span>
                  <b>Workspace settings</b>
                  <small>Members, plan and preferences</small>
                </span>
              </button>
            </div>
          )}
        </div>
        <nav>
          {nav
            .filter((g) => !g.admin || role === "admin")
            .map((g) => (
              <div className="nav-group" key={g.group}>
                <p>{g.group}</p>
                {g.items.map(([path, icon, label]) => {
                  const Icon = (Icons as any)[icon];
                  return (
                    <NavLink
                      key={path}
                      to={path}
                      onClick={() => setMobile(false)}
                      className={({ isActive }) => (isActive ? "active" : "")}
                    >
                      <Icon size={19} />
                      <span>{label}</span>
                      {label === "Notifications" && <em>4</em>}
                    </NavLink>
                  );
                })}
              </div>
            ))}
        </nav>
        <div className="sidebar-user">
          <Avatar
            name={serverData.user?.name || "User"}
            color={serverData.user?.avatarColor}
          />
          <span>
            <b>{serverData.user?.name || "User"}</b>
            <small>{fmt(serverData.user?.role || role)}</small>
          </span>
          <Icons.MoreHorizontal size={18} />
        </div>
      </aside>
      <header className="topbar">
        <button
          className="icon-btn mobile-menu"
          onClick={() => setMobile(true)}
        >
          <Icons.Menu />
        </button>
        <div className="crumb">
          <span>{serverData.organization?.name || "Workspace"}</span>
          <Icons.ChevronRight size={15} />
          <b>{label}</b>
        </div>
        <div className="top-actions">
          <button className="search-trigger" onClick={() => setSearch(true)}>
            <Icons.Search size={17} />
            <span>Search anything</span>
            <kbd>⌘ K</kbd>
          </button>
          <button
            className="btn primary"
            onClick={() => navigate("/tickets/new")}
          >
            <Icons.Plus size={17} />
            Create
          </button>
          <button
            className="icon-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Icons.Sun /> : <Icons.Moon />}
          </button>
          <button
            className="icon-btn"
            onClick={() => navigate("/notifications")}
          >
            <Icons.Bell />
            <i />
          </button>
        </div>
      </header>
      <main>{children}</main>
      <nav className="bottom-nav">
        {[
          ["/dashboard", "House", "Home"],
          ["/projects", "FolderKanban", "Projects"],
          ["/my-work", "CircleUserRound", "Work"],
          ["/reports", "ChartNoAxesCombined", "Reports"],
          ["/settings", "Menu", "More"],
        ].map(([p, i, l]) => {
          const Icon = (Icons as any)[i];
          return (
            <NavLink to={p} key={p}>
              <Icon />
              <span>{l}</span>
            </NavLink>
          );
        })}
      </nav>
      {mobile && <div className="scrim" onClick={() => setMobile(false)} />}{" "}
      {search && <Command close={() => setSearch(false)} navigate={navigate} />}
      <button className="fab" onClick={() => navigate("/tickets/new")}>
        <Icons.Plus />
      </button>
      <div className="dev-role">
        <span>Preview as</span>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as Role);
            toast(`Role changed to ${fmt(e.target.value)}`);
          }}
        >
          {["admin", "manager", "engineer", "designer"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
function Command({
  close,
  navigate,
}: {
  close: () => void;
  navigate: (s: string) => void;
}) {
  const [q, setQ] = useState("");
  const all = nav.flatMap((g) => g.items);
  return (
    <div className="modal-wrap" onMouseDown={close}>
      <div className="command" onMouseDown={(e) => e.stopPropagation()}>
        <div>
          <Icons.Search />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pages, tickets and projects…"
          />
          <kbd>ESC</kbd>
        </div>
        <p>QUICK NAVIGATION</p>
        {all
          .filter((x) => x[2].toLowerCase().includes(q.toLowerCase()))
          .slice(0, 8)
          .map(([p, i, l]) => {
            const Icon = (Icons as any)[i];
            return (
              <button
                key={p}
                onClick={() => {
                  navigate(p);
                  close();
                }}
              >
                <Icon />
                <span>{l}</span>
                <Icons.ArrowUpRight />
              </button>
            );
          })}
      </div>
    </div>
  );
}

function AppRoutes({
  density,
  setDensity,
  toast,
}: {
  density: string;
  setDensity: (s: string) => void;
  toast: (s: string) => void;
}) {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardLive />} />
      <Route path="/my-work" element={<MyWork />} />
      <Route path="/notifications" element={<Notifications toast={toast} />} />
      <Route path="/projects" element={<Projects />} />
      <Route
        path="/projects/new"
        element={<FormPage type="project" toast={toast} />}
      />
      <Route path="/projects/:projectId/*" element={<ProjectDetail />} />
      <Route path="/backlog" element={<BacklogLive toast={toast} />} />
      <Route path="/board" element={<Board toast={toast} />} />
      <Route path="/sprints" element={<SprintsLive toast={toast} />} />
      <Route
        path="/sprints/new"
        element={<FormPage type="sprint" toast={toast} />}
      />
      <Route path="/sprints/:sprintId" element={<SprintDetail />} />
      <Route path="/sprints/:sprintId/risk" element={<RiskPage />} />
      <Route
        path="/sprints/:sprintId/complete"
        element={<CompleteSprint toast={toast} />}
      />
      <Route path="/sprint-risk" element={<RiskPage />} />
      <Route path="/tickets" element={<TicketList />} />
      <Route
        path="/tickets/new"
        element={<FormPage type="ticket" toast={toast} />}
      />
      <Route
        path="/tickets/:ticketId"
        element={<TicketDetail toast={toast} />}
      />
      <Route path="/team" element={<Team />} />
      <Route
        path="/team/invite"
        element={<FormPage type="invite" toast={toast} />}
      />
      <Route path="/team/:userId" element={<UserDetail />} />
      <Route path="/reports/*" element={<Reports />} />
      <Route path="/ai/*" element={<AIPage toast={toast} />} />
      <Route path="/resources/*" element={<ResourcesLive toast={toast} />} />
      <Route
        path="/organization"
        element={<OrganizationLive toast={toast} />}
      />
      <Route
        path="/settings/*"
        element={
          <Settings density={density} setDensity={setDensity} toast={toast} />
        }
      />
      <Route
        path="/change-password"
        element={
          <Settings density={density} setDensity={setDensity} toast={toast} />
        }
      />
      <Route path="/sessions" element={<Sessions toast={toast} />} />
      <Route
        path="/integrations/*"
        element={<IntegrationsLive toast={toast} />}
      />
      <Route path="/audit-logs" element={<AuditLogsLive />} />
      <Route path="/import" element={<ImportExport toast={toast} />} />
      <Route path="/export" element={<ImportExport toast={toast} />} />
      <Route path="/403" element={<ErrorPage code="403" />} />
      <Route path="/500" element={<ErrorPage code="500" />} />
      <Route path="/offline" element={<ErrorPage code="Offline" />} />
      <Route path="*" element={<ErrorPage code="404" />} />
    </Routes>
  );
}

function PageHead({
  eyebrow,
  title,
  desc,
  children,
}: {
  eyebrow?: string;
  title: string;
  desc?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {desc && <p>{desc}</p>}
      </div>
      <div className="head-actions">{children}</div>
    </div>
  );
}
function FilterBar({ placeholder = "Search…" }: { placeholder?: string }) {
  const [params, setParams] = useSearchParams();
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next);
  };
  return (
    <div className="filterbar">
      <label>
        <Icons.Search />
        <input
          placeholder={placeholder}
          value={params.get("q") || ""}
          onChange={(event) => set("q", event.target.value)}
        />
      </label>
      <button
        className="btn"
        onClick={() =>
          set("filter", params.get("filter") === "open" ? "" : "open")
        }
        aria-pressed={params.get("filter") === "open"}
      >
        <Icons.SlidersHorizontal />
        Filter
      </button>
      <button
        className="btn"
        onClick={() =>
          set("sort", params.get("sort") === "desc" ? "asc" : "desc")
        }
      >
        <Icons.ArrowUpDown />
        Sort
      </button>
      <button
        className="icon-btn"
        onClick={() =>
          set("view", params.get("view") === "grid" ? "list" : "grid")
        }
        aria-label="Toggle layout"
      >
        {params.get("view") === "grid" ? <Icons.List /> : <Icons.LayoutGrid />}
      </button>
    </div>
  );
}
function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Avatar({ name, color }: { name: string; color?: string }) {
  return (
    <span className="avatar" style={{ background: color }}>
      {name
        .split(" ")
        .map((s) => s[0])
        .join("")
        .slice(0, 2)}
    </span>
  );
}
function Progress({
  value,
  tone = "purple",
}: {
  value: number;
  tone?: string;
}) {
  return (
    <div className={`progress ${tone}`}>
      <i style={{ width: `${value}%` }} />
    </div>
  );
}
function Empty({
  icon: Icon = Icons.Inbox,
  title,
  body,
}: {
  icon?: any;
  title: string;
  body: string;
}) {
  return (
    <div className="empty">
      <span>
        <Icon />
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
      <NavLink className="btn primary" to="/tickets/new">
        <Icons.Plus />
        Create new
      </NavLink>
    </div>
  );
}

function Dashboard() {
  return (
    <>
      <PageHead eyebrow="SATURDAY, 11 JULY" title="Good morning, Maya">
        <p>Here’s what needs your attention across Northstar Labs.</p>
      </PageHead>
      <div className="metrics">
        {[
          ["Active projects", "12", "+2 this month", "FolderKanban", "blue"],
          ["Sprints in progress", "4", "96 points planned", "Timer", "purple"],
          ["At-risk sprints", "2", "Needs attention", "Activity", "orange"],
          ["Blocked tasks", "7", "3 critical", "CircleSlash2", "red"],
          ["Sprint health", "82%", "Up 6%", "HeartPulse", "green"],
        ].map(([l, v, s, i, t]) => {
          const Icon = (Icons as any)[i];
          return (
            <article className="metric" key={l}>
              <div>
                <span>{l}</span>
                <strong>{v}</strong>
                <small>{s}</small>
              </div>
              <b className={t}>
                <Icon />
              </b>
            </article>
          );
        })}
      </div>
      <div className="dashboard-grid">
        <section className="card span-2">
          <CardTitle
            title="Delivery pulse"
            sub="Risk and velocity across the current sprint"
          >
            <Badge tone="green">On track</Badge>
          </CardTitle>
          <div className="chart">
            <ResponsiveContainer>
              <AreaChart data={risk}>
                <defs>
                  <linearGradient id="purple" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#A47BEF" stopOpacity=".45" />
                    <stop offset="1" stopColor="#A47BEF" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="n" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#A47BEF"
                  strokeWidth={3}
                  fill="url(#purple)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card">
          <CardTitle title="Active sprint" sub="Sprint 24 · 6 days left" />
          <div className="ring-wrap">
            <div className="score-ring">
              <strong>72%</strong>
              <span>complete</span>
            </div>
          </div>
          <Progress value={72} />
          <div className="split">
            <span>
              <b>68</b> completed
            </span>
            <span>
              <b>26</b> remaining
            </span>
          </div>
        </section>
        <section className="card span-2">
          <CardTitle
            title="Team workload"
            sub="Capacity across active projects"
          >
            <button className="text-btn">
              View team <Icons.ArrowRight />
            </button>
          </CardTitle>
          <div className="workloads">
            {people.map((p) => (
              <div key={p.name}>
                <Avatar name={p.name} color={p.color} />
                <span>
                  <b>{p.name}</b>
                  <small>{p.role}</small>
                </span>
                <Progress
                  value={p.load}
                  tone={p.load > 80 ? "orange" : "purple"}
                />
                <strong>{p.load}%</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="card insight">
          <div className="insight-icon">
            <Icons.Sparkles />
          </div>
          <Badge tone="lime">AI INSIGHT</Badge>
          <h2>Resolve blockers before scope grows</h2>
          <p>
            Three critical tickets are blocked by the SSO dependency. Reassign
            API review capacity today to protect the sprint goal.
          </p>
          <div className="confidence">
            <span>Confidence</span>
            <b>82%</b>
          </div>
          <button className="btn dark">
            Review recommendation <Icons.ArrowUpRight />
          </button>
        </section>
      </div>
    </>
  );
}
function CardTitle({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card-title">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function Projects() {
  const nav = useNavigate();
  return (
    <>
      <PageHead
        title="Projects"
        desc="Plan, track, and deliver work across every initiative."
      >
        <button className="btn" onClick={() => nav("/import")}>
          <Icons.Upload />
          Import
        </button>
        <button className="btn primary" onClick={() => nav("/projects/new")}>
          <Icons.Plus />
          New project
        </button>
      </PageHead>
      <FilterBar placeholder="Search projects…" />
      <div className="project-grid">
        {projects.map((p, i) => (
          <article
            className="project-card"
            key={p.key}
            onClick={() => nav(`/projects/${p.key}`)}
          >
            <div className="project-top">
              <span className={`project-icon p${i}`}>{p.key.slice(0, 2)}</span>
              <Badge tone={p.risk}>{p.risk} risk</Badge>
            </div>
            <h2>{p.name}</h2>
            <p>{p.description}</p>
            <div className="project-meta">
              <span>
                <Icons.Timer /> {p.sprint}
              </span>
              <span>
                <Icons.Users /> {p.members}
              </span>
            </div>
            <div className="progress-label">
              <span>Progress</span>
              <b>{p.progress}%</b>
            </div>
            <Progress
              value={p.progress}
              tone={p.risk === "high" ? "orange" : "purple"}
            />
            <div className="avatar-stack">
              {people.slice(0, 3).map((x) => (
                <Avatar key={x.name} name={x.name} color={x.color} />
              ))}
              <span>+{p.members - 3}</span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
function ProjectDetail() {
  const { projectId } = useParams();
  const nav = useNavigate();
  const p = projects.find((x) => x.key === projectId) || projects[0];
  return (
    <>
      <PageHead eyebrow={p.key} title={p.name} desc={p.description}>
        <button className="btn" onClick={() => nav("/team")}>
          <Icons.UserPlus />
          Members
        </button>
        <button className="btn primary" onClick={() => nav("/tickets/new")}>
          <Icons.Plus />
          Add ticket
        </button>
      </PageHead>
      <div className="tabs">
        {[
          "Overview",
          "Board",
          "Backlog",
          "Sprints",
          "Tickets",
          "Releases",
          "Resources",
          "Reports",
          "Settings",
        ].map((x) => (
          <button
            className={x === "Overview" ? "active" : ""}
            onClick={() =>
              nav(
                x === "Overview"
                  ? `/projects/${p.key}`
                  : x === "Settings"
                    ? `/projects/${p.key}/settings`
                    : `/${x.toLowerCase()}`,
              )
            }
            key={x}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="metrics compact">
        <article className="metric">
          <div>
            <span>Progress</span>
            <strong>{p.progress}%</strong>
            <small>Across current scope</small>
          </div>
        </article>
        <article className="metric">
          <div>
            <span>Open work</span>
            <strong>34</strong>
            <small>7 due this week</small>
          </div>
        </article>
        <article className="metric">
          <div>
            <span>Team</span>
            <strong>{p.members}</strong>
            <small>2 near capacity</small>
          </div>
        </article>
        <article className="metric">
          <div>
            <span>Risk</span>
            <strong>{fmt(p.risk)}</strong>
            <small>Stable this week</small>
          </div>
        </article>
      </div>
      <div className="two-col">
        <section className="card">
          <CardTitle title="Recent work" sub="Updates across this project" />
          <TicketTable rows={tickets.slice(0, 4)} />
        </section>
        <section className="card">
          <CardTitle title="Milestones" />
          <div className="timeline">
            {[
              "Design system ready",
              "Private beta",
              "General availability",
            ].map((x, i) => (
              <div key={x}>
                <i className={i === 0 ? "done" : ""} />
                <span>
                  <b>{x}</b>
                  <small>
                    {i === 0 ? "Completed 8 Jul" : `Due ${18 + i * 7} Jul`}
                  </small>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function TicketTable({ rows = tickets }: { rows?: Ticket[] }) {
  const nav = useNavigate();
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Assignee</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} onClick={() => nav(`/tickets/${t.key}`)}>
              <td>
                <small>{t.key}</small>
                <b>{t.title}</b>
              </td>
              <td>
                <Badge tone={t.status.toLowerCase().replaceAll(" ", "")}>
                  {t.status}
                </Badge>
              </td>
              <td>
                <Badge tone={t.priority}>
                  <i className="dot" />
                  {fmt(t.priority)}
                </Badge>
              </td>
              <td>
                <span className="person">
                  <Avatar name={t.assignee} />
                  {t.assignee}
                </span>
              </td>
              <td>{t.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function TicketList() {
  const nav = useNavigate();
  return (
    <>
      <PageHead
        title="Tickets"
        desc="Find and manage work across your organization."
      >
        <button className="btn primary" onClick={() => nav("/tickets/new")}>
          <Icons.Plus />
          New ticket
        </button>
      </PageHead>
      <FilterBar placeholder="Search by key or title…" />
      <section className="card no-pad">
        <TicketTable />
      </section>
    </>
  );
}
function Board({ toast }: { toast: (s: string) => void }) {
  const nav = useNavigate();
  const [data, setData] = useState(tickets);
  const [view, setView] = useState<"board" | "list">("board");
  const [filters, setFilters] = useState(false);
  const statuses: TicketStatus[] = [
    "Backlog",
    "To Do",
    "In Progress",
    "In Review",
    "Done",
  ];
  const move = async (id: string, status: TicketStatus) => {
    const previous = data;
    setData((d) => d.map((t) => (t.id === id ? { ...t, status } : t)));
    try {
      await api(`/tickets/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast(`Ticket moved to ${status}`);
    } catch (error) {
      setData(previous);
      toast(error instanceof Error ? error.message : "Move failed");
    }
  };
  return (
    <>
      <PageHead title="Sprint board" desc="Sprint 24 · 6 days remaining">
        <button
          className="btn"
          onClick={() => setFilters(!filters)}
          aria-pressed={filters}
        >
          <Icons.Filter />
          Filters
        </button>
        <button className="btn primary" onClick={() => nav("/tickets/new")}>
          <Icons.Plus />
          Create ticket
        </button>
      </PageHead>
      <div className="board-toolbar">
        <div className="segmented">
          <button
            className={view === "board" ? "active" : ""}
            onClick={() => setView("board")}
          >
            Board
          </button>
          <button
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
          >
            List
          </button>
        </div>
        <span>24 tickets · 94 points</span>
        <div className="avatar-stack">
          {people.map((p) => (
            <Avatar key={p.name} name={p.name} color={p.color} />
          ))}
        </div>
      </div>
      {view === "list" ? (
        <section className="card no-pad">
          <TicketTable rows={data} />
        </section>
      ) : (
        <div className="kanban">
          {statuses.map((s) => (
            <section key={s}>
              <header>
                <i className={s.replaceAll(" ", "").toLowerCase()} />
                <b>{s}</b>
                <span>{data.filter((t) => t.status === s).length}</span>
                <Icons.MoreHorizontal />
              </header>
              {data
                .filter((t) => t.status === s)
                .map((t) => (
                  <article className="ticket-card" key={t.id}>
                    <div>
                      <small>{t.key}</small>
                      {t.blocked && (
                        <Badge tone="red">
                          <Icons.CircleSlash2 />
                          Blocked
                        </Badge>
                      )}
                    </div>
                    <h3>{t.title}</h3>
                    <div className="labels">
                      {t.labels.map((l) => (
                        <Badge key={l}>{l}</Badge>
                      ))}
                    </div>
                    <div className="ticket-foot">
                      <Badge tone={t.priority}>
                        <i className="dot" />
                        {t.priority}
                      </Badge>
                      <span>{t.points} pts</span>
                      <Avatar name={t.assignee} />
                    </div>
                    <select
                      value={t.status}
                      aria-label="Move ticket"
                      onChange={(e) =>
                        move(t.id, e.target.value as TicketStatus)
                      }
                    >
                      {statuses.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </article>
                ))}
              <button className="add-card" onClick={() => nav("/tickets/new")}>
                <Icons.Plus />
                Add ticket
              </button>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
function Backlog({ toast }: { toast: (s: string) => void }) {
  return (
    <>
      <PageHead
        title="Backlog"
        desc="Prioritize upcoming work and shape future sprints."
      >
        <button className="btn">
          <Icons.Plus />
          Create sprint
        </button>
        <button className="btn primary">
          <Icons.Plus />
          Create ticket
        </button>
      </PageHead>
      <FilterBar placeholder="Search backlog…" />
      <section className="sprint-group">
        <div className="sprint-group-head">
          <div>
            <Icons.ChevronDown />
            <h2>Sprint 25</h2>
            <Badge tone="neutral">PLANNED</Badge>
            <span>18 tickets · 62 points</span>
          </div>
          <button className="btn lime" onClick={() => toast("Sprint started")}>
            Start sprint
          </button>
        </div>
        <TicketTable rows={tickets.slice(1, 4)} />
      </section>
      <section className="sprint-group">
        <div className="sprint-group-head">
          <div>
            <Icons.ChevronDown />
            <h2>Backlog</h2>
            <span>32 tickets</span>
          </div>
          <button className="icon-btn">
            <Icons.MoreHorizontal />
          </button>
        </div>
        <TicketTable rows={tickets.filter((t) => t.status === "Backlog")} />
      </section>
    </>
  );
}

function Sprints({ toast }: { toast: (s: string) => void }) {
  const nav = useNavigate();
  return (
    <>
      <PageHead
        title="Sprints"
        desc="Plan capacity, monitor delivery, and review outcomes."
      >
        <button className="btn primary" onClick={() => nav("/sprints/new")}>
          <Icons.Plus />
          New sprint
        </button>
      </PageHead>
      <div className="sprint-list">
        {[
          {
            name: "Sprint 24",
            status: "active",
            progress: 72,
            risk: 68,
            date: "01–14 Jul",
            points: "68 / 94",
          },
          {
            name: "Sprint 25",
            status: "planned",
            progress: 0,
            risk: 34,
            date: "15–28 Jul",
            points: "0 / 62",
          },
          {
            name: "Sprint 23",
            status: "completed",
            progress: 100,
            risk: 42,
            date: "17–30 Jun",
            points: "88 / 92",
          },
        ].map((s) => (
          <article
            className="card sprint-row"
            key={s.name}
            onClick={() => nav("/sprints/24")}
          >
            <div className={`sprint-status ${s.status}`}>
              <Icons.Timer />
            </div>
            <div>
              <span>
                <h2>{s.name}</h2>
                <Badge
                  tone={
                    s.status === "active"
                      ? "lime"
                      : s.status === "completed"
                        ? "green"
                        : "neutral"
                  }
                >
                  {s.status}
                </Badge>
              </span>
              <p>I-Track Platform · {s.date}</p>
            </div>
            <div>
              <small>Progress</small>
              <b>{s.progress}%</b>
              <Progress value={s.progress} />
            </div>
            <div>
              <small>Story points</small>
              <b>{s.points}</b>
            </div>
            <div>
              <small>Risk score</small>
              <b className="risk-value">{s.risk}</b>
            </div>
            <button
              className="icon-btn"
              onClick={(e) => {
                e.stopPropagation();
                toast("Sprint actions opened");
              }}
            >
              <Icons.MoreHorizontal />
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
function SprintDetail() {
  const nav = useNavigate();
  return (
    <>
      <PageHead
        eyebrow="ACTIVE SPRINT"
        title="Sprint 24"
        desc="I-Track Platform · 01–14 July"
      >
        <button className="btn" onClick={() => nav("/sprints/24/risk")}>
          <Icons.Activity />
          View risk
        </button>
        <button
          className="btn primary"
          onClick={() => nav("/sprints/24/complete")}
        >
          Complete sprint
        </button>
      </PageHead>
      <div className="metrics compact">
        <article className="metric">
          <div>
            <span>Progress</span>
            <strong>72%</strong>
            <small>68 of 94 points</small>
          </div>
        </article>
        <article className="metric">
          <div>
            <span>Time remaining</span>
            <strong>6 days</strong>
            <small>Ends 14 July</small>
          </div>
        </article>
        <article className="metric">
          <div>
            <span>Risk score</span>
            <strong>68</strong>
            <small>High · +7 this week</small>
          </div>
        </article>
        <article className="metric">
          <div>
            <span>Scope change</span>
            <strong>+12%</strong>
            <small>11 points added</small>
          </div>
        </article>
      </div>
      <div className="two-col">
        <section className="card">
          <CardTitle title="Sprint burndown" />
          <div className="chart">
            <ResponsiveContainer>
              <AreaChart data={risk}>
                <XAxis dataKey="n" />
                <YAxis />
                <Tooltip />
                <Area dataKey="v" stroke="#A47BEF" fill="#A47BEF33" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card">
          <CardTitle title="Status breakdown" />
          <div className="donut">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={[{ v: 18 }, { v: 12 }, { v: 8 }, { v: 6 }, { v: 24 }]}
                  dataKey="v"
                  innerRadius={55}
                  outerRadius={78}
                >
                  {["#EAEAEA", "#4F86F7", "#F4C430", "#A47BEF", "#4CC38A"].map(
                    (c) => (
                      <Cell key={c} fill={c} />
                    ),
                  )}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <strong>
              68<small>tickets</small>
            </strong>
          </div>
        </section>
      </div>
      <section className="card">
        <CardTitle title="Sprint work" />
        <TicketTable />
      </section>
    </>
  );
}
function CompleteSprint({ toast }: { toast: (s: string) => void }) {
  return (
    <CenteredForm
      title="Complete Sprint 24"
      desc="Review the outcome and decide where incomplete work should move."
    >
      <div className="completion-summary">
        <div>
          <strong>68</strong>
          <span>Completed points</span>
        </div>
        <div>
          <strong>26</strong>
          <span>Incomplete points</span>
        </div>
        <div>
          <strong>72%</strong>
          <span>Completion rate</span>
        </div>
      </div>
      <label className="field">
        <span>Move incomplete work to</span>
        <select>
          <option>Sprint 25</option>
          <option>Backlog</option>
        </select>
      </label>
      <div className="callout warning">
        <Icons.AlertTriangle />
        <span>
          <b>6 tickets will be moved.</b> This action updates their sprint
          assignment.
        </span>
      </div>
      <button
        className="btn primary wide"
        onClick={() => toast("Sprint completed successfully")}
      >
        Complete sprint
      </button>
    </CenteredForm>
  );
}
function RiskPage() {
  return (
    <>
      <PageHead
        eyebrow="SPRINT INTELLIGENCE"
        title="Delivery risk"
        desc="Explainable signals for Sprint 24."
      >
        <button className="btn">
          <Icons.RefreshCw />
          Recalculate
        </button>
      </PageHead>
      <div className="risk-hero">
        <div className="risk-score">
          <span>RISK SCORE</span>
          <strong>68</strong>
          <Badge tone="orange">HIGH RISK</Badge>
          <small>+7 since Monday</small>
        </div>
        <div>
          <h2>Delivery is at risk, but recoverable</h2>
          <p>
            Scope growth and three blocked critical-path tickets are putting the
            sprint goal under pressure.
          </p>
          <Progress value={68} tone="orange" />
          <div className="risk-scale">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
            <span>Critical</span>
          </div>
        </div>
      </div>
      <div className="two-col">
        <section className="card">
          <CardTitle title="Contributing factors" sub="Why the score changed" />
          <div className="factor-list">
            {[
              [
                "Scope increased by 12%",
                "11 points added after sprint start",
                "+18",
                "orange",
              ],
              [
                "Critical work is blocked",
                "3 tickets depend on SSO review",
                "+15",
                "red",
              ],
              [
                "Team capacity is constrained",
                "2 contributors are above 85%",
                "+9",
                "yellow",
              ],
              [
                "Velocity remains stable",
                "Within 4% of five-sprint average",
                "−8",
                "green",
              ],
            ].map(([a, b, c, d]) => (
              <div key={a}>
                <i className={d} />
                <span>
                  <b>{a}</b>
                  <small>{b}</small>
                </span>
                <strong>{c}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="card recommendation">
          <Badge tone="lime">
            <Icons.Sparkles />
            RECOMMENDED ACTION
          </Badge>
          <h2>Unblock authentication work today</h2>
          <p>
            Move one API reviewer from reporting work to the SSO dependency.
            This could reduce predicted risk by 14 points.
          </p>
          <div>
            <span>Expected impact</span>
            <strong>68 → 54</strong>
          </div>
          <button className="btn dark wide">Review affected tickets</button>
        </section>
      </div>
    </>
  );
}

function TicketDetail({ toast }: { toast: (s: string) => void }) {
  const { ticketId } = useParams();
  const t = tickets.find((x) => x.key === ticketId) || tickets[0];
  return (
    <>
      <div className="ticket-head">
        <div>
          <div className="ticket-key">
            <span>{t.key}</span>
            <button>
              <Icons.Copy />
            </button>
          </div>
          <h1>{t.title}</h1>
          <div className="labels">
            {t.labels.map((l) => (
              <Badge key={l}>{l}</Badge>
            ))}
          </div>
        </div>
        <div className="head-actions">
          <button
            className="btn"
            onClick={() => toast("You are watching this ticket")}
          >
            <Icons.Eye />
            Watch
          </button>
          <button className="btn">
            <Icons.Copy />
            Clone
          </button>
          <button className="icon-btn">
            <Icons.MoreHorizontal />
          </button>
        </div>
      </div>
      <div className="ticket-layout">
        <section className="ticket-main">
          <div className="card">
            <h3>Description</h3>
            <p>
              Enable secure single sign-on for enterprise workspaces, including
              validated callbacks, organization discovery, and clear failure
              recovery.
            </p>
            <h3>Acceptance criteria</h3>
            {[
              "Administrators can configure an identity provider",
              "Members can sign in through the configured provider",
              "Authentication failures are recorded in the audit log",
            ].map((x) => (
              <label className="check" key={x}>
                <input type="checkbox" />
                {x}
              </label>
            ))}
          </div>
          <div className="card">
            <div className="tabs">
              <button className="active">Comments 4</button>
              <button>Work logs 3</button>
              <button>Attachments 2</button>
              <button>History</button>
            </div>
            <textarea className="comment" placeholder="Add a comment…" />
            <div className="comment-actions">
              <span>Markdown supported</span>
              <button
                className="btn primary"
                onClick={() => toast("Comment added")}
              >
                Comment
              </button>
            </div>
            {people.slice(0, 2).map((p, i) => (
              <div className="comment-item" key={p.name}>
                <Avatar name={p.name} color={p.color} />
                <div>
                  <p>
                    <b>{p.name}</b>
                    <span>{i + 1}h ago</span>
                  </p>
                  <div>
                    {i
                      ? "Callback validation is ready for review."
                      : "I’ve added the organization discovery notes and edge cases."}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <aside className="ticket-aside card">
          <h3>Details</h3>
          {[
            ["Status", "In Progress"],
            ["Priority", "Critical"],
            ["Assignee", t.assignee],
            ["Reporter", "Maya Chen"],
            ["Sprint", "Sprint 24"],
            ["Story points", String(t.points)],
            ["Due date", "14 Jul 2026"],
          ].map(([a, b]) => (
            <div className="detail-row" key={a}>
              <span>{a}</span>
              <button>
                {b}
                <Icons.ChevronDown />
              </button>
            </div>
          ))}
          <hr />
          <h3>Dependencies</h3>
          <div className="dependency">
            <Icons.CircleSlash2 />
            <span>
              <b>Blocked by ITR-139</b>
              <small>Identity provider discovery</small>
            </span>
          </div>
          <hr />
          <button className="text-btn danger">
            <Icons.Trash2 />
            Delete ticket
          </button>
        </aside>
      </div>
    </>
  );
}

function MyWork() {
  const [view, setView] = useState("list");
  return (
    <>
      <PageHead
        title="My work"
        desc="Everything assigned to you, in one place."
      >
        <div className="segmented">
          <button
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
          >
            <Icons.List />
            List
          </button>
          <button
            className={view === "board" ? "active" : ""}
            onClick={() => setView("board")}
          >
            <Icons.Columns3 />
            Board
          </button>
        </div>
      </PageHead>
      <div className="metrics compact">
        <article className="metric">
          <div>
            <span>Assigned to me</span>
            <strong>12</strong>
            <small>Across 3 projects</small>
          </div>
        </article>
        <article className="metric">
          <div>
            <span>Due this week</span>
            <strong>5</strong>
            <small>2 high priority</small>
          </div>
        </article>
        <article className="metric">
          <div>
            <span>Logged this sprint</span>
            <strong>26h</strong>
            <small>Of 32h capacity</small>
          </div>
        </article>
        <article className="metric">
          <div>
            <span>Watched</span>
            <strong>8</strong>
            <small>3 updated today</small>
          </div>
        </article>
      </div>
      <FilterBar placeholder="Search my work…" />
      {view === "list" ? (
        <section className="card no-pad">
          <TicketTable
            rows={tickets.filter(
              (t) => t.assignee === "Maya Chen" || t.watched,
            )}
          />
        </section>
      ) : (
        <Board toast={() => {}} />
      )}
    </>
  );
}
function Notifications({ toast }: { toast: (s: string) => void }) {
  const items = serverData.notifications || [];
  const [unreadOnly,setUnreadOnly]=useState(false);
  const markAll = async () => {
    await api("/notifications/read-all", { method: "POST" });
    items.forEach((x: any) => (x.readAt = new Date().toISOString()));
    toast("All notifications marked as read");
  };
  return (
    <>
      <PageHead title="Notifications" desc="Updates that need your attention.">
        <button className="btn" onClick={markAll}>
          <Icons.CheckCheck />
          Mark all read
        </button>
      </PageHead>
      <div className="tabs">
        <button className={!unreadOnly?"active":""} onClick={()=>setUnreadOnly(false)}>
          All <Badge tone="purple">{items.length}</Badge>
        </button>
        <button className={unreadOnly?"active":""} onClick={()=>setUnreadOnly(true)}>Unread</button>
      </div>
      <section className="card notification-list">
        {items.length ? (
          items.filter((item:any)=>!unreadOnly||!item.readAt).map((item: any) => {
            const Icon =
              item.type === "risk"
                ? Icons.Activity
                : item.type === "mention"
                  ? Icons.AtSign
                  : item.type === "webhook"
                    ? Icons.Webhook
                    : Icons.Ticket;
            return (
              <div className={!item.readAt ? "unread" : ""} key={item._id}>
                <span className={`notif-icon ${item.type}`}>
                  <Icon />
                </span>
                <span>
                  <b>{item.title}</b>
                  <p>{item.body}</p>
                  <small>{new Date(item.createdAt).toLocaleString()}</small>
                </span>
                {!item.readAt&&<button className="icon-btn" aria-label={`Mark ${item.title} read`} onClick={async()=>{await api(`/notifications/${item._id}/read`,{method:"PATCH"});item.readAt=new Date().toISOString();toast("Notification marked read")}}><Icons.Check /></button>}
              </div>
            );
          })
        ) : (
          <Empty title="No notifications" body="You’re all caught up." />
        )}
      </section>
    </>
  );
}

function Team() {
  const nav = useNavigate();
  return (
    <>
      <PageHead
        title="Team"
        desc="Balance capacity and help everyone do their best work."
      >
        <button className="btn primary" onClick={() => nav("/team/invite")}>
          <Icons.UserPlus />
          Invite member
        </button>
      </PageHead>
      <FilterBar placeholder="Search people or skills…" />
      <div className="team-grid">
        {people.map((p) => (
          <article
            className="card person-card"
            key={p.name}
            onClick={() => nav(`/team/${p.email.split("@")[0]}`)}
          >
            <Avatar name={p.name} color={p.color} />
            <div>
              <h2>{p.name}</h2>
              <p>{p.email}</p>
              <Badge tone={p.role === "admin" ? "purple" : "neutral"}>
                {p.role}
              </Badge>
            </div>
            <div className="skills">
              {p.skills.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
            <div className="capacity">
              <span>
                <b>Workload</b>
                <strong>{p.load}%</strong>
              </span>
              <Progress
                value={p.load}
                tone={p.load > 80 ? "orange" : "purple"}
              />
              <small>{Math.round(p.load * 0.32)} of 32 hours allocated</small>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
function UserDetail() {
  const { userId } = useParams();
  const p = people.find((x) => x.email.startsWith(userId || "")) || people[0];
  const edit=async()=>{const user=(serverData.dashboard?.users||[]).find((item:any)=>item.email===p.email);const name=window.prompt("User name",p.name);if(!user||!name)return;await api(`/users/${user._id}`,{method:"PATCH",body:JSON.stringify({name})});window.location.reload()};
  return (
    <>
      <PageHead title={p.name} desc={`${fmt(p.role)} · ${p.email}`}>
        <button className="btn" onClick={edit}>
          <Icons.Pencil />
          Edit profile
        </button>
      </PageHead>
      <div className="profile-hero card">
        <Avatar name={p.name} color={p.color} />
        <div>
          <h2>{p.name}</h2>
          <p>Building thoughtful systems with the Northstar team.</p>
          <div className="skills">
            {p.skills.map((s) => (
              <Badge key={s}>{s}</Badge>
            ))}
          </div>
        </div>
        <div className="profile-stats">
          <span>
            <strong>8</strong>Open tickets
          </span>
          <span>
            <strong>26h</strong>Allocated
          </span>
          <span>
            <strong>92%</strong>On-time
          </span>
        </div>
      </div>
      <div className="two-col">
        <section className="card">
          <CardTitle title="Current workload" />
          <TicketTable rows={tickets.filter((t) => t.assignee === p.name)} />
        </section>
        <section className="card">
          <CardTitle title="Capacity" />
          <div className="big-progress">
            <strong>{p.load}%</strong>
            <Progress value={p.load} />
            <p>{Math.round(p.load * 0.32)} of 32 available hours allocated</p>
          </div>
        </section>
      </div>
    </>
  );
}

function Reports() {
  const [tab,setTab]=useState("Overview"); const report=serverData.reports||{};
  const download=()=>{const blob=new Blob([JSON.stringify(report,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="itrack-report.json";link.click();URL.revokeObjectURL(url)};
  return (
    <>
      <PageHead
        title="Reports"
        desc="Understand delivery trends and make better planning decisions."
      >
        <button className="btn" onClick={download}>
          <Icons.Download />
          Export
        </button>
      </PageHead>
      <div className="tabs">
        {["Overview", "Velocity", "Delivery", "Workload", "Risk"].map(
          (x, i) => (
            <button className={tab === x ? "active" : ""} key={x} onClick={()=>setTab(x)}>
              {x}
            </button>
          ),
        )}
      </div>
      <div className="report-filters">
        <select>
          <option>All projects</option>
        </select>
        <select>
          <option>Last 5 sprints</option>
        </select>
        <select>
          <option>All members</option>
        </select>
        <label className="btn"><Icons.CalendarDays /><input type="date" aria-label="Report start date"/></label>
      </div>
      <div className="metrics compact">
        <article className="metric">
          <div>
            <span>Avg. velocity</span>
            <strong>{velocity.length?Math.round(velocity.reduce((sum,item)=>sum+item.v,0)/velocity.length):0}</strong>
            <small className="positive">↑ 8.4%</small>
          </div>
        </article>
        <article className="metric">
          <div>
            <span>Completion rate</span>
            <strong>{report.completion??0}%</strong>
            <small className="positive">↑ 4.1%</small>
          </div>
        </article>
        <article className="metric">
          <div>
            <span>Cycle time</span>
            <strong>{report.cycleTime??0}d</strong>
            <small className="positive">↓ 0.7 days</small>
          </div>
        </article>
        <article className="metric">
          <div>
            <span>Blocked duration</span>
            <strong>{report.blockedDuration??0}d</strong>
            <small className="negative">↑ 3 days</small>
          </div>
        </article>
      </div>
      <div className="two-col">
        <section className="card">
          <CardTitle title="Sprint velocity" sub="Completed story points">
            <Badge tone="green">+8.4%</Badge>
          </CardTitle>
          <div className="chart">
            <ResponsiveContainer>
              <BarChart data={velocity}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="n" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="v" fill="#A47BEF" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card">
          <CardTitle title="Risk trend" sub="Average sprint risk score" />
          <div className="chart">
            <ResponsiveContainer>
              <AreaChart data={risk}>
                <XAxis dataKey="n" />
                <YAxis />
                <Tooltip />
                <Area
                  dataKey="v"
                  stroke="#F28C28"
                  fill="#F28C2833"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </>
  );
}

function AIPage({ toast }: { toast: (s: string) => void }) {
  const [generated, setGenerated] = useState(false),
    [prompt, setPrompt] = useState("");
  return (
    <>
      <PageHead
        eyebrow="AI WORKSPACE"
        title="Plan faster with I-Track AI"
        desc="Turn product requirements into structured, reviewable work."
      >
        <Badge tone="lime">
          <Icons.Sparkles />
          AI ENABLED
        </Badge>
      </PageHead>
      <div className="ai-layout">
        <section className="card ai-compose">
          <div className="model-select">
            <span className="insight-icon">
              <Icons.Bot />
            </span>
            <div>
              <small>MODEL</small>
              <b>Claude Sonnet 4</b>
            </div>
            <Icons.ChevronDown />
          </div>
          <h2>What are you planning?</h2>
          <p>
            Describe a feature, initiative, or outcome. Include constraints and
            acceptance criteria when useful.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: Add enterprise SSO with SAML, organization discovery, audit events, and a safe migration for existing users…"
          />
          <div className="prompt-actions">
            <span>{prompt.length} / 4,000</span>
            <button
              className="btn lime"
              onClick={() => {
                setGenerated(true);
                toast("Ticket plan generated");
              }}
              disabled={!prompt.trim()}
            >
              <Icons.Sparkles />
              Generate ticket plan
            </button>
          </div>
          <div className="prompt-chips">
            {[
              "Break down an epic",
              "Plan a migration",
              "Create test coverage",
            ].map((x) => (
              <button key={x} onClick={() => setPrompt(x)}>
                {x}
              </button>
            ))}
          </div>
        </section>
        <aside className="card ai-side">
          <CardTitle title="How it works" />
          <ol>
            <li>
              <span>1</span>
              <p>
                <b>Describe the outcome</b>Give AI enough context to plan well.
              </p>
            </li>
            <li>
              <span>2</span>
              <p>
                <b>Review every ticket</b>Edit priorities, points and
                dependencies.
              </p>
            </li>
            <li>
              <span>3</span>
              <p>
                <b>Confirm the plan</b>Nothing is created without approval.
              </p>
            </li>
          </ol>
          <div className="safe-note">
            <Icons.ShieldCheck />
            <p>
              <b>You stay in control</b>Destructive AI actions always require
              explicit confirmation.
            </p>
          </div>
        </aside>
      </div>
      {generated && (
        <section className="generated">
          <div className="generated-head">
            <div>
              <Badge tone="lime">4 TICKETS GENERATED</Badge>
              <h2>Review your ticket plan</h2>
            </div>
            <button
              className="btn primary"
              onClick={() => toast("4 tickets created")}
            >
              Confirm and create 4 tickets
            </button>
          </div>
          {tickets.slice(0, 4).map((t, i) => (
            <article className="generated-ticket" key={t.id}>
              <span>{i + 1}</span>
              <div>
                <input defaultValue={t.title} />
                <textarea defaultValue="Implementation details and acceptance criteria generated from your requirement." />
                <div>
                  <Badge tone={t.priority}>{t.priority}</Badge>
                  <Badge>{t.points} points</Badge>
                  <Badge>{t.labels[0]}</Badge>
                </div>
              </div>
              <button className="icon-btn">
                <Icons.Trash2 />
              </button>
            </article>
          ))}
        </section>
      )}
    </>
  );
}

const resourceKinds = [
  "epic",
  "label",
  "component",
  "release",
  "issue-type",
  "priority",
  "workflow",
  "custom-field",
  "template",
  "board",
  "milestone",
];
function Resources({ toast }: { toast: (s: string) => void }) {
  const loc = useLocation();
  const kind = loc.pathname.split("/")[2];
  const navg = useNavigate();
  if (kind)
    return (
      <>
        <PageHead
          title={fmt(kind)}
          desc={`Manage workspace ${fmt(kind).toLowerCase()} configuration.`}
        >
          <button
            className="btn primary"
            onClick={() => toast(`${fmt(kind)} created`)}
          >
            <Icons.Plus />
            New {fmt(kind)}
          </button>
        </PageHead>
        <FilterBar />
        <section className="card no-pad">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Project</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[
                "Platform",
                "Customer experience",
                "Security",
                "Infrastructure",
              ].map((x, i) => (
                <tr key={x}>
                  <td>
                    <b>
                      {kind === "label" ? (
                        <i className={`color-dot c${i}`} />
                      ) : null}
                      {x}
                    </b>
                  </td>
                  <td>
                    <Badge tone="green">Active</Badge>
                  </td>
                  <td>{i % 2 ? "All projects" : "I-Track Platform"}</td>
                  <td>{i + 1}d ago</td>
                  <td>
                    <Icons.MoreHorizontal />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </>
    );
  return (
    <>
      <PageHead
        title="Workspace resources"
        desc="Configure reusable structures across every project."
      />
      <div className="resource-grid">
        {resourceKinds.map((r, i) => {
          const Icon = [
            Icons.Layers3,
            Icons.Tags,
            Icons.Boxes,
            Icons.Rocket,
            Icons.TicketCheck,
            Icons.Signal,
            Icons.GitBranch,
            Icons.Braces,
            Icons.LayoutTemplate,
            Icons.Columns3,
            Icons.Flag,
          ][i];
          return (
            <article
              className="card resource-card"
              key={r}
              onClick={() => navg(`/resources/${r}`)}
            >
              <span>
                <Icon />
              </span>
              <div>
                <h2>{fmt(r)}</h2>
                <p>
                  Manage {fmt(r).toLowerCase()} definitions and workspace
                  defaults.
                </p>
              </div>
              <Badge>{4 + i}</Badge>
              <Icons.ChevronRight />
            </article>
          );
        })}
      </div>
    </>
  );
}

function Organization() {
  return (
    <>
      <PageHead
        title="Organization"
        desc="Manage Northstar Labs and monitor plan usage."
      >
        <Badge tone="purple">SCALE PLAN</Badge>
      </PageHead>
      <div className="settings-layout">
        <SettingsNav active="Organization" />
        <div>
          <section className="card form-card">
            <CardTitle
              title="Organization details"
              sub="Basic workspace information"
            />
            <div className="form-grid">
              <label className="field">
                <span>Organization name</span>
                <input defaultValue="Northstar Labs" />
              </label>
              <label className="field">
                <span>Workspace URL</span>
                <div className="input-prefix">
                  <span>itrack.app/</span>
                  <input defaultValue="northstar-labs" />
                </div>
              </label>
            </div>
            <button className="btn primary">Save changes</button>
          </section>
          <section className="card">
            <CardTitle
              title="Plan usage"
              sub="Current billing-period allowances"
            />
            <div className="usage-list">
              {[
                ["Team members", 18, 25],
                ["Projects", 12, 25],
                ["Tickets", 684, 2000],
                ["Workspace resources", 46, 250],
              ].map(([a, b, c]) => (
                <div key={a}>
                  <span>
                    <b>{a}</b>
                    <strong>
                      {b} of {c}
                    </strong>
                  </span>
                  <Progress value={(Number(b) / Number(c)) * 100} />
                </div>
              ))}
            </div>
          </section>
          <section className="card danger-zone">
            <CardTitle
              title="Danger zone"
              sub="Irreversible organization actions"
            />
            <button className="btn danger">Delete organization</button>
          </section>
        </div>
      </div>
    </>
  );
}
function SettingsNav({ active }: { active: string }) {
  const navigate=useNavigate(); const routes:Record<string,string>={Profile:"/settings/profile",Preferences:"/settings/preferences",Organization:"/organization","Workspace defaults":"/settings","Security":"/change-password",Sessions:"/sessions"};
  return (
    <aside className="settings-nav">
      {[
        "Profile",
        "Preferences",
        "Organization",
        "Workspace defaults",
        "Security",
        "Sessions",
      ].map((x) => (
        <button className={x === active ? "active" : ""} key={x} onClick={()=>navigate(routes[x])}>
          {x}
        </button>
      ))}
    </aside>
  );
}
function Settings({
  density,
  setDensity,
  toast,
}: {
  density: string;
  setDensity: (s: string) => void;
  toast: (s: string) => void;
}) {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  return (
    <>
      <PageHead
        title="Settings"
        desc="Manage your profile and workspace preferences."
      />
      <div className="settings-layout">
        <SettingsNav active="Preferences" />
        <div>
          <section className="card form-card">
            <CardTitle
              title="Appearance"
              sub="Choose how I-Track looks for you"
            />
            <div className="theme-options">
              {["light", "dark", "system"].map((x) => (
                <button
                  className={theme === x ? "active" : ""}
                  onClick={() => {
                    setTheme(x);
                    localStorage.setItem("theme", x);
                    document.documentElement.dataset.theme =
                      x === "system"
                        ? matchMedia("(prefers-color-scheme: dark)").matches
                          ? "dark"
                          : "light"
                        : x;
                  }}
                  key={x}
                >
                  <span className={`theme-preview ${x}`}>
                    <i />
                    <i />
                    <i />
                  </span>
                  <b>{fmt(x)}</b>
                  <small>
                    {x === "system"
                      ? "Match your device"
                      : `${fmt(x)} surfaces`}
                  </small>
                </button>
              ))}
            </div>
          </section>
          <section className="card form-card">
            <CardTitle title="Display density" />
            <div className="radio-list">
              {[
                ["comfortable", "Comfortable", "More space between content"],
                ["compact", "Compact", "Show more information at once"],
              ].map(([v, l, d]) => (
                <label key={v}>
                  <input
                    type="radio"
                    checked={density === v}
                    onChange={() => setDensity(v)}
                  />
                  <span>
                    <b>{l}</b>
                    <small>{d}</small>
                  </span>
                </label>
              ))}
            </div>
          </section>
          <section className="card form-card">
            <CardTitle title="Notifications" />
            <div className="toggle-list">
              {[
                "Ticket assignments",
                "Mentions and comments",
                "Sprint risk alerts",
                "Weekly summary",
              ].map((x, i) => (
                <label key={x}>
                  <span>
                    <b>{x}</b>
                    <small>Receive updates about {x.toLowerCase()}.</small>
                  </span>
                  <input type="checkbox" defaultChecked={i < 3} />
                </label>
              ))}
            </div>
            <button
              className="btn primary"
              onClick={() => toast("Preferences saved")}
            >
              Save preferences
            </button>
          </section>
        </div>
      </div>
    </>
  );
}

function Integrations({ toast }: { toast: (s: string) => void }) {
  return (
    <>
      <PageHead
        title="Integrations"
        desc="Connect I-Track to the tools your team relies on."
      >
        <button
          className="btn primary"
          onClick={() => toast("Integration setup opened")}
        >
          <Icons.Plus />
          New integration
        </button>
      </PageHead>
      <div className="tabs">
        <button className="active">All</button>
        <button>API tokens</button>
        <button>Webhooks</button>
      </div>
      <div className="integration-grid">
        {[
          [
            "Deployment events",
            "webhook",
            "https://api.northstar.dev/hooks/itrack",
            "Active",
            "2 min ago",
          ],
          [
            "Reporting service",
            "api-token",
            "Token ending in ••••7DF2",
            "Active",
            "3h ago",
          ],
          [
            "Slack delivery feed",
            "webhook",
            "https://hooks.slack.com/services/••••",
            "Paused",
            "4d ago",
          ],
        ].map(([a, b, c, d, e]) => (
          <article className="card integration" key={a}>
            <span className={`integration-icon ${b}`}>
              {b === "webhook" ? <Icons.Webhook /> : <Icons.KeyRound />}
            </span>
            <div>
              <h2>{a}</h2>
              <Badge>{b}</Badge>
            </div>
            <button className="icon-btn">
              <Icons.MoreHorizontal />
            </button>
            <p>{c}</p>
            <div>
              <Badge tone={d === "Active" ? "green" : "neutral"}>{d}</Badge>
              <span>Last used {e}</span>
            </div>
          </article>
        ))}
      </div>
      <section className="card api-callout">
        <Icons.KeyRound />
        <div>
          <h2>Need an API token?</h2>
          <p>
            Tokens are shown only once when created. Store them in a secure
            secret manager.
          </p>
        </div>
        <button
          className="btn dark"
          onClick={() => toast("Token created — copy it now")}
        >
          Create API token
        </button>
      </section>
    </>
  );
}
function AuditLogs() {
  return (
    <>
      <PageHead
        title="Audit logs"
        desc="An immutable record of important workspace activity."
      >
        <button className="btn">
          <Icons.Download />
          Export
        </button>
      </PageHead>
      <FilterBar placeholder="Search actions, people or entities…" />
      <section className="card no-pad">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Actor</th>
              <th>Entity</th>
              <th>IP address</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                "ticket.updated",
                "Maya Chen",
                "ITR-142",
                "103.21.44.18",
                "5 min ago",
              ],
              [
                "user.invited",
                "Maya Chen",
                "olivia@northstar.dev",
                "103.21.44.18",
                "1h ago",
              ],
              [
                "sprint.started",
                "Noah Williams",
                "Sprint 24",
                "10.0.0.42",
                "2d ago",
              ],
              [
                "integration.created",
                "Maya Chen",
                "Deployment events",
                "103.21.44.18",
                "4d ago",
              ],
            ].map((x) => (
              <tr key={x[0] + x[4]}>
                <td>
                  <Badge tone="purple">{x[0]}</Badge>
                </td>
                <td>
                  <b>{x[1]}</b>
                </td>
                <td>{x[2]}</td>
                <td>
                  <code>{x[3]}</code>
                </td>
                <td>{x[4]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
function ImportExport({ toast }: { toast: (s: string) => void }) {
  const [file, setFile] = useState(false);
  return (
    <>
      <PageHead
        title="Import & export"
        desc="Move workspace data safely and predictably."
      />
      <div className="two-col">
        <section className="card import-card">
          <span className="big-icon">
            <Icons.ArrowDownToLine />
          </span>
          <h2>Import resources</h2>
          <p>Upload a JSON file containing up to 1,000 workspace resources.</p>
          <div
            className={cx("dropzone", file && "ready")}
            onClick={() => setFile(true)}
          >
            {file ? (
              <>
                <Icons.FileCheck2 />
                <b>northstar-resources.json</b>
                <span>248 records · 84 KB</span>
              </>
            ) : (
              <>
                <Icons.UploadCloud />
                <b>Drop a JSON file here</b>
                <span>or click to browse</span>
              </>
            )}
          </div>
          {file && (
            <button
              className="btn primary wide"
              onClick={() => toast("248 resources imported")}
            >
              Review and import 248 records
            </button>
          )}
        </section>
        <section className="card export-card">
          <span className="big-icon purple">
            <Icons.ArrowUpFromLine />
          </span>
          <h2>Export organization</h2>
          <p>Create a portable JSON export of all supported workspace data.</p>
          {[
            "Organization settings",
            "18 users",
            "12 projects and 684 tickets",
            "46 workspace resources",
          ].map((x) => (
            <div className="export-row" key={x}>
              <Icons.CheckCircle2 />
              {x}
            </div>
          ))}
          <button
            className="btn dark wide"
            onClick={() => toast("Export prepared successfully")}
          >
            <Icons.Download />
            Prepare export
          </button>
        </section>
      </div>
    </>
  );
}
function Sessions({ toast }: { toast: (s: string) => void }) {
  const revoke = async (id: string) => {
    await api(`/auth/sessions/${id}`, { method: "DELETE" });
    serverData.sessions = serverData.sessions.filter((x: any) => x._id !== id);
    toast("Session revoked");
  };
  return (
    <>
      <PageHead
        title="Active sessions"
        desc="Review and revoke devices signed in to your account."
      />
      <section className="card session-list">
        {serverData.sessions.length ? (
          serverData.sessions.map((s: any, i: number) => (
            <div key={s._id}>
              <span>
                <Icons.Monitor />
              </span>
              <div>
                <b>{s.userAgent || "Unknown device"}</b>
                <small>Created {new Date(s.createdAt).toLocaleString()}</small>
              </div>
              {i === 0 ? (
                <Badge tone="green">Current</Badge>
              ) : (
                <button className="btn danger" onClick={() => revoke(s._id)}>
                  Revoke
                </button>
              )}
            </div>
          ))
        ) : (
          <Empty
            title="No active sessions"
            body="Sign in to create a new session."
          />
        )}
      </section>
    </>
  );
}

function FormPage({
  type,
  toast,
}: {
  type: "project" | "sprint" | "ticket" | "invite";
  toast: (s: string) => void;
}) {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const spec = {
    project: ["Create project", "Set up a new space for focused delivery."],
    sprint: [
      "Plan a sprint",
      "Define the goal, timeline, and available capacity.",
    ],
    ticket: ["Create ticket", "Capture clear, actionable work for your team."],
    invite: [
      "Invite team member",
      "Add someone to the Northstar Labs workspace.",
    ],
  }[type];
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    const values = new FormData(event.currentTarget);
    try {
      if (type === "project")
        await api("/projects", {
          method: "POST",
          body: JSON.stringify({
            name: values.get("name"),
            key: values.get("key"),
            status: values.get("status"),
            description: values.get("description"),
            progress: 0,
            riskLevel: "medium",
            activeSprint: "Planning",
            members: [],
          }),
        });
      if (type === "sprint")
        await api("/sprints", {
          method: "POST",
          body: JSON.stringify({
            name: values.get("name"),
            project: values.get("project"),
            status: "planned",
            capacity: Number(values.get("capacity")),
            plannedPoints: Number(values.get("capacity")),
            completedPoints: 0,
            startDate: values.get("startDate"),
            endDate: values.get("endDate"),
            velocityHistory: [],
            riskScore: 0,
          }),
        });
      if (type === "ticket")
        await api("/tickets", {
          method: "POST",
          body: JSON.stringify({
            title: values.get("title"),
            description: values.get("description"),
            project: values.get("project"),
            sprint: values.get("sprint"),
            assignee: values.get("assignee"),
            priority: values.get("priority"),
            storyPoints: Number(values.get("storyPoints")),
            dueDate: values.get("dueDate"),
            status: "Backlog",
            acceptanceCriteria: [],
            epic: "Product backlog",
            labels: [],
            blocked: false,
            dependencies: [],
          }),
        });
      if (type === "invite")
        await api("/invitations", {
          method: "POST",
          body: JSON.stringify({
            name: values.get("name"),
            email: values.get("email"),
            role: values.get("role"),
          }),
        });
      toast(`${fmt(type)} saved`);
      nav(
        type === "ticket"
          ? "/tickets"
          : type === "project"
            ? "/projects"
            : type === "sprint"
              ? "/sprints"
              : "/team",
      );
      window.location.reload();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <CenteredForm title={spec[0]} desc={spec[1]}>
      <form onSubmit={submit}>
        {type === "ticket" && (
          <div className="form-grid">
            <label className="field full">
              <span>Title</span>
              <input
                name="title"
                placeholder="What needs to be done?"
                autoFocus
                required
              />
            </label>
            <label className="field full">
              <span>Description</span>
              <textarea
                name="description"
                placeholder="Add context, constraints, and expected outcome…"
                required
              />
            </label>
            <label className="field">
              <span>Project</span>
              <select name="project" required>
                {(serverData.dashboard?.projects || []).map((project: any) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Sprint</span>
              <select name="sprint" required>
                {(serverData.dashboard?.sprints || []).map((sprint: any) => (
                  <option key={sprint._id} value={sprint._id}>
                    {sprint.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Assignee</span>
              <select name="assignee" required>
                {(serverData.dashboard?.users || []).map((user: any) => (
                  <option key={user._id} value={user._id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Priority</span>
              <select name="priority" defaultValue="medium">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="field">
              <span>Story points</span>
              <input
                name="storyPoints"
                type="number"
                defaultValue="3"
                min="1"
                max="21"
              />
            </label>
            <label className="field">
              <span>Due date</span>
              <input name="dueDate" type="date" required />
            </label>
          </div>
        )}
        {type === "project" && (
          <div className="form-grid">
            <label className="field full">
              <span>Project name</span>
              <input
                name="name"
                placeholder="e.g. Mobile application"
                autoFocus
                required
              />
            </label>
            <label className="field">
              <span>Project key</span>
              <input name="key" placeholder="MOB" maxLength={6} required />
            </label>
            <label className="field">
              <span>Status</span>
              <select name="status">
                <option value="planning">Planning</option>
                <option value="active">Active</option>
              </select>
            </label>
            <label className="field full">
              <span>Description</span>
              <textarea
                name="description"
                placeholder="What is this project responsible for?"
                required
              />
            </label>
          </div>
        )}
        {type === "sprint" && (
          <div className="form-grid">
            <label className="field full">
              <span>Sprint name</span>
              <input name="name" placeholder="Sprint name" autoFocus required />
            </label>
            <label className="field">
              <span>Project</span>
              <select name="project" required>
                {(serverData.dashboard?.projects || []).map((project: any) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Capacity</span>
              <input name="capacity" type="number" defaultValue="40" min="0" />
            </label>
            <label className="field">
              <span>Start date</span>
              <input name="startDate" type="date" required />
            </label>
            <label className="field">
              <span>End date</span>
              <input name="endDate" type="date" required />
            </label>
          </div>
        )}
        {type === "invite" && (
          <div className="form-grid">
            <label className="field full">
              <span>Full name</span>
              <input name="name" placeholder="Full name" autoFocus required />
            </label>
            <label className="field full">
              <span>Email address</span>
              <input
                name="email"
                type="email"
                placeholder="name@company.com"
                required
              />
            </label>
            <label className="field">
              <span>Role</span>
              <select name="role" defaultValue="engineer">
                <option value="engineer">Engineer</option>
                <option value="designer">Designer</option>
                <option value="manager">Manager</option>
              </select>
            </label>
            <label className="field">
              <span>Capacity</span>
              <input name="capacity" type="number" defaultValue="32" />
            </label>
          </div>
        )}
        {formError && <div className="auth-message">{formError}</div>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={() => nav(-1)}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {type === "invite" ? "Send invitation" : `Create ${type}`}
          </button>
        </div>
      </form>
    </CenteredForm>
  );
}
function CenteredForm({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="center-form">
      <button className="back-btn" onClick={() => history.back()}>
        <Icons.ArrowLeft />
        Back
      </button>
      <section className="card">
        <PageHead title={title} desc={desc} />
        {children}
      </section>
    </div>
  );
}
function AuthPage({ type }: { type: string }) {
  const nav = useNavigate();
  const title =
    {
      login: "Welcome back",
      register: "Create your workspace",
      "forgot-password": "Reset your password",
      "reset-password": "Choose a new password",
      "accept-invite": "Join Northstar Labs",
    }[type] || "Welcome";
  return (
    <div className="auth">
      <section className="auth-brand">
        <div className="brand big">
          <div className="brand-mark">I</div>
          <span>I-TRACK</span>
        </div>
        <div>
          <Badge tone="lime">
            <Icons.Sparkles />
            EXPLAINABLE DELIVERY INTELLIGENCE
          </Badge>
          <h1>
            Build momentum.
            <br />
            See risk sooner.
          </h1>
          <p>
            Plan focused work, protect your team’s capacity, and turn delivery
            signals into confident decisions.
          </p>
        </div>
        <div className="auth-quote">
          <p>
            “I-Track helps us spot delivery pressure before it turns into missed
            commitments.”
          </p>
          <span>
            <Avatar name="Noah Williams" />
            <b>
              Noah Williams<small>VP Engineering, Northstar Labs</small>
            </b>
          </span>
        </div>
      </section>
      <section className="auth-form">
        <div className="mobile-auth-logo">
          <div className="brand-mark">I</div>I-TRACK
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            nav("/dashboard");
          }}
        >
          <span className="eyebrow">
            {type === "accept-invite" ? "YOU'RE INVITED" : "NORTHSTAR LABS"}
          </span>
          <h1>{title}</h1>
          <p>
            {type === "login"
              ? "Sign in to continue to your workspace."
              : type === "forgot-password"
                ? "Enter your email and we’ll send reset instructions."
                : "Complete the details below to continue."}
          </p>
          {type === "register" && (
            <label className="field">
              <span>Full name</span>
              <input placeholder="Maya Chen" required />
            </label>
          )}
          <label className="field">
            <span>Email address</span>
            <input
              type="email"
              defaultValue={type === "login" ? "maya@itrack.dev" : ""}
              placeholder="you@company.com"
              required
            />
          </label>
          {type !== "forgot-password" && (
            <label className="field">
              <span>Password</span>
              <div className="password">
                <input
                  type="password"
                  defaultValue={type === "login" ? "Password123!" : ""}
                  placeholder="At least 8 characters"
                  required
                />
                <Icons.Eye />
              </div>
            </label>
          )}
          {type === "login" && (
            <div className="auth-row">
              <label>
                <input type="checkbox" />
                Remember me
              </label>
              <NavLink to="/forgot-password">Forgot password?</NavLink>
            </div>
          )}
          <button className="btn primary wide" type="submit">
            {type === "login"
              ? "Sign in"
              : type === "forgot-password"
                ? "Send reset link"
                : type === "accept-invite"
                  ? "Accept invitation"
                  : "Continue"}
            <Icons.ArrowRight />
          </button>
          {type === "login" && (
            <p className="auth-switch">
              New to I-Track?{" "}
              <NavLink to="/register">Create an account</NavLink>
            </p>
          )}
        </form>
        <small className="auth-legal">
          By continuing, you agree to the Terms of Service and Privacy Policy.
        </small>
      </section>
    </div>
  );
}
function ErrorPage({ code }: { code: string }) {
  return (
    <div className="error-page">
      <span>{code}</span>
      <h1>
        {code === "404"
          ? "This page wandered off"
          : code === "403"
            ? "You don’t have access"
            : code === "Offline"
              ? "You’re offline"
              : "Something went wrong"}
      </h1>
      <p>
        We couldn’t complete this request. Return to a familiar place and try
        again.
      </p>
      <NavLink className="btn primary" to="/dashboard">
        <Icons.ArrowLeft />
        Back to dashboard
      </NavLink>
    </div>
  );
}

function OrganizationLive({ toast }: { toast: (s: string) => void }) {
  const org = serverData.organization || {};
  const dashboard = serverData.dashboard || {};
  const resourceCount = Object.values(serverData.resources || {}).reduce(
    (sum: number, items: any) => sum + (items?.length || 0),
    0,
  );
  const [name, setName] = useState(org.name || "");
  const save = async () => {
    const response = await api<any>("/organization", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    serverData.organization = response.organization;
    toast("Organization updated");
  };
  const remove = async () => {
    const confirmation=window.prompt(`Type ${org.name} to permanently delete this organization.`);
    if(confirmation!==org.name) return;
    await api("/organization",{method:"DELETE",body:JSON.stringify({confirmationName:confirmation})});
    clearSession(); window.location.href="/login";
  };
  const usage = [
    ["Team members", dashboard.users?.length || 0],
    ["Projects", dashboard.projects?.length || 0],
    ["Tickets", dashboard.tickets?.length || 0],
    ["Workspace resources", resourceCount],
  ];
  return (
    <>
      <PageHead
        title="Organization"
        desc={`Manage ${org.name} and monitor live usage.`}
      >
        <Badge tone="purple">{fmt(org.plan || "starter")} plan</Badge>
      </PageHead>
      <div className="settings-layout">
        <SettingsNav active="Organization" />
        <div>
          <section className="card form-card">
            <CardTitle
              title="Organization details"
              sub="Loaded from the organization API"
            />
            <div className="form-grid">
              <label className="field">
                <span>Organization name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="field">
                <span>Workspace slug</span>
                <div className="input-prefix">
                  <span>itrack.app/</span>
                  <input value={org.slug || ""} readOnly />
                </div>
              </label>
            </div>
            <button className="btn primary" onClick={save}>
              Save changes
            </button>
          </section>
          <section className="card">
            <CardTitle
              title="Current usage"
              sub="Live organization record counts"
            />
            <div className="usage-list">
              {usage.map(([label, value]) => (
                <div key={String(label)}>
                  <span>
                    <b>{label}</b>
                    <strong>{value}</strong>
                  </span>
                  <Progress value={Math.min(100, Number(value) * 5)} />
                </div>
              ))}
            </div>
          </section>
          <section className="card danger-zone"><CardTitle title="Danger zone" sub="Permanently delete this organization and all workspace data."/><button className="btn danger" onClick={remove}>Delete organization</button></section>
        </div>
      </div>
    </>
  );
}

function BacklogLive({ toast }: { toast: (s: string) => void }) {
  const navigate=useNavigate();
  const backlog = tickets.filter((ticket) => ticket.status === "Backlog");
  return (
    <>
      <PageHead
        title="Backlog"
        desc="Live unplanned work from the workspace API."
      >
        <button
          className="btn primary"
          onClick={() => navigate("/tickets/new")}
        >
          <Icons.Plus />
          Create ticket
        </button>
      </PageHead>
      <FilterBar placeholder="Search backlog…" />
      <section className="sprint-group">
        <div className="sprint-group-head">
          <div>
            <Icons.ChevronDown />
            <h2>Backlog</h2>
            <span>{backlog.length} tickets</span>
          </div>
        </div>
        {backlog.length ? (
          <TicketTable rows={backlog} />
        ) : (
          <Empty
            title="Backlog is empty"
            body="There is no unplanned work in this workspace."
          />
        )}
      </section>
    </>
  );
}

function SprintsLive({ toast }: { toast: (s: string) => void }) {
  const navigate = useNavigate();
  const items = serverData.dashboard?.sprints || [];
  return (
    <>
      <PageHead title="Sprints" desc="Live sprint plans and delivery status.">
        <button
          className="btn primary"
          onClick={() => navigate("/sprints/new")}
        >
          <Icons.Plus />
          New sprint
        </button>
      </PageHead>
      <div className="sprint-list">
        {items.length ? (
          items.map((s: any) => {
            const progress = s.plannedPoints
              ? Math.round((s.completedPoints / s.plannedPoints) * 100)
              : 0;
            return (
              <article
                className="card sprint-row"
                key={s._id}
                onClick={() => navigate(`/sprints/${s._id}`)}
              >
                <div className={`sprint-status ${s.status}`}>
                  <Icons.Timer />
                </div>
                <div>
                  <span>
                    <h2>{s.name}</h2>
                    <Badge
                      tone={
                        s.status === "active"
                          ? "lime"
                          : s.status === "completed"
                            ? "green"
                            : "neutral"
                      }
                    >
                      {s.status}
                    </Badge>
                  </span>
                  <p>
                    {s.project?.name || "Project"} ·{" "}
                    {new Date(s.startDate).toLocaleDateString()}–
                    {new Date(s.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <small>Progress</small>
                  <b>{progress}%</b>
                  <Progress value={progress} />
                </div>
                <div>
                  <small>Story points</small>
                  <b>
                    {s.completedPoints} / {s.plannedPoints}
                  </b>
                </div>
                <div>
                  <small>Risk score</small>
                  <b className="risk-value">{s.riskScore}</b>
                </div>
                <button
                  className="icon-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    toast("Sprint actions opened");
                  }}
                >
                  <Icons.MoreHorizontal />
                </button>
              </article>
            );
          })
        ) : (
          <Empty
            title="No sprints"
            body="Create the first sprint for this workspace."
          />
        )}
      </div>
    </>
  );
}

function ResourcesLive({ toast }: { toast: (s: string) => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const kind = location.pathname.split("/")[2];
  if (kind) {
    const rows = serverData.resources[kind] || [];
    const create = async()=>{const name=window.prompt(`Name for the new ${fmt(kind)}`);if(!name)return;await api(`/resources/${kind}`,{method:"POST",body:JSON.stringify({name,description:"",status:"active",order:rows.length,config:{}})});toast(`${fmt(kind)} created`);window.location.reload()};
    return (
      <>
        <PageHead
          title={fmt(kind)}
          desc={`Live ${fmt(kind).toLowerCase()} resources from the API.`}
        >
          <button
            className="btn primary"
            onClick={create}
          >
            <Icons.Plus />
            New {fmt(kind)}
          </button>
        </PageHead>
        <FilterBar />
        <section className="card no-pad">
          {rows.length ? (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Key</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item: any) => (
                  <tr key={item._id}>
                    <td>
                      <b>{item.name}</b>
                    </td>
                    <td>
                      <Badge tone="green">{item.status}</Badge>
                    </td>
                    <td>{item.key || "—"}</td>
                    <td>{new Date(item.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty
              title={`No ${fmt(kind).toLowerCase()}`}
              body="No resources of this type exist yet."
            />
          )}
        </section>
      </>
    );
  }
  return (
    <>
      <PageHead
        title="Workspace resources"
        desc="Live reusable workspace configuration."
      />
      <div className="resource-grid">
        {resourceKinds.map((resourceKind, index) => {
          const Icon = [
            Icons.Layers3,
            Icons.Tags,
            Icons.Boxes,
            Icons.Rocket,
            Icons.TicketCheck,
            Icons.Signal,
            Icons.GitBranch,
            Icons.Braces,
            Icons.LayoutTemplate,
            Icons.Columns3,
            Icons.Flag,
          ][index];
          return (
            <article
              className="card resource-card"
              key={resourceKind}
              onClick={() => navigate(`/resources/${resourceKind}`)}
            >
              <span>
                <Icon />
              </span>
              <div>
                <h2>{fmt(resourceKind)}</h2>
                <p>Manage {fmt(resourceKind).toLowerCase()} definitions.</p>
              </div>
              <Badge>{(serverData.resources[resourceKind] || []).length}</Badge>
              <Icons.ChevronRight />
            </article>
          );
        })}
      </div>
    </>
  );
}

function IntegrationsLive({ toast }: { toast: (s: string) => void }) {
  const rows = serverData.integrations || [];
  const create=async()=>{const kind=window.prompt("Integration type: webhook or api-token","webhook");if(!kind||!["webhook","api-token"].includes(kind))return;const name=window.prompt("Integration name");if(!name)return;const url=kind==="webhook"?window.prompt("Webhook URL")||undefined:undefined;const result=await api<any>(`/integrations/${kind}`,{method:"POST",body:JSON.stringify({name,url,events:[]})});if(result.token)window.prompt("Copy this token now. It will not be shown again.",result.token);toast("Integration created");window.location.reload()};
  const remove=async(item:any)=>{if(!window.confirm(`Delete ${item.name}?`))return;await api(`/integrations/${item.kind}/${item._id}`,{method:"DELETE"});toast("Integration deleted");window.location.reload()};
  return (
    <>
      <PageHead
        title="Integrations"
        desc="Live API tokens and webhooks for this organization."
      >
        <button
          className="btn primary"
          onClick={create}
        >
          <Icons.Plus />
          New integration
        </button>
      </PageHead>
      <div className="integration-grid">
        {rows.length ? (
          rows.map((item: any) => (
            <article className="card integration" key={item._id}>
              <span className={`integration-icon ${item.kind}`}>
                {item.kind === "webhook" ? (
                  <Icons.Webhook />
                ) : (
                  <Icons.KeyRound />
                )}
              </span>
              <div>
                <h2>{item.name}</h2>
                <Badge>{item.kind}</Badge>
              </div>
              <button className="icon-btn" aria-label={`Delete ${item.name}`} onClick={()=>remove(item)}><Icons.Trash2 /></button>
              <p>{item.url || "Secure token"}</p>
              <div>
                <Badge tone={item.active ? "green" : "neutral"}>
                  {item.active ? "Active" : "Inactive"}
                </Badge>
                <span>
                  {item.lastUsedAt
                    ? `Last used ${new Date(item.lastUsedAt).toLocaleString()}`
                    : "Never used"}
                </span>
              </div>
            </article>
          ))
        ) : (
          <Empty
            title="No integrations"
            body="Connect a webhook or create an API token."
          />
        )}
      </div>
    </>
  );
}

function AuditLogsLive() {
  const rows = serverData.auditLogs || [];
  return (
    <>
      <PageHead
        title="Audit logs"
        desc="Live organization activity from the audit API."
      />
      <FilterBar placeholder="Search actions or entities…" />
      <section className="card no-pad">
        {rows.length ? (
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Actor</th>
                <th>Entity</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item: any) => (
                <tr key={item._id}>
                  <td>
                    <Badge tone="purple">{item.action}</Badge>
                  </td>
                  <td>
                    <b>{item.actor?.name || "System"}</b>
                  </td>
                  <td>
                    {item.entityType || "—"} {item.entityId || ""}
                  </td>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty
            title="No audit events"
            body="Workspace activity will appear here."
          />
        )}
      </section>
    </>
  );
}

function DashboardLive() {
  const d = serverData.dashboard || {};
  const summary = d.summary || {};
  const active =
    (d.sprints || []).find((s: any) => s.status === "active") || d.sprints?.[0];
  const planned = active?.plannedPoints || 0;
  const completed = active?.completedPoints || 0;
  const progress = planned ? Math.round((completed / planned) * 100) : 0;
  const recommendation = d.recommendation || {};
  const metrics = [
    [
      "Active projects",
      summary.activeProjects ?? 0,
      `${projects.length} total`,
      "FolderKanban",
      "blue",
    ],
    [
      "Sprints in progress",
      summary.sprintsInProgress ?? 0,
      `${planned} points planned`,
      "Timer",
      "purple",
    ],
    [
      "At-risk sprints",
      summary.atRiskSprints ?? 0,
      "Risk threshold exceeded",
      "Activity",
      "orange",
    ],
    [
      "Blocked tasks",
      summary.blockedTasks ?? 0,
      `${tickets.filter((t) => t.blocked && t.priority === "critical").length} critical`,
      "CircleSlash2",
      "red",
    ],
    [
      "Sprint health",
      `${summary.sprintHealth ?? 0}%`,
      active?.name || "No active sprint",
      "HeartPulse",
      "green",
    ],
  ];
  return (
    <>
      <PageHead
        eyebrow={new Date()
          .toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })
          .toUpperCase()}
        title={`Good morning, ${serverData.user?.name?.split(" ")[0] || "there"}`}
        desc={`Live delivery data from ${serverData.organization?.name}.`}
      />
      <div className="metrics">
        {metrics.map(([label, value, sub, icon, tone]) => {
          const Icon = (Icons as any)[String(icon)];
          return (
            <article className="metric" key={String(label)}>
              <div>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{sub}</small>
              </div>
              <b className={String(tone)}>
                <Icon />
              </b>
            </article>
          );
        })}
      </div>
      <div className="dashboard-grid">
        <section className="card span-2">
          <CardTitle title="Sprint risk" sub="Risk score by sprint" />
          <div className="chart">
            <ResponsiveContainer>
              <AreaChart data={risk}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="n" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#A47BEF"
                  strokeWidth={3}
                  fill="#A47BEF33"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card">
          <CardTitle
            title="Active sprint"
            sub={
              active
                ? `${active.name} · ends ${new Date(active.endDate).toLocaleDateString()}`
                : "No active sprint"
            }
          />
          <div className="ring-wrap">
            <div
              className="score-ring"
              style={{
                background: `conic-gradient(var(--lime) 0 ${progress}%,var(--border) ${progress}%)`,
              }}
            >
              <strong>{progress}%</strong>
              <span>complete</span>
            </div>
          </div>
          <Progress value={progress} />
          <div className="split">
            <span>
              <b>{completed}</b> completed
            </span>
            <span>
              <b>{Math.max(0, planned - completed)}</b> remaining
            </span>
          </div>
        </section>
        <section className="card span-2">
          <CardTitle
            title="Team workload"
            sub="Capacity from workspace users"
          />
          <div className="workloads">
            {people.map((p) => (
              <div key={p.email}>
                <Avatar name={p.name} color={p.color} />
                <span>
                  <b>{p.name}</b>
                  <small>{p.role}</small>
                </span>
                <Progress
                  value={p.load}
                  tone={p.load > 80 ? "orange" : "purple"}
                />
                <strong>{p.load}%</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="card insight">
          <div className="insight-icon">
            <Icons.Sparkles />
          </div>
          <Badge tone="lime">LIVE RECOMMENDATION</Badge>
          <h2>{recommendation.title || "No recommendation available"}</h2>
          <p>
            {recommendation.body ||
              "Delivery signals will appear when workspace activity is available."}
          </p>
          <div className="confidence">
            <span>Confidence</span>
            <b>{recommendation.confidence ?? 0}%</b>
          </div>
        </section>
      </div>
    </>
  );
}

function AuthPageLive({ type }: { type: string }) {
  const nav = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const titles: Record<string, string> = {
    login: "Welcome back",
    register: "Create your workspace",
    "forgot-password": "Reset your password",
    "reset-password": "Choose a new password",
    "accept-invite": "Join your workspace",
  };
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      if (type === "login") {
        await login(String(data.get("email")), String(data.get("password")));
        nav("/dashboard");
        location.reload();
        return;
      }
      if (type === "register") {
        const session = await api<any>("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            name: data.get("name"),
            organizationName: data.get("organizationName"),
            email: data.get("email"),
            password: data.get("password"),
          }),
        });
        localStorage.setItem("itrack_token", session.token);
        localStorage.setItem("itrack_refresh_token", session.refreshToken);
        nav("/dashboard");
        location.reload();
        return;
      }
      if (type === "forgot-password") {
        await api("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email: data.get("email") }),
        });
        setError("If the account exists, reset instructions were created.");
        return;
      }
      setError(
        "Open this page using the token from your invitation or password-reset link.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth">
      <section className="auth-brand">
        <div className="brand big">
          <div className="brand-mark">I</div>
          <span>I-TRACK</span>
        </div>
        <div>
          <Badge tone="lime">
            <Icons.Sparkles />
            EXPLAINABLE DELIVERY INTELLIGENCE
          </Badge>
          <h1>
            Build momentum.
            <br />
            See risk sooner.
          </h1>
          <p>
            Plan focused work, protect capacity, and turn delivery signals into
            confident decisions.
          </p>
        </div>
        <div className="auth-quote">
          <p>Live workspace data, secured by your organization account.</p>
        </div>
      </section>
      <section className="auth-form">
        <form onSubmit={submit}>
          <span className="eyebrow">I-TRACK WORKSPACE</span>
          <h1>{titles[type]}</h1>
          <p>
            {type === "login"
              ? "Sign in to load your workspace data."
              : "Complete the details below to continue."}
          </p>
          {type === "register" && (
            <>
              <label className="field">
                <span>Full name</span>
                <input name="name" required />
              </label>
              <label className="field">
                <span>Organization</span>
                <input name="organizationName" required />
              </label>
            </>
          )}
          <label className="field">
            <span>Email address</span>
            <input
              name="email"
              type="email"
              defaultValue={type === "login" ? "maya@itrack.dev" : ""}
              required
            />
          </label>
          {type !== "forgot-password" && (
            <label className="field">
              <span>Password</span>
              <input
                name="password"
                type="password"
                defaultValue={type === "login" ? "Password123!" : ""}
                minLength={8}
                required
              />
            </label>
          )}
          {error && (
            <div
              className={cx(
                "auth-message",
                error.startsWith("If") && "success",
              )}
            >
              {error}
            </div>
          )}
          <button className="btn primary wide" disabled={busy}>
            {busy
              ? "Please wait…"
              : type === "login"
                ? "Sign in"
                : type === "forgot-password"
                  ? "Send reset instructions"
                  : "Continue"}
          </button>
          {type === "login" && (
            <p className="auth-switch">
              <NavLink to="/forgot-password">Forgot password?</NavLink> ·{" "}
              <NavLink to="/register">Create account</NavLink>
            </p>
          )}
        </form>
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
