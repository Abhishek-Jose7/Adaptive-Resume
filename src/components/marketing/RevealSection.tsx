"use client";

import { PropsWithChildren, useEffect, useRef, useState } from "react";

export function RevealSection({ children, className = "", id }: PropsWithChildren<{ className?: string; id?: string }>) {
  const section = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = section.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setReady(true);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={section} id={id} className={`${className} ${ready ? "proof-reveal-ready" : ""} ${visible ? "proof-reveal-visible" : ""}`}>
      {children}
    </section>
  );
}
