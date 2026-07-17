// Run 35 — sermon videos for Watch & Read. Each entry embeds a YouTube video
// by its 11-char id. To publish a sermon, append an entry here. (Enhancement
// path: a curated YouTube playlist becomes the source, and this array is
// generated from that playlist — the component shape stays the same.)
//
// Seeded from Pastor Okezie's provided YouTube URLs (Run 35). NOTE: `date` is a
// placeholder ordering value — set the real upload date to reorder/re-feature
// (the hub features the newest). Two provided links were duplicates
// ('Seek First The Kingdom' shared an id with 'How God's Kingdom Comes';
// 'How To Be Fruitful, Multiply & Fill the Earth' shared an id with the CRM
// history message) — add those two once their correct URLs are in hand.
import type { Sermon } from './types';

const OKEZIE = 'Pastor Okezie Ofoegbu';
const COSMAS = 'Dr. Cosmas Ilechukwu';

export const SERMONS: Sermon[] = [
  {
    kind: 'sermon',
    slug: 'going-beyond-your-limitations',
    title: 'Going Beyond Your Limitations',
    excerpt:
      'The limits we accept are rarely the limits God set. A call to press past what has held you back, into the larger life He intends.',
    date: '2026-07-12',
    topic: 'following-jesus',
    author: COSMAS,
    youTubeId: 'aNAekM6vdY8',
  },
  {
    kind: 'sermon',
    slug: 'what-you-do-with-your-life-matters',
    title: 'How To Make Sure What You Do With Your Life Matters',
    excerpt:
      'Most of us fear a wasted life more than a hard one. How to spend yours on what will still matter when everything else has passed away.',
    date: '2026-07-05',
    topic: 'following-jesus',
    author: OKEZIE,
    youTubeId: 'LC0LxDVO668',
  },
  {
    kind: 'sermon',
    slug: 'the-power-of-boundaries',
    title: 'Just Say No — Unleashing the Power of Boundaries',
    excerpt:
      'A holy “no” is what protects your best “yes.” Why healthy boundaries are not selfishness, but stewardship of the life you’ve been given.',
    date: '2026-06-28',
    topic: 'formation',
    author: OKEZIE,
    youTubeId: 'UOLeA6re0BM',
  },
  {
    kind: 'sermon',
    slug: 'how-gods-kingdom-comes',
    title: 'How God’s Kingdom Comes',
    excerpt:
      'The kingdom rarely arrives with noise. How heaven actually breaks into ordinary lives and places — quietly, and from the inside out.',
    date: '2026-06-21',
    topic: 'the-kingdom',
    author: OKEZIE,
    youTubeId: 'YH3LOKh4E1A',
  },
  {
    kind: 'sermon',
    slug: 'the-spirituality-of-money',
    title: 'Faith Clinic — The Spirituality of Money',
    excerpt:
      'Money is never just money; it forms the heart. A clear, honest look at handling it in a way that keeps you free rather than owned.',
    date: '2026-06-14',
    topic: 'formation',
    author: COSMAS,
    youTubeId: 'zzOdgOLsp3E',
  },
  {
    kind: 'sermon',
    slug: 'history-and-mission-of-crm',
    title: 'A Brief History & Mission of Charismatic Renewal Ministries',
    excerpt:
      'Where we came from, and what we’re for: the story of a movement born of a prophetic call to prepare people for a Great Harvest.',
    date: '2026-06-07',
    topic: 'the-kingdom',
    author: COSMAS,
    youTubeId: 'OLlN803QGWI',
  },
  {
    kind: 'sermon',
    slug: 'joy-unspeakable',
    title: 'Joy Unspeakable in the Midst of Trials Unimaginable',
    excerpt:
      'Joy is not the absence of trouble but a deeper presence within it. How to hold on to a gladness the storm cannot reach.',
    date: '2026-05-31',
    topic: 'following-jesus',
    author: OKEZIE,
    youTubeId: 'G79oyCBB1Ew',
  },
  {
    kind: 'sermon',
    slug: 'change-your-life-for-the-better',
    title: 'You Can Change Your Life for the Better',
    excerpt:
      'Change is possible — not by willpower, but by the grace that meets you where you are. A hopeful word for anyone ready to begin.',
    date: '2026-05-24',
    topic: 'formation',
    author: OKEZIE,
    youTubeId: 'oPBPwQGI4SI',
  },
];
