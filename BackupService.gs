'use strict';
const BACKUP_HEADERS=['BackupID','CompanyID','Company','FileID','CreatedAt','Status','Digest','Error','RestoreTestAt','RestoreTestFileID'];
function backupLog_(){const ss=masterSs_();ensureSheet_(ss,'BACKUP_LOG',BACKUP_HEADERS);return ss.getSheetByName('BACKUP_LOG');}
function backupDigest_(ss){return sha256_(JSON.stringify(ss.getSheets().map(s=>({name:s.getName(),values:s.getDataRange().getValues()}))));}
function backupPrivateFolder_(){
  const props=PropertiesService.getScriptProperties(),id=props.getProperty('DATALINX_BACKUP_FOLDER');
  const folder=id?DriveApp.getFolderById(id):DriveApp.createFolder('DataLinx private backups');
  folder.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);
  if(!id)props.setProperty('DATALINX_BACKUP_FOLDER',folder.getId());return folder;
}
function backupCompany_(company){
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  let copy;
  try{
    const ss=openCompanySs_(company);ensureCompanySheets_(ss);opsRecover_(ss);SpreadsheetApp.flush();
    const digest=backupDigest_(ss),now=new Date().toISOString(),id=createBusinessId_('BACKUP');
    copy=DriveApp.getFileById(company.spreadsheetId).makeCopy('DataLinx_'+company.spreadsheetId+'_'+now.replace(/[:.]/g,'-'),backupPrivateFolder_());
    copy.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);
    const backup=SpreadsheetApp.openById(copy.getId());
    if(backupDigest_(backup)!==digest)throw new Error('Нөөц хуулбарын өгөгдөл эхтэй таарсангүй.');
    appendObjectRow_(backupLog_(),{BackupID:id,CompanyID:company.spreadsheetId,Company:company.name,FileID:copy.getId(),CreatedAt:now,Status:'Verified',Digest:digest});
    return {success:true,backupId:id,createdAt:now};
  }catch(error){appendObjectRow_(backupLog_(),{BackupID:createBusinessId_('FAIL'),CompanyID:company.spreadsheetId,Company:company.name,FileID:copy?copy.getId():'',CreatedAt:new Date().toISOString(),Status:'Failed',Error:String(error.message||error).slice(0,500)});throw error;}
  finally{lock.releaseLock();}
}
function backupStatus_(auth){
  opsAssertRole_(auth,['manager','admin']);const company=requireActiveCompany_(auth.company);
  const rows=sheetObjects_(backupLog_()).rows.filter(e=>e.object.CompanyID===company.spreadsheetId).map(e=>e.object).reverse();
  return {success:true,scheduled:ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='runScheduledBackups'),backups:rows.slice(0,10).map(o=>({id:o.BackupID,createdAt:iso_(o.CreatedAt),status:o.Status,error:o.Error||'',restoreTestAt:iso_(o.RestoreTestAt)}))};
}
function backupAction_(auth,p){
  opsAssertRole_(auth,['manager','admin']);
  if(p.action==='backupStatus')return backupStatus_(auth);
  const company=requireActiveCompany_(auth.company);
  if(p.action==='createBackup'){
    securityRate_('backup:'+company.spreadsheetId,2,3600);return backupCompany_(company);
  }
  if(p.action!=='testRestore')throw new Error('Нөөцлөх үйлдэл буруу байна.');
  securityRate_('restore:'+company.spreadsheetId,2,3600);
  const entry=sheetObjects_(backupLog_()).rows.find(e=>e.object.BackupID===p.backupId&&e.object.CompanyID===company.spreadsheetId&&e.object.Status==='Verified');
  if(!entry)throw new Error('Баталгаажсан нөөц олдсонгүй.');
  const copy=DriveApp.getFileById(entry.object.FileID).makeCopy('RESTORE_TEST_'+entry.object.BackupID,backupPrivateFolder_());
  copy.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);
  if(backupDigest_(SpreadsheetApp.openById(copy.getId()))!==entry.object.Digest)throw new Error('Сэргээх шалгалт амжилтгүй. Одоогийн өгөгдөл солигдоогүй.');
  setObjectFields_(backupLog_(),entry.rowNumber,{RestoreTestAt:new Date().toISOString(),RestoreTestFileID:copy.getId()});
  return {success:true,verified:true,message:'Тусдаа хуулбар нээж бүх хүснэгтийн өгөгдлийг тулгалаа. Ажиллаж буй өгөгдөл солигдоогүй. Хуулбарыг оператор хувийн эрхээр нээнэ.'};
}
// Run once in the bound Apps Script editor and authorize Drive + time triggers.
function setupDailyBackups(){
  PropertiesService.getScriptProperties().setProperty('DATALINX_MASTER_ID',masterSs_().getId());backupLog_();backupPrivateFolder_();
  if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='runScheduledBackups'))ScriptApp.newTrigger('runScheduledBackups').timeBased().everyHours(1).create();
  return 'Цаг тутам хугацаа болсон 5 хүртэл компанийг нөөцөлнө. BACKUP_LOG шалгана уу.';
}
function runScheduledBackups(){
  const start=Date.now(),companies=values_(masterSs_().getSheetByName(MASTER_SHEETS.COMPANIES)).slice(1),log=sheetObjects_(backupLog_()).rows;
  const due=companies.filter(r=>r[1]).map(r=>({name:r[0],spreadsheetId:r[1],last:log.filter(e=>e.object.CompanyID===r[1]&&e.object.Status==='Verified').reduce((n,e)=>Math.max(n,Date.parse(e.object.CreatedAt)||0),0)})).filter(c=>Date.now()-c.last>=24*3600000).sort((a,b)=>a.last-b.last);
  for(let i=0;i<Math.min(5,due.length)&&Date.now()-start<240000;i++){try{backupCompany_(due[i]);}catch(error){console.error('Backup failed for company '+due[i].spreadsheetId+': '+error.message);}}
}
