/**
 * ============================================================================
 * MY CLASS (CO31) - STUDENTS, TIMETABLE, EXAMS, DRIVE RESOURCES
 * MASTER DATA: ROOMS, TEACHERS, SUBJECTS (shared across all classes)
 * ============================================================================
 */

const CLASS_ID   = 'co31';
const CLASS_NAME = 'CO31';

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
let studentsData = [
    { id: 1, enroll: '220010116001', name: 'Aarav Sharma',   batch: 'A1', tut: 'Tut-01', att: 92 },
    { id: 2, enroll: '220010116002', name: 'Bhavya Patel',   batch: 'A1', tut: 'Tut-01', att: 88 },
    { id: 3, enroll: '220010116003', name: 'Chirag Dave',    batch: 'A1', tut: 'Tut-02', att: 76 },
    { id: 4, enroll: '220010116004', name: 'Deepika Joshi',  batch: 'A2', tut: 'Tut-02', att: 95 },
    { id: 5, enroll: '220010116005', name: 'Eshaan Mehta',   batch: 'A2', tut: 'Tut-03', att: 81 },
    { id: 6, enroll: '220010116006', name: 'Falguni Shah',   batch: 'A2', tut: 'Tut-03', att: 68 },
    { id: 7, enroll: '220010116007', name: 'Gaurav Parmar',  batch: 'A3', tut: 'Tut-04', att: 89 },
    { id: 8, enroll: '220010116008', name: 'Harshita Rathod',batch: 'A3', tut: 'Tut-04', att: 94 },
    { id: 9, enroll: '220010116009', name: 'Ishaan Varma',   batch: 'A3', tut: 'Tut-05', att: 72 },
    { id: 10, enroll: '220010116010', name: 'Jhanvi Trivedi', batch: 'A1', tut: 'Tut-05', att: 85 }
];

let timetableData = [
    { id: 1,  day: 'Mon', sub: 'Data Structures (CS-301)',      type: 'Lecture',  time: '09:00 AM – 10:00 AM', fac: 'Prof. Shah',                loc: 'Room 204' },
    { id: 2,  day: 'Mon', sub: 'Operating Systems (CS-302)',    type: 'Lecture',  time: '10:00 AM – 11:00 AM', fac: 'Prof. K. R. Vyas',          loc: 'Room 204' },
    { id: 3,  day: 'Mon', sub: 'DS Lab (Batch A1/A2)',          type: 'Lab',      time: '11:30 AM – 01:30 PM', fac: 'Prof. Shah & Lab Asst.',     loc: 'Computer Lab 3' },
    { id: 4,  day: 'Mon', sub: 'Database Management (CS-303)',  type: 'Lecture',  time: '02:00 PM – 03:00 PM', fac: 'Prof. N. M. Soni',          loc: 'Room 204' },
    { id: 5,  day: 'Tue', sub: 'Database Management (CS-303)',  type: 'Lecture',  time: '09:00 AM – 10:00 AM', fac: 'Prof. N. M. Soni',          loc: 'Room 204' },
    { id: 6,  day: 'Tue', sub: 'DBMS Lab (Batch A2/A3)',        type: 'Lab',      time: '10:00 AM – 12:00 PM', fac: 'Prof. N. M. Soni',          loc: 'DBMS Lab 1' },
    { id: 7,  day: 'Tue', sub: 'Object Oriented Programming (CS-304)', type: 'Lecture', time: '01:00 PM – 02:00 PM', fac: 'Prof. P. Desai',    loc: 'Room 204' },
    { id: 8,  day: 'Wed', sub: 'Project Tutorial (Tut-01 to 05)', type: 'Tutorial', time: '09:00 AM – 11:00 AM', fac: 'Prof. Shah (Coordinator)', loc: 'Project Room 102' },
    { id: 9,  day: 'Wed', sub: 'Data Structures (CS-301)',      type: 'Lecture',  time: '11:30 AM – 12:30 PM', fac: 'Prof. Shah',                loc: 'Room 204' },
    { id: 10, day: 'Wed', sub: 'Digital Electronics (EC-305)',  type: 'Lecture',  time: '01:30 PM – 02:30 PM', fac: 'Prof. M. K. Patel',        loc: 'Room 204' },
    { id: 11, day: 'Thu', sub: 'Operating Systems (CS-302)',    type: 'Lecture',  time: '09:00 AM – 10:00 AM', fac: 'Prof. K. R. Vyas',          loc: 'Room 204' },
    { id: 12, day: 'Thu', sub: 'OS Linux Lab (All Batches)',    type: 'Lab',      time: '10:00 AM – 12:00 PM', fac: 'Prof. K. R. Vyas',          loc: 'Linux Lab 2' },
    { id: 13, day: 'Fri', sub: 'OOPs Java Lab (Batch A1/A3)',   type: 'Lab',      time: '09:00 AM – 11:00 AM', fac: 'Prof. P. Desai',           loc: 'Software Lab 4' },
    { id: 14, day: 'Fri', sub: 'Digital Electronics (EC-305)',  type: 'Lecture',  time: '11:30 AM – 12:30 PM', fac: 'Prof. M. K. Patel',        loc: 'Room 204' },
    { id: 15, day: 'Sat', sub: 'Remedial Class & Doubt Session', type: 'Lecture', time: '09:00 AM – 11:00 AM', fac: 'Prof. Shah',                loc: 'Room 204' }
];

let examsData = [
    { id: 1, title: 'Mid-Semester Exam I',       sub: 'Data Structures (CS-301)',         type: 'Theory Exam',    date: '2026-10-24', time: '10:30 AM – 12:30 PM', room: 'Block 204 & 205', marks: 30 },
    { id: 2, title: 'Unit Test II',               sub: 'Database Management Systems',       type: 'Unit Test',      date: '2026-11-04', time: '09:30 AM – 10:30 AM', room: 'Room 204',        marks: 20 },
    { id: 3, title: 'Continuous Practical Viva',  sub: 'Data Structures Lab (CS-301P)',    type: 'Practical Viva', date: '2026-11-12', time: '11:00 AM – 02:00 PM', room: 'Computer Lab 3',  marks: 25 }
];

let resourcesData = [
    { id: 1, title: 'Data Structures · Complete Lecture PPTs & Problem Sheets',     sub: 'Data Structures (CS-301)',    cat: 'Lecture Notes',      desc: 'Units 1 to 4 covering Arrays, Stacks, Queues, Linked Lists & Trees.',  url: 'https://drive.google.com/drive/folders/sample-ds-co31' },
    { id: 2, title: 'DBMS Lab Manual & SQL Schema Exercises',                        sub: 'Database Management (CS-303)', cat: 'Lab Manual',         desc: 'Contains 14 laboratory experiment sheets, ER diagrams, and normalization sample tests.', url: 'https://drive.google.com/drive/folders/sample-dbms-lab' },
    { id: 3, title: 'Term Project Tutorial Guidelines & Review Rubric',              sub: 'Tutorial Project Hub',         cat: 'Project Guidelines', desc: 'Official rubric for Tutorial Projects (Tut-01 to 12).',               url: 'https://drive.google.com/drive/folders/sample-tut-projects' }
];

let currentDay = 'Mon';

// =========================================================================
// INIT
// =========================================================================
document.addEventListener('DOMContentLoaded', function() {
    try { lucide.createIcons(); } catch(e) { console.warn(e); }

    // Profile dropdown
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

    // Seed master data with defaults if empty
    if (getMasterRooms().length === 0) {
        saveMasterRooms([
            { id: 1, name: 'Room 204',        capacity: 60, type: 'Classroom' },
            { id: 2, name: 'Room 454',        capacity: 60, type: 'Classroom' },
            { id: 3, name: 'Computer Lab 3',  capacity: 30, type: 'Lab' },
            { id: 4, name: 'DBMS Lab 1',      capacity: 30, type: 'Lab' },
            { id: 5, name: 'Linux Lab 2',     capacity: 30, type: 'Lab' },
            { id: 6, name: 'Software Lab 4',  capacity: 30, type: 'Lab' },
            { id: 7, name: 'Project Room 102',capacity: 20, type: 'Seminar' }
        ]);
    }
    if (getMasterTeachers().length === 0) {
        saveMasterTeachers([
            { id: 1, name: 'Prof. Shah',        dept: 'Computer Engineering', subjects: ['CS-301', 'CS-302'] },
            { id: 2, name: 'Prof. K. R. Vyas',  dept: 'Computer Engineering', subjects: ['CS-302'] },
            { id: 3, name: 'Prof. N. M. Soni',  dept: 'Computer Engineering', subjects: ['CS-303'] },
            { id: 4, name: 'Prof. P. Desai',     dept: 'Computer Engineering', subjects: ['CS-304'] },
            { id: 5, name: 'Prof. M. K. Patel',  dept: 'Electronics',          subjects: ['EC-305'] }
        ]);
    }
    if (getMasterSubjects().length === 0) {
        saveMasterSubjects([
            { id: 1, code: 'CS-301', name: 'Data Structures',              type: 'Theory+Lab' },
            { id: 2, code: 'CS-302', name: 'Operating Systems',            type: 'Theory+Lab' },
            { id: 3, code: 'CS-303', name: 'Database Management Systems',  type: 'Theory+Lab' },
            { id: 4, code: 'CS-304', name: 'Object Oriented Programming',  type: 'Theory+Lab' },
            { id: 5, code: 'EC-305', name: 'Digital Electronics',          type: 'Theory' }
        ]);
    }

    // Rebuild conflict index from default data
    rebuildGlobalIndexForClass();

    renderStudents();
    loadMyClassStudents();
    renderTimetable();
    renderExams();
    renderResources();
    renderSetup();
});

let currentCoordinatorClassId = 31;
let currentDivideType = 'batch';     // 'batch' | 'tutorial'
let currentDivideMethod = 'range';   // 'range' | 'count'

async function loadMyClassStudents() {
    if (typeof sbSelect !== 'function') return;
    try {
        const [batches, tutorials, students] = await Promise.all([
            sbSelect('batch', { select: 'classid,batchid,batchname' }),
            sbSelect('tutorial', { select: 'classid,tutorialid,tutorialname' }),
            sbSelect('student', { select: 'student_id,enrollment_no,name,class_id,batch_id,tutorial_id', order: 'enrollment_no.asc' })
        ]);
        if (students && students.length > 0) {
            const batchMap = {};
            const tutMap = {};
            (batches || []).forEach(b => { batchMap[`${b.classid}_${b.batchid}`] = b.batchname; });
            (tutorials || []).forEach(t => { tutMap[`${t.classid}_${t.tutorialid}`] = t.tutorialname; });
            // Filter to Class 31 (CO31) which is default coordinator class
            const class31Students = students.filter(s => s.class_id === currentCoordinatorClassId);
            if (class31Students.length > 0) {
                studentsData = class31Students.map(s => ({
                    id:     s.student_id,
                    enroll: String(s.enrollment_no || s.student_id),
                    name:   s.name || 'Unknown',
                    batch:  batchMap[`${s.class_id}_${s.batch_id}`] || (s.batch_id ? `CO${s.batch_id}` : '—'),
                    tut:    tutMap[`${s.class_id}_${s.tutorial_id}`] || (s.tutorial_id ? `T${s.tutorial_id}` : '—'),
                    att:    75
                }));
                renderStudents();
                updateBatchAndTutFilterOptions();
            }
        }
    } catch (e) {
        console.warn('[MyClass] Failed to load real students:', e);
    }
}

// =========================================================================
// BATCH & TUTORIAL DIVISION / CREATION MANAGER
// =========================================================================

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
        if (helpName) helpName.textContent = 'Type a new batch name (like CO311) or select an existing one.';
        if (targetInp) targetInp.placeholder = 'e.g. CO311';
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
        if (helpName) helpName.textContent = 'Type a new tutorial name (like T1) or select an existing one.';
        if (targetInp) targetInp.placeholder = 'e.g. T1';
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
    const groupName  = (document.getElementById('targetGroupName')?.value || '').trim() || (currentDivideType === 'batch' ? 'CO311' : 'T1');

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
        alert('Please specify a target group name (e.g. CO311 or T1).');
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
                const maxId = classBatches.length > 0 ? Math.max(...classBatches.map(b => b.batchid)) : 310;
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
                const maxId = classTuts.length > 0 ? Math.max(...classTuts.map(t => t.tutorialid)) : 310;
                targetTutId = numMatch ? (310 + parseInt(numMatch[0])) : (maxId + 1);

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
        const batches = [...new Set(studentsData.map(s => s.batch).filter(Boolean))].sort();
        bFilter.innerHTML = '<option value="ALL">All Batches</option>' +
            batches.map(b => `<option value="${b}">Batch ${b}</option>`).join('');
        if (batches.includes(curr)) bFilter.value = curr;
    }

    const tFilter = document.getElementById('tutFilter');
    if (tFilter) {
        const curr = tFilter.value;
        const tuts = [...new Set(studentsData.map(s => s.tut).filter(Boolean))].sort();
        tFilter.innerHTML = '<option value="ALL">All Tutorials</option>' +
            tuts.map(t => `<option value="${t}">Tutorial ${t}</option>`).join('');
        if (tuts.includes(curr)) tFilter.value = curr;
    }

    // Update banner stats
    const statBatch = document.getElementById('statBatchCount');
    if (statBatch) statBatch.textContent = new Set(studentsData.map(s => s.batch).filter(Boolean)).size;
    const statTut = document.getElementById('statTutCount');
    if (statTut) statTut.textContent = new Set(studentsData.map(s => s.tut).filter(Boolean)).size;
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

// =========================================================================
// STUDENTS RENDERING & CRUD
// =========================================================================
window.renderStudents = function(list = studentsData) {
    const tbody = document.getElementById('studentTableBody');
    if (!tbody) return;
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted)">No students match your query.</td></tr>`;
        return;
    }
    tbody.innerHTML = list.map(s => {
        const attClass = s.att >= 85 ? 'good' : (s.att >= 75 ? 'warn' : 'alert');
        return `
            <tr>
                <td><strong>${s.enroll}</strong></td>
                <td>${s.name}</td>
                <td><span class="batch-chip">${s.batch}</span></td>
                <td><span class="tut-chip">${s.tut}</span></td>
                <td><span class="status-badge ${attClass}">${s.att}%</span></td>
                <td>
                    <div class="table-actions">
                        <button class="action-icon-btn" title="Edit Student" onclick="editStudent(${s.id})">
                            <i data-lucide="edit-3"></i>
                        </button>
                        <button class="action-icon-btn danger" title="Delete Student" onclick="deleteStudent(${s.id})">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    }).join('');
    const statEl = document.getElementById('statStudentCount');
    if (statEl) statEl.textContent = studentsData.length;
    const statBatch = document.getElementById('statBatchCount');
    if (statBatch) statBatch.textContent = new Set(studentsData.map(s => s.batch).filter(Boolean)).size;
    const statTut = document.getElementById('statTutCount');
    if (statTut) statTut.textContent = new Set(studentsData.map(s => s.tut).filter(Boolean)).size;
    try { lucide.createIcons(); } catch(e){}
};

window.filterStudents = function() {
    const query = (document.getElementById('studentSearchInput').value || '').toLowerCase().trim();
    const batch  = document.getElementById('batchFilter').value;
    const tut    = document.getElementById('tutFilter').value;
    const filtered = studentsData.filter(s => {
        return (s.name.toLowerCase().includes(query) || s.enroll.toLowerCase().includes(query))
            && (batch === 'ALL' || s.batch === batch)
            && (tut   === 'ALL' || s.tut   === tut);
    });
    renderStudents(filtered);
};

window.handleGlobalSearch = function(val) {
    const sInput = document.getElementById('studentSearchInput');
    if (sInput) sInput.value = val;
    switchSection('students');
    filterStudents();
};

window.openStudentModal = function(id = null) {
    document.getElementById('studentForm').reset();
    document.getElementById('studentEditId').value = id || '';
    if (id) {
        const s = studentsData.find(item => item.id === id);
        if (s) {
            document.getElementById('studentModalTitle').textContent = 'Edit Student Details';
            document.getElementById('studEnrollment').value = s.enroll;
            document.getElementById('studName').value        = s.name;
            document.getElementById('studBatch').value       = s.batch;
            document.getElementById('studTut').value         = s.tut;
            document.getElementById('studAttendance').value  = s.att;
        }
    } else {
        document.getElementById('studentModalTitle').textContent = 'Add New Student';
    }
    document.getElementById('studentModal').classList.add('open');
    try { lucide.createIcons(); } catch(e){}
};

window.closeStudentModal = function() { document.getElementById('studentModal').classList.remove('open'); };

window.saveStudent = function(e) {
    e.preventDefault();
    const id     = document.getElementById('studentEditId').value;
    const enroll = document.getElementById('studEnrollment').value.trim();
    const name   = document.getElementById('studName').value.trim();
    const batch  = document.getElementById('studBatch').value;
    const tut    = document.getElementById('studTut').value;
    const att    = parseInt(document.getElementById('studAttendance').value) || 85;
    if (id) {
        const idx = studentsData.findIndex(s => s.id === parseInt(id));
        if (idx !== -1) studentsData[idx] = { id: parseInt(id), enroll, name, batch, tut, att };
    } else {
        const newId = studentsData.length ? Math.max(...studentsData.map(s => s.id)) + 1 : 1;
        studentsData.unshift({ id: newId, enroll, name, batch, tut, att });
    }
    closeStudentModal();
    filterStudents();
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

        // 3. Remove from in-memory array
        studentsData = studentsData.filter(s => s.id !== sId);

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

// =========================================================================
// UNIVERSAL STYLED CONFIRMATION MODAL SYSTEM
// =========================================================================
let pendingGenericConfirmAction = null;

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
            const genModal = document.getElementById('genericConfirmModal');
            if (genModal && genModal.classList.contains('open')) closeGenericConfirmModal();
            const delModal = document.getElementById('deleteConfirmModal');
            if (delModal && delModal.classList.contains('open')) closeDeleteConfirmModal();
        }
    });
})();

// =========================================================================
// TIMETABLE RENDERING & CRUD (with dropdown population + conflict detection)
// =========================================================================
window.switchDay = function(day) {
    currentDay = day;
    document.querySelectorAll('.day-tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-day') === day));
    renderTimetable();
};

window.renderTimetable = function() {
    const container = document.getElementById('ttCardsContainer');
    if (!container) return;
    const daySlots = timetableData.filter(t => t.day === currentDay);
    if (daySlots.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1; padding:30px; text-align:center; color:var(--text-muted); background:var(--bg); border-radius:var(--radius-sm)">No lectures scheduled for ${currentDay}. Click "+ Add Lecture Slot" to create one.</div>`;
        return;
    }

    container.innerHTML = daySlots.map(slot => {
        const typeClass = slot.type === 'Lab' ? 'lab' : (slot.type === 'Tutorial' ? 'tut' : '');
        return `
            <div class="tt-card ${typeClass}">
                <div class="tt-card-actions">
                    <button class="action-icon-btn" title="Edit Slot" onclick="editTimetableSlot(${slot.id})">
                        <i data-lucide="edit-2"></i>
                    </button>
                    <button class="action-icon-btn danger" title="Delete Slot" onclick="deleteTimetableSlot(${slot.id})">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
                <div class="tt-card-time"><i data-lucide="clock"></i> ${slot.time}</div>
                <div class="tt-card-sub">${slot.sub}</div>
                <div class="tt-card-code">${slot.type} Session · CO31</div>
                <div class="tt-card-meta">
                    <div class="tt-card-meta-row"><i data-lucide="user-check"></i><span><strong>Faculty:</strong> ${slot.fac}</span></div>
                    <div class="tt-card-meta-row"><i data-lucide="map-pin"></i><span><strong>Room / Lab:</strong> ${slot.loc}</span></div>
                </div>
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
window.deleteTimetableSlot = function(id) {
    const slot = timetableData.find(t => t.id === id);
    if (!slot) return;
    showConfirmModal({
        title: 'Delete Timetable Slot?',
        message: 'Are you sure you want to remove this timetable slot? It will be permanently removed from the class schedule.',
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
        onConfirm: () => {
            timetableData = timetableData.filter(t => t.id !== id);
            rebuildGlobalIndexForClass();
            renderTimetable();
        }
    });
};

// =========================================================================
// EXAMS RENDERING & CRUD
// =========================================================================
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

// =========================================================================
// GOOGLE DRIVE RESOURCES RENDERING & CRUD
// =========================================================================
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

// =========================================================================
// SETUP SECTION — Rooms, Teachers, Subjects CRUD
// =========================================================================
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

// =========================================================================
// ATTENDANCE SYSTEM
// =========================================================================

let currentAttSlot   = null;  // the timetable slot object
let attendanceSession = [];   // [{enroll, name, batch, tut, present}]
let attJumpBuffer     = '';   // accumulates typed digits for jump-to-enrollment
let attJumpTimer      = null;

function getAttendanceLog() {
    try {
        return JSON.parse(localStorage.getItem('treva_attendance_' + CLASS_ID) || '[]');
    } catch(e) { return []; }
}
function saveAttendanceLog(arr) {
    localStorage.setItem('treva_attendance_' + CLASS_ID, JSON.stringify(arr));
}

/** Format today's date as YYYY-MM-DD */
function todayStr() { return new Date().toISOString().split('T')[0]; }

/** Open attendance modal for a given timetable slot */
window.openAttendanceModal = function(slotId) {
    const slot = timetableData.find(s => s.id === slotId);
    if (!slot) return;
    currentAttSlot = slot;

    const today = todayStr();
    const log   = getAttendanceLog();
    const existingSession = log.find(l => l.slotId === slotId && l.date === today);

    if (existingSession) {
        // Pre-fill from already saved session
        attendanceSession = existingSession.records.map(r => ({ ...r }));
    } else {
        // Fresh session — all absent by default
        attendanceSession = studentsData.map(s => ({
            enroll: s.enroll,
            name:   s.name,
            batch:  s.batch,
            tut:    s.tut,
            present: false
        }));
    }

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

    // Auto-focus the search box
    setTimeout(() => {
        const el = document.getElementById('attSearchInput');
        if (el) el.focus();
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
    const displayed = q
        ? attendanceSession.filter(s =>
            s.enroll.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q)   ||
            s.batch.toLowerCase().includes(q))
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
        const visual = row.querySelector('.att-chk-visual');
        const label  = row.querySelector('.att-chk-label');
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

/** When user presses Enter in search input, mark the matched student present */
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

        const match = attendanceSession.find(s =>
            s.enroll.endsWith(val) ||
            s.enroll.toLowerCase().includes(val) ||
            s.name.toLowerCase().includes(val)
        );

        if (match) {
            toggleAttendance(match.enroll, true);
            input.value = '';
            renderAttendanceList('');
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

/**
 * Keyboard jump-to-enrollment:
 * User types digits in the jump input → we filter the list AND scroll to & focus
 * the first match's checkbox so they can hit Space to toggle.
 */
window.handleAttSearch = function(val) {
    renderAttendanceList(val);
    if (!val.trim()) return;

    // Find first match and focus its checkbox
    const q = val.toLowerCase().trim();
    const match = attendanceSession.find(s =>
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

/**
 * Global keydown listener inside attendance modal:
 * Typing digits (0-9) anywhere in modal appends to jump buffer.
 * Buffer auto-clears after 1.2s of no typing.
 * Pressing Enter marks the first matched student present.
 */
window.handleAttModalKeydown = function(e) {
    // Ignore if focus is on the search input (it handles its own input)
    if (e.target && e.target.id === 'attSearchInput') return;
    // Ignore modifier combos
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
            const match = attendanceSession.find(s => s.enroll.endsWith(attJumpBuffer));
            if (match) targetEnroll = match.enroll;
        }

        if (targetEnroll) {
            toggleAttendance(targetEnroll, true);
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

        // Show buffer in a "typing indicator"
        const ind = document.getElementById('attJumpIndicator');
        if (ind) { ind.textContent = '↳ ' + attJumpBuffer; ind.style.display = 'inline'; }

        // Find match and focus
        const match = attendanceSession.find(s => s.enroll.endsWith(attJumpBuffer));
        if (match) {
            const row = document.getElementById('att-row-' + match.enroll);
            if (row) {
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const cb = row.querySelector('.att-chk-real');
                if (cb) cb.focus();
            }
        }

        // Auto-clear buffer after 1.2s
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
    const existingIdx = log.findIndex(l => l.slotId === currentAttSlot.id && l.date === today);

    const entry = {
        id:       existingIdx !== -1 ? log[existingIdx].id : Date.now(),
        slotId:   currentAttSlot.id,
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
    const slotSub = currentAttSlot.sub;
    closeAttendanceModal();
    renderTimetable();
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
