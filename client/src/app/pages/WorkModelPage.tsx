import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHead } from "../components/ui";
import { useWorkspace } from "../workspace";

type MapNodeProps = {
  className: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  count: number;
  countLabel: string;
  description: string;
  to: string;
  chips: string[];
};

function recordId(value: any) {
  return String(value?._id || value?.id || value || "");
}

function projectIdFor(value: any) {
  return recordId(value?.project);
}

function evidenceCount(ticket: any) {
  return [
    ...(ticket.acceptanceCriteria || []),
    ...(ticket.comments || []),
    ...(ticket.workLogs || []),
    ...(ticket.attachments || []),
  ].length;
}

function MapNode({
  className,
  icon: Icon,
  eyebrow,
  title,
  count,
  countLabel,
  description,
  to,
  chips,
}: MapNodeProps) {
  return (
    <NavLink className={`work-model-node ${className}`} to={to}>
      <div className="work-model-node-head">
        <span className="work-model-node-icon"><Icon size={20} /></span>
        <span className="work-model-node-count">{count}</span>
      </div>
      <span className="work-model-node-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="work-model-node-footer">
        <span>{countLabel}</span>
        <Icons.ArrowUpRight size={15} />
      </div>
      {chips.length > 0 && (
        <div className="work-model-chips" aria-label={`${title} examples`}>
          {chips.slice(0, 3).map((chip, index) => <span key={`${chip}-${index}`}>{chip}</span>)}
          {chips.length > 3 && <span>+{chips.length - 3}</span>}
        </div>
      )}
    </NavLink>
  );
}

function Connector({
  className,
  label,
  type = "record",
}: {
  className: string;
  label: string;
  type?: "record" | "association";
}) {
  return (
    <div className={`work-model-connector ${className} ${type}`}>
      <span>{label}</span>
      <div aria-hidden="true"><i /><Icons.ChevronRight size={18} /></div>
    </div>
  );
}

export function WorkModelPage() {
  const { dashboard, projects } = useWorkspace();
  const rawProjects = dashboard?.projects || [];
  const rawSprints = dashboard?.sprints || [];
  const rawTickets = dashboard?.tickets || [];
  const [selectedProjectId, setSelectedProjectId] = useState(() => recordId(rawProjects[0]));

  const selectedProject = rawProjects.find((project: any) => recordId(project) === selectedProjectId)
    || rawProjects[0]
    || projects[0];
  const activeProjectId = recordId(selectedProject);

  const projectData = useMemo(() => {
    const sprints = rawSprints.filter((sprint: any) => projectIdFor(sprint) === activeProjectId);
    const tickets = rawTickets.filter((ticket: any) => projectIdFor(ticket) === activeProjectId);
    const epics = Array.from(new Set<string>(
      tickets.map((ticket: any) => String(ticket.epic || "").trim()).filter(Boolean),
    ));
    const dependencies = tickets.flatMap((ticket: any) =>
      (ticket.dependencies || []).map((dependency: any) => String(dependency)),
    );
    const evidence = tickets.reduce((total: number, ticket: any) => total + evidenceCount(ticket), 0);

    return { sprints, tickets, epics, dependencies, evidence };
  }, [activeProjectId, rawSprints, rawTickets]);

  const projectPath = activeProjectId ? `/projects/${activeProjectId}` : "/projects";
  const sprintPath = projectData.sprints[0] ? `/sprints/${recordId(projectData.sprints[0])}` : "/sprints";

  return (
    <main className="work-model-page">
      <PageHead
        eyebrow="Workspace structure"
        title="How work connects"
        desc="Follow the implemented relationship from a project and its epic associations through sprints, tickets, dependencies, and delivery evidence."
      >
        {rawProjects.length > 0 && (
          <label className="work-model-project-picker">
            <span>Project</span>
            <select
              value={activeProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
            >
              {rawProjects.map((project: any) => (
                <option key={recordId(project)} value={recordId(project)}>
                  {project.key} · {project.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </PageHead>

      <section className="work-model-legend" aria-label="Relationship legend">
        <span><i className="record" /> Record link</span>
        <span><i className="association" /> Name-based association</span>
        <span><Icons.MousePointerClick size={14} /> Select a card to open that product area</span>
      </section>

      <section className="work-model-canvas" aria-label="Project work relationship map">
        <div className="work-model-chain">
          <MapNode
            className="project"
            icon={Icons.FolderKanban}
            eyebrow="Starting context"
            title={selectedProject?.name || "No project yet"}
            count={selectedProject ? 1 : 0}
            countLabel={selectedProject?.key || "Create a project"}
            description="Owns delivery context, access, sprints, and ticket numbering."
            to={projectPath}
            chips={selectedProject?.status ? [selectedProject.status, selectedProject.riskLevel || selectedProject.risk].filter(Boolean) : []}
          />

          <Connector className="project-to-epic" label="offers epic context" type="association" />

          <MapNode
            className="epic"
            icon={Icons.Map}
            eyebrow="Epic association"
            title="Epic associations"
            count={projectData.epics.length}
            countLabel={projectData.epics.length === 1 ? "epic name in use" : "epic names in use"}
            description="Tickets share an epic name; the ticket does not store an epic resource ID."
            to="/resources/epic"
            chips={projectData.epics}
          />

          <Connector className="epic-to-ticket" label="matches epic name" type="association" />

          <MapNode
            className="ticket"
            icon={Icons.TicketCheck}
            eyebrow="Delivery record"
            title="Tickets and tasks"
            count={projectData.tickets.length}
            countLabel={projectData.tickets.length === 1 ? "ticket" : "tickets"}
            description="Stories and tasks persist as ticket records under the selected project and optional sprint."
            to="/tickets"
            chips={projectData.tickets.map((ticket: any) => ticket.ticketId || ticket.title)}
          />

          <Connector className="project-to-sprint" label="owns delivery windows" />

          <MapNode
            className="sprint"
            icon={Icons.Timer}
            eyebrow="Project record link"
            title="Sprints"
            count={projectData.sprints.length}
            countLabel={projectData.sprints.length === 1 ? "sprint" : "sprints"}
            description="Every sprint belongs to one project and provides dates, capacity, and delivery status."
            to={sprintPath}
            chips={projectData.sprints.map((sprint: any) => sprint.name)}
          />

          <Connector className="sprint-to-ticket" label="assigns optional sprint" />
        </div>

        <div className="work-model-outcomes">
          <div className="work-model-outcome-connector" aria-hidden="true"><span /></div>
          <MapNode
            className="dependency"
            icon={Icons.GitBranch}
            eyebrow="Flow signal"
            title="Dependencies"
            count={projectData.dependencies.length}
            countLabel={projectData.dependencies.length === 1 ? "dependency entry" : "dependency entries"}
            description="Dependency values connect delivery order and mark affected tickets as blocked."
            to="/tickets"
            chips={projectData.dependencies}
          />
          <MapNode
            className="evidence"
            icon={Icons.ClipboardCheck}
            eyebrow="Delivery record"
            title="Evidence"
            count={projectData.evidence}
            countLabel="evidence items"
            description="Acceptance criteria, comments, work logs, and attachments preserve delivery proof."
            to="/tickets"
            chips={["Acceptance criteria", "Comments", "Work logs", "Attachments"]}
          />
        </div>
      </section>

      <section className="work-model-details">
        <article className="card">
          <div className="work-model-detail-icon"><Icons.Link2 size={18} /></div>
          <div>
            <h2>What is structurally linked</h2>
            <p>A sprint has a real project reference. Every ticket requires a project, and a sprint assignment is optional.</p>
          </div>
        </article>
        <article className="card">
          <div className="work-model-detail-icon amber"><Icons.Tags size={18} /></div>
          <div>
            <h2>What is associated by name</h2>
            <p>The ticket stores epic text rather than an epic record ID. Matching epic names group tickets in the UI.</p>
          </div>
        </article>
        <article className="card">
          <div className="work-model-detail-icon green"><Icons.Layers3 size={18} /></div>
          <div>
            <h2>Current planning boundary</h2>
            <p>AI creates a story and task plan, but persistence produces a coordinated flat ticket set—not native parent/child subtasks.</p>
          </div>
        </article>
      </section>
    </main>
  );
}
