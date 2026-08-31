import Link from "next/link";
import { notFound } from "next/navigation";

import ResultView from "@/components/style/ResultView";
import { loadProfile } from "@/lib/style/store";

export const dynamic = "force-dynamic";

export default async function StyleResultPage({ params }: { params: { id: string } }) {
  const result = await loadProfile(params.id);
  if (!result) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/style" className="text-sm text-neutral-500 hover:text-neutral-800">
        ← 새로 진단하기
      </Link>
      <div className="mt-4">
        <ResultView result={result} sharePath={`/style/result/${params.id}`} />
      </div>
    </main>
  );
}
