from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')

old_form = '<form id="saleForm" class="card form-grid">'
new_form = '<form id="saleForm" class="card form-grid" novalidate>'
if old_form in text:
    text = text.replace(old_form, new_form, 1)
elif new_form not in text:
    raise SystemExit('saleForm marker not found')

old_url = """    function safeAdUrl(value) {
      try {
        const url = new URL(String(value || ''), window.location.href);"""
new_url = """    function safeAdUrl(value) {
      const raw = String(value || '').trim();
      if (!raw) return '';
      try {
        const url = new URL(raw, window.location.href);"""
if old_url in text:
    text = text.replace(old_url, new_url, 1)
elif new_url not in text:
    raise SystemExit('safeAdUrl marker not found')

text = text.replace('<span id="topStatus" class="status-pill">FREE</span>', '<span id="topStatus" class="status-pill">ҮНЭГҮЙ</span>', 1)
path.write_text(text, encoding='utf-8')
print('Applied follow-up validation fixes')
