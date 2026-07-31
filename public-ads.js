'use strict';

(function () {
  const config = window.DATALINX_ADSENSE_CONFIG || {};
  const client = String(config.client || '').trim();
  const slotId = String(config.publicSlot || '').trim();
  const slot = document.querySelector('[data-public-ad-slot]');
  const pageLanguage = String(document.documentElement.lang || '').toLowerCase().split('-')[0];
  const languageAllowed = Array.isArray(config.supportedLanguages) && config.supportedLanguages.includes(pageLanguage);
  const configured = config.enabled === true && languageAllowed && /^ca-pub-\d{10,}$/.test(client) && /^\d{6,}$/.test(slotId);

  function setupResponsiveNavStyle() {
    if (document.getElementById('datalinxPublicResponsiveStyle')) return;
    const style = document.createElement('style');
    style.id = 'datalinxPublicResponsiveStyle';
    style.textContent = `
      @media (max-width: 980px) {
        .nav-links {
          display: none;
          position: absolute;
          left: 16px;
          right: 16px;
          top: 76px;
          padding: 14px;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: #fff;
          box-shadow: var(--shadow);
          flex-direction: column;
          align-items: stretch;
        }
        .nav-links.open { display: flex; }
        .nav-actions .btn-secondary { display: none; }
        .menu-toggle { display: block; }
      }
      @media (max-width: 560px) {
        .sponsor-ad {
          grid-template-columns: 46px minmax(0, 1fr) !important;
        }
        .sponsor-ad > strong:last-child {
          grid-column: 2;
        }
      }
    `;
    document.head.appendChild(style);
  }

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
    document.addEventListener('click', event => {
      if (!menu.classList.contains('open')) return;
      if (menu.contains(event.target) || button.contains(event.target)) return;
      menu.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
    });
  }

  function ensureTrustLinks() {
    const groups = Array.from(document.querySelectorAll('.footer-links'));
    const infoGroup = groups.find(group => {
      const title = group.querySelector('strong');
      return title && /Мэдээлэл|Бодлого/.test(title.textContent || '');
    });
    if (!infoGroup) return;

    const links = [
      ['./about.html', 'Бидний тухай'],
      ['./contact.html', 'Холбоо барих'],
      ['./privacy.html', 'Нууцлалын бодлого'],
      ['./terms.html', 'Үйлчилгээний нөхцөл'],
      ['./ads-and-cookies.html', 'Зар ба cookie']
    ];

    links.forEach(([href, label]) => {
      if (infoGroup.querySelector(`a[href="${href}"]`)) return;
      const link = document.createElement('a');
      link.href = href;
      link.textContent = label;
      infoGroup.appendChild(link);
    });
  }

  function showSponsor() {
    if (!slot) return;
    slot.innerHTML = '<a class="sponsor-ad" href="https://www.facebook.com/DataLinxMN" target="_blank" rel="noopener sponsored" style="width:100%;display:grid;grid-template-columns:52px 1fr auto;align-items:center;gap:14px;padding:16px;text-decoration:none;color:inherit"><span class="brand-mark">DL</span><span><strong style="display:block">DataLinx · Жижиг бизнесийн дижитал шийдэл</strong><small style="display:block;color:#627067;margin-top:3px">Google Sheets, AppSheet болон бизнесийн автоматжуулалтын үйлчилгээ.</small></span><strong style="color:#155D2A">Дэлгэрэнгүй ›</strong></a>';
  }

  function loadAds() {
    if (!slot) return;
    if (!configured) {
      showSponsor();
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    script.onload = () => {
      slot.innerHTML = `<ins class="adsbygoogle" style="display:block;width:100%" data-ad-client="${client}" data-ad-slot="${slotId}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
      catch { showSponsor(); }
    };
    script.onerror = () => showSponsor();
    document.head.appendChild(script);
  }

  setupResponsiveNavStyle();
  setupMenu();
  ensureTrustLinks();
  loadAds();
})();