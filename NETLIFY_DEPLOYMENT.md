# DataLinx Netlify deployment

Production URL: https://datalinx-business.netlify.app/
App URL: https://datalinx-business.netlify.app/app.html
Project dashboard: https://app.netlify.com/projects/datalinx-business
Site ID: `f7d72260-d8ba-494f-86ab-c3ddf3d19291`
Team: `nzoogii`

Created and first published on 2026-09-12 using the connected Netlify uploader.
Initial deployment: `6aa4ff5de275bb6deac7c7e2` (production, ready).

Build: `npm run build`; publish directory: `dist`; Node: 22.
Source: `datalinx-mn/Webapp`, branch `feat/daily-business-operations`.
Deployments currently use a source upload. A GitHub push does not automatically redeploy this project; continuous deployment has not been connected.

The Apps Script backend is deployed separately. After the user replaced the modular scripts, added the three Print HTML files, saved and redeployed, the public capabilities check returned `success: true`, `operationsVersion: 1`, `reliabilityVersion: 1`. The user also reports running `setupDailyBackups`. Authenticated live business writes and backup output have not been independently verified.

## UI release prepared on 2026-09-13

Brand, landing page and app accessibility improvements are in this branch. The production build assembles the app HTML to avoid a second HTML fetch. See `BRAND_UX_MN.md` for changes, research and domain proposals.

Deployment is pending: automatic approval review rejected the Netlify uploader invocation because it executes an unpinned external package and uploads repository source to the existing Netlify project without sufficiently explicit authorization in the UI request. No alternate upload or deployment was attempted after rejection. Request explicit approval for uploading this repository to the existing `datalinx-business` site and publishing the UI release before retrying. Code tests pass; real browser layout validation remains pending because the cloud browser could not open the local preview (`ERR_BLOCKED_BY_CLIENT`).

For server installations, use either the ten modular `.gs` files or the combined Code.gs; do not mix the two. Both options require the three Print HTML files and the manifest.
