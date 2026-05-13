import Link from "next/link";
import { FileSearch, LockKeyhole, Scale } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f7f9fc] px-4 py-10 text-[#07142f] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-3 text-xl font-bold text-slate-950"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <FileSearch aria-hidden="true" className="h-5 w-5" />
          </span>
          ClarityDoc
        </Link>

        <section className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-[0.95fr_1.05fr]">
          <div className="border-b border-slate-200 bg-[#f7fbff] p-8 lg:border-r lg:border-b-0">
            <p className="inline-flex rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Account access
            </p>
            <h1 className="mt-5 max-w-xl text-4xl font-bold tracking-normal text-slate-950">
              Sign in before opening your workspace.
            </h1>

            <div className="mt-8 space-y-4 text-sm leading-6 text-slate-600">
              <div className="flex gap-3">
                <Scale
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 flex-none text-amber-700"
                />
                <span>
                  ClarityDoc provides informational analysis, not legal advice.
                </span>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="mx-auto max-w-sm">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <LockKeyhole aria-hidden="true" className="h-6 w-6" />
              </span>
              <h2 className="mt-5 text-2xl font-bold text-slate-950">Login</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Authentication is intentionally not faked in this local build.
              </p>

              <div className="mt-6 space-y-4">
                <label className="block text-sm font-semibold text-slate-900">
                  Email
                  <input
                    type="email"
                    disabled
                    placeholder="name@company.com"
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-900">
                  Password
                  <input
                    type="password"
                    disabled
                    placeholder="Not enabled locally"
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"
                  />
                </label>
              </div>

              <Link
                href="/dashboard"
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Continue to dashboard
              </Link>
              <Link
                href="/"
                className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Back to landing page
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
