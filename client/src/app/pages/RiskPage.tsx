import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as Icons from "lucide-react";
import { useWorkspace } from "../workspace";
import { api } from "../../api";
import { Badge, CardTitle, PageHead, Progress, Empty } from "../components/ui";
import { fmt } from "../../utils/ui";

export function RiskPage() {
  const { sprintId } = useParams();
  const { dashboard, tickets, mutate, toast, role } = useWorkspace();
  const nav = useNavigate();
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const isLeader = role === "admin" || role === "manager";

  const isGenericPath = !sprintId || sprintId === "risk" || sprintId === "sprint-risk" || sprintId === "sprint risk";
  const explicitSprint = sprintId && !isGenericPath
    ? (dashboard?.sprints || []).find((x: any) => String(x._id) === String(sprintId))
    : null;
  const s = explicitSprint || (dashboard?.sprints || []).find((x: any) => x.status === "active") || dashboard?.sprints?.[0];
  const sprintTickets = s ? tickets.filter((t) => t.sprintId === s._id) : [];

  const recalculateRisk = async () => {
    if (!s) return;
    setLoading(true);
    try {
      const plannedPoints = s.plannedPoints || 0;
      const capacity = s.capacity || 0;
      const blockedTickets = sprintTickets.filter((t) => t.blocked).length;
      const totalTickets = sprintTickets.length;

      const workload = sprintTickets.reduce(
        (sum: number, t: any) => sum + (t.points || 0),
        0,
      );

      const assigneePoints: Record<string, number> = {};
      sprintTickets.forEach((t: any) => {
        assigneePoints[t.assignee] =
          (assigneePoints[t.assignee] || 0) + (t.points || 0);
      });
      const focusLoad = Math.max(0, ...Object.values(assigneePoints));

      const uniqueLabels = new Set<string>();
      sprintTickets.forEach((t: any) =>
        t.labels.forEach((l: string) => uniqueLabels.add(l)),
      );
      const requiredSkills = uniqueLabels.size;

      const allSkills = new Set<string>();
      (dashboard?.users || []).forEach((u: any) =>
        (u.skills || []).forEach((sk: string) => allSkills.add(sk)),
      );
      const coveredSkills = allSkills.size;

      const velocityHistory = s.velocityHistory || [];

      const result = await api<any>("/analysis/sprint-risk", {
        method: "POST",
        body: JSON.stringify({
          plannedPoints,
          capacity,
          blockedTickets,
          totalTickets,
          workload,
          focusLoad,
          requiredSkills,
          coveredSkills,
          velocityHistory,
        }),
      });

      if (isLeader) {
        await mutate(() =>
          api(`/sprints/${s._id}`, {
            method: "PATCH",
            body: JSON.stringify({ riskScore: result.risk.finalScore }),
          }),
        );
      }

      setAnalysis(result);
      toast(
        isLeader
          ? "Sprint risk recalculated and saved successfully"
          : "Sprint risk recalculated",
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : "Recalculation failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    recalculateRisk();
  }, [sprintId, s?._id]);

  if (!dashboard?.sprints || dashboard.sprints.length === 0) {
    return (
      <Empty
        title="No sprints found"
        body="There are no sprints in this workspace yet. Create a sprint to calculate and view sprint risk analysis."
        action={{ label: "Create a sprint", to: "/sprints/new" }}
      />
    );
  }

  if (!s) {
    return (
      <Empty
        title="Sprint not found"
        body="The requested sprint could not be found."
        action={{ label: "View active sprint risk", to: "/sprint-risk" }}
      />
    );
  }

  const displayScore = analysis ? analysis.risk.finalScore : s.riskScore;
  let riskTone = "green";
  let riskLabel = "LOW RISK";
  if (displayScore > 75) {
    riskTone = "red";
    riskLabel = "CRITICAL RISK";
  } else if (displayScore > 50) {
    riskTone = "orange";
    riskLabel = "HIGH RISK";
  } else if (displayScore > 25) {
    riskTone = "yellow";
    riskLabel = "MEDIUM RISK";
  }

  const factors = [];
  if (analysis) {
    factors.push([
      "Sprint Utilisation",
      analysis.utilisation.explanation,
      `${analysis.utilisation.finalScore > 0 ? "+" : ""}${analysis.utilisation.finalScore}`,
      analysis.utilisation.finalScore > 50
        ? "red"
        : analysis.utilisation.finalScore > 25
          ? "orange"
          : "green",
    ]);
    factors.push([
      "Dependency Risk",
      analysis.dependency.explanation,
      `${analysis.dependency.finalScore > 0 ? "+" : ""}${analysis.dependency.finalScore}`,
      analysis.dependency.finalScore > 50
        ? "red"
        : analysis.dependency.finalScore > 25
          ? "orange"
          : "green",
    ]);
    factors.push([
      "Burnout & Workload",
      analysis.burnout.explanation,
      `${analysis.burnout.finalScore > 0 ? "+" : ""}${analysis.burnout.finalScore}`,
      analysis.burnout.finalScore > 50
        ? "red"
        : analysis.burnout.finalScore > 25
          ? "orange"
          : "green",
    ]);
    factors.push([
      "Skill Gap Risk",
      analysis.skillGap.explanation,
      `${analysis.skillGap.finalScore > 0 ? "+" : ""}${analysis.skillGap.finalScore}`,
      analysis.skillGap.finalScore > 50
        ? "red"
        : analysis.skillGap.finalScore > 25
          ? "orange"
          : "green",
    ]);
  } else {
    factors.push([
      "Sprint Utilisation",
      "Based on planned points vs capacity",
      "...",
      "yellow",
    ]);
  }

  return (
    <>
      <PageHead
        eyebrow="SPRINT INTELLIGENCE"
        title="Delivery risk"
        desc={`Explainable signals for ${s.name}.`}
      >
        {(dashboard?.sprints || []).length > 1 && (
          <select
            className="select"
            value={s._id}
            onChange={(e) => nav(`/sprints/${e.target.value}/risk`)}
            style={{ width: "auto", display: "inline-block", marginRight: "8px" }}
          >
            {(dashboard?.sprints || []).map((sp: any) => (
              <option key={sp._id} value={sp._id}>
                {sp.name} ({sp.status})
              </option>
            ))}
          </select>
        )}
        <button className="btn" onClick={recalculateRisk} disabled={loading}>
          <Icons.RefreshCw className={loading ? "spin" : ""} />
          Recalculate
        </button>
      </PageHead>
      <div className="risk-hero">
        <div className="risk-score">
          <span>RISK SCORE</span>
          <strong>{displayScore}</strong>
          <Badge tone={riskTone}>{riskLabel}</Badge>
        </div>
        <div>
          <h2>
            {displayScore > 50
              ? "Delivery is at risk, but recoverable"
              : "Delivery is on track"}
          </h2>
          <p>
            {displayScore > 50
              ? "High utilization, skills constraints or blocked work are putting the sprint goal under pressure."
              : "Velocity is stable and capacity constraints are within healthy parameters."}
          </p>
          <Progress value={displayScore} tone={riskTone} />
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
          <CardTitle
            title="Contributing factors"
            sub="Why the score was computed"
          />
          <div className="factor-list">
            {factors.map(([a, b, c, d]) => (
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
          {displayScore > 50 ? (
            <>
              <h2>Review blocked tickets and load balance</h2>
              <p>
                Move blocked tickets back to backlog or reassign to
                unconstrained team members with matching skills.
              </p>
            </>
          ) : (
            <>
              <h2>Maintain current course</h2>
              <p>
                Sprint delivery is proceeding smoothly. No urgent capacity
                rebalancing required.
              </p>
            </>
          )}
        </section>
      </div>
    </>
  );
}
