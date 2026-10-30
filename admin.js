/* =========================================================
   Admin Panel — admin.js
   1) سجل النشاط (من فعل ماذا ومتى)
   2) الرئيسية: مؤشرات الأداء اليومية + خريطة العمليات الحية
   3) تسوية الكباتن النقدية + كشف مطبوع
   4) البلاغات الواردة من الكباتن
   5) الإدارة: المتاجر (الحالة، الحساب، صورة الغلاف)، العروض، أكواد الخصم،
      أهداف الكباتن، الإعلانات، فريق العمليات
   يعتمد على: hw-orders.js, hw-biz.js, hw-map.js, script.js, disp-v2.js
   ========================================================= */
const logCol = HWDB.col('log'), issuesCol = HWDB.col('issues'), stCol = HWDB.col('storestate'), staffCol = HWDB.col('staff');
const AE = HWOrders.esc, AM = HWOrders.money, A$ = (id) => document.getElementById(id);
let mgTab = 'stores', issFilter = 'open', admEdit = null;
function scr() { const a = document.querySelector('.screen.active'); return a ? a.id : ''; }
function admSheet(html) { A$('admSheetBody').innerHTML = html; A$('admSheet').classList.add('show'); }
function closeAdm() { A$('admSheet').classList.remove('show'); }
function aHead(small, title) { return '<div class="sh-head"><div><small>' + small + '</small><h3>' + title + '</h3></div></div>'; }
function fld(id, label, val, attrs) { return '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" value="' + AE(val == null ? '' : val) + '" ' + (attrs || '') + '></div>'; }
function dateVal(ts) { return ts ? new Date(ts).toISOString().slice(0, 10) : ''; }
function dateEnd(v) { return v ? new Date(v + 'T23:59:59').getTime() : 0; }
function num(id) { return Math.max(0, parseFloat(A$(id).value) || 0); }

/* =========================================================
   1) سجل النشاط
   ========================================================= */
function actorName() { return (currentUser && (currentUser.label || currentUser.names[0])) || 'النظام'; }
function logAct(action, text) { try { logCol.create({ at: Date.now(), by: actorName(), action, text }); } catch (e) {} }
const LOG_IC = { assign: '👤', reassign: '🔁', cancel: '✕', status: '✓', settle: '💵', store: '🏪', offer: '%', promo: '🏷', target: '🎯', ann: '📣', team: '👥', issue: '⚠', auto: '⚡', cap: '🛵' };
function renderLog() {
    const box = A$('logBody'); if (!box) return;
    const l = logCol.list().slice().sort((a, b) => b.at - a.at).slice(0, 200);
    box.innerHTML = l.length ? l.map(x => '<div class="lg-row"><span class="lg-ic">' + (LOG_IC[x.action] || '•') + '</span><div><b>' + AE(x.text) + '</b><small>' + AE(x.by) + ' · ' + new Date(x.at).toLocaleDateString('ar-JO') + ' ' + HWOrders.fmtTime(x.at) + '</small></div></div>').join('')
        : '<div class="empty-orders">لا يوجد نشاط مسجّل بعد</div>';
}

/* =========================================================
   2) الرئيسية: مؤشرات الأداء + خريطة العمليات
   ========================================================= */
function kpis(from) {
    const l = allOrders.filter(o => o.createdAt >= from), done = l.filter(o => o.status === 'delivered'), canc = l.filter(o => o.status === 'cancelled');
    const t = done.reduce((a, o) => { const s = HWOrders.settle(o); a.fee += s.fee; a.com += s.commission; a.promo += s.promo; a.gmv += s.items; return a; }, { fee: 0, com: 0, promo: 0, gmv: 0 });
    const mins = done.map(o => { const d = (o.history || []).filter(h => h.s === 'delivered')[0]; return d ? (d.t - (o.scheduledFor ? HWOrders.dispatchAt(o) : o.createdAt)) / 60000 : null; }).filter(x => x != null && x > 0);
    const rated = done.filter(o => o.rating && o.rating.store);
    return { n: l.length, done: done.length, canc: canc.length, rate: l.length ? Math.round(canc.length / l.length * 100) : 0, avgMin: mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : 0,
        gmv: t.gmv, fee: t.fee, com: t.com, promo: t.promo, net: HWBiz.r2(t.com - t.promo), rating: rated.length ? (rated.reduce((a, o) => a + o.rating.store, 0) / rated.length).toFixed(1) : '—' };
}
function renderKpis() {
    const box = A$('kpiBox'); if (!box) return;
    const k = kpis(HWBiz.periodStart('day')), live = capsCol.list().filter(isLive).length, open = issuesCol.list().filter(i => i.status !== 'resolved').length;
    box.innerHTML = '<div class="kpi-grid">' +
        '<div class="kpi hot"><small>طلبات اليوم</small><b>' + k.n + '</b><em>' + k.done + ' مسلّمة</em></div>' +
        '<div class="kpi"><small>متوسط وقت التوصيل</small><b>' + (k.avgMin || '—') + '</b><em>دقيقة</em></div>' +
        '<div class="kpi"><small>قيمة الطلبات (GMV)</small><b>' + AM(k.gmv) + '</b><em>د.أ</em></div>' +
        '<div class="kpi"><small>صافي المنصة</small><b>' + AM(k.net) + '</b><em>عمولة ' + AM(k.com) + ' − أكواد ' + AM(k.promo) + '</em></div>' +
        '<div class="kpi"><small>نسبة الإلغاء</small><b>' + k.rate + '٪</b><em>' + k.canc + ' ملغي</em></div>' +
        '<div class="kpi"><small>رضا العملاء</small><b>' + k.rating + '</b><em>من 5</em></div>' +
        '<button type="button" class="kpi" onclick="tabGo(\'screen-captains\')"><small>كباتن متصلون</small><b>' + live + '</b><em>من ' + capsCol.list().length + '</em></button>' +
        '<button type="button" class="kpi' + (open ? ' warn' : '') + '" onclick="goTo(\'screen-issues\')"><small>بلاغات مفتوحة</small><b>' + open + '</b><em>اضغط للمراجعة</em></button></div>';
}
let opsMap = null, opsLayer = null, opsSig = '';
function renderOpsMap() {
    const el = A$('opsMapEl'); if (!el || !window.L || scr() !== 'screen-dashboard') return;
    if (!opsMap) { opsMap = HWMap.create(el, { center: HWMap.center(), zoom: 12 }); opsLayer = L.layerGroup().addTo(opsMap); }
    const caps = capsCol.list().filter(c => c.lat != null && isLive(c)), act = allOrders.filter(HWOrders.isActive);
    const sig = caps.map(c => c.id + c.lat + c.lng).join() + '|' + act.map(o => o.id + o.status).join();
    if (sig === opsSig) return; opsSig = sig; opsLayer.clearLayers(); const pts = [];
    caps.forEach(c => { const p = [c.lat, c.lng]; pts.push(p); L.marker(p, { icon: HWMap.ICON.cap(), zIndexOffset: 400 }).bindTooltip(c.name, { direction: 'top' }).addTo(opsLayer); });
    act.forEach(o => {
        const color = o.status === 'new' ? '#E8EF44' : o.status === 'accepted' ? '#25CED1' : '#0E3A3B';
        if (o.storeLoc) { const p = [o.storeLoc.lat, o.storeLoc.lng]; pts.push(p); L.circleMarker(p, { radius: 8, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 }).bindTooltip(o.code + ' · ' + (o.storeName || ''), { direction: 'top' }).addTo(opsLayer); }
        if (o.address && o.address.lat != null) { const p = [o.address.lat, o.address.lng]; pts.push(p); L.marker(p, { icon: HWMap.ICON.home() }).bindTooltip(o.code + ' · ' + HWOrders.label(o), { direction: 'top' }).addTo(opsLayer); }
    });
    A$('opsLbl').textContent = act.length + ' طلب نشط · ' + caps.length + ' كابتن متصل';
    opsMap.invalidateSize(); if (pts.length) HWMap.fit(opsMap, pts, [36, 36]);
}
function renderHome() { renderKpis(); renderOpsMap(); }

/* =========================================================
   3) تسوية الكباتن
   ========================================================= */
function unsettled(cid) { return allOrders.filter(o => o.captain && o.captain.id === cid && o.status === 'delivered' && !o.settledAt); }
function settleSum(list) { return list.reduce((a, o) => { const s = HWOrders.settle(o); a.n++; a.fee += s.fee; a.com += s.commission; a.promo += s.promo; a.due += s.due; a.col += s.collected; a.items += s.items; return a; }, { n: 0, fee: 0, com: 0, promo: 0, due: 0, col: 0, items: 0 }); }
function settleBlock(cid) {
    const l = unsettled(cid), t = settleSum(l), r = HWBiz.captainRating(cid, allOrders), iss = issuesCol.list().filter(i => i.captain && i.captain.id === cid).length;
    return '<div class="stl"><div class="stl-h"><b>التسوية النقدية</b><span>' + (r.n ? '★ ' + r.avg.toFixed(1) + ' · ' : '') + iss + ' بلاغ</span></div>' +
        '<div class="stl-k"><div><small>طلبات غير مسوّاة</small><b>' + t.n + '</b></div><div><small>عمولة المنصة</small><b>' + AM(t.com) + '</b></div><div><small>أكواد خصم (لصالحه)</small><b>' + AM(t.promo) + '</b></div><div class="due"><small>' + (t.due >= 0 ? 'المطلوب منه' : 'المطلوب له') + '</small><b>' + AM(Math.abs(t.due)) + ' د.أ</b></div></div>' +
        '<div class="btn-row"><button type="button" class="ghost-btn" onclick="printSettlement(\'' + cid + '\')"' + (t.n ? '' : ' disabled') + '>طباعة الكشف</button><button type="button" class="submit-btn" onclick="settleCaptain(\'' + cid + '\')"' + (t.n ? '' : ' disabled') + '><span class="btn-label">تسجيل التسوية</span></button></div></div>';
}
function settleCaptain(cid) {
    const l = unsettled(cid), t = settleSum(l), c = capsCol.get(cid) || {};
    if (!l.length || !confirm((t.due >= 0 ? 'استلمت من ' : 'دفعت لـ ') + c.name + ' مبلغ ' + AM(Math.abs(t.due)) + ' د.أ عن ' + l.length + ' طلب؟')) return;
    const at = Date.now(), by = actorName();
    l.forEach(o => HWOrders.update(o.id, { settledAt: at, settledBy: by }, 'settled'));
    logAct('settle', 'تسوية ' + c.name + ': ' + l.length + ' طلب · ' + (t.due >= 0 ? 'استلام ' : 'دفع ') + AM(Math.abs(t.due)) + ' د.أ');
    closeCapSheet(); buzz(20); HWOrders.toast('تم تسجيل التسوية');
}
function printSettlement(cid) {
    const l = unsettled(cid).sort((a, b) => a.createdAt - b.createdAt), t = settleSum(l), c = capsCol.get(cid) || {};
    HWBiz.printHtml('كشف تسوية ' + c.name, HWBiz.reportHead('كشف تسوية كابتن', AE(c.name) + ' · ' + AE(c.phone || '') + ' · ' + new Date().toLocaleDateString('ar-JO')) + '<div class="wrap">' +
        '<div class="kp"><div><small>عدد الطلبات</small><b>' + t.n + '</b></div><div><small>رسوم التوصيل</small><b>' + AM(t.fee) + '</b></div><div><small>عمولة المنصة</small><b>' + AM(t.com) + '</b></div><div><small>' + (t.due >= 0 ? 'المستحق للمنصة' : 'المستحق للكابتن') + '</small><b>' + AM(Math.abs(t.due)) + '</b></div></div>' +
        '<h2>تفاصيل الطلبات</h2><table><thead><tr><th>الطلب</th><th>التاريخ</th><th>المتجر</th><th>دفع للمتجر</th><th>حصّل</th><th>التوصيل</th><th>العمولة</th><th>كود</th></tr></thead><tbody>' +
        l.map(o => { const s = HWOrders.settle(o); return '<tr><td>' + AE(o.code) + '</td><td>' + new Date(o.createdAt).toLocaleDateString('ar-JO') + '</td><td>' + AE(o.storeName || o.from || '') + '</td><td>' + AM(s.items) + '</td><td>' + AM(s.collected) + '</td><td>' + AM(s.fee) + '</td><td>' + AM(s.commission) + '</td><td>' + (s.promo ? '−' + AM(s.promo) : '') + '</td></tr>'; }).join('') +
        '</tbody><tfoot><tr><td colspan="3">الإجمالي</td><td>' + AM(t.items) + '</td><td>' + AM(t.col) + '</td><td>' + AM(t.fee) + '</td><td>' + AM(t.com) + '</td><td>' + AM(t.promo) + '</td></tr></tfoot></table>' +
        '<div class="sig"><div>توقيع الكابتن</div><div>توقيع المسؤول: ' + AE(actorName()) + '</div></div><div class="ft">صادر من Admin Panel · HIGHWAY Delivery</div></div>');
}
/* إضافة قسم التسوية لورقة الكابتن الموجودة */
(function () {
    const _o = window.openCapSheet;
    window.openCapSheet = function (id) { _o(id); if (id) A$('capSheetBody').insertAdjacentHTML('beforeend', settleBlock(id)); };
    const _s = window.saveCap; window.saveCap = async function () { const n = A$('cpName').value.trim(); await _s(); if (!A$('capSheet').classList.contains('show')) logAct('cap', (editCapId ? 'تعديل الكابتن ' : 'إضافة الكابتن ') + n); };
    const _t = window.toggleCapActive; window.toggleCapActive = function () { const c = capsCol.get(editCapId); _t(); logAct('cap', (c.active === false ? 'تفعيل ' : 'إيقاف ') + 'الكابتن ' + c.name); };
    const _a = window.setAuto; window.setAuto = function (v) { _a(v); logAct('auto', v ? 'تشغيل الإسناد التلقائي' : 'التحويل للإسناد اليدوي'); };
})();

/* =========================================================
   4) البلاغات
   ========================================================= */
function renderIssues() {
    const box = A$('issBody'); if (!box) return;
    const all = issuesCol.list().slice().sort((a, b) => b.at - a.at), l = all.filter(i => issFilter === 'all' || (issFilter === 'open' ? i.status !== 'resolved' : i.status === 'resolved'));
    box.innerHTML = '<div class="seg">' + [['open', 'مفتوحة'], ['done', 'محلولة'], ['all', 'الكل']].map(f => '<button type="button" class="' + (issFilter === f[0] ? 'on' : '') + '" onclick="issFilter=\'' + f[0] + '\';renderIssues()">' + f[1] + '</button>').join('') + '</div>' +
        (l.length ? l.map(i => { const o = allOrders.filter(x => x.id === i.orderId)[0];
            return '<div class="iss-card' + (i.status === 'resolved' ? ' done' : '') + '"><div class="iss-top"><b>' + AE(i.reason) + '</b><span>' + HWOrders.ago(i.at) + '</span></div>' +
                '<small>' + AE(i.code) + ' · ' + AE(i.storeName || '') + ' · الكابتن ' + AE(i.captain ? i.captain.name : '') + '</small>' + (i.note ? '<p>' + AE(i.note) + '</p>' : '') +
                (i.status === 'resolved' ? '<p class="res">✓ ' + AE(i.resolution || 'تم الحل') + ' — ' + AE(i.resolvedBy || '') + '</p>'
                    : '<div class="btn-row">' + (o ? '<button type="button" class="ghost-btn" onclick="openOrderSheet(\'' + o.id + '\')">الطلب</button>' : '') + (i.captain && i.captain.phone ? '<a class="ghost-btn" href="tel:' + AE(i.captain.phone) + '">اتصال</a>' : '') + '<button type="button" class="submit-btn" onclick="resolveIssue(\'' + i.id + '\')"><span class="btn-label">تم الحل</span></button></div>') + '</div>'; }).join('')
            : '<div class="empty-orders">لا توجد بلاغات هنا</div>');
}
function resolveIssue(id) {
    const i = issuesCol.get(id); if (!i) return;
    const how = prompt('كيف تم حل البلاغ؟', 'تم التواصل وحل المشكلة'); if (how === null) return;
    issuesCol.patch(id, { status: 'resolved', resolution: how, resolvedBy: actorName(), resolvedAt: Date.now() });
    logAct('issue', 'حل بلاغ ' + i.code + ': ' + i.reason); buzz(15);
}
function renderIssueBadge() {
    const n = issuesCol.list().filter(i => i.status !== 'resolved').length, b = A$('mgBadge');
    if (b) { b.textContent = n; b.classList.toggle('on', n > 0); }
}

/* =========================================================
   5) الإدارة
   ========================================================= */
const MG_TABS = [['stores', 'المتاجر'], ['prices', 'أسعار التوصيل'], ['offers', 'العروض'], ['promos', 'أكواد الخصم'], ['targets', 'أهداف الكباتن'], ['ann', 'الإعلانات'], ['team', 'الفريق']];
function renderManage() {
    const box = A$('mgBody'); if (!box) return;
    const open = issuesCol.list().filter(i => i.status !== 'resolved').length;
    box.innerHTML = '<div class="mg-quick"><button type="button" onclick="goTo(\'screen-issues\')"><b>' + open + '</b><span>بلاغات مفتوحة</span></button><button type="button" onclick="goTo(\'screen-log\')"><b>' + logCol.list().length + '</b><span>سجل النشاط</span></button></div>' +
        '<div class="seg mg-seg">' + MG_TABS.map(t => '<button type="button" class="' + (mgTab === t[0] ? 'on' : '') + '" onclick="mgTab=\'' + t[0] + '\';renderManage()">' + t[1] + '</button>').join('') + '</div>' +
        ({ stores: mgStores, prices: mgPrices, offers: mgOffers, promos: mgPromos, targets: mgTargets, ann: mgAnn, team: mgTeam })[mgTab]();
}

/* ---------- العروض (لكل المتاجر) ---------- */
function mgOffers() {
    const l = HWBiz.offers.list().slice().sort((a, b) => (b.active !== false) - (a.active !== false));
    return '<button type="button" class="submit-btn mg-add" onclick="openOfferAdm(null)"><span class="btn-label">+ عرض جديد</span></button>' +
        (l.map(o => '<div class="mg-card' + (HWBiz.live(o) ? '' : ' off') + '"><div class="mg-top"><span class="mg-ic">%</span><div><b>' + AE(o.title) + '</b><small>' + AE(storeName(o.storeId)) + ' · ' + (o.percent ? o.percent + '٪' : 'إعلان') + (o.minOrder ? ' فوق ' + AM(o.minOrder) : '') + (o.endsAt ? ' · حتى ' + new Date(o.endsAt).toLocaleDateString('ar-JO') : '') + '</small></div>' +
            '<button type="button" class="sw sm' + (o.active !== false ? ' on' : '') + '" onclick="toggleCol(\'offers\',\'' + o.id + '\')" aria-label="تفعيل"></button><button type="button" class="more-link inl" onclick="openOfferAdm(\'' + o.id + '\')">تعديل</button></div></div>').join('') || '<div class="empty-orders">لا توجد عروض</div>');
}
function openOfferAdm(id) {
    admEdit = id; const o = id ? HWBiz.offers.get(id) : { storeId: (storesAll()[0] || {}).id, title: '', percent: 10, minOrder: 0 };
    admSheet(aHead('العروض', id ? 'تعديل العرض' : 'عرض جديد') +
        '<div class="field"><label for="ofStore">المتجر</label><select id="ofStore">' + storesAll().map(s => '<option value="' + s.id + '"' + (s.id === o.storeId ? ' selected' : '') + '>' + AE(s.name) + '</option>').join('') + '</select></div>' +
        fld('ofTitle', 'العنوان', o.title) + fld('ofSub', 'تفاصيل <span class="opt">(اختياري)</span>', o.sub) +
        '<div class="two">' + fld('ofPct', 'الخصم ٪ (يتحمّله المتجر)', o.percent, 'type="number" min="0" max="50"') + fld('ofMin', 'الحد الأدنى', o.minOrder, 'type="number" min="0" step="0.5"') + '</div>' +
        fld('ofEnd', 'ينتهي في <span class="opt">(اختياري)</span>', dateVal(o.endsAt), 'type="date"') +
        '<div class="btn-row">' + (id ? '<button type="button" class="ghost-btn dng" onclick="delCol(\'offers\',\'' + id + '\')">حذف</button>' : '') + '<button type="button" class="submit-btn" onclick="saveOfferAdm()"><span class="btn-label">حفظ</span></button></div>');
}
function saveOfferAdm() {
    const t = A$('ofTitle').value.trim(); if (!t) { HWOrders.toast('اكتب عنوان العرض'); return; }
    const rec = { storeId: A$('ofStore').value, title: t, sub: A$('ofSub').value.trim(), percent: Math.min(50, num('ofPct')), minOrder: num('ofMin'), endsAt: dateEnd(A$('ofEnd').value), demo: false };
    if (admEdit) HWBiz.offers.patch(admEdit, rec); else HWBiz.offers.create(Object.assign({ active: true }, rec));
    logAct('offer', (admEdit ? 'تعديل عرض: ' : 'عرض جديد: ') + t + ' (' + storeName(rec.storeId) + ')'); closeAdm(); renderManage();
}

/* ---------- أكواد الخصم (تتحمّلها المنصة) ---------- */
function promoUses(code) { return allOrders.filter(o => o.promoCode === code && o.status !== 'cancelled'); }
function mgPromos() {
    const l = HWBiz.promos.list();
    return '<p class="mut mg-note">خصم الكود تتحمّله المنصة: يُخصم من عمولتها عند تسوية الكابتن.</p><button type="button" class="submit-btn mg-add" onclick="openPromoAdm(null)"><span class="btn-label">+ كود جديد</span></button>' +
        (l.map(p => { const u = promoUses(p.id), cost = u.reduce((a, o) => a + (Number(o.promoAmount) || 0), 0);
            return '<div class="mg-card' + (p.active === false || (p.endsAt && p.endsAt < Date.now()) ? ' off' : '') + '"><div class="mg-top"><span class="mg-ic code">' + AE(p.id.slice(0, 3)) + '</span><div><b dir="ltr" style="text-align:right">' + AE(p.id) + '</b><small>' + AE(p.title || '') + ' · ' + (p.type === 'amount' ? AM(p.value) + ' د.أ' : p.value + '٪' + (p.max ? ' (حتى ' + AM(p.max) + ')' : '')) + ' · استُخدم ' + u.length + ' مرة · كلفة ' + AM(cost) + '</small></div>' +
                '<button type="button" class="sw sm' + (p.active !== false ? ' on' : '') + '" onclick="toggleCol(\'promos\',\'' + p.id + '\')" aria-label="تفعيل"></button><button type="button" class="more-link inl" onclick="openPromoAdm(\'' + p.id + '\')">تعديل</button></div></div>'; }).join('') || '<div class="empty-orders">لا توجد أكواد</div>');
}
function openPromoAdm(id) {
    admEdit = id; const p = id ? HWBiz.promos.get(id) : { id: '', title: '', type: 'percent', value: 10, max: 0, minOrder: 0, perUser: 1 };
    admSheet(aHead('أكواد الخصم', id ? 'تعديل الكود' : 'كود جديد') +
        fld('pmCode', 'الكود (أحرف إنجليزية وأرقام)', p.id, 'dir="ltr" autocapitalize="characters"' + (id ? ' disabled' : '')) + fld('pmTitle', 'الوصف للعميل', p.title) +
        '<div class="two"><div class="field"><label for="pmType">النوع</label><select id="pmType"><option value="percent"' + (p.type !== 'amount' ? ' selected' : '') + '>نسبة ٪</option><option value="amount"' + (p.type === 'amount' ? ' selected' : '') + '>مبلغ ثابت</option></select></div>' + fld('pmVal', 'القيمة', p.value, 'type="number" min="0" step="0.5"') + '</div>' +
        '<div class="two">' + fld('pmMax', 'أقصى خصم (د.أ)', p.max || '', 'type="number" min="0" step="0.5"') + fld('pmMin', 'الحد الأدنى للطلب', p.minOrder || 0, 'type="number" min="0" step="0.5"') + '</div>' +
        '<div class="two">' + fld('pmPer', 'مرات الاستخدام لكل عميل', p.perUser || 1, 'type="number" min="1"') + fld('pmEnd', 'ينتهي في', dateVal(p.endsAt), 'type="date"') + '</div>' +
        '<label class="chk"><input type="checkbox" id="pmFirst"' + (p.firstOrder ? ' checked' : '') + '> لأول طلب فقط</label>' +
        '<div class="btn-row">' + (id ? '<button type="button" class="ghost-btn dng" onclick="delCol(\'promos\',\'' + id + '\')">حذف</button>' : '') + '<button type="button" class="submit-btn" onclick="savePromoAdm()"><span class="btn-label">حفظ</span></button></div>');
}
function savePromoAdm() {
    const code = (admEdit || A$('pmCode').value).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 3) { HWOrders.toast('الكود 3 أحرف على الأقل'); return; }
    if (!admEdit && HWBiz.promos.get(code)) { HWOrders.toast('هذا الكود موجود'); return; }
    const rec = { title: A$('pmTitle').value.trim(), type: A$('pmType').value, value: num('pmVal'), max: num('pmMax'), minOrder: num('pmMin'), perUser: Math.max(1, parseInt(A$('pmPer').value, 10) || 1), endsAt: dateEnd(A$('pmEnd').value), firstOrder: A$('pmFirst').checked, demo: false };
    if (!rec.value) { HWOrders.toast('أدخل قيمة الخصم'); return; }
    if (admEdit) HWBiz.promos.patch(code, rec); else HWBiz.promos.create(Object.assign({ id: code, active: true }, rec));
    logAct('promo', (admEdit ? 'تعديل كود ' : 'كود خصم جديد ') + code); closeAdm(); renderManage();
}

/* ---------- أهداف الكباتن اليومية ---------- */
function mgTargets() {
    const l = HWBiz.targets.list();
    return '<p class="mut mg-note">تظهر للكباتن في الصفحة الرئيسية مع شريط التقدم، وتُصرف المكافأة عند التسوية.</p><button type="button" class="submit-btn mg-add" onclick="openTargetAdm(null)"><span class="btn-label">+ هدف جديد</span></button>' +
        (l.map(t => { const hit = capsCol.list().filter(c => allOrders.filter(o => o.captain && o.captain.id === c.id && o.status === 'delivered' && HWOrders.isToday(o.updatedAt || o.createdAt)).length >= t.count);
            return '<div class="mg-card' + (t.active === false ? ' off' : '') + '"><div class="mg-top"><span class="mg-ic">🎯</span><div><b>' + AE(t.title || ('أكمل ' + t.count + ' طلبات')) + '</b><small>' + t.count + ' طلبات · مكافأة ' + AM(t.bonus) + ' د.أ · ' + (t.day ? 'ليوم ' + t.day : 'كل يوم') + ' · حققه اليوم: ' + (hit.map(c => c.name).join('، ') || 'لا أحد') + '</small></div>' +
                '<button type="button" class="sw sm' + (t.active !== false ? ' on' : '') + '" onclick="toggleCol(\'targets\',\'' + t.id + '\')" aria-label="تفعيل"></button><button type="button" class="more-link inl" onclick="openTargetAdm(\'' + t.id + '\')">تعديل</button></div></div>'; }).join('') || '<div class="empty-orders">لا توجد أهداف</div>');
}
function openTargetAdm(id) {
    admEdit = id; const t = id ? HWBiz.targets.get(id) : { title: '', count: 10, bonus: 3, day: '' };
    admSheet(aHead('أهداف الكباتن', id ? 'تعديل الهدف' : 'هدف جديد') + fld('tgTitle', 'العنوان', t.title, 'placeholder="مثال: تحدي الويكند"') +
        '<div class="two">' + fld('tgCount', 'عدد الطلبات', t.count, 'type="number" min="1"') + fld('tgBonus', 'المكافأة (د.أ)', t.bonus, 'type="number" min="0" step="0.5"') + '</div>' +
        '<label class="chk"><input type="checkbox" id="tgToday"' + (t.day ? ' checked' : '') + '> لليوم فقط (وإلا يتكرر كل يوم)</label>' +
        '<div class="btn-row">' + (id ? '<button type="button" class="ghost-btn dng" onclick="delCol(\'targets\',\'' + id + '\')">حذف</button>' : '') + '<button type="button" class="submit-btn" onclick="saveTargetAdm()"><span class="btn-label">حفظ</span></button></div>');
}
function saveTargetAdm() {
    const rec = { title: A$('tgTitle').value.trim(), count: Math.max(1, parseInt(A$('tgCount').value, 10) || 1), bonus: num('tgBonus'), day: A$('tgToday').checked ? HWBiz.dayKey() : '' };
    if (admEdit) HWBiz.targets.patch(admEdit, rec); else HWBiz.targets.create(Object.assign({ active: true }, rec));
    logAct('target', (admEdit ? 'تعديل هدف: ' : 'هدف جديد: ') + rec.count + ' طلبات / ' + AM(rec.bonus) + ' د.أ'); closeAdm(); renderManage();
}

/* ---------- الإعلانات ---------- */
const AUD = { customers: 'العملاء', stores: 'المتاجر', drivers: 'الكباتن', all: 'الجميع' };
function mgAnn() {
    const l = HWBiz.announcementsCol.list().slice().sort((a, b) => (b.at || 0) - (a.at || 0));
    return '<button type="button" class="submit-btn mg-add" onclick="openAnnAdm(null)"><span class="btn-label">+ إعلان جديد</span></button>' +
        (l.map(a => '<div class="mg-card' + (a.active === false || (a.endsAt && a.endsAt < Date.now()) ? ' off' : '') + '"><div class="mg-top"><span class="mg-ic">📣</span><div><b>' + AE(a.title) + '</b><small>إلى ' + AUD[a.target] + (a.endsAt ? ' · حتى ' + new Date(a.endsAt).toLocaleDateString('ar-JO') : '') + (a.body ? ' · ' + AE(a.body) : '') + '</small></div>' +
            '<button type="button" class="sw sm' + (a.active !== false ? ' on' : '') + '" onclick="toggleCol(\'announcements\',\'' + a.id + '\')" aria-label="تفعيل"></button><button type="button" class="more-link inl" onclick="openAnnAdm(\'' + a.id + '\')">تعديل</button></div></div>').join('') || '<div class="empty-orders">لا توجد إعلانات</div>');
}
function openAnnAdm(id) {
    admEdit = id; const a = id ? HWBiz.announcementsCol.get(id) : { target: 'customers', title: '', body: '' };
    admSheet(aHead('الإعلانات', id ? 'تعديل الإعلان' : 'إعلان جديد') +
        '<div class="field"><label for="anTarget">يظهر لـ</label><select id="anTarget">' + Object.keys(AUD).map(k => '<option value="' + k + '"' + (k === a.target ? ' selected' : '') + '>' + AUD[k] + '</option>').join('') + '</select></div>' +
        fld('anTitle', 'العنوان', a.title) + '<div class="field"><label for="anBody">النص <span class="opt">(اختياري)</span></label><textarea id="anBody" rows="2">' + AE(a.body || '') + '</textarea></div>' + fld('anEnd', 'ينتهي في <span class="opt">(اختياري)</span>', dateVal(a.endsAt), 'type="date"') +
        '<div class="btn-row">' + (id ? '<button type="button" class="ghost-btn dng" onclick="delCol(\'announcements\',\'' + id + '\')">حذف</button>' : '') + '<button type="button" class="submit-btn" onclick="saveAnnAdm()"><span class="btn-label">نشر</span></button></div>');
}
function saveAnnAdm() {
    const t = A$('anTitle').value.trim(); if (!t) { HWOrders.toast('اكتب عنوان الإعلان'); return; }
    const rec = { target: A$('anTarget').value, title: t, body: A$('anBody').value.trim(), endsAt: dateEnd(A$('anEnd').value) };
    if (admEdit) HWBiz.announcementsCol.patch(admEdit, rec); else HWBiz.announcementsCol.create(Object.assign({ active: true, at: Date.now() }, rec));
    logAct('ann', 'إعلان إلى ' + AUD[rec.target] + ': ' + t); closeAdm(); renderManage();
}

/* ---------- فريق العمليات (منسقون يدخلون لوحة الإدارة) ---------- */
function mgTeam() {
    const l = staffCol.list();
    return '<p class="mut mg-note">المنسق يدخل لوحة الإدارة باسم المستخدم وكلمة المرور، وتظهر أفعاله باسمه في سجل النشاط.</p><button type="button" class="submit-btn mg-add" onclick="openStaffAdm(null)"><span class="btn-label">+ منسق جديد</span></button>' +
        '<div class="mg-card"><div class="mg-top"><span class="mg-ic">★</span><div><b>HIGHWAY Delivery</b><small dir="ltr" style="text-align:right">admin · مسؤول النظام</small></div></div></div>' +
        l.map(s => '<div class="mg-card' + (s.active === false ? ' off' : '') + '"><div class="mg-top"><span class="mg-ic">' + AE(String(s.name).charAt(0)) + '</span><div><b>' + AE(s.name) + '</b><small dir="ltr" style="text-align:right">' + AE(s.user) + ' · ' + (s.active === false ? 'موقوف' : 'منسق عمليات') + '</small></div><button type="button" class="more-link inl" onclick="openStaffAdm(\'' + s.id + '\')">تعديل</button></div></div>').join('');
}
function openStaffAdm(id) {
    admEdit = id; const s = id ? staffCol.get(id) : { name: '', user: '' };
    admSheet(aHead('الفريق', id ? 'تعديل منسق' : 'منسق جديد') + fld('sfName', 'الاسم', s.name) + fld('sfUser', 'اسم المستخدم (إنجليزي)', s.user, 'dir="ltr" autocapitalize="off"') +
        fld('sfPass', 'كلمة المرور' + (id ? ' <span class="opt">(اتركها فارغة لعدم التغيير)</span>' : ''), '', 'type="text" dir="ltr" autocomplete="off"') +
        '<div class="btn-row">' + (id ? '<button type="button" class="ghost-btn dng" onclick="toggleCol(\'staff\',\'' + id + '\');closeAdm()">' + (s.active === false ? 'تفعيل' : 'إيقاف') + '</button>' : '') + '<button type="button" class="submit-btn" onclick="saveStaffAdm()"><span class="btn-label">حفظ</span></button></div>');
}
function saveStaffAdm() {
    const name = A$('sfName').value.trim(), user = normUser(A$('sfUser').value), pass = A$('sfPass').value.trim();
    if (!name || user.length < 3) { HWOrders.toast('أدخل الاسم واسم مستخدم صحيح'); return; }
    if (allUsers().some(u => u.names.includes(user) && u.id !== admEdit)) { HWOrders.toast('اسم المستخدم مستخدم'); return; }
    if (!admEdit && pass.length < 6) { HWOrders.toast('كلمة المرور 6 أحرف على الأقل'); return; }
    const id = admEdit || 'st' + Date.now().toString(36), rec = { name, user, role: 'dispatcher' };
    if (pass) rec.hash = sha256('HIGHWAY|' + id + '|' + pass);
    if (admEdit) staffCol.patch(id, rec); else staffCol.create(Object.assign({ id, active: true }, rec));
    logAct('team', (admEdit ? 'تعديل المنسق ' : 'إضافة المنسق ') + name); closeAdm(); renderManage();
}

/* ---------- أدوات مشتركة للمجموعات ---------- */
const COLS = { offers: HWBiz.offers, promos: HWBiz.promos, targets: HWBiz.targets, announcements: HWBiz.announcementsCol, staff: staffCol };
function toggleCol(name, id) { const c = COLS[name], d = c.get(id); if (!d) return; c.patch(id, { active: d.active === false }); logAct(name === 'staff' ? 'team' : name === 'announcements' ? 'ann' : name.replace(/s$/, ''), (d.active === false ? 'تفعيل: ' : 'إيقاف: ') + (d.title || d.name || id)); buzz(); renderManage(); }
function delCol(name, id) { const c = COLS[name], d = c.get(id) || {}; if (!confirm('حذف نهائي؟')) return; c.remove(id); logAct(name === 'announcements' ? 'ann' : name.replace(/s$/, ''), 'حذف: ' + (d.title || id)); closeAdm(); renderManage(); }

/* =========================================================
   ربط الشاشات والتحديث
   ========================================================= */
Object.assign(TAB_OF, { 'screen-manage': 'manage', 'screen-issues': 'manage', 'screen-log': 'manage' });
(function () {
    const _g = window.goTo;
    window.goTo = function (id) { _g(id); if (id === 'screen-dashboard') { opsSig = ''; setTimeout(renderHome, 60); } if (id === 'screen-manage') renderManage(); if (id === 'screen-issues') renderIssues(); if (id === 'screen-log') renderLog(); };
    const _r = window.renderBoard;
    window.renderBoard = function () { _r(); if (scr() === 'screen-dashboard') renderHome(); if (scr() === 'screen-manage' && mgTab !== 'prices') renderManage(); };
})();
function refreshAdm() { const s = scr(); if (s === 'screen-dashboard') renderHome(); else if (s === 'screen-manage' && mgTab !== 'prices') renderManage(); else if (s === 'screen-issues') renderIssues(); else if (s === 'screen-log') renderLog(); renderIssueBadge(); }
[logCol, issuesCol, stCol, staffCol, HWBiz.offers, HWBiz.promos, HWBiz.targets, HWBiz.announcementsCol].forEach(c => c.subscribe(refreshAdm));
capsCol.subscribe(() => { if (scr() === 'screen-dashboard') renderHome(); });
let lastIss = null;
issuesCol.subscribe(l => {                               // بلاغ جديد من كابتن: تنبيه صوتي
    const ids = l.filter(i => i.status !== 'resolved').map(i => i.id);
    if (lastIss && ids.some(i => lastIss.indexOf(i) < 0)) { HWNotify.play('alert'); HWOrders.toast('بلاغ جديد من كابتن'); HWNotify.notify('HIGHWAY · بلاغ', 'بلاغ جديد من كابتن'); }
    lastIss = ids;
});
document.addEventListener('DOMContentLoaded', () => setTimeout(renderHome, 400));

/* الإشعارات الحقيقية: بلاغات وطلبات متأخرة حتى واللوحة مغلقة */
HWPush.init('admin', () => (currentUser ? currentUser.id : ''), { open: (id) => { if (HWOrders.get(id)) openOrderSheet(id); else goTo('screen-issues'); } });
