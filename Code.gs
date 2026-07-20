'use strict';

const MASTER_SHEETS = {
  COMPANIES: 'Компани',
  USERS: 'Хэрэглэгч'
};

const COMPANY_SHEETS = {
  PRODUCTS: 'Бараа',
  SALES: 'Гүйлгээ',
  INVENTORY_MOVES: 'Агуулахын хөдөлгөөн',
  NORMS: 'Норм',
  VISITS: 'Түгээлт',
  DISTRIBUTION_ITEMS: 'Түгээлтийн дэлгэрэнгүй',
  WAREHOUSES: 'Агуулах',
  WAREHOUSE_STOCK: 'Агуулахын үлдэгдэл',
  LOCATIONS: 'Байршил',
  CUSTOMERS: 'Харилцагч',
  SETTINGS: 'Тохиргоо',
  PAYMENTS: 'Төлбөр',
  DOCUMENT_NUMBERS: 'DOCUMENT_NUMBERS',
  DOCUMENTS: 'DOCUMENTS'
};

const SHEET_HEADERS = {
  PRODUCTS: ['Барааны нэр','Нэгж үнэ','Одоогийн үлдэгдэл','Бага үлдэгдлийн хязгаар','Код','Хэмжих нэгж','Идэвхтэй'],
  SALES: ['Огноо','Рэп нэр','Бараа','Тоо','Үнэ','Нийт дүн','Харилцагч','Төлбөрийн төрөл','Байршил','Client ID','SaleID','Status','Warehouse','DeliveryType','DeliveryDate','Notes','InvoiceNumber','InvoicePdfUrl','InvoiceGeneratedAt','WarehouseIssueNumber','WarehouseIssuePdfUrl','WarehouseIssueGeneratedAt','CustomerID','Discount','VAT','PaidAmount','DueDate','DeliveryID','CreatedBy'],
  INVENTORY_MOVES: ['Огноо','Бараа','Хөдөлгөөний төрөл (орлого/зарлага/шилжүүлэг)','Тоо','Шалтгаан','Агуулах','Гарах агуулах','Хүлээн авах агуулах','Client ID','SaleID','DistributionID','Confirmed','Нэгж үнэ','Нийт дүн','Рэп нэр'],
  NORMS: ['Бараа','Бага үлдэгдлийн хязгаар'],
  DISTRIBUTION_ITEMS: ['DistributionID','SaleID','Бараа','Код','Нэгж','Захиалсан','Хүргэсэн','Буцаасан','Нэгжийн үнэ','Нийт дүн'],
  VISITS: ['Огноо','Рэп нэр','Харилцагч','Өргөрөг','Уртраг','Зургийн холбоос','Тэмдэглэл','Client ID','DistributionID','SaleID','InvoiceNumber','PlannedDeliveryDate','DeliveredAt','Route','Vehicle','Driver','SalesEmployee','Warehouse','CustomerPhone','CustomerAddress','LocationText','ContactPerson','Status','DeliveryNotes','FailureReason','ReturnedProducts','CollectedPayment','PaymentMethod','RemainingReceivable','DistributionReceiptNumber','DistributionReceiptPdfUrl','DistributionReceiptGeneratedAt','ReceivedBy','CustomerSignatureUrl','ProofImageUrl'],
  WAREHOUSES: ['Агуулахын нэр','Хариуцсан нярав','Хаяг','Утас'],
  WAREHOUSE_STOCK: ['Агуулах','Бараа','Үлдэгдэл'],
  LOCATIONS: ['Байршлын нэр'],
  CUSTOMERS: ['Харилцагчийн нэр','CustomerID','Регистрийн дугаар','Утас','Хаяг','Холбоо барих хүн','Төлбөрийн нөхцөл','Идэвхтэй'],
  SETTINGS: ['Түлхүүр','Утга','Тайлбар'],
  PAYMENTS: ['PaymentID','SaleID','Огноо','Дүн','Төлбөрийн арга','Баталгаажуулсан','Тэмдэглэл','CreatedBy'],
  DOCUMENT_NUMBERS: ['CompanyID','DocumentType','Prefix','LastNumber','UpdatedAt','UpdatedBy'],
  DOCUMENTS: ['DocumentID','CompanyID','DocumentType','DocumentNumber','ReferenceType','ReferenceID','SaleID','DistributionID','CustomerID','FileName','DriveFileID','PdfUrl','Version','Status','CreatedBy','CreatedAt']
};

const FREE_REP_LIMIT = 5;
const LOGIN_ATTEMPT_LIMIT = 10;
const LOGIN_WINDOW_SECONDS = 60;
const SESSION_SECONDS = 21600;
const INITIAL_HISTORY_DAYS = 60;
const INITIAL_HISTORY_LIMIT = 100;
const UPGRADE_URL = 'https://www.facebook.com/DataLinxMN';

function doGet(e) {
  try {
    ensureMasterSheets_();
    const action = clean_(e && e.parameter && e.parameter.action);
    if (action === 'login') return json_(handleLogin_(e.parameter || {}));
    if (action === 'bootstrap') {
      const auth = requireSession_(clean_(e.parameter.token));
      return json_(buildInitialPayload_(auth));
    }
    if (action === 'module') {
      const auth = requireSession_(clean_(e.parameter.token));
      return json_(loadModule_(auth, clean_(e.parameter.module)));
    }
    if (action === 'history') {
      const auth = requireSession_(clean_(e.parameter.token));
      return json_(loadOlderHistory_(auth, e.parameter || {}));
    }
    return json_({ success: true, message: 'DataLinx API ажиллаж байна.' });
  } catch (error) {
    return json_({ success: false, message: error.message || String(error) });
  }
}

function doPost(e) {
  try {
    ensureMasterSheets_();
    const payload = parseBody_(e);
    const action = clean_(payload.action);
    if (action === 'registerCompany') return json_(handleRegisterCompany_(payload));

    const auth = requireSession_(clean_(payload.token));
    if (action === 'saveProduct') return json_(handleSaveProduct_(auth, payload));
    if (action === 'deleteProduct') return json_(handleDeleteProduct_(auth, payload));
    if (action === 'addSale') return json_(handleAddSale_(auth, payload));
    if (action === 'addInventoryMove') return json_(handleAddInventoryMove_(auth, payload));
    if (action === 'addVisit') return json_(handleAddVisit_(auth, payload));
    if (action === 'saveUser') return json_(handleSaveUser_(auth, payload));
    if (action === 'deleteUser') return json_(handleDeleteUser_(auth, payload));
    if (action === 'getPrintPreview') return json_(handleGetPrintPreview_(auth, payload));
    if (action === 'generatePdf') return json_(handleGeneratePdf_(auth, payload));
    if (action === 'getDocumentHistory') return json_(handleGetDocumentHistory_(auth, payload));
    return json_({ success: false, message: 'Тодорхойгүй POST action.' });
  } catch (error) {
    return json_({ success: false, message: error.message || String(error) });
  }
}

function handleLogin_(params) {
  const username = clean_(params.username);
  const password = String(params.password || '');
  if (!username || !password) throw new Error('Хэрэглэгчийн нэр болон нууц үг шаардлагатай.');

  const cache = CacheService.getScriptCache();
  const rateKey = 'login:' + username.toLowerCase();
  const failed = Number(cache.get(rateKey) || 0);
  if (failed >= LOGIN_ATTEMPT_LIMIT) {
    throw new Error('Нэг минутанд 10-аас олон буруу оролдлого хийсэн тул түр хаагдлаа. 1 минутын дараа дахин оролдоно уу.');
  }

  const master = masterSs_();
  const users = values_(master.getSheetByName(MASTER_SHEETS.USERS));
  const userRow = findRowByValue_(users, 0, username);
  if (!userRow || !passwordMatches_(password, userRow.values[1])) {
    cache.put(rateKey, String(failed + 1), LOGIN_WINDOW_SECONDS);
    throw new Error('Хэрэглэгчийн нэр эсвэл нууц үг буруу байна.');
  }

  cache.remove(rateKey);
  const companyName = clean_(userRow.values[4]);
  const company = getCompany_(companyName);
  if (!company) throw new Error('Компанийн мэдээлэл олдсонгүй.');
  if (!company.spreadsheetId) throw new Error('Компанийн Spreadsheet ID бүртгэгдээгүй байна.');
  if (company.status === 'Inactive') throw new Error('Компанийн эрх идэвхгүй байна. ' + UPGRADE_URL);

  const companySs = openCompanySs_(company);
  ensureCompanySheets_(companySs);

  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const auth = {
    username: clean_(userRow.values[0]),
    fullName: clean_(userRow.values[2]),
    role: normalizeRole_(userRow.values[3]),
    company: companyName,
    issuedAt: new Date().toISOString()
  };
  cache.put('session:' + token, JSON.stringify(auth), SESSION_SECONDS);

  const result = buildInitialPayload_(auth);
  result.token = token;
  return result;
}

function buildInitialPayload_(auth) {
  const company = requireActiveCompany_(auth.company);
  const companySs = openCompanySs_(company);
  ensureCompanySheets_(companySs);
  const recent = getRecentTransactions_(companySs, INITIAL_HISTORY_DAYS, INITIAL_HISTORY_LIMIT);
  return {
    success: true,
    user: { username: auth.username, fullName: auth.fullName, role: auth.role, company: auth.company },
    company: { name: company.name, phone: company.phone, email: company.email, spreadsheetId: company.spreadsheetId },
    companyStatus: company.status,
    expiresAt: company.expiresAt ? company.expiresAt.toISOString() : '',
    products: getProducts_(companySs),
    customers: getCustomers_(companySs),
    warehouses: getWarehouses_(companySs),
    locations: getLocations_(companySs),
    recentTransactions: recent.items,
    historyCursor: recent.historyCursor,
    hasMoreTransactions: recent.hasMore
  };
}

function loadModule_(auth, moduleName) {
  const company = requireActiveCompany_(auth.company);
  const companySs = openCompanySs_(company);
  ensureCompanySheets_(companySs);
  if (moduleName === 'inventory') {
    return { success: true, inventoryMoves: getRecentInventoryMoves_(companySs, 100) };
  }
  if (moduleName === 'distribution') {
    return { success: true, visits: getVisits_(companySs, auth, company.status, 50) };
  }
  if (moduleName === 'dashboard') {
    return { success: true, dashboard: company.status === 'Active' ? buildDashboard_(companySs) : lockedDashboard_() };
  }
  if (moduleName === 'settings') {
    return { success: true, users: canManageUsers_(auth) ? getUsers_(auth.company) : [] };
  }
  throw new Error('Тодорхойгүй module.');
}

function loadOlderHistory_(auth, params) {
  const company = requireActiveCompany_(auth.company);
  const companySs = openCompanySs_(company);
  const sheet = companySs.getSheetByName(COMPANY_SHEETS.SALES);
  const lastRow = sheet.getLastRow();
  const requestedBefore = Math.floor(Number(params.beforeRow || lastRow + 1));
  const beforeRow = Math.min(Math.max(requestedBefore, 2), lastRow + 1);
  const limit = Math.min(Math.max(Math.floor(Number(params.limit || 100)), 1), 250);
  const startRow = Math.max(2, beforeRow - limit);
  const count = Math.max(0, beforeRow - startRow);
  const headers = getHeaders_(sheet);
  const items = count ? sheet.getRange(startRow, 1, count, headers.length).getValues().map(function(row, index) {
    return mapSaleRow_(row, startRow + index, headers);
  }).reverse() : [];
  return {
    success: true,
    transactions: items,
    historyCursor: startRow,
    hasMoreTransactions: startRow > 2
  };
}

function handleRegisterCompany_(p) {
  const companyName = clean_(p.companyName);
  const phone = clean_(p.phone);
  const email = clean_(p.email);
  const managerName = clean_(p.managerName);
  const username = clean_(p.username);
  const password = String(p.password || '');
  if (!companyName || !phone || !managerName || !username || !password) throw new Error('Компанийн нэр, утас, менежерийн нэр, хэрэглэгчийн нэр, нууц үг шаардлагатай.');
  if (!/^\d{8}$/.test(phone)) throw new Error('Утасны дугаар яг 8 оронтой тоо байна.');
  if (password.length < 6) throw new Error('Нууц үг хамгийн багадаа 6 тэмдэгт байна.');
  validateUsername_(username);

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const master = masterSs_();
    const companySheet = master.getSheetByName(MASTER_SHEETS.COMPANIES);
    const userSheet = master.getSheetByName(MASTER_SHEETS.USERS);
    if (findRowByValue_(values_(companySheet), 0, companyName)) throw new Error('Ийм нэртэй компани бүртгэлтэй байна.');
    if (findRowByValue_(values_(userSheet), 0, username)) throw new Error('Энэ хэрэглэгчийн нэр ашиглагдаж байна.');

    const newSs = SpreadsheetApp.create(companyName + ' - DataLinx');
    setupNewCompanySpreadsheet_(newSs, { name: companyName, phone: phone, email: email });
    const newSheetId = newSs.getId();

    // Энэ spreadsheet нь Apps Script-ийг ажиллуулж буй DataLinx Google account-ын өмч байна.
    // Харилцагч өөрийн sheet-ээ шууд үзэх/экспортлох хүсэлт гаргавал DataLinx админ
    // тухайн spreadsheet-ийг хэрэглэгчийн Google имэйлтэй ГАРААР share хийнэ.
    // Автоматаар share хийхгүй — энэ нь зориудын manual admin алхам.
    companySheet.appendRow([companyName, newSheetId, 'Active', new Date(), 0, phone, email]);
    userSheet.appendRow([username, sha256_(password), managerName, 'manager', companyName]);
    return { success: true, message: 'Үнэгүй эрх амжилттай үүслээ.', spreadsheetId: newSheetId };
  } finally {
    lock.releaseLock();
  }
}

function handleAddSale_(auth, p) {
  const company = requireActiveCompany_(auth.company);
  const companySs = openCompanySs_(company);
  ensureCompanySheets_(companySs);

  const customerName = clean_(p.customer);
  if (!customerName) throw new Error('Харилцагч сонгох эсвэл шинээр нэмнэ үү.');
  const paymentType = clean_(p.paymentType) === 'Зээл' ? 'Зээл' : 'Бэлэн';
  const clientId = clean_(p.clientId);
  const location = company.status === 'Active' ? (clean_(p.location) || firstLocation_(companySs)) : firstLocation_(companySs);
  const warehouse = company.status === 'Active' ? (clean_(p.warehouse) || firstWarehouse_(companySs)) : firstWarehouse_(companySs);
  const items = normalizeSaleItems_(p);
  if (!items.length) throw new Error('Бүтээгдэхүүнгүй борлуулалт бүртгэх боломжгүй.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const salesSheet = companySs.getSheetByName(COMPANY_SHEETS.SALES);
    const salesHeaders = getHeaders_(salesSheet);
    if (clientId) {
      const existing = findRowByHeaderValue_(salesSheet, ['Client ID','ClientID'], clientId);
      if (existing) {
        const mapped = mapSaleRow_(existing.values, existing.rowNumber, salesHeaders);
        return { success: true, duplicate: true, date: mapped.date, total: mapped.total, remainingStock: mapped.remainingStock || 0, saleId: mapped.saleId, transaction: mapped };
      }
    }

    const productSheet = companySs.getSheetByName(COMPANY_SHEETS.PRODUCTS);
    const productData = sheetObjects_(productSheet);
    const productByName = {};
    productData.rows.forEach(function(entry) {
      const name = clean_(field_(entry.object, ['Барааны нэр']));
      if (name) productByName[name.toLowerCase()] = entry;
    });

    const aggregated = {};
    items.forEach(function(item) {
      const key = item.product.toLowerCase();
      if (!aggregated[key]) aggregated[key] = { product: item.product, quantity: 0 };
      aggregated[key].quantity += item.quantity;
    });

    Object.keys(aggregated).forEach(function(key) {
      const requested = aggregated[key];
      const entry = productByName[key];
      if (!entry) throw new Error(requested.product + ' бараа олдсонгүй.');
      const stock = Number(field_(entry.object, ['Одоогийн үлдэгдэл']) || 0);
      if (stock < requested.quantity) throw new Error(requested.product + ' барааны үлдэгдэл хүрэлцэхгүй байна. Одоогийн үлдэгдэл: ' + stock);
    });

    const now = new Date();
    const saleId = clean_(p.saleId) || createBusinessId_('SAL');
    const status = normalizeSaleStatus_(p.status || 'Approved');
    const customer = upsertCustomer_(companySs, customerName, p.customerData || {});
    const discountTotal = nonNegativeNumberOrZero_(p.discount);
    const vatTotal = nonNegativeNumberOrZero_(p.vat);
    const grossTotal = items.reduce(function(sum, item) { return sum + item.quantity * item.unitPrice; }, 0);
    const netTotal = Math.max(0, grossTotal - discountTotal + vatTotal);
    const paidAmount = p.paidAmount === undefined || p.paidAmount === null || p.paidAmount === '' ? (paymentType === 'Бэлэн' ? netTotal : 0) : nonNegativeNumberOrZero_(p.paidAmount);
    const dueDate = clean_(p.dueDate) || (paymentType === 'Зээл' ? defaultDueDate_(companySs, now) : '');

    Object.keys(aggregated).forEach(function(key) {
      const requested = aggregated[key];
      const entry = productByName[key];
      const stock = Number(field_(entry.object, ['Одоогийн үлдэгдэл']) || 0);
      setObjectFields_(productSheet, entry.rowNumber, { 'Одоогийн үлдэгдэл': stock - requested.quantity });
      adjustWarehouseStock_(companySs, warehouse, requested.product, -requested.quantity, true, stock);
    });

    const salesRows = items.map(function(item, index) {
      const lineDiscount = items.length === 1 ? discountTotal : 0;
      const lineVat = items.length === 1 ? vatTotal : 0;
      const lineGross = item.quantity * item.unitPrice;
      return objectToRow_(salesHeaders, {
        'Огноо': now,
        'Рэп нэр': auth.fullName || auth.username,
        'Бараа': item.product,
        'Тоо': item.quantity,
        'Үнэ': item.unitPrice,
        'Нийт дүн': Math.max(0, lineGross - lineDiscount + lineVat),
        'Харилцагч': customer.name,
        'Төлбөрийн төрөл': paymentType,
        'Байршил': location,
        'Client ID': clientId,
        'SaleID': saleId,
        'Status': status,
        'Warehouse': warehouse,
        'DeliveryType': clean_(p.deliveryType),
        'DeliveryDate': clean_(p.deliveryDate),
        'Notes': clean_(p.notes),
        'CustomerID': customer.customerId,
        'Discount': lineDiscount,
        'VAT': lineVat,
        'PaidAmount': index === 0 ? paidAmount : 0,
        'DueDate': dueDate,
        'DeliveryID': clean_(p.deliveryId),
        'CreatedBy': auth.username
      });
    });
    appendRows_(salesSheet, salesRows);

    const moveSheet = companySs.getSheetByName(COMPANY_SHEETS.INVENTORY_MOVES);
    const moveHeaders = getHeaders_(moveSheet);
    const moveRows = items.map(function(item) {
      return objectToRow_(moveHeaders, {
        'Огноо': now,
        'Бараа': item.product,
        'Хөдөлгөөний төрөл (орлого/зарлага/шилжүүлэг)': 'зарлага',
        'Тоо': item.quantity,
        'Шалтгаан': 'Борлуулалт ' + saleId,
        'Агуулах': warehouse,
        'Client ID': clientId,
        'SaleID': saleId,
        'DistributionID': clean_(p.deliveryId),
        'Confirmed': 'Тийм',
        'Нэгж үнэ': item.unitPrice,
        'Нийт дүн': item.quantity * item.unitPrice,
        'Рэп нэр': auth.fullName || auth.username
      });
    });
    appendRows_(moveSheet, moveRows);

    const refreshedFirstProduct = findObjectRowByValue_(productSheet, ['Барааны нэр'], items[0].product);
    const remainingStock = refreshedFirstProduct ? Number(field_(refreshedFirstProduct.object, ['Одоогийн үлдэгдэл']) || 0) : 0;
    const transaction = {
      rowNumber: salesSheet.getLastRow() - salesRows.length + 1,
      date: now.toISOString(),
      rep: auth.fullName || auth.username,
      product: items.length === 1 ? items[0].product : items.length + ' төрлийн бараа',
      quantity: items.reduce(function(sum, item) { return sum + item.quantity; }, 0),
      unitPrice: items.length === 1 ? items[0].unitPrice : 0,
      total: netTotal,
      customer: customer.name,
      paymentType: paymentType,
      location: location,
      clientId: clientId,
      saleId: saleId,
      status: status,
      warehouse: warehouse,
      dueDate: dueDate
    };
    return { success: true, date: now.toISOString(), total: netTotal, remainingStock: remainingStock, saleId: saleId, transaction: transaction };
  } finally {
    lock.releaseLock();
  }
}

function handleAddInventoryMove_(auth, p) {
  if (!canManageInventory_(auth)) throw new Error('Агуулахын хөдөлгөөн хийх эрх хүрэлцэхгүй байна.');
  const company = requireActiveCompany_(auth.company);
  const companySs = openCompanySs_(company);
  ensureCompanySheets_(companySs);
  const productName = clean_(p.product);
  const moveType = clean_(p.moveType).toLowerCase();
  const quantity = positiveNumber_(p.quantity, 'Тоо хэмжээ');
  const reason = clean_(p.reason);
  const clientId = clean_(p.clientId);
  if (!productName) throw new Error('Бараа сонгоно уу.');
  if (['орлого', 'зарлага', 'шилжүүлэг'].indexOf(moveType) === -1) throw new Error('Хөдөлгөөний төрөл буруу байна.');
  if (moveType === 'шилжүүлэг' && company.status !== 'Active') throw new Error('Агуулах хооронд шилжүүлэг нь Premium функц. ' + UPGRADE_URL);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const moveSheet = companySs.getSheetByName(COMPANY_SHEETS.INVENTORY_MOVES);
    const existing = clientId ? findRowByHeaderValue_(moveSheet, ['Client ID','ClientID'], clientId) : null;
    const productSheet = companySs.getSheetByName(COMPANY_SHEETS.PRODUCTS);
    const productEntry = findObjectRowByValue_(productSheet, ['Барааны нэр'], productName);
    if (!productEntry) throw new Error('Бараа олдсонгүй.');
    if (existing) return { success: true, duplicate: true, date: iso_(field_(rowToObject_(getHeaders_(moveSheet), existing.values), ['Огноо'])), stock: Number(field_(productEntry.object, ['Одоогийн үлдэгдэл']) || 0) };

    const current = Number(field_(productEntry.object, ['Одоогийн үлдэгдэл']) || 0);
    let newTotal = current;
    let fromWarehouse = '';
    let toWarehouse = '';
    const warehouse = company.status === 'Active' ? (clean_(p.warehouse) || firstWarehouse_(companySs)) : firstWarehouse_(companySs);

    if (moveType === 'орлого') {
      newTotal = current + quantity;
      adjustWarehouseStock_(companySs, warehouse, productName, quantity, false, current);
    } else if (moveType === 'зарлага') {
      if (current < quantity) throw new Error('Нийт үлдэгдэл хүрэлцэхгүй байна.');
      newTotal = current - quantity;
      adjustWarehouseStock_(companySs, warehouse, productName, -quantity, true, current);
    } else {
      fromWarehouse = clean_(p.fromWarehouse);
      toWarehouse = clean_(p.toWarehouse);
      if (!fromWarehouse || !toWarehouse || fromWarehouse === toWarehouse) throw new Error('Хоёр өөр агуулах сонгоно уу.');
      adjustWarehouseStock_(companySs, fromWarehouse, productName, -quantity, true, current);
      adjustWarehouseStock_(companySs, toWarehouse, productName, quantity, false, 0);
    }

    if (moveType !== 'шилжүүлэг') setObjectFields_(productSheet, productEntry.rowNumber, { 'Одоогийн үлдэгдэл': newTotal });
    const date = new Date();
    appendObjectRow_(moveSheet, {
      'Огноо': date,
      'Бараа': productName,
      'Хөдөлгөөний төрөл (орлого/зарлага/шилжүүлэг)': moveType,
      'Тоо': quantity,
      'Шалтгаан': reason,
      'Агуулах': warehouse,
      'Гарах агуулах': fromWarehouse,
      'Хүлээн авах агуулах': toWarehouse,
      'Client ID': clientId,
      'SaleID': saleId,
      'DistributionID': clean_(p.distributionId),
      'Confirmed': 'Тийм',
      'Нэгж үнэ': nonNegativeNumberOrZero_(p.unitPrice),
      'Нийт дүн': nonNegativeNumberOrZero_(p.unitPrice) * quantity,
      'Рэп нэр': auth.fullName || auth.username
    });
    return { success: true, date: date.toISOString(), stock: newTotal };
  } finally {
    lock.releaseLock();
  }
}

function handleAddVisit_(auth, p) {
  const company = requireActiveCompany_(auth.company);
  const companySs = openCompanySs_(company);
  ensureCompanySheets_(companySs);
  const customerName = clean_(p.customer);
  if (!customerName) throw new Error('Харилцагчийн нэр шаардлагатай.');
  const customer = upsertCustomer_(companySs, customerName, p.customerData || {});
  const latitude = clean_(p.latitude);
  const longitude = clean_(p.longitude);
  const notes = clean_(p.notes);
  const photoUrl = p.photoData ? savePhoto_(auth.company, auth.username, String(p.photoData)) : '';
  const distributionId = clean_(p.distributionId) || createBusinessId_('DISR');
  const saleId = clean_(p.saleId);
  let linkedSale = null;
  if (saleId) {
    linkedSale = findObjectRowByValue_(companySs.getSheetByName(COMPANY_SHEETS.SALES), ['SaleID'], saleId);
    if (!linkedSale) throw new Error('Сонгосон борлуулалтын мэдээлэл олдсонгүй.');
  }
  const driverName = clean_(p.driver) || (isDriverRole_(auth.role) ? auth.fullName || auth.username : '');
  if (isDriverRole_(auth.role) && driverName.toLowerCase() !== clean_(auth.fullName || auth.username).toLowerCase()) {
    throw new Error('Жолооч зөвхөн өөрийн нэр дээрх түгээлтийг бүртгэнэ.');
  }
  const now = new Date();
  const sheet = companySs.getSheetByName(COMPANY_SHEETS.VISITS);
  appendObjectRow_(sheet, {
    'Огноо': now,
    'Рэп нэр': auth.fullName || auth.username,
    'Харилцагч': customer.name,
    'Өргөрөг': latitude,
    'Уртраг': longitude,
    'Зургийн холбоос': photoUrl,
    'Тэмдэглэл': notes,
    'Client ID': clean_(p.clientId),
    'DistributionID': distributionId,
    'SaleID': saleId,
    'InvoiceNumber': clean_(p.invoiceNumber),
    'PlannedDeliveryDate': clean_(p.plannedDeliveryDate),
    'DeliveredAt': clean_(p.deliveredAt),
    'Route': clean_(p.route),
    'Vehicle': clean_(p.vehicle),
    'Driver': driverName,
    'SalesEmployee': clean_(p.salesEmployee) || auth.fullName || auth.username,
    'Warehouse': clean_(p.warehouse) || firstWarehouse_(companySs),
    'CustomerPhone': clean_(p.customerPhone),
    'CustomerAddress': clean_(p.customerAddress),
    'LocationText': clean_(p.locationText),
    'ContactPerson': clean_(p.contactPerson),
    'Status': clean_(p.status) || 'Үүссэн',
    'DeliveryNotes': notes,
    'FailureReason': clean_(p.failureReason),
    'ReturnedProducts': clean_(p.returnedProducts),
    'CollectedPayment': nonNegativeNumberOrZero_(p.collectedPayment),
    'PaymentMethod': clean_(p.paymentMethod),
    'RemainingReceivable': nonNegativeNumberOrZero_(p.remainingReceivable),
    'ReceivedBy': clean_(p.receivedBy),
    'CustomerSignatureUrl': clean_(p.customerSignatureUrl),
    'ProofImageUrl': clean_(p.proofImageUrl) || photoUrl
  });
  if (linkedSale) {
    const salesData = sheetObjects_(companySs.getSheetByName(COMPANY_SHEETS.SALES));
    const saleRows = salesData.rows.filter(function(entry) {
      return clean_(field_(entry.object, ['SaleID'])) === saleId;
    });
    const requestedItems = Array.isArray(p.distributionItems) ? p.distributionItems : [];
    const productMap = getProductRecordMap_(companySs);
    const detailSheet = companySs.getSheetByName(COMPANY_SHEETS.DISTRIBUTION_ITEMS);
    const failedDelivery = ['хүргэлт амжилтгүй','цуцлагдсан'].indexOf(clean_(p.status).toLowerCase()) > -1;
    const detailRows = saleRows.map(function(entry) {
      const productName = clean_(field_(entry.object, ['Бараа']));
      const quantity = Number(field_(entry.object, ['Тоо']) || 0);
      const unitPrice = Number(field_(entry.object, ['Үнэ']) || 0);
      const product = productMap[productName.toLowerCase()] || {};
      const override = requestedItems.find(function(item) {
        return clean_(item.product || item.name).toLowerCase() === productName.toLowerCase() || (clean_(item.code) && clean_(item.code) === clean_(product.code));
      }) || {};
      const ordered = Number(override.ordered != null ? override.ordered : quantity);
      const delivered = Number(override.delivered != null ? override.delivered : (failedDelivery ? 0 : ordered));
      const returned = Number(override.returned != null ? override.returned : Math.max(0, ordered - delivered));
      return objectToRow_(getHeaders_(detailSheet), {
        'DistributionID': distributionId,
        'SaleID': saleId,
        'Бараа': productName,
        'Код': clean_(product.code),
        'Нэгж': clean_(product.unit) || 'ш',
        'Захиалсан': ordered,
        'Хүргэсэн': delivered,
        'Буцаасан': returned,
        'Нэгжийн үнэ': unitPrice,
        'Нийт дүн': delivered * unitPrice
      });
    });
    appendRows_(detailSheet, detailRows);
    setObjectFields_(companySs.getSheetByName(COMPANY_SHEETS.SALES), linkedSale.rowNumber, {
      'DeliveryID': distributionId,
      'DeliveryDate': clean_(p.plannedDeliveryDate) || clean_(p.deliveredAt),
      'DeliveryType': 'Түгээлт'
    });
  }
  return { success: true, photoUrl: photoUrl, distributionId: distributionId, saleId: saleId };
}

function handleSaveUser_(auth, p) {
  if (!canManageUsers_(auth)) throw new Error('Хэрэглэгч удирдах эрх хүрэлцэхгүй байна.');
  const originalUsername = clean_(p.originalUsername);
  const username = clean_(p.username);
  const fullName = clean_(p.fullName);
  const role = normalizeRole_(p.role);
  const password = String(p.password || '');
  if (!username || !fullName) throw new Error('Нэр болон хэрэглэгчийн нэр шаардлагатай.');
  validateUsername_(username);
  if (password && password.length < 6) throw new Error('Нууц үг хамгийн багадаа 6 тэмдэгт байна.');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const userSheet = masterSs_().getSheetByName(MASTER_SHEETS.USERS);
    const rows = values_(userSheet);
    const existingTarget = findRowByValue_(rows, 0, username);
    const editing = originalUsername ? findRowByValue_(rows, 0, originalUsername) : existingTarget;
    if (existingTarget && (!editing || existingTarget.rowNumber !== editing.rowNumber)) throw new Error('Энэ хэрэглэгчийн нэр ашиглагдаж байна.');

    const company = getCompany_(auth.company);
    if (isSalesRole_(role) && company.status !== 'Active') {
      const reps = rows.filter(function(row, index) {
        if (index === 0) return false;
        const same = clean_(row[4]).toLowerCase() === auth.company.toLowerCase();
        const isRep = isSalesRole_(normalizeRole_(row[3]));
        const editedRow = editing && index + 1 === editing.rowNumber;
        return same && isRep && !editedRow;
      }).length;
      if (reps >= FREE_REP_LIMIT) throw new Error('Үнэгүй эрхээр 5 хүртэл борлуулагч бүртгэнэ. Premium эрх авах: ' + UPGRADE_URL);
    }

    if (editing) {
      userSheet.getRange(editing.rowNumber, 1, 1, 5).setValues([[
        username,
        password ? sha256_(password) : String(editing.values[1] || ''),
        fullName,
        role,
        auth.company
      ]]);
    } else {
      if (!password) throw new Error('Шинэ хэрэглэгчид нууц үг шаардлагатай.');
      userSheet.appendRow([username, sha256_(password), fullName, role, auth.company]);
    }
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteUser_(auth, p) {
  if (!canManageUsers_(auth)) throw new Error('Хэрэглэгч устгах эрх хүрэлцэхгүй байна.');
  const username = clean_(p.username);
  if (!username) throw new Error('Хэрэглэгчийн нэр шаардлагатай.');
  if (username.toLowerCase() === auth.username.toLowerCase()) throw new Error('Өөрийн хэрэглэгчийг устгах боломжгүй.');
  const sheet = masterSs_().getSheetByName(MASTER_SHEETS.USERS);
  const rows = values_(sheet);
  const found = findRowByValue_(rows, 0, username);
  if (!found || clean_(found.values[4]).toLowerCase() !== auth.company.toLowerCase()) throw new Error('Хэрэглэгч олдсонгүй.');
  sheet.deleteRow(found.rowNumber);
  return { success: true };
}

function getCompany_(companyName) {
  const match = findRowByValue_(values_(masterSs_().getSheetByName(MASTER_SHEETS.COMPANIES)), 0, companyName);
  if (!match) return null;
  const row = match.values;
  const explicitStatus = clean_(row[2]).toLowerCase();
  const activated = asDate_(row[3]);
  const months = Number(row[4] || 0);
  let status = 'Free';
  let expiresAt = null;
  if (explicitStatus === 'inactive' || explicitStatus === 'идэвхгүй') {
    status = 'Inactive';
  } else if (activated && months > 0) {
    expiresAt = addMonths_(activated, months);
    status = new Date().getTime() <= expiresAt.getTime() ? 'Active' : 'Free';
  }
  return {
    name: clean_(row[0]),
    spreadsheetId: clean_(row[1]),
    status: status,
    activatedAt: activated,
    months: months,
    expiresAt: expiresAt,
    phone: clean_(row[5]),
    email: clean_(row[6])
  };
}

function requireActiveCompany_(companyName) {
  const company = getCompany_(companyName);
  if (!company) throw new Error('Компанийн мэдээлэл олдсонгүй.');
  if (!company.spreadsheetId) throw new Error('Компанийн Spreadsheet ID бүртгэгдээгүй байна.');
  if (company.status === 'Inactive') throw new Error('Компанийн эрх идэвхгүй байна. ' + UPGRADE_URL);
  return company;
}

function openCompanySs_(company) {
  try { return SpreadsheetApp.openById(company.spreadsheetId); }
  catch (error) { throw new Error('Компанийн spreadsheet нээж чадсангүй. Spreadsheet ID болон Apps Script эзэмшигчийн эрхийг шалгана уу.'); }
}

function getProducts_(companySs) {
  const productData = sheetObjects_(companySs.getSheetByName(COMPANY_SHEETS.PRODUCTS));
  const norms = {};
  sheetObjects_(companySs.getSheetByName(COMPANY_SHEETS.NORMS)).rows.forEach(function(entry) {
    const name = clean_(field_(entry.object, ['Бараа']));
    if (name) norms[name.toLowerCase()] = Number(field_(entry.object, ['Бага үлдэгдлийн хязгаар']) || 0);
  });
  return productData.rows.filter(function(entry) { return clean_(field_(entry.object, ['Барааны нэр'])); }).map(function(entry) {
    const name = clean_(field_(entry.object, ['Барааны нэр']));
    return {
      name: name,
      code: clean_(field_(entry.object, ['Код'])),
      unit: clean_(field_(entry.object, ['Хэмжих нэгж'])) || 'ш',
      price: Number(field_(entry.object, ['Нэгж үнэ']) || 0),
      stock: Number(field_(entry.object, ['Одоогийн үлдэгдэл']) || 0),
      threshold: Number(field_(entry.object, ['Бага үлдэгдлийн хязгаар']) || norms[name.toLowerCase()] || 0)
    };
  });
}

function getRecentTransactions_(companySs, days, maxItems) {
  const sheet = companySs.getSheetByName(COMPANY_SHEETS.SALES);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { items: [], historyCursor: '', hasMore: false };
  const headers = getHeaders_(sheet);
  const dateIndex = headerIndex_(headers, ['Огноо']);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const chunkSize = 250;
  const items = [];
  let cursor = lastRow + 1;
  let stoppedByDate = false;

  while (cursor > 2 && items.length < maxItems && !stoppedByDate) {
    const start = Math.max(2, cursor - chunkSize);
    const count = cursor - start;
    const rows = sheet.getRange(start, 1, count, headers.length).getValues();
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      const rowNumber = start + i;
      const date = asDate_(rows[i][dateIndex]);
      if (date && date >= cutoff && items.length < maxItems) items.push(mapSaleRow_(rows[i], rowNumber, headers));
      else if (date && date < cutoff) { stoppedByDate = true; cursor = rowNumber + 1; break; }
    }
    if (!stoppedByDate) cursor = start;
  }

  const oldestRow = items.length ? Math.min.apply(null, items.map(function(item) { return item.rowNumber; })) : lastRow + 1;
  return { items: items, historyCursor: oldestRow, hasMore: oldestRow > 2 };
}

function mapSaleRow_(row, rowNumber, headers) {
  const object = rowToObject_(headers || [], row);
  const clientId = clean_(field_(object, ['Client ID','ClientID']));
  const saleId = clean_(field_(object, ['SaleID'])) || clientId || ('LEGACY-SALE-' + rowNumber);
  return {
    rowNumber: rowNumber,
    date: iso_(field_(object, ['Огноо'])),
    rep: clean_(field_(object, ['Рэп нэр'])),
    product: clean_(field_(object, ['Бараа'])),
    quantity: Number(field_(object, ['Тоо']) || 0),
    unitPrice: Number(field_(object, ['Үнэ']) || 0),
    total: Number(field_(object, ['Нийт дүн']) || 0),
    customer: clean_(field_(object, ['Харилцагч'])),
    paymentType: clean_(field_(object, ['Төлбөрийн төрөл'])),
    location: clean_(field_(object, ['Байршил'])),
    clientId: clientId,
    saleId: saleId,
    status: clean_(field_(object, ['Status'])) || 'Approved',
    warehouse: clean_(field_(object, ['Warehouse'])),
    deliveryType: clean_(field_(object, ['DeliveryType'])),
    deliveryDate: isoOrText_(field_(object, ['DeliveryDate'])),
    notes: clean_(field_(object, ['Notes'])),
    invoiceNumber: clean_(field_(object, ['InvoiceNumber'])),
    invoicePdfUrl: clean_(field_(object, ['InvoicePdfUrl'])),
    warehouseIssueNumber: clean_(field_(object, ['WarehouseIssueNumber'])),
    warehouseIssuePdfUrl: clean_(field_(object, ['WarehouseIssuePdfUrl'])),
    customerId: clean_(field_(object, ['CustomerID'])),
    discount: Number(field_(object, ['Discount']) || 0),
    vat: Number(field_(object, ['VAT']) || 0),
    paidAmount: Number(field_(object, ['PaidAmount']) || 0),
    dueDate: isoOrText_(field_(object, ['DueDate'])),
    distributionId: clean_(field_(object, ['DeliveryID']))
  };
}

function getRecentInventoryMoves_(companySs, limit) {
  const sheet = companySs.getSheetByName(COMPANY_SHEETS.INVENTORY_MOVES);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const headers = getHeaders_(sheet);
  const count = Math.min(limit, lastRow - 1);
  const start = lastRow - count + 1;
  return sheet.getRange(start, 1, count, headers.length).getValues().map(function(row, index) {
    const object = rowToObject_(headers, row);
    return {
      rowNumber: start + index,
      date: iso_(field_(object, ['Огноо'])),
      product: clean_(field_(object, ['Бараа'])),
      moveType: clean_(field_(object, ['Хөдөлгөөний төрөл (орлого/зарлага/шилжүүлэг)'])),
      quantity: Number(field_(object, ['Тоо']) || 0),
      reason: clean_(field_(object, ['Шалтгаан'])),
      warehouse: clean_(field_(object, ['Агуулах'])),
      fromWarehouse: clean_(field_(object, ['Гарах агуулах'])),
      toWarehouse: clean_(field_(object, ['Хүлээн авах агуулах'])),
      clientId: clean_(field_(object, ['Client ID','ClientID'])),
      saleId: clean_(field_(object, ['SaleID'])),
      distributionId: clean_(field_(object, ['DistributionID'])),
      confirmed: clean_(field_(object, ['Confirmed']))
    };
  }).reverse();
}

function getVisits_(companySs, auth, companyStatus, limit) {
  const data = sheetObjects_(companySs.getSheetByName(COMPANY_SHEETS.VISITS));
  return data.rows.filter(function(entry) {
    if (companyStatus === 'Active' || isManagerRole_(auth.role)) return true;
    return clean_(field_(entry.object, ['Рэп нэр'])).toLowerCase() === clean_(auth.fullName || auth.username).toLowerCase() || clean_(field_(entry.object, ['Driver'])).toLowerCase() === clean_(auth.fullName || auth.username).toLowerCase();
  }).slice(-limit).reverse().map(function(entry) {
    return {
      date: iso_(field_(entry.object, ['Огноо'])),
      rep: clean_(field_(entry.object, ['Рэп нэр'])),
      customer: clean_(field_(entry.object, ['Харилцагч'])),
      latitude: Number(field_(entry.object, ['Өргөрөг'])) || '',
      longitude: Number(field_(entry.object, ['Уртраг'])) || '',
      photoUrl: clean_(field_(entry.object, ['Зургийн холбоос','ProofImageUrl'])),
      notes: clean_(field_(entry.object, ['Тэмдэглэл','DeliveryNotes'])),
      distributionId: clean_(field_(entry.object, ['DistributionID'])),
      saleId: clean_(field_(entry.object, ['SaleID'])),
      status: clean_(field_(entry.object, ['Status'])),
      driver: clean_(field_(entry.object, ['Driver'])),
      route: clean_(field_(entry.object, ['Route'])),
      vehicle: clean_(field_(entry.object, ['Vehicle'])),
      warehouse: clean_(field_(entry.object, ['Warehouse'])),
      customerPhone: clean_(field_(entry.object, ['CustomerPhone'])),
      customerAddress: clean_(field_(entry.object, ['CustomerAddress'])),
      plannedDeliveryDate: isoOrText_(field_(entry.object, ['PlannedDeliveryDate'])),
      deliveredAt: isoOrText_(field_(entry.object, ['DeliveredAt'])),
      collectedPayment: Number(field_(entry.object, ['CollectedPayment']) || 0),
      remainingReceivable: Number(field_(entry.object, ['RemainingReceivable']) || 0),
      receivedBy: clean_(field_(entry.object, ['ReceivedBy']))
    };
  });
}

function getUsers_(companyName) {
  return values_(masterSs_().getSheetByName(MASTER_SHEETS.USERS)).slice(1).filter(function(row) {
    return clean_(row[4]).toLowerCase() === companyName.toLowerCase();
  }).map(function(row) { return { username: clean_(row[0]), fullName: clean_(row[2]), role: normalizeRole_(row[3]) }; });
}

function getCustomers_(companySs) {
  const found = {};
  sheetObjects_(companySs.getSheetByName(COMPANY_SHEETS.CUSTOMERS)).rows.forEach(function(entry) {
    const name = clean_(field_(entry.object, ['Харилцагчийн нэр']));
    if (name) found[name] = true;
  });
  const sales = companySs.getSheetByName(COMPANY_SHEETS.SALES);
  const data = sheetObjects_(sales);
  data.rows.slice(-500).forEach(function(entry) {
    const name = clean_(field_(entry.object, ['Харилцагч']));
    if (name) found[name] = true;
  });
  return Object.keys(found).sort(function(a, b) { return a.localeCompare(b, 'mn-MN'); });
}

function getWarehouses_(companySs) {
  const list = sheetObjects_(companySs.getSheetByName(COMPANY_SHEETS.WAREHOUSES)).rows.map(function(entry) {
    return { name: clean_(field_(entry.object, ['Агуулахын нэр'])), manager: clean_(field_(entry.object, ['Хариуцсан нярав'])) };
  }).filter(function(item) { return item.name; });
  return list.length ? list : [{ name: 'Үндсэн агуулах', manager: '' }];
}

function getLocations_(companySs) {
  const list = sheetObjects_(companySs.getSheetByName(COMPANY_SHEETS.LOCATIONS)).rows.map(function(entry) {
    return { name: clean_(field_(entry.object, ['Байршлын нэр'])) };
  }).filter(function(item) { return item.name; });
  return list.length ? list : [{ name: 'Үндсэн байршил' }];
}

function buildDashboard_(companySs) {
  const data = sheetObjects_(companySs.getSheetByName(COMPANY_SHEETS.SALES));
  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  let currentTotal = 0;
  let previousTotal = 0;
  let currentCount = 0;
  let creditTotal = 0;
  const currentSaleIds = {};
  const byProduct = {};
  const byRep = {};
  const creditByCustomer = {};

  data.rows.forEach(function(entry) {
    const row = entry.object;
    const date = asDate_(field_(row, ['Огноо']));
    if (!date) return;
    const total = Number(field_(row, ['Нийт дүн']) || 0);
    const saleId = clean_(field_(row, ['SaleID'])) || ('ROW-' + entry.rowNumber);
    if (date >= currentStart && date < nextStart) {
      currentTotal += total;
      if (!currentSaleIds[saleId]) { currentSaleIds[saleId] = true; currentCount += 1; }
      addMetric_(byProduct, clean_(field_(row, ['Бараа'])) || 'Тодорхойгүй', total, Number(field_(row, ['Тоо']) || 0));
      addMetric_(byRep, clean_(field_(row, ['Рэп нэр'])) || 'Тодорхойгүй', total, Number(field_(row, ['Тоо']) || 0));
    }
    if (date >= previousStart && date < currentStart) previousTotal += total;
    if (clean_(field_(row, ['Төлбөрийн төрөл'])) === 'Зээл') {
      const remaining = Math.max(0, total - Number(field_(row, ['PaidAmount']) || 0));
      creditTotal += remaining;
      addMetric_(creditByCustomer, clean_(field_(row, ['Харилцагч'])) || 'Тодорхойгүй', remaining, 0);
    }
  });

  return {
    currentTotal: currentTotal,
    previousTotal: previousTotal,
    currentCount: currentCount,
    creditTotal: creditTotal,
    momPercent: previousTotal === 0 ? (currentTotal > 0 ? 100 : 0) : ((currentTotal - previousTotal) / previousTotal) * 100,
    byProduct: metricArray_(byProduct),
    byRep: metricArray_(byRep),
    creditByCustomer: metricArray_(creditByCustomer)
  };
}

function lockedDashboard_() {
  return { currentTotal: 0, previousTotal: 0, currentCount: 0, creditTotal: 0, momPercent: 0, byProduct: [], byRep: [], creditByCustomer: [] };
}

function addMetric_(object, key, total, quantity) {
  if (!object[key]) object[key] = { name: key, total: 0, quantity: 0 };
  object[key].total += Number(total || 0);
  object[key].quantity += Number(quantity || 0);
}

function metricArray_(object) {
  return Object.keys(object).map(function(key) { return object[key]; }).sort(function(a, b) { return b.total - a.total; });
}

function adjustWarehouseStock_(companySs, warehouse, product, delta, enforceNonNegative, fallbackCurrent) {
  const sheet = companySs.getSheetByName(COMPANY_SHEETS.WAREHOUSE_STOCK);
  const data = sheetObjects_(sheet);
  let target = null;
  let hasAnyProductStock = false;
  let current = Number(fallbackCurrent || 0);
  data.rows.forEach(function(entry) {
    const sameProduct = clean_(field_(entry.object, ['Бараа'])).toLowerCase() === product.toLowerCase();
    if (sameProduct) hasAnyProductStock = true;
    if (sameProduct && clean_(field_(entry.object, ['Агуулах'])).toLowerCase() === warehouse.toLowerCase()) target = entry;
  });
  if (target) current = Number(field_(target.object, ['Үлдэгдэл']) || 0);
  else if (hasAnyProductStock) current = 0;
  if (enforceNonNegative && current + delta < 0) throw new Error(warehouse + ' агуулахын үлдэгдэл хүрэлцэхгүй байна.');
  if (target) setObjectFields_(sheet, target.rowNumber, { 'Үлдэгдэл': current + delta });
  else appendObjectRow_(sheet, { 'Агуулах': warehouse, 'Бараа': product, 'Үлдэгдэл': current + delta });
}

function savePhoto_(company, username, dataUrl) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error('Зургийн формат буруу байна.');
  const bytes = Utilities.base64Decode(match[2]);
  const extension = match[1].indexOf('png') > -1 ? 'png' : 'jpg';
  const folder = getOrCreatePhotoFolder_(company);
  const filename = sanitizeFileName_(username) + '_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss') + '.' + extension;
  return folder.createFile(Utilities.newBlob(bytes, match[1], filename)).getUrl();
}

function getOrCreatePhotoFolder_(company) {
  const root = getOrCreateDriveFolder_(DriveApp.getRootFolder(), 'DataLinx Distribution Photos');
  return getOrCreateDriveFolder_(root, sanitizeFileName_(company));
}

function upsertCustomer_(companySs, customerName, extra) {
  const sheet = companySs.getSheetByName(COMPANY_SHEETS.CUSTOMERS);
  const found = findObjectRowByValue_(sheet, ['Харилцагчийн нэр'], customerName);
  const details = extra || {};
  if (found) {
    const updates = {};
    if (!field_(found.object, ['CustomerID'])) updates.CustomerID = createBusinessId_('CUS');
    if (clean_(details.registrationNumber)) updates['Регистрийн дугаар'] = clean_(details.registrationNumber);
    if (clean_(details.phone)) updates['Утас'] = clean_(details.phone);
    if (clean_(details.address)) updates['Хаяг'] = clean_(details.address);
    if (clean_(details.contactPerson)) updates['Холбоо барих хүн'] = clean_(details.contactPerson);
    if (clean_(details.paymentTerm)) updates['Төлбөрийн нөхцөл'] = clean_(details.paymentTerm);
    if (Object.keys(updates).length) setObjectFields_(sheet, found.rowNumber, updates);
    return { name: customerName, customerId: clean_(field_(found.object, ['CustomerID'])) || updates.CustomerID || '' };
  }
  const customerId = createBusinessId_('CUS');
  appendObjectRow_(sheet, {
    'Харилцагчийн нэр': customerName,
    'CustomerID': customerId,
    'Регистрийн дугаар': clean_(details.registrationNumber),
    'Утас': clean_(details.phone),
    'Хаяг': clean_(details.address),
    'Холбоо барих хүн': clean_(details.contactPerson),
    'Төлбөрийн нөхцөл': clean_(details.paymentTerm),
    'Идэвхтэй': 'Тийм'
  });
  return { name: customerName, customerId: customerId };
}

function firstWarehouse_(companySs) { return getWarehouses_(companySs)[0].name; }
function firstLocation_(companySs) { return getLocations_(companySs)[0].name; }

function setupNewCompanySpreadsheet_(ss, companyInfo) {
  const first = ss.getSheets()[0];
  first.setName(COMPANY_SHEETS.PRODUCTS);
  ensureCompanySheets_(ss);
  const warehouseSheet = ss.getSheetByName(COMPANY_SHEETS.WAREHOUSES);
  if (warehouseSheet.getLastRow() < 2) appendObjectRow_(warehouseSheet, { 'Агуулахын нэр': 'Үндсэн агуулах' });
  const locationSheet = ss.getSheetByName(COMPANY_SHEETS.LOCATIONS);
  if (locationSheet.getLastRow() < 2) appendObjectRow_(locationSheet, { 'Байршлын нэр': 'Үндсэн байршил' });
  seedCompanySettings_(ss, companyInfo || {});
}

function ensureMasterSheets_() {
  const ss = masterSs_();
  ensureSheet_(ss, MASTER_SHEETS.COMPANIES, ['Компани нэр','Spreadsheet ID','Төлөв','Идэвхжүүлсэн огноо','Хугацаа(сар)','Утас','Имэйл']);
  ensureSheet_(ss, MASTER_SHEETS.USERS, ['Username','Password','Бүтэн нэр','Роль (manager/rep/admin/sales/warehouse/driver/accountant)','Компани нэр']);
}

function ensureCompanySheets_(ss) {
  ensureSheet_(ss, COMPANY_SHEETS.PRODUCTS, SHEET_HEADERS.PRODUCTS);
  ensureSheet_(ss, COMPANY_SHEETS.SALES, SHEET_HEADERS.SALES);
  ensureSheet_(ss, COMPANY_SHEETS.INVENTORY_MOVES, SHEET_HEADERS.INVENTORY_MOVES);
  ensureSheet_(ss, COMPANY_SHEETS.NORMS, SHEET_HEADERS.NORMS);
  ensureSheet_(ss, COMPANY_SHEETS.VISITS, SHEET_HEADERS.VISITS);
  ensureSheet_(ss, COMPANY_SHEETS.DISTRIBUTION_ITEMS, SHEET_HEADERS.DISTRIBUTION_ITEMS);
  ensureSheet_(ss, COMPANY_SHEETS.WAREHOUSES, SHEET_HEADERS.WAREHOUSES);
  ensureSheet_(ss, COMPANY_SHEETS.WAREHOUSE_STOCK, SHEET_HEADERS.WAREHOUSE_STOCK);
  ensureSheet_(ss, COMPANY_SHEETS.LOCATIONS, SHEET_HEADERS.LOCATIONS);
  ensureSheet_(ss, COMPANY_SHEETS.CUSTOMERS, SHEET_HEADERS.CUSTOMERS);
  ensureSheet_(ss, COMPANY_SHEETS.SETTINGS, SHEET_HEADERS.SETTINGS);
  ensureSheet_(ss, COMPANY_SHEETS.PAYMENTS, SHEET_HEADERS.PAYMENTS);
  ensureSheet_(ss, COMPANY_SHEETS.DOCUMENT_NUMBERS, SHEET_HEADERS.DOCUMENT_NUMBERS);
  ensureSheet_(ss, COMPANY_SHEETS.DOCUMENTS, SHEET_HEADERS.DOCUMENTS);
}

function seedCompanySettings_(ss, companyInfo) {
  const sheet = ss.getSheetByName(COMPANY_SHEETS.SETTINGS);
  const existing = {};
  sheetObjects_(sheet).rows.forEach(function(entry) { existing[clean_(field_(entry.object, ['Түлхүүр']))] = true; });
  const defaults = [
    ['CompanyName', clean_(companyInfo.name), 'Баримт дээр харагдах компанийн нэр'],
    ['RegistrationNumber', '', 'Компанийн регистрийн дугаар'],
    ['Address', '', 'Компанийн хаяг'],
    ['Phone', clean_(companyInfo.phone), 'Компанийн утас'],
    ['Email', clean_(companyInfo.email), 'Компанийн имэйл'],
    ['LogoUrl', '', 'Google Drive эсвэл нийтэд нээлттэй логоны URL'],
    ['VatRate', '0', 'НӨАТ хувь'],
    ['DefaultPaymentTermDays', '14', 'Зээлийн төлбөрийн хугацаа (хоног)'],
    ['PdfRootFolderId', '', 'Систем автоматаар үүсгэнэ'],
    ['PdfShareMode', 'LINK', 'LINK үед PDF-ийг холбоостой хүн үзнэ; PRIVATE үед зөвхөн Drive эрхтэй хүн үзнэ'],
    ['WarehouseManager', '', 'Үндсэн нярав'],
    ['DefaultDriver', '', 'Үндсэн жолооч'],
    ['DefaultVehicle', '', 'Үндсэн тээврийн хэрэгсэл'],
    ['DefaultRoute', '', 'Үндсэн маршрут']
  ];
  const rows = defaults.filter(function(item) { return !existing[item[0]]; }).map(function(item) {
    return objectToRow_(getHeaders_(sheet), { 'Түлхүүр': item[0], 'Утга': item[1], 'Тайлбар': item[2] });
  });
  appendRows_(sheet, rows);
}

function masterSs_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function ensureSheet_(ss, name, requiredHeaders) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  let current = sheet.getLastRow() ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(clean_) : [];
  if (!current.some(Boolean)) current = [];
  const missing = requiredHeaders.filter(function(header) {
    return current.map(function(v) { return v.toLowerCase(); }).indexOf(header.toLowerCase()) === -1;
  });
  const finalHeaders = current.concat(missing);
  if (sheet.getMaxColumns() < finalHeaders.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), finalHeaders.length - sheet.getMaxColumns());
  if (finalHeaders.length && (sheet.getLastRow() === 0 || missing.length || current.length !== finalHeaders.length)) {
    sheet.getRange(1, 1, 1, finalHeaders.length).setValues([finalHeaders]);
  }
  sheet.setFrozenRows(1);
  return sheet;
}

function requireSession_(token) {
  if (!token) throw new Error('Session token байхгүй байна. Дахин нэвтэрнэ үү.');
  const cache = CacheService.getScriptCache();
  const raw = cache.get('session:' + token);
  if (!raw) throw new Error('Session хугацаа дууссан. Дахин нэвтэрнэ үү.');
  cache.put('session:' + token, raw, SESSION_SECONDS);
  return JSON.parse(raw);
}

function passwordMatches_(input, stored) {
  return String(stored || '') === sha256_(input) || String(stored || '') === String(input || '');
}

function sha256_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8).map(function(byte) {
    const normalized = byte < 0 ? byte + 256 : byte;
    return ('0' + normalized.toString(16)).slice(-2);
  }).join('');
}

function validateUsername_(username) {
  if (username.length < 3 || username.length > 40) throw new Error('Хэрэглэгчийн нэр 3-40 тэмдэгт байна.');
  if (/[\s"'<>]/.test(username)) throw new Error('Хэрэглэгчийн нэрд зай, хашилт, < > тэмдэг ашиглахгүй.');
}

function normalizeRole_(value) {
  const role = clean_(value).toLowerCase();
  const aliases = {
    'manager': 'manager', 'admin': 'admin', 'company admin': 'admin',
    'rep': 'rep', 'sales': 'sales', 'sales employee': 'sales',
    'warehouse': 'warehouse', 'warehouse employee': 'warehouse',
    'driver': 'driver', 'accountant': 'accountant'
  };
  return aliases[role] || 'rep';
}

function isManagerRole_(role) { return ['manager','admin'].indexOf(normalizeRole_(role)) > -1; }
function isSalesRole_(role) { return ['rep','sales'].indexOf(normalizeRole_(role)) > -1; }
function isDriverRole_(role) { return normalizeRole_(role) === 'driver'; }
function canManageUsers_(auth) { return isManagerRole_(auth.role); }
function canManageInventory_(auth) { return ['manager','admin','warehouse'].indexOf(normalizeRole_(auth.role)) > -1; }

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error('POST body хоосон байна.');
  try { return JSON.parse(e.postData.contents); }
  catch (error) { throw new Error('POST body JSON форматгүй байна.'); }
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function values_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  return lastRow && lastColumn ? sheet.getRange(1, 1, lastRow, lastColumn).getValues() : [];
}

function getHeaders_(sheet) {
  const lastColumn = sheet.getLastColumn();
  return lastColumn ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(clean_) : [];
}

function headerIndex_(headers, aliases) {
  const normalized = headers.map(function(header) { return clean_(header).toLowerCase(); });
  for (let i = 0; i < aliases.length; i += 1) {
    const index = normalized.indexOf(clean_(aliases[i]).toLowerCase());
    if (index > -1) return index;
  }
  return -1;
}

function rowToObject_(headers, row) {
  const object = {};
  headers.forEach(function(header, index) { object[header] = row[index]; });
  return object;
}

function objectToRow_(headers, object) {
  return headers.map(function(header) {
    if (Object.prototype.hasOwnProperty.call(object, header)) return object[header];
    const key = Object.keys(object).find(function(candidate) { return candidate.toLowerCase() === header.toLowerCase(); });
    return key ? object[key] : '';
  });
}

function sheetObjects_(sheet) {
  const rows = values_(sheet);
  const headers = rows.length ? rows[0].map(clean_) : [];
  return {
    headers: headers,
    rows: rows.slice(1).map(function(row, index) { return { rowNumber: index + 2, values: row, object: rowToObject_(headers, row) }; })
  };
}

function field_(object, aliases) {
  const keys = Object.keys(object || {});
  for (let i = 0; i < aliases.length; i += 1) {
    const alias = clean_(aliases[i]).toLowerCase();
    const key = keys.find(function(candidate) { return clean_(candidate).toLowerCase() === alias; });
    if (key !== undefined) return object[key];
  }
  return '';
}

function appendObjectRow_(sheet, object) {
  const headers = getHeaders_(sheet);
  sheet.appendRow(objectToRow_(headers, object));
  return sheet.getLastRow();
}

function appendRows_(sheet, rows) {
  if (!rows || !rows.length) return;
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function setObjectFields_(sheet, rowNumber, updates) {
  const headers = getHeaders_(sheet);
  const range = sheet.getRange(rowNumber, 1, 1, headers.length);
  const row = range.getValues()[0];
  Object.keys(updates).forEach(function(key) {
    const index = headerIndex_(headers, [key]);
    if (index > -1) row[index] = updates[key];
  });
  range.setValues([row]);
}

function findObjectRowByValue_(sheet, aliases, value) {
  const target = clean_(value).toLowerCase();
  const data = sheetObjects_(sheet);
  for (let i = 0; i < data.rows.length; i += 1) {
    if (clean_(field_(data.rows[i].object, aliases)).toLowerCase() === target) return data.rows[i];
  }
  return null;
}

function findRowByHeaderValue_(sheet, aliases, value) {
  const headers = getHeaders_(sheet);
  const index = headerIndex_(headers, aliases);
  if (index < 0 || sheet.getLastRow() < 2) return null;
  const found = sheet.getRange(2, index + 1, sheet.getLastRow() - 1, 1).createTextFinder(String(value)).matchEntireCell(true).findNext();
  if (!found) return null;
  const rowNumber = found.getRow();
  return { rowNumber: rowNumber, values: sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0] };
}

function findRowByValue_(rows, columnIndex, value) {
  const target = clean_(value).toLowerCase();
  for (let i = 1; i < rows.length; i += 1) {
    if (clean_(rows[i][columnIndex]).toLowerCase() === target) return { rowNumber: i + 1, values: rows[i] };
  }
  return null;
}

function findProductRow_(rows, product) {
  for (let i = 1; i < rows.length; i += 1) {
    if (clean_(rows[i][0]).toLowerCase() === product.toLowerCase()) return { rowNumber: i + 1, values: rows[i] };
  }
  return null;
}

function normalizeSaleItems_(p) {
  const raw = Array.isArray(p.items) && p.items.length ? p.items : [{ product: p.product, quantity: p.quantity, unitPrice: p.unitPrice }];
  return raw.map(function(item) {
    const product = clean_(item.product || item.name);
    if (!product) throw new Error('Бараа сонгоно уу.');
    return {
      product: product,
      quantity: positiveNumber_(item.quantity, 'Тоо ширхэг'),
      unitPrice: nonNegativeNumber_(item.unitPrice, 'Нэгж үнэ')
    };
  });
}

function normalizeSaleStatus_(value) {
  const status = clean_(value);
  return status || 'Approved';
}

function defaultDueDate_(companySs, baseDate) {
  const settings = getSettingsMap_(companySs);
  const days = Math.max(0, Number(settings.DefaultPaymentTermDays || 14));
  const due = new Date(baseDate.getTime());
  due.setDate(due.getDate() + days);
  return due.toISOString();
}

function createBusinessId_(prefix) {
  return prefix + '-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss') + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
}

function getSettingsMap_(companySs) {
  const cache = CacheService.getScriptCache();
  const key = 'settings:' + companySs.getId();
  const cached = cache.get(key);
  if (cached) {
    try { return JSON.parse(cached); } catch (error) {}
  }
  const map = {};
  sheetObjects_(companySs.getSheetByName(COMPANY_SHEETS.SETTINGS)).rows.forEach(function(entry) {
    const settingKey = clean_(field_(entry.object, ['Түлхүүр']));
    if (settingKey) map[settingKey] = field_(entry.object, ['Утга']);
  });
  cache.put(key, JSON.stringify(map), 300);
  return map;
}

function updateSetting_(companySs, key, value, description) {
  const sheet = companySs.getSheetByName(COMPANY_SHEETS.SETTINGS);
  const found = findObjectRowByValue_(sheet, ['Түлхүүр'], key);
  if (found) setObjectFields_(sheet, found.rowNumber, { 'Утга': value, 'Тайлбар': description || field_(found.object, ['Тайлбар']) });
  else appendObjectRow_(sheet, { 'Түлхүүр': key, 'Утга': value, 'Тайлбар': description || '' });
  CacheService.getScriptCache().remove('settings:' + companySs.getId());
}

function clean_(value) { return String(value === null || value === undefined ? '' : value).trim(); }
function positiveNumber_(value, name) { const n = Number(value); if (!isFinite(n) || n <= 0) throw new Error(name + ' 0-ээс их байна.'); return n; }
function nonNegativeNumber_(value, name) { const n = Number(value); if (!isFinite(n) || n < 0) throw new Error(name + ' 0 буюу түүнээс их байна.'); return n; }
function nonNegativeNumberOrZero_(value) { const n = Number(value); return isFinite(n) && n >= 0 ? n : 0; }
function asDate_(value) { const d = value instanceof Date ? value : new Date(value); return isNaN(d.getTime()) ? null : d; }
function iso_(value) { const d = asDate_(value); return d ? d.toISOString() : clean_(value); }
function isoOrText_(value) { return value ? iso_(value) : ''; }
function addMonths_(date, months) { const d = new Date(date.getTime()); d.setMonth(d.getMonth() + Number(months)); return d; }
function sanitizeFileName_(value) { return clean_(value).replace(/[\\/:*?"<>|#%{}\[\]]/g, '_').replace(/\s+/g, ' ').slice(0, 80) || 'Document'; }

function getOrCreateDriveFolder_(parent, name) {
  const iterator = parent.getFoldersByName(name);
  return iterator.hasNext() ? iterator.next() : parent.createFolder(name);
}
