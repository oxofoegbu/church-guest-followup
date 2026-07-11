// Run 12 — shared types + helpers for in-app workbook content
// (TrackModule.content Json). Kept dependency-free so both API routes
// and client components can import it.

export type WorkbookBlock =
  | { type: 'verse'; text: string; reference: string }
  | { type: 'bigIdea'; text: string }
  | { type: 'heading'; text: string; subtitle?: string }
  | { type: 'subheading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'lesson'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'prompt'; id: string; question: string; hint?: string }
  | { type: 'rating'; id: string; title: string; items: string[]; scaleMax?: number }
  | { type: 'checklist'; id: string; title: string; options: string[] }
  | { type: 'prayer'; title?: string; text: string }
  // Run 16 — read-only Before/After growth comparison. Each pair references
  // two rating block ids (which may live in OTHER modules, e.g. the Before
  // assessment in the Introduction module); the renderer sums the 1–5 values
  // of each side and shows the delta. When a pair carries `items`, a per-item
  // breakdown is rendered as well (used for the single-pair F.L.O.P.A. case).
  | {
      type: 'comparison'; title: string; beforeLabel: string; afterLabel: string;
      note?: string;
      pairs: { title: string; before: string; after: string; items?: string[] }[];
    };

export type WorkbookContent = { version: number; blocks: WorkbookBlock[] };

export type ReflectionEntry = { promptId: string; response: string; updatedAt: string };

// Block types whose participant input is persisted as a ModuleReflection.
// prompt   -> response is free text
// rating   -> response is a JSON object string, e.g. {"Humility — ...": 4}
// checklist-> response is a JSON array string of selected option labels
const SAVABLE_TYPES = ['prompt', 'rating', 'checklist'] as const;

export const MAX_REFLECTION_LENGTH = 10000;

export function isWorkbookContent(content: unknown): content is WorkbookContent {
  if (!content || typeof content !== 'object') return false;
  const c = content as { blocks?: unknown };
  return Array.isArray(c.blocks) && c.blocks.length > 0;
}

// Run 16 — ids referenced by comparison blocks in this module. These may
// belong to OTHER modules of the same enrollment (e.g. the Before assessment
// lives in the Introduction module while the comparison renders in the
// Appendix), so module GET routes fetch reflections for these ids across the
// whole enrollment and merge them in.
export function getComparisonRefIds(content: unknown): string[] {
  if (!isWorkbookContent(content)) return [];
  const ids: string[] = [];
  for (const block of content.blocks) {
    if (block.type === 'comparison' && Array.isArray(block.pairs)) {
      for (const pair of block.pairs) {
        if (typeof pair?.before === 'string' && pair.before) ids.push(pair.before);
        if (typeof pair?.after === 'string' && pair.after) ids.push(pair.after);
      }
    }
  }
  return ids;
}

// Ids of all blocks in this module that may be saved as reflections.
export function getSavableIds(content: unknown): string[] {
  if (!isWorkbookContent(content)) return [];
  const ids: string[] = [];
  for (const block of content.blocks) {
    if ((SAVABLE_TYPES as readonly string[]).includes(block.type)) {
      const id = (block as { id?: unknown }).id;
      if (typeof id === 'string' && id.length > 0) ids.push(id);
    }
  }
  return ids;
}
