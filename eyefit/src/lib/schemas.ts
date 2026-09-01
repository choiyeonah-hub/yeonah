import { z } from "zod";
import { LENS_INDEX_IDS, LENS_OPTION_IDS } from "./lenses";
import type { LensIndexId, LensOptionId } from "./types";

export const lensIndexSchema = z.enum(LENS_INDEX_IDS as [LensIndexId, ...LensIndexId[]]);
export const lensOptionsSchema = z
  .array(z.enum(LENS_OPTION_IDS as [LensOptionId, ...LensOptionId[]]))
  .max(10);

/** 사용자가 제보하는 실제 지불 견적. 도수는 받지 않는다(민감정보를 아예 안 만든다). */
export const quoteReportSchema = z.object({
  region: z.string().min(1).max(20),
  storeKind: z.enum(["체인", "동네", "온라인/기타"]),
  lensIndex: lensIndexSchema,
  lensOptions: lensOptionsSchema,
  /** 렌즈 값만. 테 값은 브랜드마다 달라 비교가 무의미하다. */
  lensPrice: z.number().int().min(0).max(3_000_000),
  /** 누진렌즈 여부는 금액대가 완전히 달라 따로 받는다. */
  progressive: z.boolean(),
  note: z.string().max(200).optional(),
});
