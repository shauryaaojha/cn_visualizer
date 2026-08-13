/** @type {import('next').NextConfig} */
const nextConfig = {
  // Every route is prerendered and there is no server code, so the app ships as
  // plain files. `npm run build` writes ./out — drop that on any static host
  // (Vercel, Netlify, Cloudflare Pages, GitHub Pages, a college web server).
  output: "export",

  // Emit topics/foo/index.html rather than topics/foo.html. Vercel and Netlify
  // resolve extensionless URLs on their own, but a plain Apache/nginx/python
  // server does not — this makes the export work on all of them.
  trailingSlash: true,

  // next/image would need a server to optimise; nothing here uses it, but this
  // keeps the export from failing if a future page does.
  images: { unoptimized: true },
};

export default nextConfig;
