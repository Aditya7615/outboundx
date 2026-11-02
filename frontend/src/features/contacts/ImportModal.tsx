import { useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { contactService } from "../../services/contacts";
import type { ImportSummary } from "../../services/types";
import { ApiError } from "../../services/api";
import { formatNumber } from "../../lib/format";

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

const template = [
  "email,first_name,last_name,company,phone,status",
  "maya.holt@brightpath.io,Maya,Holt,BrightPath,+1 415 555 0191,active",
  "daniel.reyes@stackline.dev,Daniel,Reyes,Stackline,+1 415 555 0192,active"
].join("\n");

export function ImportModal({ open, onClose, onImported }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setSummary(null);
    setError(null);
    setSubmitting(false);
  }, [open]);

  const downloadTemplate = () => {
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "outboundx-contacts-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const submit = async () => {
    if (!file) {
      setError("Choose a CSV file first");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await contactService.importCsv(file);
      setSummary(result);
      onImported();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Unable to import CSV");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import contacts"
      description="Bulk import a CSV. Files are parsed as a stream in batches of 500 rows."
      footer={
        summary ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting || !file}>
              {submitting ? "Importing..." : "Start import"}
            </Button>
          </>
        )
      }
    >
      {summary ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Rows", summary.total],
              ["Imported", summary.imported],
              ["Duplicates", summary.skipped],
              ["Invalid", summary.invalid]
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {label}
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {formatNumber(Number(value))}
                </p>
              </div>
            ))}
          </div>

          {summary.errors.length ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800">Rows that need attention</p>
              <ul className="mt-2 space-y-1 text-xs text-amber-700">
                {summary.errors.map((item) => (
                  <li key={`${item.row}-${item.message}`}>
                    Row {item.row}: {item.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Import complete. Duplicates are skipped by the unique (workspace, email)
              index.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center hover:border-blue-300 hover:bg-blue-50/40"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500">
              <Upload className="h-4 w-4" />
            </span>
            <span className="mt-3 text-sm font-medium text-slate-800">
              {file ? file.name : "Choose a CSV file"}
            </span>
            <span className="mt-1 text-xs text-slate-500">
              Up to 5 MB · 20,000 rows · UTF-8
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError(null);
            }}
          />

          <div className="flex items-start justify-between gap-3 rounded-md border border-slate-200 p-3">
            <div className="flex items-start gap-2.5">
              <FileSpreadsheet className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs font-semibold text-slate-700">Need the format?</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  email, first_name, last_name, company, phone, status
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5" />
              Template
            </Button>
          </div>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
