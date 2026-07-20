# PDF, нэхэмжлэх, зарлагын болон түгээлтийн баримтын суулгах заавар

## 1. Нөөц хуулбар авах

1. Одоогийн MASTER Spreadsheet-ийг `File → Make a copy` ашиглан хуулна.
2. Apps Script project-ийн одоогийн кодыг татаж эсвэл тусдаа хувилбарт хадгална.
3. Production дээр шууд солихоос өмнө туршилтын компаниар шалгана.

## 2. Apps Script project-д файлууд нэмэх

MASTER Registry Spreadsheet дээр:

`Extensions → Apps Script`

Дараах script файлуудыг үүсгэж, ижил нэртэй кодыг бүхэлд нь хуулна:

1. `Code.gs`
2. `DocumentService.gs`
3. `PdfService.gs`

Дараах HTML файлуудыг үүсгэнэ:

4. `PrintTemplates.html`
5. `PrintStyles.html`
6. `PrintScripts.html`

Apps Script editor дээр HTML file нэмэхэд нэрийг `PrintTemplates`, `PrintStyles`, `PrintScripts` гэж өгнө. Editor `.html` өргөтгөлийг автоматаар харуулна.

`Index.html` нь static frontend файл тул GitHub Pages, Cloudflare Pages, Netlify эсвэл өөр HTTPS hosting дээр байрлана. Энэ архитектурт Apps Script-ийн `doGet()` нь JSON API хэвээр ажиллана.

## 3. Project settings

Apps Script-ийн `Project Settings` хэсэгт:

- Time zone: `Asia/Ulaanbaatar`
- V8 runtime: идэвхтэй
- Script нь MASTER Spreadsheet-тэй bound байх

Код `SpreadsheetApp.getActiveSpreadsheet()`-ээр MASTER Registry-г авч, `Компани` tab дахь Spreadsheet ID-аар тухайн компанийн тусдаа Spreadsheet-ийг нээнэ.

## 4. Эхний permission олгох

Apps Script editor-оос `setupSystem` эсвэл `ensureMasterSheets_`-ийг шууд ажиллуулах шаардлагагүй. Web App-ийн эхний хүсэлтээр tab/багана автоматаар үүснэ.

Drive permission-ийг урьдчилан баталгаажуулахын тулд editor дээр дараах түр test function-ийг ажиллуулж болно:

```javascript
function authorizePdfAccess() {
  DriveApp.getRootFolder().getName();
  SpreadsheetApp.getActiveSpreadsheet().getName();
}
```

Permission өгсний дараа энэ test function-ийг устгаж болно.

## 5. Web App шинэ version deploy хийх

Одоогийн deployment URL-г хэвээр хадгалах:

1. `Deploy → Manage deployments`
2. Одоогийн Web App deployment-ийн Edit дүрс
3. Version: `New version`
4. Execute as: `Me`
5. Who has access: `Anyone`
6. `Deploy`

Frontend-ийн URL:

```text
https://script.google.com/macros/s/AKfycbyiIgDu0EgSPJZSs1pmZvkhykJyDDXdPm8QZRURLaPdw0FhpS0QA14LowqoKPNQY4DN/exec
```

`Index.html` файлд энэ URL аль хэдийн тохируулагдсан.

## 6. Frontend deploy хийх

1. Шинэ `Index.html`-ийг hosting-ийн хуучин файл дээр солино.
2. Browser/CDN cache ашиглаж байгаа бол purge хийнэ.
3. HTTPS URL-аар нээнэ. Камер, GPS нь HTTPS дээр ажиллана.
4. Browser-ийн hard refresh хийнэ: `Ctrl + Shift + R`.

## 7. Компанийн тохиргоо бөглөх

Компанийн тусдаа Spreadsheet дэх `Тохиргоо` tab-д:

- компанийн нэр
- регистр
- хаяг
- утас
- имэйл
- логоны URL
- НӨАТ
- үндсэн нярав
- жолооч
- тээврийн хэрэгсэл
- маршрут

утгуудыг бөглөнө.

Google Drive лого ашиглах бол зураг нь PDF converter унших эрхтэй байх ёстой. Public/link-view URL ашиглах нь хамгийн найдвартай.

## 8. Одоо байгаа компанийн Sheet migration

Шинэ код эхний login эсвэл үйлдлийн үед:

- байхгүй tab-ыг үүсгэнэ;
- байхгүй баганыг баруун талд нэмнэ;
- одоо байгаа баганыг устгахгүй;
- одоо байгаа борлуулалт, бараа, харилцагчийн мөрийг хадгална.

Migration-ээс өмнө backup заавал авна.

Legacy борлуулалтад `SaleID` байхгүй бол UI `LEGACY-SALE-rowNumber` ID харуулж чадна. PDF үүсгэхийн өмнө тухайн мөрүүдэд жинхэнэ `SaleID` өгөх нь илүү найдвартай.

## 9. Баримтын дугаарлалт

`DOCUMENT_NUMBERS` tab-д компани болон document type тус бүр бие даасан counter үүснэ. `LockService.getScriptLock()` ашигладаг тул зэрэг үүсгэх үед duplicate дугаар гарахгүй.

Preview нээх үед баримтын дугаар reserve хийгддэг. Хэрэглэгч preview-ийг хаагаад PDF үүсгэхгүй бол дугаарын дараалалд завсар гарч болох боловч duplicate үүсэхгүй. Санхүүгийн байгууллагын бодлого завсаргүй дугаар шаардах бол дугаарыг зөвхөн final PDF үүсгэх үед reserve хийх горимд өөрчилнө.

## 10. PDF Drive бүтэц

Анхны PDF үүсэхэд автоматаар:

```text
Sales System/
  CompanyName_CompanyID/
    Documents/
      Invoices/YYYY/MM/
      Warehouse Issues/YYYY/MM/
      Distribution Receipts/YYYY/MM/
```

Folder ID нь компанийн `Тохиргоо → PdfRootFolderId` утгад хадгалагдана.

## 11. PDF sharing

- `PdfShareMode=LINK`: холбоостой хүн PDF үзнэ.
- `PdfShareMode=PRIVATE`: зөвхөн Drive эрхтэй Google account үзнэ.

Custom username/password нь Google Drive identity биш. PRIVATE файл хэрэглэгчид өгөх бол DataLinx admin тухайн PDF эсвэл компанийн folder-ийг гараар share хийнэ.

## 12. Баримт үүсгэх урсгал

### Нэхэмжлэх

1. Борлуулалтын жагсаалтаас мөр сонгоно.
2. `Урьдчилан харах` эсвэл `PDF татах`.
3. Preview modal дээр `PDF үүсгэх`.
4. Өмнөх PDF байвал хуучныг нээх эсвэл шинэ хувилбар үүсгэнэ.

### Агуулахын зарлагын баримт

1. Sale status нь зөвшөөрөгдсөн төлөвтэй байна.
2. Warehouse сонгогдсон байна.
3. `Агуулахын хөдөлгөөн` дээр SaleID-тай, Confirmed=`Тийм` зарлага байна.
4. Sale detail → `Хэвлэх → Агуулахын зарлагын баримт`.

### Түгээлтийн баримт

1. Түгээлт tab-д Sale ID сонгоно.
2. Жолооч болон харилцагчийн хаягийг бөглөнө.
3. Түгээлтийг хадгална.
4. Сүүлийн түгээлтийн мөрийн `Баримт` товчийг дарна.
5. Final status сонгогдоогүй бол `НООРОГ` watermark харагдана.

## 13. Production анхааруулга

- Google Apps Script HTML-to-PDF converter-ийн render нь Chrome print engine-тэй 100% ижил биш. A4 layout, page break болон header repetition-ийг code-side product chunking + print CSS-ээр тогтворжуулсан.
- Google Workspace admin `Anyone with link`-ийг хориглосон бол PDF private хэвээр үлдэнэ.
- Large proof image upload Apps Script request limit-д хүрч болох тул frontend 1280px, JPEG quality 0.75-аар шахна.
- PDF үүсгэх болон Drive permission-ийг production Google account дээр бодитоор нэг удаа authorize хийх шаардлагатай.
