'use client';

import React, { useEffect, useRef, useState, CSSProperties } from 'react';

/**
 * Scroll-triggered reveal. Fade + rise (or slide/scale) when the element
 * enters the viewport, with optional stagger delay.
 */
export function Reveal({
  children,
  className = '',
  delay = 0,
  variant = 'up',
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  variant?: 'up' | 'left' | 'right' | 'scale';
  as?: 'div' | 'section' | 'span' | 'li';
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const variantClass =
    variant === 'scale' ? 'reveal-scale' : variant === 'left' ? 'reveal-left' : variant === 'right' ? 'reveal-right' : 'reveal';

  return (
    <Tag
      // @ts-expect-error polymorphic ref
      ref={ref}
      className={`${variantClass} ${visible ? 'is-visible' : ''} ${className}`}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

/** Eyebrow pill used above section headlines */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-[7px] text-[11px] font-semibold tracking-wide bg-white/[0.04] border border-white/10 text-white/70">
      {children}
    </span>
  );
}

/** Consistent marketing section wrapper */
export function Section({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`relative py-24 sm:py-32 ${className}`}>
      <div className="mx-auto max-w-7xl px-6">{children}</div>
    </section>
  );
}
