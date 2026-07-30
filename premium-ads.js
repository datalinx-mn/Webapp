'use strict';

// Shared by the public landing page and the authenticated app.
const ADSENSE_CONFIG = window.DATALINX_ADSENSE_CONFIG || {};
const GOOGLE_ADSENSE_CLIENT = String(ADSENSE_CONFIG.client || 'ca-pub-REPLACE_WITH_YOUR_PUBLISHER_ID');
const GOOGLE_ADSENSE_SLOT = String(ADSENSE_CONFIG.appSlot || 'REPLACE_WITH_APP_RESPONSIVE_AD_SLOT_ID');
const GOOGLE_ADSENSE_SCRIPT_ID = 'datalinx-google-adsense-script';

const dataLinxGoogleAds = { scriptPromise: null };

function isFreePlan() { return state.session?.companyStatus === 'Free'; }
function isAdFreePlan() { return state.session?.companyStatus === 'Active'; }
function currentPageName() { return document.querySelector('.page.active')?.id?.replace(/^page-/, '') || 'sales'; }
function isGoogleAdsConfigured() { return /^ca-pub-\d{10,}$/.test(GOOGLE_ADSENSE_CLIENT) && /^\d{6,}$/.test(GOOGLE_ADSENSE_SLOT); }

function upgradeSettingsDesign() {
  const banner = document.getElementById('subscriptionBanner');
  if (!banner || document.getElementById('settingsPlanBadge')) return;
  banner.className = 'card plan-card';
  banner.innerHTML = `
    <div class="plan-icon" aria-hidden="true">DL</div>
    <div class="plan-copy">
      <span class="plan-eyebrow">DataLinx эрхийн төлөв</span>
      <h3 id="subscriptionTitle">Үнэгүй · зарын дэмжлэгтэй</h3>
      <p id="subscriptionText">Бүх үндсэн боломж нээлттэй.</p>
    </div>
    <span id="settingsPlanBadge" class="plan-badge">FREE</span>
    <div class="plan-actions">
      <a id="upgradeNoAdsBtn" class="btn btn-primary" href="${FACEBOOK_URL}" target="_blank" rel="noopener" style="text-decoration:none">Premium · заргүй болгох</a>
      <a class="btn btn-secondary" href="${FACEBOOK_URL}" target="_blank" rel="noopener" style="text-decoration:none">Тусламж авах</a>
    </div>`;

  const premiumCard = document.createElement('section');
  premiumCard.id = 'premiumNoAdsCard';
  premiumCard.className = 'card premium-no-ads hidden';
  premiumCard.innerHTML = '<div class="premium-no-ads-icon" aria-hidden="true">✓</div><div><h3>Premium · заргүй орчин</h3><p>Google Ads болон ивээн тэтгэсэн зарууд таны бүх цэснээс бүрэн хасагдсан.</p></div>';
  banner.insertAdjacentElement('afterend', premiumCard);

  const settingsGrid = banner.parentElement;
  const settingsAd = document.querySelector('[data-ad-placement="settings"]');
  if (settingsAd && settingsGrid) premiumCard.insertAdjacentElement('afterend', settingsAd);
  const privacy = document.querySelector('#page-settings .ad-privacy-note .card-subtitle');
  if (privacy) privacy.textContent = 'Free эрхийн үед жижиг, саад болдоггүй зар харуулна. DataLinx нь танай борлуулалт, бараа, ажилтан, харилцагч, авлага, GPS болон түгээлтийн зургийг сурталчлагчид дамжуулахгүй. Premium эрхтэй үед зарын код огт ачаалагдахгүй.';
  const subtitle = document.querySelector('#page-settings .page-head p');
  if (subtitle) subtitle.textContent = 'Эрхийн төлөв, зар, хэрэглэгч болон системийн тохиргоо.';
}

function updatePlanUi() {
  if (!state.session) return;
  const status = state.session.companyStatus;
  const top = document.getElementById('topStatus');
  if (top) {
    top.textContent = status === 'Inactive' ? 'ИДЭВХГҮЙ' : isAdFreePlan() ? 'PREMIUM · ЗАРГҮЙ' : 'ҮНЭГҮЙ · ЗАРТАЙ';
    top.className = `status-pill ${status === 'Inactive' ? 'inactive' : isAdFreePlan() ? 'premium' : ''}`;
  }
  const badge = document.getElementById('settingsPlanBadge');
  const title = document.getElementById('subscriptionTitle');
  const text = document.getElementById('subscriptionText');
  const premiumCard = document.getElementById('premiumNoAdsCard');
  const upgrade = document.getElementById('upgradeNoAdsBtn');
  if (!badge || !title || !text || !premiumCard || !upgrade) return;
  badge.className = `plan-badge ${status === 'Inactive' ? 'inactive' : isAdFreePlan() ? 'premium' : ''}`;
  premiumCard.classList.toggle('hidden', !isAdFreePlan());
  upgrade.classList.toggle('hidden', isAdFreePlan() || status === 'Inactive');
  if (status === 'Inactive') {
    badge.textContent = 'ИДЭВХГҮЙ'; title.textContent = 'Эрх идэвхгүй'; text.textContent = 'Систем ашиглах эрх хаалттай. DataLinx-тэй холбогдоно уу.';
  } else if (isAdFreePlan()) {
    badge.textContent = 'PREMIUM'; title.textContent = 'Premium · заргүй'; text.textContent = 'Бүх үндсэн боломж нээлттэй бөгөөд Google Ads болон ивээн тэтгэсэн зарын код ачаалагдахгүй.';
  } else {
    badge.textContent = 'FREE'; title.textContent = 'Үнэгүй · зарын дэмжлэгтэй'; text.textContent = 'Борлуулалт, агуулах, түгээлт, хяналтын самбар, олон байршил болон хэрэглэгчийн удирдлагын үндсэн боломжууд бүгд нээлттэй.';
  }
}

function safeSponsorUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try { const url = new URL(raw, location.href); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; }
  catch { return ''; }
}

function loadGoogleAdsScript() {
  if (!isFreePlan() || !isGoogleAdsConfigured()) return Promise.resolve(false);
  if (window.adsbygoogle && document.getElementById(GOOGLE_ADSENSE_SCRIPT_ID)) return Promise.resolve(true);
  if (dataLinxGoogleAds.scriptPromise) return dataLinxGoogleAds.scriptPromise;
  dataLinxGoogleAds.scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = GOOGLE_ADSENSE_SCRIPT_ID;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(GOOGLE_ADSENSE_CLIENT)}`;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Google Ads script ачаалсангүй.'));
    document.head.appendChild(script);
  }).catch(error => { dataLinxGoogleAds.scriptPromise = null; throw error; });
  return dataLinxGoogleAds.scriptPromise;
}

function adHeader(provider) {
  return `<div class="ad-shell-head"><span class="ad-disclosure">Ивээн тэтгэсэн · ${escapeHtml(provider)}</span><button class="ad-info-button" type="button" onclick="showPage('settings')">Зар ба нууцлал</button></div>`;
}

function renderFirstPartyAd(slot, placement, notice = '') {
  const fallback = { title: 'DataLinx · Жижиг бизнесийн дижитал шийдэл', description: notice || 'Google Sheets, AppSheet болон автоматжуулалтын үйлчилгээ.', imageUrl: '', linkUrl: FACEBOOK_URL, placement: 'all', sponsor: 'DataLinx' };
  const matches = (state.ads || []).filter(ad => ['all', placement].includes(String(ad.placement || 'all').toLowerCase()));
  const pool = matches.length ? matches : [fallback];
  const seed = Math.floor(Date.now() / 86400000) + placement.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const ad = pool[Math.abs(seed) % pool.length];
  const link = safeSponsorUrl(ad.linkUrl) || FACEBOOK_URL;
  const image = safeSponsorUrl(ad.imageUrl);
  slot.dataset.adProvider = 'first-party';
  slot.innerHTML = `<section class="ad-shell">${adHeader(ad.sponsor || 'DataLinx')}<a class="sponsor-ad" href="${escapeHtml(link)}" target="_blank" rel="noopener sponsored">${image ? `<img class="sponsor-ad-image" src="${escapeHtml(image)}" alt="">` : '<div class="sponsor-ad-placeholder">DL</div>'}<div class="sponsor-ad-copy"><strong>${escapeHtml(ad.title || '')}</strong><small>${escapeHtml(ad.description || '')}</small></div><span class="sponsor-ad-action">Дэлгэрэнгүй ›</span></a></section>`;
}

function renderGoogleAd(slot, placement) {
  if (slot.dataset.adProvider === 'google' && slot.dataset.adRendered === 'true') return;
  slot.dataset.adProvider = 'google'; slot.dataset.adRendered = 'false';
  slot.innerHTML = `<section class="ad-shell" aria-label="Google зар">${adHeader('Google Ads')}<div class="google-ad-surface"><div class="ad-loading">Зар ачаалж байна...</div><ins class="adsbygoogle" style="display:block" data-ad-client="${escapeHtml(GOOGLE_ADSENSE_CLIENT)}" data-ad-slot="${escapeHtml(GOOGLE_ADSENSE_SLOT)}" data-ad-format="auto" data-full-width-responsive="true"></ins></div></section>`;
  loadGoogleAdsScript().then(() => {
    if (!isFreePlan() || slot.classList.contains('hidden') || slot.dataset.adRendered === 'true') return;
    slot.querySelector('.ad-loading')?.remove();
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); slot.dataset.adRendered = 'true'; }
    catch { renderFirstPartyAd(slot, placement, 'Google зар түр ачаалсангүй.'); }
  }).catch(() => renderFirstPartyAd(slot, placement, 'Google зар түр ачаалсангүй.'));
}

const coreRenderAds = renderAds;
renderAds = function enhancedRenderAds(page = currentPageName()) {
  const showAds = isFreePlan();
  document.querySelectorAll('.ad-slot').forEach(slot => {
    const placement = String(slot.dataset.adPlacement || 'all').toLowerCase();
    const visible = showAds && placement === String(page).toLowerCase();
    slot.classList.toggle('hidden', !visible);
    if (!visible) { if (!showAds) { slot.innerHTML = ''; delete slot.dataset.adProvider; delete slot.dataset.adRendered; } return; }
    if (isGoogleAdsConfigured()) renderGoogleAd(slot, placement); else renderFirstPartyAd(slot, placement);
  });
};

const coreShowPage = showPage;
showPage = function enhancedShowPage(page, loadData = true) { coreShowPage(page, loadData); renderAds(page); };
const coreRenderAll = renderAll;
renderAll = function enhancedRenderAll() { coreRenderAll(); updatePlanUi(); renderAds(currentPageName()); };
const coreRenderSettings = renderSettings;
renderSettings = function enhancedRenderSettings() { coreRenderSettings(); updatePlanUi(); };

upgradeSettingsDesign();
document.addEventListener('DOMContentLoaded', () => { upgradeSettingsDesign(); updatePlanUi(); renderAds(currentPageName()); });
