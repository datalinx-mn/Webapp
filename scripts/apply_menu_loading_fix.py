from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')

state_old = """      loaded: { inventory: false, distribution: false, dashboard: false, settings: false },
      gps: { lat: null, lng: null },"""
state_new = """      loaded: { inventory: false, distribution: false, dashboard: false, settings: false },
      moduleLoads: {},
      gps: { lat: null, lng: null },"""

block_old = """    async function showPage(page, loadData = true) {
      $$('.page').forEach(section => section.classList.toggle('active', section.id === `page-${page}`));
      $$('.nav-btn[data-page]').forEach(btn => btn.classList.toggle('active', btn.dataset.page === page));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (loadData) loadPageData(page);
    }

    async function loadPageData(page) {
      if (!state.session?.token || !navigator.onLine) return;
      if (page === 'inventory' && !state.loaded.inventory) return loadModule('inventory');
      if (page === 'distribution' && !state.loaded.distribution) return loadModule('distribution');
      if (page === 'dashboard' && isPremium() && !state.loaded.dashboard) return loadModule('dashboard');
      if (page === 'settings' && isManager() && !state.loaded.settings) return loadModule('settings');
    }

    async function loadModule(module) {
      showLoading('Мэдээлэл ачаалж байна...');
      try {
        const url = new URL(APP_SCRIPT_URL);
        url.searchParams.set('action', 'module');
        url.searchParams.set('module', module);
        url.searchParams.set('token', state.session.token);
        url.searchParams.set('_', String(Date.now()));
        const response = await fetch(url.toString(), { cache: 'no-store', redirect: 'follow' });
        const data = await parseResponse(response);
        if (!data.success) throw new Error(data.message || 'Мэдээлэл ачаалж чадсангүй.');
        if (module === 'inventory') {
          state.serverInventoryMoves = Array.isArray(data.inventoryMoves) ? data.inventoryMoves : [];
          state.loaded.inventory = true;
        }
        if (module === 'distribution') {
          state.visits = Array.isArray(data.visits) ? data.visits : [];
          state.loaded.distribution = true;
        }
        if (module === 'dashboard') {
          state.dashboard = data.dashboard || null;
          state.loaded.dashboard = true;
        }
        if (module === 'settings') {
          state.users = Array.isArray(data.users) ? data.users : [];
          state.loaded.settings = true;
        }
        rebuildOptimisticState();
        renderAll();
        saveCache();
      } catch (error) {
        toast(error.message, 'error');
      } finally {
        hideLoading();
      }
    }
"""

block_new = """    function showPage(page, loadData = true) {
      $$('.page').forEach(section => section.classList.toggle('active', section.id === `page-${page}`));
      $$('.nav-btn[data-page]').forEach(btn => btn.classList.toggle('active', btn.dataset.page === page));
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Menu switching is immediate. Lazy module data loads in the background
      // without covering the whole app with a blocking overlay.
      if (loadData) void loadPageData(page);
    }

    async function loadPageData(page) {
      if (!state.session?.token || !navigator.onLine) return;
      if (page === 'inventory' && !state.loaded.inventory) return loadModule('inventory');
      if (page === 'distribution' && !state.loaded.distribution) return loadModule('distribution');
      if (page === 'dashboard' && isPremium() && !state.loaded.dashboard) return loadModule('dashboard');
      if (page === 'settings' && isManager() && !state.loaded.settings) return loadModule('settings');
    }

    async function loadModule(module) {
      // Reuse an in-flight request when users tap menus quickly. This avoids
      // duplicate Apps Script calls and prevents the UI from appearing stuck.
      if (state.moduleLoads[module]) return state.moduleLoads[module];

      const request = (async () => {
        try {
          const url = new URL(APP_SCRIPT_URL);
          url.searchParams.set('action', 'module');
          url.searchParams.set('module', module);
          url.searchParams.set('token', state.session.token);
          url.searchParams.set('_', String(Date.now()));
          const response = await fetch(url.toString(), { cache: 'no-store', redirect: 'follow' });
          const data = await parseResponse(response);
          if (!data.success) throw new Error(data.message || 'Мэдээлэл ачаалж чадсангүй.');
          if (module === 'inventory') {
            state.serverInventoryMoves = Array.isArray(data.inventoryMoves) ? data.inventoryMoves : [];
            state.loaded.inventory = true;
          }
          if (module === 'distribution') {
            state.visits = Array.isArray(data.visits) ? data.visits : [];
            state.loaded.distribution = true;
          }
          if (module === 'dashboard') {
            state.dashboard = data.dashboard || null;
            state.loaded.dashboard = true;
          }
          if (module === 'settings') {
            state.users = Array.isArray(data.users) ? data.users : [];
            state.loaded.settings = true;
          }
          rebuildOptimisticState();
          renderAll();
          saveCache();
        } catch (error) {
          toast(error.message, 'error');
        }
      })();

      state.moduleLoads[module] = request;
      try {
        return await request;
      } finally {
        delete state.moduleLoads[module];
      }
    }
"""

if 'moduleLoads: {}' not in text:
    if state_old not in text:
        raise SystemExit('State insertion point not found')
    text = text.replace(state_old, state_new, 1)

if block_old in text:
    text = text.replace(block_old, block_new, 1)
elif block_new not in text:
    raise SystemExit('Menu loading block not found')

path.write_text(text, encoding='utf-8')
print('Applied nonblocking menu loading fix')
