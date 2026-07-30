# DataLinx public site / AdSense review checklist

## Public crawlable pages

- `index.html` — public product landing page with original Mongolian content
- `privacy.html` — privacy, advertising, cookie, camera and GPS disclosure
- `terms.html` — service terms and Free/Premium conditions
- `app.html` — authenticated app entry, intentionally `noindex`
- `robots.txt` — allows normal, AdSense and display-ad crawlers

## Before requesting AdSense review

1. Open `ads-config.js`.
2. Replace:
   - `ca-pub-REPLACE_WITH_YOUR_PUBLISHER_ID`
   - `REPLACE_WITH_PUBLIC_RESPONSIVE_AD_SLOT_ID`
   - `REPLACE_WITH_APP_RESPONSIVE_AD_SLOT_ID`
3. Confirm the public root page loads without login and all public navigation links return HTTP 200.
4. Confirm `privacy.html` and `terms.html` are reachable from the footer.
5. Confirm the public page contains the AdSense account verification code required by your account. Google may request either the script or a `google-adsense-account` meta tag.
6. After Google provides the publisher record, copy `ads.txt.example` to `ads.txt` and replace the placeholder publisher number.
7. Check that `robots.txt` does not block `Mediapartners-Google` or `Google-Display-Ads-Bot`.
8. Test mobile and desktop layouts, broken links, spelling, and page loading.
9. Do not place ads on the login-only screen, barcode camera, GPS camera, PDF document, or action buttons.
10. Request review only when the production domain and all configuration values are final.

## Product behavior

- Public root page: indexable, original product information and one responsive public ad location.
- Free authenticated app: core features open; ads may display in non-blocking page locations.
- Premium/Active authenticated app: ad script is not loaded and ad slots are cleared.
- `app.html` and `app-core.html`: should not be submitted as the primary public review URL.

## Important

A public content page improves accessibility but does not guarantee AdSense approval. Google also reviews content quality, navigation, policy compliance, account setup, domain ownership, supported language, traffic quality, and other signals.
