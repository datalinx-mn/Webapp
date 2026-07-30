from pathlib import Path

index_path = Path('index.html')
code_path = Path('Code.gs')
text = index_path.read_text(encoding='utf-8')
code = code_path.read_text(encoding='utf-8')


def replace_once(source, old, new, label):
    if old in source:
        return source.replace(old, new, 1)
    if new in source:
        return source
    raise SystemExit(f'{label}: marker not found')

# Cart submission must be handled by Mongolian custom validation, because the
# current product inputs are intentionally empty after lines are added to cart.
text = replace_once(
    text,
    '<form id="saleForm" class="card form-grid">',
    '<form id="saleForm" class="card form-grid" novalidate>',
    'saleForm novalidate'
)

text = replace_once(
    text,
    """    function safeAdUrl(value) {
      try {
        const url = new URL(String(value || ''), window.location.href);""",
    """    function safeAdUrl(value) {
      const raw = String(value || '').trim();
      if (!raw) return '';
      try {
        const url = new URL(raw, window.location.href);""",
    'safeAdUrl empty value'
)

text = text.replace('<span id="topStatus" class="status-pill">FREE</span>', '<span id="topStatus" class="status-pill">ҮНЭГҮЙ</span>', 1)

text = replace_once(
    text,
    """      state.serverProducts = [];
      state.serverTransactions = [];
      state.serverInventoryMoves = [];
      $('#appScreen').classList.add('hidden');""",
    """      state.serverProducts = [];
      state.serverTransactions = [];
      state.serverInventoryMoves = [];
      state.ads = [];
      state.saleCart = [];
      $('#appScreen').classList.add('hidden');""",
    'logout state reset'
)

text = replace_once(
    text,
    """        users: state.users,
        dashboard: state.dashboard,""",
    """        users: state.users,
        ads: state.ads,
        dashboard: state.dashboard,""",
    'cache ads'
)

old_commit = '''      if (item.action === 'addSale') {
        const product = state.serverProducts.find(x => x.name === p.product);
        if (product) product.stock = Number.isFinite(Number(data.remainingStock)) ? Number(data.remainingStock) : numberValue(product.stock) - numberValue(p.quantity);
        if (!state.serverTransactions.some(tx => tx.clientId === item.id)) {
          const transaction = data.transaction || {};
          state.serverTransactions.unshift({
            date: transaction.date || data.date || item.createdAt,
            rep: transaction.rep || state.session?.user?.fullName || state.session?.user?.username || '',
            product: transaction.product || p.product,
            quantity: transaction.quantity ?? p.quantity,
            unitPrice: transaction.unitPrice ?? p.unitPrice,
            total: transaction.total ?? numberValue(p.quantity) * numberValue(p.unitPrice),
            customer: transaction.customer || p.customer,
            paymentType: transaction.paymentType || p.paymentType,
            location: transaction.location || p.location,
            clientId: item.id,
            saleId: transaction.saleId || data.saleId || '',
            status: transaction.status || 'Approved',
            warehouse: transaction.warehouse || p.warehouse || '',
            dueDate: transaction.dueDate || ''
          });
        }
      }'''
new_commit = '''      if (item.action === 'addSale') {
        const saleItems = Array.isArray(p.items) && p.items.length
          ? p.items
          : [{ product: p.product, quantity: p.quantity, unitPrice: p.unitPrice }];
        const remainingStocks = data.remainingStocks || {};
        saleItems.forEach(line => {
          const product = state.serverProducts.find(x => x.name === line.product);
          if (!product) return;
          if (Object.prototype.hasOwnProperty.call(remainingStocks, line.product)) product.stock = numberValue(remainingStocks[line.product]);
          else product.stock = numberValue(product.stock) - numberValue(line.quantity);
        });
        if (!state.serverTransactions.some(tx => tx.clientId === item.id)) {
          const transaction = data.transaction || {};
          const fallbackTotal = saleItems.reduce((sum, line) => sum + numberValue(line.quantity) * numberValue(line.unitPrice), 0);
          const fallbackQuantity = saleItems.reduce((sum, line) => sum + numberValue(line.quantity), 0);
          state.serverTransactions.unshift({
            date: transaction.date || data.date || item.createdAt,
            rep: transaction.rep || state.session?.user?.fullName || state.session?.user?.username || '',
            product: transaction.product || (saleItems.length === 1 ? saleItems[0].product : `${saleItems.length} төрлийн бараа`),
            quantity: transaction.quantity ?? fallbackQuantity,
            unitPrice: transaction.unitPrice ?? (saleItems.length === 1 ? numberValue(saleItems[0].unitPrice) : 0),
            total: transaction.total ?? fallbackTotal,
            customer: transaction.customer || p.customer,
            paymentType: transaction.paymentType || p.paymentType,
            location: transaction.location || p.location,
            clientId: item.id,
            saleId: transaction.saleId || data.saleId || '',
            status: transaction.status || 'Approved',
            warehouse: transaction.warehouse || p.warehouse || '',
            dueDate: transaction.dueDate || ''
          });
        }
      }'''
text = replace_once(text, old_commit, new_commit, 'commit multi-item sale')

# Return exact stock balances for every product in a multi-item transaction.
code = replace_once(
    code,
    """        return { success: true, duplicate: true, date: mapped.date, total: mapped.total, remainingStock: mapped.remainingStock || 0, saleId: mapped.saleId, transaction: mapped };""",
    """        return { success: true, duplicate: true, date: mapped.date, total: mapped.total, remainingStock: mapped.remainingStock || 0, remainingStocks: getSaleStockMap_(companySs, p), saleId: mapped.saleId, transaction: mapped };""",
    'duplicate sale stock map'
)

code = replace_once(
    code,
    """    const aggregated = {};
    items.forEach(function(item) {""",
    """    const aggregated = {};
    const remainingStocks = {};
    items.forEach(function(item) {""",
    'remaining stock accumulator'
)

code = replace_once(
    code,
    """      const stock = Number(field_(entry.object, ['Одоогийн үлдэгдэл']) || 0);
      setObjectFields_(productSheet, entry.rowNumber, { 'Одоогийн үлдэгдэл': stock - requested.quantity });
      adjustWarehouseStock_(companySs, warehouse, requested.product, -requested.quantity, true, stock);""",
    """      const stock = Number(field_(entry.object, ['Одоогийн үлдэгдэл']) || 0);
      const updatedStock = stock - requested.quantity;
      setObjectFields_(productSheet, entry.rowNumber, { 'Одоогийн үлдэгдэл': updatedStock });
      adjustWarehouseStock_(companySs, warehouse, requested.product, -requested.quantity, true, stock);
      remainingStocks[requested.product] = updatedStock;""",
    'record remaining stocks'
)

code = replace_once(
    code,
    """    const refreshedFirstProduct = findObjectRowByValue_(productSheet, ['Барааны нэр'], items[0].product);
    const remainingStock = refreshedFirstProduct ? Number(field_(refreshedFirstProduct.object, ['Одоогийн үлдэгдэл']) || 0) : 0;""",
    """    const remainingStock = Number(remainingStocks[items[0].product] || 0);""",
    'first remaining stock'
)

code = replace_once(
    code,
    """    return { success: true, date: now.toISOString(), total: netTotal, remainingStock: remainingStock, saleId: saleId, transaction: transaction };""",
    """    return { success: true, date: now.toISOString(), total: netTotal, remainingStock: remainingStock, remainingStocks: remainingStocks, saleId: saleId, transaction: transaction };""",
    'return remaining stock map'
)

helper_marker = "function normalizeSaleItems_(p) {"
helper = '''function getSaleStockMap_(companySs, p) {
  const result = {};
  const productSheet = companySs.getSheetByName(COMPANY_SHEETS.PRODUCTS);
  normalizeSaleItems_(p).forEach(function(item) {
    if (Object.prototype.hasOwnProperty.call(result, item.product)) return;
    const entry = findObjectRowByValue_(productSheet, ['Барааны нэр'], item.product);
    result[item.product] = entry ? Number(field_(entry.object, ['Одоогийн үлдэгдэл']) || 0) : 0;
  });
  return result;
}

'''
if helper not in code:
    if helper_marker not in code:
        raise SystemExit('stock map helper marker not found')
    code = code.replace(helper_marker, helper + helper_marker, 1)

index_path.write_text(text, encoding='utf-8')
code_path.write_text(code, encoding='utf-8')
print('Applied final free-with-ads and multi-item synchronization fixes')
