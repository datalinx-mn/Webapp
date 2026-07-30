from pathlib import Path
import re

INDEX = Path('index.html')
CODE = Path('Code.gs')
html = INDEX.read_text(encoding='utf-8')
gs = CODE.read_text(encoding='utf-8')


def replace_exact(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: expected text not found')
    return text.replace(old, new, 1)


def replace_regex(text, pattern, replacement, label, flags=0):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, got {count}')
    return updated

# ---------------------------------------------------------------------------
# Apps Script: every non-inactive company gets full product access.
# Ads are first-party records controlled from the DataLinx master registry.
# ---------------------------------------------------------------------------
gs = replace_exact(gs, """const MASTER_SHEETS = {
  COMPANIES: 'Компани',
  USERS: 'Хэрэглэгч'
};""", """const MASTER_SHEETS = {
  COMPANIES: 'Компани',
  USERS: 'Хэрэглэгч',
  ADS: 'Зар'
};

const MASTER_AD_HEADERS = [
  'Ad ID','Гарчиг','Тайлбар','Зураг URL','Холбоос','Байрлал',
  'Эхлэх огноо','Дуусах огноо','Төлөв','Ивээн тэтгэгч'
];""", 'master ads constants')

gs = gs.replace("const FREE_REP_LIMIT = 5;\n", '', 1)

gs = replace_exact(gs, """    companyStatus: company.status,
    expiresAt: company.expiresAt ? company.expiresAt.toISOString() : '',
    products: getProducts_(companySs),""", """    companyStatus: company.status,
    accessModel: 'FreeWithAds',
    expiresAt: company.expiresAt ? company.expiresAt.toISOString() : '',
    ads: getActiveAds_(),
    products: getProducts_(companySs),""", 'initial payload ads')

gs = replace_exact(gs, """  if (moduleName === 'distribution') {
    return { success: true, visits: getVisits_(companySs, auth, company.status, 50) };
  }
  if (moduleName === 'dashboard') {
    return { success: true, dashboard: company.status === 'Active' ? buildDashboard_(companySs) : lockedDashboard_() };
  }""", """  if (moduleName === 'distribution') {
    return { success: true, visits: getVisits_(companySs, auth, 50) };
  }
  if (moduleName === 'dashboard') {
    return { success: true, dashboard: buildDashboard_(companySs) };
  }""", 'full dashboard and distribution access')

gs = replace_exact(gs, """  const location = company.status === 'Active' ? (clean_(p.location) || firstLocation_(companySs)) : firstLocation_(companySs);
  const warehouse = company.status === 'Active' ? (clean_(p.warehouse) || firstWarehouse_(companySs)) : firstWarehouse_(companySs);""", """  const location = clean_(p.location) || firstLocation_(companySs);
  const warehouse = clean_(p.warehouse) || firstWarehouse_(companySs);""", 'sales location access')

gs = gs.replace("  if (moveType === 'шилжүүлэг' && company.status !== 'Active') throw new Error('Агуулах хооронд шилжүүлэг нь Premium функц. ' + UPGRADE_URL);\n", '', 1)

gs = replace_exact(gs, """  const warehouse = company.status === 'Active' ? (clean_(p.warehouse) || firstWarehouse_(companySs)) : firstWarehouse_(companySs);""", """  const warehouse = clean_(p.warehouse) || firstWarehouse_(companySs);""", 'inventory warehouse access')

gs = replace_regex(gs, r"\n    const company = getCompany_\(auth\.company\);\n    if \(isSalesRole_\(role\) && company\.status !== 'Active'\) \{.*?\n    \}\n", "\n", 'remove free rep limit', re.S)

gs = replace_exact(gs, """function getVisits_(companySs, auth, companyStatus, limit) {
  const data = sheetObjects_(companySs.getSheetByName(COMPANY_SHEETS.VISITS));
  return data.rows.filter(function(entry) {
    if (companyStatus === 'Active' || isManagerRole_(auth.role)) return true;
    return clean_(field_(entry.object, ['Рэп нэр'])).toLowerCase() === clean_(auth.fullName || auth.username).toLowerCase() || clean_(field_(entry.object, ['Driver'])).toLowerCase() === clean_(auth.fullName || auth.username).toLowerCase();
  }).slice(-limit).reverse().map(function(entry) {""", """function getVisits_(companySs, auth, limit) {
  const data = sheetObjects_(companySs.getSheetByName(COMPANY_SHEETS.VISITS));
  return data.rows.filter(function(entry) {
    if (isManagerRole_(auth.role)) return true;
    return clean_(field_(entry.object, ['Рэп нэр'])).toLowerCase() === clean_(auth.fullName || auth.username).toLowerCase() || clean_(field_(entry.object, ['Driver'])).toLowerCase() === clean_(auth.fullName || auth.username).toLowerCase();
  }).slice(-limit).reverse().map(function(entry) {""", 'visit access')

ads_function = r'''
function getActiveAds_() {
  const sheet = masterSs_().getSheetByName(MASTER_SHEETS.ADS);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const now = new Date();
  const activeValues = ['active','идэвхтэй','true','1','yes','тийм'];
  return sheetObjects_(sheet).rows.map(function(entry) {
    const row = entry.object;
    return {
      id: clean_(field_(row, ['Ad ID'])) || ('AD-' + entry.rowNumber),
      title: clean_(field_(row, ['Гарчиг'])),
      description: clean_(field_(row, ['Тайлбар'])),
      imageUrl: clean_(field_(row, ['Зураг URL'])),
      linkUrl: clean_(field_(row, ['Холбоос'])),
      placement: clean_(field_(row, ['Байрлал'])).toLowerCase() || 'all',
      startsAt: asDate_(field_(row, ['Эхлэх огноо'])),
      endsAt: asDate_(field_(row, ['Дуусах огноо'])),
      status: clean_(field_(row, ['Төлөв'])).toLowerCase(),
      sponsor: clean_(field_(row, ['Ивээн тэтгэгч']))
    };
  }).filter(function(ad) {
    if (!ad.title || !activeValues.includes(ad.status)) return false;
    if (ad.startsAt && now.getTime() < ad.startsAt.getTime()) return false;
    if (ad.endsAt) {
      const endOfDay = new Date(ad.endsAt.getTime());
      endOfDay.setHours(23, 59, 59, 999);
      if (now.getTime() > endOfDay.getTime()) return false;
    }
    return true;
  }).map(function(ad) {
    return {
      id: ad.id,
      title: ad.title,
      description: ad.description,
      imageUrl: ad.imageUrl,
      linkUrl: ad.linkUrl,
      placement: ad.placement,
      sponsor: ad.sponsor
    };
  });
}

'''

gs = replace_exact(gs, "function ensureMasterSheets_() {", ads_function + "function ensureMasterSheets_() {", 'insert ad reader')
gs = replace_exact(gs, """  ensureSheet_(ss, MASTER_SHEETS.COMPANIES, ['Компани нэр','Spreadsheet ID','Төлөв','Идэвхжүүлсэн огноо','Хугацаа(сар)','Утас','Имэйл']);
  ensureSheet_(ss, MASTER_SHEETS.USERS, ['Username','Password','Бүтэн нэр','Роль (manager/rep/admin/sales/warehouse/driver/accountant)','Компани нэр']);""", """  ensureSheet_(ss, MASTER_SHEETS.COMPANIES, ['Компани нэр','Spreadsheet ID','Төлөв','Идэвхжүүлсэн огноо','Хугацаа(сар)','Утас','Имэйл']);
  ensureSheet_(ss, MASTER_SHEETS.USERS, ['Username','Password','Бүтэн нэр','Роль (manager/rep/admin/sales/warehouse/driver/accountant)','Компани нэр']);
  ensureSheet_(ss, MASTER_SHEETS.ADS, MASTER_AD_HEADERS);""", 'ensure ad sheet')

# ---------------------------------------------------------------------------
# Frontend styles: compact first-party ads and a practical multi-item cart.
# ---------------------------------------------------------------------------
style_marker = "    @media (min-width: 660px) {"
style_block = r'''
    /* Free-with-ads access model */
    .ad-slot { margin: 0 0 14px; }
    .sponsor-ad {
      min-height: 84px;
      display: grid;
      grid-template-columns: 74px minmax(0, 1fr) auto;
      align-items: center;
      gap: 12px;
      padding: 11px 12px;
      border: 1px solid #D8E1D9;
      border-radius: 16px;
      background: #fff;
      color: inherit;
      text-decoration: none;
      box-shadow: 0 3px 12px rgba(19,52,22,.04);
    }
    .sponsor-ad:hover { border-color: #A9C6AC; }
    .sponsor-ad-image { width: 74px; height: 60px; border-radius: 11px; object-fit: cover; background: var(--green-soft); }
    .sponsor-ad-placeholder { width: 74px; height: 60px; display: grid; place-items: center; border-radius: 11px; background: var(--green-soft); color: var(--green); font-weight: 950; font-size: 20px; }
    .sponsor-ad-copy { min-width: 0; }
    .sponsor-ad-label { display: block; margin-bottom: 3px; color: var(--muted); font-size: 10px; font-weight: 850; letter-spacing: .04em; text-transform: uppercase; }
    .sponsor-ad-copy strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sponsor-ad-copy small { display: block; margin-top: 4px; color: var(--muted); line-height: 1.35; }
    .sponsor-ad-action { color: var(--green); font-weight: 900; white-space: nowrap; }

    .sale-cart { border: 1px solid var(--line); border-radius: 14px; overflow: hidden; background: #FAFCFA; }
    .sale-cart-head { min-height: 48px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-bottom: 1px solid var(--line); }
    .sale-cart-head span { color: var(--muted); font-size: 12px; font-weight: 800; }
    .sale-cart-empty { padding: 13px; color: var(--muted); font-size: 13px; text-align: center; }
    .sale-cart-item { display: grid; grid-template-columns: minmax(0,1fr) auto auto; align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 1px solid var(--line); }
    .sale-cart-item:last-child { border-bottom: 0; }
    .sale-cart-item strong, .sale-cart-item small { display: block; }
    .sale-cart-item small { margin-top: 3px; color: var(--muted); }
    .sale-cart-remove { min-width: 40px; min-height: 40px; padding: 6px; border: 0; border-radius: 10px; background: #FCE9E7; color: var(--danger); font-weight: 900; }
    .ad-privacy-note { border-left: 4px solid var(--green); }

    @media (max-width: 560px) {
      .sponsor-ad { grid-template-columns: 58px minmax(0,1fr); }
      .sponsor-ad-image, .sponsor-ad-placeholder { width: 58px; height: 54px; }
      .sponsor-ad-action { display: none; }
      .sale-cart-item { grid-template-columns: minmax(0,1fr) auto; }
      .sale-cart-item .amount { grid-column: 1; }
      .sale-cart-remove { grid-column: 2; grid-row: 1 / span 2; }
    }

'''
html = replace_exact(html, style_marker, style_block + style_marker, 'insert ad/cart styles')

html = replace_exact(html,
    '<p>1–9 ажилтантай жижиг бизнест зориулсан энгийн борлуулалт, агуулах, түгээлтийн систем</p>',
    '<p>1–9 ажилтантай бизнест зориулсан · бүх үндсэн боломж үнэгүй · зарын дэмжлэгтэй</p>',
    'auth free ad copy')

sales_metrics = '''          <div class="grid grid-3 today-overview">
            <div class="card metric"><small>Өнөөдрийн борлуулалт</small><strong id="todaySalesAmount">0₮</strong><div class="metric-footer"><span>Өнөөдөр</span></div></div>
            <div class="card metric"><small>Өнөөдрийн гүйлгээ</small><strong id="todaySalesCount">0</strong><div class="metric-footer"><span>Борлуулалтын тоо</span></div></div>
            <div class="card metric"><small>Бага үлдэгдэлтэй</small><strong id="todayLowStockCount">0</strong><div class="metric-footer"><span>Анхаарах бараа</span></div></div>
          </div>'''
html = replace_exact(html, sales_metrics, sales_metrics + '\n\n          <div class="ad-slot" data-ad-placement="sales"></div>', 'sales ad slot')

page_heads = {
'''          <div class="page-head">
            <div><h2>Агуулах</h2><p>Үлдэгдэл болон агуулахын хөдөлгөөн удирдана.</p></div>
          </div>''': 'inventory',
'''          <div class="page-head">
            <div><h2>Түгээлт</h2><p>Харилцагч дээр очсон бүртгэл, GPS, зураг хадгална.</p></div>
          </div>''': 'distribution',
'''          <div class="page-head">
            <div><h2>Хяналт самбар</h2><p>Борлуулалт, бүтээгдэхүүн, борлуулагч, зээлийн тойм.</p></div>
          </div>''': 'dashboard',
'''          <div class="page-head">
            <div><h2>Тохиргоо</h2><p>Эрхийн төлөв, хэрэглэгч болон системийн мэдээлэл.</p></div>
          </div>''': 'settings'
}
for head, placement in page_heads.items():
    html = replace_exact(html, head, head + f'\n          <div class="ad-slot" data-ad-placement="{placement}"></div>', f'{placement} ad slot')

qty_price = '''              <div class="form-grid two">
                <div class="field">
                  <label for="saleQty">Тоо ширхэг</label>
                  <input id="saleQty" type="number" inputmode="decimal" min="0.01" step="0.01" required>
                </div>
                <div class="field">
                  <label for="salePrice">Нэгж үнэ</label>
                  <input id="salePrice" type="number" inputmode="numeric" min="0" step="1" placeholder="Бүртгэлтэй үнээс санал болгоно" required>
                </div>
              </div>'''
cart_html = qty_price + '''
              <button id="addSaleItemBtn" class="btn btn-secondary btn-block" type="button">＋ Барааг сагсанд нэмэх</button>
              <div id="saleCartWrap" class="sale-cart">
                <div class="sale-cart-head"><strong>Борлуулалтын сагс</strong><span id="saleCartCount">0 бараа</span></div>
                <div id="saleCartList"><div class="sale-cart-empty">Олон бараатай борлуулалт хийх бол бараагаа нэг нэгээр нь сагсанд нэмнэ.</div></div>
              </div>'''
html = replace_exact(html, qty_price, cart_html, 'sale cart markup')

settings_banner = '''            <div id="subscriptionBanner" class="banner">
              <h3 id="subscriptionTitle">Free эрх</h3>
              <p id="subscriptionText">Үндсэн функцууд ашиглах боломжтой.</p>
              <a class="btn btn-primary" href="https://www.facebook.com/DataLinxMN" target="_blank" rel="noopener" style="margin-top:13px;text-decoration:none">Premium эрхийн талаар холбогдох</a>
            </div>'''
settings_replacement = '''            <div id="subscriptionBanner" class="banner">
              <h3 id="subscriptionTitle">Үнэгүй · зарын дэмжлэгтэй</h3>
              <p id="subscriptionText">Бүх үндсэн боломж нээлттэй.</p>
              <a class="btn btn-primary" href="https://www.facebook.com/DataLinxMN" target="_blank" rel="noopener" style="margin-top:13px;text-decoration:none">Тусламж авах</a>
            </div>

            <div class="card ad-privacy-note">
              <h3>Зар ба нууцлал</h3>
              <p class="card-subtitle" style="margin:0;line-height:1.55">Системийг үнэ төлбөргүй ажиллуулахын тулд жижиг, саад болдоггүй ивээн тэтгэсэн зар харуулна. Сурталчлагчид танай борлуулалт, бараа, ажилтан, харилцагч болон GPS мэдээлэлд хандахгүй. Зар нь DataLinx-ийн master бүртгэлээс ирэх бөгөөд бизнесийн датаас тусдаа байна.</p>
            </div>'''
html = replace_exact(html, settings_banner, settings_replacement, 'settings ad disclosure')
html = html.replace('                <small style="color:var(--muted)">Free эрхийн серверийн хязгаар: нэг компанид 5 хүртэл борлуулагч.</small>\n', '', 1)

# State and event wiring.
html = replace_exact(html, """      users: [],
      dashboard: null,""", """      users: [],
      ads: [],
      saleCart: [],
      dashboard: null,""", 'state ads/cart')

html = replace_exact(html, """      $('#saleQty').addEventListener('input', updateSaleSummary);
      $('#salePrice').addEventListener('input', updateSaleSummary);""", """      $('#saleQty').addEventListener('input', updateSaleSummary);
      $('#salePrice').addEventListener('input', updateSaleSummary);
      $('#addSaleItemBtn').addEventListener('click', addCurrentSaleItemToCart);
      $('#saleCartList').addEventListener('click', event => {
        const button = event.target.closest('[data-cart-remove]');
        if (button) removeSaleCartItem(Number(button.dataset.cartRemove));
      });""", 'cart bindings')

html = replace_exact(html, """      if (Array.isArray(data.users)) state.users = data.users;
      if (data.dashboard) state.dashboard = data.dashboard;""", """      if (Array.isArray(data.users)) state.users = data.users;
      if (Array.isArray(data.ads)) state.ads = data.ads;
      if (data.dashboard) state.dashboard = data.dashboard;""", 'payload ads')

old_optimistic_sale = '''        if (item.action === 'addSale') {
          const product = state.products.find(x => x.name === p.product);
          if (product) product.stock = numberValue(product.stock) - numberValue(p.quantity);
          if (!state.recentTransactions.some(x => x.clientId === item.id)) {
            state.recentTransactions.unshift({
              date: item.createdAt,
              rep: state.session?.user?.fullName || state.session?.user?.username || '',
              product: p.product,
              quantity: p.quantity,
              unitPrice: p.unitPrice,
              total: numberValue(p.quantity) * numberValue(p.unitPrice),
              customer: p.customer,
              paymentType: p.paymentType,
              location: p.location,
              clientId: item.id,
              saleId: '',
              status: 'Pending',
              warehouse: p.warehouse || '',
              syncStatus: 'pending'
            });
          }
        }'''
new_optimistic_sale = '''        if (item.action === 'addSale') {
          const saleItems = Array.isArray(p.items) && p.items.length
            ? p.items
            : [{ product: p.product, quantity: p.quantity, unitPrice: p.unitPrice }];
          saleItems.forEach(line => {
            const product = state.products.find(x => x.name === line.product);
            if (product) product.stock = numberValue(product.stock) - numberValue(line.quantity);
          });
          if (!state.recentTransactions.some(x => x.clientId === item.id)) {
            const total = saleItems.reduce((sum, line) => sum + numberValue(line.quantity) * numberValue(line.unitPrice), 0);
            const quantity = saleItems.reduce((sum, line) => sum + numberValue(line.quantity), 0);
            state.recentTransactions.unshift({
              date: item.createdAt,
              rep: state.session?.user?.fullName || state.session?.user?.username || '',
              product: saleItems.length === 1 ? saleItems[0].product : `${saleItems.length} төрлийн бараа`,
              quantity,
              unitPrice: saleItems.length === 1 ? numberValue(saleItems[0].unitPrice) : 0,
              total,
              customer: p.customer,
              paymentType: p.paymentType,
              location: p.location,
              clientId: item.id,
              saleId: '',
              status: 'Pending',
              warehouse: p.warehouse || '',
              syncStatus: 'pending'
            });
          }
        }'''
html = replace_exact(html, old_optimistic_sale, new_optimistic_sale, 'optimistic multi item sale')

sale_logic_pattern = r"    function updateSaleSummary\(\) \{.*?\n    function renderSales\(\) \{"
sale_logic = r'''    function readCurrentSaleLine(required = false) {
      const productName = $('#saleProduct').value.trim();
      const qtyRaw = $('#saleQty').value;
      const priceRaw = $('#salePrice').value;
      const hasDraft = Boolean(productName || qtyRaw || priceRaw);
      if (!hasDraft && !required) return null;
      const product = state.products.find(item => item.name === productName);
      const quantity = numberValue(qtyRaw);
      const unitPrice = numberValue(priceRaw);
      if (!product) throw new Error('Бараа сонгоно уу.');
      if (quantity <= 0) throw new Error('Тоо ширхэг 0-ээс их байна.');
      if (unitPrice < 0) throw new Error('Нэгж үнэ 0-ээс бага байж болохгүй.');
      const alreadyInCart = state.saleCart
        .filter(item => item.product === product.name)
        .reduce((sum, item) => sum + numberValue(item.quantity), 0);
      if (quantity + alreadyInCart > numberValue(product.stock)) {
        throw new Error(`${product.name} барааны үлдэгдэл хүрэлцэхгүй байна.`);
      }
      return { product: product.name, quantity, unitPrice };
    }

    function addCurrentSaleItemToCart() {
      try {
        const line = readCurrentSaleLine(true);
        const existing = state.saleCart.find(item => item.product === line.product && numberValue(item.unitPrice) === line.unitPrice);
        if (existing) existing.quantity = numberValue(existing.quantity) + line.quantity;
        else state.saleCart.push(line);
        $('#saleProduct').value = '';
        $('#saleProduct').dataset.selectedValue = '';
        $('#saleQty').value = '';
        $('#salePrice').value = '';
        updateSaleProduct();
        renderSaleCart();
        $('#saleProduct').focus();
        toast('Бараа сагсанд нэмэгдлээ.', 'success');
      } catch (error) {
        toast(error.message, 'error');
      }
    }

    function removeSaleCartItem(index) {
      if (!Number.isInteger(index) || index < 0 || index >= state.saleCart.length) return;
      state.saleCart.splice(index, 1);
      renderSaleCart();
      updateSaleSummary();
    }

    function renderSaleCart() {
      const list = $('#saleCartList');
      const count = state.saleCart.reduce((sum, item) => sum + numberValue(item.quantity), 0);
      $('#saleCartCount').textContent = `${formatNumber(count)} нэгж · ${state.saleCart.length} төрөл`;
      list.innerHTML = state.saleCart.length ? state.saleCart.map((item, index) => `
        <div class="sale-cart-item">
          <div><strong>${escapeHtml(item.product)}</strong><small>${formatNumber(item.quantity)} × ${money(item.unitPrice)}</small></div>
          <div class="amount">${money(item.quantity * item.unitPrice)}</div>
          <button class="sale-cart-remove" type="button" data-cart-remove="${index}" aria-label="Сагснаас хасах">×</button>
        </div>`).join('') : '<div class="sale-cart-empty">Олон бараатай борлуулалт хийх бол бараагаа нэг нэгээр нь сагсанд нэмнэ.</div>';
      updateSaleSummary();
    }

    function updateSaleSummary() {
      const cartTotal = state.saleCart.reduce((sum, item) => sum + numberValue(item.quantity) * numberValue(item.unitPrice), 0);
      const draftTotal = numberValue($('#saleQty').value) * numberValue($('#salePrice').value);
      $('#saleTotal').textContent = money(cartTotal + draftTotal);
    }

    async function handleSale(event) {
      event.preventDefault();
      const btn = $('#saleBtn');
      setButtonLoading(btn, true, navigator.onLine ? 'Хадгалж байна...' : 'Офлайн хадгалж байна...');
      try {
        const customer = $('#saleCustomer').value.trim();
        if (!customer) throw new Error('Харилцагч сонгох эсвэл шинээр нэмнэ үү.');
        const items = state.saleCart.map(item => ({ ...item }));
        const currentLine = readCurrentSaleLine(items.length === 0);
        if (currentLine) items.push(currentLine);
        if (!items.length) throw new Error('Борлуулах бараа нэмнэ үү.');

        const requestedByProduct = {};
        items.forEach(line => { requestedByProduct[line.product] = (requestedByProduct[line.product] || 0) + numberValue(line.quantity); });
        Object.entries(requestedByProduct).forEach(([name, quantity]) => {
          const product = state.products.find(item => item.name === name);
          if (!product || quantity > numberValue(product.stock)) throw new Error(`${name} барааны үлдэгдэл хүрэлцэхгүй байна.`);
        });

        const first = items[0];
        const payload = {
          action: 'addSale',
          items,
          product: first.product,
          quantity: first.quantity,
          unitPrice: first.unitPrice,
          customer,
          paymentType: $('#salePayment').value,
          location: $('#saleLocation').value || state.locations[0]?.name || 'Үндсэн байршил',
          warehouse: state.warehouses[0]?.name || 'Үндсэн агуулах'
        };
        if (!state.customers.some(name => name.toLocaleLowerCase('mn-MN') === customer.toLocaleLowerCase('mn-MN'))) {
          state.customers.push(customer);
          state.customers.sort((a, b) => a.localeCompare(b, 'mn-MN'));
        }
        const item = enqueueAction('addSale', payload);
        state.saleCart = [];
        rebuildOptimisticState();
        renderAll();
        showSaleSuccess(payload, true);
        $('#saleForm').reset();
        renderSaleCart();
        updateSaleProduct();
        refreshSmartSelect('saleCustomer');

        if (!navigator.onLine) {
          toast('Борлуулалт офлайн хадгалагдлаа. Сүлжээ ороход автоматаар илгээгдэнэ.', 'success');
          return;
        }
        const result = await syncOfflineQueue(item.id);
        if (result.status === 'rejected') throw new Error(result.message || 'Борлуулалтыг сервер хүлээж авсангүй.');
        if (result.status === 'synced') {
          showSaleSuccess(payload, false, result.data?.saleId || result.data?.transaction?.saleId || '');
          toast('Борлуулалт амжилттай хадгалагдлаа.', 'success');
        } else {
          toast('Сервертэй холбогдсонгүй. Борлуулалт sync хүлээж байна.', 'error');
        }
      } catch (error) {
        $('#saleSuccess').classList.add('hidden');
        toast(error.message, 'error');
      } finally {
        setButtonLoading(btn, false);
      }
    }

    function showSaleSuccess(payload, pending, saleId = '') {
      const effectiveId = saleId || payload.saleId || '';
      const items = Array.isArray(payload.items) && payload.items.length ? payload.items : [payload];
      const totalQty = items.reduce((sum, item) => sum + numberValue(item.quantity), 0);
      const total = items.reduce((sum, item) => sum + numberValue(item.quantity) * numberValue(item.unitPrice), 0);
      const productText = items.length === 1 ? items[0].product : `${items.length} төрлийн бараа`;
      $('#saleSuccessBody').innerHTML = [
        ['Төлөв', pending ? 'Sync хүлээж байна' : 'Серверт хадгалагдсан'],
        ['Sale ID', effectiveId || 'Sync хийсний дараа үүснэ'],
        ['Бараа', productText],
        ['Нийт тоо', formatNumber(totalQty)],
        ['Нийт дүн', money(total)],
        ['Харилцагч', payload.customer],
        ['Төлбөр', payload.paymentType]
      ].map(([a,b]) => `<div class="summary-row"><span>${escapeHtml(a)}</span><strong>${escapeHtml(String(b))}</strong></div>`).join('');
      const oldButton = $('#saleSuccess').querySelector('.sale-success-doc-btn');
      if (oldButton) oldButton.remove();
      if (!pending && effectiveId) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-secondary btn-block sale-success-doc-btn';
        button.textContent = 'Баримт харах / хэвлэх';
        button.addEventListener('click', () => openSaleDetail(effectiveId));
        $('#saleSuccess').appendChild(button);
      }
      $('#saleSuccess').classList.remove('hidden');
    }

    function renderSales() {'''
html = replace_regex(html, sale_logic_pattern, sale_logic, 'sale cart logic', re.S)

html = replace_exact(html, """    function isPremium() { return state.session?.companyStatus === 'Active'; }""", """    function isPremium() { return state.session?.companyStatus !== 'Inactive'; }""", 'free full access helper')

html = replace_exact(html, """      topStatus.textContent = status === 'Active' ? 'PREMIUM' : status === 'Inactive' ? 'ИДЭВХГҮЙ' : 'FREE';
      topStatus.className = `status-pill ${status === 'Active' ? 'premium' : status === 'Inactive' ? 'inactive' : ''}`;""", """      topStatus.textContent = status === 'Inactive' ? 'ИДЭВХГҮЙ' : 'ҮНЭГҮЙ · ЗАРТАЙ';
      topStatus.className = `status-pill ${status === 'Inactive' ? 'inactive' : ''}`;""", 'top free ads status')

html = replace_exact(html, """      renderDashboard();
      renderSettings();
      applyTierUi();""", """      renderDashboard();
      renderSettings();
      renderAds();
      renderSaleCart();
      applyTierUi();""", 'render ads and cart')

old_tier = '''    function applyTierUi() {
      const premium = isPremium();
      $('#saleLocationField').classList.toggle('hidden', !premium);
      $('#transferOption').classList.toggle('hidden', !premium);
      if (!premium && $('#invType').value === 'шилжүүлэг') $('#invType').value = 'орлого';
      updateInventoryFields();
      $('#dashboardPremiumWrap').classList.toggle('locked', !premium);
      $('#dashboardLock').classList.toggle('hidden', premium);
      $('#routeCard').classList.toggle('hidden', !premium);
    }'''
new_tier = '''    function applyTierUi() {
      const active = state.session?.companyStatus !== 'Inactive';
      $('#saleLocationField').classList.toggle('hidden', !active || state.locations.length <= 1);
      $('#transferOption').classList.toggle('hidden', !active || state.warehouses.length <= 1);
      if ((!active || state.warehouses.length <= 1) && $('#invType').value === 'шилжүүлэг') $('#invType').value = 'орлого';
      updateInventoryFields();
      $('#dashboardPremiumWrap').classList.remove('locked');
      $('#dashboardLock').classList.add('hidden');
      $('#routeCard').classList.toggle('hidden', !active);
    }'''
html = replace_exact(html, old_tier, new_tier, 'free tier UI')

settings_pattern = r"    function renderSettings\(\) \{\n      const status = state\.session\.companyStatus;.*?\n      const user = state\.session\.user;"
settings_logic = r'''    function renderSettings() {
      const status = state.session.companyStatus;
      const banner = $('#subscriptionBanner');
      banner.classList.toggle('inactive', status === 'Inactive');
      if (status === 'Inactive') {
        $('#subscriptionTitle').textContent = 'Эрх идэвхгүй';
        $('#subscriptionText').textContent = 'Систем ашиглах эрх хаалттай. DataLinx-тэй холбогдоно уу.';
      } else {
        $('#subscriptionTitle').textContent = 'Үнэгүй · зарын дэмжлэгтэй';
        $('#subscriptionText').textContent = 'Борлуулалт, агуулах, түгээлт, хяналтын самбар, олон байршил болон хэрэглэгчийн удирдлагын үндсэн боломжууд бүгд нээлттэй.';
      }
      const user = state.session.user;'''
html = replace_regex(html, settings_pattern, settings_logic, 'settings free ads logic', re.S)

ads_js = r'''
    function safeAdUrl(value) {
      try {
        const url = new URL(String(value || ''), window.location.href);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
      } catch (error) {
        return '';
      }
    }

    function renderAds() {
      const fallback = {
        id: 'DATALINX-HOUSE',
        title: 'DataLinx · Жижиг бизнесийн дижитал шийдэл',
        description: 'Google Sheets, AppSheet болон автоматжуулалтын үйлчилгээ.',
        imageUrl: '',
        linkUrl: FACEBOOK_URL,
        placement: 'all',
        sponsor: 'DataLinx'
      };
      $$('.ad-slot').forEach(slot => {
        const placement = slot.dataset.adPlacement || 'all';
        const matches = state.ads.filter(ad => ['all', placement].includes(String(ad.placement || 'all').toLowerCase()));
        const pool = matches.length ? matches : [fallback];
        const daySeed = Math.floor(Date.now() / 86400000) + placement.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
        const ad = pool[Math.abs(daySeed) % pool.length];
        const link = safeAdUrl(ad.linkUrl) || FACEBOOK_URL;
        const image = safeAdUrl(ad.imageUrl);
        slot.innerHTML = `<a class="sponsor-ad" href="${escapeHtml(link)}" target="_blank" rel="noopener sponsored">
          ${image ? `<img class="sponsor-ad-image" src="${escapeHtml(image)}" alt="">` : '<div class="sponsor-ad-placeholder">DL</div>'}
          <div class="sponsor-ad-copy">
            <span class="sponsor-ad-label">Ивээн тэтгэсэн${ad.sponsor ? ` · ${escapeHtml(ad.sponsor)}` : ''}</span>
            <strong>${escapeHtml(ad.title || '')}</strong>
            <small>${escapeHtml(ad.description || '')}</small>
          </div>
          <span class="sponsor-ad-action">Дэлгэрэнгүй ›</span>
        </a>`;
      });
    }

'''
html = replace_exact(html, "    function applyTierUi() {", ads_js + "    function applyTierUi() {", 'insert ad renderer')

# Update remaining user-facing Premium wording that would contradict full access.
html = html.replace('Premium хэсэг', 'Хяналтын самбар')
html = html.replace('Хяналт самбар, борлуулагчийн харьцуулалт, сарын өсөлтийн тайланг идэвхжүүлнэ.', 'Борлуулалт, бараа, борлуулагч болон авлагын тойм.')
html = html.replace('Premium эрхтэй үед бүх борлуулагчийн GPS цэг болон маршрут харагдана.', 'Менежер бүх борлуулагчийн GPS цэг болон маршрутыг харна.')
html = html.replace('Premium эрхтэй үед бага үлдэгдлийн хязгаар болон олон агуулахын боломж идэвхжинэ.', 'Бага үлдэгдлийн хязгаар болон олон агуулахын боломж бүх компанид нээлттэй.')
html = html.replace('Бараа орлогод авах, зарлагадах эсвэл Premium эрхтэй үед агуулах хооронд шилжүүлэх хөдөлгөөнийг шалтгаантай нь бүртгэнэ.', 'Бараа орлогод авах, зарлагадах эсвэл агуулах хооронд шилжүүлэх хөдөлгөөнийг шалтгаантай нь бүртгэнэ.')
html = html.replace('Эрхийн төлөв, хэрэглэгч болон системийн мэдээлэл.', 'Үнэгүй эрх, зарын мэдээлэл, хэрэглэгч болон системийн тохиргоо.')

INDEX.write_text(html, encoding='utf-8')
CODE.write_text(gs, encoding='utf-8')

# Lightweight structural checks before CI syntax validation.
for required in ['data-ad-placement="sales"', 'id="saleCartList"', 'function renderAds()', "MASTER_SHEETS.ADS"]:
    target = html if required != 'MASTER_SHEETS.ADS' else gs
    if required not in target:
        raise SystemExit(f'Missing required output: {required}')

ids = re.findall(r'\bid="([^"]+)"', html)
duplicates = sorted({item for item in ids if ids.count(item) > 1})
if duplicates:
    raise SystemExit('Duplicate HTML IDs: ' + ', '.join(duplicates))

print('Applied free-with-ads access, first-party ads, and multi-item cart.')
