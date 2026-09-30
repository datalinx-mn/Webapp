'use strict';

// User-facing reads stay inside the same company lock and visibility rules as writes.
function uxDateRange_(p) {
  const today=opsDay_();
  const from=opsDate_(p.from||today.slice(0,7)+'-01',true),to=opsDate_(p.to||today,true);
  if(from>to)throw new Error('Эхлэх өдөр дуусах өдрөөс хойш байна.');
  return {from,to};
}
function uxText_(value,max) {
  const v=clean_(value);if(v.length>(max||200)||/^\s*[=+@]/.test(v))throw new Error('Текст хэт урт эсвэл зөвшөөрөхгүй тэмдэгтээр эхэлсэн байна.');return v;
}
function uxPublicSettings_(ss) {
  const settings=getSettingsMap_(ss),out={};
  ['CompanyName','RegistrationNumber','Address','Phone','Email','LogoUrl','DefaultPaymentTermDays','ShowVisits'].forEach(k=>out[k]=settings[k]||'');return out;
}
function uxStocks_(ss) {
  const entries=opsRows_(ss,COMPANY_SHEETS.WAREHOUSE_STOCK),batches=opsRows_(ss,'Цуврал'),today=opsDay_();
  const warehouses=getWarehouses_(ss),first=warehouses[0]?.name;
  return getProducts_(ss).flatMap(p=>{
    const matches=entries.filter(e=>e.object.ProductID?e.object.ProductID===p.id:e.object['Бараа']===p.name);
    return warehouses.map(w=>{
      const stock=matches.length?matches.filter(e=>e.object['Агуулах']===w.name).reduce((n,e)=>n+Number(e.object['Үлдэгдэл']||0),0):(w.name===first?p.stock:0);
      const expired=batches.filter(e=>e.object['Агуулах']===w.name&&(e.object.ProductID?e.object.ProductID===p.id:e.object['Бараа']===p.name)&&e.object['Дуусах огноо']&&opsDay_(e.object['Дуусах огноо'])<today).reduce((n,e)=>n+Math.max(0,Number(e.object['Үлдэгдэл']||0)),0);
      return {productId:p.id,product:p.name,warehouse:w.name,stock,available:Math.max(0,stock-expired)};
    });
  });
}
function uxSaleSummary_(ss,auth,id) {
  const sale=opsSale_(ss,id,auth),o=sale.rows[0]?.object||{};
  const visits=opsGrouped_(ss,COMPANY_SHEETS.VISITS,'SaleID',id);
  const delivery=visits.length?visits[visits.length-1].object:null;
  return {saleId:id,date:sale.date,customer:sale.customer,total:sale.total,net:sale.net,paidAmount:sale.paid,remaining:sale.remaining,returned:sale.returned,refundDue:sale.refundDue,
    status:sale.status,warehouse:sale.warehouse,paymentType:o['Төлбөрийн төрөл']||'',rep:o['Рэп нэр']||'',notes:o.Notes||'',dueDate:sale.dueDate,
    invoiceNumber:o.InvoiceNumber||'',invoicePdfUrl:o.InvoicePdfUrl||'',distributionId:delivery?.DistributionID||o.DeliveryID||'',deliveryStatus:delivery?.Status||'',
    quantity:sale.items.reduce((n,i)=>n+i.quantity,0),itemCount:sale.items.length,productNames:sale.items.map(i=>i.product),ledgerComplete:true};
}
function uxEnrichTransactions_(ss,auth,rows) {
  const summaries={};rows.forEach(tx=>{if(!summaries[tx.saleId])summaries[tx.saleId]=uxSaleSummary_(ss,auth,tx.saleId);tx.saleSummary=summaries[tx.saleId];});return rows;
}
function uxVisibleSales_(ss,auth) {
  const seen=new Set();return opsRows_(ss,COMPANY_SHEETS.SALES).filter(e=>{
    const id=saleRowIdentifier_(e);if(seen.has(id)||!opsCanSeeSale_(auth,e,ss))return false;seen.add(id);return true;
  });
}
function uxPage_(rows,p) {
  const size=Math.min(100,Math.max(1,Math.floor(Number(p.limit)||50))),page=Math.max(0,Math.floor(Number(p.page)||0));
  if(!Number.isFinite(page)||page>100000)throw new Error('Хуудасны дугаар буруу.');
  return {success:true,total:rows.length,page,limit:size,rows:rows.slice(page*size,(page+1)*size),hasMore:(page+1)*size<rows.length};
}
function uxFilterDay_(value,p) {const d=opsDay_(value);return (!p.from||d>=opsDate_(p.from,true))&&(!p.to||d<=opsDate_(p.to,true));}
function uxRead_(auth,p) {
  return withOperationsRead_(auth,()=>{
    const company=requireActiveCompany_(auth.companyId||auth.company),ss=openCompanySs_(company);
    if(p.kind==='sales') {
      const q=clean_(p.query).toLowerCase();
      const entries=uxVisibleSales_(ss,auth).filter(e=>uxFilterDay_(e.object['Огноо'],p));
      let rows=entries.map(e=>uxSaleSummary_(ss,auth,saleRowIdentifier_(e))).filter(s=>!q||[s.customer,s.invoiceNumber,...s.productNames].join(' ').toLowerCase().includes(q));
      if(p.payment==='due')rows=rows.filter(s=>s.remaining>0);
      if(p.payment==='paid')rows=rows.filter(s=>s.remaining===0&&!['Cancelled','Цуцлагдсан'].includes(s.status));
      if(p.payment==='cancelled')rows=rows.filter(s=>['Cancelled','Цуцлагдсан'].includes(s.status));
      rows.sort((a,b)=>b.date.localeCompare(a.date)||b.saleId.localeCompare(a.saleId));
      const out=uxPage_(rows,p);out.rows=out.rows.map(s=>({saleId:s.saleId,date:s.date,customer:s.customer,saleSummary:s,product:s.productNames.join(', '),total:s.total,quantity:s.quantity,status:s.status,paidAmount:s.paidAmount,paymentType:s.paymentType}));return out;
    }
    if(p.kind==='history') {
      const config={inventory:[COMPANY_SHEETS.INVENTORY_MOVES,'Огноо',['manager','admin','warehouse']],expenses:['Зардал','Date',['manager','admin','accountant']],purchases:['Худалдан авалт','Date',['manager','admin','accountant','warehouse']]};
      const c=config[p.resource];if(!c)throw new Error('Түүхийн төрөл буруу.');opsAssertRole_(auth,c[2]);
      const q=clean_(p.query).toLowerCase();
      return uxPage_(opsRows_(ss,c[0]).map(e=>e.object).filter(o=>uxFilterDay_(o[c[1]],p)&&(!q||Object.values(o).join(' ').toLowerCase().includes(q))).sort((a,b)=>String(b[c[1]]).localeCompare(String(a[c[1]]))),p);
    }
    if(p.kind==='report') {
      opsAssertRole_(auth,['manager','admin','accountant']);const range=uxDateRange_(p);
      const dashboard=buildDashboard_(ss,range);
      if(companyHasFeature_(company,'profitability')) {
        const sales=uxVisibleSales_(ss,auth).filter(e=>uxFilterDay_(e.object['Огноо'],range)).map(e=>opsSale_(ss,saleRowIdentifier_(e),auth)).filter(s=>!['cancelled','цуцлагдсан','draft','ноорог'].includes(s.status.toLowerCase()));
        dashboard.profitKnown=opsMoney_(sales.reduce((n,s)=>n+Number(s.grossProfitKnown||0),0));dashboard.costComplete=sales.every(s=>s.costCoveragePct>=99.999);
      }
      return {success:true,dashboard};
    }
    if(p.kind==='business') {
      opsAssertRole_(auth,['manager','admin']);return {success:true,settings:uxPublicSettings_(ss),warehouses:getWarehouses_(ss),verifiedEmail:securityUser_(auth.username)?.object.VerifiedEmail||'',requests:opsRows_(ss,'Үйлчилгээний хүсэлт').map(e=>e.object).reverse().slice(0,50)};
    }
    if(p.kind==='requests')return {success:true,requests:opsRows_(ss,'Үйлчилгээний хүсэлт').filter(e=>isManagerRole_(auth.role)||e.object.CreatedBy===auth.username).map(e=>e.object).reverse().slice(0,50)};
    if(p.kind==='customers') {
      opsAssertRole_(auth,['manager','admin','accountant','rep','sales']);
      const allSales=uxVisibleSales_(ss,auth).map(e=>uxSaleSummary_(ss,auth,saleRowIdentifier_(e)));
      const visible=new Set(allSales.map(s=>s.customer));
      const rows=opsRows_(ss,COMPANY_SHEETS.CUSTOMERS).map(e=>e.object).filter(o=>o['Идэвхтэй']!=='Үгүй').filter(o=>isManagerRole_(auth.role)||auth.role==='accountant'||visible.has(o['Харилцагчийн нэр']));
      const q=clean_(p.query).toLowerCase();return uxPage_(rows.filter(o=>Object.values(o).join(' ').toLowerCase().includes(q)).map(o=>({id:o.CustomerID,name:o['Харилцагчийн нэр'],phone:o['Утас'],address:o['Хаяг'],registrationNumber:o['Регистрийн дугаар'],contactPerson:o['Холбоо барих хүн']})),p);
    }
    if(p.kind==='customer') {
      opsAssertRole_(auth,['manager','admin','accountant','rep','sales']);
      const customer=opsRows_(ss,COMPANY_SHEETS.CUSTOMERS).find(e=>e.object.CustomerID===p.id);if(!customer)throw new Error('Харилцагч олдсонгүй.');
      const name=customer.object['Харилцагчийн нэр'],sales=uxVisibleSales_(ss,auth).filter(e=>e.object['Харилцагч']===name).map(e=>opsPublicSale_(opsSale_(ss,saleRowIdentifier_(e),auth)));
      if(!isManagerRole_(auth.role)&&auth.role!=='accountant'&&!sales.length)throw new Error('Харах эрх хүрэлцэхгүй.');
      if(isManagerRole_(auth.role)||auth.role==='accountant')opsRows_(ss,'Эхний авлага').filter(e=>e.object['Харилцагч']===name).forEach(e=>sales.push(opsPublicSale_(dataOpeningSale_(ss,e.object.OpeningID,auth))));
      return {success:true,customer:customer.object,sales:sales.sort((a,b)=>b.date.localeCompare(a.date)),remaining:opsMoney_(sales.filter(s=>!['Cancelled','Цуцлагдсан'].includes(s.status)).reduce((n,s)=>n+s.remaining,0))};
    }
    if(p.kind==='export') {
      opsAssertRole_(auth,['manager','admin']);
      const names=[COMPANY_SHEETS.PRODUCTS,COMPANY_SHEETS.SALES,COMPANY_SHEETS.PAYMENTS,COMPANY_SHEETS.CUSTOMERS,COMPANY_SHEETS.WAREHOUSE_STOCK,COMPANY_SHEETS.INVENTORY_MOVES,COMPANY_SHEETS.VISITS,'Эхний авлага','Буцаалт','Зардал','Худалдан авалт','Худалдан авалтын мөр','Нийлүүлэгч','Нийлүүлэгчийн төлбөр','Касс хаалт'];
      if(!p.sheet)return {success:true,sheets:names};if(!names.includes(p.sheet))throw new Error('Татах хүснэгт зөвшөөрөгдөөгүй.');
      const sheet=ss.getSheetByName(p.sheet),rows=opsRows_(ss,p.sheet).map(e=>e.object);
      const out=uxPage_(rows,Object.assign({},p,{limit:100}));out.headers=getHeaders_(sheet);return out;
    }
    throw new Error('Унших мэдээллийн төрөл буруу.');
  });
}
function uxSaveBusiness_(auth,p,ss,tx) {
  opsAssertRole_(auth,['manager','admin']);const allowed=['CompanyName','RegistrationNumber','Address','Phone','Email','LogoUrl','DefaultPaymentTermDays','ShowVisits'];
  Object.entries(p.settings||{}).forEach(([key,value])=>{
    if(!allowed.includes(key))throw new Error('Тохиргооны түлхүүр зөвшөөрөгдөөгүй.');let v=uxText_(value,500);
    if(key==='LogoUrl'&&v&&!/^https:\/\/[^\s]+$/i.test(v))throw new Error('Логоны холбоос https:// гэж эхэлнэ.');
    if(key==='DefaultPaymentTermDays'&&(!/^\d+$/.test(v)||Number(v)>365))throw new Error('Төлбөрийн хугацаа 0–365 хоног байна.');
    if(key==='Email'&&v&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))throw new Error('Имэйл хаягаа шалгана уу.');
    const e=tx.rows(COMPANY_SHEETS.SETTINGS).find(e=>e.object['Түлхүүр']===key);
    if(e)tx.set(COMPANY_SHEETS.SETTINGS,e.rowNumber,{'Утга':v});else tx.add(COMPANY_SHEETS.SETTINGS,{'Түлхүүр':key,'Утга':v});
  });correction_(tx,auth,'Business settings',auth.company,'Бизнесийн мэдээлэл шинэчилсэн');return {};
}
function uxSaveWarehouse_(auth,p,ss,tx) {
  opsAssertRole_(auth,['manager','admin']);const name=uxText_(p.name,100);if(!name)throw new Error('Агуулахын нэрээ бичнэ үү.');
  const rows=tx.rows(COMPANY_SHEETS.WAREHOUSES),old=rows.find(e=>clean_(e.object['Агуулахын нэр']).toLowerCase()===name.toLowerCase());
  if(!old&&rows.length>=opsPlanCompany_(auth).entitlements.maxWarehouses)throw new Error('Багцын агуулахын тоо дүүрсэн.');
  const fields={'Агуулахын нэр':old?old.object['Агуулахын нэр']:name,'Хаяг':uxText_(p.address,300),'Утас':uxText_(p.phone,30),'Хариуцсан нярав':uxText_(p.manager,100)};
  if(old)tx.set(COMPANY_SHEETS.WAREHOUSES,old.rowNumber,fields);else tx.add(COMPANY_SHEETS.WAREHOUSES,fields);
  correction_(tx,auth,'Warehouse',name,'Агуулахын мэдээлэл хадгалсан');return {};
}
function uxSaveCustomer_(auth,p,ss,tx) {
  opsAssertRole_(auth,['manager','admin']);const name=uxText_(p.name,150);if(!name)throw new Error('Харилцагчийн нэрээ бичнэ үү.');
  const rows=tx.rows(COMPANY_SHEETS.CUSTOMERS),old=p.id?rows.find(e=>e.object.CustomerID===p.id):null;
  if(p.id&&!old)throw new Error('Харилцагч олдсонгүй.');
  if(old&&old.object['Харилцагчийн нэр']!==name)throw new Error('Түүхтэй нэрийг өөрчлөхгүй. Давхардсан бол нэгтгэх үйлдэл ашиглана уу.');
  if(rows.some(e=>e!==old&&clean_(e.object['Харилцагчийн нэр']).toLowerCase()===name.toLowerCase()))throw new Error('Харилцагчийн нэр давхардсан.');
  const fields={'Харилцагчийн нэр':name,CustomerID:old?old.object.CustomerID:createBusinessId_('CUS'),'Утас':uxText_(p.phone,30),'Хаяг':uxText_(p.address,300),'Регистрийн дугаар':uxText_(p.registrationNumber,40),'Холбоо барих хүн':uxText_(p.contactPerson,100),'Идэвхтэй':'Тийм'};
  if(old)tx.set(COMPANY_SHEETS.CUSTOMERS,old.rowNumber,fields);else tx.add(COMPANY_SHEETS.CUSTOMERS,fields);
  correction_(tx,auth,'Customer',fields.CustomerID,'Харилцагчийн мэдээлэл хадгалсан');return {};
}
function uxMergeCustomers_(auth,p,ss,tx) {
  opsAssertRole_(auth,['manager','admin']);const rows=tx.rows(COMPANY_SHEETS.CUSTOMERS),source=rows.find(e=>e.object.CustomerID===p.sourceId),target=rows.find(e=>e.object.CustomerID===p.targetId);
  if(!source||!target||source===target||source.object['Идэвхтэй']==='Үгүй'||target.object['Идэвхтэй']==='Үгүй')throw new Error('Хоёр өөр харилцагч сонгоно уу.');
  correction_(tx,auth,'Customer merge',p.sourceId+' → '+p.targetId,p.reason);
  [COMPANY_SHEETS.SALES,COMPANY_SHEETS.VISITS,'Эхний авлага'].forEach(name=>tx.rows(name).filter(e=>e.object.CustomerID===p.sourceId||e.object['Харилцагч']===source.object['Харилцагчийн нэр']).forEach(e=>tx.set(name,e.rowNumber,{CustomerID:p.targetId,'Харилцагч':target.object['Харилцагчийн нэр']})));
  tx.set(COMPANY_SHEETS.CUSTOMERS,source.rowNumber,{'Идэвхтэй':'Үгүй','Холбоо барих хүн':'Нэгтгэсэн: '+p.targetId});return {};
}
function uxRequestService_(auth,p,ss,tx) {
  const type=clean_(p.type);if(!['support','plan'].includes(type))throw new Error('Хүсэлтийн төрөл буруу.');
  if(type==='plan')opsAssertRole_(auth,['manager','admin']);
  const plan=type==='plan'?clean_(p.plan):'';if(type==='plan'&&!['Business','Pro'].includes(plan))throw new Error('Багцаа сонгоно уу.');
  const message=uxText_(p.message,1500),contact=uxText_(p.contact,200);if(!contact||(!message&&type==='support'))throw new Error('Холбоо барих мэдээлэл, хүсэлтээ бичнэ үү.');
  const open=tx.rows('Үйлчилгээний хүсэлт').find(e=>e.object.Type===type&&e.object.CreatedBy===auth.username&&e.object.Status==='Хүсэлт хүлээн авсан'&&(type==='plan'?e.object.Plan===plan:e.object.Message===message));
  if(open)return {requestId:open.object.RequestID,existing:true};
  const id=createBusinessId_('HELP');tx.add('Үйлчилгээний хүсэлт',{RequestID:id,Type:type,Plan:plan,Months:type==='plan'?1:'',Amount:type==='plan'?DATALINX_PLAN_CATALOG[plan].monthlyPriceMnt:'',Message:message,Contact:contact,Status:'Хүсэлт хүлээн авсан',CreatedBy:auth.username,CreatedAt:new Date().toISOString()});return {requestId:id};
}
function uxAssertCashOpen_(auth,p,ss) {
  if(!['addSale','addPayment','refundPayment','reversePayment','remitCash','receivePurchase','addSupplierPayment','addExpense','reverseExpense'].includes(p.action))return;
  const day=p.action==='addExpense'&&p.date?opsDate_(p.date,true):opsDay_();
  if(opsRows_(ss,'Касс хаалт').some(e=>e.object.Date===day&&e.object.Status!=='Reopened'))throw new Error(day+' өдрийн касс хаасан байна. Менежер шалтгаантайгаар дахин нээсний дараа гүйлгээгээ оруулна уу.');
}
function uxReopenCash_(auth,p,ss,tx) {
  opsAssertRole_(auth,['manager','admin']);const day=opsDate_(p.date,true),rows=tx.rows('Касс хаалт').filter(e=>e.object.Date===day&&e.object.Status!=='Reopened');
  if(!rows.length)throw new Error('Хаалт олдсонгүй.');correction_(tx,auth,'Cash reopen',day,p.reason);rows.forEach(e=>tx.set('Касс хаалт',e.rowNumber,{Status:'Reopened'}));return {};
}
function uxDownloadPdf_(auth,p) {
  // Never accept arbitrary Drive IDs. Resolve a tenant-owned document and recheck its reference visibility.
  const record=withOperationsRead_(auth,()=>{
    const ss=openCompanySs_(requireActiveCompany_(auth.companyId||auth.company));
    const e=opsRows_(ss,COMPANY_SHEETS.DOCUMENTS).find(e=>e.object.DocumentID===p.documentId);
    if(!e)throw new Error('Баримт олдсонгүй.');const o=e.object;
    getPrintableDataByType_(normalizeDocumentType_(o.DocumentType),o.ReferenceID,auth,false);return o;
  });
  const file=DriveApp.getFileById(record.DriveFileID);if(file.getSize()>3*1024*1024)throw new Error('Баримт 3 MB-аас том байна. Тусламжийн хүсэлт илгээнэ үү.');
  const blob=file.getBlob();if(blob.getContentType()!=='application/pdf')throw new Error('PDF баримт биш байна.');
  return {success:true,fileName:record.FileName,mimeType:'application/pdf',base64:Utilities.base64Encode(blob.getBytes())};
}
function uxEmail_(auth,p) {
  securityRate_('verify-email:'+auth.username,5,600);
  if(p.action==='requestVerifyEmail') {
    const e=securityUser_(auth.username);if(!passwordMatches_(String(p.password||''),e.object.Password))throw new Error('Одоогийн нууц үгээ шалгана уу.');
    const email=clean_(p.email).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>200)throw new Error('Имэйл хаягаа шалгана уу.');
    const code=Utilities.getUuid().replace(/-/g,'').slice(0,12).toUpperCase();
    CacheService.getScriptCache().put('email-proof:'+auth.username,JSON.stringify({email,hash:sha256_(code),expires:Date.now()+600000,passwordHash:e.object.Password}),600);
    MailApp.sendEmail(email,'DataLinx — имэйл баталгаажуулах','Таны баталгаажуулах код: '+code+'\n10 минут хүчинтэй. Та хүсэлт гаргаагүй бол энэ зурвасыг үл тооно уу.');
    return {success:true,message:'Имэйлд 10 минутын хүчинтэй код илгээлээ.'};
  }
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const cache=CacheService.getScriptCache(),raw=cache.get('email-proof:'+auth.username),proof=raw?JSON.parse(raw):null,e=securityUser_(auth.username);
    if(!proof||proof.expires<Date.now()||proof.passwordHash!==e.object.Password||!secureEqual_(sha256_(clean_(p.code).toUpperCase()),proof.hash))throw new Error('Код буруу эсвэл хугацаа дууссан.');
    setObjectFields_(masterSs_().getSheetByName(MASTER_SHEETS.USERS),e.rowNumber,{VerifiedEmail:proof.email});cache.remove('email-proof:'+auth.username);return {success:true,message:'Имэйл баталгаажлаа.'};
  }finally{lock.releaseLock();}
}
function uxRequestRecovery_(p) {
  const username=clean_(p.username);securityRate_('email-recovery:'+username.toLowerCase(),3,900);securityRate_('email-recovery:global',30,3600);
  const generic={success:true,message:'Баталгаажуулсан имэйлтэй бүртгэл бол сэргээх код илгээгдэнэ. Имэйлээ шалгана уу. Код ирэхгүй бол менежер эсвэл тусламжтай холбогдоно уу.'};
  const e=securityUser_(username);if(!e||!e.object.VerifiedEmail)return generic;
  const code=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,''),lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const current=securityUser_(username);if(current.object.VerifiedEmail!==e.object.VerifiedEmail)return generic;
    setObjectFields_(masterSs_().getSheetByName(MASTER_SHEETS.USERS),current.rowNumber,{RecoveryHash:sha256_(code),RecoveryExpires:new Date(Date.now()+1800000).toISOString(),RecoveryIssuedBy:'verified-email'});
  }finally{lock.releaseLock();}
  MailApp.sendEmail(e.object.VerifiedEmail,'DataLinx — нууц үг сэргээх','Таны нэг удаагийн сэргээх код:\n'+code+'\n30 минут хүчинтэй. DataLinx-ийн Нууц үг сэргээх хэсэгт ашиглана. Та хүсэлт гаргаагүй бол ашиглахгүй байхад нууц үг өөрчлөгдөхгүй.');return generic;
}

// Operator-only editor functions; never routed through the public API.
function listServiceRequests(companyRef) {
  const company=requireActiveCompany_(companyRef),ss=openCompanySs_(company);ensureCompanySheets_(ss);return opsRows_(ss,'Үйлчилгээний хүсэлт').map(e=>e.object);
}
function updateServiceRequest(companyRef,requestId,status,response) {
  if(!['Хүсэлт хүлээн авсан','Төлбөр шалгаж байна','Шийдвэрлэсэн','Идэвхжсэн','Цуцалсан'].includes(status))throw new Error('Төлөв буруу.');
  const company=requireActiveCompany_(companyRef),ss=openCompanySs_(company),lock=LockService.getScriptLock();lock.waitLock(30000);
  try {const e=opsRows_(ss,'Үйлчилгээний хүсэлт').find(e=>e.object.RequestID===requestId);if(!e)throw new Error('Хүсэлт олдсонгүй.');if(status==='Идэвхжсэн'&&(e.object.Type!=='plan'||company.planId!==e.object.Plan))throw new Error('Эхлээд баталгаажсан төлбөрөөр setCompanyPlan ажиллуулна.');setObjectFields_(ss.getSheetByName('Үйлчилгээний хүсэлт'),e.rowNumber,{Status:status,Response:uxText_(response,1500)});return {success:true};}finally{lock.releaseLock();}
}

// Run once in the Apps Script editor to grant the mail permission; sends no messages.
function setupUserExperience() {
  ensureMasterSheets_();
  return {success:true,backendRelease:DATALINX_BACKEND_RELEASE,uxVersion:1,remainingMailQuota:MailApp.getRemainingDailyQuota()};
}
