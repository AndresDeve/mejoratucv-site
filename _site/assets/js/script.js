// assets/js/script.js
document.addEventListener("DOMContentLoaded", () => {

  // =========================================================
  // 1) SLIDER / CARRUSEL
  // ---------------------------------------------------------
  // attachSlider(id): Conecta botones y scroll del carrusel
  // Dónde tocar:
  //   - IDs de sliders en el HTML: "gallery-impresion", "gallery-digital"
  //   - Velocidad/Distancia de scroll: usar pageW()
  // =========================================================
  function attachSlider(id) {
    const root  = document.getElementById(id);
    if (!root) return;
    const track = root.querySelector(".slides");
    const next  = root.querySelector(".slider-btn.next");
    const prev  = root.querySelector(".slider-btn.prev");
    if (!track) return;

    const pageW = () => track.clientWidth;

    next?.addEventListener("click", () => {
      track.scrollBy({ left: pageW(), behavior: "smooth" });
    });
    prev?.addEventListener("click", () => {
      track.scrollBy({ left: -pageW(), behavior: "smooth" });
    });
  }

  // Invocación sliders
  attachSlider("gallery-impresion");
  attachSlider("gallery-digital");


  // =========================================================
  // 2) FORM BÁSICO (HONEYPOT + TIMESTAMP + VALIDACIÓN CV)
  // ---------------------------------------------------------
  // Qué hace:
  //   - Crea input honeypot si falta
  //   - Crea input oculto con timestamp de inicio
  //   - Valida archivo adjunto (si el usuario sube uno)
  // Dónde tocar:
  //   - Tamaño máximo archivo (5 MB)
  //   - Extensiones permitidas
  //   - Mensajes de alert()
  // =========================================================
  const formEl = document.getElementById("pedidoForm");
  if (formEl) {
    // Honeypot (anti-spam)
    let honey = formEl.querySelector('input[name="_honey"]');
    if (!honey) {
      honey = document.createElement("input");
      honey.type = "text";
      honey.name = "_honey";
      honey.tabIndex = -1;
      honey.autocomplete = "off";
      honey.setAttribute("aria-hidden", "true");
      Object.assign(honey.style, {
        position: "absolute", left: "-10000px", top: "auto",
        width: "1px", height: "1px", overflow: "hidden"
      });
      formEl.appendChild(honey);
    }

    // Timestamp oculto
    let startEl = formEl.querySelector("#formStart");
    if (!startEl) {
      startEl = document.createElement("input");
      startEl.type = "hidden";
      startEl.id   = "formStart";
      startEl.name = "_formStart";
      formEl.appendChild(startEl);
    }
    const start = Date.now();
    startEl.value = String(start);

    // Validación archivo CV (opcional)
    const cvEl = document.getElementById("cvfile");

    // Validación archivo CV (opcional)
formEl.addEventListener("submit", (e) => {
  // Gate anti-bot por tiempo
  if (Date.now() - start < 1000) {
    e.preventDefault();
    alert("Por favor revisá tus datos y volvé a intentar.");
    return;
  }
  // Honeypot
  if (honey && honey.value.trim() !== "") {
    e.preventDefault();
    alert("Error: detección anti-spam. Por favor enviá nuevamente.");
    return;
  }

  // Archivo (sólo el activo tendrá name="attachment")
const cvInput = document.querySelector('.svc-fields:not(.hidden) input[type="file"][id^="cvfile_"]');
const file = cvInput?.files?.[0] || null;

  if (file) {
    const maxPerFile = 5 * 1024 * 1024; // 5MB
    if (!/\.(pdf|docx?)$/i.test(file.name)) {
      e.preventDefault();
      alert("El CV debe ser PDF, DOC o DOCX.");
      return;
    }
    if (file.size > maxPerFile) {
      e.preventDefault();
      alert("El CV supera los 5 MB. Subí un archivo más liviano.");
      return;
    }
  }
});
  }


  // =========================================================
  // 3) FULLSCREEN (REEMPLAZA LIGHTBOX)
  // ---------------------------------------------------------
  // attachFullscreen(galleryId): pantalla completa por galería
  // Qué hace:
  //   - Entra/sale de fullscreen
  //   - Mantiene índice de slide activa
  //   - Navega con teclado (← → Esc)
  // Dónde tocar:
  //   - IDs de galerías
  //   - Clases CSS para .is-focused
  // =========================================================
  function attachFullscreen(galleryId) {
    const gallery = document.getElementById(galleryId);
    if (!gallery) { console.warn("[fullscreen] No se encontró #"+galleryId); return; }

    const imgs   = Array.from(gallery.querySelectorAll(".slide img"));
    const slides = Array.from(gallery.querySelectorAll(".slide"));
    const track  = gallery.querySelector(".slides");
    if (!track || !imgs.length) return;

    // Helpers Fullscreen
    const enterFS   = (el) => el.requestFullscreen?.() || el.webkitRequestFullscreen?.() || el.msRequestFullscreen?.();
    const exitFS    = () => document.exitFullscreen?.() || document.webkitExitFullscreen?.() || document.msExitFullscreen?.();
    const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;

    // Botón salir (único)
    let exitBtn = document.getElementById("fs-exit-btn");
    if (!exitBtn) {
      exitBtn = document.createElement("button");
      exitBtn.id = "fs-exit-btn";
      exitBtn.type = "button";
      exitBtn.textContent = "Salir de pantalla completa";
      exitBtn.setAttribute("aria-label", "Salir de pantalla completa");
      exitBtn.style.display = "none";
      document.body.appendChild(exitBtn);
    }

    // Estado por galería
    let idx = -1;

    // ---- utilidades internas
    function focusSlideByIndex(i) {
      slides.forEach(s => s.classList.remove("is-focused"));
      if (slides[i]) slides[i].classList.add("is-focused");
    }
    function scrollTrackToIndex(i) {
      if (!track || !slides[i]) return;
      const slide = slides[i];
      const left  = slide.offsetLeft - (track.clientWidth - slide.clientWidth) / 2;
      track.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    }
    function openFull(i) {
      if (i < 0 || i >= imgs.length) return;
      idx = i;
      focusSlideByIndex(idx);
      enterFS(gallery);
    }
    function closeFull() {
      exitBtn.style.display = "none";
      exitFS();
    }
    function showNext(dir) {
      if (idx < 0) return;
      idx += (dir > 0 ? 1 : -1);
      if (idx >= imgs.length) idx = 0;
      if (idx < 0) idx = imgs.length - 1;
      focusSlideByIndex(idx);
    }

    // Activar imágenes
    imgs.forEach((img, i) => {
      if (!img.hasAttribute("tabindex")) img.setAttribute("tabindex", "0");
      if (!img.hasAttribute("role"))     img.setAttribute("role", "button");
      img.style.cursor = "zoom-in";
      img.addEventListener("click",   () => openFull(i));
      img.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openFull(i); }
      });
    });

    // Teclado en FS
    document.addEventListener("keydown", (e) => {
      if (fsElement() !== gallery) return;
      if (e.key === "Escape")      { e.preventDefault(); closeFull(); }
      else if (e.key === "ArrowRight") showNext(1);
      else if (e.key === "ArrowLeft")  showNext(-1);
    });

    // Botón salida
    exitBtn.addEventListener("click", closeFull);

    // Click sobre la galería en FS → salir
    gallery.addEventListener("click", (e) => {
      const inFS = fsElement() === gallery;
      if (inFS) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        closeFull();
      }
    }, true);

    // Entrada/Salida de FS
    function onFSChange() {
      if (fsElement() === gallery) {
        document.body.classList.add("fs-open");
        exitBtn.style.display = "block";
        exitBtn.focus();
        focusSlideByIndex(idx);
      } else {
        if (idx >= 0) {
          slides.forEach(s => s.classList.remove("is-focused"));
          slides[idx].classList.add("is-focused");
          requestAnimationFrame(() => setTimeout(() => scrollTrackToIndex(idx), 0));
        }
        document.body.classList.remove("fs-open");
        exitBtn.style.display = "none";
      }
    }
    document.addEventListener("fullscreenchange", onFSChange);
    document.addEventListener("webkitfullscreenchange", onFSChange);
    document.addEventListener("MSFullscreenChange", onFSChange);
  }

  // Invocación fullscreen por galería
  attachFullscreen("gallery-impresion");
  attachFullscreen("gallery-digital");


// === WIZARD 2 PASOS (Servicio+Estilo+Contenido → Datos) ===
(function () {
  const wizard = document.getElementById('pedido-wizard');
  if (!wizard) return;

  const form = wizard.querySelector('#pedidoForm');
  if (!form) return;

  // Progreso / dots (2 pasos)
  const progressFill  = wizard.querySelector('#progressFill');
  const progressLabel = wizard.querySelector('#progressLabel');
  const dots = [
    wizard.querySelector('#dot1'),
    wizard.querySelector('#dot2')
  ].filter(Boolean);

  // Secciones
  const step1 = wizard.querySelector('[data-step="1"]');
  const step2 = wizard.querySelector('[data-step="2"]');

  // Botones
  const toStep2   = wizard.querySelector('#toStep2');
  const backTo1   = wizard.querySelector('#backTo1');
  const submitBtn = wizard.querySelector('#submitBtn');
  const consent   = wizard.querySelector('#consentDatos');

  // Servicio y fieldsets
  const radiosServicio = wizard.querySelectorAll('input[name="servicio"]');
  const svcGroups = Array.from(wizard.querySelectorAll('.svc-fields'));

  // Picker de estilos
  const stylePicker = wizard.querySelector('#stylePicker');
  const styleGrid   = wizard.querySelector('#styleGrid');
  const estiloCard  = wizard.querySelector('#estiloCard');

  // Opciones por servicio
  const STYLE_MAP = {
    cv_clasico: [
      { value: 'moderno',       caption: 'Moderno',             img: 'assets/CV_Maradona.png' },
      { value: 'minimalista',   caption: 'Minimalista/Sobrio',  img: 'assets/CV_favaloro.png' },
      { value: 'academico',     caption: 'Académico',           img: 'assets/CV_Houssay.png' },
      { value: 'personalizado', caption: 'Personalizado',       img: 'assets/CV_sparrow.png' }
    ],
    cv_redes: [
      { value: 'minimalista',   caption: 'Minimalista/Sobrio',  img: 'assets/CV_Digital_Maradona.png' },
      { value: 'moderno',       caption: 'Moderno',             img: 'assets/CV_charly_digital.png' }
    ],
    cv_web: [
      { value: 'personalizable', caption: 'Personalizable',     img: 'assets/CV_Web_Maradona_preview.png' }
    ]
  };

  function setProgress(step){
    if (!progressFill || !progressLabel) return;
    progressFill.style.width = step === 1 ? '50%' : '100%';
    if (dots.length) dots.forEach((d,i)=> d.classList.toggle('active', i < step));
    progressLabel.textContent = (step === 1)
      ? 'Paso 1 de 2 — Servicio, estilo y contenido'
      : 'Paso 2 de 2 — Datos personales y envío';
  }

  function showStep(n){
    [step1,step2].forEach((s,i)=> s?.classList.toggle('hidden', (i+1)!==n));
    setProgress(n);
  }

  // Helpers
  function getService(){
    const r = wizard.querySelector('input[name="servicio"]:checked');
    return r?.value || null;
  }
  function clearStyleSelection() {
    if (estiloCard) estiloCard.value = '';
    if (!styleGrid) return;
    const checked = styleGrid.querySelector('input[type="radio"]:checked');
    if (checked) checked.checked = false;
  }

  // Activar un único fieldset + un único attachment
function setFieldsetActive(fs, active){
  if (!fs) return;
  const fields = fs.querySelectorAll('input, textarea, select');

  if (active) {
    // Asegurá que no haya otros inputs file con name="attachment"
    document.querySelectorAll('input[type="file"][name="attachment"]').forEach(inp=>{
      if (!fs.contains(inp)) inp.removeAttribute('name');
    });
  }

  fields.forEach(el => {
    const type = (el.type || '').toLowerCase();

    // Manejo de required
    if (active) {
      if (el.dataset.required === 'true') {
        el.required = true;
        delete el.dataset.required;
      }
    } else {
      if (el.required) {
        el.dataset.required = 'true';
        el.required = false;
      }
    }

    if (active){
      if (!el.name && el.dataset.name) el.name = el.dataset.name;
      // No tocar inputs file (sin name para evitar multipart)
      el.disabled = false;
    } else {
      if (el.name) el.dataset.name = el.name;
      if (type !== 'file') el.removeAttribute('name');
      el.disabled = true;

      // 🚿 Extra: si es el grupo de "usarFoto" y ocultamos, desmarcamos
      if (type === 'radio' && el.matches('input[name="usarFoto"]')) {
        el.checked = false;
      }
    }
  });

  fs.classList.toggle('hidden', !active);
}

  function hideAllContent(){
    svcGroups.forEach(fs => setFieldsetActive(fs, false));
  }
  function getActiveFs() {
    return svcGroups.find(fs => !fs.classList.contains('hidden')) || null;
  }

  // Contador de mensaje
  function bindMessageCounter(fs) {
    if (!fs) return;
    const msg = fs.querySelector('textarea[id^="mensaje_"]');
    const counter = fs.querySelector('div[id^="msgCounter_"]');
    if (!msg || !counter) return;

    const clone = msg.cloneNode(true);
    msg.parentNode.replaceChild(clone, msg);
    const msgClean = fs.querySelector('textarea[id^="mensaje_"]');

    const updateCounter = () => { counter.textContent = `${msgClean.value.length}/800`; };
    msgClean.addEventListener('input', updateCounter);
    updateCounter();
  }

// Dropzone / file  — versión sin clonado (idempotente)
function bindDropzone(fs) {
  if (!fs) return;

  const dropzone  = fs.querySelector('div[id^="dropzone_"]');
  const fileInput = fs.querySelector('input[id^="cvfile_"]');
  const filePill  = fs.querySelector('div[id^="filePill_"]');
  const fileError = fs.querySelector('div[id^="fileError_"]');

  if (!dropzone || !fileInput) return;

  // No usar name en el file input (evita multipart)
fileInput.disabled = false;

  // Evitar listeners duplicados usando bandera
  if (!dropzone.dataset.bound) {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const f = e.dataTransfer?.files?.[0];
      if (f && validateFileForDz(f, fileError)) {
        try {
          const dt = new DataTransfer();
          dt.items.add(f);
          fileInput.files = dt.files;  // lista para el submit
        } catch {}
        showFilePill(fileInput, f);
        if (typeof validateStep1AndToggle === 'function') validateStep1AndToggle();
      }
    });
    dropzone.dataset.bound = '1';
  }

  if (!fileInput.dataset.bound) {
    fileInput.addEventListener('change', () => {
      const f = fileInput.files?.[0];
      if (f && validateFileForDz(f, fileError)) {
        showFilePill(fileInput, f);
        if (typeof validateStep1AndToggle === 'function') validateStep1AndToggle();
      }
    });
    fileInput.dataset.bound = '1';
  }

  function validateFileForDz(f, errEl) {
    if (errEl) errEl.textContent = '';
    const okType = /(pdf|doc|docx)$/i.test((f.name.split('.').pop()||''));
    if (!okType){ if (errEl) errEl.textContent = 'Formato no válido. Subí PDF, DOC o DOCX.'; return false; }
    if (f.size > 5*1024*1024){ if (errEl) errEl.textContent = 'El archivo supera 5 MB.'; return false; }
    return true;
  }
}

  // Render de estilos
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
      const card = document.createElement('label');
      card.className = 'style-card';
      card.setAttribute('for', id);
      card.innerHTML = `
        <input type="radio" id="${id}" name="estilo_card" value="${opt.value}" required>
        <img src="${opt.img}" alt="${opt.caption}">
        <div class="style-caption">
          <span>${opt.caption}</span>
        </div>
      `;
      card.addEventListener('change', () => {
        const r = card.querySelector('input[type="radio"]');
        if (r && r.checked && estiloCard) {
          estiloCard.value = opt.value;
          const svc = getService();
          hideAllContent();
          if (svc){
            const fs = svcGroups.find(x => x.getAttribute('data-for') === svc);
            setFieldsetActive(fs, true);
            bindMessageCounter(fs);
            bindDropzone(fs);
            const commonBlock = fs.querySelector('.contenido-comun');
            if (commonBlock) commonBlock.classList.remove('hidden');
            fs?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          validateStep1AndToggle();
        }
      });
      styleGrid.appendChild(card);
    });
  }

  // Timestamp inicial (informativo)
  const start = wizard.querySelector('#formStart');
  if (start) start.value = new Date().toISOString();

  // Paso 1: validación mínima (servicio + estilo + obligatorios del FS activo)
function validateStep1(){
  const svc = getService();
  const estiloElegido = estiloCard?.value;
  if (!svc || !estiloElegido) return false;

  const fs = getActiveFs();
  if (!fs) return false;

  if (svc === 'cv_redes') {
  const titular     = fs.querySelector('#headline_redes');
  const experiencia = fs.querySelector('#experiencia_redes');
  const habilidades = fs.querySelector('#habilidades_redes');
  const educacion   = fs.querySelector('#educacion_redes');
  const fotoOk      = Array.from(fs.querySelectorAll('input[name="usarFoto"]')).some(r => r.checked);

  if (
    !titular || !titular.value.trim() ||
    !experiencia || !experiencia.value.trim() ||
    !habilidades || !habilidades.value.trim() ||
    !educacion || !educacion.value.trim() ||
    !fotoOk
  ) {
    return false;
  }
}

  if (svc === 'cv_web'){
    const bio = fs.querySelector('#bio_web');
    if (!bio || !bio.value.trim()) return false;
  }

  if (svc === 'cv_clasico'){
    const sobreMi   = (fs.querySelector('#sobre_mi_clasico')?.value || '').trim();
    const exp       = (fs.querySelector('#experiencia_clasico')?.value || '').trim();
    const educacion = (fs.querySelector('#educacion_clasico')?.value || '').trim();
    const fotoOk    = Array.from(fs.querySelectorAll('input[name="usarFoto"]')).some(r => r.checked);
    if (!sobreMi || !exp || !educacion || !fotoOk) return false;
  }

  return true;
}

function validateStep1AndToggle(){
  const ok = validateStep1();
  if (toStep2) toStep2.disabled = !ok;
}

  // Paso 2: validación final
function validateFinal(){
  const nombre = wizard.querySelector('#nombre_final');
  const email  = wizard.querySelector('#email');

  const ok = Boolean(
    nombre && nombre.value.trim().length > 1 &&
    email  && email.value.trim() && email.checkValidity() &&
    consent?.checked
  );

  if (!ok && typeof form.reportValidity === 'function') form.reportValidity();
  if (!consent?.checked){ alert('Debés aceptar los Términos y Condiciones.'); return false; }
  return ok;
}
// Habilita "Enviar" solo si nombre + email válidos + consentimiento
function checkRequiredStep2(){
  const nombre = wizard.querySelector('#nombre_final');
  const email  = wizard.querySelector('#email');
  const ready = Boolean(
    nombre && nombre.value.trim().length > 1 &&
    email  && email.value.trim() && email.checkValidity() &&
    consent?.checked
  );
  if (submitBtn) submitBtn.disabled = !ready;
}

// Escuchas en los campos obligatorios
wizard.querySelector('#nombre_final')?.addEventListener('input', checkRequiredStep2);
wizard.querySelector('#email')?.addEventListener('input', checkRequiredStep2);
consent?.addEventListener('change', checkRequiredStep2);

// Estado inicial
checkRequiredStep2();

  // Eventos de navegación
  radiosServicio.forEach(r=>{
    r.addEventListener('change', ()=>{
      clearStyleSelection();
      hideAllContent();
      renderStyleOptions(r.value);
      validateStep1AndToggle();
      stylePicker?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

[
  // Redes (obligatorios nuevos)
  '#headline_redes',
  '#experiencia_redes',
  '#habilidades_redes',
  '#educacion_redes',
  // Web
  '#bio_web','#proyectos_web','#links_web','#paleta_web',
  // Clásico
  '#sobre_mi_clasico','#experiencia_clasico','#educacion_clasico',
  // Mensajes genéricos
  'textarea[id^="mensaje_"]'
].forEach(sel=>{
  const el = wizard.querySelector(sel);
  if (el) el.addEventListener('input', validateStep1AndToggle);
});

// También escuchar la elección de “¿Querés foto en el CV?” (obligatoria)
wizard.querySelectorAll('input[name="usarFoto"]').forEach(r=>{
  r.addEventListener('change', validateStep1AndToggle);
});

toStep2?.addEventListener('click', ()=>{
  if (!validateStep1()){
    const svc = getService();
    const msg = (svc === 'cv_redes')
      ? 'Completá Titular, Experiencia (bullets), Habilidades (3–5 bullets), Educación (bullets) y “¿Querés foto en el CV?” para continuar.'
      : (svc === 'cv_clasico')
        ? 'Completá Sobre mí, Experiencia laboral, Educación y “¿Querés foto en el CV?” para continuar.'
        : 'Completá los campos obligatorios del paso 1 para continuar.';
    alert(msg);
    return;
  }
  showStep(2);
  wizard.querySelector('#nombre_final')?.focus();
});

backTo1?.addEventListener('click', ()=> showStep(1));

// Poda final (activo + globales). NO toca inputs file ni los hidden Base64.
function pruneUnselectedFields(form, activeFs) {
  const GLOBAL_OK = new Set([
    'servicio',
    'estilo_elegido',
    'nombre',
    'email',
    'whatsapp',
    'consentimiento',
    '_formStart',
    // Conservamos los hidden del adjunto en Base64:
    'fileName',
    'fileData'
  ]);

  const all = form.querySelectorAll('input[name], textarea[name], select[name]');
  all.forEach(el => {
    const type = (el.type || '').toLowerCase();
    const nm   = el.name;

    // Permitimos meta solo _formStart
    if (nm.startsWith('_') && nm !== '_formStart') {
      el.removeAttribute('name');
      return;
    }

    // Conservamos globales siempre
    if (GLOBAL_OK.has(nm)) return;

    // No eliminar ni modificar inputs file (no viajan por name igualmente)
    if (type === 'file') return;

    // Si el campo pertenece al FS activo, lo conservamos
    if (activeFs && activeFs.contains(el)) return;

    // En cualquier otro caso, se poda
    el.removeAttribute('name');
  });
}

  // Envío final
  const EXAMPLES = new Set([
    'titular','extracto','3–5 logros clave','habilidades / especialidades',
    'no tengo','foto'
  ]);

  const DEBUG_FORM = false;

  if (DEBUG_FORM) {
    try {
      form.dataset._actionBackup = form.getAttribute('action') || '';
      form.setAttribute('action', 'javascript:void(0)');
    } catch {}
  }

  // ÚNICO listener de submit
form.addEventListener('submit', (e) => {
  const activeFs = document.querySelector('.svc-fields:not(.hidden)');

  if (!DEBUG_FORM && !validateFinal()) {
    e.preventDefault();
    return;
  }

  // Detectar el file con contenido aunque el FS esté oculto en Paso 2
  const filledFileInput = Array.from(form.querySelectorAll('input[type="file"]'))
    .find(inp => inp.files && inp.files.length > 0) || null;

  // Validación del archivo (si hay)
  if (filledFileInput) {
    const f = filledFileInput.files[0];
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!['pdf','doc','docx'].includes(ext)) {
      e.preventDefault();
      alert('El CV debe ser PDF, DOC o DOCX.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      e.preventDefault();
      alert('El CV supera los 5 MB. Subí un archivo más liviano.');
      return;
    }
  }

  // Poda y normalización (pasando el file con contenido)
  pruneUnselectedFields(form, activeFs);

  const els = form.querySelectorAll('input[name], textarea[name], select[name]');
  els.forEach(el => {
    const type = (el.type || '').toLowerCase();
    if (type === 'file' || type === 'radio' || type === 'checkbox') return;
    if (type === 'hidden') return;
    if (el.name && el.name.startsWith('_')) return;

    let val = (el.value || '').trim();
    if (val === '') { el.removeAttribute('name'); return; }
    if (EXAMPLES.has(val.toLowerCase())) { el.removeAttribute('name'); return; }
    el.value = val.replace(/\s+/g, ' ').trim();
  });

  if (DEBUG_FORM) {
    e.preventDefault();
    e.stopPropagation();
    const fd = new FormData(form);
    const summary = {};
    for (const [k, v] of fd.entries()) {
      summary[k] = (v instanceof File) ? (v.name ? { filename: v.name, size: v.size } : null) : v;
    }
    console.group('[DEBUG_FORM] Payload final a enviar');
    console.table(summary);
    console.log('Adjunto único:', summary.attachment || null);
    console.groupEnd();
    alert('DEBUG activo: el formulario NO se envió. Revisá la consola para ver el payload.');
  } else {
    if (!validateFinal()) {
      e.preventDefault();
      return;
    }
  }
});

  // Init
  showStep(1);
  if (toStep2) toStep2.disabled = true;
  stylePicker?.classList.add('hidden');
  hideAllContent();
  renderStyleOptions(null);
  wireGlobalFileListeners();
  // === Helper robusto para mostrar nombre del archivo cargado ===
function showFilePill(fileInput, file) {
  // Deriva el id del "pill" a partir del id del input (cvfile_XYZ -> filePill_XYZ)
  const pillId = fileInput.id.replace(/^cvfile_/, 'filePill_');
  const errId  = fileInput.id.replace(/^cvfile_/, 'fileError_');
  const pill   = document.getElementById(pillId);
  const err    = document.getElementById(errId);

  // Limpia errores
  if (err) err.textContent = '';

  if (!pill) return;
  pill.hidden = false;
  pill.style.color = '#1e7e34';
  pill.innerHTML = `
    ✅ <strong>${file.name}</strong> (${(file.size/1024/1024).toFixed(2)} MB)
    <button type="button" class="removeFile" aria-label="Eliminar archivo" style="margin-left:.5rem">✕</button>
  `;

  const btn = pill.querySelector('.removeFile');
  btn?.addEventListener('click', () => {
    // borrar selección y ocultar pill
    try { fileInput.value = ''; } catch {}
    pill.hidden = true;
    pill.innerHTML = '';
    // si tenés la función, revalida el paso 1
    if (typeof validateStep1AndToggle === 'function') validateStep1AndToggle();
  });
}

// Valida extensión/tamaño y, si todo ok, muestra el pill y deja el file listo para submit
function validateAssignAndShow(fileInput) {
  const file = fileInput.files?.[0];
  const errId = fileInput.id.replace(/^cvfile_/, 'fileError_');
  const errEl = document.getElementById(errId);
  const setErr = (msg) => { if (errEl) errEl.textContent = msg || ''; };

  if (!file) { setErr(''); return; }

  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!['pdf','doc','docx'].includes(ext)) {
    setErr('Formato no válido. Subí PDF, DOC o DOCX.');
    try { fileInput.value = ''; } catch {}
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    setErr('El archivo supera los 5 MB.');
    try { fileInput.value = ''; } catch {}
    return;
  }

  setErr('');
  // Muestra el nombre/size como confirmación
  showFilePill(fileInput, file);
  if (typeof validateStep1AndToggle === 'function') validateStep1AndToggle();
}

// Listener global: captura cualquier cambio en inputs que empiecen con id="cvfile_"
function wireGlobalFileListeners() {
  // 1) Por si ya existen en el DOM (FS activo)
  document.querySelectorAll('input[type="file"][id^="cvfile_"]').forEach(inp => {
    // Evita listeners duplicados
    inp.addEventListener('change', () => validateAssignAndShow(inp), { once: false });
  });

  // 2) Delegación: si más adelante se clonan/insertan (cuando cambia el servicio/estilo)
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t && t.matches && t.matches('input[type="file"][id^="cvfile_"]')) {
      validateAssignAndShow(t);
    }
  });

  // 3) Drag & drop directo sobre cualquier .dropzone_* (asigna al input hermano)
  document.addEventListener('drop', (e) => {
    const dz = e.target.closest && e.target.closest('div[id^="dropzone_"]');
    if (!dz) return;
    e.preventDefault();
    dz.classList.remove('dragover');
    const fileInput = dz.querySelector('input[type="file"][id^="cvfile_"]');
    const file = e.dataTransfer?.files?.[0];
    if (fileInput && file) {
      try {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files; // deja el file listo para el submit
      } catch {}
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
})();
// === Subida Base64 integrada al form principal ===
(function () {
  const form = document.getElementById('pedidoForm');
  if (!form) return;

  const fName = document.getElementById('fileName');
  const fData = document.getElementById('fileData');
  const statusEl = document.getElementById('formStatus');
  const submitBtn = document.getElementById('submitBtn');

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
    if (!['pdf','doc','docx'].includes(ext)) {
      return 'El CV debe ser PDF, DOC o DOCX.';
    }
    if (file.size > 5 * 1024 * 1024) {
      return 'El CV supera los 5 MB. Subí un archivo más liviano.';
    }
    return '';
  }

  // Interceptamos el submit final (después de tus validaciones previas)
  form.addEventListener('submit', (e) => {
    // Si ya hay fileName/fileData cargados o no hay archivo, dejamos enviar tal cual
    const fileInput = getActiveFileInput();
    if (!fileInput) {
      // Limpieza defensiva de hidden si no hay archivo
      if (fName) fName.value = '';
      if (fData) fData.value = '';
      // Aseguramos urlencoded (por si el form venía con otro enctype)
      form.setAttribute('enctype', 'application/x-www-form-urlencoded');
      return;
    }

    // Hay archivo: convertir a Base64 primero
    const file = fileInput.files[0];
    const err = validateFile(file);
    if (err) {
      e.preventDefault();
      if (statusEl) statusEl.textContent = '⚠️ ' + err;
      else alert(err);
      return;
    }

    e.preventDefault();
    if (submitBtn) submitBtn.disabled = true;
    if (statusEl) statusEl.textContent = `⏳ Subiendo ${file.name}...`;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const dataUrl = String(ev.target.result || '');
        const ix = dataUrl.indexOf(',');
        if (ix < 0) throw new Error('DataURL inválido');
        const base64 = dataUrl.slice(ix + 1);

        if (fName) fName.value = file.name;
        if (fData) fData.value = base64;

        // Forzamos urlencoded (no multipart)
        form.setAttribute('enctype', 'application/x-www-form-urlencoded');

        // Envío real
        form.submit();
      } catch (error) {
        if (statusEl) statusEl.textContent = '❌ Error al preparar el archivo: ' + error.message;
        if (submitBtn) submitBtn.disabled = false;
      }
    };
    reader.onerror = () => {
      if (statusEl) statusEl.textContent = '❌ Error al leer el archivo.';
      if (submitBtn) submitBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  });
})();
});