import Link from "next/link";

export const metadata = { title: "구조와 법 - 아이핏" };

const ROLES = [
  {
    who: "아이핏 (플랫폼)",
    what: "얼굴 계측, 테 추천, 맞춤 치수 설계, 공장 발주, 테 판매, 안경원 연결",
    license: "면허 불필요",
    tone: "ok" as const,
  },
  {
    who: "제휴 공장",
    what: "설계 치수대로 테 제작 (3D 프린팅 / CNC 절삭 / 판재 가공)",
    license: "면허 불필요",
    tone: "ok" as const,
  },
  {
    who: "제휴 안경원",
    what: "최종 검안, 도수 렌즈 조제·판매, 피팅, A/S",
    license: "안경사 면허 필수",
    tone: "need" as const,
  },
];

const CHECKLIST = [
  {
    title: "안경테 단독 판매",
    body: "도수 렌즈가 들어가지 않은 테만 파는 것은 일반 공산품 판매로 보는 것이 통상적인 해석이고, 실제로 온라인 안경테 쇼핑몰이 다수 운영됩니다. 다만 '안경'의 범위를 어디까지로 보느냐는 해석의 여지가 있으니 사업 시작 전에 변호사 확인을 받으세요.",
  },
  {
    title: "제품 안전 인증 (KC)",
    body: "안경테와 선글라스는 생활용품 안전관리 대상에 해당할 수 있습니다. 자체 브랜드로 제조·수입해 판매한다면 어떤 인증 절차가 필요한지 국가기술표준원 기준을 확인해야 합니다.",
  },
  {
    title: "통신판매업 신고",
    body: "테를 온라인으로 직접 판매하면 통신판매업 신고 대상입니다. 관할 구청에 신고하고 사업자정보를 사이트에 표시해야 합니다.",
  },
  {
    title: "개인정보 처리방침 · 민감정보 동의",
    body: "얼굴 이미지와 처방 도수는 각각 생체정보·건강정보에 해당할 수 있어 별도 동의와 처리방침 고지가 필요합니다. 이 앱은 두 이미지를 저장하지 않고 도수는 별도 동의 시에만 저장하도록 만들어져 있지만, 실제 운영 시에는 처리방침 문서를 따로 갖춰야 합니다.",
  },
  {
    title: "안경원 제휴 수수료 구조",
    body: "연결 대가를 어떻게 받을지(정액 광고비/건당 수수료 등)는 관련 규제와 안경사 단체의 자율 규약을 함께 확인하는 편이 안전합니다.",
  },
];

export default function HowItWorks() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-ink-900">안경사가 아니어도 되는 이유</h1>
        <p className="mt-3 text-ink-800">
          「의료기사 등에 관한 법률」이 막는 것은 두 가지입니다. <strong>안경사가 아닌 사람이 안경업소를
          여는 것</strong>(제12조 제1항), 그리고 <strong>안경사가 아닌 사람이 도수 안경·콘택트렌즈를
          파는 것</strong>(제12조 제5항)입니다. 같은 조항은 안경사 본인에게도 전자상거래·통신판매를
          금지합니다.
        </p>
        <p className="mt-3 text-ink-800">
          그래서 아이핏은 <strong>도수 렌즈를 팔지 않습니다.</strong> 테를 만들어 파는 일과, 렌즈를
          조제해 파는 일을 주체부터 분리했습니다. 그러면 면허 없이도 앞쪽 절반을 맡을 수 있습니다.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-ink-900">누가 무엇을 하는가</h2>
        <div className="space-y-2">
          {ROLES.map((r) => (
            <div key={r.who} className="rounded-2xl border border-ink-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-ink-900">{r.who}</p>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    r.tone === "ok"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {r.license}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-700">{r.what}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-ink-900">돈이 어디로 가는가</h2>
        <div className="rounded-2xl border border-ink-200 bg-white p-5 text-sm leading-relaxed text-ink-800">
          <p>
            <strong>테 값</strong>은 아이핏이 받습니다. 공장 제작비와, 치수 설계·도면 검수·재제작
            A/S에 대한 몫으로 나뉩니다. 견적 화면에서 두 항목을 나눠 보여줍니다.
          </p>
          <p className="mt-2">
            <strong>렌즈 값</strong>은 안경원이 받습니다. 검안·조제·피팅이 모두 안경사의 일이고,
            결제도 매장에서 이뤄집니다. 아이핏은 렌즈 값을 대신 받지 않습니다.
          </p>
          <p className="mt-2">
            그래서 기성 테에는 매장 할인이 붙지만(안경원 재고), 맞춤 테에는 붙지 않습니다(플랫폼
            판매). 견적 계산도 그렇게 나눠 두었습니다.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-ink-900">시작 전에 확인할 것</h2>
        <ol className="space-y-3">
          {CHECKLIST.map((c, i) => (
            <li key={c.title} className="flex gap-3 rounded-2xl border border-ink-200 bg-white p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-800">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold text-ink-900">{c.title}</p>
                <p className="mt-0.5 text-sm text-ink-700">{c.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
        <p className="font-semibold">이 페이지는 법률 자문이 아닙니다.</p>
        <p className="mt-1">
          법 해석과 인허가 요건은 사업 형태에 따라 달라지고 시간이 지나면 바뀝니다. 실제로 사업을
          시작하기 전에는 반드시 변호사와 관할 기관에 확인하세요.
        </p>
      </section>

      <Link href="/fit" className="block text-center text-sm text-ink-700 underline">
        앱 써보기
      </Link>
    </div>
  );
}
