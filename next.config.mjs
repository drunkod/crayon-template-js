/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable to reduce warnings
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;