'use strict';
const BACKUP_HEADERS=['BackupID','CompanyID','Company','FileID','CreatedAt','Status','Digest','Error','RestoreTestAt','RestoreTestFileID','SpreadsheetID'];
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
    copy=DriveApp.getFileById(company.spreadsheetId).makeCopy('DataLinx_'+(company.id||'legacy')+'_'+now.replace(/[:.]/g,'-'),backupPrivateFolder_());
    copy.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);
    const backup=SpreadsheetApp.openById(copy.getId());
    if(backupDigest_(backup)!==digest)throw new Error('Нөөц хуулбарын өгөгдөл эхтэй таарсангүй.');
    appendObjectRow_(backupLog_(),{BackupID:id,CompanyID:company.id||company.spreadsheetId,SpreadsheetID:company.spreadsheetId,Company:company.name,FileID:copy.getId(),CreatedAt:now,Status:'Verified',Digest:digest});
    return {success:true,backupId:id,createdAt:now};
  }catch(error){appendObjectRow_(backupLog_(),{BackupID:createBusinessId_('FAIL'),CompanyID:company.id||company.spreadsheetId,SpreadsheetID:company.spreadsheetId,Company:company.name,FileID:copy?copy.getId():'',CreatedAt:new Date().toISOString(),Status:'Failed',Error:String(error.message||error).slice(0,500)});throw error;}
  finally{lock.releaseLock();}
}
function backupMatchesCompany_(row,company){
  return row.CompanyID===(company.id||'') || row.CompanyID===company.spreadsheetId || row.SpreadsheetID===company.spreadsheetId;
}
function backupStatus_(auth){
  opsAssertRole_(auth,['manager','admin']);const company=requireActiveCompany_(auth.companyId||auth.company);
  const rows=sheetObjects_(backupLog_()).rows.filter(e=>backupMatchesCompany_(e.object,company)).map(e=>e.object).reverse();
  const verified=rows.find(o=>o.Status==='Verified');
  const latestAt=verified?Date.parse(verified.CreatedAt)||0:0;
  const ageHours=latestAt?Math.max(0,(Date.now()-latestAt)/3600000):null;
  return {
    success:true,
    scheduled:ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='runScheduledBackups'),
    healthy:ageHours!==null&&ageHours<=26,
    latestVerifiedAt:verified?iso_(verified.CreatedAt):'',
    latestAgeHours:ageHours===null?null:Math.round(ageHours*10)/10,
    backups:rows.slice(0,10).map(o=>({id:o.BackupID,createdAt:iso_(o.CreatedAt),status:o.Status,error:o.Error||'',restoreTestAt:iso_(o.RestoreTestAt)}))
  };
}
function backupAction_(auth,p){
  opsAssertRole_(auth,['manager','admin']);assertEntitlement_(auth,'backup');
  if(p.action==='backupStatus')return backupStatus_(auth);
  const company=requireActiveCompany_(auth.companyId||auth.company);
  if(p.action==='createBackup'){
    securityRate_('backup:'+company.spreadsheetId,2,3600);return backupCompany_(company);
  }
  if(p.action!=='testRestore')throw new Error('Нөөцлөх үйлдэл буруу байна.');
  securityRate_('restore:'+company.spreadsheetId,2,3600);
  const entry=sheetObjects_(backupLog_()).rows.find(e=>e.object.BackupID===p.backupId&&backupMatchesCompany_(e.object,company)&&e.object.Status==='Verified');
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
  ensureMasterSheets_();
  const start=Date.now(),log=sheetObjects_(backupLog_()).rows;
  const companies=sheetObjects_(masterSs_().getSheetByName(MASTER_SHEETS.COMPANIES)).rows.map(e=>getCompany_(clean_(e.object['Company ID'])||clean_(e.object['Компани нэр']))).filter(c=>c&&c.spreadsheetId&&c.status!=='Inactive'&&companyHasFeature_(c,'backup'));
  const due=companies.map(company=>({
    company,
    last:log.filter(e=>backupMatchesCompany_(e.object,company)&&e.object.Status==='Verified').reduce((n,e)=>Math.max(n,Date.parse(e.object.CreatedAt)||0),0)
  })).filter(x=>Date.now()-x.last>=24*3600000).sort((a,b)=>a.last-b.last);
  for(let i=0;i<Math.min(5,due.length)&&Date.now()-start<240000;i++){
    try{backupCompany_(due[i].company);}
    catch(error){console.error('Backup failed for company '+(due[i].company.id||due[i].company.name)+': '+error.message);}
  }
  const alertEmail=clean_(PropertiesService.getScriptProperties().getProperty('DATALINX_BACKUP_ALERT_EMAIL'));
  if(alertEmail){
    const refreshed=sheetObjects_(backupLog_()).rows;
    const stale=companies.filter(company=>{
      const last=refreshed.filter(e=>backupMatchesCompany_(e.object,company)&&e.object.Status==='Verified').reduce((n,e)=>Math.max(n,Date.parse(e.object.CreatedAt)||0),0);
      return !last||Date.now()-last>26*3600000;
    });
    const props=PropertiesService.getScriptProperties(),day=Utilities.formatDate(new Date(),'Asia/Ulaanbaatar','yyyy-MM-dd'),sent=props.getProperty('DATALINX_BACKUP_ALERT_SENT');
    if(stale.length&&sent!==day){
      MailApp.sendEmail(alertEmail,'DataLinx backup анхааруулга',stale.length+' компанийн хамгийн сүүлийн баталгаажсан нөөц 26 цагаас хуучин байна. BACKUP_LOG болон Apps Script Executions-ийг шалгана уу.');
      props.setProperty('DATALINX_BACKUP_ALERT_SENT',day);
    }
  }
}
