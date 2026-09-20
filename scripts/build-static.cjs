const fs=require('node:fs'),path=require('node:path');
// An explicit allowlist prevents Apps Script, tests, backup files and repository metadata being served.
const files=['index.html','about.html','contact.html','privacy.html','terms.html','ads-and-cookies.html','plans.html','app.html','app-core.html','app-route.js','ads-config.js','premium-ads.js','premium-ads.css','operations-ui.js','operations-ui.css','reliability-ui.js','sponsor-metrics.js','public-ads.js','public-site.css','robots.txt','sitemap.xml','brand.css','brand.js','brand-mark.svg','workspace-ui.css','workspace-ui.js'];
fs.rmSync('dist',{recursive:true,force:true});fs.mkdirSync('dist');
for(const file of files)fs.copyFileSync(file,path.join('dist',file));
fs.cpSync('templates','dist/templates',{recursive:true});
console.log(`Static build: ${files.length} public files and CSV templates. Backend files excluded.`);

// Assemble the same modules as the source loader, avoiding fetch + document.write on production.
let app=fs.readFileSync('app-core.html','utf8');
const head='<meta name="robots" content="noindex,nofollow,noarchive"><link rel="icon" href="./brand-mark.svg">'+['premium-ads.css','operations-ui.css','brand.css','workspace-ui.css'].map(f=>`<link rel="stylesheet" href="./${f}?v=20260912ux">`).join('')+'<script src="./ads-config.js?v=20260912ux"></script>';
const tail=['premium-ads.js','operations-ui.js','sponsor-metrics.js','reliability-ui.js','brand.js','workspace-ui.js','app-route.js'].map(f=>`<script src="./${f}?v=20260912ux"></script>`).join('');
app=app.replace('</head>',head+'</head>').replace('</body>',tail+'</body>');
fs.writeFileSync('dist/app.html',app);
console.log('App assembled: no extra HTML fetch on production.');
