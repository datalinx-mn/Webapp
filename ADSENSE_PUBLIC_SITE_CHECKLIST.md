# DataLinx public site / advertising checklist

## Public crawlable pages

- `index.html` — public product landing page with original Mongolian content
- `privacy.html` — privacy, advertising, cookie, camera and GPS disclosure
- `terms.html` — service terms and Free/Premium conditions
- `app.html` — authenticated app entry, intentionally `noindex`
- `robots.txt` — allows normal and advertising crawlers

## Important AdSense language limitation

Google Publisher Products do not currently list Mongolian as a supported primary content language. Google policy does not allow Google ad code on pages whose content is primarily in an unsupported language.

For this reason:

- `ads-config.js` has `enabled: false`.
- The Mongolian public landing page shows a direct first-party sponsor card instead of Google Ads.
- The Mongolian authenticated app uses direct sponsor ads for Free users.
- Premium/Active users see no ads.
- Do not enable AdSense merely by pasting a publisher ID into the current Mongolian pages.

## A future supported-language AdSense site

Only consider AdSense after creating substantial, original public content in a supported language and confirming that the reviewed pages comply with current Google Publisher Policies.

Before review:

1. Build complete supported-language public pages, not a thin translation or login-only screen.
2. Confirm the public root and navigation links load without login and return HTTP 200.
3. Publish privacy, terms, about/contact, product explanation, pricing and useful help content.
4. Confirm `robots.txt` does not block `Mediapartners-Google` or `Google-Display-Ads-Bot`.
5. Add the account verification code required by the AdSense account.
6. Replace the placeholder publisher and ad-slot values in `ads-config.js`.
7. Set `enabled: true` only for supported-language pages.
8. Copy `ads.txt.example` to `ads.txt` and replace the placeholder publisher number after Google provides the correct record.
9. Test mobile/desktop layouts, broken links, spelling, navigation and page speed.
10. Do not place ads on login screens, barcode/GPS cameras, PDFs, action buttons or pages with insufficient original content.

## Product behavior

- Public Mongolian root: indexable original product information and direct sponsor placement.
- Free authenticated app: core features open; direct sponsor ads may display in non-blocking locations.
- Premium/Active authenticated app: all ad slots are cleared.
- `app.html` and `app-core.html`: not submitted as the public review URL.

A public content page improves crawler accessibility, but it does not override supported-language, content-quality, navigation, ownership, account or policy requirements.
