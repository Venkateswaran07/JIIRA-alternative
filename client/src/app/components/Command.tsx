import React, { useEffect, useState, useRef } from "react";
import * as Icons from "lucide-react";
import { useWorkspace } from "../workspace";
import { nav } from "../navigation";
import type { Ticket } from "../../types/domain";

export function Command({
  close,
  navigate,
}: {
  close: () => void;
  navigate: (s: string) => void;
}) {
  const [q, setQ] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { tickets = [], projects = [] } = useWorkspace();

  // --- Nav pages ---
  const allPages = nav.flatMap((g) => g.items);
  const filteredPages = q
    ? allPages.filter((x) => x[2].toLowerCase().includes(q.toLowerCase())).slice(0, 5)
    : allPages.slice(0, 5);

  // --- Tickets ---
  const filteredTickets = q
    ? tickets
        .filter(
          (t: Ticket) =>
            t.key?.toLowerCase().includes(q.toLowerCase()) ||
            t.title?.toLowerCase().includes(q.toLowerCase()) ||
            t.assignee?.toLowerCase().includes(q.toLowerCase()),
        )
        .slice(0, 5)
    : [];

  // --- Projects ---
  const filteredProjects = q
    ? projects
        .filter(
          (p: any) =>
            p.name?.toLowerCase().includes(q.toLowerCase()) ||
            p.key?.toLowerCase().includes(q.toLowerCase()),
        )
        .slice(0, 3)
    : [];

  // Flat list of all results for keyboard navigation
  type ResultItem =
    | { kind: "page"; path: string; Icon: any; label: string }
    | { kind: "ticket"; ticket: any }
    | { kind: "project"; project: any };

  const allResults: ResultItem[] = [
    ...filteredPages.map(([p, Icon, l]) => ({ kind: "page" as const, path: p, Icon, label: l })),
    ...filteredTickets.map((t: any) => ({ kind: "ticket" as const, ticket: t })),
    ...filteredProjects.map((p: any) => ({ kind: "project" as const, project: p })),
  ];

  const isEmpty = allResults.length === 0;

  // Reset active index when results change
  useEffect(() => setActiveIdx(0), [q]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, allResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && allResults.length > 0) {
        e.preventDefault();
        const item = allResults[activeIdx];
        if (item.kind === "page") { navigate(item.path); close(); }
        else if (item.kind === "ticket") { navigate(`/tickets/${item.ticket.key}`); close(); }
        else if (item.kind === "project") { navigate(`/projects/${item.project.key}`); close(); }
      } else if (e.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [allResults, activeIdx, navigate, close]);

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>(".cmd-item-active");
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const statusColor: Record<string, string> = {
    "In Progress": "#7c6af7",
    "In Review": "#f59e0b",
    "Done": "#22c55e",
    "Backlog": "#94a3b8",
    "To Do": "#64748b",
  };
  const priorityIcon: Record<string, string> = {
    critical: "🔴",
    high: "🟠",
    medium: "🟡",
    low: "🔵",
  };

  function highlight(text: string) {
    if (!q) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return <span>{text}</span>;
    return (
      <span>
        {text.slice(0, idx)}
        <mark className="cmd-highlight">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </span>
    );
  }

  let itemIdx = 0;

  return (
    <div className="modal-wrap cmd-backdrop" onMouseDown={close}>
      <div
        ref={dialogRef}
        className="command command-v2"
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="cmd-input-row">
          <Icons.Search size={18} className="cmd-search-icon" />
          <span className="sr-only" id="command-title">Search workspace</span>
          <input
            ref={inputRef}
            autoFocus
            value={q}
            onChange={(e) => { setQ(e.target.value); }}
            placeholder="Search pages, tickets and projects…"
            aria-label="Search workspace"
            className="cmd-input"
          />
          {q && (
            <button className="cmd-clear" onClick={() => { setQ(""); inputRef.current?.focus(); }} aria-label="Clear search">
              <Icons.X size={14} />
            </button>
          )}
          <kbd className="cmd-kbd">ESC</kbd>
          <button className="icon-btn command-close" onClick={close} aria-label="Close search">
            <Icons.X size={16} />
          </button>
        </div>

        <div ref={listRef} className="cmd-results">
          {/* Pages section */}
          {filteredPages.length > 0 && (
            <div className="cmd-section">
              <div className="cmd-section-label">
                <Icons.LayoutGrid size={10} />
                {q ? "Pages" : "Quick Navigation"}
              </div>
              {filteredPages.map(([p, Icon, l]) => {
                const idx = itemIdx++;
                return (
                  <button
                    key={p}
                    className={`cmd-item ${idx === activeIdx ? "cmd-item-active" : ""}`}
                    onClick={() => { navigate(p); close(); }}
                    onMouseEnter={() => setActiveIdx(idx)}
                  >
                    <span className="cmd-item-icon cmd-icon-page"><Icon size={15} /></span>
                    <span className="cmd-item-label">{highlight(l)}</span>
                    <span className="cmd-item-type">Page</span>
                    <Icons.ArrowUpRight size={13} className="cmd-arrow" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Tickets section */}
          {filteredTickets.length > 0 && (
            <div className="cmd-section">
              <div className="cmd-section-label">
                <Icons.Ticket size={10} />
                Tickets
              </div>
              {filteredTickets.map((t: any) => {
                const idx = itemIdx++;
                return (
                  <button
                    key={t.key}
                    className={`cmd-item ${idx === activeIdx ? "cmd-item-active" : ""}`}
                    onClick={() => { navigate(`/tickets/${t.key}`); close(); }}
                    onMouseEnter={() => setActiveIdx(idx)}
                  >
                    <span className="cmd-item-icon cmd-icon-ticket">
                      <Icons.CircleDot size={15} />
                    </span>
                    <span className="cmd-ticket-key">{t.key}</span>
                    <span className="cmd-item-label">{highlight(t.title)}</span>
                    <span
                      className="cmd-status-badge"
                      style={{ background: `${statusColor[t.status] || "#94a3b8"}22`, color: statusColor[t.status] || "#94a3b8" }}
                    >
                      {t.status}
                    </span>
                    <span className="cmd-priority">{priorityIcon[t.priority] || ""}</span>
                    <Icons.ArrowUpRight size={13} className="cmd-arrow" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Projects section */}
          {filteredProjects.length > 0 && (
            <div className="cmd-section">
              <div className="cmd-section-label">
                <Icons.FolderKanban size={10} />
                Projects
              </div>
              {filteredProjects.map((p: any) => {
                const idx = itemIdx++;
                return (
                  <button
                    key={p.key}
                    className={`cmd-item ${idx === activeIdx ? "cmd-item-active" : ""}`}
                    onClick={() => { navigate(`/projects/${p.key}`); close(); }}
                    onMouseEnter={() => setActiveIdx(idx)}
                  >
                    <span className="cmd-item-icon cmd-icon-project">
                      <Icons.FolderKanban size={15} />
                    </span>
                    <span className="cmd-project-key">{p.key}</span>
                    <span className="cmd-item-label">{highlight(p.name)}</span>
                    <span className="cmd-item-type">Project</span>
                    <Icons.ArrowUpRight size={13} className="cmd-arrow" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {isEmpty && q && (
            <div className="command-empty">
              <Icons.SearchX size={28} />
              <b>No results for "{q}"</b>
              <span>Try searching for a page, ticket key, or project name.</span>
            </div>
          )}

          {/* Quick actions when no query */}
          {!q && (
            <div className="cmd-section cmd-section-actions">
              <div className="cmd-section-label">
                <Icons.Zap size={10} />
                Quick Actions
              </div>
              {[
                { label: "Create ticket", icon: Icons.Plus, path: "/tickets/new" },
                { label: "View backlog", icon: Icons.ListTodo, path: "/backlog" },
                { label: "Open board", icon: Icons.Columns3, path: "/board" },
                { label: "My work", icon: Icons.CircleUserRound, path: "/my-work" },
              ].map(({ label, icon: Icon, path }, qi) => {
                const idx = itemIdx++;
                return (
                  <button
                    key={path}
                    className={`cmd-item ${idx === activeIdx ? "cmd-item-active" : ""}`}
                    onClick={() => { navigate(path); close(); }}
                    onMouseEnter={() => setActiveIdx(idx)}
                  >
                    <span className="cmd-item-icon cmd-icon-action"><Icon size={15} /></span>
                    <span className="cmd-item-label">{label}</span>
                    <Icons.ArrowUpRight size={13} className="cmd-arrow" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="cmd-footer">
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Open</span>
          <span><kbd>ESC</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
