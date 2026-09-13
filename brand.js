'use strict';
(function(){
  const key='datalinx-large-text';
  function apply(large){document.body.classList.toggle('large-text',large);document.querySelectorAll('[data-text-size]').forEach(b=>{b.setAttribute('aria-pressed',String(large));b.textContent=large?'Аа · Хэвийн үсэг':'Аа · Үсэг томруулах';});}
  function init(){
    let large=false;try{large=localStorage.getItem(key)==='1';}catch(_){}apply(large);
    document.addEventListener('click',e=>{if(!e.target.closest('[data-text-size]'))return;const next=!document.body.classList.contains('large-text');apply(next);try{localStorage.setItem(key,next?'1':'0');}catch(_){}});
    document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const menu=document.querySelector('[data-nav-links].open');if(menu){menu.classList.remove('open');const b=document.querySelector('[data-menu-toggle]');b?.setAttribute('aria-expanded','false');b?.focus();}});
    const main=document.querySelector('main');if(main&&document.body.classList.contains('public-page')){main.id=main.id||'main-content';main.tabIndex=-1;const skip=document.createElement('a');skip.href='#'+main.id;skip.className='skip-link';skip.textContent='Үндсэн хэсэг рүү очих';document.body.prepend(skip);}
    const examples={
      today:'<h3>Өнөөдөр ямар ажил байна?</h3><div class="demo-total"><span>Борлуулсан дүн</span><strong>128,000 ₮</strong><span>4 борлуулалт · жишээ мэдээлэл</span></div><div class="demo-line"><span>Хүргэх захиалга<small>Харилцагчдаа хүргэж өгөх</small></span><b class="demo-tag">2 захиалга</b></div><div class="demo-line"><span>Авах мөнгө<small>Төлбөрийн үлдэгдэл</small></span><b>35,000 ₮</b></div>',
      stock:'<h3>Юу дуусаж байна?</h3><div class="demo-total"><span>Барааны үлдэгдэл</span><strong>3 төрлийн бараа</strong><span>Жишээ дэлгүүрийн бүртгэл</span></div><div class="demo-line"><span>Талх<small>Үндсэн агуулах</small></span><b class="demo-tag warn">4 ширхэг</b></div><div class="demo-line"><span>Сүү / Боов<small>Үндсэн агуулах</small></span><b>12 / 20 ш</b></div>',
      money:'<h3>Хэнээс мөнгө авах вэ?</h3><div class="demo-total"><span>Авах нийт мөнгө</span><strong>35,000 ₮</strong><span>2 харилцагч · жишээ мэдээлэл</span></div><div class="demo-line"><span>Нархан дэлгүүр<small>Үлдэгдэл төлбөр</small></span><b>20,000 ₮</b></div><div class="demo-line"><span>Өглөө дэлгүүр<small>Үлдэгдэл төлбөр</small></span><b>15,000 ₮</b></div>'};
    document.querySelectorAll('[data-demo]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-demo]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.getElementById('demo-content').innerHTML=examples[b.dataset.demo];}));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
