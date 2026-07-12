/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  // Run 24: the dedicated BECOME(R) subdomain serves the /become landing
  // page at its root. Add become.gracelifecenter.com as a domain on the
  // Vercel project (like welcome.) and this rewrite makes the bare host
  // land on the page; every other app route still works on that host.
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/',
          has: [{ type: 'host', value: 'become.gracelifecenter.com' }],
          destination: '/become',
        },
      ],
    };
  },
};

module.exports = nextConfig;
