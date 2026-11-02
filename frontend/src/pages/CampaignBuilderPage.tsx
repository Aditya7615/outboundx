import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useSWR from "swr";
import { ArrowLeft, ArrowRight, Check, Search, Send, Users } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, Textarea } from "../components/ui/Input";
import { useToast } from "../components/ui/Toast";
import { contactService } from "../services/contacts";
import { campaignService } from "../services/campaigns";
import type { Contact } from "../services/types";
import { ApiError } from "../services/api";
import { formatNumber, initials } from "../lib/format";
import { cn } from "../lib/cn";

const steps = ["Details", "Audience", "Schedule"];

function minimumDateTime(): string {
  const date = new Date(Date.now() + 5 * 60 * 1000);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export default function CampaignBuilderPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audienceType, setAudienceType] = useState<"all_active" | "selected">("all_active");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledFor, setScheduledFor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: audience, isLoading: audienceLoading } = useSWR(
    "campaign-audience",
    () => contactService.audience()
  );
  const { data: contactStats } = useSWR("contact-stats", () => contactService.stats());

  const filteredAudience = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return audience ?? [];
    return (audience ?? []).filter((contact) =>
      [contact.email, contact.firstName, contact.lastName, contact.company]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(term))
    );
  }, [audience, search]);

  const activeCount = contactStats?.active ?? audience?.length ?? 0;
  const selectedCount = audienceType === "all_active" ? activeCount : selectedIds.size;

  const toggleContact = (contact: Contact) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(contact.id)) next.delete(contact.id);
      else next.add(contact.id);
      return next;
    });
  };

  const validateStep = (): string | null => {
    if (step === 0) {
      if (title.trim().length < 2) return "Give the campaign a title";
      if (content.trim().length < 10) return "Write at least 10 characters of content";
    }
    if (step === 1 && audienceType === "selected" && selectedIds.size === 0) {
      return "Select at least one contact";
    }
    if (step === 2 && scheduleMode === "later") {
      if (!scheduledFor) return "Choose a date and time";
      if (new Date(scheduledFor).getTime() <= Date.now()) {
        return "Scheduled time must be in the future";
      }
    }
    return null;
  };

  const next = () => {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const submit = async () => {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const campaign = await campaignService.create({
        title: title.trim(),
        content: content.trim(),
        audienceType,
        audienceContactIds:
          audienceType === "selected" ? Array.from(selectedIds) : undefined,
        scheduledFor:
          scheduleMode === "later" ? new Date(scheduledFor).toISOString() : undefined
      });

      if (scheduleMode === "now") {
        const result = await campaignService.dispatch(campaign.id);
        toast({
          tone: "success",
          title: "Campaign dispatched",
          description: `${formatNumber(result.sent)} message(s) sent through the mock provider.`
        });
      } else {
        toast({
          tone: "success",
          title: "Campaign scheduled",
          description: "The scheduler will dispatch it when the time arrives."
        });
      }

      navigate(`/campaigns/${campaign.id}`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Unable to create campaign");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="New campaign"
        description="Define the message, choose an audience from the contact book, then send now or schedule it."
        actions={
          <Link
            to="/campaigns"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to campaigns
          </Link>
        }
      />

      <ol className="mb-6 flex items-center gap-2 overflow-x-auto">
        {steps.map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <button
              onClick={() => {
                if (index < step) setStep(index);
              }}
              disabled={index > step}
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium",
                index === step
                  ? "bg-slate-900 text-white"
                  : index < step
                    ? "bg-white text-slate-700 hover:bg-slate-100"
                    : "text-slate-400"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
                  index === step
                    ? "border-slate-700 bg-slate-800 text-white"
                    : index < step
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-slate-200 bg-white text-slate-400"
                )}
              >
                {index < step ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              {label}
            </button>
            {index < steps.length - 1 ? (
              <span className="h-px w-6 bg-slate-200" />
            ) : null}
          </li>
        ))}
      </ol>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader
            title={steps[step] ?? "Details"}
            description={
              step === 0
                ? "Write the outbound message. Keep it short and specific."
                : step === 1
                  ? "Send to every active contact or hand-pick recipients."
                  : "Dispatch immediately or schedule the send."
            }
          />
          <div className="p-6">
            {step === 0 ? (
              <div className="space-y-5">
                <Field label="Campaign title" htmlFor="campaign-title">
                  <Input
                    id="campaign-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Q2 founder outreach"
                    maxLength={180}
                  />
                </Field>
                <Field
                  label="Email content"
                  htmlFor="campaign-content"
                  hint="Plain text. Personalisation tokens can be added by your provider layer."
                >
                  <Textarea
                    id="campaign-content"
                    rows={12}
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder="Hi there, I noticed your team is scaling outbound…"
                    maxLength={20000}
                  />
                </Field>
                <p className="text-xs text-slate-500">{content.length} characters</p>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setAudienceType("all_active")}
                    className={cn(
                      "rounded-md border p-4 text-left",
                      audienceType === "all_active"
                        ? "border-blue-600 bg-blue-50/40 ring-1 ring-blue-600"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600">
                        <Users className="h-4 w-4" />
                      </span>
                      {audienceType === "all_active" ? (
                        <Check className="h-4 w-4 text-blue-600" />
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-900">All active contacts</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {audienceLoading && contactStats === undefined
                        ? "Counting audience…"
                        : `${formatNumber(activeCount)} active contacts`}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudienceType("selected")}
                    className={cn(
                      "rounded-md border p-4 text-left",
                      audienceType === "selected"
                        ? "border-blue-600 bg-blue-50/40 ring-1 ring-blue-600"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600">
                        <Send className="h-4 w-4" />
                      </span>
                      {audienceType === "selected" ? (
                        <Check className="h-4 w-4 text-blue-600" />
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-900">Selected contacts</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {selectedIds.size} contact{selectedIds.size === 1 ? "" : "s"} selected
                    </p>
                  </button>
                </div>

                {audienceType === "selected" ? (
                  <div className="rounded-md border border-slate-200">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-2.5">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search active contacts"
                          className="h-8 pl-8 text-xs"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setSelectedIds((current) => {
                            const nextSet = new Set(current);
                            for (const contact of filteredAudience) nextSet.add(contact.id);
                            return nextSet;
                          })
                        }
                      >
                        Select visible
                      </Button>
                    </div>
                    <div className="max-h-64 overflow-auto">
                      {filteredAudience.length ? (
                        filteredAudience.map((contact) => {
                          const name =
                            [contact.firstName, contact.lastName]
                              .filter(Boolean)
                              .join(" ") || contact.email;
                          return (
                            <label
                              key={contact.id}
                              className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-0 hover:bg-slate-50"
                            >
                              <input
                                type="checkbox"
                                checked={selectedIds.has(contact.id)}
                                onChange={() => toggleContact(contact)}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                              />
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                                {initials(name)}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-medium text-slate-700">
                                  {name}
                                </span>
                                <span className="block truncate text-[11px] text-slate-500">
                                  {contact.email}
                                </span>
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {contact.company}
                              </span>
                            </label>
                          );
                        })
                      ) : (
                        <p className="p-6 text-center text-xs text-slate-500">
                          No active contacts match that search.
                        </p>
                      )}
                    </div>
                    {audience && audience.length >= 100 ? (
                      <p className="border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500">
                        Showing the 100 most recent active contacts. Search narrows this list.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setScheduleMode("now")}
                    className={cn(
                      "rounded-md border p-4 text-left",
                      scheduleMode === "now"
                        ? "border-blue-600 bg-blue-50/40 ring-1 ring-blue-600"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <p className="text-sm font-medium text-slate-900">Send now</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Dispatch immediately after creating the campaign.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleMode("later")}
                    className={cn(
                      "rounded-md border p-4 text-left",
                      scheduleMode === "later"
                        ? "border-blue-600 bg-blue-50/40 ring-1 ring-blue-600"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <p className="text-sm font-medium text-slate-900">Schedule</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      A background scheduler picks it up when due.
                    </p>
                  </button>
                </div>

                {scheduleMode === "later" ? (
                  <Field label="Send at" htmlFor="scheduled-for">
                    <Input
                      id="scheduled-for"
                      type="datetime-local"
                      value={scheduledFor}
                      min={minimumDateTime()}
                      onChange={(event) => setScheduledFor(event.target.value)}
                    />
                  </Field>
                ) : null}

                <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Dispatch behaviour
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Active contacts are resolved at dispatch time. Each recipient gets one
                    campaign log with a provider message id used by the webhook handler.
                  </p>
                </div>
              </div>
            ) : null}

            {error ? (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
              <Button
                variant="secondary"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={step === 0 || submitting}
              >
                Back
              </Button>
              {step < steps.length - 1 ? (
                <Button onClick={next}>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={submit} disabled={submitting}>
                  {submitting
                    ? "Working..."
                    : scheduleMode === "now"
                      ? "Create and send"
                      : "Schedule campaign"}
                </Button>
              )}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Summary" description="Review before dispatch" />
            <dl className="divide-y divide-slate-100">
              {[
                ["Title", title || "Untitled campaign"],
                ["Audience", audienceType === "all_active" ? "All active" : "Selected"],
                [
                  "Recipients",
                  audienceType === "all_active"
                    ? formatNumber(activeCount)
                    : formatNumber(selectedIds.size)
                ],
                [
                  "Timing",
                  scheduleMode === "now"
                    ? "Immediate"
                    : scheduledFor
                      ? new Date(scheduledFor).toLocaleString()
                      : "Not set"
                ]
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 px-5 py-3">
                  <dt className="text-xs font-medium text-slate-500">{label}</dt>
                  <dd className="max-w-[60%] text-right text-xs font-medium text-slate-800">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Message preview" />
            <div className="p-5">
              <p className="text-xs font-semibold text-slate-800">
                {title || "Campaign title"}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                {content || "Your email content will appear here."}
              </p>
              <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                {selectedCount} recipient{selectedCount === 1 ? "" : "s"} in this dispatch
              </p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
