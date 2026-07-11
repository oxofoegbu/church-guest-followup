'use client';

// Run 12 — renders TrackModule.content blocks with savable participant
// reflections. Used by the public participant portal (/track/[token]) and
// My Tracks (/dashboard/my-tracks). Saving goes through the onSave prop so
// each page supplies its own endpoint (token-trust vs session-auth).

import { useState } from 'react';
import type { WorkbookBlock, ReflectionEntry } from '@/lib/workbook';

type Props = {
  blocks: WorkbookBlock[];
  reflections: ReflectionEntry[];
  readOnly: boolean;
  onSave: (promptId: string, response: string) => Promise<boolean>;
};

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

function parseJsonSafe<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function SaveButton({ state, onClick, readOnly }: { state: SaveState; onClick: () => void; readOnly: boolean }) {
  if (readOnly) return null;
  if (state === 'saved') return <span className="text-xs font-medium text-green-600">Saved ✓</span>;
  if (state === 'saving') return <span className="text-xs text-church-400">Saving…</span>;
  if (state === 'error') {
    return (
      <button onClick={onClick} className="text-xs font-medium text-red-600 hover:underline">
        Could not save — tap to retry
      </button>
    );
  }
  if (state === 'dirty') {
    return (
      <button onClick={onClick} className="btn-primary btn-sm text-xs px-3 py-1">
        Save
      </button>
    );
  }
  return null;
}

export default function ModuleWorkbook({ blocks, reflections, readOnly, onSave }: Props) {
  const initial: Record<string, string> = {};
  for (const r of reflections) initial[r.promptId] = r.response;

  const [responses, setResponses] = useState<Record<string, string>>(initial);
  const [states, setStates] = useState<Record<string, SaveState>>({});

  const setResponse = (id: string, value: string) => {
    setResponses(prev => ({ ...prev, [id]: value }));
    setStates(prev => ({ ...prev, [id]: 'dirty' }));
  };

  const save = async (id: string) => {
    const value = responses[id] ?? '';
    setStates(prev => ({ ...prev, [id]: 'saving' }));
    const ok = await onSave(id, value);
    setStates(prev => ({ ...prev, [id]: ok ? 'saved' : 'error' }));
  };

  const state = (id: string): SaveState => states[id] || 'idle';

  return (
    <div className="space-y-4 text-church-800">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading':
            return (
              <div key={i} className={i > 0 ? 'pt-3' : ''}>
                <h3 className="font-bold text-church-900 text-base font-serif">{block.text}</h3>
                {block.subtitle && <p className="text-xs text-church-500 italic mt-1">{block.subtitle}</p>}
              </div>
            );
          case 'subheading':
            return <h4 key={i} className="font-semibold text-church-800 text-sm pt-1">{block.text}</h4>;
          case 'verse':
            return (
              <blockquote key={i} className="border-l-4 border-brand-300 bg-brand-50/50 rounded-r-lg px-4 py-3">
                <p className="text-sm italic text-church-700">{block.text}</p>
                <p className="text-xs font-semibold text-brand-700 mt-1">— {block.reference}</p>
              </blockquote>
            );
          case 'bigIdea':
            return (
              <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs uppercase font-bold text-amber-700 mb-1">💡 Big Idea</p>
                <p className="text-sm text-church-800">{block.text}</p>
              </div>
            );
          case 'paragraph':
            return <p key={i} className="text-sm leading-relaxed">{block.text}</p>;
          case 'list':
            return block.ordered ? (
              <ol key={i} className="list-decimal pl-5 space-y-1.5 text-sm leading-relaxed">
                {block.items.map((item, j) => <li key={j}>{item}</li>)}
              </ol>
            ) : (
              <ul key={i} className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed">
                {block.items.map((item, j) => <li key={j}>{item}</li>)}
              </ul>
            );
          case 'lesson':
            return (
              <div key={i} className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm">
                <span className="font-semibold text-green-800">Lesson: </span>
                <span className="text-church-700">{block.text}</span>
              </div>
            );
          case 'quote':
            return (
              <p key={i} className="text-center text-sm italic text-brand-700 px-4 py-1">
                “{block.text}”
              </p>
            );
          case 'prayer':
            return (
              <div key={i} className="bg-church-50 border border-church-200 rounded-xl px-4 py-3">
                <p className="text-xs uppercase font-bold text-church-500 mb-1">
                  🙏 {block.title || 'Prayer'}
                </p>
                <p className="text-sm italic leading-relaxed text-church-700">{block.text}</p>
              </div>
            );
          case 'prompt': {
            const id = block.id;
            return (
              <div key={i} className="bg-white border border-church-200 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-church-900">{block.question}</p>
                {block.hint && <p className="text-xs text-church-500 mt-1 whitespace-pre-line">{block.hint}</p>}
                <textarea
                  className="input-field w-full mt-2 text-sm min-h-[80px]"
                  value={responses[id] ?? ''}
                  readOnly={readOnly}
                  placeholder={readOnly ? 'No response' : 'Write your response here\u2026'}
                  onChange={ev => setResponse(id, ev.target.value)}
                />
                <div className="flex justify-end mt-1.5 min-h-[22px]">
                  <SaveButton state={state(id)} onClick={() => save(id)} readOnly={readOnly} />
                </div>
              </div>
            );
          }
          case 'rating': {
            const id = block.id;
            const max = block.scaleMax || 5;
            const values = parseJsonSafe<Record<string, number>>(responses[id], {});
            const setItem = (label: string, n: number) => {
              const next = { ...values, [label]: n };
              setResponse(id, JSON.stringify(next));
            };
            return (
              <div key={i} className="bg-white border border-church-200 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-church-900 mb-2">{block.title}</p>
                <div className="space-y-2.5">
                  {block.items.map((label, j) => (
                    <div key={j}>
                      <p className="text-xs text-church-700 mb-1">{label}</p>
                      <div className="flex gap-1.5">
                        {Array.from({ length: max }, (_, k) => k + 1).map(n => (
                          <button
                            key={n}
                            type="button"
                            disabled={readOnly}
                            onClick={() => setItem(label, n)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold border transition-colors ${
                              values[label] === n
                                ? 'bg-brand-600 text-white border-brand-600'
                                : 'bg-white text-church-500 border-church-200 hover:border-brand-300'
                            } ${readOnly ? 'cursor-default' : ''}`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-2 min-h-[22px]">
                  <SaveButton state={state(id)} onClick={() => save(id)} readOnly={readOnly} />
                </div>
              </div>
            );
          }
          case 'checklist': {
            const id = block.id;
            const selected = parseJsonSafe<string[]>(responses[id], []);
            const toggle = (option: string) => {
              const next = selected.includes(option)
                ? selected.filter(o => o !== option)
                : [...selected, option];
              setResponse(id, JSON.stringify(next));
            };
            return (
              <div key={i} className="bg-white border border-church-200 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-church-900 mb-2">{block.title}</p>
                <div className="flex flex-wrap gap-2">
                  {block.options.map((option, j) => {
                    const on = selected.includes(option);
                    return (
                      <button
                        key={j}
                        type="button"
                        disabled={readOnly}
                        onClick={() => toggle(option)}
                        className={`text-xs rounded-full border px-3 py-1.5 text-left transition-colors ${
                          on
                            ? 'bg-brand-600 text-white border-brand-600'
                            : 'bg-white text-church-600 border-church-200 hover:border-brand-300'
                        } ${readOnly ? 'cursor-default' : ''}`}
                      >
                        {on ? '\u2713 ' : ''}{option}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-end mt-2 min-h-[22px]">
                  <SaveButton state={state(id)} onClick={() => save(id)} readOnly={readOnly} />
                </div>
              </div>
            );
          }
          case 'comparison': {
            // Run 16 — read-only Before/After growth comparison. Values come
            // from `responses`, so it updates live as ratings are tapped. The
            // referenced Before ids may belong to another module — the module
            // GET routes merge those reflections in (getComparisonRefIds).
            const sumOf = (promptId: string): number | null => {
              const values = parseJsonSafe<Record<string, number>>(responses[promptId], {});
              const nums = Object.values(values).filter(v => typeof v === 'number');
              return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) : null;
            };
            const rows = block.pairs.map(pair => ({
              pair,
              before: sumOf(pair.before),
              after: sumOf(pair.after),
            }));
            const totalBefore = rows.reduce<number>((a, r) => a + (r.before ?? 0), 0);
            const totalAfter = rows.reduce<number>((a, r) => a + (r.after ?? 0), 0);
            const complete = rows.every(r => r.before !== null && r.after !== null);
            const Delta = ({ b, a }: { b: number | null; a: number | null }) => {
              if (b === null || a === null) return <span className="text-church-300">—</span>;
              const d = a - b;
              if (d > 0) return <span className="font-bold text-green-600">▲ +{d}</span>;
              if (d < 0) return <span className="font-bold text-red-500">▼ {d}</span>;
              return <span className="font-semibold text-church-400">＝</span>;
            };
            const singlePair = block.pairs.length === 1 ? block.pairs[0] : null;
            const itemValues = (promptId: string) =>
              parseJsonSafe<Record<string, number>>(responses[promptId], {});
            return (
              <div key={i} className="bg-brand-50/60 border border-brand-200 rounded-xl px-4 py-3">
                <p className="text-sm font-bold text-church-900 mb-2">📈 {block.title}</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-church-400 uppercase">
                      <th className="text-left py-1 font-semibold"></th>
                      <th className="text-center py-1 font-semibold w-16">{block.beforeLabel}</th>
                      <th className="text-center py-1 font-semibold w-16">{block.afterLabel}</th>
                      <th className="text-center py-1 font-semibold w-16">Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {singlePair && singlePair.items ? (
                      <>
                        {singlePair.items.map((label, j) => {
                          const b = itemValues(singlePair.before)[label] ?? null;
                          const a = itemValues(singlePair.after)[label] ?? null;
                          return (
                            <tr key={j} className="border-t border-brand-100">
                              <td className="py-1.5 text-church-700">{label}</td>
                              <td className="py-1.5 text-center text-church-800">{b ?? <span className="text-church-300">—</span>}</td>
                              <td className="py-1.5 text-center text-church-800">{a ?? <span className="text-church-300">—</span>}</td>
                              <td className="py-1.5 text-center"><Delta b={b} a={a} /></td>
                            </tr>
                          );
                        })}
                      </>
                    ) : (
                      rows.map((r, j) => (
                        <tr key={j} className="border-t border-brand-100">
                          <td className="py-1.5 text-church-700">{r.pair.title}</td>
                          <td className="py-1.5 text-center text-church-800">{r.before ?? <span className="text-church-300">—</span>}</td>
                          <td className="py-1.5 text-center text-church-800">{r.after ?? <span className="text-church-300">—</span>}</td>
                          <td className="py-1.5 text-center"><Delta b={r.before} a={r.after} /></td>
                        </tr>
                      ))
                    )}
                    <tr className="border-t-2 border-brand-200 font-bold text-church-900">
                      <td className="py-1.5">Total</td>
                      <td className="py-1.5 text-center">{rows.some(r => r.before !== null) ? totalBefore : <span className="text-church-300 font-normal">—</span>}</td>
                      <td className="py-1.5 text-center">{rows.some(r => r.after !== null) ? totalAfter : <span className="text-church-300 font-normal">—</span>}</td>
                      <td className="py-1.5 text-center">{complete ? <Delta b={totalBefore} a={totalAfter} /> : <span className="text-church-300 font-normal">—</span>}</td>
                    </tr>
                  </tbody>
                </table>
                {!complete && (
                  <p className="text-xs text-church-500 mt-2">
                    Complete both the {block.beforeLabel} and {block.afterLabel} assessments to see your full growth comparison.
                  </p>
                )}
                {block.note && <p className="text-xs text-church-500 italic mt-2">{block.note}</p>}
              </div>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}
