const fs=require('node:fs'),path=require('node:path');
// An explicit allowlist prevents Apps Script, tests, backup files and repository metadata being served.
const files=['index.html','about.html','contact.html','privacy.html','terms.html','ads-and-cookies.html','plans.html','app.html','app-core.html','app-route.js','ads-config.js','premium-ads.js','premium-ads.css','operations-ui.js','operations-ui.css','reliability-ui.js','sponsor-metrics.js','public-ads.js','public-site.css','robots.txt'];
fs.rmSync('dist',{recursive:true,force:true});fs.mkdirSync('dist');
for(const file of files)fs.copyFileSync(file,path.join('dist',file));
fs.cpSync('templates','dist/templates',{recursive:true});
console.log(`Static build: ${files.length} public files and CSV templates. Backend files excluded.`);
