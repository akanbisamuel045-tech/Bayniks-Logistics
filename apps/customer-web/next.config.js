/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@logistics/shared-types', '@logistics/ui'],
  ...(process.env.DOCKER_BUILD === 'true' ? { output: 'standalone' } : {}),
};

module.exports = nextConfig;
