'use strict';

function activateOperationsUI() {

// Daily work uses a separate module so the original print/camera workflows stay usable.
const operations = {data:null,loading:null,error:'',owner:'',modalSale:null,delivery:null,busy:false};
const opsEl = id => document.getElementById(id);
const opsEsc = value => escapeHtml(value);
const opsRole = () => state.session?.user?.role || '';
const opsManager = () => ['manager','admin'].includes(opsRole());
const opsFinance = () => ['manager','admin','accountant'].includes(opsRole());
const opsStockRole = () => ['manager','admin','warehouse'].includes(opsRole());
const opsSeller = () => ['manager','admin','rep','sales'].includes(opsRole());
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
  opsEl('ops-more').innerHTML=`<div class="ops-actions">${opsButton('Хүргэлт','page','distribution')}${opsButton('Тайлан','page','dashboard')}${opsButton('Тохиргоо','page','settings')}</div><div id="ops-queue"></div>`;
  const unit=document.createElement('label');unit.className='field';unit.innerHTML='Тоо оруулах нэгж<select id="ops-sale-unit"><option value="base">Ширхэг</option></select>';
  opsEl('saleQty').closest('.field').after(unit);opsEl('ops-sale-unit').addEventListener('change',()=>{updateSaleProduct();});
  const inv=document.createElement('div');inv.className='form-grid two';inv.innerHTML='<label class="field">Тоо оруулах нэгж<select id="ops-inv-unit"><option value="base">Үндсэн нэгж</option></select></label><label class="field">Дуусах огноо (бараа нэмэхэд)<input id="ops-expiry" type="date"></label><label class="field">Цувралын дугаар (сонголттой)<input id="ops-batch" maxlength="30"></label>';
  opsEl('inventoryForm').querySelector('button[type="submit"]').before(inv);
  opsEl('invProduct').addEventListener('change',opsInventoryUnits);
  const pack=document.createElement('div');pack.className='form-grid two';pack.innerHTML='<label class="field">Савлагааны нэр<input id="ops-pack-name" value="Хайрцаг" maxlength="30"></label><label class="field">Нэг савлагаанд хэдэн үндсэн нэгж вэ?<input id="ops-pack-size" type="number" value="1" min="1" step="any"></label>';
  opsEl('saveProductBtn').before(pack);
  const payments=document.createElement('details');payments.className='simple-details';payments.innerHTML='<summary>Төлбөрийн нэмэлт мэдээлэл</summary><div class="form-grid two"><label class="field">Одоо төлсөн дүн<input id="ops-sale-paid" type="number" min="0" step="0.01" placeholder="Хоосон бол төлбөрийн төрлөөр"></label><label class="field">Үлдэгдэл төлөх өдөр<input id="ops-sale-due" type="date"></label></div>';
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
      const url=new URL(APP_SCRIPT_URL);url.searchParams.set('action','operations');url.searchParams.set('token',state.session.token);
      const result=await parseResponse(await fetch(url,{cache:'no-store',redirect:'follow'}));
      if(owner!==opsIdentity())return;
      if(!result.success||!result.operations)throw new Error(result.message||'Өдөр тутмын мэдээлэл одоогоор бэлэн болоогүй байна.');
      operations.data=result.operations;
    } catch(error){if(owner===opsIdentity())operations.error=error.message;}
    finally {if(owner===opsIdentity()){operations.loading=null;renderOperations();}}
  })();operations.loading=promise;return promise;
}
async function opsGetSale(id) {
  if(!navigator.onLine)throw new Error('Энэ үйлдэлд интернэт холболт шаардлагатай.');
  const owner=opsIdentity(),url=new URL(APP_SCRIPT_URL);url.searchParams.set('action','operations');url.searchParams.set('token',state.session.token);url.searchParams.set('saleId',id);
  const data=await parseResponse(await fetch(url,{cache:'no-store',redirect:'follow'}));
  if(owner!==opsIdentity())throw new Error('Нэвтрэх эрх өөрчлөгдсөн байна.');
  if(!data.success||!data.sale)throw new Error(data.message||'Борлуулалт олдсонгүй.');return data.sale;
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
  opsEl('ops-today').innerHTML=notice+`<div class="ops-metrics">${opsMetric('Өнөөдрийн борлуулалт',money(d.todayTotal))}${opsMetric('Борлуулалтын тоо',formatNumber(d.todayCount))}${opsMetric('Хүргэх захиалга',deliveries.length)}</div><div class="ops-actions">${opsSeller()?opsButton('Борлуулалт бүртгэх','page','sales',false):''}${opsButton('Мөнгө харах','page','money')}${opsButton('Хүргэлт харах','page','distribution')}</div><div class="ops-columns"><section class="card"><h3>Авах мөнгө</h3>${due.length?due.slice(0,6).map(s=>`<div class="ops-row"><div><strong>${opsEsc(s.customer)}</strong><small>${s.dueDate?opsEsc(s.dueDate):'Хугацаа заагаагүй'} · ${money(s.remaining)}</small></div>${(opsRole()!=='warehouse'?opsButton('Төлөлт','payment',s.id):'')}</div>`).join(''):emptyHtml('Хугацаа болсон авлага алга.')}</section><section class="card"><h3>Дуусаж буй бараа</h3>${d.lowStock.length?d.lowStock.slice(0,8).map(p=>`<div class="ops-row"><strong>${opsEsc(p.name)}</strong><span>${formatNumber(p.stock)} ${opsEsc(p.unit)}</span></div>`).join(''):emptyHtml('Бага үлдэгдэлтэй бараа алга.')}</section></div>`;
  opsEl('ops-money').innerHTML=notice+`<div class="ops-metrics">${opsMetric('Авах мөнгө',money(d.receivables.reduce((s,x)=>s+x.remaining,0)))}${opsMetric('Буцааж олгох мөнгө',money(d.receivables.reduce((s,x)=>s+x.refundDue,0)))}</div><label class="field">Харилцагч хайх<input id="ops-money-search" type="search" placeholder="Нэрээр хайх"></label><div id="ops-money-list">${d.receivables.map(s=>`<article class="card ops-money-card" data-search="${opsEsc(s.customer.toLowerCase())}"><div class="ops-row"><div><h3>${opsEsc(s.customer)}</h3><small>${opsEsc(s.dueDate||'Хугацаа заагаагүй')} · ${opsEsc(s.id)}</small></div><strong>${money(s.remaining)}</strong></div><p>Борлуулсан ${money(s.total)} · Буцаалт ${money(s.returned)} · Төлсөн ${money(s.paid)}</p><div class="ops-actions">${s.remaining>0&&opsRole()!=='warehouse'?opsButton('Төлөлт бүртгэх','payment',s.id,false):''}${s.refundDue>0&&opsFinance()?opsButton('Мөнгө буцааж олгох','refund',s.id):''}${opsButton('Түүх','history',s.id)}</div></article>`).join('')||emptyHtml('Авах болон буцааж олгох мөнгө алга.')}</div><section class="card"><h3>Жолоочийн бэлэн мөнгө</h3>${d.cash.map(c=>`<div class="ops-row"><div><strong>${opsEsc(c.name||c.driver)}</strong><small>Хураасан ${money(c.collected)} · Тушаасан ${money(c.remitted)}</small><span>Тушаах үлдэгдэл ${money(c.remaining)}</span></div>${opsFinance()&&c.remaining>0?opsButton('Хүлээн авсан','remit',c.driver):''}</div>`).join('')||emptyHtml('Бүртгэлтэй жолооч алга.')}</section>`;
  opsEl('ops-money-search').addEventListener('input',event=>document.querySelectorAll('.ops-money-card').forEach(card=>card.hidden=!card.dataset.search.includes(event.target.value.trim().toLowerCase())));
  opsEl('ops-deliveries').innerHTML=notice+`<div class="ops-actions">${opsSeller()?opsButton('Хүргэлт оноох','dispatch','',false):''}</div>${d.deliveries.map(v=>`<article class="card"><div class="ops-row"><div><h3>${opsEsc(v.customer)}</h3><small>${opsEsc(v.date)} · ${opsEsc(v.driver)} · ${opsEsc(v.status)}</small></div>${v.driverUsername?opsButton('Нээх','delivery',v.distributionId):'<span>Өмнөх бүртгэл</span>'}</div><p>${opsEsc(v.customerAddress||'Хаяг оруулаагүй')}</p>${v.items.length?`<div class="ops-table-wrap"><table><thead><tr><th>Бараа</th><th>Ачсан</th><th>Хүргэсэн</th><th>Буцаасан</th><th>Үлдсэн</th></tr></thead><tbody>${v.items.map(i=>`<tr><td>${opsEsc(i.name)}</td><td>${formatNumber(i.ordered)}</td><td>${formatNumber(i.delivered)}</td><td>${formatNumber(i.returned)}</td><td>${formatNumber(i.ordered-i.delivered-i.returned)}</td></tr>`).join('')}</tbody></table></div>`:''}<div class="ops-actions">${opsRole()!=='warehouse'?opsButton('Төлөлт','payment',v.saleId):''}${opsButton('Баримт','delivery-print',v.distributionId)}</div></article>`).join('')||emptyHtml('Оноосон хүргэлт алга.')}`;
  if(d.legacyDeliveryPayments)opsEl('ops-money').insertAdjacentHTML('afterbegin','<p class="ops-notice">Өмнөх түгээлтэд төлбөрийн тэмдэглэл байна. Давхар тооцохоос сэргийлж нягтлан эхний үлдэгдэлтэй тулгана уу.</p>');
  opsEl('ops-batches').innerHTML=opsStockRole()?`<h3>Цуврал ба дуусах хугацаа</h3><p>Хугацаа нь эхэлж дуусах бараанаас борлуулна. Хугацаа дууссан барааг борлуулахгүй.</p>${d.batches.map(b=>`<div class="ops-row ${b['Дуусах огноо']&&b['Дуусах огноо']<d.today?'ops-expired':''}"><div><strong>${opsEsc(b['Бараа'])}</strong><small>${opsEsc(b['Агуулах'])} · ${opsEsc(b['Дуусах огноо']||'Хугацаа заагаагүй')}</small></div><span>${formatNumber(b['Үлдэгдэл'])}</span></div>`).join('')||emptyHtml('Цуврал бүртгэлгүй. Бараа нэмэхдээ хугацааг оруулж эхэлнэ.')}<h3>Агуулахад хүлээн авах буцаалт</h3>${(d.pendingReturns||[]).map(r=>`<div class="ops-row"><div><strong>${opsEsc(r['Бараа'])} · ${formatNumber(r['Тоо'])}</strong><small>${opsEsc(r['Шалтгаан'])}</small></div>${opsButton('Буцаан авах','receive-return',r.ReturnID)}</div>`).join('')||emptyHtml('Хүлээгдэж буй буцаалт алга.')}`:'';
  opsRenderQueue();
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
      const q=getQueue(),item=q.find(x=>x.id===id&&!x.username&&sameCompany(x.company,state.session.user.company));
      if(!item)throw new Error('Хуучин бүртгэл олдсонгүй.');
      if(!confirm('Энэ хуучин бүртгэлийг өөрийн нэрээр илгээх үү? Өмнө хадгалагдсан эсэхийг шалгасан байна уу?'))return;
      item.username=state.session.user.username;saveQueue(q);opsRenderQueue();await syncOfflineQueue(id);return;
    }
    if(action==='retry-queue'){const q=getQueue();const item=q.find(x=>x.id===id);if(item){delete item.failed;delete item.error;saveQueue(q);await syncOfflineQueue(id);}return;}
    if(action==='delivery-print'){const v=operations.data.deliveries.find(v=>v.distributionId===id);state.selectedDistribution=v;state.selectedSale=null;return openDocumentPreview('DISTRIBUTION');}
    if(action==='receive-return')return opsModal('Буцаасан барааг шалгах','<p>Дахин борлуулах боломжтой барааг агуулахын үлдэгдэлд нэмнэ. Хорогдлыг тусад нь тэмдэглэнэ.</p>'+opsSelect('Шалгалтын дүн','disposition',opsOption('restock','Агуулахад авах')+opsOption('writeoff','Гэмтсэн / хорогдол'))+opsField('Тэмдэглэл','notes'),'receiveReturn',{returnId:id});
    if(action==='remit'){const c=operations.data.cash.find(c=>c.driver===id);return opsModal('Бэлэн мөнгө хүлээн авах',`<p>Тушаах үлдэгдэл: ${money(c.remaining)}</p>${opsField('Бодитоор хүлээн авсан дүн','amount','number','',`required min="0.01" max="${c.remaining}" step="0.01"`)}${opsField('Тэмдэглэл','notes')}`,'remitCash',{driver:id});}
    if(action==='dispatch'){
      const sales=operations.data.sales.filter(s=>!operations.data.deliveries.some(d=>d.saleId===s.id));
      if(!sales.length)throw new Error('Оноох борлуулалт алга. Эхлээд борлуулалт бүртгэнэ үү.');
      opsModal('Хүргэлт оноох',opsSelect('Борлуулалт','saleId',sales.map(s=>opsOption(s.id,s.customer+' · '+money(s.net))).join(''))+opsSelect('Жолооч','driver',operations.data.drivers.map(d=>opsOption(d.username,d.fullName||d.username)).join(''))+opsField('Хүргэх өдөр','date','date',operations.data.today,'required')+opsField('Хаяг','address','text','','required')+opsField('Утас','phone','tel'),'saveDelivery');return;
    }
    if(action==='delivery'){
      const v=operations.data.deliveries.find(d=>d.distributionId===id);const sale=await opsGetSale(v.saleId);operations.modalSale=sale;
      opsModal('Хүргэлтийн тооцоо',`<p>${opsEsc(v.customer)} · ${opsEsc(v.driver)}</p><p>Тоо нь нийт хүргэсэн, нийт буцаасан тоо байна. Буцаалт авах мөнгөнөөс хасагдаж, барааг нярав хүлээн авна.</p>${sale.items.map((i,index)=>{const line=v.items[index]||{};return `<fieldset><legend>${opsEsc(i.product)} · Ачсан ${formatNumber(i.quantity)}</legend><div class="form-grid two">${opsField('Нийт хүргэсэн',`delivered-${index}`,'number',line.delivered||0,`min="0" max="${i.quantity}" step="any" required`)}${opsField('Нийт буцаасан',`returned-${index}`,'number',line.returned||0,`min="0" max="${i.quantity}" step="any" required`)}</div></fieldset>`;}).join('')}${opsSelect('Төлөв','status',['Түгээлтэд гарсан','Хэсэгчлэн хүргэсэн','Хүргэгдсэн','Хүргэлт амжилтгүй'].map(s=>opsOption(s,s,v.status===s)).join(''))}${opsField('Хүргэх өдөр','date','date',v.date||operations.data.today,'required')}${opsField('Хаяг','address','text',v.customerAddress||'')}${opsField('Тэмдэглэл / буцаалтын шалтгаан','notes','text',v.deliveryNotes||'')}`,'saveDelivery',{saleId:v.saleId,distributionId:id,driver:v.driverUsername});return;
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
    const result=await postAction(payload);
    if(!result.success)throw new Error(result.message||'Хадгалж чадсангүй.');
    opsEl('ops-dialog').close();toast('Системд хадгаллаа.','success');
    await refreshData(false);await loadOperations(true);
  } catch(error){opsEl('ops-form-error').textContent=error.message;}
  finally {operations.busy=false;setButtonLoading(opsEl('ops-save'),false);}
}
function opsInventoryUnits() {
  const p=state.products.find(p=>p.name===opsEl('invProduct').value);
  opsEl('ops-inv-unit').innerHTML=opsOption('base',p?.unit||'Үндсэн нэгж')+(p?.packSize>1?opsOption('pack',`${p.packName||'Хайрцаг'} (${p.packSize} ${p.unit})`):'');
}
function opsRenderQueue() {
  const items=getQueue().filter(i=>sameCompany(i.company,state.session?.user?.company)&&i.username===state.session?.user?.username);
  const legacy=opsManager()?getQueue().filter(i=>sameCompany(i.company,state.session.user.company)&&!i.username):[];
  opsEl('ops-queue').innerHTML=`<section class="card"><h3>Утсанд хадгалсан бүртгэл</h3>${items.map(i=>`<div class="ops-row"><div><strong>${i.action==='addSale'?'Борлуулалт':'Барааны хөдөлгөөн'}</strong><small>${opsEsc(i.error||'Илгээхийг хүлээж байна')}</small></div>${i.failed?opsButton('Дахин илгээх','retry-queue',i.id):''}</div>`).join('')||emptyHtml('Илгээхийг хүлээж буй бүртгэл алга.')}${legacy.length?'<h3>Хуучин хувилбараас үлдсэн бүртгэл</h3><p>Үүсгэсэн ажилтан тодорхойгүй. Менежер шалгаад хариуцаж илгээнэ.</p>'+legacy.map(i=>`<div class="ops-row"><div><strong>${opsEsc(i.payload?.customer||i.payload?.product||'Бүртгэл')}</strong><small>${opsEsc(formatDate(i.createdAt))} · ${opsEsc(i.action)} · ${opsEsc(JSON.stringify(i.payload?.items||{quantity:i.payload?.quantity,moveType:i.payload?.moveType}))}</small></div>${opsButton('Хариуцаж илгээх','claim-legacy-queue',i.id)}</div>`).join(''):''}</section>`;
}
installOperations();
const opsOriginalShowApp=showApp;
showApp=function(){opsOriginalShowApp();showPage('today');void loadOperations(true);};
const opsOriginalShowPage=showPage;
showPage=function(page,load=true){
  if(state.session && page==='dashboard'&&!opsFinance())page='today';
  if(state.session && page==='sales'&&!opsSeller())page='today';
  opsOriginalShowPage(page,load);if(page==='more'&&state.session)opsRenderQueue();if(load&&['today','money','distribution','inventory','more'].includes(page))void loadOperations(page==='today'||page==='money');
};
const opsOriginalRender=renderAll;
renderAll=function(){opsOriginalRender();if(!state.session)return;document.querySelectorAll('[data-page="sales"]').forEach(e=>e.classList.toggle('hidden',!opsSeller()));document.querySelectorAll('[data-page="dashboard"]').forEach(e=>e.classList.toggle('hidden',!opsFinance()));document.querySelectorAll('[data-ops="page"][data-value="dashboard"]').forEach(e=>e.classList.toggle('hidden',!opsFinance()));opsEl('inventoryForm').classList.toggle('hidden',!opsStockRole());renderOperations();};
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
  if(opsEl('ops-sale-unit').value!=='pack')return opsOriginalReadLine(required);
  const p=state.products.find(p=>p.name===opsEl('saleProduct').value);if(!p)return opsOriginalReadLine(required);
  const qty=opsEl('saleQty').value,price=opsEl('salePrice').value;
  opsEl('saleQty').value=Number(qty)*p.packSize;opsEl('salePrice').value=Number(price)/p.packSize;
  try{return opsOriginalReadLine(required);}finally{opsEl('saleQty').value=qty;opsEl('salePrice').value=price;}
};
const opsOriginalEnqueue=enqueueAction;
enqueueAction=function(action,payload){
  if(action==='addSale'){payload.paidAmount=opsEl('ops-sale-paid').value;payload.dueDate=opsEl('ops-sale-due').value;}
  if(action==='addInventoryMove'){
    const p=state.products.find(p=>p.name===payload.product);
    if(opsEl('ops-inv-unit').value==='pack')payload.quantity*=p?.packSize||1;
    payload.expiryDate=opsEl('ops-expiry').value;payload.batchCode=opsEl('ops-batch').value;
  }
  const queued=opsOriginalEnqueue(action,payload);
  if(action==='addSale'){opsEl('ops-sale-paid').value='';opsEl('ops-sale-due').value='';}
  return queued;
};
const opsOriginalEdit=editProduct;
editProduct=function(name){opsOriginalEdit(name);const p=state.products.find(p=>p.name===name);opsEl('ops-pack-name').value=p?.packName||'Хайрцаг';opsEl('ops-pack-size').value=p?.packSize||1;opsEl('productStock').readOnly=true;};
const opsOriginalReset=resetProductForm;
resetProductForm=function(){opsOriginalReset();opsEl('ops-pack-name').value='Хайрцаг';opsEl('ops-pack-size').value=1;opsEl('productStock').readOnly=false;};
const opsOriginalCommit=commitQueueItem;
commitQueueItem=function(item,data){opsOriginalCommit(item,data);operations.data=null;void loadOperations(true);};
const opsOriginalPost=postAction;
postAction=async function(payload,include=true){
  if(payload.action==='saveProduct')payload={...payload,packName:opsEl('ops-pack-name').value,packSize:opsEl('ops-pack-size').value};
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
    const label=document.createElement('label');label.className='ops-cart-quantity';label.textContent='Тоо';
    const input=document.createElement('input');input.type='number';input.min='0.000001';input.step='any';input.value=item.quantity;input.setAttribute('aria-label',item.product+' тоо');
    input.addEventListener('change',()=>{const quantity=Number(input.value);if(!Number.isFinite(quantity)||quantity<=0){input.value=item.quantity;return;}item.quantity=quantity;renderSaleCart();});label.appendChild(input);row.firstElementChild.appendChild(label);
  });
};
