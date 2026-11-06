/* =========================================================
   HIGHWAY — صفحة الإحصائيات (الإدارة)
   رقم بارز للفترة مع التغيير عن الفترة السابقة (▲ ▼)، ثم رسوم بيانية:
   الطلبات مقارنة بالفترة السابقة، ساعات الذروة، مصدر الطلبات، أفضل المتاجر، أداء الكباتن، وصافي المنصة.
   كل الرسوم مرسومة SVG داخل الصفحة بألوان HIGHWAY، والضغط على أي عمود يظهر قيمته.
   ========================================================= */
let stPeriod = 'day';
const ST_P = { day: ['اليوم', 'أمس'], week: ['هذا الأسبوع', 'الأسبوع الماضي'], month: ['هذا الشهر', 'الشهر الماضي'], year: ['هذه السنة', 'السنة الماضية'] };
const ST_SRC = { store: 'من المتاجر', coordinator: 'طلب يدوي', customer: 'تطبيق العملاء' };
function stRange(p, back) {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    let a, b;
    if (p === 'day') { a = d.getTime(); b = a + 864e5; if (back) { b = a; a -= 864e5; } }
    else if (p === 'week') { a = d.getTime() - 6 * 864e5; b = d.getTime() + 864e5; if (back) { b = a; a -= 7 * 864e5; } }
    else if (p === 'month') { const m = new Date(d.getFullYear(), d.getMonth(), 1); a = m.getTime(); b = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(); if (back) { b = a; a = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(); } }
    else { a = new Date(d.getFullYear(), 0, 1).getTime(); b = new Date(d.getFullYear() + 1, 0, 1).getTime(); if (back) { b = a; a = new Date(d.getFullYear() - 1, 0, 1).getTime(); } }
    return [a, b];
}
/* نفس طول الفترة السابقة حتى اللحظة: مقارنة عادلة (اليوم حتى الآن مقابل أمس حتى نفس الساعة) */
function stSoFar(p) { const [a] = stRange(p), [pa] = stRange(p, true); return [pa, pa + (Date.now() - a)]; }
function stIn(a, b) { return allOrders.filter(o => o.createdAt >= a && o.createdAt < b); }
function stDelta(n, y, money) {
    if (!y && !n) return '<i class="sd">—</i>';
    if (!y) return '<i class="sd up">جديد</i>';
    const pc = Math.round((n - y) / y * 100);
    return '<i class="sd ' + (pc > 0 ? 'up' : pc < 0 ? 'dn' : '') + '">' + (pc > 0 ? '▲ ' : pc < 0 ? '▼ ' : '') + Math.abs(pc) + '٪</i>';
}
/* تقسيم الفترة إلى أعمدة */
function stBuckets(p, back) {
    const [a, b] = stRange(p, back), out = [];
    if (p === 'day') for (let h = 0; h < 24; h++) out.push({ a: a + h * 36e5, b: a + (h + 1) * 36e5, l: String(h) });
    else if (p === 'week') for (let i = 0; i < 7; i++) { const t = a + i * 864e5; out.push({ a: t, b: t + 864e5, l: new Date(t).toLocaleDateString('ar-JO', { weekday: 'short' }) }); }
    else if (p === 'month') { for (let t = a, i = 1; t < b; t += 864e5, i++) out.push({ a: t, b: t + 864e5, l: String(i) }); }
    else for (let m = 0; m < 12; m++) { const y = new Date(a).getFullYear(); out.push({ a: new Date(y, m, 1).getTime(), b: new Date(y, m + 1, 1).getTime(), l: new Date(y, m, 1).toLocaleDateString('ar-JO', { month: 'short' }) }); }
    return out;
}
/* رسم أعمدة: سلسلة الفترة الحالية (فيروزي) وأمامها الفترة السابقة (كريمي داكن) */
function stBars(cur, prev, labels, opt) {
    opt = opt || {};
    const W = 340, H = 150, pad = 18, n = cur.length, max = Math.max(1, ...cur, ...(prev || [0])), bw = (W - pad) / n, every = n > 12 ? Math.ceil(n / 8) : 1;
    let s = '<svg class="st-svg" viewBox="0 0 ' + W + ' ' + (H + 22) + '" role="img" aria-label="' + AE(opt.title || '') + '">';
    [0.5, 1].forEach(f => { const y = H - (H - 10) * f; s += '<line x1="0" x2="' + W + '" y1="' + y + '" y2="' + y + '" class="st-grid"/>'; });
    for (let i = 0; i < n; i++) {
        const x = pad / 2 + i * bw, h1 = (H - 10) * cur[i] / max, h0 = prev ? (H - 10) * prev[i] / max : 0, w = Math.max(3, bw * (prev ? .38 : .62));
        const tip = AE(labels[i] + ': ' + (opt.fmt ? opt.fmt(cur[i]) : cur[i]) + (prev ? ' · ' + ST_P[stPeriod][1] + ' ' + (opt.fmt ? opt.fmt(prev[i]) : prev[i]) : ''));
        s += '<g class="st-b" data-tip="' + tip + '"><rect x="' + x + '" y="0" width="' + bw + '" height="' + H + '" fill="transparent"/>';
        if (prev) s += '<rect x="' + (x + bw / 2 - w - 1) + '" y="' + (H - h0) + '" width="' + w + '" height="' + Math.max(h0, prev[i] ? 2 : 0) + '" rx="' + Math.min(4, w / 2) + '" class="st-p"/>';
        s += '<rect x="' + (prev ? x + bw / 2 + 1 : x + (bw - w) / 2) + '" y="' + (H - h1) + '" width="' + w + '" height="' + Math.max(h1, cur[i] ? 2 : 0) + '" rx="' + Math.min(4, w / 2) + '" class="st-c' + (opt.hl === i ? ' hl' : '') + '"/></g>';
        if (i % every === 0) s += '<text x="' + (x + bw / 2) + '" y="' + (H + 16) + '" class="st-l">' + AE(labels[i]) + '</text>';
    }
    return s + '</svg>';
}
/* أعمدة أفقية لقائمة (متاجر / كباتن) */
function stHBars(rows, fmt) {
    if (!rows.length) return '<p class="st-none">لا بيانات في هذه الفترة</p>';
    const max = Math.max(1, ...rows.map(r => r.v));
    return '<div class="st-h">' + rows.map((r, i) => '<div class="st-hr"><span class="st-hn">' + (r.img ? '<img src="' + AE(r.img) + '" alt="">' : '<em>' + (i + 1) + '</em>') + '<b>' + AE(r.n) + '</b></span>' +
        '<span class="st-ht"><i style="width:' + Math.max(4, r.v / max * 100) + '%"></i></span><span class="st-hv">' + (fmt ? fmt(r.v) : r.v) + (r.d != null ? r.d : '') + '</span></div>').join('') + '</div>';
}
function renderStatsPage() {
    const box = A$('statsBody'); if (!box) return;
    const p = stPeriod, [a, b] = stRange(p), [pa, pb] = stRange(p, true), [sa, sb] = stSoFar(p);
    const k = kpis(a, b), y = kpis(sa, sb), cur = stIn(a, b), prev = stIn(pa, pb);
    /* 1) الفترة */
    let h = '<div class="seg st-seg">' + Object.keys(ST_P).map(x => '<button type="button" data-stp="' + x + '" class="' + (x === p ? 'on' : '') + '">' + { day: 'اليوم', week: 'الأسبوع', month: 'الشهر', year: 'السنة' }[x] + '</button>').join('') + '</div>';
    /* 2) الرقم البارز */
    h += '<div class="hw-hero st-hero" data-stat="k-n" role="button" tabindex="0"><small>طلبات ' + ST_P[p][0] + '</small><b>' + k.n + '</b><span>' + stDelta(k.n, y.n) + ' عن ' + ST_P[p][1] + ' في نفس الوقت · ' + k.done + ' مسلّمة</span></div>';
    /* 3) أهم الأرقام كسطور */
    h += '<div class="hw-list">' + [['k-net', 'صافي المنصة', AM(k.net) + ' د.أ', stDelta(k.net, y.net)], ['k-gmv', 'قيمة الطلبات', AM(k.gmv) + ' د.أ', stDelta(k.gmv, y.gmv)], ['k-min', 'متوسط وقت التوصيل', (k.avgMin || '—') + ' د', ''], ['k-canc', 'نسبة الإلغاء', k.rate + '٪', ''], ['k-rate', 'رضا العملاء', k.rating + ' من 5', '']]
        .map(r => '<button type="button" class="hw-row" data-stat="' + r[0] + '"><span>' + r[1] + '</span><b>' + r[2] + ' ' + r[3] + '</b></button>').join('') + '</div>';
    /* 4) الطلبات مقابل الفترة السابقة */
    const B = stBuckets(p), PB = stBuckets(p, true), cnt = (L, x) => L.filter(o => o.createdAt >= x.a && o.createdAt < x.b).length;
    const nowI = B.findIndex(x => Date.now() >= x.a && Date.now() < x.b);
    h += '<section class="st-card"><header><h3>الطلبات</h3><span class="st-lg"><i class="c"></i>' + ST_P[p][0] + '<i class="p"></i>' + ST_P[p][1] + '</span></header>' +
        stBars(B.map(x => cnt(cur, x)), PB.map(x => cnt(prev, x)).slice(0, B.length).concat(Array(Math.max(0, B.length - PB.length)).fill(0)), B.map(x => x.l), { title: 'الطلبات', hl: nowI }) + '<p class="st-tip">اضغط على أي عمود لترى رقمه</p></section>';
    /* 5) ساعات الذروة (للأسبوع وما فوق) */
    if (p !== 'day') {
        const hrs = Array(24).fill(0); cur.forEach(o => { hrs[new Date(o.createdAt).getHours()]++; });
        const top = hrs.indexOf(Math.max(...hrs));
        h += '<section class="st-card"><header><h3>ساعات الذروة</h3>' + (cur.length ? '<span class="st-pill">الأعلى ' + top + ':00 – ' + (top + 1) + ':00</span>' : '') + '</header>' + stBars(hrs, null, hrs.map((_, i) => String(i)), { title: 'ساعات الذروة', hl: top }) + '<p class="st-tip">من هنا تعرف متى تحتاج كباتن متصلين أكثر</p></section>';
    }
    /* 6) مصدر الطلبات */
    const src = {}; cur.forEach(o => { const s0 = o.source === 'store' ? 'store' : o.source === 'coordinator' ? 'coordinator' : 'customer'; src[s0] = (src[s0] || 0) + 1; });
    const tot = cur.length || 1;
    h += '<section class="st-card"><header><h3>مصدر الطلبات</h3></header><div class="st-stack">' + ['store', 'coordinator', 'customer'].map(s0 => '<i class="s-' + s0 + '" style="width:' + ((src[s0] || 0) / tot * 100) + '%"></i>').join('') + '</div>' +
        '<div class="st-keys">' + ['store', 'coordinator', 'customer'].map(s0 => '<span><i class="s-' + s0 + '"></i>' + ST_SRC[s0] + '<b>' + (src[s0] || 0) + '</b><em>' + Math.round((src[s0] || 0) / tot * 100) + '٪</em></span>').join('') + '</div></section>';
    /* 7) أفضل المتاجر مع التغيير */
    const per = (L, f) => { const r = {}; L.forEach(o => { const key = f(o); if (key) r[key] = (r[key] || 0) + 1; }); return r; };
    const sc = per(cur.filter(o => o.status !== 'cancelled'), o => o.storeId), sp = per(prev.filter(o => o.status !== 'cancelled'), o => o.storeId);
    const top5 = Object.keys(sc).sort((x1, x2) => sc[x2] - sc[x1]).slice(0, 5).map(id => ({ n: storeName(id) || '—', v: sc[id], img: HWBiz.logo(id), d: ' ' + stDelta(sc[id], sp[id] || 0) }));
    h += '<section class="st-card"><header><h3>أكثر المتاجر طلبًا</h3></header>' + stHBars(top5) + '</section>';
    /* 8) الكباتن: التسليمات */
    const cc = {}, cm = {}; cur.filter(o => o.status === 'delivered' && o.captain).forEach(o => { const id = o.captain.id; cc[id] = (cc[id] || 0) + 1; const d = (o.history || []).filter(x => x.s === 'delivered')[0]; if (d) (cm[id] = cm[id] || []).push((d.t - o.createdAt) / 6e4); });
    const caps = Object.keys(cc).sort((x1, x2) => cc[x2] - cc[x1]).slice(0, 6).map(id => { const c = capsCol.get(id) || { id, name: '—' }, ms = cm[id] || []; return { n: c.name, v: cc[id], img: HWBiz.capAv(c), d: ms.length ? ' <i class="sd">' + Math.round(ms.reduce((q, w) => q + w, 0) / ms.length) + ' د</i>' : '' }; });
    h += '<section class="st-card"><header><h3>أداء الكباتن</h3><span class="st-pill soft">تسليمات · متوسط الوقت</span></header>' + stHBars(caps) + '</section>';
    /* 9) صافي المنصة */
    const net = L => L.filter(o => o.status === 'delivered').reduce((q, o) => { const s = HWOrders.settle(o); return q + s.commission - (s.promo || 0); }, 0);
    h += '<section class="st-card"><header><h3>صافي المنصة</h3><b class="st-big">' + AM(k.net) + ' <small>د.أ</small></b></header>' +
        stBars(B.map(x => HWBiz.r2(net(cur.filter(o => o.createdAt >= x.a && o.createdAt < x.b)))), PB.map(x => HWBiz.r2(net(prev.filter(o => o.createdAt >= x.a && o.createdAt < x.b)))).slice(0, B.length).concat(Array(Math.max(0, B.length - PB.length)).fill(0)), B.map(x => x.l), { title: 'صافي المنصة', fmt: v => AM(v), hl: nowI }) + '</section>';
    box.innerHTML = h;
}
document.addEventListener('click', e => {
    const s = e.target.closest('[data-stp]'); if (s) { stPeriod = s.dataset.stp; buzz(); renderStatsPage(); return; }
    const g = e.target.closest('.st-b'); if (g) {
        const card = g.closest('.st-card'); let t = card.querySelector('.st-tip'); if (!t) { t = document.createElement('p'); t.className = 'st-tip'; card.appendChild(t); }
        t.textContent = g.dataset.tip; t.classList.add('on'); card.querySelectorAll('.st-b.on').forEach(x => x.classList.remove('on')); g.classList.add('on'); buzz(6);
    }
});
