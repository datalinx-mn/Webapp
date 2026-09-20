const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
class Range {
  constructor(s,r,c,n=1,m=1){Object.assign(this,{s,r,c,n,m});}
  getValues(){return Array.from({length:this.n},(_,i)=>Array.from({length:this.m},(_,j)=>this.s.data[this.r+i-1]?.[this.c+j-1]??''));}
  setValues(rows){if(this.s.failWrites>0){this.s.failWrites--;throw Error('simulated service interruption');}rows.forEach((row,i)=>{const target=this.s.data[this.r+i-1]||=[];this.s.data[this.r+i-1]=target;row.forEach((v,j)=>target[this.c+j-1]=v);});return this;}
  createTextFinder(v){const range=this;return {matchEntireCell(){return this},findNext(){const i=range.getValues().findIndex(row=>String(row[0])===String(v));return i<0?null:{getRow:()=>range.r+i};}};}
}
class Sheet {
  constructor(name){this.name=name;this.data=[];this.failWrites=0;}
  getName(){return this.name;}getDataRange(){return this.getRange(1,1,this.getLastRow(),this.getLastColumn());}getLastRow(){return this.data.length;}getLastColumn(){return Math.max(0,...this.data.map(r=>r.length));}getMaxColumns(){return 200;}insertColumnsAfter(){}setFrozenRows(){}
  getRange(...args){return new Range(this,...args);}appendRow(row){this.getRange(this.data.length+1,1,1,row.length).setValues([row]);}deleteRow(n){this.data.splice(n-1,1);}
}
class Book {constructor(id){this.id=id;this.sheets={};}getId(){return this.id;}getSheets(){return Object.values(this.sheets);}getName(){return this.id;}getSheetByName(n){return this.sheets[n]||null;}insertSheet(n){return this.sheets[n]=new Sheet(n);}}
let count=0;const tests=[];
function test(name,fn){try{fn();console.log('PASS',name);tests.push(name);}catch(e){console.error('FAIL',name,e);process.exitCode=1;}}
function fixture(){
 const master=new Book('MASTER'),books={MASTER:master,A:new Book('A'),B:new Book('B')},cache=new Map();
 let locked=false;
 const ctx=vm.createContext({console,Map,Set,Date,JSON,Math,Number,String,Object,Array,isFinite,isNaN,
  SpreadsheetApp:{getActiveSpreadsheet:()=>master,openById:id=>books[id],flush:()=>{}},
  LockService:{getScriptLock:()=>({waitLock(){assert.equal(locked,false,'nested lock');locked=true;},releaseLock(){locked=false;}})},
  CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},
  Session:{getScriptTimeZone:()=> 'Asia/Ulaanbaatar'},
  Utilities:{getUuid:()=>crypto.randomUUID(),formatDate:(d,tz,fmt)=>{const date=new Date(new Date(d).getTime()+8*3600000);const iso=date.toISOString();return fmt==='yyyy-MM-dd'?iso.slice(0,10):iso.replace(/\D/g,'').slice(0,14);},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()],DigestAlgorithm:{SHA_256:1},Charset:{UTF_8:1}},
  ContentService:{createTextOutput:s=>({setMimeType:()=>JSON.parse(s)}),MimeType:{JSON:'json'}}
 });
 for(const f of ['Bcrypt.gs','SecurityService.gs','ReliabilityService.gs','BackupService.gs','SponsorshipService.gs','Code.gs','OperationsService.gs','DocumentService.gs','ProductService.gs','PdfService.gs'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
 ctx.ensureMasterSheets_();
 ctx.appendObjectRow_(master.getSheetByName('Компани'),{'Компани нэр':'Alpha','Spreadsheet ID':'A','Төлөв':'Active','Утас':'12345678',Plan:'Pro','Billing Cycle':'monthly'});ctx.appendObjectRow_(master.getSheetByName('Компани'),{'Компани нэр':'Beta','Spreadsheet ID':'B','Төлөв':'Active','Утас':'12345678',Plan:'Pro','Billing Cycle':'monthly'});
 for(const u of [['owner','Manager','manager','Alpha'],['rep','Seller','rep','Alpha'],['driver','Driver','driver','Alpha'],['warehouse','Keeper','warehouse','Alpha'],['accountant','Finance','accountant','Alpha'],['other','Other','manager','Beta']])master.getSheetByName('Хэрэглэгч').appendRow([u[0],'pw',u[1],u[2],u[3]]);
 for(const ss of [books.A,books.B]){ctx.ensureCompanySheets_(ss);ctx.appendObjectRow_(ss.getSheetByName('Агуулах'),{'Агуулахын нэр':'Main'});ctx.appendObjectRow_(ss.getSheetByName('Агуулах'),{'Агуулахын нэр':'Other'});ctx.appendObjectRow_(ss.getSheetByName('Байршил'),{'Байршлын нэр':'Main'});ctx.appendObjectRow_(ss.getSheetByName('Бараа'),{'Барааны нэр':'Bread','Нэгж үнэ':100,'Одоогийн үлдэгдэл':100,'Хэмжих нэгж':'ш','Идэвхтэй':true,PackSize:12,PackName:'Box'});ctx.appendObjectRow_(ss.getSheetByName('Бараа'),{'Барааны нэр':'Cake','Нэгж үнэ':200,'Одоогийн үлдэгдэл':50,'Хэмжих нэгж':'ш','Идэвхтэй':true});}
 const users={owner:{username:'owner',fullName:'Manager',role:'manager',company:'Alpha'},rep:{username:'rep',fullName:'Seller',role:'rep',company:'Alpha'},driver:{username:'driver',fullName:'Driver',role:'driver',company:'Alpha'},warehouse:{username:'warehouse',fullName:'Keeper',role:'warehouse',company:'Alpha'},accountant:{username:'accountant',fullName:'Finance',role:'accountant',company:'Alpha'},other:{username:'other',fullName:'Other',role:'manager',company:'Beta'}};
 const run=(p,u='owner')=>ctx.handleOperation_(users[u],{clientId:'request-'+(++count),...p});
 const sale=(p={},u='owner')=>run({action:'addSale',customer:'Shop',paymentType:'Зээл',warehouse:'Main',items:[{product:'Bread',quantity:10,unitPrice:100}],...p},u);
 const ledger=id=>ctx.opsSale_(books.A,id,users.owner);
 const stock=(name='Bread')=>Number(ctx.opsProduct_(books.A,name).object['Одоогийн үлдэгдэл']);
 return {ctx,books,master,users,run,sale,ledger,stock,cache};
}
test('multi-line discount, VAT, deposit and incremental payment agree with PDF',()=>{const f=fixture(),r=f.sale({items:[{product:'Bread',quantity:2,unitPrice:100},{product:'Cake',quantity:1,unitPrice:200}],discount:40,vat:20,paidAmount:100});assert.equal(r.total,380);assert.equal(f.ledger(r.saleId).remaining,280);f.run({action:'addPayment',saleId:r.saleId,amount:80});assert.equal(f.ledger(r.saleId).remaining,200);const pdf=f.ctx.getPrintableSalesData(r.saleId,f.users.owner,'INVOICE',false);assert.equal(pdf.totals.paid,180);assert.equal(pdf.totals.remaining,200);});
test('warehouse-specific shortage rejects entire basket without writes',()=>{const f=fixture();f.ctx.appendObjectRow_(f.books.A.getSheetByName('Агуулахын үлдэгдэл'),{'Агуулах':'Main','Бараа':'Cake','Үлдэгдэл':0});assert.throws(()=>f.sale({items:[{product:'Bread',quantity:2,unitPrice:100},{product:'Cake',quantity:1,unitPrice:200}]}),/үлдэгдэл/);assert.equal(f.stock(),100);assert.equal(f.books.A.getSheetByName('Гүйлгээ').getLastRow(),1);});
test('journal replays interrupted multi-sheet write exactly once',()=>{const f=fixture(),p={action:'addSale',clientId:'retry-safe',customer:'Shop',paymentType:'Зээл',items:[{product:'Bread',quantity:5,unitPrice:100}]};f.books.A.getSheetByName('Гүйлгээ').failWrites=1;assert.throws(()=>f.run(p),/interruption/);assert.equal(f.stock(),95);const r=f.run(p);assert.equal(r.duplicate,true);assert.equal(f.stock(),95);assert.equal(f.books.A.getSheetByName('Гүйлгээ').getLastRow(),2);assert.equal(f.books.A.getSheetByName('Агуулахын хөдөлгөөн').getLastRow(),2);});
test('same request ID cannot be reused with different values',()=>{const f=fixture();f.sale({clientId:'same'});assert.throws(()=>f.sale({clientId:'same',customer:'Wrong'}),/өөр хүсэлт/);});
test('stock-in and transfer keep warehouse totals balanced',()=>{const f=fixture();f.run({action:'addInventoryMove',product:'Bread',quantity:5,moveType:'орлого',warehouse:'Other'});assert.equal(f.stock(),105);f.run({action:'addInventoryMove',product:'Bread',quantity:3,moveType:'шилжүүлэг',fromWarehouse:'Other',toWarehouse:'Main'});assert.equal(f.stock(),105);const rows=f.ctx.opsRows_(f.books.A,'Агуулахын үлдэгдэл');assert.equal(rows.reduce((s,e)=>s+Number(e.object['Үлдэгдэл']),0),105);});
test('pack conversion and duplicate product lines enforce cumulative stock',()=>{const f=fixture(),r=f.sale({items:[{product:'Bread',quantity:2,inputUnit:'pack',unitPrice:1200}]});assert.equal(f.stock(),76);assert.equal(r.total,2400);assert.equal(f.ledger(r.saleId).items[0].quantity,24);assert.throws(()=>f.sale({items:[{product:'Bread',quantity:50,unitPrice:100},{product:'Bread',quantity:40,unitPrice:100}]}),/үлдэгдэл/);assert.equal(f.stock(),76);});
test('expiry allocation excludes expired stock and preserves expiry on transfer',()=>{const f=fixture();f.run({action:'addInventoryMove',product:'Bread',quantity:100,moveType:'зарлага',warehouse:'Main'});f.run({action:'addInventoryMove',product:'Bread',quantity:10,moveType:'орлого',warehouse:'Main',expiryDate:'2020-01-01'});f.run({action:'addInventoryMove',product:'Bread',quantity:5,moveType:'орлого',warehouse:'Main',expiryDate:'2099-01-01'});assert.throws(()=>f.sale({items:[{product:'Bread',quantity:6,unitPrice:100}]}),/хугацаа/);f.run({action:'addInventoryMove',product:'Bread',quantity:3,moveType:'шилжүүлэг',fromWarehouse:'Main',toWarehouse:'Other'});assert.equal(f.ctx.opsRows_(f.books.A,'Цуврал').find(e=>e.object['Агуулах']==='Other').object['Дуусах огноо'],'2020-01-01');});
test('return reduces receivable, later receipt restores stock only once',()=>{const f=fixture(),r=f.sale(),line=f.ledger(r.saleId).items[0];f.run({action:'returnSale',saleId:r.saleId,lineId:line.lineId,quantity:2,reason:'Damaged packaging',restock:false});assert.equal(f.ledger(r.saleId).remaining,800);assert.equal(f.stock(),90);const ret=f.ctx.opsRows_(f.books.A,'Буцаалт')[0].object;f.run({action:'receiveReturn',returnId:ret.ReturnID},'warehouse');assert.equal(f.stock(),92);assert.throws(()=>f.run({action:'receiveReturn',returnId:ret.ReturnID}),/өмнө/);});
test('paid return produces refund due and cannot over-refund',()=>{const f=fixture(),r=f.sale({paymentType:'Бэлэн'}),line=f.ledger(r.saleId).items[0];f.run({action:'returnSale',saleId:r.saleId,lineId:line.lineId,quantity:3,reason:'Return',restock:true});assert.equal(f.ledger(r.saleId).refundDue,300);assert.throws(()=>f.run({action:'refundPayment',saleId:r.saleId,amount:301}),/үлдэгдлээс/);f.run({action:'refundPayment',saleId:r.saleId,amount:300});assert.equal(f.ledger(r.saleId).refundDue,0);assert.equal(f.ledger(r.saleId).paid,700);});
test('overpayment and excessive return are rejected',()=>{const f=fixture(),r=f.sale();assert.throws(()=>f.run({action:'addPayment',saleId:r.saleId,amount:1001}),/их байна/);assert.throws(()=>f.run({action:'returnSale',saleId:r.saleId,lineId:f.ledger(r.saleId).items[0].lineId,quantity:11,reason:'x'}),/их байна/);});
test('driver sees only assigned sales and cannot approve inventory returns',()=>{const f=fixture(),r=f.sale();assert.throws(()=>f.ctx.opsSale_(f.books.A,r.saleId,f.users.driver),/эрхгүй/);const d=f.run({action:'saveDelivery',saleId:r.saleId,driver:'driver',date:'2026-09-11',address:'UB'});assert.equal(f.ctx.opsSale_(f.books.A,r.saleId,f.users.driver).id,r.saleId);assert.throws(()=>f.run({action:'returnSale',saleId:r.saleId,lineId:f.ledger(r.saleId).items[0].lineId,quantity:1,reason:'x',restock:true},'driver'),/батална/);assert.ok(d.distributionId);});
test('delivery returns credit the sale; collected bank money is not cash custody',()=>{const f=fixture(),r=f.sale(),d=f.run({action:'saveDelivery',saleId:r.saleId,driver:'driver',date:'2026-09-11'});f.run({action:'saveDelivery',saleId:r.saleId,distributionId:d.distributionId,date:'2026-09-11',status:'Хүргэгдсэн',items:[{delivered:8,returned:2}],notes:'2 returned'},'driver');assert.equal(f.ledger(r.saleId).remaining,1000);f.run({action:'approveReturn',returnId:f.ctx.opsRows_(f.books.A,'Буцаалт')[0].object.ReturnID,decision:'approve',reason:'Checked'},'accountant');assert.equal(f.ledger(r.saleId).remaining,800);f.run({action:'addPayment',saleId:r.saleId,amount:300,method:'Банк'},'driver');f.run({action:'addPayment',saleId:r.saleId,amount:200,method:'Бэлэн'},'driver');assert.equal(f.ctx.opsDriverCash_(f.books.A,'driver').remaining,200);f.run({action:'remitCash',driver:'driver',amount:150},'accountant');assert.equal(f.ctx.opsDriverCash_(f.books.A,'driver').remaining,50);assert.equal(f.ledger(r.saleId).remaining,300);});
test('re-saving cumulative delivery quantities never credits returns twice',()=>{const f=fixture(),r=f.sale(),d=f.run({action:'saveDelivery',saleId:r.saleId,driver:'driver',date:'2026-09-11'}),p={action:'saveDelivery',saleId:r.saleId,distributionId:d.distributionId,date:'2026-09-11',status:'Хүргэгдсэн',items:[{delivered:8,returned:2}]};f.run(p,'driver');f.run(p,'driver');assert.equal(f.ledger(r.saleId).returned,0);assert.equal(f.ctx.opsRows_(f.books.A,'Буцаалт').length,1);f.run({action:'approveReturn',returnId:f.ctx.opsRows_(f.books.A,'Буцаалт')[0].object.ReturnID,decision:'approve',reason:'Checked'});assert.equal(f.ledger(r.saleId).returned,200);assert.throws(()=>f.run({...p,items:[{delivered:7,returned:2}]},'driver'),/багасгах/);});
test('cross-company user edit cannot take over another company',()=>{const f=fixture();assert.throws(()=>f.ctx.handleSaveUser_(f.users.owner,{originalUsername:'other',username:'other',fullName:'Hacked',role:'manager',password:'password123456'}),/олдоогүй|олдсонгүй/);assert.equal(f.master.getSheetByName('Хэрэглэгч').data.find(r=>r[0]==='other')[4],'Beta');});
test('cross-company operations and unauthorized roles rejected',()=>{const f=fixture(),r=f.sale();assert.throws(()=>f.run({action:'addPayment',saleId:r.saleId,amount:1},'other'),/олдсонгүй/);assert.throws(()=>f.sale({},'driver'),/эрх/);assert.throws(()=>f.run({action:'addInventoryMove',product:'Bread',quantity:1,moveType:'орлого'},'rep'),/эрх/);assert.throws(()=>f.run({action:'remitCash',driver:'driver',amount:1},'driver'),/эрх/);});
test('operations include old unpaid debt outside initial history window',()=>{const f=fixture(),r=f.sale();const sheet=f.books.A.getSheetByName('Гүйлгээ');f.ctx.setObjectFields_(sheet,2,{'Огноо':'2020-01-01T00:00:00Z',DueDate:'2020-02-01'});const data=f.ctx.loadOperations_(f.users.owner,{});assert.equal(data.operations.receivables[0].id,r.saleId);assert.equal(data.operations.todayCount,0);});
test('legacy initial payment and ledger duplicate reconcile without lost deposit',()=>{const f=fixture(),r=f.sale({paidAmount:200});f.ctx.appendObjectRow_(f.books.A.getSheetByName('Төлбөр'),{PaymentID:'legacy',SaleID:r.saleId,'Дүн':200,'Баталгаажуулсан':'Тийм'});f.run({action:'addPayment',saleId:r.saleId,amount:100});assert.equal(f.ledger(r.saleId).paid,300);});
test('retired sessions do not retain prior permissions',()=>{const f=fixture();f.cache.set('session:t',JSON.stringify(f.users.owner));f.master.getSheetByName('Хэрэглэгч').data.find(r=>r[0]==='owner')[3]='rep';assert.equal(f.ctx.requireSession_('t').role,'rep');});
test('damaged return closes without making stock sellable',()=>{const f=fixture(),r=f.sale();f.run({action:'returnSale',saleId:r.saleId,lineId:f.ledger(r.saleId).items[0].lineId,quantity:2,reason:'Damaged'});const id=f.ctx.opsRows_(f.books.A,'Буцаалт')[0].object.ReturnID;assert.throws(()=>f.run({action:'receiveReturn',returnId:id,disposition:'writeoff'},'warehouse'),/шалтгаан/);f.run({action:'receiveReturn',returnId:id,disposition:'writeoff',notes:'Broken'},'warehouse');assert.equal(f.stock(),90);assert.equal(f.ledger(r.saleId).remaining,800);assert.equal(f.ctx.loadOperations_(f.users.owner,{}).operations.pendingReturns.length,0);assert.throws(()=>f.run({action:'receiveReturn',returnId:id}),/өмнө/);});
test('last partial return settles the rounding remainder',()=>{const f=fixture(),r=f.sale({items:[{product:'Bread',quantity:3,unitPrice:0.333333333333}]});const lineId=f.ledger(r.saleId).items[0].lineId;for(let i=0;i<3;i++)f.run({action:'returnSale',saleId:r.saleId,lineId,quantity:1,reason:'Return'});assert.equal(f.ledger(r.saleId).remaining,0);assert.equal(f.ledger(r.saleId).returned,1);});
test('product edit preserves reordered headers and refuses stock or history changes',()=>{const f=fixture(),sh=f.books.A.getSheetByName('Бараа');sh.data=sh.data.map(row=>{const copy=[...row];[copy[0],copy[1]]=[copy[1],copy[0]];return copy;});const p={originalName:'Bread',name:'Bread',price:150,stock:100,threshold:4,packName:'Box',packSize:12};f.ctx.handleSaveProduct_(f.users.owner,p);assert.equal(f.ctx.opsProduct_(f.books.A,'Bread').object['Нэгж үнэ'],150);assert.equal(f.stock(),100);assert.throws(()=>f.ctx.handleSaveProduct_(f.users.owner,{...p,stock:200}),/Үлдэгдлийг/);f.run({action:'addInventoryMove',product:'Bread',quantity:1,moveType:'орлого',expiryDate:'2099-01-01'});assert.throws(()=>f.ctx.handleSaveProduct_(f.users.owner,{...p,name:'New',stock:101}),/түүхтэй/);});
test('product edit recovers pending stock changes before validating stale input',()=>{const f=fixture();f.books.A.getSheetByName('Гүйлгээ').failWrites=1;assert.throws(()=>f.sale(),/interruption/);assert.throws(()=>f.ctx.handleSaveProduct_(f.users.owner,{originalName:'Bread',name:'Bread',price:100,stock:100,threshold:0}),/Үлдэгдлийг/);assert.equal(f.ctx.opsRows_(f.books.A,'Үйлдлийн журнал')[0].object.Status,'Done');assert.equal(f.stock(),90);});
test('daily and monthly reports agree after payments and returns',()=>{const f=fixture(),r=f.sale();f.run({action:'addPayment',saleId:r.saleId,amount:200});f.run({action:'returnSale',saleId:r.saleId,lineId:f.ledger(r.saleId).items[0].lineId,quantity:2,reason:'Return'});const daily=f.ctx.loadOperations_(f.users.owner,{}).operations,monthly=f.ctx.withOperationsRead_(f.users.owner,()=>f.ctx.buildDashboard_(f.books.A));assert.equal(monthly.currentTotal,daily.todayTotal);assert.equal(monthly.creditTotal,600);assert.equal(monthly.byProduct[0].quantity,8);});
test('delivery PDF requires assigned username even with a matching display name',()=>{const f=fixture(),r=f.sale(),d=f.run({action:'saveDelivery',saleId:r.saleId,driver:'driver',date:'2026-09-11',address:'UB'});assert.throws(()=>f.ctx.getPrintableDistributionData(d.distributionId,{...f.users.driver,username:'another-driver'},true),/эрх/);assert.equal(f.books.A.getSheetByName('DOCUMENT_NUMBERS').getLastRow(),1);});

test('initial payment method separates bank from cash and daily cash close reconciles once',()=>{
  const f=fixture();
  f.sale({paymentType:'Бэлэн',initialPaymentMethod:'Банк'});
  f.sale({paymentType:'Бэлэн',initialPaymentMethod:'Бэлэн'});
  const today=f.ctx.opsDay_();
  const movement=f.ctx.opsCashMovementForDay_(f.books.A,today);
  assert.equal(movement.initialCashSales,1000);
  assert.equal(movement.systemMovement,1000);
  const close=f.run({action:'closeCash',date:today,openingCash:500,countedCash:1500,reason:''},'accountant');
  assert.equal(close.expectedCash,1500);
  assert.equal(close.difference,0);
  assert.throws(()=>f.run({action:'closeCash',date:today,openingCash:500,countedCash:1500},'accountant'),/өмнө/);
});
test('cash close requires explanation for a real variance',()=>{
  const f=fixture();f.sale({paymentType:'Бэлэн',initialPaymentMethod:'Бэлэн'});
  assert.throws(()=>f.run({action:'closeCash',date:f.ctx.opsDay_(),openingCash:0,countedCash:900},'accountant'),/шалтгаан/);
  const close=f.run({action:'closeCash',date:f.ctx.opsDay_(),openingCash:0,countedCash:900,reason:'100 төгрөгийн зөрүү шалгаж байна'},'accountant');
  assert.equal(close.difference,-100);
});
test('pack sales retain both entered pack values and base-unit audit values',()=>{
  const f=fixture(),r=f.sale({items:[{product:'Bread',quantity:2,inputUnit:'pack',unitPrice:1200}]});
  const row=f.ctx.opsRows_(f.books.A,'Гүйлгээ').find(e=>e.object.SaleID===r.saleId).object;
  assert.ok(row.ProductID);
  assert.equal(row.InputUnit,'pack');
  assert.equal(Number(row.InputQuantity),2);
  assert.equal(Number(row.InputUnitPrice),1200);
  assert.equal(Number(row['Тоо']),24);
  assert.equal(Number(row['Үнэ']),100);
});
test('integrity audit catches warehouse total mismatches',()=>{
  const f=fixture();f.sale();
  const row=f.ctx.opsRows_(f.books.A,'Агуулахын үлдэгдэл').find(e=>e.object['Бараа']==='Bread');
  f.ctx.setObjectFields_(f.books.A.getSheetByName('Агуулахын үлдэгдэл'),row.rowNumber,{'Үлдэгдэл':89});
  const r=f.ctx.dataIntegrityCheck_(f.users.owner);
  assert.equal(r.ok,false);
  assert.ok(r.issues.some(i=>i.code==='STOCK_TOTAL_MISMATCH'));
});
test('MASTER backfill creates stable IDs and bootstrap does not expose spreadsheet ID',()=>{
  const f=fixture(),audit=f.ctx.auditMasterRegistry();
  assert.equal(audit.ok,true);
  const company=f.ctx.getCompany_('Alpha');
  assert.ok(company.id);
  const user=f.ctx.securityUser_('owner').object;
  assert.ok(user['User ID']);assert.equal(user['Company ID'],company.id);
  const payload=f.ctx.buildInitialPayload_(f.users.owner);
  assert.equal(payload.company.id,company.id);
  assert.equal(Object.prototype.hasOwnProperty.call(payload.company,'spreadsheetId'),false);
});

test('plan catalog keeps core Free features while blocking paid operations',()=>{
  const f=fixture();f.ctx.setCompanyPlan('Alpha','Free',0);
  const company=f.ctx.getCompany_('Alpha');
  assert.equal(company.planId,'Free');assert.equal(company.entitlements.ads,true);assert.equal(company.entitlements.maxUsers,2);assert.equal(company.entitlements.maxWarehouses,1);
  const sale=f.sale();assert.ok(sale.saleId);
  assert.throws(()=>f.run({action:'saveDelivery',saleId:sale.saleId,driver:'driver',date:'2026-09-20'}),/багц/);
  assert.throws(()=>f.run({action:'saveSupplier',name:'Supplier'}),/багц/);
  assert.throws(()=>f.ctx.dataPreviewImport_(f.users.owner,{kind:'customers',rows:[{name:'X'}],clientId:'preview'}),/багц/);
  assert.throws(()=>f.ctx.dataIntegrityCheck_(f.users.owner),/багц/);
  assert.throws(()=>f.ctx.handleGetPrintPreview_(f.users.owner,{documentType:'INVOICE',saleId:sale.saleId}),/багц/);
  assert.throws(()=>f.ctx.backupAction_(f.users.owner,{action:'backupStatus'}),/багц/);
});
test('Business is ad-free and unlocks operations but not Pro controls',()=>{
  const f=fixture();f.ctx.setCompanyPlan('Alpha','Business',1);const c=f.ctx.getCompany_('Alpha');
  assert.equal(c.planId,'Business');assert.equal(c.entitlements.ads,false);assert.equal(c.entitlements.monthlyPriceMnt,24900);
  assert.equal(c.entitlements.features.delivery,true);assert.equal(c.entitlements.features.pdf,true);assert.equal(c.entitlements.features.suppliers,true);
  assert.equal(c.entitlements.features.profitability,false);assert.equal(c.entitlements.features.integrityAudit,false);
  assert.equal(c.entitlements.maxUsers,5);assert.equal(c.entitlements.maxWarehouses,2);
});
test('Pro unlocks profitability and integrity controls',()=>{
  const f=fixture();f.ctx.setCompanyPlan('Alpha','Pro',1);const c=f.ctx.getCompany_('Alpha');
  assert.equal(c.entitlements.monthlyPriceMnt,59900);assert.equal(c.entitlements.features.profitability,true);assert.equal(c.entitlements.features.integrityAudit,true);
  assert.equal(c.entitlements.maxUsers,20);assert.equal(c.entitlements.maxWarehouses,10);
});
test('plan expiry falls back to Free without deleting company data',()=>{
  const f=fixture();f.ctx.ensureMasterSheets_();const sheet=f.master.getSheetByName('Компани'),entry=f.ctx.sheetObjects_(sheet).rows.find(e=>e.object['Компани нэр']==='Alpha');
  f.ctx.setObjectFields_(sheet,entry.rowNumber,{Plan:'Business','Plan End':'2020-01-01','Төлөв':'Active'});
  const c=f.ctx.getCompany_('Alpha');assert.equal(c.planId,'Free');assert.equal(c.status,'Free');assert.equal(f.stock(),100);
});

test('seat limits survive downgrade and prioritize company managers',()=>{
  const f=fixture();f.ctx.setCompanyPlan('Alpha','Free',0);const company=f.ctx.getCompany_('Alpha');
  const status=f.ctx.planSeatStatus_(company);
  assert.equal(status.used,5);assert.equal(status.max,2);assert.equal(status.over,3);
  assert.equal(f.ctx.planSeatAllowed_(company,'owner'),true);
  assert.equal(f.ctx.planSeatAllowed_(company,'rep'),true);
  assert.equal(f.ctx.planSeatAllowed_(company,'driver'),false);
  assert.throws(()=>f.ctx.secureLogin_({username:'driver',password:'pw'}),/2 идэвхтэй хэрэглэгч/);
});
test('Business seat allowance admits five active company users',()=>{
  const f=fixture();f.ctx.setCompanyPlan('Alpha','Business',1);const company=f.ctx.getCompany_('Alpha');
  for(const username of ['owner','rep','driver','warehouse','accountant'])assert.equal(f.ctx.planSeatAllowed_(company,username),true);
});

test('Free keeps basic dashboard while paid delivery module stays locked',()=>{
  const f=fixture();f.ctx.setCompanyPlan('Alpha','Free',0);
  const dashboard=f.ctx.loadModule_(f.users.owner,'dashboard');
  assert.equal(dashboard.success,true);assert.ok(dashboard.dashboard);
  assert.throws(()=>f.ctx.loadModule_(f.users.owner,'distribution'),/багц/);
});
module.exports={fixture,test};
console.log(`${tests.length} scenarios passed`);
