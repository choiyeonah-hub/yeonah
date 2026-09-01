import Link from "next/link";

export const metadata = { title: "이미 있는 서비스 - 아이핏" };

type Player = {
  name: string;
  where: string;
  what: string;
  overlap: "동일" | "유사" | "부분";
  url: string;
};

/**
 * 경쟁 서비스 조사 결과 (2026년 9월 기준).
 * 만들기 전에 알아야 할 내용이라 앱 안에 남겨둔다. 수치는 조사 시점의 공개 자료 기준이다.
 */
const PLAYERS: Player[] = [
  {
    name: "브리즘 (BRISM)",
    where: "한국",
    what: "매장 3D 스캐너로 얼굴 1,200개 포인트·18개 지표를 재고 3D 프린팅으로 맞춤 안경을 만듭니다. 약 7일 제작, 매장 5곳, 누적 1.3만 명·매출 50억 원 규모. 2026년 1월 미국 진출용 전용 앱을 냈습니다.",
    overlap: "동일",
    url: "https://breezm.com/",
  },
  {
    name: "라운즈 (Rounz)",
    where: "한국",
    what: "실시간 가상피팅 + AI 얼굴 67개 좌표 분석 + 얼굴형 8종 분류 + 맞춤 추천. 도수 렌즈 온라인 판매 규제를 '안경원 배송'으로 우회하는 구조를 이미 운영 중이고 누적 1만 건을 넘겼습니다. 이스트소프트 자회사.",
    overlap: "동일",
    url: "https://apps.apple.com/kr/app/id1375822406",
  },
  {
    name: "Topology Eyewear",
    where: "미국",
    what: "iOS 앱으로 얼굴을 스캔해 2만여 개 측정값을 뽑고, 기성 디자인을 21개 치수로 조정합니다. 3D 프린팅 대신 아세테이트 CNC 절삭과 스테인리스 레이저 커팅을 씁니다. 관련 미국 특허를 여러 건 보유.",
    overlap: "유사",
    url: "https://www.topologyeyewear.com/",
  },
  {
    name: "YOU MAWO",
    where: "독일",
    what: "iPhone/iPad 카메라로 20초 만에 얼굴을 스캔해 11개 치수를 뽑고 SLS 3D 프린팅으로 제작합니다. 15개국 약 800개 안경원에 공급.",
    overlap: "유사",
    url: "https://www.youmawo.com/",
  },
  {
    name: "Fittingbox",
    where: "프랑스",
    what: "안경 가상피팅 전문 20년. Dior, Louis Vuitton 등 브랜드에 기술을 공급합니다.",
    overlap: "부분",
    url: "https://fittingbox.com/",
  },
];

const TONE = {
  동일: "bg-rose-100 text-rose-900",
  유사: "bg-amber-100 text-amber-900",
  부분: "bg-slate-100 text-slate-700",
} as const;

export default function Landscape() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-ink-900">이미 있는 서비스</h1>
        <p className="mt-3 text-ink-800">
          이 아이디어는 새롭지 않습니다. 한국에만 두 곳이 같은 걸 하고 있고, 미국과 독일에도
          자리 잡은 회사가 있습니다. 만들기 전에 알아야 할 내용이라 앱 안에 정리해 둡니다.
        </p>
      </section>

      <section className="space-y-3">
        {PLAYERS.map((p) => (
          <a
            key={p.name}
            href={p.url}
            target="_blank"
            rel="noreferrer noopener"
            className="block rounded-2xl border border-ink-200 bg-white p-5 hover:border-ink-400"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-ink-900">
                {p.name} <span className="text-sm font-normal text-ink-600">{p.where}</span>
              </p>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TONE[p.overlap]}`}>
                겹침 {p.overlap}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">{p.what}</p>
          </a>
        ))}
      </section>

      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
        <h2 className="font-bold text-amber-900">특허와 소송 리스크</h2>
        <div className="mt-2 space-y-3 text-sm leading-relaxed text-amber-900">
          <p>
            <strong>Topology(Bespoke, Inc.)가 미국 특허를 여럿 갖고 있습니다.</strong> US 11366343,
            11592691, 12130499 등이 "얼굴의 3D 스캔으로 기성 안경테를 조정하는 방법"을 다룹니다.
            대표 청구항은 3D 스캔 → 치수 추출 → 3D 모델 조정 → 렌더링 미리보기 → 물리적 조정
            지시서 생성으로 이어지는 흐름을 잡고 있습니다.
          </p>
          <p>
            아이핏은 3D 스캔이 아니라 <strong>2D 사진에서 비율을 재는</strong> 방식이라 문자
            그대로는 이 청구항 밖일 수 있지만, 이건 변리사의 <strong>FTO(자유실시) 검토</strong>가
            필요한 문제입니다. 개발자가 판단할 영역이 아닙니다.
          </p>
          <p>
            <strong>가상 착용에는 별도의 큰 리스크가 있습니다.</strong> 미국에서 Dior와 Louis
            Vuitton이 가상피팅 기능을 두고 생체정보 집단소송(일리노이 BIPA)을 당했습니다. 얼굴
            스캔이 생체정보 수집으로 간주됐기 때문입니다. 한국도 얼굴 특징점은 민감정보입니다.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-ink-200 bg-white p-5">
        <h2 className="font-bold text-ink-900">그래도 남는 자리</h2>
        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-ink-800">
          <li>
            · 위 서비스 대부분은 <strong>테만</strong> 다루거나 <strong>가상피팅만</strong>
            다룹니다. 처방전 판독으로 <strong>렌즈 사양까지</strong> 같이 정하고 매장별로
            테+렌즈 총액을 비교하는 조합은 상대적으로 덜 채워져 있습니다.
          </li>
          <li>
            · 브리즘은 <strong>매장 방문 스캔</strong>이 전제입니다. 스마트폰 사진만으로 끝나는
            경로는 접근성이 다릅니다.
          </li>
          <li>
            · 다만 이건 <strong>기능 차이</strong>지 <strong>진입장벽</strong>이 아닙니다. 이미
            매장과 공장, 제조 데이터를 가진 쪽이 따라오는 데 오래 걸리지 않습니다.
          </li>
        </ul>
      </section>

      <p className="text-xs leading-relaxed text-ink-600">
        2026년 9월 공개 자료 기준으로 정리한 내용입니다. 수치와 특허 상태는 바뀔 수 있으니 사업
        판단 전에 최신 자료로 다시 확인하세요.
      </p>

      <Link href="/how-it-works" className="block text-center text-sm text-ink-700 underline">
        역할 분담과 법적 구조 보기
      </Link>
    </div>
  );
}
