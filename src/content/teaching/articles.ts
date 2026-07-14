// Run 35 — seed articles for Watch & Read. Drafted in the house voice from the
// mock's formation topics; edit freely. To publish a new article, append an
// entry here (or have the transcript→article automation append one). Body is
// the typed Block[] shape (see types.ts); inline **bold** and *italic* render.
import type { Article } from './types';

const AUTHOR = 'Pastor Okezie Ofoegbu';

export const ARTICLES: Article[] = [
  {
    kind: 'article',
    slug: 'what-does-it-mean-to-be-with-jesus',
    title: 'What Does It Mean to “Be With Jesus”?',
    excerpt:
      'A plain guide to the practice underneath everything — before the serving, the trying, and the fixing.',
    date: '2026-07-06',
    topic: 'being-with-jesus',
    series: 'The Well',
    author: AUTHOR,
    readMin: 6,
    body: [
      { type: 'p', text: 'We talk a great deal about doing things *for* Jesus — serving, giving, leading, fixing. Far less about simply *being with* Him. And yet being with Him is the thing underneath all the others. It is the root the fruit grows from.' },
      { type: 'p', text: 'So what does it actually mean? Not a technique, and not a mood you have to manufacture. It is closer to what any friendship is made of: presence, attention, honesty, and time.' },
      { type: 'h2', text: 'It begins with presence, not performance' },
      { type: 'p', text: 'To be with Jesus is first to believe He is actually here — not as an idea, but as a Person who is near, patient, and glad to be with you. You do not have to earn the audience. You already have it. The practice is only to notice it, and to turn toward it.' },
      { type: 'quote', text: 'Abide in Me, and I in you. As the branch cannot bear fruit of itself, unless it abides in the vine, neither can you, unless you abide in Me.', cite: 'John 15:4' },
      { type: 'h2', text: 'A few honest ways to start' },
      { type: 'p', text: 'None of these are rules. They are doors. Walk through whichever one is nearest.' },
      { type: 'list', items: [
        'Give Him the first few minutes of the day before the phone gets them — a short reading, a slower breath, one honest sentence.',
        'Read a Gospel slowly, watching how He treats people, and let that reshape how you expect to be treated by Him.',
        'Turn ordinary waiting — the commute, the line, the kettle — into a moment of company rather than a moment to fill.',
        'Tell Him the truth about your day, the good and the bad, the way you would a friend who is safe.',
      ] },
      { type: 'h2', text: 'The fruit takes care of itself' },
      { type: 'p', text: 'Here is the quiet surprise: when being with Jesus comes first, the doing changes on its own. Character forms from the inside. You find yourself becoming patient, honest, and unhurried — not because you tried harder, but because you spent time with Someone patient, honest, and unhurried.' },
      { type: 'p', text: 'Start small. Start today. You are not behind, and you are not alone. **Being with Jesus before doing for Jesus** — that is the whole of it, and it is enough.' },
    ],
  },
  {
    kind: 'article',
    slug: 'you-dont-have-to-believe-first-to-belong',
    title: 'You Don’t Have to Believe First to Belong',
    excerpt:
      'On belonging as the soil where belief grows — and why the order matters more than you think.',
    date: '2026-06-22',
    topic: 'following-jesus',
    series: 'The Well',
    author: AUTHOR,
    readMin: 5,
    body: [
      { type: 'p', text: 'A lot of us learned the order backwards. Believe the right things, behave the right way, and *then* you can belong. Clean yourself up, and then come in. It sounds reverent. It is also almost exactly the opposite of how Jesus worked.' },
      { type: 'h2', text: 'Watch who He kept company with' },
      { type: 'p', text: 'The people who found Him first were rarely the ones who had it figured out. They were the curious, the wounded, the ones on the outside of the religious fence. He ate with them before they believed a single doctrine. Belonging came first. Belief grew in that soil.' },
      { type: 'quote', text: 'It is not those who are healthy who need a physician, but those who are sick. I have not come to call the righteous, but sinners, to repentance.', cite: 'Luke 5:31–32' },
      { type: 'h2', text: 'A well, not a fence' },
      { type: 'p', text: 'Most religion works like a fence: here is the boundary, here is who is in and who is out, get on the right side of the line. But Jesus is more like a well — the energy is the water in the center, drawing thirsty people toward it, wherever they happen to be standing.' },
      { type: 'p', text: 'That means the question is never *where are you standing?* It is *which way are you facing?* You can be far off and turned toward Him. You can be near and turned away. Heaven does not measure your distance; it reads your direction.' },
      { type: 'h2', text: 'So come as you are' },
      { type: 'p', text: 'You do not have to sort out your questions, tidy up your life, or arrive with the right words. Bring your doubts and your real self. That is exactly who we are expecting. Belong here first — and let belief grow the way it always has: slowly, honestly, and in good company.' },
    ],
  },
  {
    kind: 'article',
    slug: 'carrying-heaven-into-an-ordinary-week',
    title: 'Carrying Heaven Into an Ordinary Week',
    excerpt:
      'How quietly formed people change a neighborhood — not with a program, but with a presence.',
    date: '2026-06-08',
    topic: 'the-kingdom',
    series: 'The Well',
    author: AUTHOR,
    readMin: 5,
    body: [
      { type: 'p', text: 'We can make “carrying heaven” sound enormous and far away — revivals, platforms, big moves. But most of the time the kingdom of God arrives the way yeast works through dough: quietly, from the inside, one ordinary loaf at a time.' },
      { type: 'h2', text: 'The kingdom is mostly small' },
      { type: 'p', text: 'A patient reply instead of a sharp one. Money given without needing credit. A neighbor actually seen. Work done with integrity when no one is watching. None of it trends. All of it is heaven touching down in a normal week.' },
      { type: 'quote', text: 'The kingdom of heaven is like leaven, which a woman took and hid in three measures of meal till it was all leavened.', cite: 'Matthew 13:33' },
      { type: 'h2', text: 'Formed people, not busy people' },
      { type: 'p', text: 'You cannot carry what you do not have. This is why being with Jesus comes first: heaven leaks out of people who have spent time in it. The goal was never to add more religious activity to an already tired life. It was to become the kind of person through whom the presence of God quietly reaches other people.' },
      { type: 'h2', text: 'This week, then' },
      { type: 'list', items: [
        'Pick one relationship and bring more patience to it than it deserves.',
        'Do one hidden thing well, with no one to applaud it.',
        'Let one interruption become an act of love instead of an inconvenience.',
      ] },
      { type: 'p', text: 'That is how a neighborhood changes. Not loudly, not hurriedly — but faithfully, through people who have been with Jesus and cannot help carrying a little of Him wherever they go.' },
    ],
  },
];
