from pathlib import Path
import re

INDEX = Path('index.html')
CODE = Path('Code.gs')
DOC = Path('GOOGLE_ADS_PREMIUM_SETUP.md')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label, flags=0):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 regex match, found {count}')
    return updated


html = INDEX.read_text(encoding='utf-8')
code = CODE.read_text(encoding='utf-8')

# ---------------------------------------------------------------------------
# index.html — polished ads, Free/Premium plan UI, lazy AdSense integration.
# ---------------------------------------------------------------------------

new_ad_css = r'''    /* Ad-supported Free plan + Premium no-ads */
    .ad-slot { margin: 0 0 14px; }
    .ad-slot.hidden { display: none !important; }
    .ad-shell {
      overflow: hidden;
      border: 1px solid #D7E1D8;
      border-radius: 18px;
      background: #FFFFFF;
      box-shadow: 0 5px 18px rgba(19,52,22,.055);
    }
    .ad-shell-head {
      min-height: 38px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 8px 12px;
      border-bottom: 1px solid #EDF1ED;
      background: #FAFCFA;
    }
    .ad-disclosure {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #617064;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .055em;
      text-transform: uppercase;
    }
    .ad-disclosure::before {
      content: '';
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #2E7D32;
      box-shadow: 0 0 0 3px #E8F5E9;
    }
    .ad-info-button {
      min-height: 30px;
      padding: 4px 8px;
      border: 0;
      border-radius: 9px;
      background: transparent;
      color: var(--green);
      font-size: 11px;
      font-weight: 850;
    }
    .ad-info-button:hover { background: var(--green-soft); }
    .google-ad-surface {
      min-height: 112px;
      display: grid;
      place-items: center;
      padding: 8px;
      background: #FFFFFF;
    }
    .google-ad-surface .adsbygoogle { width: 100%; min-height: 90px; }
    .ad-loading {
      width: 100%;
      min-height: 88px;
      display: grid;
      place-items: center;
      color: var(--muted);
      font-size: 12px;
      background: linear-gradient(90deg, #FAFCFA 25%, #F1F5F1 50%, #FAFCFA 75%);
      background-size: 220% 100%;
      animation: adShimmer 1.5s linear infinite;
    }
    @keyframes adShimmer { to { background-position: -220% 0; } }

    .sponsor-ad {
      min-height: 94px;
      display: grid;
      grid-template-columns: 64px minmax(0, 1fr) auto;
      align-items: center;
      gap: 13px;
      padding: 14px;
      color: inherit;
      text-decoration: none;
      background: linear-gradient(135deg, #FFFFFF, #FBFDFB);
      transition: background .15s, transform .15s;
    }
    .sponsor-ad:hover { background: #F7FBF7; }
    .sponsor-ad:active { transform: scale(.997); }
    .sponsor-ad-image,
    .sponsor-ad-placeholder {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: var(--green-soft);
    }
    .sponsor-ad-image { object-fit: cover; }
    .sponsor-ad-placeholder {
      display: grid;
      place-items: center;
      color: var(--green);
      font-weight: 950;
      font-size: 20px;
    }
    .sponsor-ad-copy { min-width: 0; }
    .sponsor-ad-copy strong {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 15px;
    }
    .sponsor-ad-copy small {
      display: -webkit-box;
      margin-top: 5px;
      overflow: hidden;
      color: var(--muted);
      line-height: 1.4;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .sponsor-ad-action {
      min-height: 40px;
      display: inline-flex;
      align-items: center;
      padding: 8px 11px;
      border-radius: 11px;
      background: var(--green-soft);
      color: var(--green);
      font-weight: 900;
      white-space: nowrap;
    }

    .plan-card {
      position: relative;
      overflow: hidden;
      display: grid;
      grid-template-columns: 58px minmax(0,1fr) auto;
      align-items: center;
      gap: 14px;
      border-color: #CFE0D1;
      background: linear-gradient(135deg, #FFFFFF 0%, #F4FAF5 100%);
    }
    .plan-card::after {
      content: '';
      position: absolute;
      right: -34px;
      bottom: -56px;
      width: 150px;
      height: 150px;
      border-radius: 50%;
      background: rgba(46,125,50,.055);
      pointer-events: none;
    }
    .plan-icon {
      width: 58px;
      height: 58px;
      display: grid;
      place-items: center;
      border-radius: 17px;
      background: var(--green-soft);
      color: var(--green);
      font-size: 25px;
      font-weight: 950;
    }
    .plan-copy { min-width: 0; position: relative; z-index: 1; }
    .plan-copy h3 { margin: 3px 0 5px; }
    .plan-copy p { margin: 0; color: var(--muted); line-height: 1.5; }
    .plan-eyebrow { color: var(--green); font-size: 11px; font-weight: 900; letter-spacing: .04em; text-transform: uppercase; }
    .plan-badge {
      position: relative;
      z-index: 1;
      min-height: 36px;
      display: inline-flex;
      align-items: center;
      padding: 7px 11px;
      border-radius: 999px;
      background: #E8F5E9;
      color: var(--green);
      font-size: 12px;
      font-weight: 950;
      white-space: nowrap;
    }
    .plan-badge.premium { background: #FFF1BF; color: #775300; }
    .plan-badge.inactive { background: #FCE9E7; color: var(--danger); }
    .plan-actions { grid-column: 2 / -1; display: flex; flex-wrap: wrap; gap: 8px; position: relative; z-index: 1; }
    .premium-no-ads {
      display: grid;
      grid-template-columns: 48px minmax(0,1fr);
      gap: 12px;
      align-items: center;
      border-color: #E4D18A;
      background: linear-gradient(135deg, #FFFDF4, #FFFFFF);
    }
    .premium-no-ads-icon {
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      border-radius: 15px;
      background: #FFF1BF;
      color: #775300;
      font-size: 22px;
      font-weight: 950;
    }
    .premium-no-ads h3 { margin: 0 0 4px; }
    .premium-no-ads p { margin: 0; color: var(--muted); line-height: 1.45; }
    .ad-privacy-note { border-left: 4px solid var(--green); }

    .sale-cart { border: 1px solid var(--line); border-radius: 14px; overflow: hidden; background: #FAFCFA; }
    .sale-cart-head { min-height: 48px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-bottom: 1px solid var(--line); }
    .sale-cart-head span { color: var(--muted); font-size: 12px; font-weight: 800; }
    .sale-cart-empty { padding: 13px; color: var(--muted); font-size: 13px; text-align: center; }
    .sale-cart-item { display: grid; grid-template-columns: minmax(0,1fr) auto auto; align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 1px solid var(--line); }
    .sale-cart-item:last-child { border-bottom: 0; }
    .sale-cart-item strong, .sale-cart-item small { display: block; }
    .sale-cart-item small { margin-top: 3px; color: var(--muted); }
    .sale-cart-remove { min-width: 40px; min-height: 40px; padding: 6px; border: 0; border-radius: 10px; background: #FCE9E7; color: var(--danger); font-weight: 900; }
'''

html = regex_once(
    html,
    r"    /\* Free-with-ads access model \*/.*?    \.ad-privacy-note \{ border-left: 4px solid var\(--green\); \}\n",
    new_ad_css,
    'replace ad CSS',
    re.S,
)

old_mobile = '''    @media (max-width: 560px) {
      .sponsor-ad { grid-template-columns: 58px minmax(0,1fr); }
      .sponsor-ad-image, .sponsor-ad-placeholder { width: 58px; height: 54px; }
      .sponsor-ad-action { display: none; }
      .sale-cart-item { grid-template-columns: minmax(0,1fr) auto; }
      .sale-cart-item .amount { grid-column: 1; }
      .sale-cart-remove { grid-column: 2; grid-row: 1 / span 2; }
    }
'''
new_mobile = '''    @media (max-width: 560px) {
      .ad-shell-head { align-items: flex-start; }
      .ad-info-button { padding-inline: 4px; }
      .sponsor-ad { grid-template-columns: 54px minmax(0,1fr); padding: 12px; }
      .sponsor-ad-image, .sponsor-ad-placeholder { width: 54px; height: 54px; border-radius: 14px; }
      .sponsor-ad-action { display: none; }
      .plan-card { grid-template-columns: 48px minmax(0,1fr); align-items: start; }
      .plan-icon { width: 48px; height: 48px; border-radius: 14px; font-size: 21px; }
      .plan-badge { grid-column: 1 / -1; width: max-content; }
      .plan-actions { grid-column: 1 / -1; }
      .sale-cart-item { grid-template-columns: minmax(0,1fr) auto; }
      .sale-cart-item .amount { grid-column: 1; }
      .sale-cart-remove { grid-column: 2; grid-row: 1 / span 2; }
    }
'''
html = replace_once(html, old_mobile, new_mobile, 'replace mobile ad CSS')

old_settings_intro = '''          <div class="page-head">
            <div><h2>Тохиргоо</h2><p>Үнэгүй эрх, зарын мэдээлэл, хэрэглэгч болон системийн тохиргоо.</p></div>
          </div>
          <div class="ad-slot" data-ad-placement="settings"></div>
          <div class="grid">
            <div id="subscriptionBanner" class="banner">
              <h3 id="subscriptionTitle">Үнэгүй · зарын дэмжлэгтэй</h3>
              <p id="subscriptionText">Бүх үндсэн боломж нээлттэй.</p>
              <a class="btn btn-primary" href="https://www.facebook.com/DataLinxMN" target="_blank" rel="noopener" style="margin-top:13px;text-decoration:none">Тусламж авах</a>
            </div>

            <div class="card ad-privacy-note">
              <h3>Зар ба нууцлал</h3>
              <p class="card-subtitle" style="margin:0;line-height:1.55">Системийг үнэ төлбөргүй ажиллуулахын тулд жижиг, саад болдоггүй ивээн тэтгэсэн зар харуулна. Сурталчлагчид танай борлуулалт, бараа, ажилтан, харилцагч болон GPS мэдээлэлд хандахгүй. Зар нь DataLinx-ийн master бүртгэлээс ирэх бөгөөд бизнесийн датаас тусдаа байна.</p>
            </div>
'''
new_settings_intro = '''          <div class="page-head">
            <div><h2>Тохиргоо</h2><p>Эрхийн төлөв, зар, хэрэглэгч болон системийн тохиргоо.</p></div>
          </div>
          <div class="grid">
            <section id="subscriptionBanner" class="card plan-card">
              <div class="plan-icon" aria-hidden="true">DL</div>
              <div class="plan-copy">
                <span class="plan-eyebrow">DataLinx эрхийн төлөв</span>
                <h3 id="subscriptionTitle">Үнэгүй · зарын дэмжлэгтэй</h3>
                <p id="subscriptionText">Бүх үндсэн боломж нээлттэй.</p>
              </div>
              <span id="settingsPlanBadge" class="plan-badge">FREE</span>
              <div id="planActions" class="plan-actions">
                <a id="upgradeNoAdsBtn" class="btn btn-primary" href="https://www.facebook.com/DataLinxMN" target="_blank" rel="noopener" style="text-decoration:none">Premium · заргүй болгох</a>
                <a class="btn btn-secondary" href="https://www.facebook.com/DataLinxMN" target="_blank" rel="noopener" style="text-decoration:none">Тусламж авах</a>
              </div>
            </section>

            <section id="premiumNoAdsCard" class="card premium-no-ads hidden">
              <div class="premium-no-ads-icon" aria-hidden="true">✓</div>
              <div><h3>Premium · заргүй орчин</h3><p>Google Ads болон ивээн тэтгэсэн зарууд таны бүх цэснээс бүрэн хасагдсан.</p></div>
            </section>

            <div class="ad-slot" data-ad-placement="settings"></div>

            <div class="card ad-privacy-note">
              <h3>Зар ба нууцлал</h3>
              <p class="card-subtitle" style="margin:0;line-height:1.55">Free эрхийн үед жижиг, саад болдоггүй зар харуулна. DataLinx нь танай борлуулалт, бараа, ажилтан, харилцагч, авлага, GPS болон түгээлтийн зургийг сурталчлагчид дамжуулахгүй. Premium эрхтэй үед зарын код огт ачаалагдахгүй.</p>
            </div>
'''
html = replace_once(html, old_settings_intro, new_settings_intro, 'replace settings plan UI')

old_constants = """    const BARCODE_FALLBACK_URL = 'https://unpkg.com/@zxing/browser@0.2.1';
"""
new_constants = """    const BARCODE_FALLBACK_URL = 'https://unpkg.com/@zxing/browser@0.2.1';

    // Google AdSense: replace both placeholders after your site and ad unit are approved.
    // The script is loaded dynamically only for Free users. Premium users never load it.
    const GOOGLE_ADSENSE_CLIENT = 'ca-pub-REPLACE_WITH_YOUR_PUBLISHER_ID';
    const GOOGLE_ADSENSE_SLOT = 'REPLACE_WITH_YOUR_AD_SLOT_ID';
    const GOOGLE_ADSENSE_SCRIPT_ID = 'datalinx-google-adsense-script';
"""
html = replace_once(html, old_constants, new_constants, 'insert AdSense constants')

old_state = """      ads: [],
      saleCart: [],
"""
new_state = """      ads: [],
      googleAds: { scriptPromise: null, renderedPlacements: new Set() },
      saleCart: [],
"""
html = replace_once(html, old_state, new_state, 'insert Google Ads state')

old_logout = """      state.ads = [];
      state.saleCart = [];
"""
new_logout = """      state.ads = [];
      state.googleAds.renderedPlacements.clear();
      state.saleCart = [];
"""
html = replace_once(html, old_logout, new_logout, 'reset Google Ads on logout')

old_show_page = """      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Menu switching is immediate. Lazy module data loads in the background
"""
new_show_page = """      window.scrollTo({ top: 0, behavior: 'smooth' });
      renderAds(page);

      // Menu switching is immediate. Lazy module data loads in the background
"""
html = replace_once(html, old_show_page, new_show_page, 'render ads on page switch')

html = replace_once(
    html,
    "      if (page === 'dashboard' && isPremium() && !state.loaded.dashboard) return loadModule('dashboard');",
    "      if (page === 'dashboard' && !state.loaded.dashboard) return loadModule('dashboard');",
    'load dashboard for Free users',
)

html = replace_once(
    html,
    "    function isPremium() { return state.session?.companyStatus !== 'Inactive'; }",
    "    function isPremium() { return state.session?.companyStatus === 'Active'; }\n    function isFreePlan() { return state.session?.companyStatus === 'Free'; }",
    'correct Premium detection',
)

old_top_status = """      const status = state.session.companyStatus;
      const topStatus = $('#topStatus');
      topStatus.textContent = status === 'Inactive' ? 'ИДЭВХГҮЙ' : 'ҮНЭГҮЙ · ЗАРТАЙ';
      topStatus.className = `status-pill ${status === 'Inactive' ? 'inactive' : ''}`;
"""
new_top_status = """      const status = state.session.companyStatus;
      const topStatus = $('#topStatus');
      topStatus.textContent = status === 'Inactive'
        ? 'ИДЭВХГҮЙ'
        : isPremium() ? 'PREMIUM · ЗАРГҮЙ' : 'ҮНЭГҮЙ · ЗАРТАЙ';
      topStatus.className = `status-pill ${status === 'Inactive' ? 'inactive' : isPremium() ? 'premium' : ''}`;
"""
html = replace_once(html, old_top_status, new_top_status, 'update top plan status')

html = replace_once(html, "      renderAds();", "      renderAds(currentPageName());", 'render current-page ad')
html = replace_once(html, "      const visits = state.visits.slice(0, isPremium() ? 30 : 10);", "      const visits = state.visits.slice(0, 30);", 'remove Free visit limit')

new_ad_js = r'''    function safeAdUrl(value) {
      const raw = String(value || '').trim();
      if (!raw) return '';
      try {
        const url = new URL(raw, window.location.href);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
      } catch (error) {
        return '';
      }
    }

    function currentPageName() {
      const active = $('.page.active');
      return active?.id?.replace(/^page-/, '') || 'sales';
    }

    function isGoogleAdsConfigured() {
      return /^ca-pub-\d{10,}$/.test(GOOGLE_ADSENSE_CLIENT)
        && /^\d{6,}$/.test(GOOGLE_ADSENSE_SLOT);
    }

    function loadGoogleAdsScript() {
      if (!isFreePlan() || !isGoogleAdsConfigured()) return Promise.resolve(false);
      if (window.adsbygoogle && document.getElementById(GOOGLE_ADSENSE_SCRIPT_ID)) return Promise.resolve(true);
      if (state.googleAds.scriptPromise) return state.googleAds.scriptPromise;

      state.googleAds.scriptPromise = new Promise((resolve, reject) => {
        const existing = document.getElementById(GOOGLE_ADSENSE_SCRIPT_ID);
        if (existing) {
          existing.addEventListener('load', () => resolve(true), { once: true });
          existing.addEventListener('error', () => reject(new Error('Google Ads script ачаалсангүй.')), { once: true });
          return;
        }
        const script = document.createElement('script');
        script.id = GOOGLE_ADSENSE_SCRIPT_ID;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(GOOGLE_ADSENSE_CLIENT)}`;
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error('Google Ads script ачаалсангүй.'));
        document.head.appendChild(script);
      }).catch(error => {
        state.googleAds.scriptPromise = null;
        throw error;
      });
      return state.googleAds.scriptPromise;
    }

    function renderAds(page = currentPageName()) {
      const showAds = isFreePlan();
      $$('.ad-slot').forEach(slot => {
        const placement = String(slot.dataset.adPlacement || 'all').toLowerCase();
        const visible = showAds && placement === String(page || 'sales').toLowerCase();
        slot.classList.toggle('hidden', !visible);
        if (!visible) {
          if (!showAds) {
            slot.innerHTML = '';
            delete slot.dataset.adProvider;
            delete slot.dataset.adRendered;
          }
          return;
        }
        if (isGoogleAdsConfigured()) renderGoogleAd(slot, placement);
        else renderFirstPartyAd(slot, placement);
      });
    }

    function adShellHeader(provider) {
      return `<div class="ad-shell-head">
        <span class="ad-disclosure">Ивээн тэтгэсэн · ${escapeHtml(provider)}</span>
        <button class="ad-info-button" type="button" onclick="showPage('settings')">Зар ба нууцлал</button>
      </div>`;
    }

    function renderGoogleAd(slot, placement) {
      if (slot.dataset.adProvider === 'google' && slot.dataset.adRendered === 'true') return;
      slot.dataset.adProvider = 'google';
      slot.dataset.adRendered = 'false';
      slot.innerHTML = `<section class="ad-shell" aria-label="Google зар">
        ${adShellHeader('Google Ads')}
        <div class="google-ad-surface">
          <div class="ad-loading">Зар ачаалж байна...</div>
          <ins class="adsbygoogle"
               style="display:block"
               data-ad-client="${escapeHtml(GOOGLE_ADSENSE_CLIENT)}"
               data-ad-slot="${escapeHtml(GOOGLE_ADSENSE_SLOT)}"
               data-ad-format="auto"
               data-full-width-responsive="true"></ins>
        </div>
      </section>`;

      loadGoogleAdsScript().then(() => {
        if (!isFreePlan() || slot.classList.contains('hidden') || slot.dataset.adRendered === 'true') return;
        slot.querySelector('.ad-loading')?.remove();
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          slot.dataset.adRendered = 'true';
          state.googleAds.renderedPlacements.add(placement);
        } catch (error) {
          renderFirstPartyAd(slot, placement, 'Google зар түр ачаалсангүй.');
        }
      }).catch(() => renderFirstPartyAd(slot, placement, 'Google зар түр ачаалсангүй.'));
    }

    function renderFirstPartyAd(slot, placement, notice = '') {
      if (slot.dataset.adProvider === 'first-party' && slot.dataset.adRendered === 'true' && !notice) return;
      const fallback = {
        id: 'DATALINX-HOUSE',
        title: 'DataLinx · Жижиг бизнесийн дижитал шийдэл',
        description: notice || 'Google Sheets, AppSheet болон автоматжуулалтын үйлчилгээ.',
        imageUrl: '',
        linkUrl: FACEBOOK_URL,
        placement: 'all',
        sponsor: 'DataLinx'
      };
      const matches = state.ads.filter(ad => ['all', placement].includes(String(ad.placement || 'all').toLowerCase()));
      const pool = matches.length ? matches : [fallback];
      const daySeed = Math.floor(Date.now() / 86400000) + placement.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const ad = pool[Math.abs(daySeed) % pool.length];
      const link = safeAdUrl(ad.linkUrl) || FACEBOOK_URL;
      const image = safeAdUrl(ad.imageUrl);
      slot.dataset.adProvider = 'first-party';
      slot.dataset.adRendered = 'true';
      slot.innerHTML = `<section class="ad-shell">
        ${adShellHeader(ad.sponsor || 'DataLinx')}
        <a class="sponsor-ad" href="${escapeHtml(link)}" target="_blank" rel="noopener sponsored">
          ${image ? `<img class="sponsor-ad-image" src="${escapeHtml(image)}" alt="">` : '<div class="sponsor-ad-placeholder">DL</div>'}
          <div class="sponsor-ad-copy">
            <strong>${escapeHtml(ad.title || '')}</strong>
            <small>${escapeHtml(ad.description || '')}</small>
          </div>
          <span class="sponsor-ad-action">Дэлгэрэнгүй ›</span>
        </a>
      </section>`;
    }

'''
html = regex_once(
    html,
    r"    function safeAdUrl\(value\) \{.*?(?=    function applyTierUi\(\))",
    new_ad_js,
    'replace ad rendering JS',
    re.S,
)

old_settings_status = '''      const status = state.session.companyStatus;
      const banner = $('#subscriptionBanner');
      banner.classList.toggle('inactive', status === 'Inactive');
      if (status === 'Inactive') {
        $('#subscriptionTitle').textContent = 'Эрх идэвхгүй';
        $('#subscriptionText').textContent = 'Систем ашиглах эрх хаалттай. DataLinx-тэй холбогдоно уу.';
      } else {
        $('#subscriptionTitle').textContent = 'Үнэгүй · зарын дэмжлэгтэй';
        $('#subscriptionText').textContent = 'Борлуулалт, агуулах, түгээлт, хяналтын самбар, олон байршил болон хэрэглэгчийн удирдлагын үндсэн боломжууд бүгд нээлттэй.';
      }
'''
new_settings_status = '''      const status = state.session.companyStatus;
      const banner = $('#subscriptionBanner');
      const badge = $('#settingsPlanBadge');
      const premiumCard = $('#premiumNoAdsCard');
      const upgradeButton = $('#upgradeNoAdsBtn');
      banner.classList.toggle('inactive', status === 'Inactive');
      badge.className = `plan-badge ${status === 'Inactive' ? 'inactive' : isPremium() ? 'premium' : ''}`;
      premiumCard.classList.toggle('hidden', !isPremium());
      upgradeButton.classList.toggle('hidden', isPremium() || status === 'Inactive');
      if (status === 'Inactive') {
        badge.textContent = 'ИДЭВХГҮЙ';
        $('#subscriptionTitle').textContent = 'Эрх идэвхгүй';
        $('#subscriptionText').textContent = 'Систем ашиглах эрх хаалттай. DataLinx-тэй холбогдоно уу.';
      } else if (isPremium()) {
        badge.textContent = 'PREMIUM';
        $('#subscriptionTitle').textContent = 'Premium · заргүй';
        $('#subscriptionText').textContent = 'Бүх үндсэн боломж нээлттэй бөгөөд Google Ads болон ивээн тэтгэсэн зарын код ачаалагдахгүй.';
      } else {
        badge.textContent = 'FREE';
        $('#subscriptionTitle').textContent = 'Үнэгүй · зарын дэмжлэгтэй';
        $('#subscriptionText').textContent = 'Борлуулалт, агуулах, түгээлт, хяналтын самбар, олон байршил болон хэрэглэгчийн удирдлагын үндсэн боломжууд бүгд нээлттэй.';
      }
'''
html = replace_once(html, old_settings_status, new_settings_status, 'update settings plan logic')

walk_replacements = {
    "Энэ бол зөвхөн танай компанийн тусдаа орчин. Дээд хэсгээс компанийн нэр, нэвтэрсэн хэрэглэгч болон Free/Premium эрхийн төлвийг харна.":
        "Энэ бол зөвхөн танай компанийн тусдаа орчин. Дээд хэсгээс компанийн нэр, хэрэглэгч болон Free зарын дэмжлэгтэй эсвэл Premium заргүй төлвийг харна.",
    "text: isPremium()\n            ? 'Энэ сарын борлуулалт, шилдэг бараа, борлуулагчдын гүйцэтгэл, зээлийн үлдэгдэл болон өмнөх сартай харьцуулалтыг эндээс харна.'\n            : 'Хяналтын самбар нь Premium боломж. Free эрхтэй үед хэсэг түгжээтэй харагдах бөгөөд Premium эрх идэвхжүүлсний дараа тайлангууд нээгдэнэ.'":
        "text: 'Энэ сарын борлуулалт, шилдэг бараа, борлуулагчдын гүйцэтгэл, зээлийн үлдэгдэл болон өмнөх сартай харьцуулалтыг эндээс харна. Энэ үндсэн тайлан Free эрхэд ч нээлттэй.'",
    "Тохиргоо хэсгээс компанийн Free/Premium/Inactive төлөв болон Premium эрхийн холбоо барих мэдээллийг харна.":
        "Тохиргоо хэсгээс Free зарын дэмжлэгтэй, Premium заргүй эсвэл Inactive төлвийг харна. Premium үед зарын код бүх цэснээс хасагдана.",
    "Менежер шинэ борлуулагч эсвэл менежер нэмэх, мэдээллийг засах боломжтой. Free эрхийн хэрэглэгчийн хязгаарыг сервер талд автоматаар шалгана.":
        "Менежер борлуулагч, жолооч, агуулахын ажилтан болон бусад хэрэглэгч нэмэх, мэдээллийг засах боломжтой.",
}
for old, new in walk_replacements.items():
    html = replace_once(html, old, new, 'update walkthrough text')

# ---------------------------------------------------------------------------
# Code.gs — distinguish Free (ads) vs Active/Premium (no ads).
# ---------------------------------------------------------------------------

old_payload = '''    companyStatus: company.status,
    accessModel: 'FreeWithAds',
    expiresAt: company.expiresAt ? company.expiresAt.toISOString() : '',
    ads: getActiveAds_(),
'''
new_payload = '''    companyStatus: company.status,
    accessModel: company.status === 'Active' ? 'PremiumNoAds' : 'FreeWithAds',
    expiresAt: company.expiresAt ? company.expiresAt.toISOString() : '',
    ads: company.status === 'Free' ? getActiveAds_() : [],
'''
code = replace_once(code, old_payload, new_payload, 'send ads to Free only')

code = replace_once(
    code,
    "    companySheet.appendRow([companyName, newSheetId, 'Active', new Date(), 0, phone, email]);",
    "    companySheet.appendRow([companyName, newSheetId, 'Free', '', 0, phone, email]);",
    'register new companies as Free',
)

old_status_parser = '''  let status = 'Free';
  let expiresAt = null;
  if (explicitStatus === 'inactive' || explicitStatus === 'идэвхгүй') {
    status = 'Inactive';
  } else if (activated && months > 0) {
    expiresAt = addMonths_(activated, months);
    status = new Date().getTime() <= expiresAt.getTime() ? 'Active' : 'Free';
  }
'''
new_status_parser = '''  let status = 'Free';
  let expiresAt = null;
  const premiumStatus = ['active', 'premium', 'идэвхтэй'].includes(explicitStatus);
  if (explicitStatus === 'inactive' || explicitStatus === 'идэвхгүй') {
    status = 'Inactive';
  } else if (premiumStatus && activated && months > 0) {
    expiresAt = addMonths_(activated, months);
    status = new Date().getTime() <= expiresAt.getTime() ? 'Active' : 'Free';
  } else if (premiumStatus) {
    // Active/Premium without a term is treated as an indefinite ad-free plan.
    status = 'Active';
  } else if (activated && months > 0) {
    // Backward compatibility for older rows that used only date + month fields.
    expiresAt = addMonths_(activated, months);
    status = new Date().getTime() <= expiresAt.getTime() ? 'Active' : 'Free';
  }
'''
code = replace_once(code, old_status_parser, new_status_parser, 'improve company plan parser')

INDEX.write_text(html, encoding='utf-8')
CODE.write_text(code, encoding='utf-8')

DOC.write_text('''# Google Ads + Premium заргүй тохиргоо

## Эрхийн төлөв

MASTER Registry-ийн `Компани` tab дахь төлөв:

- `Free` — бүх үндсэн боломж нээлттэй, зар харагдана.
- `Active` эсвэл `Premium` — бүх үндсэн боломж нээлттэй, зарын script болон зарын slot бүрэн хасагдана.
- `Inactive` — систем ашиглах эрх хаалттай.

Шинээр бүртгүүлсэн компани автоматаар `Free` төлөвтэй үүснэ.

## Google AdSense ID оруулах

`index.html` дотор:

```javascript
const GOOGLE_ADSENSE_CLIENT = 'ca-pub-REPLACE_WITH_YOUR_PUBLISHER_ID';
const GOOGLE_ADSENSE_SLOT = 'REPLACE_WITH_YOUR_AD_SLOT_ID';
```

гэсэн хоёр утгыг өөрийн баталгаажсан AdSense publisher ID болон responsive display ad unit-ийн slot ID-аар солино.

Placeholder хэвээр байвал систем эвдрэхгүй: MASTER Registry-ийн `Зар` tab дахь first-party sponsor зар, эсвэл DataLinx house ad харагдана.

## Ажиллах зарчим

- Google-ийн script зөвхөн `Free` хэрэглэгчийн идэвхтэй цэс дээр lazy-load хийнэ.
- `Active/Premium` хэрэглэгч нэвтрэхэд Google-ийн script огт ачаалагдахгүй.
- Зар нь form, submit, barcode camera, GPS, modal, PDF болон print document дотор орохгүй.
- Цэс бүрт нэг responsive slot байна; нэг slot дахин дахин render хийхээс хамгаалсан.
- Google Ads ачаалж чадахгүй бол first-party sponsor fallback ажиллана.

## Apps Script deploy

`Code.gs` өөрчлөгдсөн тул Apps Script төсөлдөө шинэ бүтэн `Code.gs`-ийг хуулсны дараа:

```text
Deploy → Manage deployments → Edit → New version → Deploy
```

хийнэ. Одоогийн `/exec` URL хэвээр ашиглагдана.

## Нууцлал

Google Ads идэвхжүүлэхээс өмнө сайтад privacy policy байршуулж, шаардлагатай хэрэглэгчдэд consent/CMP тохиргоо хийнэ. DataLinx-ийн борлуулалт, бараа, ажилтан, харилцагч, авлага, GPS болон зураг зэрэг business data-г ad request-д зориудаар дамжуулахгүй.
''', encoding='utf-8')

print('Google Ads + Premium no-ads patch applied successfully')
