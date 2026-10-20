import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Logo } from "../../components/ui/Logo";

/** Plain-language notes for the demo. Not reviewed by counsel — see docs/RIGHTS_AND_COMPLIANCE.md. */
const CONTENT = {
  privacy: {
    title: "Privacy notes",
    items: [
      "This demo stores everything you enter (plans, rhythms, journal entries, intentions, Rosary progress) in your browser's IndexedDB on this device only.",
      "We do not run accounts, servers, analytics, advertising SDKs or trackers in this version. Nothing you write is transmitted to us or to third parties.",
      "Fonts are bundled with the app, so loading the app does not contact font services.",
      "Browser storage is not encrypted. Anyone with access to this device and browser profile could read your entries. Clearing site data deletes them.",
      "You can download a full JSON backup, export CSV files, and delete all data from You → Your data at any time.",
      "The early-access email form is not active yet and collects nothing. Before it opens, this page will be updated to explain what is collected, why, and how to unsubscribe.",
    ],
  },
  terms: {
    title: "Terms (preview)",
    items: [
      "Helena Grace is a free preview provided as is, for personal use, without warranties. Back up anything important.",
      "Helena Grace is independently created and is not affiliated with or endorsed by any diocese or official Catholic organization.",
      "It is a personal planning companion and does not replace the sacraments, your parish, or spiritual direction. Nothing in the app is theological or professional advice.",
      "There are no paid features in this preview. If paid plans are offered later, trial length, renewal, cancellation and refund terms will be shown clearly before purchase.",
      "Final terms will be published and reviewed before any public launch.",
    ],
  },
};

export function LegalPage({ kind }: { kind: keyof typeof CONTENT }) {
  const c = CONTENT[kind];
  return (
    <div className="paper min-h-dvh bg-bg">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link to="/" className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm text-gold-ink">
          <ArrowLeft size={16} aria-hidden="true" /> <Logo size={22} />
        </Link>
        <main>
          <h1 className="mb-6 text-5xl">{c.title}</h1>
          <ul className="list-disc space-y-3 pl-5 text-[1.02rem]">
            {c.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-muted">Last updated with this preview build. Not legal advice; pending professional review.</p>
        </main>
      </div>
    </div>
  );
}
