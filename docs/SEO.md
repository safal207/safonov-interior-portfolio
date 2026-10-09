# SEO and social previews — 10 October 2026

- 38 static, crawlable pages: RU and EN homepages plus 18 concepts in each language. English content and navigation also work without JavaScript.
- Each language version has its own title, description, canonical URL, reciprocal RU/EN and x-default alternates. Homepage canonical URLs use the directory root.
- `sitemap.xml` lists all 38 canonical URLs, their language alternates and concept images. The Pages workflow includes the sitemap and the EN directory in the deployed artifact.
- JSON-LD describes the author, website, collection, concept works and breadcrumbs. All work remains labelled as conceptual and AI-generated.
- Complete Open Graph and Twitter metadata use absolute HTTPS image URLs, accurate dimensions, image types and alternative text.
- The homepage card uses `assets/renders/will-towers-72-6.webp`: 1536 × 1024, generated with built-in imagegen and encoded as WebP. Generation briefs and asset paths are in `MOSCOW_PREMIUM.md`.
- Browser verification passed at 320, 390, 768 and 1440 px, with case pages in both languages, filters, keyboard lightbox and static navigation without JavaScript. See `smoke-results.json`.

The project is served below a GitHub Pages subdirectory. A nested robots.txt would not control host-level crawler access, so it is not used. Search-engine discovery and actual indexing are separate from these technical checks. No Search Console verification or indexing submission is claimed.

References: [Open Graph](https://ogp.me/), [Google multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites), [Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview).
