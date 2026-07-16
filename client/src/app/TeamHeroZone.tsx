import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { api } from "../api";
import { Avatar, Badge, PageHead } from "./components/ui";

interface SuggestedAssignee {
  userId: string;
  name: string;
  email: string;
  avatarColor?: string;
  availableCapacity: number;
  matchingSkills: string[];
}

interface Ticket {
  _id: string;
  ticketId: string;
  title: string;
  description: string;
  storyPoints: number;
  status: string;
  priority: string;
  isAssisted: boolean;
  assistRiskDetected: boolean;
  assistRiskProbability: number;
  assistOriginalAssignee?: {
    name: string;
    avatarColor?: string;
  };
  assistCredits: number;
  assistSuggestedAssignees?: SuggestedAssignee[];
  labels: string[];
  project?: {
    name: string;
    key: string;
  };
}

interface ReportEntry {
  user: {
    _id: string;
    name: string;
    email: string;
    avatarColor?: string;
  };
  assists: number;
  totalCredits: number;
  details: {
    ticketId: string;
    ticketKey: string;
    title: string;
    storyPoints: number;
    credits: number;
    originalAssigneeName: string;
    completedAt: string;
  }[];
}

export function TeamHeroZone({ toast }: { toast: (msg: string, opt?: any) => void }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [report, setReport] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [triageRes, reportRes, meRes] = await Promise.all([
        api<{ tickets: Ticket[] }>("/team-assist/triage"),
        api<{ report: ReportEntry[] }>("/team-assist/report"),
        api<any>("/auth/me").catch(() => null),
      ]);
      setTickets(triageRes.tickets || []);
      setReport(reportRes.report || []);
      if (meRes) {
        setCurrentUser(meRes);
      }
    } catch (error: any) {
      toast(error.message || "Failed to load Team Hero Zone data", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const runAiListener = async () => {
    try {
      toast("AI Predictive Risk listener running...", { type: "info" });
      const result = await api<any>("/team-assist/trigger-check", { method: "POST" });
      toast(result.message || "Risk assessment complete", { type: "success" });
      fetchData();
    } catch (error: any) {
      toast(error.message || "Failed to run risk listener", { type: "error" });
    }
  };

  const claimTask = async (ticketId: string) => {
    if (!currentUser) return;
    try {
      // Find completing user ID from auth info
      const assigneeId = currentUser._id || currentUser.id;
      await api(`/tickets/${ticketId}/assign`, {
        method: "POST",
        body: JSON.stringify({ assignee: assigneeId }),
      });
      toast("Task claimed successfully! Assist credits will log when moved to Done.", {
        type: "success",
      });
      fetchData();
    } catch (error: any) {
      toast(error.message || "Failed to claim task", { type: "error" });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "rose";
      case "high":
        return "orange";
      case "medium":
        return "yellow";
      default:
        return "blue";
    }
  };

  const exportReport = () => {
    const dataStr = JSON.stringify(report, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HR_Velocity_Shield_Report_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("Performance Intelligence Report exported for HR audit.", { type: "success" });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHead
        eyebrow="VELOCITY SHIELD"
        title={
          <div className="flex items-center gap-2">
            <Icons.Award className="w-8 h-8 text-cyan-400" />
            <span>Team Hero Zone</span>
          </div>
        }
        desc="Autonomous workload balancing. Delay risk tasks are triaged here as opportunities for peer collaboration and bonus credits."
      >
        <div className="flex items-center gap-2">
          <button
            onClick={runAiListener}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 border rounded-lg hover:bg-neutral-800 border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-cyan-500 hover:text-cyan-400"
          >
            <Icons.Sparkles className="w-4 h-4" />
            <span>Run AI Risk Listener</span>
          </button>
          <button
            onClick={exportReport}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 border rounded-lg hover:bg-neutral-800 border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-emerald-500 hover:text-emerald-400"
          >
            <Icons.Download className="w-4 h-4" />
            <span>Export HR Ledger Report</span>
          </button>
        </div>
      </PageHead>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-neutral-400">
          <Icons.Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Opportunities Board */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-neutral-200">
              <Icons.Shield className="w-5 h-5 text-cyan-400" />
              <span>Active Collaboration Board ({tickets.length})</span>
            </h2>

            {tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl border-neutral-800 bg-neutral-900/50 text-neutral-400">
                <Icons.PartyPopper className="w-12 h-12 mb-3 text-cyan-500" />
                <p className="font-medium text-neutral-200">Velocity Shield Healthy</p>
                <p className="text-xs text-neutral-500">No active tasks are flagged with delay risks.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {tickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    className="p-5 border rounded-xl bg-neutral-900/40 border-neutral-800 hover:border-neutral-700 transition-all duration-200 flex flex-col gap-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-semibold text-cyan-400">
                            {ticket.project?.key}-{ticket.ticketId}
                          </span>
                          <span className="text-xs text-neutral-500">•</span>
                          <span className="text-xs text-neutral-400">{ticket.project?.name}</span>
                        </div>
                        <h3 className="font-semibold text-neutral-100">{ticket.title}</h3>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge tone="rose">
                          <div className="flex items-center gap-1">
                            <Icons.AlertTriangle className="w-3 h-3" />
                            <span>{ticket.assistRiskProbability}% delay risk</span>
                          </div>
                        </Badge>
                        <Badge tone={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-sm text-neutral-400 line-clamp-2">
                      {ticket.description || "No description provided."}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {(ticket.labels || []).map((label) => (
                        <span
                          key={label}
                          className="px-2 py-0.5 text-xs rounded bg-neutral-800 text-neutral-300 font-medium"
                        >
                          {label}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-neutral-800">
                      {/* Original assignee info */}
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-xs text-neutral-500">Struggling Owner</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Avatar
                              name={ticket.assistOriginalAssignee?.name || "Unassigned"}
                              color={ticket.assistOriginalAssignee?.avatarColor}
                            />
                            <span className="text-sm text-neutral-300 font-medium">
                              {ticket.assistOriginalAssignee?.name || "Unassigned"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Suggested helpers */}
                      <div className="flex flex-col">
                        <span className="text-xs text-neutral-500">AI Matches (Capacity & Skills)</span>
                        <div className="flex flex-col gap-1 mt-1">
                          {ticket.assistSuggestedAssignees && ticket.assistSuggestedAssignees.length > 0 ? (
                            ticket.assistSuggestedAssignees.map((helper) => (
                              <div
                                key={helper.userId}
                                className="flex items-center justify-between text-xs bg-neutral-900/80 p-2 rounded border border-neutral-800"
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar name={helper.name} color={helper.avatarColor} />
                                  <span className="text-neutral-300 font-medium">{helper.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-neutral-500">
                                    {helper.availableCapacity} pts free
                                  </span>
                                  {helper.matchingSkills.length > 0 && (
                                    <span className="px-1 py-0.5 text-[10px] bg-cyan-900/30 text-cyan-300 rounded border border-cyan-800/40">
                                      {helper.matchingSkills[0]}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-neutral-500">No suggestions available.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-neutral-800 bg-neutral-950/20 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-cyan-400">
                        <Icons.TrendingUp className="w-5 h-5" />
                        <span className="text-sm font-semibold">
                          +{ticket.assistCredits} Assist Credits Reward
                        </span>
                      </div>
                      <button
                        onClick={() => claimTask(ticket._id)}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-all duration-200"
                      >
                        Claim & Support Teammate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Performance Intelligence Report Ledger */}
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-neutral-200">
              <Icons.Award className="w-5 h-5 text-emerald-400" />
              <span>Credit Ledger (Hikes & Bonuses)</span>
            </h2>

            <div className="border rounded-xl bg-neutral-900/40 border-neutral-800 p-4 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <Icons.Info className="w-4 h-4 text-neutral-400" />
                <span>Auditable HR chain of custody ledger for sprint assists.</span>
              </div>

              {report.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 text-sm">
                  No assists logged in this quarter yet.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {report.map((row) => (
                    <div
                      key={row.user._id}
                      className="border rounded-lg border-neutral-800 bg-neutral-900/90 overflow-hidden"
                    >
                      <button
                        onClick={() =>
                          setExpandedUser(expandedUser === row.user._id ? null : row.user._id)
                        }
                        className="w-full flex items-center justify-between p-3 hover:bg-neutral-800/50 transition-all duration-150"
                      >
                        <div className="flex items-center gap-2.5">
                          <Avatar name={row.user.name} color={row.user.avatarColor} />
                          <div className="text-left">
                            <div className="text-sm font-semibold text-neutral-200">
                              {row.user.name}
                            </div>
                            <div className="text-xs text-neutral-500">{row.assists} assist(s)</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-emerald-400">
                            {row.totalCredits} pts
                          </span>
                          {expandedUser === row.user._id ? (
                            <Icons.ChevronUp className="w-4 h-4 text-neutral-500" />
                          ) : (
                            <Icons.ChevronDown className="w-4 h-4 text-neutral-500" />
                          )}
                        </div>
                      </button>

                      {expandedUser === row.user._id && (
                        <div className="p-3 border-t border-neutral-800 bg-neutral-950/40 flex flex-col gap-2">
                          <span className="text-xs font-semibold text-neutral-500 uppercase">
                            Audit Trail Details
                          </span>
                          {row.details.map((detail, idx) => (
                            <div
                              key={detail.ticketId + "-" + idx}
                              className="text-xs flex flex-col gap-1 p-2 rounded bg-neutral-900/60 border border-neutral-800"
                            >
                              <div className="flex justify-between">
                                <span className="font-semibold text-neutral-300">
                                  {detail.ticketKey}: {detail.title}
                                </span>
                                <span className="text-emerald-400 font-bold">+{detail.credits} pts</span>
                              </div>
                              <div className="flex justify-between text-neutral-500">
                                <span>Assisted: {detail.originalAssigneeName}</span>
                                <span>
                                  {new Date(detail.completedAt).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
