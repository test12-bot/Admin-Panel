/* =========================================================
   HIGHWAY Admin Panel — لوحة الإدارة والعمليات
   الأساس: الدخول، تحضير الطلبات، لوحة الطلبات، تعيين الكباتن.
   الإضافات (الكباتن، التسويات، الإسناد التلقائي، الخرائط) في disp-v2.js
   ========================================================= */

const ICONS = {
  pin:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.4"/></svg>`
};


/* الشاشة السابقة لكل شاشة (زر الرجوع) */
const SCREEN_META = {
  'screen-dashboard':  { back:null },
  'screen-restaurants':{ back:'screen-dashboard' },
  'screen-order':      { back:'screen-restaurants' },
  'screen-confirm':    { back:'screen-dashboard' },
  'screen-profile':    { back:'screen-dashboard' },
  'screen-board':      { back:'screen-dashboard' },
  'screen-captains':   { back:'screen-dashboard' },
  'screen-success':    { back:null },
};

/* التبويب النشط لكل شاشة */
const TAB_OF = { 'screen-dashboard': 'home', 'screen-restaurants': 'home', 'screen-order': 'home', 'screen-confirm': 'home', 'screen-success': 'home', 'screen-board': 'board', 'screen-captains': 'caps', 'screen-profile': 'profile' };
let state = { pickup:{ name:"", isCustom:false, sid:'' } };
let currentScreen = 'screen-dashboard';

/* ---------- أيقونات الشاشة الافتتاحية (طعام) ---------- */


function buildSplashIcons() {
    const wrap = document.getElementById('splashIcons');
    const SPL = HWFood.splashSet();   // رسومات الطعام المشتركة (hw-food.js)
    for (let i = 0; i < 18; i++) {
        const el = document.createElement('div');
        el.className = 'float-icon';
        const size = 26 + Math.random() * 34;
        el.style.width = el.style.height = size + 'px';
        el.style.left = (Math.random() * 94) + '%';
        el.style.animationDuration = (9 + Math.random() * 9) + 's';
        el.style.animationDelay = (-Math.random() * 14) + 's';
        el.innerHTML = SPL[(i * 7) % SPL.length];
        wrap.appendChild(el);
    }
}

/* ---------- فيديو الشاشة الافتتاحية بخلفية شفافة ----------
   الفيديو بلا قناة شفافية، فيُعرض عبر WebGL مع حذف لونه التركوازي لحظياً ليظهر الإطار الزجاجي من خلفه.
   لضمان عدم اختفاء اللوجو نهائياً: ننتهي دائماً بصورة اللوجو الثابتة (بنفس مقاس آخر إطار) بدل الاعتماد
   على لوحة WebGL، وننتقل إليها فوراً إذا فشل أي شيء (منع التشغيل التلقائي، فقد سياق WebGL، تأخر الفيديو). */
function initIntroVideo() {
    const video = document.getElementById('splashVideo');
    const canvas = document.getElementById('splashCanvas');
    const card = document.getElementById('splashCard');
    if (!video || !canvas || !card) return null;

    let stopped = false;
    const showStatic = () => {                 // يعرض الصورة الثابتة ويوقف الرسم والفيديو
        stopped = true;
        card.classList.add('static-logo');
        video.pause();
    };

    let gl = null;
    try { gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true }); } catch (e) {}
    if (!gl) { showStatic(); return { stop() {} }; }
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); showStatic(); });

    const compile = (type, src) => {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src); gl.compileShader(sh);
        return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    };
    const vs = compile(gl.VERTEX_SHADER,
        'attribute vec2 p; varying vec2 uv;' +
        'void main(){ uv = vec2(p.x*0.5+0.5, 0.5-p.y*0.5); gl_Position = vec4(p,0.0,1.0); }');
    const fs = compile(gl.FRAGMENT_SHADER,
        'precision mediump float; uniform sampler2D tex; varying vec2 uv;' +
        'const vec3 BG = vec3(33.0,204.0,208.0)/255.0;' +            // لون خلفية الفيديو
        'void main(){' +
        '  vec3 c = texture2D(tex, uv).rgb;' +
        '  float a = clamp((distance(c, BG) - 0.035) / 0.80, 0.0, 1.0);' +
        '  vec3 f = a > 0.001 ? clamp((c - (1.0 - a) * BG) / a, 0.0, 1.0) : vec3(0.0);' +
        '  gl_FragColor = vec4(f * a, a);' +                          // ألوان مضروبة مسبقاً بالشفافية
        '}');
    const prog = gl.createProgram();
    if (!vs || !fs) { showStatic(); return { stop() {} }; }
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { showStatic(); return { stop() {} }; }
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const draw = () => {
        if (video.readyState < 2) return;
        try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video); }
        catch (e) { showStatic(); return; }
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    let finished = false;
    const canvasBlank = () => {                                   // هل الصف الأوسط من اللوحة فارغ؟
        if (gl.isContextLost()) return true;
        const row = new Uint8Array(canvas.width * 4);
        gl.readPixels(0, canvas.height >> 1, canvas.width, 1, gl.RGBA, gl.UNSIGNED_BYTE, row);
        for (let i = 3; i < row.length; i += 4) if (row[i] > 200) return false;
        return true;
    };
    const next = (fn) => (video.requestVideoFrameCallback ? video.requestVideoFrameCallback(fn) : requestAnimationFrame(fn));
    const loop = () => { if (!stopped) { draw(); next(loop); } };

    let began = false;
    const begin = () => { if (!began && !stopped) { began = true; next(loop); } };
    video.addEventListener('playing', begin);
    video.addEventListener('ended', () => { draw(); finished = true; card.classList.add('logo-done'); });   // النهاية: يبقى آخر إطار من الفيديو معروضاً
    // عند العودة للتطبيق: إن فُرغت لوحة الرسم بصمت نعرض الصورة الثابتة (مأخوذة من آخر إطار فلا يتغير شيء)
    document.addEventListener('visibilitychange', () => { if (!document.hidden && finished && !stopped && canvasBlank()) showStatic(); });
    video.addEventListener('error', showStatic);
    if (!video.paused && video.readyState >= 3) begin();       // بدأ التشغيل التلقائي قبل تسجيل المستمعين

    video.muted = true;                                          // مطلوب ليعمل التشغيل التلقائي
    const p = video.play();
    if (p && p.catch) p.catch(showStatic);                       // التشغيل التلقائي ممنوع (مثلاً توفير الطاقة)
    setTimeout(() => { if (!began) showStatic(); }, 2000);       // لم يبدأ الفيديو خلال ثانيتين
    setTimeout(() => { if (!stopped) showStatic(); }, 9000);     // شبكة أمان إن تجمّد الفيديو قبل نهايته

    return { stop() { stopped = true; video.pause(); } };
}

/* ---------- تسجيل الدخول ----------
   ملاحظة: الموقع ثابت (GitHub Pages) فالتحقق يتم داخل المتصفح. كلمات المرور محفوظة كبصمة SHA-256 وليست نصاً صريحاً،
   لكن هذا يمنع الدخول العابر فقط ولا يعتبر حماية حقيقية للبيانات. */
const USERS = [
    {"id": "admin", "names": ["admin"], "hash": "93dbdae2e2db0932575220b3ac8d594f2bc0f913d055129c50f97d69f060737f"},
];

const SESSION_KEY = 'hwd-user';   // مفتاح مستقل عن موقع المطاعم (نفس النطاق)
let currentUser = null;          // null = لا أحد، وغير ذلك سجل المستخدم من USERS

function normUser(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

/* SHA-256 (تعمل حتى إن لم يتوفر crypto.subtle) */
function sha256(str) {
    const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const bytes = Array.from(new TextEncoder().encode(str));
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 255);
    let h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < bytes.length; o += 64) {
        const w = new Array(64);
        for (let i = 0; i < 16; i++) w[i] = (bytes[o+i*4]<<24)|(bytes[o+i*4+1]<<16)|(bytes[o+i*4+2]<<8)|bytes[o+i*4+3];
        for (let i = 16; i < 64; i++) {
            const s0 = rotr(w[i-15],7) ^ rotr(w[i-15],18) ^ (w[i-15]>>>3);
            const s1 = rotr(w[i-2],17) ^ rotr(w[i-2],19) ^ (w[i-2]>>>10);
            w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
        }
        let [a,b,c,d,e,f,g,hh] = h;
        for (let i = 0; i < 64; i++) {
            const t1 = (hh + (rotr(e,6)^rotr(e,11)^rotr(e,25)) + ((e&f)^(~e&g)) + K[i] + w[i]) | 0;
            const t2 = ((rotr(a,2)^rotr(a,13)^rotr(a,22)) + ((a&b)^(a&c)^(b&c))) | 0;
            hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
        }
        h = [h[0]+a|0,h[1]+b|0,h[2]+c|0,h[3]+d|0,h[4]+e|0,h[5]+f|0,h[6]+g|0,h[7]+hh|0];
    }
    return h.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

/* أعضاء فريق العمليات (منسقون) تضيفهم الإدارة من "الإدارة ← الفريق" */
function staffUsers() {
    return HWDB.col('staff').list().filter(s => s.active !== false).map(s => ({ id: s.id, names: [normUser(s.user)], hash: s.hash, label: s.name, role: s.role || 'dispatcher' }));
}
function allUsers() { return USERS.concat(staffUsers()); }
function findUserByName(name) {
    const n = normUser(name);
    return n ? allUsers().find(u => u.names.includes(n)) || null : null;
}

function readSession() {
    let id = null;
    try { id = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY); } catch (e) {}
    return allUsers().find(u => u.id === id) || null;
}
function saveSession(user, remember) {
    try {
        localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY);
        (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, user.id);
    } catch (e) {}
}
function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
}

/* تطبيق المستخدم على الواجهة: التطبيق مخفي ومعطّل قبل تسجيل الدخول */
function applyUser(user) {
    currentUser = user;
    if (user) HWOrders.scope([{ by: 'createdAt', start: Date.now() - 40 * 864e5 }]);   /* الإدارة: آخر 40 يومًا (الأقدم في الأرشيف) */
    document.getElementById('userWrap').style.display = user ? '' : 'none';
    if (user) fillUserUI(user);
    closeUserMenu();
    document.body.classList.toggle('authed', !!user);
    document.getElementById('appShell').inert = !user;
}


/* ---------- الحساب: الصورة، القائمة، صفحة الملف الشخصي ---------- */
function setAvatar(img) { img.src = 'logo-icon.png'; }   /* شعار HIGHWAY لحسابات الإدارة */
function fillUserUI(u) {
    ['avatarImg', 'umImg', 'pfImg'].forEach(id => setAvatar(document.getElementById(id), u));
    const nm = u.label || 'HIGHWAY Delivery', role = u.role === 'dispatcher' ? 'منسق عمليات' : 'مسؤول النظام';
    document.getElementById('umName').textContent = nm;
    document.getElementById('umRole').textContent = role;
    document.getElementById('pfName').textContent = nm;
    document.getElementById('pfHandle').textContent = '@' + u.names[0];
    document.getElementById('pfChip').textContent = role;
    document.getElementById('pfUser').textContent = u.names[0];
}
function closeUserMenu() {
    const m = document.getElementById('userMenu'), b = document.getElementById('avatarBtn');
    if (!m) return;
    m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); m.inert = true;
    b.setAttribute('aria-expanded', 'false');
}
function toggleUserMenu() {
    const m = document.getElementById('userMenu');
    if (m.classList.contains('open')) return closeUserMenu();
    m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); m.inert = false;
    document.getElementById('avatarBtn').setAttribute('aria-expanded', 'true');
}
function openProfile() { closeUserMenu(); if (currentUser) goTo('screen-profile'); }

/* الإطار الزجاجي يكبر ليظهر نموذج الدخول، وزر الرجوع يعيد الشاشة الافتتاحية كما كانت */
let introCtl = null;
function setLoginFocusable(on) {
    document.querySelectorAll('#loginPanel input, #loginPanel button, #loginBack').forEach(el => el.tabIndex = on ? 0 : -1);
    document.getElementById('loginPanel').setAttribute('aria-hidden', on ? 'false' : 'true');
}
function openLogin() {
    document.getElementById('splash').classList.add('login-mode');
    setLoginFocusable(true);
    if (window.matchMedia('(hover:hover)').matches) setTimeout(() => document.getElementById('loginUser').focus(), 650);
}
function closeLogin() {
    document.getElementById('splash').classList.remove('login-mode');
    setLoginFocusable(false);
    document.getElementById('loginError').textContent = '';
    ['loginUserField', 'loginPassField'].forEach(id => document.getElementById(id).classList.remove('invalid'));
    document.getElementById('loginPass').value = '';
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}
function finishLogin() {
    document.getElementById('splash').classList.add('hide');
    if (introCtl) setTimeout(introCtl.stop, 800);
}

async function submitLogin(ev) {
    ev.preventDefault();
    const err = document.getElementById('loginError');
    const nameEl = document.getElementById('loginUser');
    const passEl = document.getElementById('loginPass');
    const btn = document.getElementById('loginBtn');
    err.textContent = '';
    ['loginUserField', 'loginPassField'].forEach(id => document.getElementById(id).classList.remove('invalid'));

    if (!nameEl.value.trim()) { document.getElementById('loginUserField').classList.add('invalid'); err.textContent = 'الرجاء إدخال اسم المستخدم'; return; }
    if (!passEl.value) { document.getElementById('loginPassField').classList.add('invalid'); err.textContent = 'الرجاء إدخال كلمة المرور'; return; }

    btn.classList.add('loading');
    await Promise.all([new Promise(r => setTimeout(r, 350)), HWDB.col('staff').ready()]);
    const user = findUserByName(nameEl.value);
    const ok = user && sha256(`HIGHWAY|${user.id}|${passEl.value}`) === user.hash;
    btn.classList.remove('loading');

    if (!ok) {
        document.getElementById('loginUserField').classList.add('invalid');
        document.getElementById('loginPassField').classList.add('invalid');
        err.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
        passEl.value = '';
        return;
    }
    saveSession(user, document.getElementById('loginRemember').checked);
    passEl.value = '';
    applyUser(user);
    resetAndGo('screen-dashboard');
    finishLogin();
}

function togglePass() {
    const p = document.getElementById('loginPass');
    const show = p.type === 'password';
    p.type = show ? 'text' : 'password';
    document.getElementById('passToggle').setAttribute('aria-label', show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
    document.getElementById('passToggle').classList.toggle('on', show);
}

function logout() {
    clearSession();
    location.reload();
}

/* ---------- التنقل ---------- */
function goTo(id){
  closeUserMenu();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  currentScreen = id;
  if (typeof syncTabs === 'function') syncTabs(id);
  document.getElementById('headerBack').classList.toggle('show', !!(SCREEN_META[id] || {}).back);
  window.scrollTo({ top:0, behavior:'auto' });
  // كل صفحة تُفتح "نظيفة" كأنها حُمّلت من جديد
  if (id === 'screen-confirm') { document.getElementById('confirmForm').reset(); clearInvalid('confirmForm'); }
}

function goBack(){
  const back = (SCREEN_META[currentScreen] || {}).back;
  if (back) goTo(back);
}

/* الضغط على اللوجو: إعادة تحميل الموقع (بدون إعادة شاشة الدخول) */
function reloadSite(){
  try { sessionStorage.setItem('hw-skip-splash', '1'); } catch (e) {}
  location.reload();
}

function resetAndGo(id){
  document.getElementById('orderForm').reset();
  document.getElementById('confirmForm').reset();
  clearInvalid('orderForm');
  clearInvalid('confirmForm');
  state.pickup = { name:"", isCustom:false, sid:'' };
  document.getElementById('successRef').style.display = 'none';
  goTo(id);
}

/* نقاط الاستلام: المتاجر المسجّلة بشعاراتها، أو نقطة أخرى يكتبها المنسق */
function renderRestaurants(){
  const grid = document.getElementById('restGrid');
  grid.innerHTML = '';
  HWBiz.storeList().forEach(st => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rest-card glass';
    btn.innerHTML = '<span class="ico lg"><img src="' + HWOrders.esc(HWBiz.logo(st.id)) + '" alt=""></span><span>' + HWOrders.esc(st.name) + '</span>';
    btn.addEventListener('click', () => selectPickup(st.name, false, st.id));
    grid.appendChild(btn);
  });
  const custom = document.createElement('button');
  custom.type = 'button';
  custom.className = 'rest-card custom';
  custom.innerHTML = `<span class="ico">${ICONS.pin}</span><span>نقطة استلام أخرى</span>`;
  custom.addEventListener('click', () => selectPickup("", true));
  grid.appendChild(custom);
}

function selectPickup(name, isCustom, sid){
  state.pickup = { name, isCustom, sid: sid || '' };
  document.getElementById('orderForm').reset();
  clearInvalid('orderForm');

  const customField = document.getElementById('customNameField');
  document.getElementById('pickupPillText').textContent = isCustom ? 'نقطة استلام أخرى' : name;
  customField.style.display = isCustom ? 'block' : 'none';
  if (isCustom) document.getElementById('customName').value = '';

  goTo('screen-order');
}

/* ---------- أدوات ---------- */
function pad2(n){ return String(n).padStart(2,'0'); }

function getDatePrefix(){
  const d = new Date();
  return `${String(d.getFullYear()).slice(-2)}${pad2(d.getMonth()+1)}${pad2(d.getDate())}`;
}

function setInvalid(fieldId, invalid){
  document.getElementById(fieldId).classList.toggle('invalid', invalid);
}
function clearInvalid(formId){
  document.getElementById(formId).querySelectorAll('.field').forEach(f => f.classList.remove('invalid'));
}

function formatTime12h(timeStr){
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h < 12 ? 'ص' : 'م';
  const h12 = h % 12 || 12;
  return `${pad2(h12)}:${pad2(m)} ${period}`;
}

/* رقم الهاتف اختياري: إن كُتب يجب أن يكون أرقاماً (7–15) ويقبل + في البداية */
function parsePhone(raw){
  const v = String(raw || '').trim();
  if (!v) return { empty:true, ok:true, value:'' };
  const clean = v.replace(/[\s\-()]/g, '');
  return { empty:false, ok:/^\+?\d{7,15}$/.test(clean), value:clean };
}

function openWhatsApp(message){
  window.open('https://wa.me/?text=' + encodeURIComponent(message), '_blank');
}

function setBtnLoading(btn, isLoading){
  btn.classList.toggle('loading', isLoading);
}

/* ---------- نموذج تحضير الطلب ---------- */
document.getElementById('orderForm').addEventListener('submit', function(e){
  e.preventDefault();
  let valid = true;

  let pickupName = state.pickup.name;
  if (state.pickup.isCustom){
    const customVal = document.getElementById('customName').value.trim();
    setInvalid('customNameField', !customVal);
    if (!customVal) valid = false;
    pickupName = customVal;
  }

  const orderNumber = document.getElementById('orderNumber').value.trim();
  setInvalid('orderNumField', !orderNumber);
  if (!orderNumber) valid = false;

  const orderValue = document.getElementById('orderValue').value.trim();
  setInvalid('orderValueField', !orderValue);
  if (!orderValue) valid = false;

  if (!valid) return;

  const btn = document.getElementById('orderSubmitBtn');
  setBtnLoading(btn, true);

  setTimeout(() => {
    const notes = document.getElementById('orderNotes').value.trim() || 'لا يوجد';

    const message =
`*📢 طلب جديد متاح | رقم #${orderNumber}*
*🏪 نقطة الاستلام*: ${pickupName}
*💵 مطلوب دفعه*: ${orderValue} د.أ
*📝 ملاحظات*: ${notes}

———————————————
*⚠️ تعليمات القبول:*
*1- ⛔️ تأكد من جاهزيتك وتوفر المبلغ.*
*2- 📍أرسل موقعك المباشر (Live Location) للمنسق.*
*3- 🔄 سيتم تعيين الكابتن الأقرب بعد 30 ثانية.*

*HIGHWAY Delivery | أسرع طريق لطلباتك 🩵.*`;

    openWhatsApp(message);
    const pst = state.pickup.sid ? HWDB.col('storestate').get(state.pickup.sid) || {} : {}, psd = state.pickup.sid ? HWBiz.storeById(state.pickup.sid) || {} : {};
    HWOrders.create({ source: 'coordinator', storeId: state.pickup.sid || '', storeName: pickupName, kind: 'pickup', from: pickupName, to: '',
        storeLoc: pst.lat != null ? { lat: pst.lat, lng: pst.lng } : null, storePhone: psd.phone || '', storeAddr: psd.addr || '',
        price: '', orderNo: orderNumber, code: '#' + orderNumber.slice(0, 8), orderValue: orderValue, notes: notes === 'لا يوجد' ? '' : notes });
    setBtnLoading(btn, false);

    document.getElementById('successSub').textContent = 'تم فتح واتساب لمشاركة تفاصيل الطلب الجديد.';
    const ref = document.getElementById('successRef');
    ref.textContent = `رقم الطلب #${orderNumber}`;
    ref.style.display = 'inline-block';
    goTo('screen-success');
  }, 550);
});

/* ---------- نموذج تأكيد الاستلام ---------- */
document.getElementById('confirmForm').addEventListener('submit', function(e){
  e.preventDefault();
  let valid = true;

  const captainName = document.getElementById('captainName').value.trim();
  setInvalid('captainNameField', !captainName);
  if (!captainName) valid = false;

  const arrivalTime = document.getElementById('arrivalTime').value;
  setInvalid('arrivalTimeField', !arrivalTime);
  if (!arrivalTime) valid = false;

  const phone = parsePhone(document.getElementById('captainPhone').value);
  setInvalid('captainPhoneField', !phone.ok);
  if (!phone.ok) valid = false;

  const orderSuffix = document.getElementById('confirmOrderNumber').value.trim();
  setInvalid('confirmOrderNumField', !orderSuffix);
  if (!orderSuffix) valid = false;

  if (!valid) return;

  const btn = document.getElementById('confirmSubmitBtn');
  setBtnLoading(btn, true);

  setTimeout(() => {
    const fullOrderNumber = `ORD#${getDatePrefix()}-${orderSuffix}`;
    const phoneLine = phone.empty ? '' : `\n📞 رقم الكابتن: *\u200E${phone.value}*`;

    const message =
`📢 تنبيه: الكابتن في الطريق إليكم!

تم إسناد الطلب للكابتن *${captainName}*${phoneLine}
الآن في طريقه لإستلام الطلب رقم *${fullOrderNumber}*
⏰ وقت الوصول المتوقع: *${formatTime12h(arrivalTime)}*

شكراً لكم على سرعة التجاوب واحترافيتكم العالية 🩵
HIGHWAY Delivery | The Fastest Way to Your Orders`;

    openWhatsApp(message);
    const key = orderSuffix.toLowerCase();
    const found = allOrders.filter(o => HWOrders.isActive(o) && (String(o.orderNo || '').toLowerCase() === key || String(o.code).toLowerCase() === '#' + key))[0];
    const cap = { name: captainName, phone: phone.value };
    if (found) HWOrders.update(found.id, { status: found.status === 'new' ? 'accepted' : found.status, captain: cap, eta: formatTime12h(arrivalTime) });
    else {
        const n = HWOrders.create({ source: 'coordinator', storeId: '', storeName: '—', kind: 'pickup', from: 'طلب رقم ' + orderSuffix, to: '', price: '', orderNo: orderSuffix, code: '#' + orderSuffix.slice(0, 8) });
        HWOrders.update(n.id, { status: 'accepted', captain: cap, eta: formatTime12h(arrivalTime) });
    }
    setBtnLoading(btn, false);

    document.getElementById('successSub').textContent = 'تم فتح واتساب لتأكيد استلام الطلب مع الكابتن.';
    const ref = document.getElementById('successRef');
    ref.textContent = fullOrderNumber;
    ref.style.display = 'inline-block';
    goTo('screen-success');
  }, 550);
});



try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) {}
window.addEventListener("pageshow", () => window.scrollTo(0, 0));
document.addEventListener("click", (e) => { if (!e.target.closest("#userWrap")) closeUserMenu(); });

/* ---------- تشغيل ---------- */
(function init(){
  buildSplashIcons();
  HWBiz.storesCol.subscribe(renderRestaurants); HWBiz.onMedia(renderRestaurants);
  document.getElementById('orderPrefixTag').textContent = `ORD#${getDatePrefix()}-`;

  let skipSplash = false;
  try { skipSplash = sessionStorage.getItem('hw-skip-splash') === '1'; sessionStorage.removeItem('hw-skip-splash'); } catch (e) {}

  const saved = readSession();
  applyUser(saved);
  if (!saved) skipSplash = false;          // بدون مستخدم لا نتخطى الشاشة الافتتاحية (فهي تحمل تسجيل الدخول)
  const splash = document.getElementById('splash');
  if (skipSplash) { splash.style.transition = 'none'; splash.classList.add('hide'); }

  introCtl = skipSplash ? null : initIntroVideo();
  document.getElementById('loginForm').addEventListener('submit', submitLogin);
  document.getElementById('enterBtn').addEventListener('click', () => {
    if (saved) finishLogin();              // مستخدم محفوظ: يدخل مباشرة
    else openLogin();                      // غيره: الإطار الزجاجي يكبر لتسجيل الدخول
  });

  // صفحة مستعادة من ذاكرة المتصفح، أو دخول/خروج من تبويب آخر: نعيد التحميل كي لا تظهر حالة قديمة
  window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
  window.addEventListener('storage', (e) => { if (e.key === SESSION_KEY) location.reload(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeOrderSheet(); closeAssign(); closeUserMenu(); if (splash.classList.contains('login-mode') && !splash.classList.contains('hide')) closeLogin(); }
  });

  goTo('screen-dashboard');
})();


/* =========================================================
   لوحة الطلبات: كل الطلبات، تعيين الكابتن، تحديث الحالة
   ========================================================= */
let allOrders = [], prevIds = null, bdFilter = 'live', openSheetId = null, assignId = null;
function syncTabs(id) {
    document.querySelectorAll('.tab').forEach(t => {
        const on = t.dataset.tab === TAB_OF[id];
        t.classList.toggle('on', on);
        if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
}
function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) {} }
function tabGo(id) { buzz(); goTo(id); }
const iconBox = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>';

function actionsFor(o) {
    const id = HWOrders.esc(o.id);
    if (o.status === 'new') return '<button type="button" class="btn-s" data-act="assign" data-id="' + id + '">تعيين كابتن</button><button type="button" class="btn-s dng" data-act="cancel" data-id="' + id + '">إلغاء</button>';
    if (o.status === 'accepted') return '<button type="button" class="btn-s" data-act="picked" data-id="' + id + '">تم الاستلام من المتجر</button><button type="button" class="btn-s alt" data-act="assign" data-id="' + id + '">تغيير الكابتن</button>';
    if (o.status === 'picked') return '<button type="button" class="btn-s" data-act="delivered" data-id="' + id + '">تم التسليم</button>';
    return '';
}
function applyFilter(list, f) {
    return f === 'live' ? list.filter(HWOrders.isActive) : f === 'new' ? list.filter(o => o.status === 'new') :
        f === 'done' ? list.filter(o => o.status === 'delivered') : f === 'cancel' ? list.filter(o => o.status === 'cancelled') : list;
}

function onOrders(list) {
    allOrders = list;
    if (prevIds) {
        list.forEach(o => { if (!prevIds[o.id] && (o.source === 'store' || o.kind === 'market') && o.status === 'new') { HWOrders.toast((o.kind === 'market' ? 'طلب جديد من التطبيق: ' : 'طلب جديد من ') + o.storeName + ' ' + o.code); HWNotify.play('order'); HWNotify.notify('HIGHWAY · طلب جديد', o.storeName + ' ' + o.code); buzz(30); } });
    }
    prevIds = {}; list.forEach(o => { prevIds[o.id] = 1; });
    renderBoard();
}

function renderBoard() {
    const st = HWOrders.stats(allOrders), act = allOrders.filter(HWOrders.isActive), running = st.active - st.fresh;
    const fresh = allOrders.filter(o => o.status === 'new');
    const badge = document.getElementById('tabBadge');
    if (badge) { badge.textContent = fresh.length; badge.classList.toggle('on', fresh.length > 0); }

    const bs = document.getElementById('bdStats');
    if (bs) bs.innerHTML = '<div class="stat"><b>' + st.today + '</b><small>طلبات اليوم</small></div>' +
        '<div class="stat hot"><b>' + st.fresh + '</b><small>بانتظار كابتن</small></div>' +
        '<div class="stat"><b>' + running + '</b><small>قيد التنفيذ</small></div>' +
        '<div class="stat"><b>' + st.delivered + '</b><small>تم تسليمها اليوم</small></div>';
    document.querySelectorAll('#bdSeg button').forEach(b => {
        const f = b.dataset.f, n = applyFilter(allOrders, f).length;
        b.classList.toggle('on', f === bdFilter);
        b.innerHTML = b.textContent.replace(/\d+$/, '').trim() + '<i>' + n + '</i>';
    });
    const list = applyFilter(allOrders, bdFilter);
    const bl = document.getElementById('bdList');
    if (bl) bl.innerHTML = list.length ? list.map(o => HWOrders.card(o, actionsFor(o), true)).join('')
        : '<div class="empty-orders">' + iconBox + 'لا توجد طلبات هنا الآن</div>';
    if (openSheetId) renderSheet(openSheetId);
}

/* تفاصيل الطلب */
function openOrderSheet(id) { openSheetId = id; renderSheet(id); document.getElementById('orderSheet').classList.add('show'); }
function closeOrderSheet() { openSheetId = null; const s = document.getElementById('orderSheet'); if (s) s.classList.remove('show'); }
function renderSheet(id) {
    const o = HWOrders.get(id), body = document.getElementById('orderSheetBody');
    if (!o) { closeOrderSheet(); return; }
    const rows = [['المتجر / المصدر', o.storeName + (o.kind === 'market' ? ' (من التطبيق)' : o.source === 'store' ? ' (طلب من الموقع)' : ' (لوحة الإدارة)')], ['وقت الطلب', HWOrders.fmtTime(o.createdAt)]];
    if (o.orderValue) rows.push(['قيمة الطلب', o.orderValue + ' د.أ']);
    if (o.price) rows.push(['رسوم التوصيل', o.price + ' دينار']);
    if (o.notes) rows.push(['ملاحظات', o.notes]);
    if (o.discount) rows.push(['خصم العرض', '−' + HWOrders.money(o.discount) + ' د.أ' + (o.offerTitle ? ' (' + o.offerTitle + ')' : '')]);
    const mk = HWOrders.isMarket(o), sl = HWOrders.settle(o);
    if (mk) { rows.push(['العميل', (o.customer.name || '') + ' · ' + (o.customer.phone || '')], ['العنوان', (o.address.label || o.address.area || '') + ' · ' + (o.address.details || '')], ['حالة المتجر', ({ pending: 'بانتظار القبول', preparing: 'قيد التحضير', ready: 'جاهز', rejected: 'مرفوض' })[o.storeState] || '-'], ['المنتجات', o.items.map(l => l.qty + '× ' + l.name + (l.opts && l.opts.length ? ' (' + HWBiz.optsText(l.opts) + ')' : '')).join('، ')], ['يدفعه الكابتن للمتجر', HWOrders.money(sl.items) + ' د.أ'], ['يحصّله من العميل', HWOrders.money(sl.collected) + ' د.أ']); }
    if (o.offerTo && HWOrders.offerable(o)) rows.push(['معروض الآن على', (o.offerName || '') + (o.offerKm != null ? ' · ' + o.offerKm + ' كم' : '')]);
    if (HWOrders.isActive(o) || o.status === 'delivered') rows.push(['عمولة المنصة', HWOrders.money(sl.commission) + ' د.أ'], ['صافي الكابتن', HWOrders.money(sl.net) + ' د.أ']);
    if (o.promoCode) rows.push(['كود خصم (تتحمّله المنصة)', o.promoCode + ' · −' + HWOrders.money(o.promoAmount) + ' د.أ']);
    if (o.scheduledFor) rows.push(['موعد التوصيل', 'مجدول ' + HWOrders.fmtTime(o.scheduledFor)]);
    if (o.surge) rows.push(['رسوم ' + (o.surgeLabel || 'إضافية') + ' (للكابتن)', HWOrders.money(o.surge) + ' د.أ']);
    if (o.needsConfirm) rows.push(['تنبيه العميل', 'لم يستلم ' + (o.custNoShows || 2) + ' طلبات سابقة']);
    if (o.cancelReason) rows.push(['سبب الإلغاء', o.cancelReason]);
    (o.reassigns || []).forEach(r => rows.push(['نقل ' + HWOrders.fmtTime(r.at), r.from + ' ← ' + r.to + ' · ' + r.reason]));
    if (o.rating) rows.push(['تقييم العميل', 'المتجر ' + HWBiz.stars(o.rating.store) + (o.rating.captain ? ' · الكابتن ' + HWBiz.stars(o.rating.captain) : '') + (o.rating.comment ? ' · ' + o.rating.comment : '')]);
    if (o.status === 'delivered' && HWOrders.isMarket(o)) rows.push(['رمز التسليم', o.pinOk === false ? 'سُلّم بدون رمز ⚠' : 'تم التحقق ✓']);
    body.innerHTML =
        '<div class="sh-head"><div><small>تفاصيل الطلب</small><h3>' + HWOrders.esc(o.code) + '</h3></div><span class="oc-chip">' + HWOrders.SHORT[o.status] + '</span></div>' +
        '<div class="s-' + o.status + '">' + HWOrders.routeRows(o) + '</div>' +
        HWOrders.timeline(o) + HWOrders.captainRow(o, true) +
        '<div class="sh-rows">' + rows.map(r => '<div><span>' + r[0] + '</span><b>' + HWOrders.esc(r[1]) + '</b></div>').join('') + '</div>' +
        (o.podAt && typeof showPod === 'function' ? '<button type="button" class="ghost-btn wide" style="margin-top:10px" onclick="showPod(\'' + o.id + '\')">صورة إثبات الوصول</button>' : '') +
        (actionsFor(o) ? '<div class="oc-actions" style="margin-top:14px">' + actionsFor(o) + '</div>' : '') +
        '<div class="sh-actions"><button type="button" class="ghost-btn" style="flex:1" onclick="closeOrderSheet()">إغلاق</button></div>';
    body.className = 'modal-card glass s-' + o.status;
}

/* تعيين كابتن */
function captainBook() {
    const m = {};
    HWDB.col('captains').list().forEach(c => { if (c.active !== false) m[c.name] = c.phone || ''; });
    allOrders.forEach(o => { if (o.captain && o.captain.name && !(o.captain.name in m)) m[o.captain.name] = o.captain.phone || ''; });
    return m;
}
function openAssign(id) {
    const o = HWOrders.get(id); if (!o) return;
    assignId = id;
    document.getElementById('asSummary').innerHTML = '<div class="rt"><i></i><small>الطلب</small><b>' + HWOrders.esc(o.code) + ' · ' + HWOrders.esc(o.storeName) + '</b></div>' +
        '<div class="rt end"><i></i><small>' + (o.to ? 'إلى' : 'استلام من') + '</small><b>' + HWOrders.esc(o.to || o.from) + '</b></div>' + (o.price ? '<div class="rt-price">' + HWOrders.esc(o.price) + ' دينار</div>' : '');
    document.getElementById('capList').innerHTML = Object.keys(captainBook()).map(n => '<option value="' + HWOrders.esc(n) + '"></option>').join('');
    document.getElementById('asName').value = o.captain ? o.captain.name : '';
    document.getElementById('asPhone').value = o.captain ? (o.captain.phone || '') : '';
    document.getElementById('asEta').value = '';
    document.getElementById('asReason').value = '';
    document.getElementById('asReasonField').style.display = o.captain && o.captain.name ? '' : 'none';
    ['asNameField', 'asPhoneField', 'asEtaField', 'asReasonField'].forEach(f => setInvalid(f, false));
    closeOrderSheet(); if (window.renderAssignCaps) renderAssignCaps(o);
    document.getElementById('assignSheet').classList.add('show');
}
function closeAssign() { assignId = null; const s = document.getElementById('assignSheet'); if (s) s.classList.remove('show'); }
document.getElementById('asName').addEventListener('input', (e) => {
    const book = captainBook(), ph = document.getElementById('asPhone');
    if (e.target.value in book && !ph.value) ph.value = book[e.target.value];
});
document.getElementById('assignForm').addEventListener('submit', (e) => { e.preventDefault(); submitAssign(false); });
function defaultEta() { const d = new Date(Date.now() + 20 * 60000); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function submitAssign(wa) {
    const o = HWOrders.get(assignId); if (!o) return;
    const name = document.getElementById('asName').value.trim(), eta = document.getElementById('asEta').value || defaultEta(), phone = parsePhone(document.getElementById('asPhone').value);
    const changing = o.captain && o.captain.name && o.captain.name !== name, reason = changing ? document.getElementById('asReason').value : '';
    setInvalid('asNameField', !name); setInvalid('asPhoneField', !phone.ok); setInvalid('asReasonField', changing && !reason);
    if (!name || !phone.ok || (changing && !reason)) return;
    const cd = HWDB.col('captains').list().filter(c => c.name === name)[0];
    const patch = { captain: Object.assign({ name: name, phone: phone.value }, cd ? { id: cd.id, av: cd.av === 'f' ? 'f' : 'm', pv: cd.pv || 0 } : {}), eta: formatTime12h(eta), claimBy: cd ? cd.id : null, offerTo: null, offerAt: 0 };
    if (o.status === 'new') patch.status = 'accepted';
    if (changing) patch.reassigns = (o.reassigns || []).concat([{ from: o.captain.name, to: name, reason, at: Date.now(), by: actorName() }]);
    HWOrders.update(o.id, patch, changing ? 'reassigned' : null);
    logAct(changing ? 'reassign' : 'assign', (changing ? 'نقل الطلب ' + o.code + ' من ' + o.captain.name + ' إلى ' + name + ' — ' + reason : 'إسناد الطلب ' + o.code + ' إلى ' + name));
    if (wa) {
        openWhatsApp(`📢 تنبيه: الكابتن في الطريق إليكم!

تم إسناد الطلب *${o.code}* للكابتن *${name}*${phone.empty ? '' : '\n📞 رقم الكابتن: *\u200E' + phone.value + '*'}
⏰ وقت الوصول المتوقع: *${formatTime12h(eta)}*

شكراً لكم على سرعة التجاوب واحترافيتكم العالية 🩵
HIGHWAY Delivery | The Fastest Way to Your Orders`);
    }
    closeAssign(); buzz(18); HWOrders.toast('تم تعيين الكابتن ' + name + ' للطلب ' + o.code);
}

/* إجراءات الحالة */
function orderAct(act, id) {
    const o = HWOrders.get(id); if (!o) return;
    if (act === 'assign') return openAssign(id);
    if (act === 'cancel') {
        const why = prompt('سبب إلغاء الطلب ' + o.code + ':', 'طلب العميل'); if (why === null) return;
        HWOrders.update(id, { status: 'cancelled', cancelReason: 'ألغت الإدارة الطلب' + (why ? ' (' + why + ')' : '') }); logAct('cancel', 'إلغاء الطلب ' + o.code + (why ? ' — ' + why : '')); HWOrders.toast('تم إلغاء الطلب'); return;
    }
    if (act === 'picked') { HWOrders.update(id, { status: 'picked' }); logAct('status', 'تسجيل استلام الطلب ' + o.code + ' يدويًا'); HWOrders.toast('تم تسجيل استلام الطلب ' + o.code); }
    if (act === 'delivered') { HWOrders.update(id, { status: 'delivered' }); logAct('status', 'تسجيل تسليم الطلب ' + o.code + ' يدويًا'); HWOrders.toast('تم تسليم الطلب ' + o.code + ' ✓'); }
    buzz(16);
}
document.addEventListener('click', (e) => {
    const b = e.target.closest('.btn-s[data-act]');
    if (b) { e.stopPropagation(); orderAct(b.dataset.act, b.dataset.id); return; }
    const c = e.target.closest('.oc');
    if (c && !e.target.closest('a')) { buzz(); openOrderSheet(c.dataset.id); }
    const sg = e.target.closest('#bdSeg button');
    if (sg) { bdFilter = sg.dataset.f; buzz(); renderBoard(); }
});
document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('oc')) { e.preventDefault(); openOrderSheet(e.target.dataset.id); } });
setInterval(() => { if (!document.hidden && allOrders.length) renderBoard(); }, 30000);
HWOrders.subscribe(onOrders);

/* ---------- تنبيه العمليات: رنين عند وجود طلب متأخر (المتجر لم يقبله، أو لم يُسند لكابتن) خلال 3 دقائق ---------- */
window.HWNotifyAskPerm = true;
function lateOrders() {
    const now = Date.now(), late = 3 * 60000;
    return allOrders.filter(o => o.status === 'new' && now - (o.createdAt || 0) > late && (o.storeState === 'pending' || HWOrders.offerable(o) || !HWOrders.isMarket(o)));
}
setInterval(() => {
    if (!currentUser) return;
    if (lateOrders().length) HWNotify.ring('admin-late', 'alert', 9000); else HWNotify.stop('admin-late');
}, 5000);
document.addEventListener('DOMContentLoaded', () => HWNotify.keepAwake(true));
