from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')

old = '''                <div id="productManagementTable" class="table-wrap"></div>
              </div>
            </div>
          </details>'''
new = '''                <div id="productManagementTable" class="table-wrap"></div>
              </div>
            </div>
            </div>
          </details>'''
if old not in text:
    raise SystemExit('Product details closing marker not found')
text = text.replace(old, new, 1)

old_css = '''    .simple-details { padding: 0; overflow: hidden; }
'''
new_css = '''    .simple-details { padding: 0; overflow: hidden; }
    .simple-details:not(.card) { border: 1px solid var(--line); border-radius: 14px; background: #fff; }
'''
if old_css not in text:
    raise SystemExit('Simple details CSS marker not found')
text = text.replace(old_css, new_css, 1)

path.write_text(text, encoding='utf-8')
print('Fixed micro-business details markup')
