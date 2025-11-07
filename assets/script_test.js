/* ─────────────────────  ÍNDICE (script.js)  ─────────────────────
   [A] Utils            → helpers genéricos (qs/qsa, fullscreen api, etc.)
   [B] Slider           → carruseles: prev/next + scrollBy ancho de página
   [C] FormBasic        → honeypot, timestamp, validación de archivo en submit
   [D] Fullscreen       → fullscreen por galería + foco/navegación teclado
   [E] Wizard           → flujo 2 pasos, validaciones, style-picker, poda
   [F] FileUI           → pills de archivo, validación, drag&drop global
   [G] FileBase64       → convierte adjunto a base64 antes del submit final
   [H] Bootstrap        → arranque: init de todos los módulos
──────────────────────────────────────────────────────────────────*/

document.addEventListener("DOMContentLoaded", () => {

  // =============================== [A] Utils ===============================
  const Utils = (() => {
    const qs  = (sel, ctx=document) => ctx.querySelector(sel);
    const qsa = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

    // Fullscreen cross-browser
    const enterFS = (el) =>
      el.requestFullscreen?.() || el.webkitRequestFullscreen?.() || el.msRequestFullscreen?.();
    const exitFS  = () =>
      document.exitFullscreen?.() || document.webkitExitFullscreen?.() || document.msExitFullscreen?.();
    const fsEl    = () =>
      document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;

    // Scroller helpers
    const pageWidth = (el) => el?.clientWidth || 0;

    // Safe addEventListener (evita duplicados si re-bind)
    const on = (el, type, handler, opts) => el && el.addEventListener(type, handler, opts||false);

    // Small DOM
    const h = (tag, attrs={}, html="") => {
      const e = document.createElement(tag);
      Object.entries(attrs).forEach(([k,v]) => (k in e) ? e[k]=v : e.setAttribute(k,v));
      if (html) e.innerHTML = html;
      return e;
    };

    return { qs, qsa, enterFS, exitFS, fsEl, pageWidth, on, h };
  })();


  // ============================== [B] Slider ===============================
  const Slider = (() => {
    function attach(id) {
      const root = Utils.qs(`#${id}`);
      if (!root) return;
      const track = Utils.qs(".slides", root);
      const next  = Utils.qs(".slider-btn.next", root);
      const prev  = Utils.qs(".slider-btn.prev", root);
      if (!track) return;

      Utils.on(next, "click", () => track.scrollBy({ left:  Utils.pageWidth(track),  behavior: "smooth" }));
      Utils.on(prev, "click", () => track.scrollBy({ left: -Utils.pageWidth(track),  behavior: "smooth" }));
    }
    function init() {
      ["gallery-impresion","gallery-digital","gallery-web"].forEach(attach);
    }
    return { init };
  })();


  // ============================ [C] FormBasic ==============================
  const FormBasic = (() => {
    function ensureHoneypot(form) {
      let honey = form.querySelector('input[name="_honey"]');
      if (honey) return honey;
      honey = Utils.h("input", { type:"text", name:"_honey", tabIndex:-1, autocomplete:"off" });
      Object.assign(honey.style, { position:"absolute", left:"-10000px", width:"1px", height:"1px", overflow:"hidden" });
      form.appendChild(honey);
      return honey;
    }
    function ensureStart(form) {
      let startEl = form.querySelector("#formStart");
      if (!startEl) {
        startEl = Utils.h("input", { type:"hidden", id:"formStart", name:"_formStart" });
        form.appendChild(startEl);
      }
      startEl.value = String(Date.now());
      return startEl;
    }

    function validateFile(file) {
      if (!/\.(pdf|docx?)$/i.test(file.name)) return "El CV debe ser PDF, DOC o DOCX.";
      if (file.size > 5*1024*1024)          return "El CV supera los 5 MB. Subí un archivo más liviano.";
      return "";
    }

    function onSubmit(form, honey, start) {
      Utils.on(form, "submit", (e) => {
        if (Date.now() - Number(start.value||0) < 1000) { e.preventDefault(); alert("Por favor revisá tus datos y volvé a intentar."); return; }
        if (honey && honey.value.trim() !== "")         { e.preventDefault(); alert("Error: detección anti-spam. Por favor enviá nuevamente."); return; }

        // Sólo valida el file del FS visible (wizard asigna el activo)
        const cvInput = document.querySelector('.svc-fields:not(.hidden) input[type="file"][id^="cvfile_"]');
        const file = cvInput?.files?.[0];
        if (file) {
          const err = validateFile(file);
          if (err) { e.preventDefault(); alert(err); }
        }
      });
    }

    function init() {
      const form = Utils.qs("#pedidoForm");
      if (!form) return;
      const honey = ensureHoneypot(form);
      const start = ensureStart(form);
      onSubmit(form, honey, start);
    }

    return { init };
  })();


  // ============================ [D] Fullscreen =============================
  const Fullscreen = (() => {
    function attach(galleryId) {
      const gallery = Utils.qs(`#${galleryId}`);
      if (!gallery) return;

      const imgs   = Utils.qsa(".slide img", gallery);
      const slides = Utils.qsa(".slide", gallery);
      const track  = Utils.qs(".slides", gallery);
      if (!track || !imgs.length) return;

      // Exit button único
      let exitBtn = Utils.qs("#fs-exit-btn");
      if (!exitBtn) {
        exitBtn = Utils.h("button", { id:"fs-exit-btn", type:"button", "aria-label":"Salir de pantalla completa" }, "Salir de pantalla completa");
        exitBtn.style.display = "none";
        document.body.appendChild(exitBtn);
      }

      let idx = -1;
      const focusSlide = (i) => { slides.forEach(s=>s.classList.remove("is-focused")); if (slides[i]) slides[i].classList.add("is-focused"); };
      const openFull   = (i) => { if (i<0 || i>=imgs.length) return; idx=i; focusSlide(i); Utils.enterFS(gallery); };
      const closeFull  = () => { exitBtn.style.display="none"; Utils.exitFS(); };
      const next = (dir) => { if (idx<0) return; idx += (dir>0?1:-1); if (idx>=imgs.length) idx=0; if (idx<0) idx=imgs.length-1; focusSlide(idx); };

      imgs.forEach((img, i) => {
        img.tabIndex = img.tabIndex || 0;
        img.setAttribute("role","button");
        img.style.cursor = "zoom-in";
        Utils.on(img, "click", () => openFull(i));
        Utils.on(img, "keydown", (e) => { if (e.key==="Enter"||e.key===" ") { e.preventDefault(); openFull(i); } });
      });

      Utils.on(document, "keydown", (e) => {
        if (Utils.fsEl() !== gallery) return;
        if (e.key === "Escape") { e.preventDefault(); closeFull(); }
        else if (e.key === "ArrowRight") next(1);
        else if (e.key === "ArrowLeft")  next(-1);
      });

      Utils.on(exitBtn, "click", closeFull);

      Utils.on(gallery, "click", (e) => {
        if (Utils.fsEl() === gallery) {
          e.preventDefault(); e.stopPropagation();
          closeFull();
        }
      }, true);

      const onFSChange = () => {
        if (Utils.fsEl() === gallery) {
          document.body.classList.add("fs-open");
          exitBtn.style.display = "block";
          exitBtn.focus();
          focusSlide(idx);
        } else {
          document.body.classList.remove("fs-open");
          exitBtn.style.display = "none";
          slides.forEach(s=>s.classList.remove("is-focused"));
        }
      };
      ["fullscreenchange","webkitfullscreenchange","MSFullscreenChange"].forEach(evt =>
        Utils.on(document, evt, onFSChange)
      );
    }

    function init() {
      ["gallery-impresion","gallery-digital"].forEach(attach);
    }

    return { init };
  })();


  // ============================== [E] Wizard ===============================
  const Wizard = (() => {
    // Config de estilos por servicio
    const STYLE_MAP = {
      cv_clasico: [
        { value:'moderno',       caption:'Moderno',            img:'assets/CV_Maradona.png' },
        { value:'minimalista',   caption:'Minimalista/Sobrio', img:'assets/CV_favaloro.png' },
        { value:'academico',     caption:'Académico',          img:'assets/CV_Houssay.png' },
        { value:'personalizado', caption:'Personalizado',      img:'assets/CV_sparrow.png' }
      ],
      cv_redes: [
        { value:'minimalista',   caption:'Minimalista/Sobrio', img:'assets/CV_Digital_Maradona.png' },
        { value:'moderno',       caption:'Moderno',            img:'assets/CV_charly_digital.png' }
      ],
      cv_web: [
        { value:'personalizable', caption:'Personalizable',    img:'assets/CV_Web_Maradona_preview.png' }
      ]
    };

    // --- estado/refs ---
    let wizard, form, step1, step2, toStep2, backTo1, submitBtn, consent;
    let progressFill, progressLabel, dots;
    let radiosServicio, svcGroups, stylePicker, styleGrid, estiloCard;

    // --- helpers internos ---
    const getService = () => Utils.qs('input[name="servicio"]:checked', wizard)?.value || null;
    const getActiveFs = () => svcGroups.find(fs => !fs.classList.contains('hidden')) || null;

    function setProgress(step){
      if (!progressFill || !progressLabel) return;
      progressFill.style.width = step===1 ? "50%" : "100%";
      dots.forEach((d,i)=> d.classList.toggle("active", i < step));
      progressLabel.textContent = (step===1)
        ? "Paso 1 de 2 — Servicio, estilo y contenido"
        : "Paso 2 de 2 — Datos personales y envío";
    }

    function showStep(n){
      [step1,step2].forEach((s,i)=> s?.classList.toggle('hidden', (i+1)!==n));
      setProgress(n);
    }

    function clearStyleSelection() {
      if (estiloCard) estiloCard.value = '';
      const checked = styleGrid?.querySelector('input[type="radio"]:checked');
      if (checked) checked.checked = false;
    }

    function setFieldsetActive(fs, active){
      if (!fs) return;
      const fields = fs.querySelectorAll('input, textarea, select');

      if (active) {
        // Asegurar que sólo el FS activo lleve name="attachment" si existiera
        document.querySelectorAll('input[type="file"][name="attachment"]').forEach(inp=>{
          if (!fs.contains(inp)) inp.removeAttribute('name');
        });
      }

      fields.forEach(el => {
        const type = (el.type || '').toLowerCase();

        // required ⇄ data-required
        if (active) {
          if (el.dataset.required === 'true') { el.required = true; delete el.dataset.required; }
        } else {
          if (el.required) { el.dataset.required = 'true'; el.required = false; }
        }

        if (active){
          if (!el.name && el.dataset.name) el.name = el.dataset.name;
          el.disabled = false;
        } else {
          if (el.name) el.dataset.name = el.name;
          if (type !== 'file') el.removeAttribute('name');
          el.disabled = true;
          if (type === 'radio' && el.matches('input[name="usarFoto"]')) el.checked = false;
        }
      });

      fs.classList.toggle('hidden', !active);
    }

    function hideAllContent(){ svcGroups.forEach(fs => setFieldsetActive(fs, false)); }

    function bindMessageCounter(fs) {
      if (!fs) return;
      const msg = fs.querySelector('textarea[id^="mensaje_"]');
      const counter = fs.querySelector('div[id^="msgCounter_"]');
      if (!msg || !counter) return;

      // Rebind limpio
      const clone = msg.cloneNode(true);
      msg.parentNode.replaceChild(clone, msg);
      const msgClean = fs.querySelector('textarea[id^="mensaje_"]');

      const update = () => { counter.textContent = `${msgClean.value.length}/800`; };
      Utils.on(msgClean, "input", update);
      update();
    }

    function renderStyleOptions(serviceValue) {
      if (!stylePicker || !styleGrid) return;

      if (!serviceValue || !STYLE_MAP[serviceValue]) {
        stylePicker.classList.add('hidden');
        styleGrid.innerHTML = '';
        clearStyleSelection();
        hideAllContent();
        return;
      }

      const options = STYLE_MAP[serviceValue];
      stylePicker.classList.remove('hidden');
      styleGrid.innerHTML = '';

      options.forEach((opt, idx) => {
        const id = `estilo_card_${serviceValue}_${idx}`;
        const card = Utils.h("label", { className:"style-card", for:id }, `
          <input type="radio" id="${id}" name="estilo_card" value="${opt.value}" required>
          <img src="${opt.img}" alt="${opt.caption}">
          <div class="style-caption"><span>${opt.caption}</span></div>
        `);
        Utils.on(card, "change", () => {
          const r = card.querySelector('input[type="radio"]');
          if (r && r.checked && estiloCard) {
            estiloCard.value = opt.value;
            const svc = getService();
            hideAllContent();
            if (svc){
              const fs = svcGroups.find(x => x.getAttribute('data-for') === svc);
              setFieldsetActive(fs, true);
              bindMessageCounter(fs);
              FileUI.bindDropzone(fs);
              fs?.querySelector('.contenido-comun')?.classList.remove('hidden');
              fs?.scrollIntoView({ behavior:"smooth", block:"start" });
            }
            validateStep1AndToggle();
          }
        });
        styleGrid.appendChild(card);
      });
    }

    function validateStep1(){
      const svc = getService();
      const estiloElegido = estiloCard?.value;
      if (!svc || !estiloElegido) return false;

      const fs = getActiveFs();
      if (!fs) return false;

      // Reglas por servicio
      if (svc === 'cv_redes') {
        const titular     = fs.querySelector('#headline_redes');
        const experiencia = fs.querySelector('#experiencia_redes');
        const habilidades = fs.querySelector('#habilidades_redes');
        const educacion   = fs.querySelector('#educacion_redes');
        const fotoOk = Array.from(fs.querySelectorAll('input[name="usarFoto"]')).some(r => r.checked);
        if (!titular?.value.trim() || !experiencia?.value.trim() || !habilidades?.value.trim() || !educacion?.value.trim() || !fotoOk) return false;
      }

      if (svc === 'cv_web') {
        const bio = fs.querySelector('#bio_web');
        if (!bio?.value.trim()) return false;
      }

      if (svc === 'cv_clasico') {
        const sobreMi   = (fs.querySelector('#sobre_mi_clasico')?.value || '').trim();
        const exp       = (fs.querySelector('#experiencia_clasico')?.value || '').trim();
        const educacion = (fs.querySelector('#educacion_clasico')?.value || '').trim();
        const fotoOk    = Array.from(fs.querySelectorAll('input[name="usarFoto"]')).some(r => r.checked);
        if (!sobreMi || !exp || !educacion || !fotoOk) return false;
      }

      return true;
    }

    function validateStep1AndToggle(){
      if (toStep2) toStep2.disabled = !validateStep1();
    }

    function validateFinal(){
      const nombre = Utils.qs('#nombre_final', wizard);
      const email  = Utils.qs('#email', wizard);
      const ok = Boolean(nombre && nombre.value.trim().length > 1 && email && email.value.trim() && email.checkValidity() && consent?.checked);
      if (!ok && typeof wizard.querySelector('#pedidoForm')?.reportValidity === 'function')
        wizard.querySelector('#pedidoForm').reportValidity();
      if (!consent?.checked){ alert('Debés aceptar los Términos y Condiciones.'); return false; }
      return ok;
    }

    function pruneUnselectedFields(form, activeFs) {
      const GLOBAL_OK = new Set(['servicio','estilo_elegido','nombre','email','whatsapp','consentimiento','_formStart','fileName','fileData']);
      Utils.qsa('input[name], textarea[name], select[name]', form).forEach(el => {
        const type = (el.type || '').toLowerCase();
        const nm   = el.name || "";
        if (nm.startsWith('_') && nm !== '_formStart') { el.removeAttribute('name'); return; }     // sólo meta _formStart
        if (GLOBAL_OK.has(nm)) return;
        if (type === 'file') return;
        if (activeFs && activeFs.contains(el)) return;
        el.removeAttribute('name');
      });
    }

    function wireNav() {
      // Radios de servicio
      radiosServicio.forEach(r=>{
        Utils.on(r, "change", ()=>{
          clearStyleSelection();
          hideAllContent();
          renderStyleOptions(r.value);
          validateStep1AndToggle();
          stylePicker?.scrollIntoView({ behavior:"smooth", block:"start" });
        });
      });

      // Inputs que disparan validación Paso 1
      [
        '#headline_redes','#experiencia_redes','#habilidades_redes','#educacion_redes',
        '#bio_web','#proyectos_web','#links_web','#paleta_web',
        '#sobre_mi_clasico','#experiencia_clasico','#educacion_clasico',
        'textarea[id^="mensaje_"]'
      ].forEach(sel => {
        const el = Utils.qs(sel, wizard);
        if (el) Utils.on(el, "input", validateStep1AndToggle);
      });

      // ¿Querés foto? (obligatorio)
      Utils.qsa('input[name="usarFoto"]', wizard).forEach(r => Utils.on(r, "change", validateStep1AndToggle));

      // Botones
      Utils.on(toStep2, "click", () => {
        if (!validateStep1()) {
          const svc = getService();
          const msg = (svc === 'cv_redes')
            ? 'Completá Titular, Experiencia (bullets), Habilidades (3–5 bullets), Educación (bullets) y “¿Querés foto en el CV?” para continuar.'
            : (svc === 'cv_clasico')
              ? 'Completá Sobre mí, Experiencia laboral, Educación y “¿Querés foto en el CV?” para continuar.'
              : 'Completá los campos obligatorios del paso 1 para continuar.';
          alert(msg); return;
        }
        showStep(2);
        Utils.qs('#nombre_final', wizard)?.focus();
      });
      Utils.on(backTo1, "click", () => showStep(1));

      // Habilitar submit en paso 2
      const checkRequiredStep2 = () => {
        const nombre = Utils.qs('#nombre_final', wizard);
        const email  = Utils.qs('#email', wizard);
        const ready = Boolean(nombre && nombre.value.trim().length>1 && email && email.value.trim() && email.checkValidity() && consent?.checked);
        if (submitBtn) submitBtn.disabled = !ready;
      };
      Utils.on(Utils.qs('#nombre_final', wizard), "input", checkRequiredStep2);
      Utils.on(Utils.qs('#email', wizard),        "input", checkRequiredStep2);
      Utils.on(consent, "change", checkRequiredStep2);
      checkRequiredStep2();

      // Submit: poda + normalización (texto)
      Utils.on(form, "submit", (e) => {
        if (!validateFinal()) { e.preventDefault(); return; }
        const activeFs = Utils.qs('.svc-fields:not(.hidden)', wizard);

        // Validación de archivo si existiera (por si se saltó algo)
        const filledInput = Utils.qsa('input[type="file"]', form).find(inp => inp.files && inp.files.length);
        if (filledInput) {
          const f = filledInput.files[0];
          const ext = (f.name.split('.').pop()||'').toLowerCase();
          if (!['pdf','doc','docx'].includes(ext)) { e.preventDefault(); alert('El CV debe ser PDF, DOC o DOCX.'); return; }
          if (f.size > 5*1024*1024)                { e.preventDefault(); alert('El CV supera los 5 MB. Subí un archivo más liviano.'); return; }
        }

        pruneUnselectedFields(form, activeFs);

        const EXAMPLES = new Set(['titular','extracto','3–5 logros clave','habilidades / especialidades','no tengo','foto']);
        Utils.qsa('input[name], textarea[name], select[name]', form).forEach(el => {
          const type = (el.type || '').toLowerCase();
          if (['file','radio','checkbox','hidden'].includes(type)) return;
          if (el.name && el.name.startsWith('_')) return;
          let val = (el.value || '').trim();
          if (val === '' || EXAMPLES.has(val.toLowerCase())) { el.removeAttribute('name'); return; }
          el.value = val.replace(/\s+/g, ' ').trim();
        });
      });
    }

    function cacheRefs(){
      wizard       = Utils.qs('#pedido-wizard');
      if (!wizard) return false;
      form         = Utils.qs('#pedidoForm', wizard);
      if (!form)   return false;

      progressFill  = Utils.qs('#progressFill', wizard);
      progressLabel = Utils.qs('#progressLabel', wizard);
      dots          = [Utils.qs('#dot1', wizard), Utils.qs('#dot2', wizard)].filter(Boolean);

      step1   = Utils.qs('[data-step="1"]', wizard);
      step2   = Utils.qs('[data-step="2"]', wizard);
      toStep2 = Utils.qs('#toStep2', wizard);
      backTo1 = Utils.qs('#backTo1', wizard);
      submitBtn = Utils.qs('#submitBtn', wizard);
      consent   = Utils.qs('#consentDatos', wizard);

      radiosServicio = Utils.qsa('input[name="servicio"]', wizard);
      svcGroups      = Utils.qsa('.svc-fields', wizard);

      stylePicker = Utils.qs('#stylePicker', wizard);
      styleGrid   = Utils.qs('#styleGrid', wizard);
      estiloCard  = Utils.qs('#estiloCard', wizard);

      return true;
    }

    function init(){
      if (!cacheRefs()) return;
      // Timestamp informativo ISO
      const startHidden = Utils.qs('#formStart', wizard);
      if (startHidden) startHidden.value = new Date().toISOString();

      showStep(1);
      if (toStep2) toStep2.disabled = true;
      stylePicker?.classList.add('hidden');
      hideAllContent();
      renderStyleOptions(null);
      wireNav();
    }

    // Exponer lo justo para FileUI
    return { init, validateStep1AndToggle, setFieldsetActive, getActiveFs };
  })();


  // =============================== [F] FileUI ===============================
  const FileUI = (() => {
    function showFilePill(fileInput, file) {
      const pillId = fileInput.id.replace(/^cvfile_/, 'filePill_');
      const errId  = fileInput.id.replace(/^cvfile_/, 'fileError_');
      const pill   = document.getElementById(pillId);
      const err    = document.getElementById(errId);
      if (err) err.textContent = '';
      if (!pill) return;

      pill.hidden = false;
      pill.style.color = '#1e7e34';
      pill.innerHTML = `✅ <strong>${file.name}</strong> (${(file.size/1024/1024).toFixed(2)} MB)
                        <button type="button" class="removeFile" aria-label="Eliminar archivo" style="margin-left:.5rem">✕</button>`;

      pill.querySelector('.removeFile')?.addEventListener('click', () => {
        try { fileInput.value = ''; } catch {}
        pill.hidden = true;
        pill.innerHTML = '';
        Wizard.validateStep1AndToggle?.();
      });
    }

    function validateAssignAndShow(fileInput) {
      const file = fileInput.files?.[0];
      const errId = fileInput.id.replace(/^cvfile_/, 'fileError_');
      const errEl = document.getElementById(errId);
      const setErr = (msg) => { if (errEl) errEl.textContent = msg || ''; };

      if (!file) { setErr(''); return; }
      const ext = (file.name.split('.').pop()||'').toLowerCase();
      if (!['pdf','doc','docx'].includes(ext)) { setErr('Formato no válido. Subí PDF, DOC o DOCX.'); try { fileInput.value=''; } catch{} return; }
      if (file.size > 5*1024*1024)            { setErr('El archivo supera los 5 MB.');              try { fileInput.value=''; } catch{} return; }

      setErr('');
      showFilePill(fileInput, file);
      Wizard.validateStep1AndToggle?.();
    }

    // Dropzone/file binding para un FS específico (idempotente)
    function bindDropzone(fs) {
      if (!fs) return;
      const dropzone  = fs.querySelector('div[id^="dropzone_"]');
      const fileInput = fs.querySelector('input[id^="cvfile_"]');
      const fileError = fs.querySelector('div[id^="fileError_"]');
      if (!dropzone || !fileInput) return;

      fileInput.disabled = false;

      if (!dropzone.dataset.bound) {
        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
        dropzone.addEventListener('drop', e => {
          e.preventDefault(); dropzone.classList.remove('dragover');
          const f = e.dataTransfer?.files?.[0];
          if (!f) return;
          const okType = /(pdf|doc|docx)$/i.test((f.name.split('.').pop()||''));
          const okSize = f.size <= 5*1024*1024;
          fileError && (fileError.textContent = (!okType ? 'Formato no válido. ' : '') + (!okSize ? 'El archivo supera 5 MB.' : ''));
          if (okType && okSize) {
            try { const dt = new DataTransfer(); dt.items.add(f); fileInput.files = dt.files; } catch {}
            showFilePill(fileInput, f);
            Wizard.validateStep1AndToggle?.();
          }
        });
        dropzone.dataset.bound = '1';
      }

      if (!fileInput.dataset.bound) {
        fileInput.addEventListener('change', () => validateAssignAndShow(fileInput));
        fileInput.dataset.bound = '1';
      }
    }

    // Listeners globales para cualquier input/drag&drop que aparezca
    function wireGlobal() {
      document.querySelectorAll('input[type="file"][id^="cvfile_"]').forEach(inp => {
        inp.addEventListener('change', () => validateAssignAndShow(inp), { once:false });
      });

      document.addEventListener('change', (e) => {
        const t = e.target;
        if (t && t.matches && t.matches('input[type="file"][id^="cvfile_"]')) {
          validateAssignAndShow(t);
        }
      });

      document.addEventListener('drop', (e) => {
        const dz = e.target.closest && e.target.closest('div[id^="dropzone_"]');
        if (!dz) return;
        e.preventDefault();
        dz.classList.remove('dragover');
        const fileInput = dz.querySelector('input[type="file"][id^="cvfile_"]');
        const file = e.dataTransfer?.files?.[0];
        if (fileInput && file) {
          try { const dt = new DataTransfer(); dt.items.add(file); fileInput.files = dt.files; } catch {}
          validateAssignAndShow(fileInput);
        }
      });
      document.addEventListener('dragover', (e) => {
        const dz = e.target.closest && e.target.closest('div[id^="dropzone_"]');
        if (dz) { e.preventDefault(); dz.classList.add('dragover'); }
      });
      document.addEventListener('dragleave', (e) => {
        const dz = e.target.closest && e.target.closest('div[id^="dropzone_"]');
        if (dz) dz.classList.remove('dragover');
      });
    }

    function init(){ wireGlobal(); }

    return { init, bindDropzone, showFilePill };
  })();


  // ============================= [G] FileBase64 ============================
  const FileBase64 = (() => {
    function getActiveFileInput() {
      const candidates = [
        document.getElementById('cvfile_clasico'),
        document.getElementById('cvfile_redes'),
        document.getElementById('cvfile_web')
      ].filter(Boolean);
      for (const inp of candidates) {
        const fs = inp.closest('.svc-fields');
        const visible = fs && !fs.classList.contains('hidden');
        if (visible && inp.files && inp.files.length) return inp;
      }
      return null;
    }

    function validateFile(file) {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!['pdf','doc','docx'].includes(ext)) return 'El CV debe ser PDF, DOC o DOCX.';
      if (file.size > 5 * 1024 * 1024)        return 'El CV supera los 5 MB. Subí un archivo más liviano.';
      return '';
    }

    function init(){
      const form = document.getElementById('pedidoForm');
      if (!form) return;

      const fName = document.getElementById('fileName');
      const fData = document.getElementById('fileData');
      const statusEl = document.getElementById('formStatus');
      const submitBtn = document.getElementById('submitBtn');

      form.addEventListener('submit', (e) => {
        const active = getActiveFileInput();
        if (!active) {
          if (fName) fName.value = '';
          if (fData) fData.value = '';
          form.setAttribute('enctype','application/x-www-form-urlencoded');
          return;
        }

        const file = active.files[0];
        const err = validateFile(file);
        if (err) {
          e.preventDefault();
          if (statusEl) statusEl.textContent = '⚠️ ' + err; else alert(err);
          return;
        }

        e.preventDefault();
        submitBtn && (submitBtn.disabled = true);
        statusEl && (statusEl.textContent = `⏳ Subiendo ${file.name}...`);

        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const dataUrl = String(ev.target.result || '');
            const ix = dataUrl.indexOf(',');
            if (ix < 0) throw new Error('DataURL inválido');
            const base64 = dataUrl.slice(ix + 1);
            if (fName) fName.value = file.name;
            if (fData) fData.value = base64;
            form.setAttribute('enctype','application/x-www-form-urlencoded');
            form.submit();
          } catch (error) {
            statusEl && (statusEl.textContent = '❌ Error al preparar el archivo: ' + error.message);
            submitBtn && (submitBtn.disabled = false);
          }
        };
        reader.onerror = () => {
          statusEl && (statusEl.textContent = '❌ Error al leer el archivo.');
          submitBtn && (submitBtn.disabled = false);
        };
        reader.readAsDataURL(file);
      });
    }

    return { init };
  })();


  // ============================= [H] Bootstrap =============================
  (function initAll() {
    Slider.init();
    FormBasic.init();
    Fullscreen.init();
    Wizard.init();
    FileUI.init();
    FileBase64.init();
  })();

});