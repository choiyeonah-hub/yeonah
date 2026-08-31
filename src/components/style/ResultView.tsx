import ColorSwatch from "./ColorSwatch";
import ItemCard from "./ItemCard";
import RatioBar from "./RatioBar";
import ShareLink from "./ShareLink";
import { getColorType } from "@/lib/style/personalColor";
import type { PaletteColor, StyleProfileResult, ToneAxes } from "@/lib/style/types";

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Palette({ title, colors }: { title: string; colors: PaletteColor[] }) {
  return (
    <div className="mt-5 first:mt-0">
      <h3 className="mb-2 text-sm font-semibold text-neutral-700">{title}</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {colors.map((color) => (
          <ColorSwatch key={`${title}-${color.hex}-${color.name}`} color={color} />
        ))}
      </div>
    </div>
  );
}

const AXIS_META: { key: keyof ToneAxes; label: string; left: string; right: string; min: number; max: number }[] = [
  { key: "warmth", label: "웜 · 쿨", left: "쿨", right: "웜", min: -100, max: 100 },
  { key: "lightness", label: "명도", left: "어두움", right: "밝음", min: 0, max: 100 },
  { key: "chroma", label: "채도", left: "탁함", right: "선명", min: 0, max: 100 },
  { key: "contrast", label: "대비", left: "저대비", right: "고대비", min: 0, max: 100 },
];

export default function ResultView({
  result,
  sharePath,
}: {
  result: StyleProfileResult;
  sharePath?: string;
}) {
  const { color, colorType, body, recommendation } = result;
  const runnerUp = getColorType(color.runnerUpId);
  const measured = Object.entries(color.measured).filter(([, hex]) => Boolean(hex)) as [string, string][];
  const measuredLabels: Record<string, string> = {
    skin: "피부",
    hair: "모발",
    eye: "눈동자",
    lip: "입술",
  };

  return (
    <div>
      {/* ── 헤더 ─────────────────────────────────────────────── */}
      <header className="rounded-3xl border border-neutral-200 bg-white p-6">
        <p className="text-xs font-medium tracking-wide text-neutral-500">진단 결과</p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900 sm:text-3xl">
          {colorType.name} · {body.shape.name}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">{colorType.subtitle}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {recommendation.keywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700"
            >
              #{keyword}
            </span>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-neutral-50 p-3">
            <p className="text-[11px] text-neutral-500">퍼스널컬러 확신도</p>
            <p className="text-xl font-bold text-neutral-900">{color.confidence}%</p>
            <p className="mt-1 text-[11px] text-neutral-500">2순위 · {runnerUp.name}</p>
          </div>
          <div className="rounded-xl bg-neutral-50 p-3">
            <p className="text-[11px] text-neutral-500">등신 / 키</p>
            <p className="text-xl font-bold text-neutral-900">
              {body.headUnits.toFixed(1)}등신
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">키 {body.height}cm</p>
          </div>
          <div className="rounded-xl bg-neutral-50 p-3">
            <p className="text-[11px] text-neutral-500">상체 : 하체 (머리 제외)</p>
            <p className="text-xl font-bold text-neutral-900">
              {body.upperLower[0]} : {body.upperLower[1]}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">이상 비율 45 : 55</p>
          </div>
        </div>

        {sharePath && (
          <div className="mt-5">
            <p className="mb-2 text-xs text-neutral-500">이 결과 다시 열어보기 / 공유하기</p>
            <ShareLink path={sharePath} />
          </div>
        )}
      </header>

      {/* ── 진단 근거 ─────────────────────────────────────────── */}
      <Section
        title="1. 어떻게 이 타입이 나왔나"
        subtitle={
          color.source === "photo"
            ? "사진에서 읽은 색을 CIE Lab으로 변환해 웜·쿨 / 명도 / 채도 / 대비 네 축으로 계산했습니다."
            : "문진 답변을 네 축 점수로 환산해 12타입 중 가장 가까운 좌표를 찾았습니다."
        }
      >
        {measured.length > 0 && (
          <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {measured.map(([key, hex]) => (
              <ColorSwatch
                key={key}
                color={{ hex, name: measuredLabels[key] ?? key, use: "측정된 색" }}
                size="sm"
              />
            ))}
          </div>
        )}

        <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
          {AXIS_META.map((axis) => {
            const value = color.axes[axis.key];
            const percent = ((value - axis.min) / (axis.max - axis.min)) * 100;
            return (
              <div key={axis.key}>
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>{axis.left}</span>
                  <span className="font-medium text-neutral-800">
                    {axis.label} {value}
                  </span>
                  <span>{axis.right}</span>
                </div>
                <div className="relative mt-1 h-2 rounded-full bg-neutral-100">
                  <div
                    className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-neutral-900 shadow"
                    style={{ left: `${Math.max(2, Math.min(98, percent))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <ul className="mt-3 space-y-1.5">
          {color.reasons.map((reason) => (
            <li key={reason} className="flex gap-2 text-sm text-neutral-700">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-neutral-400" />
              <span className="leading-relaxed">{reason}</span>
            </li>
          ))}
        </ul>

        {color.aiNote && (
          <p className="mt-3 rounded-xl bg-neutral-100 p-3 text-sm leading-relaxed text-neutral-700">
            AI 사진 판독 메모 · {color.aiNote}
          </p>
        )}

        <p className="mt-4 text-sm leading-relaxed text-neutral-700">{colorType.description}</p>
      </Section>

      {/* ── 팔레트 ───────────────────────────────────────────── */}
      <Section
        title="2. 내 컬러 팔레트 (색값 포함)"
        subtitle="색을 눌러보면 RGB · HSL · CIE Lab · CMYK 값까지 볼 수 있습니다. 원단이나 페인트 주문에도 그대로 쓸 수 있는 수치입니다."
      >
        <Palette title="베스트 컬러 — 얼굴 근처에 두면 가장 좋은 색" colors={colorType.best} />
        <Palette title="뉴트럴 — 하의·아우터의 기본이 되는 색" colors={colorType.neutral} />
        <Palette title="립 컬러" colors={colorType.lip} />
        <Palette title="메탈 · 데님 · 헤어" colors={[...colorType.metal, colorType.denim, ...colorType.hairColor]} />
        <Palette title="피해야 할 색 — 얼굴 근처에서 안색을 떨어뜨리는 색" colors={colorType.avoid} />
        <p className="mt-4 rounded-xl bg-neutral-100 p-3 text-sm leading-relaxed text-neutral-700">
          소재·분위기 · {colorType.styleMood}
        </p>
      </Section>

      {/* ── 체형 ─────────────────────────────────────────────── */}
      <Section
        title="3. 몸 비율 진단"
        subtitle="측정값을 한국 성인 평균대와 비교했습니다. 점이 초록 구간 안이면 평균 범위입니다."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-neutral-900">{body.shape.name}</h4>
            <p className="mt-1 text-sm leading-relaxed text-neutral-600">{body.shape.description}</p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-neutral-900">{body.frame.name}</h4>
            <p className="mt-1 text-sm leading-relaxed text-neutral-600">{body.frame.description}</p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {body.ratios.map((ratio) => (
            <RatioBar key={ratio.key} ratio={ratio} />
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <h4 className="text-sm font-semibold text-emerald-900">살릴 점</h4>
            <ul className="mt-2 space-y-1">
              {body.strengths.map((line) => (
                <li key={line} className="text-sm leading-relaxed text-emerald-900">
                  · {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h4 className="text-sm font-semibold text-amber-900">균형을 맞출 점</h4>
            <ul className="mt-2 space-y-1">
              {body.balancePoints.map((line) => (
                <li key={line} className="text-sm leading-relaxed text-amber-900">
                  · {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* ── 치수 ─────────────────────────────────────────────── */}
      <Section
        title="4. 내 몸에 맞는 치수 (cm)"
        subtitle="온라인 쇼핑에서 상세 사이즈표와 바로 비교할 수 있는 수치입니다."
      >
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">항목</th>
                <th className="px-4 py-2 font-medium">권장 수치</th>
                <th className="px-4 py-2 font-medium">계산 근거</th>
              </tr>
            </thead>
            <tbody>
              {recommendation.sizing.map((hint) => (
                <tr key={hint.label} className="border-t border-neutral-100">
                  <td className="px-4 py-3 font-medium text-neutral-800">{hint.label}</td>
                  <td className="px-4 py-3 font-semibold text-neutral-900">{hint.value}</td>
                  <td className="px-4 py-3 text-xs leading-relaxed text-neutral-500">{hint.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── 규칙 ─────────────────────────────────────────────── */}
      <Section title="5. 실루엣 규칙">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-neutral-900">이렇게 입으세요</h4>
            <ul className="mt-2 space-y-2">
              {recommendation.silhouetteRules.map((rule) => (
                <li key={rule} className="flex gap-2 text-sm text-neutral-700">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-neutral-900" />
                  <span className="leading-relaxed">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-neutral-900">이건 피하세요</h4>
            <ul className="mt-2 space-y-2">
              {recommendation.avoidRules.map((rule) => (
                <li key={rule} className="flex gap-2 text-sm text-neutral-700">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-neutral-300" />
                  <span className="leading-relaxed">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* ── 아이템 ───────────────────────────────────────────── */}
      <Section title="6. 옷 추천" subtitle="각 아이템의 색은 위 팔레트에서 뽑은 값이라 그대로 검색·주문에 쓸 수 있습니다.">
        <div className="grid gap-3 sm:grid-cols-2">
          {recommendation.clothes.map((item) => (
            <ItemCard key={item.category} item={item} />
          ))}
        </div>
      </Section>

      <Section title="7. 구두 추천">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recommendation.shoes.map((item) => (
            <ItemCard key={item.category} item={item} />
          ))}
        </div>
      </Section>

      <Section title="8. 가방 추천">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recommendation.bags.map((item) => (
            <ItemCard key={item.category} item={item} />
          ))}
        </div>
      </Section>

      {/* ── 코디 ─────────────────────────────────────────────── */}
      <Section title="9. 바로 입을 수 있는 코디 3세트">
        <div className="grid gap-3 lg:grid-cols-3">
          {recommendation.looks.map((look) => (
            <article key={look.title} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <h4 className="text-base font-semibold text-neutral-900">{look.title}</h4>
              <p className="text-xs text-neutral-500">{look.scene}</p>
              <ul className="mt-3 space-y-2">
                {look.items.map((item) => (
                  <li key={`${look.title}-${item.slot}`} className="flex items-start gap-2">
                    <span
                      className="mt-0.5 h-6 w-6 shrink-0 rounded-md border border-neutral-200"
                      style={{ backgroundColor: item.color.hex }}
                      aria-hidden
                    />
                    <span className="text-sm leading-snug text-neutral-700">
                      <span className="font-medium text-neutral-900">{item.slot}</span> · {item.name}
                      <span className="ml-1 font-mono text-[11px] text-neutral-500">
                        {item.color.name} {item.color.hex}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 rounded-lg bg-neutral-50 p-2 text-xs leading-relaxed text-neutral-600">
                {look.tip}
              </p>
            </article>
          ))}
        </div>
      </Section>

      {recommendation.aiStylistNote && (
        <Section title="10. AI 스타일리스트 코멘트">
          <p className="whitespace-pre-line rounded-2xl border border-neutral-200 bg-white p-4 text-sm leading-relaxed text-neutral-700">
            {recommendation.aiStylistNote}
          </p>
        </Section>
      )}

      {result.notes.length > 0 && (
        <div className="mt-8 rounded-2xl bg-neutral-100 p-4">
          <h4 className="text-xs font-semibold text-neutral-700">참고</h4>
          <ul className="mt-2 space-y-1">
            {result.notes.map((note) => (
              <li key={note} className="text-xs leading-relaxed text-neutral-600">
                · {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 text-xs leading-relaxed text-neutral-400">
        퍼스널컬러와 체형 진단은 취향과 컨디션·조명에 따라 달라질 수 있는 참고 기준입니다. 이 결과는 옷을 고를 때의
        출발점으로 쓰고, 실제로 입어봤을 때 마음에 드는 쪽을 우선하세요.
      </p>
    </div>
  );
}
