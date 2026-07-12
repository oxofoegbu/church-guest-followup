/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  // Runs 24-25: dedicated landing-page subdomains. Each host serves its
  // landing page at the bare root (every other app route still works on
  // that host). Add the domain on the Vercel project + a CNAME at the DNS
  // host (same procedure as welcome.), and the rewrite does the rest.
  //   become.gracelifecenter.com -> /become   (Run 24)
  //   begin.gracelifecenter.com  -> /begin    (Run 25)
  async rewrites() {
    return {
      beforeFiles: [
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
      ],
    };
  },
};

module.exports = nextConfig;
