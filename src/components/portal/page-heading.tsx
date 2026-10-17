import type { ReactNode } from "react";
export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) { return <div className="portal-page-heading"><div><span className="portal-eyebrow"><span />{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>; }
