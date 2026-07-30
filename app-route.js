'use strict';

(function () {
  function applyAuthRoute() {
    if (window.location.hash !== '#register') return;
    const registerTab = document.querySelector('[data-auth-tab="register"]');
    if (registerTab) registerTab.click();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyAuthRoute, { once: true });
  else applyAuthRoute();
  window.addEventListener('hashchange', applyAuthRoute);
})();
