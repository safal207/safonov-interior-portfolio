# Verification — 9 October 2026

## Passed

- Static verification: 14 HTML pages, 13 distinct concepts, RU/EN content, 39 linked assets, valid source viewports and palette values.
- Chromium: homepage at 320, 390, 768 and 1440 px; all 13 case pages at 320 px in Russian and English and at 1440 px in Russian.
- Filters: 13 total, 3 studios, 9 one-bedroom homes, 1 family home; visible count and announced count agree.
- English stays selected when navigating from the homepage to a case.
- Keyboard: visualization opens with Enter, closes with Escape and restores focus to its opening button.
- Render images and source links load; no JavaScript errors or HTTP failures in the browser run.
- Source screenshots remain unchanged. Their displayed viewports use the original bytes.
- Final visualization review corrected an extra kitchen window in the Kinokvartal studio and an unintended balcony door in the Kotelniki bedroom.

## Reproduction

```bash
node scripts/build.mjs
node scripts/verify.mjs
node scripts/preview.mjs
node scripts/smoke.mjs
node scripts/verify-preview.mjs
```

The two browser scripts require Playwright and a Chromium executable. In Codex, the runtime-provided package is supported. `PORTFOLIO_CHROMIUM_EXECUTABLE` can select an already installed executable. `smoke.mjs` starts its own temporary local HTTP server and closes it after the checks.

The standalone preview is checked separately for filters, RU/EN, navigation, embedded source/render assets, the lightbox and absence of network dependencies.

The JSON results in this directory record the completed runs. Browser checks cover Chromium; Firefox and Safari have not been exercised in this version.

## GitHub publication

- The public repository `safal207/safonov-interior-portfolio` was created on 9 October 2026 and confirmed through the signed-in GitHub UI and repository metadata.
- All 60 source files were uploaded. The published tree SHA `eadda244dfcf06d728c3fc1f4ef12b791962ef69` matched the locally verified source tree, including every render and original screenshot.
- [Verify portfolio run 1](https://github.com/safal207/safonov-interior-portfolio/actions/runs/37896410588) passed for publication commit `8c9a5ae1c2ab39cc47663a99404dc5ddd308abce`.
- [GitHub Pages](https://safal207.github.io/safonov-interior-portfolio/) was published successfully by [run 37970169623](https://github.com/safal207/safonov-interior-portfolio/actions/runs/37970169623) for commit `018c2de9c7dcbf24b0ad1aae2feb55cc9af6cc70`.
- The SEO release has 28 static RU/EN pages. [Verify portfolio](https://github.com/safal207/safonov-interior-portfolio/actions/runs/37970169620) passed for that same release.
- Live HTTPS verification confirmed status 200 and exact bytes for all 28 pages, 26 referenced assets and sitemap.xml. The public OG JPEG matches the checked cover. Details: `live-verification.json`.
- A fresh interactive browser inspection of the public site and a real messenger unfurl were unavailable in this run. Interaction and responsive checks passed locally; the served HTML, scripts and assets were verified byte-for-byte. GitHub repository social-preview settings were not updated; the new cover is configured for the website URL.
