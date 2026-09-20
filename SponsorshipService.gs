'use strict';
// First-party aggregate counts only. No company, user, sales, GPS, or customer fields are stored.
function recordSponsorEvent_(auth,p){
  const company=requireActiveCompany_(auth.companyId || auth.company);
  if(!company.entitlements.ads)return {success:true,ignored:true};
  if(!['impression','click'].includes(p.event)||!['today','money','sales','inventory','distribution','dashboard','settings','more'].includes(p.placement))throw new Error('Зарын үйл явдал буруу байна.');
  const ad=getActiveAds_().find(a=>a.id===p.adId&&['all',p.placement].includes(a.placement));
  if(!ad)return {success:true,ignored:true};
  const eventId=clean_(p.eventId);if(!/^[a-zA-Z0-9_-]{8,120}$/.test(eventId))throw new Error('Үйл явдлын дугаар буруу.');
  securityRate_('ad-events:'+sha256_(p.token),40,60);
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    const cache=CacheService.getScriptCache(),key='ad-event:'+sha256_(p.token+'|'+eventId);
    if(cache.get(key))return {success:true,duplicate:true};
    const ss=masterSs_();ensureSheet_(ss,'SPONSOR_METRICS',['Day','AdID','Placement','Impressions','Clicks']);
    const sheet=ss.getSheetByName('SPONSOR_METRICS'),day=opsDay_();
    const old=sheetObjects_(sheet).rows.find(e=>e.object.Day===day&&e.object.AdID===ad.id&&e.object.Placement===p.placement);
    const column=p.event==='impression'?'Impressions':'Clicks';
    if(old){const update={};update[column]=Number(old.object[column]||0)+1;setObjectFields_(sheet,old.rowNumber,update);}
    else{const row={Day:day,AdID:ad.id,Placement:p.placement,Impressions:0,Clicks:0};row[column]=1;appendObjectRow_(sheet,row);}
    cache.put(key,'1',21600);return {success:true};
  }finally{lock.releaseLock();}
}
// Operator-only report. Counts are browser observations, not audited billable traffic.
function getSponsorReport(startDay,endDay){
  opsDate_(startDay,true);opsDate_(endDay,true);const sheet=masterSs_().getSheetByName('SPONSOR_METRICS');
  return sheet?sheetObjects_(sheet).rows.map(e=>e.object).filter(o=>o.Day>=startDay&&o.Day<=endDay):[];
}
