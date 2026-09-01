import Link from "next/link";
import { notFound } from "next/navigation";
import FrameSvg from "@/components/glasses/FrameSvg";
import { prisma } from "@/lib/db";
import { FACE_SHAPES, FRAME_SHAPE_LABEL } from "@/lib/glasses/faceShapes";
import { findFrame } from "@/lib/glasses/frames";
import { diopter, won } from "@/lib/glasses/format";
import { LENS_INDEXES, LENS_OPTIONS } from "@/lib/glasses/lenses";
import { findStore } from "@/lib/glasses/stores";
import type { EyeRx, FaceShapeId, LensIndexId, LensOptionId } from "@/lib/glasses/types";

export const dynamic = "force-dynamic";

/** 010-1234-5678 → 010-****-5678 */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return phone;
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

export default async function ReservationPage({ params }: { params: { code: string } }) {
  const reservation = await prisma.fitReservation.findUnique({
    where: { code: params.code.toUpperCase() },
  });
  if (!reservation) notFound();

  const frame = findFrame(reservation.frameId);
  const store = findStore(reservation.storeId);
  const rx = reservation.prescription as
    | { right: EyeRx; left: EyeRx; add: number | null; pd: number | null }
    | null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-havruta-300 bg-white p-6 text-center">
        <p className="text-sm text-havruta-600">방문 예약이 접수되었습니다</p>
        <p className="my-2 font-mono text-4xl font-bold tracking-widest text-havruta-900">
          {reservation.code}
        </p>
        <p className="text-sm text-havruta-700">매장에서 이 코드를 보여주세요.</p>
      </div>

      {store && (
        <section className="rounded-2xl border border-havruta-200 bg-white p-5">
          <h2 className="font-bold text-havruta-900">{store.name}</h2>
          <p className="mt-1 text-sm text-havruta-700">{store.address}</p>
          <p className="mt-1 text-xs text-havruta-600">
            {store.kind} · ★ {store.rating} · 완성까지 {store.turnaround}
            {store.freeExam && " · 무료 정밀검안"}
          </p>
        </section>
      )}

      {frame && (
        <section className="rounded-2xl border border-havruta-200 bg-white p-5">
          <h2 className="font-bold text-havruta-900">주문 내역 (예상)</h2>
          <FrameSvg shape={frame.shape} rim={frame.rim} className="my-3 h-20 w-full" />
          <dl className="space-y-1 text-sm text-havruta-800">
            <div className="flex justify-between">
              <dt>
                {frame.brand} {frame.name} · {FRAME_SHAPE_LABEL[frame.shape]}
              </dt>
              <dd>{won(reservation.framePrice)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>
                {LENS_INDEXES[reservation.lensIndex as LensIndexId]?.label ?? reservation.lensIndex}
                {reservation.lensOptions.length > 0 &&
                  ` + ${reservation.lensOptions
                    .map((o) => LENS_OPTIONS[o as LensOptionId]?.label ?? o)
                    .join(", ")}`}
              </dt>
              <dd>{won(reservation.lensPrice)}</dd>
            </div>
            <div className="mt-2 flex justify-between border-t border-havruta-100 pt-2 font-bold text-havruta-900">
              <dt>합계</dt>
              <dd>{won(reservation.totalPrice)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-havruta-600">
            매장 검안 결과에 따라 렌즈 사양과 금액이 달라질 수 있습니다. 결제는 매장에서 합니다.
          </p>
        </section>
      )}

      {reservation.faceShape && (
        <section className="rounded-2xl border border-havruta-200 bg-white p-5">
          <h2 className="font-bold text-havruta-900">얼굴 분석 요약</h2>
          <p className="mt-1 text-sm text-havruta-800">
            {FACE_SHAPES[reservation.faceShape as FaceShapeId]?.label}
            {reservation.faceSummary && ` — ${reservation.faceSummary}`}
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-havruta-200 bg-white p-5">
        <h2 className="font-bold text-havruta-900">매장에 전달되는 정보</h2>
        <p className="mt-1 text-sm text-havruta-800">
          {reservation.contactName} · {maskPhone(reservation.contactPhone)}
        </p>
        {reservation.sensitiveConsent && rx ? (
          <div className="mt-3 text-sm text-havruta-800">
            <p className="font-medium">도수 (동의하에 전달)</p>
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
          <p className="mt-3 text-sm text-havruta-700">
            도수는 전달하지 않았습니다. 매장에서 안경사가 직접 검안합니다.
          </p>
        )}
        <p className="mt-3 text-xs text-havruta-600">
          얼굴 사진과 처방전 이미지는 저장되지 않았습니다. 위 정보 외에 매장으로 넘어가는 개인정보는
          없습니다.
        </p>
      </section>

      <Link href="/glasses/fit" className="block text-center text-sm text-havruta-700 underline">
        다른 안경 다시 찾아보기
      </Link>
    </div>
  );
}
