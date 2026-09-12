const fs=require('node:fs');
const files=['Bcrypt.gs','SecurityService.gs','Code.gs','OperationsService.gs','ReliabilityService.gs','BackupService.gs','SponsorshipService.gs','ProductService.gs','DocumentService.gs','PdfService.gs'];
fs.mkdirSync('release',{recursive:true});
fs.writeFileSync('release/Code.gs',files.map(f=>'\n// ===== '+f+' =====\n'+fs.readFileSync(f,'utf8')).join('\n'));
for(const file of ['PrintTemplates.html','PrintStyles.html','PrintScripts.html','BCRYPT_LICENSE.txt','appsscript.json'])fs.copyFileSync(file,'release/'+file);
console.log('release/Code.gs combines all server modules. Use the bundle OR individual .gs files, never both. Keep the three print HTML files.');
