"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MessageSquare, Send } from "lucide-react";

import { submitFeedbackAction } from "@/app/actions/client";
import { replyToFeedbackAction, setFeedbackStatusAction } from "@/app/actions/portal";
import { Avatar } from "@/components/features/portal-shell";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Select,
  Textarea,
  statusTone,
} from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { idleState } from "@/lib/action-state";
import { formatDate, timeAgo } from "@/lib/utils";

export type FeedbackView = {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: string;
  clientName?: string;
  replies: number;
};

export type ThreadMessage = {
  id: string;
  body: string;
  authorName: string;
  authorRole: string;
  createdAt: string;
};

export function FeedbackComposer() {
  const [state, action, pending] = useActionState(submitFeedbackAction, idleState);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      toast({ title: "Message sent", description: state.message, tone: "success" });
      router.refresh();
    }
    if (state.status === "error" && state.message) {
      toast({ title: "Not sent", description: state.message, tone: "error" });
    }
  }, [state, toast, router]);

  return (
    <Card className="h-fit">
      <CardHeader title="Raise something with the desk" description="Questions, concerns, complaints or praise" />
      <form action={action} className="space-y-4 p-5" key={state.status === "success" ? "reset" : "form"}>
        <Field label="Category" htmlFor="category">
          <Select id="category" name="category" defaultValue="question">
            <option value="question">Question</option>
            <option value="concern">Concern</option>
            <option value="complaint">Complaint</option>
            <option value="praise">Praise</option>
          </Select>
        </Field>
        <Field label="Subject" error={state.errors?.subject} htmlFor="subject">
          <Input id="subject" name="subject" required placeholder="Understanding last week's allocation" />
        </Field>
        <Field label="Message" error={state.errors?.message} htmlFor="message">
          <Textarea
            id="message"
            name="message"
            required
            placeholder="Give us as much detail as you can — the desk replies in-thread."
          />
        </Field>
        <Button type="submit" loading={pending} className="w-full">
          <Send className="h-4 w-4" strokeWidth={1.8} />
          Send to the desk
        </Button>
      </form>
    </Card>
  );
}

export function FeedbackList({
  rows,
  basePath,
  showClient = false,
}: {
  rows: FeedbackView[];
  basePath: string;
  showClient?: boolean;
}) {
  const [status, setStatus] = React.useState("all");
  const visible = rows.filter((row) => (status === "all" ? true : row.status === status));

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-line px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">Conversations</h2>
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-10 sm:w-48"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="in_review">In review</option>
          <option value="resolved">Resolved</option>
        </Select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-4 w-4" strokeWidth={1.8} />}
          title="No conversations"
          description="Threads you start or receive will show up here."
        />
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {visible.map((row, index) => (
            <motion.li
              key={row.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.25) }}
            >
              <Link href={`${basePath}/${row.id}`} className="block px-5 py-4 transition-colors hover:bg-surface">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[14px] font-semibold tracking-tight text-ink">{row.subject}</p>
                  <Badge tone={statusTone[row.status] ?? "neutral"}>{row.status.replace("_", " ")}</Badge>
                  {row.priority === "high" ? <Badge tone="negative">high priority</Badge> : null}
                </div>
                <p className="mt-1 line-clamp-1 text-[13px] text-ink-2">{row.message}</p>
                <p className="mt-1.5 text-[11.5px] text-ink-3">
                  {showClient && row.clientName ? `${row.clientName} · ` : ""}
                  {row.category} · {row.replies} {row.replies === 1 ? "reply" : "replies"} ·{" "}
                  {timeAgo(row.createdAt)}
                </p>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function FeedbackThread({
  thread,
  messages,
  canModerate,
}: {
  thread: FeedbackView & { clientName?: string };
  messages: ThreadMessage[];
  canModerate: boolean;
}) {
  const [state, action, pending] = useActionState(replyToFeedbackAction, idleState);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      toast({ title: "Reply sent", tone: "success" });
      router.refresh();
    }
    if (state.status === "error" && state.message) {
      toast({ title: "Not sent", description: state.message, tone: "error" });
    }
  }, [state, toast, router]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <Card>
        <CardHeader
          title={thread.subject}
          description={`${thread.category} · opened ${formatDate(thread.createdAt, true)}${
            thread.clientName ? ` · ${thread.clientName}` : ""
          }`}
          action={<Badge tone={statusTone[thread.status] ?? "neutral"}>{thread.status.replace("_", " ")}</Badge>}
        />
        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-[13.5px] leading-relaxed text-ink">{thread.message}</p>
            <p className="mt-2 text-[11.5px] text-ink-3">{timeAgo(thread.createdAt)}</p>
          </div>

          {messages.map((message) => (
            <div key={message.id} className="flex gap-3">
              <Avatar name={message.authorName} size={32} />
              <div className="min-w-0 flex-1 rounded-xl border border-line p-4">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-ink">{message.authorName}</p>
                  <Badge tone={message.authorRole === "client" ? "neutral" : "info"}>
                    {message.authorRole}
                  </Badge>
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{message.body}</p>
                <p className="mt-2 text-[11.5px] text-ink-3">{timeAgo(message.createdAt)}</p>
              </div>
            </div>
          ))}

          <form action={action} className="space-y-3 border-t border-line pt-4">
            <input type="hidden" name="feedbackId" value={thread.id} />
            <Field label="Reply" error={state.errors?.body} htmlFor="reply-body">
              <Textarea id="reply-body" name="body" required placeholder="Write your reply…" />
            </Field>
            <Button type="submit" loading={pending}>
              <Send className="h-4 w-4" strokeWidth={1.8} />
              Send reply
            </Button>
          </form>
        </div>
      </Card>

      <Card className="h-fit">
        <CardHeader title="Thread details" />
        <dl className="divide-y divide-[var(--border)]">
          {[
            { label: "Status", value: thread.status.replace("_", " ") },
            { label: "Priority", value: thread.priority },
            { label: "Category", value: thread.category },
            { label: "Opened", value: formatDate(thread.createdAt, true) },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between px-5 py-3">
              <dt className="text-[12px] font-medium uppercase tracking-wide text-ink-3">{item.label}</dt>
              <dd className="text-[13px] font-medium capitalize text-ink">{item.value}</dd>
            </div>
          ))}
        </dl>

        {canModerate ? (
          <div className="space-y-2 border-t border-line p-5">
            <p className="text-[12px] font-medium uppercase tracking-wide text-ink-3">Moderation</p>
            <div className="flex flex-wrap gap-2">
              {(["open", "in_review", "resolved"] as const).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={thread.status === status ? "primary" : "secondary"}
                  onClick={async () => {
                    const result = await setFeedbackStatusAction(thread.id, status);
                    toast({
                      title: result.status === "success" ? "Updated" : "Failed",
                      description: result.message,
                      tone: result.status === "success" ? "success" : "error",
                    });
                    router.refresh();
                  }}
                >
                  {status.replace("_", " ")}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {(["low", "normal", "high"] as const).map((priority) => (
                <Button
                  key={priority}
                  size="sm"
                  variant={thread.priority === priority ? "primary" : "secondary"}
                  onClick={async () => {
                    const result = await setFeedbackStatusAction(
                      thread.id,
                      thread.status as "open" | "in_review" | "resolved",
                      priority,
                    );
                    toast({
                      title: result.status === "success" ? "Priority updated" : "Failed",
                      tone: result.status === "success" ? "success" : "error",
                    });
                    router.refresh();
                  }}
                >
                  {priority}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
