/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  // Runs 24-25: dedicated landing-page subdomains. Each host serves its
  // landing page at the bare root (every other app route still works on
  // that host). Add the domain on the Vercel project + a CNAME at the DNS
  // host (same procedure as welcome.), and the rewrite does the rest.
  //   become.gracelifecenter.com -> /become   (Run 24)
  //   begin.gracelifecenter.com  -> /begin    (Run 25)
  //   discipler.gracelifecenter.com -> /discipler (Run 27)
  //   leaders.gracelifecenter.com -> /leaders   (Run 29)
  //   thegathering.gracelifecenter.com -> /thegathering (Run 33)
  //   ask.gracelifecenter.com -> /ask (Run 59 — anonymous live sermon Q&A)
  //   gracelifecenter.com (+ www) -> /home     (Run 30 — the public website)
  // The apex serves the marketing homepage at its root; every other marketing
  // route (/im-new, /journey, ...) resolves directly on that host. Attach the
  // apex + www to this Vercel project (Add Existing + DNS) to light it up.
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/',
          has: [{ type: 'host', value: 'gracelifecenter.com' }],
          destination: '/home',
        },
        {
          source: '/',
          has: [{ type: 'host', value: 'www.gracelifecenter.com' }],
          destination: '/home',
        },
        {
          source: '/',
          has: [{ type: 'host', value: 'become.gracelifecenter.com' }],
          destination: '/become',
        },
        {
          source: '/',
          has: [{ type: 'host', value: 'begin.gracelifecenter.com' }],
          destination: '/begin',
        },
        {
          source: '/',
          has: [{ type: 'host', value: 'discipler.gracelifecenter.com' }],
          destination: '/discipler',
        },
        {
          source: '/',
          has: [{ type: 'host', value: 'leaders.gracelifecenter.com' }],
          destination: '/leaders',
        },
        {
          source: '/',
          has: [{ type: 'host', value: 'thegathering.gracelifecenter.com' }],
          destination: '/thegathering',
        },
        {
          source: '/',
          has: [{ type: 'host', value: 'ask.gracelifecenter.com' }],
          destination: '/ask',
        },
      ],
    };
  },
  // Run 29 — the printed Leaders Track posters point at
  // gracelifecenter.com/leaderstrack. Redirect that path (apex + www) to the
  // live page so no printed piece breaks. Host-scoped, so it is a safe no-op
  // unless the apex/www domain is attached to this Vercel project; if the
  // main church site is hosted elsewhere, configure the same redirect there
  // (target: https://harvest.gracelifecenter.com/leaders, later
  // https://leaders.gracelifecenter.com).
  async redirects() {
    // Run 38 — legacy-URL 301s for the domain move. The previous
    // church-platform site's URLs are still in Google's index (found live in
    // search results at cutover time): /media + /podcasts/* ("Sermons"),
    // /blog, /about/im-new, /planyourvisit, /login, plus the old WordPress
    // patterns /sermons/* and /category/*. Once the apex + www point at this
    // project, each must 301 to its new home so link equity transfers and
    // Google updates its records. Every legacy rule is HOST-SCOPED to the
    // apex + www ONLY — /login is a real app route on harvest., and none of
    // these may fire on the app hosts.
    const LEGACY = [
      { source: '/media', destination: '/teaching' },
      { source: '/media/:path*', destination: '/teaching' },
      { source: '/podcasts/:path*', destination: '/teaching' },
      { source: '/sermons/:path*', destination: '/teaching' },
      { source: '/category/:path*', destination: '/teaching' },
      { source: '/blog', destination: '/teaching' },
      { source: '/blog/:path*', destination: '/teaching' },
      { source: '/planyourvisit', destination: '/im-new' },
      { source: '/about/im-new', destination: '/im-new' },
      { source: '/login', destination: 'https://harvest.gracelifecenter.com/login' },
    ];
    const HOSTS = ['gracelifecenter.com', 'www.gracelifecenter.com'];
    const legacyRules = [];
    for (let h = 0; h < HOSTS.length; h++) {
      for (let i = 0; i < LEGACY.length; i++) {
        legacyRules.push({
          source: LEGACY[i].source,
          has: [{ type: 'host', value: HOSTS[h] }],
          destination: LEGACY[i].destination,
          permanent: true,
        });
      }
    }
    return [
      {
        source: '/leaderstrack',
        has: [{ type: 'host', value: 'gracelifecenter.com' }],
        destination: '/leaders',
        permanent: false,
      },
      {
        source: '/leaderstrack',
        has: [{ type: 'host', value: 'www.gracelifecenter.com' }],
        destination: '/leaders',
        permanent: false,
      },
    ].concat(legacyRules);
  },
};

module.exports = nextConfig;
