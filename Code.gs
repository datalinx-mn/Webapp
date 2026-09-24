'use strict';

const MASTER_SHEETS = {
  COMPANIES: 'Компани',
  USERS: 'Хэрэглэгч',
  ADS: 'Зар'
};

const MASTER_AD_HEADERS = [
  'Ad ID','Гарчиг','Тайлбар','Зураг URL','Холбоос','Байрлал',
  'Эхлэх огноо','Дуусах огноо','Төлөв','Ивээн тэтгэгч'
];

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
  PRODUCTS: ['Барааны нэр','Нэгж үнэ','Одоогийн үлдэгдэл','Бага үлдэгдлийн хязгаар','Код','Хэмжих нэгж','Идэвхтэй','ProductID','AverageCost','CostKnown'],
  SALES: ['Огноо','Рэп нэр','Бараа','Тоо','Үнэ','Нийт дүн','Харилцагч','Төлбөрийн төрөл','Байршил','Client ID','SaleID','Status','Warehouse','DeliveryType','DeliveryDate','Notes','InvoiceNumber','InvoicePdfUrl','InvoiceGeneratedAt','WarehouseIssueNumber','WarehouseIssuePdfUrl','WarehouseIssueGeneratedAt','CustomerID','Discount','VAT','PaidAmount','DueDate','DeliveryID','CreatedBy','ProductID','InputUnit','InputQuantity','InputUnitPrice','InitialPaymentMethod','UnitCostAtSale','COGS','GrossProfit','CostKnownAtSale'],
  INVENTORY_MOVES: ['Огноо','Бараа','Хөдөлгөөний төрөл (орлого/зарлага/шилжүүлэг)','Тоо','Шалтгаан','Агуулах','Гарах агуулах','Хүлээн авах агуулах','Client ID','SaleID','DistributionID','Confirmed','Нэгж үнэ','Нийт дүн','Рэп нэр','ProductID'],
  NORMS: ['Бараа','Бага үлдэгдлийн хязгаар','ProductID'],
  DISTRIBUTION_ITEMS: ['DistributionID','SaleID','Бараа','Код','Нэгж','Захиалсан','Хүргэсэн','Буцаасан','Нэгжийн үнэ','Нийт дүн','ProductID'],
  VISITS: ['Огноо','Рэп нэр','Харилцагч','Өргөрөг','Уртраг','Зургийн холбоос','Тэмдэглэл','Client ID','DistributionID','SaleID','InvoiceNumber','PlannedDeliveryDate','DeliveredAt','Route','Vehicle','Driver','SalesEmployee','Warehouse','CustomerPhone','CustomerAddress','LocationText','ContactPerson','Status','DeliveryNotes','FailureReason','ReturnedProducts','CollectedPayment','PaymentMethod','RemainingReceivable','DistributionReceiptNumber','DistributionReceiptPdfUrl','DistributionReceiptGeneratedAt','ReceivedBy','CustomerSignatureUrl','ProofImageUrl'],
  WAREHOUSES: ['Агуулахын нэр','Хариуцсан нярав','Хаяг','Утас'],
  WAREHOUSE_STOCK: ['Агуулах','Бараа','Үлдэгдэл','ProductID'],
  LOCATIONS: ['Байршлын нэр'],
  CUSTOMERS: ['Харилцагчийн нэр','CustomerID','Регистрийн дугаар','Утас','Хаяг','Холбоо барих хүн','Төлбөрийн нөхцөл','Идэвхтэй'],
  SETTINGS: ['Түлхүүр','Утга','Тайлбар'],
  PAYMENTS: ['PaymentID','SaleID','Огноо','Дүн','Төлбөрийн арга','Баталгаажуулсан','Тэмдэглэл','CreatedBy'],
  DOCUMENT_NUMBERS: ['CompanyID','DocumentType','Prefix','LastNumber','UpdatedAt','UpdatedBy'],
  DOCUMENTS: ['DocumentID','CompanyID','DocumentType','DocumentNumber','ReferenceType','ReferenceID','SaleID','DistributionID','CustomerID','FileName','DriveFileID','PdfUrl','Version','Status','CreatedBy','CreatedAt','ContentHash']
};

const LOGIN_ATTEMPT_LIMIT = 10;
const LOGIN_WINDOW_SECONDS = 60;
const SESSION_SECONDS = 21600;
const INITIAL_HISTORY_DAYS = 60;
const INITIAL_HISTORY_LIMIT = 100;
const UPGRADE_URL = 'https://datalinx-business.netlify.app/plans.html';
const DATALINX_BACKEND_RELEASE = '2026.09.20.3';
const DATALINX_SCHEMA_VERSION = 4;
const DATALINX_PLAN_CATALOG = {
  Trial: {
    id:'Trial', name:'1 сарын үнэгүй туршилт', monthlyPriceMnt:0, ads:false, maxUsers:5, maxWarehouses:2, trial:true,
    features:{sales:true,inventory:true,receivables:true,returns:true,basicDashboard:true,offline:true,delivery:true,pdf:true,backup:true,csvImport:true,suppliers:true,cashClose:true,profitability:false,integrityAudit:false,advancedReports:true,prioritySupport:false}
  },
  Business: {
    id:'Business', name:'Business', monthlyPriceMnt:24900, ads:false, maxUsers:5, maxWarehouses:2,
    features:{sales:true,inventory:true,receivables:true,returns:true,basicDashboard:true,offline:true,delivery:true,pdf:true,backup:true,csvImport:true,suppliers:true,cashClose:true,profitability:false,integrityAudit:false,advancedReports:true,prioritySupport:false}
  },
  Pro: {
    id:'Pro', name:'Pro', monthlyPriceMnt:59900, ads:false, maxUsers:20, maxWarehouses:10,
    features:{sales:true,inventory:true,receivables:true,returns:true,basicDashboard:true,offline:true,delivery:true,pdf:true,backup:true,csvImport:true,suppliers:true,cashClose:true,profitability:true,integrityAudit:true,advancedReports:true,prioritySupport:true}
  },
  Expired: {
    id:'Expired', name:'Туршилтын хугацаа дууссан', monthlyPriceMnt:0, ads:false, maxUsers:1, maxWarehouses:1, expired:true,
    features:{sales:false,inventory:false,receivables:false,returns:false,basicDashboard:false,offline:false,delivery:false,pdf:false,backup:false,csvImport:false,suppliers:false,cashClose:false,profitability:false,integrityAudit:false,advancedReports:false,prioritySupport:false}
  }
};

function normalizePlanId_(value) {
  const v=clean_(value).toLowerCase();
  if(v==='pro')return 'Pro';
  if(['business','active','premium','идэвхтэй'].includes(v))return 'Business';
  if(v==='expired')return 'Expired';
  return 'Trial';
}
function planEntitlements_(planId) {
  const plan=DATALINX_PLAN_CATALOG[normalizePlanId_(planId)]||DATALINX_PLAN_CATALOG.Trial;
  return JSON.parse(JSON.stringify(plan));
}
function companyHasFeature_(company,feature) {
  return Boolean(company&&company.entitlements&&company.entitlements.features&&company.entitlements.features[feature]);
}
function assertEntitlement_(auth,feature) {
  const company=requireActiveCompany_(auth.companyId||auth.company);
  if(!companyHasFeature_(company,feature)){
    const current=company.entitlements?.name||'Туршилт';
    throw new Error(current+' багцад энэ боломж ороогүй. Багцаа ахиулна уу: '+UPGRADE_URL);
  }
  return company;
}
function publicPlan_(company) {
  const p=company.entitlements;
  return {id:p.id,name:p.name,monthlyPriceMnt:p.monthlyPriceMnt,ads:p.ads,maxUsers:p.maxUsers,maxWarehouses:p.maxWarehouses,features:p.features};
}

function doGet(e) {
  try {
    ensureMasterSheets_();
    const action = clean_(e && e.parameter && e.parameter.action);
    if(action==='capabilities')return json_({success:true,operationsVersion:1,reliabilityVersion:1,schemaVersion:DATALINX_SCHEMA_VERSION,backendRelease:DATALINX_BACKEND_RELEASE});
    if (action === 'login') throw new Error('Шинэ хувилбараа нээнэ үү. Нэвтрэхэд POST шаардлагатай.');
    if (action === 'bootstrap') {
      const auth = requireSession_(clean_(e.parameter.token));
      return json_(withOperationsRead_(auth,()=>buildInitialPayload_(auth)));
    }
    if (action === 'operations') {
      const auth = requireSession_(clean_(e.parameter.token));
      return json_(loadOperations_(auth, e.parameter));
    }
    if (action === 'module') {
      const auth = requireSession_(clean_(e.parameter.token));
      return json_(withOperationsRead_(auth,()=>loadModule_(auth, clean_(e.parameter.module))));
    }
    if (action === 'history') {
      const auth = requireSession_(clean_(e.parameter.token));
      return json_(withOperationsRead_(auth,()=>loadOlderHistory_(auth, e.parameter || {})));
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
    if (action === 'login') return json_(handleLogin_(payload));
    if (action === 'completeRecovery') return json_(securityCompleteRecovery_(payload));
    if (action === 'registerCompany') return json_(handleRegisterCompany_(payload));

    const auth = requireSession_(clean_(payload.token));
    if(action==='sponsorEvent')return json_(recordSponsorEvent_(auth,payload));
    if(action==='bootstrap')return json_(withOperationsRead_(auth,()=>buildInitialPayload_(auth)));
    if(action==='operations')return json_(loadOperations_(auth,payload));
    if(action==='module')return json_(withOperationsRead_(auth,()=>loadModule_(auth,clean_(payload.module))));
    if(action==='history')return json_(withOperationsRead_(auth,()=>loadOlderHistory_(auth,payload)));
    if(action==='backupStatus'||action==='createBackup'||action==='testRestore')return json_(backupAction_(auth,payload));
    if(action==='inspectRequest'||action==='cancelRequest')return json_(dataQueueAction_(auth,payload));
    if(action==='previewImport')return json_(dataPreviewImport_(auth,payload));
    if(action==='integrityCheck')return json_(dataIntegrityCheck_(auth));
    if(action==='logout')return json_(securityLogout_(auth,payload));
    if(action==='changePassword')return json_(securityChangePassword_(auth,payload));
    if(action==='issueRecovery')return json_(securityIssueRecovery_(auth,payload));
    if (['addSale','addInventoryMove','addPayment','returnSale','receiveReturn','refundPayment','saveDelivery','remitCash','approveReturn','reversePayment','cancelSale','importData','stocktake','closeCash','saveSupplier','receivePurchase','addSupplierPayment','addExpense','reverseExpense'].includes(action)) return json_(handleOperation_(auth, payload));
    recoverOperations_(auth);
    if (action === 'saveProduct') return json_(handleSaveProduct_(auth, payload));
    if (action === 'deleteProduct') return json_(handleDeleteProduct_(auth, payload));


    if (action === 'addVisit') { assertEntitlement_(auth,'delivery'); return json_(handleAddVisit_(auth, payload)); }
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

function handleLogin_(params) {return secureLogin_(params);}

function buildInitialPayload_(auth) {
  const company = requireActiveCompany_(auth.companyId || auth.company);
  const companySs = openCompanySs_(company);
  ensureCompanySheets_(companySs);
  const recent = getRecentTransactions_(companySs, INITIAL_HISTORY_DAYS, INITIAL_HISTORY_LIMIT);
  recent.items = recent.items.filter(tx => opsCanSeeSale_(auth, {object: {SaleID:tx.saleId,CreatedBy:tx.createdBy,'Рэп нэр':tx.rep}}, companySs));
  return {
    success: true,
    operationsVersion: 1,
    reliabilityVersion: 1,
    schemaVersion: DATALINX_SCHEMA_VERSION,
    backendRelease: DATALINX_BACKEND_RELEASE,
    user: { id: auth.userId || '', username: auth.username, fullName: auth.fullName, role: auth.role, company: company.name, companyId: company.id },
    company: { id: company.id, name: company.name, phone: company.phone, email: company.email, planId:company.planId },
    companyStatus: company.status,
    plan: publicPlan_(company),
    entitlements: company.entitlements,
    accessModel: 'TrialPaidPlansV2',
    expiresAt: company.expiresAt ? company.expiresAt.toISOString() : '',
    ads: company.entitlements.ads ? getActiveAds_() : [],
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
  const company = requireActiveCompany_(auth.companyId || auth.company);
  const companySs = openCompanySs_(company);
  ensureCompanySheets_(companySs);
  if (moduleName === 'inventory') {
    return { success: true, inventoryMoves: getRecentInventoryMoves_(companySs, 100) };
  }
  if (moduleName === 'distribution') {
    assertEntitlement_(auth,'delivery');
    return { success: true, visits: getVisits_(companySs, auth, 50) };
  }
  if (moduleName === 'dashboard') {
    opsAssertRole_(auth, ['manager','admin','accountant']);
    return { success: true, dashboard: buildDashboard_(companySs) };
  }
  if (moduleName === 'settings') {
    return { success: true, users: canManageUsers_(auth) ? getUsers_(company.id) : [], seatStatus: canManageUsers_(auth) ? planSeatStatus_(company) : null, plan: publicPlan_(company) };
  }
  throw new Error('Тодорхойгүй module.');
}

function loadOlderHistory_(auth, params) {
  const company = requireActiveCompany_(auth.companyId || auth.company);
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
    transactions: items.filter(tx => opsCanSeeSale_(auth, {object:{SaleID:tx.saleId,CreatedBy:tx.createdBy,'Рэп нэр':tx.rep}}, companySs)),
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
  securityRate_('register:'+phone,3,3600);
  securityRate_('register:global',20,3600);
  const passwordHash=strongPassword_(password,false);
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
    const companyId = createMasterId_('CMP');
    const userId = createMasterId_('USR');
    const trialStart=new Date(),trialEnd=addMonths_(trialStart,1);
    appendObjectRow_(companySheet, {
      'Компани нэр': companyName, 'Spreadsheet ID': newSheetId, 'Төлөв': 'Active',
      'Идэвхжүүлсэн огноо': trialStart, 'Хугацаа(сар)': 1, 'Утас': phone, 'Имэйл': email,
      'Company ID': companyId, Plan:'Trial', 'Plan Start':trialStart, 'Plan End':trialEnd, 'Billing Cycle':'trial'
    });
    appendObjectRow_(userSheet, {
      Username: username, Password: passwordHash, 'Бүтэн нэр': managerName,
      'Роль (manager/rep/admin/sales/warehouse/driver/accountant)': 'manager',
      'Компани нэр': companyName, SessionVersion: Date.now(),
      'User ID': userId, 'Company ID': companyId, 'Идэвхтэй': 'Тийм'
    });
    return { success: true, message: '1 сарын үнэгүй Business туршилт амжилттай үүслээ.', companyId: companyId, trialEndsAt: trialEnd.toISOString() };
  } finally {
    lock.releaseLock();
  }
}

function handleAddVisit_(auth, p) {
  opsAssertRole_(auth, ['manager','admin','rep','sales','driver']);
  if (Number(p.collectedPayment || 0) || clean_(p.returnedProducts)) throw new Error('Төлбөр, буцаалтыг Өнөөдөр хэсгийн хүргэлт эсвэл Мөнгө хэсгээс бүртгэнэ үү.');
  if (clean_(p.saleId)) throw new Error('Борлуулалттай хүргэлтийг Өнөөдөр → Хүргэлт хэсгээс бүртгэнэ үү.');
  const company = requireActiveCompany_(auth.companyId || auth.company);
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
  const passwordHash=password?strongPassword_(password,false):'';

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const userSheet = masterSs_().getSheetByName(MASTER_SHEETS.USERS);
    const rows = values_(userSheet);
    const existingTarget = findRowByValue_(rows, 0, username);
    const editing = originalUsername ? findRowByValue_(rows, 0, originalUsername) : existingTarget;
    if (existingTarget && (!editing || existingTarget.rowNumber !== editing.rowNumber)) throw new Error('Энэ хэрэглэгчийн нэр ашиглагдаж байна.');


    if (editing) {
      const editingObject = rowToObject_(getHeaders_(userSheet), editing.values);
      const editingCompanyId = clean_(field_(editingObject, ['Company ID']));
      if ((auth.companyId && editingCompanyId && editingCompanyId !== auth.companyId) ||
          (!editingCompanyId && clean_(field_(editingObject, ['Компани нэр'])).toLowerCase() !== auth.company.toLowerCase())) {
        throw new Error('Хэрэглэгч олдсонгүй.');
      }
    }
    if (editing && clean_(editing.values[0]) === auth.username && !isManagerRole_(role)) throw new Error('Өөрийн удирдах эрхийг хасах боломжгүй.');
    if (editing && originalUsername && username!==originalUsername)throw new Error('Хэрэглэгчийн нэрийг солихгүй. Шинэ ажилтан үүсгэнэ үү.');
    if (editing) {
      const oldUser=securityUser_(originalUsername||username);
      if(passwordHash)securitySavePassword_(oldUser,passwordHash);
      setObjectFields_(userSheet, editing.rowNumber, {
        Username: username,
        Password: passwordHash || String(editing.values[1] || ''),
        'Бүтэн нэр': fullName,
        'Роль (manager/rep/admin/sales/warehouse/driver/accountant)': role,
        'Компани нэр': auth.company,
        'Company ID': auth.companyId || '',
        'Идэвхтэй': 'Тийм'
      });
    } else {
      if (!password) throw new Error('Шинэ хэрэглэгчид нууц үг шаардлагатай.');
      const company=requireActiveCompany_(auth.companyId||auth.company);
      const activeUsers=getUsers_(company.id).length;
      if(activeUsers>=company.entitlements.maxUsers)throw new Error(company.entitlements.name+' багц '+company.entitlements.maxUsers+' хэрэглэгч хүртэл. Багцаа ахиулна уу: '+UPGRADE_URL);
      appendObjectRow_(userSheet, {
        Username: username, Password: passwordHash, 'Бүтэн нэр': fullName,
        'Роль (manager/rep/admin/sales/warehouse/driver/accountant)': role,
        'Компани нэр': auth.company, SessionVersion: Date.now(),
        'User ID': createMasterId_('USR'), 'Company ID': auth.companyId || '', 'Идэвхтэй': 'Тийм'
      });
    }
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteUser_(auth, p) {
  if (!canManageUsers_(auth)) throw new Error('Хэрэглэгч идэвхгүй болгох эрх хүрэлцэхгүй байна.');
  const username = clean_(p.username);
  if (!username) throw new Error('Хэрэглэгчийн нэр шаардлагатай.');
  if (username.toLowerCase() === auth.username.toLowerCase()) throw new Error('Өөрийн хэрэглэгчийг идэвхгүй болгох боломжгүй.');
  const sheet = masterSs_().getSheetByName(MASTER_SHEETS.USERS);
  const found = securityUser_(username);
  if (!found) throw new Error('Хэрэглэгч олдсонгүй.');
  const row = found.object;
  const companyId = clean_(field_(row, ['Company ID']));
  if ((auth.companyId && companyId && auth.companyId !== companyId) ||
      (!companyId && clean_(field_(row, ['Компани нэр'])).toLowerCase() !== auth.company.toLowerCase())) throw new Error('Хэрэглэгч олдсонгүй.');
  setObjectFields_(sheet, found.rowNumber, {
    'Идэвхтэй': 'Үгүй',
    SessionVersion: Date.now(),
    RecoveryHash: '',
    RecoveryExpires: '',
    RecoveryIssuedBy: ''
  });
  return { success: true, deactivated: true };
}

function getCompany_(companyRef) {
  const ref = clean_(companyRef);
  if (!ref) return null;
  const data = sheetObjects_(masterSs_().getSheetByName(MASTER_SHEETS.COMPANIES));
  const entry = data.rows.find(function(item) {
    const name = clean_(field_(item.object, ['Компани нэр']));
    const id = clean_(field_(item.object, ['Company ID','CompanyID']));
    return name.toLowerCase() === ref.toLowerCase() || id.toLowerCase() === ref.toLowerCase();
  });
  if (!entry) return null;
  const row = entry.object;
  const explicitStatus = clean_(field_(row, ['Төлөв'])).toLowerCase();
  const activated = asDate_(field_(row, ['Идэвхжүүлсэн огноо']));
  const months = Number(field_(row, ['Хугацаа(сар)']) || 0);
  const configuredPlan = normalizePlanId_(field_(row, ['Plan']));
  const planStart = asDate_(field_(row, ['Plan Start'])) || activated;
  let expiresAt = asDate_(field_(row, ['Plan End']));
  if (!expiresAt && configuredPlan==='Trial' && planStart) expiresAt=addMonths_(planStart,1);
  if (!expiresAt && ['Business','Pro'].includes(configuredPlan) && activated && months>0) expiresAt=addMonths_(activated,months);
  let planId=configuredPlan;
  let status='Active';
  if (explicitStatus === 'inactive' || explicitStatus === 'идэвхгүй') {
    status='Inactive';
  } else if (configuredPlan==='Expired' || (expiresAt && expiresAt.getTime()<Date.now())) {
    planId='Expired';
    status='Expired';
  }
  const entitlements=planEntitlements_(planId);
  return {
    id: clean_(field_(row, ['Company ID','CompanyID'])),
    name: clean_(field_(row, ['Компани нэр'])),
    spreadsheetId: clean_(field_(row, ['Spreadsheet ID'])),
    status: status,
    configuredPlanId: configuredPlan,
    planId: planId,
    entitlements: entitlements,
    activatedAt: activated,
    planStart: planStart,
    months: months,
    expiresAt: expiresAt,
    billingCycle: clean_(field_(row, ['Billing Cycle'])) || (planId==='Trial'?'trial':'monthly'),
    phone: clean_(field_(row, ['Утас'])),
    email: clean_(field_(row, ['Имэйл']))
  };
}

function setCompanyPlan(companyRef,planId,months) {
  ensureMasterSheets_();
  const raw=clean_(planId),key=raw.toLowerCase();
  const explicit={trial:'Trial',business:'Business',pro:'Pro',active:'Business',premium:'Business','идэвхтэй':'Business'};
  const plan=explicit[key];
  if(!plan)throw new Error('Багцын нэр буруу. Trial, Business эсвэл Pro гэж оруулна уу.');
  const company=getCompany_(companyRef);
  if(!company)throw new Error('Компани олдсонгүй.');
  const sheet=masterSs_().getSheetByName(MASTER_SHEETS.COMPANIES);
  const entry=sheetObjects_(sheet).rows.find(e=>clean_(e.object['Company ID'])===company.id);
  if(!entry)throw new Error('Компани олдсонгүй.');
  const now=new Date(),m=plan==='Trial'?1:Math.max(1,Math.floor(Number(months||1)));
  const end=addMonths_(now,m);
  setObjectFields_(sheet,entry.rowNumber,{
    Plan:plan,'Plan Start':now,'Plan End':end,'Billing Cycle':plan==='Trial'?'trial':'monthly',
    'Төлөв':'Active','Идэвхжүүлсэн огноо':now,'Хугацаа(сар)':m
  });
  return {companyId:company.id,plan:plan,startsAt:now.toISOString(),expiresAt:end?end.toISOString():'',monthlyPriceMnt:DATALINX_PLAN_CATALOG[plan].monthlyPriceMnt};
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
  return productData.rows.filter(function(entry) {
    const active = clean_(field_(entry.object, ['Идэвхтэй'])).toLowerCase();
    return clean_(field_(entry.object, ['Барааны нэр'])) && !['false','0','үгүй','inactive'].includes(active);
  }).map(function(entry) {
    const name = clean_(field_(entry.object, ['Барааны нэр']));
    return {
      id: clean_(field_(entry.object, ['ProductID'])),
      name: name,
      code: clean_(field_(entry.object, ['Код'])),
      unit: clean_(field_(entry.object, ['Хэмжих нэгж'])) || 'ш',
      packName: clean_(entry.object.PackName) || 'Хайрцаг',
      packSize: Number(entry.object.PackSize || 1),
      price: Number(field_(entry.object, ['Нэгж үнэ']) || 0),
      averageCost: clean_(field_(entry.object, ['AverageCost'])) === '' ? null : Number(field_(entry.object, ['AverageCost']) || 0),
      costKnown: ['тийм','true','1','yes'].includes(clean_(field_(entry.object, ['CostKnown'])).toLowerCase()),
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
    distributionId: clean_(field_(object, ['DeliveryID'])),
    createdBy: clean_(field_(object, ['CreatedBy']))
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

function getVisits_(companySs, auth, limit) {
  const data = sheetObjects_(companySs.getSheetByName(COMPANY_SHEETS.VISITS));
  return data.rows.filter(function(entry) {
    if (isManagerRole_(auth.role)) return true;
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

function planSeatAllowed_(company, username) {
  if (!company || !username) return false;
  const maxUsers = Math.max(1, Number(company.entitlements && company.entitlements.maxUsers || 1));
  const rows = sheetObjects_(masterSs_().getSheetByName(MASTER_SHEETS.USERS)).rows.filter(function(entry) {
    const row=entry.object,active=clean_(field_(row,['Идэвхтэй'])).toLowerCase();
    const sameId=company.id && clean_(field_(row,['Company ID']))===company.id;
    const sameName=clean_(field_(row,['Компани нэр'])).toLowerCase()===company.name.toLowerCase();
    return (sameId||sameName) && !['үгүй','inactive','false','0'].includes(active);
  }).sort(function(a,b){
    const roleA=normalizeRole_(field_(a.object,['Роль (manager/rep/admin/sales/warehouse/driver/accountant)']));
    const roleB=normalizeRole_(field_(b.object,['Роль (manager/rep/admin/sales/warehouse/driver/accountant)']));
    const priority=function(role){ return role==='admin'?0:role==='manager'?1:2; };
    return priority(roleA)-priority(roleB) || a.rowNumber-b.rowNumber;
  });
  return rows.slice(0,maxUsers).some(function(entry){ return clean_(entry.object.Username).toLowerCase()===clean_(username).toLowerCase(); });
}
function planSeatStatus_(company) {
  const users=getUsers_(company.id);
  return {used:users.length,max:company.entitlements.maxUsers,over:Math.max(0,users.length-company.entitlements.maxUsers)};
}

function getUsers_(companyRef) {
  const company = getCompany_(companyRef);
  if (!company) return [];
  return sheetObjects_(masterSs_().getSheetByName(MASTER_SHEETS.USERS)).rows.filter(function(entry) {
    const row = entry.object;
    const active = clean_(field_(row, ['Идэвхтэй'])).toLowerCase();
    const sameId = company.id && clean_(field_(row, ['Company ID'])) === company.id;
    const sameName = clean_(field_(row, ['Компани нэр'])).toLowerCase() === company.name.toLowerCase();
    return (sameId || sameName) && !['үгүй','inactive','false','0'].includes(active);
  }).map(function(entry) {
    const row = entry.object;
    const username=clean_(field_(row, ['Username']));
    return {
      id: clean_(field_(row, ['User ID','UserID'])),
      username: username,
      fullName: clean_(field_(row, ['Бүтэн нэр'])),
      role: normalizeRole_(field_(row, ['Роль (manager/rep/admin/sales/warehouse/driver/accountant)'])),
      seatAllowed: planSeatAllowed_(company,username)
    };
  });
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
  const returnedByLine = {};
  opsRows_(companySs,'Буцаалт').filter(e=>opsCreditApproved_(e.object)).forEach(e=>{const r=e.object,key=r.SaleID+'|'+r.LineID;const value=returnedByLine[key]||(returnedByLine[key]={amount:0,quantity:0});value.amount+=Number(r['Дүн']||0);value.quantity+=Number(r['Тоо']||0);});
  const byProduct = {};
  const byRep = {};
  const creditByCustomer = {};

  data.rows.forEach(function(entry) {
    const row = entry.object;
    const date = asDate_(field_(row, ['Огноо']));
    if (!date) return;
    if (['cancelled','цуцлагдсан','draft','ноорог'].includes(clean_(row.Status).toLowerCase())) return;
    const saleId = saleRowIdentifier_(entry);
    const returned = returnedByLine[saleId+'|'+(row.LineID||'ROW-'+entry.rowNumber)]||{amount:0,quantity:0};
    const total = opsMoney_(Math.max(0,Number(field_(row,['Нийт дүн'])||0)-returned.amount));
    const quantity = Math.max(0,Number(field_(row,['Тоо'])||0)-returned.quantity);
    if (date >= currentStart && date < nextStart) {
      currentTotal += total;
      if (!currentSaleIds[saleId]) { currentSaleIds[saleId] = true; currentCount += 1; }
      addMetric_(byProduct, clean_(field_(row, ['Бараа'])) || 'Тодорхойгүй', total, quantity);
      addMetric_(byRep, clean_(field_(row, ['Рэп нэр'])) || 'Тодорхойгүй', total, quantity);
    }
    if (date >= previousStart && date < currentStart) previousTotal += total;

  });

  const ids = new Set(data.rows.map(saleRowIdentifier_));
  opsRows_(companySs,'Эхний авлага').forEach(e=>ids.add(e.object.OpeningID));
  ids.forEach(id => {
    const sale = opsSale_(companySs, id, {role:'manager'});
    if (['cancelled','цуцлагдсан','draft','ноорог'].includes(sale.status.toLowerCase())) return;
    creditTotal += sale.remaining;
    if (sale.remaining) addMetric_(creditByCustomer, sale.customer, sale.remaining, 0);
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

function ensureMasterSheets_() {
  const ss = masterSs_();
  const companySheet = ensureSheet_(ss, MASTER_SHEETS.COMPANIES, ['Компани нэр','Spreadsheet ID','Төлөв','Идэвхжүүлсэн огноо','Хугацаа(сар)','Утас','Имэйл','Company ID','Plan','Plan Start','Plan End','Billing Cycle']);
  const userSheet = ensureSheet_(ss, MASTER_SHEETS.USERS, ['Username','Password','Бүтэн нэр','Роль (manager/rep/admin/sales/warehouse/driver/accountant)','Компани нэр'].concat(SECURITY_USER_HEADERS).concat(['User ID','Company ID','Идэвхтэй']));
  ensureSheet_(ss, MASTER_SHEETS.ADS, MASTER_AD_HEADERS);
  backfillMasterIds_(companySheet, userSheet);
}

function createMasterId_(prefix) {
  return prefix + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 20).toUpperCase();
}
function auditMasterRegistry() {
  ensureMasterSheets_();
  const issues = [], companyRows = sheetObjects_(masterSs_().getSheetByName(MASTER_SHEETS.COMPANIES)).rows,
    userRows = sheetObjects_(masterSs_().getSheetByName(MASTER_SHEETS.USERS)).rows;
  const duplicateCheck = function(rows, getter, code, label) {
    const seen = {}, duplicates = [];
    rows.forEach(function(entry) {
      const value = clean_(getter(entry.object));
      if (!value) return;
      const key = value.toLowerCase();
      if (seen[key] && duplicates.indexOf(value) === -1) duplicates.push(value);
      seen[key] = true;
    });
    if (duplicates.length) issues.push({ severity:'error', code:code, message:label + ': ' + duplicates.join(', ') });
  };
  duplicateCheck(companyRows, o=>o['Company ID'], 'DUPLICATE_COMPANY_ID', 'Company ID давхардсан');
  duplicateCheck(companyRows, o=>o['Spreadsheet ID'], 'DUPLICATE_SPREADSHEET_ID', 'Spreadsheet ID давхардсан');
  duplicateCheck(companyRows, o=>o['Компани нэр'], 'DUPLICATE_COMPANY_NAME', 'Компанийн нэр давхардсан');
  duplicateCheck(userRows, o=>o['Username'], 'DUPLICATE_USERNAME', 'Username давхардсан');
  duplicateCheck(userRows, o=>o['User ID'], 'DUPLICATE_USER_ID', 'User ID давхардсан');
  const companiesById = {}, companiesByName = {};
  companyRows.forEach(function(entry) {
    const o=entry.object,id=clean_(o['Company ID']),name=clean_(o['Компани нэр']);
    if(id)companiesById[id]=o;if(name)companiesByName[name.toLowerCase()]=o;
    const spreadsheetId=clean_(o['Spreadsheet ID']);
    if(!spreadsheetId)issues.push({severity:'error',code:'MISSING_SPREADSHEET_ID',message:(name||id||'Нэргүй компани')+' Spreadsheet ID дутуу.'});
    else try { SpreadsheetApp.openById(spreadsheetId).getName(); }
    catch(error){issues.push({severity:'error',code:'SPREADSHEET_UNAVAILABLE',message:(name||id)+' company Sheet нээгдсэнгүй: '+String(error.message||error).slice(0,160)});}
  });
  userRows.forEach(function(entry) {
    const o=entry.object,username=clean_(o.Username),companyId=clean_(o['Company ID']),companyName=clean_(o['Компани нэр']);
    if(!clean_(o['User ID']))issues.push({severity:'warning',code:'MISSING_USER_ID',message:username+' User ID дутуу.'});
    if(companyId && !companiesById[companyId])issues.push({severity:'error',code:'ORPHAN_USER_COMPANY_ID',message:username+' байхгүй Company ID руу холбогдсон: '+companyId});
    else if(!companyId && companyName && !companiesByName[companyName.toLowerCase()])issues.push({severity:'error',code:'ORPHAN_USER_COMPANY_NAME',message:username+' байхгүй компанийн нэртэй: '+companyName});
  });
  return {checkedAt:new Date().toISOString(),ok:!issues.some(i=>i.severity==='error'),companies:companyRows.length,users:userRows.length,issues:issues};
}

function backfillMasterIds_(companySheet, userSheet) {
  const companyHeaders = getHeaders_(companySheet);
  const companyIdIndex = companyHeaders.indexOf('Company ID');
  const companyNameIndex = companyHeaders.indexOf('Компани нэр');
  const planIndex = companyHeaders.indexOf('Plan');
  const planStartIndex = companyHeaders.indexOf('Plan Start');
  const planEndIndex = companyHeaders.indexOf('Plan End');
  const billingIndex = companyHeaders.indexOf('Billing Cycle');
  const statusIndex = companyHeaders.indexOf('Төлөв');
  const activatedIndex = companyHeaders.indexOf('Идэвхжүүлсэн огноо');
  const monthsIndex = companyHeaders.indexOf('Хугацаа(сар)');
  const companyIdsByName = {};
  if (companySheet.getLastRow() >= 2 && companyIdIndex >= 0 && companyNameIndex >= 0) {
    const rows = companySheet.getRange(2, 1, companySheet.getLastRow() - 1, companyHeaders.length).getValues();
    let changed = false;
    rows.forEach(function(row) {
      const name = clean_(row[companyNameIndex]);
      let id = clean_(row[companyIdIndex]);
      if (!id) { id = createMasterId_('CMP'); row[companyIdIndex] = id; changed = true; }
      if (planIndex >= 0) {
        const currentPlan=clean_(row[planIndex]).toLowerCase();
        const status=statusIndex>=0?clean_(row[statusIndex]).toLowerCase():'';
        const activated=activatedIndex>=0?asDate_(row[activatedIndex]):null;
        const months=monthsIndex>=0?Number(row[monthsIndex]||0):0;
        const legacyEnd=activated&&months>0?addMonths_(activated,months):null;
        const paid=['active','premium','идэвхтэй'].includes(status)||(legacyEnd&&legacyEnd.getTime()>=Date.now());
        if(!currentPlan){
          row[planIndex]=paid?'Business':'Trial'; changed=true;
          if(planStartIndex>=0&&!row[planStartIndex])row[planStartIndex]=paid&&activated?activated:new Date();
          if(planEndIndex>=0&&!row[planEndIndex])row[planEndIndex]=paid&&legacyEnd?legacyEnd:addMonths_(new Date(),1);
          if(billingIndex>=0&&!clean_(row[billingIndex]))row[billingIndex]=paid?'monthly':'trial';
        } else if(currentPlan==='free'){
          const now=new Date();
          row[planIndex]='Trial'; changed=true;
          if(planStartIndex>=0)row[planStartIndex]=now;
          if(planEndIndex>=0)row[planEndIndex]=addMonths_(now,1);
          if(billingIndex>=0)row[billingIndex]='trial';
          if(statusIndex>=0)row[statusIndex]='Active';
          if(activatedIndex>=0)row[activatedIndex]=now;
          if(monthsIndex>=0)row[monthsIndex]=1;
        }
      }
      if (name) companyIdsByName[name.toLowerCase()] = id;
    });
    if (changed) companySheet.getRange(2, 1, rows.length, companyHeaders.length).setValues(rows);
  }

  const userHeaders = getHeaders_(userSheet);
  const userIdIndex = userHeaders.indexOf('User ID');
  const userCompanyIdIndex = userHeaders.indexOf('Company ID');
  const userCompanyNameIndex = userHeaders.indexOf('Компани нэр');
  const activeIndex = userHeaders.indexOf('Идэвхтэй');
  if (userSheet.getLastRow() >= 2 && userIdIndex >= 0 && userCompanyIdIndex >= 0 && userCompanyNameIndex >= 0) {
    const rows = userSheet.getRange(2, 1, userSheet.getLastRow() - 1, userHeaders.length).getValues();
    let changed = false;
    rows.forEach(function(row) {
      if (!clean_(row[userIdIndex])) { row[userIdIndex] = createMasterId_('USR'); changed = true; }
      if (!clean_(row[userCompanyIdIndex])) {
        const companyId = companyIdsByName[clean_(row[userCompanyNameIndex]).toLowerCase()] || '';
        if (companyId) { row[userCompanyIdIndex] = companyId; changed = true; }
      }
      if (activeIndex >= 0 && !clean_(row[activeIndex])) { row[activeIndex] = 'Тийм'; changed = true; }
    });
    if (changed) userSheet.getRange(2, 1, rows.length, userHeaders.length).setValues(rows);
  }
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
  ensureOperationsSheets_(ss);
  const settings=getSettingsMap_(ss);
  if(clean_(settings.EntityIdsBackfillV1)!=='done'){
    backfillCompanyEntityIds_(ss);
    updateSetting_(ss,'EntityIdsBackfillV1','done','Legacy ProductID/CustomerID backfill нэг удаа дууссан.');
  }
}

function backfillCompanyEntityIds_(ss) {
  const productSheet = ss.getSheetByName(COMPANY_SHEETS.PRODUCTS);
  const productRows = sheetObjects_(productSheet).rows;
  const productIds = {};
  productRows.forEach(function(entry) {
    const name = clean_(field_(entry.object, ['Барааны нэр']));
    if (!name) return;
    let id = clean_(field_(entry.object, ['ProductID']));
    if (!id) {
      id = createBusinessId_('PRD');
      setObjectFields_(productSheet, entry.rowNumber, { ProductID: id });
    }
    productIds[name.toLowerCase()] = id;
  });

  const customerSheet = ss.getSheetByName(COMPANY_SHEETS.CUSTOMERS);
  sheetObjects_(customerSheet).rows.forEach(function(entry) {
    const name = clean_(field_(entry.object, ['Харилцагчийн нэр']));
    if (!name || clean_(field_(entry.object, ['CustomerID']))) return;
    setObjectFields_(customerSheet, entry.rowNumber, { CustomerID: createBusinessId_('CUS') });
  });

  [COMPANY_SHEETS.NORMS, COMPANY_SHEETS.WAREHOUSE_STOCK].forEach(function(sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    sheetObjects_(sheet).rows.forEach(function(entry) {
      if (clean_(field_(entry.object, ['ProductID']))) return;
      const name = clean_(field_(entry.object, ['Бараа']));
      const id = productIds[name.toLowerCase()];
      if (id) setObjectFields_(sheet, entry.rowNumber, { ProductID: id });
    });
  });
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
    ['PdfShareMode', 'PRIVATE', 'LINK үед PDF-ийг холбоостой хүн үзнэ; PRIVATE үед зөвхөн Drive эрхтэй хүн үзнэ'],
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

function masterSs_() { const active=SpreadsheetApp.getActiveSpreadsheet();return active||SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('DATALINX_MASTER_ID')); }

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
  const auth = JSON.parse(raw);
  const current = securityUser_(auth.username);
  if (!current) throw new Error('Session хүчингүй болсон. Дахин нэвтэрнэ үү.');
  const user = current.object;
  const active = clean_(field_(user, ['Идэвхтэй'])).toLowerCase();
  if (active === 'үгүй' || active === 'inactive' || active === 'false' || active === '0') throw new Error('Хэрэглэгчийн эрх идэвхгүй байна.');
  const company = requireActiveCompany_(clean_(field_(user, ['Company ID'])) || clean_(field_(user, ['Компани нэр'])));
  if (!planSeatAllowed_(company, auth.username)) throw new Error(company.entitlements.name+' багц '+company.entitlements.maxUsers+' идэвхтэй хэрэглэгч хүртэл. Менежер илүүдэл хэрэглэгчийг идэвхгүй болгох эсвэл багцаа ахиулна уу: '+UPGRADE_URL);
  if (auth.companyId && company.id && auth.companyId !== company.id) throw new Error('Session хүчингүй болсон. Дахин нэвтэрнэ үү.');
  if (Number(user.SessionVersion || 0) !== Number(auth.sessionVersion || 0)) throw new Error('Session хүчингүй болсон. Дахин нэвтэрнэ үү.');
  if (auth.issuedAt && Date.now() - Date.parse(auth.issuedAt) > 86400000) throw new Error('Session хугацаа дууссан.');
  auth.company = company.name;
  auth.companyId = company.id;
  auth.userId = clean_(field_(user, ['User ID','UserID']));
  auth.role = normalizeRole_(field_(user, ['Роль (manager/rep/admin/sales/warehouse/driver/accountant)']));
  auth.fullName = clean_(field_(user, ['Бүтэн нэр']));
  cache.put('session:' + token, JSON.stringify(auth), SESSION_SECONDS);
  return auth;
}

function passwordMatches_(input, stored) {
  stored=String(stored||'');input=String(input||'');
  if(stored.startsWith('$2'))return !bcrypt.truncates(input)&&bcrypt.compareSync(input,stored);
  if(/^[a-f0-9]{64}$/i.test(stored)) {
    // Legacy SHA-256 rows support both the original plaintext password and,
    // for migration compatibility, the exact stored 64-character value.
    // On successful login secureLogin_ immediately upgrades the credential
    // to bcrypt using whatever the user actually entered.
    return secureEqual_(stored.toLowerCase(),input.toLowerCase()) || secureEqual_(stored.toLowerCase(),sha256_(input));
  }
  return !!stored && secureEqual_(stored,input); // Legacy plaintext is upgraded immediately on successful login.
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

function getSaleStockMap_(companySs, p) {
  const result = {};
  const productSheet = companySs.getSheetByName(COMPANY_SHEETS.PRODUCTS);
  normalizeSaleItems_(p).forEach(function(item) {
    if (Object.prototype.hasOwnProperty.call(result, item.product)) return;
    const entry = findObjectRowByValue_(productSheet, ['Барааны нэр'], item.product);
    result[item.product] = entry ? Number(field_(entry.object, ['Одоогийн үлдэгдэл']) || 0) : 0;
  });
  return result;
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
