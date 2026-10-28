/**
 * ============================================================================
 * MY CLASS (CO31) - STUDENTS, TIMETABLE, EXAMS, DRIVE RESOURCES
 * MASTER DATA: ROOMS, TEACHERS, SUBJECTS (shared across all classes)
 * ============================================================================
 */

// Auth guard — redirect to sign-in if no session
if (typeof TrevaSession !== 'undefined') {
    TrevaSession.requireAuth('../temp_signinup/index1.html');
}

// Load current teacher session
const _session = (typeof TrevaSession !== 'undefined') ? (TrevaSession.load() || {}) : {};

let CLASS_ID   = 'co31';
let CLASS_NAME = 'CO31';
let currentCoordinatorClassId = 31;
let currentClassSem = 'Sem 3';
let isCurrentTeacherCoordinator = false;

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

/* =============================================
   CLASS BANNER UI — Header labels, subtitles & class badges
   ============================================= */

// Updates banner labels, subtitles, and modal placeholders for the coordinating class
function updateClassBannerUI(className, semText, teacherName, classInfo) {
    document.title = `Treva Ecosystem · My Class (${className})`;

    const bannerCode = document.getElementById('classBannerCode');
    const bannerSub  = document.getElementById('classBannerSub');
    if (bannerCode) bannerCode.textContent = className;
    if (bannerSub) bannerSub.textContent = semText;

    const bannerTitle = document.getElementById('classBannerTitle');
    const bannerDesc  = document.getElementById('classBannerDesc');
    if (bannerTitle) {
        bannerTitle.innerHTML = `Class ${className} <span class="role-pill">Coordinating Class</span>`;
    }
    if (bannerDesc) {
        const divNum = className.slice(-1) || '1';
        bannerDesc.textContent = `Computer Engineering · Division ${divNum} · Academic Term 2026-27 · Incharge: ${teacherName || 'Faculty'}`;
    }

    const studentRosterTitle = document.getElementById('studentRosterTitle');
    if (studentRosterTitle) {
        studentRosterTitle.textContent = `Student Roster · ${className}`;
    }
    const classTimetableTitle = document.getElementById('classTimetableTitle');
    if (classTimetableTitle) {
        classTimetableTitle.textContent = `Class ${className} Weekly Timetable`;
    }
    const headerSubtitle = document.getElementById('headerSubtitle');
    if (headerSubtitle) {
        headerSubtitle.textContent = `Manage Class ${className} records & timetable`;
    }
    const examsSubtitle = document.getElementById('examsSubtitle');
    if (examsSubtitle) {
        examsSubtitle.textContent = `Mid-terms, submissions & viva schedules for Class ${className}`;
    }

    // Modal button labels & placeholders
    const btnBatchLbl = document.getElementById('btnTypeBatchLabel');
    if (btnBatchLbl) btnBatchLbl.textContent = `Batch (e.g. ${className}1)`;
    const btnTutLbl = document.getElementById('btnTypeTutLabel');
    if (btnTutLbl) btnTutLbl.textContent = `Tutorial (e.g. ${className}T1)`;

    const targetInp = document.getElementById('targetGroupName');
    const helpName  = document.getElementById('helpTargetName');
    if (targetInp) {
        targetInp.placeholder = currentDivideType === 'batch' ? `e.g. ${className}1` : `e.g. ${className}T1`;
    }
    if (helpName) {
        helpName.textContent = currentDivideType === 'batch'
            ? `Type a new batch name (like ${className}1) or select an existing one.`
            : `Type a new tutorial name (like ${className}T1) or select an existing one.`;
    }
}

/* =============================================
   COORDINATOR ACCESS & VERIFICATION — Validates teacher coordinator permissions
   ============================================= */

// Validates whether the logged-in teacher is authorized as a Class Coordinator
async function checkCoordinatorAccess() {
    const notCoordPanel = document.getElementById('notCoordinatorPanel');
    const coordContent  = document.getElementById('coordinatorContent');
    const notCoordUser  = document.getElementById('notCoordUserName');

    const teacherName = _session.fullname || _session.username || '';
    if (notCoordUser) {
        notCoordUser.textContent = teacherName || 'Faculty Member';
    }

    let detectedClass = null;
    let allClasses = [];
    let allTeachers = [];

    // 1. Fetch all classes and teachers from Supabase
    try {
        if (typeof sbSelect === 'function') {
            const [cRows, tRows] = await Promise.all([
                sbSelect('class', { select: 'classid,classname,semid,coordinator' }),
                sbSelect('teacher', { select: 'teacherid,fullname' })
            ]);
            allClasses = cRows || [];
            allTeachers = tRows || [];
        }
    } catch (e) {
        console.warn('[MyClass] Failed to fetch classes/teachers from Supabase:', e);
    }

    const teacherMap = {};
    allTeachers.forEach(t => { teacherMap[t.teacherid] = t.fullname; });

    // Priority 1: Check session coordinatingClass or batchofcoordinator (e.g. 'CO32')
    const sessionCoordClass = (_session.coordinatingClass || _session.batchofcoordinator || '').toUpperCase().trim();
    if (sessionCoordClass) {
        const found = allClasses.find(c => 
            (c.classname && c.classname.toUpperCase() === sessionCoordClass) ||
            String(c.classid) === sessionCoordClass ||
            (c.classname && c.classname.toUpperCase().replace(/\D/g, '') === sessionCoordClass.replace(/\D/g, ''))
        );
        if (found) {
            detectedClass = found;
        } else {
            const num = parseInt(sessionCoordClass.replace(/\D/g, '')) || 31;
            detectedClass = {
                classid: num,
                classname: sessionCoordClass,
                semid: Math.floor(num / 10) || 3,
                coordinator: _session.teacherid || null
            };
        }
    }

    // Priority 2: Check class table where class.coordinator === _session.teacherid
    if (!detectedClass && _session.teacherid && allClasses.length > 0) {
        const found = allClasses.find(c => Number(c.coordinator) === Number(_session.teacherid));
        if (found) {
            detectedClass = found;
        }
    }

    // Priority 3: Check class table where coordinator teacher fullname matches current teacher
    if (!detectedClass && teacherName && allClasses.length > 0) {
        const found = allClasses.find(c => {
            if (!c.coordinator) return false;
            const coordFullName = teacherMap[c.coordinator];
            return coordFullName && teacherMatches(teacherName, coordFullName);
        });
        if (found) {
            detectedClass = found;
        }
    }

    // Priority 4: Query teacher_logins in Supabase for current teacher
    if (!detectedClass && teacherName && typeof sbSelect === 'function') {
        try {
            const loginRows = await sbSelect('teacher_logins', {
                select: 'fullname,isclasscoordinator,batchofcoordinator',
                eq: { fullname: teacherName }
            });
            if (loginRows && loginRows.length > 0) {
                const userRow = loginRows[0];
                if ((userRow.isclasscoordinator === 1 || userRow.batchofcoordinator) && userRow.batchofcoordinator) {
                    const bName = userRow.batchofcoordinator.toUpperCase().trim();
                    const found = allClasses.find(c => (c.classname && c.classname.toUpperCase() === bName) || String(c.classid) === bName);
                    if (found) {
                        detectedClass = found;
                    } else {
                        const num = parseInt(bName.replace(/\D/g, '')) || 31;
                        detectedClass = {
                            classid: num,
                            classname: bName,
                            semid: Math.floor(num / 10) || 3,
                            coordinator: _session.teacherid || null
                        };
                    }
                }
            }
        } catch(e) {
            console.warn('[MyClass] Failed to check teacher_logins:', e);
        }
    }

    // Priority 5: If session says isCoordinator is true, fallback to first class in list
    if (!detectedClass && _session.isCoordinator && allClasses.length > 0) {
        detectedClass = allClasses[0];
    }

    const isAuthorized = Boolean(detectedClass);
    isCurrentTeacherCoordinator = isAuthorized;

    if (isAuthorized) {
        CLASS_NAME = (detectedClass.classname || 'CO31').toUpperCase();
        CLASS_ID = CLASS_NAME.toLowerCase();
        currentCoordinatorClassId = Number(detectedClass.classid) || parseInt(CLASS_NAME.replace(/\D/g, '')) || 31;
        currentClassSem = detectedClass.semid ? `Sem ${detectedClass.semid}` : `Sem ${Math.floor(currentCoordinatorClassId / 10) || 3}`;

        // Keep session updated
        if (_session) {
            _session.isCoordinator = true;
            _session.coordinatingClass = CLASS_NAME;
            _session.batchofcoordinator = CLASS_NAME;
            try { if (typeof TrevaSession !== 'undefined') TrevaSession.save(_session); } catch(e) {}
        }

        // Update all UI elements for this class
        updateClassBannerUI(CLASS_NAME, currentClassSem, teacherName, detectedClass);

        if (notCoordPanel) notCoordPanel.style.display = 'none';
        if (coordContent) coordContent.style.display = 'block';
        return true;
    } else {
        if (notCoordPanel) notCoordPanel.style.display = 'flex';
        if (coordContent) coordContent.style.display = 'none';
        try { lucide.createIcons(); } catch(e) {}
        return false;
    }
}

// =========================================================================
// MASTER DATA — ROOMS, TEACHERS, SUBJECTS (localStorage-backed, cross-class)
// =========================================================================

function getMasterRooms() {
    try {
        return JSON.parse(localStorage.getItem('treva_rooms') || '[]');
    } catch(e) { return []; }
}
function saveMasterRooms(arr) {
    localStorage.setItem('treva_rooms', JSON.stringify(arr));
}

function getMasterTeachers() {
    try {
        return JSON.parse(localStorage.getItem('treva_teachers') || '[]');
    } catch(e) { return []; }
}
function saveMasterTeachers(arr) {
    localStorage.setItem('treva_teachers', JSON.stringify(arr));
}

function getMasterSubjects() {
    try {
        return JSON.parse(localStorage.getItem('treva_subjects') || '[]');
    } catch(e) { return []; }
}
function saveMasterSubjects(arr) {
    localStorage.setItem('treva_subjects', JSON.stringify(arr));
}

// =========================================================================
// GLOBAL TIMETABLE INDEX — cross-class room conflict detection
// key: "day|time|roomId"  →  { classId, className }
// =========================================================================
function getGlobalTTIndex() {
    try {
        return JSON.parse(localStorage.getItem('treva_global_tt_index') || '{}');
    } catch(e) { return {}; }
}
function saveGlobalTTIndex(obj) {
    localStorage.setItem('treva_global_tt_index', JSON.stringify(obj));
}

/** Rebuild the global index for this class from its current timetable data */
function rebuildGlobalIndexForClass() {
    const idx = getGlobalTTIndex();
    // Remove all old entries for this class
    Object.keys(idx).forEach(k => {
        if (idx[k].classId === CLASS_ID) delete idx[k];
    });
    // Re-add all current entries
    timetableData.forEach(slot => {
        if (slot.loc) {
            const key = `${slot.day}|${slot.time}|${slot.loc}`;
            idx[key] = { classId: CLASS_ID, className: CLASS_NAME };
        }
    });
    saveGlobalTTIndex(idx);
}

/** Check if a room is already taken at a day+time by another class.
 *  Returns { conflict: true, byClass: 'CO52' } or { conflict: false }
 */
function checkRoomConflict(day, time, room, excludeSlotId = null) {
    if (!room || !day || !time) return { conflict: false };
    const idx = getGlobalTTIndex();
    const key = `${day}|${time}|${room}`;
    if (idx[key] && idx[key].classId !== CLASS_ID) {
        return { conflict: true, byClass: idx[key].className };
    }
    // Also check within THIS class for duplicate (same slot, different id)
    const selfConflict = timetableData.find(s =>
        s.day === day && s.time === time && s.loc === room &&
        (excludeSlotId === null || s.id !== excludeSlotId)
    );
    if (selfConflict) {
        return { conflict: true, byClass: CLASS_NAME + ' (this class)' };
    }
    return { conflict: false };
}

// =========================================================================
// DATA STORES (class-specific)
// =========================================================================
let studentsData = [];
let attendanceDates = [];
let currentStudentView = 'roster';
let realClassBatches = [];
let realClassTutorials = [];
let timetableData = [];
let examsData = [];
let resourcesData = [];
let currentDay = 'Mon';

// =========================================================================
// INIT
// =========================================================================
window.initMyClassPage = async function() {
    try { lucide.createIcons(); } catch(e) { console.warn(e); }

    // Check authorization first!
    const isAuth = await checkCoordinatorAccess();

    // Profile dropdown & initials
    const profBtn = document.getElementById('profBtn');
    const profDD  = document.getElementById('profDD');
    if (profBtn) {
        const initials = (_session.fullname || 'SP')
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map(w => w[0].toUpperCase())
            .join('');
        profBtn.textContent = initials || 'SP';
        if (profDD && !profBtn._hasDDListener) {
            profBtn._hasDDListener = true;
            profBtn.addEventListener('click', e => { e.stopPropagation(); profDD.classList.toggle('open'); });
        }
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

    if (!isAuth) {
        console.info('[MyClass] Teacher is not a class coordinator. Access restricted.');
        return;
    }

    // Data is loaded from the database only; no sample seed data is kept in code.
    rebuildGlobalIndexForClass();

    renderStudents();
    loadMyClassStudents();
    renderTimetable();
    loadMyClassTimetableFromSupabase();
    renderExams();
    renderResources();
    renderSetup();
    loadSetupDataFromSupabase();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (document.getElementById('coordinatorContent')) window.initMyClassPage();
    });
} else {
    if (document.getElementById('coordinatorContent')) window.initMyClassPage();
}

let currentDivideType = 'batch';     // 'batch' | 'tutorial'
let currentDivideMethod = 'range';   // 'range' | 'count'

// Fetches enrolled students, batches, and tutorials for coordinating class from Supabase
async function loadMyClassStudents() {
    if (typeof sbSelect !== 'function') return;
    const tbody = document.getElementById('studentTableBody');
    if (tbody && (!studentsData || studentsData.length === 0)) {
        tbody.innerHTML = `<tr><td colspan="7" class="treva-table-loading-cell">${getTrevaLoadingHtml('Loading Student Directory...', 'Fetching enrolled students from database')}</td></tr>`;
    }
    try {
        const [batches, tutorials, students] = await Promise.all([
            sbSelect('batch', { select: 'classid,batchid,batchname' }),
            sbSelect('tutorial', { select: 'classid,tutorialid,tutorialname' }),
            sbSelect('student', { select: 'student_id,enrollment_no,name,class_id,batch_id,tutorial_id', order: 'enrollment_no.asc' })
        ]);

        realClassBatches = (batches || []).filter(b => Number(b.classid) === Number(currentCoordinatorClassId));
        realClassTutorials = (tutorials || []).filter(t => Number(t.classid) === Number(currentCoordinatorClassId));

        if (students && students.length > 0) {
            const batchMap = {};
            const tutMap = {};
            (batches || []).forEach(b => { batchMap[`${b.classid}_${b.batchid}`] = b.batchname; });
            (tutorials || []).forEach(t => { tutMap[`${t.classid}_${t.tutorialid}`] = t.tutorialname; });

            // Filter to current coordinator class (e.g. 32 for CO32, 31 for CO31, 33 for CO33)
            const classStudents = students.filter(s => Number(s.class_id) === Number(currentCoordinatorClassId));
            if (classStudents.length > 0) {
                const log = (typeof TrevaAttendance !== 'undefined') ? TrevaAttendance.getLog() : getAttendanceLog();
                studentsData = classStudents.map(s => {
                    const enroll = String(s.enrollment_no || s.student_id);
                    const stats = (typeof TrevaAttendance !== 'undefined')
                        ? TrevaAttendance.calculateStudentAttendance(enroll, log)
                        : { pct: null, hasRecords: false };
                    return {
                        id:          s.student_id,
                        enroll:      enroll,
                        name:        s.name || 'Unknown',
                        batch:       batchMap[`${s.class_id}_${s.batch_id}`] || (s.batch_id ? `CO${s.batch_id}` : '—'),
                        tut:         tutMap[`${s.class_id}_${s.tutorial_id}`] || (s.tutorial_id ? `${CLASS_NAME}T${s.tutorial_id}` : '—'),
                        batch_id:    s.batch_id,
                        tutorial_id: s.tutorial_id,
                        att:         stats.hasRecords ? stats.pct : null
                    };
                });

                if (realClassBatches.length === 0) {
                    const uniqueB = [...new Set(studentsData.map(s => s.batch).filter(b => b && b !== '—'))];
                    realClassBatches = uniqueB.map(name => ({ batchid: null, batchname: name, classid: currentCoordinatorClassId }));
                }
                if (realClassTutorials.length === 0) {
                    const uniqueT = [...new Set(studentsData.map(s => s.tut).filter(t => t && t !== '—'))];
                    realClassTutorials = uniqueT.map(name => ({ tutorialid: null, tutorialname: name, classid: currentCoordinatorClassId }));
                }

                if (typeof TrevaAttendance !== 'undefined') {
                    const allDates = TrevaAttendance.getDates(log);
                    const studentEnrollSet = new Set(studentsData.map(s => String(s.enroll).trim()));
                    attendanceDates = (allDates || []).map(d => {
                        const classSessions = (d.sessions || []).filter(sess => {
                            const classMatch = sess.class && (sess.class.toUpperCase() === CLASS_NAME || sess.class.toUpperCase().includes(CLASS_NAME));
                            const studentMatch = sess.records && sess.records.some(r => studentEnrollSet.has(String(r.enroll).trim()));
                            return classMatch || studentMatch;
                        });
                        return {
                            date:     d.date,
                            day:      d.day,
                            total:    classSessions.length,
                            sessions: classSessions
                        };
                    }).filter(d => d.sessions.length > 0);
                }

                renderStudents();
                updateBatchAndTutFilterOptions();
                try {
                    localStorage.setItem('treva_students_' + CLASS_NAME, JSON.stringify(studentsData));
                } catch(e) {}
            } else {
                studentsData = [];
                attendanceDates = [];
                renderStudents();
                updateBatchAndTutFilterOptions();
            }
        }
    } catch (e) {
        console.warn('[MyClass] Failed to load real students:', e);
    }
}

/* =============================================
   BATCH DIVISION — Split class into batches & tutorials
   ============================================= */

// Opens batch and tutorial division modal
window.openBatchDivideModal = function() {
    const modal = document.getElementById('batchDivideModal');
    if (!modal) return;
    
    // Auto-populate default start/end enrollment if empty
    const sorted = [...studentsData].sort((a,b) => {
        try {
            const aEn = BigInt(a.enroll || 0);
            const bEn = BigInt(b.enroll || 0);
            return aEn < bEn ? -1 : (aEn > bEn ? 1 : 0);
        } catch(e) {
            return String(a.enroll).localeCompare(String(b.enroll));
        }
    });

    if (sorted.length > 0) {
        const startInp = document.getElementById('rangeStartEnroll');
        const endInp   = document.getElementById('rangeEndEnroll');
        if (startInp && !startInp.value) startInp.value = sorted[0].enroll;
        if (endInp && !endInp.value) endInp.value = sorted[Math.min(29, sorted.length - 1)].enroll;
    }

    setDivideType(currentDivideType);
    setDivideMethod(currentDivideMethod);
    populateGroupDropdown();
    updateDividePreview();

    modal.classList.add('open');
    try { lucide.createIcons(); } catch(e) {}
};

window.closeBatchDivideModal = function() {
    const modal = document.getElementById('batchDivideModal');
    if (modal) modal.classList.remove('open');
};

window.setDivideType = function(type) {
    currentDivideType = type;
    const btnBatch = document.getElementById('btnTypeBatch');
    const btnTut   = document.getElementById('btnTypeTut');
    const lblName  = document.getElementById('lblTargetName');
    const helpName = document.getElementById('helpTargetName');
    const targetInp = document.getElementById('targetGroupName');

    if (type === 'batch') {
        if (btnBatch) {
            btnBatch.style.border = '2px solid var(--accent)';
            btnBatch.style.background = 'var(--accent-subtle, rgba(56,189,248,0.12))';
            btnBatch.style.color = 'var(--text)';
        }
        if (btnTut) {
            btnTut.style.border = '1px solid var(--border)';
            btnTut.style.background = 'var(--card-bg)';
            btnTut.style.color = 'var(--text-muted)';
        }
        if (lblName) lblName.textContent = 'Batch Name *';
        if (helpName) helpName.textContent = `Type a new batch name (like ${CLASS_NAME}1) or select an existing one.`;
        if (targetInp) targetInp.placeholder = `e.g. ${CLASS_NAME}1`;
    } else {
        if (btnTut) {
            btnTut.style.border = '2px solid var(--accent)';
            btnTut.style.background = 'var(--accent-subtle, rgba(56,189,248,0.12))';
            btnTut.style.color = 'var(--text)';
        }
        if (btnBatch) {
            btnBatch.style.border = '1px solid var(--border)';
            btnBatch.style.background = 'var(--card-bg)';
            btnBatch.style.color = 'var(--text-muted)';
        }
        if (lblName) lblName.textContent = 'Tutorial Group Name *';
        if (helpName) helpName.textContent = `Type a new tutorial name (like ${CLASS_NAME}T1) or select an existing one.`;
        if (targetInp) targetInp.placeholder = `e.g. ${CLASS_NAME}T1`;
    }

    populateGroupDropdown();
    updateDividePreview();
};

window.setDivideMethod = function(method) {
    currentDivideMethod = method;
    const btnRange = document.getElementById('btnMethodRange');
    const btnCount = document.getElementById('btnMethodCount');
    const rangeFields = document.getElementById('methodRangeFields');
    const countFields = document.getElementById('methodCountFields');

    if (method === 'range') {
        if (btnRange) {
            btnRange.style.border = '2px solid var(--accent)';
            btnRange.style.background = 'var(--accent-subtle, rgba(56,189,248,0.12))';
            btnRange.style.color = 'var(--text)';
        }
        if (btnCount) {
            btnCount.style.border = '1px solid var(--border)';
            btnCount.style.background = 'var(--card-bg)';
            btnCount.style.color = 'var(--text-muted)';
        }
        if (rangeFields) rangeFields.style.display = 'block';
        if (countFields) countFields.style.display = 'none';
    } else {
        if (btnCount) {
            btnCount.style.border = '2px solid var(--accent)';
            btnCount.style.background = 'var(--accent-subtle, rgba(56,189,248,0.12))';
            btnCount.style.color = 'var(--text)';
        }
        if (btnRange) {
            btnRange.style.border = '1px solid var(--border)';
            btnRange.style.background = 'var(--card-bg)';
            btnRange.style.color = 'var(--text-muted)';
        }
        if (rangeFields) rangeFields.style.display = 'none';
        if (countFields) countFields.style.display = 'block';
    }

    updateDividePreview();
};

function populateGroupDropdown() {
    const sel = document.getElementById('quickSelectGroup');
    if (!sel) return;
    sel.innerHTML = '<option value="">(Existing)</option>';
    
    if (currentDivideType === 'batch') {
        const uniqueBatches = [...new Set(studentsData.map(s => s.batch).filter(Boolean))].sort();
        uniqueBatches.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b;
            opt.textContent = b;
            sel.appendChild(opt);
        });
    } else {
        const uniqueTuts = [...new Set(studentsData.map(s => s.tut).filter(Boolean))].sort();
        uniqueTuts.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            sel.appendChild(opt);
        });
    }
}

window.onQuickSelectGroup = function(val) {
    if (val) {
        const targetInp = document.getElementById('targetGroupName');
        if (targetInp) targetInp.value = val;
        updateDividePreview();
    }
};

window.getMatchedStudentsForDivision = function() {
    const sorted = [...studentsData].sort((a,b) => {
        try {
            const aEn = BigInt(a.enroll || 0);
            const bEn = BigInt(b.enroll || 0);
            return aEn < bEn ? -1 : (aEn > bEn ? 1 : 0);
        } catch(e) {
            return String(a.enroll).localeCompare(String(b.enroll));
        }
    });

    if (currentDivideMethod === 'range') {
        const startStr = (document.getElementById('rangeStartEnroll')?.value || '').trim();
        const endStr   = (document.getElementById('rangeEndEnroll')?.value || '').trim();
        if (!startStr || !endStr) return [];
        try {
            const startBig = BigInt(startStr);
            const endBig   = BigInt(endStr);
            return sorted.filter(s => {
                const en = BigInt(s.enroll || 0);
                return en >= startBig && en <= endBig;
            });
        } catch(e) {
            return sorted.filter(s => s.enroll >= startStr && s.enroll <= endStr);
        }
    } else {
        const count = parseInt(document.getElementById('countNumber')?.value) || 0;
        if (count <= 0) return [];
        const offsetVal = document.getElementById('countOffset')?.value || '1';
        let startIndex = 0;
        const customGroup = document.getElementById('customStartIndexGroup');

        if (offsetVal === 'custom') {
            if (customGroup) customGroup.style.display = 'block';
            startIndex = Math.max(0, (parseInt(document.getElementById('customStartIndex')?.value) || 1) - 1);
        } else {
            if (customGroup) customGroup.style.display = 'none';
            startIndex = Math.max(0, parseInt(offsetVal) - 1);
        }

        return sorted.slice(startIndex, startIndex + count);
    }
};

window.updateDividePreview = function() {
    const matched = getMatchedStudentsForDivision();
    const countBadge = document.getElementById('previewCountBadge');
    const listEl     = document.getElementById('previewStudentList');
    const defaultGroup = currentDivideType === 'batch' ? `${CLASS_NAME}1` : `${CLASS_NAME}T1`;
    const groupName  = (document.getElementById('targetGroupName')?.value || '').trim() || defaultGroup;

    if (countBadge) countBadge.textContent = `${matched.length} student${matched.length === 1 ? '' : 's'}`;

    if (!listEl) return;
    if (matched.length === 0) {
        listEl.innerHTML = `<span style="color:var(--text-muted)">No students match this range or criteria.</span>`;
        return;
    }

    const firstFew = matched.slice(0, 5).map(s => `${s.enroll} (${s.name})`).join(', ');
    const moreText = matched.length > 5 ? ` and ${matched.length - 5} more...` : '';
    listEl.innerHTML = `
        <div style="color:var(--text); font-weight:600; margin-bottom:4px;">
            Will assign to ${currentDivideType === 'batch' ? 'Batch' : 'Tutorial'}: <span style="color:var(--accent); font-weight:bold;">${groupName}</span>
        </div>
        <div>
            Range: <strong>${matched[0].enroll}</strong> to <strong>${matched[matched.length - 1].enroll}</strong>
        </div>
        <div style="font-size:11px; margin-top:3px; color:var(--text-muted);">${firstFew}${moreText}</div>
    `;
};

window.handleApplyBatchDivision = async function(e) {
    e.preventDefault();
    const groupName = (document.getElementById('targetGroupName')?.value || '').trim();
    if (!groupName) {
        alert(`Please specify a target group name (e.g. ${CLASS_NAME}1 or ${CLASS_NAME}T1).`);
        return;
    }

    const matched = getMatchedStudentsForDivision();
    if (matched.length === 0) {
        alert('No students selected to assign. Please adjust your range or student count.');
        return;
    }

    const submitBtn = document.getElementById('btnSubmitDivision');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `⏳ Saving to Database...`;
    }

    try {
        const studentIds = matched.map(s => s.id);
        const classId = currentCoordinatorClassId || 31;

        if (currentDivideType === 'batch') {
            // 1. Ensure batch exists in Supabase 'batch' table
            const existingBatches = await sbSelect('batch', { select: 'classid,batchid,batchname' });
            let targetBatch = (existingBatches || []).find(b => b.classid === classId && b.batchname.toUpperCase() === groupName.toUpperCase());

            let targetBatchId;
            if (targetBatch) {
                targetBatchId = targetBatch.batchid;
            } else {
                const numMatch = groupName.match(/\d+/);
                const classBatches = (existingBatches || []).filter(b => b.classid === classId);
                const maxId = classBatches.length > 0 ? Math.max(...classBatches.map(b => b.batchid)) : (classId * 10);
                targetBatchId = numMatch ? parseInt(numMatch[0]) : (maxId + 1);

                await sbInsert('batch', {
                    classid:   classId,
                    batchid:   targetBatchId,
                    batchname: groupName
                });
            }

            // 2. Update students in Supabase
            await sbUpdate('student', { student_id: `in.(${studentIds.join(',')})` }, { batch_id: targetBatchId });

            // 3. Update local studentsData
            const matchedIdsSet = new Set(studentIds);
            studentsData.forEach(s => {
                if (matchedIdsSet.has(s.id)) {
                    s.batch = groupName;
                }
            });

        } else {
            // Tutorial division
            // 1. Ensure tutorial exists in Supabase 'tutorial' table
            const existingTuts = await sbSelect('tutorial', { select: 'classid,tutorialid,tutorialname' });
            let targetTut = (existingTuts || []).find(t => t.classid === classId && t.tutorialname.toUpperCase() === groupName.toUpperCase());

            let targetTutId;
            if (targetTut) {
                targetTutId = targetTut.tutorialid;
            } else {
                const numMatch = groupName.match(/\d+/);
                const classTuts = (existingTuts || []).filter(t => t.classid === classId);
                const maxId = classTuts.length > 0 ? Math.max(...classTuts.map(t => t.tutorialid)) : (classId * 10);
                targetTutId = numMatch ? ((classId * 10) + parseInt(numMatch[0])) : (maxId + 1);

                await sbInsert('tutorial', {
                    classid:      classId,
                    tutorialid:   targetTutId,
                    tutorialname: groupName
                });
            }

            // 2. Update students in Supabase
            await sbUpdate('student', { student_id: `in.(${studentIds.join(',')})` }, { tutorial_id: targetTutId });

            // 3. Update local studentsData
            const matchedIdsSet = new Set(studentIds);
            studentsData.forEach(s => {
                if (matchedIdsSet.has(s.id)) {
                    s.tut = groupName;
                }
            });
        }

        // Re-render table & stats
        renderStudents();
        updateBatchAndTutFilterOptions();
        closeBatchDivideModal();

        alert(`✅ Success! Assigned ${matched.length} students to ${currentDivideType === 'batch' ? 'Batch' : 'Tutorial'} ${groupName} and updated in Supabase.`);

    } catch (err) {
        console.error('[Treva] Error applying division:', err);
        alert(`❌ Failed to update database: ${err.message}`);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i data-lucide="check"></i> Apply & Save to Database`;
            try { lucide.createIcons(); } catch(e) {}
        }
    }
};

function updateBatchAndTutFilterOptions() {
    const bFilter = document.getElementById('batchFilter');
    if (bFilter) {
        const curr = bFilter.value;
        const batchNames = new Set();
        (realClassBatches || []).forEach(b => { if (b.batchname) batchNames.add(b.batchname); });
        (studentsData || []).forEach(s => { if (s.batch && s.batch !== '—') batchNames.add(s.batch); });
        const batches = [...batchNames].sort();
        bFilter.innerHTML = '<option value="ALL">All Batches</option>' +
            batches.map(b => `<option value="${b}">${b.startsWith('Batch') ? b : 'Batch ' + b}</option>`).join('');
        if (batches.includes(curr)) bFilter.value = curr;
    }

    const tFilter = document.getElementById('tutFilter');
    if (tFilter) {
        const curr = tFilter.value;
        const tutNames = new Set();
        (realClassTutorials || []).forEach(t => { if (t.tutorialname) tutNames.add(t.tutorialname); });
        (studentsData || []).forEach(s => { if (s.tut && s.tut !== '—') tutNames.add(s.tut); });
        const tuts = [...tutNames].sort();
        tFilter.innerHTML = '<option value="ALL">All Tutorials</option>' +
            tuts.map(t => `<option value="${t}">${(t.startsWith('Tutorial') || t.startsWith('Tut')) ? t : 'Tutorial ' + t}</option>`).join('');
        if (tuts.includes(curr)) tFilter.value = curr;
    }

    // Update banner stats
    const statBatch = document.getElementById('statBatchCount');
    if (statBatch) statBatch.textContent = new Set(studentsData.map(s => s.batch).filter(b => b && b !== '—')).size;
    const statTut = document.getElementById('statTutCount');
    if (statTut) statTut.textContent = new Set(studentsData.map(s => s.tut).filter(t => t && t !== '—')).size;
}

// =========================================================================
// SECTION VIEW SWITCHER
// =========================================================================
window.switchSection = function(viewName) {
    document.querySelectorAll('.subnav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
    });
    document.querySelectorAll('.section-view').forEach(sec => sec.classList.remove('active'));
    const target = document.getElementById('sec-' + viewName);
    if (target) target.classList.add('active');
    if (viewName === 'setup') renderSetup();
};

/* =============================================
   ROSTER & MATRIX RENDERING — Table roster and attendance matrix views
   ============================================= */

// Returns student array filtered by search query, batch, and tutorial
window.getFilteredStudentsList = function() {
    const query = (document.getElementById('studentSearchInput') ? document.getElementById('studentSearchInput').value : '').toLowerCase().trim();
    const batch  = document.getElementById('batchFilter') ? document.getElementById('batchFilter').value : 'ALL';
    const tut    = document.getElementById('tutFilter') ? document.getElementById('tutFilter').value : 'ALL';
    const isNum  = /^\d+$/.test(query);
    return studentsData.filter(s => {
        const enroll = String(s.enroll || '').toLowerCase();
        const enrollMatch = isNum ? (enroll === query || enroll.endsWith(query)) : enroll.includes(query);
        return (s.name.toLowerCase().includes(query) || enrollMatch)
            && (batch === 'ALL' || s.batch === batch)
            && (tut   === 'ALL' || s.tut   === tut);
    });
};

// Renders table roster or calls matrix sheet depending on current view mode
window.renderStudents = function(list = studentsData) {
    const tbody = document.getElementById('studentTableBody');
    if (!tbody) return;
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted)">No students match your query.</td></tr>`;
        return;
    }
    tbody.innerHTML = list.map((s, idx) => {
        const hasAttendance = Number.isFinite(s.att);
        const isDefaulter = hasAttendance && s.att < 80;
        return `
            <tr id="student-row-${s.enroll}" class="student-clickable-row" onclick="openStudentProfileModal('${s.enroll}')" title="Click to view complete student details & attendance">
                <td style="color:var(--text-muted); font-size:12px; font-weight:600;">${idx + 1}</td>
                <td><code style="font-size:12px; font-weight:600; color:var(--primary); cursor:pointer;">${s.enroll}</code></td>
                <td><strong class="student-name-link" style="color:var(--text); cursor:pointer;">${s.name}</strong></td>
                <td><span class="batch-chip">${s.batch || '—'}</span></td>
                <td><span class="tut-chip">${s.tut || '—'}</span></td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-weight:700; color:${isDefaulter ? '#dc2626' : '#15803d'}; font-size:13px;">${hasAttendance ? `${s.att}%` : '—'}</span>
                        ${isDefaulter ? '<span class="badge-defaulter">&lt;80%</span>' : ''}
                    </div>
                </td>
                <td style="text-align:right;">
                    <span class="student-row-arrow" title="View Student Profile">
                        <i data-lucide="chevron-right" style="width:18px;height:18px;"></i>
                    </span>
                </td>
            </tr>`;
    }).join('');

    const statEl = document.getElementById('statStudentCount');
    if (statEl) statEl.textContent = studentsData.length;
    const statBatch = document.getElementById('statBatchCount');
    if (statBatch) statBatch.textContent = new Set(studentsData.map(s => s.batch).filter(Boolean)).size;
    const statTut = document.getElementById('statTutCount');
    if (statTut) statTut.textContent = new Set(studentsData.map(s => s.tut).filter(Boolean)).size;
    const statAvgAtt = document.getElementById('statAvgAttendance');
    if (statAvgAtt) {
        let avg = null;
        if (typeof TrevaAttendance !== 'undefined') {
            avg = TrevaAttendance.calculateClassAverage(studentsData);
        } else {
            const recorded = studentsData.filter(s => Number.isFinite(s.att));
            avg = recorded.length ? Math.round(recorded.reduce((acc, s) => acc + s.att, 0) / recorded.length) : null;
        }
        statAvgAtt.textContent = avg !== null ? `${avg}%` : '—';
    }

    if (currentStudentView === 'matrix') {
        renderMatrixSheet(list);
    }
    try { lucide.createIcons(); } catch(e){}
};

window.filterStudents = function() {
    const filtered = getFilteredStudentsList();
    if (currentStudentView === 'matrix') {
        renderMatrixSheet(filtered);
    } else {
        renderStudents(filtered);
    }
};

window.switchStudentViewMode = function(mode) {
    currentStudentView = mode;
    const btnRoster = document.getElementById('btnViewRoster');
    const btnMatrix = document.getElementById('btnViewMatrix');
    const secRoster = document.getElementById('viewRosterSection');
    const secMatrix = document.getElementById('viewMatrixSection');
    const filtered = getFilteredStudentsList();

    if (mode === 'roster') {
        if (btnRoster) btnRoster.classList.add('active');
        if (btnMatrix) btnMatrix.classList.remove('active');
        if (secRoster) secRoster.style.display = 'block';
        if (secMatrix) secMatrix.style.display = 'none';
        renderStudents(filtered);
    } else {
        if (btnMatrix) btnMatrix.classList.add('active');
        if (btnRoster) btnRoster.classList.remove('active');
        if (secMatrix) secMatrix.style.display = 'block';
        if (secRoster) secRoster.style.display = 'none';
        renderMatrixSheet(filtered);
    }
    try { lucide.createIcons(); } catch(e) {}
};

window.focusStudentInMatrix = function(enroll) {
    switchStudentViewMode('matrix');
    setTimeout(() => {
        const row = document.getElementById('matrix-row-' + enroll);
        if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.style.background = '#fef08a';
            setTimeout(() => { row.style.background = ''; }, 1600);
        }
    }, 120);
};

window.renderMatrixSheet = function(list = studentsData) {
    const thead = document.getElementById('matrixHead');
    const tbody = document.getElementById('matrixBody');
    if (!thead || !tbody) return;

    if (!attendanceDates || attendanceDates.length === 0) {
        thead.innerHTML = `
            <tr>
                <th class="sticky-col">Enrollment &amp; Student Name</th>
                <th class="overall-col">Overall %</th>
            </tr>
        `;
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; padding:40px; color:var(--text-muted);">No attendance sessions recorded for Class ${CLASS_NAME} yet.</td></tr>`;
        return;
    }

    thead.innerHTML = `
        <tr>
            <th class="sticky-col">Enrollment &amp; Student Name</th>
            ${attendanceDates.map(d => {
                const parts = d.date.split('-');
                const dayDisplay = parts[2] ? `${parts[2]} ${parts[1] ? 'Oct' : ''}` : d.date;
                return `<th>${dayDisplay}<br><span style="font-size:10.5px; opacity:0.8; font-weight:normal;">(${d.day})</span></th>`;
            }).join('')}
            <th class="overall-col">Overall %</th>
        </tr>
    `;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${attendanceDates.length + 2}" style="text-align:center; padding:40px; color:var(--text-muted);">No student records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map((s, idx) => {
        let totalHeldAcrossDates = 0;
        let totalAttendedAcrossDates = 0;

        const cellsHtml = attendanceDates.map(d => {
            const studentSessionsOnDate = (d.sessions || []).filter(sess =>
                sess.records && sess.records.some(r => String(r.enroll).trim() === String(s.enroll).trim())
            );
            const totalLectures = studentSessionsOnDate.length;
            totalHeldAcrossDates += totalLectures;

            const attended = studentSessionsOnDate.filter(sess =>
                sess.records.some(r => String(r.enroll).trim() === String(s.enroll).trim() && Boolean(r.present))
            ).length;
            totalAttendedAcrossDates += attended;

            let ratioClass = 'low';
            if (totalLectures === 0) ratioClass = 'low';
            else if (attended === totalLectures) ratioClass = 'full';
            else if ((attended / totalLectures) >= 0.75) ratioClass = 'good';
            else if ((attended / totalLectures) >= 0.5) ratioClass = 'partial';

            const displayRatio = totalLectures > 0 ? `${attended}/${totalLectures}` : '—';

            return `
                <td>
                    <span class="cell-ratio-pill ${ratioClass}"
                        title="${attended} of ${totalLectures} lectures attended on ${d.date}. Click to inspect."
                        onclick="openStudentProfileModal('${s.enroll}', 'attendance', '${d.date}')">
                        ${displayRatio}
                    </span>
                </td>`;
        }).join('');

        const hasAtt = totalHeldAcrossDates > 0 || Number.isFinite(s.att);
        const overallComputed = totalHeldAcrossDates
            ? Math.round((totalAttendedAcrossDates / totalHeldAcrossDates) * 100)
            : (Number.isFinite(s.att) ? s.att : null);
        const isDefaulter = hasAtt && (overallComputed < 80);

        return `
            <tr id="matrix-row-${s.enroll}">
                <td class="sticky-col" style="cursor:pointer;" onclick="openStudentProfileModal('${s.enroll}')" title="Click to view full student details & attendance">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:11px; color:var(--text-muted); font-weight:700;">${idx + 1}</span>
                        <div>
                            <div style="font-weight:700; color:var(--text); font-size:13.5px;" class="student-name-link">${s.name}</div>
                            <div style="font-family:monospace; font-size:11.5px; color:var(--primary); font-weight:600;">${s.enroll} · <span style="color:var(--text-muted);">${CLASS_NAME} (${s.batch || '—'})</span></div>
                        </div>
                    </div>
                </td>
                ${cellsHtml}
                <td class="overall-col">
                    <span class="overall-pct-badge ${overallComputed === null ? 'no-rec' : (isDefaulter ? 'defaulter' : 'good')}" style="${overallComputed === null ? 'background:var(--border-light); color:var(--text-muted);' : ''}">
                        ${overallComputed !== null ? `${overallComputed}%` : '—'}
                    </span>
                </td>
            </tr>`;
    }).join('');

    try { lucide.createIcons(); } catch(e) {}
};

window.openDayBreakdownModal = function(enroll, dateStr, attendedCount, totalCount) {
    const student = studentsData.find(s => String(s.enroll).trim() === String(enroll).trim());
    if (!student) return;

    const dateObj = attendanceDates.find(d => d.date === dateStr) || { date: dateStr, day: 'Day', total: totalCount };
    const titleEl = document.getElementById('breakdownDateTitle');
    const metaEl  = document.getElementById('breakdownStudentMeta');
    const dayNameEl = document.getElementById('breakdownDayName');
    const scoreBadge = document.getElementById('breakdownScoreBadge');
    const listEl = document.getElementById('dayLecturesList');

    if (titleEl) titleEl.textContent = `Attendance Breakdown · ${dateStr} (${dateObj.day || 'Day'})`;
    if (metaEl)  metaEl.innerHTML = `<strong>${student.name}</strong> (<code>${student.enroll}</code>) &nbsp;•&nbsp; Class ${CLASS_NAME} · Batch ${student.batch || '—'} · ${student.tut || '—'}`;
    if (dayNameEl) dayNameEl.textContent = `${dateObj.day || 'Day'} Attendance Summary`;
    if (scoreBadge) {
        const pct = totalCount ? Math.round((attendedCount / totalCount) * 100) : 0;
        scoreBadge.innerHTML = `<span style="color:${pct >= 80 ? '#15803d' : '#dc2626'};">${attendedCount} / ${totalCount} Lectures Attended (${pct}%)</span>`;
    }

    if (listEl) {
        const log = (typeof TrevaAttendance !== 'undefined') ? TrevaAttendance.getLog() : [];
        const dateSessions = log.filter(l => l.date === dateStr && l.records && l.records.some(r => String(r.enroll).trim() === String(enroll).trim()));
        if (dateSessions.length === 0) {
            listEl.innerHTML = `<div style="padding:16px; color:var(--text-muted); text-align:center;">No sessions recorded for this student on this date.</div>`;
        } else {
            listEl.innerHTML = dateSessions.map(sess => {
                const rec = sess.records.find(r => String(r.enroll).trim() === String(enroll).trim());
                const isPresent = rec ? Boolean(rec.present) : false;
                return `
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:var(--bg); border:1px solid var(--border); border-radius:8px; margin-bottom:8px;">
                        <div>
                            <div style="font-weight:700; color:var(--text); font-size:13.5px;">${sess.sub || 'Lecture'} ${sess.code ? `(${sess.code})` : ''}</div>
                            <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
                                ${sess.time || ''} &nbsp;•&nbsp; Room: <strong>${sess.loc || sess.room || '—'}</strong> &nbsp;•&nbsp; Faculty: ${sess.fac || '—'}
                            </div>
                        </div>
                        <div>
                            <span style="display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:700; background:${isPresent ? '#dcfce7' : '#fee2e2'}; color:${isPresent ? '#15803d' : '#dc2626'};">
                                <i data-lucide="${isPresent ? 'check-circle' : 'x-circle'}" style="width:14px;height:14px;"></i>
                                ${isPresent ? 'Present' : 'Absent'}
                            </span>
                        </div>
                    </div>`;
            }).join('');
        }
    }

    const modal = document.getElementById('dayBreakdownModal');
    if (modal) modal.classList.add('open');
    try { lucide.createIcons(); } catch(e) {}
};

window.closeDayBreakdownModal = function() {
    const modal = document.getElementById('dayBreakdownModal');
    if (modal) modal.classList.remove('open');
};

// =========================================================================
// COMPREHENSIVE STUDENT PROFILE & DEEP ATTENDANCE DOSSIER
// =========================================================================

let currentProfileEnroll = null;

window.switchProfileModalTab = function(tabName) {
    const tabBtns = {
        overview: document.getElementById('profTabBtnOverview'),
        attendance: document.getElementById('profTabBtnAttendance'),
        results: document.getElementById('profTabBtnResults'),
        forms: document.getElementById('profTabBtnForms')
    };
    const tabPanes = {
        overview: document.getElementById('profPaneOverview'),
        attendance: document.getElementById('profPaneAttendance'),
        results: document.getElementById('profPaneResults'),
        forms: document.getElementById('profPaneForms')
    };

    Object.keys(tabBtns).forEach(k => {
        if (tabBtns[k]) tabBtns[k].classList.toggle('active', k === tabName);
        if (tabPanes[k]) tabPanes[k].classList.toggle('active', k === tabName);
    });

    try { lucide.createIcons(); } catch(e) {}
};

window.toggleStudentDateBreakdown = function(enroll, dateStr) {
    const card = document.getElementById(`date-card-${enroll}-${dateStr}`);
    if (card) {
        card.classList.toggle('open');
        try { lucide.createIcons(); } catch(e) {}
    }
};

window.closeStudentProfileModal = function() {
    const modal = document.getElementById('studentProfileModal');
    if (modal) modal.classList.remove('open');
};

window.editStudentFromProfile = function() {
    if (!currentProfileEnroll) return;
    const student = studentsData.find(s => String(s.enroll).trim() === String(currentProfileEnroll).trim());
    if (!student) return;
    closeStudentProfileModal();
    if (typeof window.openStudentModal === 'function') {
        window.openStudentModal(student.id);
    }
};

window.deleteStudentFromProfile = function() {
    if (!currentProfileEnroll) return;
    const student = studentsData.find(s => String(s.enroll).trim() === String(currentProfileEnroll).trim());
    if (!student) return;
    closeStudentProfileModal();
    if (typeof window.deleteStudent === 'function') {
        window.deleteStudent(student.id);
    }
};

window.openStudentProfileModal = function(enroll, initialTab = 'overview', targetDate = null) {
    const student = studentsData.find(s => String(s.enroll).trim() === String(enroll).trim());
    if (!student) return;

    currentProfileEnroll = enroll;

    // 1. Header & Badges
    const initials = (student.name || 'SP')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('') || 'SP';

    const avatarEl = document.getElementById('profModalAvatar');
    const nameEl = document.getElementById('profModalName');
    const statusBadge = document.getElementById('profModalStatusBadge');
    const enrollEl = document.getElementById('profModalEnroll');
    const classEl = document.getElementById('profModalClass');
    const batchEl = document.getElementById('profModalBatch');
    const tutEl = document.getElementById('profModalTut');

    if (avatarEl) avatarEl.textContent = initials;
    if (nameEl) nameEl.textContent = student.name;
    if (enrollEl) enrollEl.textContent = student.enroll;
    if (classEl) classEl.textContent = `Class ${CLASS_NAME} · Sem 3`;
    if (batchEl) batchEl.textContent = student.batch || '—';
    if (tutEl) tutEl.textContent = student.tut || '—';

    const hasAttendance = Number.isFinite(student.att);
    const attPct = hasAttendance ? student.att : null;
    const isDefaulter = hasAttendance && (attPct < 80);

    if (statusBadge) {
        if (hasAttendance) {
            statusBadge.className = `profile-status-pill ${isDefaulter ? 'defaulter' : 'regular'}`;
            statusBadge.textContent = isDefaulter ? '⚠️ Defaulter (<80%)' : '✓ Regular Student (≥80%)';
            statusBadge.style.background = '';
            statusBadge.style.color = '';
        } else {
            statusBadge.className = 'profile-status-pill regular';
            statusBadge.style.background = 'var(--border-light)';
            statusBadge.style.color = 'var(--text-muted)';
            statusBadge.textContent = '— No Attendance Records';
        }
    }

    // 2. Academic results (Real data from database or null)
    const spi = null;
    const cgpa = null;

    // 3. Tab Pills & Overview KPIs
    const attPill = document.getElementById('profTabAttPill');
    const gpaPill = document.getElementById('profTabGpaPill');
    const formsPill = document.getElementById('profTabFormsPill');

    if (attPill) attPill.textContent = hasAttendance ? `${attPct}%` : '—';
    if (gpaPill) gpaPill.textContent = spi !== null ? `${spi.toFixed(2)} SPI` : '—';

    const kpiOverviewAtt = document.getElementById('kpiOverviewAtt');
    const kpiOverviewAttSub = document.getElementById('kpiOverviewAttSub');
    const kpiOverviewSpi = document.getElementById('kpiOverviewSpi');
    const kpiOverviewCgpa = document.getElementById('kpiOverviewCgpa');
    const kpiDefaulterBadge = document.getElementById('kpiDefaulterBadge');

    if (kpiOverviewAtt) kpiOverviewAtt.textContent = hasAttendance ? `${attPct}%` : '—';
    if (kpiOverviewSpi) kpiOverviewSpi.textContent = spi !== null ? spi.toFixed(2) : '—';
    if (kpiOverviewCgpa) kpiOverviewCgpa.textContent = cgpa !== null ? `Cumulative CGPA: ${cgpa.toFixed(2)}` : 'Cumulative CGPA: —';
    if (kpiDefaulterBadge) {
        if (hasAttendance) {
            kpiDefaulterBadge.className = isDefaulter ? 'badge-defaulter' : 'kpi-badge-pill';
            kpiDefaulterBadge.textContent = isDefaulter ? 'Action: Notice Issued' : 'Eligible for Exam';
            kpiDefaulterBadge.style.background = '';
            kpiDefaulterBadge.style.color = '';
        } else {
            kpiDefaulterBadge.className = 'kpi-badge-pill';
            kpiDefaulterBadge.style.background = 'var(--border-light)';
            kpiDefaulterBadge.style.color = 'var(--text-muted)';
            kpiDefaulterBadge.textContent = 'No Attendance Logged';
        }
    }

    // 4. Personal & Academic Details Grid
    const rollNo = (studentsData.findIndex(s => String(s.enroll).trim() === String(student.enroll).trim()) + 1) || 1;
    const phoneNo = student.phone || student.mobile || '—';
    const parentPhone = student.parent_phone || student.guardian_phone || '—';
    const email = student.email || `${student.enroll.toLowerCase()}@rcti.ac.in`;
    const detailsGrid = document.getElementById('profDetailsGrid');
    if (detailsGrid) {
        detailsGrid.innerHTML = `
            <div class="prof-detail-item">
                <span class="lbl">Full Name</span>
                <span class="val">${student.name}</span>
            </div>
            <div class="prof-detail-item">
                <span class="lbl">Enrollment Number</span>
                <span class="val"><code>${student.enroll}</code></span>
            </div>
            <div class="prof-detail-item">
                <span class="lbl">Class Roll No</span>
                <span class="val"><strong>#${rollNo}</strong></span>
            </div>
            <div class="prof-detail-item">
                <span class="lbl">Class &amp; Department</span>
                <span class="val">Class ${CLASS_NAME} · Computer Engineering</span>
            </div>
            <div class="prof-detail-item">
                <span class="lbl">Assigned Practical Batch</span>
                <span class="val"><span class="batch-chip">${student.batch || '—'}</span></span>
            </div>
            <div class="prof-detail-item">
                <span class="lbl">Tutorial / Project Group</span>
                <span class="val"><span class="tut-chip">${student.tut || '—'}</span></span>
            </div>
            <div class="prof-detail-item">
                <span class="lbl">Institutional Email</span>
                <span class="val"><a href="mailto:${email}" style="color:var(--primary);text-decoration:none;">${email}</a></span>
            </div>
            <div class="prof-detail-item">
                <span class="lbl">Student Mobile Contact</span>
                <span class="val">${phoneNo}</span>
            </div>
            <div class="prof-detail-item">
                <span class="lbl">Parent / Guardian Contact</span>
                <span class="val">${parentPhone}</span>
            </div>
            <div class="prof-detail-item">
                <span class="lbl">Class Incharge / Mentor</span>
                <span class="val">${_session.fullname || 'Class Coordinator'} (${CLASS_NAME})</span>
            </div>
            <div class="prof-detail-item">
                <span class="lbl">Admission Quota &amp; Year</span>
                <span class="val">—</span>
            </div>
            <div class="prof-detail-item">
                <span class="lbl">GTU Enrollment Status</span>
                <span class="val" style="color:#15803d; font-weight:700;">Verified &amp; Active</span>
            </div>
        `;
    }

    // 5. Deep Attendance Generation for this Student Only (Database Only)
    const log = (typeof TrevaAttendance !== 'undefined') ? TrevaAttendance.getLog() : [];
    const studentEnrollStr = String(student.enroll).trim();

    let studentDatesData = [];

    if (attendanceDates && attendanceDates.length > 0) {
        studentDatesData = attendanceDates.map(d => {
            const sessionsForStudent = (d.sessions || []).filter(sess =>
                sess.records && sess.records.some(r => String(r.enroll).trim() === studentEnrollStr)
            );
            return {
                date: d.date,
                day: d.day,
                sessions: sessionsForStudent
            };
        }).filter(d => d.sessions.length > 0);
    }

    const deepAttDatesList = document.getElementById('deepAttDatesList');
    const deepHeadline = document.getElementById('deepAttHeadline');
    const deepStatusTag = document.getElementById('deepAttStatusTag');

    if (studentDatesData.length === 0) {
        if (deepAttDatesList) {
            deepAttDatesList.innerHTML = `
                <div style="padding:48px 24px; text-align:center; color:var(--text-muted);">
                    <div style="font-size:36px; margin-bottom:10px;">📅</div>
                    <div style="font-size:16px; font-weight:700; color:var(--text); margin-bottom:4px;">No Attendance Records in Database</div>
                    <div style="font-size:13px; max-width:420px; margin:0 auto; line-height:1.5;">There are no lecture attendance records logged for this student in the database yet. When a teacher marks attendance, date-wise lecture breakdowns will appear here automatically.</div>
                </div>`;
        }
        if (deepHeadline) deepHeadline.textContent = `0 / 0 Lectures Logged · —`;
        if (kpiOverviewAttSub) kpiOverviewAttSub.textContent = `0 / 0 Lectures Logged`;
        if (deepStatusTag) {
            deepStatusTag.textContent = 'No Attendance Records';
            deepStatusTag.style.background = 'rgba(100, 116, 139, 0.2)';
            deepStatusTag.style.color = 'var(--text-muted)';
        }
    } else {
        let totalHeld = 0;
        let totalAttended = 0;

        const datesListHtml = studentDatesData.map((d, dIdx) => {
            const parts = d.date.split('-');
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const mIdx = parts[1] ? (parseInt(parts[1], 10) - 1) : 9;
            const monthName = months[mIdx] || 'Oct';
            const dayNum = parts[2] || String(10 - dIdx);

            const dSessions = d.sessions || [];
            const dTotal = dSessions.length;
            const dAttended = dSessions.filter(s =>
                s.records && s.records.some(r => String(r.enroll).trim() === studentEnrollStr && Boolean(r.present))
            ).length;

            totalHeld += dTotal;
            totalAttended += dAttended;

            let ratioClass = 'good';
            let statusClass = 'good';
            let statusText = 'Present';

            if (dTotal === 0) {
                ratioClass = 'low';
                statusClass = 'absent';
                statusText = 'No Lectures';
            } else if (dAttended === dTotal) {
                ratioClass = 'full';
                statusClass = 'full';
                statusText = '100% Attended';
            } else if (dAttended / dTotal >= 0.75) {
                ratioClass = 'good';
                statusClass = 'good';
                statusText = 'Present';
            } else if (dAttended > 0) {
                ratioClass = 'partial';
                statusClass = 'partial';
                statusText = 'Partial';
            } else {
                ratioClass = 'low';
                statusClass = 'absent';
                statusText = 'Absent';
            }

            const isAutoExpanded = (targetDate && targetDate === d.date) || (!targetDate && dIdx === 0);

            const lecturesHtml = dSessions.map(sess => {
                const rec = (sess.records || []).find(r => String(r.enroll).trim() === studentEnrollStr);
                const isPresent = rec ? Boolean(rec.present) : false;

                return `
                    <div class="lecture-drill-card ${isPresent ? 'filled' : 'absent'}">
                        <div class="lec-info">
                            <div class="lec-period">${sess.time || 'Period Slot'} · ${sess.type || 'Lecture'}</div>
                            <div class="lec-name">${sess.sub || 'Course'} <code>(${sess.code || '—'})</code></div>
                            <div class="lec-details">Faculty: <strong>${sess.fac || 'Course Faculty'}</strong> &nbsp;•&nbsp; Room: <strong>${sess.loc || sess.room || 'Room'}</strong></div>
                        </div>
                        <div class="lec-verdict">
                            ${isPresent ? `
                                <div class="lecture-status-banner attended">
                                    <i data-lucide="check-circle-2"></i>
                                    <div>
                                        <span class="status-headline">✓ Filled / Attended</span>
                                        <span class="status-caption">This lecture was filled by him</span>
                                    </div>
                                </div>
                            ` : `
                                <div class="lecture-status-banner absent">
                                    <i data-lucide="x-circle"></i>
                                    <div>
                                        <span class="status-headline">✗ Absent / Not Filled</span>
                                        <span class="status-caption">This lecture wasn't filled by him</span>
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>`;
            }).join('');

            return `
                <div class="date-row-card ${isAutoExpanded ? 'open' : ''}" id="date-card-${studentEnrollStr}-${d.date}">
                    <div class="date-row-head" onclick="toggleStudentDateBreakdown('${studentEnrollStr}', '${d.date}')">
                        <div class="date-row-left">
                            <div class="date-calendar-badge">
                                <span class="month">${monthName}</span>
                                <span class="day">${dayNum}</span>
                            </div>
                            <div>
                                <div class="date-title">${d.date} <span class="day-name">(${d.day})</span></div>
                                <div class="date-meta-sub">${dAttended} of ${dTotal} lectures attended on this date</div>
                            </div>
                        </div>
                        <div class="date-row-right">
                            <span class="cell-ratio-pill ${ratioClass}">${dAttended}/${dTotal}</span>
                            <span class="day-status-pill ${statusClass}">${statusText}</span>
                            <i data-lucide="chevron-down" class="date-chevron"></i>
                        </div>
                    </div>
                    <div class="date-lectures-drawer">
                        <div style="font-size:11.5px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:2px;">
                            Lecture-by-Lecture Breakdown for ${d.date} (${d.day})
                        </div>
                        ${lecturesHtml}
                    </div>
                </div>`;
        }).join('');

        if (deepAttDatesList) deepAttDatesList.innerHTML = datesListHtml;

        const computedOverallPct = totalHeld ? Math.round((totalAttended / totalHeld) * 100) : (hasAttendance ? attPct : 0);
        if (deepHeadline) deepHeadline.textContent = `${totalAttended} / ${totalHeld} Lectures Attended · ${computedOverallPct}%`;
        if (kpiOverviewAttSub) kpiOverviewAttSub.textContent = `${totalAttended} / ${totalHeld} Lectures Attended`;
        if (deepStatusTag) {
            deepStatusTag.textContent = computedOverallPct >= 80 ? '✓ Regular Student (≥80%)' : '⚠️ Defaulter Status (<80%)';
            deepStatusTag.style.background = computedOverallPct >= 80 ? 'rgba(255,255,255,0.22)' : 'rgba(239, 68, 68, 0.45)';
            deepStatusTag.style.color = '#fff';
        }
    }

    // 6. Tab 3: Academic Results Table (Database Only)
    const profResultSpi = document.getElementById('profResultSpi');
    const profResultCgpa = document.getElementById('profResultCgpa');
    if (profResultSpi) profResultSpi.textContent = spi !== null ? spi.toFixed(2) : '—';
    if (profResultCgpa) profResultCgpa.textContent = cgpa !== null ? cgpa.toFixed(2) : '—';

    const profSubjectsBody = document.getElementById('profResultSubjectsBody');
    if (profSubjectsBody) {
        profSubjectsBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:36px 20px; color:var(--text-muted);">
                    <div style="font-size:28px; margin-bottom:8px;">📊</div>
                    <strong style="color:var(--text); font-size:14px;">No Academic Marks in Database</strong><br>
                    <span style="font-size:12.5px;">No mid-sem or continuous evaluation results have been published for this student yet.</span>
                </td>
            </tr>`;
    }

    // 7. Tab 4: Forms & Feedback Status (Database Only)
    let forms = [];
    let responses = {};
    try {
        const storedForms = JSON.parse(localStorage.getItem('treva_forms_data_v1') || '[]');
        forms = Array.isArray(storedForms) ? storedForms.filter(f => !String(f.id).startsWith('form_seed_')) : [];
        responses = JSON.parse(localStorage.getItem('treva_forms_responses_v1') || '{}');
    } catch(e) {}

    let filledFormsCount = 0;
    const formsCardsHtml = forms.map(f => {
        const formSubs = responses[f.id] || [];
        const isFilled = formSubs.some(sub =>
            String(sub.enroll || '').trim() === studentEnrollStr ||
            (sub.studentName && sub.studentName.toLowerCase() === student.name.toLowerCase())
        );

        if (isFilled) filledFormsCount++;
        const submitDate = f.updatedAt ? new Date(f.updatedAt).toLocaleDateString() : (f.date || '—');

        return `
            <div class="prof-form-card">
                <div class="prof-form-left">
                    <div class="prof-form-icon ${isFilled ? 'filled' : 'pending'}">
                        <i data-lucide="${isFilled ? 'file-check-2' : 'clock'}"></i>
                    </div>
                    <div>
                        <div class="prof-form-title">${f.title}</div>
                        <div class="prof-form-sub">${f.description || 'Institutional feedback form'}</div>
                        <div style="font-size:11.5px; color:var(--text-muted); margin-top:3px;">
                            ${isFilled ? `<span style="color:#15803d;font-weight:700;">✓ Submitted (${submitDate})</span>` : `<span style="color:#d97706;font-weight:700;">⚠️ Not Filled / Pending Submission</span>`}
                        </div>
                    </div>
                </div>
                <div>
                    ${isFilled ? `
                        <button class="primary-action-btn" style="padding:6px 12px; font-size:12px; background:var(--card); border:1px solid var(--border); color:var(--text);" onclick="alert('Submission verified: ${student.name} filled ${f.title}.')">
                            <i data-lucide="check"></i> View Submitted
                        </button>
                    ` : `
                        <button class="primary-action-btn" style="padding:6px 12px; font-size:12px; background:#f59e0b; color:#fff;" onclick="alert('Reminder notification sent to ${student.name} (${student.enroll})!')">
                            <i data-lucide="bell"></i> Send Reminder
                        </button>
                    `}
                </div>
            </div>`;
    }).join('');

    const formsListEl = document.getElementById('profFormsList');
    if (formsListEl) {
        if (forms.length === 0) {
            formsListEl.innerHTML = `
                <div style="padding:40px 20px; text-align:center; color:var(--text-muted);">
                    <div style="font-size:32px; margin-bottom:8px;">📝</div>
                    <div style="font-weight:700; font-size:15px; color:var(--text); margin-bottom:4px;">No Feedback Forms in Database</div>
                    <div style="font-size:12.5px;">No active or past feedback forms available.</div>
                </div>`;
        } else {
            formsListEl.innerHTML = formsCardsHtml;
        }
    }

    const formsHeadline = document.getElementById('profFormsHeadline');
    const formsPctBadge = document.getElementById('profFormsPctBadge');
    const kpiFormsVal = document.getElementById('kpiOverviewForms');
    const kpiFormsSub = document.getElementById('kpiOverviewFormsSub');

    const totalForms = forms.length;
    const formsPct = totalForms ? Math.round((filledFormsCount / totalForms) * 100) : 0;

    if (formsPill) formsPill.textContent = totalForms > 0 ? `${filledFormsCount}/${totalForms}` : '0/0';
    if (formsHeadline) formsHeadline.textContent = totalForms > 0 ? `${filledFormsCount} of ${totalForms} Forms Filled by This Student` : '0 Feedback Forms Available';
    if (formsPctBadge) {
        formsPctBadge.innerHTML = totalForms > 0
            ? `<span style="background:${formsPct >= 80 ? '#dcfce7' : '#fef3c7'}; color:${formsPct >= 80 ? '#15803d' : '#b45309'}; font-weight:700; padding:4px 12px; border-radius:20px; font-size:13px;">${formsPct}% Completed</span>`
            : `<span style="background:var(--border-light); color:var(--text-muted); font-weight:700; padding:4px 12px; border-radius:20px; font-size:13px;">No Forms</span>`;
    }
    if (kpiFormsVal) kpiFormsVal.textContent = `${filledFormsCount} / ${totalForms}`;
    if (kpiFormsSub) kpiFormsSub.textContent = totalForms > 0 ? `${formsPct}% Forms Completed` : 'No Feedback Forms';

    // 8. Switch to initial tab and open
    switchProfileModalTab(initialTab);

    const modal = document.getElementById('studentProfileModal');
    if (modal) modal.classList.add('open');

    try { lucide.createIcons(); } catch(e) {}

    if (targetDate) {
        setTimeout(() => {
            const dateCard = document.getElementById(`date-card-${studentEnrollStr}-${targetDate}`);
            if (dateCard) {
                dateCard.classList.add('open');
                dateCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                try { lucide.createIcons(); } catch(e) {}
            }
        }, 120);
    }
};

window.openResultModal = function(enroll) {
    const student = studentsData.find(s => String(s.enroll).trim() === String(enroll).trim());
    if (!student) return;

    const nameEl   = document.getElementById('resultStudentName');
    const enrollEl = document.getElementById('resultStudentEnroll');
    const gpaEl    = document.getElementById('resultGpaVal');
    const cgpaEl   = document.getElementById('resultCgpaVal');
    const tbody    = document.getElementById('resultSubjectsBody');

    if (nameEl)   nameEl.textContent = `${student.name} · Academic Results`;
    if (enrollEl) enrollEl.innerHTML = `Enrollment: <code>${student.enroll}</code> &nbsp;•&nbsp; Sem 3 (${CLASS_NAME})`;

    if (gpaEl)  gpaEl.textContent = '—';
    if (cgpaEl) cgpaEl.textContent = '—';

    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:32px; color:var(--text-muted);">
                    <div style="font-size:24px; margin-bottom:6px;">📊</div>
                    <strong>No Academic Results in Database</strong><br>
                    <span style="font-size:12px;">No semester or mid-sem exam marks have been published for this student yet.</span>
                </td>
            </tr>`;
    }

    const modal = document.getElementById('resultModal');
    if (modal) modal.classList.add('open');
    try { lucide.createIcons(); } catch(e) {}
};

window.closeResultModal = function() {
    const modal = document.getElementById('resultModal');
    if (modal) modal.classList.remove('open');
};

window.exportMatrixCSV = function() {
    if (!studentsData || studentsData.length === 0) {
        alert('No students to export.');
        return;
    }
    const datesHeaders = (attendanceDates || []).map(d => `"${d.date} (${d.day})"`).join(',');
    let csv = `#,Enrollment,Name,Batch,Tutorial,Overall Attendance %,${datesHeaders}\n`;

    studentsData.forEach((s, idx) => {
        const rowDates = (attendanceDates || []).map(d => {
            const studentSessions = (d.sessions || []).filter(sess =>
                sess.records && sess.records.some(r => String(r.enroll).trim() === String(s.enroll).trim())
            );
            const total = studentSessions.length;
            const attended = studentSessions.filter(sess =>
                sess.records.some(r => String(r.enroll).trim() === String(s.enroll).trim() && Boolean(r.present))
            ).length;
            return total > 0 ? `"${attended}/${total}"` : `"—"`;
        }).join(',');

        csv += `${idx + 1},"${s.enroll}","${s.name}","${s.batch || ''}","${s.tut || ''}","${s.att || 0}%",${rowDates}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Treva_${CLASS_NAME}_Attendance_Matrix.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.handleGlobalSearch = function(val) {
    const sInput = document.getElementById('studentSearchInput');
    if (sInput) sInput.value = val;
    switchSection('students');
    filterStudents();
};

/* =============================================
   STUDENT MANAGEMENT — Add, edit, and delete student records
   ============================================= */

// Populates batch and tutorial select options in student modal
async function populateStudentModalDropdowns(selectedBatch = '', selectedTut = '') {
    const batchSelect = document.getElementById('studBatch');
    const tutSelect = document.getElementById('studTut');
    if (!batchSelect || !tutSelect) return;

    if ((!realClassBatches || realClassBatches.length === 0) && typeof sbSelect === 'function') {
        try {
            const [bList, tList] = await Promise.all([
                sbSelect('batch', { select: 'classid,batchid,batchname' }),
                sbSelect('tutorial', { select: 'classid,tutorialid,tutorialname' })
            ]);
            if (bList && bList.length) {
                realClassBatches = bList.filter(b => Number(b.classid) === Number(currentCoordinatorClassId));
            }
            if (tList && tList.length) {
                realClassTutorials = tList.filter(t => Number(t.classid) === Number(currentCoordinatorClassId));
            }
        } catch(err) {
            console.warn('[MyClass] Failed to fetch batches/tutorials for modal:', err);
        }
    }

    // Batches
    batchSelect.innerHTML = '<option value="">— Select Batch —</option>';
    const batchList = [...(realClassBatches || [])];
    if (selectedBatch && selectedBatch !== '—' && !batchList.some(b => b.batchname === selectedBatch || String(b.batchid) === String(selectedBatch))) {
        batchList.push({ batchid: null, batchname: selectedBatch, classid: currentCoordinatorClassId });
    }
    batchList.sort((a, b) => (a.batchname || '').localeCompare(b.batchname || ''));

    batchList.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.batchname;
        opt.dataset.batchid = b.batchid || '';
        opt.textContent = b.batchname.startsWith('Batch') ? b.batchname : `Batch ${b.batchname}`;
        if (selectedBatch && (b.batchname === selectedBatch || String(b.batchid) === String(selectedBatch))) {
            opt.selected = true;
        }
        batchSelect.appendChild(opt);
    });
    if (selectedBatch && selectedBatch !== '—') {
        batchSelect.value = selectedBatch;
        if (!batchSelect.value) {
            const match = batchList.find(b => b.batchname === selectedBatch || String(b.batchid) === String(selectedBatch));
            if (match) batchSelect.value = match.batchname;
        }
    }

    // Tutorials
    tutSelect.innerHTML = '<option value="">— Select Tutorial Group —</option>';
    const tutList = [...(realClassTutorials || [])];
    if (selectedTut && selectedTut !== '—' && !tutList.some(t => t.tutorialname === selectedTut || String(t.tutorialid) === String(selectedTut))) {
        tutList.push({ tutorialid: null, tutorialname: selectedTut, classid: currentCoordinatorClassId });
    }
    tutList.sort((a, b) => (a.tutorialname || '').localeCompare(b.tutorialname || ''));

    tutList.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.tutorialname;
        opt.dataset.tutid = t.tutorialid || '';
        opt.textContent = (t.tutorialname.startsWith('Tutorial') || t.tutorialname.startsWith('Tut')) ? t.tutorialname : `Tutorial ${t.tutorialname}`;
        if (selectedTut && (t.tutorialname === selectedTut || String(t.tutorialid) === String(selectedTut))) {
            opt.selected = true;
        }
        tutSelect.appendChild(opt);
    });
    if (selectedTut && selectedTut !== '—') {
        tutSelect.value = selectedTut;
        if (!tutSelect.value) {
            const match = tutList.find(t => t.tutorialname === selectedTut || String(t.tutorialid) === String(selectedTut));
            if (match) tutSelect.value = match.tutorialname;
        }
    }
}

// Opens student modal in create or edit mode
window.openStudentModal = async function(id = null) {
    if (!id) {
        currentProfileEnroll = null;
    }
    const form = document.getElementById('studentForm');
    if (form) form.reset();

    const editIdInput = document.getElementById('studentEditId');
    if (editIdInput) editIdInput.value = id || '';

    if (id) {
        const s = studentsData.find(item => item.id === id);
        if (s) {
            document.getElementById('studentModalTitle').textContent = 'Edit Student Details';
            document.getElementById('studEnrollment').value = s.enroll || '';
            document.getElementById('studName').value        = s.name || '';
            await populateStudentModalDropdowns(s.batch, s.tut);
            const attVal = Number.isFinite(s.att) ? `${s.att}%` : '—';
            document.getElementById('studAttendance').value  = attVal;
        }
    } else {
        document.getElementById('studentModalTitle').textContent = 'Add New Student';
        await populateStudentModalDropdowns('', '');
        document.getElementById('studAttendance').value = '—';
    }
    document.getElementById('studentModal').classList.add('open');
    try { lucide.createIcons(); } catch(e){}
};

window.closeStudentModal = function() { document.getElementById('studentModal').classList.remove('open'); };

// Saves new or edited student record to database and local cache
window.saveStudent = async function(e) {
    e.preventDefault();
    const id     = document.getElementById('studentEditId').value;
    const enroll = document.getElementById('studEnrollment').value.trim();
    const name   = document.getElementById('studName').value.trim();
    const batch  = document.getElementById('studBatch').value;
    const tut    = document.getElementById('studTut').value;

    const batchOpt = document.getElementById('studBatch').selectedOptions[0];
    const tutOpt   = document.getElementById('studTut').selectedOptions[0];

    let batchId = batchOpt && batchOpt.dataset.batchid ? parseInt(batchOpt.dataset.batchid) : null;
    let tutId   = tutOpt && tutOpt.dataset.tutid ? parseInt(tutOpt.dataset.tutid) : null;

    if (!batchId && batch) {
        const foundB = realClassBatches.find(b => b.batchname === batch || String(b.batchid) === batch);
        if (foundB) batchId = foundB.batchid;
    }
    if (!tutId && tut) {
        const foundT = realClassTutorials.find(t => t.tutorialname === tut || String(t.tutorialid) === tut);
        if (foundT) tutId = foundT.tutorialid;
    }

    if (id) {
        const sId = parseInt(id);
        const idx = studentsData.findIndex(s => s.id === sId);
        if (idx !== -1) {
            studentsData[idx] = {
                ...studentsData[idx],
                enroll,
                name,
                batch: batch || '—',
                tut: tut || '—',
                batch_id: batchId,
                tutorial_id: tutId
            };
        }
        if (typeof sbUpdate === 'function') {
            try {
                const updatePayload = { enrollment_no: enroll, name };
                if (batchId) updatePayload.batch_id = batchId;
                if (tutId)   updatePayload.tutorial_id = tutId;
                await sbUpdate('student', { student_id: sId }, updatePayload);
            } catch(err) { console.warn('Supabase student update error:', err); }
        }
    } else {
        const newId = studentsData.length ? Math.max(...studentsData.map(s => s.id)) + 1 : 1;
        const newStudent = {
            id: newId,
            enroll,
            name,
            batch: batch || '—',
            tut: tut || '—',
            batch_id: batchId,
            tutorial_id: tutId,
            att: null
        };
        studentsData.unshift(newStudent);
        if (typeof sbInsert === 'function') {
            try {
                const insertPayload = {
                    enrollment_no: enroll,
                    name: name,
                    class_id: currentCoordinatorClassId
                };
                if (batchId) insertPayload.batch_id = batchId;
                if (tutId)   insertPayload.tutorial_id = tutId;
                const inserted = await sbInsert('student', insertPayload);
                if (inserted && inserted[0] && inserted[0].student_id) {
                    newStudent.id = inserted[0].student_id;
                }
            } catch(err) { console.warn('Supabase student insert error:', err); }
        }
    }
    try {
        localStorage.setItem('treva_students_' + CLASS_NAME, JSON.stringify(studentsData));
    } catch(err) {}
    closeStudentModal();
    filterStudents();
    updateBatchAndTutFilterOptions();

    // If an existing student was being edited from their profile dossier, re-open updated profile view
    if (id && currentProfileEnroll) {
        currentProfileEnroll = enroll;
        setTimeout(() => {
            if (typeof openStudentProfileModal === 'function') {
                openStudentProfileModal(enroll);
            }
        }, 80);
    }
};

window.editStudent   = function(id) { openStudentModal(id); };
let studentPendingDelete = null;

window.deleteStudent = function(id) {
    const student = studentsData.find(s => s.id === id);
    if (!student) return;
    studentPendingDelete = student;

    // Populate confirmation modal details
    const enrollEl = document.getElementById('deleteConfirmEnroll');
    const nameEl   = document.getElementById('deleteConfirmName');
    const batchEl  = document.getElementById('deleteConfirmBatch');
    if (enrollEl) enrollEl.textContent = student.enroll;
    if (nameEl)   nameEl.textContent   = student.name;
    if (batchEl)  batchEl.textContent  = `${student.batch || '—'} · ${student.tut || '—'}`;

    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
        modal.classList.add('open');
        try { lucide.createIcons(); } catch(e) {}
    }
};

window.closeDeleteConfirmModal = function() {
    studentPendingDelete = null;
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.classList.remove('open');
};

window.confirmDeleteStudentAction = async function() {
    if (!studentPendingDelete) return;
    const sId = studentPendingDelete.id;
    const sName = studentPendingDelete.name;

    const btn = document.getElementById('btnExecuteDeleteStudent');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `⏳ Deleting from Database...`;
    }

    try {
        // 1. Delete dependent child records from attendance and result if any
        if (typeof sbDelete === 'function') {
            await sbDelete('attendance', { student_id: sId }).catch(() => {});
            await sbDelete('result',     { student_id: sId }).catch(() => {});
            // 2. Delete student record from Supabase
            await sbDelete('student',    { student_id: sId });
            console.info(`[Treva] Successfully deleted student ${sId} (${sName}) from Supabase.`);
        }

        // 3. Remove from in-memory array & persist
        studentsData = studentsData.filter(s => s.id !== sId);
        currentProfileEnroll = null;
        try {
            localStorage.setItem('treva_students_' + CLASS_NAME, JSON.stringify(studentsData));
        } catch(err) {}

        // 4. Update UI
        closeDeleteConfirmModal();
        filterStudents();
        updateBatchAndTutFilterOptions();

    } catch (err) {
        console.error('[Treva] Failed to delete student from Supabase:', err);
        alert(`❌ Failed to delete student from database: ${err.message}`);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="trash-2" style="width:16px;height:16px;"></i> Delete Record`;
            try { lucide.createIcons(); } catch(e) {}
        }
    }
};

/* =============================================
   CONFIRMATION MODAL — Universal confirmation modal system
   ============================================= */

// Displays styled confirmation dialog for destructive actions
window.showConfirmModal = function({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    icon = 'alert-triangle',
    iconBg = 'rgba(239, 68, 68, 0.12)',
    iconColor = '#ef4444',
    btnText = 'Delete',
    btnIcon = 'trash-2',
    btnBg = '#dc2626',
    details = [],
    onConfirm = null
}) {
    pendingGenericConfirmAction = onConfirm;

    const modal = document.getElementById('genericConfirmModal');
    if (!modal) {
        console.warn('[Treva] #genericConfirmModal not found in DOM.');
        return;
    }

    const titleEl = document.getElementById('genConfirmTitle');
    const msgEl   = document.getElementById('genConfirmMessage');
    const wrapEl  = document.getElementById('genConfirmIconWrap');
    const detEl   = document.getElementById('genConfirmDetails');
    const btnEl   = document.getElementById('btnExecuteGenericConfirm');

    if (titleEl) titleEl.textContent = title;
    if (msgEl)   msgEl.textContent = message;

    if (wrapEl) {
        wrapEl.style.background = iconBg;
        wrapEl.style.color = iconColor;
        wrapEl.innerHTML = `<i data-lucide="${icon}" style="width: 28px; height: 28px;"></i>`;
    }

    if (detEl) {
        if (details && (Array.isArray(details) ? details.length > 0 : !!details)) {
            detEl.style.display = 'block';
            if (Array.isArray(details)) {
                detEl.innerHTML = details.map((d, i) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; ${i < details.length - 1 ? 'margin-bottom: 6px;' : ''}">
                        <span style="font-size: 12px; color: var(--text-muted);">${d.label}:</span>
                        <strong style="font-size: 13px; font-weight: 600; color: var(--text);">${d.value}</strong>
                    </div>
                `).join('');
            } else {
                detEl.innerHTML = details;
            }
        } else {
            detEl.style.display = 'none';
            detEl.innerHTML = '';
        }
    }

    if (btnEl) {
        btnEl.style.background = btnBg;
        btnEl.innerHTML = `<i data-lucide="${btnIcon}" style="width: 16px; height: 16px;"></i> <span id="genConfirmBtnText">${btnText}</span>`;
    }

    modal.classList.add('open');
    try { lucide.createIcons(); } catch(e){}
};

window.closeGenericConfirmModal = function() {
    const modal = document.getElementById('genericConfirmModal');
    if (modal) modal.classList.remove('open');
    pendingGenericConfirmAction = null;
};

window.executeGenericConfirmAction = async function() {
    if (typeof pendingGenericConfirmAction === 'function') {
        const action = pendingGenericConfirmAction;
        const btn = document.getElementById('btnExecuteGenericConfirm');
        const origContent = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `⏳ Processing...`;
        }
        try {
            await action();
        } catch(err) {
            console.error('[Treva] Error executing confirmed action:', err);
        } finally {
            closeGenericConfirmModal();
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = origContent;
                try { lucide.createIcons(); } catch(e){}
            }
        }
    } else {
        closeGenericConfirmModal();
    }
};

(function initConfirmModalListeners() {
    const attach = () => {
        const genModal = document.getElementById('genericConfirmModal');
        if (genModal && !genModal._hasBackdropClick) {
            genModal._hasBackdropClick = true;
            genModal.addEventListener('click', (e) => {
                if (e.target === genModal) closeGenericConfirmModal();
            });
        }
        const delModal = document.getElementById('deleteConfirmModal');
        if (delModal && !delModal._hasBackdropClick) {
            delModal._hasBackdropClick = true;
            delModal.addEventListener('click', (e) => {
                if (e.target === delModal) closeDeleteConfirmModal();
            });
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attach);
    } else {
        attach();
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const studentModal = document.getElementById('studentModal');
            if (studentModal && studentModal.classList.contains('open')) closeStudentModal();
            const genModal = document.getElementById('genericConfirmModal');
            if (genModal && genModal.classList.contains('open')) closeGenericConfirmModal();
            const delModal = document.getElementById('deleteConfirmModal');
            if (delModal && delModal.classList.contains('open')) closeDeleteConfirmModal();
        }
    });
})();

/* =============================================
   TIMETABLE CRUD — Weekly schedule rendering, conflict detection, and slot management
   ============================================= */

let currentTTBatchFilter = 'all';
let rawTimetableSlots = [];

// Filters weekly timetable cards by active batch
window.filterTTByBatch = function(batch) {
    currentTTBatchFilter = batch;
    document.querySelectorAll('.batch-tt-chip').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-batch') === batch);
    });
    renderTimetable();
};

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

function updateTimetableBatchChips(batches) {
    const bar = document.querySelector('.batch-tt-bar');
    if (!bar) return;
    const batchList = (batches && batches.length > 0) ? batches : [`${CLASS_NAME}1`, `${CLASS_NAME}2`, `${CLASS_NAME}3`];
    bar.innerHTML = `
        <span style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.4px;">
            Batch View:
        </span>
        <button class="batch-tt-chip ${currentTTBatchFilter === 'all' ? 'active' : ''}" data-batch="all" onclick="filterTTByBatch('all')">All Batches</button>
        ${batchList.map(b => `<button class="batch-tt-chip ${currentTTBatchFilter === b ? 'active' : ''}" data-batch="${b}" onclick="filterTTByBatch('${b}')">${b}</button>`).join('')}
    `;
}

async function loadMyClassTimetableFromSupabase() {
    if (typeof sbSelect !== 'function') return;
    const container = document.getElementById('ttCardsContainer');
    if (container && (!rawTimetableSlots || rawTimetableSlots.length === 0)) {
        container.innerHTML = getTrevaLoadingHtml('Loading Weekly Timetable...', 'Fetching scheduled slots from database');
    }
    try {
        const [slots, batches, tutorials] = await Promise.all([
            sbSelect('timetable_slot', {
                select: 'slotid,classid,room,slot_type,day_of_week,start_time,end_time,batchid,tutorialid,subject(subjectname,subjectcode),teacher(fullname),class(classname)',
                order: 'day_of_week.asc,start_time.asc'
            }),
            sbSelect('batch', { select: 'classid,batchid,batchname' }),
            sbSelect('tutorial', { select: 'classid,tutorialid,tutorialname' })
        ]);

        if (!slots || slots.length === 0) return;

        const batchMap = {};
        (batches || []).forEach(b => { batchMap[b.batchid] = b.batchname; });

        const tutMap = {};
        (tutorials || []).forEach(t => { tutMap[t.tutorialid] = t.tutorialname; });

        // Filter slots for current coordinator class (e.g. CO32, classid 32)
        const classSlots = slots.filter(s => {
            if (s.class && s.class.classname) return s.class.classname.toUpperCase() === CLASS_NAME.toUpperCase();
            return Number(s.classid) === Number(currentCoordinatorClassId);
        });

        if (classSlots.length === 0) return;

        const dayMap = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };

        rawTimetableSlots = classSlots.map(s => {
            const bName = batchMap[s.batchid] || `CO${s.batchid}`;
            const tName = tutMap[s.tutorialid] || (s.tutorialid ? `${CLASS_NAME}T${s.tutorialid}` : '—');
            const subTitle = s.subject ? `${s.subject.subjectname}${s.subject.subjectcode ? ` (${s.subject.subjectcode})` : ''}` : 'Subject';
            return {
                id: s.slotid,
                day: dayMap[s.day_of_week] || 'Mon',
                dayNum: s.day_of_week,
                startTime: s.start_time,
                endTime: s.end_time,
                time: formatTimeSlotRange(s.start_time, s.end_time),
                sub: subTitle,
                subName: s.subject ? s.subject.subjectname : '',
                subCode: s.subject ? s.subject.subjectcode : '',
                type: s.slot_type || 'Lecture',
                fac: s.teacher ? s.teacher.fullname : '—',
                loc: s.room || '—',
                batchId: s.batchid,
                batchName: bName,
                tutId: s.tutorialid,
                tutName: tName
            };
        });

        const distinctBatches = [...new Set(rawTimetableSlots.map(s => s.batchName).filter(Boolean))].sort();
        if (distinctBatches.length > 0) {
            updateTimetableBatchChips(distinctBatches);
        } else {
            updateTimetableBatchChips([`${CLASS_NAME}1`, `${CLASS_NAME}2`, `${CLASS_NAME}3`]);
        }

        timetableData = [...rawTimetableSlots];
        rebuildGlobalIndexForClass();
        renderTimetable();
        console.info('[MyClass] Loaded', rawTimetableSlots.length, 'timetable slots from Supabase for class', CLASS_NAME);
    } catch (e) {
        console.warn('[MyClass] Failed to load timetable from Supabase:', e);
    }
}

window.switchDay = function(day) {
    currentDay = day;
    document.querySelectorAll('.day-tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-day') === day));
    renderTimetable();
};

window.renderTimetable = function() {
    const container = document.getElementById('ttCardsContainer');
    if (!container) return;

    let daySlots = [];
    if (rawTimetableSlots && rawTimetableSlots.length > 0) {
        daySlots = rawTimetableSlots.filter(t => t.day === currentDay);
    } else {
        daySlots = timetableData.filter(t => t.day === currentDay);
    }

    if (daySlots.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1; padding:36px; text-align:center; color:var(--text-muted); background:var(--bg); border-radius:var(--radius-sm); border:1px dashed var(--border);">
            <i data-lucide="calendar" style="width:28px;height:28px;margin-bottom:8px;display:block;margin-inline:auto;opacity:0.6;"></i>
            No lectures scheduled for ${currentDay}. Click "+ Add Lecture Slot" to create one.
        </div>`;
        try { lucide.createIcons(); } catch(e){}
        return;
    }

    let cardsToRender = [];

    if (currentTTBatchFilter === 'all') {
        const byTime = {};
        for (const slot of daySlots) {
            const k = (slot.startTime || slot.time) + '-' + (slot.endTime || '');
            if (!byTime[k]) byTime[k] = [];
            byTime[k].push(slot);
        }

        for (const [timeK, list] of Object.entries(byTime)) {
            const sessionMap = new Map();
            for (const item of list) {
                const sig = [item.subName || item.sub, item.fac, item.loc, item.type].join('|');
                if (!sessionMap.has(sig)) {
                    sessionMap.set(sig, {
                        ...item,
                        slotIds: [item.id],
                        batches: item.batchName ? [item.batchName] : [],
                        tuts: item.tutName ? [item.tutName] : []
                    });
                } else {
                    const sess = sessionMap.get(sig);
                    sess.slotIds.push(item.id);
                    if (item.batchName && !sess.batches.includes(item.batchName)) sess.batches.push(item.batchName);
                    if (item.tutName && !sess.tuts.includes(item.tutName)) sess.tuts.push(item.tutName);
                }
            }

            for (const sess of sessionMap.values()) {
                const isAllBatches = sess.batches.length >= 3;
                let badgeHtml = '';
                if (isAllBatches) {
                    badgeHtml = `<span class="tt-badge all"><i data-lucide="users" style="width:11px;height:11px;"></i> All Batches</span>`;
                } else if (sess.type === 'Tutorial') {
                    badgeHtml = `<span class="tt-badge tut"><i data-lucide="bookmark" style="width:11px;height:11px;"></i> ${sess.tuts.join(', ')}</span>`;
                } else {
                    badgeHtml = `<span class="tt-badge batch"><i data-lucide="tag" style="width:11px;height:11px;"></i> Batch ${sess.batches.join(', ')}</span>`;
                }
                sess.badgeHtml = badgeHtml;
                cardsToRender.push(sess);
            }
        }
    } else {
        const batchSlots = daySlots.filter(s => s.batchName === currentTTBatchFilter);
        for (const slot of batchSlots) {
            let badgeHtml = '';
            if (slot.type === 'Tutorial') {
                badgeHtml = `<span class="tt-badge tut"><i data-lucide="bookmark" style="width:11px;height:11px;"></i> Tutorial ${slot.tutName}</span>`;
            } else if (slot.type === 'Lab') {
                badgeHtml = `<span class="tt-badge batch"><i data-lucide="tag" style="width:11px;height:11px;"></i> Batch ${slot.batchName}</span>`;
            } else {
                badgeHtml = `<span class="tt-badge all"><i data-lucide="users" style="width:11px;height:11px;"></i> All Batches</span>`;
            }
            cardsToRender.push({
                ...slot,
                slotIds: [slot.id],
                badgeHtml
            });
        }
    }

    if (cardsToRender.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1; padding:36px; text-align:center; color:var(--text-muted); background:var(--bg); border-radius:var(--radius-sm); border:1px dashed var(--border);">
            No lectures scheduled for ${currentDay} for Batch ${currentTTBatchFilter}.
        </div>`;
        return;
    }

    const today = todayStr();
    const log = (typeof TrevaAttendance !== 'undefined') ? TrevaAttendance.getLog() : getAttendanceLog();

    container.innerHTML = cardsToRender.map(slot => {
        const typeClass = slot.type === 'Lab' ? 'lab' : (slot.type === 'Tutorial' ? 'tut' : '');
        const idParam = (slot.slotIds && slot.slotIds.length > 0) ? JSON.stringify(slot.slotIds) : `[${slot.id}]`;
        const sIds = (slot.slotIds || [slot.id]).map(String);
        const session = log.find(l => {
            const lId = String(l.slotId);
            return lId === String(slot.id) || sIds.includes(lId) || (l.slotIds && l.slotIds.map(String).some(x => sIds.includes(x)));
        });

        let attFooter = '';
        if (session && session.stats) {
            const pct = session.stats.pct ?? 0;
            const isHigh = pct >= 75;
            const badgeBg = isHigh ? 'rgba(21, 128, 61, 0.12)' : 'rgba(220, 38, 38, 0.12)';
            const badgeCol = isHigh ? '#15803D' : '#DC2626';
            attFooter = `
                <div class="tt-card-footer" style="margin-top:12px; padding-top:10px; border-top:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:8px;">
                    <span style="background:${badgeBg}; color:${badgeCol}; font-weight:700; font-size:12px; padding:3px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:4px;">
                        <i data-lucide="check-circle-2" style="width:13px;height:13px;"></i> ${session.stats.present}/${session.stats.total} (${pct}%)
                    </span>
                    <button class="tt-att-btn edit" style="padding:4px 10px; font-size:12px; border-radius:6px; border:1px solid var(--border); background:var(--surface); cursor:pointer; font-weight:600; display:inline-flex; align-items:center; gap:4px;" onclick="event.stopPropagation(); openAttendanceModal(${slot.id})">
                        <i data-lucide="edit-2" style="width:13px;height:13px;"></i> Edit
                    </button>
                </div>`;
        } else {
            attFooter = `
                <div class="tt-card-footer" style="margin-top:12px; padding-top:10px; border-top:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:8px;">
                    <span style="color:var(--text-muted); font-size:11.5px; display:inline-flex; align-items:center; gap:4px;">
                        <i data-lucide="clock" style="width:13px;height:13px;"></i> Pending
                    </span>
                    <button class="tt-att-btn take" style="padding:4px 10px; font-size:12px; border-radius:6px; border:none; background:var(--primary); color:#fff; cursor:pointer; font-weight:600; display:inline-flex; align-items:center; gap:4px;" onclick="event.stopPropagation(); openAttendanceModal(${slot.id})">
                        <i data-lucide="clipboard-check" style="width:13px;height:13px;"></i> Take Attendance
                    </button>
                </div>`;
        }

        return `
            <div class="tt-card ${typeClass}" style="cursor:pointer;" onclick="openAttendanceModal(${slot.id})">
                <div class="tt-card-actions">
                    <button class="action-icon-btn" title="Edit Slot" onclick="event.stopPropagation(); editTimetableSlot(${slot.id})">
                        <i data-lucide="edit-2"></i>
                    </button>
                    <button class="action-icon-btn danger" title="Delete Slot" onclick='event.stopPropagation(); deleteTimetableSlot(${slot.id}, ${idParam})'>
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
                <div class="tt-card-time"><i data-lucide="clock"></i> ${slot.time}</div>
                <div class="tt-card-sub">${slot.sub}</div>
                <div class="tt-card-code" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                    <span>${slot.type} Session · ${CLASS_NAME}</span>
                    ${slot.badgeHtml || ''}
                </div>
                <div class="tt-card-meta">
                    <div class="tt-card-meta-row"><i data-lucide="user-check"></i><span><strong>Faculty:</strong> ${slot.fac}</span></div>
                    <div class="tt-card-meta-row"><i data-lucide="map-pin"></i><span><strong>Room / Lab:</strong> ${slot.loc}</span></div>
                </div>
                ${attFooter}
            </div>`;
    }).join('');
    try { lucide.createIcons(); } catch(e){}
};


/** Populate all <select> dropdowns in the timetable modal from master data */
function populateTTDropdowns() {
    const rooms    = getMasterRooms();
    const teachers = getMasterTeachers();
    const subjects = getMasterSubjects();

    const subSel = document.getElementById('ttSubject');
    const facSel = document.getElementById('ttFaculty');
    const locSel = document.getElementById('ttLocation');

    if (subSel) {
        subSel.innerHTML = `<option value="">— Select Subject —</option>` +
            subjects.map(s => `<option value="${s.name} (${s.code})">${s.name} (${s.code})</option>`).join('');
    }
    if (facSel) {
        facSel.innerHTML = `<option value="">— Select Faculty —</option>` +
            teachers.map(t => `<option value="${t.name}">${t.name} · ${t.dept}</option>`).join('');
    }
    if (locSel) {
        locSel.innerHTML = `<option value="">— Select Room / Lab —</option>` +
            rooms.map(r => `<option value="${r.name}">${r.name} (${r.type}, Cap: ${r.capacity})</option>`).join('');
    }
}

window.openTimetableModal = function(id = null) {
    document.getElementById('ttForm').reset();
    document.getElementById('ttEditId').value = id || '';
    document.getElementById('ttDay').value = currentDay;
    populateTTDropdowns();

    // Clear conflict warning
    const warn = document.getElementById('ttConflictWarn');
    if (warn) warn.style.display = 'none';

    if (id) {
        const slot = timetableData.find(item => item.id === id);
        if (slot) {
            document.getElementById('ttModalTitle').textContent = 'Edit Timetable Slot';
            document.getElementById('ttDay').value     = slot.day;
            document.getElementById('ttType').value    = slot.type;
            document.getElementById('ttSubject').value = slot.sub;
            document.getElementById('ttTime').value    = slot.time;
            document.getElementById('ttLocation').value= slot.loc;
            document.getElementById('ttFaculty').value = slot.fac;
        }
    } else {
        document.getElementById('ttModalTitle').textContent = 'Add Lecture Slot';
    }
    document.getElementById('timetableModal').classList.add('open');
    try { lucide.createIcons(); } catch(e){}
};

window.closeTimetableModal = function() { document.getElementById('timetableModal').classList.remove('open'); };

/** Live conflict check as user changes room / time / day */
window.checkTTConflictLive = function() {
    const day  = document.getElementById('ttDay').value;
    const time = document.getElementById('ttTime').value.trim();
    const room = document.getElementById('ttLocation').value;
    const id   = document.getElementById('ttEditId').value;
    const warn = document.getElementById('ttConflictWarn');
    if (!warn) return;
    if (!room || !time) { warn.style.display = 'none'; return; }
    const result = checkRoomConflict(day, time, room, id ? parseInt(id) : null);
    if (result.conflict) {
        warn.textContent = `⚠ Conflict! ${room} at ${day} ${time} is already occupied by ${result.byClass}.`;
        warn.style.display = 'block';
    } else {
        warn.style.display = 'none';
    }
};

window.saveTimetableSlot = function(e) {
    e.preventDefault();
    const id   = document.getElementById('ttEditId').value;
    const day  = document.getElementById('ttDay').value;
    const type = document.getElementById('ttType').value;
    const sub  = document.getElementById('ttSubject').value;
    const time = document.getElementById('ttTime').value.trim();
    const loc  = document.getElementById('ttLocation').value;
    const fac  = document.getElementById('ttFaculty').value;

    // Final conflict check before saving
    const result = checkRoomConflict(day, time, loc, id ? parseInt(id) : null);
    if (result.conflict) {
        alert(`Cannot save! ${loc} at ${day} ${time} is already occupied by ${result.byClass}.\nPlease choose a different room or time.`);
        return;
    }

    if (id) {
        const idx = timetableData.findIndex(t => t.id === parseInt(id));
        if (idx !== -1) timetableData[idx] = { id: parseInt(id), day, type, sub, time, loc, fac };
    } else {
        const newId = timetableData.length ? Math.max(...timetableData.map(t => t.id)) + 1 : 1;
        timetableData.push({ id: newId, day, type, sub, time, loc, fac });
    }

    rebuildGlobalIndexForClass();
    currentDay = day;
    document.querySelectorAll('.day-tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-day') === day));
    closeTimetableModal();
    renderTimetable();
};

window.editTimetableSlot = function(id) { openTimetableModal(id); };
window.deleteTimetableSlot = function(id, slotIds = null) {
    const slot = (rawTimetableSlots && rawTimetableSlots.length > 0)
        ? rawTimetableSlots.find(t => t.id === id)
        : timetableData.find(t => t.id === id);
    if (!slot) return;

    const idsToDelete = (Array.isArray(slotIds) && slotIds.length > 0) ? slotIds : [id];

    showConfirmModal({
        title: 'Delete Timetable Slot?',
        message: idsToDelete.length > 1
            ? `Are you sure you want to remove this timetable slot for all batches? (${idsToDelete.length} linked records will be deleted from database).`
            : 'Are you sure you want to remove this timetable slot? It will be permanently removed from the class schedule.',
        icon: 'alert-triangle',
        iconBg: 'rgba(239, 68, 68, 0.12)',
        iconColor: '#ef4444',
        btnText: 'Delete Slot',
        btnIcon: 'trash-2',
        btnBg: '#dc2626',
        details: [
            { label: 'Day & Time', value: `${slot.day} · ${slot.time}` },
            { label: 'Subject', value: `${slot.sub} (${slot.type || 'Lecture'})` },
            { label: 'Room / Faculty', value: `${slot.loc || '—'} · ${slot.fac || '—'}` }
        ],
        onConfirm: async () => {
            try {
                if (typeof sbDelete === 'function') {
                    for (const sId of idsToDelete) {
                        await sbDelete('timetable_slot', { slotid: `eq.${sId}` });
                    }
                }
            } catch(e) {
                console.warn('[MyClass] Failed to delete from Supabase:', e);
            }
            rawTimetableSlots = rawTimetableSlots.filter(t => !idsToDelete.includes(t.id));
            timetableData = timetableData.filter(t => !idsToDelete.includes(t.id));
            rebuildGlobalIndexForClass();
            renderTimetable();
        }
    });
};

/* =============================================
   EXAMS CRUD — Scheduled exams, mid-terms, and viva management
   ============================================= */

// Renders scheduled exam cards in grid layout
window.renderExams = function() {
    const container = document.getElementById('examGridContainer');
    if (!container) return;
    if (examsData.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1; padding:30px; text-align:center; color:var(--text-muted); background:var(--bg); border-radius:var(--radius-sm)">No exams scheduled yet. Click "+ Create New Exam" above.</div>`;
        return;
    }
    container.innerHTML = examsData.map(e => `
        <div class="exam-card">
            <div class="exam-card-head">
                <div class="exam-title">${e.title}</div>
                <span class="exam-type-pill">${e.type}</span>
            </div>
            <div style="font-size:13.5px; font-weight:600; color:var(--primary);">${e.sub}</div>
            <div class="exam-details">
                <div class="exam-details-row"><i data-lucide="calendar"></i><span><strong>Date:</strong> ${e.date}</span></div>
                <div class="exam-details-row"><i data-lucide="clock"></i><span><strong>Time:</strong> ${e.time}</span></div>
                <div class="exam-details-row"><i data-lucide="map-pin"></i><span><strong>Location:</strong> ${e.room}</span></div>
            </div>
            <div class="exam-foot">
                <span class="exam-marks">Max Marks: ${e.marks}</span>
                <button class="action-icon-btn danger" title="Delete Exam" onclick="deleteExam(${e.id})">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </div>`).join('');
    try { lucide.createIcons(); } catch(err){}
};

window.openExamModal  = function() { document.getElementById('examForm').reset(); document.getElementById('examModal').classList.add('open'); try { lucide.createIcons(); } catch(e){} };
window.closeExamModal = function() { document.getElementById('examModal').classList.remove('open'); };

window.saveExam = function(e) {
    e.preventDefault();
    const newId = examsData.length ? Math.max(...examsData.map(x => x.id)) + 1 : 1;
    examsData.unshift({
        id: newId,
        title:  document.getElementById('examTitle').value.trim(),
        sub:    document.getElementById('examSubject').value.trim(),
        type:   document.getElementById('examType').value,
        date:   document.getElementById('examDate').value,
        time:   document.getElementById('examTime').value.trim(),
        room:   document.getElementById('examRoom').value.trim(),
        marks:  parseInt(document.getElementById('examMarks').value) || 30
    });
    closeExamModal();
    renderExams();
};

window.deleteExam = function(id) {
    const e = examsData.find(x => x.id === id);
    if (!e) return;
    showConfirmModal({
        title: 'Delete Scheduled Exam?',
        message: 'Are you sure you want to delete this scheduled exam? This exam entry will be permanently removed.',
        icon: 'alert-triangle',
        iconBg: 'rgba(239, 68, 68, 0.12)',
        iconColor: '#ef4444',
        btnText: 'Delete Exam',
        btnIcon: 'trash-2',
        btnBg: '#dc2626',
        details: [
            { label: 'Exam Title', value: e.title },
            { label: 'Type & Total Marks', value: `${e.type} · ${e.marks || 30} Marks` },
            { label: 'Date & Time', value: `${e.date} · ${e.time || '—'}` },
            { label: 'Room', value: e.room || '—' }
        ],
        onConfirm: () => {
            examsData = examsData.filter(x => x.id !== id);
            renderExams();
        }
    });
};

/* =============================================
   RESOURCES CRUD — Google Drive resource links and reference materials
   ============================================= */

// Renders shared Google Drive resources in card grid
window.renderResources = function() {
    const container = document.getElementById('resourceGridContainer');
    if (!container) return;
    if (resourcesData.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1; padding:30px; text-align:center; color:var(--text-muted); background:var(--bg); border-radius:var(--radius-sm)">No Google Drive resources shared yet. Click "+ Add Google Drive Link" above.</div>`;
        return;
    }
    container.innerHTML = resourcesData.map(r => `
        <div class="resource-card">
            <div>
                <div class="resource-head">
                    <div class="res-icon"><i data-lucide="folder-git-2"></i></div>
                    <div>
                        <div class="res-title">${r.title}</div>
                        <div class="res-subject">${r.sub} · ${r.cat}</div>
                    </div>
                </div>
                <div class="res-desc">${r.desc}</div>
            </div>
            <div class="res-actions">
                <a href="${r.url}" target="_blank" class="res-link-btn" title="Open Google Drive">
                    <i data-lucide="external-link"></i> Open Drive
                </a>
                <button class="action-icon-btn danger" title="Delete Resource" onclick="deleteResource(${r.id})">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </div>`).join('');
    try { lucide.createIcons(); } catch(e){}
};

window.openResourceModal  = function() { document.getElementById('resForm').reset(); document.getElementById('resourceModal').classList.add('open'); try { lucide.createIcons(); } catch(e){} };
window.closeResourceModal = function() { document.getElementById('resourceModal').classList.remove('open'); };

window.saveResource = function(e) {
    e.preventDefault();
    const newId = resourcesData.length ? Math.max(...resourcesData.map(x => x.id)) + 1 : 1;
    resourcesData.unshift({
        id: newId,
        title: document.getElementById('resTitle').value.trim(),
        sub:   document.getElementById('resSubject').value.trim(),
        cat:   document.getElementById('resCategory').value,
        url:   document.getElementById('resUrl').value.trim(),
        desc:  document.getElementById('resDesc').value.trim()
    });
    closeResourceModal();
    renderResources();
};

window.deleteResource = function(id) {
    const r = resourcesData.find(x => x.id === id);
    if (!r) return;
    showConfirmModal({
        title: 'Remove Drive Resource?',
        message: 'Are you sure you want to remove this Google Drive resource link? Students and teachers will no longer see this shared reference.',
        icon: 'alert-triangle',
        iconBg: 'rgba(239, 68, 68, 0.12)',
        iconColor: '#ef4444',
        btnText: 'Remove Resource',
        btnIcon: 'trash-2',
        btnBg: '#dc2626',
        details: [
            { label: 'Resource Title', value: r.title },
            { label: 'Subject & Category', value: `${r.sub} · ${r.cat}` },
            { label: 'Link URL', value: r.url && r.url.length > 35 ? r.url.substring(0, 32) + '...' : (r.url || '—') }
        ],
        onConfirm: () => {
            resourcesData = resourcesData.filter(x => x.id !== id);
            renderResources();
        }
    });
};

/* =============================================
   SETUP MASTER DATA — Rooms, teachers, and subjects configuration
   ============================================= */

// Loads institutional master data (teachers, subjects) from Supabase
async function loadSetupDataFromSupabase() {
    if (typeof sbSelect !== 'function') return;
    try {
        const [teachers, subjects] = await Promise.all([
            sbSelect('teacher', { select: 'teacherid,fullname,department,collegename', order: 'teacherid.asc' }),
            sbSelect('subject', { select: 'subjectid,subjectname,subjectcode,subjecttype,semid', order: 'subjectid.asc' })
        ]);
        if (teachers && teachers.length > 0) {
            const mapped = teachers.map(t => ({
                id: t.teacherid,
                name: t.fullname || 'Faculty',
                dept: t.department || 'Computer Engineering'
            }));
            saveMasterTeachers(mapped);
            renderTeachersList();
        }
        if (subjects && subjects.length > 0) {
            const mapped = subjects.map(s => ({
                id: s.subjectid,
                name: s.subjectname || 'Subject',
                code: s.subjectcode || '',
                type: s.subjecttype || 'Theory'
            }));
            saveMasterSubjects(mapped);
            renderSubjectsList();
        }
    } catch(err) {
        console.warn('[MyClass] Failed to load setup data from Supabase:', err);
    }
}

window.renderSetup = function() {
    renderRoomsList();
    renderTeachersList();
    renderSubjectsList();
};

// ---- ROOMS ----
window.renderRoomsList = function() {
    const container = document.getElementById('roomsListContainer');
    if (!container) return;
    const rooms = getMasterRooms();
    if (rooms.length === 0) {
        container.innerHTML = `<p class="setup-empty">No rooms added yet.</p>`;
        return;
    }
    container.innerHTML = rooms.map(r => `
        <div class="setup-item">
            <div class="setup-item-info">
                <span class="setup-item-name"><i data-lucide="door-open"></i> ${r.name}</span>
                <span class="setup-item-meta">${r.type} · Cap: ${r.capacity}</span>
            </div>
            <div class="setup-item-actions">
                <button class="action-icon-btn" title="Edit" onclick="editRoom(${r.id})"><i data-lucide="edit-3"></i></button>
                <button class="action-icon-btn danger" title="Delete" onclick="deleteRoom(${r.id})"><i data-lucide="trash-2"></i></button>
            </div>
        </div>`).join('');
    try { lucide.createIcons(); } catch(e){}
};

window.openRoomModal = function(id = null) {
    document.getElementById('roomForm').reset();
    document.getElementById('roomEditId').value = id || '';
    if (id) {
        const r = getMasterRooms().find(x => x.id === id);
        if (r) {
            document.getElementById('roomModalTitle').textContent = 'Edit Room';
            document.getElementById('roomName').value     = r.name;
            document.getElementById('roomCapacity').value = r.capacity;
            document.getElementById('roomType').value     = r.type;
        }
    } else {
        document.getElementById('roomModalTitle').textContent = 'Add Room / Lab';
    }
    document.getElementById('roomModal').classList.add('open');
    try { lucide.createIcons(); } catch(e){}
};

window.closeRoomModal = function() { document.getElementById('roomModal').classList.remove('open'); };

window.saveRoom = function(e) {
    e.preventDefault();
    const id       = document.getElementById('roomEditId').value;
    const name     = document.getElementById('roomName').value.trim();
    const capacity = parseInt(document.getElementById('roomCapacity').value) || 30;
    const type     = document.getElementById('roomType').value;
    const rooms    = getMasterRooms();
    if (id) {
        const idx = rooms.findIndex(r => r.id === parseInt(id));
        if (idx !== -1) rooms[idx] = { id: parseInt(id), name, capacity, type };
    } else {
        const newId = rooms.length ? Math.max(...rooms.map(r => r.id)) + 1 : 1;
        rooms.push({ id: newId, name, capacity, type });
    }
    saveMasterRooms(rooms);
    closeRoomModal();
    renderRoomsList();
};

window.editRoom   = function(id) { openRoomModal(id); };
window.deleteRoom = function(id) {
    const r = getMasterRooms().find(x => x.id === id);
    if (!r) return;
    showConfirmModal({
        title: 'Delete Room from Master List?',
        message: 'Are you sure you want to delete this room? It will be removed from available rooms in timetable slot creation.',
        icon: 'alert-triangle',
        iconBg: 'rgba(239, 68, 68, 0.12)',
        iconColor: '#ef4444',
        btnText: 'Delete Room',
        btnIcon: 'trash-2',
        btnBg: '#dc2626',
        details: [
            { label: 'Room Name', value: r.name },
            { label: 'Room Type', value: r.type || 'Classroom' },
            { label: 'Capacity', value: `${r.capacity || '—'} Seats` }
        ],
        onConfirm: () => {
            saveMasterRooms(getMasterRooms().filter(x => x.id !== id));
            renderRoomsList();
        }
    });
};

// ---- TEACHERS ----
window.renderTeachersList = function() {
    const container = document.getElementById('teachersListContainer');
    if (!container) return;
    const teachers = getMasterTeachers();
    if (teachers.length === 0) {
        container.innerHTML = `<p class="setup-empty">No teachers added yet.</p>`;
        return;
    }
    container.innerHTML = teachers.map(t => `
        <div class="setup-item">
            <div class="setup-item-info">
                <span class="setup-item-name"><i data-lucide="user-check"></i> ${t.name}</span>
                <span class="setup-item-meta">${t.dept}</span>
            </div>
            <div class="setup-item-actions">
                <button class="action-icon-btn" title="Edit" onclick="editTeacher(${t.id})"><i data-lucide="edit-3"></i></button>
                <button class="action-icon-btn danger" title="Delete" onclick="deleteTeacher(${t.id})"><i data-lucide="trash-2"></i></button>
            </div>
        </div>`).join('');
    try { lucide.createIcons(); } catch(e){}
};

window.openTeacherModal = function(id = null) {
    document.getElementById('teacherForm').reset();
    document.getElementById('teacherEditId').value = id || '';
    if (id) {
        const t = getMasterTeachers().find(x => x.id === id);
        if (t) {
            document.getElementById('teacherModalTitle').textContent = 'Edit Teacher';
            document.getElementById('teacherName').value = t.name;
            document.getElementById('teacherDept').value = t.dept;
        }
    } else {
        document.getElementById('teacherModalTitle').textContent = 'Add Teacher';
    }
    document.getElementById('teacherModal').classList.add('open');
    try { lucide.createIcons(); } catch(e){}
};

window.closeTeacherModal = function() { document.getElementById('teacherModal').classList.remove('open'); };

window.saveTeacher = function(e) {
    e.preventDefault();
    const id      = document.getElementById('teacherEditId').value;
    const name    = document.getElementById('teacherName').value.trim();
    const dept    = document.getElementById('teacherDept').value.trim();
    const teachers = getMasterTeachers();
    if (id) {
        const idx = teachers.findIndex(t => t.id === parseInt(id));
        if (idx !== -1) teachers[idx] = { id: parseInt(id), name, dept, subjects: teachers[idx].subjects || [] };
    } else {
        const newId = teachers.length ? Math.max(...teachers.map(t => t.id)) + 1 : 1;
        teachers.push({ id: newId, name, dept, subjects: [] });
    }
    saveMasterTeachers(teachers);
    closeTeacherModal();
    renderTeachersList();
};

window.editTeacher   = function(id) { openTeacherModal(id); };
window.deleteTeacher = function(id) {
    const t = getMasterTeachers().find(x => x.id === id);
    if (!t) return;
    showConfirmModal({
        title: 'Delete Faculty Member?',
        message: 'Are you sure you want to remove this teacher from the master directory?',
        icon: 'alert-triangle',
        iconBg: 'rgba(239, 68, 68, 0.12)',
        iconColor: '#ef4444',
        btnText: 'Delete Teacher',
        btnIcon: 'trash-2',
        btnBg: '#dc2626',
        details: [
            { label: 'Faculty Name', value: t.name },
            { label: 'Department', value: t.dept || 'Computer Engineering' }
        ],
        onConfirm: () => {
            saveMasterTeachers(getMasterTeachers().filter(x => x.id !== id));
            renderTeachersList();
        }
    });
};

// ---- SUBJECTS ----
window.renderSubjectsList = function() {
    const container = document.getElementById('subjectsListContainer');
    if (!container) return;
    const subjects = getMasterSubjects();
    if (subjects.length === 0) {
        container.innerHTML = `<p class="setup-empty">No subjects added yet.</p>`;
        return;
    }
    container.innerHTML = subjects.map(s => `
        <div class="setup-item">
            <div class="setup-item-info">
                <span class="setup-item-name"><i data-lucide="book-open"></i> ${s.name}</span>
                <span class="setup-item-meta">${s.code} · ${s.type}</span>
            </div>
            <div class="setup-item-actions">
                <button class="action-icon-btn" title="Edit" onclick="editSubject(${s.id})"><i data-lucide="edit-3"></i></button>
                <button class="action-icon-btn danger" title="Delete" onclick="deleteSubject(${s.id})"><i data-lucide="trash-2"></i></button>
            </div>
        </div>`).join('');
    try { lucide.createIcons(); } catch(e){}
};

window.openSubjectModal = function(id = null) {
    document.getElementById('subjectForm').reset();
    document.getElementById('subjectEditId').value = id || '';
    if (id) {
        const s = getMasterSubjects().find(x => x.id === id);
        if (s) {
            document.getElementById('subjectModalTitle').textContent = 'Edit Subject';
            document.getElementById('subjectCode').value = s.code;
            document.getElementById('subjectName').value = s.name;
            document.getElementById('subjectType').value = s.type;
        }
    } else {
        document.getElementById('subjectModalTitle').textContent = 'Add Subject';
    }
    document.getElementById('subjectModal').classList.add('open');
    try { lucide.createIcons(); } catch(e){}
};

window.closeSubjectModal = function() { document.getElementById('subjectModal').classList.remove('open'); };

window.saveSubject = function(e) {
    e.preventDefault();
    const id   = document.getElementById('subjectEditId').value;
    const code = document.getElementById('subjectCode').value.trim();
    const name = document.getElementById('subjectName').value.trim();
    const type = document.getElementById('subjectType').value;
    const subjects = getMasterSubjects();
    if (id) {
        const idx = subjects.findIndex(s => s.id === parseInt(id));
        if (idx !== -1) subjects[idx] = { id: parseInt(id), code, name, type };
    } else {
        const newId = subjects.length ? Math.max(...subjects.map(s => s.id)) + 1 : 1;
        subjects.push({ id: newId, code, name, type });
    }
    saveMasterSubjects(subjects);
    closeSubjectModal();
    renderSubjectsList();
};

window.editSubject   = function(id) { openSubjectModal(id); };
window.deleteSubject = function(id) {
    const s = getMasterSubjects().find(x => x.id === id);
    if (!s) return;
    showConfirmModal({
        title: 'Delete Subject from Master List?',
        message: 'Are you sure you want to remove this subject from the master curriculum list?',
        icon: 'alert-triangle',
        iconBg: 'rgba(239, 68, 68, 0.12)',
        iconColor: '#ef4444',
        btnText: 'Delete Subject',
        btnIcon: 'trash-2',
        btnBg: '#dc2626',
        details: [
            { label: 'Subject Name', value: s.name },
            { label: 'Subject Code', value: s.code },
            { label: 'Course Type', value: s.type || 'Theory' }
        ],
        onConfirm: () => {
            saveMasterSubjects(getMasterSubjects().filter(s => s.id !== id));
            renderSubjectsList();
        }
    });
};

/* =============================================
   ATTENDANCE MODAL — Lecture attendance session tracking and verification
   ============================================= */

let currentAttSlot   = null;  // the timetable slot object
let attendanceSession = [];   // [{enroll, name, batch, tut, present}]
let attJumpBuffer     = '';   // accumulates typed digits for jump-to-enrollment
let attJumpTimer      = null;

// Reads attendance records for this class from localStorage
function getAttendanceLog() {
    try {
        return JSON.parse(localStorage.getItem('treva_attendance_' + CLASS_ID) || '[]');
    } catch(e) { return []; }
}
function saveAttendanceLog(arr) {
    localStorage.setItem('treva_attendance_' + CLASS_ID, JSON.stringify(arr));
}

/** Format today's date as YYYY-MM-DD (local time) */
function todayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Open attendance modal for a given timetable slot */
window.openAttendanceModal = function(slotId) {
    const slot = (timetableData || []).find(s => String(s.id) === String(slotId) || (s.slotIds && s.slotIds.map(String).includes(String(slotId))));
    if (!slot) return;
    currentAttSlot = slot;

    const today = todayStr();
    const log   = (typeof TrevaAttendance !== 'undefined') ? TrevaAttendance.getLog() : getAttendanceLog();
    const sIds  = (slot.slotIds || [slot.id]).map(String);
    const existingSession = log.find(l => {
        const lId = String(l.slotId);
        return lId === String(slotId) || sIds.includes(lId) || (l.slotIds && l.slotIds.map(String).some(x => sIds.includes(x)));
    });

    const recordMap = new Map();
    if (existingSession && existingSession.records && existingSession.records.length > 0) {
        existingSession.records.forEach(r => recordMap.set(String(r.enroll), Boolean(r.present)));
    }

    attendanceSession = studentsData.map(s => {
        const enrollStr = String(s.enroll);
        const wasPresent = recordMap.has(enrollStr) ? recordMap.get(enrollStr) : false;
        return {
            id:      s.id,
            enroll:  enrollStr,
            name:    s.name,
            batch:   s.batch,
            tut:     s.tut,
            present: wasPresent
        };
    });

    // Fill modal header
    const titleEl = document.getElementById('attSlotTitle');
    const metaEl  = document.getElementById('attSlotMeta');
    const dateEl  = document.getElementById('attDateDisplay');
    if (titleEl) titleEl.textContent = slot.sub;
    if (metaEl)  metaEl.textContent  = `${slot.day} · ${slot.time} · ${slot.fac} · ${slot.loc}`;
    if (dateEl)  dateEl.textContent  = today;

    // Clear search
    const searchEl = document.getElementById('attSearchInput');
    if (searchEl) searchEl.value = '';

    renderAttendanceList('');
    document.getElementById('attendanceModal').classList.add('open');
    attJumpBuffer = '';

    // Auto-focus the search box and highlight first student
    setTimeout(() => {
        const el = document.getElementById('attSearchInput');
        if (el) el.focus();
        const rows = document.querySelectorAll('#attStudentList tr.att-row');
        if (rows.length > 0) {
            rows.forEach(r => r.classList.remove('att-row-focused'));
            rows[0].classList.add('att-row-focused');
        }
    }, 150);

    try { lucide.createIcons(); } catch(e) {}
};

window.closeAttendanceModal = function() {
    document.getElementById('attendanceModal').classList.remove('open');
    currentAttSlot    = null;
    attendanceSession = [];
    attJumpBuffer     = '';
};

/** Render the student list inside the attendance modal, filtered by query */
window.renderAttendanceList = function(query = '') {
    const tbody = document.getElementById('attStudentList');
    if (!tbody) return;

    const q = (query || '').toLowerCase().trim();
    const isNum = /^\d+$/.test(q);
    const displayed = q
        ? attendanceSession.filter(s => {
            const enroll = String(s.enroll || '').toLowerCase();
            if (isNum) {
                return enroll === q || enroll.endsWith(q);
            }
            return enroll.includes(q) ||
                   s.name.toLowerCase().includes(q) ||
                   s.batch.toLowerCase().includes(q);
        })
        : attendanceSession;

    if (displayed.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted)">No matching students.</td></tr>`;
        updateAttendanceStats();
        return;
    }

    tbody.innerHTML = displayed.map((s, localIdx) => {
        const globalIdx = attendanceSession.indexOf(s) + 1;
        return `
            <tr class="att-row${s.present ? ' att-present' : ''}" id="att-row-${s.enroll}" data-enroll="${s.enroll}">
                <td class="att-sr">${globalIdx}</td>
                <td class="att-enroll"><code>${s.enroll}</code></td>
                <td class="att-name">${s.name}</td>
                <td class="att-batch"><span class="batch-chip">${s.batch}</span></td>
                <td class="att-check-cell">
                    <label class="att-chk-wrap" title="Click or press Space when focused">
                        <input type="checkbox"
                            class="att-chk-real"
                            id="chk-${s.enroll}"
                            data-enroll="${s.enroll}"
                            ${s.present ? 'checked' : ''}
                            onchange="toggleAttendance('${s.enroll}', this.checked)">
                        <span class="att-chk-visual${s.present ? ' checked' : ''}"></span>
                        <span class="att-chk-label">${s.present ? 'Present' : 'Absent'}</span>
                    </label>
                </td>
            </tr>`;
    }).join('');

    // Ensure first matching student is focused if none currently is
    const rows = tbody.querySelectorAll('tr.att-row');
    if (rows.length > 0) {
        const hasFocused = tbody.querySelector('tr.att-row.att-row-focused');
        if (!hasFocused) rows[0].classList.add('att-row-focused');
    }

    updateAttendanceStats();
    try { lucide.createIcons(); } catch(e) {}
};

/** Toggle one student's present state + update row highlight */
window.toggleAttendance = function(enroll, present) {
    const idx = attendanceSession.findIndex(s => s.enroll === enroll);
    if (idx === -1) return;
    attendanceSession[idx].present = present;

    // Update row class + custom checkbox visual without full re-render
    const row = document.getElementById('att-row-' + enroll);
    if (row) {
        row.classList.toggle('att-present', present);
        const cb = row.querySelector('.att-chk-real');
        const visual = row.querySelector('.att-chk-visual');
        const label  = row.querySelector('.att-chk-label');
        if (cb)     cb.checked = present;
        if (visual) visual.classList.toggle('checked', present);
        if (label)  label.textContent = present ? 'Present' : 'Absent';
    }
    updateAttendanceStats();
};

/** Recalculate and display present/absent counters */
window.updateAttendanceStats = function() {
    const total   = attendanceSession.length;
    const present = attendanceSession.filter(s => s.present).length;
    const absent  = total - present;
    const pct     = total ? Math.round((present / total) * 100) : 0;

    const bar = document.getElementById('attStatsBar');
    if (bar) {
        bar.innerHTML = `
            <span class="att-stat present"><i data-lucide="user-check"></i> Present: <strong>${present}</strong></span>
            <span class="att-stat absent"><i data-lucide="user-x"></i> Absent: <strong>${absent}</strong></span>
            <span class="att-stat total"><i data-lucide="users"></i> Total: <strong>${total}</strong></span>
            <span class="att-stat pct" style="color:${pct>=75?'var(--primary)':'#ef4444'}">${pct}%</span>
        `;
        try { lucide.createIcons(); } catch(e) {}
    }
    const pctBar = document.getElementById('attPctBar');
    if (pctBar) {
        pctBar.style.width = pct + '%';
        pctBar.style.background = pct >= 75 ? 'var(--primary)' : '#ef4444';
    }
};

window.markAllPresent = function() {
    attendanceSession.forEach(s => s.present = true);
    const q = document.getElementById('attSearchInput');
    renderAttendanceList(q ? q.value : '');
};

window.markAllAbsent = function() {
    attendanceSession.forEach(s => s.present = false);
    const q = document.getElementById('attSearchInput');
    renderAttendanceList(q ? q.value : '');
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

/** When user presses Enter in search input, mark the student present and advance */
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
            const st = attendanceSession.find(s => s.enroll === enroll);
            if (st) toggleAttendance(enroll, !st.present);
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

        // CASE 1: Teacher typed query
        if (val) {
            const isNum = /^\d+$/.test(val);
            const match = attendanceSession.find(s => {
                const enroll = String(s.enroll || '').toLowerCase();
                if (isNum) {
                    return enroll === val || enroll.endsWith(val);
                }
                return enroll.includes(val) || s.name.toLowerCase().includes(val);
            });

            if (match) {
                toggleAttendance(match.enroll, true);
                if (input) input.value = '';
                renderAttendanceList('');

                const matchIdx = attendanceSession.findIndex(s => s.enroll === match.enroll);
                const nextEnroll = (matchIdx !== -1 && matchIdx + 1 < attendanceSession.length)
                    ? attendanceSession[matchIdx + 1].enroll
                    : match.enroll;

                const row = document.getElementById('att-row-' + match.enroll);
                if (row) {
                    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    row.classList.add('att-row-flash');
                    setTimeout(() => row.classList.remove('att-row-flash'), 500);
                }

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

        // CASE 2: Search is empty -> mark currently focused student Present and advance!
        const rows = Array.from(document.querySelectorAll('#attStudentList tr.att-row'));
        if (rows.length === 0) return;

        let focusedIdx = rows.findIndex(r => r.classList.contains('att-row-focused') || r.contains(document.activeElement));
        if (focusedIdx === -1) focusedIdx = 0;

        const focusedRow = rows[focusedIdx];
        if (focusedRow) {
            const enroll = focusedRow.getAttribute('data-enroll');
            if (enroll) {
                toggleAttendance(enroll, true);
                focusedRow.classList.add('att-row-flash');
                setTimeout(() => focusedRow.classList.remove('att-row-flash'), 500);

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

/** Keyboard jump & search */
window.handleAttSearch = function(val) {
    renderAttendanceList(val);
    if (!val.trim()) return;

    const q = val.toLowerCase().trim();
    const isNum = /^\d+$/.test(q);
    const match = attendanceSession.find(s => {
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

/** Global keydown listener inside attendance modal */
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
            const st = attendanceSession.find(s => s.enroll === enroll);
            if (st) toggleAttendance(enroll, !st.present);
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
                toggleAttendance(enroll, true);
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
        if (ind) { ind.textContent = '↳ ' + attJumpBuffer; ind.style.display = 'inline'; }

        const match = attendanceSession.find(s => s.enroll.endsWith(attJumpBuffer));
        if (match) {
            const rows = document.querySelectorAll('#attStudentList tr.att-row');
            rows.forEach(r => r.classList.remove('att-row-focused'));
            const row = document.getElementById('att-row-' + match.enroll);
            if (row) {
                row.classList.add('att-row-focused');
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

/** Save the attendance session to localStorage */
window.saveAttendance = function() {
    if (!currentAttSlot) return;
    const today   = todayStr();
    const log     = getAttendanceLog();
    const total   = attendanceSession.length;
    const present = attendanceSession.filter(s => s.present).length;
    const slotIdStr = String(currentAttSlot.id);
    const existingIdx = log.findIndex(l => String(l.slotId) === slotIdStr && l.date === today);

    const entry = {
        id:       existingIdx !== -1 ? log[existingIdx].id : Date.now(),
        slotId:   currentAttSlot.id,
        slotIds:  currentAttSlot.slotIds || [currentAttSlot.id],
        date:     today,
        day:      currentAttSlot.day,
        time:     currentAttSlot.time,
        sub:      currentAttSlot.sub,
        fac:      currentAttSlot.fac,
        room:     currentAttSlot.loc,
        records:  attendanceSession.map(s => ({ ...s })),
        stats:    { total, present, absent: total - present, pct: Math.round((present / total) * 100) }
    };

    if (existingIdx !== -1) {
        log[existingIdx] = entry;
    } else {
        log.unshift(entry);
    }

    saveAttendanceLog(log);

    // Immediately recalculate each student's attendance in studentsData
    studentsData.forEach(s => {
        const stats = (typeof TrevaAttendance !== 'undefined')
            ? TrevaAttendance.calculateStudentAttendance(s.enroll, log)
            : { pct: s.att };
        s.att = stats.pct;
    });

    // Also persist for coordinating class
    try {
        localStorage.setItem('treva_students_' + CLASS_NAME, JSON.stringify(studentsData));
    } catch(e) {}

    // Background sync to Supabase
    try {
        if (typeof TrevaAttendance !== 'undefined') {
            TrevaAttendance.syncSessionToSupabase(currentAttSlot.id, attendanceSession, today, _session.teacherid);
        }
    } catch(e) {}

    const slotSub = currentAttSlot.sub;
    closeAttendanceModal();
    if (typeof renderStudents === 'function') renderStudents();
    if (typeof renderTimetable === 'function') renderTimetable();
    showToast(`✓ Attendance saved — ${present}/${total} present for ${slotSub}`);
};

/** View attendance history for a slot (all past sessions) */
window.openAttendanceHistory = function(slotId) {
    const slot = timetableData.find(s => s.id === slotId);
    const log  = getAttendanceLog().filter(l => l.slotId === slotId);

    const container = document.getElementById('attHistoryContent');
    const title     = document.getElementById('attHistoryTitle');
    if (title) title.textContent = slot ? `Attendance History · ${slot.sub}` : 'Attendance History';

    if (!container) return;

    if (log.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted); padding:20px; text-align:center;">No attendance records yet for this slot.</p>`;
    } else {
        container.innerHTML = log.map(session => `
            <div class="att-history-card">
                <div class="att-history-card-head">
                    <div class="att-history-date">
                        <i data-lucide="calendar"></i>
                        <strong>${session.date}</strong>
                        <span class="att-history-time">${session.time}</span>
                    </div>
                    <div class="att-history-badge" style="background:${session.stats.pct>=75?'#d1fae5':'#fee2e2'}; color:${session.stats.pct>=75?'#065f46':'#991b1b'}">
                        ${session.stats.present}/${session.stats.total} &nbsp;·&nbsp; ${session.stats.pct}%
                    </div>
                </div>
                <div class="att-history-detail-grid">
                    ${session.records.map(r => `
                        <span class="att-history-chip ${r.present ? 'present' : 'absent'}" title="${r.name}">
                            ${r.enroll.slice(-4)} ${r.present ? '✓' : '✗'}
                        </span>`).join('')}
                </div>
            </div>
        `).join('');
    }

    document.getElementById('attHistoryModal').classList.add('open');
    try { lucide.createIcons(); } catch(e) {}
};

window.closeAttHistoryModal = function() {
    document.getElementById('attHistoryModal').classList.remove('open');
};

/** Tiny toast notification */
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
    }, 3000);
}
