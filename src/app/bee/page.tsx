"use client";

import { useEffect, useRef } from "react";
import { mount } from "@/lib/bee/standalone";

export default function BeePage() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return mount(el);
  }, []);

  return <div id="app" ref={ref} />;
}
