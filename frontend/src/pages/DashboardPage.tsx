import { Suspense, lazy, useState } from "react";
import { Link } from "react-router-dom";
import useSWR from "swr";
import {
  ArrowRight,
  Inbox,
  MailCheck,
  MousePointerClick,
  Send,
  Users
} from "lucide-react";
import { analyticsService } from "../services/analytics";
import { campaignService } from "../services/campaigns";
import { PageHeader } from "../components/layout/PageHeader";
import { StatCard } from "../components/layout/StatCard";
import { Card, CardHeader } from "../components/ui/Card";
import { CampaignStatusBadge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { formatDate, formatNumber, formatPercent } from "../lib/format";

const PerformanceCharts = lazy(
  () => import("../features/dashboard/PerformanceCharts")
);

const ranges = [7, 30, 90];

export default function DashboardPage() {
  const [days, setDays] = useState(30);
  const {
    data: overview,
    error,
    isLoading
  } = useSWR(["analytics", days], () => analyticsService.overview(days), {
    keepPreviousData: true
  });
  const { data: campaigns, isLoading: campaignsLoading } = useSWR(
    "campaigns:recent",
    () => campaignService.list()
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A live read on audience health, sending volume and engagement."
        actions={
          <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-0.5">
            {ranges.map((range) => (
              <button
                key={range}
                onClick={() => setDays(range)}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  days === range
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                {range}d
              </button>
            ))}
          </div>
        }
      />

      {error ? (
        <Card className="mb-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Unable to load analytics. Refresh the page or check the API.
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading || !overview ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[118px] w-full" />
          ))
        ) : (
          <>
            <StatCard
              label="Total contacts"
              value={formatNumber(overview.totals.contacts)}
              hint={`${formatNumber(overview.totals.activeContacts)} active and sendable`}
              icon={<Users className="h-4 w-4" />}
            />
            <StatCard
              label="Active campaigns"
              value={formatNumber(overview.totals.activeCampaigns)}
              hint={`${formatNumber(overview.totals.campaigns)} campaigns total`}
              icon={<Send className="h-4 w-4" />}
              accent="amber"
            />
            <StatCard
              label="Emails sent"
              value={formatNumber(overview.totals.sent)}
              hint={`${formatNumber(overview.totals.opened)} opened · ${formatNumber(
                overview.totals.clicked
              )} clicked`}
              icon={<MailCheck className="h-4 w-4" />}
              accent="blue"
            />
            <StatCard
              label="Open rate"
              value={formatPercent(overview.rates.openRate)}
              hint={`${formatPercent(overview.rates.clickRate)} click-through rate`}
              icon={<MousePointerClick className="h-4 w-4" />}
              accent="green"
            />
          </>
        )}
      </div>

      <div className="mt-6">
        {isLoading || !overview ? (
          <div className="grid gap-6 xl:grid-cols-2">
            <Skeleton className="h-[360px] w-full" />
            <Skeleton className="h-[360px] w-full" />
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="grid gap-6 xl:grid-cols-2">
                <Skeleton className="h-[360px] w-full" />
                <Skeleton className="h-[360px] w-full" />
              </div>
            }
          >
            <PerformanceCharts overview={overview} />
          </Suspense>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader
            title="Recent campaigns"
            description="The latest campaigns in this workspace"
            actions={
              <Link
                to="/campaigns"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-6 py-2.5 font-bold">Campaign</th>
                  <th className="px-4 py-2.5 font-bold">Status</th>
                  <th className="px-4 py-2.5 text-right font-bold">Sent</th>
                  <th className="px-4 py-2.5 text-right font-bold">Open</th>
                  <th className="px-6 py-2.5 text-right font-bold">Created</th>
                </tr>
              </thead>
              <tbody>
                {campaignsLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-xs text-slate-400">
                      Loading campaigns…
                    </td>
                  </tr>
                ) : campaigns?.length ? (
                  campaigns.slice(0, 6).map((campaign) => (
                    <tr
                      key={campaign.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-6 py-3">
                        <Link
                          to={`/campaigns/${campaign.id}`}
                          className="font-medium text-slate-800 hover:text-blue-700"
                        >
                          {campaign.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <CampaignStatusBadge status={campaign.status} />
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {formatNumber(campaign.stats.sent)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {campaign.stats.sent
                          ? formatPercent((campaign.stats.opened / campaign.stats.sent) * 100)
                          : "—"}
                      </td>
                      <td className="px-6 py-3 text-right text-xs text-slate-500">
                        {formatDate(campaign.createdAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <p className="text-sm font-medium text-slate-700">No campaigns yet</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Create your first campaign to start measuring engagement.
                      </p>
                      <Link
                        to="/campaigns/new"
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-700"
                      >
                        Build a campaign
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Engagement funnel"
            description="How far recipients move through the sequence"
          />
          <div className="space-y-5 p-6">
            {overview?.funnel.map((stage, index) => {
              const sent = overview.funnel[0]?.value ?? 0;
              const width = sent > 0 ? Math.max((stage.value / sent) * 100, 2) : 0;
              const color =
                index === 0 ? "bg-slate-300" : index === 1 ? "bg-blue-500" : "bg-green-600";
              return (
                <div key={stage.stage}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">{stage.stage}</span>
                    <span className="text-slate-500">
                      {formatNumber(stage.value)}
                      {sent > 0 ? ` · ${formatPercent((stage.value / sent) * 100)}` : ""}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-sm bg-slate-100">
                    <div className={`h-full ${color}`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}

            {overview && overview.funnel[0]?.value === 0 ? (
              <EmptyState
                icon={<Inbox className="h-4 w-4" />}
                title="No sends recorded"
                description="Engagement appears as soon as a campaign is dispatched."
                className="border-0 bg-transparent py-6"
              />
            ) : null}

            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-700">Provider status</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Mock provider is delivering messages. Opened and clicked events are
                accepted through the signed webhook endpoint.
              </p>
              <Link
                to="/settings"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-700"
              >
                View webhook setup
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
