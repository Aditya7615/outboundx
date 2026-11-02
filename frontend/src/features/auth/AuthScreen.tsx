import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Send } from "lucide-react";
import { useAuth } from "./auth-context";
import { ApiError } from "../../services/api";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Input";
import { cn } from "../../lib/cn";

const highlights = [
  "Cursor-fast audience lists built for large contact books",
  "Signed webhook events keep engagement metrics honest",
  "Provider-ready sending with clean campaign logs"
];

export function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === "login";
  const from = (location.state as { from?: string } | null)?.from;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate(from && from !== "/login" ? from : "/dashboard", { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = () => {
    setEmail("demo@outboundx.dev");
    setPassword("Demo@12345");
    setError(null);
  };

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-slate-900 p-10 lg:flex xl:p-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600">
              <Send className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">OutboundX</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Outbound operations
              </p>
            </div>
          </div>

          <h1 className="mt-16 max-w-md text-3xl font-semibold leading-tight tracking-tight text-white">
            Outbound campaigns, from first import to final click.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
            A focused workspace for teams that treat cold outreach like an operating
            discipline, not a spreadsheet.
          </p>

          <ul className="mt-10 space-y-4">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800">
                  <Check className="h-3 w-3 text-blue-400" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative grid grid-cols-3 gap-4 border-t border-slate-800 pt-6">
          {[
            ["Signed", "webhook events"],
            ["Cursor", "contact pagination"],
            ["Typed", "API contracts"]
          ].map(([value, label]) => (
            <div key={value}>
              <p className="text-sm font-semibold text-white">{value}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wider text-slate-500">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600">
              <Send className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-900">OutboundX</span>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
            {isLogin ? "Sign in" : "Create workspace"}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {isLogin ? "Welcome back" : "Start your workspace"}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            {isLogin
              ? "Use your account to open the outbound workspace."
              : "Create an account to manage audiences and campaigns."}
          </p>

          <form className="mt-7 space-y-4" onSubmit={submit}>
            {!isLogin ? (
              <Field label="Full name" htmlFor="name">
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ada Lovelace"
                  autoComplete="name"
                  required
                  minLength={2}
                />
              </Field>
            ) : null}

            <Field label="Work email" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                minLength={isLogin ? 1 : 8}
              />
            </Field>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
              {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </form>

          {isLogin ? (
            <button
              type="button"
              onClick={fillDemo}
              className="mt-3 w-full rounded-md border border-dashed border-slate-300 px-3 py-2.5 text-left hover:border-blue-300 hover:bg-blue-50/40"
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Demo workspace
              </span>
              <span className="mt-0.5 block text-xs text-slate-600">
                demo@outboundx.dev · Demo@12345
              </span>
            </button>
          ) : null}

          <p className="mt-6 text-center text-xs text-slate-500">
            {isLogin ? "New to OutboundX? " : "Already have an account? "}
            <Link
              to={isLogin ? "/register" : "/login"}
              className={cn("font-semibold text-blue-700 hover:text-blue-800")}
            >
              {isLogin ? "Create an account" : "Sign in"}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
