'use strict';
function opsCreditApproved_(r){return !r.CreditStatus||r.CreditStatus==='Approved';}
function correction_(tx,auth,type,id,reason){
  if(!clean_(reason))throw new Error('Засварын шалтгааныг бичнэ үү.');
  tx.add('Засварын журнал',{CorrectionID:createBusinessId_('COR'),Type:type,ReferenceID:id,Reason:clean_(reason),CreatedBy:auth.username,CreatedAt:new Date().toISOString()});
}
function opsApproveReturn_(auth,p,ss,tx){
  opsAssertRole_(auth,['manager','admin','accountant']);
  const e=tx.rows('Буцаалт').find(e=>e.object.ReturnID===p.returnId);
  if(!e||e.object.CreditStatus!=='Pending')throw new Error('Зөвшөөрөл хүлээсэн буцаалт олдсонгүй.');
  if(!['approve','reject'].includes(p.decision))throw new Error('Шийдвэрээ сонгоно уу.');
  // A physical receipt remains a separate decision. Reject first, before any stock receipt.
  if(p.decision==='reject' && e.object.Restock!=='Үгүй')throw new Error('Барааг хүлээн авсан байна. Тооллого, засварын баримтаар эхлээд тулгана уу.');
  correction_(tx,auth,'Return '+p.decision,p.returnId,p.reason);
  tx.set('Буцаалт',e.rowNumber,{CreditStatus:p.decision==='approve'?'Approved':'Rejected',ApprovedBy:auth.username,ApprovedAt:new Date().toISOString(),ApprovalNote:clean_(p.reason),Restock:p.decision==='reject'?'Татгалзсан':e.object.Restock});
  return {};
}
function opsReversePayment_(auth,p,ss,tx){
  opsAssertRole_(auth,['manager','admin','accountant']);
  const e=tx.rows(COMPANY_SHEETS.PAYMENTS).find(e=>e.object.PaymentID===p.paymentId);
  if(!e||e.object.Source!=='incremental'||Number(e.object['Дүн'])<=0)throw new Error('Зөвхөн шинэ төлөлтийн бүртгэлийг эсрэг бичилтээр засна.');
  if(tx.rows(COMPANY_SHEETS.PAYMENTS).some(x=>x.object.ReversalOf===p.paymentId))throw new Error('Энэ төлөлтийг өмнө зассан байна.');
  const o=e.object,sale=opsSale_(ss,o.SaleID,auth),amount=Number(o['Дүн']);opsActiveSale_(sale);
  if(sale.paid<amount)throw new Error('Буцаан олголттой зөрж байна. Нягтлан төлбөрийн түүхийг тулгана уу.');
  if(o.Collector&&o['Төлбөрийн арга']==='Бэлэн'&&opsDriverCash_(ss,o.Collector).remaining<amount)throw new Error('Тушаасан бэлэн мөнгө орсон байна. Мөнгө тушаалтыг эхлээд тулгана уу.');
  correction_(tx,auth,'Payment reversal',p.paymentId,p.reason);
  tx.add(COMPANY_SHEETS.PAYMENTS,{PaymentID:createBusinessId_('REV'),SaleID:o.SaleID,'Огноо':new Date().toISOString(),'Дүн':-amount,'Төлбөрийн арга':o['Төлбөрийн арга'],'Баталгаажуулсан':'Тийм','Тэмдэглэл':clean_(p.reason),CreatedBy:auth.username,Source:'reversal',Collector:o.Collector||'',ReversalOf:p.paymentId});
  return {remaining:opsMoney_(sale.remaining+amount)};
}
function opsCancelSale_(auth,p,ss,tx){
  opsAssertRole_(auth,['manager','admin']);
  const sale=opsSale_(ss,clean_(p.saleId),auth);opsActiveSale_(sale);
  if(sale.recordType==='opening')throw new Error('Эхний авлагыг борлуулалтын цуцлалтаар өөрчлөхгүй.');
  if(sale.paid!==0||sale.returns.length||tx.rows(COMPANY_SHEETS.VISITS).some(e=>e.object.SaleID===sale.id))throw new Error('Төлөлт, буцаалт эсвэл хүргэлттэй захиалгыг шууд цуцлахгүй. Буцаалтын тооцоо хийнэ үү.');
  correction_(tx,auth,'Sale cancellation',sale.id,p.reason);
  sale.rows.forEach(e=>{
    const o=e.object,qty=opsQty_(Number(o['Тоо'])),name=o['Бараа'],product=opsProduct_(ss,o.ProductID||name),productId=clean_(product.object.ProductID);
    opsStock_(ss,tx,product,sale.warehouse,qty);
    JSON.parse(o.BatchAllocations||'[]').filter(a=>a.batchId).forEach(a=>{
      const batch=tx.rows('Цуврал').find(b=>b.object.BatchID===a.batchId);
      if(!batch)throw new Error('Цувралын бүртгэл дутуу. Няравтай тулгана уу.');
      tx.set('Цуврал',batch.rowNumber,{'Үлдэгдэл':Number(batch.object['Үлдэгдэл'])+Number(a.quantity)});
    });
    tx.set(COMPANY_SHEETS.SALES,e.rowNumber,{Status:'Cancelled'});
    opsMove_(tx,auth,{'Бараа':name,ProductID:productId,'Тоо':qty,'Хөдөлгөөний төрөл (орлого/зарлага/шилжүүлэг)':'орлого','Агуулах':sale.warehouse,SaleID:sale.id,'Client ID':p.clientId,'Шалтгаан':'Цуцлалт: '+clean_(p.reason)});
  });return {saleId:sale.id};
}
function opsStocktake_(auth,p,ss,tx){
  opsAssertRole_(auth,['manager','admin','warehouse']);
  if(!clean_(p.reason))throw new Error('Тооллогын зөрүүний шалтгааныг оруулна уу.');
  const product=opsProduct_(ss,p.productId||p.product),productId=clean_(product.object.ProductID),warehouse=opsWarehouse_(ss,p.warehouse);
  const rows=tx.rows(COMPANY_SHEETS.WAREHOUSE_STOCK).filter(e=>(productId&&clean_(e.object.ProductID)===productId)||(!clean_(e.object.ProductID)&&e.object['Бараа']===product.object['Барааны нэр']));
  const entry=rows.find(e=>e.object['Агуулах']===warehouse);
  const expected=opsQty_(entry?Number(entry.object['Үлдэгдэл']):(!rows.length&&warehouse===firstWarehouse_(ss)?Number(product.object['Одоогийн үлдэгдэл']):0));
  const submittedExpected=opsQty_(nonNegativeNumber_(p.expected,'Бүртгэлийн үлдэгдэл'));
  if(Math.abs(submittedExpected-expected)>0.000001)throw new Error('Тооллогын үеэр үлдэгдэл өөрчлөгдсөн. Шинэчлээд дахин тулгана уу.');
  const counted=opsQty_(nonNegativeNumber_(p.counted,'Тоолсон үлдэгдэл')),delta=opsQty_(counted-expected);
  if(Math.abs(delta)<=0.000001)throw new Error('Зөрүү алга. Үлдэгдэл таарч байна.');
  correction_(tx,auth,'Stocktake',product.object['Барааны нэр']+' / '+warehouse,p.reason);
  return opsInventory_(auth,{product:productId||p.product,quantity:Math.abs(delta),moveType:delta>0?'орлого':'зарлага',warehouse,reason:'Тооллого: '+clean_(p.reason),clientId:p.clientId,expiryDate:p.expiryDate},ss,tx);
}
function dataOpeningSale_(ss,id,auth){
  opsAssertRole_(auth,['manager','admin','accountant']);
  const e=opsRows_(ss,'Эхний авлага').find(e=>e.object.OpeningID===id);
  if(!e)throw new Error('Эхний авлага олдсонгүй.');
  const o=e.object,payments=getPaymentsForSale_(ss,id),total=Number(o['Дүн']),paid=opsMoney_(payments.reduce((s,p)=>s+p.amount,0));
  return {id,recordType:'opening',rows:[],customer:o['Харилцагч'],warehouse:'',date:iso_(o['Огноо']),dueDate:o.DueDate,status:o.Status||'Approved',total,net:total,paid,remaining:opsMoney_(Math.max(0,total-paid)),returned:0,refundDue:opsMoney_(Math.max(0,paid-total)),payments,returns:[],items:[]};
}
// Imports add new records only: existing stock and customer balances are never overwritten.
function dataImport_(auth,p,ss,tx){
  opsAssertRole_(auth,['manager','admin']);
  if(!['products','customers','opening'].includes(p.kind)||!Array.isArray(p.rows)||!p.rows.length||p.rows.length>50)throw new Error('Импортын төрөл, 1–50 мөрөө шалгана уу.');
  p.rows.forEach((r,index)=>{try{
    Object.values(r).forEach(v=>{if(typeof v==='string'&&(/^\s*[=+@-]/.test(v)||v.length>500))throw new Error('Томьёо эсвэл хэт урт текст оруулахгүй.');});
    const name=clean_(r.name||r.customer);if(!name)throw new Error('Нэр дутуу.');
    if(p.kind==='products'){
      if(tx.rows(COMPANY_SHEETS.PRODUCTS).some(e=>clean_(e.object['Барааны нэр']).toLowerCase()===name.toLowerCase()||(r.code&&String(e.object['Код'])===String(r.code))))throw new Error('Барааны нэр эсвэл код давхардсан.');
      const price=nonNegativeNumber_(r.price,'Үнэ'),stock=opsQty_(nonNegativeNumber_(r.stock||0,'Үлдэгдэл')),warehouse=opsWarehouse_(ss,r.warehouse),pack=positiveNumber_(r.packSize||1,'Савлагаа'),productId=createBusinessId_('PRD');
      tx.add(COMPANY_SHEETS.PRODUCTS,{'Барааны нэр':name,ProductID:productId,'Код':clean_(r.code),'Нэгж үнэ':price,'Одоогийн үлдэгдэл':stock,'Хэмжих нэгж':clean_(r.unit)||'ш','Бага үлдэгдлийн хязгаар':nonNegativeNumber_(r.threshold||0,'Бага үлдэгдэл'),'Идэвхтэй':'Тийм',PackName:clean_(r.packName),PackSize:pack});
      tx.add(COMPANY_SHEETS.WAREHOUSE_STOCK,{'Агуулах':warehouse,'Бараа':name,ProductID:productId,'Үлдэгдэл':stock});
      if(stock){opsMove_(tx,auth,{'Бараа':name,ProductID:productId,'Тоо':stock,'Агуулах':warehouse,'Хөдөлгөөний төрөл (орлого/зарлага/шилжүүлэг)':'орлого','Шалтгаан':'Импорт: эхний үлдэгдэл','Client ID':p.clientId});if(r.expiryDate)tx.add('Цуврал',{BatchID:createBusinessId_('LOT'),'Бараа':name,ProductID:productId,'Агуулах':warehouse,'Үлдэгдэл':stock,'Дуусах огноо':opsDate_(r.expiryDate,true),CreatedAt:new Date().toISOString()});}
    }else if(p.kind==='customers'){
      const reg=clean_(r.registrationNumber);
      if(tx.rows(COMPANY_SHEETS.CUSTOMERS).some(e=>clean_(e.object['Харилцагчийн нэр']).toLowerCase()===name.toLowerCase()||(reg&&clean_(e.object['Регистрийн дугаар']).toLowerCase()===reg.toLowerCase())))throw new Error('Харилцагчийн нэр эсвэл регистр давхардсан.');
      tx.add(COMPANY_SHEETS.CUSTOMERS,{'Харилцагчийн нэр':name,CustomerID:createBusinessId_('CUS'),'Утас':clean_(r.phone),'Хаяг':clean_(r.address),'Регистрийн дугаар':reg,'Холбоо барих хүн':clean_(r.contactPerson),'Идэвхтэй':'Тийм'});
    }else{
      const customer=tx.rows(COMPANY_SHEETS.CUSTOMERS).find(e=>clean_(e.object['Харилцагчийн нэр']).toLowerCase()===name.toLowerCase());
      if(!customer)throw new Error('Эхлээд харилцагчаа бүртгэнэ үү.');
      const reference=clean_(r.reference);if(!reference)throw new Error('Тулгах эх баримтын дугаар шаардлагатай.');
      if(tx.rows('Эхний авлага').some(e=>e.object.Reference===reference))throw new Error('Эх баримтын дугаар давхардсан.');
      tx.add('Эхний авлага',{OpeningID:createBusinessId_('OPEN'),'Харилцагч':name,CustomerID:clean_(customer.object.CustomerID),'Дүн':opsMoney_(positiveNumber_(r.amount,'Авлага')),'Огноо':opsDate_(r.date,true),DueDate:opsDate_(r.dueDate,true),Reference:reference,CreatedBy:auth.username,Status:'Approved'});
    }
  }catch(error){throw new Error((index+2)+'-р мөр: '+error.message);}});
  correction_(tx,auth,'Import '+p.kind,p.clientId,'Импорт '+p.rows.length+' мөр');return {imported:p.rows.length};
}
function dataPreviewImport_(auth,p){return withOperationsRead_(auth,()=>{const ss=openCompanySs_(requireActiveCompany_(auth.companyId||auth.company)),tx=opsPlan_(ss);const result=dataImport_(auth,p,ss,tx);if(JSON.stringify(tx.changes()).length>OPS_PLAN_MAX_CHARS)throw new Error('Файл том байна. Мөрөө хуваана уу.');return Object.assign({success:true,preview:true},result);});}
function dataIntegrityCheck_(auth){
  opsAssertRole_(auth,['manager','admin']);
  return withOperationsRead_(auth,()=>{
    const ss=openCompanySs_(requireActiveCompany_(auth.companyId||auth.company)),issues=[];
    const add=(severity,code,message)=>issues.push({severity,code,message});
    const duplicates=(rows,key,label)=>{
      const seen=new Set(),dups=new Set();
      rows.forEach(e=>{const v=clean_(e.object[key]);if(!v)return;if(seen.has(v))dups.add(v);else seen.add(v);});
      if(dups.size)add('error','DUPLICATE_'+key,label+' давхардсан: '+Array.from(dups).slice(0,8).join(', ')+(dups.size>8?' …':''));
    };
    const products=opsRows_(ss,COMPANY_SHEETS.PRODUCTS).filter(e=>clean_(e.object['Барааны нэр']));
    const customers=opsRows_(ss,COMPANY_SHEETS.CUSTOMERS).filter(e=>clean_(e.object['Харилцагчийн нэр']));
    duplicates(products,'ProductID','ProductID');
    duplicates(customers,'CustomerID','CustomerID');
    duplicates(opsRows_(ss,COMPANY_SHEETS.SALES),'LineID','Борлуулалтын LineID');
    duplicates(opsRows_(ss,COMPANY_SHEETS.PAYMENTS),'PaymentID','PaymentID');
    duplicates(opsRows_(ss,'Буцаалт'),'ReturnID','ReturnID');
    duplicates(opsRows_(ss,COMPANY_SHEETS.VISITS),'DistributionID','DistributionID');
    duplicates(opsRows_(ss,'Үйлдлийн журнал'),'RequestID','RequestID');
    const missingProductIds=products.filter(e=>!clean_(e.object.ProductID)).length;
    const missingCustomerIds=customers.filter(e=>!clean_(e.object.CustomerID)).length;
    if(missingProductIds)add('warning','MISSING_PRODUCT_ID',missingProductIds+' бараанд ProductID дутуу байна.');
    if(missingCustomerIds)add('warning','MISSING_CUSTOMER_ID',missingCustomerIds+' харилцагчид CustomerID дутуу байна.');
    const warehouseRows=opsRows_(ss,COMPANY_SHEETS.WAREHOUSE_STOCK);
    products.forEach(p=>{
      const name=clean_(p.object['Барааны нэр']),id=clean_(p.object.ProductID),total=opsQty_(Number(p.object['Одоогийн үлдэгдэл']||0));
      if(total < -0.000001)add('error','NEGATIVE_PRODUCT_STOCK',name+' нийт үлдэгдэл сөрөг: '+total);
      const matching=warehouseRows.filter(w=>(id&&clean_(w.object.ProductID)===id)||(!clean_(w.object.ProductID)&&clean_(w.object['Бараа']).toLowerCase()===name.toLowerCase()));
      matching.forEach(w=>{if(Number(w.object['Үлдэгдэл']||0)<-0.000001)add('error','NEGATIVE_WAREHOUSE_STOCK',name+' / '+clean_(w.object['Агуулах'])+' үлдэгдэл сөрөг.');});
      if(matching.length){
        const sum=opsQty_(matching.reduce((s,w)=>s+Number(w.object['Үлдэгдэл']||0),0));
        if(Math.abs(sum-total)>0.000001)add('error','STOCK_TOTAL_MISMATCH',name+': нийт '+total+', агуулахуудын нийлбэр '+sum+'.');
      }
    });
    const batches=opsRows_(ss,'Цуврал');
    warehouseRows.forEach(w=>{
      const name=clean_(w.object['Бараа']),id=clean_(w.object.ProductID),warehouse=clean_(w.object['Агуулах']),stock=opsQty_(Number(w.object['Үлдэгдэл']||0));
      const batchTotal=opsQty_(batches.filter(b=>clean_(b.object['Агуулах'])===warehouse&&((id&&clean_(b.object.ProductID)===id)||(!clean_(b.object.ProductID)&&clean_(b.object['Бараа']).toLowerCase()===name.toLowerCase()))).reduce((s,b)=>s+Number(b.object['Үлдэгдэл']||0),0));
      if(batchTotal>stock+0.000001)add('error','BATCH_OVER_STOCK',name+' / '+warehouse+': цуврал '+batchTotal+' > агуулах '+stock+'.');
    });
    batches.filter(b=>Number(b.object['Үлдэгдэл']||0)<-0.000001).forEach(b=>add('error','NEGATIVE_BATCH',clean_(b.object['Бараа'])+' цувралын үлдэгдэл сөрөг.'));
    const pending=opsRows_(ss,'Үйлдлийн журнал').filter(e=>e.object.Status==='Pending');
    if(pending.length)add('error','PENDING_JOURNAL',pending.length+' сэргээгдээгүй Pending үйлдэл байна.');
    getUsers_(auth.companyId||auth.company).filter(u=>['driver','manager','admin'].includes(u.role)).forEach(u=>{
      const cash=opsDriverCash_(ss,u.username);
      if(cash.remaining < -0.009)add('error','NEGATIVE_DRIVER_CASH',(u.fullName||u.username)+' жолоочийн тушаах үлдэгдэл сөрөг: '+cash.remaining);
    });
    return {success:true,checkedAt:new Date().toISOString(),ok:!issues.some(i=>i.severity==='error'),issues};
  });
}

function dataQueueAction_(auth,p){
  const id=clean_(p.requestId);if(!id||id.length>120)throw new Error('Бүртгэлийн дугаар буруу байна.');
  const ss=openCompanySs_(requireActiveCompany_(auth.companyId || auth.company)),lock=LockService.getScriptLock();lock.waitLock(30000);
  try{ensureCompanySheets_(ss);opsRecover_(ss);
    const old=opsRows_(ss,'Үйлдлийн журнал').find(e=>e.object.RequestID===id);
    if(old){if(old.object.CreatedBy!==auth.username)throw new Error('Өөр ажилтны хүсэлт байна.');return {success:true,status:old.object.Status,result:JSON.parse(old.object.Result)};}
    const legacy=opsRows_(ss,COMPANY_SHEETS.SALES).some(e=>e.object['Client ID']===id)||opsRows_(ss,COMPANY_SHEETS.INVENTORY_MOVES).some(e=>e.object['Client ID']===id);
    if(legacy)return {success:true,status:'Done'};
    const cancelled=opsRows_(ss,'Цуцалсан хүсэлт').find(e=>e.object.RequestID===id);
    if(cancelled&&cancelled.object.CreatedBy!==auth.username)throw new Error('Өөр ажилтны хүсэлт байна.');
    if(p.action==='cancelRequest'&&!cancelled){if(!clean_(p.reason))throw new Error('Шалтгаан бичнэ үү.');appendObjectRow_(ss.getSheetByName('Цуцалсан хүсэлт'),{RequestID:id,CreatedBy:auth.username,Reason:clean_(p.reason),CreatedAt:new Date().toISOString()});SpreadsheetApp.flush();}
    return {success:true,status:cancelled||p.action==='cancelRequest'?'Cancelled':'NotFound'};
  }finally{lock.releaseLock();}
}
