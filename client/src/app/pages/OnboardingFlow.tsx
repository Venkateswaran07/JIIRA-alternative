import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { useWorkspace } from "../workspace";
import { api, saveSession } from "../../api";
import { appForm } from "../components/AppDialog";
import { Badge, PageHead } from "../components/ui";
import { fmt } from "../../utils/ui";

export function OnboardingFlow({ toast }: { toast: (message: string) => void }) {
  const { step = "workspace" } = useParams();
  const nav = useNavigate();
  const { organization, pendingInvitations = [], refetch } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [keyEdited, setKeyEdited] = useState(false);
  const [copied, setCopied] = useState(false);

  const suggestedProjectKey = (value: string) => value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 6)
    .toUpperCase() || value.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase();

  const updateProjectName = (value: string) => {
    setProjectName(value);
    if (!keyEdited) setProjectKey(suggestedProjectKey(value));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true); setError(""); const values = new FormData(form);
    try {
      if (step === "workspace") {
        const session = await api<any>("/workspaces", { method: "POST", body: JSON.stringify({ name: values.get("name") }) });
        saveSession(session); await refetch(); nav("/onboarding/project");
      } else if (step === "project") {
        await api("/projects", { method: "POST", body: JSON.stringify({ name: values.get("name"), key: values.get("key"), description: values.get("description"), status: "active", progress: 0, riskLevel: "medium", activeSprint: "Planning", members: [] }) });
        nav("/onboarding/invite");
      } else {
        const result = await api<any>("/invitations", { method: "POST", body: JSON.stringify({ name: values.get("name"), email: values.get("email"), role: values.get("role"), capacity: Number(values.get("capacity")) }) });
        setInviteUrl(result.inviteUrl); toast(result.mailSent ? "Invitation email sent" : "Invitation created; SMTP is not configured"); form.reset();
      }
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to continue"); } finally { setBusy(false); }
  };

  const acceptInvitation = async (invitationId: string) => {
    const values = await appForm({
      title: "Accept invitation",
      message: "Enter the 6-digit verification code sent to your email.",
      fields: [{ name: "otp", label: "Verification code", required: true, placeholder: "123456" }],
      confirmLabel: "Accept invitation",
    });
    const otp = values?.otp?.trim();
    if (!otp) return;
    const session = await api<any>("/auth/accept-invite", { method: "POST", body: JSON.stringify({ invitationId, otp }) });
    saveSession(session);
    window.location.assign("/dashboard");
  };

  const finish = async () => {
    if (!organization || busy) return;
    setBusy(true); setError("");
    try {
      await api(`/workspaces/${organization.id || organization._id}/onboarding/complete`, { method: "POST" });
      window.location.assign("/dashboard");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to finish onboarding");
      setBusy(false);
    }
  };

  const headings: Record<string, [string, string]> = { workspace: ["Create or join a workspace", "A workspace keeps each team’s projects, people, and permissions separate."], project: ["Create your first project", "Give your team a clear place to start planning work."], invite: ["Invite your team", "Create invitation links now, or skip and invite teammates later."] };
  const heading = headings[step] || headings.workspace;
  const currentStep = step === "project" ? 3 : step === "invite" ? 4 : 2;
  const steps = ["Account", "Workspace", "Project", "Team"];
  const onboardingDetails = step === "project"
    ? { icon: Icons.FolderKanban, title: "Give work a home", text: "Projects keep goals, tickets, and delivery updates together.", items: ["Plan work in one place", "Track progress clearly", "Keep the team focused"] }
    : step === "invite"
      ? { icon: Icons.UsersRound, title: "Better with your team", text: "Bring the people who will plan, build, and deliver with you.", items: ["Assign clear roles", "Plan around capacity", "Share progress easily"] }
      : { icon: Icons.Building2, title: "Your team’s shared space", text: "Set up one secure home for everything your team plans and delivers.", items: ["Organize projects and tickets", "Manage people and permissions", "Keep delivery updates together"] };
  const DetailIcon = onboardingDetails.icon;

  return (
    <div className="onboarding-shell">
      <header className="onboarding-header">
        <a className="brand" href="/" aria-label="I-TRACK home"><span className="brand-mark"><img src="/logo-mark-soft-purple.png" alt="" /></span><span>I-TRACK</span></a>
        <span className="onboarding-save"><Icons.CloudCheck /> Your progress is saved</span>
      </header>
      <nav className="onboarding-progress" aria-label="Onboarding progress">
        {steps.map((label, index) => {
          const number = index + 1;
          const state = number < currentStep ? "done" : number === currentStep ? "active" : "";
          return <React.Fragment key={label}><span className={state}><i>{number < currentStep ? <Icons.Check /> : number}</i><b>{label}</b></span>{index < steps.length - 1 && <em className={number < currentStep ? "done" : ""} />}</React.Fragment>;
        })}
      </nav>
      <main className="onboarding-layout">
        <aside className="onboarding-context">
          <div className="onboarding-context-icon"><DetailIcon /></div>
          <Badge tone="lime">SET UP IN MINUTES</Badge>
          <h2>{onboardingDetails.title}</h2>
          <p>{onboardingDetails.text}</p>
          <ul>{onboardingDetails.items.map((item) => <li key={item}><Icons.CheckCircle2 />{item}</li>)}</ul>
          <div className="onboarding-tip"><Icons.Sparkles /><span><b>You can change this later</b><small>Workspace settings stay fully editable.</small></span></div>
        </aside>
        <section className="card onboarding-card">
          <div className="onboarding-card-head"><Badge tone="blue">STEP {currentStep} OF 4</Badge><span>{step === "invite" ? "Optional" : "About 1 minute"}</span></div>
          <PageHead title={heading[0]} desc={heading[1]} />
          {step === "workspace" && pendingInvitations.length > 0 && <div className="pending-onboarding"><h3>Pending invitations</h3>{pendingInvitations.map((invitation: any) => <article key={invitation.id}><div><b>{invitation.organization?.name}</b><small>Join as {fmt(invitation.role)}</small></div><button type="button" className="btn" onClick={() => acceptInvitation(invitation.id)}>Join workspace</button></article>)}<div className="or-divider">or create a new workspace</div></div>}
          <form onSubmit={submit}>
            {step === "workspace" && <label className="field"><span>Workspace name</span><input name="name" placeholder="Acme Product" minLength={2} autoComplete="organization" autoFocus required /><small>This is usually your company or team name.</small></label>}
            {step === "project" && <div className="form-grid onboarding-project-fields"><label className="field full"><span>Project name</span><input name="name" value={projectName} onChange={(event) => updateProjectName(event.target.value)} placeholder="Product launch" autoFocus required /><small>Use a clear name your whole team will recognize.</small></label><label className="field"><span>Project key</span><input name="key" value={projectKey} onChange={(event) => { setKeyEdited(true); setProjectKey(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12)); }} placeholder="PL" minLength={2} maxLength={12} required /><small>Used in ticket IDs, like {projectKey || "PL"}-101.</small></label><label className="field full"><span>Description</span><textarea name="description" placeholder="What will this project deliver?" minLength={5} required /><small>A short outcome keeps the first tickets focused.</small></label></div>}
            {step === "invite" && !inviteUrl && <div className="form-grid"><label className="field full"><span>Full name</span><input name="name" autoComplete="name" placeholder="Alex Morgan" required /></label><label className="field full"><span>Work email</span><input name="email" type="email" autoComplete="email" placeholder="alex@company.com" required /></label><label className="field"><span>Role</span><select name="role" defaultValue="engineer"><option value="engineer">Engineer</option><option value="designer">Designer</option><option value="manager">Manager</option></select></label><label className="field"><span>Weekly capacity</span><div className="capacity-input"><input name="capacity" type="number" min="0" max="168" defaultValue="32" /><span>hours</span></div></label></div>}
            {error && <div className="auth-message" role="alert">{error}</div>}
            {inviteUrl && <div className="invite-success"><span className="invite-success-icon"><Icons.Check /></span><div><h3>Invitation ready</h3><p>Share this link directly, or invite another teammate after setup.</p></div><div className="invite-link"><input aria-label="Invitation link" readOnly value={inviteUrl} /><button type="button" className="btn" onClick={async () => { await navigator.clipboard.writeText(inviteUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }}>{copied ? <Icons.Check /> : <Icons.Copy />}{copied ? "Copied" : "Copy link"}</button></div></div>}
            <div className="form-actions onboarding-actions">
              {step === "invite" && !inviteUrl && <button type="button" className="btn" disabled={busy} onClick={finish}>Skip for now</button>}
              {step === "invite" && inviteUrl ? <button type="button" className="btn primary" disabled={busy} onClick={finish}>{busy ? "Finishing…" : "Go to dashboard"}<Icons.ArrowRight /></button> : <button className="btn primary" disabled={busy}>{busy ? "Please wait…" : step === "workspace" ? "Create workspace" : step === "project" ? "Create project" : "Send invitation"}<Icons.ArrowRight /></button>}
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
