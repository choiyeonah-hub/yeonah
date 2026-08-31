"use client";

import { useEffect } from "react";

import { saveLastProfile } from "@/lib/style/closet";
import type { StyleProfileResult } from "@/lib/style/types";

// 공유 링크로 결과를 연 경우에도 옷장 화면이 이 결과를 기준으로 판정할 수 있게 브라우저에 남긴다.
export default function SaveProfileLocally({ result }: { result: StyleProfileResult }) {
  useEffect(() => {
    saveLastProfile(result);
  }, [result]);

  return null;
}
