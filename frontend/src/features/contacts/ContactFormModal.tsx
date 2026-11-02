import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select } from "../../components/ui/Input";
import { contactService, type ContactInput } from "../../services/contacts";
import type { Contact, ContactStatus } from "../../services/types";
import { ApiError } from "../../services/api";

interface ContactFormModalProps {
  open: boolean;
  contact: Contact | null;
  onClose: () => void;
  onSaved: (contact: Contact) => void;
}

interface FormState {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  status: ContactStatus;
}

const emptyForm: FormState = {
  email: "",
  firstName: "",
  lastName: "",
  company: "",
  phone: "",
  status: "active"
};

export function ContactFormModal({
  open,
  contact,
  onClose,
  onSaved
}: ContactFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      contact
        ? {
            email: contact.email,
            firstName: contact.firstName ?? "",
            lastName: contact.lastName ?? "",
            company: contact.company ?? "",
            phone: contact.phone ?? "",
            status: contact.status
          }
        : emptyForm
    );
  }, [open, contact]);

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload: ContactInput = {
      email: form.email.trim(),
      firstName: form.firstName.trim() || undefined,
      lastName: form.lastName.trim() || undefined,
      company: form.company.trim() || undefined,
      phone: form.phone.trim() || undefined,
      status: form.status
    };

    try {
      const saved = contact
        ? await contactService.update(contact.id, payload)
        : await contactService.create(payload);
      onSaved(saved);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Unable to save contact");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={contact ? "Edit contact" : "Add contact"}
      description={
        contact
          ? "Update the contact record used in future campaigns."
          : "Add a single contact to the audience."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="contact-form" disabled={submitting}>
            {submitting ? "Saving..." : contact ? "Save changes" : "Add contact"}
          </Button>
        </>
      }
    >
      <form id="contact-form" onSubmit={submit} className="space-y-4">
        <Field label="Email address" htmlFor="contact-email">
          <Input
            id="contact-email"
            type="email"
            required
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            placeholder="lead@company.com"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="contact-first">
            <Input
              id="contact-first"
              value={form.firstName}
              onChange={(event) => update("firstName", event.target.value)}
              placeholder="Maya"
            />
          </Field>
          <Field label="Last name" htmlFor="contact-last">
            <Input
              id="contact-last"
              value={form.lastName}
              onChange={(event) => update("lastName", event.target.value)}
              placeholder="Holt"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" htmlFor="contact-company">
            <Input
              id="contact-company"
              value={form.company}
              onChange={(event) => update("company", event.target.value)}
              placeholder="BrightPath"
            />
          </Field>
          <Field label="Phone" htmlFor="contact-phone">
            <Input
              id="contact-phone"
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
              placeholder="+1 415 555 0100"
            />
          </Field>
        </div>

        <Field label="Status" htmlFor="contact-status">
          <Select
            id="contact-status"
            value={form.status}
            onChange={(event) => update("status", event.target.value)}
          >
            <option value="active">Active</option>
            <option value="unsubscribed">Unsubscribed</option>
          </Select>
        </Field>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
