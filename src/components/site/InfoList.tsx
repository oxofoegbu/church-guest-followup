// Run 31 — labeled icon rows (When & Where, Contact details).
import type { ReactNode } from 'react';

export type InfoItem = { icon: ReactNode; title: string; detail: string; href?: string };

export default function InfoList({ items }: { items: InfoItem[] }) {
  return (
    <div className="grid gap-5">
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-3.5">
          <div className="grid h-[42px] w-[42px] flex-none place-items-center rounded-full bg-site-cream2 text-site-brassdk">
            {it.icon}
          </div>
          <div>
            <h3 className="font-fraunces text-[16px] font-semibold text-site-umber">
              {it.href ? (
                <a href={it.href} className="underline-offset-2 transition-colors hover:text-site-ember">{it.title}</a>
              ) : (
                it.title
              )}
            </h3>
            <p className="mt-0.5 text-[14.5px] leading-[1.5] text-site-soft">{it.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
