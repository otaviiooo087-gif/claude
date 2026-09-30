const basePath = process.env.GITHUB_PAGES === 'true' ? '/claude' : '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  trailingSlash: true,
};

module.exports = nextConfig;
