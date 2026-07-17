import React, { useEffect } from "react";
import * as Icons from "lucide-react";
import { useWorkspace } from "../workspace";
import { useAiAgent } from "../components/AiAgent";
import { aiActivityLabel } from "../components/AiAgent";
import { CustomMarkdown } from "../components/Markdown";
import { cx } from "../../utils/ui";
import { fmt } from "../../utils/ui";

const aiWorkspacePrompts = [
  { icon: Icons.Building2, title: "Organization overview", text: "Summarize my organization, accessible workspaces, groups, and company directory." },
  { icon: Icons.UsersRound, title: "Manage workspace access", text: "Show organization groups, their members, and workspace access before I choose a change.", adminOnly: true },
  { icon: Icons.Ticket, title: "Triage my work", text: "Show my tickets and prioritize what I should work on next." },
  { icon: Icons.Timer, title: "Review the sprint", text: "Summarize the current sprint, blockers, risks, and recommended next steps." },
  { icon: Icons.FilePlus2, title: "Create work", text: "Help me create a ticket. Ask me for any missing details first." },
  { icon: Icons.ChartNoAxesCombined, title: "Surface insights", text: "Analyze delivery, workload, velocity, and risk across this workspace." },
];

export function AIPage() {
  const { user, role } = useWorkspace();
  const {
    messages,
    input,
    setInput,
    loading,
    toolActivities,
    sendMessage,
    confirmMessage,
    denyMessage,
    clearChat,
    conversations,
    activeConversationId,
    historyLoading,
    openConversation,
    deleteConversation,
  } = useAiAgent();
  const conversationRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const firstName = user?.name?.split(" ")[0] || "there";
  const visibleWorkspacePrompts = aiWorkspacePrompts.filter((prompt) => !prompt.adminOnly || role === "admin");

  useEffect(() => {
    if (conversationRef.current) conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
  }, [messages, loading, toolActivities]);

  const submit = () => void sendMessage(input);

  return (
    <section className="ai-workspace">
      <div className="ai-workspace-grid">
        <div className="ai-workspace-main">
          <div className="ai-workspace-chat-head">
            <div className="ai-workspace-avatar"><Icons.Bot size={20} /></div>
            <span><b>I-TRACK AI Agent</b><small>Organization context · Ask, review, then approve actions</small></span>
            {messages.length > 0 && <button className="icon-btn" onClick={clearChat} title="Start a new conversation" aria-label="Start a new conversation"><Icons.RotateCcw size={16} /></button>}
          </div>

          <div className={cx("ai-workspace-conversation", messages.length === 0 && "empty")} ref={conversationRef}>
            {messages.length === 0 ? (
              <div className="ai-workspace-welcome">
                <span className="ai-workspace-orb"><Icons.Sparkles size={27} /></span>
                <span className="ai-workspace-overline">READY WHEN YOU ARE</span>
                <h2>Hi {firstName}, what can I move forward?</h2>
                <p>Give me an outcome or a question. I can inspect organization and workspace data, create and update work, and ask before sensitive actions.</p>
                <div className="ai-workspace-prompts">
                  {visibleWorkspacePrompts.map(({ icon: Icon, title, text }) => (
                    <button key={title} onClick={() => void sendMessage(text)}>
                      <span><Icon size={17} /></span>
                      <b>{title}</b>
                      <small>{text}</small>
                      <Icons.ArrowUpRight size={15} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="ai-workspace-messages">
                {messages.map((message) => (
                  <div className={cx("ai-msg", message.role)} key={message.id}>
                    <div className="ai-msg-avatar">{message.role === "assistant" ? <Icons.Bot size={16} /> : <Icons.User size={16} />}</div>
                    <div>
                      <div className="ai-msg-bubble">{message.role === "assistant" ? <CustomMarkdown content={message.content} /> : message.content}</div>
                      {message.requiresConfirmation && message.pendingAction && (
                        <div className="ai-confirm-bar">
                          <p><Icons.ShieldAlert size={14} /> Confirmation required</p>
                          <span>{message.pendingAction.description}</span>
                          <div><button className="btn-confirm" onClick={() => confirmMessage(message)}>Yes, proceed</button><button className="btn-deny" onClick={denyMessage}>Cancel</button></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="ai-typing">
                    <div className="ai-msg-avatar ai-workspace-thinking"><Icons.Bot size={16} /></div>
                    {toolActivities.length ? (
                      <div className="ai-request-activity" aria-live="polite">
                        {toolActivities.map((activity) => (
                          <div className={cx("ai-request-row", activity.status)} key={activity.id}>
                            <span className="ai-request-indicator">{activity.status === "complete" && <Icons.Check size={13} />}{activity.status === "error" && <Icons.AlertCircle size={13} />}</span>
                            <span>{aiActivityLabel(activity)}</span>
                            {activity.status === "running" && <span className="ai-request-ellipsis" aria-hidden="true">...</span>}
                          </div>
                        ))}
                      </div>
                    ) : <div className="ai-typing-dots"><span /><span /><span /></div>}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="ai-workspace-composer">
            <div>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }}
                placeholder="Ask about your work, or tell the agent what to do…"
                rows={2}
              />
              <button className="ai-workspace-send" onClick={submit} disabled={!input.trim() || loading} aria-label="Send message"><Icons.ArrowUp size={18} /></button>
            </div>
            <span><Icons.ShieldCheck size={13} /> Actions that need approval will always ask first</span>
          </div>
        </div>

        <aside className="ai-workspace-side">
          <div className="ai-side-card ai-history-card">
            <div className="ai-history-head">
              <span className="ai-side-label">CHAT HISTORY</span>
              <button className="icon-btn" onClick={clearChat} title="New conversation" aria-label="New conversation"><Icons.Plus size={14} /></button>
            </div>
            <div className="ai-history-list">
              {historyLoading && conversations.length === 0 && <span className="ai-history-empty">Loading conversations…</span>}
              {!historyLoading && conversations.length === 0 && <span className="ai-history-empty">Your saved conversations will appear here.</span>}
              {conversations.map((conversation) => (
                <div className={cx("ai-history-item", activeConversationId === conversation.id && "active")} key={conversation.id}>
                  <button onClick={() => void openConversation(conversation.id)}>
                    <Icons.MessageSquare size={14} />
                    <span><b>{conversation.title}</b><small>{fmt(conversation.updatedAt)}</small></span>
                  </button>
                  <button className="ai-history-delete" onClick={() => void deleteConversation(conversation.id)} title="Delete conversation" aria-label={`Delete ${conversation.title}`}><Icons.Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
