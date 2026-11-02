import { ArrowUpRight, Check, Copy, KeyRound, UserRound, Webhook } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useAuth } from "../features/auth/auth-context";
import { useToast } from "../components/ui/toast-context";
import { formatDate } from "../lib/format";

const webhookSnippet = `POST /api/webhooks/email
x-webhook-signature: <hex hmac sha256>

{
  "messageId": "mock_7f18...",
  "type": "opened",        // opened | clicked
  "timestamp": "2026-02-10T12:00:00.000Z"
}`;

const signatureSnippet = `const expected = crypto
  .createHmac("sha256", process.env.WEBHOOK_SECRET)
  .update(rawBody)
  .digest("hex");

// timingSafeEqual(expected, provided);`;

function CopyRow({ label, value }: { label: string; value: string }) {
  const { toast } = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ tone: "success", title: "Copied to clipboard" });
    } catch {
      toast({ tone: "error", title: "Clipboard is unavailable" });
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 break-all font-mono text-xs text-slate-700">{value}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={copy}>
        <Copy className="h-3.5 w-3.5" />
        Copy
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const origin = window.location.origin;
  const webhookUrl = `${origin}/api/webhooks/email`;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Workspace identity and the integration surface used by the outbound stack."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Profile"
            description="Session identity attached to every API request"
          />
          <div className="p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-600">
                {user?.name
                  .split(" ")
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
            </div>

            <dl className="mt-6 divide-y divide-slate-100 border-t border-slate-100">
              {[
                ["Workspace role", "Owner"],
                ["Member since", user ? formatDate(user.createdAt) : "—"],
                ["Authentication", "JWT · httpOnly cookie"]
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between py-3">
                  <dt className="text-xs font-medium text-slate-500">{label}</dt>
                  <dd className="text-xs font-medium text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-2 flex items-start gap-2.5 rounded-md border border-green-200 bg-green-50 p-3">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-700" />
              <p className="text-xs leading-relaxed text-green-800">
                Session cookies are httpOnly and sameSite=lax. Bearer tokens are accepted
                for API clients and Swagger.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="API access"
            description="Typed REST endpoints documented with OpenAPI"
            actions={
              <a
                href="/api/docs"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
              >
                Open Swagger
                <ArrowUpRight className="h-3 w-3" />
              </a>
            }
          />
          <div>
            <CopyRow label="API base" value={`${origin}/api`} />
            <CopyRow label="OpenAPI JSON" value={`${origin}/api/openapi.json`} />
          </div>
          <div className="border-t border-slate-100 p-5">
            <div className="flex items-start gap-2.5">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-xs font-semibold text-slate-700">Authenticate</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Use the session cookie set by <code className="font-mono">POST /auth/login</code>{" "}
                  or send <code className="font-mono">Authorization: Bearer &lt;token&gt;</code>.
                  All contact and campaign routes are scoped to the signed-in workspace.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Email provider webhook"
            description="Opened and clicked events upgrade campaign logs monotonically"
            actions={
              <span className="inline-flex items-center gap-1.5 rounded border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                <Webhook className="h-3 w-3" />
                Signature verified
              </span>
            }
          />
          <div className="grid gap-0 lg:grid-cols-2">
            <div className="border-b border-slate-200 lg:border-b-0 lg:border-r">
              <CopyRow label="Endpoint" value={webhookUrl} />
              <CopyRow label="Signature header" value="x-webhook-signature" />
              <CopyRow label="Secret" value="WEBHOOK_SECRET (server-side only)" />
              <div className="p-5">
                <p className="text-xs font-semibold text-slate-700">Payload contract</p>
                <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-200">
                  {webhookSnippet}
                </pre>
              </div>
            </div>
            <div className="p-5">
              <p className="text-xs font-semibold text-slate-700">Verify the signature</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                The raw request body is hashed with HMAC-SHA256 before JSON parsing. Invalid
                or missing signatures return 401 and never touch the database.
              </p>
              <pre className="mt-3 overflow-x-auto rounded-md bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-200">
                {signatureSnippet}
              </pre>

              <div className="mt-4 flex items-start gap-2.5 rounded-md border border-slate-200 bg-slate-50 p-3">
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <p className="text-xs leading-relaxed text-slate-600">
                  A utility script is available at{" "}
                  <code className="font-mono">backend/scripts/send-test-webhook.ts</code> for
                  local verification.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
