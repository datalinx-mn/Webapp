'use strict';

function activateOperationsUI() {

// Daily work uses a separate module so the original print/camera workflows stay usable.
const operations = {data:null,loading:null,error:'',owner:'',modalSale:null,delivery:null,busy:false,purchaseDraft:[]};
const opsEl = id => document.getElementById(id);
const opsEsc = value => escapeHtml(value);
const opsRole = () => state.session?.user?.role || '';
const opsManager = () => ['manager','admin'].includes(opsRole());
const opsFinance = () => ['manager','admin','accountant'].includes(opsRole());
const opsStockRole = () => ['manager','admin','warehouse'].includes(opsRole());
const opsSeller = () => ['manager','admin','rep','sales'].includes(opsRole());
const opsFeature = name => typeof hasEntitlement === 'function' ? hasEntitlement(name) : true;
const opsRequireFeature = name => { if(!opsFeature(name)) throw new Error(planUpgradeMessage()); };
const opsIdentity = () => `${state.session?.user?.company}|${state.session?.user?.username}|${state.session?.token}`;
const opsButton = (text,action,value='',secondary=true) => `<button type="button" class="btn ${secondary?'btn-secondary':'btn-primary'}" data-ops="${opsEsc(action)}" data-value="${opsEsc(value)}">${opsEsc(text)}</button>`;
const opsField = (label,name,type='text',value='',extra='') => `<label class="field">${opsEsc(label)}<input name="${name}" type="${type}" value="${opsEsc(value)}" ${extra}></label>`;
const opsSelect = (label,name,options) => `<label class="field">${label}<select name="${name}">${options}</select></label>`;
const opsOption = (value,label,selected=false) => `<option value="${opsEsc(value)}" ${selected?'selected':''}>${opsEsc(label)}</option>`;
const opsMetric = (label,value) => `<div class="ops-metric"><span>${opsEsc(label)}</span><strong>${opsEsc(value)}</strong></div>`;
function opsPage(name,title,subtitle) {
  const section=document.createElement('section');section.id='page-'+name;section.className='page';
  section.innerHTML=`<div class="page-head"><div><h2>${title}</h2><p>${subtitle}</p></div>${opsButton('Шинэчлэх','refresh')}</div><div id="ops-${name}"></div>`;
  opsEl('page-sales').parentElement.appendChild(section);
  if(['today','money'].includes(name)){const ad=document.createElement('div');ad.className='ad-slot';ad.dataset.adPlacement=name;section.appendChild(ad);}
}
function installOperations() {
  opsPage('today','Өнөөдөр','Хүргэх захиалга, авах мөнгө, анхаарах бараа.');
  opsPage('money','Мөнгө','Төлсөн, авах болон буцааж олгох мөнгө.');
  opsPage('more','Бусад','Хүргэлт, тайлан, тохиргоо.');
  const delivery=document.createElement('div');delivery.id='ops-deliveries';
  opsEl('page-distribution').querySelector('.page-head').after(delivery);
  const legacy=opsEl('visitForm');const detail=document.createElement('details');detail.className='simple-details ops-legacy';
  detail.innerHTML='<summary>GPS, зурагтай айлчлал бүртгэх</summary>';legacy.before(detail);detail.appendChild(legacy);
  opsEl('visitSaleId').closest('.field')?.classList.add('hidden');
  opsEl('visitCollectedPayment').disabled=true;opsEl('visitRemainingReceivable').disabled=true;
  opsEl('visitReturnedProducts').disabled=true;
  opsEl('visitBtn').textContent='Айлчлал хадгалах';
  const pages=[['today','Өнөөдөр','◷'],['sales','Борлуулалт','₮'],['inventory','Бараа','▦'],['money','Мөнгө','₮'],['more','Бусад','•••']];
  document.querySelectorAll('.mobile-nav').forEach(nav=>nav.innerHTML=pages.map(([p,l,i])=>`<button type="button" class="nav-btn" data-page="${p}"><span>${i}</span>${l}</button>`).join(''));
  const desktop=document.querySelector('.sidebar nav') || document.querySelector('[data-page="sales"]')?.parentElement;
  if(desktop && !desktop.classList.contains('mobile-nav'))desktop.innerHTML=[...pages.slice(0,4),['distribution','Хүргэлт','⌖'],['dashboard','Тайлан','▥'],['settings','Тохиргоо','⚙']].map(([p,l,i])=>`<button type="button" class="nav-btn" data-page="${p}"><span>${i}</span>${l}</button>`).join('');
  document.querySelectorAll('.side-nav [data-page],.mobile-nav [data-page]').forEach(button=>button.addEventListener('click',()=>showPage(button.dataset.page)));
  const modal=document.createElement('dialog');modal.id='ops-dialog';modal.className='ops-dialog';
  modal.innerHTML='<form id="ops-form"><header><h3 id="ops-dialog-title"></h3><button type="button" class="btn btn-neutral" data-ops="close" aria-label="Хаах">×</button></header><div id="ops-dialog-body"></div><p id="ops-form-error" role="alert"></p><footer><button type="button" class="btn btn-neutral" data-ops="close">Болих</button><button id="ops-save" class="btn btn-primary" type="submit">Хадгалах</button></footer></form>';
  document.body.appendChild(modal);
  modal.addEventListener('cancel',event=>{if(operations.busy)event.preventDefault();});
  opsEl('ops-form').addEventListener('submit',submitOperationForm);
  document.addEventListener('click',handleOperationsClick);
  opsEl('ops-more').innerHTML=`<div class="ops-actions">${opsFeature('delivery')?opsButton('Хүргэлт','page','distribution'):''}${opsButton('Тайлан','page','dashboard')}${opsButton('Тохиргоо','page','settings')}</div><div id="ops-queue"></div>`;
  const unit=document.createElement('label');unit.className='field';unit.innerHTML='Тоо оруулах нэгж<select id="ops-sale-unit"><option value="base">Ширхэг</option></select>';
  opsEl('saleQty').closest('.field').after(unit);opsEl('ops-sale-unit').addEventListener('change',()=>{updateSaleProduct();});
  const inv=document.createElement('div');inv.className='form-grid two';inv.innerHTML='<label class="field">Тоо оруулах нэгж<select id="ops-inv-unit"><option value="base">Үндсэн нэгж</option></select></label><label class="field">Дуусах огноо (бараа нэмэхэд)<input id="ops-expiry" type="date"></label><label class="field">Цувралын дугаар (сонголттой)<input id="ops-batch" maxlength="30"></label>';
  opsEl('inventoryForm').querySelector('button[type="submit"]').before(inv);
  opsEl('invProduct').addEventListener('change',opsInventoryUnits);
  const pack=document.createElement('div');pack.className='form-grid two';pack.innerHTML='<label class="field">Савлагааны нэр<input id="ops-pack-name" value="Хайрцаг" maxlength="30"></label><label class="field">Нэг савлагаанд хэдэн үндсэн нэгж вэ?<input id="ops-pack-size" type="number" value="1" min="1" step="any"></label><label class="field">Дундаж / эхний өртөг<input id="ops-product-cost" type="number" min="0" step="0.01" placeholder="Мэдэж байвал оруулна"></label></div><p class="field-hint">Өртөг хоосон бол систем ашиг зохиож харуулахгүй. Өртөг нь энэ мөчөөс хойших борлуулалтын тооцоонд хэрэглэгдэнэ.</p>';
  opsEl('saveProductBtn').before(pack);
  const payments=document.createElement('details');payments.className='simple-details';payments.innerHTML='<summary>Төлбөрийн нэмэлт мэдээлэл</summary><div class="form-grid two"><label class="field">Одоо төлсөн дүн<input id="ops-sale-paid" type="number" min="0" step="0.01" placeholder="Хоосон бол төлбөрийн төрлөөр"></label><label class="field">Одоо төлсөн мөнгөний арга<select id="ops-sale-initial-method"><option value="Бэлэн">Бэлэн</option><option value="Банк">Банканд орсон</option></select></label><label class="field">Үлдэгдэл төлөх өдөр<input id="ops-sale-due" type="date"></label></div><p class="field-hint">Зээлээр борлуулахдаа урьдчилгаа авсан бол дүн болон мөнгө орсон аргыг хоёуланг нь сонгоно.</p>';
  opsEl('saleBtn').before(payments);
  const repeat=document.createElement('button');repeat.type='button';repeat.className='btn btn-secondary';repeat.textContent='Дахин захиалах';repeat.dataset.ops='repeat-selected';
  opsEl('saleDetailBody').after(repeat);
  const stockPanel=document.createElement('div');stockPanel.id='ops-batches';stockPanel.className='card';opsEl('page-inventory').appendChild(stockPanel);
  const service=document.createElement('section');service.className='card';service.innerHTML='<h3>Тохируулж өгөх үйлчилгээ</h3><p>Барааны Excel жагсаалт цэвэрлэх, эхний мэдээлэл оруулах, сургалт, тусгай тайлан бэлтгэх үйлчилгээний санал авна.</p><a class="btn btn-secondary" href="https://www.facebook.com/DataLinxMN" target="_blank" rel="noopener">DataLinx-тэй холбогдох</a>';
  opsEl('page-settings').appendChild(service);
}
async function loadOperations(force=false) {
  if(!state.session)return;
  const owner=opsIdentity();
  if(operations.owner!==owner){operations.data=null;operations.error='';operations.loading=null;operations.owner=owner;}
  if(operations.loading)return operations.loading;
  if(operations.data&&!force)return;
  if(!navigator.onLine){operations.error='Сүлжээгүй байна. Мөнгө, хүргэлтийн мэдээллийг холбогдсоны дараа шинэчилнэ.';renderOperations();return;}
  const promise=(async()=>{
    try {
      operations.error='';renderOperations();
      const result=await postAction({action:'operations'});
      if(owner!==opsIdentity())return;
      if(!result.success||!result.operations)throw new Error(result.message||'Өдөр тутмын мэдээлэл одоогоор бэлэн болоогүй байна.');
      operations.data=result.operations;
    } catch(error){if(owner===opsIdentity())operations.error=error.message;}
    finally {if(owner===opsIdentity()){operations.loading=null;renderOperations();}}
  })();operations.loading=promise;return promise;
}
async function opsGetSale(id) {
  if(!navigator.onLine)throw new Error('Энэ үйлдэлд интернэт холболт шаардлагатай.');
  const owner=opsIdentity();
  const data=await postAction({action:'operations',saleId:id});
  if(owner!==opsIdentity())throw new Error('Нэвтрэх эрх өөрчлөгдсөн байна.');
  if(!data.success||!data.sale)throw new Error(data.message||'Борлуулалт олдсонгүй.');return data.sale;
}

function opsPurchaseLineMarkup(index,item={}) {
  const products=state.products||[];
  const selected=item.product||products[0]?.name||'';
  const product=products.find(p=>p.name===selected)||products[0];
  const productOptions=products.map(p=>opsOption(p.name,p.name,p.name===selected)).join('');
  const unitOptions=opsOption('base','Үндсэн нэгж',item.inputUnit!=='pack')+opsOption('pack','Савлагаа',item.inputUnit==='pack');
  return `<fieldset class="ops-purchase-line"><legend>Бараа ${index+1}</legend><div class="form-grid two">${opsSelect('Бараа',`purchaseProduct-${index}`,productOptions)}${opsField('Тоо',`purchaseQty-${index}`,'number',item.quantity||'',`required min="0.000001" step="any"`)}${opsSelect('Оруулах нэгж',`purchaseUnit-${index}`,unitOptions)}${opsField('Өртөг (сонгосон нэгжээр)',`purchaseCost-${index}`,'number',item.unitCost||'',`required min="0" step="0.01"`)}${opsField('Дуусах огноо',`purchaseExpiry-${index}`,'date',item.expiryDate||'')}${opsField('Цуврал / batch',`purchaseBatch-${index}`,'text',item.batchCode||'')}</div>${operations.purchaseDraft.length>1?opsButton('Энэ мөрийг хасах','purchase-remove',String(index)):''}</fieldset>`;
}
function opsRenderPurchaseLines() {
  const box=opsEl('ops-purchase-lines');if(!box)return;
  box.innerHTML=operations.purchaseDraft.map((item,index)=>opsPurchaseLineMarkup(index,item)).join('');
}
function renderOperations() {
  if(!state.session)return;
  opsRenderQueue();
  const d=operations.data;
  const status=operations.error?`<p class="ops-notice" role="alert">${opsEsc(operations.error)}</p>`:'';
  if(!d){['today','money'].forEach(name=>opsEl('ops-'+name).innerHTML=status||'<p class="empty" role="status">Мэдээлэл ачаалж байна…</p>');return;}
  const due=d.receivables.filter(s=>s.remaining>0 && (!s.dueDate||s.dueDate<=d.today));
  const deliveries=d.deliveries.filter(x=>x.status!=='Хүргэгдсэн' && (!x.date||x.date<=d.today));
  const notice=`${status}<p class="ops-asof">Шинэчилсэн: ${opsEsc(formatDate(d.asOf))}${!navigator.onLine?' · Сүлжээгүй':''}</p>`;
  opsEl('ops-today').innerHTML=notice+`<div class="ops-metrics">${opsMetric('Өнөөдрийн борлуулалт',money(d.todayTotal))}${opsMetric('Борлуулалтын тоо',formatNumber(d.todayCount))}${opsMetric('Хүргэх захиалга',deliveries.length)}</div><div class="ops-actions">${opsSeller()?opsButton('Борлуулалт бүртгэх','page','sales',false):''}${opsButton('Мөнгө харах','page','money')}${opsFeature('delivery')?opsButton('Хүргэлт харах','page','distribution'):''}</div><div class="ops-columns"><section class="card"><h3>Авах мөнгө</h3>${due.length?due.slice(0,6).map(s=>`<div class="ops-row"><div><strong>${opsEsc(s.customer)}</strong><small>${s.dueDate?opsEsc(s.dueDate):'Хугацаа заагаагүй'} · ${money(s.remaining)}</small></div>${(opsRole()!=='warehouse'?opsButton('Төлөлт','payment',s.id):'')}</div>`).join(''):emptyHtml('Хугацаа болсон авлага алга.')}</section><section class="card"><h3>Дуусаж буй бараа</h3>${d.lowStock.length?d.lowStock.slice(0,8).map(p=>`<div class="ops-row"><strong>${opsEsc(p.name)}</strong><span>${formatNumber(p.stock)} ${opsEsc(p.unit)}</span></div>`).join(''):emptyHtml('Бага үлдэгдэлтэй бараа алга.')}</section></div>`;
  const aging=d.receivableAging||{};
  const cashMove=d.cashMovement;
  const lastClose=(d.cashCloses||[])[0];
  opsEl('ops-money').innerHTML=notice+`<div class="ops-metrics">${opsMetric('Авах мөнгө',money(d.receivables.reduce((s,x)=>s+x.remaining,0)))}${opsMetric('Буцааж олгох мөнгө',money(d.receivables.reduce((s,x)=>s+x.refundDue,0)))}</div>${d.receivableAging?`<section class="card"><h3>Авлагын насжилт</h3><div class="ops-metrics">${opsMetric('Хугацаа болоогүй',money(aging.current||0))}${opsMetric('1–30 хоног',money(aging.d1_30||0))}${opsMetric('31–60 хоног',money(aging.d31_60||0))}${opsMetric('61–90 хоног',money(aging.d61_90||0))}${opsMetric('90+ хоног',money(aging.d90plus||0))}</div></section>`:''}<label class="field">Харилцагч хайх<input id="ops-money-search" type="search" placeholder="Нэрээр хайх"></label><div id="ops-money-list">${d.receivables.map(s=>`<article class="card ops-money-card" data-search="${opsEsc(s.customer.toLowerCase())}"><div class="ops-row"><div><h3>${opsEsc(s.customer)}</h3><small>${opsEsc(s.dueDate||'Хугацаа заагаагүй')} · ${opsEsc(s.id)}</small></div><strong>${money(s.remaining)}</strong></div><p>Борлуулсан ${money(s.total)} · Буцаалт ${money(s.returned)} · Төлсөн ${money(s.paid)}</p><div class="ops-actions">${s.remaining>0&&opsRole()!=='warehouse'?opsButton('Төлөлт бүртгэх','payment',s.id,false):''}${s.refundDue>0&&opsFinance()?opsButton('Мөнгө буцааж олгох','refund',s.id):''}${opsButton('Түүх','history',s.id)}</div></article>`).join('')||emptyHtml('Авах болон буцааж олгох мөнгө алга.')}</div><section class="card"><h3>Жолоочийн бэлэн мөнгө</h3>${d.cash.map(c=>`<div class="ops-row"><div><strong>${opsEsc(c.name||c.driver)}</strong><small>Хураасан ${money(c.collected)} · Тушаасан ${money(c.remitted)}</small><span>Тушаах үлдэгдэл ${money(c.remaining)}</span></div>${opsFinance()&&c.remaining>0?opsButton('Хүлээн авсан','remit',c.driver):''}</div>`).join('')||emptyHtml('Бүртгэлтэй жолооч алга.')}</section>${opsFinance()&&cashMove?`<section class="card"><div class="ops-row"><div><h3>Өнөөдрийн кассын хөдөлгөөн</h3><small>Орлого: шууд ${money(cashMove.initialCashSales+cashMove.directCashPayments)} · жолооч ${money(cashMove.driverRemittances)} · буцаалт/засвар ${money(cashMove.cashRefundsAndReversals)}<br>Зарлага: нийлүүлэгч ${money(cashMove.supplierCashPayments||0)} · бусад ${money(cashMove.otherCashExpenses||0)}</small></div><strong>${money(cashMove.systemMovement)}</strong></div>${cashMove.legacyAmbiguousCount?`<p class="ops-notice">${cashMove.legacyAmbiguousCount} хуучин урьдчилгаа төлөлтийн арга тодорхойгүй тул кассын дүнд таамгаар оруулаагүй.</p>`:''}<div class="ops-actions">${opsButton('Касс хаах','cash-close','')}</div>${lastClose?`<p>Сүүлийн хаалт: ${opsEsc(lastClose.Date)} · Тоолсон ${money(lastClose.CountedCash)} · Зөрүү ${money(lastClose.Difference)}</p>`:''}</section>`:''}`;
  if(opsFinance()&&opsFeature('cashClose')){
    const expenses=d.expenses||[],reversed=new Set(expenses.filter(x=>x.ReversalOf).map(x=>x.ReversalOf));
    const rows=expenses.slice(0,10).map(x=>`<div class="ops-row"><div><strong>${opsEsc(x.Category||'Зардал')} · ${money(Math.abs(Number(x.Amount||0)))}</strong><small>${opsEsc(x.Date||'')} · ${opsEsc(x.Method||'')} · ${opsEsc(x.Description||'')}${x.Status==='Reversal'?' · ЦУЦЛАЛТ':''}</small></div>${Number(x.Amount||0)>0&&!reversed.has(x.ExpenseID)?opsButton('Цуцлах','expense-reverse',x.ExpenseID):''}</div>`).join('');
    opsEl('ops-money').insertAdjacentHTML('beforeend',`<section class="card"><div class="ops-row"><div><h3>Өдөр тутмын зардал</h3><small>Касс хаалтын бэлэн мөнгөний тооцоонд автоматаар орно.</small></div></div><div class="ops-actions">${opsButton('Зардал нэмэх','expense')}</div>${rows||emptyHtml('Зардал бүртгэлгүй.')}</section>`);
  }
  if(opsFinance()&&opsFeature('profitability')&&d.profitability){
    const p=d.profitability,profitText=p.grossProfit===null?`Өртөг мэдэгдэж буй хэсгийн ашиг: ${money(p.grossProfitKnown)}`:`Ахиуц ашиг: ${money(p.grossProfit)}`;
    opsEl('ops-money').insertAdjacentHTML('beforeend',`<section class="card"><h3>Өртөг ба ахиуц ашиг</h3><div class="ops-row"><div><strong>${profitText}</strong><small>Өртгийн хамралт ${formatNumber(p.costCoveragePct)}%</small></div><span>${p.grossProfit===null?'Бүрэн ашиг харуулахгүй':'Бүрэн хамрагдсан'}</span></div>${p.grossProfit===null?'<p class="ops-notice">Өртөггүй хуучин/эхний үлдэгдэл байгаа тул нийт ашгийг зохиож харуулаагүй.</p>':''}</section>`);
  }
  if(opsFinance()&&opsFeature('suppliers')){
    const payableRows=(d.supplierPayables||[]).map(x=>`<div class="ops-row"><div><strong>${opsEsc(x.supplier)}</strong><small>${opsEsc(x.invoiceNumber||x.id)} · ${opsEsc(x.date)} · Нийт ${money(x.total)} · Төлсөн ${money(x.paid)}</small></div><div><strong>${money(x.payable)}</strong>${opsButton('Төлөх','supplier-payment',x.id)}</div></div>`).join('');
    opsEl('ops-money').insertAdjacentHTML('beforeend',`<section class="card"><div class="ops-row"><div><h3>Нийлүүлэгчийн өглөг</h3><small>Бүх нээлттэй худалдан авалтын үлдэгдэл</small></div><strong>${money(d.supplierPayableTotal||0)}</strong></div><div class="ops-actions">${opsButton('Нийлүүлэгч нэмэх','supplier-add')}${opsButton('Татан авалт бүртгэх','purchase')}</div>${payableRows||emptyHtml('Нийлүүлэгчийн өглөг алга.')}</section>`);
  }
  opsEl('ops-money-search').addEventListener('input',event=>document.querySelectorAll('.ops-money-card').forEach(card=>card.hidden=!card.dataset.search.includes(event.target.value.trim().toLowerCase())));
  opsEl('ops-deliveries').innerHTML=notice+`<div class="ops-actions">${opsSeller()?opsButton('Хүргэлт оноох','dispatch','',false):''}</div>${d.deliveries.map(v=>`<article class="card"><div class="ops-row"><div><h3>${opsEsc(v.customer)}</h3><small>${opsEsc(v.date)} · ${opsEsc(v.driver)} · ${opsEsc(v.status)}</small></div>${v.driverUsername?opsButton('Нээх','delivery',v.distributionId):'<span>Өмнөх бүртгэл</span>'}</div><p>${opsEsc(v.customerAddress||'Хаяг оруулаагүй')}</p>${v.items.length?`<div class="ops-table-wrap"><table><thead><tr><th>Бараа</th><th>Ачсан</th><th>Хүргэсэн</th><th>Буцаасан</th><th>Үлдсэн</th></tr></thead><tbody>${v.items.map(i=>`<tr><td>${opsEsc(i.name)}</td><td>${formatNumber(i.ordered)}</td><td>${formatNumber(i.delivered)}</td><td>${formatNumber(i.returned)}</td><td>${formatNumber(i.ordered-i.delivered-i.returned)}</td></tr>`).join('')}</tbody></table></div>`:''}<div class="ops-actions">${opsRole()!=='warehouse'?opsButton('Төлөлт','payment',v.saleId):''}${opsButton('Баримт','delivery-print',v.distributionId)}</div></article>`).join('')||emptyHtml('Оноосон хүргэлт алга.')}`;
  if(d.legacyDeliveryPayments)opsEl('ops-money').insertAdjacentHTML('afterbegin','<p class="ops-notice">Өмнөх түгээлтэд төлбөрийн тэмдэглэл байна. Давхар тооцохоос сэргийлж нягтлан эхний үлдэгдэлтэй тулгана уу.</p>');
  opsEl('ops-batches').innerHTML=opsStockRole()?`<div class="ops-actions">${opsFeature('suppliers')?opsButton('Татан авалт хүлээн авах','purchase','',false):''}${opsFinance()&&opsFeature('suppliers')?opsButton('Нийлүүлэгч нэмэх','supplier-add'):''}</div><h3>Цуврал ба дуусах хугацаа</h3><p>Хугацаа нь эхэлж дуусах бараанаас борлуулна. Хугацаа дууссан барааг борлуулахгүй.</p>${d.batches.map(b=>`<div class="ops-row ${b['Дуусах огноо']&&b['Дуусах огноо']<d.today?'ops-expired':''}"><div><strong>${opsEsc(b['Бараа'])}</strong><small>${opsEsc(b['Агуулах'])} · ${opsEsc(b['Дуусах огноо']||'Хугацаа заагаагүй')}</small></div><span>${formatNumber(b['Үлдэгдэл'])}</span></div>`).join('')||emptyHtml('Цуврал бүртгэлгүй. Бараа нэмэхдээ хугацааг оруулж эхэлнэ.')}<h3>Агуулахад хүлээн авах буцаалт</h3>${(d.pendingReturns||[]).map(r=>`<div class="ops-row"><div><strong>${opsEsc(r['Бараа'])} · ${formatNumber(r['Тоо'])}</strong><small>${opsEsc(r['Шалтгаан'])}</small></div>${opsButton('Буцаан авах','receive-return',r.ReturnID)}</div>`).join('')||emptyHtml('Хүлээгдэж буй буцаалт алга.')}`:'';
  opsRenderQueue();
  window.renderReliability?.(d);
}
function opsModal(title,html,action,values={}) {
  operations.formAction=action;operations.formValues=values;operations.requestId=createClientId();operations.formOwner=opsIdentity();
  opsEl('ops-dialog-title').textContent=title;opsEl('ops-dialog-body').innerHTML=html;opsEl('ops-form-error').textContent='';
  opsEl('ops-save').hidden=!action;opsEl('ops-save').disabled=false;opsEl('ops-dialog').showModal();
}
async function handleOperationsClick(event) {
  const button=event.target.closest('[data-ops]');if(!button||button.disabled)return;
  const action=button.dataset.ops,id=button.dataset.value;
  try {
    if(action==='close'){if(!operations.busy)opsEl('ops-dialog').close();return;}
    if(action==='page'){showPage(id);return;}
    if(action==='refresh'){await loadOperations(true);return;}
    if(action==='claim-legacy-queue'){
      if(!opsManager())throw new Error('Менежер шалгаж хариуцна.');
      const q=getQueue(),item=q.find(x=>x.id===id&&!x.username&&queueBelongsToCurrent_(x));
      if(!item)throw new Error('Хуучин бүртгэл олдсонгүй.');
      if(!confirm('Энэ хуучин бүртгэлийг өөрийн нэрээр илгээх үү? Өмнө хадгалагдсан эсэхийг шалгасан байна уу?'))return;
      item.username=state.session.user.username;saveQueue(q);opsRenderQueue();await syncOfflineQueue(id);return;
    }
    if(action==='retry-queue'){const q=getQueue();const item=q.find(x=>x.id===id);if(item){delete item.failed;delete item.error;saveQueue(q);await syncOfflineQueue(id);}return;}
    if(action==='delivery-print'){opsRequireFeature('delivery');opsRequireFeature('pdf');const v=operations.data.deliveries.find(v=>v.distributionId===id);state.selectedDistribution=v;state.selectedSale=null;return openDocumentPreview('DISTRIBUTION');}
    if(action==='receive-return')return opsModal('Буцаасан барааг шалгах','<p>Дахин борлуулах боломжтой барааг агуулахын үлдэгдэлд нэмнэ. Хорогдлыг тусад нь тэмдэглэнэ.</p>'+opsSelect('Шалгалтын дүн','disposition',opsOption('restock','Агуулахад авах')+opsOption('writeoff','Гэмтсэн / хорогдол'))+opsField('Тэмдэглэл','notes'),'receiveReturn',{returnId:id});
    if(action==='remit'){opsRequireFeature('delivery');const c=operations.data.cash.find(c=>c.driver===id);return opsModal('Бэлэн мөнгө хүлээн авах',`<p>Тушаах үлдэгдэл: ${money(c.remaining)}</p>${opsField('Бодитоор хүлээн авсан дүн','amount','number','',`required min="0.01" max="${c.remaining}" step="0.01"`)}${opsField('Тэмдэглэл','notes')}`,'remitCash',{driver:id});}
    if(action==='supplier-add'){
      opsRequireFeature('suppliers');
      if(!opsFinance())throw new Error('Нийлүүлэгч бүртгэх эрх хүрэлцэхгүй байна.');
      return opsModal('Нийлүүлэгч нэмэх',opsField('Нэр','name','text','', 'required maxlength="120"')+opsField('Регистр','registrationNumber')+opsField('Утас','phone','tel')+opsField('Имэйл','email','email')+opsField('Хаяг','address')+opsField('Төлбөрийн ердийн хугацаа (хоног)','paymentTermDays','number','0','min="0" step="1"'),'saveSupplier');
    }
    if(action==='purchase'){
      opsRequireFeature('suppliers');
      if(!(opsStockRole()||opsFinance()))throw new Error('Татан авалт хүлээн авах эрх хүрэлцэхгүй байна.');
      if(!operations.data.suppliers?.length)throw new Error(opsFinance()?'Эхлээд нийлүүлэгч нэмнэ үү.':'Менежер эсвэл нягтлан эхлээд нийлүүлэгч бүртгэнэ.');
      if(!state.products.length)throw new Error('Эхлээд бараа бүртгэнэ үү.');
      operations.purchaseDraft=[{}];
      const supplierOptions=operations.data.suppliers.map(s=>opsOption(s.SupplierID,s.Name)).join('');
      const warehouses=(state.warehouses||[]).map(w=>typeof w==='string'?w:(w.name||w['Агуулахын нэр']||'')).filter(Boolean);
      const warehouseOptions=warehouses.map(w=>opsOption(w,w)).join('');
      const paymentFields=opsFinance()?opsField('Одоо төлсөн дүн','paidAmount','number','0','min="0" step="0.01"')+opsSelect('Төлбөрийн арга','paymentMethod',opsOption('Банк','Банканд орсон')+opsOption('Бэлэн','Бэлэн')):'';
      opsModal('Татан авалт хүлээн авах',opsSelect('Нийлүүлэгч','supplierId',supplierOptions)+opsField('Нэхэмжлэх / баримтын №','invoiceNumber')+opsField('Огноо','date','date',operations.data.today,'required')+opsSelect('Агуулах','warehouse',warehouseOptions)+'<div id="ops-purchase-lines"></div><div class="ops-actions">'+opsButton('Барааны мөр нэмэх','purchase-add-line')+'</div>'+paymentFields+opsField('Тэмдэглэл','notes'),'receivePurchase');
      opsRenderPurchaseLines();return;
    }
    if(action==='purchase-add-line'){
      if(operations.purchaseDraft.length>=40)throw new Error('Нэг татан авалтад 40 хүртэл барааны мөр оруулна.');
      operations.purchaseDraft.push({});opsRenderPurchaseLines();return;
    }
    if(action==='purchase-remove'){
      const index=Number(id);if(operations.purchaseDraft.length<=1)return;
      operations.purchaseDraft.splice(index,1);opsRenderPurchaseLines();return;
    }
    if(action==='supplier-payment'){
      opsRequireFeature('suppliers');
      if(!opsFinance())throw new Error('Нийлүүлэгчийн төлбөр бүртгэх эрх хүрэлцэхгүй байна.');
      const purchase=(operations.data.supplierPayables||[]).find(x=>x.id===id)||(operations.data.purchases||[]).find(x=>x.id===id);
      if(!purchase||purchase.payable<=0)throw new Error('Төлөх өглөг олдсонгүй.');
      return opsModal('Нийлүүлэгчийн төлбөр',`<p>${opsEsc(purchase.supplier)} · ${opsEsc(purchase.invoiceNumber||purchase.id)} · Үлдэгдэл <strong>${money(purchase.payable)}</strong></p>${opsField('Төлөх дүн','amount','number',purchase.payable,`required min="0.01" max="${purchase.payable}" step="0.01"`)}${opsSelect('Төлбөрийн арга','method',opsOption('Банк','Банканд орсон')+opsOption('Бэлэн','Бэлэн'))}${opsField('Тэмдэглэл','notes')}`,'addSupplierPayment',{purchaseId:purchase.id});
    }
    if(action==='expense'){
      opsRequireFeature('cashClose');
      if(!opsFinance())throw new Error('Зардал бүртгэх эрх хүрэлцэхгүй байна.');
      const categories=['Түрээс','Шатахуун','Хүргэлт','Цалин/урьдчилгаа','Оффис','Засвар үйлчилгээ','Татвар/хураамж','Бусад'];
      return opsModal('Зардал бүртгэх',
        opsField('Огноо','date','date',operations.data.today,'required')+
        opsSelect('Ангилал','category',categories.map(x=>opsOption(x,x)).join(''))+
        opsField('Тайлбар','description','text','','required maxlength="160"')+
        opsField('Дүн','amount','number','','required min="0.01" step="0.01"')+
        opsSelect('Төлбөрийн арга','method',opsOption('Бэлэн','Бэлэн')+opsOption('Банк','Банк'))+
        opsField('Баримт / лавлагаа','reference'),'addExpense');
    }
    if(action==='expense-reverse'){
      opsRequireFeature('cashClose');
      if(!opsFinance())throw new Error('Зардал цуцлах эрх хүрэлцэхгүй байна.');
      const expense=(operations.data.expenses||[]).find(x=>x.ExpenseID===id);
      if(!expense)throw new Error('Зардал олдсонгүй.');
      return opsModal('Зардал цуцлах',`<p>${opsEsc(expense.Category)} · ${money(expense.Amount)} · ${opsEsc(expense.Description||'')}</p>${opsField('Цуцлах шалтгаан','reason','text','','required maxlength="160"')}`,'reverseExpense',{expenseId:id});
    }
    if(action==='cash-close'){
      opsRequireFeature('cashClose');
      if(!opsFinance())throw new Error('Касс хаах эрх хүрэлцэхгүй байна.');
      if((operations.data.cashCloses||[]).some(x=>x.Date===operations.data.today))throw new Error('Өнөөдрийн касс хаалт өмнө бүртгэгдсэн байна.');
      const move=operations.data.cashMovement||{systemMovement:0,legacyAmbiguousCount:0};
      const last=(operations.data.cashCloses||[])[0],suggested=last?Number(last.CountedCash||0):0;
      return opsModal('Өдрийн касс хаалт',`<p>Системийн өнөөдрийн бэлэн мөнгөний цэвэр хөдөлгөөн: <strong>${money(move.systemMovement)}</strong>. Хүлээгдэж буй касс = эхний касс + энэ хөдөлгөөн.</p>${move.legacyAmbiguousCount?`<p class="ops-notice">${move.legacyAmbiguousCount} хуучин төлөлтийн арга тодорхойгүй. Нягтлан тулгаад зөрүүний тайлбарт тэмдэглэнэ.</p>`:''}${opsField('Огноо','date','date',operations.data.today,'required')}${opsField('Өдрийн эхний касс','openingCash','number',suggested,`required min="0" step="0.01"`)}${opsField('Бодитоор тоолсон касс','countedCash','number','',`required min="0" step="0.01"`)}${opsField('Зөрүүний шалтгаан (зөрүү байвал)','reason')}`,'closeCash');
    }
    if(action==='dispatch'){
      opsRequireFeature('delivery');
      const sales=operations.data.sales.filter(s=>!operations.data.deliveries.some(d=>d.saleId===s.id));
      if(!sales.length)throw new Error('Оноох борлуулалт алга. Эхлээд борлуулалт бүртгэнэ үү.');
      opsModal('Хүргэлт оноох',opsSelect('Борлуулалт','saleId',sales.map(s=>opsOption(s.id,s.customer+' · '+money(s.net))).join(''))+opsSelect('Жолооч','driver',operations.data.drivers.map(d=>opsOption(d.username,d.fullName||d.username)).join(''))+opsField('Хүргэх өдөр','date','date',operations.data.today,'required')+opsField('Хаяг','address','text','','required')+opsField('Утас','phone','tel'),'saveDelivery');return;
    }
    if(action==='delivery'){
      opsRequireFeature('delivery');
      const v=operations.data.deliveries.find(d=>d.distributionId===id);const sale=await opsGetSale(v.saleId);operations.modalSale=sale;
      opsModal('Хүргэлтийн тооцоо',`<p>${opsEsc(v.customer)} · ${opsEsc(v.driver)}</p><p>Тоо нь нийт хүргэсэн, нийт буцаасан тоо байна. Буцаалтын мөнгийг менежер эсвэл нягтлан зөвшөөрсний дараа авлагаас хасна. Барааг нярав тусад нь хүлээн авна.</p>${sale.items.map((i,index)=>{const line=v.items[index]||{};return `<fieldset><legend>${opsEsc(i.product)} · Ачсан ${formatNumber(i.quantity)}</legend><div class="form-grid two">${opsField('Нийт хүргэсэн',`delivered-${index}`,'number',line.delivered||0,`min="0" max="${i.quantity}" step="any" required`)}${opsField('Нийт буцаасан',`returned-${index}`,'number',line.returned||0,`min="0" max="${i.quantity}" step="any" required`)}</div></fieldset>`;}).join('')}${opsSelect('Төлөв','status',['Түгээлтэд гарсан','Хэсэгчлэн хүргэсэн','Хүргэгдсэн','Хүргэлт амжилтгүй'].map(s=>opsOption(s,s,v.status===s)).join(''))}${opsField('Хүргэх өдөр','date','date',v.date||operations.data.today,'required')}${opsField('Хаяг','address','text',v.customerAddress||'')}${opsField('Тэмдэглэл / буцаалтын шалтгаан','notes','text',v.deliveryNotes||'')}`,'saveDelivery',{saleId:v.saleId,distributionId:id,driver:v.driverUsername});return;
    }
    const sale=await opsGetSale(action==='repeat-selected'?transactionId(state.selectedSale):id);operations.modalSale=sale;
    if(action==='repeat'||action==='repeat-selected'){
      if(!opsSeller())throw new Error('Борлуулалт бүртгэх эрхгүй байна.');
      if(state.saleCart.length&&!confirm('Одоогийн сагсыг энэ захиалгаар солих уу?'))return;
      const lines=sale.items.map(i=>{const product=state.products.find(p=>p.name===i.product);if(!product)throw new Error(i.product+' бараа бүртгэлд алга.');return {product:i.product,quantity:i.quantity,unitPrice:product.price};});
      state.saleCart=lines;opsEl('saleCustomer').value=sale.customer;opsEl('saleProduct').value='';opsEl('saleQty').value='';opsEl('salePrice').value='';
      closeSaleDetail();showPage('sales');renderSaleCart();toast('Захиалга сагсанд орлоо. Өнөөгийн үнэ, тоог шалгаад хадгална уу.','success');return;
    }
    if(action==='payment'||action==='refund'){
      const max=action==='payment'?sale.remaining:sale.refundDue;
      opsModal(action==='payment'?'Төлөлт бүртгэх':'Мөнгө буцааж олгох',`<p>${opsEsc(sale.customer)} · Үлдэгдэл ${money(max)}</p>${opsField('Дүн','amount','number','',`required min="0.01" max="${max}" step="0.01"`)}${opsSelect('Төлбөрийн арга','method',opsOption('Бэлэн','Бэлэн')+opsOption('Банк','Банканд орсон'))}${opsField('Тэмдэглэл','notes')}` ,action==='payment'?'addPayment':'refundPayment',{saleId:sale.id});return;
    }
    if(action==='return'){
      const items=sale.items.filter(i=>i.quantity>i.returned);
      opsModal('Барааны буцаалт',opsSelect('Бараа','lineId',items.map(i=>opsOption(i.lineId,i.product+' · буцааж болох '+formatNumber(i.quantity-i.returned))).join(''))+opsField('Буцаах тоо (үндсэн нэгж)','quantity','number','','required min="0.000001" step="any"')+opsField('Шалтгаан','reason','text','','required')+(opsStockRole()?'<label><input type="checkbox" name="restock"> Шалгаж хүлээн авсан, дахин борлуулах боломжтой</label>':'<p>Барааг агуулахад авахыг нярав батална.</p>'),'returnSale',{saleId:sale.id});return;
    }
    if(action==='history')opsModal('Төлөлт, буцаалтын түүх',`<p>${opsEsc(sale.customer)}</p><p>Анх төлсөн дүн борлуулалтын бүртгэлд хадгалагдана.</p>${sale.payments.map(p=>`<div class="ops-row"><span>${opsEsc(formatDate(p.date))} · ${opsEsc(p.method)}</span><strong>${money(p.amount)}</strong></div>`).join('')}${sale.returns.map(r=>`<div class="ops-row"><span>Буцаалт · ${opsEsc(r['Бараа'])} · ${formatNumber(r['Тоо'])}</span><strong>${money(r['Дүн'])}</strong></div>`).join('')}`,'');
  } catch(error){toast(error.message,'error');}
}
async function submitOperationForm(event) {
  event.preventDefault();if(operations.busy)return;
  operations.busy=true;opsEl('ops-form-error').textContent='';setButtonLoading(opsEl('ops-save'),true,'Хадгалж байна…');
  try {
    if(!navigator.onLine)throw new Error('Интернэт холболт шаардлагатай. Мэдээллээ хаалгүй хадгална уу.');
    if(operations.formOwner!==opsIdentity())throw new Error('Нэвтрэх эрх өөрчлөгдсөн. Цонхыг хаагаад дахин нээнэ үү.');
    const values=Object.fromEntries(new FormData(event.target));
    const payload={...operations.formValues,...values,action:operations.formAction,clientId:operations.requestId};
    if(payload.action==='returnSale')payload.restock=values.restock==='on';
    if(payload.action==='saveDelivery'&&payload.distributionId)payload.items=operations.modalSale.items.map((i,index)=>({delivered:Number(values['delivered-'+index]),returned:Number(values['returned-'+index])}));
    if(payload.action==='receivePurchase'){
      payload.items=operations.purchaseDraft.map((item,index)=>{
        const productName=values['purchaseProduct-'+index],product=state.products.find(p=>p.name===productName);
        if(!product)throw new Error('Татан авалтын бараа олдсонгүй.');
        return {product:productName,productId:product.id||'',inputQuantity:Number(values['purchaseQty-'+index]),inputUnit:values['purchaseUnit-'+index]||'base',inputUnitCost:Number(values['purchaseCost-'+index]),expiryDate:values['purchaseExpiry-'+index]||'',batchCode:values['purchaseBatch-'+index]||''};
      });
    }
    const result=await postAction(payload);
    if(!result.success)throw new Error(result.message||'Хадгалж чадсангүй.');
    opsEl('ops-dialog').close();toast('Системд хадгаллаа.','success');
    if(result.costWarnings?.length)toast(result.costWarnings.join(' '),'error');
    operations.purchaseDraft=[];
    await refreshData(false);await loadOperations(true);
  } catch(error){opsEl('ops-form-error').textContent=error.message;}
  finally {operations.busy=false;setButtonLoading(opsEl('ops-save'),false);}
}
function opsInventoryUnits() {
  const p=state.products.find(p=>p.name===opsEl('invProduct').value);
  opsEl('ops-inv-unit').innerHTML=opsOption('base',p?.unit||'Үндсэн нэгж')+(p?.packSize>1?opsOption('pack',`${p.packName||'Хайрцаг'} (${p.packSize} ${p.unit})`):'');
}
function opsRenderQueue() {
  const items=getQueue().filter(i=>queueBelongsToCurrent_(i)&&i.username===state.session?.user?.username);
  const legacy=opsManager()?getQueue().filter(i=>queueBelongsToCurrent_(i)&&!i.username):[];
  opsEl('ops-queue').innerHTML=`<section class="card"><h3>Утсанд хадгалсан бүртгэл</h3>${items.map(i=>`<div class="ops-row"><div><strong>${i.action==='addSale'?'Борлуулалт':'Барааны хөдөлгөөн'}</strong><small>${opsEsc(i.error||'Илгээхийг хүлээж байна')}</small></div>${i.failed?opsButton('Дахин илгээх','retry-queue',i.id):''}</div>`).join('')||emptyHtml('Илгээхийг хүлээж буй бүртгэл алга.')}${legacy.length?'<h3>Хуучин хувилбараас үлдсэн бүртгэл</h3><p>Үүсгэсэн ажилтан тодорхойгүй. Менежер шалгаад хариуцаж илгээнэ.</p>'+legacy.map(i=>`<div class="ops-row"><div><strong>${opsEsc(i.payload?.customer||i.payload?.product||'Бүртгэл')}</strong><small>${opsEsc(formatDate(i.createdAt))} · ${opsEsc(i.action)} · ${opsEsc(JSON.stringify(i.payload?.items||{quantity:i.payload?.quantity,moveType:i.payload?.moveType}))}</small></div>${opsButton('Хариуцаж илгээх','claim-legacy-queue',i.id)}</div>`).join(''):''}</section>`;
}
window.refreshReliabilityOperations=()=>loadOperations(true);
installOperations();
const opsOriginalShowApp=showApp;
showApp=function(){opsOriginalShowApp();showPage('today');void loadOperations(true);};
const opsOriginalShowPage=showPage;
showPage=function(page,load=true){
  if(state.session && page==='distribution'&&!opsFeature('delivery')){toast(planUpgradeMessage(),'error');page='today';}
  if(state.session && page==='dashboard'&&!opsFinance())page='today';
  if(state.session && page==='sales'&&!opsSeller())page='today';
  opsOriginalShowPage(page,load);if(page==='more'&&state.session)opsRenderQueue();if(load&&['today','money','distribution','inventory','more'].includes(page))void loadOperations(page==='today'||page==='money');
};
const opsOriginalRender=renderAll;
renderAll=function(){opsOriginalRender();if(!state.session)return;document.querySelectorAll('[data-page="sales"]').forEach(e=>e.classList.toggle('hidden',!opsSeller()));document.querySelectorAll('[data-page="distribution"]').forEach(e=>e.classList.toggle('hidden',!opsFeature('delivery')));document.querySelectorAll('[data-page="dashboard"]').forEach(e=>e.classList.toggle('hidden',!opsFinance()));document.querySelectorAll('[data-ops="page"][data-value="dashboard"]').forEach(e=>e.classList.toggle('hidden',!opsFinance()));opsEl('inventoryForm').classList.toggle('hidden',!opsStockRole());renderOperations();};
const opsOriginalLogout=logout;
logout=function(){operations.data=null;operations.owner='';opsEl('ops-dialog').close();opsOriginalLogout();};
// The inline three-step card replaces the lengthy automatic walkthrough; Help is optional.
maybeStartWalkthrough=function(){};
const opsOriginalProduct=updateSaleProduct;
updateSaleProduct=function(){
  opsOriginalProduct();const p=state.products.find(p=>p.name===opsEl('saleProduct').value);const select=opsEl('ops-sale-unit');const old=select.value;
  select.innerHTML=opsOption('base',p?.unit||'Үндсэн нэгж')+(p?.packSize>1?opsOption('pack',`${p.packName||'Хайрцаг'} (${p.packSize} ${p.unit})`):'');
  if(p?.packSize>1)select.value=old;
  if(p&&select.value==='pack')opsEl('salePrice').value=p.price*p.packSize;updateSaleSummary();
};
const opsOriginalReadLine=readCurrentSaleLine;
readCurrentSaleLine=function(required=false){
  const p=state.products.find(p=>p.name===opsEl('saleProduct').value);
  const inputUnit=opsEl('ops-sale-unit')?.value||'base';
  if(inputUnit!=='pack'){
    const line=opsOriginalReadLine(required);
    if(line&&p)Object.assign(line,{productId:p.id||'',inputUnit:'base',inputQuantity:line.quantity,inputUnitPrice:line.unitPrice});
    return line;
  }
  if(!p)return opsOriginalReadLine(required);
  const qty=opsEl('saleQty').value,price=opsEl('salePrice').value;
  opsEl('saleQty').value=Number(qty)*p.packSize;opsEl('salePrice').value=Number(price)/p.packSize;
  try{
    const line=opsOriginalReadLine(required);
    if(line)Object.assign(line,{productId:p.id||'',inputUnit:'pack',inputQuantity:Number(qty),inputUnitPrice:Number(price)});
    return line;
  }finally{opsEl('saleQty').value=qty;opsEl('salePrice').value=price;}
};
const opsOriginalEnqueue=enqueueAction;
enqueueAction=function(action,payload){
  if(action==='addSale'){
    payload.paidAmount=opsEl('ops-sale-paid').value;
    payload.initialPaymentMethod=opsEl('ops-sale-initial-method').value;
    payload.dueDate=opsEl('ops-sale-due').value;
  }
  if(action==='addInventoryMove'){
    payload.inputUnit=opsEl('ops-inv-unit').value||'base';
    const p=state.products.find(p=>p.name===payload.product);
    if(p?.id)payload.productId=p.id;
    payload.expiryDate=opsEl('ops-expiry').value;payload.batchCode=opsEl('ops-batch').value;
  }
  const queued=opsOriginalEnqueue(action,payload);
  if(action==='addSale'){opsEl('ops-sale-paid').value='';opsEl('ops-sale-initial-method').value='Бэлэн';opsEl('ops-sale-due').value='';}
  return queued;
};
const opsOriginalEdit=editProduct;
editProduct=function(name){opsOriginalEdit(name);const p=state.products.find(p=>p.name===name);opsEl('ops-pack-name').value=p?.packName||'Хайрцаг';opsEl('ops-pack-size').value=p?.packSize||1;opsEl('ops-product-cost').value=p?.costKnown&&p?.averageCost!==null?p.averageCost:'';opsEl('productStock').readOnly=true;};
const opsOriginalReset=resetProductForm;
resetProductForm=function(){opsOriginalReset();opsEl('ops-pack-name').value='Хайрцаг';opsEl('ops-pack-size').value=1;opsEl('ops-product-cost').value='';opsEl('productStock').readOnly=false;};
const opsOriginalCommit=commitQueueItem;
commitQueueItem=function(item,data){opsOriginalCommit(item,data);operations.data=null;void loadOperations(true);};
const opsOriginalPost=postAction;
postAction=async function(payload,include=true){
  if(payload.action==='saveProduct')payload={...payload,packName:opsEl('ops-pack-name').value,packSize:opsEl('ops-pack-size').value,averageCost:opsEl('ops-product-cost').value};
  const owner=opsIdentity();
  const result=await opsOriginalPost(payload,include);
  if(include && owner!==opsIdentity())throw new Error('Нэвтрэх эрх өөрчлөгдсөн. Мэдээллээ шинэчилнэ үү.');
  if(result.success && ['saveProduct','deleteProduct'].includes(payload.action)){operations.data=null;void loadOperations(true);}
  return result;
};
const opsOriginalDetail=openSaleDetail;
openSaleDetail=function(id){opsOriginalDetail(id);if(!state.selectedSale)return;let actions=opsEl('ops-sale-actions');if(!actions){actions=document.createElement('div');actions.id='ops-sale-actions';actions.className='ops-actions';opsEl('saleDetailBody').after(actions);}actions.innerHTML=opsButton('Төлөлт','payment',id)+opsButton('Буцаалт','return',id)+opsButton('Түүх','history',id);};

}
let operationsUIActivated = false;
const operationsOriginalPayload = applyPayload;
applyPayload = function(data, reset) {
  operationsOriginalPayload(data, reset);
  if (Number(data.operationsVersion) >= 1 && !operationsUIActivated) {
    operationsUIActivated = true;
    activateOperationsUI();
  }
};

const originalEditableCart = renderSaleCart;
renderSaleCart = function() {
  originalEditableCart();
  document.querySelectorAll('#saleCartList .sale-cart-item').forEach((row,index)=>{
    const item=state.saleCart[index]; if(!item)return;
    const product=state.products.find(p=>p.name===item.product),isPack=item.inputUnit==='pack'&&product?.packSize>1;
    const small=row.querySelector('small');
    if(isPack&&small)small.textContent=`${formatNumber(item.inputQuantity)} ${product.packName||'хайрцаг'} = ${formatNumber(item.quantity)} ${product.unit} · ${money(item.inputUnitPrice)}/${product.packName||'хайрцаг'}`;
    const label=document.createElement('label');label.className='ops-cart-quantity';label.textContent=isPack?`Тоо (${product.packName||'хайрцаг'})`:'Тоо';
    const input=document.createElement('input');input.type='number';input.min='0.000001';input.step='any';input.value=isPack?item.inputQuantity:item.quantity;input.setAttribute('aria-label',item.product+' тоо');
    input.addEventListener('change',()=>{
      const q=Number(input.value);if(!Number.isFinite(q)||q<=0){input.value=isPack?item.inputQuantity:item.quantity;return;}
      if(isPack){item.inputQuantity=q;item.quantity=q*product.packSize;item.unitPrice=Number(item.inputUnitPrice)/product.packSize;}
      else{item.quantity=q;item.inputQuantity=q;item.inputUnit='base';item.inputUnitPrice=item.unitPrice;}
      renderSaleCart();
    });label.appendChild(input);row.firstElementChild.appendChild(label);
  });
};
