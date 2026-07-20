from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')

def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    text = text.replace(old, new, 1)

replace_once(
"""    .route-pin span { transform: rotate(45deg); }\n\n    .table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 14px; }""",
"""    .route-pin span { transform: rotate(45deg); }\n\n    .product-management-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }\n    .product-form-actions { display: grid; grid-template-columns: 1fr; gap: 8px; }\n    .product-code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }\n    .product-management-grid .row-actions { display: flex; flex-wrap: wrap; gap: 6px; }\n    .product-management-grid td.num, .product-management-grid th.num { text-align: right; white-space: nowrap; }\n\n    .table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 14px; }""",
'product css')

replace_once(
"""      .content { width: 100%; padding: 24px 28px 42px; }\n      .mobile-nav { display: none; }""",
"""      .content { width: 100%; padding: 24px 28px 42px; }\n      .product-management-grid { grid-template-columns: minmax(300px, .8fr) minmax(0, 1.6fr); }\n      .product-form-actions { grid-template-columns: 1fr 1fr; }\n      .mobile-nav { display: none; }""",
'desktop product css')

inventory_anchor = """        <section id=\"page-inventory\" class=\"page\">\n          <div class=\"page-head\">\n            <div><h2>Агуулах</h2><p>Үлдэгдэл болон агуулахын хөдөлгөөн удирдана.</p></div>\n          </div>\n          <div class=\"grid grid-main\">"""
product_html = """        <section id=\"page-inventory\" class=\"page\">\n          <div class=\"page-head\">\n            <div><h2>Агуулах</h2><p>Үлдэгдэл болон агуулахын хөдөлгөөн удирдана.</p></div>\n          </div>\n          <section id=\"productManagementCard\" class=\"card manager-only\" style=\"margin-bottom:14px\">\n            <div class=\"page-head\" style=\"margin-bottom:14px\">\n              <div><h3 style=\"margin:0\">Бараа удирдах</h3><p>Менежер бараа нэмэх, мэдээллийг засах болон үлдэгдэлгүй барааг устгах боломжтой.</p></div>\n            </div>\n            <div class=\"product-management-grid\">\n              <form id=\"productForm\" class=\"form-grid\" novalidate>\n                <input id=\"productOriginalName\" type=\"hidden\">\n                <div class=\"field\">\n                  <label for=\"productName\">Барааны нэр</label>\n                  <input id=\"productName\" maxlength=\"120\" placeholder=\"Жишээ: Шоколадтай бялуу\" required>\n                </div>\n                <div class=\"form-grid two\">\n                  <div class=\"field\"><label for=\"productCode\">Барааны код</label><input id=\"productCode\" maxlength=\"50\" placeholder=\"SKU-001\"></div>\n                  <div class=\"field\"><label for=\"productUnit\">Хэмжих нэгж</label><input id=\"productUnit\" maxlength=\"30\" value=\"ш\" placeholder=\"ш, кг, хайрцаг\" required></div>\n                </div>\n                <div class=\"form-grid two\">\n                  <div class=\"field\"><label for=\"productPrice\">Нэгж үнэ</label><input id=\"productPrice\" type=\"number\" inputmode=\"numeric\" min=\"0\" step=\"1\" required></div>\n                  <div class=\"field\"><label for=\"productStock\">Эхний / одоогийн үлдэгдэл</label><input id=\"productStock\" type=\"number\" inputmode=\"decimal\" min=\"0\" step=\"0.01\" required></div>\n                </div>\n                <div class=\"field\">\n                  <label for=\"productThreshold\">Бага үлдэгдлийн хязгаар</label>\n                  <input id=\"productThreshold\" type=\"number\" inputmode=\"decimal\" min=\"0\" step=\"0.01\" value=\"0\">\n                  <small class=\"field-hint\">Үлдэгдэл энэ хэмжээнд хүрэхэд анхааруулга харагдана.</small>\n                </div>\n                <div class=\"product-form-actions\">\n                  <button id=\"saveProductBtn\" class=\"btn btn-primary\" type=\"submit\">Бараа хадгалах</button>\n                  <button id=\"cancelProductEditBtn\" class=\"btn btn-neutral hidden\" type=\"button\">Засварыг цуцлах</button>\n                </div>\n              </form>\n              <div>\n                <div class=\"field\" style=\"margin-bottom:10px\">\n                  <label for=\"productSearch\">Бараа хайх</label>\n                  <input id=\"productSearch\" type=\"search\" placeholder=\"Нэр эсвэл кодоор хайх\">\n                </div>\n                <div id=\"productManagementTable\" class=\"table-wrap\"></div>\n              </div>\n            </div>\n          </section>\n\n          <div class=\"grid grid-main\">"""
replace_once(inventory_anchor, product_html, 'inventory product section')

replace_once(
"""      $('#userForm').addEventListener('submit', handleSaveUser);\n      $('#saleQty').addEventListener('input', updateSaleSummary);""",
"""      $('#userForm').addEventListener('submit', handleSaveUser);\n      $('#productForm').addEventListener('submit', handleSaveProduct);\n      $('#cancelProductEditBtn').addEventListener('click', resetProductForm);\n      $('#productSearch').addEventListener('input', renderProductManagement);\n      $('#productManagementTable').addEventListener('click', handleProductTableClick);\n      $('#saleQty').addEventListener('input', updateSaleSummary);""",
'product event bindings')

replace_once(
"""      if (isManager()) {\n        steps.push({\n          page: 'settings', selector: '#userForm', title: 'Хэрэглэгч удирдах',""",
"""      if (isManager()) {\n        steps.push({\n          page: 'inventory', selector: '#productManagementCard', title: 'Бараа удирдах',\n          text: 'Менежер шинэ бараа нэмэх, код, нэгж үнэ, үлдэгдэл болон бага үлдэгдлийн хязгаарыг засах боломжтой. Үлдэгдэл 0 болсон барааг устгаж болно.'\n        });\n        steps.push({\n          page: 'settings', selector: '#userForm', title: 'Хэрэглэгч удирдах',""",
'walkthrough product step')

replace_once(
"""      renderSales();\n      renderInventory();\n      renderVisits();""",
"""      renderSales();\n      renderInventory();\n      renderProductManagement();\n      renderVisits();""",
'render product management')

text = text.replace(
"Одоогоор бараа бүртгэлгүй байна. Менежер компанийн Бараа хүснэгтэд бараа нэмнэ.",
"Одоогоор бараа бүртгэлгүй байна. Менежер Агуулах → Бараа удирдах хэсгээс бараа нэмнэ."
)

product_js = r'''
    function renderProductManagement() {
      const wrap = $('#productManagementTable');
      if (!wrap || !isManager()) return;
      const query = ($('#productSearch')?.value || '').trim().toLocaleLowerCase('mn-MN');
      const rows = state.products.filter(product => {
        const haystack = `${product.name || ''} ${product.code || ''}`.toLocaleLowerCase('mn-MN');
        return !query || haystack.includes(query);
      });
      wrap.innerHTML = rows.length ? `<table><thead><tr><th>Бараа</th><th>Код / нэгж</th><th class="num">Үнэ</th><th class="num">Үлдэгдэл</th><th>Үйлдэл</th></tr></thead><tbody>${rows.map(product => `
        <tr>
          <td><strong>${escapeHtml(product.name)}</strong><br><small>Доод хязгаар: ${escapeHtml(formatNumber(product.threshold || 0))}</small></td>
          <td><span class="product-code">${escapeHtml(product.code || '—')}</span><br><small>${escapeHtml(product.unit || 'ш')}</small></td>
          <td class="num">${escapeHtml(money(product.price))}</td>
          <td class="num">${escapeHtml(formatNumber(product.stock))}</td>
          <td><div class="row-actions">
            <button class="btn btn-secondary" type="button" data-product-edit="${escapeHtml(product.name)}" style="min-height:40px;padding:7px 10px">Засах</button>
            <button class="btn btn-danger" type="button" data-product-delete="${escapeHtml(product.name)}" style="min-height:40px;padding:7px 10px" ${numberValue(product.stock) !== 0 ? 'disabled title="Үлдэгдэл 0 болсон үед устгана"' : ''}>Устгах</button>
          </div></td>
        </tr>`).join('')}</tbody></table>` : emptyHtml(query ? 'Хайлтад тохирох бараа олдсонгүй.' : 'Бараа бүртгэлгүй байна.');
    }

    function handleProductTableClick(event) {
      const editButton = event.target.closest('[data-product-edit]');
      if (editButton) return editProduct(editButton.dataset.productEdit);
      const deleteButton = event.target.closest('[data-product-delete]');
      if (deleteButton && !deleteButton.disabled) deleteProduct(deleteButton.dataset.productDelete);
    }

    function editProduct(name) {
      const product = state.products.find(item => item.name === name);
      if (!product) return toast('Барааны мэдээлэл олдсонгүй.', 'error');
      $('#productOriginalName').value = product.name || '';
      $('#productName').value = product.name || '';
      $('#productCode').value = product.code || '';
      $('#productUnit').value = product.unit || 'ш';
      $('#productPrice').value = numberValue(product.price);
      $('#productStock').value = numberValue(product.stock);
      $('#productThreshold').value = numberValue(product.threshold);
      $('#saveProductBtn').textContent = 'Өөрчлөлт хадгалах';
      $('#cancelProductEditBtn').classList.remove('hidden');
      $('#productForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
      $('#productName').focus({ preventScroll: true });
    }

    function resetProductForm() {
      $('#productForm').reset();
      $('#productOriginalName').value = '';
      $('#productUnit').value = 'ш';
      $('#productThreshold').value = '0';
      $('#saveProductBtn').textContent = 'Бараа хадгалах';
      $('#cancelProductEditBtn').classList.add('hidden');
    }

    async function handleSaveProduct(event) {
      event.preventDefault();
      const button = $('#saveProductBtn');
      setButtonLoading(button, true, 'Хадгалж байна...');
      try {
        if (!isManager()) throw new Error('Зөвхөн менежер бараа удирдах эрхтэй.');
        if (!navigator.onLine) throw new Error('Бараа хадгалахад интернет холболт шаардлагатай.');
        const payload = {
          action: 'saveProduct',
          originalName: $('#productOriginalName').value.trim(),
          name: $('#productName').value.trim(),
          code: $('#productCode').value.trim(),
          unit: $('#productUnit').value.trim() || 'ш',
          price: numberValue($('#productPrice').value),
          stock: numberValue($('#productStock').value),
          threshold: numberValue($('#productThreshold').value)
        };
        if (!payload.name) throw new Error('Барааны нэрийг оруулна уу.');
        if (payload.price < 0) throw new Error('Нэгж үнэ 0-ээс бага байж болохгүй.');
        if (payload.stock < 0) throw new Error('Үлдэгдэл 0-ээс бага байж болохгүй.');
        if (payload.threshold < 0) throw new Error('Бага үлдэгдлийн хязгаар 0-ээс бага байж болохгүй.');
        const data = await postAction(payload);
        if (!data.success) throw new Error(data.message || 'Бараа хадгалж чадсангүй.');
        state.serverProducts = Array.isArray(data.products) ? data.products : state.serverProducts;
        rebuildOptimisticState();
        resetProductForm();
        renderAll();
        saveCache();
        toast(payload.originalName ? 'Барааны мэдээлэл шинэчлэгдлээ.' : 'Шинэ бараа нэмэгдлээ.', 'success');
      } catch (error) {
        toast(error.message, 'error');
      } finally {
        setButtonLoading(button, false);
      }
    }

    async function deleteProduct(name) {
      const product = state.products.find(item => item.name === name);
      if (!product) return toast('Барааны мэдээлэл олдсонгүй.', 'error');
      if (numberValue(product.stock) !== 0) return toast('Үлдэгдэлтэй барааг устгах боломжгүй. Эхлээд үлдэгдлийг 0 болгоно уу.', 'error');
      if (!confirm(`“${name}” барааг устгах уу? Энэ үйлдлийг буцаах боломжгүй.`)) return;
      try {
        if (!navigator.onLine) throw new Error('Бараа устгахад интернет холболт шаардлагатай.');
        showLoading('Бараа устгаж байна...');
        const data = await postAction({ action: 'deleteProduct', name });
        if (!data.success) throw new Error(data.message || 'Бараа устгаж чадсангүй.');
        state.serverProducts = Array.isArray(data.products) ? data.products : state.serverProducts.filter(item => item.name !== name);
        rebuildOptimisticState();
        if ($('#productOriginalName').value === name) resetProductForm();
        renderAll();
        saveCache();
        toast('Бараа устгагдлаа.', 'success');
      } catch (error) {
        toast(error.message, 'error');
      } finally {
        hideLoading();
      }
    }
'''

replace_once(
"""    function renderInventory() {""",
product_js + "\n    function renderInventory() {",
'product javascript')

path.write_text(text, encoding='utf-8')
print('Product management UI applied successfully.')
