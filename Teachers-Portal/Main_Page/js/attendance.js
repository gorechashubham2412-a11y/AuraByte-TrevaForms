/**
 * ============================================================================
 * TREVA ATTENDANCE DRILL-DOWN FLOW CONTROLLER
 * Steps: Class Grid -> Lecture / Lab -> Batch / Tut (if lab) -> Subject -> Action Prompt (Take vs Watch) -> Sheet
 * ============================================================================
 */

let TEACHER_NAME = 'Sachin Shah';
let TEACHER_DEPT = 'Computer Engineering';
let TEACHER_ID   = null;

let _allClasses = [];
let _allSlots = [];
let _allBatches = [];
let _allTutorials = [];
let _allStudents = [];
let _allSubjects = [];

// Drill-down State
let attFlow = {
    step: 'class', // 'class' | 'type' | 'batch' | 'subject' | 'action' | 'watch'
    selectedClass: null,      // { classid, classname, semid }
    selectedType: null,       // 'Lecture' | 'Lab'
    selectedBatch: null,      // { id, name, type: 'batch'|'tut' }
    selectedSubject: null     // { code, name, color }
};
window.attFlow = attFlow;

// Attendance Modal Session State
let currentAttSession = [];

const SUB_COLORS = {
    'CN': '#0E7490',
    'DS': '#15803D',
    'DEF': '#B45309',
    'FOS': '#7C3AED',
    'RDBMS': '#2563EB',
    'RWPD': '#BE123C'
};

/* =============================================
   INITIALIZATION & DATA LOADING — Teacher session loading, DOM triggers, and Supabase data fetch
   ============================================= */
// Initializes attendance view, teacher session, and triggers database fetch
window.initAttendancePage = async function() {
    try { lucide.createIcons(); } catch(e){}

    // Load teacher identity
    if (typeof TrevaSession !== 'undefined' && TrevaSession.load) {
        const sess = TrevaSession.load();
        if (sess && sess.fullname) {
            TEACHER_NAME = sess.fullname;
            TEACHER_DEPT = sess.department || 'Computer Engineering';
            TEACHER_ID   = sess.teacherid || null;
        }
    }

    // Profile Dropdown
    const profBtn = document.getElementById('profBtn');
    const profDD  = document.getElementById('profDD');
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

    const initials = (TEACHER_NAME || 'SP').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
    if (profBtn) profBtn.textContent = initials;

    // Load database data
    await loadAttendanceDatabaseData();
    renderCurrentStep();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (document.getElementById('attFlowContainer')) window.initAttendancePage();
    });
} else {
    if (document.getElementById('attFlowContainer')) window.initAttendancePage();
}

// Loads classes, timetable slots, batches, and students from Supabase
async function loadAttendanceDatabaseData() {
    const container = document.getElementById('attStepContent');
    if (container && (!document.getElementById('attClassesGrid') || _allClasses.length === 0)) {
        container.innerHTML = `<div style="text-align:center; padding:48px 20px;">${getTrevaLoadingHtml('Loading Classes & Faculty Schedule...', 'Fetching academic records from Supabase database')}</div>`;
    }

    try {
        if (typeof sbSelect !== 'function') throw new Error('sbSelect is unavailable');

        const [classes, slots, batches, tuts, students, subjects] = await Promise.all([
            sbSelect('class', { select: 'classid,classname,semid,coordinator', order: 'classname.asc' }),
            sbSelect('timetable_slot', {
                select: 'slotid,room,slot_type,day_of_week,start_time,end_time,batchid,tutorialid,subject(subjectname,subjectcode),teacher(fullname),class(classid,classname)',
                order: 'day_of_week.asc,start_time.asc'
            }),
            sbSelect('batch', { select: 'classid,batchid,batchname', order: 'batchname.asc' }),
            sbSelect('tutorial', { select: 'classid,tutorialid,tutorialname', order: 'tutorialname.asc' }),
            sbSelect('student', { select: 'student_id,enrollment_no,name,class_id,batch_id,tutorial_id', order: 'enrollment_no.asc' }),
            sbSelect('subject', { select: 'subjectid,subjectname,subjectcode', order: 'subjectname.asc' })
        ]);

        _allClasses    = classes || [];
        _allSlots      = slots || [];
        _allBatches    = batches || [];
        _allTutorials  = tuts || [];
        _allSubjects   = subjects || [];

        const classMap = {};
        _allClasses.forEach(c => { classMap[c.classid] = c.classname; });
        const batchMap = {};
        _allBatches.forEach(b => { batchMap[b.batchid] = b.batchname; });
        const tutMap = {};
        _allTutorials.forEach(t => { tutMap[t.tutorialid] = t.tutorialname; });

        _allStudents   = (students || []).map(s => {
            const cName = classMap[s.class_id] || String(s.class_id || '');
            const bName = batchMap[s.batch_id] || (s.batch_id ? `Batch ${s.batch_id}` : '');
            const tName = tutMap[s.tutorial_id] || (s.tutorial_id ? `T${s.tutorial_id}` : '');
            return {
                id: s.student_id,
                enroll: String(s.enrollment_no || s.student_id || ''),
                name: s.name || '',
                classId: cName,
                class_id: s.class_id,
                batchId: s.batch_id,
                batch: bName,
                tutId: s.tutorial_id,
                tut: tName
            };
        });

        console.info(`[Treva Attendance] Loaded ${_allClasses.length} classes, ${_allSlots.length} slots, ${_allStudents.length} students.`);
    } catch (err) {
        console.error('[Treva Attendance] Error loading database data:', err);
        if (container) {
            container.innerHTML = `
                <div class="tt-empty-state">
                    <div class="tt-empty-icon" style="color:var(--danger,#DC2626)"><i data-lucide="alert-circle"></i></div>
                    <h3>Database Connection Error</h3>
                    <p>${err.message || 'Could not fetch classes and attendance data from Supabase.'}</p>
                </div>`;
            try { lucide.createIcons(); } catch(e){}
        }
    }
}

function teacherMatches(facName, targetName) {
    if (!facName || !targetName) return false;
    const a = facName.toLowerCase().replace(/^prof\.?\s+/i, '').trim();
    const b = targetName.toLowerCase().replace(/^prof\.?\s+/i, '').trim();
    return a === b || a.includes(b) || b.includes(a);
}

/* =============================================
   WIZARD NAVIGATION — Breadcrumbs and step routing for the attendance drill-down workflow
   ============================================= */
// Renders active breadcrumb track and step buttons
function renderBreadcrumb() {
    const nav = document.getElementById('attBreadcrumbNav');
    if (!nav) return;

    let crumbs = [
        { label: 'All Classes', step: 'class', active: attFlow.step === 'class' }
    ];

    if (attFlow.selectedClass) {
        crumbs.push({ label: `Class ${attFlow.selectedClass.classname}`, step: 'type', active: attFlow.step === 'type' });
    }

    if (attFlow.selectedType) {
        if (attFlow.selectedType === 'Lab') {
            crumbs.push({ label: 'Lab Practical', step: 'batch', active: attFlow.step === 'batch' });
            if (attFlow.selectedBatch) {
                crumbs.push({ label: attFlow.selectedBatch.name, step: 'subject', active: attFlow.step === 'subject' });
            }
        } else {
            crumbs.push({ label: 'Classroom Lecture', step: 'subject', active: attFlow.step === 'subject' });
        }
    }

    if (attFlow.selectedSubject) {
        crumbs.push({ label: attFlow.selectedSubject.code, step: 'action', active: attFlow.step === 'action' });
    }

    if (attFlow.step === 'watch') {
        crumbs.push({ label: 'Attendance Register', step: 'watch', active: true });
    }

    nav.innerHTML = crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        const btnClass = isLast ? 'att-crumb-btn current' : 'att-crumb-btn';
        const sep = isLast ? '' : `<span class="att-crumb-sep"><i data-lucide="chevron-right"></i></span>`;
        return `
            <button class="${btnClass}" onclick="goToStep('${c.step}')">
                <span>${c.label}</span>
            </button>
            ${sep}
        `;
    }).join('');

    try { lucide.createIcons(); } catch(e){}
}

window.goToStep = function(stepName) {
    // Returning to an earlier choice invalidates every selection made after it.
    if (stepName === 'class') {
        attFlow.selectedClass = null;
        attFlow.selectedType = null;
        attFlow.selectedBatch = null;
        attFlow.selectedSubject = null;
    } else if (stepName === 'type') {
        attFlow.selectedType = null;
        attFlow.selectedBatch = null;
        attFlow.selectedSubject = null;
    } else if (stepName === 'batch') {
        attFlow.selectedBatch = null;
        attFlow.selectedSubject = null;
    } else if (stepName === 'subject') {
        attFlow.selectedSubject = null;
    }
    attFlow.step = stepName;
    renderCurrentStep();
};

window.goBackOneStep = function() {
    if (attFlow.step === 'watch') {
        goToStep('action');
    } else if (attFlow.step === 'action') {
        goToStep('subject');
    } else if (attFlow.step === 'subject') {
        if (attFlow.selectedType === 'Lab') goToStep('batch');
        else goToStep('type');
    } else if (attFlow.step === 'batch') {
        goToStep('type');
    } else if (attFlow.step === 'type') {
        goToStep('class');
    } else {
        // At class selection, back goes to home
        window.location.href = 'index.html';
    }
};

function renderCurrentStep() {
    renderBreadcrumb();
    const container = document.getElementById('attStepContent');
    if (!container) return;

    if (attFlow.step === 'class') {
        renderClassesStep(container);
    } else if (attFlow.step === 'type') {
        renderTypeStep(container);
    } else if (attFlow.step === 'batch') {
        renderBatchStep(container);
    } else if (attFlow.step === 'subject') {
        renderSubjectStep(container);
    } else if (attFlow.step === 'action') {
        renderActionStep(container);
    } else if (attFlow.step === 'watch') {
        renderWatchStep(container);
    }

    try { lucide.createIcons(); } catch(e){}
}

/* =============================================
   STEP RENDERERS — View renderers for class, session type, batch, subject, and action steps
   ============================================= */
// Step 1: Renders grid of available classes for attendance
function renderClassesStep(container) {
    const titleEl = document.getElementById('attStepTitle');
    const subEl   = document.getElementById('attStepSub');
    const badgeEl = document.getElementById('attStepBadge');

    if (titleEl) titleEl.textContent = 'Select Class';
    if (subEl)   subEl.textContent   = 'Choose an academic class to record or inspect attendance';
    if (badgeEl) badgeEl.textContent = 'Step 1 of 4';

    // Prioritize classes that have timetable slots for this teacher or are coordinator classes
    const classesToShow = [..._allClasses].sort((a, b) => {
        const aName = (a.classname || '').toUpperCase();
        const bName = (b.classname || '').toUpperCase();
        return aName.localeCompare(bName);
    });

    if (classesToShow.length === 0) {
        container.innerHTML = `
            <div class="tt-empty-state">
                <div class="tt-empty-icon"><i data-lucide="school"></i></div>
                <h3>No Classes Found</h3>
                <p>No class records exist in the database table.</p>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="att-cards-grid">
            ${classesToShow.map(c => {
                const cName = c.classname || `Class ${c.classid}`;
                const semText = c.semid ? `Semester ${c.semid} · Even Term` : 'Diploma Curriculum';
                
                // Count teacher slots in this class
                const teacherSlots = _allSlots.filter(s => s.class && s.class.classname === cName && teacherMatches(s.teacher?.fullname, TEACHER_NAME));
                const totalStudents = _allStudents.filter(s => s.classId.toUpperCase() === cName.toUpperCase()).length;

                const isCoord = (c.coordinator && c.coordinator === TEACHER_ID) || (cName === 'CO31');

                return `
                    <div class="att-class-card" onclick="selectClass(${c.classid}, '${cName}', ${c.semid || 3})" style="background-color: white">
                        <div class="att-class-card-top">
                            <div class="att-class-badge">${cName}</div>
                            ${isCoord ? `<span class="att-class-role-pill">Coordinator</span>` : ''}
                        </div>
                        <div>
                            <h3 class="att-class-name">Class ${cName}</h3>
                            <p class="att-class-sub">${semText}</p>
                        </div>
                        <div class="att-class-meta-row">
                            <span class="att-class-meta-item">
                                <i data-lucide="users"></i> ${totalStudents} Students
                            </span>
                            <span class="att-class-meta-item">
                                <i data-lucide="calendar"></i> ${teacherSlots.length} ${teacherSlots.length === 1 ? 'Slot' : 'Slots'}
                            </span>
                            <span class="att-card-action-hint">
                                Open <i data-lucide="arrow-right"></i>
                            </span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

window.selectClass = function(classid, classname, semid) {
    attFlow.selectedClass = { classid, classname, semid };
    attFlow.step = 'type';
    renderCurrentStep();
};

// =========================================================================
// STEP 2: SESSION TYPE SELECTION (LECTURE vs LAB)
// =========================================================================

function renderTypeStep(container) {
    const titleEl = document.getElementById('attStepTitle');
    const subEl   = document.getElementById('attStepSub');
    const badgeEl = document.getElementById('attStepBadge');

    if (titleEl) titleEl.textContent = `Class ${attFlow.selectedClass.classname} · Session Type`;
    if (subEl)   subEl.textContent   = 'Select whether this attendance session is a Classroom Lecture or Lab/Tutorial';
    if (badgeEl) badgeEl.textContent = 'Step 2 of 4';

    const cName = attFlow.selectedClass.classname;
    const lectureSlots = _allSlots.filter(s => s.class?.classname === cName && s.slot_type === 'Lecture' && teacherMatches(s.teacher?.fullname, TEACHER_NAME));
    const labSlots = _allSlots.filter(s => s.class?.classname === cName && (s.slot_type === 'Lab' || s.slot_type === 'Tutorial') && teacherMatches(s.teacher?.fullname, TEACHER_NAME));

    container.innerHTML = `
        <div class="att-type-grid" >
            <!-- Card 1: Classroom Lecture -->
            <div class="att-type-card" onclick="selectType('Lecture')" style="background-color: white">
                <div class="att-type-icon lecture">
                    <i data-lucide="presentation"></i>
                </div>
                <h3 class="att-type-title">Classroom Lecture (Theory)</h3>
                <p class="att-type-desc">
                    Full-class theoretical session conducted in the lecture hall. Attendance is taken for the entire class roster.
                </p>
                <span class="att-type-pill">
                    <i data-lucide="book-open"></i> ${lectureSlots.length > 0 ? `${lectureSlots.length} Lectures Assigned` : 'All Class Students'}
                </span>
            </div>

            <!-- Card 2: Lab Practical & Tutorial -->
            <div class="att-type-card" onclick="selectType('Lab')" style="background-color: white">
                <div class="att-type-icon lab">
                    <i data-lucide="flask-conical"></i>
                </div>
                <h3 class="att-type-title">Lab Practical &amp; Tutorial</h3>
                <p class="att-type-desc">
                    Hands-on computer laboratory practical or tutorial conducted in division batches (e.g. Batch 1, Batch 2, Tut 1).
                </p>
                <span class="att-type-pill">
                    <i data-lucide="laptop"></i> ${labSlots.length > 0 ? `${labSlots.length} Lab Sessions Assigned` : 'Batch / Tutorial Groups'}
                </span>
            </div>
        </div>
    `;
}

window.selectType = function(type) {
    attFlow.selectedType = type;
    if (type === 'Lab') {
        attFlow.step = 'batch';
    } else {
        attFlow.step = 'subject';
    }
    renderCurrentStep();
};

// =========================================================================
// STEP 3A (LAB BRANCH): BATCH / TUTORIAL SELECTION
// =========================================================================

function renderBatchStep(container) {
    const titleEl = document.getElementById('attStepTitle');
    const subEl   = document.getElementById('attStepSub');
    const badgeEl = document.getElementById('attStepBadge');

    if (titleEl) titleEl.textContent = `Class ${attFlow.selectedClass.classname} · Select Batch or Tutorial`;
    if (subEl)   subEl.textContent   = 'Choose the specific practical batch or tutorial division for attendance';
    if (badgeEl) badgeEl.textContent = 'Step 3 of 5';

    const classId = attFlow.selectedClass.classid;
    const cName   = attFlow.selectedClass.classname;

    // Filter batches and tutorials for this class
    let batches = _allBatches.filter(b => Number(b.classid) === Number(classId) || (b.batchname && b.batchname.startsWith(cName)));
    let tuts    = _allTutorials.filter(t => Number(t.classid) === Number(classId) || (t.tutorialname && t.tutorialname.startsWith(cName)));

    // Fallback if none in database for this specific class
    if (batches.length === 0 && tuts.length === 0) {
        batches = [
            { batchid: 1, batchname: `${cName}1` },
            { batchid: 2, batchname: `${cName}2` },
            { batchid: 3, batchname: `${cName}3` }
        ];
    }

    container.innerHTML = `
        <div class="att-cards-grid">
            ${batches.map(b => {
                const count = _allStudents.filter(s => s.classId.toUpperCase() === cName.toUpperCase() && (s.batch === b.batchname || s.batch === `Batch ${b.batchid}`)).length;
                return `
                    <div class="att-batch-card" onclick="selectBatch('${b.batchid}', '${b.batchname}', 'batch')" style="background-color: white">
                        <div class="att-batch-top">
                            <div class="att-batch-avatar">${b.batchname.slice(-2)}</div>
                            <span class="att-class-role-pill" style="background:rgba(21,128,61,0.1); color:#15803D;">Lab Batch</span>
                        </div>
                        <div>
                            <h4 class="att-batch-name">${b.batchname}</h4>
                            <p class="att-batch-desc">Practical Division · ${count || 20} Students</p>
                        </div>
                        <div class="att-sub-foot">
                            <span><i data-lucide="users"></i> Batch Enrolled</span>
                            <span style="color:var(--primary); font-weight:700;">Select &rarr;</span>
                        </div>
                    </div>
                `;
            }).join('')}

            ${tuts.map(t => {
                return `
                    <div class="att-batch-card" onclick="selectBatch('${t.tutorialid}', '${t.tutorialname}', 'tut')">
                        <div class="att-batch-top">
                            <div class="att-batch-avatar" style="background:rgba(217,119,6,0.1); color:#D97706;">${t.tutorialname.slice(-2)}</div>
                            <span class="att-class-role-pill" style="background:rgba(217,119,6,0.1); color:#D97706; border-color:rgba(217,119,6,0.2);">Tutorial</span>
                        </div>
                        <div>
                            <h4 class="att-batch-name">${t.tutorialname}</h4>
                            <p class="att-batch-desc">Tutorial Group</p>
                        </div>
                        <div class="att-sub-foot">
                            <span><i data-lucide="book-open"></i> Tutorial Group</span>
                            <span style="color:var(--primary); font-weight:700;">Select &rarr;</span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

window.selectBatch = function(id, name, type) {
    attFlow.selectedBatch = { id, name, type };
    attFlow.step = 'subject';
    renderCurrentStep();
};

// =========================================================================
// STEP 3B: SUBJECT SELECTION
// =========================================================================

function renderSubjectStep(container) {
    const titleEl = document.getElementById('attStepTitle');
    const subEl   = document.getElementById('attStepSub');
    const badgeEl = document.getElementById('attStepBadge');

    const cName = attFlow.selectedClass.classname;
    const type  = attFlow.selectedType;
    const batchText = attFlow.selectedBatch ? ` · ${attFlow.selectedBatch.name}` : '';

    if (titleEl) titleEl.textContent = `Class ${cName}${batchText} · Select Subject`;
    if (subEl)   subEl.textContent   = `Choose the curriculum subject for this ${type.toLowerCase()} attendance`;
    if (badgeEl) badgeEl.textContent = attFlow.selectedType === 'Lab' ? 'Step 4 of 5' : 'Step 3 of 4';

    // 1. Find teacher's assigned subjects for this class and type
    const slotsForClass = _allSlots.filter(s => 
        s.class?.classname === cName && 
        s.slot_type === type &&
        teacherMatches(s.teacher?.fullname, TEACHER_NAME)
    );

    let subjectsMap = new Map();
    slotsForClass.forEach(slot => {
        if (!slot.subject) return;
        const code = slot.subject.subjectcode;
        if (!subjectsMap.has(code)) {
            subjectsMap.set(code, {
                code: slot.subject.subjectcode,
                name: slot.subject.subjectname,
                room: slot.room || 'Classroom',
                color: SUB_COLORS[code] || '#15803D',
                time: slot.time || '',
                slotId: slot.slotid
            });
        }
    });

    // 2. If no specific teacher slots in this class, show all class subjects from database
    if (subjectsMap.size === 0) {
        _allSubjects.forEach(sub => {
            const code = sub.subjectcode;
            if (!subjectsMap.has(code)) {
                subjectsMap.set(code, {
                    code: sub.subjectcode,
                    name: sub.subjectname,
                    room: type === 'Lab' ? 'Computer Lab' : 'Lecture Hall',
                    color: SUB_COLORS[code] || '#15803D',
                    time: '',
                    slotId: null
                });
            }
        });
    }

    const subjectsList = Array.from(subjectsMap.values());

    if (subjectsList.length === 0) {
        container.innerHTML = `
            <div class="tt-empty-state">
                <div class="tt-empty-icon"><i data-lucide="book-x"></i></div>
                <h3>No Subjects Available</h3>
                <p>No subjects could be found in the database for Class ${cName}.</p>
            </div>`;
        return;
    }

    // Check logged attendance sessions
    const log = getAttendanceLog();

    container.innerHTML = `
        <div class="att-cards-grid">
            ${subjectsList.map(sub => {
                // Count logged sessions for this subject + class
                const loggedSessions = log.filter(l => 
                    String(l.classId).toUpperCase() === cName.toUpperCase() && 
                    (String(l.code).toUpperCase() === sub.code.toUpperCase() || String(l.sub).toUpperCase() === sub.name.toUpperCase())
                );

                return `
                    <div class="att-subject-card" style="--sub-color:${sub.color}; background-color: white" onclick="selectSubject('${sub.code}', '${sub.name.replace(/'/g, "\\'")}', '${sub.room}', '${sub.color}', ${sub.slotId})">
                        <div class="att-sub-top">
                            <span class="att-sub-code-badge">${sub.code}</span>
                            <span class="att-class-role-pill" style="background:var(--surface-tint); color:var(--primary);">${type}</span>
                        </div>
                        <div>
                            <h4 class="att-sub-title">${sub.name}</h4>
                            <p class="att-sub-meta">
                                <span><i data-lucide="map-pin"></i> ${sub.room}</span>
                                <span><i data-lucide="user"></i> ${TEACHER_NAME}</span>
                            </p>
                        </div>
                        <div class="att-sub-foot">
                            <span><i data-lucide="history"></i> ${loggedSessions.length} Sessions Logged</span>
                            <span style="color:var(--primary); font-weight:700;">Select &rarr;</span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

window.selectSubject = function(code, name, room, color, slotId) {
    attFlow.selectedSubject = { code, name, room, color, slotId };
    attFlow.step = 'action';
    renderCurrentStep();
};

// =========================================================================
// STEP 4: ACTION PROMPT ("TAKE ATTENDANCE" vs "WATCH ATTENDANCE")
// =========================================================================

function renderActionStep(container) {
    const titleEl = document.getElementById('attStepTitle');
    const subEl   = document.getElementById('attStepSub');
    const badgeEl = document.getElementById('attStepBadge');

    const cName = attFlow.selectedClass.classname;
    const sub   = attFlow.selectedSubject;
    const type  = attFlow.selectedType;
    const batch = attFlow.selectedBatch ? ` (${attFlow.selectedBatch.name})` : '';

    if (titleEl) titleEl.textContent = `${sub.name} · Choose Action`;
    if (subEl)   subEl.textContent   = `Class ${cName}${batch} · ${type} · What would you like to do?`;
    if (badgeEl) badgeEl.textContent = 'Action Selection';

    container.innerHTML = `
        <div class="att-action-choice-grid">
            <!-- Option 1: Take Attendance -->
            <div class="att-action-choice-card take" onclick="triggerTakeAttendance()" style="background-color: white">
                <div class="att-action-choice-icon">
                    <i data-lucide="clipboard-check"></i>
                </div>
                <div>
                    <h3 class="att-action-choice-title">Take Attendance</h3>
                    <p class="att-action-choice-desc">
                        Mark present/absent for today's session with fast 1-click toggles, batch jump shortcuts, and instant database save.
                    </p>
                </div>
                <button type="button" class="att-action-choice-btn">
                    <i data-lucide="check-square"></i> Open Attendance Sheet
                </button>
            </div>

            <!-- Option 2: Watch Attendance -->
            <div class="att-action-choice-card watch" onclick="triggerWatchAttendance()" style="background-color: white"f>
                <div class="att-action-choice-icon">
                    <i data-lucide="eye"></i>
                </div>
                <div>
                    <h3 class="att-action-choice-title">Watch Attendance</h3>
                    <p class="att-action-choice-desc">
                        Inspect previous attendance sessions, review student-by-student attendance percentages, and audit past records.
                    </p>
                </div>
                <button type="button" class="att-action-choice-btn">
                    <i data-lucide="bar-chart-2"></i> View Attendance Register
                </button>
            </div>
        </div>
    `;
}

window.triggerTakeAttendance = function() {
    openAttendanceSheetModal();
};

window.triggerWatchAttendance = function() {
    attFlow.step = 'watch';
    renderCurrentStep();
};

/* =============================================
   ATTENDANCE MODAL — Attendance sheet dialog, grid/table roster views, and rapid absentee marking
   ============================================= */
// Opens attendance roster modal for selected class, subject, and session type
function openAttendanceSheetModal() {
    const cName = attFlow.selectedClass.classname;
    const sub   = attFlow.selectedSubject;
    const type  = attFlow.selectedType;
    const batch = attFlow.selectedBatch;
    const today = todayDateStr();

    // Filter class students (and batch if lab!)
    let roster = _allStudents.filter(s => 
        (s.classId && s.classId.toUpperCase() === cName.toUpperCase()) ||
        (s.class_id && attFlow.selectedClass.classid && s.class_id === attFlow.selectedClass.classid)
    );
    if (type === 'Lab' && batch) {
        const batchRoster = roster.filter(s => 
            s.batch === batch.name || 
            s.tut === batch.name || 
            s.batchId === batch.id || 
            s.tutId === batch.id ||
            s.batch === `Batch ${batch.id}`
        );
        if (batchRoster.length > 0) roster = batchRoster;
    }

    // Check existing attendance log for today
    const log = getAttendanceLog();
    const existingSession = log.find(l => 
        String(l.classId).toUpperCase() === cName.toUpperCase() && 
        l.date === today && 
        (String(l.code).toUpperCase() === sub.code.toUpperCase() || String(l.sub).toUpperCase() === sub.name.toUpperCase())
    );

    const recordMap = new Map();
    if (existingSession && existingSession.records) {
        existingSession.records.forEach(r => recordMap.set(String(r.enroll), Boolean(r.present)));
    }

    currentAttSession = roster.map((s, idx) => {
        const enrollStr = String(s.enroll);
        const wasPresent = recordMap.has(enrollStr) ? recordMap.get(enrollStr) : false;
        
        // Roll number suffix (e.g. 256400307033 -> 33, or idx + 1)
        let rollSuffix = enrollStr.slice(-3).replace(/^0+/, '');
        if (!rollSuffix) rollSuffix = String(idx + 1);

        return {
            id: s.id,
            enroll: enrollStr,
            name: s.name,
            batch: s.batch,
            rollNo: rollSuffix,
            sNo: idx + 1,
            // Default to present if no existing record, making taking attendance 10x faster!
            present: existingSession ? wasPresent : true
        };
    });

    // Reset UI view modes
    attViewMode = 'grid';
    attStatusFilter = 'all';
    attCallerIndex = 0;

    // Populate modal headers
    const titleEl = document.getElementById('attSlotTitle');
    const metaEl  = document.getElementById('attSlotMeta');
    const dateEl  = document.getElementById('attDateDisplay');

    if (titleEl) titleEl.textContent = `${sub.name} (${sub.code})`;
    if (metaEl) {
        const batchBadge = batch ? ` &nbsp;•&nbsp; <strong>${batch.name}</strong>` : '';
        metaEl.innerHTML = `<span class="class-pill ${cName.toLowerCase()}">Class ${cName}</span>${batchBadge} &nbsp;•&nbsp; <strong>${sub.room}</strong> &nbsp;•&nbsp; ${type}`;
    }
    if (dateEl) dateEl.textContent = today;

    const searchInput = document.getElementById('attSearchInput');
    if (searchInput) searchInput.value = '';
    const quickAbsentInput = document.getElementById('attQuickAbsentInput');
    if (quickAbsentInput) quickAbsentInput.value = '';

    // Render roster and display modal
    setAttendanceViewMode('grid');
    document.getElementById('attendanceModal').classList.add('open');

    setTimeout(() => {
        const inp = document.getElementById('attQuickAbsentInput') || document.getElementById('attSearchInput');
        if (inp) inp.focus();
    }, 150);

    try { lucide.createIcons(); } catch(e){}
}

window.closeAttendanceModal = function() {
    document.getElementById('attendanceModal').classList.remove('open');
    currentAttSession = [];
};

// =========================================================================
// VIEW MODES & FILTER CONTROLLERS
// =========================================================================

let attViewMode = 'grid'; // 'grid' | 'list' | 'caller'
let attStatusFilter = 'all'; // 'all' | 'present' | 'absent'
let attCallerIndex = 0;

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

function renderCurrentAttendanceRoster() {
    const q = (document.getElementById('attSearchInput')?.value || '').toLowerCase().trim();

    // Filter by search query + active status tab
    const visible = currentAttSession.filter(s => {
        // Status filter
        if (attStatusFilter === 'present' && !s.present) return false;
        if (attStatusFilter === 'absent' && s.present) return false;

        // Search text filter
        if (!q) return true;
        return (
            s.enroll.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q) ||
            String(s.rollNo).toLowerCase() === q ||
            String(s.sNo) === q ||
            (s.batch && s.batch.toLowerCase().includes(q))
        );
    });

    // 1. Render Grid View Cards Matrix
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

    // 2. Render Traditional Table List
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

// In-place, lightning-fast attendance toggle
window.toggleStudentAttendance = function(enroll) {
    const student = currentAttSession.find(s => s.enroll === String(enroll));
    if (!student) return;
    student.present = !student.present;

    // 1. In-place Grid tile update
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

    // 2. In-place Table row update
    const row = document.querySelector(`.att-row[data-enroll="${enroll}"]`);
    if (row) {
        row.className = `att-row ${student.present ? 'present' : 'absent'}`;
        const pill = row.querySelector('.att-status-pill');
        if (pill) {
            pill.className = `att-status-pill ${student.present ? 'p' : 'a'}`;
            pill.innerHTML = `<i data-lucide="${student.present ? 'check' : 'x'}"></i><span>${student.present ? 'Present' : 'Absent'}</span>`;
        }
    }

    // If caller mode is open
    if (attViewMode === 'caller') {
        renderRollCallerCurrent();
    }

    // If active filter requires removing item from view
    if (attStatusFilter !== 'all') {
        renderCurrentAttendanceRoster();
    }

    updateAttStats();
    updateAbsentChipsTray();
    try { lucide.createIcons(); } catch(e){}
};

// =========================================================================
// SUPER-FAST ABSENTEE INPUT & BULK CONTROLLERS
// =========================================================================

window.handleQuickAbsentKeydown = function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        applyQuickAbsentInput();
    }
};

window.applyQuickAbsentInput = function() {
    const inp = document.getElementById('attQuickAbsentInput');
    if (!inp) return;
    const raw = inp.value.trim();
    if (!raw) return;

    // Split by comma, space or semicolon: e.g. "14, 33, 64"
    const tokens = raw.split(/[\s,;]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
    let marked = 0;

    tokens.forEach(tok => {
        const cleanTok = tok.replace(/^#/, '');
        const match = currentAttSession.find(s => 
            String(s.rollNo).toLowerCase() === cleanTok ||
            String(s.sNo) === cleanTok ||
            s.enroll.toLowerCase() === cleanTok ||
            s.enroll.toLowerCase().endsWith(cleanTok)
        );
        if (match) {
            match.present = false; // Mark Absent
            marked++;
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

/* =============================================
   ROLL CALLER — One-by-one sequential student roll call walker with keyboard shortcuts
   ============================================= */
// Renders active student card in 1-by-1 roll caller view
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

/* =============================================
   SAVE & HISTORY — Attendance rate analytics, database persistence, and history register audit
   ============================================= */
// Calculates and updates present/absent counts and attendance percentage
function updateAttStats() {
    const total = currentAttSession.length;
    const present = currentAttSession.filter(s => s.present).length;
    const absent = total - present;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;

    // Filter pill count badges
    const cAll = document.getElementById('attCountAll');
    const cPre = document.getElementById('attCountPresent');
    const cAbs = document.getElementById('attCountAbsent');
    if (cAll) cAll.textContent = total;
    if (cPre) cPre.textContent = present;
    if (cAbs) cAbs.textContent = absent;

    // Stats bar inside modal header
    const barEl = document.getElementById('attStatsBar');
    if (barEl) {
        barEl.innerHTML = `
            <span style="color:#059669; font-weight:700;"><i data-lucide="user-check"></i> ${present} Present</span>
            <span style="color:#DC2626; font-weight:700;"><i data-lucide="user-x"></i> ${absent} Absent</span>
            <span style="color:var(--text-muted); font-weight:600;">Total Students: ${total}</span>
            <span style="margin-left:auto; font-weight:800; color:var(--primary); font-size:15px;">${pct}% Rate</span>`;
        try { lucide.createIcons(); } catch(e){}
    }

    const pctBar = document.getElementById('attPctBar');
    if (pctBar) pctBar.style.width = `${pct}%`;

    // Footer summary readout
    const footSum = document.getElementById('attFootSummary');
    if (footSum) {
        footSum.innerHTML = `
            <span style="color:#059669;">${present} Present</span> &nbsp;•&nbsp;
            <span style="color:#dc2626;">${absent} Absent</span> &nbsp;•&nbsp;
            <span><strong>${pct}%</strong> Attendance Rate</span>`;
    }
}

window.saveAttendance = function() {
    const cName = attFlow.selectedClass.classname;
    const sub   = attFlow.selectedSubject;
    const type  = attFlow.selectedType;
    const batch = attFlow.selectedBatch;
    const today = todayDateStr();
    const log   = getAttendanceLog();

    const total = currentAttSession.length;
    const present = currentAttSession.filter(s => s.present).length;
    const absent = total - present;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;

    const absentees = currentAttSession.filter(s => !s.present);
    const absPrompt = absentees.length > 0 
        ? `${absentees.length} Absent (${absentees.map(a => '#' + a.rollNo).join(', ')})` 
        : 'All students present!';

    const confirmMsg = `Save attendance for ${cName} · ${sub.name}?\n\n• Present: ${present}\n• Absent: ${absent}\n• Absentees: ${absPrompt}\n\nProceed to save?`;
    if (!confirm(confirmMsg)) return;

    const record = {
        slotId: sub.slotId || Date.now(),
        classId: cName,
        batchName: batch ? batch.name : 'All Batches',
        type: type,
        time: sub.time || 'Regular Session',
        code: sub.code,
        sub: sub.name,
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

    // Update if already logged for today, or append
    const existingIdx = log.findIndex(l => 
        String(l.classId).toUpperCase() === cName.toUpperCase() && 
        l.date === today && 
        (String(l.code).toUpperCase() === sub.code.toUpperCase() || String(l.sub).toUpperCase() === sub.name.toUpperCase()) &&
        (!batch || l.batchName === batch.name)
    );

    if (existingIdx >= 0) {
        log[existingIdx] = record;
    } else {
        log.push(record);
    }

    saveAttendanceLog(log);
    closeAttendanceModal();

    // Transition to watch view to review saved sessions
    attFlow.step = 'watch';
    renderCurrentStep();
};

window.handleAttSearch = function(val) {
    renderCurrentAttendanceRoster();
};

window.handleAttModalKeydown = function(e) {
    // If typing in an input, don't trigger hotkeys
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

// =========================================================================
// STEP 5B: WATCH ATTENDANCE REGISTER VIEW
// =========================================================================

function renderWatchStep(container) {
    const titleEl = document.getElementById('attStepTitle');
    const subEl   = document.getElementById('attStepSub');
    const badgeEl = document.getElementById('attStepBadge');

    const cName = attFlow.selectedClass.classname;
    const sub   = attFlow.selectedSubject;
    const type  = attFlow.selectedType;
    const batch = attFlow.selectedBatch;
    const batchText = batch ? ` · ${batch.name}` : '';

    if (titleEl) titleEl.textContent = `${sub.name} · Attendance Register`;
    if (subEl)   subEl.textContent   = `Class ${cName}${batchText} · ${type} · History & Student Attendance Audit`;
    if (badgeEl) badgeEl.textContent = 'Attendance Log';

    const log = getAttendanceLog();

    // Filter sessions matching this class + subject (+ batch if applicable)
    const sessions = log.filter(l => {
        const classMatch = String(l.classId).toUpperCase() === cName.toUpperCase();
        const subMatch   = String(l.code).toUpperCase() === sub.code.toUpperCase() || String(l.sub).toUpperCase() === sub.name.toUpperCase();
        const batchMatch = !batch || (l.batchName && l.batchName === batch.name);
        return classMatch && subMatch && batchMatch;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Compute KPIs
    const totalSessions = sessions.length;
    let avgPct = 0;
    if (totalSessions > 0) {
        const sumPct = sessions.reduce((acc, s) => acc + (s.stats?.pct || 0), 0);
        avgPct = Math.round(sumPct / totalSessions);
    }

    // Filter class students
    let roster = _allStudents.filter(s => 
        (s.classId && s.classId.toUpperCase() === cName.toUpperCase()) ||
        (s.class_id && attFlow.selectedClass.classid && s.class_id === attFlow.selectedClass.classid)
    );
    if (type === 'Lab' && batch) {
        const batchRoster = roster.filter(s => 
            s.batch === batch.name || 
            s.tut === batch.name || 
            s.batchId === batch.id || 
            s.tutId === batch.id ||
            s.batch === `Batch ${batch.id}`
        );
        if (batchRoster.length > 0) roster = batchRoster;
    }

    container.innerHTML = `
        <div class="att-watch-container">
            <div class="att-watch-header">
                <div>
                    <h3 style="font-size:18px; font-weight:800; margin:0 0 4px 0;">Recorded Attendance Sessions</h3>
                    <p style="font-size:13px; color:var(--text-muted); margin:0;">Past lecture logs and student present/absent breakdown</p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="primary-action-btn" onclick="triggerTakeAttendance()">
                        <i data-lucide="plus-circle"></i> Take New Attendance
                    </button>
                    <button class="primary-action-btn" onclick="exportAttendanceWatchCSV()" style="background:var(--surface); border:1px solid var(--border-color); color:var(--text-primary);">
                        <i data-lucide="download"></i> Export CSV
                    </button>
                </div>
            </div>

            <!-- KPIs -->
            <div class="att-watch-kpis">
                <div class="att-watch-kpi">
                    <div class="att-watch-kpi-lbl">Total Sessions Logged</div>
                    <div class="att-watch-kpi-val">${totalSessions}</div>
                </div>
                <div class="att-watch-kpi">
                    <div class="att-watch-kpi-lbl">Average Attendance</div>
                    <div class="att-watch-kpi-val" style="color:var(--primary)">${totalSessions > 0 ? `${avgPct}%` : '—'}</div>
                </div>
                <div class="att-watch-kpi">
                    <div class="att-watch-kpi-lbl">Enrolled Students</div>
                    <div class="att-watch-kpi-val">${roster.length}</div>
                </div>
            </div>

            <!-- Session Log Table -->
            <h4 style="font-size:15px; font-weight:700; margin:24px 0 12px 0;">Logged Sessions History</h4>
            <div class="att-watch-table-wrap">
                <table class="att-watch-table">
                    <thead>
                        <tr>
                            <th style="width:40px">#</th>
                            <th>Date</th>
                            <th>Session Type</th>
                            <th>Batch</th>
                            <th>Present / Total</th>
                            <th>Percentage</th>
                            <th style="text-align:right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sessions.length === 0 ? `
                            <tr>
                                <td colspan="7" style="text-align:center; padding:36px; color:var(--text-muted);">
                                    <i data-lucide="clock" style="display:block; margin:0 auto 8px auto; width:24px; height:24px;"></i>
                                    No attendance sessions have been logged for this subject yet.<br>
                                    <button class="primary-action-btn" style="margin-top:12px;" onclick="triggerTakeAttendance()">
                                        <i data-lucide="clipboard-check"></i> Take First Attendance
                                    </button>
                                </td>
                            </tr>
                        ` : sessions.map((s, idx) => {
                            const pct = s.stats?.pct ?? 0;
                            const isHigh = pct >= 75;
                            const pillBg = isHigh ? 'rgba(21,128,61,0.1)' : 'rgba(220,38,38,0.1)';
                            const pillCol = isHigh ? '#15803D' : '#DC2626';
                            return `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td><strong>${s.date}</strong></td>
                                    <td><span class="slot-type-badge slot-type-${(s.type || 'Lecture').toLowerCase()}">${s.type || 'Lecture'}</span></td>
                                    <td>${s.batchName || 'All Batches'}</td>
                                    <td><strong>${s.stats?.present || 0}</strong> / ${s.stats?.total || 0}</td>
                                    <td>
                                        <span style="background:${pillBg}; color:${pillCol}; padding:3px 8px; border-radius:6px; font-weight:700; font-size:12px;">
                                            ${pct}%
                                        </span>
                                    </td>
                                    <td style="text-align:right">
                                        <button class="tt-slot-btn edit" onclick="editPastAttendanceSession('${s.date}')">
                                            <i data-lucide="edit-2"></i> Edit
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Student Breakdown Table -->
            <h4 style="font-size:15px; font-weight:700; margin:32px 0 12px 0;">Student Register &amp; Attendance Audit</h4>
            <div class="att-watch-table-wrap">
                <table class="att-watch-table">
                    <thead>
                        <tr>
                            <th style="width:40px">#</th>
                            <th>Enrollment No.</th>
                            <th>Student Name</th>
                            <th>Batch</th>
                            <th>Attended / Total</th>
                            <th>Overall %</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${roster.map((stu, idx) => {
                            let attended = 0;
                            sessions.forEach(sess => {
                                const found = (sess.records || []).find(r => String(r.enroll) === String(stu.enroll));
                                if (found && found.present) attended++;
                            });
                            const total = totalSessions;
                            const pct = total > 0 ? Math.round((attended / total) * 100) : null;
                            const isDefaulter = pct !== null && pct < 75;

                            return `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td><strong>${stu.enroll}</strong></td>
                                    <td>${stu.name}</td>
                                    <td>${stu.batch || '—'}</td>
                                    <td>${total > 0 ? `<strong>${attended}</strong> / ${total}` : '—'}</td>
                                    <td>
                                        ${pct !== null ? `
                                            <span style="font-weight:700; color:${pct >= 75 ? '#15803D' : '#DC2626'}">
                                                ${pct}%
                                            </span>
                                        ` : '—'}
                                    </td>
                                    <td>
                                        ${total === 0 ? '—' : (isDefaulter ? `
                                            <span class="defaulter-pill" style="font-size:11px; padding:2px 8px; border-radius:4px; background:rgba(220,38,38,0.1); color:#DC2626; font-weight:700;">
                                                Defaulter (&lt;75%)
                                            </span>
                                        ` : `
                                            <span style="font-size:11px; padding:2px 8px; border-radius:4px; background:rgba(21,128,61,0.1); color:#15803D; font-weight:700;">
                                                Regular (&ge;75%)
                                            </span>
                                        `)}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

        </div>
    `;
    try { lucide.createIcons(); } catch(e){}
}

window.editPastAttendanceSession = function(date) {
    const cName = attFlow.selectedClass.classname;
    const sub   = attFlow.selectedSubject;
    const batch = attFlow.selectedBatch;
    const log   = getAttendanceLog();

    const targetSession = log.find(l => 
        String(l.classId).toUpperCase() === cName.toUpperCase() && 
        l.date === date && 
        (String(l.code).toUpperCase() === sub.code.toUpperCase() || String(l.sub).toUpperCase() === sub.name.toUpperCase()) &&
        (!batch || l.batchName === batch.name)
    );

    if (!targetSession) return;

    // Load session records
    const recordMap = new Map();
    (targetSession.records || []).forEach(r => recordMap.set(String(r.enroll), Boolean(r.present)));

    let roster = _allStudents.filter(s => s.classId.toUpperCase() === cName.toUpperCase());
    if (attFlow.selectedType === 'Lab' && batch) {
        const batchRoster = roster.filter(s => s.batch === batch.name || s.tut === batch.name || s.batch === `Batch ${batch.id}`);
        if (batchRoster.length > 0) roster = batchRoster;
    }
    if (roster.length === 0) {
        roster = _allStudents.filter(s => s.classId.toUpperCase() === 'CO31');
    }

    currentAttSession = roster.map(s => {
        const enrollStr = String(s.enroll);
        const wasPresent = recordMap.has(enrollStr) ? recordMap.get(enrollStr) : false;
        return {
            id: s.id,
            enroll: enrollStr,
            name: s.name,
            batch: s.batch,
            present: wasPresent
        };
    });

    const titleEl = document.getElementById('attSlotTitle');
    const metaEl  = document.getElementById('attSlotMeta');
    const dateEl  = document.getElementById('attDateDisplay');

    if (titleEl) titleEl.textContent = `${sub.name} (${sub.code}) · Edit Session`;
    if (metaEl)  metaEl.innerHTML = `<span class="class-pill ${cName.toLowerCase()}">Class ${cName}</span> &nbsp;•&nbsp; <strong>${sub.room}</strong> &nbsp;•&nbsp; ${targetSession.type || 'Lecture'}`;
    if (dateEl)  dateEl.textContent = date;

    const searchInput = document.getElementById('attSearchInput');
    if (searchInput) searchInput.value = '';

    renderAttendanceStudentList('');
    document.getElementById('attendanceModal').classList.add('open');
    try { lucide.createIcons(); } catch(e){}
};

window.exportAttendanceWatchCSV = function() {
    const cName = attFlow.selectedClass.classname;
    const sub   = attFlow.selectedSubject;
    const log   = getAttendanceLog();

    const sessions = log.filter(l => 
        String(l.classId).toUpperCase() === cName.toUpperCase() && 
        (String(l.code).toUpperCase() === sub.code.toUpperCase() || String(l.sub).toUpperCase() === sub.name.toUpperCase())
    );

    if (sessions.length === 0) {
        alert('No attendance sessions logged to export.');
        return;
    }

    const headers = ['Date', 'Class', 'Subject', 'Subject Code', 'Session Type', 'Batch', 'Present', 'Total', 'Percentage'];
    const rows = sessions.map(s => [
        `"${s.date}"`,
        `"${s.classId}"`,
        `"${(s.sub || '').replace(/"/g, '""')}"`,
        `"${s.code || ''}"`,
        `"${s.type || 'Lecture'}"`,
        `"${s.batchName || 'All Batches'}"`,
        s.stats?.present || 0,
        s.stats?.total || 0,
        `"${s.stats?.pct || 0}%"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Treva_Attendance_${cName}_${sub.code}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// =========================================================================
// HELPER FUNCTIONS
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
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
