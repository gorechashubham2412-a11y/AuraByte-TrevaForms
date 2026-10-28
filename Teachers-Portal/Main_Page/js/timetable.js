/**
 * ============================================================================
 * TREVA ECOSYSTEM - TEACHER'S TIMETABLE LOGIC
 * Real-time Supabase timetable slots, faculty scheduling, and lecture attendance
 * ============================================================================
 */

let TEACHER_NAME = 'Sachin Shah';
let TEACHER_DEPT = 'Computer Engineering';
let TEACHER_ID   = null;

let _allTeacherSlots = [];
let _masterTimetableCache = [];
let _activeDayFilter = 'all'; // 'all', 0 (Mon) .. 5 (Sat), or 'today'
let _classFilter = 'all';
let _typeFilter = 'all';
let _searchQuery = '';

let _cachedStudents = [];
let currentAttSlot = null;
let currentAttSession = [];

// Day constants
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_MAP = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 }; // Supabase 1=Mon .. 6=Sat
const COLOR_PALETTE = {
    'CN': '#0E7490',
    'DS': '#15803D',
    'DEF': '#B45309',
    'FOS': '#7C3AED',
    'RDBMS': '#2563EB',
    'RWPD': '#BE123C'
};

/* =============================================
   INITIALIZATION — Page setup and session authorization
   ============================================= */

// Initializes timetable view, loads session, and triggers data fetches
window.initTimetablePage = async function() {
    try { lucide.createIcons(); } catch(e){}

    // Load teacher identity from session
    if (typeof TrevaSession !== 'undefined' && TrevaSession.load) {
        const sess = TrevaSession.load();
        if (sess && sess.fullname) {
            TEACHER_NAME = sess.fullname;
            TEACHER_DEPT = sess.department || 'Computer Engineering';
            TEACHER_ID   = sess.teacherid || null;
        }
    }

    // Populate header info
    const subTitleEl = document.getElementById('ttPageSub');
    if (subTitleEl) {
        subTitleEl.textContent = `Prof. ${TEACHER_NAME} · ${TEACHER_DEPT} · Academic Year 2026-27`;
    }

    // Set today's tab indicator
    highlightTodayTab();

    // Setup profile dropdown
    setupProfileDropdown();

    // Fetch master timetable & real students from Supabase
    await Promise.all([
        loadTeacherTimetableFromDatabase(),
        loadStudentsFromDatabase()
    ]);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (document.getElementById('ttScheduleSection')) window.initTimetablePage();
    });
} else {
    if (document.getElementById('ttScheduleSection')) window.initTimetablePage();
}

// Adds active styling to current day of the week tab
function highlightTodayTab() {
    const jsDay = new Date().getDay();
    const todayMappedDay = Math.min(jsDay === 0 ? 0 : jsDay - 1, 5);
    const dayTab = document.querySelector(`.tt-day-tab[data-day="${todayMappedDay}"]`);
    if (dayTab) {
        dayTab.classList.add('is-today-tab');
        const countSpan = dayTab.querySelector('.tt-tab-count');
        if (countSpan) countSpan.title = "Today";
    }
}

// Manages teacher profile dropdown open/close behavior
function setupProfileDropdown() {
    const profBtn = document.getElementById('profBtn');
    const profDD = document.getElementById('profDD');
    if (profBtn && profDD) {
        profBtn.addEventListener('click', e => {
            e.stopPropagation();
            profDD.classList.toggle('open');
        });
        document.addEventListener('click', e => {
            if (!profBtn.contains(e.target) && !profDD.contains(e.target)) {
                profDD.classList.remove('open');
            }
        });
    }

    // Initials
    const initials = TEACHER_NAME.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
    if (profBtn) profBtn.textContent = initials;
}

/* =============================================
   DATA LOADING — Fetch timetable slots and students from Supabase
   ============================================= */

// Matches teacher name against slot faculty identifier
function teacherMatches(facName, targetName) {
    if (!facName || !targetName) return false;
    const a = facName.toLowerCase().replace(/^prof\.?\s+/i, '').trim();
    const b = targetName.toLowerCase().replace(/^prof\.?\s+/i, '').trim();
    return a === b || a.includes(b) || b.includes(a);
}

// Formats start and end time strings into 12-hour AM/PM ranges
function formatTimeSlotRange(startStr, endStr) {
    if (!startStr) return '';
    function to12h(t) {
        if (!t) return '';
        const parts = String(t).split(':');
        let h = parseInt(parts[0], 10);
        const m = parts[1] || '00';
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;
        return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
    }
    return `${to12h(startStr)} – ${to12h(endStr)}`;
}

// Fetches assigned timetable slots from Supabase for logged-in faculty
async function loadTeacherTimetableFromDatabase() {
    const container = document.getElementById('ttScheduleSection');
    if (container) {
        container.innerHTML = `<div style="padding:48px 20px; text-align:center;">${getTrevaLoadingHtml('Loading Faculty Timetable...', 'Aggregating assigned lecture slots from database')}</div>`;
    }

    try {
        if (typeof sbSelect !== 'function') throw new Error('sbSelect is unavailable');

        const [rawSlots, batches, tutorials] = await Promise.all([
            sbSelect('timetable_slot', {
                select: 'slotid,room,slot_type,day_of_week,start_time,end_time,batchid,tutorialid,subject(subjectname,subjectcode),teacher(fullname),class(classid,classname)',
                order: 'day_of_week.asc,start_time.asc'
            }),
            sbSelect('batch', { select: 'classid,batchid,batchname' }),
            sbSelect('tutorial', { select: 'classid,tutorialid,tutorialname' })
        ]);

        const batchMap = {};
        (batches || []).forEach(b => { batchMap[b.batchid] = b.batchname; });
        const tutMap = {};
        (tutorials || []).forEach(t => { tutMap[t.tutorialid] = t.tutorialname; });

        const sessionMap = new Map();
        for (const slot of (rawSlots || [])) {
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
                    day: DAY_MAP[slot.day_of_week] ?? null,
                    dayOfWeek: slot.day_of_week,
                    dayName: DAY_NAMES[DAY_MAP[slot.day_of_week]] || '',
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
                    color: COLOR_PALETTE[subCode] || '#15803D',
                    slotIds: [slot.slotid]
                });
            } else {
                sessionMap.get(key).slotIds.push(slot.slotid);
            }
        }

        _masterTimetableCache = Array.from(sessionMap.values());
        _allTeacherSlots = _masterTimetableCache.filter(s => teacherMatches(s.fac, TEACHER_NAME));

        console.info(`[Treva] Loaded ${_allTeacherSlots.length} slots for teacher ${TEACHER_NAME}`);
        renderKPIs();
        populateClassFilterOptions();
        renderSchedule();
    } catch (err) {
        console.error('[Treva] Failed to load timetable from database:', err);
        if (container) {
            container.innerHTML = `
                <div class="tt-empty-state">
                    <div class="tt-empty-icon" style="color:var(--danger,#DC2626)"><i data-lucide="alert-circle"></i></div>
                    <h3>Could not load timetable</h3>
                    <p>${err.message || 'Please check your database connection or login session.'}</p>
                </div>`;
            try { lucide.createIcons(); } catch(e){}
        }
    }
}

// Fetches and caches enrolled student directory from Supabase
async function loadStudentsFromDatabase() {
    try {
        if (typeof sbSelect === 'function') {
            const students = await sbSelect('student', {
                select: 'studentid,enrollmentno,fullname,class(classname),batch(batchname),tutorial(tutorialname)',
                order: 'enrollmentno.asc'
            });
            if (students && students.length > 0) {
                _cachedStudents = students.map(s => ({
                    id: s.studentid,
                    enroll: String(s.enrollmentno || ''),
                    name: s.fullname || '',
                    classId: s.class ? s.class.classname : '',
                    batch: s.batch ? s.batch.batchname : '',
                    tut: s.tutorial ? s.tutorial.tutorialname : ''
                }));
            }
        }
    } catch (e) {
        console.warn('[Treva] Student cache fallback:', e);
    }
}

/* =============================================
   KPI STATS — Calculate weekly sessions and attendance metrics
   ============================================= */

// Calculates and renders KPI summary metrics and tab counters
function renderKPIs() {
    const totalWeekly = _allTeacherSlots.length;
    const jsDay = new Date().getDay();
    const todayMappedDay = Math.min(jsDay === 0 ? 0 : jsDay - 1, 5);
    const todaySlots = _allTeacherSlots.filter(s => s.day === todayMappedDay);

    const classesSet = new Set(_allTeacherSlots.map(s => s.classId).filter(Boolean));
    const assignedClasses = Array.from(classesSet).join(' & ') || '—';

    // Calculate attendance percentage for completed sessions
    const log = getAttendanceLog();
    const todayStr = todayDateStr();
    let completedCount = 0;
    _allTeacherSlots.forEach(slot => {
        const sess = findAttendanceSession(log, slot, todayStr);
        if (sess && sess.stats) completedCount++;
    });

    const elTotal = document.getElementById('kpiTotalWeekly');
    if (elTotal) elTotal.textContent = `${totalWeekly} Sessions`;

    const elToday = document.getElementById('kpiTodayLectures');
    if (elToday) elToday.textContent = `${todaySlots.length} Classes`;

    const elClasses = document.getElementById('kpiAssignedClasses');
    if (elClasses) elClasses.textContent = assignedClasses;

    const elAtt = document.getElementById('kpiAttendanceRate');
    if (elAtt) {
        const pct = totalWeekly > 0 ? Math.round((completedCount / totalWeekly) * 100) : 0;
        elAtt.textContent = `${completedCount} / ${totalWeekly}`;
    }

    // Update Day Tab counts
    DAY_NAMES.forEach((name, idx) => {
        const count = _allTeacherSlots.filter(s => s.day === idx).length;
        const countEl = document.getElementById(`dayCount_${idx}`);
        if (countEl) countEl.textContent = count;
    });
    const allCountEl = document.getElementById('dayCount_all');
    if (allCountEl) allCountEl.textContent = totalWeekly;
}

// Populates the class filter dropdown with distinct assigned classes
function populateClassFilterOptions() {
    const select = document.getElementById('filterClass');
    if (!select) return;
    const classes = Array.from(new Set(_allTeacherSlots.map(s => s.classId).filter(Boolean))).sort();
    
    // Keep first option "All Classes"
    select.innerHTML = '<option value="all">All Classes</option>';
    classes.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = `Class ${c}`;
        select.appendChild(opt);
    });
}

/* =============================================
   FILTERS & DAY TABS — Filter schedule by day, class, and lecture type
   ============================================= */

// Switches active weekday filter tab and re-renders schedule
window.switchDayFilter = function(dayVal) {
    _activeDayFilter = dayVal;
    document.querySelectorAll('.tt-day-tab').forEach(tab => {
        const tabDay = tab.getAttribute('data-day');
        tab.classList.toggle('active', String(tabDay) === String(dayVal));
    });
    renderSchedule();
};

// Applies class dropdown, type dropdown, and search query filters
window.applyFilters = function() {
    const classSel = document.getElementById('filterClass');
    const typeSel  = document.getElementById('filterType');
    const searchInp= document.getElementById('filterSearch');

    if (classSel) _classFilter = classSel.value;
    if (typeSel)  _typeFilter  = typeSel.value;
    if (searchInp)_searchQuery = searchInp.value.toLowerCase().trim();

    renderSchedule();
};

// Resets all filter dropdowns and text inputs to defaults
window.resetFilters = function() {
    _classFilter = 'all';
    _typeFilter = 'all';
    _searchQuery = '';
    const classSel = document.getElementById('filterClass');
    const typeSel  = document.getElementById('filterType');
    const searchInp= document.getElementById('filterSearch');
    if (classSel) classSel.value = 'all';
    if (typeSel)  typeSel.value = 'all';
    if (searchInp)searchInp.value = '';

    renderSchedule();
};

/* =============================================
   SCHEDULE RENDERING — Timetable cards and daily session groupings
   ============================================= */

// Filters and renders scheduled lecture cards grouped by weekday
function renderSchedule() {
    const container = document.getElementById('ttScheduleSection');
    if (!container) return;

    // Filter slots
    let slots = [..._allTeacherSlots];

    // Day filter
    if (_activeDayFilter !== 'all') {
        let targetDay;
        if (_activeDayFilter === 'today') {
            const jsDay = new Date().getDay();
            targetDay = Math.min(jsDay === 0 ? 0 : jsDay - 1, 5);
        } else {
            targetDay = parseInt(_activeDayFilter);
        }
        slots = slots.filter(s => s.day === targetDay);
    }

    // Class filter
    if (_classFilter !== 'all') {
        slots = slots.filter(s => String(s.classId).toLowerCase() === _classFilter.toLowerCase());
    }

    // Type filter
    if (_typeFilter !== 'all') {
        slots = slots.filter(s => String(s.type).toLowerCase() === _typeFilter.toLowerCase());
    }

    // Search query
    if (_searchQuery) {
        slots = slots.filter(s => {
            const str = `${s.sub} ${s.code} ${s.loc} ${s.classId} ${s.group}`.toLowerCase();
            return str.includes(_searchQuery);
        });
    }

    if (slots.length === 0) {
        container.innerHTML = `
            <div class="tt-empty-state">
                <div class="tt-empty-icon"><i data-lucide="calendar-x"></i></div>
                <h3>No lectures found</h3>
                <p>No timetable slots match the selected filters for Prof. ${TEACHER_NAME}.</p>
                <button class="tt-reset-btn" style="margin:16px auto 0 auto;" onclick="resetFilters()">
                    <i data-lucide="rotate-ccw"></i> Reset Filters
                </button>
            </div>`;
        try { lucide.createIcons(); } catch(e){}
        return;
    }

    // Group by day of week
    const dayGroups = {};
    slots.forEach(slot => {
        const d = slot.day;
        if (!dayGroups[d]) dayGroups[d] = [];
        dayGroups[d].push(slot);
    });

    const sortedDayKeys = Object.keys(dayGroups).map(Number).sort((a, b) => a - b);
    const log = getAttendanceLog();
    const todayStr = todayDateStr();

    let html = '';
    sortedDayKeys.forEach(dayIdx => {
        const daySlots = dayGroups[dayIdx].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        const dayName = DAY_NAMES[dayIdx] || 'Day';

        html += `
            <div class="tt-day-group">
                <div class="tt-day-group-header">
                    <div class="tt-day-group-title">
                        <i data-lucide="calendar"></i>
                        <span>${dayName}</span>
                    </div>
                    <span class="tt-day-group-badge">${daySlots.length} ${daySlots.length === 1 ? 'Session' : 'Sessions'}</span>
                </div>
                <div class="tt-slots-grid">
                    ${daySlots.map(slot => renderSlotCard(slot, log, todayStr)).join('')}
                </div>
            </div>`;
    });

    container.innerHTML = html;
    try { lucide.createIcons(); } catch(e){}
}

// Generates HTML card markup for an individual timetable slot
function renderSlotCard(slot, log, todayStr) {
    const typeClass = `type-${(slot.type || 'lecture').toLowerCase()}`;
    const session = findAttendanceSession(log, slot, todayStr);

    let attHtml = '';
    if (session && session.stats) {
        const pct = session.stats.pct ?? 0;
        attHtml = `
            <div class="tt-att-status-pill taken">
                <i data-lucide="check-circle-2"></i> ${session.stats.present}/${session.stats.total} (${pct}%)
            </div>
            <button class="tt-slot-btn edit" onclick="event.stopPropagation(); openTeacherAttendanceModal(${slot.id})">
                <i data-lucide="edit-2"></i> Edit
            </button>`;
    } else {
        attHtml = `
            <div class="tt-att-status-pill pending">
                <i data-lucide="clock"></i> Pending
            </div>
            <button class="tt-slot-btn take" onclick="event.stopPropagation(); openTeacherAttendanceModal(${slot.id})">
                <i data-lucide="clipboard-check"></i> Take Attendance
            </button>`;
    }

    return `
        <div class="tt-slot-card" style="--slot-color:${slot.color}" onclick="openTeacherAttendanceModal(${slot.id})">
            <div class="tt-slot-top">
                <div class="tt-slot-time">
                    <i data-lucide="clock"></i>
                    <span>${slot.time}</span>
                </div>
                <span class="tt-slot-type-badge ${typeClass}">${slot.type || 'Lecture'}</span>
            </div>

            <div>
                <div class="tt-slot-subject">${slot.sub}</div>
                <div class="tt-slot-subcode">${slot.code}</div>
            </div>

            <div class="tt-slot-meta-row">
                <span class="tt-slot-meta-pill"><i data-lucide="users"></i> Class ${slot.classId}</span>
                <span class="tt-slot-meta-pill"><i data-lucide="layers"></i> ${slot.group}</span>
                <span class="tt-slot-meta-pill"><i data-lucide="map-pin"></i> ${slot.loc}</span>
            </div>

            <div class="tt-slot-footer">
                ${attHtml}
            </div>
        </div>`;
}

/* =============================================
   ATTENDANCE MODAL — Live roll call, grid roster, and attendance submission
   ============================================= */

// Reads attendance log history from localStorage
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
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function findAttendanceSession(log, slot, date = null) {
    if (!log || !log.length || !slot) return null;
    const sId = String(slot.id);
    const sIds = (slot.slotIds || [slot.id]).map(String);

    let match = log.find(l => {
        const lId = String(l.slotId);
        const idMatches = lId === sId || sIds.includes(lId) || (l.slotIds && l.slotIds.map(String).some(x => sIds.includes(x)));
        return idMatches && (!date || l.date === date);
    });
    if (match) return match;

    match = log.find(l => {
        const classMatches = String(l.classId).toLowerCase() === String(slot.classId).toLowerCase();
        const timeMatches  = l.time === slot.time;
        const dayMatches   = Number(l.day) === Number(slot.day);
        const subMatches   = !l.code || !slot.code || String(l.code).toLowerCase() === String(slot.code).toLowerCase();
        return classMatches && timeMatches && dayMatches && subMatches && (!date || l.date === date);
    });
    if (match) return match;

    if (date) {
        return findAttendanceSession(log, slot, null);
    }
    return null;
}

// Opens attendance recording modal for the selected slot
window.openTeacherAttendanceModal = function(slotId) {
    const slot = _allTeacherSlots.find(s => String(s.id) === String(slotId) || (s.slotIds && s.slotIds.map(String).includes(String(slotId))));
    if (!slot) return;
    currentAttSlot = slot;

    const today = todayDateStr();
    const log = getAttendanceLog();
    const existingSession = findAttendanceSession(log, slot, today);

    // Filter students for this class
    let classStudents = _cachedStudents.filter(s => String(s.classId).toLowerCase() === String(slot.classId).toLowerCase());
    if (classStudents.length === 0) {
        classStudents = _cachedStudents.filter(s => String(s.classId).toLowerCase() === 'co31');
    }

    const recordMap = new Map();
    if (existingSession && existingSession.records && existingSession.records.length > 0) {
        existingSession.records.forEach(r => recordMap.set(String(r.enroll), Boolean(r.present)));
    }

    currentAttSession = classStudents.map((s, idx) => {
        const enrollStr = String(s.enroll);
        const wasPresent = recordMap.has(enrollStr) ? recordMap.get(enrollStr) : false;
        
        let rollSuffix = enrollStr.slice(-3).replace(/^0+/, '');
        if (!rollSuffix) rollSuffix = String(idx + 1);

        return {
            id:     s.id,
            enroll: enrollStr,
            name:   s.name,
            batch:  s.batch,
            rollNo: rollSuffix,
            sNo:    idx + 1,
            present: existingSession ? wasPresent : true
        };
    });

    attViewMode = 'grid';
    attStatusFilter = 'all';
    attCallerIndex = 0;

    // Populate header info
    const titleEl = document.getElementById('attSlotTitle');
    const metaEl  = document.getElementById('attSlotMeta');
    const dateEl  = document.getElementById('attDateDisplay');

    if (titleEl) titleEl.textContent = `${slot.sub} (${slot.code})`;
    if (metaEl)  metaEl.innerHTML = `<span class="class-pill ${(slot.classId||'').toLowerCase()}">Class ${slot.classId}</span> &nbsp;•&nbsp; <strong>${slot.loc}</strong> &nbsp;•&nbsp; ${slot.time}`;
    if (dateEl)  dateEl.textContent = today;

    const searchInput = document.getElementById('attSearchInput');
    if (searchInput) searchInput.value = '';
    const quickAbsentInput = document.getElementById('attQuickAbsentInput');
    if (quickAbsentInput) quickAbsentInput.value = '';

    setAttendanceViewMode('grid');
    document.getElementById('attendanceModal').classList.add('open');

    setTimeout(() => {
        const inp = document.getElementById('attQuickAbsentInput') || document.getElementById('attSearchInput');
        if (inp) inp.focus();
    }, 150);

    try { lucide.createIcons(); } catch(e){}
};

// Closes attendance recording modal and resets active session
window.closeAttendanceModal = function() {
    document.getElementById('attendanceModal').classList.remove('open');
    currentAttSlot = null;
    currentAttSession = [];
};

let attViewMode = 'grid'; // 'grid' | 'list' | 'caller'
let attStatusFilter = 'all'; // 'all' | 'present' | 'absent'
let attCallerIndex = 0;

// Switches between grid, list, and caller view modes
window.setAttendanceViewMode = function(mode) {
    attViewMode = mode;
    ['grid', 'list', 'caller'].forEach(m => {
        const btn = document.getElementById(`attSeg${m.charAt(0).toUpperCase() + m.slice(1)}`);
        if (btn) btn.classList.toggle('active', m === mode);
    });

    const gridView   = document.getElementById('attGridView');
    const listView   = document.getElementById('attTableView');
    const callerView = document.getElementById('attCallerView');

    if (gridView)   gridView.style.display   = (mode === 'grid') ? 'block' : 'none';
    if (listView)   listView.style.display   = (mode === 'list') ? 'block' : 'none';
    if (callerView) callerView.style.display = (mode === 'caller') ? 'flex' : 'none';

    if (mode === 'caller') {
        renderRollCallerCurrent();
    } else {
        renderCurrentAttendanceRoster();
    }
};

window.setAttendanceStatusFilter = function(filter) {
    attStatusFilter = filter;
    ['all', 'present', 'absent'].forEach(f => {
        const btn = document.getElementById(`attFilter${f.charAt(0).toUpperCase() + f.slice(1)}`);
        if (btn) btn.classList.toggle('active', f === filter);
    });
    renderCurrentAttendanceRoster();
};

// Renders current student roster in grid or table layout
function renderCurrentAttendanceRoster() {
    const q = (document.getElementById('attSearchInput')?.value || '').toLowerCase().trim();

    const visible = currentAttSession.filter(s => {
        if (attStatusFilter === 'present' && !s.present) return false;
        if (attStatusFilter === 'absent' && s.present) return false;

        if (!q) return true;
        return (
            s.enroll.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q) ||
            String(s.rollNo).toLowerCase() === q ||
            String(s.sNo) === q ||
            (s.batch && s.batch.toLowerCase().includes(q))
        );
    });

    // 1. Grid matrix
    const matrixEl = document.getElementById('attCardsMatrix');
    if (matrixEl) {
        if (visible.length === 0) {
            matrixEl.innerHTML = `
                <div style="grid-column: 1 / -1; text-align:center; padding:48px 20px; color:var(--text-muted);">
                    <i data-lucide="users" style="width:32px; height:32px; margin-bottom:8px; opacity:0.5;"></i>
                    <p style="margin:0; font-weight:600;">No students match the current filter "${q || attStatusFilter}".</p>
                </div>`;
        } else {
            matrixEl.innerHTML = visible.map(s => {
                const isPresent = Boolean(s.present);
                return `
                    <div class="att-student-tile ${isPresent ? 'is-present' : 'is-absent'}"
                         data-enroll="${s.enroll}"
                         data-roll="${s.rollNo}"
                         onclick="toggleStudentAttendance('${s.enroll}')"
                         title="${s.name} (${s.enroll}) · Click to toggle">
                        <div class="att-tile-top">
                            <span class="att-tile-roll">#${s.rollNo}</span>
                            <span class="att-tile-batch">${s.batch || 'All'}</span>
                        </div>
                        <div class="att-tile-name">${s.name}</div>
                        <div class="att-tile-enroll">${s.enroll}</div>
                        <div class="att-tile-status">
                            <span class="att-status-pill ${isPresent ? 'p' : 'a'}">
                                <i data-lucide="${isPresent ? 'check' : 'x'}"></i>
                                <span>${isPresent ? 'Present' : 'Absent'}</span>
                            </span>
                        </div>
                    </div>`;
            }).join('');
        }
    }

    // 2. Table list
    const tbody = document.getElementById('attStudentList');
    if (tbody) {
        if (visible.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:32px; color:var(--text-muted)">No students match filter.</td></tr>`;
        } else {
            tbody.innerHTML = visible.map(s => {
                const isPresent = Boolean(s.present);
                return `
                    <tr class="att-row ${isPresent ? 'present' : 'absent'}"
                        data-enroll="${s.enroll}"
                        onclick="toggleStudentAttendance('${s.enroll}')">
                        <td><strong>#${s.rollNo}</strong></td>
                        <td><code>${s.enroll}</code></td>
                        <td><strong>${s.name}</strong></td>
                        <td>${s.batch || '—'}</td>
                        <td style="text-align:center;">
                            <button type="button" class="att-status-pill ${isPresent ? 'p' : 'a'}" onclick="event.stopPropagation(); toggleStudentAttendance('${s.enroll}')">
                                <i data-lucide="${isPresent ? 'check' : 'x'}"></i>
                                <span>${isPresent ? 'Present' : 'Absent'}</span>
                            </button>
                        </td>
                    </tr>`;
            }).join('');
        }
    }

    updateAttStats();
    updateAbsentChipsTray();
    try { lucide.createIcons(); } catch(e){}
}

// Toggles attendance state for a student
window.toggleStudentAttendance = function(enroll) {
    const student = currentAttSession.find(s => s.enroll === String(enroll));
    if (!student) return;
    student.present = !student.present;

    const tile = document.querySelector(`.att-student-tile[data-enroll="${enroll}"]`);
    if (tile) {
        tile.classList.toggle('is-present', student.present);
        tile.classList.toggle('is-absent', !student.present);
        const pill = tile.querySelector('.att-status-pill');
        if (pill) {
            pill.className = `att-status-pill ${student.present ? 'p' : 'a'}`;
            pill.innerHTML = `<i data-lucide="${student.present ? 'check' : 'x'}"></i><span>${student.present ? 'Present' : 'Absent'}</span>`;
        }
        tile.style.transform = 'scale(0.96)';
        setTimeout(() => { tile.style.transform = ''; }, 120);
    }

    const row = document.querySelector(`.att-row[data-enroll="${enroll}"]`);
    if (row) {
        row.className = `att-row ${student.present ? 'present' : 'absent'}`;
        const pill = row.querySelector('.att-status-pill');
        if (pill) {
            pill.className = `att-status-pill ${student.present ? 'p' : 'a'}`;
            pill.innerHTML = `<i data-lucide="${student.present ? 'check' : 'x'}"></i><span>${student.present ? 'Present' : 'Absent'}</span>`;
        }
    }

    if (attViewMode === 'caller') {
        renderRollCallerCurrent();
    }

    if (attStatusFilter !== 'all') {
        renderCurrentAttendanceRoster();
    }

    updateAttStats();
    updateAbsentChipsTray();
    try { lucide.createIcons(); } catch(e){}
};

window.handleQuickAbsentKeydown = function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        applyQuickAbsentInput();
    }
};

// Parses quick absent input and marks matched students
window.applyQuickAbsentInput = function() {
    const inp = document.getElementById('attQuickAbsentInput');
    if (!inp) return;
    const raw = inp.value.trim();
    if (!raw) return;

    const tokens = raw.split(/[\s,;]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
    tokens.forEach(tok => {
        const cleanTok = tok.replace(/^#/, '');
        const match = currentAttSession.find(s => 
            String(s.rollNo).toLowerCase() === cleanTok ||
            String(s.sNo) === cleanTok ||
            s.enroll.toLowerCase() === cleanTok ||
            s.enroll.toLowerCase().endsWith(cleanTok)
        );
        if (match) {
            match.present = false;
        }
    });

    inp.value = '';
    renderCurrentAttendanceRoster();
};

function updateAbsentChipsTray() {
    const tray = document.getElementById('attAbsentTray');
    const chipsEl = document.getElementById('attAbsentChips');
    if (!tray || !chipsEl) return;

    const absentees = currentAttSession.filter(s => !s.present);
    if (absentees.length === 0) {
        tray.classList.add('empty');
        chipsEl.innerHTML = '';
        return;
    }

    tray.classList.remove('empty');
    chipsEl.innerHTML = absentees.map(s => `
        <span class="att-absent-chip" onclick="toggleStudentAttendance('${s.enroll}')" title="Click to mark present">
            <i data-lucide="x"></i>
            <strong>#${s.rollNo}</strong> ${s.name.split(' ')[0]}
        </span>
    `).join('');

    try { lucide.createIcons(); } catch(e){}
}

window.markAllPresent = function() {
    currentAttSession.forEach(s => s.present = true);
    renderCurrentAttendanceRoster();
};

window.markAllAbsent = function() {
    currentAttSession.forEach(s => s.present = false);
    renderCurrentAttendanceRoster();
};

window.invertAttendance = function() {
    currentAttSession.forEach(s => s.present = !s.present);
    renderCurrentAttendanceRoster();
};

function renderRollCallerCurrent() {
    const card = document.getElementById('attCallerCard');
    if (!card) return;

    if (currentAttSession.length === 0) {
        card.innerHTML = `<p style="color:var(--text-muted); font-weight:600;">No students in session.</p>`;
        return;
    }

    if (attCallerIndex < 0) attCallerIndex = 0;
    if (attCallerIndex >= currentAttSession.length) attCallerIndex = currentAttSession.length - 1;

    const s = currentAttSession[attCallerIndex];
    const total = currentAttSession.length;
    const isPresent = Boolean(s.present);
    const pct = Math.round(((attCallerIndex + 1) / total) * 100);

    card.innerHTML = `
        <div class="att-caller-progress">
            <div class="att-caller-progress-top">
                <span>Calling Student ${attCallerIndex + 1} of ${total}</span>
                <span>${pct}% Complete</span>
            </div>
            <div class="att-caller-bar-track">
                <div class="att-caller-bar-fill" style="width:${pct}%"></div>
            </div>
        </div>

        <div class="att-caller-roll-badge">#${s.rollNo}</div>
        <div>
            <h2 class="att-caller-name">${s.name}</h2>
            <div class="att-caller-meta">
                <span>Enrollment: <strong>${s.enroll}</strong></span>
                <span>•</span>
                <span>Batch: <strong>${s.batch || 'All'}</strong></span>
            </div>
        </div>

        <div>
            <span class="att-caller-current-badge ${isPresent ? 'p' : 'a'}">
                <i data-lucide="${isPresent ? 'check-circle-2' : 'x-circle'}"></i>
                Current Status: ${isPresent ? 'PRESENT' : 'ABSENT'}
            </span>
        </div>

        <div class="att-caller-actions">
            <button type="button" class="att-caller-btn absent" onclick="callerMarkAbsent()">
                <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="x"></i> Mark Absent
                </div>
                <kbd>Press 'A'</kbd>
            </button>
            <button type="button" class="att-caller-btn present" onclick="callerMarkPresent()">
                <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="check"></i> Mark Present
                </div>
                <kbd>Press 'P' or Space</kbd>
            </button>
        </div>

        <div class="att-caller-nav-row">
            <button type="button" class="att-caller-nav-btn" onclick="callerPrev()" ${attCallerIndex === 0 ? 'disabled style="opacity:0.4"' : ''}>
                <i data-lucide="chevron-left"></i> Previous Student
            </button>
            <span style="font-size:12px; color:var(--text-muted);">Use ← / → keys to navigate</span>
            <button type="button" class="att-caller-nav-btn" onclick="callerNext()" ${attCallerIndex === total - 1 ? 'disabled style="opacity:0.4"' : ''}>
                Next Student <i data-lucide="chevron-right"></i>
            </button>
        </div>
    `;

    try { lucide.createIcons(); } catch(e){}
}

window.callerMarkPresent = function() {
    if (attCallerIndex >= 0 && attCallerIndex < currentAttSession.length) {
        currentAttSession[attCallerIndex].present = true;
        updateAttStats();
        updateAbsentChipsTray();
        callerNext();
    }
};

window.callerMarkAbsent = function() {
    if (attCallerIndex >= 0 && attCallerIndex < currentAttSession.length) {
        currentAttSession[attCallerIndex].present = false;
        updateAttStats();
        updateAbsentChipsTray();
        callerNext();
    }
};

window.callerNext = function() {
    if (attCallerIndex < currentAttSession.length - 1) {
        attCallerIndex++;
    }
    renderRollCallerCurrent();
};

window.callerPrev = function() {
    if (attCallerIndex > 0) {
        attCallerIndex--;
    }
    renderRollCallerCurrent();
};

function updateAttStats() {
    const total = currentAttSession.length;
    const present = currentAttSession.filter(s => s.present).length;
    const absent = total - present;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;

    const cAll = document.getElementById('attCountAll');
    const cPre = document.getElementById('attCountPresent');
    const cAbs = document.getElementById('attCountAbsent');
    if (cAll) cAll.textContent = total;
    if (cPre) cPre.textContent = present;
    if (cAbs) cAbs.textContent = absent;

    const barEl = document.getElementById('attStatsBar');
    if (barEl) {
        barEl.innerHTML = `
            <span style="color:#059669; font-weight:700;"><i data-lucide="user-check"></i> ${present} Present</span>
            <span style="color:#DC2626; font-weight:700;"><i data-lucide="user-x"></i> ${absent} Absent</span>
            <span style="color:var(--text-muted); font-weight:600;">Total: ${total}</span>
            <span style="margin-left:auto; font-weight:800; color:var(--primary); font-size:15px;">${pct}% Rate</span>`;
        try { lucide.createIcons(); } catch(e){}
    }

    const pctBar = document.getElementById('attPctBar');
    if (pctBar) pctBar.style.width = `${pct}%`;

    const footSum = document.getElementById('attFootSummary');
    if (footSum) {
        footSum.innerHTML = `
            <span style="color:#059669;">${present} Present</span> &nbsp;•&nbsp;
            <span style="color:#dc2626;">${absent} Absent</span> &nbsp;•&nbsp;
            <span><strong>${pct}%</strong> Attendance Rate</span>`;
    }
}

// Persists recorded attendance session to storage and updates views
window.saveAttendance = function() {
    if (!currentAttSlot) return;
    const today = todayDateStr();
    const log = getAttendanceLog();

    const total = currentAttSession.length;
    const present = currentAttSession.filter(s => s.present).length;
    const absent = total - present;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;

    const absentees = currentAttSession.filter(s => !s.present);
    const absPrompt = absentees.length > 0 
        ? `${absentees.length} Absent (${absentees.map(a => '#' + a.rollNo).join(', ')})` 
        : 'All students present!';

    const confirmMsg = `Save attendance for ${currentAttSlot.classId} · ${currentAttSlot.sub}?\n\n• Present: ${present}\n• Absent: ${absent}\n• Absentees: ${absPrompt}\n\nProceed to save?`;
    if (!confirm(confirmMsg)) return;

    const record = {
        slotId: currentAttSlot.id,
        slotIds: currentAttSlot.slotIds || [currentAttSlot.id],
        classId: currentAttSlot.classId,
        day: currentAttSlot.day,
        time: currentAttSlot.time,
        code: currentAttSlot.code,
        sub: currentAttSlot.sub,
        date: today,
        timestamp: new Date().toISOString(),
        stats: { total, present, absent, pct },
        records: currentAttSession.map(s => ({
            id: s.id,
            enroll: s.enroll,
            name: s.name,
            rollNo: s.rollNo,
            present: s.present
        }))
    };

    const existingIdx = log.findIndex(l => {
        const idMatches = String(l.slotId) === String(currentAttSlot.id) || (l.slotIds && l.slotIds.map(String).includes(String(currentAttSlot.id)));
        return idMatches && l.date === today;
    });

    if (existingIdx >= 0) {
        log[existingIdx] = record;
    } else {
        log.push(record);
    }

    saveAttendanceLog(log);
    closeAttendanceModal();
    renderKPIs();
    renderSchedule();
};

window.handleAttSearch = function(val) {
    renderCurrentAttendanceRoster();
};

window.handleAttModalKeydown = function(e) {
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

    if (e.key === 'Escape') {
        closeAttendanceModal();
        return;
    }

    if (!isInput && attViewMode === 'caller') {
        if (e.key === 'p' || e.key === 'P' || e.key === ' ') {
            e.preventDefault();
            callerMarkPresent();
        } else if (e.key === 'a' || e.key === 'A') {
            e.preventDefault();
            callerMarkAbsent();
        } else if (e.key === 'ArrowRight') {
            callerNext();
        } else if (e.key === 'ArrowLeft') {
            callerPrev();
        }
    }
};

/* =============================================
   PRINT & EXPORT — Print schedule and export timetable data to CSV
   ============================================= */

// Triggers browser print dialog for the timetable
window.printTimetable = function() {
    window.print();
};

// Exports scheduled teacher timetable sessions to a CSV file
window.exportTimetableCSV = function() {
    if (_allTeacherSlots.length === 0) {
        alert('No timetable data available to export.');
        return;
    }

    const headers = ['Day', 'Time Slot', 'Subject Name', 'Subject Code', 'Slot Type', 'Class', 'Batch/Tut', 'Room/Lab', 'Faculty'];
    const rows = _allTeacherSlots.map(s => [
        `"${s.dayName}"`,
        `"${s.time}"`,
        `"${(s.sub || '').replace(/"/g, '""')}"`,
        `"${s.code || ''}"`,
        `"${s.type || ''}"`,
        `"${s.classId || ''}"`,
        `"${s.group || ''}"`,
        `"${s.loc || ''}"`,
        `"${s.fac || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    const safeName = TEACHER_NAME.replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('href', url);
    link.setAttribute('download', `Treva_Timetable_${safeName}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
