"use client";

import { useRef, useState } from "react";
import { parseJsonOrThrow } from "@/lib/api";
import { FACE_SHAPES, FACE_SHAPE_IDS, FRAME_SHAPE_LABEL } from "@/lib/faceShapes";
import { fileToScaledDataUrl } from "@/lib/image";
import type { FaceAnalysis, FaceShapeId, ProfileMeasurements } from "@/lib/types";
import { Callout } from "./Section";

const NOSE_LABEL = { low: "낮음", medium: "보통", high: "높음" } as const;
const WIDTH_LABEL = { narrow: "좁음", average: "보통", wide: "넓음" } as const;
const BROW_LABEL = { straight: "일자", arched: "아치", angular: "각진", soft: "흐린" } as const;

/** 사용자가 사진 없이 직접 고를 때 쓰는 기본 비율. AI 분석과 같은 형태로 맞춘다. */
function manualAnalysis(shape: FaceShapeId): FaceAnalysis {
  return {
    faceShape: shape,
    widthToHeight: 0.75,
    jawToCheek: 0.85,
    foreheadToCheek: 0.9,
    noseBridge: "medium",
    eyeSpacing: "average",
    faceWidth: "average",
    browLine: "straight",
    landmarks: null,
    measured: null,
    profile: null,
    summary: `직접 고른 얼굴형입니다. ${FACE_SHAPES[shape].description}`,
    confidence: 1,
    source: "manual",
  };
}

export default function StepFace({
  face,
  photoDataUrl,
  onChange,
  onNext,
}: {
  face: FaceAnalysis | null;
  photoDataUrl: string | null;
  onChange: (patch: { face?: FaceAnalysis; photoDataUrl?: string | null }) => void;
  onNext: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    try {
      const dataUrl = await fileToScaledDataUrl(file);
      const res = await fetch("/api/analyze-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });
      const data = await parseJsonOrThrow<{ analysis: FaceAnalysis }>(res);
      // 사진은 가상 착용에 쓰려고 브라우저에만 남긴다. 서버로 다시 보내지 않는다.
      onChange({ face: data.analysis, photoDataUrl: dataUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "얼굴 분석에 실패했습니다.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  /** 옆모습으로 콧대 높이를 잰다. 정면 분석이 끝난 뒤에만 붙일 수 있다. */
  async function handleProfileFile(file: File) {
    if (!face) return;
    setError(null);
    setProfileLoading(true);
    try {
      const dataUrl = await fileToScaledDataUrl(file);
      const res = await fetch("/api/analyze-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });
      const data = await parseJsonOrThrow<{ profile: ProfileMeasurements }>(res);
      // 잰 높이로 콧대 등급을 다시 매긴다. 이게 안경이 흘러내리는지를 가르는 치수다.
      const noseBridge =
        data.profile.bridgeHeightMm < 6 ? "low" : data.profile.bridgeHeightMm < 10 ? "medium" : "high";
      onChange({ face: { ...face, profile: data.profile, noseBridge } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "옆모습 분석에 실패했습니다.");
    } finally {
      setProfileLoading(false);
      if (profileRef.current) profileRef.current.value = "";
    }
  }

  const shapeInfo = face ? FACE_SHAPES[face.faceShape] : null;

  return (
    <div className="space-y-5">
      <Callout tone="privacy" title="사진은 저장하지 않습니다">
        <p>
          올린 사진은 분석하는 동안에만 서버 메모리에 있다가 응답과 함께 사라집니다. 저장되는 건
          얼굴형·비율 같은 <strong>숫자 결과</strong>뿐이고, 그것도 마지막에 매장 예약을 확정할 때만
          기록됩니다.
        </p>
        <p>
          분석은 외모 평가가 아니라 <strong>안경 사이즈 계산</strong>입니다. 얼굴 폭, 콧대 높이, 눈
          간격처럼 테를 고르는 데 실제로 필요한 비율만 봅니다.
        </p>
      </Callout>

      <label className="flex items-start gap-2 text-sm text-ink-800">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1"
        />
        <span>
          얼굴 사진을 안경 추천 목적으로 <strong>일회성 분석</strong>하는 데 동의합니다. (사진 미저장)
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink-200 bg-white p-4">
          <p className="mb-2 font-semibold text-ink-900">1. 사진으로 분석하기</p>
          <p className="mb-3 text-sm text-ink-700">
            정면을 보고, 앞머리로 이마를 가리지 않은 사진이 가장 정확합니다.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="user"
            disabled={!consent || loading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
            className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-ink-500 file:px-3 file:py-2 file:text-white disabled:opacity-40"
          />
          {loading && <p className="mt-3 text-sm text-ink-600">얼굴 비율을 재는 중…</p>}
          {photoDataUrl && !loading && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoDataUrl}
              alt="업로드한 사진 미리보기"
              className="mt-3 h-32 w-32 rounded-xl object-cover"
            />
          )}
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-4">
          <p className="mb-2 font-semibold text-ink-900">2. 또는 얼굴형 직접 고르기</p>
          <p className="mb-3 text-sm text-ink-700">
            사진을 올리고 싶지 않다면 이쪽으로도 끝까지 진행할 수 있습니다.
          </p>
          <div className="flex flex-wrap gap-2">
            {FACE_SHAPE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onChange({ face: manualAnalysis(id), photoDataUrl: null })}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  face?.faceShape === id && face.source === "manual"
                    ? "border-ink-500 bg-ink-500 text-white"
                    : "border-ink-200 text-ink-800 hover:bg-ink-50"
                }`}
              >
                {FACE_SHAPES[id].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <Callout tone="warn">{error}</Callout>}

      {face && shapeInfo && (
        <div className="rounded-2xl border border-ink-300 bg-ink-50 p-5">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-xl font-bold text-ink-900">{shapeInfo.label}</h3>
            <span className="text-sm text-ink-600">
              {face.source === "ai"
                ? `AI 분석 · 신뢰도 ${Math.round(face.confidence * 100)}%`
                : "직접 선택"}
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-800">{face.summary}</p>

          {face.source === "ai" && face.confidence < 0.5 && (
            <p className="mt-2 text-sm text-amber-800">
              사진 각도나 조명 때문에 확신이 낮습니다. 결과가 어색하면 얼굴형을 직접 골라주세요.
            </p>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-ink-600">얼굴 가로/세로</dt>
              <dd className="font-medium text-ink-900">{face.widthToHeight.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-ink-600">얼굴 폭</dt>
              <dd className="font-medium text-ink-900">{WIDTH_LABEL[face.faceWidth]}</dd>
            </div>
            <div>
              <dt className="text-ink-600">콧대</dt>
              <dd className="font-medium text-ink-900">{NOSE_LABEL[face.noseBridge]}</dd>
            </div>
            <div>
              <dt className="text-ink-600">눈썹</dt>
              <dd className="font-medium text-ink-900">{BROW_LABEL[face.browLine]}</dd>
            </div>
          </dl>

          <p className="mt-4 text-sm text-ink-800">
            <strong>추천 원리</strong> — {shapeInfo.principle}
          </p>
          <p className="mt-2 text-sm text-ink-800">
            잘 맞는 테:{" "}
            {shapeInfo.best.map((s) => FRAME_SHAPE_LABEL[s]).join(", ")}
            {shapeInfo.avoid.length > 0 && (
              <>
                {" "}· 피하면 좋은 테: {shapeInfo.avoid.map((s) => FRAME_SHAPE_LABEL[s]).join(", ")}
              </>
            )}
          </p>

          {face.measured && (
            <div className="mt-4 rounded-lg bg-white px-3 py-3 text-sm">
              <p className="font-medium text-ink-900">사진에서 잰 실측 추정치</p>
              <p className="mt-1 text-xs text-ink-600">
                사람의 홍채 가로 지름은 개인차가 작아 약 {face.measured.irisMm}mm입니다. 이걸 자로
                삼아 사진 속 길이를 mm로 환산했습니다.
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex justify-between">
                  <dt className="text-ink-600">PD (동공 간 거리)</dt>
                  <dd className="font-medium text-ink-900">{face.measured.pdMm}mm</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-600">얼굴 폭</dt>
                  <dd className="font-medium text-ink-900">{face.measured.faceWidthMm}mm</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-amber-800">
                참고값입니다. 사진 각도와 원근 왜곡 때문에 몇 mm 오차가 납니다. 안경을 맞출 때 쓰는
                PD는 매장에서 다시 재야 합니다.
              </p>
            </div>
          )}

          <div className="mt-4 rounded-lg bg-white px-3 py-3">
            <p className="text-sm font-medium text-ink-900">
              옆모습으로 콧대 높이 재기 <span className="text-ink-600">(선택)</span>
            </p>
            <p className="mt-1 text-xs text-ink-600">
              정면 사진만으로는 콧대가 <strong>얼마나 솟아 있는지</strong>를 알 수 없습니다. 기성
              안경이 흘러내리는 가장 큰 원인이 이 치수라, 옆모습을 한 장 더 올리면 코받침 높이를
              숫자로 정해 맞춤 제작에 넣을 수 있습니다.
            </p>
            <input
              ref={profileRef}
              type="file"
              accept="image/*"
              disabled={!consent || profileLoading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleProfileFile(file);
              }}
              className="mt-2 w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-ink-500 file:px-3 file:py-2 file:text-white disabled:opacity-40"
            />
            {profileLoading && <p className="mt-2 text-sm text-ink-600">콧대를 재는 중…</p>}
            {face.profile && (
              <>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-ink-600">콧대 높이</dt>
                    <dd className="font-medium text-ink-900">{face.profile.bridgeHeightMm}mm</dd>
                  </div>
                  <div>
                    <dt className="text-ink-600">콧대 경사각</dt>
                    <dd className="font-medium text-ink-900">{face.profile.bridgeAngleDeg}°</dd>
                  </div>
                  <div>
                    <dt className="text-ink-600">귀–눈 높이차</dt>
                    <dd className="font-medium text-ink-900">{face.profile.earToEyeOffsetMm}mm</dd>
                  </div>
                </dl>
                {face.profile.confidence < 0.5 && (
                  <p className="mt-2 text-xs text-amber-800">
                    옆모습이 잘 안 보였습니다. 귀와 코가 함께 나오는 완전한 측면 사진으로 다시
                    시도해보세요.
                  </p>
                )}
              </>
            )}
          </div>

          {face.noseBridge === "low" && (
            <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-ink-800">
              콧대가 낮은 편이라 <strong>아시안핏(코받침이 높은 설계)</strong> 또는 코패드를 조절할 수
              있는 테를 우선으로 보여드립니다. 서구권 규격 테는 흘러내려 볼에 닿기 쉽습니다.
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!face}
          onClick={onNext}
          className="rounded-xl bg-ink-600 px-5 py-3 font-semibold text-white disabled:opacity-40"
        >
          다음: 도수 입력
        </button>
      </div>
    </div>
  );
}
