function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Greedy word wrap by character budget — good enough for a short serif quote. */
export function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if ((line + " " + word).trim().length > maxChars && line) {
      lines.push(line);
      line = word;
    } else line = (line + " " + word).trim();
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "…";
  }
  return lines;
}

/** Self-contained SVG (system serif fallback so it renders the same inside <canvas>). */
export function gratitudeCardSvg(grace: string, dateLabel: string): string {
  const lines = wrap(`“${grace}”`, 22, 6);
  const startY = 675 - ((lines.length - 1) * 78) / 2;
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return `<line x1="${540 + 46 * Math.cos(a)}" y1="${260 + 46 * Math.sin(a)}" x2="${540 + 64 * Math.cos(a)}" y2="${260 + 64 * Math.sin(a)}" stroke="#D6AC71" stroke-width="7" stroke-linecap="round"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="100%">
  <rect width="1080" height="1350" fill="#FCF9F3"/>
  <rect x="60" y="60" width="960" height="1230" rx="48" fill="none" stroke="#D6AC71" stroke-width="3"/>
  <path d="M300 1150V520a240 240 0 0 1 480 0v630" fill="none" stroke="#E9E2D8" stroke-width="3"/>
  ${rays}<circle cx="540" cy="260" r="32" fill="#D6AC71"/>
  <text x="540" y="430" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="34" letter-spacing="8" fill="#626B71">TODAY'S GRACE</text>
  ${lines.map((l, i) => `<text x="540" y="${startY + i * 78}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="62" fill="#253645">${esc(l)}</text>`).join("")}
  <text x="540" y="1110" text-anchor="middle" font-family="Georgia, serif" font-size="32" fill="#626B71">${esc(dateLabel)}</text>
  <text x="540" y="1200" text-anchor="middle" font-family="Georgia, serif" font-size="30" letter-spacing="10" fill="#8A6430">HELENA GRACE</text>
</svg>`;
}

export function svgToPngBlob(svg: string, width: number, height: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.replace('width="100%"', `width="${width}" height="${height}"`));
  });
}
