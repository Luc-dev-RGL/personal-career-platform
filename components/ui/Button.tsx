import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-bg font-semibold hover:bg-accent-hover active:scale-[0.98] transition",
  secondary:
    "bg-transparent border border-line-strong text-ink hover:border-accent hover:text-accent transition active:scale-[0.98]",
  ghost: "bg-transparent text-muted hover:text-ink transition",
  danger:
    "bg-transparent border border-danger/40 text-danger hover:bg-danger/10 transition",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-[0.95rem]",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
