/**
 * ============================================================================
 * ATTENDANCE & PERFORMANCE ANALYTICS LOGIC
 * Multi-criteria filter, subject-specific average (DS - Prof. Shah),
 * defaulter highlight (< 80%), and CSV export
 * ============================================================================
 */

const TEACHER_NAME = 'Prof. Shah';
const SUBJECT_NAME = 'Data Structures (CS-301)';

// Default student dataset across classes
const MASTER_STUDENTS = [
    // Class CO31
    { id: 1,  enroll: '220010116001', name: 'Aarav Sharma',    class: 'CO31', batch: 'A1', tut: 'T1', att: 92, totalSessions: 36 },
    { id: 2,  enroll: '220010116002', name: 'Bhavya Patel',    class: 'CO31', batch: 'A1', tut: 'T1', att: 88, totalSessions: 36 },
    { id: 3,  enroll: '220010116003', name: 'Chirag Dave',     class: 'CO31', batch: 'A1', tut: 'T1', att: 76, totalSessions: 36 },
    { id: 4,  enroll: '220010116004', name: 'Deepika Joshi',   class: 'CO31', batch: 'A2', tut: 'T2', att: 95, totalSessions: 36 },
    { id: 5,  enroll: '220010116005', name: 'Eshaan Mehta',    class: 'CO31', batch: 'A2', tut: 'T2', att: 81, totalSessions: 36 },
    { id: 6,  enroll: '220010116006', name: 'Falguni Shah',    class: 'CO31', batch: 'A2', tut: 'T2', att: 68, totalSessions: 36 },
    { id: 7,  enroll: '220010116007', name: 'Gaurav Parmar',   class: 'CO31', batch: 'A3', tut: 'T3', att: 89, totalSessions: 36 },
    { id: 8,  enroll: '220010116008', name: 'Harshita Rathod', class: 'CO31', batch: 'A3', tut: 'T3', att: 94, totalSessions: 36 },
    { id: 9,  enroll: '220010116009', name: 'Ishaan Varma',    class: 'CO31', batch: 'A3', tut: 'T3', att: 72, totalSessions: 36 },
    { id: 10, enroll: '220010116064', name: 'Yash Vora',       class: 'CO31', batch: 'A1', tut: 'T1', att: 85, totalSessions: 36 },

    // Class CO32
    { id: 11, enroll: '220010116065', name: 'Kavya Shah',     class: 'CO32', batch: 'B1', tut: 'T1', att: 90, totalSessions: 34 },
    { id: 12, enroll: '220010116066', name: 'Meet Patel',     class: 'CO32', batch: 'B1', tut: 'T1', att: 82, totalSessions: 34 },
    { id: 13, enroll: '220010116067', name: 'Nidhi Trivedi',  class: 'CO32', batch: 'B1', tut: 'T1', att: 94, totalSessions: 34 },
    { id: 14, enroll: '220010116068', name: 'Omkar Dave',     class: 'CO32', batch: 'B2', tut: 'T2', att: 77, totalSessions: 34 },
    { id: 15, enroll: '220010116069', name: 'Pooja Joshi',    class: 'CO32', batch: 'B2', tut: 'T2', att: 85, totalSessions: 34 },
    { id: 16, enroll: '220010116070', name: 'Rahul Chauhan',  class: 'CO32', batch: 'B2', tut: 'T2', att: 71, totalSessions: 34 },
    { id: 17, enroll: '220010116071', name: 'Sneha Barot',    class: 'CO32', batch: 'B3', tut: 'T3', att: 96, totalSessions: 34 },
    { id: 18, enroll: '220010116128', name: 'Ronak Dave',     class: 'CO32', batch: 'B3', tut: 'T3', att: 88, totalSessions: 34 },

    // Class CO33
    { id: 21, enroll: '220010116129', name: 'Tanvi Joshi',    class: 'CO33', batch: 'C1', tut: 'T1', att: 87, totalSessions: 32 },
    { id: 22, enroll: '220010116130', name: 'Utsav Pandya',   class: 'CO33', batch: 'C1', tut: 'T1', att: 79, totalSessions: 32 },
    { id: 23, enroll: '220010116131', name: 'Varun Rajput',   class: 'CO33', batch: 'C2', tut: 'T2', att: 91, totalSessions: 32 },
    { id: 24, enroll: '220010116132', name: 'Yashvi Panchal', class: 'CO33', batch: 'C2', tut: 'T2', att: 84, totalSessions: 32 },
    { id: 25, enroll: '220010116192', name: 'Vivek Parmar',   class: 'CO33', batch: 'C3', tut: 'T3', att: 74, totalSessions: 32 },

    // Class CO51
    { id: 31, enroll: '200010116001', name: 'Aditi Trivedi',      class: 'CO51', batch: 'D1', tut: 'T1', att: 93, totalSessions: 30 },
    { id: 32, enroll: '200010116002', name: 'Brijesh Prajapati', class: 'CO51', batch: 'D1', tut: 'T1', att: 85, totalSessions: 30 },
    { id: 33, enroll: '200010116003', name: 'Chintan Makwana',    class: 'CO51', batch: 'D2', tut: 'T2', att: 75, totalSessions: 30 },
    { id: 34, enroll: '200010116004', name: 'Divya Raval',        class: 'CO51', batch: 'D2', tut: 'T2', att: 89, totalSessions: 30 },
    { id: 35, enroll: '200010116060', name: 'Dhruv Soni',         class: 'CO51', batch: 'D3', tut: 'T3', att: 79, totalSessions: 30 },

    // Class CO52
    { id: 41, enroll: '200010116061', name: 'Pranav Vyas',    class: 'CO52', batch: 'E1', tut: 'T1', att: 91, totalSessions: 30 },
    { id: 42, enroll: '200010116062', name: 'Riddhi Solanki', class: 'CO52', batch: 'E1', tut: 'T1', att: 88, totalSessions: 30 },
    { id: 43, enroll: '200010116063', name: 'Siddharth Dave', class: 'CO52', batch: 'E2', tut: 'T2', att: 82, totalSessions: 30 },
    { id: 44, enroll: '200010116064', name: 'Trisha Shah',    class: 'CO52', batch: 'E2', tut: 'T2', att: 96, totalSessions: 30 },
    { id: 45, enroll: '200010116065', name: 'Urvi Gadhvi',    class: 'CO52', batch: 'E3', tut: 'T3', att: 74, totalSessions: 30 },
    { id: 46, enroll: '200010116120', name: 'Pooja Mehta',    class: 'CO52', batch: 'E3', tut: 'T3', att: 86, totalSessions: 30 }
];

let allStudentsData = [];
let currentFilteredList = [];

// =========================================================================
// INITIALIZATION
// =========================================================================

document.addEventListener('DOMContentLoaded', function() {
    try { lucide.createIcons(); } catch(e) {}

    // Setup Profile Dropdown
    const profBtn = document.getElementById('profBtn');
    const profDD  = document.getElementById('profDD');
    if (profBtn && profDD) {
        profBtn.addEventListener('click', e => { e.stopPropagation(); profDD.classList.toggle('open'); });
    }
    document.addEventListener('click', e => {
        if (profDD && profBtn && !profBtn.contains(e.target) && !profDD.contains(e.target)) {
            profDD.classList.remove('open');
        }
    });

    loadStudentsData();
    updateKPICards();
    applyAnalyticsFilters();

    // Redraw charts on resize or theme change
    window.addEventListener('resize', () => {
        drawFilteredBarChart(currentFilteredList);
        drawSubjectAverageChart();
    });
    window.addEventListener('treva-theme-changed', () => {
        drawFilteredBarChart(currentFilteredList);
        drawSubjectAverageChart();
    });
});

function loadStudentsData() {
    // Try to load any overrides from localStorage
    allStudentsData = MASTER_STUDENTS.map(s => {
        try {
            const classRoster = JSON.parse(localStorage.getItem('treva_students_' + s.class) || '[]');
            const found = classRoster.find(item => item.enroll === s.enroll);
            if (found && typeof found.att === 'number') {
                return { ...s, att: found.att };
            }
        } catch(e) {}
        return { ...s };
    });
}

function updateKPICards() {
    // 1. Data Structures (Prof. Shah's subject) average across classes CO31, CO32, CO33
    const dsStudents = allStudentsData.filter(s => ['CO31', 'CO32', 'CO33'].includes(s.class));
    const dsAvg = dsStudents.length
        ? Math.round(dsStudents.reduce((acc, s) => acc + s.att, 0) / dsStudents.length * 10) / 10
        : 86.4;

    const kpiDsAvg = document.getElementById('kpiDsAvg');
    if (kpiDsAvg) kpiDsAvg.textContent = dsAvg + '%';

    // 2. Count defaulters (< 80%) across all students
    const defaulters = allStudentsData.filter(s => s.att < 80);
    const kpiDef = document.getElementById('kpiDefaultersCount');
    if (kpiDef) kpiDef.textContent = `${defaulters.length} Students`;

    // 3. Top performing class in DS
    const co31Ds = allStudentsData.filter(s => s.class === 'CO31');
    const co31Avg = co31Ds.length ? Math.round(co31Ds.reduce((a, s) => a + s.att, 0) / co31Ds.length * 10) / 10 : 91.2;
    const kpiTop = document.getElementById('kpiTopClass');
    if (kpiTop) kpiTop.textContent = `CO31 (${co31Avg}%)`;
}

// =========================================================================
// MULTI-CRITERIA FILTERING
// =========================================================================

window.applyAnalyticsFilters = function() {
    const classVal = (document.getElementById('filterClass') ? document.getElementById('filterClass').value : 'ALL');
    const batchVal = (document.getElementById('filterBatch') ? document.getElementById('filterBatch').value : 'ALL');
    const tutVal   = (document.getElementById('filterTut') ? document.getElementById('filterTut').value : 'ALL');
    const thresVal = (document.getElementById('filterThreshold') ? document.getElementById('filterThreshold').value : 'ALL');
    const searchVal = ((document.getElementById('filterSearch') ? document.getElementById('filterSearch').value : '') ||
                       (document.getElementById('topSearchInput') ? document.getElementById('topSearchInput').value : '')).toLowerCase().trim();

    currentFilteredList = allStudentsData.filter(s => {
        // Class check
        if (classVal !== 'ALL' && s.class !== classVal) return false;
        // Batch check
        if (batchVal !== 'ALL' && s.batch !== batchVal) return false;
        // Tutorial check
        if (tutVal !== 'ALL' && s.tut !== tutVal) return false;
        // Threshold check (< 80%, < 75%, >= 80%)
        if (thresVal === 'less80' && s.att >= 80) return false;
        if (thresVal === 'less75' && s.att >= 75) return false;
        if (thresVal === 'above80' && s.att < 80) return false;
        // Search text check
        if (searchVal) {
            const matchEnroll = s.enroll.toLowerCase().includes(searchVal);
            const matchName   = s.name.toLowerCase().includes(searchVal);
            if (!matchEnroll && !matchName) return false;
        }
        return true;
    });

    renderTable(currentFilteredList);
    updateFilterStatusText(classVal, batchVal, tutVal, thresVal, searchVal);
    drawFilteredBarChart(currentFilteredList);
    drawSubjectAverageChart();
};

window.resetAnalyticsFilters = function() {
    if (document.getElementById('filterClass')) document.getElementById('filterClass').value = 'ALL';
    if (document.getElementById('filterBatch')) document.getElementById('filterBatch').value = 'ALL';
    if (document.getElementById('filterTut')) document.getElementById('filterTut').value = 'ALL';
    if (document.getElementById('filterThreshold')) document.getElementById('filterThreshold').value = 'ALL';
    if (document.getElementById('filterSearch')) document.getElementById('filterSearch').value = '';
    if (document.getElementById('topSearchInput')) document.getElementById('topSearchInput').value = '';
    applyAnalyticsFilters();
};

window.handleTopSearch = function(val) {
    const fSearch = document.getElementById('filterSearch');
    if (fSearch) fSearch.value = val;
    applyAnalyticsFilters();
};

function updateFilterStatusText(cls, batch, tut, thres, search) {
    const el = document.getElementById('filterStatusText');
    const countEl = document.getElementById('tableRecordCount');
    const sub1 = document.getElementById('chart1Subtitle');

    const total = currentFilteredList.length;
    const defCount = currentFilteredList.filter(s => s.att < 80).length;

    let parts = [];
    if (cls !== 'ALL') parts.push(`Class: ${cls}`);
    if (batch !== 'ALL') parts.push(`Batch: ${batch}`);
    if (tut !== 'ALL') parts.push(`Tut: ${tut}`);
    if (thres === 'less80') parts.push(`Below 80% (Defaulters)`);
    else if (thres === 'less75') parts.push(`Critical < 75%`);
    else if (thres === 'above80') parts.push(`≥ 80% Good`);
    if (search) parts.push(`Search: "${search}"`);

    const filterSummary = parts.length ? parts.join(' · ') : 'All Criteria';
    if (el) el.textContent = `Filtered by: ${filterSummary}`;
    if (countEl) countEl.innerHTML = `Showing <strong>${total}</strong> students &nbsp;•&nbsp; <span style="color:#dc2626; font-weight:700;">${defCount} Defaulters (&lt;80%)</span>`;
    if (sub1) sub1.textContent = `Displaying ${total} students matching "${filterSummary}" · Dotted line marks 80% minimum requirement`;
}

// =========================================================================
// TABLE RENDERING (LESS THAN 80% HIGHLIGHTED)
// =========================================================================

function renderTable(list) {
    const tbody = document.getElementById('analyticsTableBody');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="table-empty-state">
                        <i data-lucide="search-x"></i>
                        <h4>No Students Match Filter Criteria</h4>
                        <p>Try resetting filters or adjusting the attendance threshold.</p>
                    </div>
                </td>
            </tr>`;
        try { lucide.createIcons(); } catch(e) {}
        return;
    }

    tbody.innerHTML = list.map((s, idx) => {
        const isDefaulter = s.att < 80;
        const attended = Math.round((s.totalSessions * s.att) / 100);
        const classKey = s.class.toLowerCase();

        const badgeHtml = isDefaulter
            ? `<span class="badge-defaulter"><i data-lucide="alert-triangle"></i> Defaulter (${s.att}%)</span>`
            : `<span class="badge-good"><i data-lucide="check-circle-2"></i> Good (${s.att}%)</span>`;

        return `
            <tr class="${isDefaulter ? 'row-defaulter' : ''}">
                <td style="color:var(--text-muted); font-size:12px; font-weight:600;">${idx + 1}</td>
                <td class="enroll-code"><code>${s.enroll}</code></td>
                <td><strong>${s.name}</strong></td>
                <td><span class="class-pill ${classKey}">${s.class}</span></td>
                <td><span class="batch-chip">${s.batch}</span></td>
                <td><span style="font-size:12px; font-weight:600; color:var(--text-muted);">${s.tut}</span></td>
                <td><span style="font-size:12.5px; color:var(--text);">${SUBJECT_NAME}</span></td>
                <td>
                    <div class="att-pct-bar-wrap">
                        <div class="att-pct-bar-track">
                            <div class="att-pct-bar-fill" style="width:${s.att}%; background:${isDefaulter ? '#ef4444' : '#10b981'}"></div>
                        </div>
                        <span class="att-pct-bar-val" style="color:${isDefaulter ? '#dc2626' : '#059669'}">${s.att}%</span>
                    </div>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${attended} / ${s.totalSessions} sessions</div>
                </td>
                <td>${badgeHtml}</td>
            </tr>`;
    }).join('');

    try { lucide.createIcons(); } catch(e) {}
}

// =========================================================================
// GRAPH 1: FILTERED ATTENDANCE DISTRIBUTION WITH 80% THRESHOLD
// =========================================================================

function drawFilteredBarChart(students) {
    const canvas = document.getElementById('filteredChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width  = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width  = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);

    const style = getComputedStyle(document.documentElement);
    const borderLight = style.getPropertyValue('--border-light').trim() || '#F1F5F9';
    const textMuted   = style.getPropertyValue('--text-muted').trim() || '#94A3B8';
    const textMain    = style.getPropertyValue('--text').trim() || '#1A1A2E';

    const W = rect.width, H = rect.height;
    const pL = 40, pR = 20, pT = 24, pB = 40;
    const cW = W - pL - pR;
    const cH = H - pT - pB;

    ctx.clearRect(0, 0, W, H);

    // Grid lines (0% .. 100%)
    for (let i = 0; i <= 5; i++) {
        const val = 100 - i * 20;
        const y = pT + (cH / 5) * i;
        ctx.strokeStyle = borderLight;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pL, y);
        ctx.lineTo(W - pR, y);
        ctx.stroke();

        ctx.fillStyle = textMuted;
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(val + '%', pL - 6, y + 4);
    }

    // 80% Minimum Threshold Line (Dotted Warning)
    const y80 = pT + cH * (1 - 80 / 100);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(pL, y80);
    ctx.lineTo(W - pR, y80);
    ctx.stroke();
    ctx.setLineDash([]);

    // 80% Label
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('80% Required Benchmark', pL + 6, y80 - 6);

    if (students.length === 0) {
        ctx.fillStyle = textMuted;
        ctx.font = '13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No students to display', W / 2, H / 2);
        return;
    }

    // Draw Bars
    const maxBars = Math.min(students.length, 30);
    const displayed = students.slice(0, maxBars);
    const barWidth = Math.max(6, Math.min(24, (cW / displayed.length) * 0.65));
    const step = cW / displayed.length;

    displayed.forEach((s, idx) => {
        const x = pL + idx * step + (step - barWidth) / 2;
        const barH = (s.att / 100) * cH;
        const y = pT + cH - barH;

        const isDefaulter = s.att < 80;
        ctx.fillStyle = isDefaulter ? '#ef4444' : '#10b981';

        // Rounded top bar
        const r = Math.min(4, barWidth / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + barWidth - r, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
        ctx.lineTo(x + barWidth, pT + cH);
        ctx.lineTo(x, pT + cH);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();

        // Label under bar (last 3 digits of enrollment)
        ctx.fillStyle = isDefaulter ? '#dc2626' : textMuted;
        ctx.font = `${isDefaulter ? 'bold ' : ''}10px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(s.enroll.slice(-3), x + barWidth / 2, H - 12);
    });
}

// =========================================================================
// GRAPH 2: PROF. SHAH'S DATA STRUCTURES (DS) SUBJECT ATTENDANCE AVERAGE
// =========================================================================

function drawSubjectAverageChart() {
    const canvas = document.getElementById('subjectAverageChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width  = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width  = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);

    const style = getComputedStyle(document.documentElement);
    const primary     = style.getPropertyValue('--primary').trim() || '#1B5E3B';
    const borderLight = style.getPropertyValue('--border-light').trim() || '#F1F5F9';
    const textMuted   = style.getPropertyValue('--text-muted').trim() || '#94A3B8';
    const cardBg      = style.getPropertyValue('--card').trim() || '#FFFFFF';

    const W = rect.width, H = rect.height;
    const pL = 40, pR = 20, pT = 24, pB = 40;
    const cW = W - pL - pR;
    const cH = H - pT - pB;

    ctx.clearRect(0, 0, W, H);

    // Grid lines (0% .. 100%)
    for (let i = 0; i <= 5; i++) {
        const val = 100 - i * 20;
        const y = pT + (cH / 5) * i;
        ctx.strokeStyle = borderLight;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pL, y);
        ctx.lineTo(W - pR, y);
        ctx.stroke();

        ctx.fillStyle = textMuted;
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(val + '%', pL - 6, y + 4);
    }

    // 80% Threshold line
    const y80 = pT + cH * (1 - 80 / 100);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pL, y80);
    ctx.lineTo(W - pR, y80);
    ctx.stroke();
    ctx.setLineDash([]);

    // Data Structures (CS-301) Lecture-by-Lecture attendance averages
    // Lectures 1 through 10 conducted by Prof. Shah
    const lectures = ['Lec 1', 'Lec 2', 'Lec 3', 'Lec 4', 'Lec 5', 'Lec 6', 'Lec 7', 'Lec 8', 'Lec 9', 'Lec 10'];
    const dsTrend = [94, 91, 88, 86, 89, 78, 85, 92, 87, 86.4];

    const pts = dsTrend.map((v, i) => ({
        x: pL + (cW / (dsTrend.length - 1)) * i,
        y: pT + cH - (v / 100) * cH
    }));

    // Gradient area fill
    const grad = ctx.createLinearGradient(0, pT, 0, pT + cH);
    grad.addColorStop(0, 'rgba(27, 94, 59, 0.28)');
    grad.addColorStop(1, 'rgba(27, 94, 59, 0.02)');

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pT + cH);
    for (let a = 0; a < pts.length; a++) {
        if (a === 0) ctx.lineTo(pts[a].x, pts[a].y);
        else {
            const cpx = (pts[a-1].x + pts[a].x) / 2;
            ctx.bezierCurveTo(cpx, pts[a-1].y, cpx, pts[a].y, pts[a].x, pts[a].y);
        }
    }
    ctx.lineTo(pts[pts.length - 1].x, pT + cH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Curved trend line
    ctx.beginPath();
    for (let b = 0; b < pts.length; b++) {
        if (b === 0) ctx.moveTo(pts[b].x, pts[b].y);
        else {
            const cpx = (pts[b-1].x + pts[b].x) / 2;
            ctx.bezierCurveTo(cpx, pts[b-1].y, cpx, pts[b].y, pts[b].x, pts[b].y);
        }
    }
    ctx.strokeStyle = primary;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Marker dots and values
    pts.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = cardBg;
        ctx.fill();
        ctx.strokeStyle = primary;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // X labels
        ctx.fillStyle = textMuted;
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(lectures[i], p.x, H - 12);
    });

    // Subject Mean Badge over last point
    const last = pts[pts.length - 1];
    ctx.fillStyle = primary;
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DS Mean: 86.4%', last.x - 30, last.y - 12);
}

// =========================================================================
// CSV EXPORT (WITH FILTRATION AND < 80% HIGHLIGHTED / FLAGGED)
// =========================================================================

window.exportAttendanceCSV = function() {
    const list = currentFilteredList.length ? currentFilteredList : allStudentsData;
    if (list.length === 0) {
        alert('No attendance data available to export.');
        return;
    }

    const headers = [
        'Sr No',
        'Enrollment Number',
        'Student Name',
        'Class',
        'Batch',
        'Tutorial Group',
        'Subject',
        'Faculty',
        'Total Lectures',
        'Attended Lectures',
        'Attendance Percentage',
        'Defaulter Status (< 80%)'
    ];

    const rows = list.map((s, idx) => {
        const attended = Math.round((s.totalSessions * s.att) / 100);
        const isDefaulter = s.att < 80;
        const status = isDefaulter ? 'YES - DEFAULTER (< 80%)' : 'ELIGIBLE';

        return [
            idx + 1,
            `"${s.enroll}"`,
            `"${s.name}"`,
            `"${s.class}"`,
            `"${s.batch}"`,
            `"${s.tut}"`,
            `"${SUBJECT_NAME}"`,
            `"${TEACHER_NAME}"`,
            s.totalSessions,
            attended,
            `${s.att}%`,
            `"${status}"`
        ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `Treva_Attendance_Analytics_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// =========================================================================
// PRINT / PDF DEFAULTER NOTICE
// =========================================================================

window.printDefaulterNotice = function() {
    const defaulters = currentFilteredList.filter(s => s.att < 80);
    if (defaulters.length === 0) {
        alert('There are no defaulters (< 80%) under current filter selection to print.');
        return;
    }

    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) return;

    const rowsHtml = defaulters.map((s, idx) => `
        <tr>
            <td style="border:1px solid #ccc; padding:8px; text-align:center;">${idx + 1}</td>
            <td style="border:1px solid #ccc; padding:8px; font-family:monospace; font-weight:bold;">${s.enroll}</td>
            <td style="border:1px solid #ccc; padding:8px;">${s.name}</td>
            <td style="border:1px solid #ccc; padding:8px; text-align:center;">${s.class}</td>
            <td style="border:1px solid #ccc; padding:8px; text-align:center;">${s.batch}</td>
            <td style="border:1px solid #ccc; padding:8px; text-align:center;">${SUBJECT_NAME}</td>
            <td style="border:1px solid #ccc; padding:8px; text-align:center; color:#dc2626; font-weight:bold;">${s.att}%</td>
            <td style="border:1px solid #ccc; padding:8px; text-align:center; background:#fee2e2; color:#991b1b; font-weight:bold;">DEFAULTER</td>
        </tr>
    `).join('');

    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Attendance Defaulter Notice - R.C. Technical Institute</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
                .head { text-align: center; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 18px; }
                .head h2 { margin: 0; font-size: 20px; }
                .head h3 { margin: 4px 0; font-size: 16px; color: #444; }
                .notice-title { text-align: center; font-size: 17px; font-weight: bold; color: #dc2626; text-decoration: underline; margin: 16px 0; }
                table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 14px; }
                th { background: #f3f4f6; border: 1px solid #ccc; padding: 8px; text-align: left; }
                .foot { margin-top: 50px; display: flex; justify-content: space-between; }
                .foot-box { text-align: center; width: 200px; border-top: 1px solid #333; padding-top: 8px; font-weight: bold; font-size: 13px; }
            </style>
        </head>
        <body>
            <div class="head">
                <h2>R. C. TECHNICAL INSTITUTE</h2>
                <h3>DEPARTMENT OF COMPUTER ENGINEERING</h3>
                <p style="margin:4px; font-size:12px; color:#666;">Academic Year 2026-27 · Faculty: ${TEACHER_NAME}</p>
            </div>
            <div class="notice-title">OFFICIAL ATTENDANCE DEFAULTER NOTICE (&lt; 80%)</div>
            <p style="font-size:13px; line-height:1.5;">The following students have less than <strong>80% mandatory attendance</strong> in <strong>${SUBJECT_NAME}</strong>. They are required to meet the subject coordinator immediately.</p>
            <table>
                <thead>
                    <tr>
                        <th style="text-align:center; width:40px;">#</th>
                        <th>Enrollment No.</th>
                        <th>Student Name</th>
                        <th style="text-align:center;">Class</th>
                        <th style="text-align:center;">Batch</th>
                        <th style="text-align:center;">Subject</th>
                        <th style="text-align:center;">Attendance %</th>
                        <th style="text-align:center;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
            <div class="foot">
                <div class="foot-box">Subject Teacher<br><span style="font-weight:normal;font-size:11px;">(${TEACHER_NAME})</span></div>
                <div class="foot-box">Class Coordinator<br><span style="font-weight:normal;font-size:11px;">(CO31 / CO32)</span></div>
                <div class="foot-box">Head of Department<br><span style="font-weight:normal;font-size:11px;">(Computer Engg.)</span></div>
            </div>
            <script>
                window.onload = function() { window.print(); };
            <\/script>
        </body>
        </html>
    `);
    printWin.document.close();
};
