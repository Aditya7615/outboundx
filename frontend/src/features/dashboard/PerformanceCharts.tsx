import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card, CardHeader } from "../../components/ui/Card";
import type { AnalyticsOverview } from "../../services/types";
import { formatShortDate } from "../../lib/format";

const axis = { fontSize: 11, fill: "#64748b" };
const grid = "#e2e8f0";

const tooltipStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  boxShadow: "0 4px 6px -1px rgb(15 23 42 / 0.08)",
  fontSize: 12,
  color: "#0f172a"
};

export default function PerformanceCharts({
  overview
}: {
  overview: AnalyticsOverview;
}) {
  const campaignData = overview.campaigns.map((campaign) => ({
    name:
      campaign.title.length > 18
        ? `${campaign.title.slice(0, 18)}…`
        : campaign.title,
    Sent: campaign.sent,
    Opened: campaign.opened,
    Clicked: campaign.clicked
  }));

  const dailyData = overview.daily.map((point) => ({
    date: formatShortDate(point.date),
    Sent: point.sent,
    Opened: point.opened,
    Clicked: point.clicked
  }));

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader
          title="Campaign performance"
          description="Sent, opened and clicked per campaign"
        />
        <div className="h-72 p-4">
          {campaignData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={{ stroke: grid }} />
                <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f1f5f9" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="square" iconSize={8} />
                <Bar dataKey="Sent" fill="#cbd5e1" radius={[2, 2, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Opened" fill="#60a5fa" radius={[2, 2, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Clicked" fill="#2563eb" radius={[2, 2, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-500">
              Dispatch a campaign to populate performance data.
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Daily engagement"
          description={`Activity across the last ${overview.rangeDays} days`}
        />
        <div className="h-72 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis
                dataKey="date"
                tick={axis}
                tickLine={false}
                axisLine={{ stroke: grid }}
                minTickGap={24}
              />
              <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" iconSize={12} />
              <Line
                type="monotone"
                dataKey="Sent"
                stroke="#94a3b8"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="Opened"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="Clicked"
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
