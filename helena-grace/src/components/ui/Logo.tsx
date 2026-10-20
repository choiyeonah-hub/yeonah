import { useId } from "react";

/**
 * Helena Grace symbol: a slender chapel arch framing a rising sun with 8 rays.
 * The cross is negative space cut out of the sun (via mask), so it works on any background.
 * Original geometry — not derived from any existing mark.
 */
export function SunMark({
  size = 32,
  color = "var(--hg-gold)",
  arch = true,
  title,
  className,
}: {
  size?: number;
  color?: string;
  arch?: boolean;
  title?: string;
  className?: string;
}) {
  const maskId = useId();
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const [r1, r2] = arch ? [12, 16] : [14, 21];
    const cx = 32;
    const cy = arch ? 37 : 32;
    return (
      <line
        key={i}
        x1={cx + r1 * Math.cos(a)}
        y1={cy + r1 * Math.sin(a)}
        x2={cx + r2 * Math.cos(a)}
        y2={cy + r2 * Math.sin(a)}
        stroke={color}
        strokeWidth={arch ? 2.2 : 3.4}
        strokeLinecap="round"
      />
    );
  });
  const cy = arch ? 37 : 32;
  const r = arch ? 8 : 10;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
    >
      <mask id={maskId}>
        <rect width="64" height="64" fill="#fff" />
        <rect x={32 - 1.1} y={cy - r + 1.5} width="2.2" height={2 * r - 3} fill="#000" />
        <rect x={32 - r / 2 - 0.5} y={cy - 2.6} width={r + 1} height="2.2" fill="#000" />
      </mask>
      {arch && (
        <>
          <path d="M12 57V29a20 20 0 0 1 40 0v28" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M7 57h50" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        </>
      )}
      {rays}
      <circle cx="32" cy={cy} r={r} fill={color} mask={`url(#${maskId})`} />
    </svg>
  );
}

export function Wordmark({ className = "", tone = "ink" }: { className?: string; tone?: "ink" | "light" }) {
  return (
    <span
      className={`font-display whitespace-nowrap uppercase ${tone === "ink" ? "text-ink" : "text-white"} ${className}`}
      style={{ letterSpacing: "0.22em", fontWeight: 500 }}
    >
      Helena Grace
    </span>
  );
}

export function Logo({ size = 28, className = "", textClass = "text-[1.05rem]" }: { size?: number; className?: string; textClass?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <SunMark size={size} />
      <Wordmark className={textClass} />
    </span>
  );
}
