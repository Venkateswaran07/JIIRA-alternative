import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useParams, useLocation } from "react-router-dom";
import * as Icons from "lucide-react";
import { useWorkspace } from "../workspace";
import { api } from "../../api";
import { appPrompt } from "../components/AppDialog";
import { Avatar, Badge, Button, CardTitle, PageHead, Progress, Empty, ErrorState, FilterBar, LoadingState, Tabs } from "../components/ui";
import { fmt } from "../../utils/ui";

// Circular/shared page components import dynamically or statically:
import { Board, SprintsLive } from "./SprintPages";
import { BacklogLive } from "./OperationalPages";
import { TicketTable } from "./TicketPages";

export function Projects() {
  const { projects, people, role } = useWorkspace();
  const nav = useNavigate();
  const [params] = useSearchParams();

  const q = params.get("q") || "";
  const filter = params.get("filter") || "";
  const sort = params.get("sort") || "";
  const view = params.get("view") || "grid";

  // Filter
  const filtered = projects.filter((p) => {
    const matchesQuery =
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.key.toLowerCase().includes(q.toLowerCase()) ||
      p.description.toLowerCase().includes(q.toLowerCase());
    const matchesFilter = filter === "open" ? p.status === "active" : true;
    return matchesQuery && matchesFilter;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const valA = a.name.toLowerCase();
    const valB = b.name.toLowerCase();
    if (sort === "desc") {
      return valA > valB ? -1 : valA < valB ? 1 : 0;
    } else {
      return valA < valB ? -1 : valA > valB ? 1 : 0;
    }
  });

  const isLeader = ["admin", "manager"].includes(role);

  return (
    <>
      <PageHead
        title="Projects"
        desc="Plan, track, and deliver work across every initiative."
      >
        {isLeader && (
          <>
            <button className="btn" onClick={() => nav("/import")}>
              <Icons.Upload />
              Import
            </button>
            <button
              className="btn primary"
              onClick={() => nav("/projects/new")}
            >
              <Icons.Plus />
              New project
            </button>
          </>
        )}
      </PageHead>
      <FilterBar placeholder="Search projects…" />
      {view === "list" ? (
        <div className="card no-pad">
          {sorted.length ? <table className="table">
            <caption className="sr-only">Workspace projects</caption>
            <thead>
              <tr>
                <th scope="col">Project</th>
                <th scope="col">Key</th>
                <th scope="col">Status</th>
                <th scope="col">Progress</th>
                <th scope="col">Members</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr
                  key={p.key}
                  onClick={() => nav(`/projects/${p.key}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      nav(`/projects/${p.key}`);
                    }
                  }}
                  tabIndex={0}
                  role="link"
                  aria-label={`Open project ${p.name}`}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <b>{p.name}</b>
                  </td>
                  <td>
                    <code>{p.key}</code>
                  </td>
                  <td>
                    <Badge tone={p.risk === "high" ? "orange" : "green"}>
                      {p.risk} risk
                    </Badge>
                  </td>
                  <td>{p.progress}%</td>
                  <td>{p.members} members</td>
                </tr>
              ))}
            </tbody>
          </table> : <Empty title="No projects found" body="Create a project or clear the filters to see your workspace initiatives." action={isLeader ? { label: "New project", to: "/projects/new" } : undefined} />}
        </div>
      ) : (
        <div className="project-grid">
          {sorted.map((p, i) => (
            <article
              className="project-card"
              key={p.key}
              onClick={() => nav(`/projects/${p.key}`)}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && event.target === event.currentTarget) {
                  event.preventDefault();
                  nav(`/projects/${p.key}`);
                }
              }}
              tabIndex={0}
              role="link"
              aria-label={`Open project ${p.name}`}
            >
              <div className="project-top">
                <span className={`project-icon p${i % 4}`}>
                  {p.key.slice(0, 2)}
                </span>
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
                {people.slice(0, 3).map((x: any) => (
                  <Avatar key={x.name} name={x.name} color={x.color} />
                ))}
                <span>+{Math.max(0, p.members - 3)}</span>
              </div>
            </article>
          ))}
          {!sorted.length && <Empty title="No projects found" body="Create a project or clear the filters to see your workspace initiatives." action={isLeader ? { label: "New project", to: "/projects/new" } : undefined} />}
        </div>
      )}
    </>
  );
}

export function ProjectSettings({
  project,
  refetch,
  toast,
}: {
  project: any;
  refetch: () => Promise<void>;
  toast: (s: string) => void;
}) {
  const { dashboard } = useWorkspace();
  const nav = useNavigate();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [status, setStatus] = useState(project.status || "active");
  const [riskLevel, setRiskLevel] = useState(project.risk || "medium");
  const [busy, setBusy] = useState(false);

  // Members selection
  const allUsers = dashboard?.users || [];
  const dashboardProj = (dashboard?.projects || []).find(
    (x: any) => x.key === project.key,
  );
  const currentMemberIds = (dashboardProj?.members || []).map(
    (m: any) => m._id || m,
  );
  const [selectedMembers, setSelectedMembers] =
    useState<string[]>(currentMemberIds);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/projects/${dashboardProj._id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, description, status, riskLevel }),
      });
      toast("Project updated successfully");
      await refetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const updateMembers = async () => {
    try {
      await api(`/projects/${dashboardProj._id}/members`, {
        method: "PUT",
        body: JSON.stringify({ userIds: selectedMembers }),
      });
      toast("Project members updated");
      await refetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Update failed");
    }
  };

  const archive = async () => {
    try {
      await api(`/projects/${dashboardProj._id}/archive`, { method: "POST" });
      toast("Project archived");
      await refetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Archive failed");
    }
  };

  const restore = async () => {
    try {
      await api(`/projects/${dashboardProj._id}/restore`, { method: "POST" });
      toast("Project restored");
      await refetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Restore failed");
    }
  };

  const remove = async () => {
    const confirmation = await appPrompt(
      `Type ${project.key} to permanently delete this project.`,
    );
    if (confirmation !== project.key) return;
    try {
      await api(`/projects/${dashboardProj._id}`, { method: "DELETE" });
      toast("Project deleted");
      nav("/projects");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleMemberToggle = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  return (
    <div className="project-settings">
      <div className="two-col">
        <section className="card">
          <CardTitle title="Project details" />
          <form onSubmit={save} className="form-grid">
            <label className="field full">
              <span>Project name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="done">Done</option>
              </select>
            </label>
            <label className="field">
              <span>Risk level</span>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="field full">
              <span>Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </label>
            <button className="btn primary" type="submit" disabled={busy}>
              Save details
            </button>
          </form>
        </section>

        <section className="card">
          <CardTitle title="Manage members" />
          <div
            className="member-list"
            style={{
              maxHeight: "250px",
              overflowY: "auto",
              marginBottom: "1rem",
            }}
          >
            {allUsers.map((u: any) => (
              <label
                key={u._id}
                className="check"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  margin: "8px 0",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(u._id)}
                  onChange={() => handleMemberToggle(u._id)}
                />
                <span>
                  <b>{u.name}</b> ({u.role})
                </span>
              </label>
            ))}
          </div>
          <button className="btn" onClick={updateMembers}>
            Update members
          </button>
        </section>
      </div>

      <section className="card danger-zone" style={{ marginTop: "2rem" }}>
        <CardTitle
          title="Danger zone"
          sub="Archive or permanently delete this project."
        />
        <div style={{ display: "flex", gap: "12px", marginTop: "1rem" }}>
          {status === "done" ? (
            <button className="btn" onClick={restore}>
              Restore project
            </button>
          ) : (
            <button className="btn warning" onClick={archive}>
              Archive project
            </button>
          )}
          <button className="btn danger" onClick={remove}>
            Delete project
          </button>
        </div>
      </section>
    </div>
  );
}

export function ProjectDetail() {
  const { projectId } = useParams();
  const { projects, tickets, refetch, toast, role } = useWorkspace();
  const nav = useNavigate();
  const loc = useLocation();

  const p = projects.find((x) => x.key === projectId);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [milestonesError, setMilestonesError] = useState("");
  useEffect(() => {
    if (!p?.id) return;
    let active = true;
    setMilestonesLoading(true);
    setMilestonesError("");
    void api<any>(`/resources/milestone?project=${encodeURIComponent(p.id)}`)
      .then((result) => { if (active) setMilestones(result.resources || []); })
      .catch((error) => { if (active) { setMilestones([]); setMilestonesError(error instanceof Error ? error.message : "Unable to load milestones"); } })
      .finally(() => { if (active) setMilestonesLoading(false); });
    return () => { active = false; };
  }, [p?.id]);
  if (!p)
    return (
      <Empty
        title="Project not found"
        body="The requested project key does not exist."
        action={{ label: "Back to projects", to: "/projects" }}
      />
    );

  const tab = loc.pathname.endsWith("/settings")
    ? "Settings"
    : loc.pathname.endsWith("/board")
      ? "Board"
      : loc.pathname.endsWith("/backlog")
        ? "Backlog"
        : loc.pathname.endsWith("/sprints")
          ? "Sprints"
          : loc.pathname.endsWith("/tickets")
            ? "Tickets"
            : "Overview";

  // Filter project tickets
  const projTickets = tickets.filter((t) => t.project === p.name);

  return (
    <>
      <PageHead eyebrow={p.key} title={p.name} desc={p.description}>
        <Button onClick={() => nav("/team")}>
          <Icons.UserPlus />
          Members
        </Button>
        {role === "admin" || role === "manager" ? (
          <Button variant="primary" onClick={() => nav("/tickets/new")}>
            <Icons.Plus />
            Add ticket
          </Button>
        ) : null}
      </PageHead>
      <Tabs
        value={tab}
        ariaLabel="Project sections"
        items={["Overview", "Board", "Backlog", "Sprints", "Tickets", "Settings"].map((value) => ({ value, label: value }))}
        onChange={(value) => nav(value === "Overview" ? `/projects/${p.key}` : `/projects/${p.key}/${value.toLowerCase()}`)}
      />

      {tab === "Overview" && (
        <>
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
                <strong>
                  {projTickets.filter((t) => t.status !== "Done").length}
                </strong>
                <small>
                  {projTickets.filter((t) => t.blocked).length} blocked
                </small>
              </div>
            </article>
            <article className="metric">
              <div>
                <span>Team</span>
                <strong>{p.members}</strong>
                <small>contributors</small>
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
              <CardTitle
                title="Recent work"
                sub="Updates across this project"
              />
              <TicketTable rows={projTickets.slice(0, 4)} />
            </section>
            <section className="card">
              <CardTitle title="Milestones" />
              {milestonesLoading ? <LoadingState label="Loading milestones…" /> : milestonesError ? <ErrorState title="Unable to load milestones" body={milestonesError} /> : milestones.length ? <div className="timeline">
                {milestones.map((milestone: any) => {
                  const config = milestone.config || {};
                  const targetDate = config.targetDate || config.dueDate || config.releaseDate;
                  const isDone = /done|complete|released|closed/i.test(String(milestone.status || ""));
                  return <div key={milestone._id || milestone.id}>
                    <i className={isDone ? "done" : ""} />
                    <span>
                      <b>{milestone.name}</b>
                      <small>{targetDate ? `${isDone ? "Completed" : "Due"} ${new Date(targetDate).toLocaleDateString()}` : milestone.status || "No target date"}</small>
                    </span>
                  </div>;
                })}
              </div> : <Empty title="No milestones" body="Create milestones in project resources to track delivery targets." />}
            </section>
          </div>
        </>
      )}

      {tab === "Board" && <Board toast={toast} projectFilter={p.name} />}

      {tab === "Backlog" && (
        <BacklogLive toast={toast} projectFilter={p._id || p.id} />
      )}

      {tab === "Sprints" && (
        <SprintsLive toast={toast} projectFilter={p.name} />
      )}

      {tab === "Tickets" && (
        <section className="card no-pad">
          <TicketTable rows={projTickets} />
        </section>
      )}

      {tab === "Settings" && (
        <ProjectSettings project={p} refetch={refetch} toast={toast} />
      )}
    </>
  );
}
