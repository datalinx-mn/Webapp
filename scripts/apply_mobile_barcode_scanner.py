from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str):
    global text
    if old not in text:
        if new in text:
            return
        raise SystemExit(f'{label} anchor not found')
    text = text.replace(old, new, 1)

css_anchor = """    .summary-box {
"""
css_new = """    .barcode-field-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      align-items: start;
    }
    .barcode-scan-btn {
      min-width: 86px;
      min-height: 48px;
      padding-inline: 12px;
      white-space: nowrap;
    }
    .barcode-modal-card { width: min(94vw, 560px); }
    .barcode-video-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 4 / 3;
      overflow: hidden;
      border-radius: 15px;
      background: #050705;
    }
    .barcode-video-wrap video {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
    }
    .barcode-guide {
      position: absolute;
      left: 9%;
      right: 9%;
      top: 32%;
      height: 36%;
      border: 3px solid #8BE291;
      border-radius: 14px;
      box-shadow: 0 0 0 999px rgba(0,0,0,.34);
      pointer-events: none;
    }
    .barcode-guide::after {
      content: '';
      position: absolute;
      left: 8%;
      right: 8%;
      top: 50%;
      height: 2px;
      background: #8BE291;
      box-shadow: 0 0 10px rgba(139,226,145,.9);
    }
    .barcode-status {
      margin: 12px 0;
      min-height: 42px;
      padding: 10px 12px;
      border-radius: 12px;
      background: var(--green-soft);
      color: var(--green);
      font-size: 13px;
      font-weight: 750;
      line-height: 1.45;
    }
    .barcode-manual-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
    }
    @media (max-width: 520px) {
      .barcode-scan-btn { min-width: 72px; padding-inline: 9px; }
      .barcode-manual-row { grid-template-columns: 1fr; }
    }

    .summary-box {
"""
replace_once(css_anchor, css_new, 'barcode CSS')

sale_old = """                <div id="saleProductControl" class="smart-select">
                  <input id="saleProduct" type="text" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="saleProductMenu" placeholder="Бараа хайж сонгох" required>
                  <button class="smart-select-toggle" type="button" aria-label="Барааны жагсаалт нээх" data-smart-toggle="saleProduct">⌄</button>
                  <div id="saleProductMenu" class="smart-select-menu hidden" role="listbox"></div>
                </div>
                <small id="saleProductHint" class="field-hint">Барааны бүртгэлээс сонгоход үнэ автоматаар санал болгоно.</small>
"""
sale_new = """                <div class="barcode-field-row">
                  <div id="saleProductControl" class="smart-select">
                    <input id="saleProduct" type="text" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="saleProductMenu" placeholder="Бараа хайж сонгох" required>
                    <button class="smart-select-toggle" type="button" aria-label="Барааны жагсаалт нээх" data-smart-toggle="saleProduct">⌄</button>
                    <div id="saleProductMenu" class="smart-select-menu hidden" role="listbox"></div>
                  </div>
                  <button class="btn btn-secondary barcode-scan-btn" type="button" data-barcode-target="sale">▦ Скан</button>
                </div>
                <small id="saleProductHint" class="field-hint">Нэрээр хайх эсвэл утасны камераар барааны баркод уншуулна. Үнэ автоматаар санал болгоно.</small>
"""
replace_once(sale_old, sale_new, 'sale product scanner')

product_code_old = """                  <div class="field"><label for="productCode">Барааны код</label><input id="productCode" maxlength="50" placeholder="SKU-001"></div>
"""
product_code_new = """                  <div class="field">
                    <label for="productCode">Баркод / барааны код</label>
                    <div class="barcode-field-row">
                      <input id="productCode" inputmode="numeric" maxlength="50" placeholder="EAN-13, UPC эсвэл SKU-001">
                      <button class="btn btn-secondary barcode-scan-btn" type="button" data-barcode-target="product">▦ Скан</button>
                    </div>
                  </div>
"""
replace_once(product_code_old, product_code_new, 'product code scanner')

inventory_old = """              <div class="field">
                <label for="invProduct">Бараа</label>
                <select id="invProduct" required></select>
              </div>
"""
inventory_new = """              <div class="field">
                <label for="invProduct">Бараа</label>
                <div class="barcode-field-row">
                  <select id="invProduct" required></select>
                  <button class="btn btn-secondary barcode-scan-btn" type="button" data-barcode-target="inventory">▦ Скан</button>
                </div>
                <small class="field-hint">Барааг жагсаалтаас сонгох эсвэл утасны камераар баркод уншуулна.</small>
              </div>
"""
replace_once(inventory_old, inventory_new, 'inventory scanner')

camera_modal_old = """  <div id="cameraModal" class="modal hidden" role="dialog" aria-modal="true" aria-label="Камер">
    <div class="modal-card">
      <div class="video-wrap"><video id="cameraVideo" autoplay playsinline muted></video></div>
      <canvas id="cameraCanvas" class="hidden"></canvas>
      <div class="modal-actions">
        <button id="closeCameraBtn" class="btn btn-neutral" type="button">Болих</button>
        <button id="captureBtn" class="btn btn-primary" type="button">Зураг авах</button>
      </div>
    </div>
  </div>



"""
barcode_modal = """  <div id="cameraModal" class="modal hidden" role="dialog" aria-modal="true" aria-label="Камер">
    <div class="modal-card">
      <div class="video-wrap"><video id="cameraVideo" autoplay playsinline muted></video></div>
      <canvas id="cameraCanvas" class="hidden"></canvas>
      <div class="modal-actions">
        <button id="closeCameraBtn" class="btn btn-neutral" type="button">Болих</button>
        <button id="captureBtn" class="btn btn-primary" type="button">Зураг авах</button>
      </div>
    </div>
  </div>

  <div id="barcodeModal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="barcodeModalTitle">
    <section class="modal-card barcode-modal-card">
      <header class="modal-head">
        <div><h3 id="barcodeModalTitle">Баркод уншуулах</h3><small style="color:var(--muted)">Баркодыг хүрээний голд тогтвортой барина.</small></div>
        <button id="closeBarcodeBtn" class="modal-close" type="button" aria-label="Хаах">×</button>
      </header>
      <div class="barcode-video-wrap">
        <video id="barcodeVideo" autoplay playsinline muted></video>
        <div class="barcode-guide" aria-hidden="true"></div>
      </div>
      <div id="barcodeStatus" class="barcode-status" role="status">Камер эхлүүлж байна...</div>
      <form id="barcodeManualForm" class="barcode-manual-row">
        <input id="barcodeManualInput" inputmode="numeric" autocomplete="off" placeholder="Кодыг гараар оруулах">
        <button class="btn btn-secondary" type="submit">Код ашиглах</button>
      </form>
      <div class="modal-actions">
        <button id="cancelBarcodeBtn" class="btn btn-neutral" type="button">Болих</button>
      </div>
    </section>
  </div>



"""
replace_once(camera_modal_old, barcode_modal, 'barcode modal')

const_old = """    const WALKTHROUGH_KEY_PREFIX = 'datalinxWalkthroughDoneV1';
"""
const_new = """    const WALKTHROUGH_KEY_PREFIX = 'datalinxWalkthroughDoneV1';
    const BARCODE_FALLBACK_URL = 'https://unpkg.com/@zxing/browser@0.2.1';
"""
replace_once(const_old, const_new, 'barcode fallback constant')

state_old = """      cameraStream: null,
      syncing: false,
"""
state_new = """      cameraStream: null,
      barcodeScanner: {
        active: false,
        target: '',
        stream: null,
        detector: null,
        frameId: 0,
        detecting: false,
        lastDetectionAt: 0,
        zxingReader: null,
        zxingControls: null,
        libraryPromise: null
      },
      syncing: false,
"""
replace_once(state_old, state_new, 'barcode scanner state')

init_old = """      bindCamera();
      bindDocumentUi();
"""
init_new = """      bindCamera();
      bindBarcodeScanner();
      bindDocumentUi();
"""
replace_once(init_old, init_new, 'barcode init binding')

escape_old = """        if (event.key === 'Escape' && state.walkthrough.active) finishWalkthrough(false);
        else if (event.key === 'Escape' && !$('#printPreviewModal').classList.contains('hidden')) closePrintPreview();
"""
escape_new = """        if (event.key === 'Escape' && state.walkthrough.active) finishWalkthrough(false);
        else if (event.key === 'Escape' && !$('#barcodeModal').classList.contains('hidden')) closeBarcodeScanner();
        else if (event.key === 'Escape' && !$('#printPreviewModal').classList.contains('hidden')) closePrintPreview();
"""
replace_once(escape_old, escape_new, 'barcode escape handling')

bind_camera_old = """    function bindCamera() {
      $('#cameraBtn').addEventListener('click', openCamera);
      $('#closeCameraBtn').addEventListener('click', closeCamera);
      $('#captureBtn').addEventListener('click', capturePhoto);
      $('#fallbackCameraInput').addEventListener('change', handleFallbackPhoto);
      $('#cameraModal').addEventListener('click', event => {
        if (event.target === $('#cameraModal')) closeCamera();
      });
    }

"""
bind_camera_new = bind_camera_old + """    function bindBarcodeScanner() {
      $$('[data-barcode-target]').forEach(button => {
        button.addEventListener('click', () => openBarcodeScanner(button.dataset.barcodeTarget));
      });
      $('#closeBarcodeBtn').addEventListener('click', closeBarcodeScanner);
      $('#cancelBarcodeBtn').addEventListener('click', closeBarcodeScanner);
      $('#barcodeModal').addEventListener('click', event => {
        if (event.target === $('#barcodeModal')) closeBarcodeScanner();
      });
      $('#barcodeManualForm').addEventListener('submit', event => {
        event.preventDefault();
        const code = $('#barcodeManualInput').value.trim();
        if (!code) return toast('Баркод эсвэл барааны кодыг оруулна уу.', 'error');
        applyScannedBarcode(code);
      });
    }

    async function openBarcodeScanner(target) {
      closeBarcodeScanner(false);
      state.barcodeScanner.active = true;
      state.barcodeScanner.target = target || '';
      $('#barcodeManualInput').value = '';
      $('#barcodeStatus').textContent = 'Камер эхлүүлж байна...';
      $('#barcodeModal').classList.remove('hidden');

      if (!navigator.mediaDevices?.getUserMedia) {
        $('#barcodeStatus').textContent = 'Энэ browser камераар скан хийхийг дэмжихгүй байна. Кодыг доорх талбарт гараар оруулна уу.';
        $('#barcodeManualInput').focus();
        return;
      }

      try {
        if ('BarcodeDetector' in window) {
          await startNativeBarcodeScanner();
        } else {
          await startZxingBarcodeScanner();
        }
      } catch (error) {
        stopBarcodeResources();
        $('#barcodeStatus').textContent = `Камер нээж чадсангүй. Кодыг гараар оруулна уу. (${friendlyCameraError(error)})`;
        $('#barcodeManualInput').focus();
      }
    }

    async function startNativeBarcodeScanner() {
      const wantedFormats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'codabar', 'itf', 'qr_code'];
      let formats = wantedFormats;
      if (typeof BarcodeDetector.getSupportedFormats === 'function') {
        const supported = await BarcodeDetector.getSupportedFormats();
        formats = wantedFormats.filter(format => supported.includes(format));
      }
      state.barcodeScanner.detector = formats.length ? new BarcodeDetector({ formats }) : new BarcodeDetector();
      state.barcodeScanner.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      const video = $('#barcodeVideo');
      video.srcObject = state.barcodeScanner.stream;
      await video.play();
      $('#barcodeStatus').textContent = 'Баркодыг хүрээний голд барина уу.';
      state.barcodeScanner.frameId = requestAnimationFrame(scanNativeBarcodeFrame);
    }

    async function scanNativeBarcodeFrame(timestamp) {
      if (!state.barcodeScanner.active) return;
      const video = $('#barcodeVideo');
      if (!state.barcodeScanner.detecting && video.readyState >= 2 && timestamp - state.barcodeScanner.lastDetectionAt >= 140) {
        state.barcodeScanner.detecting = true;
        state.barcodeScanner.lastDetectionAt = timestamp;
        try {
          const results = await state.barcodeScanner.detector.detect(video);
          if (results?.length && results[0].rawValue) {
            applyScannedBarcode(results[0].rawValue);
            return;
          }
        } catch (error) {
          // A frame may fail while the camera autofocuses; keep scanning.
        } finally {
          state.barcodeScanner.detecting = false;
        }
      }
      if (state.barcodeScanner.active) state.barcodeScanner.frameId = requestAnimationFrame(scanNativeBarcodeFrame);
    }

    async function startZxingBarcodeScanner() {
      $('#barcodeStatus').textContent = 'iPhone/Safari scanner бэлтгэж байна...';
      const ZXing = await loadZxingBarcodeLibrary();
      if (!state.barcodeScanner.active) return;
      const reader = new ZXing.BrowserMultiFormatReader();
      state.barcodeScanner.zxingReader = reader;
      state.barcodeScanner.zxingControls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        $('#barcodeVideo'),
        (result) => {
          if (!state.barcodeScanner.active || !result) return;
          const code = typeof result.getText === 'function' ? result.getText() : result.text;
          if (code) applyScannedBarcode(code);
        }
      );
      $('#barcodeStatus').textContent = 'Баркодыг хүрээний голд барина уу.';
    }

    function loadZxingBarcodeLibrary() {
      if (window.ZXingBrowser) return Promise.resolve(window.ZXingBrowser);
      if (state.barcodeScanner.libraryPromise) return state.barcodeScanner.libraryPromise;
      state.barcodeScanner.libraryPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = BARCODE_FALLBACK_URL;
        script.async = true;
        script.onload = () => window.ZXingBrowser ? resolve(window.ZXingBrowser) : reject(new Error('Scanner library ачаалсангүй.'));
        script.onerror = () => reject(new Error('Scanner library татаж чадсангүй.'));
        document.head.appendChild(script);
      }).catch(error => {
        state.barcodeScanner.libraryPromise = null;
        throw error;
      });
      return state.barcodeScanner.libraryPromise;
    }

    function applyScannedBarcode(rawCode) {
      const code = String(rawCode || '').trim();
      if (!code || !state.barcodeScanner.active) return;
      const target = state.barcodeScanner.target;

      if (target === 'product') {
        $('#productCode').value = code;
        closeBarcodeScanner();
        navigator.vibrate?.(80);
        toast(`Баркод бүртгэгдлээ: ${code}`, 'success');
        return;
      }

      const normalized = normalizeBarcode(code);
      const product = state.products.find(item => normalizeBarcode(item.code) === normalized);
      if (!product) {
        $('#barcodeStatus').textContent = `“${code}” кодтой бараа бүртгэлгүй байна. Менежер Агуулах → Бараа удирдах хэсэгт энэ кодыг бараанд холбоно.`;
        navigator.vibrate?.([50, 50, 50]);
        return;
      }

      if (target === 'sale') {
        const input = $('#saleProduct');
        input.value = product.name;
        input.dataset.selectedValue = product.name;
        updateSaleProduct(product.name);
      } else if (target === 'inventory') {
        $('#invProduct').value = product.name;
        $('#invProduct').dispatchEvent(new Event('change', { bubbles: true }));
      }

      closeBarcodeScanner();
      navigator.vibrate?.(80);
      toast(`${product.name} сонгогдлоо.`, 'success');
    }

    function normalizeBarcode(value) {
      return String(value || '').trim().replace(/\s+/g, '').toLocaleUpperCase('en-US');
    }

    function closeBarcodeScanner(hideModal = true) {
      state.barcodeScanner.active = false;
      stopBarcodeResources();
      if (hideModal) $('#barcodeModal')?.classList.add('hidden');
      const video = $('#barcodeVideo');
      if (video) video.srcObject = null;
    }

    function stopBarcodeResources() {
      if (state.barcodeScanner.frameId) cancelAnimationFrame(state.barcodeScanner.frameId);
      state.barcodeScanner.frameId = 0;
      state.barcodeScanner.detecting = false;
      state.barcodeScanner.stream?.getTracks().forEach(track => track.stop());
      state.barcodeScanner.stream = null;
      try { state.barcodeScanner.zxingControls?.stop(); } catch (error) {}
      try { state.barcodeScanner.zxingReader?.reset?.(); } catch (error) {}
      state.barcodeScanner.zxingControls = null;
      state.barcodeScanner.zxingReader = null;
      state.barcodeScanner.detector = null;
    }

    function friendlyCameraError(error) {
      const name = String(error?.name || '');
      if (name === 'NotAllowedError') return 'Камерын зөвшөөрөл өгөөгүй байна';
      if (name === 'NotFoundError') return 'Арын камер олдсонгүй';
      if (name === 'NotReadableError') return 'Камерыг өөр апп ашиглаж байна';
      return error?.message || 'Тодорхойгүй алдаа';
    }

"""
replace_once(bind_camera_old, bind_camera_new, 'barcode scanner functions')

logout_old = """      closeCamera();
      localStorage.removeItem(SESSION_KEY);
"""
logout_new = """      closeCamera();
      closeBarcodeScanner();
      localStorage.removeItem(SESSION_KEY);
"""
replace_once(logout_old, logout_new, 'barcode logout cleanup')

path.write_text(text, encoding='utf-8')
print('Applied mobile barcode scanner feature')
