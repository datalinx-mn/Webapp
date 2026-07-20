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

  var company = requireActiveCompany_(auth.company || auth.companyName);
  var companySs = openCompanySs_(company);
  ensureCompanySheets_(companySs);

  var originalName = clean_(payload.originalName);
  var name = clean_(payload.name);
  var code = clean_(payload.code);
  var unit = clean_(payload.unit) || 'ш';
  var price = productNonNegativeNumber_(payload.price, 'Нэгж үнэ');
  var stock = productNonNegativeNumber_(payload.stock, 'Үлдэгдэл');
  var threshold = productNonNegativeNumber_(payload.threshold, 'Бага үлдэгдлийн хязгаар');

  if (!name) throw new Error('Барааны нэрийг оруулна уу.');
  if (name.length > 120) throw new Error('Барааны нэр 120 тэмдэгтээс урт байж болохгүй.');
  if (code.length > 50) throw new Error('Барааны код 50 тэмдэгтээс урт байж болохгүй.');
  if (unit.length > 30) throw new Error('Хэмжих нэгж 30 тэмдэгтээс урт байж болохгүй.');

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
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

    var rowValues = [name, price, stock, threshold, code, unit, true];
    if (target) {
      productSheet.getRange(target.rowNumber, 1, 1, rowValues.length).setValues([rowValues]);
      if (originalName && originalName.toLowerCase() !== name.toLowerCase()) {
        renameProductReferences_(companySs, originalName, name);
      }
    } else {
      productSheet.getRange(productSheet.getLastRow() + 1, 1, 1, rowValues.length).setValues([rowValues]);
    }

    upsertProductNorm_(companySs, originalName || name, name, threshold);

    return {
      success: true,
      product: {
        name: name,
        code: code,
        unit: unit,
        price: price,
        stock: stock,
        threshold: threshold
      },
      products: getProductsForManager_(companySs)
    };
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteProduct_(auth, payload) {
  assertProductManager_(auth);

  var name = clean_(payload.name);
  if (!name) throw new Error('Устгах барааг сонгоно уу.');

  var company = requireActiveCompany_(auth.company || auth.companyName);
  var companySs = openCompanySs_(company);
  ensureCompanySheets_(companySs);

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
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

    productSheet.deleteRow(target.rowNumber);
    deleteProductReferenceRows_(companySs.getSheetByName('Норм'), name);
    deleteProductReferenceRows_(companySs.getSheetByName('Агуулахын үлдэгдэл'), name);

    return { success: true, products: getProductsForManager_(companySs) };
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

function getProductSheet_(companySs) {
  var sheet = companySs.getSheetByName('Бараа');
  if (!sheet) sheet = companySs.insertSheet('Бараа');

  var headers = [
    'Барааны нэр',
    'Нэгж үнэ',
    'Одоогийн үлдэгдэл',
    'Бага үлдэгдлийн хязгаар',
    'Код',
    'Хэмжих нэгж',
    'Идэвхтэй'
  ];

  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }

  var current = sheet.getLastColumn() > 0
    ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(clean_)
    : [];

  var needsHeader = sheet.getLastRow() === 0 || headers.some(function(header, index) {
    return current[index] !== header;
  });

  if (needsHeader) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  return sheet;
}

function readProductRows_(sheet) {
  if (sheet.getLastRow() < 2) return { rows: [] };
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
  return {
    rows: values.map(function(row, index) {
      return {
        rowNumber: index + 2,
        name: row[0],
        price: Number(row[1] || 0),
        stock: Number(row[2] || 0),
        threshold: Number(row[3] || 0),
        code: row[4],
        unit: row[5] || 'ш',
        active: row[6]
      };
    })
  };
}

function getProductsForManager_(companySs) {
  return readProductRows_(getProductSheet_(companySs)).rows
    .filter(function(row) {
      var active = clean_(row.active).toLowerCase();
      return row.name && ['false', '0', 'үгүй', 'идэвхгүй'].indexOf(active) === -1;
    })
    .map(function(row) {
      return {
        name: clean_(row.name),
        code: clean_(row.code),
        unit: clean_(row.unit) || 'ш',
        price: Number(row.price || 0),
        stock: Number(row.stock || 0),
        threshold: Number(row.threshold || 0)
      };
    })
    .sort(function(a, b) {
      return a.name.localeCompare(b.name);
    });
}

function upsertProductNorm_(companySs, lookupName, newName, threshold) {
  var sheet = companySs.getSheetByName('Норм');
  if (!sheet) {
    sheet = companySs.insertSheet('Норм');
    sheet.getRange(1, 1, 1, 2).setValues([['Бараа', 'Бага үлдэгдлийн хязгаар']]);
    sheet.setFrozenRows(1);
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    sheet.appendRow([newName, threshold]);
    return;
  }

  var values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  var target = -1;
  values.some(function(row, index) {
    if (clean_(row[0]).toLowerCase() === clean_(lookupName).toLowerCase()) {
      target = index + 2;
      return true;
    }
    return false;
  });

  if (target > -1) sheet.getRange(target, 1, 1, 2).setValues([[newName, threshold]]);
  else sheet.appendRow([newName, threshold]);
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
