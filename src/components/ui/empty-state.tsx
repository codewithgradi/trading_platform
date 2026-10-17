import { Inbox } from "lucide-react";
export function EmptyState({ title, description }: { title: string; description: string }) { return <div className="empty-state"><span><Inbox size={24} strokeWidth={1.5} /></span><h3>{title}</h3><p>{description}</p></div>; }
export function Skeleton({ className = "" }: { className?: string }) { return <div className={`skeleton ${className}`} aria-hidden="true" />; }
