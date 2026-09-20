'use strict';
function parseImportCsv(text){
  const rows=[];let row=[],cell='',quoted=false,closed=false;
  text=String(text).replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;}
    else if(c==='"'){if(cell||closed)throw new Error('CSV хашилт буруу байна.');quoted=true;}
    else if(c===','||c==='\n'||c==='\r'){
      row.push(cell);cell='';closed=false;
      if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(x=>x!==''))rows.push(row);row=[];}
    }else{if(closed)throw new Error('CSV хашилтын дараах тэмдэг буруу байна.');cell+=c;}
  }
  if(quoted)throw new Error('CSV хашилт хаагдаагүй.');
  row.push(cell);if(row.some(x=>x!==''))rows.push(row);
  if(rows.length<2||rows.length>51)throw new Error('Толгой мөрөөс гадна 1–50 мөр оруулна уу.');
  const headers=rows.shift().map(x=>x.trim());if(new Set(headers).size!==headers.length||headers.some(h=>!h))throw new Error('Баганын нэр хоосон эсвэл давхардсан.');
  return rows.map((r,i)=>{if(r.length!==headers.length)throw new Error((i+2)+'-р мөрийн баганын тоо зөрсөн.');return Object.fromEntries(headers.map((h,j)=>[h,r[j]]));});
}
(function installReliability(){
  const el=id=>document.getElementById(id),esc=escapeHtml;
  const identity=()=>`${state.session?.user?.company}|${state.session?.user?.username}|${state.session?.token}`;
  const manager=()=>['manager','admin'].includes(state.session?.user?.role);
  const finance=()=>manager()||state.session?.user?.role==='accountant';
  const button=(label,action,id='')=>`<button class="btn btn-secondary" type="button" data-reliable="${esc(action)}" data-id="${esc(id)}">${esc(label)}</button>`;
  const field=(label,name,type='text',value='',attrs='')=>`<label class="field">${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
  const select=(label,name,values)=>`<label class="field">${esc(label)}<select name="${name}">${values.map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select></label>`;
  const dialog=document.createElement('dialog');dialog.id='reliability-dialog';dialog.className='ops-dialog';
  dialog.innerHTML='<form id="reliability-form"><header><h3 id="reliability-title"></h3><button type="button" class="btn btn-neutral" data-reliable="close" aria-label="Хаах">×</button></header><div id="reliability-body"></div><p id="reliability-error" role="alert"></p><footer><button class="btn btn-primary" id="reliability-submit">Үргэлжлүүлэх</button></footer></form>';
  document.body.appendChild(dialog);let submit=null,busy=false,formOwner='',requestId='';
  function modal(title,html,callback){formOwner=identity();requestId=createClientId();submit=callback;el('reliability-title').textContent=title;el('reliability-body').innerHTML=html;el('reliability-error').textContent='';el('reliability-submit').hidden=!callback;dialog.showModal();}
  function done(message){dialog.close();toast(message||'Хадгаллаа.','success');}
  async function api(payload,include=true){const result=await postAction(payload,include);if(!result.success)throw new Error(result.message||'Хүсэлт амжилтгүй.');return result;}
  async function operation(action,values){await api({...values,action,clientId:requestId});done();await refreshData(false);window.refreshReliabilityOperations?.();}
  el('reliability-form').addEventListener('submit',async e=>{e.preventDefault();if(busy||!submit)return;busy=true;el('reliability-submit').disabled=true;try{if(formOwner!==identity())throw new Error('Нэвтрэх эрх өөрчлөгдсөн. Дахин нээнэ үү.');if(!navigator.onLine)throw new Error('Интернэт холболт шаардлагатай.');await submit(Object.fromEntries(new FormData(e.target)));}catch(error){el('reliability-error').textContent=error.message;}finally{busy=false;el('reliability-submit').disabled=false;}});
  dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
  el('loginForm').insertAdjacentHTML('afterend',button('Нууц үг сэргээх','recovery'));
  const settings=document.createElement('section');settings.id='reliability-settings';settings.className='card';el('page-settings').appendChild(settings);
  let currentData=null;
  window.renderReliability=function(data){
    currentData=data||currentData;
    if(!state.session||!state.reliabilityVersion){settings.innerHTML='';return;}
    const build=window.DATALINX_BUILD_INFO||{};
    const companyId=state.session?.company?.id||state.session?.user?.companyId||'—';
    const releaseInfo=[
      ['Frontend',typeof DATALINX_FRONTEND_RELEASE==='string'?DATALINX_FRONTEND_RELEASE:(build.sourceRelease||'—')],
      ['Backend',state.backendRelease||'—'],
      ['Schema',String(state.schemaVersion||'—')],
      ['Company ID',companyId],
      ['Commit',build.commitRef?String(build.commitRef).slice(0,12):'manual / unknown'],
      ['Deploy',build.deployId?String(build.deployId).slice(0,12):'—'],
      ['Queue',String(pendingQueueCount())],
      ['Network',navigator.onLine?'Online':'Offline']
    ].map(([k,v])=>`<div class="info-row"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('');
    settings.innerHTML=`<h3>Хамгаалалт ба мэдээлэл</h3><div class="ops-actions">${button('Нууц үг солих','password')}${button('Бүх төхөөрөмжөөс гарах','logout-all')}${manager()?button('Ажилтны нууц үг сэргээх','issue-recovery')+button('CSV импорт','import')+button('Нөөцлөлт шалгах','backups'):''}</div><p>PDF хувийн эрхээр үүснэ. Нээх Google эрхийг DataLinx оператор тохируулна.</p><details><summary>Системийн оношлогоо</summary><div class="info-box">${releaseInfo}</div>${state.storageWarning?`<p role="alert"><strong>${esc(state.storageWarning)}</strong></p>`:''}</details>`;
    let panel=el('reliability-more');if(!panel&&el('ops-more')){panel=document.createElement('section');panel.id='reliability-more';panel.className='card';el('ops-more').appendChild(panel);}
    if(panel)panel.innerHTML=`<h3>Бүртгэлээ шалгах</h3><div class="ops-actions">${button('Утасны бүртгэл шалгах','queue')}${button('Утасны бүртгэл татах','export-queue')}${manager()?button('CSV импорт','import'):''}${['manager','admin','warehouse'].includes(state.session.user.role)?button('Тооллого тулгах','stocktake'):''}</div>`;
    let credits=el('reliability-credits');if(!credits&&el('ops-money')){credits=document.createElement('section');credits.id='reliability-credits';credits.className='card';el('ops-money').appendChild(credits);}
    if(credits){credits.hidden=!finance();credits.innerHTML='<h3>Авлагаас хасах зөвшөөрөл</h3>'+((currentData?.pendingCredits||[]).map(r=>`<div class="ops-row"><div><strong>${esc(r['Бараа'])} · ${money(r['Дүн'])}</strong><small>${esc(r['Шалтгаан'])}</small></div>${button('Шийдвэрлэх','approve-return',r.ReturnID)}</div>`).join('')||'<p>Хүлээгдэж буй зөвшөөрөл алга.</p>');}
  };
  const originalRender=renderAll;renderAll=function(){originalRender();window.renderReliability();};
  const originalPayload=applyPayload;applyPayload=function(data,reset){state.reliabilityVersion=Number(data.reliabilityVersion||0);originalPayload(data,reset);window.renderReliability();};
  const originalDetail=openSaleDetail;openSaleDetail=function(id){originalDetail(id);if(state.reliabilityVersion&&finance()){el('saleDetailBody').insertAdjacentHTML('beforeend',`<div class="ops-actions">${button('Төлөлт засах','payments',id)}${manager()?button('Захиалга цуцлах','cancel-sale',id):''}</div>`);}};
  const originalLogout=logout;logout=function(){dialog.close();currentData=null;state.reliabilityVersion=0;originalLogout();};
  function ownQueue(){return getQueue().filter(q=>q.username===state.session?.user?.username&&queueBelongsToCurrent_(q));}
  function exportQueue(){const safe=ownQueue().map(q=>{const copy=JSON.parse(JSON.stringify(q));delete copy.payload.token;return copy;});const blob=new Blob([JSON.stringify(safe,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='datalinx-pending-records.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function cancelQueue(item,reason,replacement){
    if(state.syncing)throw new Error('Илгээж байна. Дууссаны дараа дахин оролдоно уу.');
    state.syncing=true;
    try{
      const result=await api({action:'cancelRequest',requestId:item.id,reason});
      if(result.status==='Done'){removeQueueItem(item.id);done('Сервер дээр хадгалагдсан байна. Мэдээллийг шинэчиллээ.');await refreshData(false);return;}
      if(result.status!=='Cancelled')throw new Error('Цуцлалтыг баталгаажуулж чадсангүй.');
      const archiveKey='datalinx-queue-archive:'+(currentCompanyId_()||currentCompanyName_())+':'+state.session.user.username;
      let archive=[];try{archive=JSON.parse(localStorage.getItem(archiveKey)||'[]');}catch{}
      archive.push({...item,cancelledAt:new Date().toISOString(),reason});localStorage.setItem(archiveKey,JSON.stringify(archive));
      const queue=getQueue(),index=queue.findIndex(q=>q.id===item.id);
      if(index<0)throw new Error('Утасны бүртгэл өөрчлөгдсөн. Шинэчлээд шалгана уу.');
      if(replacement){const id=createClientId();queue[index]={...item,id,failed:false,error:'',payload:{...replacement,clientId:id}};}else queue.splice(index,1);
      saveQueue(queue);rebuildOptimisticState();renderAll();done(replacement?'Зассан бүртгэл илгээхэд бэлэн боллоо.':'Цуцаллаа. Түүх утсанд хадгалагдсан.');
    }finally{state.syncing=false;}
    if(replacement)await syncOfflineQueue();
  }
  document.addEventListener('click',async event=>{
    const b=event.target.closest('[data-reliable]');if(!b||busy)return;
    const action=b.dataset.reliable,id=b.dataset.id;
    try{
      if(action==='close'){dialog.close();return;}
      if(action==='recovery')return modal('Нууц үг сэргээх','<p>Компанийн менежерээс нэг удаагийн код авна. Компанийн эзэн бол DataLinx-тэй холбогдоно.</p>'+field('Хэрэглэгчийн нэр','username','text','','required autocomplete="username"')+field('Сэргээх код','code','password','','required autocomplete="off"')+field('Шинэ нууц үг · 12+ тэмдэгт','newPassword','password','','required minlength="12" autocomplete="new-password"'),async v=>{await api({action:'completeRecovery',...v},false);done('Нууц үг шинэчлэгдлээ. Нэвтэрнэ үү.');});
      if(!state.reliabilityVersion)throw new Error('Серверийн шинэ хувилбар шаардлагатай.');
      if(action==='password')return modal('Нууц үг солих',field('Одоогийн нууц үг','currentPassword','password','','required autocomplete="current-password"')+field('Шинэ нууц үг · 12+ тэмдэгт','newPassword','password','','required minlength="12" autocomplete="new-password"'),async v=>{await api({action:'changePassword',...v});done('Нууц үг шинэчлэгдлээ.');logout();});
      if(action==='logout-all')return modal('Бүх төхөөрөмжөөс гарах','<p>Бүх төхөөрөмж дахин нэвтрэх шаардлагатай болно. Утсанд хадгалсан илгээгдээгүй бүртгэл үлдэнэ.</p>',async()=>{await api({action:'logout',all:true});logout();});
      if(action==='issue-recovery')return modal('Ажилтанд сэргээх код өгөх',field('Хэрэглэгчийн нэр','username','text','','required'),async v=>{const r=await api({action:'issueRecovery',...v});el('reliability-body').innerHTML='<p>Энэ кодыг 30 минутын дотор хэрэглэнэ. Хэрэглэгчийг таньж баталгаажуулсны дараа хувийн сувгаар өгнө.</p>'+field('Нэг удаагийн код','recoveryCode','text',r.code,'readonly');el('reliability-submit').hidden=true;submit=null;});
      if(action==='approve-return')return modal('Авлагаас хасах шийдвэр',select('Шийдвэр','decision',[['approve','Зөвшөөрөх'],['reject','Татгалзах']])+field('Шалтгаан','reason','text','','required'),v=>operation('approveReturn',{returnId:id,...v}));
      if(action==='cancel-sale')return modal('Захиалга цуцлах','<p>Төлөлт, буцаалт, хүргэлтгүй захиалгыг менежер цуцална. Бараа буцаж нэмэгдэж, засварын түүх хадгалагдана.</p>'+field('Шалтгаан','reason','text','','required'),v=>operation('cancelSale',{saleId:id,...v}));
      if(action==='payments'){
        const r=await api({action:'operations',saleId:id}),payments=r.sale.payments.filter(p=>p.source==='incremental'&&!r.sale.payments.some(x=>x.reversalOf===p.paymentId));
        if(!payments.length)throw new Error('Засах шинэ төлөлт алга.');
        return modal('Төлөлтийн эсрэг бичилт',select('Алдаатай төлөлт','paymentId',payments.map(p=>[p.paymentId,formatDate(p.date)+' · '+money(p.amount)+' · '+p.method]))+field('Шалтгаан','reason','text','','required'),v=>operation('reversePayment',v));
      }
      if(action==='stocktake')return modal('Тооллогын зөрүү тулгах',select('Бараа','product',state.products.map(p=>[p.name,p.name]))+select('Агуулах','warehouse',state.warehouses.map(w=>[w.name,w.name]))+field('Бүртгэлд байгаа үлдэгдэл','expected','number','','required min="0" step="any"')+field('Бодитоор тоолсон үлдэгдэл','counted','number','','required min="0" step="any"')+field('Нэмэгдэл барааны дуусах өдөр (мэдэгдэж байвал)','expiryDate','date')+field('Зөрүүний шалтгаан','reason','text','','required'),v=>operation('stocktake',v));
      if(action==='export-queue'){exportQueue();return;}
      if(action==='queue')return modal('Утасны илгээгдээгүй бүртгэл',ownQueue().map(q=>`<section class="card"><strong>${esc(q.payload.customer||q.payload.product||q.action)}</strong><p>${esc(q.error||'Илгээхийг хүлээж байна')}</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(JSON.stringify(q.payload,null,2))}</pre><div class="ops-actions">${button('Засах','edit-queue',q.id)}${button('Цуцлах','cancel-queue',q.id)}</div></section>`).join('')||'<p>Илгээгдээгүй бүртгэл алга.</p>',null);
      if(action==='cancel-queue'||action==='edit-queue'){
        const item=ownQueue().find(q=>q.id===id);if(!item)throw new Error('Бүртгэл олдсонгүй.');
        let html=field('Шалтгаан','reason','text','','required');
        if(action==='edit-queue'){
          if(!['addSale','addInventoryMove'].includes(item.action))throw new Error('Энэ бүртгэлийг засахгүй.');
          const p=item.payload;html+=item.action==='addSale'?field('Харилцагч','customer','text',p.customer,'required')+(p.items||[p]).map((i,n)=>`<fieldset><legend>${esc(i.product)}</legend>${field('Тоо','qty'+n,'number',i.quantity,'required min="0.000001" step="any"')}${field('Үнэ','price'+n,'number',i.unitPrice,'required min="0" step="any"')}</fieldset>`).join(''):field('Тоо','quantity','number',p.quantity,'required min="0.000001" step="any"');
        }
        return modal(action==='edit-queue'?'Илгээгдээгүй бүртгэл засах':'Илгээгдээгүй бүртгэл цуцлах',html,async v=>{
          let replacement=null;
          if(action==='edit-queue'){replacement=JSON.parse(JSON.stringify(item.payload));if(item.action==='addSale'){replacement.customer=v.customer;replacement.items=(replacement.items||[replacement]).map((i,n)=>({...i,quantity:Number(v['qty'+n]),unitPrice:Number(v['price'+n])}));}else replacement.quantity=Number(v.quantity);}
          await cancelQueue(item,v.reason,replacement);
        });
      }
      if(action==='import'){
        let parsed=null,kind='',checked='';
        return modal('CSV файлаар эхний мэдээлэл оруулах','<p>Шинэ мөр нэмнэ. Нэг удаад 50 хүртэл мөр. Эхлээд загвар татаж бөглөөд, файлыг шалгана.</p><p><a href="./templates/products.csv" download>Барааны загвар</a> · <a href="./templates/customers.csv" download>Харилцагчийн загвар</a> · <a href="./templates/opening.csv" download>Эхний авлагын загвар</a></p>'+select('Төрөл','kind',[['products','Бараа ба эхний үлдэгдэл'],['customers','Харилцагч'],['opening','Эхний авлага']])+field('CSV файл','file','file','','required accept=".csv,text/csv"')+'<div id="import-preview"></div>',async v=>{
          const file=el('reliability-form').elements.file.files[0];if(!file||file.size>150000)throw new Error('150 KB хүртэл CSV файл сонгоно уу.');
          const text=await file.text(),signature=v.kind+'|'+text;
          if(checked===signature&&parsed)return operation('importData',{kind,rows:parsed});
          parsed=parseImportCsv(text);kind=v.kind;
          const allowed={products:['name','code','price','stock','unit','warehouse','threshold','packName','packSize','expiryDate'],customers:['name','phone','address','registrationNumber','contactPerson'],opening:['customer','amount','date','dueDate','reference']};
          if(Object.keys(parsed[0]).some(k=>!allowed[kind].includes(k)))throw new Error('Загварын баганын нэрийг өөрчлөхгүй.');
          await api({action:'previewImport',kind,rows:parsed,clientId:requestId});checked=signature;
          el('import-preview').innerHTML=`<p><strong>${parsed.length} мөр шалгагдлаа.</strong> Доорх мэдээллийг шалгаад дахин «Үргэлжлүүлэх» дарж хадгална.</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(JSON.stringify(parsed,null,2))}</pre>`;
        });
      }
      if(action==='backups'){
        const r=await api({action:'backupStatus'});
        return modal('Нөөцлөлтийн байдал',`<p>Автомат нөөцлөлт: <strong>${r.scheduled?'Тохируулсан':'Оператор идэвхжүүлээгүй'}</strong></p><p>Нөөц нь хувийн Drive хуулбар. Сэргээх шалгалт тусдаа хуулбар дээр явагдана.</p>${button('Одоо нөөцлөх','backup-now')}${r.backups.map(b=>`<section class="card"><strong>${esc(formatDate(b.createdAt))}</strong><p>${esc(b.status==='Verified'?'Хуулбар тулгаж баталгаажсан':'Нөөцлөлт амжилтгүй')} ${esc(b.error)}</p>${b.restoreTestAt?'<p>Сэргээх шалгалт: '+esc(formatDate(b.restoreTestAt))+'</p>':''}${b.status==='Verified'?button('Сэргээхийг турших','restore-test',b.id):''}</section>`).join('')||'<p>Нөөцийн бүртгэл алга.</p>'}`,null);
      }
      if(action==='backup-now')return modal('Одоо нөөцлөх','<p>Компанийн хүснэгтийн хувийн хуулбар үүсгэнэ. Том хүснэгтэд хэдэн минут шаардлагатай байж болно.</p>',async()=>{await api({action:'createBackup'});done('Нөөц хуулбар үүсгэж, өгөгдлийг тулгалаа.');});
      if(action==='restore-test')return modal('Нөөцөөс сэргээхийг турших','<p>Тусдаа хувийн хуулбар нээж бүх хүснэгтийг тулгана. Ажиллаж буй бүртгэл солигдохгүй.</p>',async()=>{const r=await api({action:'testRestore',backupId:id});done(r.message);});
    }catch(error){toast(error.message,'error');}
  });
})();
