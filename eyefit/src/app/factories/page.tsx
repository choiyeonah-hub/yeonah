import Link from "next/link";
import { FACTORIES, PRODUCTION_METHODS } from "@/lib/factories";
import { won } from "@/lib/format";

export const metadata = { title: "제휴 공장 - 아이핏" };

export default function FactoriesPage() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-ink-900">제휴 공장</h1>
        <p className="mt-3 text-ink-800">
          맞춤 테는 아이핏이 설계 치수를 만들어 공장에 발주합니다. 공장을 고를 때 가장 중요한 건
          단가가 아니라 <strong>1개를 만들 수 있는지</strong>입니다. 금형으로 찍는 공법은 개당 단가가
          싸지만 최소 수량과 금형비가 있어서, 사람마다 다른 치수를 만드는 데는 쓸 수 없습니다.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-ink-900">제작 공법</h2>
        <div className="space-y-2">
          {Object.entries(PRODUCTION_METHODS).map(([id, m]) => (
            <div key={id} className="rounded-2xl border border-ink-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-ink-900">{m.label}</p>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    m.oneOff ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {m.oneOff ? "1개부터 제작 가능" : "양산 전용 (금형 필요)"}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-700">{m.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-ink-900">공장 목록</h2>
        <div className="space-y-3">
          {FACTORIES.map((f) => (
            <div key={f.id} className="rounded-2xl border border-ink-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink-900">{f.name}</p>
                  <p className="text-xs text-ink-600">
                    {f.country} {f.region} ·{" "}
                    {f.methods.map((m) => PRODUCTION_METHODS[m].label).join(", ")}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    f.oneOffCapable
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {f.oneOffCapable ? "맞춤 1개 가능" : "양산만"}
                </span>
              </div>

              <p className="mt-2 text-sm text-ink-700">{f.note}</p>

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-ink-600">맞춤 1개 단가</dt>
                  <dd className="font-medium text-ink-900">
                    {f.oneOffUnitCost != null ? won(f.oneOffUnitCost) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-600">양산 최소 수량</dt>
                  <dd className="font-medium text-ink-900">{f.moq.toLocaleString("ko-KR")}개</dd>
                </div>
                <div>
                  <dt className="text-ink-600">양산 개당</dt>
                  <dd className="font-medium text-ink-900">{won(f.bulkUnitCost)}</dd>
                </div>
                <div>
                  <dt className="text-ink-600">금형비</dt>
                  <dd className="font-medium text-ink-900">
                    {f.toolingCost === 0 ? "없음" : won(f.toolingCost)}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 text-xs text-ink-600">
                맞춤 제작 리드타임 {f.leadDays}일 · 재질 {f.materials.join(" / ")} · 인증{" "}
                {f.certifications.join(", ")}
              </p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs leading-relaxed text-ink-600">
        위 공장 정보는 실제 생산지를 참고해 구성한 데모 데이터입니다. 실제 제휴 시에는 견적서를 받아
        단가·최소 수량·리드타임만 갈아끼우면 나머지 계산은 그대로 동작합니다.
      </p>

      <Link href="/fit" className="block text-center text-sm text-ink-700 underline">
        맞춤 제작 해보기
      </Link>
    </div>
  );
}
