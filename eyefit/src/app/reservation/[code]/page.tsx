import Link from "next/link";
import { notFound } from "next/navigation";
import FactoryOrderSheet from "@/components/FactoryOrderSheet";
import FrameSvg from "@/components/FrameSvg";
import { prisma } from "@/lib/db";
import { FACE_SHAPES, FRAME_SHAPE_LABEL } from "@/lib/faceShapes";
import { findFactory } from "@/lib/factories";
import { findFrame } from "@/lib/frames";
import { diopter, won } from "@/lib/format";
import { LENS_INDEXES, LENS_OPTIONS } from "@/lib/lenses";
import { findStore } from "@/lib/stores";
import type {
  CustomSpec,
  EyeRx,
  FaceShapeId,
  LensIndexId,
  LensOptionId,
} from "@/lib/types";

export const dynamic = "force-dynamic";

/** 010-1234-5678 → 010-****-5678 */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return phone;
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

export default async function OrderPage({ params }: { params: { code: string } }) {
  const order = await prisma.fitOrder.findUnique({ where: { code: params.code.toUpperCase() } });
  if (!order) notFound();

  const store = findStore(order.storeId);
  const stockFrame = order.frameId ? findFrame(order.frameId) : undefined;
  const factory = order.factoryId ? findFactory(order.factoryId) : undefined;
  const spec = order.customSpec as CustomSpec | null;
  const rx = order.prescription as
    | { right: EyeRx; left: EyeRx; add: number | null; pd: number | null }
    | null;

  const shape = order.frameMode === "custom" ? spec?.shape : stockFrame?.shape;
  const rim = order.frameMode === "custom" ? spec?.rim : stockFrame?.rim;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-ink-300 bg-white p-6 text-center">
        <p className="text-sm text-ink-600">
          {order.frameMode === "custom" ? "맞춤 제작 주문이 접수되었습니다" : "방문 예약이 접수되었습니다"}
        </p>
        <p className="my-2 font-mono text-4xl font-bold tracking-widest text-ink-900">{order.code}</p>
        <p className="text-sm text-ink-700">매장에서 이 코드를 보여주세요.</p>
        <p className="mt-2 text-xs text-ink-600">예상 소요 약 {order.estimatedDays}일</p>
      </div>

      {store && (
        <section className="rounded-2xl border border-ink-200 bg-white p-5">
          <h2 className="font-bold text-ink-900">렌즈 조제 · 피팅 — {store.name}</h2>
          <p className="mt-1 text-sm text-ink-700">{store.address}</p>
          <p className="mt-1 text-xs text-ink-600">
            {store.kind} · ★ {store.rating} · 완성까지 {store.turnaround}
            {store.freeExam && " · 무료 정밀검안"}
          </p>
          <p className="mt-2 text-xs text-ink-600">
            최종 검안과 렌즈 조제·피팅은 이 매장의 안경사가 담당합니다.
          </p>
        </section>
      )}

      {order.frameMode === "custom" && factory && spec && (
        <section className="rounded-2xl border border-ink-200 bg-white p-5">
          <h2 className="font-bold text-ink-900">테 제작 — {factory.name}</h2>
          <p className="mt-1 text-xs text-ink-600">
            {factory.country} {factory.region} · 제작 {factory.leadDays}일 ·{" "}
            {factory.certifications.join(", ")}
          </p>
          <FrameSvg shape={spec.shape} rim={spec.rim} className="my-3 h-20 w-full" color="#2c4753" />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            {[
              ["렌즈 가로폭", `${spec.lensWidth}mm`],
              ["브릿지", `${spec.bridge}mm`],
              ["렌즈 세로폭", `${spec.lensHeight}mm`],
              ["템플 길이", `${spec.temple}mm`],
              ["테 전체폭", `${spec.totalWidth}mm`],
              ["코받침 높이", `${spec.nosePadHeight}mm`],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-ink-600">{k}</dt>
                <dd className="font-medium text-ink-900">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-ink-600">
            {spec.material} · {spec.color} · 각인 {spec.lensWidth}□{spec.bridge}-{spec.temple}
            {spec.nosePadAngleDeg != null && ` · 코받침 ${spec.nosePadAngleDeg}°`}
            {spec.templeDropMm != null && ` · 템플 꺾임 ${spec.templeDropMm}mm`}
          </p>
        </section>
      )}

      {order.frameMode === "custom" && factory && spec && (
        <FactoryOrderSheet code={order.code} factory={factory} spec={spec} />
      )}

      <section className="rounded-2xl border border-ink-200 bg-white p-5">
        <h2 className="font-bold text-ink-900">금액 (예상)</h2>
        {shape && rim && order.frameMode === "stock" && (
          <FrameSvg shape={shape} rim={rim} className="my-3 h-20 w-full" color="#2c4753" />
        )}
        <dl className="space-y-1 text-sm text-ink-800">
          <div className="flex justify-between">
            <dt>
              {order.frameMode === "custom"
                ? `맞춤 테 ${spec ? FRAME_SHAPE_LABEL[spec.shape] : ""} (플랫폼 판매)`
                : `${stockFrame?.brand ?? ""} ${stockFrame?.name ?? "테"} (매장 판매)`}
            </dt>
            <dd>{won(order.framePrice)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>
              {LENS_INDEXES[order.lensIndex as LensIndexId]?.label ?? order.lensIndex}
              {order.lensOptions.length > 0 &&
                ` + ${order.lensOptions
                  .map((o) => LENS_OPTIONS[o as LensOptionId]?.label ?? o)
                  .join(", ")}`}{" "}
              (안경원 조제)
            </dt>
            <dd>{won(order.lensPrice)}</dd>
          </div>
          <div className="mt-2 flex justify-between border-t border-ink-100 pt-2 font-bold text-ink-900">
            <dt>합계</dt>
            <dd>{won(order.totalPrice)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-ink-600">
          매장 검안 결과에 따라 렌즈 사양과 금액이 달라질 수 있습니다. 결제는 매장에서 합니다.
        </p>
      </section>

      {order.faceShape && (
        <section className="rounded-2xl border border-ink-200 bg-white p-5">
          <h2 className="font-bold text-ink-900">얼굴 분석 요약</h2>
          <p className="mt-1 text-sm text-ink-800">
            {FACE_SHAPES[order.faceShape as FaceShapeId]?.label}
            {order.faceSummary && ` — ${order.faceSummary}`}
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-ink-200 bg-white p-5">
        <h2 className="font-bold text-ink-900">전달되는 정보</h2>
        <p className="mt-1 text-sm text-ink-800">
          {order.contactName} · {maskPhone(order.contactPhone)}
        </p>
        {order.sensitiveConsent && rx ? (
          <div className="mt-3 text-sm text-ink-800">
            <p className="font-medium">도수 (동의하에 안경원에 전달)</p>
            <p>
              오른쪽 {diopter(rx.right?.sph ?? null)} / {diopter(rx.right?.cyl ?? null)} ×{" "}
              {rx.right?.axis ?? "—"}
            </p>
            <p>
              왼쪽 {diopter(rx.left?.sph ?? null)} / {diopter(rx.left?.cyl ?? null)} ×{" "}
              {rx.left?.axis ?? "—"}
            </p>
            <p>
              ADD {diopter(rx.add)} · PD {rx.pd ?? "—"}mm
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-700">
            도수는 전달하지 않았습니다. 매장에서 안경사가 직접 검안합니다.
          </p>
        )}
        <p className="mt-3 text-xs text-ink-600">
          얼굴 사진과 처방전 이미지는 저장되지 않았습니다. 공장에는 설계 치수만 전달되고 도수와
          연락처는 전달되지 않습니다.
        </p>
      </section>

      <Link href="/fit" className="block text-center text-sm text-ink-700 underline">
        다른 안경 다시 찾아보기
      </Link>
    </div>
  );
}
