import { type ReactNode } from "react";
import { NavLink, useMatch, useNavigate, useParams } from "react-router-dom";
import {
  Users,
  BookMarked,
  FileText,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getPatient } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { provider, logout } = useAuth();
  const navigate = useNavigate();
  const { id: patientIdParam } = useParams();
  const patientId = patientIdParam ? Number(patientIdParam) : undefined;

  const { data: patient } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => getPatient(patientId!),
    enabled: !!patientId && !Number.isNaN(patientId),
  });

  const initials = getInitials(provider?.physicianName ?? "");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar — 240px fixed */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[5px] bg-primary text-primary-foreground">
            <span className="text-[13px] font-bold leading-none">Rx</span>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">
            RxAssist
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarSection label="Workspace">
            <SidebarLink to="/patients" icon={<Users className="h-4 w-4" />}>
              Patients
            </SidebarLink>
            <SidebarLink
              to="/formulary"
              icon={<BookMarked className="h-4 w-4" />}
              disabled
            >
              Formulary
            </SidebarLink>
            <SidebarLink
              to="/drafts"
              icon={<FileText className="h-4 w-4" />}
              disabled
            >
              Prior Auth Drafts
            </SidebarLink>
          </SidebarSection>
        </nav>

        <div className="border-t border-sidebar-border px-5 py-4">
          <p className="text-[11px] leading-relaxed text-sidebar-muted">
            RxAssist is a clinical workflow tool. It does not replace payer
            processes or clinical judgment.
          </p>
        </div>
      </aside>

      {/* Main column, offset by sidebar */}
      <div className="md:pl-60">
        {/* Top bar — 56px */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-surface/95 px-6 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            {patient ? (
              <button
                type="button"
                onClick={() => navigate(`/patients/${patient.id}`)}
                className="group inline-flex min-w-0 items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1 text-left text-sm text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Current patient ${patient.patient_name}`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary">
                  {getInitials(patient.patient_name)}
                </span>
                <span className="truncate font-medium">
                  {patient.patient_name}
                </span>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  · Formulary {patient.formulary_id}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {provider ? (
              <>
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium leading-tight text-foreground">
                    {provider.physicianName}
                  </p>
                  <p className="text-xs leading-tight text-muted-foreground">
                    {provider.practiceName}
                  </p>
                </div>
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-[11px] font-semibold text-foreground"
                  aria-hidden
                >
                  {initials}
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : null}
          </div>
        </header>

        {/* Content area — single column, 860px max */}
        <main className="mx-auto w-full max-w-[860px] px-6 py-10">
          {children}
        </main>

        <footer className="mx-auto w-full max-w-[860px] px-6 pb-10">
          <p className="text-[11px] text-muted-foreground">
            RxAssist is a clinical workflow tool. It does not replace payer
            processes or clinical judgment.
          </p>
        </footer>
      </div>
    </div>
  );
}

function SidebarSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-6 last:mb-0">
      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-sidebar-muted">
        {label}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function SidebarLink({
  to,
  icon,
  children,
  disabled,
}: {
  to: string;
  icon: ReactNode;
  children: ReactNode;
  disabled?: boolean;
}) {
  const match = useMatch({ path: to, end: false });
  const active = !!match && !disabled;

  if (disabled) {
    return (
      <span
        className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-sidebar-muted/70"
        title="Coming soon"
      >
        {icon}
        <span>{children}</span>
        <span className="ml-auto rounded-sm border border-border px-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
          Soon
        </span>
      </span>
    );
  }

  return (
    <NavLink
      to={to}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-surface-muted hover:text-sidebar-foreground"
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary"
        />
      ) : null}
      <span className={active ? "text-primary" : "text-muted-foreground"}>
        {icon}
      </span>
      <span className="font-medium">{children}</span>
    </NavLink>
  );
}

function getInitials(name: string): string {
  const parts = name.replace(/\b(dr\.?|mr\.?|mrs\.?|ms\.?)/gi, "").trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "··";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
