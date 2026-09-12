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

The Apps Script backend is deployed separately. The current configured `/exec?action=capabilities` endpoint returned `SyntaxError: Identifier DOCUMENT_TYPES has already been declared (DocumentService, line 1)` during this release check, so live login, payments and other business writes are not verified. Follow `RELIABILITY_RELEASE_MN.md` to deploy the combined server bundle and verify `reliabilityVersion: 1` before accepting real business data.

When using the combined `release/Code.gs`, do not also keep its individual server modules in the same Apps Script project. Keep the combined Code.gs, the three Print HTML files and the manifest; preserve a project backup before removing duplicate source files, then create a new deployment version.
