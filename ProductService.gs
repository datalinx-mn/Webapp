'use strict';

/**
 * DataLinx product management service.
 *
 * Add these two routes inside the authenticated section of doPost(e):
 *
 * if (action === 'saveProduct') return json_(handleSaveProduct_(auth, payload));
 * if (action === 'deleteProduct') return json_(handleDeleteProduct_(auth, payload));
 *
 * This file expects the existing application helpers:
 * requireActiveCompany_, openCompanySs_, ensureCompanySheets_, clean_.
 */

function handleSaveProduct_(auth, payload) {
  assertProductManager_(auth);
  assertEntitlement_(auth,'inventory');

  var company = requireActiveCompany_(auth.companyId || auth.company || auth.companyName);
  var companySs = openCompanySs_(company);
  ensureCompanySheets_(companySs);

  var originalName = clean_(payload.originalName);
  var name = clean_(payload.name);
  var code = clean_(payload.code);
  var unit = clean_(payload.unit) || 'ш';
  var price = productNonNegativeNumber_(payload.price, 'Нэгж үнэ');
  var stock = productNonNegativeNumber_(payload.stock, 'Үлдэгдэл');
  var packName = clean_(payload.packName) || 'Хайрцаг';
  var packSize = positiveNumber_(payload.packSize || 1, 'Савлагааны тоо');
  var threshold = productNonNegativeNumber_(payload.threshold, 'Бага үлдэгдлийн хязгаар');
  var averageCostInput = payload.averageCost;
  var hasAverageCostInput = averageCostInput !== undefined && averageCostInput !== null && String(averageCostInput).trim() !== '';
  var averageCost = hasAverageCostInput ? productNonNegativeNumber_(averageCostInput, 'Дундаж өртөг') : null;

  if (!name) throw new Error('Барааны нэрийг оруулна уу.');
  if (name.length > 120) throw new Error('Барааны нэр 120 тэмдэгтээс урт байж болохгүй.');
  if (code.length > 50) throw new Error('Барааны код 50 тэмдэгтээс урт байж болохгүй.');
  if (unit.length > 30) throw new Error('Хэмжих нэгж 30 тэмдэгтээс урт байж болохгүй.');

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    opsRecover_(companySs);
    var productSheet = getProductSheet_(companySs);
    var data = readProductRows_(productSheet);
    var targetName = (originalName || name).toLowerCase();
    var target = null;

    data.rows.some(function(row) {
      if (clean_(row.name).toLowerCase() === targetName) {
        target = row;
        return true;
      }
      return false;
    });

    var duplicateName = data.rows.some(function(row) {
      return (!target || row.rowNumber !== target.rowNumber) &&
        clean_(row.name).toLowerCase() === name.toLowerCase();
    });
    if (duplicateName) throw new Error('Ижил нэртэй бараа бүртгэлтэй байна.');

    if (code) {
      var duplicateCode = data.rows.some(function(row) {
        return (!target || row.rowNumber !== target.rowNumber) &&
          clean_(row.code).toLowerCase() === code.toLowerCase();
      });
      if (duplicateCode) throw new Error('Ижил кодтой бараа бүртгэлтэй байна.');
    }

    if (originalName && !target) throw new Error('Засах бараа олдсонгүй. Жагсаалтаа шинэчилнэ үү.');
    if (target && Number(target.stock) !== stock) throw new Error('Үлдэгдлийг Бараа нэмэх / гаргах хэсгээс өөрчилнө үү.');
    if (target && target.name !== name && productHasHistory_(companySs,target.name)) throw new Error('Хөдөлгөөний түүхтэй барааны нэрийг солих боломжгүй. Шинэ бараа нэмнэ үү.');
    var productId = target && target.id ? target.id : createBusinessId_('PRD');
    var effectiveAverageCost = hasAverageCostInput ? averageCost : (target ? target.averageCost : null);
    var effectiveCostKnown = hasAverageCostInput ? true : (target ? target.costKnown : false);
    var fields = {'Барааны нэр':name,'Нэгж үнэ':price,'Одоогийн үлдэгдэл':stock,'Бага үлдэгдлийн хязгаар':threshold,'Код':code,'Хэмжих нэгж':unit,'Идэвхтэй':'Тийм',ProductID:productId,PackName:packName,PackSize:packSize,AverageCost:effectiveCostKnown?effectiveAverageCost:'',CostKnown:effectiveCostKnown?'Тийм':'Үгүй'};
    if (target) {
      setObjectFields_(productSheet,target.rowNumber,fields);
      if (target.name !== name) renameProductReferences_(companySs,target.name,name);
    } else {
      appendObjectRow_(productSheet,fields);
      var initialWarehouse=firstWarehouse_(companySs);
      appendObjectRow_(companySs.getSheetByName('Агуулахын үлдэгдэл'),{'Агуулах':initialWarehouse,'Бараа':name,'Үлдэгдэл':stock,ProductID:productId});
      if (stock > 0) {
        appendObjectRow_(companySs.getSheetByName(COMPANY_SHEETS.INVENTORY_MOVES),{
          'Огноо':new Date().toISOString(),'Бараа':name,ProductID:productId,
          'Хөдөлгөөний төрөл (орлого/зарлага/шилжүүлэг)':'орлого','Тоо':stock,
          'Шалтгаан':'Бараа бүртгэх үеийн эхний үлдэгдэл','Агуулах':initialWarehouse,
          'Client ID':clean_(payload.clientId)||createBusinessId_('INIT'),'Рэп нэр':auth.fullName||auth.username
        });
      }
    }

    upsertProductNorm_(companySs, originalName || name, name, threshold, productId);

    return {
      success: true,
      product: {
        id: productId,
        name: name,
        code: code,
        unit: unit,
        price: price,
        stock: stock,
        threshold: threshold,
        averageCost: effectiveCostKnown ? effectiveAverageCost : null,
        costKnown: effectiveCostKnown
      },
      products: getProductsForManager_(companySs)
    };
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteProduct_(auth, payload) {
  assertProductManager_(auth);
  assertEntitlement_(auth,'inventory');

  var name = clean_(payload.name);
  if (!name) throw new Error('Устгах барааг сонгоно уу.');

  var company = requireActiveCompany_(auth.companyId || auth.company || auth.companyName);
  var companySs = openCompanySs_(company);
  ensureCompanySheets_(companySs);

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    opsRecover_(companySs);
    var productSheet = getProductSheet_(companySs);
    var data = readProductRows_(productSheet);
    var target = null;

    data.rows.some(function(row) {
      if (clean_(row.name).toLowerCase() === name.toLowerCase()) {
        target = row;
        return true;
      }
      return false;
    });

    if (!target) throw new Error('Барааны мэдээлэл олдсонгүй.');
    if (Math.abs(Number(target.stock || 0)) > 0.000001) {
      throw new Error('Үлдэгдэлтэй барааг устгах боломжгүй. Эхлээд үлдэгдлийг 0 болгоно уу.');
    }

    setObjectFields_(productSheet, target.rowNumber, {'Идэвхтэй':'Үгүй'});
    return { success: true, deactivated: true, products: getProductsForManager_(companySs) };
  } finally {
    lock.releaseLock();
  }
}

function assertProductManager_(auth) {
  var role = clean_(auth && auth.role).toLowerCase();
  if (['manager', 'admin'].indexOf(role) === -1) {
    throw new Error('Зөвхөн менежер бараа удирдах эрхтэй.');
  }
}

function getProductSheet_(companySs) { return ensureSheet_(companySs,'Бараа',SHEET_HEADERS.PRODUCTS.concat(['PackName','PackSize'])); }
function readProductRows_(sheet) {
  return {rows:sheetObjects_(sheet).rows.map(e => ({rowNumber:e.rowNumber,id:clean_(e.object.ProductID),name:e.object['Барааны нэр'],price:Number(e.object['Нэгж үнэ']||0),stock:Number(e.object['Одоогийн үлдэгдэл']||0),threshold:Number(e.object['Бага үлдэгдлийн хязгаар']||0),code:e.object['Код'],unit:e.object['Хэмжих нэгж'],active:e.object['Идэвхтэй'],averageCost:clean_(e.object.AverageCost)===''?null:Number(e.object.AverageCost||0),costKnown:['тийм','true','1','yes'].includes(clean_(e.object.CostKnown).toLowerCase())}))};
}

function getProductsForManager_(companySs) { return getProducts_(companySs); }

function upsertProductNorm_(companySs, lookupName, newName, threshold, productId) {
  var sheet = ensureSheet_(companySs, 'Норм', ['Бараа','Бага үлдэгдлийн хязгаар','ProductID']);
  var target = sheetObjects_(sheet).rows.find(function(entry) {
    return clean_(entry.object.ProductID) === clean_(productId) ||
      clean_(entry.object['Бараа']).toLowerCase() === clean_(lookupName).toLowerCase();
  });
  var fields = {'Бараа':newName,'Бага үлдэгдлийн хязгаар':threshold,ProductID:productId};
  if (target) setObjectFields_(sheet,target.rowNumber,fields);
  else appendObjectRow_(sheet,fields);
}

function renameProductReferences_(companySs, oldName, newName) {
  [
    { sheetName: 'Норм', productColumn: 1 },
    { sheetName: 'Агуулахын үлдэгдэл', productColumn: 2 }
  ].forEach(function(config) {
    var sheet = companySs.getSheetByName(config.sheetName);
    if (!sheet || sheet.getLastRow() < 2) return;

    var range = sheet.getRange(2, config.productColumn, sheet.getLastRow() - 1, 1);
    var values = range.getValues();
    var changed = false;

    values.forEach(function(row) {
      if (clean_(row[0]).toLowerCase() === oldName.toLowerCase()) {
        row[0] = newName;
        changed = true;
      }
    });

    if (changed) range.setValues(values);
  });
}

function deleteProductReferenceRows_(sheet, name) {
  if (!sheet || sheet.getLastRow() < 2) return;
  var productColumn = sheet.getName() === 'Агуулахын үлдэгдэл' ? 2 : 1;
  var values = sheet.getRange(2, productColumn, sheet.getLastRow() - 1, 1).getValues();
  var rowsToDelete = [];

  values.forEach(function(row, index) {
    if (clean_(row[0]).toLowerCase() === name.toLowerCase()) rowsToDelete.push(index + 2);
  });

  rowsToDelete.reverse().forEach(function(rowNumber) {
    sheet.deleteRow(rowNumber);
  });
}

function productNonNegativeNumber_(value, label) {
  var number = Number(value);
  if (!isFinite(number) || number < 0) throw new Error(label + ' 0 буюу түүнээс их байна.');
  return number;
}

function productHasHistory_(ss,name) {
  return ['Гүйлгээ','Агуулахын хөдөлгөөн','Цуврал','Буцаалт'].some(tab => opsRows_(ss,tab).some(e => clean_(e.object['Бараа']).toLowerCase() === name.toLowerCase()));
}
