import { Link } from "react-router";
import { SunMark } from "../../components/ui/Logo";

export function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg p-6 text-center">
      <SunMark size={48} />
      <h1 className="text-4xl">This page wandered off</h1>
      <p className="text-muted">Let's bring you back somewhere peaceful.</p>
      <div className="flex gap-2">
        <Link to="/app/today" className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-white">
          Go to Today
        </Link>
        <Link to="/" className="inline-flex min-h-11 items-center rounded-full border border-gold px-5">
          Home
        </Link>
      </div>
    </main>
  );
}
