import { z } from "zod";
import { FACE_SHAPE_IDS } from "./faceShapes";
import { LENS_INDEX_IDS, LENS_OPTION_IDS } from "./lenses";
import type { FaceShapeId, FrameShapeId, LensIndexId, LensOptionId } from "./types";

const FRAME_SHAPES = [
  "round",
  "boston",
  "oval",
  "square",
  "wellington",
  "rectangle",
  "cat-eye",
  "browline",
  "octagon",
  "aviator",
] as const satisfies readonly FrameShapeId[];

export const lensIndexSchema = z.enum(LENS_INDEX_IDS as [LensIndexId, ...LensIndexId[]]);
export const lensOptionsSchema = z
  .array(z.enum(LENS_OPTION_IDS as [LensOptionId, ...LensOptionId[]]))
  .max(10);

/** 맞춤 제작 치수. 사람이 쓸 수 있는 안경테의 물리적 범위 안으로 묶는다. */
export const customSpecSchema = z.object({
  shape: z.enum(FRAME_SHAPES),
  rim: z.enum(["full", "half", "rimless"]),
  lensWidth: z.number().min(38).max(62),
  bridge: z.number().min(12).max(26),
  lensHeight: z.number().min(24).max(52),
  temple: z.number().min(125).max(160),
  totalWidth: z.number().min(110).max(160),
  nosePadHeight: z.number().min(3).max(18),
  material: z.string().min(1).max(40),
  color: z.string().min(1).max(40),
  decentrationPerEye: z.number().min(-20).max(20).nullable(),
  rationale: z.array(z.string().max(400)).max(12),
});

const eyeSchema = z.object({
  sph: z.number().min(-25).max(25).nullable(),
  cyl: z.number().min(-10).max(10).nullable(),
  axis: z.number().min(0).max(180).nullable(),
});

export const prescriptionSchema = z.object({
  right: eyeSchema,
  left: eyeSchema,
  add: z.number().min(0).max(4).nullable(),
  pd: z.number().min(45).max(80).nullable(),
  measuredAt: z.string().nullable(),
});

export const faceSchema = z.object({
  faceShape: z.enum(FACE_SHAPE_IDS as [FaceShapeId, ...FaceShapeId[]]),
  summary: z.string().max(2000),
  metrics: z.record(z.union([z.string(), z.number()])),
});

/** 테를 어떻게 구하는지. 두 갈래의 필수 항목이 다르다. */
export const frameSelectionSchema = z
  .object({
    frameMode: z.enum(["stock", "custom"]),
    frameId: z.string().max(60).nullable().optional(),
    factoryId: z.string().max(60).nullable().optional(),
    customSpec: customSpecSchema.nullable().optional(),
  })
  .refine((v) => (v.frameMode === "stock" ? !!v.frameId : !!v.factoryId && !!v.customSpec), {
    message: "기성품은 테를, 맞춤 제작은 공장과 설계 치수를 골라야 합니다.",
  });
