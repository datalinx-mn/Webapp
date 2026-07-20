# DataLinx PDF upgrade — Testing checklist

## A. Deployment ба migration

- [ ] MASTER `Компани`, `Хэрэглэгч` tab хэвээр байна.
- [ ] Компани бүрийн Spreadsheet ID зөв нээгдэж байна.
- [ ] Одоо байгаа бизнесийн өгөгдөл MASTER руу холилдоогүй.
- [ ] Company Spreadsheet-д шинэ tab болон баганууд автоматаар нэмэгдсэн.
- [ ] Existing columns устаж, нэр солигдоогүй.
- [ ] Apps Script шинэ version нь хуучин `/exec` URL дээр ажиллаж байна.

## B. Нэвтрэх ба эрх

- [ ] Manager/admin бүх 3 баримт үүсгэж чадна.
- [ ] Sales employee зөвхөн өөрийн борлуулалтын invoice үүсгэж чадна.
- [ ] Warehouse employee confirmed stock-out баримт үүсгэж чадна.
- [ ] Driver зөвхөн өөрт оноосон түгээлтийн баримт үзэж/хэвлэж чадна.
- [ ] Accountant invoice үүсгэж, дахин хэвлэж чадна.
- [ ] Frontend товч нуусан эсэхээс үл хамааран server permission шалгаж байна.
- [ ] Өөр компанийн SaleID/DistributionID дамжуулахад мэдээлэл нээгдэхгүй.

## C. Document number concurrency

- [ ] INV, OUT, DIS тусдаа дараалалтай.
- [ ] 2 browser/device-оос зэрэг PDF үүсгэхэд duplicate дугаар гарахгүй.
- [ ] `DOCUMENT_NUMBERS` LastNumber зөв нэмэгдэнэ.
- [ ] Document number row number-оос хамаарахгүй.

## D. Нэхэмжлэх

- [ ] Approved sale дээр invoice preview нээгдэнэ.
- [ ] Customer, sale, product, totals зөв харагдана.
- [ ] Product code/unit зөв татагдана.
- [ ] Money `1,250,000 ₮` хэлбэртэй, `.00` байхгүй.
- [ ] Дүн үсгээр Монгол хэлээр гарна.
- [ ] Paid invoice дээр `ТӨЛӨГДСӨН` watermark гарна.
- [ ] Cancelled sale дээр `ЦУЦЛАГДСАН` watermark гарна.
- [ ] Unsupported status дээр Монгол алдаа гарна.

## E. Агуулахын зарлагын баримт

- [ ] Агуулахгүй sale дээр `Агуулах сонгогдоогүй байна.` алдаа гарна.
- [ ] Confirmed stock-out байхгүй үед алдаа гарна.
- [ ] Байгууллага, харилцагч, агуулах, нярав зөв харагдана.
- [ ] Thin black table border, signature section хэвлэлтэд зөв байна.
- [ ] Нийт дүн ба дүн үсгээр зөв байна.

## F. Түгээлтийн баримт

- [ ] Түгээлт form-д Sale ID сонгоход customer/warehouse автоматаар санал болгоно.
- [ ] Жолоочгүй бол PDF үүсэхгүй.
- [ ] Хаяггүй бол PDF үүсэхгүй.
- [ ] Linked sale-ийн бүтээгдэхүүнүүд орно.
- [ ] GPS зөв харагдана.
- [ ] Proof image байхгүй үед broken placeholder гарахгүй.
- [ ] Proof image байвал зөв харагдана.
- [ ] Final бус status дээр `НООРОГ` watermark гарна.
- [ ] `Хүргэгдсэн`, `Хэсэгчлэн хүргэсэн`, `Буцаалттай хүргэгдсэн` үед final receipt watermark-гүй гарна.

## G. Pagination ба A4 print

- [ ] 1, 5, 11, 12, 20, 35 бүтээгдэхүүнтэй баримт туршсан.
- [ ] Зөвхөн бодит бүтээгдэхүүний мөрүүд байна.
- [ ] Product row хоёр page-д хуваагдаагүй.
- [ ] Page бүрт table header байна.
- [ ] `Хуудас X / Y` бодит page chunk-тэй таарч байна.
- [ ] Signature section зөвхөн сүүлийн page-д байна.
- [ ] A4 portrait, 10mm margin зөв байна.
- [ ] Navigation/modal/button print дээр харагдахгүй.
- [ ] iOS Safari болон Android Chrome print preview шалгасан.
- [ ] Desktop Chrome/Edge дээр A4 printer test хийсэн.

## H. PDF generation ба version history

- [ ] PDF Drive folder зөв бүтэцтэй үүссэн.
- [ ] File name invalid character-гүй.
- [ ] PDF URL `DOCUMENTS` tab-д хадгалагдсан.
- [ ] CreatedBy, CreatedAt зөв.
- [ ] Reference sheet-ийн PDF URL/number/date шинэчлэгдсэн.
- [ ] Existing PDF үед overwrite хийгдэхгүй, confirmation modal гарна.
- [ ] New version `_v2`, `_v3` нэртэй үүснэ.
- [ ] Өмнөх DOCUMENTS мөр `Superseded` болно.
- [ ] Өмнөх Drive файл устахгүй.

## I. UX ба performance

- [ ] PDF button дармагц disabled + `PDF үүсгэж байна...` төлөв гарна.
- [ ] Давхар click duplicate файл үүсгэхгүй.
- [ ] Preview эхлээд гарч, шууд print эхлэхгүй.
- [ ] Mobile action buttons full width/compact байна.
- [ ] Modal: Хаах / PDF үүсгэх / Хэвлэх ажиллана.
- [ ] Existing PDF modal 3 сонголттой.
- [ ] Success modal PDF нээх / Хэвлэх / Хаах ажиллана.
- [ ] Company settings batch/cached байдлаар уншигдана.
- [ ] 60 хоногийн initial transaction loading хэвээр хурдан байна.
- [ ] Offline sale/inventory queue хэвээр ажиллаж байна.

## J. Error handling

- [ ] `Борлуулалтын мэдээлэл олдсонгүй.`
- [ ] `Бүтээгдэхүүнгүй баримт үүсгэх боломжгүй.`
- [ ] `Агуулах сонгогдоогүй байна.`
- [ ] `Түгээлтийн жолооч оноогдоогүй байна.`
- [ ] `Харилцагчийн хаяг бүртгэгдээгүй байна.`
- [ ] `PDF үүсгэх явцад алдаа гарлаа. Дахин оролдоно уу.`
- [ ] Drive sharing blocked үед script бүхэлдээ crash хийхгүй.
