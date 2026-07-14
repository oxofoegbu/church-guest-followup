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
const EWA = 'Pastor John Ewa';

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
    featured: true,
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
    date: '2022-04-06',
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

  // --- Added Run 36: further sermons with their real upload dates. ---
  {
    kind: 'sermon',
    slug: 'becoming-agents-of-revival-part-2',
    title: 'Becoming Agents of Revival — Part 2',
    excerpt:
      'Revival is not a meeting we attend but a fire we carry. How ordinary people become the ones through whom God renews a place.',
    date: '2024-03-09',
    topic: 'prayer-and-spirit',
    author: OKEZIE,
    youTubeId: 'CFavMuVr94w',
  },
  {
    kind: 'sermon',
    slug: 'love-is-not-a-feeling',
    title: 'Love Is Not a Feeling',
    excerpt:
      'Real love is a decision that outlasts the mood. What it looks like to love the way Jesus did — on purpose, and all the way through.',
    date: '2023-01-21',
    topic: 'following-jesus',
    author: OKEZIE,
    youTubeId: 'Xa4sik5uG2I',
  },
  {
    kind: 'sermon',
    slug: 'rejoice-in-the-lord',
    title: 'Rejoice in the Lord',
    excerpt:
      'Joy is not denial of what’s hard; it’s a deeper ground beneath it. How to keep a settled gladness rooted in God, whatever the season.',
    date: '2022-12-11',
    topic: 'following-jesus',
    author: OKEZIE,
    youTubeId: '_zyCgX2P7s8',
  },
  {
    kind: 'sermon',
    slug: 'leading-and-living-like-jesus',
    title: 'Leading and Living Like Jesus',
    excerpt:
      'The way up in God’s kingdom is down. What it means to lead and to live the way Jesus did — as a servant, from the inside out.',
    date: '2022-11-13',
    topic: 'following-jesus',
    author: EWA,
    youTubeId: 'gkjxgqbN0b0',
  },
  {
    kind: 'sermon',
    slug: 'assembled-for-your-victory',
    title: 'Assembled for Your Victory',
    excerpt:
      'We were never meant to fight alone. Why God sets us in a people — and how the gathered church becomes the place your breakthrough comes.',
    date: '2022-10-09',
    topic: 'the-kingdom',
    author: OKEZIE,
    youTubeId: 'Qnc5gING0h0',
  },
  {
    kind: 'sermon',
    slug: 'preparation-for-successful-marriage',
    title: 'Power and Preparation for a Successful Marriage',
    excerpt:
      'A marriage is built long before the wedding and long after it. Honest, practical wisdom for preparing a love that lasts.',
    date: '2022-08-28',
    topic: 'formation',
    author: OKEZIE,
    youTubeId: 'DOchvfcgTaY',
  },
  {
    kind: 'sermon',
    slug: 'seek-first-the-kingdom',
    title: 'Seek First the Kingdom',
    excerpt:
      'Jesus’ cure for anxiety is a reordering of loves. What changes when His kingdom, not our worry, sits at the center of the day.',
    date: '2022-03-13',
    topic: 'sermon-on-the-mount',
    author: OKEZIE,
    youTubeId: 'I4-zTu13VTE',
  },
  {
    kind: 'sermon',
    slug: 'be-fruitful-multiply-and-fill-the-earth',
    title: 'How To Be Fruitful, Multiply & Fill the Earth',
    excerpt:
      'The first blessing was a commission: to be fruitful and fill the earth. What that ancient calling means for an ordinary life today.',
    date: '2020-08-02',
    topic: 'the-kingdom',
    author: OKEZIE,
    youTubeId: 'PPHwKFjaN50',
  },
];
