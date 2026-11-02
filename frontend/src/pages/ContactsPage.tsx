import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Users
} from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Select } from "../components/ui/Input";
import { ContactStatusBadge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { TableSkeleton } from "../components/ui/Skeleton";
import { Modal } from "../components/ui/Modal";
import { useToast } from "../components/ui/Toast";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { contactService } from "../services/contacts";
import type { Contact, ContactStatus } from "../services/types";
import { ContactFormModal } from "../features/contacts/ContactFormModal";
import { ImportModal } from "../features/contacts/ImportModal";
import { formatDate, formatNumber, initials } from "../lib/format";

const PAGE_SIZE = 25;

export default function ContactsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<ContactStatus | "">("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<Array<string | undefined>>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    setCursor(undefined);
    setCursorStack([]);
  }, [debouncedSearch, status]);

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate
  } = useSWR(
    ["contacts", debouncedSearch, status, cursor],
    () =>
      contactService.list({
        search: debouncedSearch || undefined,
        status: status || undefined,
        cursor,
        limit: PAGE_SIZE
      }),
    { keepPreviousData: true }
  );

  const { data: stats, mutate: mutateStats } = useSWR("contact-stats", () =>
    contactService.stats()
  );

  const pageNumber = cursorStack.length + 1;

  const refresh = async () => {
    await Promise.all([mutate(), mutateStats()]);
  };

  const handleSaved = async (contact: Contact) => {
    setFormOpen(false);
    setEditing(null);
    toast({
      tone: "success",
      title: editing ? "Contact updated" : "Contact added",
      description: contact.email
    });
    await refresh();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await contactService.remove(deleting.id);
      toast({ tone: "success", title: "Contact deleted", description: deleting.email });
      setDeleting(null);
      await refresh();
    } catch {
      toast({ tone: "error", title: "Could not delete contact" });
    } finally {
      setDeleteBusy(false);
    }
  };

  const rows = useMemo(() => data?.data ?? [], [data]);

  const goNext = () => {
    if (!data?.pageInfo.nextCursor) return;
    setCursorStack((stack) => [...stack, cursor]);
    setCursor(data.pageInfo.nextCursor ?? undefined);
  };

  const goPrevious = () => {
    setCursorStack((stack) => {
      if (!stack.length) return stack;
      const next = [...stack];
      const previous = next.pop();
      setCursor(previous);
      return next;
    });
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("");
  };

  return (
    <>
      <PageHeader
        title="Audiences"
        description="Manage the contact book that campaigns are sent to. Lists use cursor pagination for stable reads as data changes."
        actions={
          <>
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add contact
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          ["Total contacts", stats?.total],
          ["Active", stats?.active],
          ["Unsubscribed", stats?.unsubscribed]
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-md border border-slate-200 bg-white px-4 py-3"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {label}
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {value === undefined ? "—" : formatNumber(Number(value))}
            </p>
          </div>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search email, name or company"
                className="w-72 pl-8"
                aria-label="Search contacts"
              />
            </div>
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value as ContactStatus | "")}
              aria-label="Filter by status"
              className="w-40"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="unsubscribed">Unsubscribed</option>
            </Select>
            {search || status ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-slate-500">
            {isValidating && !isLoading ? "Refreshing…" : `${rows.length} rows on this page`}
          </p>
        </div>

        {isLoading && !data ? (
          <TableSkeleton rows={8} />
        ) : error ? (
          <div className="p-6 text-sm text-red-600">Unable to load contacts.</div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Users className="h-4 w-4" />}
            title={search || status ? "No matching contacts" : "Your audience is empty"}
            description={
              search || status
                ? "Try a different search term or clear the status filter."
                : "Add contacts manually or import a CSV to start building campaigns."
            }
            action={
              search || status ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4" />
                  Import contacts
                </Button>
              )
            }
            className="border-0"
          />
        ) : (
          <div className="max-h-[calc(100vh-430px)] overflow-auto scrollbar-thin">
            <table className="min-w-full">
              <thead className="table-head sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2.5 font-bold">Contact</th>
                  <th className="px-4 py-2.5 font-bold">Company</th>
                  <th className="px-4 py-2.5 font-bold">Phone</th>
                  <th className="px-4 py-2.5 font-bold">Status</th>
                  <th className="px-4 py-2.5 font-bold">Added</th>
                  <th className="px-4 py-2.5 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className={isValidating ? "opacity-60" : undefined}>
                {rows.map((contact) => {
                  const name =
                    [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
                    contact.email;
                  return (
                    <tr
                      key={contact.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[10px] font-semibold text-slate-600">
                            {initials(name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {name}
                            </p>
                            <p className="truncate text-xs text-slate-500">{contact.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {contact.company ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {contact.phone ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <ContactStatusBadge status={contact.status} />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {formatDate(contact.createdAt)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditing(contact);
                              setFormOpen(true);
                            }}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label={`Edit ${contact.email}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleting(contact)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            aria-label={`Delete ${contact.email}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500">
            Page {pageNumber} · {rows.length} of {formatNumber(stats?.total ?? 0)} contacts
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={goPrevious}
              disabled={!cursorStack.length}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={goNext}
              disabled={!data?.pageInfo.hasMore}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      <ContactFormModal
        open={formOpen}
        contact={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          void refresh();
        }}
      />

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete contact"
        description="This also removes the contact from campaign logs through the cascade rule."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleteBusy}>
              {deleteBusy ? "Deleting..." : "Delete contact"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Delete <span className="font-medium text-slate-900">{deleting?.email}</span> from
          this workspace? This cannot be undone.
        </p>
      </Modal>
    </>
  );
}
