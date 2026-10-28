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

// Load session data — use only persisted database-backed identity when available
const _session = (typeof TrevaSession !== 'undefined') ? (TrevaSession.load() || {}) : {};
const TEACHER_NAME = _session.fullname || '';
const TEACHER_DEPT = _session.department || '';

/* =============================================
   DATA FETCHING & STUDENT ROSTER — Supabase student data loading and roster cache
   ============================================= */

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
        // Attendance history is keyed by enrollment, while the dashboard renders names by class.
        const log = (typeof TrevaAttendance !== 'undefined') ? TrevaAttendance.getLog() : getAttendanceLog();
        (students || []).forEach(s => {
            const cname = classMap[s.class_id];
            if (!cname) return;
            if (!_studentCache[cname]) _studentCache[cname] = [];
            const bname = batchMap[`${s.class_id}_${s.batch_id}`] || '';
            const enroll = String(s.enrollment_no || s.student_id);
            const stats = (typeof TrevaAttendance !== 'undefined')
                ? TrevaAttendance.calculateStudentAttendance(enroll, log)
                : { pct: null, hasRecords: false };
            _studentCache[cname].push({
                id:     s.student_id,
                enroll: enroll,
                name:   s.name || '',
                batch:  bname,
                att:    stats.hasRecords ? stats.pct : null
            });
        });

        _studentCacheReady = true;
        // Also persist to localStorage for offline / cross-page consistency
        Object.keys(_studentCache).forEach(cls => {
            saveStudentsForClass(cls, _studentCache[cls]);
        });
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

// Saves student array for a class to localStorage
function saveStudentsForClass(classId, arr) {
    try {
        localStorage.setItem('treva_students_' + (classId || '').toUpperCase(), JSON.stringify(arr));
    } catch(e) {}
}

/* =============================================
   MASTER TIMETABLE STORE — Schedule aggregation and slot mapping
   ============================================= */

let _masterTimetableCacheReady = false;
let _masterTimetable = [];

function formatTime12(timeStr) {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    const hStr = h < 10 ? '0' + h : String(h);
    return `${hStr}:${m} ${ampm}`;
}

function formatTimeSlotRange(start, end) {
    if (!start || !end) return '';
    return `${formatTime12(start)} – ${formatTime12(end)}`;
}

function teacherMatches(slotTeacher, targetTeacher) {
    if (!slotTeacher || !targetTeacher) return false;
    const s = slotTeacher.toLowerCase().trim();
    const t = targetTeacher.toLowerCase().trim();
    if (s === t || s.includes(t) || t.includes(s)) return true;
    const sLast = s.split(/\s+/).pop();
    const tLast = t.split(/\s+/).pop();
    if (sLast && tLast && sLast === tLast && sLast.length > 2) return true;
    return false;
}

// Loads aggregated timetable slots across all classes from Supabase
async function loadMasterTimetableFromSupabase() {
    if (typeof sbSelect !== 'function') return;
    const tbody = document.getElementById('ttBody');
    if (tbody && _masterTimetable.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="treva-table-loading-cell">${getTrevaLoadingHtml('Loading Timetable Schedule...', 'Aggregating faculty slots from database')}</td></tr>`;
    }
    try {
        const [rawSlots, batches, tutorials] = await Promise.all([
            sbSelect('timetable_slot', {
                select: 'slotid,room,slot_type,day_of_week,start_time,end_time,batchid,tutorialid,subject(subjectname,subjectcode),teacher(fullname),class(classid,classname)',
                order: 'day_of_week.asc,start_time.asc'
            }),
            sbSelect('batch', { select: 'classid,batchid,batchname' }),
            sbSelect('tutorial', { select: 'classid,tutorialid,tutorialname' })
        ]);
        if (!rawSlots || rawSlots.length === 0) return;

        const batchMap = {};
        (batches || []).forEach(b => { batchMap[b.batchid] = b.batchname; });
        const tutMap = {};
        (tutorials || []).forEach(t => { tutMap[t.tutorialid] = t.tutorialname; });

        const dayIdxMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
        const dayNameMap = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
        const colorPalette = {
            'CN': '#0E7490',
            'DS': '#15803D',
            'DEF': '#B45309',
            'FOS': '#7C3AED',
            'RDBMS': '#2563EB',
            'RWPD': '#BE123C'
        };

        const sessionMap = new Map();
        for (const slot of rawSlots) {
            const timeStr = formatTimeSlotRange(slot.start_time, slot.end_time);
            const classCode = slot.class ? slot.class.classname : '';
            const teacherName = slot.teacher ? slot.teacher.fullname : '';
            const subName = slot.subject ? slot.subject.subjectname : '';
            const subCode = slot.subject ? slot.subject.subjectcode : '';

            let groupName = 'All Batches';
            if (slot.slot_type === 'Lab' && slot.batchid) {
                groupName = batchMap[slot.batchid] || `Batch ${slot.batchid}`;
            } else if (slot.slot_type === 'Tutorial' && slot.tutorialid) {
                groupName = tutMap[slot.tutorialid] || `Tut ${slot.tutorialid}`;
            }

            const key = `${slot.day_of_week}_${slot.start_time}_${slot.end_time}_${classCode}_${slot.room}_${teacherName}_${subCode}_${groupName}`;

            if (!sessionMap.has(key)) {
                sessionMap.set(key, {
                    id: slot.slotid,
                    day: dayIdxMap[slot.day_of_week] ?? null,
                    dayName: dayNameMap[slot.day_of_week] || '',
                    classId: classCode,
                    group: groupName,
                    sub: subName,
                    code: subCode,
                    fac: teacherName,
                    loc: slot.room,
                    startTime: slot.start_time,
                    endTime: slot.end_time,
                    time: timeStr,
                    type: slot.slot_type || 'Lecture',
                    color: colorPalette[subCode] || '#15803D',
                    slotIds: [slot.slotid]
                });
            } else {
                sessionMap.get(key).slotIds.push(slot.slotid);
            }
        }

        _masterTimetable = Array.from(sessionMap.values());
        _masterTimetableCacheReady = true;
        saveAllTimetables(_masterTimetable);
        console.info('[Treva] Loaded', _masterTimetable.length, 'unique timetable slots from Supabase.');

        const subTitleEl = document.getElementById('ttTeacherSubTitle');
        if (subTitleEl) {
            subTitleEl.textContent = TEACHER_NAME ? `Prof. ${TEACHER_NAME} · Personal Schedule` : 'Faculty Schedule · Personal Classes';
        }

        if (typeof renderTeacherTimetable === 'function') {
            renderTeacherTimetable(currentSelectedDay);
        }
    } catch (e) {
        console.warn('[Treva] Failed to load master timetable from Supabase:', e);
    }
}

// Returns master timetable slots from memory cache or localStorage
function getAllTimetables() {
    if (_masterTimetableCacheReady && _masterTimetable.length > 0) {
        return _masterTimetable;
    }
    try {
        const stored = localStorage.getItem('treva_all_timetables');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.length > 0) return parsed;
        }
    } catch(e) {}
    return [];
}

// Persists master timetable slots to localStorage
function saveAllTimetables(arr) {
    try {
        localStorage.setItem('treva_all_timetables', JSON.stringify(arr));
    } catch(e) {}
}

/** Get the aggregated schedule for a teacher on a specific day index (0=Mon .. 5=Sat) or 'all' */
function getTeacherSchedule(dayIdx, teacher = TEACHER_NAME) {
    const all = getAllTimetables();
    if (dayIdx === 'all') {
        return all.filter(slot => teacherMatches(slot.fac, teacher));
    }
    const dIdx = Number(dayIdx);
    return all.filter(slot => Number(slot.day) === dIdx && teacherMatches(slot.fac, teacher));
}

/* =============================================
   ATTENDANCE LOG STORE — Local session history management
   ============================================= */

// Retrieves attendance records from localStorage
function getAttendanceLog() {
    try {
        return JSON.parse(localStorage.getItem('treva_attendance_log') || '[]');
    } catch(e) { return []; }
}

// Persists attendance session log to localStorage
function saveAttendanceLog(arr) {
    try {
        localStorage.setItem('treva_attendance_log', JSON.stringify(arr));
    } catch(e) {}
}

// Returns current date string formatted as YYYY-MM-DD
function todayDateStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Robustly matches an attendance session record to a timetable slot.
 * Matches across slotId, slotIds arrays, and composite attributes (class, day, time, subject).
 */
function findAttendanceSession(log, slot, date = null) {
    if (!log || !log.length || !slot) return null;
    const sId = String(slot.id);
    const sIds = (slot.slotIds || [slot.id]).map(String);

    // 1. Try exact slotId match (+ date if given)
    let match = log.find(l => {
        const lId = String(l.slotId);
        const idMatches = lId === sId || sIds.includes(lId) || (l.slotIds && l.slotIds.map(String).some(x => sIds.includes(x)));
        return idMatches && (!date || l.date === date);
    });
    if (match) return match;

    // 2. Try composite match by class + day + time + subject
    match = log.find(l => {
        const classMatches = String(l.classId).toLowerCase() === String(slot.classId).toLowerCase();
        const timeMatches  = l.time === slot.time;
        const dayMatches   = Number(l.day) === Number(slot.day);
        const subMatches   = !l.code || !slot.code || String(l.code).toLowerCase() === String(slot.code).toLowerCase();
        return classMatches && timeMatches && dayMatches && subMatches && (!date || l.date === date);
    });
    if (match) return match;

    // 3. If searching for today but not found, return latest record for this slot so entered attendance is displayed
    if (date) {
        return findAttendanceSession(log, slot, null);
    }
    return null;
}

/* =============================================
   DASHBOARD INITIALIZATION — Session personalization and page setup
   ============================================= */

let currentSelectedDay = 0;
let currentAttSlot = null;
let currentAttSession = [];
let attJumpBuffer = '';
let attJumpTimer = null;

// Initializes dashboard page session, greetings, and timetable view
window.initDashboardPage = function() {
    try { lucide.createIcons(); } catch(e) { console.warn(e); }

    // Kick off real student fetch from Supabase (runs in background)
    loadAllStudentsFromSupabase();
    loadMasterTimetableFromSupabase();

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
    const initials = (TEACHER_NAME || 'SP')
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
    if (profBtn && profDD && !profBtn._hasDDListener) {
        profBtn._hasDDListener = true;
        profBtn.addEventListener('click', e => { e.stopPropagation(); profDD.classList.toggle('open'); });
    }
    if (!document._hasDDDocListener) {
        document._hasDDDocListener = true;
        document.addEventListener('click', e => {
            const dd = document.getElementById('profDD');
            const btn = document.getElementById('profBtn');
            if (dd && btn && !btn.contains(e.target) && !dd.contains(e.target)) {
                dd.classList.remove('open');
            }
        });
    }

    // Auto-select today's day chip
    const jsDay = new Date().getDay();
    const mappedDay = Math.min(jsDay === 0 ? 0 : jsDay - 1, 5);
    currentSelectedDay = 'today';
    const chip = document.querySelector(`.day-chip[data-day="today"]`) || document.querySelector(`.day-chip[data-day="${mappedDay}"]`);
    if (chip) {
        document.querySelectorAll('.day-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
    }

    renderTeacherTimetable('today');
    updateTeacherAttendanceStats();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (document.getElementById('homeSection')) window.initDashboardPage();
    });
} else {
    if (document.getElementById('homeSection')) window.initDashboardPage();
}


/* =============================================
   DASHBOARD RENDERING — Faculty schedule timetable rendering and day filters
   ============================================= */

// Handles day tab selection and re-renders schedule
window.pickDay = function(el) {
    document.querySelectorAll('.day-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    const dayVal = el.getAttribute('data-day');
    currentSelectedDay = (dayVal === 'today' || dayVal === 'all') ? dayVal : parseInt(dayVal);
    renderTeacherTimetable(currentSelectedDay);
};

// Renders timetable rows for selected day or entire week
window.renderTeacherTimetable = function(daySelection = currentSelectedDay) {
    const tbody = document.getElementById('ttBody');
    if (!tbody) return;

    let targetDayIdx;
    let isAllView = false;
    const jsDay = new Date().getDay();
    const todayMappedDay = Math.min(jsDay === 0 ? 0 : jsDay - 1, 5);
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    if (daySelection === 'today') {
        targetDayIdx = todayMappedDay;
    } else if (daySelection === 'all') {
        isAllView = true;
    } else {
        targetDayIdx = parseInt(daySelection);
    }

    let slots = isAllView ? getTeacherSchedule('all') : getTeacherSchedule(targetDayIdx);
    if (isAllView) {
        slots = [...slots].sort((a, b) => (a.day - b.day) || (a.startTime || '').localeCompare(b.startTime || ''));
    }
    const today = todayDateStr();
    const log = getAttendanceLog();

    // Update session count pill
    const countPill = document.getElementById('ttSessionsPill');
    if (countPill) {
        const count = slots.length;
        const label = isAllView ? `${count} Weekly Sessions` : `${count} ${count === 1 ? 'Lecture' : 'Lectures'} Scheduled`;
        countPill.textContent = label;
    }

    // Update today badge text
    const todayBadge = document.getElementById('ttTodayBadge');
    if (todayBadge) {
        todayBadge.innerHTML = `<i data-lucide="calendar"></i> Today: ${dayNames[todayMappedDay]}`;
    }

    if (slots.length === 0) {
        const dayLabel = isAllView ? 'this entire week' : dayNames[targetDayIdx];
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:48px 20px; color:var(--text-muted); font-size:13.5px;">
                    <div style="width:48px; height:48px; border-radius:50%; background:var(--surface-tint); color:var(--primary); display:flex; align-items:center; justify-content:center; margin:0 auto 12px auto;">
                        <i data-lucide="coffee" style="width:24px; height:24px;"></i>
                    </div>
                    <strong>No lectures scheduled for ${dayLabel} in the database.</strong>
                    <div style="font-size:12px; margin-top:4px; color:var(--text-muted);">Enjoy your preparation and research time!</div>
                </td>
            </tr>`;
        try { lucide.createIcons(); } catch(e){}
        return;
    }

    tbody.innerHTML = slots.map(slot => {
        const classKey = (slot.classId || 'co31').toLowerCase();
        const typeClass = (slot.type || 'Lecture').toLowerCase();
        // Check if attendance already recorded for this slot
        const session = findAttendanceSession(log, slot, today);

        let attCell = '';
        if (session && session.stats) {
            const pct = session.stats.pct ?? 0;
            const isHigh = pct >= 75;
            const badgeBg = isHigh ? 'rgba(21, 128, 61, 0.12)' : 'rgba(220, 38, 38, 0.12)';
            const badgeCol = isHigh ? '#15803D' : '#DC2626';
            const badgeBorder = isHigh ? 'rgba(21, 128, 61, 0.25)' : 'rgba(220, 38, 38, 0.25)';

            attCell = `
                <div style="display:flex; align-items:center; justify-content:flex-end; gap:8px;">
                    <span class="tt-att-badge taken" style="background:${badgeBg}; color:${badgeCol}; border:1px solid ${badgeBorder}; font-weight:600; display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:6px; font-size:12px;">
                        <i data-lucide="check-circle-2" style="width:14px;height:14px;"></i> ${session.stats.present} / ${session.stats.total} (${pct}%)
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

        const typeBadge = `<span class="slot-type-badge slot-type-${typeClass}">${slot.type || 'Lecture'}</span>`;

        return `
            <tr style="cursor:pointer;" onclick="openTeacherAttendanceModal(${slot.id})" title="Click to view/mark lecture attendance">
                <td>
                    <div class="tt-subject">
                        <div class="tt-dot" style="background:${slot.color || '#15803D'}">${slot.sub ? slot.sub.charAt(0) : 'S'}</div>
                        <div class="tt-sub-info">
                            <div class="tt-sub-name">${slot.sub}</div>
                            <div class="tt-sub-code">${slot.code} &nbsp;·&nbsp; ${typeBadge}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="class-pill ${classKey}">Class ${slot.classId}</span>
                    <span class="batch-sub-pill">${slot.group || 'All Batches'}</span>
                </td>
                <td>
                    <div class="tt-time">${slot.time}</div>
                    ${isAllView ? `<span style="font-size:11px; color:var(--text-muted); font-weight:600;">${slot.dayName}</span>` : ''}
                </td>
                <td><strong>${slot.loc}</strong></td>
                <td style="text-align:right;">${attCell}</td>
            </tr>`;
    }).join('');

    try { lucide.createIcons(); } catch(e){}
};

/* =============================================
   ATTENDANCE MODAL — Interactive roster marking and rapid keyboard entry
   ============================================= */

// Opens attendance marking modal for a specific timetable slot
window.openTeacherAttendanceModal = function(slotId) {
    const all = getAllTimetables();
    const slot = all.find(s => String(s.id) === String(slotId) || (s.slotIds && s.slotIds.map(String).includes(String(slotId))));
    if (!slot) return;
    currentAttSlot = slot;

    const today = todayDateStr();
    const log = getAttendanceLog();
    const existingSession = findAttendanceSession(log, slot, today);

    // Get students for this specific class!
    let classStudents = getStudentsForClass(slot.classId);
    if (!classStudents || classStudents.length === 0) {
        classStudents = getStudentsForClass('CO31');
    }

    const recordMap = new Map();
    if (existingSession && existingSession.records && existingSession.records.length > 0) {
        existingSession.records.forEach(r => recordMap.set(String(r.enroll), Boolean(r.present)));
    }

    currentAttSession = classStudents.map(s => {
        const enrollStr = String(s.enroll);
        const wasPresent = recordMap.has(enrollStr) ? recordMap.get(enrollStr) : false;
        return {
            id:     s.id,
            enroll: enrollStr,
            name:   s.name,
            batch:  s.batch,
            present: wasPresent
        };
    });

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
        const rows = document.querySelectorAll('#attStudentList tr.att-row');
        if (rows.length > 0) {
            rows.forEach(r => r.classList.remove('att-row-focused'));
            rows[0].classList.add('att-row-focused');
        }
    }, 150);

    try { lucide.createIcons(); } catch(e){}
};

// Closes attendance modal and resets active session state
window.closeAttendanceModal = function() {
    document.getElementById('attendanceModal').classList.remove('open');
    currentAttSlot = null;
    currentAttSession = [];
    attJumpBuffer = '';
};

// Renders filtered student rows inside attendance modal
window.renderAttendanceStudentList = function(query = '') {
    const tbody = document.getElementById('attStudentList');
    if (!tbody) return;

    const q = (query || '').toLowerCase().trim();
    const isNum = /^\d+$/.test(q);
    const filtered = q
        ? currentAttSession.filter(s => {
            const enroll = String(s.enroll || '').toLowerCase();
            if (isNum) {
                // When typing numbers like 64, search for student whose enrollment ends with 64
                return enroll === q || enroll.endsWith(q);
            }
            return enroll.includes(q) ||
                   s.name.toLowerCase().includes(q) ||
                   s.batch.toLowerCase().includes(q);
        })
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

    // Ensure the first matching student has focus highlight if none is focused
    const rows = tbody.querySelectorAll('tr.att-row');
    if (rows.length > 0) {
        const hasFocused = tbody.querySelector('tr.att-row.att-row-focused');
        if (!hasFocused) rows[0].classList.add('att-row-focused');
    }

    updateModalStatsBar();
    try { lucide.createIcons(); } catch(e){}
};

// Toggles present/absent status for an individual student
window.toggleStudentAttendance = function(enroll, isPresent) {
    const idx = currentAttSession.findIndex(s => s.enroll === enroll);
    if (idx === -1) return;
    currentAttSession[idx].present = isPresent;

    const row = document.getElementById('att-row-' + enroll);
    if (row) {
        row.classList.toggle('att-present', isPresent);
        const cb = row.querySelector('.att-chk-real');
        const visual = row.querySelector('.att-chk-visual');
        const label  = row.querySelector('.att-chk-label');
        if (cb)     cb.checked = isPresent;
        if (visual) visual.classList.toggle('checked', isPresent);
        if (label)  label.textContent = isPresent ? 'Present' : 'Absent';
    }
    updateModalStatsBar();
};

// Updates attendance summary stats and percentage bar in modal
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

    let currentIdx = rows.findIndex(r => r.classList.contains('att-row-focused') || r.contains(document.activeElement));

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
    }
};

/** When user presses Enter, Space or Arrow keys in search input */
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
    if (e.key === ' ' && (!e.target.value || !e.target.value.trim())) {
        e.preventDefault();
        const rows = Array.from(document.querySelectorAll('#attStudentList tr.att-row'));
        let focusedIdx = rows.findIndex(r => r.classList.contains('att-row-focused') || r.contains(document.activeElement));
        if (focusedIdx === -1) focusedIdx = 0;
        const focusedRow = rows[focusedIdx];
        if (focusedRow) {
            const enroll = focusedRow.getAttribute('data-enroll');
            const st = currentAttSession.find(s => s.enroll === enroll);
            if (st) toggleStudentAttendance(enroll, !st.present);
        }
        return;
    }
    if (e.key === 'Enter') {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
            saveAttendance();
            return;
        }

        const input = document.getElementById('attSearchInput');
        const val = input ? input.value.trim().toLowerCase() : '';

        // CASE 1: Teacher typed enrollment / name / roll number
        if (val) {
            const isNum = /^\d+$/.test(val);
            const match = currentAttSession.find(s => {
                const enroll = String(s.enroll || '').toLowerCase();
                if (isNum) {
                    // Match student whose enrollment number ends with the typed number (e.g. 64)
                    return enroll === val || enroll.endsWith(val);
                }
                return enroll.includes(val) || s.name.toLowerCase().includes(val);
            });

            if (match) {
                // Mark present
                toggleStudentAttendance(match.enroll, true);

                // Clear search for immediate next input
                if (input) input.value = '';
                renderAttendanceStudentList('');

                // Highlight marked row briefly, then advance focus to next student
                const matchIdx = currentAttSession.findIndex(s => s.enroll === match.enroll);
                const nextEnroll = (matchIdx !== -1 && matchIdx + 1 < currentAttSession.length)
                    ? currentAttSession[matchIdx + 1].enroll
                    : match.enroll;

                const row = document.getElementById('att-row-' + match.enroll);
                if (row) {
                    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    row.classList.add('att-row-flash');
                    setTimeout(() => row.classList.remove('att-row-flash'), 500);
                }

                // Focus next row
                const rows = Array.from(document.querySelectorAll('#attStudentList tr.att-row'));
                rows.forEach(r => r.classList.remove('att-row-focused'));
                const nextRow = document.getElementById('att-row-' + nextEnroll);
                if (nextRow) {
                    nextRow.classList.add('att-row-focused');
                    nextRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }

                if (input) input.focus();
                return;
            }
        }

        // CASE 2: Input is empty -> Mark currently focused student as PRESENT and advance!
        const rows = Array.from(document.querySelectorAll('#attStudentList tr.att-row'));
        if (rows.length === 0) return;

        let focusedIdx = rows.findIndex(r => r.classList.contains('att-row-focused') || r.contains(document.activeElement));
        if (focusedIdx === -1) focusedIdx = 0;

        const focusedRow = rows[focusedIdx];
        if (focusedRow) {
            const enroll = focusedRow.getAttribute('data-enroll');
            if (enroll) {
                // Mark present!
                toggleStudentAttendance(enroll, true);

                focusedRow.classList.add('att-row-flash');
                setTimeout(() => focusedRow.classList.remove('att-row-flash'), 500);

                // Auto advance to next student in list!
                const nextIdx = Math.min(focusedIdx + 1, rows.length - 1);
                rows.forEach(r => r.classList.remove('att-row-focused'));
                const nextRow = rows[nextIdx];
                if (nextRow) {
                    nextRow.classList.add('att-row-focused');
                    nextRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }

                if (input) input.focus();
            }
        }
    }
};

/** Search & jump */
window.handleAttSearch = function(val) {
    renderAttendanceStudentList(val);
    if (!val.trim()) return;

    const q = val.toLowerCase().trim();
    const isNum = /^\d+$/.test(q);
    const match = currentAttSession.find(s => {
        const enroll = String(s.enroll || '').toLowerCase();
        if (isNum) {
            return enroll === q || enroll.endsWith(q);
        }
        return enroll.includes(q) || s.name.toLowerCase().includes(q);
    });
    if (match) {
        const rows = document.querySelectorAll('#attStudentList tr.att-row');
        rows.forEach(r => r.classList.remove('att-row-focused'));
        const row = document.getElementById('att-row-' + match.enroll);
        if (row) {
            row.classList.add('att-row-focused');
            row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
};

/** Keyboard navigation (Arrow keys, Enter, digit jumping) inside modal */
window.handleAttModalKeydown = function(e) {
    if (e.target && e.target.id === 'attSearchInput') return;
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        saveAttendance();
        return;
    }
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

    if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        const rows = Array.from(document.querySelectorAll('#attStudentList tr.att-row'));
        let focusedIdx = rows.findIndex(r => r.classList.contains('att-row-focused') || r.contains(document.activeElement));
        if (focusedIdx === -1) focusedIdx = 0;
        const focusedRow = rows[focusedIdx];
        if (focusedRow) {
            const enroll = focusedRow.getAttribute('data-enroll');
            const st = currentAttSession.find(s => s.enroll === enroll);
            if (st) toggleStudentAttendance(enroll, !st.present);
        }
        return;
    }

    if (e.key === 'Enter') {
        e.preventDefault();
        const rows = Array.from(document.querySelectorAll('#attStudentList tr.att-row'));
        if (rows.length === 0) return;

        let focusedIdx = rows.findIndex(r => r.classList.contains('att-row-focused') || r.contains(document.activeElement));
        if (focusedIdx === -1) focusedIdx = 0;

        const focusedRow = rows[focusedIdx];
        if (focusedRow) {
            const enroll = focusedRow.getAttribute('data-enroll');
            if (enroll) {
                toggleStudentAttendance(enroll, true);
                focusedRow.classList.add('att-row-flash');
                setTimeout(() => focusedRow.classList.remove('att-row-flash'), 500);

                const nextIdx = Math.min(focusedIdx + 1, rows.length - 1);
                rows.forEach(r => r.classList.remove('att-row-focused'));
                const nextRow = rows[nextIdx];
                if (nextRow) {
                    nextRow.classList.add('att-row-focused');
                    nextRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
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
            const rows = document.querySelectorAll('#attStudentList tr.att-row');
            rows.forEach(r => r.classList.remove('att-row-focused'));
            const row = document.getElementById('att-row-' + match.enroll);
            if (row) {
                row.classList.add('att-row-focused');
                row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

/* =============================================
   SAVE & SYNC — Local storage persistence and background Supabase sync
   ============================================= */

// Saves attendance session locally and triggers background sync to Supabase
window.saveAttendance = function() {
    if (!currentAttSlot) return;

    const today = todayDateStr();
    const log = getAttendanceLog();
    const total = currentAttSession.length;
    const present = currentAttSession.filter(s => s.present).length;
    const absent = total - present;
    const pct = total ? Math.round((present / total) * 100) : 0;

    const slotIdStr = String(currentAttSlot.id);
    const slotIds = (currentAttSlot.slotIds || [currentAttSlot.id]).map(String);

    const existingIdx = log.findIndex(l => {
        const lId = String(l.slotId);
        const idMatches = lId === slotIdStr || slotIds.includes(lId) ||
            (currentAttSlot.classId && String(l.classId).toLowerCase() === String(currentAttSlot.classId).toLowerCase() && l.time === currentAttSlot.time && Number(l.day) === Number(currentAttSlot.day));
        return idMatches && l.date === today;
    });

    const sessionEntry = {
        id: existingIdx !== -1 ? log[existingIdx].id : Date.now(),
        slotId: currentAttSlot.id,
        slotIds: currentAttSlot.slotIds || [currentAttSlot.id],
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

    // Update each student's stored attendance in class roster based on real recorded sessions
    const updatedLog = getAttendanceLog();
    const classRoster = getStudentsForClass(currentAttSlot.classId);
    classRoster.forEach(student => {
        const stats = (typeof TrevaAttendance !== 'undefined')
            ? TrevaAttendance.calculateStudentAttendance(student.enroll, updatedLog)
            : { pct: student.att };
        student.att = stats.pct;
    });
    saveStudentsForClass(currentAttSlot.classId, classRoster);
    if (_studentCache[currentAttSlot.classId]) {
        _studentCache[currentAttSlot.classId] = classRoster;
    }

    // Also background sync to Supabase public.attendance table if available
    try {
        if (typeof TrevaAttendance !== 'undefined') {
            TrevaAttendance.syncSessionToSupabase(currentAttSlot.id, currentAttSession, today, _session.teacherid);
        }
    } catch(e) {}

    const targetClass = currentAttSlot.classId;
    closeAttendanceModal();
    renderTeacherTimetable(currentSelectedDay);
    updateTeacherAttendanceStats();

    showToast(`✓ Attendance saved: ${present}/${total} Present (${pct}%) for Class ${targetClass}`);
};

/** Update Ring and Stats based on real attendance records */
function updateTeacherAttendanceStats() {
    const log = getAttendanceLog();
    if (!log || log.length === 0) {
        setAttendanceRing(null);
        return;
    }

    let totalRecorded = 0;
    let presentRecorded = 0;
    log.forEach(item => {
        if (item.stats) {
            totalRecorded += (item.stats.total || 0);
            presentRecorded += (item.stats.present || 0);
        }
    });

    const avg = totalRecorded ? Math.round((presentRecorded / totalRecorded) * 100) : null;
    setAttendanceRing(avg);
}

/* =============================================
   UI METRICS & FEEDBACK — Circular attendance ring and toast notifications
   ============================================= */

// Updates circular SVG ring with calculated attendance percentage
window.setAttendanceRing = function(percent) {
    const ring = document.querySelector('.ring-progress');
    const val = document.querySelector('.ring-val');
    if (ring) {
        const circumference = 276.46;
        if (percent === null || percent === undefined) {
            ring.style.strokeDashoffset = circumference;
        } else {
            const offset = circumference * (1 - percent / 100);
            ring.style.strokeDashoffset = offset;
        }
    }
    if (val) val.textContent = (percent === null || percent === undefined) ? '—' : Math.round(percent) + '%';
};

// Displays temporary floating notification toast
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