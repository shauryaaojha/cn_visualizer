/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lesson pages are still prerendered at build time and served as static
  // files. Only sign-in (/api/auth), /login, /onboarding and /dashboard run on
  // the server, because they need the session and MongoDB. This used to be
  // `output: "export"`; that mode has no server, so accounts cannot work in it.
  //
  // trailingSlash went with it: Vercel resolves extensionless URLs itself, and
  // a slash redirect in front of /api/auth/callback/* only adds a hop to every
  // OAuth round trip.

  // next/image would need the optimiser; nothing here uses it.
  images: { unoptimized: true },
};

export default nextConfig;
