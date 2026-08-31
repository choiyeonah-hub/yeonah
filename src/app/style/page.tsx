"use client";

import { useMemo, useRef, useState } from "react";

import ResultView from "@/components/style/ResultView";
import { COLOR_QUIZ } from "@/lib/style/personalColor";
import type { FrameAnswers, Gender, StyleProfileResult } from "@/lib/style/types";

type ColorMode = "photo" | "quiz";

type Measurements = {
  headLength: string;
  faceLength: string;
  shoulderWidth: string;
  bust: string;
  waist: string;
  hip: string;
  legLength: string;
  armLength: string;
};

const EMPTY_MEASUREMENTS: Measurements = {
  headLength: "",
  faceLength: "",
  shoulderWidth: "",
  bust: "",
  waist: "",
  hip: "",
  legLength: "",
  armLength: "",
};

const MEASUREMENT_FIELDS: { key: keyof Measurements; label: string; hint: string }[] = [
  { key: "headLength", label: "머리 길이", hint: "정수리 → 턱끝" },
  { key: "faceLength", label: "얼굴 길이", hint: "헤어라인 → 턱끝" },
  { key: "legLength", label: "다리 길이", hint: "다리가 시작되는 골반 → 바닥" },
  { key: "armLength", label: "팔 길이", hint: "어깨 끝 → 손목" },
  { key: "shoulderWidth", label: "어깨너비", hint: "좌우 어깨끝 사이" },
  { key: "bust", label: "가슴둘레", hint: "가장 나온 부분" },
  { key: "waist", label: "허리둘레", hint: "가장 들어간 부분" },
  { key: "hip", label: "엉덩이둘레", hint: "가장 나온 부분" },
];

const FRAME_QUESTIONS: {
  key: keyof FrameAnswers;
  question: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: "wrist",
    question: "손목 뼈를 잡았을 때",
    options: [
      { value: "thin", label: "가늘고 납작하다" },
      { value: "medium", label: "둥글고 보통이다" },
      { value: "thick", label: "굵고 뼈가 도드라진다" },
    ],
  },
  {
    key: "collarbone",
    question: "쇄골은",
    options: [
      { value: "hidden", label: "거의 보이지 않는다" },
      { value: "slight", label: "가늘게 살짝 보인다" },
      { value: "prominent", label: "뚜렷하게 드러난다" },
    ],
  },
  {
    key: "fleshiness",
    question: "살이 붙는 곳은 주로",
    options: [
      { value: "upper", label: "상체(가슴·등·팔뚝)" },
      { value: "even", label: "전체적으로 고르게" },
      { value: "lower", label: "하체(엉덩이·허벅지)" },
    ],
  },
];

// 사진은 긴 변 768px로 줄여서 보낸다. 색 측정에는 충분하고 업로드도 빨라진다.
async function toResizedDataUrl(file: File, maxSide = 768): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이미지를 처리할 수 없는 브라우저입니다.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <h2 className="text-base font-bold text-neutral-900">{title}</h2>
      {description && <p className="mt-1 text-sm leading-relaxed text-neutral-500">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function StylePage() {
  const [colorMode, setColorMode] = useState<ColorMode>("photo");
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const [colors, setColors] = useState({ skin: "", hair: "", eye: "", lip: "" });
  const [undertoneHint, setUndertoneHint] = useState<"warm" | "cool" | "neutral" | undefined>();
  const [faceNote, setFaceNote] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

  const [gender, setGender] = useState<Gender>("female");
  const [height, setHeight] = useState("");
  const [measurements, setMeasurements] = useState<Measurements>(EMPTY_MEASUREMENTS);
  const [bodyPhotoUsed, setBodyPhotoUsed] = useState(false);
  const [frame, setFrame] = useState<Partial<FrameAnswers>>({});

  const [busy, setBusy] = useState<null | "face" | "body" | "analyze">(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StyleProfileResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const canSubmit = useMemo(() => {
    const heightValue = Number(height);
    if (!heightValue || heightValue < 120 || heightValue > 220) return false;
    if (colorMode === "photo") return Boolean(colors.skin);
    return Object.keys(quizAnswers).length >= 5;
  }, [height, colorMode, colors.skin, quizAnswers]);

  const post = async (url: string, payload: unknown) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({ error: "서버 응답을 읽지 못했습니다." }));
    if (!response.ok) throw new Error(data?.error ?? "요청에 실패했습니다.");
    return data;
  };

  const onFacePhoto = async (file: File) => {
    setError(null);
    setBusy("face");
    try {
      const dataUrl = await toResizedDataUrl(file);
      setFacePreview(dataUrl);
      const data = await post("/api/style/vision", { kind: "face", image: dataUrl });
      const face = data.face as {
        skinHex: string;
        hairHex?: string;
        eyeHex?: string;
        lipHex?: string;
        undertone?: "warm" | "cool" | "neutral";
        lightingWarning?: string;
        note?: string;
      };
      setColors({
        skin: face.skinHex,
        hair: face.hairHex ?? "",
        eye: face.eyeHex ?? "",
        lip: face.lipHex ?? "",
      });
      setUndertoneHint(face.undertone);
      setFaceNote([face.note, face.lightingWarning].filter(Boolean).join(" / "));
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진 분석에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  };

  const onBodyPhoto = async (file: File) => {
    setError(null);
    const heightValue = Number(height);
    if (!heightValue) {
      setError("전신 사진을 분석하려면 키를 먼저 입력해주세요.");
      return;
    }
    setBusy("body");
    try {
      const dataUrl = await toResizedDataUrl(file, 900);
      const data = await post("/api/style/vision", { kind: "body", image: dataUrl, height: heightValue });
      const m = data.measurements as Partial<Record<keyof Measurements, number>>;
      setMeasurements((prev) => {
        const next = { ...prev };
        (Object.keys(m) as (keyof Measurements)[]).forEach((key) => {
          const value = m[key];
          if (typeof value === "number") next[key] = String(value);
        });
        return next;
      });
      setBodyPhotoUsed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "전신 사진 분석에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  };

  const submit = async () => {
    setError(null);
    setBusy("analyze");
    try {
      const numeric = (value: string) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
      };

      const payload = {
        color:
          colorMode === "photo"
            ? {
                source: "photo" as const,
                measured: {
                  skin: colors.skin || undefined,
                  hair: colors.hair || undefined,
                  eye: colors.eye || undefined,
                  lip: colors.lip || undefined,
                },
                quizAnswers: Object.keys(quizAnswers).length ? quizAnswers : undefined,
                aiUndertoneHint: undertoneHint,
                aiNote: faceNote || undefined,
              }
            : { source: "quiz" as const, quizAnswers },
        body: {
          source: bodyPhotoUsed ? ("photo" as const) : ("manual" as const),
          gender,
          height: Number(height),
          headLength: numeric(measurements.headLength),
          faceLength: numeric(measurements.faceLength),
          shoulderWidth: numeric(measurements.shoulderWidth),
          bust: numeric(measurements.bust),
          waist: numeric(measurements.waist),
          hip: numeric(measurements.hip),
          legLength: numeric(measurements.legLength),
          armLength: numeric(measurements.armLength),
          frame:
            frame.wrist && frame.collarbone && frame.fleshiness ? (frame as FrameAnswers) : undefined,
        },
        useAi: true,
      };

      const data = await post("/api/style/analyze", payload);
      setResult(data.result as StyleProfileResult);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "진단에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header>
        <p className="text-xs font-medium tracking-wide text-neutral-500">AI 퍼스널컬러 · 체형 스타일링</p>
        <h1 className="mt-1 text-3xl font-bold text-neutral-900">내 색과 내 비율에 맞는 옷 찾기</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          얼굴 사진에서 피부·모발·눈동자 색을 읽어 12타입 퍼스널컬러를 진단하고, 전신 사진이나 직접 측정값에서
          얼굴·다리·팔 비율을 계산해 <strong>옷 · 구두 · 가방을 색값(HEX)과 cm 수치까지</strong> 추천합니다.
          사진 없이 문진만으로도 진단할 수 있습니다.
        </p>
      </header>

      <div className="mt-8 space-y-4">
        {/* ── 1단계: 퍼스널컬러 ─────────────────────────────── */}
        <Card
          title="1단계 · 퍼스널컬러"
          description="자연광에서 화장기 없이 찍은 정면 사진이 가장 정확합니다. 사진은 분석에만 쓰이고 저장되지 않습니다."
        >
          <div className="flex gap-2">
            {(
              [
                ["photo", "얼굴 사진으로 분석"],
                ["quiz", "사진 없이 문진"],
              ] as [ColorMode, string][]
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setColorMode(mode)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  colorMode === mode
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {colorMode === "photo" ? (
            <div className="mt-4">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 p-6 text-center hover:border-neutral-400">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onFacePhoto(file);
                  }}
                />
                {facePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={facePreview} alt="업로드한 얼굴 사진" className="h-40 rounded-lg object-cover" />
                ) : (
                  <span className="text-sm text-neutral-500">
                    {busy === "face" ? "사진에서 색을 읽는 중…" : "얼굴 사진 올리기 (클릭)"}
                  </span>
                )}
              </label>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    ["skin", "피부"],
                    ["hair", "모발"],
                    ["eye", "눈동자"],
                    ["lip", "입술"],
                  ] as [keyof typeof colors, string][]
                ).map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="text-xs font-medium text-neutral-600">{label}</span>
                    <div className="mt-1 flex items-center gap-2 rounded-lg border border-neutral-200 p-1.5">
                      <input
                        type="color"
                        value={colors[key] || "#CCCCCC"}
                        onChange={(event) => setColors((prev) => ({ ...prev, [key]: event.target.value.toUpperCase() }))}
                        className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={colors[key]}
                        placeholder="#RRGGBB"
                        onChange={(event) => setColors((prev) => ({ ...prev, [key]: event.target.value.toUpperCase() }))}
                        className="w-full min-w-0 font-mono text-xs text-neutral-700 outline-none"
                      />
                    </div>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                AI가 읽은 색이 실제와 다르면 직접 고칠 수 있습니다. 피부색만 있어도 진단됩니다.
              </p>
              {faceNote && <p className="mt-2 text-xs text-neutral-600">AI 메모 · {faceNote}</p>}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {COLOR_QUIZ.map((question) => (
                <fieldset key={question.id}>
                  <legend className="text-sm font-medium text-neutral-800">{question.question}</legend>
                  {question.hint && <p className="text-xs text-neutral-500">{question.hint}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {question.options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setQuizAnswers((prev) => ({ ...prev, [question.id]: option.value }))
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs transition ${
                          quizAnswers[question.id] === option.value
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ))}
              <p className="text-xs text-neutral-500">
                {Object.keys(quizAnswers).length}/{COLOR_QUIZ.length} 문항 응답 (5개 이상이면 진단 가능)
              </p>
            </div>
          )}
        </Card>

        {/* ── 2단계: 몸 비율 ────────────────────────────────── */}
        <Card
          title="2단계 · 키와 몸 비율"
          description="키만 넣어도 진단되지만, 실제로 잰 값을 넣을수록 추천 수치가 정확해집니다."
        >
          <div className="flex flex-wrap gap-4">
            <label className="block">
              <span className="text-xs font-medium text-neutral-600">키 (cm) *</span>
              <input
                type="number"
                inputMode="decimal"
                value={height}
                onChange={(event) => setHeight(event.target.value)}
                placeholder="163"
                className="mt-1 w-28 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              />
            </label>
            <div>
              <span className="text-xs font-medium text-neutral-600">평균 기준</span>
              <div className="mt-1 flex gap-2">
                {(
                  [
                    ["female", "여성"],
                    ["male", "남성"],
                    ["other", "선택 안 함"],
                  ] as [Gender, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setGender(value)}
                    className={`rounded-lg px-3 py-2 text-sm transition ${
                      gender === value
                        ? "bg-neutral-900 text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500 hover:border-neutral-400">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onBodyPhoto(file);
              }}
            />
            {busy === "body"
              ? "전신 사진에서 비율을 재는 중…"
              : bodyPhotoUsed
                ? "전신 사진 분석 완료 — 아래 값을 확인하고 고칠 수 있습니다"
                : "전신 사진으로 비율 자동 측정 (선택)"}
          </label>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MEASUREMENT_FIELDS.map((field) => (
              <label key={field.key} className="block">
                <span className="text-xs font-medium text-neutral-600">{field.label}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={measurements[field.key]}
                  onChange={(event) =>
                    setMeasurements((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                  placeholder="cm"
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                />
                <span className="mt-0.5 block text-[10px] text-neutral-400">{field.hint}</span>
              </label>
            ))}
          </div>
        </Card>

        {/* ── 3단계: 골격 ──────────────────────────────────── */}
        <Card title="3단계 · 골격 (선택)" description="같은 체형이어도 뼈대에 따라 어울리는 소재와 핏이 달라집니다.">
          <div className="space-y-4">
            {FRAME_QUESTIONS.map((question) => (
              <fieldset key={question.key}>
                <legend className="text-sm font-medium text-neutral-800">{question.question}</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {question.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setFrame((prev) => ({ ...prev, [question.key]: option.value }))
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        frame[question.key] === option.value
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </Card>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        <button
          type="button"
          disabled={!canSubmit || busy !== null}
          onClick={() => void submit()}
          className="w-full rounded-2xl bg-neutral-900 py-4 text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {busy === "analyze" ? "진단하는 중…" : "결과 보기"}
        </button>
        {!canSubmit && (
          <p className="text-center text-xs text-neutral-500">
            키와 {colorMode === "photo" ? "피부색(사진 분석 또는 직접 선택)" : "문진 5문항 이상"}이 필요합니다.
          </p>
        )}
      </div>

      <div ref={resultRef}>
        {result && (
          <div className="mt-12 border-t border-neutral-200 pt-10">
            <ResultView result={result} sharePath={result.id ? `/style/result/${result.id}` : undefined} />
          </div>
        )}
      </div>
    </main>
  );
}
