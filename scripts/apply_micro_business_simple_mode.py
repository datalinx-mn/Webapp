from pathlib import Path
import re

path = Path('index.html')
text = path.read_text(encoding='utf-8')


def replace_once(old, new, label):
    global text
    if old not in text:
        raise SystemExit(f'{label} insertion point not found')
    text = text.replace(old, new, 1)

# Position the product for 1–9 employee businesses in the login screen.
replace_once(
    '<p>Жижиг бизнесийн борлуулалт, агуулах, түгээлтийн нэгдсэн систем</p>',
    '<p>1–9 ажилтантай жижиг бизнест зориулсан энгийн борлуулалт, агуулах, түгээлтийн систем</p>',
    'auth subtitle'
)

# Compact, progressive-disclosure UI styles.
css = r'''

    /* Simple mode for 1–9 employee businesses */
    .micro-business-intro {
      margin-bottom: 14px;
      padding: 14px 15px;
      border: 1px solid #CDE7D0;
      border-radius: 16px;
      background: linear-gradient(135deg, #F1FAF2, #FFFFFF);
    }
    .micro-business-intro strong { display: block; color: var(--green); margin-bottom: 4px; }
    .micro-business-intro span { color: var(--muted); font-size: 13px; line-height: 1.45; }

    .quick-start-card { margin-bottom: 14px; }
    .quick-start-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
    .quick-start-head h3 { margin: 0 0 4px; }
    .quick-start-head p { margin: 0; color: var(--muted); font-size: 13px; }
    .quick-start-badge { flex: 0 0 auto; padding: 5px 9px; border-radius: 999px; background: var(--green-soft); color: var(--green); font-size: 12px; font-weight: 900; }
    .quick-start-steps { display: grid; gap: 8px; }
    .quick-step {
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
      min-height: 58px;
      padding: 9px 10px;
      border: 1px solid var(--line);
      border-radius: 13px;
      background: #fff;
    }
    .quick-step-index { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; background: #EEF2EE; color: var(--muted); font-weight: 900; }
    .quick-step strong { display: block; font-size: 14px; }
    .quick-step small { display: block; color: var(--muted); margin-top: 2px; }
    .quick-step.done { border-color: #B9DDBD; background: #F6FCF6; }
    .quick-step.done .quick-step-index { background: var(--green); color: #fff; }
    .quick-step.done .quick-step-index::before { content: '✓'; }
    .quick-step.done .quick-step-index { font-size: 0; }
    .quick-step.done .quick-step-index::before { font-size: 16px; }
    .quick-step .btn { min-height: 42px; padding: 8px 11px; }

    .today-overview { margin-bottom: 14px; }
    .today-overview .metric { min-height: 96px; }
    .today-overview .metric strong { font-size: 22px; }

    .simple-details { padding: 0; overflow: hidden; }
    .simple-details > summary {
      list-style: none;
      min-height: 62px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      cursor: pointer;
      font-weight: 900;
      background: #fff;
    }
    .simple-details > summary::-webkit-details-marker { display: none; }
    .simple-details > summary::after { content: '＋'; color: var(--green); font-size: 20px; }
    .simple-details[open] > summary::after { content: '−'; }
    .simple-details > summary span { display: block; }
    .simple-details > summary small { display: block; margin-top: 3px; color: var(--muted); font-weight: 600; line-height: 1.35; }
    .simple-details-body { padding: 0 16px 16px; border-top: 1px solid var(--line); }
    .simple-details-body > .product-management-grid,
    .simple-details-body > .form-grid { padding-top: 14px; }
    .form-simple-note { margin: -2px 0 2px; color: var(--muted); font-size: 13px; line-height: 1.45; }

    @media (max-width: 659px) {
      .quick-start-head { display: block; }
      .quick-start-badge { display: inline-flex; margin-top: 8px; }
      .quick-step { grid-template-columns: 34px minmax(0, 1fr); }
      .quick-step .btn { grid-column: 1 / -1; width: 100%; }
    }
'''
replace_once('    @media (min-width: 660px) {', css + '\n    @media (min-width: 660px) {', 'simple mode CSS')

# Add quick setup and a useful free overview to the first screen.
sales_marker = '''          <div class="page-head">
            <div><h2>Борлуулалт</h2><p>Бараа сонгон борлуулалтын гүйлгээ бүртгэнэ.</p></div>
          </div>
          <div class="grid grid-main">'''
sales_replacement = '''          <div class="page-head">
            <div><h2>Борлуулалт</h2><p>Өдөр тутмын борлуулалтаа хэдхэн алхмаар бүртгэнэ.</p></div>
          </div>

          <div class="micro-business-intro">
            <strong>Жижиг бизнест хэрэгтэй үндсэн зүйлс нэг дор</strong>
            <span>Бараагаа бүртгээд, харилцагчаа сонгон борлуулалт хийнэ. Нарийн тохиргоонуудыг хэрэгтэй үедээ нээнэ.</span>
          </div>

          <section id="quickStartCard" class="card quick-start-card manager-only">
            <div class="quick-start-head">
              <div><h3>Түргэн эхлэх</h3><p>Системийг ашиглаж эхлэхэд ердөө 3 алхам.</p></div>
              <span id="quickStartBadge" class="quick-start-badge">0 / 3</span>
            </div>
            <div class="quick-start-steps">
              <div id="quickStepProduct" class="quick-step">
                <span class="quick-step-index">1</span>
                <div><strong>Бараа бүртгэх</strong><small>Нэр, үнэ, үлдэгдэл эсвэл баркод оруулна.</small></div>
                <button id="quickProductBtn" class="btn btn-secondary" type="button">Бараа нэмэх</button>
              </div>
              <div id="quickStepCustomer" class="quick-step">
                <span class="quick-step-index">2</span>
                <div><strong>Харилцагч нэмэх</strong><small>Борлуулалтын үед нэрийг шууд бичиж нэмнэ.</small></div>
                <button id="quickCustomerBtn" class="btn btn-secondary" type="button">Харилцагч</button>
              </div>
              <div id="quickStepSale" class="quick-step">
                <span class="quick-step-index">3</span>
                <div><strong>Эхний борлуулалт хийх</strong><small>Бараа, тоо, төлбөрөө сонгоод хадгална.</small></div>
                <button id="quickSaleBtn" class="btn btn-primary" type="button">Борлуулалт</button>
              </div>
            </div>
          </section>

          <div class="grid grid-3 today-overview">
            <div class="card metric"><small>Өнөөдрийн борлуулалт</small><strong id="todaySalesAmount">0₮</strong><div class="metric-footer"><span>Өнөөдөр</span></div></div>
            <div class="card metric"><small>Өнөөдрийн гүйлгээ</small><strong id="todaySalesCount">0</strong><div class="metric-footer"><span>Борлуулалтын тоо</span></div></div>
            <div class="card metric"><small>Бага үлдэгдэлтэй</small><strong id="todayLowStockCount">0</strong><div class="metric-footer"><span>Анхаарах бараа</span></div></div>
          </div>

          <div class="grid grid-main">'''
replace_once(sales_marker, sales_replacement, 'sales quick start')
text = text.replace('<h3>Шинэ борлуулалт</h3>', '<h3>Борлуулалт бүртгэх</h3>', 1)

# Collapse product management by default while keeping it one tap away.
product_open = '''          <section id="productManagementCard" class="card manager-only" style="margin-bottom:14px">
            <div class="page-head" style="margin-bottom:14px">
              <div><h3 style="margin:0">Бараа удирдах</h3><p>Менежер бараа нэмэх, мэдээллийг засах болон үлдэгдэлгүй барааг устгах боломжтой.</p></div>
            </div>
            <div class="product-management-grid">'''
product_new = '''          <details id="productManagementCard" class="card manager-only simple-details" style="margin-bottom:14px">
            <summary><span>Бараа удирдах<small>Шинэ бараа нэмэх, үнэ болон үлдэгдэл засах</small></span></summary>
            <div class="simple-details-body">
              <div class="product-management-grid">'''
replace_once(product_open, product_new, 'product details open')

product_close_marker = '''              </div>
            </div>
          </section>

          <div class="grid grid-main">'''
product_close_new = '''              </div>
            </div>
          </details>

          <div class="grid grid-main">'''
replace_once(product_close_marker, product_close_new, 'product details close')

# Make distribution usable as a short form; move optional operational data under details.
visit_title = '<h3>Шинэ түгээлт / айлчлал</h3>'
replace_once(visit_title, visit_title + '\n              <p class="form-simple-note">Үндсэндээ харилцагч, төлөв, зураг/GPS болон тэмдэглэл хангалттай. Бусад мэдээллийг шаардлагатай үед нээнэ.</p>', 'visit simple note')

advanced_start = '''              <div class="form-grid two">
                <div class="field"><label for="visitCustomerPhone">Утас</label>'''
advanced_start_new = '''              <details id="visitOperationalDetails" class="simple-details">
                <summary><span>Хаяг, жолооч, маршрут<small>Хүргэлтийн нарийвчилсан мэдээлэл</small></span></summary>
                <div class="simple-details-body form-grid">
              <div class="form-grid two">
                <div class="field"><label for="visitCustomerPhone">Утас</label>'''
replace_once(advanced_start, advanced_start_new, 'visit operational details start')

advanced_end = '''              </div>
              <div class="field">
                <label for="visitStatus">Төлөв</label>'''
advanced_end_new = '''              </div>
                </div>
              </details>
              <div class="field">
                <label for="visitStatus">Төлөв</label>'''
replace_once(advanced_end, advanced_end_new, 'visit operational details end')
text = text.replace('<input id="visitDriver" list="visitDriverList" placeholder="Жолоочийн нэр" required>', '<input id="visitDriver" list="visitDriverList" placeholder="Жолоочийн нэр">', 1)

payment_start = '''              <div class="form-grid two">
                <div class="field"><label for="visitCollectedPayment">Хураасан төлбөр</label>'''
payment_start_new = '''              <details id="visitPaymentDetails" class="simple-details">
                <summary><span>Төлбөр, авлага<small>Мөнгө хураасан үед бөглөнө</small></span></summary>
                <div class="simple-details-body form-grid">
              <div class="form-grid two">
                <div class="field"><label for="visitCollectedPayment">Хураасан төлбөр</label>'''
replace_once(payment_start, payment_start_new, 'visit payment details start')

payment_end = '''              </div>
              <div class="form-grid two">
                <div class="field">
                  <label>GPS байршил</label>'''
payment_end_new = '''              </div>
                </div>
              </details>
              <div class="form-grid two">
                <div class="field">
                  <label>GPS байршил</label>'''
replace_once(payment_end, payment_end_new, 'visit payment details end')

exception_start = '''              <div class="field"><label for="visitFailureReason">Амжилтгүй болсон шалтгаан</label>'''
exception_start_new = '''              <details id="visitExceptionDetails" class="simple-details">
                <summary><span>Амжилтгүй хүргэлт, буцаалт<small>Зөвхөн асуудал гарсан үед бөглөнө</small></span></summary>
                <div class="simple-details-body form-grid">
              <div class="field"><label for="visitFailureReason">Амжилтгүй болсон шалтгаан</label>'''
replace_once(exception_start, exception_start_new, 'visit exceptions start')

exception_end = '''              <div class="field">
                <label for="visitNotes">Тэмдэглэл</label>'''
exception_end_new = '''                </div>
              </details>
              <div class="field">
                <label for="visitNotes">Тэмдэглэл</label>'''
# Insert close after both failure and returned-product fields.
returned_block = '''              <div class="field"><label for="visitReturnedProducts">Буцаасан барааны тэмдэглэл</label><textarea id="visitReturnedProducts" placeholder="Бараа, тоо хэмжээ"></textarea></div>
'''
if returned_block not in text:
    raise SystemExit('visit returned product block not found')
text = text.replace(returned_block, returned_block + '                </div>\n              </details>\n', 1)

# Wire quick-start controls and render their live state.
replace_once('      bindForms();\n      bindCamera();', '      bindForms();\n      bindQuickStart();\n      bindCamera();', 'bind quick start init')

bind_anchor = '''    function bindCamera() {
'''
bind_code = '''    function bindQuickStart() {
      $('#quickProductBtn')?.addEventListener('click', async () => {
        showPage('inventory');
        const details = $('#productManagementCard');
        if (details) details.open = true;
        window.setTimeout(() => $('#productName')?.focus(), 220);
      });
      $('#quickCustomerBtn')?.addEventListener('click', () => {
        showPage('sales', false);
        window.setTimeout(() => $('#saleCustomer')?.focus(), 120);
      });
      $('#quickSaleBtn')?.addEventListener('click', () => {
        showPage('sales', false);
        window.setTimeout(() => $('#saleCustomer')?.focus(), 120);
      });
    }

    function bindCamera() {
'''
replace_once(bind_anchor, bind_code, 'bind quick start function')

replace_once('      renderSales();\n      renderInventory();', '      renderSales();\n      renderMicroBusinessOverview();\n      renderInventory();', 'render simple overview call')

render_anchor = '''    function transactionId(tx) {
'''
render_code = '''    function renderMicroBusinessOverview() {
      const now = new Date();
      const isToday = value => {
        const date = new Date(value);
        return !Number.isNaN(date.getTime())
          && date.getFullYear() === now.getFullYear()
          && date.getMonth() === now.getMonth()
          && date.getDate() === now.getDate();
      };
      const todayRows = state.recentTransactions.filter(tx => isToday(tx.date));
      const todayTotal = todayRows.reduce((sum, tx) => sum + numberValue(tx.total), 0);
      const lowStock = state.products.filter(product => {
        const threshold = numberValue(product.threshold);
        return threshold > 0 && numberValue(product.stock) <= threshold;
      });
      if ($('#todaySalesAmount')) $('#todaySalesAmount').textContent = money(todayTotal);
      if ($('#todaySalesCount')) $('#todaySalesCount').textContent = formatNumber(todayRows.length);
      if ($('#todayLowStockCount')) $('#todayLowStockCount').textContent = formatNumber(lowStock.length);

      const done = {
        product: state.products.length > 0,
        customer: state.customers.length > 0,
        sale: state.recentTransactions.length > 0
      };
      $('#quickStepProduct')?.classList.toggle('done', done.product);
      $('#quickStepCustomer')?.classList.toggle('done', done.customer);
      $('#quickStepSale')?.classList.toggle('done', done.sale);
      const completed = Object.values(done).filter(Boolean).length;
      if ($('#quickStartBadge')) $('#quickStartBadge').textContent = completed === 3 ? 'Ашиглахад бэлэн' : `${completed} / 3`;
      if ($('#quickProductBtn')) $('#quickProductBtn').textContent = done.product ? 'Бараа удирдах' : 'Бараа нэмэх';
      if ($('#quickCustomerBtn')) $('#quickCustomerBtn').textContent = done.customer ? 'Дахин нэмэх' : 'Харилцагч';
      if ($('#quickSaleBtn')) $('#quickSaleBtn').textContent = done.sale ? 'Шинэ борлуулалт' : 'Борлуулалт';
    }

    function transactionId(tx) {
'''
replace_once(render_anchor, render_code, 'render simple overview function')

# Walkthrough starts with the simpler setup path for managers.
walkthrough_marker = '''        {
          page: 'sales', selector: '#saleForm', title: 'Борлуулалт бүртгэх','''
walkthrough_new = '''        {
          page: 'sales', selector: '#quickStartCard', title: '3 алхмаар эхлэх',
          text: 'Менежер эхлээд бараагаа бүртгэж, борлуулалтын үеэр харилцагчаа нэмж, дараа нь эхний борлуулалтаа хадгална. Хийсэн алхам бүр автоматаар тэмдэглэгдэнэ.'
        },
        {
          page: 'sales', selector: '#saleForm', title: 'Борлуулалт бүртгэх','''
replace_once(walkthrough_marker, walkthrough_new, 'walkthrough quick start')

# Ensure HTML structure is not obviously broken around the new details blocks.
if text.count('<details') != text.count('</details>'):
    raise SystemExit(f'Unbalanced details tags: {text.count("<details")} vs {text.count("</details>")}')

path.write_text(text, encoding='utf-8')
print('Applied micro-business simple mode')
