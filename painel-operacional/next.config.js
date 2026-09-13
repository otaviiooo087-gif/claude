const basePath = process.env.GITHUB_PAGES === 'true' ? '/claude' : '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath,
};

module.exports = nextConfig;
