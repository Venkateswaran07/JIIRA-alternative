import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as Icons from "lucide-react";
import { useWorkspace } from "../workspace";
import { api } from "../../api";
import { PageHead, Empty, FilterBar, ViewToggle, MetricCard } from "../components/ui";
import { TicketTable } from "./TicketPages";
import { Board } from "./SprintPages";
import { matchesTicket } from "./TicketPages";

export function MyWork({ toast }: { toast: (message: string) => void }) {
  const [view, setView] = useState("list");
  const [scope, setScope] = useState("assigned");
  const [summary, setSummary] = useState<any>(null);
  const { tickets, labelOptions, dashboard, user } = useWorkspace();
  const [params] = useSearchParams();
  const currentUserId = String(user?._id || user?.id || "");
  const requestedScope = params.get("scope") || "assigned";
  const query = params.get("q") || "";
  const selectedLabel = params.get("label") || "";
  const filter = params.get("filter") || "";

  useEffect(() => {
    api<any>("/my-work").then(setSummary).catch(() => setSummary(null));
  }, [dashboard]);

  useEffect(() => {
    setScope(requestedScope);
  }, [requestedScope]);

  const formatHours = (hours: number) => `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
  const assignedTickets = tickets.filter((ticket) => ticket.assigneeId === currentUserId);
  const watchedTickets = tickets.filter((ticket) => ticket.watched && ticket.assigneeId !== currentUserId);
  const attentionTickets = tickets.filter((ticket) =>
    (ticket.assigneeId === currentUserId || ticket.watched) &&
    (ticket.blocked || ["breached", "due_soon"].includes(ticket.slaStatus || "")),
  );
  const completedTickets = tickets.filter((ticket) =>
    (ticket.assigneeId === currentUserId || ticket.watched) && ticket.status === "Done",
  );
  const visibleTickets = scope === "watched"
    ? watchedTickets
    : scope === "attention"
      ? attentionTickets
      : scope === "completed"
        ? completedTickets
        : assignedTickets;
  const filteredTickets = visibleTickets.filter((ticket) =>
    matchesTicket(ticket, query, selectedLabel) && (filter !== "open" || ticket.status !== "Done"),
  );

  return (
    <>
      <PageHead
        title="My work"
        desc="Everything assigned to you, in one place."
      >
        <ViewToggle
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: "List", icon: Icons.List },
            { value: "board", label: "Board", icon: Icons.Columns3 },
          ]}
        />
      </PageHead>
      <div className="metrics compact work-metrics">
        <MetricCard
          label="Assigned to me"
          value={assignedTickets.length}
          sub={`Across ${summary?.projects ?? 0} projects`}
          icon={Icons.CircleUserRound}
          tone="purple"
        />
        <MetricCard
          label="Needs attention"
          value={attentionTickets.length}
          sub={`${attentionTickets.filter((ticket) => ticket.blocked).length} blocked or at risk`}
          icon={Icons.CircleAlert}
          tone="red"
        />
        <MetricCard
          label="Logged this sprint"
          value={formatHours(summary?.loggedHours ?? 0)}
          sub={`Of ${summary?.capacity ?? user?.capacity ?? 0}h capacity`}
          icon={Icons.Clock3}
          tone="blue"
        />
        <MetricCard
          label="Watched"
          value={watchedTickets.length}
          sub={`${summary?.watchedUpdatedToday ?? 0} updated today`}
          icon={Icons.Eye}
          tone="green"
        />
      </div>
      <div className="work-scope-bar">
        <div>
          <span className="eyebrow">WORK QUEUE</span>
          <b>Choose a focus</b>
        </div>
        <div className="scope-tabs" role="tablist" aria-label="My work scope">
          {[
            ["assigned", "Assigned", assignedTickets.length],
            ["attention", "Needs attention", attentionTickets.length],
            ["watched", "Watched", watchedTickets.length],
            ["completed", "Completed", completedTickets.length],
          ].map(([value, label, count]) => (
            <button
              key={String(value)}
              className={scope === value ? "active" : ""}
              onClick={() => setScope(String(value))}
              role="tab"
              aria-selected={scope === value}
            >
              {label}<span>{count}</span>
            </button>
          ))}
        </div>
      </div>
      <FilterBar placeholder="Search my work…" labelOptions={labelOptions} />
      {view === "list" ? (
        <section className="card no-pad">
          {filteredTickets.length ? <TicketTable rows={filteredTickets} /> : <Empty title="No work in this view" body="Try another focus or clear your filters." />}
        </section>
      ) : (
        <Board toast={toast} ticketFilter={(ticket) => filteredTickets.some((item) => item.id === ticket.id)} />
      )}
    </>
  );
}
