import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import useSWR from "swr";
import {
  ArrowLeft,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  MailCheck,
  MousePointerClick,
  Send,
  Trash2,
  Users
} from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { StatCard } from "../components/layout/StatCard";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { CampaignStatusBadge, LogStatusBadge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { TableSkeleton } from "../components/ui/Skeleton";
import { Modal } from "../components/ui/Modal";
import { useToast } from "../components/ui/toast-context";
import { campaignService } from "../services/campaigns";
import { formatDateTime, formatNumber, formatPercent } from "../lib/format";
import { ApiError } from "../services/api";

const LOG_PAGE_SIZE = 25;

export default function CampaignDetailPage() {
  const { id } = useParams();
  const campaignId = Number(id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<Array<string | undefined>>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const {
    data: campaign,
    error,
    isLoading,
    mutate
  } = useSWR(["campaign", campaignId], () => campaignService.get(campaignId), {
    keepPreviousData: true
  });

  const {
    data: logs,
    isLoading: logsLoading,
    mutate: mutateLogs
  } = useSWR(
    ["campaign-logs", campaignId, cursor],
    () => campaignService.logs(campaignId, cursor, LOG_PAGE_SIZE),
    { keepPreviousData: true }
  );

  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return <p className="text-sm text-red-600">Invalid campaign id.</p>;
  }

  const dispatchCampaign = async () => {
    setBusy(true);
    try {
      const result = await campaignService.dispatch(campaignId);
      toast({
        tone: "success",
        title: result.sent ? "Campaign dispatched" : "Nothing new to send",
        description: result.sent
          ? `${formatNumber(result.sent)} message(s) sent · ${formatNumber(
              result.skipped
            )} already contacted.`
          : "Every eligible contact has already received this campaign."
      });
      setConfirmOpen(false);
      setCursor(undefined);
      setCursorStack([]);
      await Promise.all([mutate(), mutateLogs()]);
    } catch (cause) {
      toast({
        tone: "error",
        title: "Dispatch failed",
        description: cause instanceof ApiError ? cause.message : "Try again"
      });
    } finally {
      setBusy(false);
    }
  };

  const deleteCampaign = async () => {
    setBusy(true);
    try {
      await campaignService.remove(campaignId);
      toast({ tone: "success", title: "Campaign deleted" });
      navigate("/campaigns");
    } catch (cause) {
      toast({
        tone: "error",
        title: "Delete failed",
        description: cause instanceof ApiError ? cause.message : "Try again"
      });
      setBusy(false);
    }
  };

  if (error) {
    return (
      <EmptyState
        title="Campaign not found"
        description="It may have been deleted or belongs to another workspace."
        action={
          <Link
            to="/campaigns"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to campaigns
          </Link>
        }
      />
    );
  }

  if (isLoading && !campaign) {
    return <TableSkeleton rows={10} />;
  }

  if (!campaign) return null;

  const { stats } = campaign;
  const openRate = stats.sent ? (stats.opened / stats.sent) * 100 : 0;
  const clickRate = stats.sent ? (stats.clicked / stats.sent) * 100 : 0;
  const canDispatch = campaign.status !== "completed" && campaign.status !== "sending";

  return (
    <>
      <PageHeader
        title={campaign.title}
        description={`Created ${formatDateTime(campaign.createdAt)}`}
        actions={
          <>
            <Link
              to="/campaigns"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Campaigns
            </Link>
            <Button variant="secondary" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={!canDispatch}>
              <Send className="h-4 w-4" />
              {campaign.status === "completed" ? "Completed" : "Send now"}
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <CampaignStatusBadge status={campaign.status} />
        <span className="text-xs text-slate-500">
          {campaign.audienceType === "all_active"
            ? "Audience: all active contacts"
            : `Audience: ${campaign.audienceContactIds?.length ?? 0} selected contacts`}
        </span>
        {campaign.scheduledFor ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarClock className="h-3.5 w-3.5" />
            Scheduled {formatDateTime(campaign.scheduledFor)}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Recipients"
          value={formatNumber(stats.recipients)}
          hint="Campaign logs created"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Sent"
          value={formatNumber(stats.sent)}
          hint="Delivered to the mock provider"
          icon={<Send className="h-4 w-4" />}
          accent="slate"
        />
        <StatCard
          label="Open rate"
          value={formatPercent(openRate)}
          hint={`${formatNumber(stats.opened)} opened`}
          icon={<MailCheck className="h-4 w-4" />}
          accent="blue"
        />
        <StatCard
          label="Click rate"
          value={formatPercent(clickRate)}
          hint={`${formatNumber(stats.clicked)} clicked`}
          icon={<MousePointerClick className="h-4 w-4" />}
          accent="green"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader
            title="Recipient activity"
            description="Engagement is updated by signed provider webhooks"
          />
          {logsLoading && !logs ? (
            <TableSkeleton rows={7} />
          ) : !logs?.data.length ? (
            <EmptyState
              icon={<Send className="h-4 w-4" />}
              title="No sends recorded"
              description="Dispatch this campaign to create one log per active recipient."
              action={
                canDispatch ? (
                  <Button onClick={() => setConfirmOpen(true)}>Send now</Button>
                ) : undefined
              }
              className="border-0"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-2.5 font-bold">Contact</th>
                    <th className="px-4 py-2.5 font-bold">Status</th>
                    <th className="px-4 py-2.5 font-bold">Sent</th>
                    <th className="px-4 py-2.5 font-bold">Opened</th>
                    <th className="px-4 py-2.5 font-bold">Clicked</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.data.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-2.5">
                        <p className="text-sm font-medium text-slate-800">
                          {log.contact?.email ?? `Contact ${log.contactId}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          {[log.contact?.firstName, log.contact?.lastName]
                            .filter(Boolean)
                            .join(" ") || "—"}
                          {log.contact?.company ? ` · ${log.contact.company}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-2.5">
                        <LogStatusBadge status={log.status} />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {formatDateTime(log.sentAt)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {formatDateTime(log.openedAt)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {formatDateTime(log.clickedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">
              {logs?.data.length ?? 0} logs on this page
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                disabled={!cursorStack.length}
                onClick={() => {
                  setCursorStack((stack) => {
                    const next = [...stack];
                    const previous = next.pop();
                    setCursor(previous);
                    return next;
                  });
                }}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!logs?.pageInfo.hasMore}
                onClick={() => {
                  if (!logs?.pageInfo.nextCursor) return;
                  setCursorStack((stack) => [...stack, cursor]);
                  setCursor(logs.pageInfo.nextCursor ?? undefined);
                }}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Message" />
            <div className="p-5">
              <p className="text-sm font-semibold text-slate-900">{campaign.title}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                {campaign.content}
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Dispatch details" />
            <dl className="divide-y divide-slate-100">
              {[
                ["Audience", campaign.audienceType === "all_active" ? "All active contacts" : "Selected contacts"],
                ["Scheduled", campaign.scheduledFor ? formatDateTime(campaign.scheduledFor) : "—"],
                ["Created", formatDateTime(campaign.createdAt)],
                ["Updated", formatDateTime(campaign.updatedAt)]
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 px-5 py-3">
                  <dt className="text-xs font-medium text-slate-500">{label}</dt>
                  <dd className="text-right text-xs font-medium text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Dispatch campaign"
        description="Messages are sent through the active email provider."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={dispatchCampaign} disabled={busy}>
              {busy ? "Sending..." : "Dispatch now"}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-600">
          Send <span className="font-medium text-slate-900">{campaign.title}</span> to{" "}
          {campaign.audienceType === "all_active"
            ? "every active contact"
            : `${campaign.audienceContactIds?.length ?? 0} selected contacts`}
          ? Contacts that already received the campaign are skipped.
        </p>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete campaign"
        description="Campaign logs are removed by the cascade rule."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={deleteCampaign} disabled={busy}>
              {busy ? "Deleting..." : "Delete campaign"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Delete <span className="font-medium text-slate-900">{campaign.title}</span>? This
          cannot be undone.
        </p>
      </Modal>
    </>
  );
}
