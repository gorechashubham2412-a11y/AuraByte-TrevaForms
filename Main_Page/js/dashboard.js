/**
 * ============================================================================
 * TEACHER DASHBOARD (HOME PAGE) LOGIC
 * Master Timetable Aggregation across Classes (CO31, CO32, CO33, CO51, CO52)
 * & Teacher Attendance System
 * ============================================================================
 */

// Auth guard — redirect to sign-in if no session
// (supabase.js must be loaded first in index.html)
if (typeof TrevaSession !== 'undefined') {
    TrevaSession.requireAuth('../temp_signinup/index1.html');
}

// Load session data — falls back to defaults so the page always renders
const _session = (typeof TrevaSession !== 'undefined') ? (TrevaSession.load() || {}) : {};
const TEACHER_NAME = _session.fullname || 'Prof. Shah';
const TEACHER_DEPT = _session.department || 'Computer Engg. Dept.';
const TEACHER_ID   = _session.teacherid || null;
const SUPPORTED_CLASSES = ['CO31', 'CO32', 'CO33', 'CO51', 'CO52'];

// =========================================================================
// MULTI-CLASS STUDENT ROSTER STORE
// =========================================================================

// =========================================================================
// SUPABASE — STUDENT ROSTER CACHE
// Keyed by UPPERCASE classname (e.g. 'CO31') → array of student objects
// =========================================================================

/** In-memory cache populated by loadAllStudentsFromSupabase() on page load */
const _studentCache = {};  // { 'CO31': [...], 'CO32': [...], ... }
let   _studentCacheReady = false;

/**
 * Fetch all classes, students, and batches from Supabase in one go.
 * Builds _studentCache keyed by classname.
 * Called once on DOMContentLoaded.
 */
async function loadAllStudentsFromSupabase() {
    try {
        // 1. Fetch class table  →  { classid: classname }
        const classes = await sbSelect('class', { select: 'classid,classname' });
        const classMap = {};   // classid (int) → classname (string, e.g. 'CO31')
        (classes || []).forEach(c => { classMap[c.classid] = (c.classname || '').toUpperCase(); });

        // 2. Fetch batch table  →  { classid+batchid: batchname }
        const batches = await sbSelect('batch', { select: 'classid,batchid,batchname' });
        const batchMap = {};   // `${classid}_${batchid}` → batchname
        (batches || []).forEach(b => { batchMap[`${b.classid}_${b.batchid}`] = b.batchname || String(b.batchid); });

        // 3. Fetch all students
        const students = await sbSelect('student', {
            select: 'student_id,enrollment_no,name,class_id,batch_id,tutorial_id',
            order:  'enrollment_no.asc'
        });

        // 4. Group into cache by classname
        (students || []).forEach(s => {
            const cname = classMap[s.class_id];
            if (!cname) return;
            if (!_studentCache[cname]) _studentCache[cname] = [];
            const bname = batchMap[`${s.class_id}_${s.batch_id}`] || String(s.batch_id || '');
            _studentCache[cname].push({
                id:     s.student_id,
                enroll: String(s.enrollment_no || s.student_id),
                name:   s.name || 'Unknown',
                batch:  bname,
                att:    75   // default; real att% calculated from attendance table
            });
        });

        _studentCacheReady = true;
        console.info('[Treva] Loaded', students.length, 'students from Supabase.');

    } catch(err) {
        console.warn('[Treva] Supabase student fetch failed, falling back to localStorage:', err);
    }
}

/** Returns the student array for a class by name (e.g. 'CO31'). */
function getStudentsForClass(classId) {
    const key = (classId || '').toUpperCase();

    // Use Supabase cache if ready
    if (_studentCacheReady && _studentCache[key]) {
        return _studentCache[key];
    }

    // Fall back to localStorage (saved from previous Supabase fetch or attendance edits)
    try {
        const stored = localStorage.getItem('treva_students_' + key);
        if (stored) return JSON.parse(stored);
    } catch(e) {}

    // Last resort: empty list (no hardcoded fake data)
    return [];
}

function saveStudentsForClass(classId, arr) {
    try {
        localStorage.setItem('treva_students_' + (classId || '').toUpperCase(), JSON.stringify(arr));
    } catch(e) {}
}

// =========================================================================
// MULTI-CLASS TIMETABLE MASTER STORE
// =========================================================================

const DEFAULT_TIMETABLE_MASTER = [
    // MONDAY (Day 0)
    { id: 101, day: 0, dayName: 'Mon', classId: 'CO31', sub: 'Data Structures', code: 'CS-301', fac: 'Prof. Shah', loc: 'Room 454', time: '10:30 AM – 11:30 AM', type: 'Lecture', color: '#15803D' },
    { id: 102, day: 0, dayName: 'Mon', classId: 'CO52', sub: 'Database Systems', code: 'CS-503', fac: 'Prof. Shah', loc: 'Room 455', time: '11:30 AM – 12:30 PM', type: 'Lecture', color: '#0E7490' },
    { id: 103, day: 0, dayName: 'Mon', classId: 'CO32', sub: 'DS Lab (Batch B1/B2)', code: 'CS-301P', fac: 'Prof. Shah', loc: 'Computer Lab 3', time: '02:00 PM – 04:00 PM', type: 'Lab', color: '#7C3AED' },

    // TUESDAY (Day 1)
    { id: 201, day: 1, dayName: 'Tue', classId: 'CO51', sub: 'Advanced Java', code: 'CS-501', fac: 'Prof. Shah', loc: 'Room 454', time: '09:30 AM – 10:30 AM', type: 'Lecture', color: '#B45309' },
    { id: 202, day: 1, dayName: 'Tue', classId: 'CO33', sub: 'Data Structures', code: 'CS-301', fac: 'Prof. Shah', loc: 'Room 204', time: '10:30 AM – 11:30 AM', type: 'Lecture', color: '#15803D' },
    { id: 203, day: 1, dayName: 'Tue', classId: 'CO52', sub: 'Database Systems', code: 'CS-503', fac: 'Prof. Shah', loc: 'Room 455', time: '01:00 PM – 02:00 PM', type: 'Lecture', color: '#0E7490' },

    // WEDNESDAY (Day 2)
    { id: 301, day: 2, dayName: 'Wed', classId: 'CO31', sub: 'Data Structures', code: 'CS-301', fac: 'Prof. Shah', loc: 'Room 454', time: '10:30 AM – 11:30 AM', type: 'Lecture', color: '#15803D' },
    { id: 302, day: 2, dayName: 'Wed', classId: 'CO52', sub: 'DBMS Practical Lab', code: 'CS-503P', fac: 'Prof. Shah', loc: 'DBMS Lab 1', time: '11:30 AM – 01:30 PM', type: 'Lab', color: '#0E7490' },

    // THURSDAY (Day 3)
    { id: 401, day: 3, dayName: 'Thu', classId: 'CO51', sub: 'Advanced Java', code: 'CS-501', fac: 'Prof. Shah', loc: 'Room 454', time: '09:30 AM – 10:30 AM', type: 'Lecture', color: '#B45309' },
    { id: 402, day: 3, dayName: 'Thu', classId: 'CO32', sub: 'Data Structures', code: 'CS-301', fac: 'Prof. Shah', loc: 'Room 204', time: '10:30 AM – 11:30 AM', type: 'Lecture', color: '#15803D' },
    { id: 403, day: 3, dayName: 'Thu', classId: 'CO31', sub: 'Project Tutorial Hub', code: 'CS-305', fac: 'Prof. Shah', loc: 'Project Room 102', time: '02:00 PM – 03:00 PM', type: 'Tutorial', color: '#7C3AED' },

    // FRIDAY (Day 4)
    { id: 501, day: 4, dayName: 'Fri', classId: 'CO31', sub: 'Data Structures', code: 'CS-301', fac: 'Prof. Shah', loc: 'Room 454', time: '10:30 AM – 11:30 AM', type: 'Lecture', color: '#15803D' },
    { id: 502, day: 4, dayName: 'Fri', classId: 'CO52', sub: 'Database Systems', code: 'CS-503', fac: 'Prof. Shah', loc: 'Room 455', time: '11:30 AM – 12:30 PM', type: 'Lecture', color: '#0E7490' },
    { id: 503, day: 4, dayName: 'Fri', classId: 'CO33', sub: 'OOPs Java Lab', code: 'CS-304P', fac: 'Prof. Shah', loc: 'Software Lab 4', time: '01:30 PM – 03:30 PM', type: 'Lab', color: '#DC2626' },

    // SATURDAY (Day 5)
    { id: 601, day: 5, dayName: 'Sat', classId: 'CO31', sub: 'Remedial & Doubt Session', code: 'CS-301R', fac: 'Prof. Shah', loc: 'Room 454', time: '09:30 AM – 11:00 AM', type: 'Extra', color: '#15803D' }
];

function getAllTimetables() {
    try {
        const stored = localStorage.getItem('treva_all_timetables');
        if (stored) return JSON.parse(stored);
    } catch(e) {}
    saveAllTimetables(DEFAULT_TIMETABLE_MASTER);
    return DEFAULT_TIMETABLE_MASTER;
}

function saveAllTimetables(arr) {
    try {
        localStorage.setItem('treva_all_timetables', JSON.stringify(arr));
    } catch(e) {}
}

/** Get the aggregated schedule for a teacher on a specific day index (0=Mon .. 5=Sat) */
function getTeacherSchedule(dayIdx, teacher = TEACHER_NAME) {
    const all = getAllTimetables();
    return all.filter(slot => slot.day === dayIdx && slot.fac.toLowerCase().includes(teacher.toLowerCase()));
}

// =========================================================================
// ATTENDANCE LOG STORE
// =========================================================================

function getAttendanceLog() {
    try {
        return JSON.parse(localStorage.getItem('treva_attendance_log') || '[]');
    } catch(e) { return []; }
}

function saveAttendanceLog(arr) {
    try {
        localStorage.setItem('treva_attendance_log', JSON.stringify(arr));
    } catch(e) {}
}

function todayDateStr() {
    return new Date().toISOString().split('T')[0];
}

// =========================================================================
// INITIALIZATION
// =========================================================================

let currentSelectedDay = 0;
let currentAttSlot = null;
let currentAttSession = [];
let attJumpBuffer = '';
let attJumpTimer = null;

document.addEventListener('DOMContentLoaded', function() {
    try { lucide.createIcons(); } catch(e) { console.warn(e); }

    // Kick off real student fetch from Supabase (runs in background)
    loadAllStudentsFromSupabase();

    // ---- Personalise from session ----
    const h = new Date().getHours();
    let g = 'Good Morning';
    if (h >= 12 && h < 17) g = 'Good Afternoon';
    else if (h >= 17) g = 'Good Evening';

    // Greeting heading
    const greetEl = document.getElementById('greetHeading');
    if (greetEl) greetEl.textContent = `${g}, ${TEACHER_NAME}!`;

    // Profile name card
    const profileNameEl = document.getElementById('profileName');
    if (profileNameEl) profileNameEl.textContent = TEACHER_NAME;

    // Department label
    const deptEl = profileNameEl ? profileNameEl.nextElementSibling : null;
    if (deptEl) deptEl.textContent = TEACHER_DEPT;

    // Profile initials (avatar button + card)
    const initials = TEACHER_NAME
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('');
    const profBtn = document.getElementById('profBtn');
    const profInitials = document.getElementById('profileInitials');
    if (profBtn) profBtn.textContent = initials;
    if (profInitials) profInitials.textContent = initials;

    // ---- Profile dropdown ----
    const profDD = document.getElementById('profDD');
    if (profBtn && profDD) {
        profBtn.addEventListener('click', e => { e.stopPropagation(); profDD.classList.toggle('open'); });
    }
    document.addEventListener('click', e => {
        if (profDD && profBtn && !profBtn.contains(e.target) && !profDD.contains(e.target)) {
            profDD.classList.remove('open');
        }
    });

    // Auto-select today's day chip
    const jsDay = new Date().getDay();
    const mappedDay = Math.min(jsDay === 0 ? 0 : jsDay - 1, 5);
    currentSelectedDay = mappedDay;
    const chip = document.querySelector(`.day-chip[data-day="${mappedDay}"]`);
    if (chip) {
        document.querySelectorAll('.day-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
    }

    renderTeacherTimetable(mappedDay);
    updateTeacherAttendanceStats();

    setTimeout(drawAreaChart, 180);
    window.addEventListener('resize', drawAreaChart);
    window.addEventListener('treva-theme-changed', drawAreaChart);
});


// =========================================================================
// TEACHER TIMETABLE RENDERING
// =========================================================================

window.pickDay = function(el) {
    document.querySelectorAll('.day-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    currentSelectedDay = parseInt(el.getAttribute('data-day'));
    renderTeacherTimetable(currentSelectedDay);
};

window.renderTeacherTimetable = function(dayIdx) {
    const tbody = document.getElementById('ttBody');
    if (!tbody) return;

    const slots = getTeacherSchedule(dayIdx);
    const today = todayDateStr();
    const log = getAttendanceLog();

    if (slots.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:32px; color:var(--text-muted); font-size:13.5px;">
                    <i data-lucide="coffee" style="width:24px;height:24px;margin-bottom:6px;display:block;margin-inline:auto;"></i>
                    No lectures scheduled for ${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dayIdx]}! Enjoy your preparation time.
                </td>
            </tr>`;
        try { lucide.createIcons(); } catch(e){}
        return;
    }

    tbody.innerHTML = slots.map(slot => {
        const classKey = (slot.classId || 'co31').toLowerCase();
        // Check if attendance already recorded today for this slot
        const session = log.find(l => l.slotId === slot.id && l.date === today);

        let attCell = '';
        if (session) {
            attCell = `
                <div style="display:flex; align-items:center; justify-content:flex-end; gap:8px;">
                    <span class="tt-att-badge taken">
                        <i data-lucide="check-circle-2"></i> ${session.stats.present}/${session.stats.total} (${session.stats.pct}%)
                    </span>
                    <button class="tt-att-btn edit" title="Edit recorded attendance" onclick="event.stopPropagation(); openTeacherAttendanceModal(${slot.id})">
                        <i data-lucide="edit-2"></i> Edit
                    </button>
                </div>`;
        } else {
            attCell = `
                <div style="display:flex; align-items:center; justify-content:flex-end; gap:8px;">
                    <span class="tt-att-badge pending">
                        <i data-lucide="clock"></i> Pending
                    </span>
                    <button class="tt-att-btn take" title="Take attendance for this lecture" onclick="event.stopPropagation(); openTeacherAttendanceModal(${slot.id})">
                        <i data-lucide="clipboard-check"></i> Take Attendance
                    </button>
                </div>`;
        }

        return `
            <tr style="cursor:pointer;" onclick="openTeacherAttendanceModal(${slot.id})">
                <td>
                    <div class="tt-subject">
                        <div class="tt-dot" style="background:${slot.color || '#15803D'}">${slot.sub.charAt(0)}</div>
                        <div class="tt-sub-info">
                            <div class="tt-sub-name">${slot.sub}</div>
                            <div class="tt-sub-code">${slot.code} · ${slot.type}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="class-pill ${classKey}">Class ${slot.classId}</span>
                </td>
                <td class="tt-time">${slot.time}</td>
                <td><strong>${slot.loc}</strong></td>
                <td style="text-align:right;">${attCell}</td>
            </tr>`;
    }).join('');

    try { lucide.createIcons(); } catch(e){}
};

// =========================================================================
// ATTENDANCE MODAL (TEACHER)
// =========================================================================

window.openTeacherAttendanceModal = function(slotId) {
    const all = getAllTimetables();
    const slot = all.find(s => s.id === slotId);
    if (!slot) return;
    currentAttSlot = slot;

    const today = todayDateStr();
    const log = getAttendanceLog();
    const existingSession = log.find(l => l.slotId === slotId && l.date === today);

    // Get students for this specific class!
    const classStudents = getStudentsForClass(slot.classId);

    if (existingSession) {
        // Pre-fill existing records
        currentAttSession = existingSession.records.map(r => ({ ...r }));
    } else {
        // Fresh session for this class: default to absent
        currentAttSession = classStudents.map(s => ({
            enroll: s.enroll,
            name:   s.name,
            batch:  s.batch,
            present: false
        }));
    }

    // Modal Header Info
    const titleEl = document.getElementById('attSlotTitle');
    const metaEl  = document.getElementById('attSlotMeta');
    const dateEl  = document.getElementById('attDateDisplay');

    if (titleEl) titleEl.textContent = `${slot.sub} (${slot.code})`;
    if (metaEl)  metaEl.innerHTML = `<span class="class-pill ${(slot.classId||'').toLowerCase()}">Class ${slot.classId}</span> &nbsp;•&nbsp; <strong>${slot.loc}</strong> &nbsp;•&nbsp; ${slot.time}`;
    if (dateEl)  dateEl.textContent = today;

    const searchInput = document.getElementById('attSearchInput');
    if (searchInput) searchInput.value = '';

    renderAttendanceStudentList('');
    document.getElementById('attendanceModal').classList.add('open');
    attJumpBuffer = '';

    setTimeout(() => {
        const inp = document.getElementById('attSearchInput');
        if (inp) inp.focus();
    }, 150);

    try { lucide.createIcons(); } catch(e){}
};

window.closeAttendanceModal = function() {
    document.getElementById('attendanceModal').classList.remove('open');
    currentAttSlot = null;
    currentAttSession = [];
    attJumpBuffer = '';
};

window.renderAttendanceStudentList = function(query = '') {
    const tbody = document.getElementById('attStudentList');
    if (!tbody) return;

    const q = (query || '').toLowerCase().trim();
    const filtered = q
        ? currentAttSession.filter(s =>
            s.enroll.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q) ||
            s.batch.toLowerCase().includes(q))
        : currentAttSession;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--text-muted);">No students match your query.</td></tr>`;
        updateModalStatsBar();
        return;
    }

    tbody.innerHTML = filtered.map((s, localIdx) => {
        const globalIdx = currentAttSession.indexOf(s) + 1;
        return `
            <tr class="att-row${s.present ? ' att-present' : ''}" id="att-row-${s.enroll}" data-enroll="${s.enroll}">
                <td class="att-sr">${globalIdx}</td>
                <td class="att-enroll"><code>${s.enroll}</code></td>
                <td class="att-name">${s.name}</td>
                <td class="att-batch"><span class="batch-chip">${s.batch}</span></td>
                <td class="att-check-cell">
                    <label class="att-chk-wrap" title="Click or press Space to mark">
                        <input type="checkbox"
                            class="att-chk-real"
                            id="chk-${s.enroll}"
                            data-enroll="${s.enroll}"
                            ${s.present ? 'checked' : ''}
                            onchange="toggleStudentAttendance('${s.enroll}', this.checked)">
                        <span class="att-chk-visual${s.present ? ' checked' : ''}"></span>
                        <span class="att-chk-label">${s.present ? 'Present' : 'Absent'}</span>
                    </label>
                </td>
            </tr>`;
    }).join('');

    updateModalStatsBar();
    try { lucide.createIcons(); } catch(e){}
};

window.toggleStudentAttendance = function(enroll, isPresent) {
    const idx = currentAttSession.findIndex(s => s.enroll === enroll);
    if (idx === -1) return;
    currentAttSession[idx].present = isPresent;

    const row = document.getElementById('att-row-' + enroll);
    if (row) {
        row.classList.toggle('att-present', isPresent);
        const visual = row.querySelector('.att-chk-visual');
        const label  = row.querySelector('.att-chk-label');
        if (visual) visual.classList.toggle('checked', isPresent);
        if (label)  label.textContent = isPresent ? 'Present' : 'Absent';
    }
    updateModalStatsBar();
};

window.updateModalStatsBar = function() {
    const total = currentAttSession.length;
    const present = currentAttSession.filter(s => s.present).length;
    const absent = total - present;
    const pct = total ? Math.round((present / total) * 100) : 0;

    const bar = document.getElementById('attStatsBar');
    if (bar) {
        bar.innerHTML = `
            <span class="att-stat present"><i data-lucide="user-check"></i> Present: <strong>${present}</strong></span>
            <span class="att-stat absent"><i data-lucide="user-x"></i> Absent: <strong>${absent}</strong></span>
            <span class="att-stat total"><i data-lucide="users"></i> Class Strength: <strong>${total}</strong></span>
            <span class="att-stat pct" style="color:${pct >= 75 ? 'var(--primary)' : '#dc2626'}">${pct}%</span>
        `;
        try { lucide.createIcons(); } catch(e){}
    }

    const pctFill = document.getElementById('attPctBar');
    if (pctFill) {
        pctFill.style.width = pct + '%';
        pctFill.style.background = pct >= 75 ? 'var(--primary)' : '#dc2626';
    }
};

window.markAllPresent = function() {
    currentAttSession.forEach(s => s.present = true);
    const q = document.getElementById('attSearchInput');
    renderAttendanceStudentList(q ? q.value : '');
};

window.markAllAbsent = function() {
    currentAttSession.forEach(s => s.present = false);
    const q = document.getElementById('attSearchInput');
    renderAttendanceStudentList(q ? q.value : '');
};

/** Move up or down in the student list */
window.navigateAttStudent = function(direction) {
    const rows = Array.from(document.querySelectorAll('#attStudentList tr.att-row'));
    if (rows.length === 0) return;

    // Find index of currently focused or selected row
    let currentIdx = rows.findIndex(r => r.contains(document.activeElement) || r.classList.contains('att-row-focused'));

    let nextIdx;
    if (currentIdx === -1) {
        nextIdx = direction > 0 ? 0 : rows.length - 1;
    } else {
        nextIdx = currentIdx + direction;
        if (nextIdx < 0) nextIdx = 0;
        if (nextIdx >= rows.length) nextIdx = rows.length - 1;
    }

    rows.forEach(r => r.classList.remove('att-row-focused'));
    const targetRow = rows[nextIdx];
    if (targetRow) {
        targetRow.classList.add('att-row-focused');
        targetRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const cb = targetRow.querySelector('.att-chk-real');
        if (cb) cb.focus();
    }
};

/** When user presses Enter or Arrow keys in search input */
window.handleAttSearchKeydown = function(e) {
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateAttStudent(1);
        return;
    }
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateAttStudent(-1);
        return;
    }
    if (e.key === 'Enter') {
        e.preventDefault();
        const input = document.getElementById('attSearchInput');
        if (!input) return;
        const val = input.value.trim().toLowerCase();
        if (!val) {
            navigateAttStudent(1);
            return;
        }

        // Find match in current class session (priority: endsWith digit, or contains in enroll/name)
        const match = currentAttSession.find(s =>
            s.enroll.endsWith(val) ||
            s.enroll.toLowerCase().includes(val) ||
            s.name.toLowerCase().includes(val)
        );

        if (match) {
            // Mark present
            toggleStudentAttendance(match.enroll, true);

            // Clear search so teacher can immediately type next student enrollment!
            input.value = '';
            renderAttendanceStudentList('');

            // Highlight and scroll to marked row
            setTimeout(() => {
                const row = document.getElementById('att-row-' + match.enroll);
                if (row) {
                    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    row.classList.add('att-row-flash', 'att-row-focused');
                    setTimeout(() => row.classList.remove('att-row-flash'), 600);
                }
                const inp = document.getElementById('attSearchInput');
                if (inp) inp.focus();
            }, 50);
        }
    }
};

/** Search & jump */
window.handleAttSearch = function(val) {
    renderAttendanceStudentList(val);
    if (!val.trim()) return;

    const q = val.toLowerCase().trim();
    const match = currentAttSession.find(s =>
        s.enroll.endsWith(q) ||
        s.enroll.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
    );
    if (match) {
        const rows = document.querySelectorAll('#attStudentList tr.att-row');
        rows.forEach(r => r.classList.remove('att-row-focused'));
        const row = document.getElementById('att-row-' + match.enroll);
        if (row) {
            row.classList.add('att-row-focused');
            row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            const cb = row.querySelector('.att-chk-real');
            if (cb) cb.focus();
        }
    }
};

/** Keyboard navigation (Arrow keys, Enter, digit jumping) inside modal */
window.handleAttModalKeydown = function(e) {
    if (e.target && e.target.id === 'attSearchInput') return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateAttStudent(1);
        return;
    }
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateAttStudent(-1);
        return;
    }

    if (e.key === 'Enter') {
        e.preventDefault();
        let targetEnroll = null;

        const focusedRow = document.querySelector('#attStudentList tr.att-row-focused') ||
                           (document.activeElement && document.activeElement.closest('tr.att-row'));

        if (focusedRow) {
            targetEnroll = focusedRow.getAttribute('data-enroll');
        } else if (attJumpBuffer) {
            const match = currentAttSession.find(s => s.enroll.endsWith(attJumpBuffer));
            if (match) targetEnroll = match.enroll;
        }

        if (targetEnroll) {
            toggleStudentAttendance(targetEnroll, true);
            const row = document.getElementById('att-row-' + targetEnroll);
            if (row) {
                row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                row.classList.add('att-row-flash');
                setTimeout(() => row.classList.remove('att-row-flash'), 600);
            }
            attJumpBuffer = '';
            const ind = document.getElementById('attJumpIndicator');
            if (ind) { ind.textContent = ''; ind.style.display = 'none'; }
        }
    } else if (/^\d$/.test(e.key)) {
        e.preventDefault();
        attJumpBuffer += e.key;
        clearTimeout(attJumpTimer);

        const ind = document.getElementById('attJumpIndicator');
        if (ind) {
            ind.textContent = '↳ ' + attJumpBuffer;
            ind.style.display = 'inline';
        }

        const match = currentAttSession.find(s => s.enroll.endsWith(attJumpBuffer));
        if (match) {
            const row = document.getElementById('att-row-' + match.enroll);
            if (row) {
                row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                const cb = row.querySelector('.att-chk-real');
                if (cb) cb.focus();
            }
        }

        attJumpTimer = setTimeout(() => {
            attJumpBuffer = '';
            if (ind) { ind.textContent = ''; ind.style.display = 'none'; }
        }, 1200);
    } else if (e.key === 'Escape') {
        closeAttendanceModal();
    }
};

/** Save Attendance */
window.saveAttendance = function() {
    if (!currentAttSlot) return;

    const today = todayDateStr();
    const log = getAttendanceLog();
    const total = currentAttSession.length;
    const present = currentAttSession.filter(s => s.present).length;
    const absent = total - present;
    const pct = total ? Math.round((present / total) * 100) : 0;

    const existingIdx = log.findIndex(l => l.slotId === currentAttSlot.id && l.date === today);

    const sessionEntry = {
        id: existingIdx !== -1 ? log[existingIdx].id : Date.now(),
        slotId: currentAttSlot.id,
        date: today,
        day: currentAttSlot.day,
        classId: currentAttSlot.classId,
        sub: currentAttSlot.sub,
        code: currentAttSlot.code,
        time: currentAttSlot.time,
        loc: currentAttSlot.loc,
        fac: currentAttSlot.fac,
        records: currentAttSession.map(s => ({ ...s })),
        stats: { total, present, absent, pct }
    };

    if (existingIdx !== -1) {
        log[existingIdx] = sessionEntry;
    } else {
        log.unshift(sessionEntry);
    }
    saveAttendanceLog(log);

    // Update each student's stored attendance in class roster
    const classRoster = getStudentsForClass(currentAttSlot.classId);
    currentAttSession.forEach(s => {
        const student = classRoster.find(item => item.enroll === s.enroll);
        if (student) {
            // Adjust attendance slightly based on present mark
            if (s.present && student.att < 99) student.att = Math.min(100, student.att + 1);
            else if (!s.present && student.att > 50) student.att = Math.max(0, student.att - 1);
        }
    });
    saveStudentsForClass(currentAttSlot.classId, classRoster);

    const targetClass = currentAttSlot.classId;
    closeAttendanceModal();
    renderTeacherTimetable(currentSelectedDay);
    updateTeacherAttendanceStats();

    showToast(`✓ Attendance saved for Class ${targetClass} — ${present}/${total} (${pct}%) Present!`);
};

/** Update Ring and Stats based on real attendance records */
function updateTeacherAttendanceStats() {
    const log = getAttendanceLog();
    if (log.length === 0) return;

    let totalRecorded = 0;
    let presentRecorded = 0;
    log.forEach(item => {
        totalRecorded += item.stats.total;
        presentRecorded += item.stats.present;
    });

    const avg = totalRecorded ? Math.round((presentRecorded / totalRecorded) * 100) : 84;
    setAttendanceRing(avg);
}

// =========================================================================
// ATTENDANCE RING (SVG)
// =========================================================================
window.setAttendanceRing = function(percent) {
    const ring = document.querySelector('.ring-progress');
    const val = document.querySelector('.ring-val');
    if (ring) {
        const circumference = 276.46;
        const offset = circumference * (1 - percent / 100);
        ring.style.strokeDashoffset = offset;
    }
    if (val) val.textContent = Math.round(percent) + '%';
};

// =========================================================================
// TOAST NOTIFICATION
// =========================================================================
function showToast(msg) {
    let toast = document.getElementById('trevaToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'trevaToast';
        toast.style.cssText = [
            'position:fixed', 'bottom:30px', 'left:50%', 'transform:translateX(-50%)',
            'background:var(--primary)', 'color:#fff', 'padding:12px 24px',
            'border-radius:50px', 'font-size:13.5px', 'font-weight:600',
            'box-shadow:0 6px 24px rgba(0,0,0,0.18)', 'z-index:99999',
            'transition:opacity 0.4s, transform 0.4s', 'white-space:nowrap'
        ].join(';');
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(10px)';
    }, 3200);
}

// =========================================================================
// ATTENDANCE AREA CHART
// =========================================================================
function toRgba(colorStr, alpha) {
    if (!colorStr) return `rgba(27,94,59,${alpha})`;
    if (colorStr.startsWith('#')) {
        let h = colorStr.replace('#', '');
        if (h.length === 3) h = h.split('').map(x => x + x).join('');
        const n = parseInt(h, 16);
        if (!isNaN(n)) {
            return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
        }
    }
    if (colorStr.startsWith('rgb')) {
        return colorStr.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
    }
    return colorStr;
}

function drawAreaChart() {
    try {
        const canvas = document.getElementById('attendChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.parentElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.scale(dpr, dpr);

        const style = getComputedStyle(document.documentElement);
        const primary = style.getPropertyValue('--primary').trim() || '#1B5E3B';
        const text = style.getPropertyValue('--text').trim() || '#1A1A2E';
        const textMuted = style.getPropertyValue('--text-muted').trim() || '#94A3B8';
        const borderLight = style.getPropertyValue('--border-light').trim() || '#F1F5F9';
        const cardBg = style.getPropertyValue('--card').trim() || '#FFFFFF';

        const W = rect.width, H = rect.height;
        const pL = 40, pR = 20, pT = 20, pB = 32;
        const cW = W - pL - pR, cH = H - pT - pB;

        const data = [82, 90, 78, 95, 88, 45, 72, 88, 92, 85, 78, 90];
        const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

        ctx.strokeStyle = borderLight;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = pT + (cH / 5) * i;
            ctx.beginPath();
            ctx.moveTo(pL, y);
            ctx.lineTo(W - pR, y);
            ctx.stroke();
            ctx.fillStyle = textMuted;
            ctx.font = '11px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText((100 - 20 * i) + '%', pL - 6, y + 4);
        }

        const pts = data.map((v, i) => ({
            x: pL + (cW / (data.length - 1)) * i,
            y: pT + cH - (v / 100) * cH
        }));

        ctx.fillStyle = textMuted;
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        labels.forEach((l, i) => ctx.fillText(l, pts[i].x, H - 8));

        const curMonth = new Date().getMonth();
        ctx.save();
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillStyle = primary;
        ctx.fillText(labels[curMonth], pts[curMonth].x, H - 8);
        ctx.restore();

        const grad = ctx.createLinearGradient(0, pT, 0, pT + cH);
        grad.addColorStop(0, toRgba(primary, 0.28));
        grad.addColorStop(1, toRgba(primary, 0.02));

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pT + cH);
        for (let a = 0; a < pts.length; a++) {
            if (a === 0) ctx.lineTo(pts[a].x, pts[a].y);
            else {
                const cpx = (pts[a-1].x + pts[a].x) / 2;
                ctx.bezierCurveTo(cpx, pts[a-1].y, cpx, pts[a].y, pts[a].x, pts[a].y);
            }
        }
        ctx.lineTo(pts[pts.length-1].x, pT + cH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        for (let b = 0; b < pts.length; b++) {
            if (b === 0) ctx.moveTo(pts[b].x, pts[b].y);
            else {
                const cpx2 = (pts[b-1].x + pts[b].x) / 2;
                ctx.bezierCurveTo(cpx2, pts[b-1].y, cpx2, pts[b].y, pts[b].x, pts[b].y);
            }
        }
        ctx.strokeStyle = primary;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        pts.forEach((p, d) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, d === curMonth ? 5 : 3.5, 0, Math.PI * 2);
            ctx.fillStyle = d === curMonth ? primary : cardBg;
            ctx.fill();
            ctx.strokeStyle = primary;
            ctx.lineWidth = 2.5;
            ctx.stroke();
        });

        const tp = pts[curMonth];
        const tipW = 126, tipH = 28, tipR = 6;
        const tipX = tp.x - tipW / 2, tipY = tp.y - tipH - 14;
        ctx.fillStyle = cardBg;
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
        ctx.beginPath();
        ctx.moveTo(tipX + tipR, tipY);
        ctx.lineTo(tipX + tipW - tipR, tipY);
        ctx.quadraticCurveTo(tipX + tipW, tipY, tipX + tipW, tipY + tipR);
        ctx.lineTo(tipX + tipW, tipY + tipH - tipR);
        ctx.quadraticCurveTo(tipX + tipW, tipY + tipH, tipX + tipW - tipR, tipY + tipH);
        ctx.lineTo(tipX + tipR, tipY + tipH);
        ctx.quadraticCurveTo(tipX, tipY + tipH, tipX, tipY + tipH - tipR);
        ctx.lineTo(tipX, tipY + tipR);
        ctx.quadraticCurveTo(tipX, tipY, tipX + tipR, tipY);
        ctx.closePath();
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = borderLight;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = text;
        ctx.font = '600 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Attendance : ' + data[curMonth] + '%', tp.x, tipY + 18);

    } catch(e) { console.warn('Chart error:', e); }
}