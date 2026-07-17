// Run 43 — the weekly newsletter theme rotation.
// The digest is an *evergreen* themed selection drawn from the whole Watch &
// Read library, not a "what's new this week" list — so a person who joined last
// month still meets the earlier teaching. The rotation loops one theme per ISO
// week and maps onto the site's own topic taxonomy (src/content/teaching), so
// there is always material and each theme deepens automatically as new articles
// are tagged into its topics. Repeats across cycles are intentional.

import type { TopicSlug } from '@/content/teaching/types';

export interface NewsletterTheme {
  key: string;
  label: string;
  // A short, warm intro shown at the top of the digest (Grace Life voice).
  blurb: string;
  // Articles in these topics are prioritized for this theme.
  topics: TopicSlug[];
  // Fallback signal (full-text search) when a theme's topics are still thin.
  keywords: string[];
}

export const THEMES: NewsletterTheme[] = [
  {
    key: 'being-with-jesus',
    label: 'Being With Jesus',
    blurb:
      'Before we ever do anything for God, we are invited to simply be with Him. This week, a few pieces on the secret place — where a hidden life with Jesus becomes the root of everything else.',
    topics: ['being-with-jesus', 'the-well'],
    keywords: ['presence', 'secret place', 'intimacy', 'abide', 'quiet', 'communion'],
  },
  {
    key: 'the-kingdom',
    label: 'The Kingdom of Heaven',
    blurb:
      'Jesus preached one central message: the Kingdom of God is near. These readings explore what it means that heaven is available now, and how His reign changes the way we live today.',
    topics: ['the-kingdom'],
    keywords: ['kingdom', 'heaven', 'reign', 'authority', 'rule', 'dominion'],
  },
  {
    key: 'prayer-and-spirit',
    label: 'Prayer & the Spirit',
    blurb:
      'We were never meant to live the Christian life on our own strength. This week, teaching on prayer and the life of the Holy Spirit — the power and nearness God gives to everyday people.',
    topics: ['prayer-and-spirit'],
    keywords: ['prayer', 'holy spirit', 'power', 'gifts', 'filled', 'pray'],
  },
  {
    key: 'following-jesus',
    label: 'Following Jesus',
    blurb:
      'To follow Jesus is the great adventure of a life. These pieces are about what it actually looks like to come, to follow, and to be formed by walking with Him.',
    topics: ['following-jesus'],
    keywords: ['follow', 'disciple', 'obedience', 'cost', 'come', 'surrender'],
  },
  {
    key: 'formation',
    label: 'Becoming Like Jesus',
    blurb:
      'God is not only saving us; He is shaping us. This week, teaching on Christian formation — how grace remakes our character and settles us into a new identity.',
    topics: ['formation'],
    keywords: ['formation', 'character', 'identity', 'grow', 'new', 'transform'],
  },
  {
    key: 'sermon-on-the-mount',
    label: 'The Way of the Kingdom',
    blurb:
      "In the Sermon on the Mount, Jesus draws the portrait of a life lived under heaven's rule. These readings sit with His words and the blessed life He describes.",
    topics: ['sermon-on-the-mount'],
    keywords: ['blessed', 'beatitude', 'mount', 'righteousness', 'salt', 'light'],
  },
  {
    key: 'church-without-fences',
    label: 'A Church Without Fences',
    blurb:
      'We long to be a well, not a fence — a people whose life with God overflows to a neighbor. This week, teaching on mission, welcome, and carrying heaven wherever we go.',
    topics: ['church-without-fences'],
    keywords: ['mission', 'welcome', 'evangelism', 'neighbor', 'lost', 'harvest'],
  },
  {
    key: 'the-well',
    label: 'Come to the Well',
    blurb:
      'To everyone who is thirsty, the invitation still stands: come. These pieces return us to grace — the free, unearned welcome of God that begins and sustains the whole journey.',
    topics: ['the-well', 'being-with-jesus'],
    keywords: ['grace', 'invitation', 'thirst', 'come', 'welcome', 'free'],
  },
];
