'use strict';

function generatePdfDocument_(auth, documentType, referenceId, options) {
  const type = normalizeDocumentType_(documentType);
  const company = requireActiveCompany_(auth.company);
  const forceNewVersion = Boolean(options && options.forceNewVersion);
  const printable = getPrintableDataByType_(type, referenceId, auth, true);
  const latest = getLatestDocumentRecord_(company.spreadsheetId, type, printable.meta.referenceId);

  if (latest && !forceNewVersion) {
    return {
      success: true,
      exists: true,
      message: 'Энэ баримтын PDF өмнө нь үүссэн байна.',
      document: documentRecordToClient_(latest)
    };
  }

  try {
    const version = latest ? Number(field_(latest, ['Version']) || 1) + 1 : 1;
    if (latest) markDocumentSuperseded_(company.spreadsheetId, clean_(field_(latest, ['DocumentID'])));

    const documentHtml = buildPrintableDocumentHtml_(printable, type, { pdf: true });
    const fullHtml = renderPrintTemplate_(documentHtml, printable.meta.documentTitle + ' ' + printable.meta.documentNumber);
    const pdfBlob = Utilities.newBlob(fullHtml, MimeType.HTML, printable.meta.documentNumber + '.html').getAs(MimeType.PDF);
    const folder = getPdfTargetFolder_(company, printable, type);
    const dateStamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
    const customerName = printable.customer && printable.customer.name ? printable.customer.name : 'Customer';
    const versionSuffix = version > 1 ? '_v' + version : '';
    const fileName = sanitizeFileName_(printable.meta.documentNumber + '_' + customerName + '_' + dateStamp + versionSuffix) + '.pdf';
    pdfBlob.setName(fileName);
    const file = folder.createFile(pdfBlob);
    applyPdfSharing_(file, printable.meta.companySpreadsheetId);

    const pdfUrl = file.getUrl();
    const createdAt = new Date();
    const record = savePdfRecord({
      companyId: company.spreadsheetId,
      documentType: type,
      documentNumber: printable.meta.documentNumber,
      referenceType: DOCUMENT_TYPES[type].referenceType,
      referenceId: printable.meta.referenceId,
      saleId: printable.meta.saleId,
      distributionId: printable.meta.distributionId,
      customerId: printable.customer ? printable.customer.customerId : '',
      fileName: fileName,
      driveFileId: file.getId(),
      pdfUrl: pdfUrl,
      version: version,
      status: 'Active',
      createdBy: auth.username,
      createdAt: createdAt
    });
    updateReferencePdfFields_(company.spreadsheetId, type, printable.meta.referenceId, printable.meta.documentNumber, pdfUrl, createdAt);

    return {
      success: true,
      exists: false,
      message: 'PDF амжилттай үүслээ.',
      document: documentRecordToClient_(record)
    };
  } catch (error) {
    throw new Error('PDF үүсгэх явцад алдаа гарлаа. Дахин оролдоно уу. ' + (error.message || String(error)));
  }
}

function renderPrintTemplate_(documentHtml, title) {
  const template = HtmlService.createTemplateFromFile('PrintTemplates');
  template.documentHtml = documentHtml;
  template.printStyles = includeHtmlFile_('PrintStyles');
  template.printScripts = includeHtmlFile_('PrintScripts');
  template.documentTitle = title;
  return template.evaluate().setTitle(title).getContent();
}

function includeHtmlFile_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getPdfTargetFolder_(company, printable, type) {
  const ss = SpreadsheetApp.openById(company.spreadsheetId);
  const settings = getSettingsMap_(ss);
  let companyFolder = null;
  const storedId = clean_(settings.PdfRootFolderId);
  if (storedId) {
    try { companyFolder = DriveApp.getFolderById(storedId); }
    catch (error) { companyFolder = null; }
  }
  if (!companyFolder) {
    const root = getOrCreateDriveFolder_(DriveApp.getRootFolder(), 'Sales System');
    const companyFolderName = sanitizeFileName_(company.name) + '_' + company.spreadsheetId.slice(0, 8);
    companyFolder = getOrCreateDriveFolder_(root, companyFolderName);
    updateSetting_(ss, 'PdfRootFolderId', companyFolder.getId(), 'Компанийн PDF үндсэн хавтас');
  }

  const documents = getOrCreateDriveFolder_(companyFolder, 'Documents');
  const typeFolder = getOrCreateDriveFolder_(documents, DOCUMENT_TYPES[type].folder);
  const now = new Date();
  const year = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy');
  const month = Utilities.formatDate(now, Session.getScriptTimeZone(), 'MM');
  return getOrCreateDriveFolder_(getOrCreateDriveFolder_(typeFolder, year), month);
}

function applyPdfSharing_(file, companyId) {
  const ss = SpreadsheetApp.openById(companyId);
  const settings = getSettingsMap_(ss);
  const mode = clean_(settings.PdfShareMode || 'LINK').toUpperCase();
  if (mode === 'LINK') {
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
    catch (error) {
      // Google Workspace admin may block link sharing. The file remains private and
      // DataLinx can manually share it or change the Workspace sharing policy.
    }
  }
}

function markDocumentSuperseded_(companyId, documentId) {
  if (!documentId) return;
  const ss = SpreadsheetApp.openById(companyId);
  const sheet = ss.getSheetByName(COMPANY_SHEETS.DOCUMENTS);
  const found = findObjectRowByValue_(sheet, ['DocumentID'], documentId);
  if (found) setObjectFields_(sheet, found.rowNumber, { 'Status': 'Superseded' });
}

function updateReferencePdfFields_(companyId, type, referenceId, documentNumber, pdfUrl, generatedAt) {
  const ss = SpreadsheetApp.openById(companyId);
  ensureCompanySheets_(ss);
  if (type === 'DISTRIBUTION') {
    const sheet = ss.getSheetByName(COMPANY_SHEETS.VISITS);
    const entry = findDistributionEntry_(sheet, referenceId);
    if (!entry) throw new Error('Түгээлтийн мэдээлэл олдсонгүй.');
    setObjectFields_(sheet, entry.rowNumber, {
      'DistributionReceiptNumber': documentNumber,
      'DistributionReceiptPdfUrl': pdfUrl,
      'DistributionReceiptGeneratedAt': generatedAt
    });
    return;
  }

  const sheet = ss.getSheetByName(COMPANY_SHEETS.SALES);
  const data = sheetObjects_(sheet);
  const entries = data.rows.filter(function(entry) {
    return saleRowIdentifier_(entry) === referenceId || clean_(field_(entry.object, ['SaleID'])) === referenceId || clean_(field_(entry.object, ['Client ID','ClientID'])) === referenceId;
  });
  if (!entries.length) throw new Error('Борлуулалтын мэдээлэл олдсонгүй.');
  const updates = type === 'INVOICE' ? {
    'InvoiceNumber': documentNumber,
    'InvoicePdfUrl': pdfUrl,
    'InvoiceGeneratedAt': generatedAt
  } : {
    'WarehouseIssueNumber': documentNumber,
    'WarehouseIssuePdfUrl': pdfUrl,
    'WarehouseIssueGeneratedAt': generatedAt
  };
  setFieldsForEntries_(sheet, entries, updates);
}

function buildPrintableDocumentHtml_(data, type, options) {
  const documentType = normalizeDocumentType_(type);
  const products = Array.isArray(data.products) ? data.products : [];
  const pageSize = documentType === 'DISTRIBUTION' ? 9 : documentType === 'STOCK_OUT' ? 12 : 11;
  const pages = chunkPrintRows_(products, pageSize);
  const totalPages = Math.max(1, pages.length);
  const watermark = data.meta.watermark ? '<div class="document-watermark">' + htmlEscape_(data.meta.watermark) + '</div>' : '';
  return pages.map(function(pageProducts, index) {
    const isFirst = index === 0;
    const isLast = index === totalPages - 1;
    let body = '';
    if (documentType === 'INVOICE') body = buildInvoiceMarkup_(data, pageProducts, isFirst, isLast, index * pageSize);
    else if (documentType === 'STOCK_OUT') body = buildWarehouseIssueMarkup_(data, pageProducts, isFirst, isLast, index * pageSize);
    else body = buildDistributionMarkup_(data, pageProducts, isFirst, isLast, index * pageSize);
    return '<article class="print-document print-page document-' + documentType.toLowerCase().replace('_', '-') + '">' +
      watermark + buildCommonDocumentHeader_(data, index + 1, totalPages) +
      '<div class="document-body">' + body + '</div></article>';
  }).join('');
}

function chunkPrintRows_(rows, pageSize) {
  if (!rows.length) return [[]];
  const pages = [];
  for (let index = 0; index < rows.length; index += pageSize) pages.push(rows.slice(index, index + pageSize));
  return pages;
}

function buildCommonDocumentHeader_(data, pageNumber, totalPages) {
  const company = data.company || {};
  const logo = company.logoUrl ? '<img class="document-logo" src="' + htmlAttr_(company.logoUrl) + '" alt="Лого">' : '';
  const printed = asDate_(data.meta.printedAt) || new Date();
  return [
    '<header class="document-header">',
      '<section class="company-block">',
        logo,
        '<div><strong class="company-name">' + htmlEscape_(company.name || '') + '</strong>',
        infoLine_('Регистрийн №', company.registrationNumber),
        infoLine_('Хаяг', company.address),
        infoLine_('Утас', company.phone),
        infoLine_('Имэйл', company.email),
        '</div>',
      '</section>',
      '<section class="document-title-block">',
        '<h1>' + htmlEscape_(data.meta.documentTitle) + '</h1>',
        '<div class="document-number">№ ' + htmlEscape_(data.meta.documentNumber) + '</div>',
      '</section>',
      '<section class="print-meta">',
        '<div><b>Огноо:</b> ' + htmlEscape_(formatMnLongDate_(printed)) + '</div>',
        '<div><b>Хэвлэсэн:</b> ' + htmlEscape_(formatDateTime_(printed)) + '</div>',
        '<div><b>Үүсгэсэн:</b> ' + htmlEscape_(data.meta.createdBy || '') + '</div>',
        '<div class="page-number"><b>Хуудас:</b> ' + pageNumber + ' / ' + totalPages + '</div>',
      '</section>',
    '</header>'
  ].join('');
}

function buildInvoiceMarkup_(data, pageProducts, isFirst, isLast, rowOffset) {
  const sale = data.sale || {};
  const customer = data.customer || {};
  const firstSection = isFirst ? [
    '<section class="info-grid two-column">',
      buildInfoBox_('Харилцагчийн мэдээлэл', [
        ['Харилцагчийн нэр', customer.name],
        ['Регистрийн дугаар', customer.registrationNumber],
        ['Утас', customer.phone],
        ['Хаяг', customer.address],
        ['Холбоо барих хүн', customer.contactPerson],
        ['Хариуцсан борлуулагч', sale.salesEmployee],
        ['Төлбөрийн нөхцөл', sale.paymentTerm],
        ['Төлбөрийн хугацаа', formatShortDate_(sale.dueDate)]
      ]),
      buildInfoBox_('Борлуулалтын мэдээлэл', [
        ['Sale ID', sale.saleId],
        ['Invoice number', sale.invoiceNumber || data.meta.documentNumber],
        ['Борлуулалтын огноо', formatDateTime_(sale.date)],
        ['Агуулах', sale.warehouse],
        ['Борлуулалтын ажилтан', sale.salesEmployee],
        ['Хүргэлтийн төрөл', sale.deliveryType],
        ['Төлбөрийн төрөл', sale.paymentType],
        ['Хүргэлтийн огноо', formatShortDate_(sale.deliveryDate)],
        ['Тэмдэглэл', sale.notes]
      ]),
    '</section>'
  ].join('') : '<div class="continuation-label">Бүтээгдэхүүний жагсаалтын үргэлжлэл</div>';
  const lastSection = isLast ? [
    '<section class="invoice-footer-grid">',
      '<div class="amount-words"><b>Дүн үсгээр:</b><br>' + htmlEscape_(capitalize_(data.totals.amountInWords)) + '</div>',
      buildTotalsBox_(data.totals, sale.dueDate),
    '</section>',
    buildSimpleSignatureBlock_([
      ['Нэхэмжлэх үүсгэсэн', data.meta.createdBy],
      ['Хүлээн авсан', ''],
      ['Нягтлан бодогч', '']
    ])
  ].join('') : '';
  return firstSection + buildProductTable_(pageProducts, 'INVOICE', rowOffset) + lastSection;
}

function buildWarehouseIssueMarkup_(data, pageProducts, isFirst, isLast, rowOffset) {
  const sale = data.sale || {};
  const customer = data.customer || {};
  const distribution = data.distribution || {};
  const warehouse = data.warehouse || {};
  const firstSection = isFirst ? [
    '<section class="compact-sections">',
      buildLabeledLines_('Материалын үнэт зүйл гаргаж буй байгууллага', [
        ['Манай байгууллагын нэр', data.company.name],
        ['Регистрийн №', data.company.registrationNumber],
        ['Агуулах', sale.warehouse || warehouse.name],
        ['Хариуцсан нярав', warehouse.manager || data.company.warehouseManager]
      ]),
      buildLabeledLines_('Материалын үнэт зүйл хүлээн авч буй байгууллага / иргэн', [
        ['Харилцагчийн нэр', customer.name],
        ['Регистрийн №', customer.registrationNumber],
        ['Утас', customer.phone],
        ['Хаяг', customer.address]
      ]),
      buildLabeledLines_('Ерөнхий мэдээлэл', [
        ['Sale ID', sale.saleId],
        ['Агуулахын зарлагын огноо', formatDateTime_(sale.date)],
        ['Distribution ID', distribution.distributionId],
        ['Борлуулалтын ажилтан', sale.salesEmployee],
        ['Жолооч', distribution.driver],
        ['Тээврийн хэрэгсэл', distribution.vehicle],
        ['Маршрут', distribution.route]
      ]),
    '</section>'
  ].join('') : '<div class="continuation-label">Материалын жагсаалтын үргэлжлэл</div>';
  const lastSection = isLast ? [
    '<div class="grand-total-line"><span>НИЙТ ДҮН</span><strong>' + formatMoney_(data.totals.total) + '</strong></div>',
    '<div class="amount-words compact"><b>Дүн үсгээр:</b> ' + htmlEscape_(capitalize_(data.totals.amountInWords)) + '</div>',
    '<div class="note-lines"><b>Тэмдэглэл:</b><div></div><div></div></div>',
    buildSignatureLines_([
      'Хүлээлгэн өгсөн эд хариуцагч',
      'Хүлээн авсан',
      'Шалгасан нягтлан бодогч',
      'Түгээлтийн жолооч'
    ])
  ].join('') : '';
  return firstSection + buildProductTable_(pageProducts, 'STOCK_OUT', rowOffset) + lastSection;
}

function buildDistributionMarkup_(data, pageProducts, isFirst, isLast, rowOffset) {
  const delivery = data.distribution || {};
  const customer = data.customer || {};
  const sale = data.sale || {};
  const firstSection = isFirst ? [
    '<section class="info-grid two-column">',
      buildInfoBox_('Түгээлтийн мэдээлэл', [
        ['Distribution ID', delivery.distributionId],
        ['Sale ID', delivery.saleId || sale.saleId],
        ['Invoice number', delivery.invoiceNumber || sale.invoiceNumber],
        ['Төлөвлөсөн хүргэлт', formatDateTime_(delivery.plannedDeliveryDate)],
        ['Бодит хүргэлт', formatDateTime_(delivery.deliveredAt)],
        ['Маршрут', delivery.route],
        ['Тээврийн хэрэгсэл', delivery.vehicle],
        ['Жолооч', delivery.driver],
        ['Борлуулалтын ажилтан', delivery.salesEmployee || sale.salesEmployee],
        ['Агуулах', delivery.warehouse || sale.warehouse]
      ]),
      buildInfoBox_('Харилцагч', [
        ['Харилцагчийн нэр', customer.name || delivery.customer],
        ['Утас', customer.phone || delivery.customerPhone],
        ['Хаяг', customer.address || delivery.customerAddress],
        ['Газрын зураг / байршил', delivery.locationText],
        ['Холбоо барих хүн', customer.contactPerson || delivery.contactPerson],
        ['GPS', delivery.latitude && delivery.longitude ? delivery.latitude + ', ' + delivery.longitude : '']
      ]),
    '</section>'
  ].join('') : '<div class="continuation-label">Хүргэлтийн бүтээгдэхүүний үргэлжлэл</div>';
  const proof = isLast ? buildProofSection_(delivery) : '';
  const lastSection = isLast ? [
    '<section class="info-grid two-column delivery-summary">',
      buildInfoBox_('Хүргэлтийн үр дүн', [
        ['Хүргэлтийн төлөв', delivery.status],
        ['Хүргэлтийн тэмдэглэл', delivery.deliveryNotes],
        ['Амжилтгүй болсон шалтгаан', delivery.failureReason],
        ['Буцаасан бүтээгдэхүүн', delivery.returnedProducts]
      ]),
      buildInfoBox_('Төлбөрийн мэдээлэл', [
        ['Хураасан төлбөр', formatMoney_(delivery.collectedPayment)],
        ['Төлбөрийн арга', delivery.paymentMethod],
        ['Үлдэгдэл авлага', formatMoney_(data.totals.remaining)]
      ]),
    '</section>',
    proof,
    buildSignatureLines_([
      'Хүлээлгэн өгсөн жолооч',
      'Хүлээн авсан харилцагч'
    ]),
    '<div class="received-date-line"><b>Хүлээн авсан огноо, цаг:</b> _________________________________</div>'
  ].join('') : '';
  return firstSection + buildProductTable_(pageProducts, 'DISTRIBUTION', rowOffset) + lastSection;
}

function buildProductTable_(products, type, rowOffset) {
  rowOffset = Number(rowOffset || 0);
  let headers;
  if (type === 'INVOICE') headers = ['№','Бүтээгдэхүүний нэр','Код','Хэмжих нэгж','Тоо хэмжээ','Нэгжийн үнэ','Хөнгөлөлт','Нийт дүн'];
  else if (type === 'STOCK_OUT') headers = ['№','Материалын үнэт зүйлийн нэр, зэрэг, дугаар','Код','Хэмжих нэгж','Тоо','Нэгжийн үнэ','Нийт дүн'];
  else headers = ['№','Бүтээгдэхүүн','Код','Нэгж','Захиалсан','Хүргэсэн','Буцаасан','Нэгжийн үнэ','Нийт дүн'];
  const rows = products.map(function(item, index) {
    if (type === 'INVOICE') {
      return '<tr><td class="center">' + (rowOffset + index + 1) + '</td><td>' + htmlEscape_(item.name) + '</td><td class="center">' + htmlEscape_(item.code) + '</td><td class="center">' + htmlEscape_(item.unit) + '</td><td class="number">' + formatQuantity_(item.quantity) + '</td><td class="money">' + formatMoney_(item.unitPrice) + '</td><td class="money">' + formatMoney_(item.discount) + '</td><td class="money strong">' + formatMoney_(item.total) + '</td></tr>';
    }
    if (type === 'STOCK_OUT') {
      return '<tr><td class="center">' + (rowOffset + index + 1) + '</td><td>' + htmlEscape_(item.name) + '</td><td class="center">' + htmlEscape_(item.code) + '</td><td class="center">' + htmlEscape_(item.unit) + '</td><td class="number">' + formatQuantity_(item.quantity) + '</td><td class="money">' + formatMoney_(item.unitPrice) + '</td><td class="money strong">' + formatMoney_(item.total) + '</td></tr>';
    }
    return '<tr><td class="center">' + (rowOffset + index + 1) + '</td><td>' + htmlEscape_(item.name) + '</td><td class="center">' + htmlEscape_(item.code) + '</td><td class="center">' + htmlEscape_(item.unit) + '</td><td class="number">' + formatQuantity_(item.ordered) + '</td><td class="number">' + formatQuantity_(item.delivered) + '</td><td class="number">' + formatQuantity_(item.returned) + '</td><td class="money">' + formatMoney_(item.unitPrice) + '</td><td class="money strong">' + formatMoney_(item.total) + '</td></tr>';
  }).join('');
  return '<table class="document-table product-table"><thead><tr>' + headers.map(function(header) { return '<th>' + htmlEscape_(header) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table>';
}

function buildInfoBox_(title, fields) {
  return '<section class="info-box"><h2>' + htmlEscape_(title) + '</h2>' + fields.filter(function(item) { return item[1] !== undefined && item[1] !== null && String(item[1]) !== ''; }).map(function(item) {
    return '<div class="info-row"><span>' + htmlEscape_(item[0]) + '</span><strong>' + htmlEscape_(String(item[1])) + '</strong></div>';
  }).join('') + '</section>';
}

function buildLabeledLines_(title, fields) {
  return '<section class="labeled-lines"><h2>' + htmlEscape_(title) + '</h2>' + fields.map(function(item) {
    return '<div><b>' + htmlEscape_(item[0]) + ':</b> <span>' + htmlEscape_(String(item[1] || '')) + '</span></div>';
  }).join('') + '</section>';
}

function buildTotalsBox_(totals, dueDate) {
  const rows = [
    ['Дэд дүн', totals.subtotal],
    ['Хөнгөлөлт', totals.discount],
    ['НӨАТ', totals.vat],
    ['Нийт төлөх дүн', totals.total],
    ['Төлсөн дүн', totals.paid],
    ['Үлдэгдэл', totals.remaining]
  ];
  return '<section class="totals-box">' + rows.map(function(item, index) {
    return '<div class="totals-row ' + (index === 3 ? 'grand' : '') + '"><span>' + htmlEscape_(item[0]) + '</span><strong>' + formatMoney_(item[1]) + '</strong></div>';
  }).join('') + (dueDate ? '<div class="totals-row"><span>Төлбөрийн хугацаа</span><strong>' + htmlEscape_(formatShortDate_(dueDate)) + '</strong></div>' : '') + '</section>';
}

function buildSignatureLines_(labels) {
  return '<section class="signature-section">' + labels.map(function(label) {
    return '<div class="signature-line"><span>' + htmlEscape_(label) + ':</span><div class="signature-rule"></div><em>/______________/</em></div>';
  }).join('') + '</section>';
}

function buildSimpleSignatureBlock_(items) {
  return '<section class="simple-signatures">' + items.map(function(item) {
    return '<div><b>' + htmlEscape_(item[0]) + ':</b><span>____________________</span><em>/ ' + htmlEscape_(item[1] || '____________') + ' /</em></div>';
  }).join('') + '</section>';
}

function buildProofSection_(delivery) {
  const images = [];
  if (delivery.customerSignatureUrl) images.push('<figure><figcaption>Харилцагчийн гарын үсэг</figcaption><img src="' + htmlAttr_(delivery.customerSignatureUrl) + '" alt="Харилцагчийн гарын үсэг"></figure>');
  if (delivery.proofImageUrl) images.push('<figure><figcaption>Хүргэлтийн нотлох зураг</figcaption><img src="' + htmlAttr_(delivery.proofImageUrl) + '" alt="Хүргэлтийн зураг"></figure>');
  return images.length ? '<section class="proof-section">' + images.join('') + '</section>' : '';
}

function infoLine_(label, value) {
  return value ? '<div class="company-line"><b>' + htmlEscape_(label) + ':</b> ' + htmlEscape_(String(value)) + '</div>' : '';
}

function formatMoney_(value) {
  const number = Number(value || 0);
  return number.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' ₮';
}

function formatQuantity_(value) {
  const number = Number(value || 0);
  return number.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatDateTime_(value) {
  const date = asDate_(value);
  return date ? Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm') : clean_(value);
}

function formatShortDate_(value) {
  const date = asDate_(value);
  return date ? Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd') : clean_(value);
}

function formatMnLongDate_(value) {
  const date = asDate_(value) || new Date();
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy') + ' оны ' + Utilities.formatDate(date, Session.getScriptTimeZone(), 'MM') + ' сарын ' + Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd');
}

function capitalize_(value) {
  const text = clean_(value);
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function htmlEscape_(value) {
  return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, function(char) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
  });
}

function htmlAttr_(value) {
  return htmlEscape_(value).replace(/`/g, '&#96;');
}
