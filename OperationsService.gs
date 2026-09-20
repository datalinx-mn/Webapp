'use strict';

// All business data and the recoverable write journal live in the company sheet.
const OPS_PLAN_INLINE_LIMIT = 20000;
const OPS_PLAN_CHUNK_SIZE = 20000;
const OPS_PLAN_MAX_CHARS = 400000;
const OPS_SCHEMA = {
  'Үйлдлийн журнал': ['RequestID','CreatedBy','Action','Fingerprint','Status','Plan','Result','CreatedAt'],
  'Үйлдлийн журналын хэсэг': ['RequestID','Part','Payload','CreatedAt'],
  'Буцаалт': ['Warehouse','Expiry','ReturnID','SaleID','LineID','Бараа','Тоо','Дүн','Шалтгаан','Restock','Огноо','CreatedBy','DispositionNote','ReceivedBy','ReceivedAt','CreditStatus','ApprovedBy','ApprovedAt','ApprovalNote','ProductID'],
  'Цуврал': ['BatchID','Бараа','Агуулах','Дуусах огноо','Үлдэгдэл','CreatedAt','ProductID'],
  'Цуцалсан хүсэлт': ['RequestID','CreatedBy','Reason','CreatedAt'],
  'Эхний авлага': ['OpeningID','Харилцагч','CustomerID','Дүн','Огноо','DueDate','CreatedBy','Reference','Status'],
  'Засварын журнал': ['CorrectionID','Type','ReferenceID','Reason','CreatedBy','CreatedAt'],
  'Мөнгө тушаалт': ['RemittanceID','Driver','Дүн','Огноо','CreatedBy','Тэмдэглэл'],
  'Касс хаалт': ['CloseID','Date','OpeningCash','InitialCashSales','DirectCashPayments','DriverRemittances','CashRefundsAndReversals','SystemMovement','ExpectedCash','CountedCash','Difference','Reason','CreatedBy','CreatedAt','LegacyAmbiguousCount'],
  'Нийлүүлэгч': ['SupplierID','Name','RegistrationNumber','Phone','Email','Address','PaymentTermDays','Active','CreatedBy','CreatedAt'],
  'Худалдан авалт': ['PurchaseID','SupplierID','SupplierName','InvoiceNumber','Date','Warehouse','Status','Total','Notes','CreatedBy','CreatedAt'],
  'Худалдан авалтын мөр': ['PurchaseID','ProductID','Product','Quantity','UnitCost','Total','ExpiryDate','BatchCode','InputUnit','InputQuantity','InputUnitCost'],
  'Нийлүүлэгчийн төлбөр': ['SupplierPaymentID','PurchaseID','SupplierID','Date','Amount','Method','Notes','CreatedBy']
};
function ensureOperationsSheets_(ss) {
  Object.keys(OPS_SCHEMA).forEach(name => ensureSheet_(ss, name, OPS_SCHEMA[name]));
  ensureSheet_(ss, COMPANY_SHEETS.PRODUCTS, ['PackName','PackSize']);
  ensureSheet_(ss, COMPANY_SHEETS.SALES, ['LineID','BatchAllocations']);
  ensureSheet_(ss, COMPANY_SHEETS.PAYMENTS, ['Source','Collector','ReversalOf']);
  ensureSheet_(ss, COMPANY_SHEETS.VISITS, ['DriverUsername']);
}
let opsReadCache_ = null;
function opsRows_(ss, name) {
  if (!opsReadCache_) return sheetObjects_(ss.getSheetByName(name)).rows;
  const key=ss.getId()+'|'+name;
  if (!opsReadCache_[key]) opsReadCache_[key]=sheetObjects_(ss.getSheetByName(name)).rows;
  return opsReadCache_[key];
}
function opsGrouped_(ss,name,key,value){
  if(!opsReadCache_)return opsRows_(ss,name).filter(e=>String(e.object[key])===String(value));
  const cacheKey='index|'+ss.getId()+'|'+name+'|'+key;
  if(!opsReadCache_[cacheKey]){const index=new Map();opsRows_(ss,name).forEach(e=>{const k=String(e.object[key]);if(!index.has(k))index.set(k,[]);index.get(k).push(e);});opsReadCache_[cacheKey]=index;}
  return opsReadCache_[cacheKey].get(String(value))||[];
}
function opsDay_(value) {
  const date = asDate_(value || new Date());
  return date ? Utilities.formatDate(date, 'Asia/Ulaanbaatar', 'yyyy-MM-dd') : '';
}
function opsDate_(value, required) {
  const text = clean_(value);
  if (!text && !required) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !asDate_(text+'T00:00:00Z') || new Date(text + 'T00:00:00Z').toISOString().slice(0, 10) !== text) throw new Error('Огноог зөв сонгоно уу.');
  return text;
}
function opsMoney_(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }
function opsQty_(n) { return Math.round((Number(n) + Number.EPSILON) * 1000000) / 1000000; }
function opsAssertRole_(auth, roles) {
  if (roles.indexOf(normalizeRole_(auth.role)) < 0) throw new Error('Энэ үйлдлийг хийх эрх хүрэлцэхгүй байна.');
}
function opsCanSeeSale_(auth, entry, ss) {
  if (isManagerRole_(auth.role) || auth.role === 'accountant' || auth.role === 'warehouse') return true;
  const o = entry.object;
  if (isSalesRole_(auth.role)) return clean_(o.CreatedBy) ? clean_(o.CreatedBy) === auth.username : samePerson_(o['Рэп нэр'], auth);
  if (isDriverRole_(auth.role)) return opsRows_(ss, COMPANY_SHEETS.VISITS).some(v => v.object.SaleID === saleRowIdentifier_(entry) && opsOwnDelivery_(auth, v.object));
  return false;
}
function opsOwnDelivery_(auth, o) {
  return o.DriverUsername ? o.DriverUsername === auth.username : samePerson_(o.Driver, auth);
}
function opsSale_(ss, id, auth) {
  if(String(id).startsWith('OPEN-'))return dataOpeningSale_(ss,id,auth);
  const rows = (opsReadCache_ ? opsSalesIndex_(ss,id) : opsRows_(ss, COMPANY_SHEETS.SALES).filter(e => saleRowIdentifier_(e) === id));
  if (!rows.length || !opsCanSeeSale_(auth, rows[0], ss)) throw new Error('Борлуулалт олдсонгүй эсвэл харах эрхгүй байна.');
  const first = rows[0].object;
  const payments = getPaymentsForSale_(ss, id);
  const returns = opsGrouped_(ss,'Буцаалт','SaleID',id).map(e => e.object);
  const total = opsMoney_(rows.reduce((sum,e) => sum + Number(e.object['Нийт дүн'] || 0), 0));
  const rowPaid = rows.reduce((sum,e) => sum + Number(e.object.PaidAmount || 0), 0);
  // Legacy rows/ledger historically represented the same initial payment. New entries
  // are explicitly incremental, preventing both lost deposits and double counting.
  const oldPayments = payments.filter(p => !p.source).reduce((s,p) => s + p.amount, 0);
  const paid = opsMoney_(Math.max(rowPaid, oldPayments) + payments.filter(p => p.source).reduce((s,p) => s + p.amount, 0));
  const approvedReturns=returns.filter(opsCreditApproved_);
  const returned = opsMoney_(approvedReturns.reduce((s,r) => s + Number(r['Дүн'] || 0), 0));
  const net = opsMoney_(Math.max(0, total - returned));
  const grossRevenueExVat=opsMoney_(rows.reduce((s,e)=>s+Number(e.object['Нийт дүн']||0)-Number(e.object.VAT||0),0));
  let knownRevenueExVat=0,grossCogsKnown=0,grossProfitKnown=0,returnedCogsKnown=0,returnedProfitKnown=0;
  rows.forEach(e=>{
    const o=e.object,known=['тийм','true','1','yes'].includes(clean_(o.CostKnownAtSale).toLowerCase());
    if(!known)return;
    const lineRevenue=opsMoney_(Number(o['Нийт дүн']||0)-Number(o.VAT||0));
    knownRevenueExVat+=lineRevenue;grossCogsKnown+=Number(o.COGS||0);grossProfitKnown+=Number(o.GrossProfit||0);
    const lineId=o.LineID||'ROW-'+e.rowNumber,lineTotal=Number(o['Нийт дүн']||0),lineVat=Number(o.VAT||0),unitCost=Number(o.UnitCostAtSale||0);
    approvedReturns.filter(r=>r.LineID===lineId).forEach(r=>{
      const credit=Number(r['Дүн']||0),ratio=lineTotal>0?Math.max(0,(lineTotal-lineVat)/lineTotal):1;
      const returnRevenueExVat=opsMoney_(credit*ratio),returnCogs=opsMoney_(Number(r['Тоо']||0)*unitCost);
      returnedCogsKnown+=returnCogs;returnedProfitKnown+=returnRevenueExVat-returnCogs;
    });
  });
  knownRevenueExVat=opsMoney_(knownRevenueExVat);grossCogsKnown=opsMoney_(grossCogsKnown);grossProfitKnown=opsMoney_(grossProfitKnown);
  const netCogsKnown=opsMoney_(grossCogsKnown-returnedCogsKnown),netGrossProfitKnown=opsMoney_(grossProfitKnown-returnedProfitKnown);
  const costCoveragePct=grossRevenueExVat>0?Math.round((knownRevenueExVat/grossRevenueExVat)*10000)/100:100;
  return { id, rows, customer: first['Харилцагч'], warehouse: first.Warehouse || firstWarehouse_(ss),
    date: iso_(first['Огноо']), dueDate: first.DueDate ? opsDay_(first.DueDate) : '', status: first.Status || 'Approved',
    total, returned, net, paid, remaining: opsMoney_(Math.max(0, net-paid)), refundDue: opsMoney_(Math.max(0,paid-net)), payments, returns,
    cogsKnown:netCogsKnown,grossProfitKnown:netGrossProfitKnown,grossProfit:costCoveragePct>=99.999?netGrossProfitKnown:null,costCoveragePct,
    items: rows.map(e => ({ lineId: e.object.LineID || 'ROW-' + e.rowNumber, productId:clean_(e.object.ProductID), product:e.object['Бараа'], quantity:Number(e.object['Тоо']), unitPrice:Number(e.object['Үнэ']), inputUnit:clean_(e.object.InputUnit)||'base', inputQuantity:Number(e.object.InputQuantity||e.object['Тоо']), inputUnitPrice:Number(e.object.InputUnitPrice||e.object['Үнэ']), total:Number(e.object['Нийт дүн']), costKnown:['тийм','true','1','yes'].includes(clean_(e.object.CostKnownAtSale).toLowerCase()), unitCostAtSale:clean_(e.object.UnitCostAtSale)===''?null:Number(e.object.UnitCostAtSale), returned:returns.filter(r => r.CreditStatus!=='Rejected' && r.LineID === (e.object.LineID || 'ROW-' + e.rowNumber)).reduce((s,r)=>s+Number(r['Тоо']),0) })) };
}
function opsPublicSale_(sale) { const copy = Object.assign({}, sale); delete copy.rows; return copy; }
function opsActiveSale_(sale) {
  if (['cancelled','цуцлагдсан','draft','ноорог'].includes(clean_(sale.status).toLowerCase())) throw new Error('Энэ борлуулалтын төлөв үйлдэл хийх боломжгүй байна.');
}

// Write-ahead journal: persist exact target rows before applying any business write.
// Retrying a partially committed operation replays the same values, never increments twice.
function opsPlan_(ss) {
  const changes = new Map();
  const next = {};
  return {
    rows: name => {
      const result = opsRows_(ss,name).map(e => ({rowNumber:e.rowNumber, object:Object.assign({},e.object)}));
      changes.forEach(c => { if(c.sheet !== name) return; const o = rowToObject_(getHeaders_(ss.getSheetByName(name)),c.values); const row=result.find(e=>e.rowNumber===c.row); if(row)row.object=o; else result.push({rowNumber:c.row,object:o}); });
      return result;
    },
    set: function(name,row,fields) {
      const headers=getHeaders_(ss.getSheetByName(name));
      const previous=this.rows(name).find(e=>e.rowNumber===row);
      const values=objectToRow_(headers,Object.assign({},previous ? previous.object : {},fields));
      changes.set(name+'|'+row,{sheet:name,row,values}); return row;
    },
    add: function(name,fields) { if(!next[name])next[name]=ss.getSheetByName(name).getLastRow()+1; return this.set(name,next[name]++,fields); },
    changes: () => Array.from(changes.values())
  };
}
function opsStorePlan_(ss, requestId, plan) {
  if (plan.length > OPS_PLAN_MAX_CHARS) throw new Error('Нэг үйлдэлд хэт их мэдээлэл байна. Бүртгэлээ хэсэгчлэн оруулна уу.');
  if (plan.length <= OPS_PLAN_INLINE_LIMIT) return plan;
  const parts = [];
  for (let i=0;i<plan.length;i+=OPS_PLAN_CHUNK_SIZE) parts.push(plan.slice(i,i+OPS_PLAN_CHUNK_SIZE));
  const sheet=ss.getSheetByName('Үйлдлийн журналын хэсэг');
  parts.forEach((payload,index)=>appendObjectRow_(sheet,{RequestID:requestId,Part:index+1,Payload:payload,CreatedAt:new Date().toISOString()}));
  return '@parts:' + parts.length;
}
function opsLoadPlan_(ss, requestId, marker) {
  const value=String(marker||'');
  if (!value.startsWith('@parts:')) return value;
  const expected=Number(value.slice(7));
  const rows=opsRows_(ss,'Үйлдлийн журналын хэсэг').filter(e=>e.object.RequestID===requestId && e.object.Payload)
    .sort((a,b)=>Number(a.object.Part)-Number(b.object.Part));
  if (rows.length!==expected) throw new Error('Сэргээх төлөвлөгөө дутуу байна. DataLinx операторт мэдэгдэнэ үү.');
  return rows.map(e=>String(e.object.Payload)).join('');
}
function opsClearPlanParts_(ss, requestId) {
  const sheet=ss.getSheetByName('Үйлдлийн журналын хэсэг');
  sheetObjects_(sheet).rows.filter(e=>e.object.RequestID===requestId && e.object.Payload).forEach(e=>setObjectFields_(sheet,e.rowNumber,{Payload:''}));
}
function opsReplay_(ss, entry) {
  const requestId=clean_(entry.object.RequestID);
  const serialized=opsLoadPlan_(ss,requestId,entry.object.Plan);
  const plan=JSON.parse(serialized);
  plan.forEach(c => ss.getSheetByName(c.sheet).getRange(c.row,1,1,c.values.length).setValues([c.values]));
  SpreadsheetApp.flush();
  setObjectFields_(ss.getSheetByName('Үйлдлийн журнал'),entry.rowNumber,{Status:'Done',Plan:''});
  if(requestId)opsClearPlanParts_(ss,requestId);
}
function opsRecover_(ss) {
  opsRows_(ss,'Үйлдлийн журнал').filter(e=>e.object.Status==='Pending').forEach(e=>opsReplay_(ss,e));
}
function withOperationsRead_(auth,read) {
  const ss=openCompanySs_(requireActiveCompany_(auth.companyId || auth.company));
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {ensureCompanySheets_(ss);opsRecover_(ss);opsReadCache_={};return read();}
  finally {opsReadCache_=null;lock.releaseLock();}
}
function recoverOperations_(auth) {
  const ss=openCompanySs_(requireActiveCompany_(auth.companyId || auth.company));
  const lock=LockService.getScriptLock(); lock.waitLock(30000);
  try { ensureOperationsSheets_(ss); opsRecover_(ss); } finally { lock.releaseLock(); }
}
function handleOperation_(auth,p) {
  const ss=openCompanySs_(requireActiveCompany_(auth.companyId || auth.company));
  const lock=LockService.getScriptLock(); lock.waitLock(30000);
  try {
    ensureCompanySheets_(ss); ensureOperationsSheets_(ss); opsRecover_(ss);
    const requestId=clean_(p.clientId);
    if(!requestId || requestId.length>120) throw new Error('Бүртгэлийн дугаар дутуу байна. Дахин нээнэ үү.');
    const safe=Object.assign({},p); delete safe.token;
    const fingerprint=sha256_(JSON.stringify(safe));
    const journal=ss.getSheetByName('Үйлдлийн журнал');
    const old=opsRows_(ss,'Үйлдлийн журнал').find(e=>e.object.RequestID===requestId);
    if(old) {
      if(old.object.CreatedBy!==auth.username || old.object.Fingerprint!==fingerprint) throw new Error('Бүртгэлийн дугаар өөр хүсэлтэд ашиглагдсан байна.');
      return Object.assign(JSON.parse(old.object.Result),{duplicate:true});
    }
    if(opsRows_(ss,'Цуцалсан хүсэлт').some(e=>e.object.RequestID===requestId))throw new Error('Энэ хүсэлтийг цуцалсан. Шинэ бүртгэл үүсгэнэ үү.');
    const tx=opsPlan_(ss);
    if (p.action === 'addSale') {
      const legacy = opsRows_(ss,COMPANY_SHEETS.SALES).find(e=>e.object['Client ID']===requestId);
      if(legacy) { const sale=opsSale_(ss,saleRowIdentifier_(legacy),auth); return {success:true,duplicate:true,saleId:sale.id,total:sale.total,remainingStocks:getSaleStockMap_(ss,p),transaction:{saleId:sale.id,date:sale.date,total:sale.total,customer:sale.customer}}; }
    }
    if (p.action === 'addInventoryMove') {
      const legacy=opsRows_(ss,COMPANY_SHEETS.INVENTORY_MOVES).find(e=>e.object['Client ID']===requestId);
      if(legacy)return {success:true,duplicate:true,stock:Number(opsProduct_(ss,p.product).object['Одоогийн үлдэгдэл']),date:iso_(legacy.object['Огноо'])};
    }
    const routes={addSale:opsAddSale_, addInventoryMove:opsInventory_, addPayment:opsPayment_, returnSale:opsReturn_, receiveReturn:opsReceiveReturn_, refundPayment:opsRefund_, saveDelivery:opsDelivery_, remitCash:opsRemit_,approveReturn:opsApproveReturn_,reversePayment:opsReversePayment_,cancelSale:opsCancelSale_,importData:dataImport_,stocktake:opsStocktake_,closeCash:opsCloseCash_,saveSupplier:opsSaveSupplier_,receivePurchase:opsReceivePurchase_,addSupplierPayment:opsSupplierPayment_};
    if(!routes[p.action])throw new Error('Үйлдэл олдсонгүй.');
    const result=Object.assign({success:true},routes[p.action](auth,p,ss,tx));
    const serialized=JSON.stringify(tx.changes());
    const plan=opsStorePlan_(ss,requestId,serialized);
    const row=appendObjectRow_(journal,{RequestID:requestId,CreatedBy:auth.username,Action:p.action,Fingerprint:fingerprint,Status:'Pending',Plan:plan,Result:JSON.stringify(result),CreatedAt:new Date().toISOString()});
    SpreadsheetApp.flush();
    opsReplay_(ss,{rowNumber:row,object:{RequestID:requestId,Plan:plan}});
    return result;
  } finally { lock.releaseLock(); }
}
function opsProduct_(ss,productRef) {
  const ref=clean_(productRef);
  const rows=sheetObjects_(ss.getSheetByName(COMPANY_SHEETS.PRODUCTS)).rows;
  const e=rows.find(entry=>clean_(entry.object.ProductID)===ref) ||
    rows.find(entry=>clean_(entry.object['Барааны нэр']).toLowerCase()===ref.toLowerCase());
  if(!e || ['false','0','үгүй','inactive'].includes(clean_(e.object['Идэвхтэй']).toLowerCase()))throw new Error('Бараа олдсонгүй: '+ref);
  return e;
}
function opsUnit_(product,quantity,inputUnit) {
  const unit=clean_(inputUnit)||'base';
  const factor=unit==='pack' ? positiveNumber_(product.object.PackSize,'Савлагааны тоо') : 1;
  if(!['pack','base'].includes(unit))throw new Error('Хэмжих нэгж буруу байна.');
  return opsQty_(positiveNumber_(quantity,'Тоо хэмжээ')*factor);
}
function opsWarehouse_(ss,name) {
  const value=clean_(name)||firstWarehouse_(ss);
  if(!findObjectRowByValue_(ss.getSheetByName(COMPANY_SHEETS.WAREHOUSES),['Агуулахын нэр'],value))throw new Error('Агуулах олдсонгүй.');
  return value;
}
function opsStock_(ss,tx,product,warehouse,delta) {
  const name=product.object['Барааны нэр'], productId=clean_(product.object.ProductID);
  const pr=tx.rows(COMPANY_SHEETS.PRODUCTS).find(e=>e.rowNumber===product.rowNumber);
  const stock=opsQty_(Number(pr.object['Одоогийн үлдэгдэл']||0));
  const matches=tx.rows(COMPANY_SHEETS.WAREHOUSE_STOCK).filter(e=>
    (productId && clean_(e.object.ProductID)===productId) ||
    (!clean_(e.object.ProductID) && clean_(e.object['Бараа']).toLowerCase()===name.toLowerCase()));
  let entry=matches.find(e=>e.object['Агуулах']===warehouse);
  const current=entry ? opsQty_(Number(entry.object['Үлдэгдэл']||0)) : (!matches.length && warehouse===firstWarehouse_(ss) ? stock : 0);
  const nextWarehouse=opsQty_(current+delta), nextTotal=opsQty_(stock+delta);
  if(nextWarehouse < -0.000001 || nextTotal < -0.000001)throw new Error(name+' барааны сонгосон агуулахын үлдэгдэл хүрэлцэхгүй байна.');
  tx.set(COMPANY_SHEETS.PRODUCTS,product.rowNumber,{'Одоогийн үлдэгдэл':nextTotal});
  if(!matches.length && warehouse!==firstWarehouse_(ss) && stock>0)tx.add(COMPANY_SHEETS.WAREHOUSE_STOCK,{'Агуулах':firstWarehouse_(ss),'Бараа':name,'Үлдэгдэл':stock,ProductID:productId});
  const fields={'Агуулах':warehouse,'Бараа':name,'Үлдэгдэл':nextWarehouse,ProductID:productId};
  if(entry)tx.set(COMPANY_SHEETS.WAREHOUSE_STOCK,entry.rowNumber,fields);else tx.add(COMPANY_SHEETS.WAREHOUSE_STOCK,fields);
  return nextTotal;
}
function opsBatchesOut_(ss,tx,name,warehouse,qty,allowExpired) {
  const product=opsProduct_(ss,name), productId=clean_(product.object.ProductID);
  const rows=tx.rows('Цуврал').filter(e=>((productId&&clean_(e.object.ProductID)===productId)||(!clean_(e.object.ProductID)&&e.object['Бараа']===name)) && e.object['Агуулах']===warehouse && Number(e.object['Үлдэгдэл'])>0);
  const stockRow=tx.rows(COMPANY_SHEETS.WAREHOUSE_STOCK).find(e=>((productId&&clean_(e.object.ProductID)===productId)||(!clean_(e.object.ProductID)&&e.object['Бараа']===name)) && e.object['Агуулах']===warehouse);
  const stock=stockRow ? Number(stockRow.object['Үлдэгдэл']) : (warehouse===firstWarehouse_(ss) ? Number(product.object['Одоогийн үлдэгдэл']) : 0);
  const tracked=rows.reduce((s,e)=>s+Number(e.object['Үлдэгдэл']),0);
  rows.sort((a,b)=>String(a.object['Дуусах огноо']||'9999').localeCompare(String(b.object['Дуусах огноо']||'9999')));
  let left=qty; const allocations=[];
  rows.forEach(e=>{
    if(left<=0 || (!allowExpired && e.object['Дуусах огноо'] && e.object['Дуусах огноо']<opsDay_()))return;
    const take=Math.min(left,Number(e.object['Үлдэгдэл'])); left-=take;
    tx.set('Цуврал',e.rowNumber,{'Үлдэгдэл':Number(e.object['Үлдэгдэл'])-take});
    allocations.push({batchId:e.object.BatchID,quantity:take,expiry:e.object['Дуусах огноо']||''});
  });
  if(left>Math.max(0,stock-tracked)+0.000001)throw new Error(name+' барааны хугацаа хүчинтэй үлдэгдэл хүрэлцэхгүй байна.');
  if(left>0)allocations.push({batchId:'',quantity:left,expiry:''});
  return allocations;
}
function opsMove_(tx,auth,fields) { tx.add(COMPANY_SHEETS.INVENTORY_MOVES,Object.assign({'Огноо':new Date().toISOString(),'Confirmed':'Тийм','Рэп нэр':auth.fullName||auth.username},fields)); }
function opsCostKnown_(productObject) {
  return ['тийм','true','1','yes'].includes(clean_(productObject.CostKnown).toLowerCase());
}
function opsWeightedCostIn_(tx, product, qty, unitCost) {
  qty=opsQty_(qty);unitCost=opsMoney_(unitCost);
  const entry=tx.rows(COMPANY_SHEETS.PRODUCTS).find(e=>e.rowNumber===product.rowNumber);
  if(!entry)throw new Error('Барааны өртгийн мэдээлэл олдсонгүй.');
  const oldStock=opsQty_(Number(entry.object['Одоогийн үлдэгдэл']||0));
  const known=opsCostKnown_(entry.object),oldCost=known?Number(entry.object.AverageCost||0):0;
  if(oldStock<=0.000001){
    tx.set(COMPANY_SHEETS.PRODUCTS,product.rowNumber,{AverageCost:unitCost,CostKnown:'Тийм'});
    return {known:true,averageCost:unitCost};
  }
  if(!known)return {known:false,averageCost:null,warning:'Өмнөх үлдэгдлийн өртөг тодорхойгүй тул дундаж өртөг автоматаар тооцоогүй.'};
  const average=opsMoney_((oldStock*oldCost+qty*unitCost)/(oldStock+qty));
  tx.set(COMPANY_SHEETS.PRODUCTS,product.rowNumber,{AverageCost:average,CostKnown:'Тийм'});
  return {known:true,averageCost:average};
}
function opsSupplier_(ss,ref) {
  const value=clean_(ref);if(!value)throw new Error('Нийлүүлэгч сонгоно уу.');
  const entry=opsRows_(ss,'Нийлүүлэгч').find(e=>clean_(e.object.SupplierID)===value||clean_(e.object.Name).toLowerCase()===value.toLowerCase());
  if(!entry||['үгүй','false','0','inactive'].includes(clean_(entry.object.Active).toLowerCase()))throw new Error('Нийлүүлэгч олдсонгүй.');
  return entry;
}
function opsSaveSupplier_(auth,p,ss,tx) {
  opsAssertRole_(auth,['manager','admin','accountant']);
  const id=clean_(p.supplierId),name=clean_(p.name),reg=clean_(p.registrationNumber);
  if(!name)throw new Error('Нийлүүлэгчийн нэр оруулна уу.');
  const rows=tx.rows('Нийлүүлэгч'),existing=id?rows.find(e=>e.object.SupplierID===id):null;
  if(id&&!existing)throw new Error('Засах нийлүүлэгч олдсонгүй.');
  if(rows.some(e=>(!existing||e.rowNumber!==existing.rowNumber)&&clean_(e.object.Name).toLowerCase()===name.toLowerCase()))throw new Error('Ижил нэртэй нийлүүлэгч бүртгэлтэй байна.');
  if(reg&&rows.some(e=>(!existing||e.rowNumber!==existing.rowNumber)&&clean_(e.object.RegistrationNumber).toLowerCase()===reg.toLowerCase()))throw new Error('Ижил регистртэй нийлүүлэгч бүртгэлтэй байна.');
  const supplierId=existing?id:createBusinessId_('SUP');
  const fields={SupplierID:supplierId,Name:name,RegistrationNumber:reg,Phone:clean_(p.phone),Email:clean_(p.email),Address:clean_(p.address),PaymentTermDays:nonNegativeNumber_(p.paymentTermDays||0,'Төлбөрийн хоног'),Active:'Тийм',CreatedBy:existing?existing.object.CreatedBy:auth.username,CreatedAt:existing?existing.object.CreatedAt:new Date().toISOString()};
  if(existing)tx.set('Нийлүүлэгч',existing.rowNumber,fields);else tx.add('Нийлүүлэгч',fields);
  return {supplierId,name};
}
function opsPurchaseSummary_(ss,entry) {
  const o=entry.object,id=o.PurchaseID,total=opsMoney_(Number(o.Total||0));
  const paid=opsMoney_(opsGrouped_(ss,'Нийлүүлэгчийн төлбөр','PurchaseID',id).reduce((s,e)=>s+Number(e.object.Amount||0),0));
  return {id,supplierId:o.SupplierID,supplier:o.SupplierName,invoiceNumber:o.InvoiceNumber||'',date:opsDay_(o.Date),warehouse:o.Warehouse,status:o.Status||'Received',total,paid,payable:opsMoney_(Math.max(0,total-paid)),notes:o.Notes||''};
}
function opsReceivePurchase_(auth,p,ss,tx) {
  opsAssertRole_(auth,['manager','admin','accountant','warehouse']);
  const supplier=opsSupplier_(ss,p.supplierId||p.supplier),warehouse=opsWarehouse_(ss,p.warehouse),invoice=clean_(p.invoiceNumber),date=opsDate_(p.date||opsDay_(),true);
  if(invoice&&tx.rows('Худалдан авалт').some(e=>e.object.SupplierID===supplier.object.SupplierID&&clean_(e.object.InvoiceNumber).toLowerCase()===invoice.toLowerCase()))throw new Error('Энэ нийлүүлэгчийн ижил нэхэмжлэх өмнө бүртгэгдсэн байна.');
  const raw=Array.isArray(p.items)?p.items:[];if(!raw.length||raw.length>40)throw new Error('Татан авалтад 1–40 төрлийн бараа оруулна.');
  const purchaseId=createBusinessId_('PUR'),warnings=[];let total=0;
  const items=raw.map(i=>{
    const product=opsProduct_(ss,i.productId||i.product),inputUnit=clean_(i.inputUnit)||'base',inputQty=positiveNumber_(i.inputQuantity!==undefined?i.inputQuantity:i.quantity,'Тоо хэмжээ'),qty=opsUnit_(product,inputQty,inputUnit),factor=inputUnit==='pack'?positiveNumber_(product.object.PackSize,'Савлагааны тоо'):1,inputUnitCost=nonNegativeNumber_(i.inputUnitCost!==undefined?i.inputUnitCost:i.unitCost,'Өртөг'),unitCost=opsMoney_(inputUnitCost/factor);
    total=opsMoney_(total+qty*unitCost);
    return {product,inputUnit,inputQty:opsQty_(inputQty),qty,inputUnitCost,unitCost,expiry:i.expiryDate?opsDate_(i.expiryDate,true):'',batchCode:clean_(i.batchCode)};
  });
  const paid=opsMoney_(nonNegativeNumber_(p.paidAmount||0,'Төлсөн дүн'));if(paid>total+0.001)throw new Error('Нийлүүлэгчид төлсөн дүн худалдан авалтын дүнгээс их байна.');
  if(paid>0&&!['manager','admin','accountant'].includes(normalizeRole_(auth.role)))throw new Error('Нийлүүлэгчийн төлбөрийг нягтлан эсвэл менежер бүртгэнэ.');
  const method=paid>0?(clean_(p.paymentMethod)||'Банк'):'';
  if(paid>0&&!['Бэлэн','Банк'].includes(method))throw new Error('Нийлүүлэгчийн төлбөрийн арга буруу байна.');
  tx.add('Худалдан авалт',{PurchaseID:purchaseId,SupplierID:supplier.object.SupplierID,SupplierName:supplier.object.Name,InvoiceNumber:invoice,Date:date,Warehouse:warehouse,Status:'Received',Total:total,Notes:clean_(p.notes),CreatedBy:auth.username,CreatedAt:new Date().toISOString()});
  items.forEach(item=>{
    const productId=clean_(item.product.object.ProductID),costUpdate=opsWeightedCostIn_(tx,item.product,item.qty,item.unitCost);if(costUpdate.warning)warnings.push(item.product.object['Барааны нэр']+': '+costUpdate.warning);
    opsStock_(ss,tx,item.product,warehouse,item.qty);
    tx.add('Худалдан авалтын мөр',{PurchaseID:purchaseId,ProductID:productId,Product:item.product.object['Барааны нэр'],Quantity:item.qty,UnitCost:item.unitCost,Total:opsMoney_(item.qty*item.unitCost),ExpiryDate:item.expiry,BatchCode:item.batchCode,InputUnit:item.inputUnit,InputQuantity:item.inputQty,InputUnitCost:item.inputUnitCost});
    if(item.expiry||item.batchCode)tx.add('Цуврал',{BatchID:createBusinessId_('LOT')+(item.batchCode?'-'+item.batchCode.slice(0,30):''),ProductID:productId,'Бараа':item.product.object['Барааны нэр'],'Агуулах':warehouse,'Дуусах огноо':item.expiry,'Үлдэгдэл':item.qty,CreatedAt:new Date().toISOString()});
    opsMove_(tx,auth,{ProductID:productId,'Бараа':item.product.object['Барааны нэр'],'Хөдөлгөөний төрөл (орлого/зарлага/шилжүүлэг)':'орлого','Тоо':item.qty,'Агуулах':warehouse,'Client ID':p.clientId,'Шалтгаан':'Татан авалт '+purchaseId,'Нэгж үнэ':item.unitCost,'Нийт дүн':opsMoney_(item.qty*item.unitCost)});
  });
  if(paid>0)tx.add('Нийлүүлэгчийн төлбөр',{SupplierPaymentID:createBusinessId_('SPAY'),PurchaseID:purchaseId,SupplierID:supplier.object.SupplierID,Date:new Date().toISOString(),Amount:paid,Method:method,Notes:'Татан авалтын анхны төлбөр',CreatedBy:auth.username});
  return {purchaseId,total,paid,payable:opsMoney_(total-paid),costWarnings:warnings};
}
function opsSupplierPayment_(auth,p,ss,tx) {
  opsAssertRole_(auth,['manager','admin','accountant']);
  const entry=tx.rows('Худалдан авалт').find(e=>e.object.PurchaseID===clean_(p.purchaseId));if(!entry)throw new Error('Худалдан авалт олдсонгүй.');
  const summary=opsPurchaseSummary_(ss,entry),amount=opsMoney_(positiveNumber_(p.amount,'Төлөх дүн'));if(amount>summary.payable+0.001)throw new Error('Өглөгийн үлдэгдлээс их дүн төлөх боломжгүй.');
  const method=clean_(p.method)||'Банк';if(!['Бэлэн','Банк'].includes(method))throw new Error('Төлбөрийн аргаа сонгоно уу.');
  tx.add('Нийлүүлэгчийн төлбөр',{SupplierPaymentID:createBusinessId_('SPAY'),PurchaseID:summary.id,SupplierID:summary.supplierId,Date:new Date().toISOString(),Amount:amount,Method:method,Notes:clean_(p.notes),CreatedBy:auth.username});
  return {purchaseId:summary.id,payable:opsMoney_(summary.payable-amount)};
}

function opsAddSale_(auth,p,ss,tx) {
  opsAssertRole_(auth,['manager','admin','rep','sales']);
  if(!clean_(p.customer))throw new Error('Харилцагчийн нэрээ оруулна уу.');
  const warehouse=opsWarehouse_(ss,p.warehouse);
  const id=createBusinessId_('SAL'), now=new Date().toISOString();
  const raw=Array.isArray(p.items)&&p.items.length?p.items:[p];
  if(raw.length>40)throw new Error('Нэг борлуулалтад 40 хүртэл төрлийн бараа нэмнэ.');
  const items=raw.map(i=>{
    const product=opsProduct_(ss,i.productId||i.product);
    const inputUnit=clean_(i.inputUnit)||'base';
    const inputQuantity=positiveNumber_(i.inputQuantity!==undefined&&i.inputQuantity!==''?i.inputQuantity:i.quantity,'Тоо хэмжээ');
    const quantity=opsUnit_(product,inputQuantity,inputUnit);
    const factor=inputUnit==='pack'?positiveNumber_(product.object.PackSize,'Савлагааны тоо'):1;
    const inputUnitPrice=nonNegativeNumber_(i.inputUnitPrice!==undefined&&i.inputUnitPrice!==''?i.inputUnitPrice:i.unitPrice,'Үнэ');
    const costKnown=['тийм','true','1','yes'].includes(clean_(product.object.CostKnown).toLowerCase());
    const averageCost=costKnown?nonNegativeNumber_(product.object.AverageCost||0,'Өртөг'):0;
    return {productId:clean_(product.object.ProductID),product:product.object['Барааны нэр'],quantity,inputUnit,inputQuantity:opsQty_(inputQuantity),inputUnitPrice,unitPrice:inputUnitPrice/factor,costKnown,averageCost,record:product};
  });
  const gross=opsMoney_(items.reduce((s,i)=>s+i.quantity*i.unitPrice,0));
  const discount=nonNegativeNumber_(p.discount||0,'Хөнгөлөлт'),vat=nonNegativeNumber_(p.vat||0,'НӨАТ');
  if(discount>gross)throw new Error('Хөнгөлөлт борлуулалтын дүнгээс их байна.');
  const total=opsMoney_(gross-discount+vat),paymentType=p.paymentType==='Зээл'?'Зээл':'Бэлэн';
  const paid=(p.paidAmount===undefined||p.paidAmount==='')?(paymentType==='Бэлэн'?total:0):opsMoney_(nonNegativeNumber_(p.paidAmount,'Төлсөн дүн'));
  if(paid>total)throw new Error('Төлсөн дүн нийт дүнгээс их байна.');
  let initialPaymentMethod=paid>0?clean_(p.initialPaymentMethod):'';
  if(paid>0&&!initialPaymentMethod)initialPaymentMethod=paymentType==='Бэлэн'?'Бэлэн':'Тодорхойгүй';
  if(paid>0&&!['Бэлэн','Банк','Тодорхойгүй'].includes(initialPaymentMethod))throw new Error('Одоо төлсөн дүнгийн арга буруу байна.');
  const due=paid<total?(p.dueDate?opsDate_(p.dueDate,true):opsDay_(defaultDueDate_(ss,new Date()))):'';
  const customer=tx.rows(COMPANY_SHEETS.CUSTOMERS).find(e=>clean_(e.object['Харилцагчийн нэр']).toLowerCase()===clean_(p.customer).toLowerCase());
  const customerId=customer?customer.object.CustomerID:createBusinessId_('CUS');
  if(!customer)tx.add(COMPANY_SHEETS.CUSTOMERS,{'Харилцагчийн нэр':clean_(p.customer),CustomerID:customerId,'Идэвхтэй':'Тийм'});
  const remainingStocks={}; let usedDiscount=0,usedVat=0;
  items.forEach((item,index)=>{
    const last=index===items.length-1;
    const ld=last?opsMoney_(discount-usedDiscount):opsMoney_(gross?discount*item.quantity*item.unitPrice/gross:0);
    const lv=last?opsMoney_(vat-usedVat):opsMoney_(gross?vat*item.quantity*item.unitPrice/gross:0);
    usedDiscount+=ld; usedVat+=lv;
    const allocations=opsBatchesOut_(ss,tx,item.product,warehouse,item.quantity,false);
    remainingStocks[item.product]=opsStock_(ss,tx,item.record,warehouse,-item.quantity);
    const lineRevenueExVat=opsMoney_(item.quantity*item.unitPrice-ld);
    const cogs=item.costKnown?opsMoney_(item.quantity*item.averageCost):'';
    const grossProfit=item.costKnown?opsMoney_(lineRevenueExVat-cogs):'';
    tx.add(COMPANY_SHEETS.SALES,{'Огноо':now,'Рэп нэр':auth.fullName||auth.username,'Бараа':item.product,ProductID:item.productId,'Тоо':item.quantity,'Үнэ':item.unitPrice,'Нийт дүн':opsMoney_(item.quantity*item.unitPrice-ld+lv),'Харилцагч':clean_(p.customer),'Төлбөрийн төрөл':paymentType,'Байршил':clean_(p.location)||firstLocation_(ss),'Client ID':p.clientId,SaleID:id,LineID:id+'-'+index,Status:'Approved',Warehouse:warehouse,CustomerID:customerId,Discount:ld,VAT:lv,PaidAmount:index===0?paid:0,InitialPaymentMethod:index===0?initialPaymentMethod:'',DueDate:due,CreatedBy:auth.username,BatchAllocations:JSON.stringify(allocations),InputUnit:item.inputUnit,InputQuantity:item.inputQuantity,InputUnitPrice:item.inputUnitPrice,UnitCostAtSale:item.costKnown?item.averageCost:'',COGS:cogs,GrossProfit:grossProfit,CostKnownAtSale:item.costKnown?'Тийм':'Үгүй'});
    opsMove_(tx,auth,{'Бараа':item.product,ProductID:item.productId,'Хөдөлгөөний төрөл (орлого/зарлага/шилжүүлэг)':'зарлага','Тоо':item.quantity,'Агуулах':warehouse,'SaleID':id,'Client ID':p.clientId,'Шалтгаан':'Борлуулалт '+id,'Нэгж үнэ':item.unitPrice,'Нийт дүн':opsMoney_(item.quantity*item.unitPrice)});
  });
  return {saleId:id,date:now,total,remainingStocks,transaction:{saleId:id,date:now,customer:clean_(p.customer),product:items.length===1?items[0].product:items.length+' төрлийн бараа',quantity:items.reduce((s,i)=>s+i.quantity,0),total,paymentType,paidAmount:paid,initialPaymentMethod,dueDate:due,warehouse}};
}
function opsInventory_(auth,p,ss,tx) {
  opsAssertRole_(auth,['manager','admin','warehouse']);
  const product=opsProduct_(ss,p.product),name=product.object['Барааны нэр'];
  const qty=opsUnit_(product,p.quantity,p.inputUnit),type=clean_(p.moveType);
  if(!['орлого','зарлага','шилжүүлэг'].includes(type))throw new Error('Хөдөлгөөний төрөл буруу байна.');
  const warehouse=opsWarehouse_(ss,type==='шилжүүлэг'?p.fromWarehouse:p.warehouse);
  const target=type==='шилжүүлэг'?opsWarehouse_(ss,p.toWarehouse):'';
  if(target===warehouse)throw new Error('Хоёр өөр агуулах сонгоно уу.');
  const expiry=opsDate_(p.expiryDate,false);
  let allocations=[];
  if(type!=='орлого')allocations=opsBatchesOut_(ss,tx,name,warehouse,qty,true);
  let stock=opsStock_(ss,tx,product,warehouse,type==='орлого'?qty:-qty);
  if(target)stock=opsStock_(ss,tx,product,target,qty);
  const productId=clean_(product.object.ProductID);
  if(type==='орлого' && (expiry||clean_(p.batchCode)))tx.add('Цуврал',{BatchID:createBusinessId_('LOT')+(clean_(p.batchCode)?'-'+clean_(p.batchCode).slice(0,30):''),'Бараа':name,ProductID:productId,'Агуулах':warehouse,'Дуусах огноо':expiry,'Үлдэгдэл':qty,CreatedAt:new Date().toISOString()});
  if(target)allocations.filter(a=>a.batchId).forEach(a=>tx.add('Цуврал',{BatchID:createBusinessId_('LOT'),'Бараа':name,ProductID:productId,'Агуулах':target,'Дуусах огноо':a.expiry,'Үлдэгдэл':a.quantity,CreatedAt:new Date().toISOString()}));
  opsMove_(tx,auth,{'Бараа':name,ProductID:productId,'Хөдөлгөөний төрөл (орлого/зарлага/шилжүүлэг)':type,'Тоо':qty,'Шалтгаан':clean_(p.reason),'Агуулах':warehouse,'Гарах агуулах':target?warehouse:'','Хүлээн авах агуулах':target,'Client ID':p.clientId});
  return {stock,date:new Date().toISOString()};
}
function opsPayment_(auth,p,ss,tx) {
  opsAssertRole_(auth,['manager','admin','accountant','rep','sales','driver']);
  const sale=opsSale_(ss,clean_(p.saleId),auth); opsActiveSale_(sale);
  const amount=positiveNumber_(p.amount,'Төлсөн дүн');
  if(amount>sale.remaining+0.001)throw new Error('Төлбөр авах мөнгөний үлдэгдлээс их байна.');
  const method=clean_(p.method)||'Бэлэн';
  if(!['Бэлэн','Банк'].includes(method))throw new Error('Төлбөрийн аргаа сонгоно уу.');
  tx.add(COMPANY_SHEETS.PAYMENTS,{PaymentID:createBusinessId_('PAY'),SaleID:sale.id,'Огноо':new Date().toISOString(),'Дүн':amount,'Төлбөрийн арга':method,'Баталгаажуулсан':'Тийм','Тэмдэглэл':clean_(p.notes),CreatedBy:auth.username,Source:'incremental',Collector:isDriverRole_(auth.role)?auth.username:''});
  return {remaining:opsMoney_(sale.remaining-amount)};
}
function opsReturn_(auth,p,ss,tx) {
  opsAssertRole_(auth,['manager','admin','warehouse','rep','sales','driver']);
  const sale=opsSale_(ss,clean_(p.saleId),auth); opsActiveSale_(sale);
  const item=sale.items.find(i=>i.lineId===p.lineId);
  if(!item)throw new Error('Буцаах бараагаа сонгоно уу.');
  const qty=positiveNumber_(p.quantity,'Буцаах тоо');
  if(qty>item.quantity-item.returned+0.000001)throw new Error('Буцаах тоо борлуулсан үлдэгдэл тооноос их байна.');
  if(!clean_(p.reason))throw new Error('Буцаалтын шалтгааныг оруулна уу.');
  // A driver cannot self-approve returned stock into the warehouse.
  const restock=p.restock===true;
  if(restock && !canManageInventory_(auth))throw new Error('Агуулахад буцаан авахыг нярав эсвэл менежер батална.');
  const oldCredit=sale.returns.filter(r=>r.CreditStatus!=='Rejected' && r.LineID===item.lineId).reduce((s,r)=>s+Number(r['Дүн']),0);
  const credit=opsMoney_(Math.abs(qty-(item.quantity-item.returned))<0.000001 ? item.total-oldCredit : Math.min(item.total-oldCredit,item.total*qty/item.quantity));
  const originalRow=sale.rows.find(e=>(e.object.LineID||'ROW-'+e.rowNumber)===item.lineId);
  const originalDates=JSON.parse(originalRow.object.BatchAllocations||'[]').map(a=>a.expiry).filter(Boolean).sort();
  const approved=isManagerRole_(auth.role)||auth.role==='accountant';
  tx.add('Буцаалт',{CreditStatus:approved?'Approved':'Pending',ApprovedBy:approved?auth.username:'',ApprovedAt:approved?new Date().toISOString():'',Warehouse:sale.warehouse,Expiry:originalDates[0]||'',ReturnID:createBusinessId_('RET'),SaleID:sale.id,LineID:item.lineId,'Бараа':item.product,ProductID:item.productId,'Тоо':qty,'Дүн':credit,'Шалтгаан':clean_(p.reason),Restock:restock?'Тийм':'Үгүй','Огноо':new Date().toISOString(),CreatedBy:auth.username});
  if(restock) {
    opsStock_(ss,tx,opsProduct_(ss,item.product),sale.warehouse,qty);
    // Returned goods receive their original expiry conservatively; no expiry is invented.
    const row=sale.rows.find(e=>(e.object.LineID||'ROW-'+e.rowNumber)===item.lineId);
    const allocations=JSON.parse(row.object.BatchAllocations||'[]');
    const dates=allocations.map(a=>a.expiry).filter(Boolean).sort();
    if(dates.length)tx.add('Цуврал',{BatchID:createBusinessId_('RETLOT'),'Бараа':item.product,ProductID:item.productId,'Агуулах':sale.warehouse,'Дуусах огноо':dates[0],'Үлдэгдэл':qty,CreatedAt:new Date().toISOString()});
    opsMove_(tx,auth,{'Бараа':item.product,ProductID:item.productId,'Хөдөлгөөний төрөл (орлого/зарлага/шилжүүлэг)':'орлого','Тоо':qty,'Агуулах':sale.warehouse,SaleID:sale.id,'Client ID':p.clientId,'Шалтгаан':'Буцаалт: '+clean_(p.reason)});
  }
  return {credit:approved?credit:0,requestedCredit:credit,pendingApproval:!approved,refundDue:Math.max(0,sale.paid-(sale.net-(approved?credit:0)))};
}
function opsRefund_(auth,p,ss,tx) {
  opsAssertRole_(auth,['manager','admin','accountant']);
  const sale=opsSale_(ss,clean_(p.saleId),auth); const amount=positiveNumber_(p.amount,'Буцааж олгох дүн');
  if(amount>sale.refundDue+0.001)throw new Error('Буцааж олгох үлдэгдлээс их байна.');
  const method=clean_(p.method)||'Бэлэн';
  if(!['Бэлэн','Банк'].includes(method))throw new Error('Буцаан олголтын аргаа сонгоно уу.');
  tx.add(COMPANY_SHEETS.PAYMENTS,{PaymentID:createBusinessId_('REF'),SaleID:sale.id,'Огноо':new Date().toISOString(),'Дүн':-amount,'Төлбөрийн арга':method,'Баталгаажуулсан':'Тийм',CreatedBy:auth.username,Source:'refund','Тэмдэглэл':clean_(p.notes)});
  return {refundDue:opsMoney_(sale.refundDue-amount)};
}
function opsDelivery_(auth,p,ss,tx) {
  opsAssertRole_(auth,['manager','admin','rep','sales','driver']);
  const sale=opsSale_(ss,clean_(p.saleId),auth); opsActiveSale_(sale);
  const id=clean_(p.distributionId)||createBusinessId_('DEL');
  const old=tx.rows(COMPANY_SHEETS.VISITS).find(e=>e.object.DistributionID===id);
  if(isDriverRole_(auth.role) && (!old || !opsOwnDelivery_(auth,old.object)))throw new Error('Зөвхөн өөрт оноосон хүргэлтийг шинэчилнэ.');
  if(old && old.object.SaleID!==sale.id)throw new Error('Хүргэлтийн борлуулалтыг солих боломжгүй.');
  if(!old && tx.rows(COMPANY_SHEETS.VISITS).some(e=>e.object.SaleID===sale.id))throw new Error('Энэ борлуулалтын хүргэлт үүссэн. Одоо байгаа хүргэлтээ нээнэ үү.');
  if(!old && sale.returned>0)throw new Error('Буцаалттай борлуулалтад шинэ хүргэлт оноохгүй. Шинэ захиалга үүсгэнэ үү.');
  const driver=old?old.object.DriverUsername:clean_(p.driver);
  const user=getUsers_(auth.company).find(u=>u.username===driver && ['driver','manager','admin'].includes(u.role));
  if(!user)throw new Error('Компанийн бүртгэлтэй жолоочийг сонгоно уу.');
  const status=clean_(p.status)||'Түгээлтэд гарсан';
  if(!['Түгээлтэд гарсан','Хэсэгчлэн хүргэсэн','Хүргэгдсэн','Хүргэлт амжилтгүй'].includes(status))throw new Error('Хүргэлтийн төлөв буруу байна.');
  const requested=Array.isArray(p.items)?p.items:[];
  const existing=tx.rows(COMPANY_SHEETS.DISTRIBUTION_ITEMS).filter(e=>e.object.DistributionID===id);
  let deliveryCredits=0;
  const details=sale.items.map((item,index)=>{
    const d=requested[index]||{}; const oldLine=existing[index];
    const delivered=nonNegativeNumber_(d.delivered||0,'Хүргэсэн тоо');
    const returned=nonNegativeNumber_(d.returned||0,'Буцаасан тоо');
    if(delivered+returned>item.quantity+0.000001)throw new Error(item.product+': хүргэсэн ба буцаасан тоо ачсан тооноос их байна.');
    if(oldLine && (delivered<Number(oldLine.object['Хүргэсэн'])||returned<Number(oldLine.object['Буцаасан'])))throw new Error('Өмнө баталсан хүргэлтийн тоог багасгах боломжгүй.');
    if(status==='Хүргэгдсэн' && Math.abs(delivered+returned-item.quantity)>0.000001)throw new Error('Дуусгахын өмнө бүх барааны тооцоог тулгана уу.');
    const additionalReturn=returned-Number(oldLine?oldLine.object['Буцаасан']:0);
    if(additionalReturn>0){ const result=opsReturn_(auth,{saleId:sale.id,lineId:item.lineId,quantity:additionalReturn,reason:clean_(p.notes)||'Хүргэлтийн буцаалт',restock:false,clientId:p.clientId},ss,tx); deliveryCredits+=result.credit; }
    const product=opsProduct_(ss,item.product).object;
    const fields={DistributionID:id,SaleID:sale.id,ProductID:item.productId||clean_(product.ProductID),'Код':product['Код']||'','Бараа':item.product,'Нэгж':product['Хэмжих нэгж']||'ш','Захиалсан':item.quantity,'Хүргэсэн':delivered,'Буцаасан':returned,'Нэгжийн үнэ':item.unitPrice,'Нийт дүн':opsMoney_(delivered*item.unitPrice)};
    if(oldLine)tx.set(COMPANY_SHEETS.DISTRIBUTION_ITEMS,oldLine.rowNumber,fields);else tx.add(COMPANY_SHEETS.DISTRIBUTION_ITEMS,fields);
    return fields;
  });
  const fields={'Огноо':old?old.object['Огноо']:new Date().toISOString(),'Рэп нэр':auth.fullName||auth.username,'Харилцагч':sale.customer,DistributionID:id,SaleID:sale.id,DriverUsername:driver,Driver:user.fullName||driver,SalesEmployee:sale.rows[0].object['Рэп нэр'],Warehouse:sale.warehouse,PlannedDeliveryDate:opsDate_(p.date||opsDay_(),true),DeliveredAt:status==='Хүргэгдсэн'?new Date().toISOString():'',Status:status,CustomerAddress:clean_(p.address),CustomerPhone:p.phone===undefined&&old?old.object.CustomerPhone:clean_(p.phone),DeliveryNotes:clean_(p.notes),RemainingReceivable:Math.max(0,sale.remaining-deliveryCredits)};
  if(old)tx.set(COMPANY_SHEETS.VISITS,old.rowNumber,fields);else tx.add(COMPANY_SHEETS.VISITS,fields);
  sale.rows.forEach(e=>tx.set(COMPANY_SHEETS.SALES,e.rowNumber,{DeliveryID:id,DeliveryDate:fields.PlannedDeliveryDate,DeliveryType:'Түгээлт'}));
  return {distributionId:id};
}
function opsRemit_(auth,p,ss,tx) {
  opsAssertRole_(auth,['manager','admin','accountant']);
  const driver=clean_(p.driver),amount=positiveNumber_(p.amount,'Хүлээн авсан мөнгө');
  if(!driver || !getUsers_(auth.companyId||auth.company).some(u=>u.username===driver&&['driver','manager','admin'].includes(u.role)))throw new Error('Компанийн бүртгэлтэй жолоочийг сонгоно уу.');
  const balance=opsDriverCash_(ss,driver);
  if(balance.remaining<=0)throw new Error('Жолоочид тушаах бэлэн мөнгөний үлдэгдэл алга.');
  if(amount>balance.remaining+0.001)throw new Error('Тушаах мөнгөний үлдэгдлээс их байна.');
  tx.add('Мөнгө тушаалт',{RemittanceID:createBusinessId_('CASH'),Driver:driver,'Дүн':opsMoney_(amount),'Огноо':new Date().toISOString(),CreatedBy:auth.username,'Тэмдэглэл':clean_(p.notes)});
  return {remaining:opsMoney_(balance.remaining-amount)};
}
function opsDriverCash_(ss,driver) {
  const collected=opsMoney_(opsRows_(ss,COMPANY_SHEETS.PAYMENTS).filter(e=>e.object.Collector===driver && e.object['Төлбөрийн арга']==='Бэлэн' && e.object['Баталгаажуулсан']==='Тийм').reduce((s,e)=>s+Number(e.object['Дүн']),0));
  const remitted=opsMoney_(opsRows_(ss,'Мөнгө тушаалт').filter(e=>e.object.Driver===driver).reduce((s,e)=>s+Number(e.object['Дүн']),0));
  return {driver,collected,remitted,remaining:opsMoney_(collected-remitted)};
}

function opsReceivableAging_(sales,today) {
  const buckets={current:0,d1_30:0,d31_60:0,d61_90:0,d90plus:0};
  const todayDate=new Date(today+'T00:00:00Z');
  sales.filter(s=>s.remaining>0).forEach(s=>{
    if(!s.dueDate || s.dueDate>=today){buckets.current=opsMoney_(buckets.current+s.remaining);return;}
    const due=new Date(s.dueDate+'T00:00:00Z');
    const days=Math.max(1,Math.floor((todayDate-due)/86400000));
    const key=days<=30?'d1_30':days<=60?'d31_60':days<=90?'d61_90':'d90plus';
    buckets[key]=opsMoney_(buckets[key]+s.remaining);
  });
  return buckets;
}
function opsCashMovementForDay_(ss,date) {
  const sales=opsRows_(ss,COMPANY_SHEETS.SALES);
  const firstBySale=new Map();
  sales.forEach(e=>{const id=saleRowIdentifier_(e);if(!firstBySale.has(id))firstBySale.set(id,e.object);});
  let initialCashSales=0,legacyAmbiguousCount=0;
  firstBySale.forEach(o=>{
    if(opsDay_(o['Огноо'])!==date)return;
    const paid=Number(o.PaidAmount||0);
    if(paid<=0)return;
    const method=clean_(o.InitialPaymentMethod);
    if(method==='Бэлэн')initialCashSales+=paid;
    else if(!method && clean_(o['Төлбөрийн төрөл'])==='Бэлэн')initialCashSales+=paid;
    else if(!method || method==='Тодорхойгүй')legacyAmbiguousCount++;
  });
  let directCashPayments=0,cashRefundsAndReversals=0;
  opsRows_(ss,COMPANY_SHEETS.PAYMENTS).forEach(e=>{
    const o=e.object;if(opsDay_(o['Огноо'])!==date||o['Төлбөрийн арга']!=='Бэлэн'||o['Баталгаажуулсан']!=='Тийм'||clean_(o.Collector))return;
    const amount=Number(o['Дүн']||0),source=clean_(o.Source);
    if(!source)return; // Legacy payment rows can duplicate PaidAmount and are intentionally excluded.
    if(amount>=0)directCashPayments+=amount; else cashRefundsAndReversals+=amount;
  });
  const driverRemittances=opsRows_(ss,'Мөнгө тушаалт').filter(e=>opsDay_(e.object['Огноо'])===date).reduce((s,e)=>s+Number(e.object['Дүн']||0),0);
  initialCashSales=opsMoney_(initialCashSales);directCashPayments=opsMoney_(directCashPayments);
  cashRefundsAndReversals=opsMoney_(cashRefundsAndReversals);
  const remitted=opsMoney_(driverRemittances);
  return {date,initialCashSales,directCashPayments,driverRemittances:remitted,cashRefundsAndReversals,systemMovement:opsMoney_(initialCashSales+directCashPayments+remitted+cashRefundsAndReversals),legacyAmbiguousCount};
}
function opsCloseCash_(auth,p,ss,tx) {
  opsAssertRole_(auth,['manager','admin','accountant']);
  const date=opsDate_(p.date||opsDay_(),true);
  if(tx.rows('Касс хаалт').some(e=>e.object.Date===date))throw new Error('Энэ өдрийн касс хаалт өмнө бүртгэгдсэн байна.');
  const opening=opsMoney_(nonNegativeNumber_(p.openingCash,'Эхний касс'));
  const counted=opsMoney_(nonNegativeNumber_(p.countedCash,'Тоолсон касс'));
  const movement=opsCashMovementForDay_(ss,date),expected=opsMoney_(opening+movement.systemMovement),difference=opsMoney_(counted-expected);
  const reason=clean_(p.reason);
  if(Math.abs(difference)>=0.01&&!reason)throw new Error('Кассын зөрүүний шалтгааныг заавал бичнэ үү.');
  const closeId=createBusinessId_('CLOSE');
  tx.add('Касс хаалт',{CloseID:closeId,Date:date,OpeningCash:opening,InitialCashSales:movement.initialCashSales,DirectCashPayments:movement.directCashPayments,DriverRemittances:movement.driverRemittances,CashRefundsAndReversals:movement.cashRefundsAndReversals,SystemMovement:movement.systemMovement,ExpectedCash:expected,CountedCash:counted,Difference:difference,Reason:reason,CreatedBy:auth.username,CreatedAt:new Date().toISOString(),LegacyAmbiguousCount:movement.legacyAmbiguousCount});
  return {closeId,date,openingCash:opening,expectedCash:expected,countedCash:counted,difference,legacyAmbiguousCount:movement.legacyAmbiguousCount};
}
function loadOperations_(auth,p) {
  const ss=openCompanySs_(requireActiveCompany_(auth.companyId || auth.company));
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    ensureCompanySheets_(ss);ensureOperationsSheets_(ss);opsRecover_(ss);
    opsReadCache_={};
    if(p.saleId)return {success:true,sale:opsPublicSale_(opsSale_(ss,clean_(p.saleId),auth))};
    const entries=opsRows_(ss,COMPANY_SHEETS.SALES),seen=new Set(); const sales=[];
    entries.forEach(e=>{const id=saleRowIdentifier_(e);if(seen.has(id))return;seen.add(id);if(opsCanSeeSale_(auth,e,ss))sales.push(opsPublicSale_(opsSale_(ss,id,auth)));});
    if(isManagerRole_(auth.role)||auth.role==='accountant')opsRows_(ss,'Эхний авлага').forEach(e=>sales.push(opsPublicSale_(dataOpeningSale_(ss,e.object.OpeningID,auth))));
    const active=sales.filter(s=>!['cancelled','цуцлагдсан','draft','ноорог'].includes(s.status.toLowerCase()));
    const today=opsDay_();
    const deliveries=opsRows_(ss,COMPANY_SHEETS.VISITS).filter(e=>isManagerRole_(auth.role)||auth.role==='accountant'||opsOwnDelivery_(auth,e.object)||(isSalesRole_(auth.role)&&samePerson_(e.object.SalesEmployee,auth))).map(e=>Object.assign(mapDistributionObject_(e.object),{driverUsername:e.object.DriverUsername||'',date:e.object.PlannedDeliveryDate?opsDay_(e.object.PlannedDeliveryDate):'',items:getDistributionItems_(ss,e.object.DistributionID)}));
    const drivers=getUsers_(auth.companyId||auth.company).filter(u=>['driver','manager','admin'].includes(u.role)).map(u=>({username:u.username,fullName:u.fullName}));
    const cash=drivers.filter(u=>isManagerRole_(auth.role)||auth.role==='accountant'||u.username===auth.username).map(u=>Object.assign(opsDriverCash_(ss,u.username),{name:u.fullName}));
    const batches=canManageInventory_(auth)?opsRows_(ss,'Цуврал').filter(e=>Number(e.object['Үлдэгдэл'])>0).map(e=>e.object):[];
    const finance=isManagerRole_(auth.role)||auth.role==='accountant';
    const cashMovement=finance?opsCashMovementForDay_(ss,today):null;
    const cashCloses=finance?opsRows_(ss,'Касс хаалт').map(e=>e.object).sort((a,b)=>String(b.Date).localeCompare(String(a.Date))).slice(0,14):[];
    const salesOnly=active.filter(s=>s.recordType!=='opening');
    const revenueForCost=opsMoney_(salesOnly.reduce((sum,s)=>sum+Number(s.net||0),0));
    const knownRevenue=opsMoney_(salesOnly.reduce((sum,s)=>sum+Number(s.net||0)*Number(s.costCoveragePct||0)/100,0));
    const grossProfitKnown=opsMoney_(salesOnly.reduce((sum,s)=>sum+Number(s.grossProfitKnown||0),0));
    const costCoveragePct=revenueForCost>0?Math.round(knownRevenue/revenueForCost*10000)/100:100;
    const supplierAccess=finance||auth.role==='warehouse';
    const suppliers=supplierAccess?opsRows_(ss,'Нийлүүлэгч').filter(e=>!['үгүй','false','0','inactive'].includes(clean_(e.object.Active).toLowerCase())).map(e=>e.object):[];
    const purchases=supplierAccess?opsRows_(ss,'Худалдан авалт').map(e=>opsPurchaseSummary_(ss,e)).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,100):[];
    const supplierPayables=finance?purchases.filter(x=>x.payable>0):[];
    return {success:true,operations:{version:1,asOf:new Date().toISOString(),today,
      sales:active.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,100),
      pendingCredits:(isManagerRole_(auth.role)||auth.role==='accountant')?opsRows_(ss,'Буцаалт').filter(e=>e.object.CreditStatus==='Pending').map(e=>e.object):[],
      receivables:auth.role==='warehouse'?[]:active.filter(s=>s.remaining>0||s.refundDue>0).map(s=>{const copy=Object.assign({},s);delete copy.items;delete copy.payments;delete copy.returns;return copy;}),receivableAging:auth.role==='warehouse'?null:opsReceivableAging_(active,today),pendingReturns:canManageInventory_(auth)?opsRows_(ss,'Буцаалт').filter(e=>e.object.Restock==='Үгүй').map(e=>e.object):[],deliveries,cash,cashMovement,cashCloses,drivers:isDriverRole_(auth.role)?drivers.filter(u=>u.username===auth.username):drivers,batches,
      todayTotal:opsMoney_(active.filter(s=>s.recordType!=='opening'&&opsDay_(s.date)===today).reduce((s,x)=>s+x.net,0)),todayCount:active.filter(s=>s.recordType!=='opening'&&opsDay_(s.date)===today).length,
      lowStock:getProducts_(ss).filter(p=>p.stock<=p.threshold),
      profitability:{revenue:revenueForCost,grossProfitKnown,costCoveragePct,grossProfit:costCoveragePct>=99.999?grossProfitKnown:null},
      suppliers,purchases,supplierPayables,supplierPayableTotal:opsMoney_(supplierPayables.reduce((sum,x)=>sum+x.payable,0)),
      legacyDeliveryPayments:deliveries.filter(d=>!d.driverUsername && d.collectedPayment>0).length}};
  } finally {opsReadCache_=null;lock.releaseLock();}
}

function opsReceiveReturn_(auth,p,ss,tx) {
  opsAssertRole_(auth,['manager','admin','warehouse']);
  const entry=opsRows_(ss,'Буцаалт').find(e=>e.object.ReturnID===p.returnId);
  if(!entry || entry.object.Restock!=='Үгүй')throw new Error('Буцаалт олдсонгүй эсвэл өмнө хүлээн авсан байна.');
  const disposition=clean_(p.disposition)||'restock';
  if(!['restock','writeoff'].includes(disposition))throw new Error('Шалгалтын дүнгээ сонгоно уу.');
  const received={DispositionNote:clean_(p.notes),ReceivedBy:auth.username,ReceivedAt:new Date().toISOString()};
  if(disposition==='writeoff'){
    if(!clean_(p.notes))throw new Error('Хорогдлын шалтгааныг бичнэ үү.');
    tx.set('Буцаалт',entry.rowNumber,Object.assign(received,{Restock:'Хорогдол'}));
    return {};
  }
  const r=entry.object,qty=opsQty_(Number(r['Тоо'])),product=opsProduct_(ss,r.ProductID||r['Бараа']);
  const productId=clean_(product.object.ProductID);
  opsStock_(ss,tx,product,r.Warehouse,qty);
  if(r.Expiry)tx.add('Цуврал',{BatchID:createBusinessId_('RETLOT'),'Бараа':r['Бараа'],ProductID:productId,'Агуулах':r.Warehouse,'Дуусах огноо':r.Expiry,'Үлдэгдэл':qty,CreatedAt:new Date().toISOString()});
  tx.set('Буцаалт',entry.rowNumber,Object.assign(received,{Restock:'Тийм',ProductID:productId}));
  opsMove_(tx,auth,{'Бараа':r['Бараа'],ProductID:productId,'Хөдөлгөөний төрөл (орлого/зарлага/шилжүүлэг)':'орлого','Тоо':qty,'Агуулах':r.Warehouse,SaleID:r.SaleID,'Client ID':p.clientId,'Шалтгаан':'Буцаалт хүлээн авсан '+r.ReturnID});
  return {};
}

function opsSalesIndex_(ss,id){const key='salesIndex|'+ss.getId();if(!opsReadCache_[key]){const map=new Map();opsRows_(ss,COMPANY_SHEETS.SALES).forEach(e=>{const k=saleRowIdentifier_(e);if(!map.has(k))map.set(k,[]);map.get(k).push(e);});opsReadCache_[key]=map;}return opsReadCache_[key].get(id)||[];}
