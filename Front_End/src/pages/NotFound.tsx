import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-strong">
          404 · Not found
        </p>
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          That page doesn&rsquo;t exist.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The URL you requested is not part of RxAssist. Return to your patient
          list to continue.
        </p>
        <Link
          to="/patients"
          className="mt-6 inline-flex items-center rounded-md border border-border bg-surface px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Go to patients
        </Link>
      </div>
    </div>
  );
}
