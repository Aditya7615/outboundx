import { useState } from "react";
import { Link } from "react-router-dom";
import useSWR from "swr";
import { ArrowRight, Plus, Send } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Input";
import { CampaignStatusBadge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { TableSkeleton } from "../components/ui/Skeleton";
import { campaignService } from "../services/campaigns";
import type { CampaignStatus } from "../services/types";
import { formatDate, formatNumber, formatPercent } from "../lib/format";

export default function CampaignsPage() {
  const [status, setStatus] = useState<CampaignStatus | "">("");
  const { data, error, isLoading } = useSWR(
    ["campaigns", status],
    () => campaignService.list(status),
    { keepPreviousData: true }
  );

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Draft, schedule and dispatch outbound sequences. Every send creates a typed campaign log per recipient."
        actions={
          <Link
            to="/campaigns/new"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-transparent bg-blue-600 px-3.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
          >
            <Plus className="h-4 w-4" />
            New campaign
          </Link>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value as CampaignStatus | "")}
              className="w-44"
              aria-label="Filter campaigns by status"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="sending">Sending</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
          <p className="text-xs text-slate-500">
            {data ? `${data.length} campaign${data.length === 1 ? "" : "s"}` : "Loading…"}
          </p>
        </div>

        {isLoading && !data ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <div className="p-6 text-sm text-red-600">Unable to load campaigns.</div>
        ) : !data?.length ? (
          <EmptyState
            icon={<Send className="h-4 w-4" />}
            title={status ? "No campaigns in this state" : "No campaigns yet"}
            description={
              status
                ? "Try another status filter."
                : "Build a campaign, pick an audience and dispatch it through the mock provider."
            }
            action={
              <Link
                to="/campaigns/new"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Build a campaign
              </Link>
            }
            className="border-0"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-2.5 font-bold">Campaign</th>
                  <th className="px-4 py-2.5 font-bold">Status</th>
                  <th className="px-4 py-2.5 text-right font-bold">Recipients</th>
                  <th className="px-4 py-2.5 text-right font-bold">Open rate</th>
                  <th className="px-4 py-2.5 text-right font-bold">Click rate</th>
                  <th className="px-4 py-2.5 font-bold">Created</th>
                  <th className="px-4 py-2.5 text-right font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="max-w-[340px] px-4 py-3">
                      <Link
                        to={`/campaigns/${campaign.id}`}
                        className="block truncate text-sm font-medium text-slate-800 hover:text-blue-700"
                      >
                        {campaign.title}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {campaign.content}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <CampaignStatusBadge status={campaign.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatNumber(campaign.stats.recipients)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {campaign.stats.sent
                        ? formatPercent((campaign.stats.opened / campaign.stats.sent) * 100)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {campaign.stats.sent
                        ? formatPercent((campaign.stats.clicked / campaign.stats.sent) * 100)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDate(
                        campaign.scheduledFor ?? campaign.createdAt
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/campaigns/${campaign.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
                      >
                        Open
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
