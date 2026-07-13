// Run 30 — the Pathway: the four tracks as the "rooms" of the house, each in
// its signature gradient (design tokens §1.2). Links into the existing track
// landing pages. Reusable; the section head is supplied by the page.
import Link from 'next/link';

type Room = {
  num: string;
  rhythm: string;
  name: React.ReactNode;
  blurb: string;
  step: string;
  href: string;
  gradient: string;
};

const ROOMS: Room[] = [
  {
    num: '01',
    rhythm: 'Be · with Jesus',
    name: 'Welcome Track',
    blurb:
      "Start here. Learn to be with Jesus and turn your heart toward the Well. You don't have to believe first to belong.",
    step: 'Guest → Follower',
    href: '/begin',
    gradient: 'linear-gradient(165deg, #17343D, #10262d)',
  },
  {
    num: '02',
    rhythm: 'Become · like Jesus',
    name: <>BECOME®</>,
    blurb:
      "Twelve weeks in the Sermon on the Mount — Jesus' curriculum for the inner life. You practice; He transforms.",
    step: 'Follower → Disciple',
    href: '/become',
    gradient: 'linear-gradient(165deg, #A63D1F, #33201A)',
  },
  {
    num: '03',
    rhythm: 'Bring · heaven',
    name: 'Disciplers',
    blurb:
      'Learn to walk with one person, as someone once walked with you. Friendship with a vision.',
    step: 'Disciple → Disciple-Maker',
    href: '/discipler',
    gradient: 'linear-gradient(165deg, #3E5A34, #1F2A1D)',
  },
  {
    num: '04',
    rhythm: 'Formed · & sent',
    name: 'Leaders Track',
    blurb:
      'For those Jesus is calling to shepherd and lead. The towel, not the throne — authority that kneels.',
    step: 'Disciple-Maker → Leader',
    href: '/leaders',
    gradient: 'linear-gradient(165deg, #1F3A5F, #16233B)',
  },
];

export default function Pathway({ className = '' }: { className?: string }) {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {ROOMS.map((r) => (
        <Link
          key={r.num}
          href={r.href}
          style={{ backgroundImage: r.gradient }}
          className="group relative flex min-h-[290px] flex-col overflow-hidden rounded-2xl p-[26px] pb-6 text-site-cream shadow-[0_18px_40px_-30px_rgba(0,0,0,0.6)] transition-transform duration-200 hover:-translate-y-1"
        >
          <span className="font-fraunces text-[15px] opacity-60">{r.num}</span>
          <span className="mb-2 mt-3.5 text-[11.5px] font-semibold uppercase tracking-[0.2em] text-white/70">
            {r.rhythm}
          </span>
          <h3 className="mb-2.5 font-fraunces text-[23px] text-white">{r.name}</h3>
          <p className="flex-1 text-[14.5px] leading-[1.5] text-white/85">{r.blurb}</p>
          <span className="mt-3.5 text-[12.5px] text-white/70">{r.step}</span>
          <span className="mt-4 inline-flex items-center gap-1.5 self-start border-b border-white/40 pb-0.5 text-sm font-semibold text-white">
            Enter
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
