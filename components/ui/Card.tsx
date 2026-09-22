import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border border-line bg-elevated", className)}>{children}</div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        <h3 className="display text-[0.95rem] font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "info" | "success" | "danger" | "warning";
  className?: string;
}) {
  const tones = {
    neutral: "border-line text-muted",
    accent: "border-accent/40 text-accent bg-accent-dim",
    info: "border-info/40 text-info bg-info-dim",
    success: "border-success/40 text-success",
    danger: "border-danger/40 text-danger",
    warning: "border-warning/40 text-warning",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Numérotation éditoriale "01." utilisée dans les titres de section */
export function SectionNumber({ n }: { n: string }) {
  return <span className="label-mono mr-3 text-accent">{n}</span>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line px-6 py-14 text-center">
      <p className="display text-lg text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}
