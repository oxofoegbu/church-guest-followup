// Run 31 — Q&A cards. When emitSchema is set, also outputs FAQPage JSON-LD
// (the format AI answer engines quote). `a` is plain text so the schema and
// the visible answer stay identical.
export type QA = { q: string; a: string };

export default function FAQ({
  items,
  columns = 2,
  emitSchema = false,
}: {
  items: QA[];
  columns?: 1 | 2;
  emitSchema?: boolean;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };
  return (
    <>
      {emitSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ) : null}
      <div className={`grid gap-4 ${columns === 2 ? 'sm:grid-cols-2' : ''}`}>
        {items.map((it, i) => (
          <div
            key={i}
            className="rounded-[10px] border border-site-claydk border-l-[3px] border-l-site-brass bg-site-paper px-6 py-5"
          >
            <h3 className="mb-1.5 font-fraunces text-[17.5px] font-semibold text-site-umber">{it.q}</h3>
            <p className="text-[14.5px] leading-[1.55] text-site-ink">{it.a}</p>
          </div>
        ))}
      </div>
    </>
  );
}
