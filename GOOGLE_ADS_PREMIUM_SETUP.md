# DataLinx — Google Ads + Premium заргүй тохиргоо

## Эрхийн төлөв

MASTER Registry-ийн `Компани` tab дахь `Төлөв`:

- `Free` — бүх үндсэн боломж нээлттэй, зар харагдана.
- `Active` — Premium заргүй эрх. Одоогийн backend дээр идэвхжүүлсэн огноо болон хугацаа сараар тохируулна.
- `Inactive` — систем ашиглах эрх хаалттай.

Хугацаатай Premium эрхийн жишээ:

```text
Төлөв = Active
Идэвхжүүлсэн огноо = 2026-08-01
Хугацаа(сар) = 12
```

## Google AdSense ID

`premium-ads.js` дотор:

```javascript
const GOOGLE_ADSENSE_CLIENT = 'ca-pub-REPLACE_WITH_YOUR_PUBLISHER_ID';
const GOOGLE_ADSENSE_SLOT = 'REPLACE_WITH_YOUR_AD_SLOT_ID';
```

гэсэн утгуудыг баталгаажсан AdSense publisher ID болон responsive display ad unit-ийн slot ID-аар солино.

Placeholder хэвээр байвал app эвдрэхгүй. MASTER Registry-ийн `Зар` tab дахь direct sponsor зар эсвэл DataLinx house ad харагдана.

## Ажиллах зарчим

- Google-ийн script зөвхөн `Free` хэрэглэгчийн нээсэн цэсэнд lazy-load хийнэ.
- `Active` хэрэглэгчид Google Ads болон direct sponsor зар бүрэн хасагдана.
- Зар form, submit, barcode scanner, камер, GPS, modal, PDF болон print document дотор орохгүй.
- Google Ads ачаалж чадахгүй үед direct sponsor fallback ажиллана.
- Борлуулалт, бараа, ажилтан, харилцагч, авлага, GPS болон зураг ad request-д зориудаар дамжуулахгүй.

## Файлын бүтэц

- `index.html` — жижиг loader.
- `app-core.html` — өмнөх бүрэн app-ийн өөрчлөгдөөгүй snapshot.
- `premium-ads.css` — шинэ зар болон plan card дизайн.
- `premium-ads.js` — Free/Premium зарын логик ба Google AdSense lazy integration.

`app-core.html`-ийг шууд засахын оронд шинэ UI өөрчлөлтийг тусдаа CSS/JS module-д хийхэд үндсэн app-ийг буцаах, шалгах болон шинэчлэхэд хялбар.

## Production checklist

Google Ads-ийг идэвхжүүлэхээс өмнө production domain, AdSense site approval, Privacy Policy, шаардлагатай consent/CMP, `ads.txt` болон Google-ийн зар байрлуулах бодлогыг шалгана.
