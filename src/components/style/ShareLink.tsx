"use client";

import { useEffect, useState } from "react";

export default function ShareLink({ path }: { path: string }) {
  const [url, setUrl] = useState(path);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}${path}`);
  }, [path]);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-neutral-100 p-3">
      <code className="flex-1 truncate rounded-lg bg-white px-3 py-2 font-mono text-xs text-neutral-700">
        {url}
      </code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* 클립보드 권한이 없으면 주소를 직접 복사하면 된다 */
          }
        }}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-700"
      >
        {copied ? "복사됨!" : "링크 복사"}
      </button>
    </div>
  );
}
