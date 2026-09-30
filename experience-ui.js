'use strict';

function uxCsv(headers,rows){
  const cell=value=>{let s=String(value??'');if(/^\s*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  return '\uFEFF'+[headers,...rows.map(r=>headers.map(h=>r[h]))].map(row=>row.map(cell).join(',')).join('\r\n');
}
function uxImportTable(rows){
  const labels={name:'Нэр',customer:'Харилцагч',code:'Код',price:'Үнэ',cost:'Өртөг',stock:'Үлдэгдэл',unit:'Нэгж',warehouse:'Агуулах',amount:'Дүн',date:'Огноо',dueDate:'Төлөх өдөр',reference:'Баримтын №',phone:'Утас',address:'Хаяг',registrationNumber:'Регистр',contactPerson:'Холбоо барих хүн',threshold:'Доод хязгаар',packName:'Савлагаа',packSize:'Савлагааны тоо',expiryDate:'Дуусах өдөр'};
  const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))];return '<div class="table-wrap"><table><thead><tr><th>Мөр</th>'+keys.map(k=>'<th>'+escapeHtml(labels[k]||k)+'</th>').join('')+'</tr></thead><tbody>'+rows.slice(0,100).map((r,i)=>'<tr><td>'+(i+1)+'</td>'+keys.map(k=>'<td>'+escapeHtml(r[k]??'')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+(rows.length>100?'<p>Урьдчилан эхний 100 мөрийг үзүүлэв. Нийт '+rows.length+' мөр.</p>':'');
}
(function(){
  const el=id=>document.getElementById(id),esc=escapeHtml;
  const identity=()=>state.session?[currentCompanyId_()||currentCompanyName_(),state.session.user.username].join(':'):'';
  const manager=()=>isManager(),finance=()=>manager()||state.session?.user.role==='accountant';
  const supported=()=>state.uxVersion>=1;
  const button=(label,action,value='')=>`<button type="button" class="btn btn-secondary" data-ux="${action}" data-value="${esc(value)}">${esc(label)}</button>`;
  const field=(label,name,value='',type='text',extra='')=>`<label class="field">${esc(label)}<input name="${esc(name)}" type="${type}" value="${esc(value)}" ${extra}></label>`;
  const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ulaanbaatar'}).format(new Date());
  let owner='',draftReady=false,draftSuspended=false,dialog,busy=false,submit=null,modalOwner='',requestId='',lastPayload='',salesPage=0,salesTotal=0,salesSequence=0,historyPage=0,historyResource='inventory',historyQuery={},importProgress=null;
  let latestOperations=null;
  async function api(payload,include=true){
    const session=state.session?.token;const result=await postAction(payload,include);
    if(include&&session!==state.session?.token)throw new Error('Нэвтрэх эрх өөрчлөгдсөн. Дахин нээнэ үү.');
    if(!result.success)throw new Error(result.message||'Хүсэлт амжилтгүй.');return result;
  }
  function requireNew(){if(!supported())throw new Error('Энэ боломжийг идэвхжүүлэх серверийн шинэчлэл хүлээгдэж байна. Одоогийн бүртгэлээ үргэлжлүүлж болно.');}
  function modal(title,html,callback,label='Хадгалах'){
    modalOwner=identity();requestId=createClientId();lastPayload='';submit=callback;
    el('ux-title').textContent=title;el('ux-body').innerHTML=html;el('ux-error').textContent='';el('ux-save').hidden=!callback;el('ux-save').textContent=label;dialog.showModal();
  }
  async function write(action,values){
    requireNew();const signature=JSON.stringify({action,...values});
    if(lastPayload&&lastPayload!==signature)throw new Error('Өмнөх хүсэлтийн мэдээлэл өөрчлөгдсөн. Цонхоо хааж, бүртгэлээ шалгаад дахин нээнэ үү.');
    lastPayload=signature;const r=await api({action,...values,clientId:requestId});dialog.close();toast(r.requestId?'Хүсэлт хадгалагдлаа. Дугаар: '+r.requestId:'Хадгаллаа.','success');await refreshData(false);return r;
  }
  function download(name,content,type='text/csv;charset=utf-8'){
    const blob=content instanceof Blob?content:new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  const draftKey=()=> 'datalinx-draft-v1:'+identity();
  const draftFields=['saleCustomer','saleProduct','saleQty','salePrice','salePayment','ux-sale-warehouse','ops-sale-unit','ops-sale-paid','ops-sale-initial-method','ops-sale-due','ux-discount','ux-discount-reason'];
  function readDraft(){return {cart:state.saleCart,fields:Object.fromEntries(draftFields.map(id=>[id,el(id)?.value||''])),at:new Date().toISOString()};}
  function hasDraft(d){return !!d&&(d.cart?.length>0||Number(d.fields?.saleQty)>0);}
  function saveDraft(){
    if(!identity()||!draftReady||draftSuspended)return;
    try{const d=readDraft();if(hasDraft(d)){localStorage.setItem(draftKey(),JSON.stringify(d));if(el('ux-draft-status'))el('ux-draft-status').textContent='Ноорог энэ төхөөрөмжид хадгалагдсан';}else{localStorage.removeItem(draftKey());if(el('ux-draft-status'))el('ux-draft-status').textContent='';}}
    catch{toast('Ноорог хадгалах зай хүрэлцэхгүй. Хуудсаа хаахаас өмнө борлуулалтаа хадгална уу.','error');}
  }
  window.uxClearDraft=function(){draftSuspended=true;if(el('ux-discount'))el('ux-discount').value='0';if(el('ux-discount-reason'))el('ux-discount-reason').value='';try{localStorage.removeItem(draftKey());}catch{}if(el('ux-draft-banner'))el('ux-draft-banner').hidden=true;setTimeout(()=>{draftSuspended=false;saveDraft();},0);};
  function checkDraft(){
    if(owner===identity())return;owner=identity();draftReady=false;
    let saved;try{saved=JSON.parse(localStorage.getItem(draftKey())||'null');}catch{}
    const box=el('ux-draft-banner');if(box){box.hidden=!hasDraft(saved);box.innerHTML=hasDraft(saved)?'<strong>Дуусаагүй борлуулалт байна.</strong> '+esc(formatDate(saved.at))+button('Үргэлжлүүлэх','restore-draft')+button('Ноорог арилгах','discard-draft'):'';}draftReady=!hasDraft(saved);
  }
  function available(product){
    const warehouse=el('ux-sale-warehouse')?.value||state.warehouses[0]?.name;
    if(!supported())return Number(product.stock||0);
    const record=state.warehouseStocks.find(s=>s.warehouse===warehouse&&(s.productId?s.productId===product.id:s.product===product.name));
    let stock=Number(record?.available||0);
    getQueue().filter(q=>queueBelongsToCurrent_(q)&&!q.failed&&q.action==='addSale'&&q.payload.warehouse===warehouse).forEach(q=>(q.payload.items||[]).filter(i=>i.product===product.name).forEach(i=>stock-=Number(i.quantity)));
    return Math.max(0,stock);
  }
  window.uxValidateSale=function(payload){
    if(!draftReady)throw new Error('Өмнөх нооргоо үргэлжлүүлэх эсвэл арилгах сонголтоо хийнэ үү.');
    if(payload.customer==='Энгийн худалдан авагч'&&el('salePayment').value==='Зээл')throw new Error('Дараа төлөх борлуулалтад харилцагчийн нэрийг сонгоно уу.');
    const quantities={};payload.items.forEach(i=>quantities[i.product]=(quantities[i.product]||0)+Number(i.quantity));
    Object.entries(quantities).forEach(([name,qty])=>{const product=state.products.find(p=>p.name===name);if(!product||qty>available(product)+0.000001)throw new Error(name+' сонгосон агуулахад хүрэлцэхгүй. Барааны үлдэгдлээ шинэчилнэ үү.');});
    const total=payload.items.reduce((n,i)=>n+Number(i.quantity)*Number(i.unitPrice),0),discount=Number(el('ux-discount')?.value||0);
    if(!Number.isFinite(discount)||discount<0||discount>total)throw new Error('Хөнгөлөлтийн дүнг шалгана уу.');
    if(discount>0&&(!manager()||!el('ux-discount-reason').value.trim()))throw new Error('Хөнгөлөлтийг менежер шалтгаантай оруулна.');
    const paid=el('ops-sale-paid')?.value;if(payload.customer==='Энгийн худалдан авагч'&&paid!==''&&Number(paid)<total-discount)throw new Error('Үлдэгдэл төлбөртэй борлуулалтад харилцагчийн нэр оруулна уу.');if(paid!==''&&Number(paid)>total-discount)throw new Error('Төлсөн дүн нийт төлбөрөөс их байна.');
  };
  window.uxPrepareSale=function(payload){payload.warehouse=el('ux-sale-warehouse')?.value||payload.warehouse;payload.discount=Number(el('ux-discount')?.value||0);payload.discountReason=el('ux-discount-reason')?.value||'';};
  function setup(){
    if(!state.session)return;
    if(!el('ux-draft-banner')){
      el('saleForm').insertAdjacentHTML('beforebegin','<section id="ux-draft-banner" class="card ux-notice" hidden></section>');
      el('saleForm').insertAdjacentHTML('beforeend','<p id="ux-draft-status" role="status"></p>');
      el('saleCustomerControl').after(Object.assign(document.createElement('div'),{innerHTML:button('Энгийн худалдан авагч','walk-in')}));
      el('saleProductControl').closest('.field').insertAdjacentHTML('beforebegin','<label class="field">Борлуулах агуулах<select id="ux-sale-warehouse"></select></label>');
      el('saleBtn').insertAdjacentHTML('beforebegin','<details id="ux-discount-box" class="simple-details"><summary>Хөнгөлөлт</summary><label class="field">Хөнгөлөх дүн<input id="ux-discount" type="number" min="0" step="0.01" value="0"></label><label class="field">Шалтгаан<input id="ux-discount-reason" maxlength="200"></label></details><p id="ux-payment-summary" role="status"></p>');
      el('page-sales').querySelector('.page-head').insertAdjacentHTML('afterend','<form id="ux-sales-filter" class="ux-toolbar">'+field('Хайх','query','','search','placeholder="Харилцагч, бараа, баримт"')+field('Эхлэх','from','','date')+field('Дуусах','to','','date')+'<label class="field">Төлөв<select name="payment"><option value="">Бүгд</option><option value="due">Авлагатай</option><option value="paid">Төлсөн</option><option value="cancelled">Цуцлагдсан</option></select></label><button class="btn btn-primary">Хайх</button></form><div class="ux-toolbar">'+button('Өмнөх','sales-prev')+'<span id="ux-sales-count" role="status"></span>'+button('Дараах','sales-next')+'</div>');
      el('ux-sales-filter').addEventListener('submit',e=>{e.preventDefault();salesPage=0;void loadSales();});
      el('page-dashboard').querySelector('.page-head').insertAdjacentHTML('afterend','<form id="ux-report-filter" class="ux-toolbar">'+field('Эхлэх','from',today().slice(0,7)+'-01','date','required')+field('Дуусах','to',today(),'date','required')+'<button class="btn btn-primary">Тайлан харах</button></form><p id="ux-report-period"></p><div id="ux-report-profit"></div>');
      el('ux-report-filter').addEventListener('submit',e=>{e.preventDefault();void report();});
      el('productManagementTable').hidden=true;const search=el('productSearch');el('inventoryStatusTable').before(search);search.placeholder='Барааны нэр, кодоор хайх';search.addEventListener('input',renderInventory);el('inventoryStatusTable').addEventListener('click',handleProductTableClick);
      const inventory=el('page-inventory');inventory.querySelector('.page-head').insertAdjacentHTML('afterend','<div class="ux-toolbar">'+button('Агуулахын бүх түүх','history','inventory')+button('Татан авалтын түүх','history','purchases')+'</div>');
      el('page-settings').insertAdjacentHTML('afterbegin','<section id="ux-settings" class="card"><h3>Миний бизнес ба тусламж</h3><div class="ux-toolbar">'+button('Бизнесийн мэдээлэл','business')+button('Харилцагчид','customers')+button('Мэдээллээ татах','export')+button('Имэйл баталгаажуулах','verify-email')+button('Багц сунгах','plans')+button('Тусламжийн хүсэлт','support')+button('Миний хүсэлтүүд','requests')+'</div></section>');
      el('saleForm').addEventListener('input',()=>{saveDraft();paymentSummary();});el('saleForm').addEventListener('change',()=>{saveDraft();paymentSummary();});
      el('ux-sale-warehouse').addEventListener('change',()=>{updateSaleProduct();saveDraft();});
    }
    const select=el('ux-sale-warehouse'),previous=select.value;select.innerHTML=state.warehouses.map(w=>'<option>'+esc(w.name)+'</option>').join('');if(state.warehouses.some(w=>w.name===previous))select.value=previous;
    el('ux-discount-box').hidden=!manager();
    el('ux-settings').querySelectorAll('[data-ux]').forEach(b=>{b.hidden=['business','export','plans'].includes(b.dataset.ux)&&!manager()||b.dataset.ux==='customers'&&!['manager','admin','accountant','rep','sales'].includes(state.session.user.role);});
    el('ux-sales-filter').hidden=!supported();el('ux-report-filter').hidden=!supported();
    checkDraft();subscription();onboarding();paymentSummary();
    const legacy=document.querySelector('.ops-legacy');if(legacy)legacy.hidden=state.businessSettings.ShowVisits!=='Тийм';
    if(el('loadOlderWrap')&&supported())el('loadOlderWrap').hidden=true;
  }
  function paymentSummary(){
    if(!el('ux-payment-summary'))return;const subtotal=state.saleCart.reduce((n,i)=>n+i.quantity*i.unitPrice,0)+Number(el('saleQty').value||0)*Number(el('salePrice').value||0),total=Math.max(0,subtotal-Number(el('ux-discount').value||0));
    const input=el('ops-sale-paid'),paid=input?.value!==''&&input?Number(input.value):(el('salePayment').value==='Зээл'?0:total);
    el('ux-payment-summary').textContent='Нийт '+money(total)+' · Одоо төлсөн '+money(paid)+' · Үлдсэн '+money(Math.max(0,total-paid))+' · '+(el('ops-sale-initial-method')?.value||'Бэлэн');
    el('saleTotal').textContent=money(total);const p=state.products.find(p=>p.name===el('saleProduct').value);if(p){el('saleStock').textContent=formatNumber(available(p))+' '+p.unit;el('saleProductHint').textContent=(supported()?'Сонгосон агуулах: ':'Бүх агуулахын нийлбэр: ')+formatNumber(available(p))+' '+p.unit+' · Үнэ: '+money(p.price)+(supported()?'':' · Сонгосон агуулахын үлдэгдлийг хадгалах үед шалгана.');}
  }
  function subscription(){
    let box=el('ux-subscription');if(!box){box=document.createElement('section');box.id='ux-subscription';box.className='ux-notice';document.querySelector('.content')?.prepend(box);}
    const plan=currentPlan(),expiry=state.session.expiresAt;let text=plan.name;
    if(expiry){const date=new Intl.DateTimeFormat('mn-MN',{timeZone:'Asia/Ulaanbaatar'}).format(new Date(expiry));const days=Math.max(0,Math.ceil((new Date(expiry)-Date.now())/86400000));text+=(plan.id==='Expired'?' · Дууссан: ':' · Дуусах: ')+date+(plan.id==='Expired'?'':' · '+days+' хоног үлдсэн');}
    if(plan.id==='Expired')text=(plan.configuredPlanId==='Trial'?'Туршилтын':(plan.configuredPlanId||'Багцын'))+' хугацаа дууссан. Мэдээллээ харах, татах боломжтой.';
    box.innerHTML='<span>'+esc(text)+'</span>'+(manager()?button('Багц / сунгалт','plans'):'');box.hidden=plan.id!=='Trial'&&plan.id!=='Expired'&&expiry&&new Date(expiry)-Date.now()>7*86400000;
  }
  function onboarding(){
    const page=el('page-today');if(!page)return;let box=el('ux-start');if(!box){box=document.createElement('section');box.id='ux-start';box.className='card';page.querySelector('.page-head').after(box);}
    const role=state.session.user.role;box.hidden=state.products.length>0&&state.recentTransactions.length>0;
    box.innerHTML=manager()?'<h3>Эхний ажлаа эхлүүлье</h3><p>Бараа → Борлуулалт → Төлбөр</p><div class="ux-toolbar">'+button('1. Бараа нэмэх','quick-product')+button('Excel-ээс оруулах','import')+button('2. Борлуулалт хийх','new-sale')+button('3. Төлбөр шалгах','money')+'</div>':'<h3>Таны эхний ажил</h3><p>'+esc(({driver:'Хүргэлт хэсэгт танд оноосон захиалгаа нээнэ.',warehouse:'Бараа хэсэгт ирсэн бараагаа бүртгэж, үлдэгдлээ шалгана.',accountant:'Мөнгө хэсгээс авлага, төлөлт, кассаа шалгана.'})[role]||'Борлуулалт хэсгээс бараа, тоо, төлбөрөө сонгож хадгална.')+'</p>';
    const old=el('quickStartBadge')?.closest('section');if(old)old.hidden=true;
    document.querySelectorAll('.today-overview').forEach(e=>e.hidden=true);
  }
  async function loadSales(){
    if(!supported())return;const seq=++salesSequence;const status=el('ux-sales-count');status.textContent='Ачаалж байна…';
    try{const p=Object.fromEntries(new FormData(el('ux-sales-filter'))),r=await api({action:'uxRead',kind:'sales',...p,page:salesPage,limit:50});if(seq!==salesSequence)return;
      salesTotal=r.total;state.serverTransactions=r.rows;state.hasMoreTransactions=false;rebuildOptimisticState();renderSales();status.textContent=r.total?`${r.page*50+1}–${Math.min((r.page+1)*50,r.total)} / ${r.total} борлуулалт`:'Борлуулалт олдсонгүй';
      document.querySelector('[data-ux="sales-prev"]').disabled=salesPage===0;document.querySelector('[data-ux="sales-next"]').disabled=!r.hasMore;
    }catch(e){status.textContent=e.message;}
  }
  async function report(){
    try{requireNew();const p=Object.fromEntries(new FormData(el('ux-report-filter'))),r=await api({action:'uxRead',kind:'report',...p});state.dashboard=r.dashboard;renderDashboard();el('ux-report-period').textContent=p.from+' — '+p.to+' · '+r.dashboard.comparisonLabel+' · Авлага нь одоогийн бүх үлдэгдэл.';
      el('ux-report-profit').textContent=r.dashboard.profitKnown!==undefined?(r.dashboard.costComplete?'Ахиуц ашиг: ':'Өртөг мэдэгдэж буй хэсгийн ашиг: ')+money(r.dashboard.profitKnown)+' · Үйл ажиллагааны зардал хасагдаагүй.':'';
    }catch(e){toast(e.message,'error');}
  }
  function organizeMoney(){
    const root=el('ops-money');if(!root)return;const selected=el('ux-money-nav')?.querySelector('[aria-pressed="true"]')?.dataset.value||'receivables';
    el('ux-money-nav')?.remove();const nav=document.createElement('div');nav.id='ux-money-nav';nav.className='ux-toolbar';nav.innerHTML=[['receivables','Авах мөнгө'],['payables','Өгөх мөнгө'],['cash','Касс'],['expenses','Зардал'],['profit','Ашиг']].filter(([v])=>finance()||v==='receivables').map(([v,l])=>button(l,'money-tab',v)).join('');root.prepend(nav);
    Array.from(root.children).filter(e=>e!==nav&&!e.classList.contains('ops-asof')&&!e.classList.contains('ops-notice')).forEach(e=>{const title=e.querySelector('h3')?.textContent||'';e.dataset.moneyGroup=title.includes('өглөг')?'payables':title.includes('касс')||title.includes('бэлэн мөнгө')?'cash':title.includes('зардал')?'expenses':title.includes('ашиг')?'profit':'receivables';});
    const expense=Array.from(root.children).find(e=>e.dataset.moneyGroup==='expenses');if(expense&&!expense.querySelector('[data-ux="history"]'))expense.insertAdjacentHTML('beforeend',button('Зардлын бүх түүх','history','expenses'));
    const cash=Array.from(root.children).find(e=>e.querySelector('h3')?.textContent.includes('кассын'));if(cash&&manager()&&!cash.querySelector('[data-ux="reopen-cash"]'))cash.insertAdjacentHTML('beforeend',button('Хаасан касс дахин нээх','reopen-cash'));
    moneyTab(selected);
  }
  function moneyTab(name){el('ops-money')?.querySelectorAll('[data-money-group]').forEach(e=>e.hidden=e.dataset.moneyGroup!==name);el('ux-money-nav')?.querySelectorAll('[data-ux]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===name)));}
  window.uxOperationModal=function(action){
    if(action!=='saveDelivery'||!supported())return;const form=el('ops-form'),select=form?.elements.saleId;if(!select)return;
    const fill=async()=>{try{const sale=latestOperations?.sales.find(s=>s.id===select.value);if(!sale)return;const r=await api({action:'uxRead',kind:'customers',query:sale.customer,limit:100}),c=r.rows.find(c=>c.name===sale.customer);if(select.value!==sale.id||!c)return;if(!form.elements.address.value)form.elements.address.value=c.address||'';if(!form.elements.phone.value)form.elements.phone.value=c.phone||'';}catch{}};select.addEventListener('change',()=>{form.elements.address.value='';form.elements.phone.value='';void fill();});void fill();
  };
  window.uxOperationsUpdated=function(data){latestOperations=data;if(Array.isArray(data.warehouseStocks)){state.warehouseStocks=data.warehouseStocks;saveCache();paymentSummary();}setTimeout(()=>{organizeMoney();onboarding();},0);};
  async function history(resource,reset=true){
    requireNew();if(reset){historyPage=0;historyResource=resource;historyQuery={};}
    const r=await api({action:'uxRead',kind:'history',resource:historyResource,...historyQuery,page:historyPage,limit:50});
    const labels={inventory:'Агуулахын хөдөлгөөн',expenses:'Зардлын түүх',purchases:'Татан авалтын түүх'},cols={inventory:['Огноо','Бараа','Агуулах','Тоо','Шалтгаан'],expenses:['Date','Category','Description','Amount','Method','Status'],purchases:['Date','SupplierName','InvoiceNumber','Warehouse','Total','Status']};
    const translate={Date:'Огноо',Category:'Ангилал',Description:'Тайлбар',Amount:'Дүн',Method:'Арга',Status:'Төлөв',SupplierName:'Нийлүүлэгч',InvoiceNumber:'Баримт',Warehouse:'Агуулах',Total:'Нийт'};
    modal(labels[historyResource],'<div class="ux-toolbar">'+field('Эхлэх','historyFrom',historyQuery.from||'','date')+field('Дуусах','historyTo',historyQuery.to||'','date')+field('Хайх','historySearch',historyQuery.query||'','search')+button('Шүүх','history-filter')+'</div>'+table(cols[historyResource],r.rows,translate)+'<div class="ux-toolbar">'+button('Өмнөх','history-prev')+'<span>'+Math.min(historyPage*50+1,r.total)+'–'+Math.min((historyPage+1)*50,r.total)+' / '+r.total+'</span>'+button('Дараах','history-next')+'</div>',null);
    dialog.querySelector('[data-ux="history-prev"]').disabled=historyPage===0;dialog.querySelector('[data-ux="history-next"]').disabled=!r.hasMore;
  }
  function table(keys,rows,labels={}){return '<div class="table-wrap"><table><thead><tr>'+keys.map(k=>'<th>'+esc(labels[k]||k)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+keys.map(k=>'<td>'+esc(r[k]??'')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+(rows.length?'':'<p>Мэдээлэл алга.</p>');}
  async function business(){
    requireNew();const r=await api({action:'uxRead',kind:'business'}),s=r.settings;
    modal('Миний бизнес',field('Баримт дээрх нэр','CompanyName',s.CompanyName)+field('Регистр','RegistrationNumber',s.RegistrationNumber)+field('Хаяг','Address',s.Address)+field('Утас','Phone',s.Phone,'tel')+field('Имэйл','Email',s.Email,'email')+field('Логоны https холбоос','LogoUrl',s.LogoUrl,'url')+field('Зээлийн ердийн хугацаа (хоног)','DefaultPaymentTermDays',s.DefaultPaymentTermDays||14,'number','min="0" max="365"')+'<label class="field">GPS, зурагтай айлчлал<select name="ShowVisits"><option value="Үгүй">Харагдуулахгүй</option><option value="Тийм" '+(s.ShowVisits==='Тийм'?'selected':'')+'>Ашиглана</option></select></label><h4>Агуулахууд</h4>'+r.warehouses.map(w=>'<p>'+esc(w.name)+'</p>').join('')+button('Агуулах нэмэх / мэдээлэл засах','warehouse'),v=>write('saveBusiness',{settings:v}));
  }
  async function customers(query=''){
    requireNew();const r=await api({action:'uxRead',kind:'customers',query,limit:100});
    modal('Харилцагчид','<div class="ux-toolbar">'+field('Нэр, утас','customerSearch',query,'search')+button('Хайх','customer-search')+(manager()?button('Нэмэх','customer-new')+button('Давхардсан нэр нэгтгэх','customer-merge'):'')+'</div><p>Хайлтад '+r.total+' харилцагч. Эхний 100-г үзүүлнэ.</p>'+r.rows.map(c=>'<article class="ux-list-row"><div><strong>'+esc(c.name)+'</strong><small>'+esc(c.phone||'')+' · '+esc(c.address||'')+'</small></div>'+button('Дэлгэрэнгүй','customer',c.id)+'</article>').join(''),null);
  }
  async function customer(id){
    const r=await api({action:'uxRead',kind:'customer',id}),c=r.customer;modal(c['Харилцагчийн нэр'],'<p>'+esc(c['Утас']||'')+' · '+esc(c['Хаяг']||'')+'</p><strong>Авах мөнгө: '+money(r.remaining)+'</strong>'+(manager()?button('Мэдээлэл засах','customer-edit',id):'')+r.sales.map(s=>'<details class="simple-details"><summary>'+esc(formatDate(s.date))+' · '+money(s.net)+' · Үлдсэн '+money(s.remaining)+'</summary><p>Төлсөн '+money(s.paid)+' · Буцаалт '+money(s.returned)+'</p>'+table(['product','quantity','total'],s.items,{product:'Бараа',quantity:'Тоо',total:'Дүн'})+table(['date','amount','method'],s.payments,{date:'Төлсөн өдөр',amount:'Дүн',method:'Арга'})+'</details>').join(''),null);
  }
  async function exportData(){
    requireNew();const list=await api({action:'uxRead',kind:'export'});
    modal('Мэдээллээ татах','<p>Өөрийн бизнесийн мэдээллийг Excel-д нээгдэх CSV файлаар татна. Эрхийн хугацаа дууссан үед ч эзэн ашиглана.</p><label class="field">Мэдээлэл<select name="sheet">'+list.sheets.map(s=>'<option>'+esc(s)+'</option>').join('')+'</select></label><p id="ux-export-progress" role="status"></p>',async v=>{let rows=[],page=0,headers=[];while(true){const r=await api({action:'uxRead',kind:'export',sheet:v.sheet,page:page++});headers=r.headers;rows.push(...r.rows);el('ux-export-progress').textContent=rows.length+' / '+r.total+' мөр';if(!r.hasMore)break;}download('DataLinx_'+v.sheet+'_'+today()+'.csv',uxCsv(headers,rows));dialog.close();toast('Файл татлаа.','success');},'Татах');
  }
  function service(type){
    requireNew();modal(type==='plan'?'Багц сунгах хүсэлт':'Тусламжийн хүсэлт',(type==='plan'?'<label class="field">Багц<select name="plan"><option value="Business">Business · 24,900₮ / 1 сар · 5 хэрэглэгч, 2 агуулах</option><option value="Pro">Pro · 59,900₮ / 1 сар · 20 хэрэглэгч, 10 агуулах</option></select></label><p>Автомат суутгал хийхгүй. Төлбөрийн мэдээллийг оператор баталгаажуулж эрх идэвхжүүлнэ.</p>':'<p>Нууц үг, банкны нууц мэдээлэл оруулахгүй.</p>')+field('Холбоо барих утас эсвэл имэйл','contact',state.session.company?.phone||'','text','required')+'<label class="field">'+(type==='plan'?'Нэмэлт тайлбар':'Ямар үйлдэл дээр юу болсон бэ?')+'<textarea name="message" maxlength="1500" '+(type==='support'?'required':'')+'></textarea></label><p>Хүсэлтийн явцыг «Миний хүсэлтүүд»-ээс харна. Шууд хариу шаардлагатай бол <a href="https://www.facebook.com/DataLinxMN" target="_blank" rel="noopener">DataLinx-тэй холбогдоно</a>.</p>',v=>write('requestService',{type,...v}),'Хүсэлт хадгалах');
  }
  async function requests(){requireNew();const r=await api({action:'uxRead',kind:'requests'});modal('Миний хүсэлтүүд',r.requests.map(o=>'<article class="card"><strong>'+esc(o.Type==='plan'?o.Plan+' · '+money(o.Amount):'Тусламж')+'</strong><p>'+esc(o.Status)+' · '+esc(formatDate(o.CreatedAt))+'</p><p>'+esc(o.Message)+'</p><p>'+esc(o.Response||'Хариу хараахан ирээгүй.')+'</p><small>'+esc(o.RequestID)+'</small></article>').join('')||'<p>Хүсэлт алга.</p>',null);}
  async function importWizard(){
    requireNew();importProgress=null;
    modal('Мэдээллээ нэг дор оруулах','<p>CSV файл сонгох эсвэл Excel / Google Sheets-ээс толгой мөртэй нь хуулж оруулна. 5000 хүртэл мөрийг систем 50-аар хэсэгчлэн хадгална.</p><label class="field">Төрөл<select name="kind"><option value="products">Бараа ба эхний үлдэгдэл</option><option value="customers">Харилцагч</option><option value="opening">Эхний авлага</option></select></label><label class="field">CSV файл<input type="file" name="file" accept=".csv,text/csv"></label><label class="field">Хуулсан хүснэгт<textarea name="paste" rows="6" placeholder="Барааны нэр&#9;Үнэ&#9;Үлдэгдэл"></textarea></label><p><a href="./templates/products.csv" download>Барааны загвар</a> · <a href="./templates/customers.csv" download>Харилцагчийн загвар</a> · <a href="./templates/opening.csv" download>Эхний авлагын загвар</a></p><div id="ux-import-mapping"></div><div id="ux-import-preview"></div><p id="ux-import-progress" role="status"></p>',importStep,'Мэдээлэл унших');
  }
  const importKeys={products:['name','code','price','cost','stock','unit','warehouse','threshold','packName','packSize','expiryDate'],customers:['name','phone','address','registrationNumber','contactPerson'],opening:['customer','amount','date','dueDate','reference']};
  const aliases={'барааны нэр':'name','бараа':'name','нэр':'name','харилцагч':'customer','харилцагчийн нэр':'name','үнэ':'price','нэгж үнэ':'price','үлдэгдэл':'stock','эхний үлдэгдэл':'stock','код':'code','баркод':'code','нэгж':'unit','агуулах':'warehouse','өртөг':'cost','утас':'phone','хаяг':'address','регистр':'registrationNumber','дүн':'amount','огноо':'date','төлөх өдөр':'dueDate','баримтын №':'reference','дуусах өдөр':'expiryDate'};
  async function importStep(v){
    if(importProgress?.stage==='save'){v.kind=importProgress.kind;v.paste=importProgress.signature.slice(importProgress.kind.length+1);}
    const file=el('ux-form').elements.file.files[0],text=file?await file.text():v.paste;
    if(!text?.trim())throw new Error('Файл эсвэл хүснэгтээ оруулна уу.');if(text.length>2000000)throw new Error('Файл 2 MB-аас их байна.');
    const signature=v.kind+'|'+text;
    if(!importProgress||importProgress.signature!==signature){
      const raw=file?parseImportCsv(text):parseImportCsv(text.trim().split(/\r?\n/).map(line=>line.split('\t').map(c=>'"'+c.replace(/"/g,'""')+'"').join(',')).join('\n'));
      const headers=Object.keys(raw[0]),allowed=importKeys[v.kind];importProgress={signature,raw,headers,kind:v.kind,stage:'mapping'};
      el('ux-import-mapping').innerHTML='<h4>Баганыг тааруулах</h4>'+headers.map((h,i)=>{let match=allowed.includes(h)?h:(aliases[h.toLowerCase()]||'');if(v.kind==='customers'&&match==='customer')match='name';if(v.kind==='opening'&&match==='name')match='customer';return '<label class="field">'+esc(h)+'<select name="map-'+i+'"><option value="">Алгасах</option>'+allowed.map(k=>'<option value="'+k+'" '+(k===match?'selected':'')+'>'+esc(({name:'Нэр',price:'Үнэ',stock:'Үлдэгдэл',customer:'Харилцагч',amount:'Дүн',reference:'Баримтын №',date:'Огноо',dueDate:'Төлөх өдөр',phone:'Утас',address:'Хаяг',code:'Код',unit:'Нэгж',cost:'Өртөг',warehouse:'Агуулах'})[k]||k)+'</option>').join('')+'</select></label>';}).join('');
      el('ux-save').textContent='Шалгах';return;
    }
    const p=importProgress;
    if(p.stage==='mapping'){
      const mapping=p.headers.map((h,i)=>v['map-'+i]||''),used=mapping.filter(Boolean);if(new Set(used).size!==used.length)throw new Error('Нэг талбарт хоёр багана сонгосон байна.');
      const required=p.kind==='products'?['name','price']:p.kind==='customers'?['name']:['customer','amount','date','dueDate','reference'];if(required.some(k=>!used.includes(k)))throw new Error('Заавал байх багана: '+required.join(', '));
      p.rows=p.raw.map(r=>Object.fromEntries(p.headers.flatMap((h,i)=>mapping[i]?[[mapping[i],r[h]]]:[])));
      const names=new Set(),codes=new Set();p.rows.forEach((r,i)=>{const name=String(r.name||r.reference||'').trim().toLowerCase();if(names.has(name))throw new Error((i+2)+'-р мөр: нэр эсвэл баримт давхардсан.');names.add(name);if(r.code&&codes.has(r.code))throw new Error((i+2)+'-р мөр: код давхардсан.');if(r.code)codes.add(r.code);});
      p.batches=Array.from({length:Math.ceil(p.rows.length/50)},(_,i)=>p.rows.slice(i*50,(i+1)*50));
      const key='datalinx-import:'+identity();let prior;try{prior=JSON.parse(localStorage.getItem(key)||'null');}catch{}
      p.progress=prior?.signature===signature&&JSON.stringify(prior.mapping)===JSON.stringify(mapping)?prior:{signature,mapping,next:0,ids:p.batches.map(()=>createClientId())};p.storageKey=key;
      for(let i=p.progress.next;i<p.batches.length;i++){const status=await api({action:'inspectRequest',requestId:p.progress.ids[i]});if(status.status==='Done'){p.progress.next=i+1;continue;}if(status.status!=='NotFound')throw new Error('Импортын өмнөх хүсэлт цуцлагдсан. Файлаа шалгана уу.');el('ux-import-progress').textContent='Шалгаж байна: '+Math.min((i+1)*50,p.rows.length)+' / '+p.rows.length;await api({action:'previewImport',kind:p.kind,rows:p.batches[i],clientId:p.progress.ids[i]});}
      el('ux-import-preview').innerHTML=uxImportTable(p.rows);el('ux-import-progress').textContent=p.rows.length+' мөр шалгагдлаа. Хадгалсан хэсэг: '+Math.min(p.progress.next*50,p.rows.length)+'.';p.stage='save';el('ux-form').querySelectorAll('[name=kind],[name=file],[name=paste],[name^=map-]').forEach(e=>e.disabled=true);el('ux-save').textContent=p.rows.length+' мөр хадгалах';return;
    }
    if(p.stage==='save'){
      // Persist IDs before sending; retries of an uncertain batch use the same journal key.
      localStorage.setItem(p.storageKey,JSON.stringify(p.progress));
      for(let i=p.progress.next;i<p.batches.length;i++){
        el('ux-import-progress').textContent='Хадгалж байна: '+Math.min(i*50,p.rows.length)+' / '+p.rows.length;
        await api({action:'importData',kind:p.kind,rows:p.batches[i],clientId:p.progress.ids[i]});p.progress.next=i+1;localStorage.setItem(p.storageKey,JSON.stringify(p.progress));
      }
      localStorage.removeItem(p.storageKey);dialog.close();toast(p.rows.length+' мөр хадгаллаа.','success');await refreshData(false);
    }
  }
  async function handle(action,value){
    if(action==='pdf-history')return openPdfDocument({documentId:value});
    if(action==='close'){if(!busy)dialog.close();return;}
    if(action==='walk-in'){el('saleCustomer').value='Энгийн худалдан авагч';saveDraft();return;}
    if(action==='restore-draft'){const d=JSON.parse(localStorage.getItem(draftKey())||'null');if(!hasDraft(d))return;state.saleCart=d.cart||[];Object.entries(d.fields||{}).forEach(([id,v])=>{if(el(id))el(id).value=v;});draftReady=true;el('ux-draft-banner').hidden=true;renderSaleCart();paymentSummary();return;}
    if(action==='discard-draft'){localStorage.removeItem(draftKey());draftReady=true;el('ux-draft-banner').hidden=true;return;}
    if(action==='quick-product'){openQuickProduct();return;}if(action==='new-sale'){showPage('sales');return;}if(action==='money'){showPage('money');return;}
    if(action==='sales-prev'||action==='sales-next'){salesPage=Math.max(0,salesPage+(action==='sales-prev'?-1:1));await loadSales();return;}
    if(action==='money-tab'){moneyTab(value);return;}
    if(action==='history'){await history(value);return;}
    if(action==='history-prev'||action==='history-next'){historyPage=Math.max(0,historyPage+(action==='history-prev'?-1:1));await history(historyResource,false);return;}
    if(action==='history-filter'){historyQuery={from:el('ux-form').elements.historyFrom.value,to:el('ux-form').elements.historyTo.value,query:el('ux-form').elements.historySearch.value};historyPage=0;await history(historyResource,false);return;}
    if(action==='business')return business();if(action==='customers')return customers();if(action==='customer-search')return customers(el('ux-form').elements.customerSearch.value);if(action==='customer')return customer(value);
    if(action==='export')return exportData();if(action==='plans')return service('plan');if(action==='support')return service('support');if(action==='requests')return requests();if(action==='import')return importWizard();
    if(action==='warehouse'){requireNew();modal('Агуулах нэмэх / засах','<p>Бүртгэлтэй нэрийг оруулбал хаяг, хариуцагчийг шинэчилнэ. Түүхтэй агуулахын нэрийг өөрчлөхгүй.</p>'+field('Агуулахын нэр','name','','text','required')+field('Хаяг','address')+field('Утас','phone','','tel')+field('Хариуцсан нярав','manager'),v=>write('saveWarehouse',v));return;}
    if(action==='customer-new'||action==='customer-edit'){
      requireNew();const c=action==='customer-edit'?(await api({action:'uxRead',kind:'customer',id:value})).customer:{};
      modal('Харилцагчийн мэдээлэл',field('Нэр','name',c['Харилцагчийн нэр']||'','text',c.CustomerID?'readonly':'required')+field('Утас','phone',c['Утас']||'','tel')+field('Хаяг','address',c['Хаяг']||'')+field('Регистр','registrationNumber',c['Регистрийн дугаар']||'')+field('Холбоо барих хүн','contactPerson',c['Холбоо барих хүн']||''),v=>write('saveCustomer',{...v,id:c.CustomerID||''}));return;
    }
    if(action==='customer-merge'){
      requireNew();const r=await api({action:'uxRead',kind:'customers',limit:100});const options=r.rows.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
      modal('Давхардсан харилцагч нэгтгэх','<p>Зөвхөн нэг харилцагчийн давхар бүртгэлийг сонгоно. Борлуулалт, эхний авлага, хүргэлтийг сонгосон нэрт шилжүүлж, хуучин нэрийг идэвхгүй болгоно. Засварын түүх үлдэнэ.</p><label class="field">Хуучин давхардсан нэр<select name="sourceId">'+options+'</select></label><label class="field">Үлдээх нэр<select name="targetId">'+options+'</select></label>'+field('Нэгтгэх шалтгаан','reason','','text','required'),v=>write('mergeCustomers',v),'Нэгтгэх');return;
    }
    if(action==='reopen-cash'){requireNew();modal('Касс дахин нээх','<p>Хуучин хаалт түүхэнд үлдэнэ. Засварын дараа дахин тоолж хаана.</p>'+field('Хаасан өдөр','date',today(),'date','required')+field('Шалтгаан','reason','','text','required'),v=>write('reopenCash',v));return;}
    if(action==='email-recovery'){
      const existing=document.querySelector('#reliability-form [name="username"]')?.value||'';document.getElementById('reliability-dialog')?.close();
      modal('Имэйлээр сэргээх код авах','<p>Өмнө нь баталгаажуулсан имэйлд код очно. Баталгаажуулаагүй бол менежер эсвэл <a href="./contact.html" target="_blank" rel="noopener">тусламжтай холбогдоно</a>.</p>'+field('Нэвтрэх нэр','username',existing,'text','required'),async v=>{const r=await api({action:'requestEmailRecovery',...v},false);dialog.close();toast(r.message,'success');document.querySelector('[data-reliable="recovery"]')?.click();},'Код авах');return;
    }
    if(action==='verify-email'){
      requireNew();modal('Сэргээх имэйл баталгаажуулах',field('Имэйл','email','','email','required')+field('Одоогийн нууц үг','password','','password','required autocomplete="current-password"'),async v=>{await api({action:'requestVerifyEmail',...v});modal('Имэйлийн код',field('Имэйлд ирсэн код','code','','text','required autocomplete="one-time-code"'),async values=>{const r=await api({action:'verifyEmail',...values});dialog.close();toast(r.message,'success');},'Баталгаажуулах');},'Код илгээх');return;
    }
    if(action==='correction'){
      modal('Алдаатай бүртгэлээ засах','<p>Анхны бүртгэл хадгалагдана. Засвар бүр шалтгаан, түүхтэй.</p><ol><li>Бараа, тоо буруу: «Буцаалт» → шаардлагатай бол зөв борлуулалт шинээр оруулна.</li><li>Дараа орсон төлөлт буруу: «Төлөлт засах» → алдаатай төлөлтийг сонгоно.</li><li>Төлөлт, буцаалт, хүргэлтгүй захиалга: «Захиалга цуцлах».</li><li>Мөнгө тушаасан эсвэл касс хаасан бол менежер/нягтлантай эхлээд тулгана.</li></ol>',null);return;
    }
  }
  function init(){
    dialog=document.createElement('dialog');dialog.id='ux-dialog';dialog.className='ops-dialog ux-dialog';dialog.innerHTML='<form id="ux-form"><header><h3 id="ux-title"></h3>'+button('Хаах','close')+'</header><div id="ux-body"></div><p id="ux-error" role="alert"></p><footer><button id="ux-save" class="btn btn-primary">Хадгалах</button></footer></form>';document.body.appendChild(dialog);
    dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
    el('ux-form').addEventListener('submit',async e=>{e.preventDefault();if(!submit||busy)return;busy=true;el('ux-save').disabled=true;el('ux-error').textContent='';try{if(modalOwner!==identity())throw new Error('Нэвтрэх эрх өөрчлөгдсөн.');if(!navigator.onLine)throw new Error('Энэ үйлдэлд интернэт хэрэгтэй.');await submit(Object.fromEntries(new FormData(e.target)));}catch(error){el('ux-error').textContent=error.message;}finally{busy=false;el('ux-save').disabled=false;}});
    document.addEventListener('click',e=>{
      const old=e.target.closest('[data-reliable="import"]');if(old&&supported()){e.preventDefault();e.stopImmediatePropagation();void importWizard().catch(err=>toast(err.message,'error'));return;}
      const b=e.target.closest('[data-ux]');if(!b||busy)return;e.preventDefault();void Promise.resolve(handle(b.dataset.ux,b.dataset.value)).catch(err=>toast(err.message,'error'));
    },true);
    el('registerBtn').insertAdjacentHTML('afterend','<p class="field-hint">Эхний 1 сар үнэгүй. Дараа нь Business 24,900₮/сар эсвэл Pro 59,900₮/сар. Автомат суутгалгүй.</p><p><a href="./terms.html" target="_blank" rel="noopener">Үйлчилгээний нөхцөл</a> · <a href="./privacy.html" target="_blank" rel="noopener">Нууцлал</a></p>');
    window.addEventListener('beforeunload',e=>{if(identity()&&draftReady&&hasDraft(readDraft())){saveDraft();e.preventDefault();e.returnValue='';}});
    window.addEventListener('pagehide',saveDraft);
    if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
    setup();
  }
  const apply=applyPayload;applyPayload=function(data,reset){apply(data,reset);setup();if(supported()&&document.querySelector('#page-sales.active')&&!el('appScreen').classList.contains('hidden'))void loadSales();};
  const render=renderAll;renderAll=function(){render();setup();organizeMoney();};
  const cart=renderSaleCart;renderSaleCart=function(){cart();paymentSummary();saveDraft();};
  const product=updateSaleProduct;updateSaleProduct=function(){product();paymentSummary();};
  const page=showPage;showPage=function(name,...args){const result=page(name,...args);if(state.session&&supported()){if(name==='sales')void loadSales();if(name==='dashboard')void report();}return result;};
  const app=showApp;showApp=function(){app();if(location.hash.startsWith('#plans-')){showPage('settings');if(supported()){service('plan');el('ux-form').elements.plan.value=location.hash==='#plans-pro'?'Pro':'Business';}}};
  const out=logout;logout=function(){saveDraft();owner='';draftReady=false;latestOperations=null;if(dialog?.open)dialog.close();out();el('saleForm')?.reset();};
  const detail=openSaleDetail;openSaleDetail=function(id){detail(id);if(state.selectedSale)el('saleDetailBody').insertAdjacentHTML('beforeend',button('Алдаа засах заавар','correction'));};
  const pdf=openPdfDocument;openPdfDocument=async function(info,downloadAfter=false){
    if(!supported())return pdf(info,downloadAfter);
    try{const r=await api({action:'downloadPdf',documentId:info.documentId});const binary=atob(r.base64),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));download(r.fileName,new Blob([bytes],{type:'application/pdf'}));toast('PDF татлаа. Файлаа нээж хэвлэж болно.','success');}catch(e){toast(e.message,'error');}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
