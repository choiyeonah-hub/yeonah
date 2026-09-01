import { FACE_SHAPES, FRAME_SHAPE_LABEL } from "./faceShapes";
import { FRAMES } from "./frames";
import { supportsProgressive } from "./lenses";
import type { FaceAnalysis, FitScore, Frame, Prescription } from "./types";

/**
 * 얼굴 분석 결과와 도수를 함께 보고 테의 적합도를 0~100으로 매긴다.
 *
 * 점수는 "누가 더 예쁜가"가 아니라 아래 다섯 가지 측정 가능한 축의 합이다.
 *   1) 얼굴형 × 테 모양의 대비 원칙   (최대 40점)
 *   2) 얼굴 폭 × 테 전체폭            (최대 20점)
 *   3) PD × (렌즈폭 + 브릿지) 정렬     (최대 15점)
 *   4) 콧대 높이 × 코받침 설계         (최대 15점)
 *   5) 도수 × 테 구조(두께 커버/무게)  (최대 10점)
 */
export function scoreFrame(params: {
  frame: Frame;
  face: FaceAnalysis;
  prescription: Prescription | null;
  effectivePower: number;
}): FitScore {
  const { frame, face, prescription, effectivePower } = params;
  const pros: string[] = [];
  const cons: string[] = [];
  let score = 0;

  // 1) 얼굴형 × 테 모양 (40점)
  const shapeInfo = FACE_SHAPES[face.faceShape];
  const bestIndex = shapeInfo.best.indexOf(frame.shape);
  const shapeLabel = FRAME_SHAPE_LABEL[frame.shape];
  if (bestIndex === 0) {
    score += 40;
    pros.push(`${shapeInfo.label} 얼굴에 가장 잘 맞는 ${shapeLabel} 테입니다.`);
  } else if (bestIndex > 0) {
    score += 36 - bestIndex * 3;
    pros.push(`${shapeInfo.label} 얼굴과 잘 어울리는 ${shapeLabel} 테입니다.`);
  } else if (shapeInfo.avoid.includes(frame.shape)) {
    score += 8;
    cons.push(`${shapeInfo.label} 얼굴에는 ${shapeLabel} 테가 윤곽을 비슷하게 반복해 다소 심심해 보일 수 있습니다.`);
  } else {
    score += 22;
  }

  // 2) 얼굴 폭 × 테 전체폭 (20점)
  // 테 전체폭이 얼굴폭보다 크면 흘러내리고, 작으면 관자놀이를 눌러 자국이 남는다.
  const widthTarget = { narrow: 130, average: 138, wide: 145 }[face.faceWidth];
  const widthGap = Math.abs(frame.totalWidth - widthTarget);
  if (widthGap <= 3) {
    score += 20;
    pros.push(`전체폭 ${frame.totalWidth}mm로 얼굴 폭에 딱 맞는 사이즈입니다.`);
  } else if (widthGap <= 7) {
    score += 13;
  } else {
    score += 4;
    cons.push(
      frame.totalWidth > widthTarget
        ? `전체폭 ${frame.totalWidth}mm는 얼굴에 비해 커서 흘러내릴 수 있습니다.`
        : `전체폭 ${frame.totalWidth}mm는 얼굴에 비해 작아 관자놀이를 누를 수 있습니다.`
    );
  }

  // 3) PD × (렌즈폭 + 브릿지) (15점)
  // 테의 광학 중심 간격(렌즈폭+브릿지)은 보통 PD보다 크고, 그 차이를 렌즈 가공에서
  // 편심(decentration)으로 보정한다. 한쪽당 편심이 작을수록 렌즈가 얇고 프리즘 오차가 적다.
  const frameCenter = frame.lensWidth + frame.bridge;
  if (prescription?.pd) {
    const decentration = Math.abs(frameCenter - prescription.pd) / 2;
    if (decentration <= 2) {
      score += 15;
      pros.push(
        `PD ${prescription.pd}mm 기준 편심이 한쪽당 ${decentration.toFixed(1)}mm로 작아 렌즈가 얇게 나옵니다.`
      );
    } else if (decentration <= 4) {
      score += 10;
    } else {
      score += 3;
      cons.push(
        `PD ${prescription.pd}mm 기준 편심이 한쪽당 ${decentration.toFixed(1)}mm입니다. 렌즈가 두꺼워지고 가장자리 왜곡이 늘 수 있습니다.`
      );
    }
  } else {
    // PD를 모를 때는 눈 간격 인상으로 대략 판단한다.
    const spacingTarget = { narrow: 64, average: 68, wide: 72 }[face.eyeSpacing];
    score += Math.abs(frameCenter - spacingTarget) <= 4 ? 12 : 7;
  }

  // 4) 콧대 높이 × 코받침 (15점)
  // 서구권 표준 테는 코받침이 낮게 설계돼 콧대가 낮으면 흘러내리고 볼에 닿는다.
  if (face.noseBridge === "low") {
    if (frame.asianFit) {
      score += 15;
      pros.push("코받침이 높은 아시안핏이라 낮은 콧대에서도 흘러내리지 않습니다.");
    } else if (frame.adjustableNosePad) {
      score += 10;
      pros.push("코패드를 구부려 조절할 수 있어 매장에서 콧대에 맞출 수 있습니다.");
    } else {
      score += 2;
      cons.push("코받침이 고정된 서구권 규격이라 콧대가 낮으면 흘러내리기 쉽습니다.");
    }
  } else if (face.noseBridge === "medium") {
    score += frame.asianFit || frame.adjustableNosePad ? 14 : 10;
  } else {
    score += frame.asianFit ? 11 : 15;
  }

  // 5) 도수 × 테 구조 (10점)
  if (effectivePower > 4) {
    if (frame.rim === "rimless") {
      score += 1;
      cons.push("고도수에 무테를 쓰면 렌즈 가장자리 두께가 그대로 드러나고 파손 위험도 큽니다.");
    } else if (frame.rim === "half") {
      score += 5;
      cons.push("하금테는 렌즈 윗부분 두께가 보일 수 있습니다.");
    } else if (frame.lensWidth <= 50) {
      score += 10;
      pros.push(`고도수(${effectivePower.toFixed(1)}D)에 렌즈폭 ${frame.lensWidth}mm는 두께가 덜 나옵니다.`);
    } else {
      score += 6;
      cons.push(`렌즈폭 ${frame.lensWidth}mm는 고도수에서 가장자리가 두꺼워집니다.`);
    }
  } else {
    score += frame.weightGram <= 20 ? 10 : 8;
  }

  // 누진렌즈는 렌즈 세로폭이 부족하면 아예 못 넣는다.
  if (prescription?.add != null && prescription.add > 0 && !supportsProgressive(frame)) {
    score -= 25;
    cons.push(`렌즈 세로폭 ${frame.lensHeight}mm로는 누진 근용부가 들어가지 않습니다.`);
  }

  // 눈썹 라인 보정 (가감점)
  if (frame.shape === "browline") {
    if (face.browLine === "soft") {
      score += 3;
      pros.push("눈썹 라인이 흐린 편이라 브로우라인 테가 인상을 또렷하게 잡아줍니다.");
    } else if (face.browLine === "angular") {
      score -= 3;
    }
  }

  // 긴 얼굴에는 렌즈 세로폭이 큰 테가 유리하다.
  if ((face.faceShape === "oblong" || face.faceShape === "rectangle") && frame.lensHeight >= 42) {
    score += 4;
    pros.push(`렌즈 세로폭 ${frame.lensHeight}mm가 긴 얼굴을 가로로 나눠줍니다.`);
  }

  return {
    frameId: frame.id,
    score: Math.max(0, Math.min(100, Math.round(score))),
    pros,
    cons,
  };
}

/** 전체 카탈로그를 점수순으로 정렬해 돌려준다. */
export function rankFrames(params: {
  face: FaceAnalysis;
  prescription: Prescription | null;
  effectivePower: number;
}): FitScore[] {
  return FRAMES.map((frame) => scoreFrame({ frame, ...params })).sort((a, b) => b.score - a.score);
}
