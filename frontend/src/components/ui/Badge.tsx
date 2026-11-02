import type { CampaignStatus, ContactStatus, LogStatus } from "../../services/types";
import { cn } from "../../lib/cn";

type Tone = "slate" | "blue" | "green" | "amber" | "red";

const tones: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-green-50 text-green-700 border-green-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200"
};

const dots: Record<Tone, string> = {
  slate: "bg-slate-400",
  blue: "bg-blue-600",
  green: "bg-green-600",
  amber: "bg-amber-600",
  red: "bg-red-600"
};

export function Badge({
  tone = "slate",
  children,
  className
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium capitalize",
        tones[tone],
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dots[tone])} />
      {children}
    </span>
  );
}

const campaignTones: Record<CampaignStatus, Tone> = {
  draft: "slate",
  scheduled: "amber",
  sending: "blue",
  completed: "green"
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return <Badge tone={campaignTones[status]}>{status}</Badge>;
}

export function ContactStatusBadge({ status }: { status: ContactStatus }) {
  return <Badge tone={status === "active" ? "green" : "slate"}>{status}</Badge>;
}

const logTones: Record<LogStatus, Tone> = {
  sent: "slate",
  opened: "blue",
  clicked: "green"
};

export function LogStatusBadge({ status }: { status: LogStatus }) {
  return <Badge tone={logTones[status]}>{status}</Badge>;
}
