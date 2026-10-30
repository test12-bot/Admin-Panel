/* =========================================================
   Admin Panel — admin-stores.js
   الإدارة تتحكم بالمتاجر بالكامل:
   1) إضافة متجر وحساب دخوله (اسم المستخدم وكلمة المرور) وإيقافه أو حذفه
   2) الشعار وصورة الغلاف وملف PDF لقائمة أسعار التوصيل
   3) موقع المتجر على الخريطة، الفتح والإغلاق والإيقاف المؤقت
   4) المنيو كاملًا: الأقسام والأصناف والأسعار والخيارات ووقت التحضير
      (المتجر يتحكم فقط بالتوفر اليومي من تطبيقه)
   5) أسعار التوصيل في قوائم الأسعار (السرو / أم النعاج — السلط / عمان)
   يعتمد على: hw-biz.js, hw-prices.js, admin.js
   ========================================================= */
const menusColA = HWDB.col('menus'), START_LBL = { sarou: 'السرو', umm_naaj: 'أم النعاج' };
let mStore = '', mCat = null, mItem = null, mOpts = [], plStart = 'sarou', plRegion = 'salt', plDraft = null;
function storesAll() { return HWBiz.storeList(true); }
function storeName(id) { const s = HWBiz.storeById(id); return s ? s.name : id; }

/* ---------- نقل المتاجر الحالية إلى قاعدة البيانات (مرة واحدة، بنفس كلمات المرور) ---------- */
const LEGACY = {
    nafeeseh: ['nafeesehsweets', 'fbe733c4098d707c547159a094e0dd8c19ff4ee2e291c1b151375562dd6d8495', 'highway-price-list-nafeeseh-sweets.pdf'],
    hamada: ['hamada', '296697541a161e1ef9b430de8ef2f99e03fccf730f011c243aa48593f3fbb81d', 'highway-price-list-hamada.pdf', ['hamadarestaurant']],
    bullgurz: ['bullgurz', '7b40402d842b747ece3a432b164f727a2ffc060e9ed45a2a082953e68408ba2c', 'highway-price-list-bullgurz.pdf'],
    abuahmad: ['abuahamdalnsourresturantformansaf', '1c41b5af77c79558c0a85b8ed1e399b7abbed3a98bdf2374ed1bd06f6fe3e420', 'highway-price-list-abu-ahmad-nsour.pdf', ['abuahmadalnsourrestaurantformansaf']],
    reef: ['alreefshawarma', 'dd7d8c10d09c8060c1204030ddc8e50c846cef42caf3d423f3cb733b32299115', 'highway-price-list-al-reef-shawarma.pdf'],
    abusaleh: ['abusalehcoffee', 'cff730ea7641b04c3f370e41c06d80c3312d9a4b9d339142e7b0e789907e07d0', 'highway-price-list-abu-saleh-coffee.pdf'],
    gulf: ['gulfrestaurant', 'a72741290d3a7e4e653853b2af3d67f2256e19236e85d9d42b6debd829b31306', 'highway-price-list-gulf-restaurant.pdf'],
    julnar: ['julnarpastries', 'cd351c245ecdb1836f396287440277d8452e03e05a14a334f9d9301b46a4410a', 'highway-price-list-julnar-pastries.pdf']
};
let seeded = false;
function seedStores() {
    if (seeded || !currentUser || !HWBiz.storesCol.loaded() || HWBiz.storesCol.list().length) return;
    seeded = true;
    (HW_CONFIG.stores || []).forEach((s, i) => {
        const l = LEGACY[s.id] || [s.id, '', ''];
        HWBiz.storesCol.create({ id: s.id, name: s.name, cat: s.cat, start: s.start || 'sarou', sort: i, user: l[0], alias: l[3] || [], hash: l[1], pdf: l[2], avatar: true, active: true });
    });
    logAct('store', 'نقل المتاجر الحالية إلى لوحة الإدارة');
}
setInterval(seedStores, 3000);

/* ---------- قائمة المتاجر ---------- */
function mgStores() {
    const list = storesAll();
    return '<button type="button" class="submit-btn mg-add" onclick="openStoreForm(null)"><span class="btn-label">+ متجر جديد</span></button>' +
        list.map(s => {
            const st = stCol.get(s.id) || {}, ss = HWBiz.storeStatus(st), r = HWBiz.storeRating(s.id, allOrders), items = (menusColA.get(s.id) || { cats: [] }).cats.reduce((n, c) => n + c.items.length, 0);
            const today = allOrders.filter(o => o.storeId === s.id && HWOrders.isToday(o.createdAt)).length;
            return '<div class="mg-card' + (s.active === false ? ' off' : '') + '"><div class="mg-top"><img src="' + AE(HWBiz.logo(s.id)) + '" alt=""><div><b>' + AE(s.name) + '</b><small>' + AE(s.cat || '') + ' · ' +
                (s.active === false ? 'الحساب موقوف' : ss.open ? 'مفتوح' : AE(ss.label || 'مغلق')) + (r.n ? ' · ★ ' + r.avg.toFixed(1) : '') + ' · ' + items + ' صنف · ' + today + ' طلب اليوم</small></div>' +
                '<button type="button" class="ghost-btn" onclick="openStoreAdm(\'' + s.id + '\')">إدارة</button></div></div>';
        }).join('');
}

/* ---------- ورقة إدارة متجر ---------- */
function openStoreAdm(sid) {
    const s = HWBiz.storeById(sid); if (!s) return;
    const st = stCol.get(sid) || {}, ss = HWBiz.storeStatus(st), cover = HWBiz.cover(sid);
    admEdit = sid;
    admSheet(aHead('المتاجر', AE(s.name)) +
        '<div class="st-media"><div class="cov-prev">' + (cover ? '<img src="' + AE(cover) + '" alt="">' : '<span>بدون صورة غلاف: يظهر رسم القسم للعملاء</span>') + '</div><img class="st-logo" src="' + AE(HWBiz.logo(sid)) + '" alt=""></div>' +
        '<div class="btn-row"><label class="ghost-btn file-btn">الشعار<input type="file" accept="image/*" onchange="uploadImg(this.files[0],\'logo\')"></label><label class="ghost-btn file-btn">صورة الغلاف<input type="file" accept="image/*" onchange="uploadImg(this.files[0],\'cover\')"></label>' + (cover ? '<button type="button" class="ghost-btn" onclick="setImg(\'cover\',\'\')">إزالة الغلاف</button>' : '') + '</div>' +
        '<div class="sh-rows"><div><span>الحالة الآن</span><b>' + (s.active === false ? 'الحساب موقوف' : ss.open ? 'مفتوح' : AE(ss.label || 'مغلق')) + '</b></div><div><span>القسم</span><b>' + AE(s.cat || '—') + '</b></div><div><span>نقطة الانطلاق</span><b>' + (START_LBL[s.start] || '—') + '</b></div>' +
        '<div><span>اسم المستخدم</span><b dir="ltr">' + AE(s.user || '—') + '</b></div><div><span>الموقع</span><b>' + (st.lat != null ? 'محدد ✓' : 'غير محدد') + '</b></div><div><span>قائمة الأسعار PDF</span><b>' + (HWBiz.hasPdf(sid) ? 'مرفوعة ✓' : 'لا يوجد') + '</b></div></div>' +
        '<div class="adm-grid">' +
        '<button type="button" class="ghost-btn" onclick="openMenuAdm(\'' + sid + '\')">المنيو والأسعار</button>' +
        '<button type="button" class="ghost-btn" onclick="openStoreForm(\'' + sid + '\')">البيانات وكلمة المرور</button>' +
        '<button type="button" class="ghost-btn" onclick="openStoreLocA(\'' + sid + '\')">موقع المتجر</button>' +
        '<label class="ghost-btn file-btn">رفع PDF<input type="file" accept="application/pdf" onchange="uploadPdf(this.files[0])"></label>' +
        (HWBiz.hasPdf(sid) ? '<button type="button" class="ghost-btn" onclick="HWBiz.openPdf(\'' + sid + '\')">عرض PDF</button>' : '') +
        '<button type="button" class="ghost-btn" onclick="storeOpen(\'' + sid + '\',' + (st.open === false) + ')">' + (st.open === false ? 'فتح المتجر' : 'إغلاق المتجر') + '</button>' +
        (ss.paused ? '<button type="button" class="ghost-btn" onclick="storePause(\'' + sid + '\',0)">إلغاء الإيقاف المؤقت</button>' : '<button type="button" class="ghost-btn" onclick="storePause(\'' + sid + '\',30)">إيقاف 30 د</button>') +
        '<button type="button" class="ghost-btn' + (s.active === false ? '' : ' dng') + '" onclick="storeAcct(\'' + sid + '\',' + (s.active === false) + ')">' + (s.active === false ? 'تفعيل الحساب' : 'إيقاف الحساب') + '</button>' +
        '<button type="button" class="ghost-btn dng" onclick="deleteStore(\'' + sid + '\')">حذف المتجر</button></div>');
}
function storeOpen(sid, v) { stCol.patch(sid, { open: v, pausedUntil: 0 }, true); logAct('store', (v ? 'فتح ' : 'إغلاق ') + storeName(sid)); openStoreAdm(sid); }
function storePause(sid, m) { stCol.patch(sid, { pausedUntil: m ? Date.now() + m * 60000 : 0 }, true); logAct('store', m ? 'إيقاف ' + storeName(sid) + ' مؤقتًا ' + m + ' د' : 'إلغاء إيقاف ' + storeName(sid)); openStoreAdm(sid); }
function storeAcct(sid, v) {
    if (!v && !confirm('إيقاف حساب ' + storeName(sid) + '؟ يختفي من تطبيق العملاء ولا يستطيع الدخول لتطبيقه.')) return;
    ensureDoc(sid); HWBiz.storesCol.patch(sid, { active: v }); logAct('store', (v ? 'تفعيل حساب ' : 'إيقاف حساب ') + storeName(sid)); openStoreAdm(sid);
}
function deleteStore(sid) {
    const n = storeName(sid);
    if (!confirm('حذف ' + n + ' نهائيًا مع المنيو والصور؟ الطلبات السابقة تبقى في السجل.') || prompt('للتأكيد اكتب اسم المتجر:', '') !== n) { HWOrders.toast('لم يُحذف المتجر'); return; }
    HWBiz.storesCol.remove(sid); menusColA.remove(sid); stCol.remove(sid); HWBiz.saveMedia(sid, { logo: '', cover: '' }); HWBiz.savePdf(sid, null);
    logAct('store', 'حذف المتجر ' + n); closeAdm(); renderManage();
}
/* قبل أول تعديل: المتجر القديم (من hw-config) يُنسخ لقاعدة البيانات */
function ensureDoc(sid) { if (!HWBiz.storesCol.get(sid)) { const s = HWBiz.storeById(sid); if (s) HWBiz.storesCol.create(Object.assign({}, s, { legacy: undefined })); } }

/* ---------- إضافة / تعديل بيانات المتجر وحساب دخوله ---------- */
function openStoreForm(sid) {
    const s = sid ? HWBiz.storeById(sid) : { name: '', cat: '', start: 'sarou', user: '' }, cats = [...new Set(storesAll().map(x => x.cat).filter(Boolean))];
    admEdit = sid;
    admSheet(aHead('المتاجر', sid ? 'بيانات المتجر' : 'متجر جديد') + fld('sfN', 'اسم المتجر', s.name) +
        '<div class="two">' + fld('sfC', 'القسم', s.cat, 'list="sfCats" placeholder="مثال: مطاعم"') + '<datalist id="sfCats">' + cats.map(c => '<option value="' + AE(c) + '">').join('') + '</datalist>' +
        '<div class="field"><label for="sfS">نقطة الانطلاق (قائمة الأسعار)</label><select id="sfS">' + Object.keys(START_LBL).map(k => '<option value="' + k + '"' + (s.start === k ? ' selected' : '') + '>' + START_LBL[k] + '</option>').join('') + '</select></div></div>' +
        '<h4 class="adm-sub">حساب الدخول لتطبيق المتجر</h4>' + fld('sfU', 'اسم المستخدم (إنجليزي)', s.user, 'dir="ltr" autocapitalize="off" autocomplete="off"') +
        fld('sfP', 'كلمة المرور' + (sid ? ' <span class="opt">(اتركها فارغة لعدم التغيير)</span>' : ''), '', 'type="text" dir="ltr" autocomplete="off"') +
        '<div class="btn-row"><button type="button" class="submit-btn" onclick="saveStoreForm()"><span class="btn-label">' + (sid ? 'حفظ' : 'إضافة المتجر') + '</span></button></div>');
}
function saveStoreForm() {
    const name = A$('sfN').value.trim(), cat = A$('sfC').value.trim(), start = A$('sfS').value, user = normUser(A$('sfU').value), pass = A$('sfP').value.trim();
    if (!name || !cat) { HWOrders.toast('أدخل اسم المتجر وقسمه'); return; }
    if (user.length < 3) { HWOrders.toast('اسم المستخدم 3 أحرف إنجليزية على الأقل'); return; }
    if (storesAll().some(x => x.id !== admEdit && (normUser(x.user) === user || (x.alias || []).indexOf(user) >= 0)) || allUsers().some(u => u.names.includes(user) && !HWBiz.storeById(u.id))) { HWOrders.toast('اسم المستخدم مستخدم'); return; }
    if (!admEdit && pass.length < 6) { HWOrders.toast('كلمة المرور 6 أحرف على الأقل'); return; }
    if (pass && pass.length < 6) { HWOrders.toast('كلمة المرور 6 أحرف على الأقل'); return; }
    const id = admEdit || (user.replace(/[^a-z0-9]/g, '').slice(0, 20) || 's') + (HWBiz.storeById(user) ? Date.now().toString(36).slice(-3) : '');
    const rec = { name, cat, start, user };
    if (pass) rec.hash = sha256('HIGHWAY|' + id + '|' + pass);
    if (admEdit) { ensureDoc(id); HWBiz.storesCol.patch(id, rec); }
    else HWBiz.storesCol.create(Object.assign({ id, active: true, sort: storesAll().length }, rec));
    logAct('store', (admEdit ? 'تعديل بيانات ' : 'إضافة متجر جديد: ') + name + (pass ? ' (كلمة مرور جديدة)' : ''));
    HWOrders.toast(admEdit ? 'تم الحفظ' : 'تمت إضافة المتجر، أضف شعاره ومنيوه'); openStoreAdm(id); renderManage();
}

/* ---------- الصور وملف PDF ---------- */
function shrink(file, W, Hh, q) {
    return new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => { const im = new Image(); im.onload = () => {
            const c = document.createElement('canvas'); c.width = W; c.height = Hh; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, Hh);
            const r = Math.max(W / im.width, Hh / im.height), w = im.width * r, h = im.height * r; x.drawImage(im, (W - w) / 2, (Hh - h) / 2, w, h); res(c.toDataURL('image/jpeg', q));
        }; im.onerror = rej; im.src = fr.result; };
        fr.onerror = rej; fr.readAsDataURL(file);
    });
}
function uploadImg(file, kind) {
    if (!file) return;
    const sid = admEdit; ensureDoc(sid); HWOrders.toast('جاري رفع الصورة…');
    shrink(file, kind === 'logo' ? 320 : 1200, kind === 'logo' ? 320 : 600, kind === 'logo' ? .86 : .78).then(d => setImg(kind, d)).catch(() => HWOrders.toast('تعذرت قراءة الصورة'));
}
function setImg(kind, data) {
    const sid = admEdit, p = {}; p[kind] = data;
    HWBiz.saveMedia(sid, p).then(() => { logAct('store', (data ? 'تحديث ' : 'إزالة ') + (kind === 'logo' ? 'شعار ' : 'غلاف ') + storeName(sid)); HWOrders.toast('تم الحفظ'); openStoreAdm(sid); renderManage(); });
}
function uploadPdf(file) {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { HWOrders.toast('حجم الملف أكبر من 4 ميغابايت'); return; }
    const sid = admEdit, fr = new FileReader(); ensureDoc(sid); HWOrders.toast('جاري رفع الملف…');
    fr.onload = () => HWBiz.savePdf(sid, fr.result, file.name).then(() => { logAct('store', 'رفع قائمة أسعار PDF لـ ' + storeName(sid)); HWOrders.toast('تم رفع الملف'); setTimeout(() => openStoreAdm(sid), 300); });
    fr.readAsDataURL(file);
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
            '<div class="am-loc-bar"><small id="amLocAddr">حرّك الخريطة لوضع الدبوس على باب المتجر</small><button type="button" class="submit-btn" onclick="saveLocA()"><span class="btn-label">حفظ الموقع</span></button></div>';
        document.body.appendChild(m);
    }
    A$('amLocName').textContent = storeName(sid); m.classList.add('show');
    const st = stCol.get(sid) || {}, c = st.lat != null ? [st.lat, st.lng] : HWMap.center();
    if (!locMapA) { locMapA = HWMap.create(A$('amLocMap'), { center: c, zoom: 17 }); locMapA.on('moveend', () => { const p = locMapA.getCenter(); locPickA = [p.lat, p.lng]; }); }
    setTimeout(() => { locMapA.invalidateSize(); locMapA.setView(c, 17, { animate: false }); locPickA = c; }, 80);
}
function closeLocA() { A$('amLoc').classList.remove('show'); openStoreAdm(admEdit); }
function saveLocA() {
    if (!locPickA) return;
    stCol.patch(admEdit, { lat: +locPickA[0].toFixed(6), lng: +locPickA[1].toFixed(6) }, true);
    logAct('store', 'تحديد موقع ' + storeName(admEdit)); HWOrders.toast('تم حفظ الموقع'); closeLocA();
}

/* =========================================================
   المنيو (شاشة كاملة)
   ========================================================= */
function openMenuAdm(sid) { mStore = sid; closeAdm(); goTo('screen-menuadm'); renderMenuAdm(); }
function mMenu() { return JSON.parse(JSON.stringify(menusColA.get(mStore) || { id: mStore, cats: [] })); }
function mSave(m, what) { m.demo = false; menusColA.replace(mStore, m); if (what) logAct('store', what + ' — ' + storeName(mStore)); }
function renderMenuAdm() {
    const box = A$('menuAdmBody'); if (!box || !mStore) return;
    const m = menusColA.get(mStore) || { cats: [] }, now = Date.now();
    A$('menuAdmTitle').textContent = 'منيو ' + storeName(mStore);
    box.innerHTML = '<p class="mut mg-note">المتجر يستطيع فقط إطفاء الأصناف أو تعليم ما نفد اليوم. الأسماء والأسعار والخيارات تعدّلها الإدارة من هنا.</p>' +
        m.cats.map((c, ci) => '<div class="cart-card"><div class="mrow"><b>' + AE(c.name) + '</b><button type="button" class="more-link inl" onclick="mCatSheet(' + ci + ')">تعديل</button></div>' +
            c.items.map((it, ii) => {
                const on = HWBiz.itemOn(it, now), tags = [AM(it.price) + ' د.أ'];
                if ((it.options || []).length) tags.push(it.options.length + ' خيارات'); if (it.prepMin) tags.push(it.prepMin + ' د تحضير');
                if (it.outUntil && it.outUntil > now) tags.push('نفد حتى الغد'); else if (it.on === false) tags.push('موقوف');
                return '<div class="mrow it' + (on ? '' : ' off') + '"><span class="em">' + HWFood.forItem(it.name, it.desc, c.name, '') + '</span><div class="mt"><b>' + AE(it.name) + '</b><small class="mut">' + tags.join(' · ') + '</small></div>' +
                    '<button type="button" class="sw sm' + (on ? ' on' : '') + '" onclick="mToggle(' + ci + ',' + ii + ')" aria-label="التوفر"></button><button type="button" class="more-link inl" onclick="mItemSheet(' + ci + ',' + ii + ')">تعديل</button></div>';
            }).join('') + '<button type="button" class="more-link" onclick="mItemSheet(' + ci + ',-1)">+ إضافة صنف</button></div>').join('') +
        '<button type="button" class="ghost-btn wide" onclick="mCatSheet(-1)">+ إضافة قسم جديد</button>';
}
function mToggle(ci, ii) { const m = mMenu(), it = m.cats[ci].items[ii], on = HWBiz.itemOn(it); it.on = !on; it.outUntil = 0; mSave(m); buzz(); }
function mCatSheet(ci) {
    mCat = ci; const c = ci >= 0 ? mMenu().cats[ci] : { name: '' };
    admSheet(aHead('المنيو', ci >= 0 ? 'تعديل القسم' : 'قسم جديد') + fld('mcN', 'اسم القسم', c.name, 'placeholder="مثال: مشروبات"') +
        '<div class="btn-row">' + (ci >= 0 ? '<button type="button" class="ghost-btn dng" onclick="mCatDel()">حذف</button>' : '') + '<button type="button" class="submit-btn" onclick="mCatSave()"><span class="btn-label">حفظ</span></button></div>');
}
function mCatSave() {
    const n = A$('mcN').value.trim(); if (!n) return; const m = mMenu();
    if (mCat >= 0) m.cats[mCat].name = n; else m.cats.push({ id: 'c' + Date.now().toString(36), name: n, items: [] });
    mSave(m, (mCat >= 0 ? 'تعديل قسم ' : 'قسم جديد ') + n); closeAdm();
}
function mCatDel() { if (!confirm('حذف القسم وكل أصنافه؟')) return; const m = mMenu(), n = m.cats[mCat].name; m.cats.splice(mCat, 1); mSave(m, 'حذف قسم ' + n); closeAdm(); }
function mItemSheet(ci, ii) {
    mItem = [ci, ii]; const m = mMenu(), it = ii >= 0 ? m.cats[ci].items[ii] : { name: '', desc: '', price: '' };
    mOpts = JSON.parse(JSON.stringify(it.options || []));
    admSheet(aHead(AE(m.cats[ci].name), ii >= 0 ? 'تعديل الصنف' : 'صنف جديد') + fld('miN', 'الاسم', it.name) + fld('miD', 'الوصف <span class="opt">(اختياري)</span>', it.desc || '') +
        '<div class="two">' + fld('miP', 'السعر (د.أ)', it.price, 'type="number" step="0.05" min="0" inputmode="decimal"') +
        '<div class="field"><label for="miT">وقت التحضير</label><select id="miT"><option value="0">المعتاد للمتجر</option>' + [10, 15, 20, 25, 30, 40, 45, 60].map(n => '<option value="' + n + '"' + (it.prepMin === n ? ' selected' : '') + '>' + n + ' دقيقة</option>').join('') + '</select></div></div>' +
        '<div class="opt-ed"><div class="mrow"><div><b>الخيارات والإضافات</b><small class="mut">مثل الحجم، الإضافات، اجعلها وجبة</small></div><button type="button" class="ghost-btn" onclick="mAddGroup()">+ مجموعة</button></div><div id="mOptsEd"></div></div>' +
        '<div class="btn-row">' + (ii >= 0 ? '<button type="button" class="ghost-btn dng" onclick="mItemDel()">حذف</button>' : '') + '<button type="button" class="submit-btn" onclick="mItemSave()"><span class="btn-label">حفظ</span></button></div>');
    mRenderOpts();
}
function mRenderOpts() {
    A$('mOptsEd').innerHTML = mOpts.map((g, gi) =>
        '<div class="og-ed" data-g="' + gi + '"><div class="og-row"><input data-f="name" value="' + AE(g.name) + '" placeholder="اسم المجموعة (مثال: الحجم)"><button type="button" class="og-x" onclick="mDelGroup(' + gi + ')" aria-label="حذف المجموعة">×</button></div>' +
        '<div class="og-row sm"><label><input type="checkbox" data-f="req"' + (g.min >= 1 ? ' checked' : '') + '> اختيار مطلوب</label><label>الحد الأقصى <input type="number" data-f="max" min="1" max="10" value="' + (g.max || 1) + '"></label></div>' +
        g.choices.map((c, ci) => '<div class="og-row ch" data-c="' + ci + '"><input data-f="cname" value="' + AE(c.name) + '" placeholder="الخيار"><input data-f="cprice" type="number" step="0.05" min="0" value="' + (c.price || 0) + '" aria-label="السعر الإضافي"><button type="button" class="og-x" onclick="mDelChoice(' + gi + ',' + ci + ')" aria-label="حذف الخيار">×</button></div>').join('') +
        '<button type="button" class="more-link" onclick="mAddChoice(' + gi + ')">+ خيار</button></div>').join('') || '<p class="mut" style="margin:6px 0 0">لا توجد خيارات لهذا الصنف</p>';
}
function mReadOpts() {
    document.querySelectorAll('#mOptsEd .og-ed').forEach(el => {
        const g = mOpts[+el.dataset.g]; if (!g) return;
        g.name = el.querySelector('[data-f="name"]').value.trim(); g.min = el.querySelector('[data-f="req"]').checked ? 1 : 0;
        g.max = Math.max(1, Math.min(10, parseInt(el.querySelector('[data-f="max"]').value, 10) || 1));
        el.querySelectorAll('.ch').forEach(r => { const c = g.choices[+r.dataset.c]; c.name = r.querySelector('[data-f="cname"]').value.trim(); c.price = Math.max(0, Math.round((parseFloat(r.querySelector('[data-f="cprice"]').value) || 0) * 100) / 100); });
    });
}
function mAddGroup() { mReadOpts(); mOpts.push({ id: 'g' + Date.now().toString(36), name: '', min: 0, max: 1, choices: [{ id: 'o' + Date.now().toString(36), name: '', price: 0 }] }); mRenderOpts(); }
function mDelGroup(gi) { mReadOpts(); mOpts.splice(gi, 1); mRenderOpts(); }
function mAddChoice(gi) { mReadOpts(); mOpts[gi].choices.push({ id: 'o' + Date.now().toString(36) + mOpts[gi].choices.length, name: '', price: 0 }); mRenderOpts(); }
function mDelChoice(gi, ci) { mReadOpts(); mOpts[gi].choices.splice(ci, 1); mRenderOpts(); }
function mItemSave() {
    const n = A$('miN').value.trim(), p = parseFloat(A$('miP').value);
    if (!n || !(p >= 0)) { HWOrders.toast('أدخل الاسم والسعر'); return; }
    mReadOpts();
    const opts = mOpts.map(g => Object.assign(g, { choices: g.choices.filter(c => c.name) })).filter(g => g.name && g.choices.length);
    if (opts.some(g => g.min > g.choices.length)) { HWOrders.toast('عدد الخيارات أقل من المطلوب'); return; }
    const m = mMenu(), [ci, ii] = mItem, old = ii >= 0 ? m.cats[ci].items[ii] : {};
    const rec = { id: old.id || 'i' + Date.now().toString(36), name: n, desc: A$('miD').value.trim(), price: Math.round(p * 100) / 100, on: old.on !== false, outUntil: old.outUntil || 0, prepMin: +A$('miT').value || 0 };
    if (opts.length) rec.options = opts;
    if (ii >= 0) m.cats[ci].items[ii] = rec; else m.cats[ci].items.push(rec);
    mSave(m, (ii >= 0 ? (old.price !== rec.price ? 'تغيير سعر ' + n + ' إلى ' + AM(rec.price) : 'تعديل صنف ' + n) : 'صنف جديد ' + n)); closeAdm(); HWOrders.toast('تم حفظ الصنف');
}
function mItemDel() { if (!confirm('حذف هذا الصنف؟')) return; const m = mMenu(), n = m.cats[mItem[0]].items[mItem[1]].name; m.cats[mItem[0]].items.splice(mItem[1], 1); mSave(m, 'حذف صنف ' + n); closeAdm(); }

/* =========================================================
   أسعار التوصيل (قوائم الأسعار)
   ========================================================= */
function mgPrices() {
    if (!plDraft) plDraft = JSON.parse(JSON.stringify(HWBiz.priceList(plStart, plRegion, (window.HW_PRICES[plStart] || {})[plRegion] || [])));
    const custom = !!(HWBiz.priceCol.get(plStart) || {})[plRegion];
    return '<p class="mut mg-note">أسعار التوصيل التي تظهر للمتاجر في "قوائم الأسعار". التعديل يظهر عند الجميع فور الحفظ. اكتب السعر هكذا: 2.50 أو 2.00 - 2.50</p>' +
        '<div class="seg">' + Object.keys(START_LBL).map(k => '<button type="button" class="' + (plStart === k ? 'on' : '') + '" onclick="plSwitch(\'' + k + '\',plRegion)">من ' + START_LBL[k] + '</button>').join('') + '</div>' +
        '<div class="seg">' + [['salt', 'مناطق السلط'], ['amman', 'مناطق عمان']].map(r => '<button type="button" class="' + (plRegion === r[0] ? 'on' : '') + '" onclick="plSwitch(plStart,\'' + r[0] + '\')">' + r[1] + '</button>').join('') + '</div>' +
        '<div class="pl-list">' + plDraft.map((r, i) => '<div class="pl-row"><input value="' + AE(r.n) + '" data-pl="n" data-i="' + i + '" aria-label="المنطقة"><input value="' + AE(r.p) + '" data-pl="p" data-i="' + i + '" dir="ltr" inputmode="decimal" aria-label="السعر"><button type="button" class="og-x" onclick="plDel(' + i + ')" aria-label="حذف">×</button></div>').join('') + '</div>' +
        '<button type="button" class="more-link" onclick="plAdd()">+ منطقة جديدة</button>' +
        '<div class="btn-row" style="margin-top:12px">' + (custom ? '<button type="button" class="ghost-btn" onclick="plReset()">الأسعار الأصلية</button>' : '') + '<button type="button" class="submit-btn" onclick="plSave()"><span class="btn-label">حفظ الأسعار</span></button></div>';
}
function plRead() { document.querySelectorAll('.pl-row input').forEach(el => { const r = plDraft[+el.dataset.i]; if (r) r[el.dataset.pl] = el.value.trim(); }); }
function plSwitch(s, r) { plStart = s; plRegion = r; plDraft = null; renderManage(); }
function plAdd() { plRead(); plDraft.push({ n: '', p: '' }); renderManage(); setTimeout(() => { const l = document.querySelectorAll('.pl-row input[data-pl="n"]'); if (l.length) l[l.length - 1].focus(); }, 50); }
function plDel(i) { plRead(); plDraft.splice(i, 1); renderManage(); }
function plSave() {
    plRead();
    const rows = plDraft.filter(r => r.n && /\d/.test(r.p)).map(r => ({ n: r.n, p: r.p.replace(/[^\d.\s-]/g, '').replace(/\s*-\s*/, ' - ').trim() }));
    const doc = Object.assign({}, HWBiz.priceCol.get(plStart) || {}); delete doc.id; delete doc.createdAt; delete doc.updatedAt;
    doc[plRegion] = rows; HWBiz.priceCol.replace(plStart, doc);
    logAct('store', 'تعديل أسعار التوصيل: ' + START_LBL[plStart] + ' ← ' + (plRegion === 'salt' ? 'السلط' : 'عمان')); plDraft = null; HWOrders.toast('تم حفظ الأسعار'); renderManage();
}
function plReset() {
    if (!confirm('الرجوع للأسعار الأصلية لهذه القائمة؟')) return;
    const doc = Object.assign({}, HWBiz.priceCol.get(plStart) || {}); delete doc[plRegion]; delete doc.id; delete doc.createdAt; delete doc.updatedAt;
    HWBiz.priceCol.replace(plStart, doc); plDraft = null; logAct('store', 'إرجاع الأسعار الأصلية'); renderManage();
}

/* ---------- ربط ---------- */
Object.assign(TAB_OF, { 'screen-menuadm': 'manage' });
(function () { const _g = window.goTo; window.goTo = function (id) { _g(id); if (id === 'screen-menuadm') renderMenuAdm(); }; })();
menusColA.subscribe(() => { if (scr() === 'screen-menuadm') renderMenuAdm(); else if (scr() === 'screen-manage' && mgTab === 'stores') renderManage(); });
HWBiz.storesCol.subscribe(() => { if (scr() === 'screen-manage' && mgTab !== 'prices') renderManage(); });
HWBiz.onMedia(() => { if (scr() === 'screen-manage') renderManage(); });
