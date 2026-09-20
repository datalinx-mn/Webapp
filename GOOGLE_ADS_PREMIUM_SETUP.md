# DataLinx — 1 сарын үнэгүй туршилт + төлбөртэй багцын зарын бодлого

## Эрхийн төлөв

MASTER Registry-ийн `Компани` tab дахь үндсэн талбарууд:

- `Plan = Trial` — шинэ компани Business-ийн боломжийг эхний 1 сар үнэгүй, заргүй туршина.
- `Plan = Business` — 24,900₮/сар, заргүй.
- `Plan = Pro` — 59,900₮/сар, заргүй.
- Туршилт эсвэл төлбөртэй хугацаа дуусвал effective plan нь `Expired` болно. Өгөгдөл устахгүй, менежер read-only байдлаар нэвтэрч болно.
- `Төлөв = Inactive` — операторын зүгээс бүрэн хаасан төлөв.

MASTER нэмэлт баганууд:
`Plan | Plan Start | Plan End | Billing Cycle`

Операторын жишээ:

```text
setCompanyPlan('CMP-...', 'Business', 1)
setCompanyPlan('CMP-...', 'Pro', 1)
```

Шинэ бүртгэлд `Trial` автоматаар 1 сарын хугацаатай үүснэ.

## Зар сурталчилгаа

Нэвтэрсэн бизнесийн аппын Trial, Business, Pro багцууд заргүй.

- Google AdSense-ийн гуравдагч талын script нэвтэрсэн апп дотор ачаалагдахгүй.
- Direct sponsor content болон sponsor impression/click metric нэвтэрсэн апп дотор илгээгдэхгүй.
- Public marketing хуудсанд тусдаа сурталчилгаа байж болно.
- Борлуулалт, бараа, ажилтан, харилцагч, авлага, GPS болон зураг зэрэг бизнесийн дотоод датаар ad targeting хийхгүй.

## Туршилтын хугацаа

Trial нь Business-ийн entitlement-ийг ашиглана:
- 5 хэрэглэгч
- 2 агуулах
- борлуулалт, бараа, авлага, буцаалт
- хүргэлт
- PDF
- backup
- CSV / copy-paste импорт
- нийлүүлэгч, худалдан авалт, өглөг
- касс хаалт
- ажиллагааны дэлгэрэнгүй тайлан

Trial дуусахад шинэ operational write хаагдана. Data устахгүй.

## Production checklist

Production-д rollout хийхээс өмнө:
1. MASTER backup авах.
2. Apps Script backend + frontend-ийг нэг release-аар deploy хийх.
3. Trial registration → 1 сарын Plan End үүсэхийг шалгах.
4. Trial expiry → read-only болохыг шалгах.
5. Business/Pro activation → write access буцаад нээгдэхийг шалгах.
6. Public pricing / privacy / terms хуудсууд шинэ model-тэй таарч буйг шалгах.
