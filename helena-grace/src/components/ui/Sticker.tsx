import type { StickerId } from "../../data/types";
import { STICKERS } from "../../content/labels";

/** Small Sunday Atelier stickers, drawn as plain SVG. */
export function Sticker({ id, size = 18 }: { id: StickerId; size?: number }) {
  if (id === "none") return null;
  const common = { width: size, height: size, viewBox: "0 0 20 20", role: "img" as const, "aria-label": `${STICKERS[id]} sticker` };
  switch (id) {
    case "sun":
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="4" fill="#e2b77d" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return <line key={i} x1={10 + 6 * Math.cos(a)} y1={10 + 6 * Math.sin(a)} x2={10 + 8.5 * Math.cos(a)} y2={10 + 8.5 * Math.sin(a)} stroke="#d6ac71" strokeWidth="1.4" strokeLinecap="round" />;
          })}
        </svg>
      );
    case "flower":
      return (
        <svg {...common}>
          {Array.from({ length: 5 }, (_, i) => {
            const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
            return <circle key={i} cx={10 + 4.5 * Math.cos(a)} cy={10 + 4.5 * Math.sin(a)} r="3.4" fill="#ebc9c7" />;
          })}
          <circle cx="10" cy="10" r="2.4" fill="#d6ac71" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <path d="M10 2l2 5.6 6 .3-4.7 3.7 1.6 5.8L10 14l-4.9 3.4 1.6-5.8L2 7.9l6-.3z" fill="#f1dcae" stroke="#d6ac71" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      );
    case "ribbon":
      return (
        <svg {...common}>
          <path d="M6 2h8v15l-4-3-4 3z" fill="#d4e3e5" stroke="#9fbcc0" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      );
    case "bead":
      return (
        <svg {...common}>
          {[4, 10, 16].map((x) => (
            <circle key={x} cx={x} cy="10" r="2.6" fill="#aebdae" />
          ))}
        </svg>
      );
  }
}
