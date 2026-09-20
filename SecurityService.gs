'use strict';
const SECURITY_USER_HEADERS = ['SessionVersion','RecoveryHash','RecoveryExpires','RecoveryIssuedBy'];
function secureRandomBytes_(length) {
  const bytes=[];
  while(bytes.length<length) Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,Utilities.getUuid()+Utilities.getUuid(),Utilities.Charset.UTF_8).forEach(b=>bytes.push((b+256)%256));
  return bytes.slice(0,length);
}
function strongPassword_(password,legacy) {
  password=String(password||'');
  if(!legacy && password.length<12)throw new Error('Шинэ нууц үг 12-оос доошгүй тэмдэгт байна.');
  if(!password || bcrypt.truncates(password))throw new Error('Нууц үг UTF-8 хэмжээгээр 72 байтаас хэтэрч болохгүй.');
  const salt='$2b$12$'+bcrypt.encodeBase64(secureRandomBytes_(16),16);
  return bcrypt.hashSync(password,salt);
}
function secureEqual_(a,b){a=String(a);b=String(b);let d=a.length^b.length;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^(b.charCodeAt(i)||0);return d===0;}
function securityUser_(username) {return findObjectRowByValue_(masterSs_().getSheetByName(MASTER_SHEETS.USERS),['Username'],clean_(username));}
function securityRate_(key,limit,seconds){
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try{const cache=CacheService.getScriptCache(),count=Number(cache.get(key)||0);if(count>=limit)throw new Error('Олон оролдлого хийсэн байна. Түр хүлээгээд дахин оролдоно уу.');cache.put(key,String(count+1),seconds);}finally{lock.releaseLock();}
}

function secureLogin_(p) {
  const username=clean_(p.username),password=String(p.password||'');
  if(!username||!password||password.length>512)throw new Error('Нэвтрэх мэдээллээ шалгана уу.');
  securityRate_('login:'+username.toLowerCase(),10,60);
  const entry=securityUser_(username);
  if(!entry||!passwordMatches_(password,entry.object.Password))throw new Error('Хэрэглэгчийн нэр эсвэл нууц үг буруу байна.');
  const active=clean_(field_(entry.object,['Идэвхтэй'])).toLowerCase();
  if(['үгүй','inactive','false','0'].includes(active))throw new Error('Хэрэглэгчийн эрх идэвхгүй байна.');
  const upgraded=String(entry.object.Password).startsWith('$2')?null:strongPassword_(password,true);
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  let auth,token;
  try {
    const current=securityUser_(username);
    if(!current||current.object.Password!==entry.object.Password)throw new Error('Нэвтрэх мэдээлэл өөрчлөгдсөн. Дахин нэвтэрнэ үү.');
    const currentActive=clean_(field_(current.object,['Идэвхтэй'])).toLowerCase();
    if(['үгүй','inactive','false','0'].includes(currentActive))throw new Error('Хэрэглэгчийн эрх идэвхгүй байна.');
    const company=requireActiveCompany_(clean_(field_(current.object,['Company ID']))||current.object['Компани нэр']);
    if(!planSeatAllowed_(company,current.object.Username))throw new Error(company.entitlements.name+' багц '+company.entitlements.maxUsers+' идэвхтэй хэрэглэгч хүртэл. Менежер илүүдэл хэрэглэгчийг идэвхгүй болгох эсвэл багцаа ахиулна уу: '+UPGRADE_URL);
    if(upgraded)setObjectFields_(masterSs_().getSheetByName(MASTER_SHEETS.USERS),current.rowNumber,{Password:upgraded});
    auth={
      userId:clean_(field_(current.object,['User ID','UserID'])),
      username:current.object.Username,
      fullName:current.object['Бүтэн нэр'],
      role:normalizeRole_(current.object['Роль (manager/rep/admin/sales/warehouse/driver/accountant)']),
      company:company.name,
      companyId:company.id,
      sessionVersion:Number(current.object.SessionVersion||0),
      issuedAt:new Date().toISOString()
    };
    token=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
    CacheService.getScriptCache().put('session:'+token,JSON.stringify(auth),SESSION_SECONDS);
  }finally{lock.releaseLock();}
  CacheService.getScriptCache().remove('login:'+username.toLowerCase());
  return Object.assign(withOperationsRead_(auth,()=>buildInitialPayload_(auth)),{token});
}
function securityChangePassword_(auth,p) {
  const entry=securityUser_(auth.username);
  securityRate_('password:'+auth.username,5,300);
  if(!entry||!passwordMatches_(String(p.currentPassword||''),entry.object.Password))throw new Error('Одоогийн нууц үг буруу байна.');
  const hash=strongPassword_(p.newPassword,false);
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {const current=securityUser_(auth.username);if(current.object.Password!==entry.object.Password)throw new Error('Мэдээлэл өөрчлөгдсөн. Дахин оролдоно уу.');securitySavePassword_(current,hash);}
  finally {lock.releaseLock();}
  CacheService.getScriptCache().remove('session:'+p.token);
  return {success:true,message:'Нууц үг шинэчлэгдлээ. Дахин нэвтэрнэ үү.'};
}
function securitySavePassword_(entry,hash) {
  setObjectFields_(masterSs_().getSheetByName(MASTER_SHEETS.USERS),entry.rowNumber,{Password:hash,SessionVersion:Number(entry.object.SessionVersion||0)+1,RecoveryHash:'',RecoveryExpires:'',RecoveryIssuedBy:''});
}
function securityLogout_(auth,p){
  if(p.all===true){const lock=LockService.getScriptLock();lock.waitLock(30000);try{const user=securityUser_(auth.username);setObjectFields_(masterSs_().getSheetByName(MASTER_SHEETS.USERS),user.rowNumber,{SessionVersion:Number(user.object.SessionVersion||0)+1});}finally{lock.releaseLock();}}
  CacheService.getScriptCache().remove('session:'+p.token);return {success:true};
}
function securityIssueRecovery_(auth,p){
  opsAssertRole_(auth,['manager','admin']);
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const user=securityUser_(p.username);
    if(!user||user.object['Компани нэр']!==auth.company)throw new Error('Хэрэглэгч олдсонгүй.');
    const code=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
    const expires=new Date(Date.now()+30*60000).toISOString();
    setObjectFields_(masterSs_().getSheetByName(MASTER_SHEETS.USERS),user.rowNumber,{RecoveryHash:sha256_(code),RecoveryExpires:expires,RecoveryIssuedBy:auth.username});
    return {success:true,code,expires,message:'Код 30 минут хүчинтэй. Хэрэглэгчийг таньж баталгаажуулсны дараа хувийн сувгаар өгнө.'};
  }finally{lock.releaseLock();}
}
function securityCompleteRecovery_(p){
  const username=clean_(p.username);securityRate_('recover:'+username.toLowerCase(),5,300);
  const entry=securityUser_(username);
  if(!entry||!entry.object.RecoveryHash||!secureEqual_(sha256_(String(p.code||'')),entry.object.RecoveryHash)||Date.parse(entry.object.RecoveryExpires)<Date.now()||!Number.isFinite(Date.parse(entry.object.RecoveryExpires)))throw new Error('Код хүчингүй эсвэл хугацаа дууссан байна.');
  const hash=strongPassword_(p.newPassword,false),lock=LockService.getScriptLock();lock.waitLock(30000);
  try {const current=securityUser_(username);if(current.object.RecoveryHash!==entry.object.RecoveryHash||Date.parse(current.object.RecoveryExpires)<Date.now())throw new Error('Код ашиглагдсан байна.');securitySavePassword_(current,hash);}
  finally{lock.releaseLock();}
  return {success:true,message:'Нууц үг шинэчлэгдлээ. Нэвтэрнэ үү.'};
}
// Run only from the bound editor after the operator verifies the account owner.
function issueOwnerRecovery(companyName,username){ensureMasterSheets_();return securityIssueRecovery_({role:'admin',company:clean_(companyName),username:'DataLinx operator'},{username});}
