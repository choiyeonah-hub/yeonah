"use client";

import { useCallback, useState } from "react";
import StepFace from "@/components/glasses/StepFace";
import StepFrames from "@/components/glasses/StepFrames";
import StepLens from "@/components/glasses/StepLens";
import StepPrescription from "@/components/glasses/StepPrescription";
import StepStores from "@/components/glasses/StepStores";
import type { FitState } from "@/lib/glasses/types";

const STEP_LABELS = ["얼굴", "도수", "테", "렌즈", "안경원"];

const INITIAL: FitState = {
  face: null,
  prescription: null,
  skipPrescription: false,
  screenHours: 6,
  outdoorHeavy: false,
  frameId: null,
  lensIndex: "1.60",
  lensOptions: ["hard-multi", "uv400"],
  region: null,
  storeKind: null,
  storeId: null,
};

export default function FitWizard() {
  // 상태를 메모리에만 둔다. 사진도 도수도 localStorage에 남기지 않는다.
  const [state, setState] = useState<FitState>(INITIAL);
  const [step, setStep] = useState(0);

  const patch = useCallback((p: Partial<FitState>) => setState((s) => ({ ...s, ...p })), []);

  return (
    <div className="space-y-6">
      <nav aria-label="진행 단계">
        <ol className="flex items-center gap-1 text-xs">
          {STEP_LABELS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-1">
              <button
                type="button"
                // 이미 지나온 단계로는 되돌아갈 수 있게 한다.
                disabled={i > step}
                onClick={() => setStep(i)}
                className={`w-full rounded-full px-2 py-1.5 font-medium transition ${
                  i === step
                    ? "bg-havruta-600 text-white"
                    : i < step
                      ? "bg-havruta-100 text-havruta-800"
                      : "bg-stone-100 text-stone-400"
                }`}
              >
                {i + 1}. {label}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {step === 0 && (
        <StepFace
          face={state.face}
          onChange={(face) => patch({ face })}
          onNext={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <StepPrescription
          prescription={state.prescription}
          skip={state.skipPrescription}
          screenHours={state.screenHours}
          outdoorHeavy={state.outdoorHeavy}
          onChange={patch}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}

      {step === 2 && state.face && (
        <StepFrames
          face={state.face}
          prescription={state.prescription}
          frameId={state.frameId}
          onSelect={(frameId) => patch({ frameId })}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && state.frameId && (
        <StepLens
          frameId={state.frameId}
          prescription={state.prescription}
          screenHours={state.screenHours}
          outdoorHeavy={state.outdoorHeavy}
          lensIndex={state.lensIndex}
          lensOptions={state.lensOptions}
          onChange={patch}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && state.face && state.frameId && (
        <StepStores
          face={state.face}
          prescription={state.prescription}
          frameId={state.frameId}
          lensIndex={state.lensIndex}
          lensOptions={state.lensOptions}
          region={state.region}
          storeKind={state.storeKind}
          storeId={state.storeId}
          onChange={patch}
          onBack={() => setStep(3)}
        />
      )}
    </div>
  );
}
