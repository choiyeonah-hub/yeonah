import type { FrameRimId, FrameShapeId } from "@/lib/types";

/**
 * 테 모양을 SVG로 그린다. 카탈로그 사진 없이도 모양 차이를 눈으로 비교할 수 있게 하는 용도.
 * 왼쪽 렌즈 좌표계(폭 72 × 높이 56)를 하나 그린 뒤 오른쪽은 좌우 반전해서 재사용한다.
 */
const LENS_W = 72;
const LENS_H = 56;

/** 렌즈 한 알의 외곽선. 원점(0,0)이 렌즈 왼쪽 위. */
function lensPath(shape: FrameShapeId): string {
  const w = LENS_W;
  const h = LENS_H;
  switch (shape) {
    case "round":
      return `M ${w / 2} 0 A ${w / 2} ${h / 2} 0 1 1 ${w / 2 - 0.01} 0 Z`;
    case "oval":
      return `M 0 ${h / 2} A ${w / 2} ${h / 2 - 6} 0 1 1 ${w} ${h / 2} A ${w / 2} ${h / 2 - 6} 0 1 1 0 ${h / 2} Z`;
    case "square":
      return `M 8 2 H ${w - 8} Q ${w} 2 ${w} 12 V ${h - 12} Q ${w} ${h - 2} ${w - 10} ${h - 2} H 10 Q 0 ${h - 2} 0 ${h - 12} V 12 Q 0 2 8 2 Z`;
    case "rectangle":
      return `M 6 8 H ${w - 6} Q ${w} 8 ${w} 16 V ${h - 16} Q ${w} ${h - 8} ${w - 8} ${h - 8} H 8 Q 0 ${h - 8} 0 ${h - 16} V 16 Q 0 8 6 8 Z`;
    case "wellington":
      // 위가 넓고 아래로 갈수록 살짝 좁아지는 사다리꼴
      return `M 6 2 H ${w - 4} Q ${w} 2 ${w - 2} 14 L ${w - 10} ${h - 10} Q ${w - 12} ${h - 2} ${w - 22} ${h - 2} H 16 Q 6 ${h - 2} 5 ${h - 12} L 1 14 Q 0 2 6 2 Z`;
    case "boston":
      // 위는 둥글고 아래는 살짝 각진 클래식 형태
      return `M ${w / 2} 1 Q ${w} 1 ${w} 20 Q ${w} ${h} ${w / 2} ${h} Q 0 ${h} 0 20 Q 0 1 ${w / 2} 1 Z`;
    case "cat-eye":
      // 바깥쪽 위 모서리가 위로 치켜 올라간 형태
      return `M 10 10 Q 30 0 ${w} 0 Q ${w} 4 ${w - 6} 16 L ${w - 12} ${h - 12} Q ${w - 14} ${h - 2} ${w - 26} ${h - 2} H 14 Q 2 ${h - 4} 2 ${h - 20} Q 2 14 10 10 Z`;
    case "browline":
      return `M 0 4 H ${w} V 16 Q ${w} ${h - 10} ${w - 14} ${h - 4} H 16 Q 0 ${h - 8} 0 16 Z`;
    case "octagon":
      return `M 18 2 H ${w - 18} L ${w} 16 V ${h - 18} L ${w - 16} ${h - 2} H 16 L 0 ${h - 18} V 16 Z`;
    case "aviator":
      // 물방울 모양: 위가 넓고 아래 안쪽으로 흘러내린다
      return `M 2 6 H ${w - 4} Q ${w} 6 ${w - 4} 22 Q ${w - 12} ${h} ${w / 2 - 6} ${h} Q 6 ${h - 6} 2 20 Z`;
    default:
      return `M 0 0 H ${w} V ${h} H 0 Z`;
  }
}

export default function FrameSvg({
  shape,
  rim,
  color = "#3a2a18",
  className,
}: {
  shape: FrameShapeId;
  rim: FrameRimId;
  color?: string;
  className?: string;
}) {
  const d = lensPath(shape);
  // 무테는 얇은 실선, 하금테는 위쪽만 두껍게, 풀테는 전체를 두껍게 그린다.
  const strokeWidth = rim === "rimless" ? 1.2 : rim === "half" ? 2.4 : 4.5;
  const opacity = rim === "rimless" ? 0.55 : 1;

  return (
    <svg viewBox="0 0 210 70" className={className} role="img" aria-label={`${shape} 안경테 모양`}>
      <g
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        opacity={opacity}
      >
        {/* 왼쪽 렌즈 */}
        <g transform="translate(12, 7)">
          <path d={d} />
        </g>
        {/* 오른쪽 렌즈 (좌우 반전) */}
        <g transform={`translate(${210 - 12}, 7) scale(-1, 1)`}>
          <path d={d} />
        </g>
        {/* 브릿지 */}
        <path d={`M ${12 + LENS_W} 24 Q 105 16 ${210 - 12 - LENS_W} 24`} />
        {/* 템플(다리) */}
        <path d="M 12 20 L 2 24" />
        <path d="M 198 20 L 208 24" />
        {rim === "half" && (
          // 하금테는 아래쪽 테가 없다는 걸 렌즈 하단 실선으로 표현
          <>
            <path d={`M 14 ${7 + LENS_H - 6} Q 48 ${7 + LENS_H + 2} 82 ${7 + LENS_H - 8}`} opacity={0.25} />
            <path d={`M 128 ${7 + LENS_H - 8} Q 162 ${7 + LENS_H + 2} 196 ${7 + LENS_H - 6}`} opacity={0.25} />
          </>
        )}
      </g>
    </svg>
  );
}
