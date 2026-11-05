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
const LOG_IC = { assign: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>', reassign: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>', cancel: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>', status: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>', settle: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>', store: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l1.5-5h15L21 9M4 9v11h16V9M3 9h18"/></svg>', offer: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 5 5 19"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/></svg>', promo: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>', target: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>', ann: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1Z"/><path d="M16 9a4 4 0 0 1 0 6"/></svg>', team: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M22 21a7 7 0 0 0-4-6.3"/></svg>', issue: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17h.01"/></svg>', auto: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>', cap: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M9 17h6l-2-6h-3M15 11l2-4h3"/></svg>' };
function renderLog() {
    const box = A$('logBody'); if (!box) return;
    const l = logCol.list().slice().sort((a, b) => b.at - a.at).slice(0, 200);
    box.innerHTML = l.length ? l.map(x => '<div class="lg-row"><span class="lg-ic">' + (LOG_IC[x.action] || '•') + '</span><div><b>' + AE(x.text) + '</b><small>' + AE(x.by) + ' · ' + new Date(x.at).toLocaleDateString('ar-JO') + ' ' + HWOrders.fmtTime(x.at) + '</small></div></div>').join('')
        : '<div class="empty-orders">لا يوجد نشاط مسجّل بعد</div>';
}

/* =========================================================
   2) الرئيسية: مؤشرات الأداء + خريطة العمليات
   ========================================================= */
function kpis(from, to) {
    const l = allOrders.filter(o => o.createdAt >= from && (!to || o.createdAt <= to)), done = l.filter(o => o.status === 'delivered'), canc = l.filter(o => o.status === 'cancelled');
    const t = done.reduce((a, o) => { const s = HWOrders.settle(o); a.fee += s.fee; a.com += s.commission; a.promo += s.promo; a.gmv += s.items; return a; }, { fee: 0, com: 0, promo: 0, gmv: 0 });
    const mins = done.map(o => { const d = (o.history || []).filter(h => h.s === 'delivered')[0]; return d ? (d.t - (o.scheduledFor ? HWOrders.dispatchAt(o) : o.createdAt)) / 60000 : null; }).filter(x => x != null && x > 0);
    const rated = done.filter(o => o.rating && o.rating.store);
    return { n: l.length, done: done.length, canc: canc.length, rate: l.length ? Math.round(canc.length / l.length * 100) : 0, avgMin: mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : 0,
        gmv: t.gmv, fee: t.fee, com: t.com, promo: t.promo, net: HWBiz.r2(t.com - t.promo), rating: rated.length ? (rated.reduce((a, o) => a + o.rating.store, 0) / rated.length).toFixed(1) : '—' };
}
/* تفاصيل مؤشرات الأداء وإحصائيات الكباتن (hw-stats.js) */
function statDetail(key) {
    const from = HWBiz.periodStart('day'), l = allOrders.filter(o => o.createdAt >= from), done = l.filter(o => o.status === 'delivered');
    const m = v => AM(v), k = kpis(from), it = (o, v) => HWStats.orderItem(o, v);
    const dmin = o => { const d = (o.history || []).filter(h => h.s === 'delivered')[0]; return d ? Math.round((d.t - (o.scheduledFor ? HWOrders.dispatchAt(o) : o.createdAt)) / 60000) : null; };
    const by = (arr, f) => { const r = {}; arr.forEach(o => { const key2 = f(o) || '—'; r[key2] = (r[key2] || 0) + 1; }); return Object.keys(r).sort((a, b) => r[b] - r[a]); };
    switch (key) {
        case 'k-n': return { title: 'طلبات اليوم', value: k.n, sub: k.done + ' مسلّمة', rows: [['مسلّمة', k.done], ['نشطة', l.filter(HWOrders.isActive).length], ['ملغاة', k.canc], ['أكثر متجر', by(l, o => o.storeName)[0] || '—']], list: l.slice().sort((a, b) => b.createdAt - a.createdAt).map(o => it(o, HWOrders.fmtTime(o.createdAt))) };
        case 'k-min': { const xs = done.map(o => [o, dmin(o)]).filter(x => x[1] != null).sort((a, b) => b[1] - a[1]);
            return { title: 'متوسط وقت التوصيل', value: k.avgMin || '—', unit: 'دقيقة', rows: [['الأسرع', xs.length ? xs[xs.length - 1][1] + ' د' : '—'], ['الأبطأ', xs.length ? xs[0][1] + ' د' : '—']], listTitle: 'من الأبطأ للأسرع', list: xs.map(x => it(x[0], x[1] + ' د')) }; }
        case 'k-gmv': { const r = {}; done.forEach(o => { const s = HWOrders.settle(o); r[o.storeName || '—'] = (r[o.storeName || '—'] || 0) + s.items; });
            return { title: 'قيمة الطلبات (GMV)', value: m(k.gmv), unit: 'د.أ', rows: [['رسوم التوصيل', m(k.fee)], ['متوسط الطلب', done.length ? m(k.gmv / done.length) : '—']], listTitle: 'حسب المتجر', list: Object.keys(r).sort((a, b) => r[b] - r[a]).map(n => ({ t: n, v: m(r[n]) + ' د.أ' })) }; }
        case 'k-net': return { title: 'صافي المنصة', value: m(k.net), unit: 'د.أ', rows: [['العمولة', m(k.com)], ['أكواد الخصم', '− ' + m(k.promo)]], listTitle: 'العمولة لكل طلب', list: done.map(o => it(o, m(HWOrders.settle(o).commission))) };
        case 'k-canc': { const c = l.filter(o => o.status === 'cancelled');
            return { title: 'نسبة الإلغاء', value: k.rate + '٪', sub: k.canc + ' من ' + k.n, listTitle: 'الطلبات الملغاة', list: c.map(o => Object.assign(it(o, ''), { s: (o.cancelReason || o.cancelBy || 'بدون سبب') + ' · ' + HWOrders.ago(o.updatedAt || o.createdAt) })), empty: 'لا توجد طلبات ملغاة اليوم' }; }
        case 'k-rate': { const r = done.filter(o => o.rating && o.rating.store);
            return { title: 'رضا العملاء', value: k.rating, unit: 'من 5', rows: [5, 4, 3, 2, 1].map(n => [n + ' ★', r.filter(o => Math.round(o.rating.store) === n).length]).slice(0, 4), listTitle: 'التقييمات', list: r.map(o => Object.assign(it(o, '★ ' + o.rating.store), { s: o.rating.comment || (o.customer && o.customer.name) || '' })), empty: 'لا توجد تقييمات اليوم' }; }
        case 'c-online': { const c = capsCol.list().filter(x => x.online && x.active !== false);
            return { title: 'متصلون الآن', value: c.length, listTitle: 'الكباتن المتصلون', list: c.map(x => { const a = allOrders.filter(o => o.captain && o.captain.id === x.id && (o.status === 'accepted' || o.status === 'picked'))[0]; return { t: x.name, s: x.phone, tag: a ? 'في مهمة ' + a.code : 'متاح', tc: a ? 't' : 'd' }; }), empty: 'لا يوجد كباتن متصلون الآن' }; }
        case 'c-all': return { title: 'إجمالي الكباتن', value: capsCol.list().length, rows: [['متصلون', capsCol.list().filter(x => x.online && x.active !== false).length], ['موقوفون', capsCol.list().filter(x => x.active === false).length]], listTitle: 'كل الكباتن', list: capsCol.list().map(x => ({ t: x.name, s: x.phone, tag: x.active === false ? 'موقوف' : x.online ? 'متصل' : 'غير متصل', tc: x.active === false ? 'r' : x.online ? 't' : '' })) };
        case 'c-done': case 'c-com': {
            const dd = allOrders.filter(o => o.status === 'delivered' && o.captain && inCapRange(o.updatedAt || o.createdAt)), r = {};
            dd.forEach(o => { const s = HWOrders.settle(o), id = o.captain.id; r[id] = r[id] || { n: 0, com: 0, name: o.captain.name }; r[id].n++; r[id].com += s.commission; });
            const ids = Object.keys(r).sort((a, b) => key === 'c-done' ? r[b].n - r[a].n : r[b].com - r[a].com);
            return { title: key === 'c-done' ? 'طلبات مسلّمة' : 'عمولة المنصة', value: key === 'c-done' ? dd.length : m(ids.reduce((a, i) => a + r[i].com, 0)), unit: key === 'c-done' ? '' : 'د.أ', sub: { today: 'اليوم', week: 'آخر ٧ أيام', all: 'كل الفترات' }[capRange], listTitle: 'حسب الكابتن', list: ids.map(i => ({ t: r[i].name, s: r[i].n + ' طلب', v: key === 'c-done' ? r[i].n : m(r[i].com) })) }; }
    }
}
/* يحتاج تدخلك: الاستثناءات أولًا (مثل لوحات Onfleet وUber) — كل بند يفتح مكانه */
function needsAttention() {
    const now = Date.now(), act = allOrders.filter(HWOrders.isActive), t = (o, s) => { const h = (o.history || []).filter(x => x.s === s)[0]; return h ? h.t : 0; };
    const due = o => o.scheduledFor ? HWOrders.dispatchAt(o) : o.createdAt;
    const pend = act.filter(o => HWOrders.isMarket(o) && o.storeState === 'pending' && now - o.createdAt > 3 * 60000);
    const noCap = act.filter(o => o.status === 'new' && !o.captain && (!HWOrders.isMarket(o) || o.storeState !== 'pending') && now - due(o) > 5 * 60000 && due(o) <= now);
    const late = act.filter(o => o.status !== 'new' && now - due(o) > ((o.prepMin || 20) + (o.routeMin || 15) + 15) * 60000);
    const iss = issuesCol.list().filter(i => i.status !== 'resolved').length;
    const lim = capsCol.list().filter(c => c.overLimit && c.active !== false);
    const ns = allOrders.filter(o => o.noShow && HWOrders.isToday(o.updatedAt || o.createdAt)).length;
    const noLoc = stCol.loaded() ? HWBiz.storeList().filter(x => (stCol.get(x.id) || {}).lat == null) : [];
    const unp = typeof unpricedList === 'function' ? unpricedList() : [];
    return [
        unp.length && ['y', (unp.length === 1 ? 'طلب واحد' : unp.length + ' طلبات') + ' بلا أجرة توصيل', 'اضغط لتسعيره' + (unp.length > 1 ? 'ا واحدًا تلو الآخر' : ''), 'openPricing()'],
        pend.length && ['r', pend.length + ' بانتظار قبول المتجر', 'أكثر من 3 دقائق', "goTo('screen-board')"],
        noCap.length && ['r', noCap.length + ' بلا كابتن', 'أكثر من 5 دقائق', "goTo('screen-board')"],
        late.length && ['y', late.length + ' متأخر', 'تجاوز الوقت المتوقع', "goTo('screen-board')"],
        iss && ['y', iss + ' بلاغ مفتوح', 'بحاجة لمراجعة', "goTo('screen-issues')"],
        lim.length && ['y', lim.length + ' كابتن تجاوز حد النقد', lim.map(c => c.name).slice(0, 2).join('، '), "tabGo('screen-captains')"],
        noLoc.length && ['y', noLoc.length + ' متجر بلا موقع', 'الكباتن لن يروا مكانه: ' + noLoc.map(x => x.name).slice(0, 2).join('، '), "mgTab='stores';tabGo('screen-manage')"],
        ns && ['', ns + ' لم يستلم اليوم', 'سجل العملاء', "mgTab='customers';tabGo('screen-manage')"]
    ].filter(Boolean);
}
/* قائمة البداية: تظهر حتى تكتمل خطوات تجهيز المنصة، ثم تختفي تلقائيًا */
function setupSteps() {
    const stores = HWBiz.storeList(), caps = capsCol.list();
    const located = stores.length && stCol.loaded() && stores.every(x => (stCol.get(x.id) || {}).lat != null);
    return [
        [stores.length > 0, 'أضف أول متجر', 'الاسم والشعار وحساب الدخول', "mgTab='stores';tabGo('screen-manage')"],
        [!!located, 'حدّد موقع كل متجر على الخريطة', 'حتى يراه العملاء ويصله الكباتن', "mgTab='stores';tabGo('screen-manage')"],
        [stores.some(x => (HWDB.col('menus').get(x.id) || { cats: [] }).cats.some(c => (c.items || []).length)), 'جهّز منيو متجر واحد على الأقل', 'الأصناف والأسعار والصور', "mgTab='stores';tabGo('screen-manage')"],
        [caps.length > 0, 'أضف أول كابتن', 'رقم الهاتف والرمز السري', "tabGo('screen-captains')"],
        [allOrders.length > 0, 'استقبل أول طلب', 'من تطبيق العميل أو المتجر أو طلب يدوي', "goTo('screen-restaurants')"]
    ];
}
function setupHtml() {
    const st = setupSteps(), done = st.filter(x => x[0]).length;
    if (done === st.length) return '';
    return '<div class="setup"><div class="setup-h"><b>جهّز منصتك</b><span>' + done + ' من ' + st.length + '</span></div><div class="setup-bar"><i style="width:' + Math.round(done / st.length * 100) + '%"></i></div>' +
        st.map(x => '<button type="button" class="setup-s' + (x[0] ? ' ok' : '') + '"' + (x[0] ? ' disabled' : ' onclick="' + x[3] + '"') + '><i>' + (x[0] ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : '') + '</i><span><b>' + x[1] + '</b><small>' + x[2] + '</small></span></button>').join('') + '</div>';
}
function needHtml() {
    const l = needsAttention(), setup = setupHtml();
    if (setup) return setup + (l.length ? '<div class="need"><b class="need-h">يحتاج تدخلك</b><div class="need-row">' + l.map(x => '<button type="button" class="need-c ' + x[0] + '" onclick="' + x[3] + '"><b>' + x[1] + '</b><small>' + AE(x[2]) + '</small></button>').join('') + '</div></div>' : '');
    if (!l.length) return '<div class="need-line"><i></i>لا شيء يحتاج تدخلك الآن</div>';
    return '<div class="need"><b class="need-h">يحتاج تدخلك</b><div class="need-row">' + l.map(x => '<button type="button" class="need-c ' + x[0] + '" onclick="' + x[3] + '"><b>' + x[1] + '</b><small>' + AE(x[2]) + '</small></button>').join('') + '</div></div>';
}
/* الفرق عن أمس في نفس الوقت من اليوم */
function delta(now, then, money) {
    const d = money ? HWBiz.r2(now - then) : now - then; if (!then && !now) return '';
    return '<i class="dl' + (d < 0 ? ' dn' : d > 0 ? ' up' : '') + '">' + (d > 0 ? '+' : d < 0 ? '−' : '') + (money ? AM(Math.abs(d)) : Math.abs(d)) + ' عن أمس</i>';
}
function kpisYesterday() { return kpis(HWBiz.periodStart('day') - 864e5, Date.now() - 864e5); }
/* جودة خدمة المتاجر: نسبة القبول، متوسط وقت القبول، الطلبات الضائعة */
function storeQuality() {
    const from = HWBiz.periodStart('week'), r = {};
    allOrders.filter(o => HWOrders.isMarket(o) && o.createdAt >= from && o.storeState !== 'pending').forEach(o => {   /* الطلب الذي ما زال بانتظار المتجر لا يُحسب بعد */
        const k = o.storeId || o.storeName, x = r[k] = r[k] || { name: o.storeName || '—', n: 0, acc: 0, lost: 0, mins: [] };
        x.n++; const a = (o.history || []).filter(h => h.s === 'store_accepted')[0];
        if (a) { x.acc++; x.mins.push((a.t - o.createdAt) / 60000); }
        if (o.storeState === 'rejected' || o.storeState === 'timeout') x.lost++;
    });
    const l = Object.keys(r).map(k => r[k]).filter(x => x.n >= 1).sort((a, b) => (a.acc / a.n) - (b.acc / b.n) || b.lost - a.lost).slice(0, 6);
    if (!l.length) return '';
    return '<div class="sq"><b class="perf-h">جودة خدمة المتاجر <small class="mut">آخر ٧ أيام</small></b>' + l.map(x => {
        const p = Math.round(x.acc / x.n * 100), m = x.mins.length ? Math.round(x.mins.reduce((a, b) => a + b, 0) / x.mins.length * 10) / 10 : null;
        return '<div class="sq-r"><span class="sq-n">' + AE(x.name) + '</span><span class="sq-b"><i style="width:' + p + '%" class="' + (p < 85 ? 'lo' : '') + '"></i></span><b class="' + (p < 85 ? 'lo' : '') + '">' + p + '٪</b>' +
            '<small>' + (m != null ? m + ' د للقبول' : '—') + (x.lost ? ' · ضاع ' + x.lost : '') + '</small></div>';
    }).join('') + '</div>';
}
function renderKpis() {
    const box = A$('kpiBox'); if (!box) return;
    const k = kpis(HWBiz.periodStart('day')), y = kpisYesterday(), live = capsCol.list().filter(isLive).length, open = issuesCol.list().filter(i => i.status !== 'resolved').length;
    renderLive();
    if (!allOrders.length) { box.innerHTML = '<div class="kpi-none">تظهر الأرقام هنا بعد أول طلب</div>'; return; }
    box.innerHTML = '<div class="kpi-grid">' +
        '<div class="kpi hot" data-stat="k-n"><small>طلبات اليوم</small><b>' + k.n + '</b><em>' + k.done + ' مسلّمة</em>' + delta(k.n, y.n) + '</div>' +
        '<div class="kpi" data-stat="k-min"><small>متوسط وقت التوصيل</small><b>' + (k.avgMin || '—') + '</b><em>دقيقة</em></div>' +
        '<div class="kpi" data-stat="k-gmv"><small>قيمة الطلبات (GMV)</small><b>' + AM(k.gmv) + '</b><em>د.أ</em>' + delta(k.gmv, y.gmv, 1) + '</div>' +
        '<div class="kpi" data-stat="k-net"><small>صافي المنصة</small><b>' + AM(k.net) + '</b><em>عمولة ' + AM(k.com) + ' − أكواد ' + AM(k.promo) + '</em>' + delta(k.net, y.net, 1) + '</div>' +
        '<div class="kpi" data-stat="k-canc"><small>نسبة الإلغاء</small><b>' + k.rate + '٪</b><em>' + k.canc + ' ملغي</em></div>' +
        '<div class="kpi" data-stat="k-rate"><small>رضا العملاء</small><b>' + k.rating + '</b><em>من 5</em></div>' +
        '<button type="button" class="kpi" onclick="tabGo(\'screen-captains\')"><small>كباتن متصلون</small><b>' + live + '</b><em>من ' + capsCol.list().length + '</em></button>' +
        '<button type="button" class="kpi' + (open ? ' warn' : '') + '" onclick="goTo(\'screen-issues\')"><small>بلاغات مفتوحة</small><b>' + open + '</b><em>اضغط للمراجعة</em></button></div>' + storeQuality();
}
let opsMap = null, opsLayer = null, opsExtra = null, opsSig = '', opsFitted = false, opsMk = {}, opsPop = null;
const locAge = c => Date.now() - (c.locAt || c.lastSeen || 0);
/* =========================================================
   خريطة العمليات: علامات ثابتة تتحرك بنعومة (لا تُمسح وتُرسم من جديد)،
   والخريطة لا تقفز: تُضبط على الكل مرة واحدة، وبعدها زر "عرض الكل".
   الضغط على كابتن أو متجر يفتح بطاقة صغيرة تنبثق من الدائرة بأهم ما يحتاجه المنسق.
   ========================================================= */
function renderOpsMap() {
    const el = A$('opsMapEl'); if (!el || !window.L || scr() !== 'screen-dashboard') return;
    if (!opsMap) {
        opsMap = HWMap.create(el, { center: HWMap.center(), zoom: 12 }); opsLayer = L.layerGroup().addTo(opsMap); opsExtra = L.layerGroup().addTo(opsMap);
        opsMap.on('popupclose', () => { opsPop = null; el.parentNode.classList.remove('pop-on'); }); opsMap.on('popupopen', () => el.parentNode.classList.add('pop-on'));
    }
    const caps = capsCol.list().filter(c => c.lat != null && c.active !== false && c.online && locAge(c) < 30 * 60000), act = allOrders.filter(HWOrders.isActive);
    const stores = storePins(), stOf = storeStates(act);
    const sig = caps.map(c => c.id + c.lat + c.lng + (locAge(c) > 90000 ? 'o' : '')).join() + '|' + act.map(o => o.id + o.status).join() + '|' + stores.map(x => x.id + x.p + stOf[x.id]).join();
    if (opsPop) refreshPop();
    if (sig === opsSig) return; opsSig = sig;
    const pts = [], keep = {};
    stores.forEach(x => {
        const k = 's' + x.id, st = stOf[x.id] || ''; keep[k] = 1; pts.push(x.p);
        let r = opsMk[k];
        if (!r) { r = opsMk[k] = { m: L.marker(x.p, { icon: HWMap.ICON.store(x.id, st) }).addTo(opsLayer), st }; r.m.on('click', () => openPop('s', x.id, r.m)); }
        else { r.m.setLatLng(x.p); if (r.st !== st) { r.m.setIcon(HWMap.ICON.store(x.id, st)); r.st = st; } }
        r.m.setZIndexOffset(st ? 300 : 100);
    });
    caps.forEach(c => {
        const k = 'k' + c.id, p = [c.lat, c.lng], old = locAge(c) > 90000; keep[k] = 1; pts.push(p);
        let r = opsMk[k];
        if (!r) { r = opsMk[k] = { m: L.marker(p, { icon: HWMap.ICON.cap(), zIndexOffset: 400 }).addTo(opsLayer) }; r.m.on('click', () => openPop('k', c.id, r.m)); }
        else slide(r.m, p);
        r.m.setOpacity(old ? .5 : 1);
    });
    Object.keys(opsMk).forEach(k => { if (!keep[k]) { opsLayer.removeLayer(opsMk[k].m); delete opsMk[k]; } });
    opsExtra.clearLayers();
    const COLOR = { n: '#EF0000', a: '#25CED1', p: '#0E3A3B' }, pinned = {}; stores.forEach(x => { pinned[x.id] = 1; });
    act.forEach(o => {
        const k = o.status === 'new' ? 'n' : o.status === 'accepted' ? 'a' : 'p';
        if (o.storeLoc && !pinned[o.storeId]) { const p = [o.storeLoc.lat, o.storeLoc.lng]; pts.push(p); L.circleMarker(p, { radius: 8, color: '#fff', weight: 2, fillColor: COLOR[k], fillOpacity: 1 }).on('click', () => openOrderSheet(o.id)).addTo(opsExtra); }
        if (o.address && o.address.lat != null) { const p = [o.address.lat, o.address.lng]; pts.push(p); L.marker(p, { icon: HWMap.ICON.home() }).on('click', () => openOrderSheet(o.id)).addTo(opsExtra); }
    });
    A$('opsLbl').textContent = act.length + ' طلب نشط · ' + caps.length + ' كابتن';
    if (!opsFitted && pts.length) { opsMap.invalidateSize(); HWMap.fit(opsMap, pts, HWMap.mpPad()); opsFitted = true; }
}
/* تحريك علامة الكابتن لموقعه الجديد بنعومة بدل القفز */
function slide(m, to) {
    const from = m.getLatLng(); if (Math.abs(from.lat - to[0]) < 1e-7 && Math.abs(from.lng - to[1]) < 1e-7) return;
    if (HWMap.km([from.lat, from.lng], to) > 2) { m.setLatLng(to); return; }
    const t0 = performance.now(), D = 900;
    (function step(t) { const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3); m.setLatLng([from.lat + (to[0] - from.lat) * e, from.lng + (to[1] - from.lng) * e]); if (k < 1) requestAnimationFrame(step); })(t0);
}
function opsFitAll() {
    if (!opsMap) return; const pts = [];
    Object.keys(opsMk).forEach(k => { const l = opsMk[k].m.getLatLng(); pts.push([l.lat, l.lng]); });
    opsExtra.eachLayer(l => { if (l.getLatLng) { const x = l.getLatLng(); pts.push([x.lat, x.lng]); } });
    if (pts.length) { closePops(); HWMap.fit(opsMap, pts, Object.assign({ animate: true, duration: .6 }, HWMap.mpPad())); }
    buzz(10);
}
function closePops() { try { if (opsMap) opsMap.closePopup(); if (typeof capMap !== 'undefined' && capMap) capMap.closePopup(); } catch (e) {} }
function popOpts() {
    const cs = getComputedStyle(document.documentElement), h = parseInt(cs.getPropertyValue('--hdr-h'), 10) || 70, b = scr() === 'screen-dashboard' ? (parseInt(cs.getPropertyValue('--dsh'), 10) || 300) : -40;
    return { className: 'hw-pop', closeButton: false, minWidth: 264, maxWidth: 290, offset: [0, -20], autoPanPaddingTopLeft: [16, h + 16], autoPanPaddingBottomRight: [16, b + 60] };
}
function openPop(t, id, m) {
    buzz(10); opsPop = { t, id, m };
    /* نصغّر بطاقة العمليات أولًا ليتسع للبطاقة مكان فوق الخريطة */
    const dsh = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--dsh'), 10) || 0, wait = dsh > 300 && window.opsSheet ? (opsSheet(0), 340) : 0;
    setTimeout(() => { m.unbindPopup(); m.bindPopup(() => t === 'k' ? capInfo(id, 'pop') : storeInfo(id, 'pop'), popOpts()).openPopup(); }, wait);
}
function capPop(m, t, id) { m.on('click', () => { buzz(10); m.unbindPopup(); m.bindPopup(() => t === 'k' ? capInfo(id, 'pop') : storeInfo(id, 'pop'), popOpts()).openPopup(); }); return m; }
function refreshPop() { const p = opsPop; if (p && p.m.isPopupOpen()) p.m.setPopupContent(p.t === 'k' ? capInfo(p.id, 'pop') : storeInfo(p.id, 'pop')); }
setInterval(() => { if (!document.hidden && opsPop) refreshPop(); }, 15000);

/* ---------- بطاقة الكابتن وبطاقة المتجر (الخريطة + ملف المحادثة في الدعم) ---------- */
const ICN = {
    call: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20l1.1-4.6A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z"/></svg>'
};
const telOf = p => p ? String(p).replace(/[^\d+]/g, '') : '';
function agoTxt(ms) { const m = Math.floor(ms / 60000); return m < 1 ? 'الآن' : m < 60 ? 'قبل ' + m + ' د' : 'قبل ' + Math.floor(m / 60) + ' س'; }
function durTxt(ms) { const m = Math.max(0, Math.floor(ms / 60000)); return m < 60 ? m + ' د' : Math.floor(m / 60) + ' س ' + (m % 60) + ' د'; }
function ordChips(list) {
    if (!list.length) return '';
    return '<div class="ip-ords">' + list.slice(0, 4).map(o => '<button type="button" class="ip-o s-' + o.status + '" onclick="closePops();openOrderSheet(\'' + AE(o.id) + '\')"><b dir="ltr">' + AE(HWOrders.shortNo(o)) + '</b><span>' + AE(HWOrders.SHORT[o.status] || '') + '</span></button>').join('') + (list.length > 4 ? '<span class="ip-more">+' + (list.length - 4) + '</span>' : '') + '</div>';
}
function capInfo(id, mode) {
    const c = capsCol.get(id); if (!c) return '<div class="ip"><p class="ip-none">الكابتن غير موجود</p></div>';
    const mine = allOrders.filter(o => o.captain && o.captain.id === id), now = mine.filter(HWOrders.isActive);
    const today = mine.filter(o => o.status === 'delivered' && HWOrders.isToday(doneAt(o) || o.createdAt)).length;
    const due = settleSum(unsettled(id)).due, rt = HWBiz.captainRating(id, allOrders), age = locAge(c), live = isLive(c);
    const stTxt = c.active === false ? 'موقوف' : !c.online ? 'غير متصل' : now.length ? 'مشغول · ' + now.length + ' طلب' : live ? 'متاح الآن' : 'متصل بلا إشارة';
    const stCls = c.active === false ? 'off' : !c.online ? 'idle' : now.length ? 'busy' : live ? 'on' : 'idle';
    const waiting = allOrders.filter(o => o.status === 'new'), ph = telOf(c.phone);
    const giveBtn = mode === 'pop' && live && !now.length && waiting.length ? '<button type="button" class="ip-b go" onclick="quickAssign(\'' + AE(HWOrders.prioritySort(waiting)[0].id) + '\',\'' + AE(id) + '\');opsMap.closePopup()">' + ICN.bolt + 'أسند ' + AE(HWOrders.shortNo(HWOrders.prioritySort(waiting)[0])) + '</button>' : '';
    return '<div class="ip ' + mode + '"><div class="ip-h"><img src="' + AE(HWBiz.capAv(c)) + '" alt=""><div><b>' + AE(c.name || '—') + '</b><span>' + (c.num ? '<i class="cap-no" dir="ltr">' + AE(c.num) + '</i>' : '') + '<em class="ip-st ' + stCls + '">' + stTxt + '</em></span></div></div>' +
        (c.active === false && c.suspendReason ? '<p class="ip-warn">سبب الإيقاف: ' + AE(c.suspendReason) + '</p>' : '') +
        '<div class="ip-k"><div><b>' + today + '</b><small>سلّم اليوم</small></div><div><b dir="ltr">' + AM(due) + '</b><small>المستحق عليه</small></div><div><b>' + (rt.n ? rt.avg.toFixed(1) : '—') + '</b><small>التقييم</small></div></div>' +
        '<div class="ip-l"><span>آخر موقع</span><b>' + (c.lat == null ? 'غير معروف' : age < 90000 ? 'مباشر الآن' : agoTxt(age)) + '</b></div>' +
        (c.online && c.shiftStart ? '<div class="ip-l"><span>الوردية</span><b>منذ ' + durTxt(Date.now() - c.shiftStart) + '</b></div>' : '') +
        (mode !== 'pop' && c.phone ? '<div class="ip-l"><span>الهاتف</span><b dir="ltr">' + AE(c.phone) + '</b></div>' : '') +
        ordChips(now) +
        '<div class="ip-a">' + giveBtn + (ph ? '<a class="ip-b" href="tel:' + AE(ph) + '">' + ICN.call + 'اتصال</a>' : '') +
        '<button type="button" class="ip-b" onclick="' + (mode === 'pop' ? 'closePops();' : 'HWSupport.close();') + 'tabGo(\'screen-captains\');openCapSheet(\'' + AE(id) + '\')">' + ICN.user + 'الملف</button></div></div>';
}
function storeInfo(id, mode) {
    const s = HWBiz.storeById(id); if (!s) return '<div class="ip"><p class="ip-none">المتجر غير موجود</p></div>';
    const st = stCol.get(id) || {}, ss = HWBiz.storeStatus(st), mine = allOrders.filter(o => o.storeId === id), now = HWOrders.prioritySort(mine.filter(HWOrders.isActive));
    const today = mine.filter(o => HWOrders.isToday(o.createdAt) && o.status !== 'cancelled').length, wait = now.filter(o => o.status === 'new').length, rt = HWBiz.storeRating(id, allOrders), ph = telOf(s.phone);
    const stTxt = s.active === false ? 'الحساب موقوف' : ss.open ? 'مفتوح' : ss.paused ? 'متوقف مؤقتًا' : 'مغلق';
    return '<div class="ip ' + mode + '"><div class="ip-h sq"><img src="' + AE(HWBiz.logo(id)) + '" alt="" onerror="this.src=\'logo-icon.png\'"><div><b>' + AE(s.name) + '</b><span><em class="ip-st ' + (s.active === false ? 'off' : ss.open ? 'on' : 'idle') + '">' + stTxt + '</em>' + (s.cat ? '<i class="ip-cat">' + AE(s.cat) + '</i>' : '') + '</span></div></div>' +
        '<div class="ip-k"><div class="' + (wait ? 'hot' : '') + '"><b>' + wait + '</b><small>بانتظار كابتن</small></div><div><b>' + now.length + '</b><small>نشطة الآن</small></div><div><b>' + today + '</b><small>طلبات اليوم</small></div></div>' +
        (s.addr ? '<div class="ip-l"><span>العنوان</span><b>' + AE(s.addr) + '</b></div>' : '') +
        (rt.n ? '<div class="ip-l"><span>تقييم العملاء</span><b>' + rt.avg.toFixed(1) + ' من 5 · ' + rt.n + ' تقييم</b></div>' : '') +
        (mode !== 'pop' && s.phone ? '<div class="ip-l"><span>الهاتف</span><b dir="ltr">' + AE(s.phone) + '</b></div>' : '') +
        ordChips(now) +
        '<div class="ip-a"><button type="button" class="ip-b go" onclick="' + (mode === 'pop' ? 'closePops();' : 'HWSupport.close();') + 'goTo(\'screen-restaurants\');selectPickup(' + AE(JSON.stringify(s.name)) + ',false,\'' + AE(id) + '\')">' + ICN.plus + 'طلب يدوي</button>' +
        (ph ? '<a class="ip-b" href="tel:' + AE(ph) + '">' + ICN.call + 'اتصال</a>' : '') +
        '<button type="button" class="ip-b" onclick="' + (mode === 'pop' ? 'closePops();' : 'HWSupport.close();') + 'openStoreAdm(\'' + AE(id) + '\')">' + ICN.user + 'الملف</button></div></div>';
}
/* العميل (ملف المحادثة في الدعم): طلباته وسجله */
function custInfo(phone, name, img) {
    const mine = allOrders.filter(o => o.customer && o.customer.phone === phone), done = mine.filter(o => o.status === 'delivered'), canc = mine.filter(o => o.status === 'cancelled').length;
    const now = mine.filter(HWOrders.isActive), spent = done.reduce((a, o) => a + HWOrders.settle(o).collected, 0), rec = custCol.get(phone) || {}, last = mine.slice().sort((a, b) => b.createdAt - a.createdAt)[0], ph = telOf(phone);
    return '<div class="ip full"><div class="ip-h"><img src="' + AE(img || 'art/av-cm.png') + '" alt="" onerror="this.src=\'logo-icon.png\'"><div><b>' + AE(name || 'عميل') + '</b><span><em class="ip-st ' + (rec.blocked ? 'off' : 'on') + '">' + (rec.blocked ? 'محظور' : 'عميل') + '</em></span></div></div>' +
        '<div class="ip-k"><div><b>' + done.length + '</b><small>طلبات مسلّمة</small></div><div><b dir="ltr">' + AM(spent) + '</b><small>مجموع ما دفع</small></div><div class="' + (canc ? 'hot' : '') + '"><b>' + canc + '</b><small>ملغاة</small></div></div>' +
        (phone ? '<div class="ip-l"><span>الهاتف</span><b dir="ltr">' + AE(phone) + '</b></div>' : '') +
        (last ? '<div class="ip-l"><span>آخر طلب</span><b>' + AE(last.storeName || '') + ' · ' + AE(HWOrders.fmtTime(last.createdAt)) + '</b></div>' : '') +
        (rec.noShows ? '<div class="ip-l"><span>لم يستلم</span><b>' + rec.noShows + ' طلبات</b></div>' : '') +
        ordChips(now) + '<div class="ip-a">' + (ph ? '<a class="ip-b" href="tel:' + AE(ph) + '">' + ICN.call + 'اتصال</a>' : '') + '</div></div>';
}
/* أهم حالة لطلبات كل متجر الآن: n بانتظار كابتن ← a الكابتن في الطريق للمتجر ← p في الطريق للعميل */
function storeStates(act) {
    const RANK = { n: 3, a: 2, p: 1 }, stOf = {};
    act.forEach(o => { const k = o.status === 'new' ? 'n' : o.status === 'accepted' ? 'a' : 'p'; if (o.storeId && (!stOf[o.storeId] || RANK[k] > RANK[stOf[o.storeId]])) stOf[o.storeId] = k; });
    return stOf;
}
/* مواقع المتاجر التي حددتها الإدارة: تظهر على خرائط المنسقين فقط */
function storePins() { return HWBiz.storeList().map(s => { const st = stCol.get(s.id) || {}; return st.lat != null ? { id: s.id, name: s.name, p: [st.lat, st.lng] } : null; }).filter(Boolean); }
stCol.subscribe(() => { opsSig = ''; try { renderOpsMap(); } catch (e) {} });
function renderHome() { renderKpis(); renderOpsMap(); }

/* =========================================================
   العمليات الحية (الرئيسية): يحتاج تدخلك ← الطلبات حسب المرحلة بعدّاد ملوّن
   مثل لوحات الشركات الكبرى: الاستثناء أولًا، وكل إجراء من مكانه
   ========================================================= */
const STAGES = [
    { k: 'n', t: 'بانتظار كابتن', f: o => o.status === 'new', since: o => o.scheduledFor ? HWOrders.dispatchAt(o) : o.createdAt, warn: 3, late: 5 },
    { k: 'a', t: 'الكابتن متجه للمطعم', f: o => o.status === 'accepted', since: o => stepAt(o, 'accepted') || o.createdAt, warn: 12, late: 20 },
    { k: 'p', t: 'في طريقه للعميل', f: o => o.status === 'picked', since: o => stepAt(o, 'picked') || o.createdAt, warn: o => (o.routeMin || 15), late: o => (o.routeMin || 15) + 10 }
];
function stepAt(o, s) { const h = (o.history || []).filter(x => x.s === s).pop(); return h ? h.t : 0; }
function minsSince(t) { return Math.max(0, Math.floor((Date.now() - t) / 60000)); }
function bestCap(o) {
    const busy = busyIds(), free = capsCol.list().filter(c => isLive(c) && !busy[c.id] && !c.overLimit && (o.offered || []).indexOf(c.id) < 0);
    return free.length ? rank(free, o)[0] : null;
}
function liveCard(o, st) {
    const m = minsSince(st.since(o)), w = typeof st.warn === 'function' ? st.warn(o) : st.warn, l = typeof st.late === 'function' ? st.late(o) : st.late;
    const tone = m >= l ? 'late' : m >= w ? 'warn' : '';
    let line = '', act = '';
    if (st.k === 'n') {
        line = o.urgent ? '<b class="lv-urg">عاجل</b> · ' : '';
        line += o.offerAll ? 'معروض على كل الكباتن' : o.offerTo ? 'يُعرض على ' + AE(o.offerName || '') + (o.offerWhy ? ' · ' + AE(o.offerWhy) : '') : HWOrders.isMarket(o) && o.storeState === 'pending' ? 'بانتظار قبول المطعم' : 'يبحث عن كابتن';
        const c = bestCap(o);
        act = c ? '<button type="button" class="lv-go" data-qa="' + AE(o.id) + '" data-cap="' + AE(c.id) + '"><img src="' + AE(HWBiz.capAv(c)) + '" alt="">أسند لـ ' + AE(String(c.name).split(' ')[0]) + '</button>' : '<button type="button" class="lv-go alt" data-act="assign" data-id="' + AE(o.id) + '">تعيين</button>';
    } else {
        const cp = o.captain || {}, ph = cp.phone ? String(cp.phone).replace(/[^\d+]/g, '') : '';
        line = '<img class="lv-av" src="' + AE(HWBiz.capAv(cp)) + '" alt="">' + AE(cp.name || '') + (cp.num ? ' <span class="cap-no" dir="ltr">' + AE(cp.num) + '</span>' : '');
        act = ph ? '<a class="lv-call" href="tel:' + AE(ph) + '" aria-label="اتصال بالكابتن" onclick="event.stopPropagation()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/></svg></a>' : '';
    }
    const fee = !HWOrders.isMarket(o) && !(HWOrders.settle(o).fee > 0) ? '<span class="lv-tag">بلا أجرة</span>' : '';
    return '<div class="lv-c ' + st.k + (o.urgent ? ' urg' : '') + '" data-lv="' + AE(o.id) + '"><div class="lv-top"><b class="lv-no" dir="ltr">' + AE(HWOrders.shortNo(o)) + '</b><span class="lv-st">' + AE(o.storeName || o.from || '—') + '</span>' + fee +
        '<span class="lv-t ' + tone + '">' + m + ' د</span></div><div class="lv-bot"><span class="lv-l">' + line + (o.to ? ' · <span class="lv-to">' + AE(o.to) + '</span>' : '') + '</span>' + act + '</div></div>';
}
function renderLive() {
    const box = A$('liveBox'); if (!box) return;
    const q = (A$('opsQ') && A$('opsQ').value || '').trim().replace(/^#/, '');
    let act = allOrders.filter(HWOrders.isActive);
    let found = [];
    if (q) {
        const mt = o => (o.code || '').indexOf(q) >= 0 || HWOrders.shortNo(o).indexOf(q) >= 0 || (o.storeName || o.from || '').indexOf(q) >= 0 || (o.captain && (o.captain.name || '').indexOf(q) >= 0);
        found = allOrders.filter(o => !HWOrders.isActive(o) && HWOrders.isToday(o.createdAt) && mt(o)).slice(0, 8);
        act = act.filter(mt);
    }
    const capsLive = capsCol.list().filter(isLive), busy = busyIds(), free = capsLive.filter(c => !busy[c.id]).length;
    if (A$('opsSum')) A$('opsSum').textContent = act.length + ' طلب نشط · ' + free + ' كابتن متاح من ' + capsLive.length;
    let h = q ? '' : needHtml();
    STAGES.forEach(st => {
        const l = HWOrders.prioritySort(act.filter(st.f));
        if (!l.length) return;
        const show = l.slice(0, 25);   /* وقت الذروة: أول 25 في كل مرحلة (الأهم أولًا)، والباقي في صفحة الطلبات */
        h += '<div class="lv-g ' + st.k + '"><div class="lv-gh"><i></i>' + st.t + '<em>' + l.length + '</em></div>' + show.map(o => liveCard(o, st)).join('') +
            (l.length > show.length ? '<button type="button" class="lv-more" onclick="tabGo(\'screen-board\')">و' + (l.length - show.length) + ' طلبات أخرى في صفحة الطلبات</button>' : '') + '</div>';
    });
    if (!act.length && !q) h += '<div class="lv-empty">لا توجد طلبات جارية الآن' + (free ? ' · ' + free + ' كابتن بانتظار الطلبات' : '') + '</div>';
    if (q && !act.length && !found.length) h += '<div class="lv-empty">لا يوجد طلب بهذا الرقم أو الاسم اليوم</div>';
    if (found.length) h += '<div class="lv-g"><div class="lv-gh"><i class="d"></i>طلبات منتهية اليوم</div>' + found.map(o => '<div class="lv-c done" data-lv="' + AE(o.id) + '"><div class="lv-top"><b class="lv-no" dir="ltr">' + AE(HWOrders.shortNo(o)) + '</b><span class="lv-st">' + AE(o.storeName || o.from || '') + '</span><span class="lv-t">' + AE(HWOrders.SHORT[o.status]) + '</span></div></div>').join('') + '</div>';
    box.innerHTML = h;
}
/* إسناد بضغطة واحدة لأفضل كابتن (نفس ترتيب الإسناد التلقائي) */
function quickAssign(oid, cid) {
    const o = HWOrders.get(oid), c = capsCol.get(cid); if (!o || !c || o.status !== 'new') return;
    const eta = new Date(Date.now() + 20 * 60000);
    HWOrders.update(oid, { status: 'accepted', captain: { id: c.id, num: c.num || '', name: c.name, phone: c.phone || '', av: c.av === 'f' ? 'f' : 'm', pv: c.pv || 0 }, claimBy: c.id, offerTo: null, offerAt: 0, offerAll: false, eta: formatTime12h(String(eta.getHours()).padStart(2, '0') + ':' + String(eta.getMinutes()).padStart(2, '0')) });
    logAct('assign', 'إسناد الطلب ' + o.code + ' إلى ' + c.name + ' (ضغطة واحدة)'); buzz(18); HWOrders.toast('أُسند ' + HWOrders.shortNo(o) + ' إلى ' + c.name);
}
document.addEventListener('click', (e) => {
    const qa = e.target.closest('[data-qa]'); if (qa) { e.stopPropagation(); quickAssign(qa.dataset.qa, qa.dataset.cap); return; }
    const lv = e.target.closest('[data-lv]'); if (lv && !e.target.closest('[data-act],a')) openOrderSheet(lv.dataset.lv);
});
setInterval(() => { if (!document.hidden && scr() === 'screen-dashboard') renderLive(); }, 20000);
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
    /* سجل دائم للتسوية: الطلبات تبقى كما هي، وحساب الكابتن الحالي يبدأ من الصفر */
    HWDB.col('settlements').create({ id: 'st' + at.toString(36), capId: cid, capName: c.name || '', capNum: c.num || '', at, by, n: l.length, fee: HWBiz.r2(t.fee), commission: HWBiz.r2(t.com), promo: HWBiz.r2(t.promo), due: HWBiz.r2(t.due), orders: l.map(o => o.code || o.id) });
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
                    : '<div class="btn-row">' + (o ? '<button type="button" class="ghost-btn" onclick="openOrderSheet(\'' + o.id + '\')">الطلب</button>' : '') + (o && o.podAt ? '<button type="button" class="ghost-btn" onclick="showPod(\'' + o.id + '\')">صورة الإثبات</button>' : '') + (i.captain && i.captain.phone ? '<a class="ghost-btn" href="tel:' + AE(i.captain.phone) + '">اتصال</a>' : '') + '<button type="button" class="submit-btn" onclick="resolveIssue(\'' + i.id + '\')"><span class="btn-label">تم الحل</span></button></div>') + '</div>'; }).join('')
            : '<div class="empty-orders">لا توجد بلاغات هنا</div>');
}
/* صورة إثبات الوصول التي التقطها الكابتن عند الباب */
function showPod(id) {
    const o = HWOrders.get(id); if (!o) return;
    admSheet(aHead(AE(o.code), 'صورة الإثبات') + '<div class="pod-box" id="podBox"><span class="mut">جاري التحميل…</span></div>');
    HWBiz.getDoc('pod', id).then(d => { const b = A$('podBox'); if (!b) return;
        b.innerHTML = d && d.data ? '<img src="' + AE(d.data) + '" alt="صورة الإثبات"><small class="mut">التُقطت ' + HWOrders.fmtTime(d.at) + (o.captain ? ' · ' + AE(o.captain.name) : '') + '</small>' : '<span class="mut">لم تُرفع الصورة</span>'; });
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
const MG_TABS = [['stores', 'المتاجر'], ['prices', 'أسعار التوصيل'], ['offers', 'العروض'], ['promos', 'أكواد الخصم'], ['targets', 'أهداف الكباتن'], ['ann', 'الإعلانات'], ['customers', 'العملاء'], ['settings', 'الذروة والنقد'], ['team', 'الفريق']];
function renderManage() {
    const box = A$('mgBody'); if (!box) return;
    const open = issuesCol.list().filter(i => i.status !== 'resolved').length;
    box.innerHTML = '<div class="mg-quick"><button type="button" onclick="goTo(\'screen-issues\')"><b>' + open + '</b><span>بلاغات مفتوحة</span></button><button type="button" onclick="goTo(\'screen-log\')"><b>' + logCol.list().length + '</b><span>سجل النشاط</span></button></div>' +
        '<div class="seg mg-seg">' + MG_TABS.map(t => '<button type="button" class="' + (mgTab === t[0] ? 'on' : '') + '" onclick="mgTab=\'' + t[0] + '\';renderManage()">' + t[1] + '</button>').join('') + '</div>' +
        ({ stores: mgStores, prices: mgPrices, offers: mgOffers, promos: mgPromos, targets: mgTargets, ann: mgAnn, customers: mgCustomers, settings: mgSettings, team: mgTeam })[mgTab]();
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
            return '<div class="mg-card' + (t.active === false ? ' off' : '') + '"><div class="mg-top"><span class="mg-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg></span><div><b>' + AE(t.title || ('أكمل ' + t.count + ' طلبات')) + '</b><small>' + t.count + ' طلبات · مكافأة ' + AM(t.bonus) + ' د.أ · ' + (t.day ? 'ليوم ' + t.day : 'كل يوم') + ' · حققه اليوم: ' + (hit.map(c => c.name).join('، ') || 'لا أحد') + '</small></div>' +
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
        (l.map(a => '<div class="mg-card' + (a.active === false || (a.endsAt && a.endsAt < Date.now()) ? ' off' : '') + '"><div class="mg-top"><span class="mg-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1Z"/><path d="M16 9a4 4 0 0 1 0 6"/></svg></span><div><b>' + AE(a.title) + '</b><small>إلى ' + AUD[a.target] + (a.endsAt ? ' · حتى ' + new Date(a.endsAt).toLocaleDateString('ar-JO') : '') + (a.body ? ' · ' + AE(a.body) : '') + '</small></div>' +
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
/* ---------- العملاء: من لم يستلم طلباته، والحظر ----------
   الكابتن يسجّل "لم يستلم" مع صورة إثبات. بعد مرتين يظهر تحذير للمطعم ويُطلب تأكيد هاتفي، والإدارة تستطيع الحظر */
const custCol = HWBiz.customers; custCol.subscribe(() => { if (scr() === 'screen-manage' && mgTab === 'customers') renderManage(); });
/* صورة العميل: شخصية HIGHWAY حسب ما اختاره (من آخر طلب له) */
function custAv(phone) { const o = allOrders.filter(x => x.customer && x.customer.phone === phone && x.customer.g).sort((a, b) => b.createdAt - a.createdAt)[0]; return 'art/av-' + (o && o.customer.g === 'f' ? 'f' : 'm') + '.png'; }
function mgCustomers() {
    const l = custCol.list().filter(c => c.noShows || c.blocked).sort((a, b) => (b.blocked - a.blocked) || (b.noShows || 0) - (a.noShows || 0));
    return '<p class="mut mg-note">يظهر هنا كل عميل لم يستلم طلبًا. بعد مرتين يرى المطعم تحذيرًا ويتصل بالعميل للتأكيد، والمحظور لا يستطيع الطلب.</p>' +
        '<div class="pm-row mg-find"><input id="cuFind" inputmode="tel" dir="ltr" placeholder="07XXXXXXXX"><button type="button" class="pm-btn" onclick="custBlockByPhone()">حظر رقم</button></div>' +
        (l.length ? l.map(c => '<div class="mg-card' + (c.blocked ? ' off' : '') + '"><div class="mg-top"><img src="' + custAv(c.id) + '" alt=""><div><b>' + AE(c.name || 'عميل') + '</b><small dir="ltr" style="text-align:right">' + AE(c.id) + '</small></div>' +
            '<span class="mg-badge' + (c.blocked ? ' r' : c.noShows >= 2 ? ' y' : '') + '">' + (c.blocked ? 'محظور' : 'لم يستلم ' + (c.noShows || 0)) + '</span></div>' +
            (c.lastNoShow ? '<small class="mut">آخر مرة: ' + HWOrders.ago(c.lastNoShow) + '</small>' : '') +
            '<div class="mg-acts"><button type="button" class="ghost-btn' + (c.blocked ? '' : ' dng') + '" onclick="custSet(\'' + AE(c.id) + '\',{blocked:' + !c.blocked + '})">' + (c.blocked ? 'إلغاء الحظر' : 'حظر') + '</button>' +
            '<button type="button" class="ghost-btn" onclick="custSet(\'' + AE(c.id) + '\',{noShows:0})">تصفير العداد</button><a class="ghost-btn" href="tel:' + AE(c.id) + '">اتصال</a></div></div>').join('')
            : '<div class="empty-orders">لا يوجد عملاء مسجّل عليهم عدم استلام</div>');
}
function custSet(phone, p) {
    const rec = custCol.get(phone) || {}, devs = [...new Set((rec.devs || []).concat(allOrders.filter(o => o.customer && o.customer.phone === phone && o.dev).map(o => o.dev)))];
    if ('blocked' in p) { p.devs = devs; devs.forEach(d => HWBiz.putDoc('blockdev', d, p.blocked ? { blocked: true, phone, at: Date.now() } : null)); }   /* الحظر يشمل أجهزته، فلا يعود برقم جديد */
    custCol.patch(phone, p, true); logAct('team', (p.blocked === true ? 'حظر العميل ' : p.blocked === false ? 'إلغاء حظر العميل ' : 'تصفير عداد العميل ') + phone); buzz(15); renderManage(); }
function custBlockByPhone() {
    const ph = (A$('cuFind').value || '').replace(/[^\d]/g, '').replace(/^962/, '0');
    if (!/^07\d{8}$/.test(ph)) { HWOrders.toast('أدخل رقمًا صحيحًا 07XXXXXXXX'); return; }
    if (!confirm('حظر الرقم ' + ph + '؟ لن يستطيع الطلب من التطبيق.')) return;
    custSet(ph, { blocked: true });
}

/* ---------- رسوم الذروة/المطر وحد النقد مع الكابتن ---------- */
const setCol = HWDB.col('settings');
function mgSettings() {
    const p = HWBiz.setting('pricing'), c = HWBiz.setting('cash'), lim = c.limit != null ? c.limit : (HW_CONFIG.cashLimit != null ? HW_CONFIG.cashLimit : 3);
    const amts = [0.25, 0.5, 0.75, 1], lbls = ['مطر', 'ذروة', 'عطلة رسمية'];
    return '<div class="mg-card set-card"><div class="mrow"><div><b>رسوم إضافية الآن</b><small class="mut">تُضاف لكل طلب جديد، وتذهب كاملة للكابتن بلا عمولة</small></div>' +
        '<button type="button" class="sw' + (p.surgeOn ? ' on' : '') + '" onclick="saveSurge({surgeOn:' + !p.surgeOn + '})" aria-label="تفعيل الرسوم الإضافية"></button></div>' +
        '<div class="chips">' + amts.map(a => '<button type="button" class="chip' + ((p.surgeAmt || .25) === a ? ' on' : '') + '" onclick="saveSurge({surgeAmt:' + a + '})"><bdi dir="ltr">+' + HWOrders.money(a) + '</bdi> د.أ</button>').join('') + '</div>' +
        '<div class="chips">' + lbls.map(l => '<button type="button" class="chip' + ((p.surgeLabel || 'مطر') === l ? ' on' : '') + '" onclick="saveSurge({surgeLabel:\'' + l + '\'})">' + l + '</button>').join('') + '</div>' +
        (p.surgeOn ? '<p class="set-live">مفعّلة: <bdi dir="ltr">+' + HWOrders.money(p.surgeAmt || .25) + '</bdi> د.أ (' + AE(p.surgeLabel || 'مطر') + ') على كل طلب جديد</p>' : '') + '</div>' +
        '<div class="mg-card set-card"><div class="mrow"><div><b>حد النقد مع الكابتن</b><small class="mut">إذا تجاوز المستحق للشركة هذا المبلغ تتوقف عنه العروض حتى يسوّي</small></div></div>' +
        '<div class="pm-row"><input id="cashLim" type="number" min="0" step="0.5" inputmode="decimal" dir="ltr" value="' + lim + '"><button type="button" class="pm-btn" onclick="saveCashLimit()">حفظ</button></div></div>';
}
function saveSurge(patch) {
    const p = Object.assign({ surgeAmt: .25, surgeLabel: 'مطر' }, HWBiz.setting('pricing'), patch, { by: currentUser ? currentUser.label || currentUser.id : '', at: Date.now() });
    setCol.patch('pricing', p, true); buzz(15);
    if ('surgeOn' in patch) logAct('offer', (patch.surgeOn ? 'تفعيل رسوم ' : 'إيقاف رسوم ') + p.surgeLabel + ' +' + HWOrders.money(p.surgeAmt));
    setTimeout(renderManage, 60);
}
function saveCashLimit() {
    const v = Math.max(0, Math.round((parseFloat(A$('cashLim').value) || 0) * 100) / 100);
    setCol.patch('cash', { limit: v, at: Date.now() }, true); logAct('team', 'حد النقد مع الكابتن: ' + HWOrders.money(v) + ' د.أ'); HWOrders.toast('تم الحفظ'); buzz(15);
}

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

/* صيانة يومية من لوحة الإدارة (بدون خادم):
   1) نقل الطلبات المنتهية الأقدم من 45 يومًا إلى orders_archive، فتبقى قراءة الطلبات خفيفة وسريعة
   2) نسخ التقييمات إلى مجموعة ratings الصغيرة التي يقرأ منها تطبيق العملاء متوسط تقييم كل متجر */
function dailyUpkeep() {
    if (!currentUser || HWDB.mode !== 'remote') return;
    const K = 'hw-upkeep-day', day = new Date().toDateString();
    try { if (localStorage.getItem(K) === day) return; localStorage.setItem(K, day); } catch (e) {}
    const now = Date.now(), raw = HWOrders._raw(), R = HWDB.col('ratings');
    R.ready().then(() => {
        const have = {}; R.list().forEach(r => { have[r.id] = 1; });
        HWOrders.list().filter(o => o.rating && !have[o.id]).forEach(o => R.replace(o.id, { storeId: o.storeId || '', captainId: o.captain ? o.captain.id : '', store: o.rating.store || 0, captain: o.rating.captain || 0, at: o.rating.at || now }));
    });
    const old = HWOrders.list().filter(o => (o.status === 'delivered' && (o.settledAt || !HWOrders.isMarket(o)) || o.status === 'cancelled') && (o.updatedAt || o.createdAt) < now - 45 * 864e5);
    old.slice(0, 300).forEach(o => raw.send('PUT', '/orders_archive/' + o.id + '.json', o).then(ok => { if (ok) HWDB.col('orders').remove(o.id); }));
}
/* طلبات قديمة بلا مفاتيح القراءة المحدودة: تُضاف ليراها المتجر والكابتن (تعمل عند كل فتح، وتنتهي حين لا يبقى شيء) */
function backfillKeys() {
    if (!currentUser) return;
    HWOrders.list().filter(o => (o.storeId && !o.storeKey) || (o.captain && o.captain.id && !o.capKey)).slice(0, 500).forEach(o => {
        const k = {}; if (o.storeId && !o.storeKey) k.storeKey = o.storeId + '|' + o.createdAt; if (o.captain && o.captain.id && !o.capKey) k.capKey = o.captain.id + '|' + o.createdAt;
        HWOrders.patchLite(o.id, k);
    });
}
setTimeout(() => { dailyUpkeep(); backfillKeys(); }, 8000);

/* =========================================================
   بطاقة العمليات تُسحب فوق الخريطة: شريط صغير ← نصف الشاشة ← كاملة
   (السحب من المقبض أو من عنوان "العمليات الآن"، والضغط على المقبض يبدّل)
   ========================================================= */
(function () {
    const KEY = 'hw-ops-sheet', root = document.documentElement;
    const snaps = () => { const vh = window.innerHeight, hh = parseInt(getComputedStyle(root).getPropertyValue('--hdr-h'), 10) || 70; return [262, Math.round(vh * .52), vh - hh - 12]; };
    let level = 1; try { level = +localStorage.getItem(KEY) || 1; } catch (e) {}
    const sheet = () => document.querySelector('#screen-dashboard .mp-sheet');
    function apply(px, save) {
        const s = snaps(); px = Math.max(s[0] - 40, Math.min(s[2], px));
        root.style.setProperty('--dsh', px + 'px'); root.style.setProperty('--map-bottom', px + 'px');
        if (save !== undefined) { level = save; try { localStorage.setItem(KEY, save); } catch (e) {} }
    }
    function snapTo(i) { i = Math.max(0, Math.min(2, i)); apply(snaps()[i], i); refit(); }
    function refit() {}   /* الخريطة بملء الشاشة خلف البطاقة: لا تتغير ولا تُعاد ملاءمتها عند السحب (كان سبب القفز) */
    let y0 = 0, h0 = 0, t0 = 0, moved = false, on = false;
    function start(e) {
        const sh = sheet(); if (!sh) return;
        const p = e.touches ? e.touches[0] : e; y0 = p.clientY; h0 = sh.getBoundingClientRect().height; t0 = Date.now(); moved = false; on = true; sh.classList.add('dragging'); root.classList.add('ops-drag');
    }
    function move(e) {
        if (!on) return; const p = e.touches ? e.touches[0] : e, dy = p.clientY - y0;
        if (Math.abs(dy) > 4) moved = true; if (!moved) return;
        if (e.cancelable) e.preventDefault(); apply(h0 - dy);
    }
    function end(e) {
        if (!on) return; on = false; const sh = sheet(); if (sh) sh.classList.remove('dragging'); root.classList.remove('ops-drag');
        const p = e.changedTouches ? e.changedTouches[0] : e, dy = p.clientY - y0, v = dy / Math.max(1, Date.now() - t0);
        if (!moved) { if (e.target.closest && e.target.closest('.mp-grab')) snapTo(level === 0 ? 1 : level === 1 ? 2 : 0); return; }
        const h = h0 - dy, s = snaps();
        let i = s.reduce((b, x, k) => Math.abs(x - h) < Math.abs(s[b] - h) ? k : b, 0);
        if (v > .6) i = Math.max(0, level - 1); else if (v < -.6) i = Math.min(2, level + 1);   /* سحب سريع */
        snapTo(i);
    }
    document.addEventListener('touchstart', e => { if (e.target.closest && e.target.closest('#screen-dashboard .mp-grab, #screen-dashboard .ops-head') && !e.target.closest('button')) start(e); }, { passive: true });
    document.addEventListener('mousedown', e => { if (e.target.closest && e.target.closest('#screen-dashboard .mp-grab, #screen-dashboard .ops-head') && !e.target.closest('button')) start(e); });
    document.addEventListener('touchmove', move, { passive: false }); document.addEventListener('mousemove', move);
    document.addEventListener('touchend', end); document.addEventListener('mouseup', end);
    window.addEventListener('resize', () => apply(snaps()[level]));
    apply(snaps()[level]);
    window.opsSheet = snapTo;
})();
