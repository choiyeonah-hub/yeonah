import Link from "next/link";

const STEPS = [
  {
    title: "얼굴 비율 재기",
    body: "사진 한 장으로 얼굴형·얼굴폭·콧대 높이·눈 간격을 재고, 사진 없이 얼굴형을 직접 골라도 됩니다.",
  },
  {
    title: "도수 읽기",
    body: "안과·안경원에서 받은 처방전을 찍어 올리면 SPH·CYL·AXIS·ADD·PD를 읽어 채워줍니다. 직접 입력해도 되고, 몰라도 진행됩니다.",
  },
  {
    title: "테 고르기",
    body: "얼굴형뿐 아니라 얼굴폭 대비 테 전체폭, PD와 광학 중심 정렬, 콧대와 코받침, 도수와 렌즈 두께까지 합산해 점수를 매깁니다.",
  },
  {
    title: "렌즈 고르기",
    body: "도수에 맞는 굴절률(1.56~1.74)과 코팅·기능을 추천하고, 노안 가입도가 있으면 누진렌즈를 잡아줍니다.",
  },
  {
    title: "가격 비교 · 예약",
    body: "테와 렌즈를 정한 뒤 동네 안경원과 전국 체인의 예상 견적을 비교하고, 방문 예약 코드를 받습니다.",
  },
];

export default function GlassesHome() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold leading-tight text-havruta-900">
          얼굴에 맞는 안경,
          <br />
          남의 기준 말고 내 비율로.
        </h1>
        <p className="mt-3 text-havruta-800">
          시중 안경 사이즈는 서구권 두상을 기준으로 만들어진 게 많습니다. 코받침이 낮아 흘러내리거나,
          전체폭이 커서 관자놀이에 안 맞는 일이 그래서 생깁니다. 아이핏은 사진에 보이는{" "}
          <strong>실제 얼굴 비율</strong>로 계산하고, 아시안핏 여부까지 따집니다.
        </p>
        <p className="mt-2 text-sm text-havruta-700">
          성별을 묻지 않고, 외모 점수도 매기지 않습니다. 누구나 같은 방식으로 씁니다.
        </p>
        <Link
          href="/glasses/fit"
          className="mt-5 inline-block rounded-xl bg-havruta-600 px-6 py-3 font-semibold text-white"
        >
          내 얼굴에 맞는 안경 찾기
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-havruta-900">진행 순서</h2>
        <ol className="space-y-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-2xl border border-havruta-200 bg-white p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-havruta-500 text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold text-havruta-900">{s.title}</p>
                <p className="mt-0.5 text-sm text-havruta-700">{s.body}</p>
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
            · 저장되는 건 얼굴형·비율 같은 <strong>파생 숫자</strong>뿐이고, 그것도 매장 예약을
            확정할 때만 기록됩니다.
          </li>
          <li>
            · 처방 도수는 개인정보보호법상 <strong>민감정보</strong>입니다. 매장에 전달할지는 예약
            단계에서 <strong>따로 동의</strong>를 받고, 동의하지 않아도 예약은 됩니다.
          </li>
          <li>· 사진을 아예 올리지 않고 얼굴형만 직접 골라서 끝까지 진행할 수도 있습니다.</li>
        </ul>
      </section>
    </div>
  );
}
