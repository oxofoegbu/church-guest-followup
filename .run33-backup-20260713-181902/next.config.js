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
    ];
  },
};

module.exports = nextConfig;
