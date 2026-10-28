/* =========================================================
   لوحة المنسقين v2 — الكباتن والتسويات
   ========================================================= */
const capsCol = HWDB.col('captains');
let capRange = 'today', editCapId = null;
const CH = HWOrders.esc;
capsCol.subscribe(() => { if (currentScreen_v2() === 'screen-captains') renderCaps(); });
function currentScreen_v2() { const a = document.querySelector('.screen.active'); return a ? a.id : ''; }
function inCapRange(ts) { return capRange === 'all' ? true : capRange === 'week' ? Date.now() - ts < 7 * 864e5 : HWOrders.isToday(ts); }
function renderCaps() {
    const box = document.getElementById('capsBody'); if (!box) return;
    const list = capsCol.list().slice().sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0) || String(a.name).localeCompare(b.name, 'ar'));
    const onl = list.filter(c => c.online && c.active !== false).length;
    const rows = list.map(c => {
        const mine = allOrders.filter(o => o.captain && o.captain.id === c.id);
        const act = mine.filter(o => o.status === 'accepted' || o.status === 'picked')[0];
        const done = mine.filter(o => o.status === 'delivered' && inCapRange(o.updatedAt || o.createdAt));
        const t = done.reduce((a, o) => { const s = HWOrders.settle(o); a.fee += s.fee; a.com += s.commission; a.net += s.net; a.items += s.items; a.col += s.collected; return a; }, { fee: 0, com: 0, net: 0, items: 0, col: 0 });
        return { c, act, n: done.length, t };
    });
    const tot = rows.reduce((a, r) => { a.n += r.n; a.fee += r.t.fee; a.com += r.t.com; return a; }, { n: 0, fee: 0, com: 0 });
    box.innerHTML =
        '<div class="stat-grid"><div class="stat hot"><b>' + onl + '</b><small>متصلون الآن</small></div><div class="stat"><b>' + list.length + '</b><small>إجمالي الكباتن</small></div><div class="stat"><b>' + tot.n + '</b><small>طلبات مسلّمة</small></div><div class="stat"><b>' + HWOrders.money(tot.com) + '</b><small>عمولة الشركة د.أ</small></div></div>' +
        '<div class="seg" id="capSeg">' + [['today', 'اليوم'], ['week', '٧ أيام'], ['all', 'الكل']].map(r => '<button type="button" data-r="' + r[0] + '"' + (capRange === r[0] ? ' class="on"' : '') + '>' + r[1] + '</button>').join('') + '</div>' +
        '<button type="button" class="submit-btn" style="margin:4px 0 14px" onclick="openCapSheet(null)"><span class="btn-label">+ إضافة كابتن</span></button>' +
        (rows.length ? rows.map(r => '<div class="cap-card' + (r.c.active === false ? ' off' : '') + '" data-cid="' + CH(r.c.id) + '"><div class="cap-top"><span class="cap-dot' + (r.c.online && r.c.active !== false ? ' on' : '') + '"></span><div class="cap-id"><b>' + CH(r.c.name) + (r.c.demo ? ' <em class="demo-tag">تجريبي</em>' : '') + '</b><small dir="ltr">' + CH(r.c.phone) + '</small></div><span class="cap-st">' + (r.c.active === false ? 'موقوف' : r.act ? 'في مهمة ' + CH(r.act.code) : r.c.online ? 'متاح' : 'غير متصل') + '</span></div>' +
            '<div class="cap-nums"><div><small>مسلّمة</small><b>' + r.n + '</b></div><div><small>التوصيل</small><b>' + HWOrders.money(r.t.fee) + '</b></div><div><small>عمولة الشركة</small><b>' + HWOrders.money(r.t.com) + '</b></div><div><small>صافيه</small><b>' + HWOrders.money(r.t.net) + '</b></div></div></div>').join('')
            : '<div class="empty-orders">لا يوجد كباتن بعد، أضف أول كابتن</div>');
}
function openCapSheet(id) {
    editCapId = id; const c = id ? capsCol.get(id) : { name: '', phone: '', active: true };
    document.getElementById('capSheetBody').innerHTML = '<div class="sh-head"><div><small>الكباتن</small><h3>' + (id ? 'تعديل كابتن' : 'كابتن جديد') + '</h3></div></div>' +
        '<div class="field"><label for="cpName">الاسم</label><input type="text" id="cpName" value="' + CH(c.name) + '"></div>' +
        '<div class="field"><label for="cpPhone">رقم الهاتف</label><input type="tel" id="cpPhone" dir="ltr" inputmode="tel" value="' + CH(c.phone) + '" placeholder="07XXXXXXXX"></div>' +
        '<div class="field"><label for="cpPin">الرمز السري ' + (id ? '<span class="opt">(اتركه فارغًا لعدم التغيير)</span>' : '') + '</label><input type="text" id="cpPin" inputmode="numeric" dir="ltr" placeholder="4 أرقام على الأقل"></div>' +
        '<div class="err-msg" id="cpErr" style="display:none;opacity:1;position:static;margin-bottom:8px"></div>' +
        '<div class="btn-row">' + (id ? '<button type="button" class="ghost-btn" onclick="toggleCapActive()">' + (c.active === false ? 'تفعيل' : 'إيقاف') + '</button><button type="button" class="ghost-btn" style="color:var(--danger)" onclick="deleteCap()">حذف</button>' : '') + '<button type="button" class="submit-btn" onclick="saveCap()"><span class="btn-label">حفظ</span></button></div>';
    document.getElementById('capSheet').classList.add('show');
}
function closeCapSheet() { document.getElementById('capSheet').classList.remove('show'); }
async function saveCap() {
    const name = document.getElementById('cpName').value.trim(), raw = document.getElementById('cpPhone').value.replace(/\D/g, ''), pin = document.getElementById('cpPin').value.trim(), er = document.getElementById('cpErr');
    let ph = raw.startsWith('962') ? raw.slice(3) : raw.replace(/^0/, ''); const phone = /^7\d{8}$/.test(ph) ? '0' + ph : '';
    const bad = (m) => { er.textContent = m; er.style.display = 'block'; };
    if (!name) return bad('أدخل الاسم'); if (!phone) return bad('رقم الهاتف غير صحيح');
    if (!editCapId && pin.length < 4) return bad('الرمز السري 4 أرقام على الأقل'); if (pin && pin.length < 4) return bad('الرمز السري 4 أرقام على الأقل');
    if (capsCol.list().some(c => c.phone === phone && c.id !== editCapId)) return bad('هذا الرقم مسجل لكابتن آخر');
    const rec = { name, phone }; if (pin) rec.pin = await HW_sha256('HWK|' + phone + '|' + pin);
    else if (editCapId && capsCol.get(editCapId).phone !== phone) return bad('عند تغيير الرقم يجب تعيين رمز سري جديد');
    if (editCapId) capsCol.patch(editCapId, rec); else capsCol.create(Object.assign({ id: 'k' + Date.now().toString(36), active: true, online: false }, rec));
    closeCapSheet(); buzz(15); HWOrders.toast('تم حفظ الكابتن');
}
function toggleCapActive() { const c = capsCol.get(editCapId); capsCol.patch(editCapId, { active: c.active === false, online: false }); closeCapSheet(); }
function deleteCap() { if (confirm('حذف هذا الكابتن نهائيًا؟')) { capsCol.remove(editCapId); closeCapSheet(); } }
document.addEventListener('click', (e) => {
    const sg = e.target.closest('#capSeg button'); if (sg) { capRange = sg.dataset.r; renderCaps(); return; }
    const cc = e.target.closest('.cap-card'); if (cc) openCapSheet(cc.dataset.cid);
});
(function () { const _g = window.goTo; window.goTo = function (id) { _g(id); if (id === 'screen-captains') { renderCaps(); setTimeout(() => { if (typeof capMap !== 'undefined' && capMap) capMap.invalidateSize(); }, 100); } }; })();
setInterval(() => { if (!document.hidden && currentScreen_v2() === 'screen-captains') renderCaps(); }, 15000);

/* =========================================================
   الإسناد التلقائي لأقرب كابتن + الإسناد اليدوي + خريطة الكباتن
   ========================================================= */
const settingsCol = HWDB.col('settings');
let autoOn = true, engineBusy = false, capMap = null, capLayer = null;
settingsCol.subscribe(l => { const d = l.filter(x => x.id === 'dispatch')[0]; autoOn = !d || d.auto !== false; renderAuto(); runEngine(); });
function setAuto(v) { settingsCol.patch('dispatch', { auto: v, by: 'dispatcher', at: Date.now() }, true); buzz(15); HWOrders.toast(v ? 'الإسناد التلقائي يعمل' : 'الإسناد اليدوي: اختر الكابتن بنفسك'); }
function isLive(c) { return c.active !== false && c.online && (!c.lastSeen || Date.now() - c.lastSeen < 120000); }
function busyIds() { const b = {}; allOrders.forEach(o => { if (o.captain && o.captain.id && (o.status === 'accepted' || o.status === 'picked')) b[o.captain.id] = 1; }); return b; }
function offerLim() { return (HW_CONFIG.offerSeconds || 45) * 1000; }
function liveOfferTo(skipId) { const t = {}; allOrders.forEach(o => { if (o.id !== skipId && o.offerTo && Date.now() - (o.offerAt || 0) < offerLim() + 2000 && HWOrders.offerable(o)) t[o.offerTo] = 1; }); return t; }
function distTo(c, o) { return c.lat != null && o.storeLoc ? HWMap.est([c.lat, c.lng], [o.storeLoc.lat, o.storeLoc.lng]) : null; }
function rank(list, o) {
    return list.slice().sort((a, b) => { const da = distTo(a, o), db = distTo(b, o); if (da != null && db != null) return da - db; if (da != null) return -1; if (db != null) return 1; return (a.lastSeen || 0) - (b.lastSeen || 0); });
}
function runEngine() {
    if (!autoOn || engineBusy) return; engineBusy = true;
    try {
        const now = Date.now(), caps = capsCol.list();
        allOrders.filter(o => HWOrders.offerable(o)).forEach(o => {
            if (o.offerTo && now - (o.offerAt || 0) < offerLim() + 2000) return;                  // عرض ما زال ساريًا
            const offered = (o.offered || []).slice();
            if (o.offerTo && offered.indexOf(o.offerTo) < 0) offered.push(o.offerTo);            // انتهت مهلته
            const busy = busyIds(), pend = liveOfferTo(o.id);
            let cands = caps.filter(c => isLive(c) && !busy[c.id] && !pend[c.id] && offered.indexOf(c.id) < 0);
            if (!cands.length && offered.length) { HWOrders.update(o.id, { offerTo: null, offerAt: 0, offered: [] }); return; }   // دورة جديدة
            if (!cands.length) { if (o.offerTo) HWOrders.update(o.id, { offerTo: null, offerAt: 0 }); return; }
            const c = rank(cands, o)[0], d = distTo(c, o);
            HWOrders.update(o.id, { offerTo: c.id, offerAt: now, offered: offered.concat([c.id]), offerName: c.name, offerKm: d == null ? null : Math.round(d * 10) / 10 }, 'offer_sent');
        });
    } finally { engineBusy = false; }
}
setInterval(runEngine, 3000);
HWOrders.subscribe(() => { runEngine(); renderAuto(); });
capsCol.subscribe(() => { renderAuto(); });
function renderAuto() {
    const waiting = allOrders.filter(o => HWOrders.offerable(o)).length, offering = allOrders.filter(o => HWOrders.offerable(o) && o.offerTo).length;
    const free = capsCol.list().filter(c => isLive(c) && !busyIds()[c.id]).length;
    const html = '<div class="auto-card' + (autoOn ? ' on' : '') + '"><div class="ac-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg></div><div class="ac-t"><b>' + (autoOn ? 'الإسناد التلقائي يعمل' : 'الإسناد اليدوي') + '</b><small>' + (autoOn ? (free ? 'يُعرض كل طلب على أقرب كابتن متاح (' + free + ' متاح)' : 'لا يوجد كباتن متاحون الآن') + (waiting ? ' · ' + offering + '/' + waiting + ' قيد العرض' : '') : 'أنت تختار الكابتن من القائمة بنفسك') + '</small></div><button type="button" class="sw' + (autoOn ? ' on' : '') + '" onclick="setAuto(' + (!autoOn) + ')" aria-label="تبديل الإسناد التلقائي"></button></div>';
    document.querySelectorAll('.auto-slot').forEach(el => { el.innerHTML = html; });
}
function renderAssignCaps(o) {
    const box = document.getElementById('asCaps'); if (!box) return;
    const busy = busyIds(), list = capsCol.list().filter(c => c.active !== false);
    const free = rank(list.filter(c => isLive(c) && !busy[c.id]), o), bz = list.filter(c => isLive(c) && busy[c.id]), off = list.filter(c => !isLive(c));
    const row = (c, st) => { const d = distTo(c, o); return '<button type="button" class="as-cap' + (st === 'free' ? '' : ' dim') + '" data-cap="' + CH(c.id) + '"><span class="cap-dot' + (st !== 'off' ? ' on' : '') + '"></span><b>' + CH(c.name) + '</b><small>' + (st === 'free' ? (d != null ? d.toFixed(1) + ' كم عن المتجر' : 'متاح') : st === 'busy' ? 'في مهمة' : 'غير متصل') + '</small></button>'; };
    box.innerHTML = list.length ? free.map(c => row(c, 'free')).join('') + bz.map(c => row(c, 'busy')).join('') + off.map(c => row(c, 'off')).join('') : '<div class="empty-orders" style="padding:12px">لا يوجد كباتن مسجلون</div>';
    box.dataset.oid = o.id;
}
document.addEventListener('click', (e) => {
    const b = e.target.closest('.as-cap'); if (!b) return;
    const c = capsCol.get(b.dataset.cap); if (!c) return;
    document.getElementById('asName').value = c.name; document.getElementById('asPhone').value = c.phone || '';
    submitAssign(false);
});
function renderCapMap() {
    const box = document.getElementById('capMapEl'); if (!box || !window.L) return;
    if (!capMap) { capMap = HWMap.create(box, { center: HWMap.center(), zoom: 12 }); capLayer = L.layerGroup().addTo(capMap); }
    capLayer.clearLayers(); const pts = [];
    capsCol.list().filter(c => c.lat != null && isLive(c)).forEach(c => { const p = [c.lat, c.lng]; pts.push(p); L.marker(p, { icon: HWMap.ICON.cap(), zIndexOffset: 400 }).bindTooltip(c.name, { direction: 'top' }).addTo(capLayer); });
    allOrders.filter(HWOrders.isActive).forEach(o => { if (o.address && o.address.lat != null) { const p = [o.address.lat, o.address.lng]; pts.push(p); L.marker(p, { icon: HWMap.ICON.home() }).bindTooltip(o.code, { direction: 'top' }).addTo(capLayer); } if (o.storeLoc) { pts.push([o.storeLoc.lat, o.storeLoc.lng]); } });
    capMap.invalidateSize(); if (pts.length) HWMap.fit(capMap, pts, [40, 40]);
}
(function () { const _r = window.renderCaps; window.renderCaps = function () { _r(); renderCapMap(); }; })();
renderAuto();
