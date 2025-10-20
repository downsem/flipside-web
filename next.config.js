/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Redirect any request that hits the old project subdomain
  // to the canonical flipside.vercel.app domain.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'flipside-web.vercel.app' }],
        destination: 'https://flipside.vercel.app/:path*',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
