"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useCategoryScrollSpy(categoryIds: string[]) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    categoryIds[0] ?? null
  );
  const isClickScrolling = useRef(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const setSectionRef = useCallback(
    (catId: string) => (el: HTMLDivElement | null) => {
      sectionRefs.current[catId] = el;
    },
    []
  );

  useEffect(() => {
    if (categoryIds.length === 0) return;
    setActiveCategoryId((prev) =>
      prev && categoryIds.includes(prev) ? prev : categoryIds[0]
    );
  }, [categoryIds]);

  useEffect(() => {
    const sections = categoryIds
      .map((id) => sectionRefs.current[id])
      .filter((el): el is HTMLElement => Boolean(el));

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return;

        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length === 0) return;

        const id = visible[0].target.getAttribute("data-category-id");
        if (id) setActiveCategoryId(id);
      },
      {
        rootMargin: "-220px 0px -55% 0px",
        threshold: [0, 0.15, 0.35, 0.55, 0.75, 1],
      }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [categoryIds]);

  const scrollToCategory = useCallback((catId: string) => {
    setActiveCategoryId(catId);
    isClickScrolling.current = true;
    sectionRefs.current[catId]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    window.setTimeout(() => {
      isClickScrolling.current = false;
    }, 900);
  }, []);

  return { activeCategoryId, scrollToCategory, setSectionRef };
}
