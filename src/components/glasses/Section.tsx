export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warn" | "privacy";
  title?: string;
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-havruta-200 bg-havruta-50 text-havruta-800",
    warn: "border-amber-300 bg-amber-50 text-amber-900",
    privacy: "border-emerald-200 bg-emerald-50 text-emerald-900",
  }[tone];

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${styles}`}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-havruta-800">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-havruta-600">{hint}</span>}
    </label>
  );
}
