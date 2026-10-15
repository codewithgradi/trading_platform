"use client";

import * as React from "react";
import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";

import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications";
import { LiveDot } from "@/components/ui/primitives";
import { timeAgo } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export function useNotifications(enabled = true) {
  return useQuery<{ items: NotificationItem[]; unread: number }>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load notifications");
      return response.json();
    },
    refetchInterval: 7000,
    enabled,
  });
}

export function NotificationBell({ role }: { role: string }) {
  const { data } = useNotifications();
  const queryClient = useQueryClient();
  const unread = data?.unread ?? 0;
  const items = data?.items.slice(0, 6) ?? [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          data-tour="notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-surface"
        >
          <Bell className="h-4 w-4" strokeWidth={1.8} />
          <AnimatePresence>
            {unread > 0 ? (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="tnum absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--negative)] px-1 text-[10px] font-bold text-white"
              >
                {unread > 9 ? "9+" : unread}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          className="z-50 w-[min(92vw,22rem)] overflow-hidden rounded-xl border border-line bg-elevated shadow-2xl data-[state=open]:animate-in"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-ink">Notifications</p>
              <LiveDot />
            </div>
            <button
              type="button"
              onClick={async () => {
                await markAllNotificationsRead();
                refresh();
              }}
              className="text-[12px] font-medium text-ink-2 underline-offset-2 transition-colors hover:text-ink hover:underline"
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-[22rem] divide-y divide-[var(--border)] overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-[13px] text-ink-3">You&apos;re all caught up.</li>
            ) : (
              items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!item.readAt) {
                        await markNotificationRead(item.id);
                        refresh();
                      }
                    }}
                    className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface"
                  >
                    <span
                      aria-hidden
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        item.readAt ? "bg-transparent" : "bg-[var(--positive)]"
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-ink">{item.title}</span>
                      <span className="mt-0.5 block line-clamp-2 text-[12px] leading-relaxed text-ink-2">
                        {item.body}
                      </span>
                      <span className="mt-1 block text-[11px] text-ink-3">{timeAgo(item.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
          <div className="border-t border-line px-4 py-2.5">
            <Link
              href={`/${role}/notifications`}
              className="text-[12.5px] font-medium text-ink underline-offset-2 hover:underline"
            >
              View all notifications
            </Link>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
