# Бараа удирдах хэсгийн тохиргоо

`index.html` дотор **Агуулах → Бараа удирдах** хэсэг нэмэгдсэн. Энэ хэсэг зөвхөн `manager` болон `admin` хэрэглэгчид харагдана.

## Apps Script тохиргоо

1. `ProductService.gs` файлыг MASTER Registry spreadsheet-ийн Apps Script төсөлд шинэ script file болгон нэмнэ.
2. Одоогийн `doPost(e)` функцийн session шалгасны дараах action routing хэсэгт дараах хоёр мөрийг нэмнэ:

```javascript
if (action === 'saveProduct') return json_(handleSaveProduct_(auth, payload));
if (action === 'deleteProduct') return json_(handleDeleteProduct_(auth, payload));
```

3. Web App deployment-ээ шинэ version-оор deploy хийнэ:

```text
Deploy → Manage deployments → Edit → New version → Deploy
```

Одоогийн `/exec` URL өөрчлөгдөхгүй.

## Бараа sheet-ийн баганууд

`Бараа` tab дараах дараалалтай байна:

```text
Барааны нэр | Нэгж үнэ | Одоогийн үлдэгдэл | Бага үлдэгдлийн хязгаар | Код | Хэмжих нэгж | Идэвхтэй
```

## Үндсэн дүрэм

- Бараа нэмэх, засах, устгах эрхийг Apps Script сервер талд дахин шалгана.
- Ижил барааны нэр болон код давхардахгүй.
- Үлдэгдэлтэй бараа устгах боломжгүй.
- Барааны нэр өөрчлөгдвөл `Норм` болон `Агуулахын үлдэгдэл` tab-ийн одоогийн холбоосууд шинэчлэгдэнэ.
- Бага үлдэгдлийн хязгаар `Норм` tab-д автоматаар шинэчлэгдэнэ.
