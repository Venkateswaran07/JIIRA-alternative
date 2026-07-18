import React, { useState } from "react";
import * as Icons from "lucide-react";
import { useWorkspace } from "../workspace";
import { api } from "../../api";
import { Badge, PageHead, Empty } from "../components/ui";

export function Notifications({ toast }: { toast: (s: string) => void }) {
  const { notifications = [], mutate } = useWorkspace();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const markAll = async () => {
    try {
      await mutate(() => api("/notifications/read-all", { method: "POST" }));
      toast("All notifications marked as read");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to mark all read");
    }
  };

  const markRead = async (id: string) => {
    try {
      await mutate(() => api(`/notifications/${id}/read`, { method: "PATCH" }));
      toast("Notification marked read");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to mark notification read");
    }
  };

  const displayList = notifications.filter(
    (item: any) => !unreadOnly || !item.readAt,
  );
  const unreadCount = notifications.filter((item: any) => !item.readAt).length;

  return (
    <>
      <PageHead title="Notifications" desc="Updates that need your attention.">
        <button className="btn" onClick={markAll}>
          <Icons.CheckCheck />
          Mark all read
        </button>
      </PageHead>
      <div className="tabs">
        <button
          className={!unreadOnly ? "active" : ""}
          onClick={() => setUnreadOnly(false)}
        >
          All <Badge tone="purple">{notifications.length}</Badge>
        </button>
        <button
          className={unreadOnly ? "active" : ""}
          onClick={() => setUnreadOnly(true)}
        >
          Unread{" "}
          <Badge tone={unreadCount > 0 ? "orange" : "neutral"}>
            {unreadCount}
          </Badge>
        </button>
      </div>
      <section className="card notification-list">
        {displayList.length ? (
          displayList.map((item: any) => {
            const Icon =
              item.type === "risk"
                ? Icons.Activity
                : item.type === "mention"
                  ? Icons.AtSign
                  : item.type === "webhook"
                    ? Icons.Webhook
                    : Icons.Ticket;
            const content = (
              <>
                <span className={`notif-icon ${item.type}`}>
                  <Icon />
                </span>
                <span>
                  <b>{item.title}</b>
                  <p>{item.body}</p>
                  <small>{new Date(item.createdAt).toLocaleString()}</small>
                </span>
              </>
            );
            return (
              <div className={!item.readAt ? "unread notification-item" : "notification-item"} key={item._id}>
                {item.href ? (
                  <a href={item.href} onClick={() => { if (!item.readAt) void markRead(item._id); }}>
                    {content}
                  </a>
                ) : (
                  <div className="notification-content">{content}</div>
                )}
                {!item.readAt && (
                  <button
                    className="icon-btn"
                    aria-label={`Mark ${item.title} read`}
                    onClick={() => { void markRead(item._id); }}
                  >
                    <Icons.Check />
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <Empty title="No notifications" body="You're all caught up." />
        )}
      </section>
    </>
  );
}
