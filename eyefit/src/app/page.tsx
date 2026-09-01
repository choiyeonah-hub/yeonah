import Link from "next/link";

const STEPS = [
  {
    title: "얼굴 비율 재기",
    body: "사진 한 장으로 얼굴형·얼굴폭·콧대 높이·눈 간격을 잽니다. 사진 없이 얼굴형을 직접 골라도 끝까지 진행됩니다.",
  },
  {
    title: "도수 읽기",
    body: "안과·안경원에서 받은 처방전을 찍어 올리면 SPH·CYL·AXIS·ADD·PD를 읽어 채워줍니다. 직접 입력해도 되고, 몰라도 진행됩니다.",
  },
  {
    title: "테 정하기",
    body: "기성품 중 적합도 순으로 고르거나, 얼굴 계측값에서 치수를 뽑아 제휴 공장에 맞춤 제작을 넣습니다.",
  },
  {
    title: "렌즈 고르기",
    body: "도수에 맞는 굴절률(1.56~1.74)과 코팅·기능을 추천하고, 노안 가입도가 있으면 누진렌즈를 잡아줍니다.",
  },
  {
    title: "가격 비교 · 예약",
    body: "동네 안경원과 전국 체인의 예상 견적을 비교하고, 매장에서 보여줄 6자리 코드를 받습니다.",
  },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold leading-tight text-ink-900">
          얼굴에 맞는 안경,
          <br />
          남의 기준 말고 내 비율로.
        </h1>
        <p className="mt-3 text-ink-800">
          시중 안경 사이즈는 서구권 두상을 기준으로 만들어진 게 많습니다. 코받침이 낮아 흘러내리거나,
          전체폭이 커서 관자놀이에 안 맞는 일이 그래서 생깁니다. 아이핏은 사진에 보이는{" "}
          <strong>실제 얼굴 비율</strong>로 계산하고, 맞지 않으면 <strong>그 치수로 새로 만듭니다</strong>.
        </p>
        <p className="mt-2 text-sm text-ink-700">
          성별을 묻지 않고, 외모 점수도 매기지 않습니다. 누구나 같은 방식으로 씁니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/fit" className="rounded-xl bg-ink-600 px-6 py-3 font-semibold text-white">
            내 얼굴에 맞는 안경 찾기
          </Link>
          <Link
            href="/how-it-works"
            className="rounded-xl border border-ink-300 px-6 py-3 font-semibold text-ink-800"
          >
            어떻게 굴러가는지 보기
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-ink-200 bg-white p-5">
        <h2 className="text-lg font-bold text-ink-900">기성품과 맞춤 제작, 둘 다 됩니다</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-ink-50 p-4">
            <p className="font-semibold text-ink-900">기성품에서 고르기</p>
            <p className="mt-1 text-sm text-ink-700">
              다섯 축으로 적합도를 매겨 순서대로 보여줍니다. 당일 수령까지 가능합니다.
            </p>
          </div>
          <div className="rounded-xl bg-ink-50 p-4">
            <p className="font-semibold text-ink-900">맞춤 제작하기</p>
            <p className="mt-1 text-sm text-ink-700">
              전체폭·브릿지·코받침 높이를 얼굴에서 뽑아 제휴 공장에 발주합니다. 3D 프린팅은 1개부터
              제작됩니다.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-ink-900">진행 순서</h2>
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
        <h2 className="text-lg font-bold text-emerald-900">개인정보를 다루는 방식</h2>
        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-emerald-900">
          <li>
            · <strong>얼굴 사진과 처방전 이미지는 저장하지 않습니다.</strong> 분석하는 동안만 서버
            메모리에 있다가 응답과 함께 사라집니다.
          </li>
          <li>
            · 저장되는 건 얼굴형·비율 같은 <strong>파생 숫자</strong>뿐이고, 그것도 주문을 확정할
            때만 기록됩니다.
          </li>
          <li>
            · 처방 도수는 개인정보보호법상 <strong>민감정보</strong>입니다. 안경원에 전달할지는
            <strong> 따로 동의</strong>를 받고, 동의하지 않아도 예약은 됩니다.
          </li>
          <li>· 공장에는 설계 치수만 넘어갑니다. 도수와 연락처는 전달되지 않습니다.</li>
        </ul>
      </section>
    </div>
  );
}
