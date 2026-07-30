'use strict';

(function () {
  const config = window.DATALINX_ADSENSE_CONFIG || {};
  const client = String(config.client || '').trim();
  const slotId = String(config.publicSlot || '').trim();
  const slot = document.querySelector('[data-public-ad-slot]');
  const configured = /^ca-pub-\d{10,}$/.test(client) && /^\d{6,}$/.test(slotId);

  function setupMenu() {
    const button = document.querySelector('[data-menu-toggle]');
    const menu = document.querySelector('[data-nav-links]');
    if (!button || !menu) return;
    button.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      button.setAttribute('aria-expanded', String(open));
    });
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      menu.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
    }));
  }

  function showPlaceholder(message) {
    if (!slot) return;
    slot.innerHTML = `<div class="public-ad-placeholder">${message}</div>`;
  }

  function loadAds() {
    if (!slot) return;
    if (!configured) {
      showPlaceholder('AdSense баталгаажсаны дараа энэ хэсэгт responsive зар харагдана.');
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    script.onload = () => {
      slot.innerHTML = `<ins class="adsbygoogle" style="display:block;width:100%" data-ad-client="${client}" data-ad-slot="${slotId}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
      catch { showPlaceholder('Зар түр ачаалсангүй. Дараа дахин оролдоно уу.'); }
    };
    script.onerror = () => showPlaceholder('Зар түр ачаалсангүй.');
    document.head.appendChild(script);
  }

  setupMenu();
  loadAds();
})();
