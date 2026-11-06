/* لوحة الإدارة: الرقم المختصر للطلب (#021) في القوائم والبطاقات، والكامل داخل التفاصيل */
window.HW_SHORT = true;
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
  'screen-profile':    { back:'screen-dashboard' },
  'screen-board':      { back:'screen-dashboard' },
  'screen-captains':   { back:'screen-dashboard' },
  'screen-support':    { back:'screen-dashboard' },
  'screen-stats':      { back:'screen-dashboard' },
};

/* التبويب النشط لكل شاشة */
const TAB_OF = { 'screen-stats': 'home', 'screen-dashboard': 'home', 'screen-restaurants': 'home', 'screen-order': 'home', 'screen-board': 'board', 'screen-captains': 'caps', 'screen-support': 'support' };
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
    if (user) fillUserUI(user); else HWHead.user(null);
    document.body.classList.toggle('authed', !!user);
    document.getElementById('appShell').inert = !user;
}


/* ---------- الحساب: صورة الإدارة (شعار HIGHWAY)، القائمة أعلى الشاشة، صفحة الملف الشخصي ---------- */
const ADMIN_AV = 'art/av-hw.jpg';
function fillUserUI(u) {
    const nm = u.label || 'HIGHWAY Delivery', role = u.role === 'dispatcher' ? 'منسق عمليات' : 'مسؤول النظام';
    document.getElementById('pfImg').src = ADMIN_AV;
    document.getElementById('pfName').textContent = nm;
    document.getElementById('pfHandle').textContent = '@' + u.names[0];
    document.getElementById('pfChip').textContent = role;
    document.getElementById('pfUser').textContent = u.names[0];
    HWHead.user({ img: ADMIN_AV, name: nm, role });
}
HWHead.init({
    app: 'admin', logout: () => logout(),
    items: [{ k: 'profile', t: 'الملف الشخصي', fn: () => { if (currentUser) goTo('screen-profile'); } }],
    go: (k) => { if (/^support:/.test(k)) { tabGo('screen-support'); HWSupport.open(k.slice(8)); } else if (/^support/.test(k)) tabGo('screen-support'); else tabGo('screen-board'); }
});
/* الدعم: صندوق المحادثات + عدد غير المقروء على التبويب */
function renderSupport() {
    if (currentScreen === 'screen-support') HWSupport.inbox(document.getElementById('supBox'));
    const n = HWSupport.unread(), b = document.getElementById('supBadge');
    if (b) { b.textContent = n; b.classList.toggle('on', n > 0); }
}
HWSupport.init({
    role: 'a', me: () => currentUser ? { uid: 'admin' } : null, onChange: renderSupport,
    avatar: (t) => t.role === 's' ? HWBiz.logo(t.uid) : t.role === 'k' ? HWBiz.capAv(HWDB.col('captains').get(t.uid) || { id: t.uid }) : '',
    profile: (t) => t.role === 'k' ? capInfo(t.uid, 'full') : t.role === 's' ? storeInfo(t.uid, 'full') : custInfo(t.phone || t.uid, t.name, t.img)
});

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
  HWHead.close();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  currentScreen = id;
  if (typeof syncTabs === 'function') syncTabs(id);
  document.getElementById('headerBack').classList.toggle('show', !!(SCREEN_META[id] || {}).back);
  window.scrollTo({ top:0, behavior:'auto' });
  // كل صفحة تُفتح "نظيفة" كأنها حُمّلت من جديد
  if (id === 'screen-support') renderSupport();
  if (id === 'screen-stats' && typeof renderStatsPage === 'function') renderStatsPage();
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
  clearInvalid('orderForm');
  state.pickup = { name:"", isCustom:false, sid:'' };
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
  orderDest = undefined; paintOrderDest(); document.getElementById('lastSent').hidden = true;
  document.getElementById('orderNoteField').hidden = true; document.getElementById('noteTg').hidden = false;

  const customField = document.getElementById('customNameField');
  document.getElementById('pickupPillText').textContent = isCustom ? 'نقطة استلام أخرى' : name;
  customField.style.display = isCustom ? 'block' : 'none';
  if (isCustom) document.getElementById('customName').value = '';

  goTo('screen-order');
  setTimeout(pickOrderDest, 300);   /* الخطوة التالية مباشرة: اختيار الوجهة */
}

/* ---------- أدوات ---------- */
function pad2(n){ return String(n).padStart(2,'0'); }

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

function setBtnLoading(btn, isLoading){
  btn.classList.toggle('loading', isLoading);
}

/* ---------- الطلب اليدوي: الوجهة من قائمة أسعار المطعم + قيمة الطلب ----------
   الأجرة تأتي من المنطقة تلقائيًا. "وجهة غير محددة" تنزل بلا أجرة وتظهر في "يحتاج تدخلك".
   بعد الإرسال يبقى نفس المطعم مختارًا لإدخال الطلب التالي مباشرة */
let orderDest = undefined;   /* undefined = لم تُختر بعد، null = غير محددة، {n,p,fee} = منطقة */
function paintOrderDest() {
  const t = document.getElementById('orderDestTxt'), f = document.getElementById('orderDestFee'), b = document.getElementById('orderDestBtn');
  b.classList.toggle('set', orderDest !== undefined);
  t.textContent = orderDest === undefined ? 'اختر المنطقة من قائمة الأسعار' : orderDest === null ? 'وجهة غير محددة' : orderDest.n;
  f.textContent = orderDest === undefined ? '' : orderDest === null ? 'الأجرة لاحقًا' : orderDest.fee.toFixed(2) + ' د.أ';
}
function pickOrderDest() {
  HWDest.open({ sid: state.pickup.sid || '', sub: state.pickup.name || 'طلب يدوي', title: 'إلى أين؟', onPick: (a) => {
    orderDest = a; setInvalid('orderDestField', false); paintOrderDest();
    setTimeout(() => document.getElementById('orderValue').focus(), 150);
  } });
}
document.getElementById('orderForm').addEventListener('submit', function(e){
  e.preventDefault();
  let valid = true, pickupName = state.pickup.name;
  if (state.pickup.isCustom){
    const customVal = document.getElementById('customName').value.trim();
    setInvalid('customNameField', !customVal); if (!customVal) valid = false;
    pickupName = customVal;
  }
  setInvalid('orderDestField', orderDest === undefined); if (orderDest === undefined) valid = false;
  const orderValue = document.getElementById('orderValue').value.trim();
  setInvalid('orderValueField', !orderValue); if (!orderValue) valid = false;
  if (!valid) return;

  const notes = document.getElementById('orderNotes').value.trim(), d = orderDest;
  const pst = state.pickup.sid ? HWDB.col('storestate').get(state.pickup.sid) || {} : {}, psd = state.pickup.sid ? HWBiz.storeById(state.pickup.sid) || {} : {};
  const o = HWOrders.create({ source: 'coordinator', storeId: state.pickup.sid || '', storeName: pickupName, kind: 'pickup', from: pickupName, to: d ? d.n : '',
      storeLoc: pst.lat != null ? { lat: pst.lat, lng: pst.lng } : null, storePhone: psd.phone || '', storeAddr: psd.addr || '',
      price: d ? d.fee.toFixed(2) : '', unpriced: !d, orderValue: orderValue, notes: notes });
  buzz(18);
  HWOrders.toast(d ? 'أُرسل الطلب للكباتن' : 'أُرسل الطلب. الأجرة تُحدد لاحقًا من "يحتاج تدخلك"');
  /* جاهز للطلب التالي من نفس المطعم */
  orderDest = undefined; paintOrderDest();
  document.getElementById('orderValue').value = ''; document.getElementById('orderNotes').value = '';
  document.getElementById('orderNoteField').hidden = true; document.getElementById('noteTg').hidden = false;
  const ls = document.getElementById('lastSent'); ls.hidden = false;
  ls.innerHTML = '<span>آخر طلب: <b data-sn="' + o.id + '">' + HWOrders.esc(HWOrders.shortNo(o)) + '</b> · ' + HWOrders.esc(d ? d.n : 'وجهة غير محددة') + '</span><button type="button" class="more-link" onclick="tabGo(\'screen-dashboard\')">إلى الرئيسية</button>';
  /* الرقم يصل من الخادم خلال لحظات: نحدّثه حتى يصل */
  let tries = 0; (function upd() { const b = ls.querySelector('[data-sn]'), x = HWOrders.get(o.id); if (!b) return; const n = x ? HWOrders.shortNo(x) : ''; if (n && n.indexOf('…') < 0) { b.textContent = n; b.classList.remove('wait'); } else { b.classList.add('wait'); if (++tries < 20) setTimeout(upd, 500); } })();
});

try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) {}
window.addEventListener("pageshow", () => window.scrollTo(0, 0));

/* ---------- تشغيل ---------- */
(function init(){
  buildSplashIcons();
  HWBiz.storesCol.subscribe(renderRestaurants); HWBiz.onMedia(renderRestaurants);

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
    if (e.key === 'Escape') { closeOrderSheet(); closeAssign(); if (splash.classList.contains('login-mode') && !splash.classList.contains('hide')) closeLogin(); }
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

/* ---------- أجور التوصيل: تُحدد مع الطلب أو لاحقًا (قبل تسوية حساب الكابتن) ---------- */
const FEE_PRESETS = [1.5, 2, 2.5, 3, 3.5];
function parseFee(v) { const n = parseFloat(String(v).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(',', '.')); return isFinite(n) && n >= 0 && n <= 50 ? Math.round(n * 100) / 100 : null; }
function needsFee(o) { return !HWOrders.isMarket(o) && o.status !== 'cancelled' && !o.settledAt && !(HWOrders.settle(o).fee > 0); }
function unpricedList() { return allOrders.filter(needsFee).sort((a, b) => a.createdAt - b.createdAt); }
function feeChips(target) { return FEE_PRESETS.map(v => '<button type="button" class="fq" onclick="document.getElementById(\'' + target + '\').value=\'' + v.toFixed(2) + '\'">' + v.toFixed(2) + '</button>').join(''); }
function openFee(id) {
    const o = HWOrders.get(id); if (!o) return;
    const cur = HWOrders.settle(o).fee, body = document.getElementById('orderSheetBody');
    openSheetId = null;
    body.className = 'modal-card glass';
    body.innerHTML = '<div class="sh-head"><div><small>' + HWOrders.esc(HWOrders.shortNo(o)) + ' · ' + HWOrders.esc(o.storeName || o.from || '') + '</small><h3>أجور التوصيل</h3></div></div>' +
        (o.captain && o.captain.name ? '<p class="mut" style="margin:0 0 10px">الكابتن ' + HWOrders.esc(o.captain.name) + ' · تظهر الأجرة في أرباحه فور الحفظ</p>' : '') +
        (o.capDest ? '<button type="button" class="cap-sug" onclick="applyFeeDest(\'' + o.id + '\',' + HWOrders.esc(JSON.stringify(o.capDest)).replace(/"/g, '&quot;') + ')"><span>اقترح الكابتن ' + HWOrders.esc(o.captain && o.captain.name || '') + ': <b>' + HWOrders.esc(o.capDest.n) + '</b></span><em dir="ltr">' + HWOrders.esc(Number(o.capDest.fee || 0).toFixed(2)) + '</em><i>اعتماد</i></button>' : '') +
        '<button type="button" class="dest-btn" onclick="feeFromList(\'' + o.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg><span>' + (o.to ? HWOrders.esc(o.to) : 'اختر الوجهة من قائمة الأسعار') + '</span><em>تغيير</em></button>' +
        '<div class="field" id="feeEdField"><label for="feeEd">أو اكتب المبلغ</label><div class="value-wrap"><input type="text" id="feeEd" inputmode="decimal" value="' + (cur > 0 ? cur.toFixed(2) : '') + '" placeholder="مثال: 2.00"><span class="cur">د.أ</span></div>' +
        '<div class="fee-quick">' + feeChips('feeEd') + '</div><div class="err-msg">اكتب رقمًا صحيحًا مثل 2 أو 2.50</div></div>' +
        '<div class="sh-actions"><button type="button" class="ghost-btn" style="flex:1" onclick="closeOrderSheet()">لاحقًا</button><button type="button" class="submit-btn" style="flex:2" onclick="saveFee(\'' + o.id + '\')"><span class="btn-label">حفظ الأجرة</span></button></div>';
    document.getElementById('orderSheet').classList.add('show');
    setTimeout(() => { const i = document.getElementById('feeEd'); if (i && matchMedia('(hover:hover)').matches) i.focus(); }, 300);
}
function saveFee(id) {
    const o = HWOrders.get(id), v = parseFee(document.getElementById('feeEd').value);
    setInvalid('feeEdField', v == null || v <= 0); if (!o || v == null || v <= 0) return;
    HWOrders.update(id, { price: v.toFixed(2), unpriced: false, capDest: null, pricedBy: actorName(), pricedAt: Date.now() }, 'priced');
    logAct('price', 'أجرة الطلب ' + o.code + ': ' + v.toFixed(2) + ' د.أ');
    buzz(15); HWOrders.toast('تم حفظ أجرة ' + HWOrders.shortNo(o));
    const next = unpricedList()[0];
    if (next) setTimeout(() => openFee(next.id), 250); else closeOrderSheet();
}
/* الوجهة من قائمة أسعار المطعم: تحدد المنطقة والأجرة معًا */
function feeFromList(id) {
    const o = HWOrders.get(id); if (!o) return;
    HWDest.open({ sid: o.storeId || '', sub: HWOrders.shortNo(o) + ' · ' + (o.storeName || ''), title: 'وجهة الطلب', allowNone: false, onPick: (a) => { if (a) applyFeeDest(id, a); } });
}
function applyFeeDest(id, a) {
    const o = HWOrders.get(id); if (!o || !a) return;
    HWOrders.update(id, { to: a.n, price: Number(a.fee).toFixed(2), unpriced: false, capDest: null, pricedBy: actorName(), pricedAt: Date.now() }, 'priced');
    logAct('price', 'وجهة وأجرة ' + o.code + ': ' + a.n + ' · ' + Number(a.fee).toFixed(2) + ' د.أ');
    buzz(15); HWOrders.toast('تم: ' + a.n + ' · ' + Number(a.fee).toFixed(2) + ' د.أ');
    const next = unpricedList()[0]; if (next) setTimeout(() => openFee(next.id), 250); else closeOrderSheet();
}
function openPricing() { const l = unpricedList(); if (l.length) openFee(l[0].id); }
function actionsFor(o) {
    const id = HWOrders.esc(o.id), fb = needsFee(o) ? '<button type="button" class="btn-s warn" data-act="fee" data-id="' + id + '">حدّد الأجرة</button>' : '';
    const a = actionsFor0(o, id); return fb + a;
}
function actionsFor0(o, id) {
    if (o.status === 'new') return '<button type="button" class="btn-s" data-act="assign" data-id="' + id + '">تعيين كابتن</button><button type="button" class="btn-s ' + (o.urgent ? 'warn' : 'alt') + '" data-act="urgent" data-id="' + id + '">' + (o.urgent ? 'عاجل ✓' : 'عاجل') + '</button><button type="button" class="btn-s dng" data-act="cancel" data-id="' + id + '">إلغاء</button>';
    /* الطلبات اليدوية وطلبات المتاجر تُلغى حتى بعد إسنادها لكابتن، ويصله تنبيه فوري */
    const cx = !HWOrders.isMarket(o) ? '<button type="button" class="btn-s dng" data-act="cancel" data-id="' + id + '">إلغاء</button>' : '';
    if (o.status === 'accepted') return '<button type="button" class="btn-s" data-act="picked" data-id="' + id + '">تم الاستلام من المتجر</button><button type="button" class="btn-s alt" data-act="assign" data-id="' + id + '">تغيير الكابتن</button>' + cx;
    if (o.status === 'picked') return '<button type="button" class="btn-s" data-act="delivered" data-id="' + id + '">تم التسليم</button>' + cx;
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

function doneAt(o) { const h = (o.history || []).filter(x => x.s === 'delivered').pop(); return h ? h.t : o.status === 'delivered' ? o.updatedAt : 0; }
setInterval(() => { if (!document.hidden && document.querySelector('#screen-board.active')) renderBoard(); }, 30000);
function renderBoard() {
    const st = HWOrders.stats(allOrders), act = allOrders.filter(HWOrders.isActive), running = st.active - st.fresh;
    const fresh = allOrders.filter(o => o.status === 'new');
    const badge = document.getElementById('tabBadge');
    if (badge) { badge.textContent = fresh.length; badge.classList.toggle('on', fresh.length > 0); }

    /* الأرقام في صفحة الإحصائيات (بلا تكرار هنا): هذه الصفحة للعمل على الطلبات فقط */
    const bs = document.getElementById('bdStats'); if (bs) { bs.innerHTML = ''; bs.hidden = true; }
    document.querySelectorAll('#bdSeg button').forEach(b => {
        const f = b.dataset.f, n = applyFilter(allOrders, f).length;
        b.classList.toggle('on', f === bdFilter);
        b.innerHTML = b.textContent.replace(/\d+$/, '').trim() + '<i>' + n + '</i>';
    });
    const list = bdFilter === 'live' || bdFilter === 'new' ? HWOrders.prioritySort(applyFilter(allOrders, bdFilter)) : applyFilter(allOrders, bdFilter).sort((a, b) => b.createdAt - a.createdAt);
    const bl = document.getElementById('bdList');
    if (bl) bl.innerHTML = list.length ? list.slice(0, 200).map(o => HWOrders.card(o, actionsFor(o), true)).join('') : '<div class="empty-orders">' + iconBox + 'لا توجد طلبات هنا الآن</div>';
    if (openSheetId) renderSheet(openSheetId);
}

/* تفاصيل الطلب */
function openOrderSheet(id) { openSheetId = id; renderSheet(id); document.getElementById('orderSheet').classList.add('show'); }
function closeOrderSheet() { openSheetId = null; const s = document.getElementById('orderSheet'); if (s) s.classList.remove('show'); }
/* صورة الاستلام تظهر مصغرة داخل تفاصيل الطلب فور وصولها */
const pkCache = {};
function loadPickThumbs() { document.querySelectorAll('[data-pk]').forEach(b => { const id = b.dataset.pk, put = d => { const i = b.querySelector('.pk-img'); if (i && d && d.data) i.style.backgroundImage = 'url(' + d.data + ')'; }; if (pkCache[id]) return put(pkCache[id]); HWBiz.getDoc('pickpic', id).then(d => { if (d) { pkCache[id] = d; put(d); } }); }); }
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
        '<div class="sh-head"><div><small dir="ltr">' + HWOrders.esc(o.code) + '</small><h3>طلب ' + HWOrders.esc(HWOrders.shortNo(o)) + '</h3></div><span class="oc-chip">' + HWOrders.SHORT[o.status] + '</span></div>' +
        '<div class="s-' + o.status + '">' + HWOrders.routeRows(o) + '</div>' +
        HWOrders.timeline(o) + HWOrders.captainRow(o, true) +
        '<div class="sh-rows">' + rows.map(r => '<div><span>' + r[0] + '</span><b>' + HWOrders.esc(r[1]) + '</b></div>').join('') + '</div>' +
        (o.pickPicAt ? '<button type="button" class="pk-thumb" data-pk="' + o.id + '" onclick="showPickPic(\'' + o.id + '\')"><span class="pk-img"></span><span><b>صورة الاستلام من المتجر</b><small>التقطها ' + HWOrders.esc((o.captain || {}).name || 'الكابتن') + ' · ' + HWOrders.fmtTime(o.pickPicAt) + '</small></span></button>' : '') +
        (o.podAt && typeof showPod === 'function' ? '<button type="button" class="ghost-btn wide" style="margin-top:10px" onclick="showPod(\'' + o.id + '\')">صورة إثبات الوصول</button>' : '') +
        (actionsFor(o) ? '<div class="oc-actions" style="margin-top:14px">' + actionsFor(o) + '</div>' : '') +
        '<div class="sh-actions"><button type="button" class="ghost-btn" style="flex:1" onclick="closeOrderSheet()">إغلاق</button></div>';
    body.className = 'modal-card glass s-' + o.status; loadPickThumbs();
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
    document.getElementById('asSummary').innerHTML = '<div class="rt"><i></i><small>الطلب</small><b>' + HWOrders.esc(HWOrders.shortNo(o)) + ' · ' + HWOrders.esc(o.storeName) + '</b></div>' +
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
document.getElementById('assignForm').addEventListener('submit', (e) => { e.preventDefault(); submitAssign(); });
function defaultEta() { const d = new Date(Date.now() + 20 * 60000); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function submitAssign() {
    const o = HWOrders.get(assignId); if (!o) return;
    const name = document.getElementById('asName').value.trim(), eta = document.getElementById('asEta').value || defaultEta(), phone = parsePhone(document.getElementById('asPhone').value);
    const changing = o.captain && o.captain.name && o.captain.name !== name, reason = changing ? document.getElementById('asReason').value : '';
    setInvalid('asNameField', !name); setInvalid('asPhoneField', !phone.ok); setInvalid('asReasonField', changing && !reason);
    if (!name || !phone.ok || (changing && !reason)) return;
    const cd = HWDB.col('captains').list().filter(c => c.name === name)[0];
    const patch = { captain: Object.assign({ name: name, phone: phone.value }, cd ? { id: cd.id, num: cd.num || '', av: cd.av === 'f' ? 'f' : 'm', pv: cd.pv || 0 } : {}), eta: formatTime12h(eta), claimBy: cd ? cd.id : null, offerTo: null, offerAt: 0 };
    if (o.status === 'new') patch.status = 'accepted';
    if (changing) patch.reassigns = (o.reassigns || []).concat([{ from: o.captain.name, to: name, reason, at: Date.now(), by: actorName() }]);
    HWOrders.update(o.id, patch, changing ? 'reassigned' : null);
    logAct(changing ? 'reassign' : 'assign', (changing ? 'نقل الطلب ' + o.code + ' من ' + o.captain.name + ' إلى ' + name + ' — ' + reason : 'إسناد الطلب ' + o.code + ' إلى ' + name));
    closeAssign(); buzz(18); HWOrders.toast('تم تعيين الكابتن ' + name + ' للطلب ' + HWOrders.shortNo(o));
}

/* إجراءات الحالة */
function orderAct(act, id) {
    const o = HWOrders.get(id); if (!o) return;
    if (act === 'assign') return openAssign(id);
    if (act === 'fee') return openFee(id);
    if (act === 'urgent') { HWOrders.update(id, { urgent: !o.urgent, offerTo: null, offerAt: 0 }, o.urgent ? null : 'urgent'); logAct('urgent', (o.urgent ? 'إلغاء أولوية ' : 'أولوية عاجلة للطلب ') + o.code); HWOrders.toast(o.urgent ? 'أُلغيت الأولوية' : 'الطلب عاجل: يتقدم على كل الطلبات'); if (openSheetId === id) renderSheet(id); return; }
    if (act === 'cancel') {
        const why = prompt('سبب إلغاء الطلب ' + HWOrders.shortNo(o) + (o.captain && o.captain.name ? ' (مع الكابتن ' + o.captain.name + ')' : '') + ':', 'طلب العميل'); if (why === null) return;
        HWOrders.update(id, { status: 'cancelled', cancelledAfter: o.status !== 'new' ? o.status : null, cancelReason: 'ألغت الإدارة الطلب' + (why ? ' (' + why + ')' : '') }); logAct('cancel', 'إلغاء الطلب ' + o.code + (why ? ' — ' + why : '')); closeOrderSheet(); HWOrders.toast('تم إلغاء الطلب ' + HWOrders.shortNo(o)); return;
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
