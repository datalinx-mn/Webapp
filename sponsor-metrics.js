'use strict';
(function(){
  const seen=new Set(),timers=new WeakMap();
  function send(ad,placement,event){
    if(!state.reliabilityVersion||!isFreePlan()||!navigator.onLine)return;
    void postAction({action:'sponsorEvent',adId:ad,placement,event,eventId:createClientId()}).catch(()=>{});
  }
  window.observeSponsor=function(slot,ad,placement){
    if(!ad.id||!window.IntersectionObserver)return;
    const link=slot.querySelector('.sponsor-ad');if(!link)return;
    link.addEventListener('click',()=>send(ad.id,placement,'click'),{once:true});
    observer.observe(link);link.dataset.metricAd=ad.id;link.dataset.metricPlacement=placement;
  };
  const observer=window.IntersectionObserver?new IntersectionObserver(entries=>{
    entries.forEach(e=>{clearTimeout(timers.get(e.target));if(!e.isIntersecting||e.intersectionRatio<0.5||document.visibilityState!=='visible')return;
      timers.set(e.target,setTimeout(()=>{if(!e.target.isConnected||document.visibilityState!=='visible'||e.target.closest('.page')?.classList.contains('active')===false)return;
        const ad=e.target.dataset.metricAd,placement=e.target.dataset.metricPlacement,key=new Date().toISOString().slice(0,10)+'|'+ad+'|'+placement;
        if(!seen.has(key)){seen.add(key);send(ad,placement,'impression');}observer.unobserve(e.target);
      },1000));
    });
  },{threshold:[0,0.5]}):null;
})();
