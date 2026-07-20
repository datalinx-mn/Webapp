'use strict';

const DOCUMENT_TYPES = {
  INVOICE: { prefix: 'INV', title: 'БОРЛУУЛАЛТЫН БАРИМТ / НЭХЭМЖЛЭХ', folder: 'Invoices', referenceType: 'SALE' },
  STOCK_OUT: { prefix: 'OUT', title: 'АГУУЛАХЫН ЗАРЛАГЫН БАРИМТ', folder: 'Warehouse Issues', referenceType: 'SALE' },
  DISTRIBUTION: { prefix: 'DIS', title: 'ТҮГЭЭЛТИЙН БАРИМТ', folder: 'Distribution Receipts', referenceType: 'DISTRIBUTION' }
};

function handleGetPrintPreview_(auth, payload) {
  const type = normalizeDocumentType_(payload.documentType);
  const referenceId = getReferenceIdFromPayload_(type, payload);
  const printable = getPrintableDataByType_(type, referenceId, auth, true);
  const html = buildPrintableDocumentHtml_(printable, type, { preview: true });
  const existing = getLatestDocumentRecord_(printable.meta.companySpreadsheetId, type, printable.meta.referenceId);
  return {
    success: true,
    documentType: type,
    documentTitle: DOCUMENT_TYPES[type].title,
    documentNumber: printable.meta.documentNumber,
    referenceId: printable.meta.referenceId,
    html: html,
    existingPdf: existing ? documentRecordToClient_(existing) : null
  };
}

function handleGeneratePdf_(auth, payload) {
  const type = normalizeDocumentType_(payload.documentType);
  const referenceId = getReferenceIdFromPayload_(type, payload);
  const forceNewVersion = Boolean(payload.forceNewVersion);
  if (type === 'INVOICE') return generateSalesInvoicePdf(referenceId, auth, { forceNewVersion: forceNewVersion });
  if (type === 'STOCK_OUT') return generateWarehouseIssuePdf(referenceId, auth, { forceNewVersion: forceNewVersion });
  return generateDistributionReceiptPdf(referenceId, auth, { forceNewVersion: forceNewVersion });
}

function handleGetDocumentHistory_(auth, payload) {
  const type = normalizeDocumentType_(payload.documentType);
  const referenceId = getReferenceIdFromPayload_(type, payload);
  const company = requireActiveCompany_(auth.company);
  const data = getPrintableDataByType_(type, referenceId, auth, false);
  validateDocumentPermission_(auth, type, data);
  return {
    success: true,
    documents: getDocumentHistory_(company.spreadsheetId, type, data.meta.referenceId).map(documentRecordToClient_)
  };
}

function generateSalesInvoicePdf(saleId, auth, options) {
  if (!auth) throw new Error('Нэхэмжлэх үүсгэхэд нэвтэрсэн хэрэглэгч шаардлагатай.');
  return generatePdfDocument_(auth, 'INVOICE', saleId, options || {});
}

function generateWarehouseIssuePdf(saleId, auth, options) {
  if (!auth) throw new Error('Зарлагын баримт үүсгэхэд нэвтэрсэн хэрэглэгч шаардлагатай.');
  return generatePdfDocument_(auth, 'STOCK_OUT', saleId, options || {});
}

function generateDistributionReceiptPdf(distributionId, auth, options) {
  if (!auth) throw new Error('Түгээлтийн баримт үүсгэхэд нэвтэрсэн хэрэглэгч шаардлагатай.');
  return generatePdfDocument_(auth, 'DISTRIBUTION', distributionId, options || {});
}

function getPrintableSalesData(saleId, auth, documentType, reserveNumber, skipPermission) {
  const type = normalizeDocumentType_(documentType || 'INVOICE');
  if (type === 'DISTRIBUTION') throw new Error('Борлуулалтын өгөгдлөөр түгээлтийн баримт шууд үүсгэхгүй.');
  const company = auth ? requireActiveCompany_(auth.company) : null;
  if (!company) throw new Error('Компанийн мэдээлэл шаардлагатай.');
  const ss = openCompanySs_(company);
  ensureCompanySheets_(ss);

  const salesSheet = ss.getSheetByName(COMPANY_SHEETS.SALES);
  const salesData = sheetObjects_(salesSheet);
  const matchingRows = salesData.rows.filter(function(entry) {
    return saleRowIdentifier_(entry) === saleId || clean_(field_(entry.object, ['SaleID'])) === saleId || clean_(field_(entry.object, ['Client ID','ClientID'])) === saleId;
  });
  if (!matchingRows.length) throw new Error('Борлуулалтын мэдээлэл олдсонгүй.');

  const first = matchingRows[0].object;
  const actualSaleId = clean_(field_(first, ['SaleID'])) || clean_(field_(first, ['Client ID','ClientID'])) || saleRowIdentifier_(matchingRows[0]);
  const productMap = getProductRecordMap_(ss);
  const customer = getCustomerForSale_(ss, first);
  const payments = getPaymentsForSale_(ss, actualSaleId);
  const inventoryMoves = getInventoryMovesForSale_(ss, actualSaleId);
  const distribution = getDistributionForSale_(ss, actualSaleId, clean_(field_(first, ['DeliveryID'])));
  const settings = getCompanySettings(company.spreadsheetId);
  const warehouse = getWarehouseRecord_(ss, clean_(field_(first, ['Warehouse'])) || firstWarehouse_(ss));

  const products = matchingRows.map(function(entry, index) {
    const row = entry.object;
    const name = clean_(field_(row, ['Бараа']));
    const product = productMap[name.toLowerCase()] || {};
    const quantity = Number(field_(row, ['Тоо']) || 0);
    const unitPrice = Number(field_(row, ['Үнэ']) || 0);
    const discount = Number(field_(row, ['Discount']) || 0);
    const vat = Number(field_(row, ['VAT']) || 0);
    const total = Number(field_(row, ['Нийт дүн']) || Math.max(0, quantity * unitPrice - discount + vat));
    return {
      index: index + 1,
      name: name,
      code: clean_(product.code),
      unit: clean_(product.unit) || 'ш',
      quantity: quantity,
      unitPrice: unitPrice,
      discount: discount,
      vat: vat,
      total: total,
      ordered: quantity,
      delivered: distribution ? Number(field_(distribution.object, ['DeliveredQuantity'])) || quantity : quantity,
      returned: 0
    };
  });

  const subtotal = products.reduce(function(sum, item) { return sum + item.quantity * item.unitPrice; }, 0);
  const discountTotal = products.reduce(function(sum, item) { return sum + item.discount; }, 0);
  const vatTotal = products.reduce(function(sum, item) { return sum + item.vat; }, 0);
  const total = products.reduce(function(sum, item) { return sum + item.total; }, 0);
  const rowPaid = matchingRows.reduce(function(sum, entry) { return sum + Number(field_(entry.object, ['PaidAmount']) || 0); }, 0);
  const paymentPaid = payments.reduce(function(sum, payment) { return sum + payment.amount; }, 0);
  const paid = paymentPaid > 0 ? paymentPaid : rowPaid;
  const remaining = Math.max(0, total - paid);
  const status = clean_(field_(first, ['Status'])) || 'Approved';
  const numberField = type === 'INVOICE' ? 'InvoiceNumber' : 'WarehouseIssueNumber';
  let documentNumber = clean_(field_(first, [numberField]));
  if (reserveNumber && !documentNumber) {
    documentNumber = getNextDocumentNumber(company.spreadsheetId, type, auth.username);
    setFieldsForEntries_(salesSheet, matchingRows, (function() { const o = {}; o[numberField] = documentNumber; return o; })());
  }

  const data = {
    meta: {
      documentType: type,
      documentTitle: DOCUMENT_TYPES[type].title,
      documentNumber: documentNumber || DOCUMENT_TYPES[type].prefix + '-НООРОГ',
      referenceId: actualSaleId,
      saleId: actualSaleId,
      distributionId: distribution ? clean_(field_(distribution.object, ['DistributionID'])) : '',
      companySpreadsheetId: company.spreadsheetId,
      createdBy: auth.fullName || auth.username,
      printedAt: new Date().toISOString(),
      watermark: getWatermark_(type, status, paid, total, distribution ? clean_(field_(distribution.object, ['Status'])) : '')
    },
    company: settings,
    customer: customer,
    sale: {
      saleId: actualSaleId,
      invoiceNumber: type === 'INVOICE' ? (documentNumber || '') : clean_(field_(first, ['InvoiceNumber'])),
      date: iso_(field_(first, ['Огноо'])),
      warehouse: clean_(field_(first, ['Warehouse'])) || warehouse.name,
      warehouseManager: warehouse.manager || settings.warehouseManager,
      salesEmployee: clean_(field_(first, ['Рэп нэр'])),
      deliveryType: clean_(field_(first, ['DeliveryType'])),
      paymentType: clean_(field_(first, ['Төлбөрийн төрөл'])),
      deliveryDate: isoOrText_(field_(first, ['DeliveryDate'])),
      notes: clean_(field_(first, ['Notes'])),
      status: status,
      location: clean_(field_(first, ['Байршил'])),
      dueDate: isoOrText_(field_(first, ['DueDate'])),
      paymentTerm: customer.paymentTerm || (clean_(field_(first, ['Төлбөрийн төрөл'])) === 'Зээл' ? 'Зээл' : 'Бэлэн')
    },
    distribution: distribution ? mapDistributionObject_(distribution.object) : {},
    warehouse: warehouse,
    products: products,
    inventoryMoves: inventoryMoves,
    payments: payments,
    totals: {
      subtotal: subtotal,
      discount: discountTotal,
      vat: vatTotal,
      total: total,
      paid: paid,
      remaining: remaining,
      amountInWords: numberToMongolianWords_(Math.round(total)) + ' төгрөг'
    }
  };
  validatePrintableSalesData_(data, type);
  if (!skipPermission) validateDocumentPermission_(auth, type, data);
  return data;
}

function getPrintableDistributionData(distributionId, auth, reserveNumber) {
  const company = auth ? requireActiveCompany_(auth.company) : null;
  if (!company) throw new Error('Компанийн мэдээлэл шаардлагатай.');
  const ss = openCompanySs_(company);
  ensureCompanySheets_(ss);
  const visitSheet = ss.getSheetByName(COMPANY_SHEETS.VISITS);
  const distributionEntry = findDistributionEntry_(visitSheet, distributionId);
  if (!distributionEntry) throw new Error('Түгээлтийн мэдээлэл олдсонгүй.');

  const distribution = mapDistributionObject_(distributionEntry.object);
  let saleData = null;
  if (distribution.saleId) {
    try { saleData = getPrintableSalesData(distribution.saleId, auth, 'INVOICE', false, true); }
    catch (error) {
      if (error.message !== 'Борлуулалтын мэдээлэл олдсонгүй.') throw error;
    }
  }

  const settings = getCompanySettings(company.spreadsheetId);
  const customer = saleData ? saleData.customer : getCustomerByName_(ss, distribution.customer);
  const distributionItems = getDistributionItems_(ss, distribution.distributionId);
  const products = distributionItems.length ? distributionItems : (saleData ? saleData.products.map(function(item) {
    return Object.assign({}, item, {
      ordered: item.quantity,
      delivered: item.quantity,
      returned: 0
    });
  }) : []);

  let documentNumber = clean_(field_(distributionEntry.object, ['DistributionReceiptNumber']));
  if (reserveNumber && !documentNumber) {
    documentNumber = getNextDocumentNumber(company.spreadsheetId, 'DISTRIBUTION', auth.username);
    setObjectFields_(visitSheet, distributionEntry.rowNumber, { 'DistributionReceiptNumber': documentNumber });
  }

  const total = products.reduce(function(sum, item) { return sum + item.total; }, 0);
  const collected = Number(distribution.collectedPayment || 0);
  const remaining = distribution.remainingReceivable || Math.max(0, total - collected);
  const data = {
    meta: {
      documentType: 'DISTRIBUTION',
      documentTitle: DOCUMENT_TYPES.DISTRIBUTION.title,
      documentNumber: documentNumber || 'DIS-НООРОГ',
      referenceId: distribution.distributionId,
      saleId: distribution.saleId,
      distributionId: distribution.distributionId,
      companySpreadsheetId: company.spreadsheetId,
      createdBy: auth.fullName || auth.username,
      printedAt: new Date().toISOString(),
      watermark: getWatermark_('DISTRIBUTION', '', collected, total, distribution.status)
    },
    company: settings,
    customer: customer,
    sale: saleData ? saleData.sale : { saleId: distribution.saleId, invoiceNumber: distribution.invoiceNumber },
    distribution: distribution,
    warehouse: getWarehouseRecord_(ss, distribution.warehouse || (saleData ? saleData.sale.warehouse : firstWarehouse_(ss))),
    products: products,
    payments: [],
    totals: {
      subtotal: total,
      discount: 0,
      vat: 0,
      total: total,
      paid: collected,
      remaining: Number(remaining || 0),
      amountInWords: numberToMongolianWords_(Math.round(total)) + ' төгрөг'
    }
  };
  validatePrintableDistributionData_(data);
  validateDocumentPermission_(auth, 'DISTRIBUTION', data);
  return data;
}

function getCompanySettings(companyId) {
  const ss = SpreadsheetApp.openById(companyId);
  ensureCompanySheets_(ss);
  const settings = getSettingsMap_(ss);
  const masterCompany = findMasterCompanyBySpreadsheetId_(companyId);
  return {
    companyId: companyId,
    name: clean_(settings.CompanyName) || (masterCompany ? masterCompany.name : ss.getName().replace(/\s*-\s*DataLinx\s*$/i, '')),
    registrationNumber: clean_(settings.RegistrationNumber),
    address: clean_(settings.Address),
    phone: clean_(settings.Phone) || (masterCompany ? masterCompany.phone : ''),
    email: clean_(settings.Email) || (masterCompany ? masterCompany.email : ''),
    logoUrl: clean_(settings.LogoUrl),
    vatRate: Number(settings.VatRate || 0),
    defaultPaymentTermDays: Number(settings.DefaultPaymentTermDays || 14),
    pdfRootFolderId: clean_(settings.PdfRootFolderId),
    warehouseManager: clean_(settings.WarehouseManager),
    defaultDriver: clean_(settings.DefaultDriver),
    defaultVehicle: clean_(settings.DefaultVehicle),
    defaultRoute: clean_(settings.DefaultRoute)
  };
}

function getNextDocumentNumber(companyId, documentType, updatedBy) {
  const type = normalizeDocumentType_(documentType);
  const definition = DOCUMENT_TYPES[type];
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.openById(companyId);
    ensureCompanySheets_(ss);
    const sheet = ss.getSheetByName(COMPANY_SHEETS.DOCUMENT_NUMBERS);
    const data = sheetObjects_(sheet);
    let found = null;
    data.rows.forEach(function(entry) {
      if (clean_(field_(entry.object, ['CompanyID'])) === companyId && clean_(field_(entry.object, ['DocumentType'])) === type) found = entry;
    });
    let next = 1;
    if (found) {
      next = Number(field_(found.object, ['LastNumber']) || 0) + 1;
      setObjectFields_(sheet, found.rowNumber, {
        'Prefix': definition.prefix,
        'LastNumber': next,
        'UpdatedAt': new Date(),
        'UpdatedBy': clean_(updatedBy)
      });
    } else {
      appendObjectRow_(sheet, {
        'CompanyID': companyId,
        'DocumentType': type,
        'Prefix': definition.prefix,
        'LastNumber': next,
        'UpdatedAt': new Date(),
        'UpdatedBy': clean_(updatedBy)
      });
    }
    return definition.prefix + '-' + String(next).padStart(5, '0');
  } finally {
    lock.releaseLock();
  }
}

function savePdfRecord(documentData) {
  if (!documentData || !documentData.companyId || !documentData.documentType || !documentData.documentNumber) {
    throw new Error('PDF бүртгэлийн мэдээлэл дутуу байна.');
  }
  const ss = SpreadsheetApp.openById(documentData.companyId);
  ensureCompanySheets_(ss);
  const sheet = ss.getSheetByName(COMPANY_SHEETS.DOCUMENTS);
  const record = {
    'DocumentID': documentData.documentId || createBusinessId_('DOC'),
    'CompanyID': documentData.companyId,
    'DocumentType': normalizeDocumentType_(documentData.documentType),
    'DocumentNumber': documentData.documentNumber,
    'ReferenceType': documentData.referenceType,
    'ReferenceID': documentData.referenceId,
    'SaleID': documentData.saleId || '',
    'DistributionID': documentData.distributionId || '',
    'CustomerID': documentData.customerId || '',
    'FileName': documentData.fileName,
    'DriveFileID': documentData.driveFileId,
    'PdfUrl': documentData.pdfUrl,
    'Version': Number(documentData.version || 1),
    'Status': documentData.status || 'Active',
    'CreatedBy': documentData.createdBy,
    'CreatedAt': documentData.createdAt || new Date()
  };
  appendObjectRow_(sheet, record);
  return record;
}

function getPrintableDataByType_(type, referenceId, auth, reserveNumber) {
  if (type === 'DISTRIBUTION') return getPrintableDistributionData(referenceId, auth, reserveNumber);
  return getPrintableSalesData(referenceId, auth, type, reserveNumber);
}

function normalizeDocumentType_(value) {
  const type = clean_(value).toUpperCase();
  const aliases = {
    'INVOICE': 'INVOICE', 'INV': 'INVOICE', 'SALES': 'INVOICE',
    'STOCK_OUT': 'STOCK_OUT', 'OUT': 'STOCK_OUT', 'WAREHOUSE': 'STOCK_OUT',
    'DISTRIBUTION': 'DISTRIBUTION', 'DIS': 'DISTRIBUTION'
  };
  if (!aliases[type]) throw new Error('Баримтын төрөл буруу байна.');
  return aliases[type];
}

function getReferenceIdFromPayload_(type, payload) {
  const referenceId = type === 'DISTRIBUTION' ? clean_(payload.distributionId || payload.referenceId) : clean_(payload.saleId || payload.referenceId);
  if (!referenceId) throw new Error(type === 'DISTRIBUTION' ? 'Түгээлтийн ID шаардлагатай.' : 'Борлуулалтын ID шаардлагатай.');
  return referenceId;
}

function saleRowIdentifier_(entry) {
  return clean_(field_(entry.object, ['SaleID'])) || clean_(field_(entry.object, ['Client ID','ClientID'])) || ('LEGACY-SALE-' + entry.rowNumber);
}

function getProductRecordMap_(ss) {
  const map = {};
  getProducts_(ss).forEach(function(product) { map[product.name.toLowerCase()] = product; });
  return map;
}

function getCustomerForSale_(ss, saleObject) {
  const customerId = clean_(field_(saleObject, ['CustomerID']));
  const customerName = clean_(field_(saleObject, ['Харилцагч']));
  const sheet = ss.getSheetByName(COMPANY_SHEETS.CUSTOMERS);
  const data = sheetObjects_(sheet);
  let found = null;
  data.rows.forEach(function(entry) {
    if (customerId && clean_(field_(entry.object, ['CustomerID'])) === customerId) found = entry;
    else if (!found && clean_(field_(entry.object, ['Харилцагчийн нэр'])).toLowerCase() === customerName.toLowerCase()) found = entry;
  });
  return found ? mapCustomerObject_(found.object) : {
    customerId: customerId,
    name: customerName,
    registrationNumber: '', phone: '', address: '', contactPerson: '', paymentTerm: ''
  };
}

function getCustomerByName_(ss, name) {
  const found = findObjectRowByValue_(ss.getSheetByName(COMPANY_SHEETS.CUSTOMERS), ['Харилцагчийн нэр'], name);
  return found ? mapCustomerObject_(found.object) : { customerId: '', name: name, registrationNumber: '', phone: '', address: '', contactPerson: '', paymentTerm: '' };
}

function mapCustomerObject_(object) {
  return {
    customerId: clean_(field_(object, ['CustomerID'])),
    name: clean_(field_(object, ['Харилцагчийн нэр'])),
    registrationNumber: clean_(field_(object, ['Регистрийн дугаар'])),
    phone: clean_(field_(object, ['Утас'])),
    address: clean_(field_(object, ['Хаяг'])),
    contactPerson: clean_(field_(object, ['Холбоо барих хүн'])),
    paymentTerm: clean_(field_(object, ['Төлбөрийн нөхцөл']))
  };
}

function getPaymentsForSale_(ss, saleId) {
  return sheetObjects_(ss.getSheetByName(COMPANY_SHEETS.PAYMENTS)).rows.filter(function(entry) {
    return clean_(field_(entry.object, ['SaleID'])) === saleId && clean_(field_(entry.object, ['Баталгаажуулсан'])).toLowerCase() !== 'үгүй';
  }).map(function(entry) {
    return {
      paymentId: clean_(field_(entry.object, ['PaymentID'])),
      date: iso_(field_(entry.object, ['Огноо'])),
      amount: Number(field_(entry.object, ['Дүн']) || 0),
      method: clean_(field_(entry.object, ['Төлбөрийн арга'])),
      notes: clean_(field_(entry.object, ['Тэмдэглэл']))
    };
  });
}

function getInventoryMovesForSale_(ss, saleId) {
  return sheetObjects_(ss.getSheetByName(COMPANY_SHEETS.INVENTORY_MOVES)).rows.filter(function(entry) {
    return clean_(field_(entry.object, ['SaleID'])) === saleId;
  }).map(function(entry) {
    return {
      product: clean_(field_(entry.object, ['Бараа'])),
      quantity: Number(field_(entry.object, ['Тоо']) || 0),
      warehouse: clean_(field_(entry.object, ['Агуулах'])),
      confirmed: clean_(field_(entry.object, ['Confirmed'])),
      date: iso_(field_(entry.object, ['Огноо']))
    };
  });
}

function getDistributionItems_(ss, distributionId) {
  const sheet = ss.getSheetByName(COMPANY_SHEETS.DISTRIBUTION_ITEMS);
  if (!sheet) return [];
  return sheetObjects_(sheet).rows.filter(function(entry) {
    return clean_(field_(entry.object, ['DistributionID'])) === distributionId;
  }).map(function(entry, index) {
    const ordered = Number(field_(entry.object, ['Захиалсан']) || 0);
    const delivered = Number(field_(entry.object, ['Хүргэсэн']) || 0);
    const returned = Number(field_(entry.object, ['Буцаасан']) || 0);
    const unitPrice = Number(field_(entry.object, ['Нэгжийн үнэ']) || 0);
    return {
      index: index + 1,
      name: clean_(field_(entry.object, ['Бараа'])),
      code: clean_(field_(entry.object, ['Код'])),
      unit: clean_(field_(entry.object, ['Нэгж'])) || 'ш',
      quantity: delivered,
      ordered: ordered,
      delivered: delivered,
      returned: returned,
      unitPrice: unitPrice,
      discount: 0,
      vat: 0,
      total: Number(field_(entry.object, ['Нийт дүн']) || delivered * unitPrice)
    };
  });
}

function getDistributionForSale_(ss, saleId, deliveryId) {
  const rows = sheetObjects_(ss.getSheetByName(COMPANY_SHEETS.VISITS)).rows;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const rowSaleId = clean_(field_(rows[i].object, ['SaleID']));
    const rowDistributionId = clean_(field_(rows[i].object, ['DistributionID']));
    if ((saleId && rowSaleId === saleId) || (deliveryId && rowDistributionId === deliveryId)) return rows[i];
  }
  return null;
}

function findDistributionEntry_(sheet, distributionId) {
  const data = sheetObjects_(sheet);
  for (let i = data.rows.length - 1; i >= 0; i -= 1) {
    if (clean_(field_(data.rows[i].object, ['DistributionID'])) === distributionId) return data.rows[i];
  }
  return null;
}

function mapDistributionObject_(object) {
  return {
    distributionId: clean_(field_(object, ['DistributionID'])),
    saleId: clean_(field_(object, ['SaleID'])),
    invoiceNumber: clean_(field_(object, ['InvoiceNumber'])),
    plannedDeliveryDate: isoOrText_(field_(object, ['PlannedDeliveryDate'])),
    deliveredAt: isoOrText_(field_(object, ['DeliveredAt'])),
    route: clean_(field_(object, ['Route'])),
    vehicle: clean_(field_(object, ['Vehicle'])),
    driver: clean_(field_(object, ['Driver'])),
    salesEmployee: clean_(field_(object, ['SalesEmployee','Рэп нэр'])),
    warehouse: clean_(field_(object, ['Warehouse'])),
    customer: clean_(field_(object, ['Харилцагч'])),
    customerPhone: clean_(field_(object, ['CustomerPhone'])),
    customerAddress: clean_(field_(object, ['CustomerAddress'])),
    locationText: clean_(field_(object, ['LocationText'])),
    contactPerson: clean_(field_(object, ['ContactPerson'])),
    status: clean_(field_(object, ['Status'])) || 'Үүссэн',
    deliveryNotes: clean_(field_(object, ['DeliveryNotes','Тэмдэглэл'])),
    failureReason: clean_(field_(object, ['FailureReason'])),
    returnedProducts: clean_(field_(object, ['ReturnedProducts'])),
    collectedPayment: Number(field_(object, ['CollectedPayment']) || 0),
    paymentMethod: clean_(field_(object, ['PaymentMethod'])),
    remainingReceivable: Number(field_(object, ['RemainingReceivable']) || 0),
    receivedBy: clean_(field_(object, ['ReceivedBy'])),
    customerSignatureUrl: clean_(field_(object, ['CustomerSignatureUrl'])),
    proofImageUrl: clean_(field_(object, ['ProofImageUrl','Зургийн холбоос'])),
    latitude: clean_(field_(object, ['Өргөрөг'])),
    longitude: clean_(field_(object, ['Уртраг']))
  };
}

function getWarehouseRecord_(ss, warehouseName) {
  const found = findObjectRowByValue_(ss.getSheetByName(COMPANY_SHEETS.WAREHOUSES), ['Агуулахын нэр'], warehouseName);
  return found ? {
    name: clean_(field_(found.object, ['Агуулахын нэр'])),
    manager: clean_(field_(found.object, ['Хариуцсан нярав'])),
    address: clean_(field_(found.object, ['Хаяг'])),
    phone: clean_(field_(found.object, ['Утас']))
  } : { name: warehouseName || 'Үндсэн агуулах', manager: '', address: '', phone: '' };
}

function validatePrintableSalesData_(data, type) {
  if (!data || !data.sale || !data.sale.saleId) throw new Error('Борлуулалтын мэдээлэл олдсонгүй.');
  if (!data.customer || !data.customer.name) throw new Error('Харилцагчийн мэдээлэл олдсонгүй.');
  if (!data.products || !data.products.length) throw new Error('Бүтээгдэхүүнгүй баримт үүсгэх боломжгүй.');
  if (!isFinite(data.totals.total) || data.totals.total < 0) throw new Error('Борлуулалтын нийт дүн буруу байна.');

  const allowed = ['approved','prepared','out for delivery','delivered','partially paid','paid','батлагдсан','бэлтгэсэн','түгээлтэд гарсан','хүргэгдсэн','хэсэгчлэн төлсөн','төлсөн'];
  const status = clean_(data.sale.status).toLowerCase();
  const cancelled = status === 'cancelled' || status === 'цуцлагдсан';
  if (!cancelled && allowed.indexOf(status) === -1) throw new Error('Борлуулалт баталгаажаагүй тул баримт үүсгэх боломжгүй.');

  if (type === 'STOCK_OUT') {
    if (!data.sale.warehouse) throw new Error('Агуулах сонгогдоогүй байна.');
    const confirmed = data.inventoryMoves.some(function(move) {
      const value = clean_(move.confirmed).toLowerCase();
      return value === 'тийм' || value === 'yes' || value === 'true' || value === '1';
    });
    if (!confirmed) throw new Error('Агуулахын зарлага баталгаажаагүй байна.');
  }
}

function validatePrintableDistributionData_(data) {
  if (!data || !data.distribution || !data.distribution.distributionId) throw new Error('Түгээлтийн мэдээлэл олдсонгүй.');
  if (!data.distribution.driver) throw new Error('Түгээлтийн жолооч оноогдоогүй байна.');
  const address = data.customer.address || data.distribution.customerAddress || data.distribution.locationText;
  if (!address) throw new Error('Харилцагчийн хаяг бүртгэгдээгүй байна.');
  if (!data.products || !data.products.length) throw new Error('Бүтээгдэхүүнгүй баримт үүсгэх боломжгүй.');
}

function validateDocumentPermission_(auth, type, data) {
  const role = normalizeRole_(auth.role);
  if (['manager','admin'].indexOf(role) > -1) return true;
  if (type === 'INVOICE') {
    if (role === 'accountant') return true;
    if (isSalesRole_(role) && samePerson_(data.sale.salesEmployee, auth)) return true;
  }
  if (type === 'STOCK_OUT') {
    if (role === 'warehouse') return true;
  }
  if (type === 'DISTRIBUTION') {
    if (role === 'driver' && samePerson_(data.distribution.driver, auth)) return true;
    if (isSalesRole_(role) && samePerson_(data.distribution.salesEmployee || data.sale.salesEmployee, auth)) return true;
  }
  throw new Error('Энэ баримтыг үүсгэх эсвэл хэвлэх эрх хүрэлцэхгүй байна.');
}

function samePerson_(displayName, auth) {
  const target = clean_(displayName).toLowerCase();
  return target && (target === clean_(auth.fullName).toLowerCase() || target === clean_(auth.username).toLowerCase());
}

function getWatermark_(type, saleStatus, paid, total, distributionStatus) {
  const status = clean_(saleStatus).toLowerCase();
  const deliveryStatus = clean_(distributionStatus).toLowerCase();
  if (status === 'cancelled' || status === 'цуцлагдсан' || deliveryStatus === 'цуцлагдсан') return 'ЦУЦЛАГДСАН';
  if (type === 'INVOICE' && (status === 'paid' || status === 'төлсөн' || (total > 0 && paid >= total))) return 'ТӨЛӨГДСӨН';
  if (status === 'draft' || status === 'ноорог') return 'НООРОГ';
  if (type === 'DISTRIBUTION') {
    const finalStatuses = ['хүргэгдсэн','хэсэгчлэн хүргэсэн','буцаалттай хүргэгдсэн'];
    if (finalStatuses.indexOf(deliveryStatus) === -1) return 'НООРОГ';
  }
  return '';
}

function setFieldsForEntries_(sheet, entries, updates) {
  if (!entries.length) return;
  const headers = getHeaders_(sheet);
  entries.forEach(function(entry) {
    const row = entry.values.slice();
    Object.keys(updates).forEach(function(key) {
      const index = headerIndex_(headers, [key]);
      if (index > -1) row[index] = updates[key];
    });
    sheet.getRange(entry.rowNumber, 1, 1, headers.length).setValues([row]);
  });
}

function findMasterCompanyBySpreadsheetId_(spreadsheetId) {
  const rows = values_(masterSs_().getSheetByName(MASTER_SHEETS.COMPANIES));
  for (let i = 1; i < rows.length; i += 1) {
    if (clean_(rows[i][1]) === spreadsheetId) {
      return { name: clean_(rows[i][0]), phone: clean_(rows[i][5]), email: clean_(rows[i][6]) };
    }
  }
  return null;
}

function getDocumentHistory_(companyId, type, referenceId) {
  const ss = SpreadsheetApp.openById(companyId);
  ensureCompanySheets_(ss);
  return sheetObjects_(ss.getSheetByName(COMPANY_SHEETS.DOCUMENTS)).rows.filter(function(entry) {
    return clean_(field_(entry.object, ['DocumentType'])) === type && clean_(field_(entry.object, ['ReferenceID'])) === referenceId;
  }).map(function(entry) { return entry.object; }).sort(function(a, b) {
    return Number(field_(b, ['Version']) || 0) - Number(field_(a, ['Version']) || 0);
  });
}

function getLatestDocumentRecord_(companyId, type, referenceId) {
  const history = getDocumentHistory_(companyId, type, referenceId);
  return history.length ? history[0] : null;
}

function documentRecordToClient_(record) {
  return {
    documentId: clean_(field_(record, ['DocumentID'])),
    documentType: clean_(field_(record, ['DocumentType'])),
    documentNumber: clean_(field_(record, ['DocumentNumber'])),
    fileName: clean_(field_(record, ['FileName'])),
    fileId: clean_(field_(record, ['DriveFileID'])),
    pdfUrl: clean_(field_(record, ['PdfUrl'])),
    downloadUrl: clean_(field_(record, ['DriveFileID'])) ? 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(clean_(field_(record, ['DriveFileID']))) : clean_(field_(record, ['PdfUrl'])),
    version: Number(field_(record, ['Version']) || 1),
    status: clean_(field_(record, ['Status'])),
    createdBy: clean_(field_(record, ['CreatedBy'])),
    createdAt: iso_(field_(record, ['CreatedAt']))
  };
}

function numberToMongolianWords_(value) {
  const number = Math.floor(Math.abs(Number(value) || 0));
  if (number === 0) return 'тэг';
  if (number > 999999999999) return String(number);
  const ones = ['', 'нэг', 'хоёр', 'гурав', 'дөрөв', 'тав', 'зургаа', 'долоо', 'найм', 'ес'];
  const tens = ['', 'арав', 'хорь', 'гуч', 'дөч', 'тавь', 'жар', 'дал', 'ная', 'ер'];

  function underThousand_(n) {
    const words = [];
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    if (hundred) words.push((hundred === 1 ? '' : ones[hundred] + ' ') + 'зуун');
    const ten = Math.floor(rest / 10);
    const one = rest % 10;
    if (ten) words.push(tens[ten]);
    if (one) words.push(ones[one]);
    return words.join(' ');
  }

  const groups = [
    { value: 1000000000, name: 'тэрбум' },
    { value: 1000000, name: 'сая' },
    { value: 1000, name: 'мянга' }
  ];
  let remaining = number;
  const words = [];
  groups.forEach(function(group) {
    const amount = Math.floor(remaining / group.value);
    if (amount) {
      words.push(underThousand_(amount));
      words.push(group.name);
      remaining %= group.value;
    }
  });
  if (remaining) words.push(underThousand_(remaining));
  return words.join(' ').replace(/\s+/g, ' ').trim();
}
