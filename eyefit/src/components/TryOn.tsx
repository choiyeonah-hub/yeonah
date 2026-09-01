"use client";

import { useState } from "react";
import { IRIS_WIDTH_MM } from "@/lib/visionConstants";
import type { FaceLandmarks, FrameRimId, FrameShapeId } from "@/lib/types";
import FrameSvg from "./FrameSvg";

/**
 * 가상 착용.
 *
 * 얼굴 인식을 브라우저에서 다시 돌리지 않고, 얼굴 분석 때 이미 받아온 좌표
 * (동공 두 개, 코받침 지점, 얼굴 좌우 끝, 홍채 지름)를 그대로 쓴다. 사진은
 * 브라우저 메모리에만 있고 이 컴포넌트는 아무것도 다시 업로드하지 않는다.
 *
 * 테는 실제 각인 치수(전체폭 mm)를 홍채 기준자로 환산해 사진 위에 얹으므로,
 * 큰 테와 작은 테의 차이가 눈에 보이는 크기 차이로 그대로 나타난다.
 */
export default function TryOn({
  photoDataUrl,
  landmarks,
  shape,
  rim,
  frameTotalWidthMm,
  color = "#2c4753",
}: {
  photoDataUrl: string;
  landmarks: FaceLandmarks;
  shape: FrameShapeId;
  rim: FrameRimId;
  frameTotalWidthMm: number;
  color?: string;
}) {
  // 사람마다 안경이 앉는 높이가 조금씩 다르므로 손으로 미세 조정할 수 있게 둔다.
  const [nudge, setNudge] = useState(0);

  const { rightPupil, leftPupil, noseBridge, irisWidthRatio } = landmarks;

  // 1) 테 전체폭(mm)을 이미지 폭 대비 비율로 환산한다.
  const mmToRatio = irisWidthRatio / IRIS_WIDTH_MM;
  const frameWidthPct = frameTotalWidthMm * mmToRatio * 100;

  // 2) 두 눈을 잇는 선의 각도만큼 테를 기울인다. 고개가 기운 사진도 자연스럽게 얹힌다.
  const dx = leftPupil.x - rightPupil.x;
  const dy = leftPupil.y - rightPupil.y;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  // 3) 가로는 두 동공의 중점, 세로는 코받침 지점에 맞춘다.
  const centerXPct = ((rightPupil.x + leftPupil.x) / 2) * 100;
  const centerYPct = (noseBridge.y + nudge / 1000) * 100;

  // FrameSvg의 viewBox는 210×70이라 세로는 폭의 1/3이다.
  const frameHeightPct = (frameWidthPct * 70) / 210;

  return (
    <div className="space-y-2">
      <div className="relative mx-auto max-w-xs overflow-hidden rounded-xl bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoDataUrl} alt="가상 착용 미리보기" className="block w-full" />
        <div
          className="pointer-events-none absolute"
          style={{
            left: `${centerXPct}%`,
            top: `${centerYPct}%`,
            width: `${frameWidthPct}%`,
            height: `${frameHeightPct}%`,
            transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
          }}
        >
          <FrameSvg shape={shape} rim={rim} color={color} className="h-full w-full drop-shadow" />
        </div>
      </div>

      <label className="block text-center text-xs text-ink-600">
        위치 미세 조정
        <input
          type="range"
          min={-40}
          max={40}
          value={nudge}
          onChange={(e) => setNudge(Number(e.target.value))}
          className="mt-1 w-full accent-ink-500"
        />
      </label>
      <p className="text-center text-xs text-ink-600">
        테 크기는 실제 각인 치수(전체폭 {frameTotalWidthMm}mm)를 사진 축척으로 환산해 그린
        것이라, 큰 테와 작은 테의 차이가 그대로 보입니다. 색과 재질 질감은 표현되지 않습니다.
      </p>
    </div>
  );
}
