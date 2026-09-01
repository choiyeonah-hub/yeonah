import Link from "next/link";

const STEPS = [
  {
    title: "도수를 넣습니다",
    body: "처방전을 찍어 올리면 SPH·CYL·AXIS·ADD·PD를 읽어 채웁니다. 직접 입력해도 됩니다. 어느 쪽이든 도수는 저장하지 않습니다.",
  },
  {
    title: "테 치수를 넣습니다",
    body: "안경 다리 안쪽 각인에 52□18 145처럼 적혀 있습니다. 같은 도수라도 테가 크면 훨씬 두꺼워지기 때문에, 이 숫자가 도수만큼 중요합니다.",
  },
  {
    title: "굴절률별 두께가 나옵니다",
    body: "1.56 / 1.60 / 1.67 / 1.74에서 렌즈가 실제 몇 mm가 되는지, 무게는 몇 g인지, 한 단계 올릴 때 0.1mm당 얼마를 더 내는지 보여줍니다.",
  },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-bold leading-tight text-ink-900">
          &ldquo;이 도수면 1.74 가셔야죠&rdquo;
          <br />
          <span className="text-ink-600">정말 그런가요?</span>
        </h1>
        <p className="mt-4 text-ink-800">
          안경원에서 더 비싼 렌즈를 권할 때, 소비자에게는 그게 맞는 말인지 판단할 근거가 없습니다.
          그런데 렌즈 두께는 <strong>도수와 테 치수만 알면 계산됩니다.</strong> 광학 공식으로요.
        </p>
        <p className="mt-3 text-ink-800">
          이 도구는 그 계산을 대신 해서, <strong>몇 mm 차이에 얼마를 더 내는지</strong>를 숫자로
          보여줍니다. 결론만 주지 않고 계산식까지 전부 공개합니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/check" className="rounded-xl bg-ink-600 px-6 py-3 font-semibold text-white">
            내 도수로 계산해보기
          </Link>
          <Link
            href="/quotes"
            className="rounded-xl border border-ink-300 px-6 py-3 font-semibold text-ink-800"
          >
            다른 사람들이 낸 금액
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-ink-200 bg-white p-5">
        <h2 className="text-lg font-bold text-ink-900">예를 들면 이런 답이 나옵니다</h2>
        <ul className="mt-3 space-y-3 text-sm leading-relaxed text-ink-800">
          <li>
            · <strong>−3.00D에 50□18 테</strong> — 1.56으로도 가장자리가 3.8mm입니다. 1.74까지
            올리면 3.0mm. <strong>0.8mm를 위해 15만원을 더 냅니다.</strong>
          </li>
          <li>
            · <strong>−7.00D에 54mm 큰 테</strong> — 여기서는 1.74가 값을 합니다. 도수가 높으면
            굴절률 차이가 실제로 크게 벌어집니다.
          </li>
          <li>
            · <strong>테를 4mm 작은 걸로 바꾸면</strong> 굴절률을 한 단계 올리는 것보다 더 얇아지는
            경우가 많습니다. 그러면서 돈은 덜 듭니다.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-ink-900">쓰는 법</h2>
        <ol className="space-y-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-2xl border border-ink-200 bg-white p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-500 text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold text-ink-900">{s.title}</p>
                <p className="mt-0.5 text-sm text-ink-700">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="text-lg font-bold text-emerald-900">도수를 저장하지 않습니다</h2>
        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-emerald-900">
          <li>
            · 처방 도수는 개인정보보호법상 <strong>민감정보</strong>입니다. 이 도구는 계정도 없고,
            도수를 DB에 넣지도 않습니다.
          </li>
          <li>
            · 두께 계산은 <strong>브라우저 안에서</strong> 끝납니다. 도수를 직접 입력하면 서버로
            아무것도 가지 않습니다.
          </li>
          <li>
            · 처방전 사진으로 자동 입력할 때만 판독 서버를 한 번 거치고, 그 이미지는 응답과 함께
            버려집니다.
          </li>
          <li>
            · 금액 제보에도 도수는 받지 않습니다. 지역·굴절률·옵션·금액만 남습니다.
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
        <p className="font-semibold">이 도구는 진단하지 않습니다.</p>
        <p className="mt-1">
          렌즈 두께 계산은 참고용 추정입니다. 실제 두께는 제조사의 렌즈 설계와 테 모양에 따라
          달라지고, 최종 판단은 검안한 안경사의 몫입니다. 도수 자체에 대한 판단은 안과 의사와
          안경사의 검사 결과를 따르세요.
        </p>
      </section>
    </div>
  );
}
