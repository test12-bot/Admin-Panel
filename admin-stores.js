/* =========================================================
   Admin Panel — admin-stores.js
   الإدارة تتحكم بالمتاجر بالكامل، وكل تعديل يتم بالقلم من ورقة المتجر:
   1) البيانات وحساب الدخول، الشعار والغلاف، الموقع على الخريطة
   2) أسعار التوصيل الخاصة بالمتجر (تُنسخ من القائمة الأساسية عند إضافته) وطباعتها بقالب HIGHWAY
   3) المنيو: نفس محرر المطعم (hw-menued.js)
   4) الفتح والإغلاق والإيقاف المؤقت وإيقاف الحساب
   يعتمد على: hw-biz.js, hw-prices.js, hw-pricelist.js, admin.js
   ========================================================= */
const menusColA = HWDB.col('menus');
const PEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>';
let mStore = '', plFor = '_base', plRegion = 'salt', plDraft = null;
function storesAll() { return HWBiz.storeList(true); }
function storeName(id) { const s = HWBiz.storeById(id); return s ? s.name : id; }
function hasLoc(sid) { const st = stCol.get(sid) || {}; return st.lat != null; }

/* ---------- قائمة المتاجر ---------- */
function mgStores() {
    const list = storesAll();
    return '<button type="button" class="submit-btn mg-add" onclick="openStoreForm(null)"><span class="btn-label">+ متجر جديد</span></button>' +
        (list.length ? '' : '<div class="empty-orders">لا توجد متاجر بعد. أضف أول متجر ثم حدّد موقعه وأسعاره ومنيوه</div>') +
        list.map(s => {
            const st = stCol.get(s.id) || {}, ss = HWBiz.storeStatus(st), items = (menusColA.get(s.id) || { cats: [] }).cats.reduce((n, c) => n + c.items.length, 0);
            const warn = !hasLoc(s.id) ? 'بلا موقع على الخريطة' : !items ? 'بلا منيو' : '';
            return '<button type="button" class="mg-card st-row' + (s.active === false ? ' off' : '') + '" onclick="openStoreAdm(\'' + s.id + '\')"><div class="mg-top"><img src="' + AE(HWBiz.logo(s.id)) + '" alt=""><div><b>' + AE(s.name) + '</b><small>' + AE(s.cat || '') + ' · ' +
                (s.active === false ? 'الحساب موقوف' : ss.open ? 'مفتوح' : AE(ss.label || 'مغلق')) + ' · ' + items + ' صنف</small>' + (warn ? '<em class="st-warn">' + warn + '</em>' : '') + '</div>' +
                '<i class="er-pen">' + PEN + '</i></div></button>';
        }).join('');
}

/* ---------- ورقة المتجر: كل سطر يُعدَّل بالقلم ---------- */
function erRow(k, v, on, cls) { return '<button type="button" class="er' + (cls ? ' ' + cls : '') + '" onclick="' + on + '"><span class="er-k">' + k + '</span><span class="er-v">' + v + '</span><i class="er-pen">' + PEN + '</i></button>'; }
function swRow(k, sub, on, click) { return '<div class="er sw-row"><span class="er-k">' + k + (sub ? '<small>' + sub + '</small>' : '') + '</span><button type="button" class="sw' + (on ? ' on' : '') + '" onclick="' + click + '" aria-label="' + k + '"></button></div>'; }
function openStoreAdm(sid) {
    const s = HWBiz.storeById(sid); if (!s) return;
    const st = stCol.get(sid) || {}, ss = HWBiz.storeStatus(st), cover = HWBiz.cover(sid), items = (menusColA.get(sid) || { cats: [] }).cats.reduce((n, c) => n + c.items.length, 0);
    const pr = HWBiz.priceList(sid, 'salt').length + HWBiz.priceList(sid, 'amman').length, own = !!HWBiz.priceCol.get(sid);
    admEdit = sid;
    admSheet(aHead('المتاجر', AE(s.name)) +
        '<div class="st-media"><button type="button" class="cov-prev ed" onclick="mediaMenu(\'cover\')" aria-label="تعديل الغلاف">' + (cover ? '<img src="' + AE(cover) + '" alt="">' : '<span>بدون صورة غلاف: اضغط لإضافتها</span>') + '<i class="ed-pen">' + PEN + '</i></button>' +
        '<button type="button" class="st-logo-btn" onclick="mediaMenu(\'logo\')" aria-label="تعديل الشعار"><img class="st-logo" src="' + AE(HWBiz.logo(sid)) + '" alt=""><i class="ed-pen">' + PEN + '</i></button></div>' +
        '<div class="er-list">' +
        erRow('الاسم والقسم', AE(s.name) + ' · ' + AE(s.cat || '—'), "openStoreForm('" + sid + "','sfN')") +
        erRow('رقم المتجر', s.phone ? '<bdi dir="ltr">' + AE(s.phone) + '</bdi>' : 'غير مضاف', "openStoreForm('" + sid + "','sfPh')", s.phone ? '' : 'warn') +
        erRow('العنوان', AE(s.addr || 'غير مضاف'), "openStoreForm('" + sid + "','sfA')", s.addr ? '' : 'warn') +
        erRow('الموقع على الخريطة', st.lat != null ? 'محدد' : 'غير محدد: الكابتن لن يرى مكان المتجر', "openStoreLocA('" + sid + "')", st.lat != null ? '' : 'warn') +
        erRow('أسعار التوصيل', '<bdi>' + pr + '</bdi> <span>منطقة</span>' + (own ? '' : ' <span>من القائمة الأساسية</span>'), "openStorePrices('" + sid + "')") +
        erRow('المنيو', items ? '<bdi>' + items + '</bdi> <span>صنف</span>' : 'لا توجد أصناف بعد', "openMenuAdm('" + sid + "')", items ? '' : 'warn') +
        erRow('التوصيل', 'حتى ' + (s.maxKm || HW_CONFIG.maxKm || 12) + ' كم · الحد الأدنى ' + AM(s.minOrder || 0) + ' د.أ', "openStoreForm('" + sid + "','sfKm')") +
        erRow('حساب الدخول', '<bdi dir="ltr">' + AE(s.user || '—') + '</bdi>', "openStoreForm('" + sid + "','sfU')") +
        '</div><div class="er-list">' +
        swRow('المتجر مفتوح', s.active === false ? 'الحساب موقوف' : ss.open ? 'يستقبل الطلبات الآن' : AE(ss.label || 'مغلق'), st.open !== false, "storeOpen('" + sid + "'," + (st.open === false) + ")") +
        swRow('إيقاف مؤقت', ss.paused ? AE(ss.label) : 'يوقف الطلبات 30 دقيقة', !!ss.paused, "storePause('" + sid + "'," + (ss.paused ? 0 : 30) + ")") +
        swRow('الحساب مفعّل', 'عند الإيقاف يختفي من تطبيق العملاء', s.active !== false, "storeAcct('" + sid + "'," + (s.active === false) + ")") +
        '</div>' +
        '<button type="button" class="submit-btn" onclick="HWPriceList.open(\'' + sid + '\')"><span class="btn-label">طباعة قائمة الأسعار</span></button>' +
        '<button type="button" class="er-del" onclick="deleteStore(\'' + sid + '\')">حذف المتجر</button>');
}
function storeOpen(sid, v) { stCol.patch(sid, { open: v, pausedUntil: 0 }, true); logAct('store', (v ? 'فتح ' : 'إغلاق ') + storeName(sid)); openStoreAdm(sid); }
function storePause(sid, m) { stCol.patch(sid, { pausedUntil: m ? Date.now() + m * 60000 : 0 }, true); logAct('store', m ? 'إيقاف ' + storeName(sid) + ' مؤقتًا ' + m + ' د' : 'إلغاء إيقاف ' + storeName(sid)); openStoreAdm(sid); }
function storeAcct(sid, v) {
    if (!v && !confirm('إيقاف حساب ' + storeName(sid) + '؟ يختفي من تطبيق العملاء ولا يستطيع الدخول لتطبيقه.')) return;
    HWBiz.storesCol.patch(sid, { active: v }); logAct('store', (v ? 'تفعيل حساب ' : 'إيقاف حساب ') + storeName(sid)); openStoreAdm(sid);
}
function deleteStore(sid) {
    const n = storeName(sid);
    if (!confirm('حذف ' + n + ' نهائيًا مع المنيو والصور والأسعار؟ الطلبات السابقة تبقى في السجل.') || prompt('للتأكيد اكتب اسم المتجر:', '') !== n) { HWOrders.toast('لم يُحذف المتجر'); return; }
    HWBiz.storesCol.remove(sid); menusColA.remove(sid); stCol.remove(sid); HWBiz.priceCol.remove(sid); HWBiz.saveMedia(sid, { logo: '', cover: '' });
    logAct('store', 'حذف المتجر ' + n); closeAdm(); renderManage();
}

/* ---------- بيانات المتجر وحساب دخوله (نفس النموذج للإضافة والتعديل) ---------- */
function openStoreForm(sid, focus) {
    const s = sid ? HWBiz.storeById(sid) : { name: '', cat: '', user: '' }, cats = [...new Set(storesAll().map(x => x.cat).filter(Boolean))];
    admEdit = sid;
    admSheet(aHead('المتاجر', sid ? 'بيانات المتجر' : 'متجر جديد') +
        '<div class="two">' + fld('sfN', 'اسم المتجر', s.name) + fld('sfC', 'القسم', s.cat, 'list="sfCats" placeholder="مثال: مطاعم"') + '</div><datalist id="sfCats">' + cats.map(c => '<option value="' + AE(c) + '">').join('') + '</datalist>' +
        '<div class="two">' + fld('sfPh', 'رقم المتجر', s.phone || '', 'type="tel" dir="ltr" inputmode="tel" placeholder="07XXXXXXXX"') + fld('sfA', 'العنوان', s.addr || '', 'placeholder="مثال: السرو، طريق السلط"') + '</div>' +
        '<div class="two">' + fld('sfKm', 'أقصى مسافة توصيل (كم)', s.maxKm || HW_CONFIG.maxKm || 12, 'type="number" min="1" max="60" step="0.5" inputmode="decimal"') + fld('sfMin', 'الحد الأدنى للطلب (د.أ)', s.minOrder != null ? s.minOrder : (HW_CONFIG.minOrder || 0), 'type="number" min="0" max="50" step="0.5" inputmode="decimal"') + '</div>' +
        '<h4 class="adm-sub">حساب الدخول لتطبيق المتجر</h4>' + '<div class="two">' + fld('sfU', 'اسم المستخدم (إنجليزي)', s.user, 'dir="ltr" autocapitalize="off" autocomplete="off"') +
        fld('sfP', 'كلمة المرور' + (sid ? ' <span class="opt">(اتركها فارغة لعدم التغيير)</span>' : ''), '', 'type="text" dir="ltr" autocomplete="off"') + '</div>' +
        (sid ? '' : '<p class="mut mg-note">أسعار التوصيل تُنسخ من القائمة الأساسية، وتستطيع تعديلها للمتجر بعد إضافته</p>') +
        '<div class="btn-row"><button type="button" class="submit-btn" onclick="saveStoreForm()"><span class="btn-label">' + (sid ? 'حفظ' : 'إضافة المتجر') + '</span></button></div>');
    if (focus) setTimeout(() => { const e = A$(focus); if (e) { e.focus(); e.select && e.select(); } }, 320);
}
function saveStoreForm() {
    const name = A$('sfN').value.trim(), cat = A$('sfC').value.trim(), user = normUser(A$('sfU').value), pass = A$('sfP').value.trim();
    if (!name || !cat) { HWOrders.toast('أدخل اسم المتجر وقسمه'); return; }
    if (user.length < 3) { HWOrders.toast('اسم المستخدم 3 أحرف إنجليزية على الأقل'); return; }
    if (storesAll().some(x => x.id !== admEdit && (normUser(x.user) === user || (x.alias || []).indexOf(user) >= 0)) || allUsers().some(u => u.names.includes(user))) { HWOrders.toast('اسم المستخدم مستخدم'); return; }
    if (!admEdit && pass.length < 6) { HWOrders.toast('كلمة المرور 6 أحرف على الأقل'); return; }
    if (pass && pass.length < 6) { HWOrders.toast('كلمة المرور 6 أحرف على الأقل'); return; }
    const id = admEdit || (user.replace(/[^a-z0-9]/g, '').slice(0, 20) || 's') + (HWBiz.storeById(user) ? Date.now().toString(36).slice(-3) : '');
    const phone = A$('sfPh').value.replace(/[^\d+]/g, ''), addr = A$('sfA').value.trim();
    if (phone && !/^(\+?962|0)\d{8,9}$/.test(phone)) { HWOrders.toast('رقم المتجر غير صحيح'); return; }
    const maxKm = Math.max(1, Math.min(60, parseFloat(A$('sfKm').value) || HW_CONFIG.maxKm || 12)), minOrder = Math.max(0, Math.min(50, parseFloat(A$('sfMin').value) || 0));
    const rec = { name, cat, user, phone, addr, maxKm, minOrder };
    if (pass) rec.hash = sha256('HIGHWAY|' + id + '|' + pass);
    if (admEdit) HWBiz.storesCol.patch(id, rec);
    else { HWBiz.storesCol.create(Object.assign({ id, active: true, sort: storesAll().length }, rec)); HWBiz.copyBasePrices(id); }
    logAct('store', (admEdit ? 'تعديل بيانات ' : 'إضافة متجر جديد: ') + name + (pass ? ' (كلمة مرور جديدة)' : ''));
    HWOrders.toast(admEdit ? 'تم الحفظ' : 'تمت إضافة المتجر، حدّد موقعه وأضف شعاره ومنيوه'); openStoreAdm(id); renderManage();
}

/* ---------- الشعار والغلاف ---------- */
function uploadImg(file, kind) { if (!file) return; HWOrders.toast('جاري تجهيز الصورة…'); cropImg(file, kind); }
/* قص الشعار (دائري) والغلاف قبل الحفظ: تحريك وتكبير حتى تظهر كما نريد */
function cropImg(src, kind) {
    const lg = kind === 'logo';
    HWCrop.open(src, { w: lg ? 320 : 1200, h: lg ? 320 : 600, round: lg, title: lg ? 'اضبط الشعار' : 'اضبط صورة الغلاف', quality: lg ? .88 : .8 })
        .then(d => { if (d) setImg(kind, d); }).catch(() => HWOrders.toast('تعذرت قراءة الصورة'));
}
/* قائمة صغيرة لكل صورة: تغيير / تعديل الموضع / حذف */
function mediaMenu(kind) {
    const sid = admEdit, has = kind === 'logo' || !!HWBiz.cover(sid);   // الشعار موجود دائمًا (أو الافتراضي)
    let m = document.getElementById('mediaAct'); if (m) m.remove();
    m = document.createElement('div'); m.id = 'mediaAct'; m.className = 'mact';
    m.innerHTML = '<div class="mact-card"><b>' + (kind === 'logo' ? 'شعار المتجر' : 'صورة الغلاف') + '</b>' +
        '<label class="mact-it">' + (has ? 'تغيير الصورة' : 'إضافة صورة') + '<input type="file" accept="image/*" onchange="document.getElementById(\'mediaAct\').remove();uploadImg(this.files[0],\'' + kind + '\')"></label>' +
        (has ? '<button type="button" class="mact-it" onclick="document.getElementById(\'mediaAct\').remove();adjustImg(\'' + kind + '\')">تعديل الموضع</button>' : '') +
        (has ? '<button type="button" class="mact-it dng" onclick="document.getElementById(\'mediaAct\').remove();if(confirm(\'حذف الصورة؟\'))setImg(\'' + kind + '\',\'\')">حذف</button>' : '') +
        '<button type="button" class="mact-it x" onclick="document.getElementById(\'mediaAct\').remove()">إلغاء</button></div>';
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    document.body.appendChild(m); requestAnimationFrame(() => m.classList.add('show'));
}
function adjustImg(kind) { const sid = admEdit, src = kind === 'logo' ? HWBiz.logo(sid) : HWBiz.cover(sid); if (src) cropImg(src, kind); }
function setImg(kind, data) {
    const sid = admEdit, p = {}; p[kind] = data;
    HWBiz.saveMedia(sid, p).then(() => { logAct('store', (data ? 'تحديث ' : 'إزالة ') + (kind === 'logo' ? 'شعار ' : 'غلاف ') + storeName(sid)); HWOrders.toast('تم الحفظ'); openStoreAdm(sid); renderManage(); });
}
/* ---------- موقع المتجر (خريطة + دبوس في المنتصف) ---------- */
let locMapA = null, locPickA = null;
function openStoreLocA(sid) {
    admEdit = sid; closeAdm();
    let m = A$('amLoc');
    if (!m) {
        m = document.createElement('div'); m.id = 'amLoc'; m.className = 'am-loc';
        m.innerHTML = '<div class="lmap" id="amLocMap"></div><div class="am-pin"><svg viewBox="0 0 48 58"><path d="M24 56C24 56 4 36 4 22a20 20 0 0 1 40 0c0 14-20 34-20 34Z" fill="#0E3A3B"/><circle cx="24" cy="22" r="9" fill="#E8EF44"/></svg></div>' +
            '<div class="am-loc-top"><button type="button" class="ghost-btn" onclick="closeLocA()">إلغاء</button><b id="amLocName"></b></div>' +
            '<div class="am-loc-paste"><input id="amLocIn" dir="ltr" placeholder="الصق الإحداثيات أو رابط Google Maps" autocomplete="off"><button type="button" class="ghost-btn" onclick="pasteLocA()">انتقال</button></div>' +
            '<div class="am-loc-bar"><small id="amLocAddr">حرّك الخريطة لوضع الدبوس على باب المتجر</small><button type="button" class="submit-btn" onclick="saveLocA()"><span class="btn-label">حفظ الموقع</span></button></div>';
        document.body.appendChild(m);
    }
    A$('amLocName').textContent = storeName(sid); m.classList.add('show');
    const st = stCol.get(sid) || {}, c = st.lat != null ? [st.lat, st.lng] : HWMap.center();
    if (!locMapA) { locMapA = HWMap.create(A$('amLocMap'), { center: c, zoom: 17 }); locMapA.on('moveend', () => { const p = locMapA.getCenter(); locPickA = [p.lat, p.lng]; }); }
    setTimeout(() => { locMapA.invalidateSize(); locMapA.setView(c, 17, { animate: false }); locPickA = c; }, 80);
}
/* يقبل: "32.04, 35.73" أو رابط Google Maps كامل (@lat,lng أو q=lat,lng أو !3dlat!4dlng) */
function parseLoc(t) {
    t = decodeURIComponent(String(t || '')).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    const ok = (a, b) => { a = +a; b = +b; return isFinite(a) && isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180 && (a || b) ? [a, b] : null; };
    let m = t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || t.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || t.match(/[?&](?:q|query|ll|destination|center)=(-?\d+\.\d+)[, +]+(-?\d+\.\d+)/) || t.match(/^\s*\(?(-?\d{1,2}\.\d+)\s*[,،\s]\s*(-?\d{1,3}\.\d+)\)?\s*$/);
    return m ? ok(m[1], m[2]) : null;
}
function pasteLocA() {
    const t = A$('amLocIn').value.trim(); if (!t) return;
    const c = parseLoc(t);
    if (!c) { HWOrders.toast(/goo\.gl|maps\.app/.test(t) ? 'الرابط المختصر لا يحتوي الإحداثيات: في Google Maps اضغط مطولًا على مكان المتجر وانسخ الأرقام التي تظهر' : 'لم أتعرف على الموقع، الصق الإحداثيات مثل: 32.0453, 35.7271'); return; }
    locMapA.setView(c, 18, { animate: false }); locPickA = c; HWOrders.toast('تم وضع الدبوس، تأكد منه ثم اضغط حفظ الموقع');
}
function closeLocA() { A$('amLoc').classList.remove('show'); openStoreAdm(admEdit); }
function saveLocA() {
    if (!locPickA) return;
    stCol.patch(admEdit, { lat: +locPickA[0].toFixed(6), lng: +locPickA[1].toFixed(6) }, true);
    logAct('store', 'تحديد موقع ' + storeName(admEdit)); HWOrders.toast('تم حفظ الموقع'); closeLocA();
}

/* =========================================================
   المنيو (شاشة كاملة) — نفس المحرر المشترك hw-menued.js الذي يستخدمه المطعم
   ========================================================= */
function openMenuAdm(sid) { mStore = sid; closeAdm(); goTo('screen-menuadm'); renderMenuAdm(); }
function renderMenuAdm() {
    if (!mStore) return;
    A$('menuAdmTitle').textContent = 'منيو ' + storeName(mStore);
    HWMenuEd.render(A$('menuAdmBody'), mStore, { onLog: (t) => logAct('store', t + ' — ' + storeName(mStore)) });
}

/* =========================================================
   أسعار التوصيل
   - لكل متجر قائمته (pricelists/<id>) تُعدَّل من ورقة المتجر ← أسعار التوصيل
   - القائمة الأساسية (pricelists/_base، أصلها قائمة السرو) تُنسخ لكل متجر جديد: الإدارة ← أسعار التوصيل
   ========================================================= */
function plTitle() { return plFor === '_base' ? 'القائمة الأساسية' : storeName(plFor); }
function plEditor() {
    if (!plDraft) plDraft = JSON.parse(JSON.stringify(plFor === '_base' ? HWBiz.basePrices()[plRegion] : HWBiz.priceList(plFor, plRegion)));
    const custom = plFor === '_base' ? !!HWBiz.priceCol.get('_base') : !!HWBiz.priceCol.get(plFor);
    return '<p class="mut mg-note">' + (plFor === '_base' ? 'تُنسخ هذه الأسعار لكل متجر جديد عند إضافته، ثم تُعدَّل لكل متجر وحده من ورقته.' : 'أسعار هذا المتجر فقط، وتظهر في تطبيقه وفي قائمة الأسعار المطبوعة.') + ' اكتب السعر هكذا: 2.50 أو 2.00 - 2.50</p>' +
        '<div class="seg">' + [['salt', 'مناطق السلط'], ['amman', 'مناطق عمان']].map(r => '<button type="button" class="' + (plRegion === r[0] ? 'on' : '') + '" onclick="plSwitch(\'' + r[0] + '\')">' + r[1] + '</button>').join('') + '</div>' +
        '<div class="pl-list">' + plDraft.map((r, i) => '<div class="pl-row"><input value="' + AE(r.n) + '" data-pl="n" data-i="' + i + '" aria-label="المنطقة"><input value="' + AE(r.p) + '" data-pl="p" data-i="' + i + '" dir="ltr" inputmode="decimal" aria-label="السعر"><button type="button" class="pl-x" onclick="plDel(' + i + ')" aria-label="حذف">×</button></div>').join('') + '</div>' +
        '<button type="button" class="more-link" onclick="plAdd()">+ منطقة جديدة</button>' +
        '<div class="btn-row" style="margin-top:12px">' + (custom ? '<button type="button" class="ghost-btn" onclick="plReset()">' + (plFor === '_base' ? 'أسعار السرو الأصلية' : 'نسخ القائمة الأساسية') + '</button>' : '') + '<button type="button" class="submit-btn" onclick="plSave()"><span class="btn-label">حفظ الأسعار</span></button></div>';
}
function mgPrices() { if (plFor !== '_base') { plFor = '_base'; plDraft = null; } return plEditor(); }
function openStorePrices(sid) { plFor = sid; plRegion = 'salt'; plDraft = null; plShow(); }
function plShow() { if (plFor === '_base') renderManage(); else admSheet(aHead('أسعار التوصيل', AE(plTitle())) + plEditor() + '<button type="button" class="er-del back" onclick="plFor=\'_base\';plDraft=null;openStoreAdm(admEdit)">رجوع للمتجر</button>'); }
function plRead() { document.querySelectorAll('.pl-row input').forEach(el => { const r = plDraft[+el.dataset.i]; if (r) r[el.dataset.pl] = el.value.trim(); }); }
function plSwitch(r) { plRegion = r; plDraft = null; plShow(); }
function plAdd() { plRead(); plDraft.push({ n: '', p: '' }); plShow(); setTimeout(() => { const l = document.querySelectorAll('.pl-row input[data-pl="n"]'); if (l.length) l[l.length - 1].focus(); }, 50); }
function plDel(i) { plRead(); plDraft.splice(i, 1); plShow(); }
function plDoc() {
    const cur = HWBiz.priceCol.get(plFor), doc = cur ? Object.assign({}, cur) : (plFor === '_base' ? {} : HWBiz.basePrices());
    delete doc.id; delete doc.createdAt; delete doc.updatedAt; return doc;
}
function plSave() {
    plRead();
    const rows = plDraft.filter(r => r.n && /\d/.test(r.p)).map(r => ({ n: r.n, p: r.p.replace(/[^\d.\s-]/g, '').replace(/\s*-\s*/, ' - ').trim() }));
    const doc = plDoc(); doc[plRegion] = rows; HWBiz.priceCol.replace(plFor, doc);
    logAct('store', 'تعديل أسعار التوصيل: ' + plTitle() + ' ← ' + (plRegion === 'salt' ? 'السلط' : 'عمان')); plDraft = null; HWOrders.toast('تم حفظ الأسعار'); plShow();
}
function plReset() {
    if (plFor === '_base') { if (!confirm('الرجوع لأسعار السرو الأصلية في القائمة الأساسية؟')) return; HWBiz.priceCol.remove('_base'); }
    else { if (!confirm('استبدال أسعار ' + storeName(plFor) + ' بالقائمة الأساسية؟')) return; HWBiz.copyBasePrices(plFor); }
    plDraft = null; logAct('store', 'إرجاع أسعار ' + plTitle()); plShow();
}

/* ---------- ربط ---------- */
Object.assign(TAB_OF, { 'screen-menuadm': 'manage' });
(function () { const _g = window.goTo; window.goTo = function (id) { _g(id); if (id === 'screen-menuadm') renderMenuAdm(); }; })();
menusColA.subscribe(() => { if (scr() === 'screen-manage' && mgTab === 'stores') renderManage(); });
HWBiz.storesCol.subscribe(() => { if (scr() === 'screen-manage' && mgTab !== 'prices') renderManage(); });
HWBiz.onMedia(() => { if (scr() === 'screen-manage') renderManage(); });
HWBiz.priceCol.subscribe(() => { if (scr() === 'screen-manage' && mgTab === 'prices' && !plDraft) renderManage(); });
