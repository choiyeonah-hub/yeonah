import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { X } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-[#1b2a37] border border-ink",
  secondary: "bg-surface text-ink border border-gold/70 hover:bg-tint",
  ghost: "bg-transparent text-ink border border-transparent hover:bg-tint",
  danger: "bg-surface text-warning border border-warning/60 hover:bg-[#fbefe6]",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-5 text-[0.95rem] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function IconButton({ label, children, className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-tint disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "", as: As = "section", ...rest }: { children: ReactNode; className?: string; as?: "section" | "div" | "article"; "aria-labelledby"?: string }) {
  return (
    <As {...rest} className={`rounded-[20px] border border-line bg-surface p-5 shadow-[0_1px_0_rgb(37_54_69/0.03)] ${className}`}>
      {children}
    </As>
  );
}

export function CardTitle({ id, children, eyebrow, action }: { id?: string; children: ReactNode; eyebrow?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        {eyebrow && <p className="mb-0.5 text-xs font-medium uppercase tracking-[0.14em] text-gold-ink">{eyebrow}</p>}
        <h2 id={id} className="text-2xl">
          {children}
        </h2>
      </div>
      {action}
    </div>
  );
}

const inputBase =
  "w-full rounded-2xl border bg-surface px-4 py-2.5 text-base text-ink placeholder:text-muted/80 focus:border-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-ink";

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string; className: string }) => ReactNode;
}) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": describedBy, className: `${inputBase} ${error ? "border-warning" : "border-line"}` })}
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="text-sm text-warning" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-4 py-6 text-center">
      <svg width="28" height="16" viewBox="0 0 28 16" aria-hidden="true">
        <path d="M2 15a12 12 0 0 1 24 0" fill="none" stroke="var(--hg-gold)" strokeWidth="1.6" />
      </svg>
      <p className="font-display text-xl">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
      {action}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <p role="status" className="py-4 text-sm text-muted">
      {label}
    </p>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-2xl border border-warning/40 bg-[#fbefe6] px-4 py-3 text-sm text-warning">
      Something went wrong reading your saved data: {message}. Your browser may be blocking storage (private mode can do this).
    </p>
  );
}

export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      if (typeof d.showModal === "function") d.showModal();
      else d.setAttribute("open", "");
    } else if (!open && d.open) {
      if (typeof d.close === "function") d.close();
      else d.removeAttribute("open");
    }
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(560px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-3xl border border-line bg-surface p-0 text-ink backdrop:bg-ink/30"
    >
      {open && (
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 id={titleId} className="text-2xl">
              {title}
            </h2>
            <IconButton label="Close" onClick={onClose}>
              <X size={20} aria-hidden="true" />
            </IconButton>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function Chip({ pressed, onClick, children, label }: { pressed: boolean; onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm transition-colors ${
        pressed ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink hover:bg-tint"
      }`}
    >
      {children}
    </button>
  );
}
