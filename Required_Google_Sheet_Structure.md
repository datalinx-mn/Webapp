# DataLinx Sales System — Google Sheet баганын бүтэц

Энэ хувилбар нь **MASTER Registry + компани бүрийн тусдаа Spreadsheet** архитектурыг хэвээр ашиглана. `ensureMasterSheets_()` болон `ensureCompanySheets_()` функцүүд байхгүй tab болон баганыг автоматаар нэмнэ. Одоо ашиглаж байгаа баганыг устгахгүй.

## 1. MASTER Registry Spreadsheet

### `Компани`

| Дараалал | Багана |
|---:|---|
| 1 | Компани нэр |
| 2 | Spreadsheet ID |
| 3 | Төлөв |
| 4 | Идэвхжүүлсэн огноо |
| 5 | Хугацаа(сар) |
| 6 | Утас |
| 7 | Имэйл |

### `Хэрэглэгч`

| Дараалал | Багана |
|---:|---|
| 1 | Username |
| 2 | Password |
| 3 | Бүтэн нэр |
| 4 | Роль (manager/rep/admin/sales/warehouse/driver/accountant) |
| 5 | Компани нэр |

Зөвшөөрөгдөх role:

- `admin` — компанийн админ
- `manager` — менежер
- `rep` эсвэл `sales` — борлуулагч
- `warehouse` — агуулахын ажилтан
- `driver` — жолооч
- `accountant` — нягтлан бодогч

---

## 2. Компани бүрийн Spreadsheet

### `Бараа`

| Багана |
|---|
| Барааны нэр |
| Нэгж үнэ |
| Одоогийн үлдэгдэл |
| Бага үлдэгдлийн хязгаар |
| Код |
| Хэмжих нэгж |
| Идэвхтэй |

### `Гүйлгээ`

| Багана |
|---|
| Огноо |
| Рэп нэр |
| Бараа |
| Тоо |
| Үнэ |
| Нийт дүн |
| Харилцагч |
| Төлбөрийн төрөл |
| Байршил |
| Client ID |
| SaleID |
| Status |
| Warehouse |
| DeliveryType |
| DeliveryDate |
| Notes |
| InvoiceNumber |
| InvoicePdfUrl |
| InvoiceGeneratedAt |
| WarehouseIssueNumber |
| WarehouseIssuePdfUrl |
| WarehouseIssueGeneratedAt |
| CustomerID |
| Discount |
| VAT |
| PaidAmount |
| DueDate |
| DeliveryID |
| CreatedBy |

### `Агуулахын хөдөлгөөн`

| Багана |
|---|
| Огноо |
| Бараа |
| Хөдөлгөөний төрөл (орлого/зарлага/шилжүүлэг) |
| Тоо |
| Шалтгаан |
| Агуулах |
| Гарах агуулах |
| Хүлээн авах агуулах |
| Client ID |
| SaleID |
| DistributionID |
| Confirmed |
| Нэгж үнэ |
| Нийт дүн |
| Рэп нэр |

`Confirmed` нь агуулахын зарлагын баримт үүсгэх үед `Тийм`, `Yes`, `true`, эсвэл `1` утгатай байна.

### `Норм`

| Багана |
|---|
| Бараа |
| Бага үлдэгдлийн хязгаар |

### `Түгээлт`

| Багана |
|---|
| Огноо |
| Рэп нэр |
| Харилцагч |
| Өргөрөг |
| Уртраг |
| Зургийн холбоос |
| Тэмдэглэл |
| Client ID |
| DistributionID |
| SaleID |
| InvoiceNumber |
| PlannedDeliveryDate |
| DeliveredAt |
| Route |
| Vehicle |
| Driver |
| SalesEmployee |
| Warehouse |
| CustomerPhone |
| CustomerAddress |
| LocationText |
| ContactPerson |
| Status |
| DeliveryNotes |
| FailureReason |
| ReturnedProducts |
| CollectedPayment |
| PaymentMethod |
| RemainingReceivable |
| DistributionReceiptNumber |
| DistributionReceiptPdfUrl |
| DistributionReceiptGeneratedAt |
| ReceivedBy |
| CustomerSignatureUrl |
| ProofImageUrl |

### `Түгээлтийн дэлгэрэнгүй`

| Багана |
|---|
| DistributionID |
| SaleID |
| Бараа |
| Код |
| Нэгж |
| Захиалсан |
| Хүргэсэн |
| Буцаасан |
| Нэгжийн үнэ |
| Нийт дүн |

Энэ tab нь түгээлтийн баримтын бүтээгдэхүүн тус бүрийн захиалсан, хүргэсэн, буцаасан тоог хадгална. Одоогийн frontend linked sale-аас мөрүүдийг автоматаар үүсгэнэ. Backend нь `distributionItems` JSON array ирвэл бодит хүргэсэн/буцаасан хэмжээг override хийхэд бэлэн.

### `Харилцагч`

| Багана |
|---|
| Харилцагчийн нэр |
| CustomerID |
| Регистрийн дугаар |
| Утас |
| Хаяг |
| Холбоо барих хүн |
| Төлбөрийн нөхцөл |
| Идэвхтэй |

### `Агуулах`

| Багана |
|---|
| Агуулахын нэр |
| Хариуцсан нярав |
| Хаяг |
| Утас |

### `Агуулахын үлдэгдэл`

| Багана |
|---|
| Агуулах |
| Бараа |
| Үлдэгдэл |

### `Байршил`

| Багана |
|---|
| Байршлын нэр |

### `Төлбөр`

| Багана |
|---|
| PaymentID |
| SaleID |
| Огноо |
| Дүн |
| Төлбөрийн арга |
| Баталгаажуулсан |
| Тэмдэглэл |
| CreatedBy |

### `Тохиргоо`

| Багана |
|---|
| Түлхүүр |
| Утга |
| Тайлбар |

Санал болгох түлхүүрүүд:

| Түлхүүр | Жишээ утга | Зориулалт |
|---|---|---|
| CompanyName | ӨГӨӨМЖ АРХАД ХХК | Баримтын компанийн нэр |
| RegistrationNumber | 1234567 | Регистрийн дугаар |
| Address | Улаанбаатар хот... | Хаяг |
| Phone | 99112233 | Утас |
| Email | info@example.mn | Имэйл |
| LogoUrl | Drive/public image URL | Лого |
| VatRate | 10 | НӨАТ хувь |
| DefaultPaymentTermDays | 14 | Зээлийн хугацаа |
| PdfRootFolderId | автоматаар бөглөгдөнө | PDF үндсэн folder |
| PdfShareMode | LINK эсвэл PRIVATE | PDF холбоосын эрх |
| WarehouseManager | Бат | Үндсэн нярав |
| DefaultDriver | Дорж | Үндсэн жолооч |
| DefaultVehicle | УБА 1234 | Тээврийн хэрэгсэл |
| DefaultRoute | Маршрут 1 | Маршрут |

`PdfShareMode=LINK` үед custom username/password хэрэглэгч PDF холбоосыг нээж чадна. Workspace sharing policy хориглосон бол файл private хэвээр үлдэнэ. `PRIVATE` үед DataLinx Google Drive-аас хэрэглэгчийн Google account-д гараар share хийнэ.

### `DOCUMENT_NUMBERS`

| Багана |
|---|
| CompanyID |
| DocumentType |
| Prefix |
| LastNumber |
| UpdatedAt |
| UpdatedBy |

`DocumentType` утга:

- `INVOICE` → `INV`
- `STOCK_OUT` → `OUT`
- `DISTRIBUTION` → `DIS`

### `DOCUMENTS`

| Багана |
|---|
| DocumentID |
| CompanyID |
| DocumentType |
| DocumentNumber |
| ReferenceType |
| ReferenceID |
| SaleID |
| DistributionID |
| CustomerID |
| FileName |
| DriveFileID |
| PdfUrl |
| Version |
| Status |
| CreatedBy |
| CreatedAt |

`Status` нь идэвхтэй хувилбарт `Active`, хуучин хувилбарт `Superseded` байна. Файлыг дарж устгахгүй тул баримтын хувилбарын түүх хадгалагдана.
