# Public landing page release

This release separates the public product site from the authenticated business application.

## Entry points

- `/index.html` — public, crawlable product information
- `/app.html` — login and registration application
- `/privacy.html` — public privacy and advertising policy
- `/terms.html` — public service terms

## Search and crawler behavior

- Public pages use `index,follow`.
- The authenticated app uses `noindex,nofollow`.
- `robots.txt` allows standard and advertising crawlers.

## Advertising behavior

- The current Mongolian pages do not load Google AdSense because Mongolian is not listed as a supported primary language by Google Publisher Products.
- Free users receive direct first-party sponsor cards.
- Premium/Active users receive an ad-free application.
- Shared settings are located in `ads-config.js`, with Google ads disabled by default.
