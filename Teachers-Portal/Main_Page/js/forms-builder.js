/**
 * ============================================================================
 * TREVAFORMS — VINTAGE UNIVERSITY FORM BUILDER & MANAGEMENT ENGINE
 * Interactive 3-Column Drag & Drop Form Builder + Responses System
 * ============================================================================
 */

(function initTrevaForms() {
    /* =============================================
       STATE & STORAGE — Form definitions and response persistence
       ============================================= */

    // Storage keys
    const STORAGE_FORMS_KEY = 'treva_forms_data_v1';
    const STORAGE_RESPONSES_KEY = 'treva_forms_responses_v1';

    // State
    let forms = [];
    let responses = {};
    let selectedFormId = null;
    let currentBuilderForm = null;
    let selectedQuestionId = null;
    let draggedQuestionIndex = null;
    let activeResponsesFormId = null;
    let activeResponsesFilter = 'ALL';
    let activeResponsesSearch = '';

    // Available Element Types Definition
    const ELEMENT_TYPES = [
        { type: 'short_text', name: 'Short Text', icon: 'type', hint: 'Single-line text answer' },
        { type: 'long_text', name: 'Long Text', icon: 'align-left', hint: 'Multi-line paragraph answer' },
        { type: 'multiple_choice', name: 'Multiple Choice', icon: 'circle-dot', hint: 'Select one from several options' },
        { type: 'checkbox', name: 'Checkbox', icon: 'check-square', hint: 'Select multiple choices' },
        { type: 'dropdown', name: 'Dropdown', icon: 'list', hint: 'Select from a drop-down list' },
        { type: 'rating', name: 'Rating', icon: 'star', hint: 'Star score rating scale' },
        { type: 'date', name: 'Date', icon: 'calendar', hint: 'Date selection input' },
        { type: 'file_upload', name: 'File Upload', icon: 'upload-cloud', hint: 'Upload PDF, images or docs' },
        { type: 'number', name: 'Number', icon: 'hash', hint: 'Numeric value input' }
    ];

    // Loads saved forms and responses from localStorage
    function loadState() {
        try {
            const rawForms = localStorage.getItem(STORAGE_FORMS_KEY);
            if (rawForms) {
                const parsed = JSON.parse(rawForms);
                // Strip any old fake seed forms
                forms = Array.isArray(parsed) ? parsed.filter(f => !String(f.id).startsWith('form_seed_')) : [];
            } else {
                forms = [];
            }

            const rawResp = localStorage.getItem(STORAGE_RESPONSES_KEY);
            if (rawResp) {
                const parsedResp = JSON.parse(rawResp);
                // Strip any old fake seed responses
                delete parsedResp['form_seed_1'];
                delete parsedResp['form_seed_2'];
                delete parsedResp['form_seed_3'];
                responses = parsedResp;
            } else {
                responses = {};
            }
        } catch (e) {
            console.error('Failed loading TrevaForms state:', e);
            forms = [];
            responses = {};
        }

        // Sort forms: most recent first (by updatedAt or createdAt desc)
        sortFormsMostRecent();

        if (forms.length > 0) {
            selectedFormId = forms[0].id;
        } else {
            selectedFormId = null;
        }
    }

    function sortFormsMostRecent() {
        forms.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    }

    // Saves forms array to localStorage with recent sorting
    function saveFormsToStorage() {
        sortFormsMostRecent();
        localStorage.setItem(STORAGE_FORMS_KEY, JSON.stringify(forms));
    }

    // Saves responses dictionary to localStorage
    function saveResponsesToStorage() {
        localStorage.setItem(STORAGE_RESPONSES_KEY, JSON.stringify(responses));
    }

    // Displays temporary toast alert notification
    function showToast(message, icon = 'check-circle') {
        let toast = document.getElementById('trevaToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'trevaToast';
            toast.className = 'treva-toast';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<i data-lucide="${icon}"></i> <span>${message}</span>`;
        if (window.lucide) window.lucide.createIcons();
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3200);
    }

    /* =============================================
       FORMS HUB — Form catalog, statistics, and main view switching
       ============================================= */

    // Displays the forms hub view and catalog
    window.showFormsHub = function() {
        const homeSec = document.getElementById('homeSection');
        const formsSec = document.getElementById('formsSection');
        const builderSec = document.getElementById('formBuilderView');
        const hubSec = document.getElementById('formsHubView');

        if (homeSec) homeSec.style.display = 'none';
        if (formsSec) formsSec.style.display = 'block';
        if (builderSec) builderSec.style.display = 'none';
        if (hubSec) hubSec.style.display = 'block';

        renderFormsHub();
        if (window.lucide) window.lucide.createIcons();
    };

    window.showHomeView = function() {
        const homeSec = document.getElementById('homeSection');
        const formsSec = document.getElementById('formsSection');
        if (formsSec) formsSec.style.display = 'none';
        if (homeSec) homeSec.style.display = 'block';
    };

    // Renders forms hub stats, dropdown, and catalog cards
    function renderFormsHub() {
        sortFormsMostRecent();

        // 1. Populate Dropdown (most recent first)
        const dropdown = document.getElementById('formsDropdownSelect');
        if (dropdown) {
            dropdown.innerHTML = '';
            if (forms.length === 0) {
                dropdown.innerHTML = '<option value="">No forms available</option>';
            } else {
                forms.forEach(f => {
                    const opt = document.createElement('option');
                    opt.value = f.id;
                    const dateStr = new Date(f.updatedAt || f.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const respCount = (responses[f.id] || []).length;
                    const statusStr = f.status === 'published' ? '🟢 Published' : '🟠 Draft';
                    opt.textContent = `${f.title} · ${statusStr} (${respCount} responses) · ${dateStr}`;
                    if (f.id === selectedFormId) {
                        opt.selected = true;
                    }
                    dropdown.appendChild(opt);
                });
            }
        }

        // 2. Update Stats
        const totalFormsCount = forms.length;
        const publishedCount = forms.filter(f => f.status === 'published').length;
        let totalResponsesCount = 0;
        let totalRatingsSum = 0;
        let ratingsCount = 0;

        Object.keys(responses).forEach(fid => {
            const list = responses[fid] || [];
            totalResponsesCount += list.length;
            list.forEach(r => {
                if (r.answers) {
                    Object.values(r.answers).forEach(ans => {
                        if (typeof ans === 'number') {
                            totalRatingsSum += ans;
                            ratingsCount++;
                        }
                    });
                }
            });
        });

        const avgRating = ratingsCount > 0 ? (totalRatingsSum / ratingsCount).toFixed(1) + ' / 5.0' : '4.8 / 5.0';

        const elTotal = document.getElementById('hubStatTotalForms');
        const elPub = document.getElementById('hubStatPublished');
        const elResp = document.getElementById('hubStatResponses');
        const elRating = document.getElementById('hubStatAvgRating');

        if (elTotal) elTotal.textContent = totalFormsCount;
        if (elPub) elPub.textContent = publishedCount;
        if (elResp) elResp.textContent = totalResponsesCount;
        if (elRating) elRating.textContent = avgRating;

        // 3. Render Form Cards Grid
        const grid = document.getElementById('formsCatalogGrid');
        if (grid) {
            grid.innerHTML = '';
            forms.forEach(f => {
                const respCount = (responses[f.id] || []).length;
                const dateStr = new Date(f.updatedAt || f.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const isSelected = f.id === selectedFormId;

                const card = document.createElement('div');
                card.className = `form-item-card ${isSelected ? 'active-selected' : ''}`;
                card.onclick = (e) => {
                    // avoid clicking child mini buttons
                    if (e.target.closest('.form-mini-btn')) return;
                    selectForm(f.id);
                };

                card.innerHTML = `
                    <div class="form-item-top">
                        <div class="form-item-title">${escapeHtml(f.title)}</div>
                        <span class="status-badge ${f.status}">${f.status === 'published' ? 'Published' : 'Draft'}</span>
                    </div>
                    <div class="form-item-desc">${escapeHtml(f.description || 'No description provided.')}</div>
                    <div class="form-item-meta">
                        <span><strong>${(f.questions || []).length}</strong> questions · <strong>${respCount}</strong> responses</span>
                        <span>${dateStr}</span>
                    </div>
                    <div class="form-item-actions">
                        <button class="form-mini-btn" onclick="openFormBuilder('${f.id}')" title="Edit in Builder">
                            <i data-lucide="edit-3"></i> Edit
                        </button>
                        <button class="form-mini-btn" onclick="openFormViewModal('${f.id}')" title="View & Test Form">
                            <i data-lucide="eye"></i> View
                        </button>
                        <button class="form-mini-btn" onclick="openSingleFormResponses('${f.id}')" title="View Responses for this form">
                            <i data-lucide="bar-chart-2"></i> Responses (${respCount})
                        </button>
                        <button class="form-mini-btn" onclick="copyFormLink('${f.id}')" title="Copy Public Share Link">
                            <i data-lucide="share-2"></i> Share
                        </button>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        if (window.lucide) window.lucide.createIcons();
    }

    window.handleFormSelectChange = function(formId) {
        selectForm(formId);
    };

    function selectForm(formId) {
        selectedFormId = formId;
        renderFormsHub();
    }

    /* =============================================
       FORM BUILDER LAYOUT — 3-column builder initialization and view actions
       ============================================= */

    // Opens the 3-column form builder workspace
    window.openFormBuilder = function(existingId = null) {
        const hubSec = document.getElementById('formsHubView');
        const builderSec = document.getElementById('formBuilderView');

        if (hubSec) hubSec.style.display = 'none';
        if (builderSec) builderSec.style.display = 'flex';

        if (existingId) {
            const found = forms.find(f => f.id === existingId);
            if (found) {
                currentBuilderForm = JSON.parse(JSON.stringify(found));
            } else {
                createNewFormTemplate();
            }
        } else {
            createNewFormTemplate();
        }

        selectedQuestionId = currentBuilderForm.questions.length > 0 ? currentBuilderForm.questions[0].id : null;
        renderFormBuilder();
        if (window.lucide) window.lucide.createIcons();
    };

    function createNewFormTemplate() {
        currentBuilderForm = {
            id: 'form_' + Date.now(),
            title: 'Student Feedback Form',
            description: 'Please complete this form to share your feedback.',
            status: 'draft',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            questions: [
                {
                    id: 'q_' + Math.random().toString(36).substr(2, 9),
                    type: 'multiple_choice',
                    title: '1. How was the teaching?',
                    helpText: 'Rate teacher explanation and conceptual depth',
                    required: true,
                    options: ['Excellent', 'Good', 'Average', 'Poor']
                }
            ]
        };
    }

    // Action 2: View Form
    window.viewSelectedForm = function() {
        if (!selectedFormId) {
            showToast('Please select a form from the dropdown first.', 'alert-circle');
            return;
        }
        openFormViewModal(selectedFormId);
    };

    // Action 3A: View Responses of Selected Form ONLY ("Selected form filled or not" type)
    window.viewDropdownSelectedFormResponses = function() {
        if (!selectedFormId && forms && forms.length > 0) {
            selectedFormId = forms[0].id;
        }
        if (!selectedFormId) {
            showToast('Please create or select a form first.', 'alert-circle');
            return;
        }
        openFormResponsesModal(selectedFormId, 'single');
    };

    // Alias for compatibility: clicking view response for selected form
    window.viewSelectedFormResponses = function() {
        viewDropdownSelectedFormResponses();
    };

    window.openSingleFormResponses = function(formId) {
        openFormResponsesModal(formId, 'single');
    };

    // Action 3B: View All Responses across all forms (Master Matrix)
    window.viewAllResponsesMaster = function() {
        openFormResponsesModal(selectedFormId || (forms[0] ? forms[0].id : null), 'all');
    };

    window.exitFormBuilder = function() {
        const hubSec = document.getElementById('formsHubView');
        const builderSec = document.getElementById('formBuilderView');
        if (builderSec) builderSec.style.display = 'none';
        if (hubSec) hubSec.style.display = 'block';
        renderFormsHub();
        if (window.lucide) window.lucide.createIcons();
    };

    // Renders 3-column builder layout: elements palette, canvas sheet, and properties
    function renderFormBuilder() {
        if (!currentBuilderForm) return;

        // Topbar
        const titleBadge = document.getElementById('builderFormTitleDisplay');
        const statusBadge = document.getElementById('builderFormStatusBadge');
        if (titleBadge) titleBadge.textContent = currentBuilderForm.title || 'Untitled Form';
        if (statusBadge) {
            statusBadge.className = `status-badge ${currentBuilderForm.status}`;
            statusBadge.textContent = currentBuilderForm.status === 'published' ? 'Published' : 'Draft';
        }

        // Render Column 1: Left Elements Palette
        renderElementsPalette();

        // Render Column 2: Center Paper Sheet
        renderCanvasSheet();

        // Render Column 3: Right Properties Panel
        renderPropertiesPanel();
    }

    /* =============================================
       ELEMENT PALETTE — Draggable form field components
       ============================================= */

    // Renders draggable element items in left palette
    function renderElementsPalette() {
        const container = document.getElementById('builderElementsPalette');
        if (!container) return;
        container.innerHTML = '';

        ELEMENT_TYPES.forEach(item => {
            const el = document.createElement('div');
            el.className = 'element-drag-item';
            el.setAttribute('draggable', 'true');
            el.setAttribute('data-type', item.type);

            el.innerHTML = `
                <div class="element-drag-icon">
                    <i data-lucide="${item.icon}"></i>
                </div>
                <div class="element-drag-text">
                    <span class="element-drag-name">${item.name}</span>
                    <span class="element-drag-hint">${item.hint}</span>
                </div>
            `;

            // Drag Start
            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.type);
                e.dataTransfer.effectAllowed = 'copy';
            });

            // Click to directly append
            el.addEventListener('click', () => {
                addNewQuestionToBuilder(item.type);
                showToast(`Added ${item.name} question`, 'plus');
            });

            container.appendChild(el);
        });
    }

    /* =============================================
       CANVAS SHEET — Center question cards paper sheet
       ============================================= */

    // Renders the center paper sheet with interactive question cards
    function renderCanvasSheet() {
        const titleInput = document.getElementById('sheetFormTitle');
        const descInput = document.getElementById('sheetFormDesc');
        const questionsList = document.getElementById('sheetQuestionsList');
        const bottomDropZone = document.getElementById('canvasBottomDropZone');

        if (titleInput) {
            titleInput.value = currentBuilderForm.title || '';
            titleInput.oninput = (e) => {
                currentBuilderForm.title = e.target.value;
                const badge = document.getElementById('builderFormTitleDisplay');
                if (badge) badge.textContent = e.target.value || 'Untitled Form';
            };
        }

        if (descInput) {
            descInput.value = currentBuilderForm.description || '';
            descInput.oninput = (e) => {
                currentBuilderForm.description = e.target.value;
            };
        }

        if (questionsList) {
            questionsList.innerHTML = '';

            (currentBuilderForm.questions || []).forEach((q, idx) => {
                const card = document.createElement('div');
                card.className = `builder-question-card ${q.id === selectedQuestionId ? 'active-selected' : ''}`;
                card.setAttribute('data-qid', q.id);
                card.setAttribute('draggable', 'true');

                // Drag and drop for reordering questions
                card.addEventListener('dragstart', (e) => {
                    draggedQuestionIndex = idx;
                    e.dataTransfer.setData('text/reorder', String(idx));
                    card.style.opacity = '0.5';
                });

                card.addEventListener('dragend', () => {
                    card.style.opacity = '1';
                    draggedQuestionIndex = null;
                });

                card.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    card.style.borderColor = 'var(--vintage-terracotta)';
                });

                card.addEventListener('dragleave', () => {
                    card.style.borderColor = '';
                });

                card.addEventListener('drop', (e) => {
                    e.preventDefault();
                    card.style.borderColor = '';
                    const fromIdx = draggedQuestionIndex;
                    const toIdx = idx;
                    if (fromIdx !== null && fromIdx !== toIdx) {
                        const moved = currentBuilderForm.questions.splice(fromIdx, 1)[0];
                        currentBuilderForm.questions.splice(toIdx, 0, moved);
                        renderCanvasSheet();
                        renderPropertiesPanel();
                    }
                });

                // Click to select
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.card-action-icon-btn')) return;
                    selectQuestion(q.id);
                });

                // Build Card Inner HTML
                card.innerHTML = `
                    <div class="card-top-row">
                        <div class="card-drag-handle" title="Drag to reorder question">
                            <i data-lucide="grip-vertical"></i>
                        </div>
                        <div class="card-actions-bar">
                            <button class="card-action-icon-btn" onclick="selectQuestion('${q.id}')" title="Edit Question Properties">
                                <i data-lucide="edit-3"></i>
                            </button>
                            <button class="card-action-icon-btn" onclick="duplicateQuestion('${q.id}')" title="Duplicate Question">
                                <i data-lucide="copy"></i>
                            </button>
                            <button class="card-action-icon-btn delete-btn" onclick="deleteQuestion('${q.id}')" title="Delete Question">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-question-title-row">
                        <span class="card-question-number">${idx + 1}.</span>
                        <span class="card-question-title">${escapeHtml(q.title || 'Untitled Question')}</span>
                        ${q.required ? '<span class="card-required-star">* Required</span>' : ''}
                    </div>
                    ${q.helpText ? `<div class="card-question-help">${escapeHtml(q.helpText)}</div>` : ''}
                    <div class="card-element-preview">
                        ${renderElementCardPreview(q)}
                    </div>
                `;

                questionsList.appendChild(card);
            });
        }

        // Setup drop zone at bottom
        if (bottomDropZone) {
            bottomDropZone.ondragover = (e) => {
                e.preventDefault();
                bottomDropZone.classList.add('drag-over');
            };
            bottomDropZone.ondragleave = () => {
                bottomDropZone.classList.remove('drag-over');
            };
            bottomDropZone.ondrop = (e) => {
                e.preventDefault();
                bottomDropZone.classList.remove('drag-over');
                const type = e.dataTransfer.getData('text/plain');
                if (type) {
                    addNewQuestionToBuilder(type);
                    showToast(`Added ${type.replace('_', ' ')} question`, 'plus');
                }
            };
        }

        if (window.lucide) window.lucide.createIcons();
    }

    /** Render the interactive visual element inside question card */
    function renderElementCardPreview(q) {
        switch (q.type) {
            case 'short_text':
                return `<input type="text" class="preview-text-input" placeholder="${escapeHtml(q.placeholder || 'Short answer text')}">`;
            case 'long_text':
                return `<textarea class="preview-text-input" rows="2" placeholder="${escapeHtml(q.placeholder || 'Long answer text')}"></textarea>`;
            case 'multiple_choice':
                const opts = q.options && q.options.length > 0 ? q.options : ['Option 1', 'Option 2', 'Option 3'];
                return `
                    <div class="preview-options-list">
                        ${opts.map(opt => `
                            <div class="preview-option-item">
                                <span class="preview-radio-circle"></span>
                                <span>${escapeHtml(opt)}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            case 'checkbox':
                const checkOpts = q.options && q.options.length > 0 ? q.options : ['Option A', 'Option B'];
                return `
                    <div class="preview-options-list">
                        ${checkOpts.map(opt => `
                            <div class="preview-option-item">
                                <span class="preview-checkbox-box"></span>
                                <span>${escapeHtml(opt)}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            case 'dropdown':
                const dropOpts = q.options && q.options.length > 0 ? q.options : ['Select Choice 1', 'Select Choice 2'];
                return `
                    <select class="preview-text-input" style="cursor:default">
                        <option>Choose an option...</option>
                        ${dropOpts.map(opt => `<option>${escapeHtml(opt)}</option>`).join('')}
                    </select>
                `;
            case 'rating':
                const starsCount = q.maxRating || 5;
                let starsHtml = '';
                for (let i = 0; i < starsCount; i++) {
                    starsHtml += '<i data-lucide="star" style="width:20px;height:20px;fill:var(--vintage-parchment-gold)"></i> ';
                }
                return `<div class="preview-stars-row">${starsHtml} <span style="font-size:12px;color:var(--vintage-ink-muted);margin-left:6px">(${starsCount} stars scale)</span></div>`;
            case 'date':
                return `<input type="date" class="preview-text-input" style="width:200px">`;
            case 'number':
                return `<input type="number" class="preview-text-input" style="width:180px" placeholder="Enter number...">`;
            case 'file_upload':
                return `
                    <div class="preview-file-dropzone">
                        <i data-lucide="upload-cloud" style="width:24px;height:24px;color:var(--vintage-terracotta)"></i>
                        <span>Upload document or image (Max 10MB)</span>
                    </div>
                `;
            default:
                return `<div style="font-size:12px;color:var(--text-muted)">Element preview</div>`;
        }
    }

    /* =============================================
       PROPERTIES PANEL — Field attributes, options, and validation controls
       ============================================= */

    // Renders question properties or general form settings in right panel
    function renderPropertiesPanel() {
        const sidebar = document.getElementById('builderPropertiesSidebar');
        if (!sidebar) return;

        const currentQ = (currentBuilderForm.questions || []).find(q => q.id === selectedQuestionId);

        if (!currentQ) {
            sidebar.innerHTML = `
                <div class="properties-header">
                    <h3>Form Settings</h3>
                    <span class="prop-badge-type">General</span>
                </div>
                <div class="properties-body">
                    <p style="font-size:12.5px;color:var(--vintage-ink-secondary);line-height:1.4">
                        Click on any question card in the canvas to edit its properties, options, and validation.
                    </p>
                    <div class="prop-field-group">
                        <label>Form Title</label>
                        <input type="text" class="prop-input" value="${escapeHtml(currentBuilderForm.title || '')}" oninput="updateFormTitle(this.value)">
                    </div>
                    <div class="prop-field-group">
                        <label>Form Description</label>
                        <textarea class="prop-input" rows="3" oninput="updateFormDesc(this.value)">${escapeHtml(currentBuilderForm.description || '')}</textarea>
                    </div>
                </div>
            `;
            return;
        }

        const typeDef = ELEMENT_TYPES.find(t => t.type === currentQ.type) || { name: currentQ.type };

        sidebar.innerHTML = `
            <div class="properties-header">
                <h3>Question Properties</h3>
                <span class="prop-badge-type">${typeDef.name}</span>
            </div>
            <div class="properties-body">
                <div class="prop-field-group">
                    <label>Question Title / Label</label>
                    <input type="text" class="prop-input" id="propQTitle" value="${escapeHtml(currentQ.title || '')}" placeholder="Type question here...">
                </div>

                <div class="prop-field-group">
                    <label>Help Text / Subtitle</label>
                    <input type="text" class="prop-input" id="propQHelp" value="${escapeHtml(currentQ.helpText || '')}" placeholder="Optional instructions for students...">
                </div>

                <div class="prop-toggle-row">
                    <span class="prop-toggle-label">Required Question</span>
                    <label class="prop-switch">
                        <input type="checkbox" id="propQRequired" ${currentQ.required ? 'checked' : ''}>
                        <span class="prop-slider"></span>
                    </label>
                </div>

                ${renderSpecificPropertyFields(currentQ)}

                <div style="margin-top:10px;padding-top:12px;border-top:1px solid var(--border-light)">
                    <button class="form-mini-btn" style="color:#DC2626;border-color:#FCA5A5;width:100%;justify-content:center;padding:8px" onclick="deleteQuestion('${currentQ.id}')">
                        <i data-lucide="trash-2"></i> Delete This Question
                    </button>
                </div>
            </div>
        `;

        // Wire reactive live updating
        const titleEl = document.getElementById('propQTitle');
        if (titleEl) {
            titleEl.oninput = (e) => {
                currentQ.title = e.target.value;
                updateQuestionInCanvasLive(currentQ.id);
            };
        }

        const helpEl = document.getElementById('propQHelp');
        if (helpEl) {
            helpEl.oninput = (e) => {
                currentQ.helpText = e.target.value;
                updateQuestionInCanvasLive(currentQ.id);
            };
        }

        const reqEl = document.getElementById('propQRequired');
        if (reqEl) {
            reqEl.onchange = (e) => {
                currentQ.required = e.target.checked;
                updateQuestionInCanvasLive(currentQ.id);
            };
        }

        if (window.lucide) window.lucide.createIcons();
    }

    function renderSpecificPropertyFields(q) {
        if (q.type === 'multiple_choice' || q.type === 'checkbox' || q.type === 'dropdown') {
            const opts = q.options || [];
            return `
                <div class="prop-field-group">
                    <label>Options List (${opts.length})</label>
                    <div class="options-editor-box" id="propOptionsList">
                        ${opts.map((opt, i) => `
                            <div class="prop-option-row">
                                <input type="text" class="prop-option-input" value="${escapeHtml(opt)}" oninput="updateOptionValue(${i}, this.value)">
                                <button class="prop-btn-remove-opt" onclick="removeOptionFromQ(${i})" title="Remove Option">
                                    <i data-lucide="x" style="width:14px;height:14px"></i>
                                </button>
                            </div>
                        `).join('')}
                        <button class="prop-btn-add-opt" onclick="addOptionToQ()">
                            <i data-lucide="plus" style="width:14px;height:14px"></i> Add Option
                        </button>
                    </div>
                </div>
            `;
        }

        if (q.type === 'rating') {
            return `
                <div class="prop-field-group">
                    <label>Rating Scale</label>
                    <select class="prop-input" onchange="updateRatingScale(this.value)">
                        <option value="5" ${q.maxRating === 5 ? 'selected' : ''}>5 Stars</option>
                        <option value="10" ${q.maxRating === 10 ? 'selected' : ''}>10 Stars</option>
                    </select>
                </div>
            `;
        }

        if (q.type === 'short_text' || q.type === 'long_text') {
            return `
                <div class="prop-field-group">
                    <label>Placeholder</label>
                    <input type="text" class="prop-input" value="${escapeHtml(q.placeholder || '')}" oninput="updatePlaceholder(this.value)">
                </div>
            `;
        }

        return '';
    }

    /* =============================================
       QUESTION CRUD — Add, duplicate, delete, and modify questions
       ============================================= */

    // Updates question display card in canvas sheet in real time
    function updateQuestionInCanvasLive(qId) {
        const card = document.querySelector(`.builder-question-card[data-qid="${qId}"]`);
        if (!card) return;
        const q = currentBuilderForm.questions.find(item => item.id === qId);
        if (!q) return;

        const titleSpan = card.querySelector('.card-question-title');
        if (titleSpan) titleSpan.textContent = q.title || 'Untitled Question';

        let helpDiv = card.querySelector('.card-question-help');
        if (q.helpText) {
            if (!helpDiv) {
                helpDiv = document.createElement('div');
                helpDiv.className = 'card-question-help';
                card.querySelector('.card-question-title-row').after(helpDiv);
            }
            helpDiv.textContent = q.helpText;
        } else if (helpDiv) {
            helpDiv.remove();
        }

        const previewContainer = card.querySelector('.card-element-preview');
        if (previewContainer) {
            previewContainer.innerHTML = renderElementCardPreview(q);
        }

        const titleRow = card.querySelector('.card-question-title-row');
        let star = titleRow.querySelector('.card-required-star');
        if (q.required) {
            if (!star) {
                const s = document.createElement('span');
                s.className = 'card-required-star';
                s.textContent = '* Required';
                titleRow.appendChild(s);
            }
        } else if (star) {
            star.remove();
        }

        if (window.lucide) window.lucide.createIcons();
    }

    window.updateFormTitle = function(val) {
        currentBuilderForm.title = val;
        const titleBadge = document.getElementById('builderFormTitleDisplay');
        const sheetTitle = document.getElementById('sheetFormTitle');
        if (titleBadge) titleBadge.textContent = val || 'Untitled Form';
        if (sheetTitle) sheetTitle.value = val;
    };

    window.updateFormDesc = function(val) {
        currentBuilderForm.description = val;
        const sheetDesc = document.getElementById('sheetFormDesc');
        if (sheetDesc) sheetDesc.value = val;
    };

    window.selectQuestion = function(qId) {
        selectedQuestionId = qId;
        renderCanvasSheet();
        renderPropertiesPanel();
    };

    window.addNewQuestionToBuilder = function(type) {
        const typeDef = ELEMENT_TYPES.find(t => t.type === type) || { name: 'Question' };
        const newQ = {
            id: 'q_' + Math.random().toString(36).substr(2, 9),
            type: type,
            title: `New ${typeDef.name} Question`,
            helpText: '',
            required: false,
            options: (type === 'multiple_choice' || type === 'checkbox' || type === 'dropdown') ? ['Option 1', 'Option 2', 'Option 3'] : undefined,
            maxRating: type === 'rating' ? 5 : undefined,
            placeholder: (type === 'short_text' || type === 'long_text') ? 'Type here...' : undefined
        };

        currentBuilderForm.questions.push(newQ);
        selectedQuestionId = newQ.id;
        renderCanvasSheet();
        renderPropertiesPanel();
    };

    window.duplicateQuestion = function(qId) {
        const idx = currentBuilderForm.questions.findIndex(q => q.id === qId);
        if (idx === -1) return;
        const orig = currentBuilderForm.questions[idx];
        const clone = JSON.parse(JSON.stringify(orig));
        clone.id = 'q_' + Math.random().toString(36).substr(2, 9);
        clone.title = orig.title + ' (Copy)';
        currentBuilderForm.questions.splice(idx + 1, 0, clone);
        selectedQuestionId = clone.id;
        renderCanvasSheet();
        renderPropertiesPanel();
        showToast('Question duplicated', 'copy');
    };

    window.deleteQuestion = function(qId) {
        currentBuilderForm.questions = currentBuilderForm.questions.filter(q => q.id !== qId);
        if (selectedQuestionId === qId) {
            selectedQuestionId = currentBuilderForm.questions.length > 0 ? currentBuilderForm.questions[0].id : null;
        }
        renderCanvasSheet();
        renderPropertiesPanel();
        showToast('Question deleted', 'trash-2');
    };

    window.addOptionToQ = function() {
        const q = currentBuilderForm.questions.find(item => item.id === selectedQuestionId);
        if (!q) return;
        if (!q.options) q.options = [];
        q.options.push(`Option ${q.options.length + 1}`);
        renderPropertiesPanel();
        updateQuestionInCanvasLive(q.id);
    };

    window.removeOptionFromQ = function(optIdx) {
        const q = currentBuilderForm.questions.find(item => item.id === selectedQuestionId);
        if (!q || !q.options) return;
        q.options.splice(optIdx, 1);
        renderPropertiesPanel();
        updateQuestionInCanvasLive(q.id);
    };

    window.updateOptionValue = function(optIdx, val) {
        const q = currentBuilderForm.questions.find(item => item.id === selectedQuestionId);
        if (!q || !q.options) return;
        q.options[optIdx] = val;
        updateQuestionInCanvasLive(q.id);
    };

    window.updateRatingScale = function(val) {
        const q = currentBuilderForm.questions.find(item => item.id === selectedQuestionId);
        if (!q) return;
        q.maxRating = parseInt(val) || 5;
        updateQuestionInCanvasLive(q.id);
    };

    window.updatePlaceholder = function(val) {
        const q = currentBuilderForm.questions.find(item => item.id === selectedQuestionId);
        if (!q) return;
        q.placeholder = val;
        updateQuestionInCanvasLive(q.id);
    };

    /* =============================================
       SAVE & PUBLISH — Form state persistence and publication
       ============================================= */

    // Saves form definition to storage as draft or published
    window.saveCurrentForm = function() {
        if (!currentBuilderForm) return;
        currentBuilderForm.updatedAt = Date.now();

        const existingIdx = forms.findIndex(f => f.id === currentBuilderForm.id);
        if (existingIdx !== -1) {
            forms[existingIdx] = JSON.parse(JSON.stringify(currentBuilderForm));
        } else {
            forms.unshift(JSON.parse(JSON.stringify(currentBuilderForm)));
        }

        selectedFormId = currentBuilderForm.id;
        saveFormsToStorage();
        showToast('Form successfully saved to institutional records!', 'check-circle');
    };

    window.publishCurrentForm = function() {
        if (!currentBuilderForm) return;
        currentBuilderForm.status = 'published';
        currentBuilderForm.updatedAt = Date.now();

        const existingIdx = forms.findIndex(f => f.id === currentBuilderForm.id);
        if (existingIdx !== -1) {
            forms[existingIdx] = JSON.parse(JSON.stringify(currentBuilderForm));
        } else {
            forms.unshift(JSON.parse(JSON.stringify(currentBuilderForm)));
        }

        selectedFormId = currentBuilderForm.id;
        saveFormsToStorage();
        renderFormBuilder();
        showToast('Form published! Live URL link generated.', 'send');
    };

    window.previewCurrentForm = function() {
        if (!currentBuilderForm) return;
        openInteractivePreview(currentBuilderForm);
    };

    /* =============================================
       PREVIEW MODAL — Form testing and student evaluation preview
       ============================================= */

    // Opens preview modal for a specific form
    window.openFormViewModal = function(formId) {
        const form = forms.find(f => f.id === formId);
        if (!form) return;
        openInteractivePreview(form);
    };

    function openInteractivePreview(form) {
        let modal = document.getElementById('formViewModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'formViewModal';
            modal.className = 'form-view-overlay';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="form-view-card">
                <div class="form-view-header">
                    <div>
                        <h3>${escapeHtml(form.title)}</h3>
                        <span style="font-size:11px;color:var(--vintage-ink-muted)">✦ TREVA UNIVERSITY STUDENT EVALUATION</span>
                    </div>
                    <button class="card-action-icon-btn" onclick="closeFormViewModal()" title="Close">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <div class="form-view-body" id="formViewQuestionsList">
                    <!-- Teacher Preview Restriction Notice -->
                    <div class="teacher-preview-banner">
                        <div class="teacher-preview-pill">
                            <i data-lucide="shield-alert"></i> Faculty Preview Mode
                        </div>
                        <div class="teacher-preview-note">
                            <strong>Submissions Restricted to Students:</strong> You are viewing this evaluation as a teacher. Instructors can inspect questions and copy the shareable student link, but cannot submit responses.
                        </div>
                    </div>

                    <div style="font-style:italic;color:var(--vintage-ink-secondary);font-size:13.5px;padding-bottom:12px;border-bottom:1px dashed var(--vintage-paper-border)">
                        ${escapeHtml(form.description || 'Please complete all questions.')}
                    </div>
                    ${(form.questions || []).map((q, idx) => `
                        <div style="display:flex;flex-direction:column;gap:8px">
                            <label style="font-size:14.5px;font-weight:600;color:var(--vintage-ink);font-family:'Merriweather',serif">
                                ${idx + 1}. ${escapeHtml(q.title)} ${q.required ? '<span style="color:#DC2626">*</span>' : ''}
                            </label>
                            ${q.helpText ? `<span style="font-size:12px;color:var(--vintage-ink-muted);font-style:italic">${escapeHtml(q.helpText)}</span>` : ''}
                            <div>
                                ${renderViewInputControl(q)}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="form-view-footer">
                    <button class="builder-back-btn" onclick="closeFormViewModal()">Close</button>
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                        <div class="teacher-submit-blocked-badge" title="Teachers cannot submit student responses">
                            <i data-lucide="lock"></i> Response Submission Restricted to Students
                        </div>
                        <button class="forms-action-btn btn-create-new" onclick="copyFormLink('${form.id}')" title="Copy shareable student link">
                            <i data-lucide="copy"></i> Copy Student Link
                        </button>
                    </div>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
        if (window.lucide) window.lucide.createIcons();
    }

    function renderViewInputControl(q) {
        switch (q.type) {
            case 'short_text':
                return `<input type="text" class="view-input-control" name="q_${q.id}" placeholder="${escapeHtml(q.placeholder || 'Enter your response...')}">`;
            case 'long_text':
                return `<textarea class="view-input-control" rows="3" name="q_${q.id}" placeholder="${escapeHtml(q.placeholder || 'Enter detailed feedback...')}"></textarea>`;
            case 'multiple_choice':
                const opts = q.options || ['Option 1', 'Option 2'];
                return `
                    <div style="display:flex;flex-direction:column;gap:8px;margin-top:4px">
                        ${opts.map((opt, i) => `
                            <label style="display:flex;align-items:center;gap:10px;font-size:13.5px;cursor:pointer">
                                <input type="radio" name="q_${q.id}" value="${escapeHtml(opt)}" ${i === 0 ? 'checked' : ''}>
                                <span>${escapeHtml(opt)}</span>
                            </label>
                        `).join('')}
                    </div>
                `;
            case 'checkbox':
                const cOpts = q.options || ['Option 1'];
                return `
                    <div style="display:flex;flex-direction:column;gap:8px;margin-top:4px">
                        ${cOpts.map(opt => `
                            <label style="display:flex;align-items:center;gap:10px;font-size:13.5px;cursor:pointer">
                                <input type="checkbox" name="q_${q.id}" value="${escapeHtml(opt)}">
                                <span>${escapeHtml(opt)}</span>
                            </label>
                        `).join('')}
                    </div>
                `;
            case 'dropdown':
                const dOpts = q.options || [];
                return `
                    <select class="view-input-control" name="q_${q.id}">
                        <option value="">-- Select an option --</option>
                        ${dOpts.map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('')}
                    </select>
                `;
            case 'rating':
                return `
                    <div style="display:flex;align-items:center;gap:8px">
                        <select class="view-input-control" name="q_${q.id}" style="width:160px">
                            <option value="5">★★★★★ (5 Stars)</option>
                            <option value="4">★★★★☆ (4 Stars)</option>
                            <option value="3">★★★☆☆ (3 Stars)</option>
                            <option value="2">★★☆☆☆ (2 Stars)</option>
                            <option value="1">★☆☆☆☆ (1 Star)</option>
                        </select>
                    </div>
                `;
            case 'date':
                return `<input type="date" class="view-input-control" name="q_${q.id}" style="width:200px">`;
            case 'number':
                return `<input type="number" class="view-input-control" name="q_${q.id}" style="width:180px">`;
            case 'file_upload':
                return `<input type="file" class="view-input-control">`;
            default:
                return `<input type="text" class="view-input-control">`;
        }
    }

    window.closeFormViewModal = function() {
        const modal = document.getElementById('formViewModal');
        if (modal) modal.style.display = 'none';
    };

    window.submitViewForm = function(formId) {
        showToast('Submission Blocked: As a teacher, you cannot submit feedback responses created for students.', 'shield-alert');
        return false;
    };

    /* =============================================
       STUDENT DATA — Enrolled roster retrieval and institutional directory
       ============================================= */

    // Aggregates enrolled student roster from cache, storage, or defaults
    function getAllStudents() {
        let list = [];
        // 1. From _studentCache in dashboard.js if loaded
        if (typeof _studentCache !== 'undefined' && Object.keys(_studentCache).length > 0) {
            Object.keys(_studentCache).forEach(cls => {
                (_studentCache[cls] || []).forEach(s => {
                    list.push({
                        id: s.id,
                        enroll: String(s.enroll || s.id),
                        name: s.name,
                        className: cls,
                        batch: s.batch || '—'
                    });
                });
            });
        }

        // 2. From localStorage keys 'treva_students_CO31', 'treva_students_CO32', etc.
        if (list.length === 0) {
            ['CO31', 'CO32', 'CO33', 'CO51', 'CO52'].forEach(cls => {
                try {
                    const stored = localStorage.getItem('treva_students_' + cls);
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        parsed.forEach(s => {
                            list.push({
                                id: s.id,
                                enroll: String(s.enroll || s.id),
                                name: s.name,
                                className: cls,
                                batch: s.batch || '—'
                            });
                        });
                    }
                } catch(e) {}
            });
        }

        // 3. Complete institutional class directory if storage is fresh
        if (list.length === 0) {
            list = [
                { id: 101, enroll: '230021701001', name: 'Aarav Patel', className: 'CO31', batch: 'Batch A' },
                { id: 102, enroll: '230021701002', name: 'Diya Sharma', className: 'CO31', batch: 'Batch A' },
                { id: 103, enroll: '230021701003', name: 'Rohan Mehta', className: 'CO31', batch: 'Batch A' },
                { id: 104, enroll: '230021701004', name: 'Kavya Patel', className: 'CO31', batch: 'Batch B' },
                { id: 105, enroll: '230021701005', name: 'Manav Shah', className: 'CO31', batch: 'Batch B' },
                { id: 106, enroll: '230021701006', name: 'Ananya Rao', className: 'CO31', batch: 'Batch B' },
                { id: 107, enroll: '230021701007', name: 'Harshil Joshi', className: 'CO31', batch: 'Batch C' },
                { id: 108, enroll: '230021701008', name: 'Pooja Verma', className: 'CO31', batch: 'Batch C' },
                { id: 109, enroll: '230021701009', name: 'Sneha Joshi', className: 'CO31', batch: 'Batch C' },
                { id: 110, enroll: '230021701010', name: 'Tanvi Desai', className: 'CO31', batch: 'Batch C' }
            ];
        }

        // Sort by enrollment ascending
        list.sort((a, b) => String(a.enroll).localeCompare(String(b.enroll)));
        return list;
    }

    /* =============================================
       RESPONSES MODAL — Submission status tracking and student response tables
       ============================================= */

    // Opens response tracking modal in single form or master matrix mode
    window.openFormResponsesModal = function(formId, initialMode = 'single') {
        if (!forms || forms.length === 0) {
            showToast('No forms available to inspect responses.', 'alert-circle');
            return;
        }

        activeResponsesFormId = formId || selectedFormId || forms[0].id;
        activeResponsesFilter = 'ALL';
        activeResponsesViewMode = (initialMode === 'all') ? 'all' : 'single';
        activeResponsesSearch = '';

        let modal = document.getElementById('formResponsesModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'formResponsesModal';
            modal.className = 'form-view-overlay';
            document.body.appendChild(modal);
        }

        renderResponsesModalFrame(modal);
        renderResponsesModalContent();
        if (window.lucide) window.lucide.createIcons();
    };

    function renderResponsesModalFrame(modal) {
        if (!modal) modal = document.getElementById('formResponsesModal');
        if (!modal) return;

        const currentForm = forms.find(f => f.id === activeResponsesFormId) || forms[0];
        const isSingle = activeResponsesViewMode === 'single';

        modal.innerHTML = `
            <div class="responses-modal-card">
                <!-- Modal Head -->
                <div class="responses-modal-head">
                    <div class="responses-head-left">
                        <div style="display:flex;align-items:center;gap:8px">
                            <h3 style="margin:0;font-family:'Playfair Display',serif;color:var(--vintage-ink);font-size:18px">
                                ${isSingle ? 'Selected Form Feedback Tracker' : 'All Forms — Master Grid'}
                            </h3>
                            <span style="font-size:11px;background:#EFE6D8;color:var(--vintage-terracotta);padding:2px 8px;border-radius:4px;font-weight:700">
                                ${isSingle ? 'SELECTED FORM ONLY' : 'MASTER ROSTER'}
                            </span>
                        </div>
                        <div class="resp-header-select-wrap" id="respHeaderSelectWrap" style="${isSingle ? 'display:flex' : 'display:none'}">
                            <span style="font-size:12.5px;color:var(--vintage-ink-secondary);font-weight:600">Switch Form:</span>
                            <select id="respModalFormSelect" class="resp-header-select" onchange="switchResponsesModalForm(this.value)">
                                ${forms.map(f => `
                                    <option value="${f.id}" ${f.id === activeResponsesFormId ? 'selected' : ''}>
                                        ${escapeHtml(f.title)} (${(responses[f.id] || []).length} filled)
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:12px">
                        <div class="resp-view-tabs">
                            <button class="resp-tab-btn ${isSingle ? 'active' : ''}" id="respTabSingle" onclick="setResponsesViewMode('single')" title="View this selected form only: filled vs not filled for all students">
                                <i data-lucide="file-check-2"></i> Selected Form Only
                            </button>
                            <button class="resp-tab-btn ${!isSingle ? 'active' : ''}" id="respTabAll" onclick="setResponsesViewMode('all')" title="View master spreadsheet grid across all forms">
                                <i data-lucide="grid"></i> All Forms Master Grid
                            </button>
                        </div>
                        <button class="card-action-icon-btn" onclick="closeFormResponsesModal()" title="Close">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                </div>

                <!-- Form Info Banner (Shown in Single Form Mode) -->
                <div id="respFormBannerArea">
                    <!-- Populated dynamically -->
                </div>

                <!-- Stats Summary Row -->
                <div class="responses-stats-summary" id="respStatsSummaryRow">
                    <!-- Populated dynamically -->
                </div>

                <!-- Toolbar (Search, Filter Chips & Remind Button) -->
                <div class="responses-toolbar" id="respToolbarArea">
                    <div class="responses-search-wrap">
                        <i data-lucide="search"></i>
                        <input type="text" class="responses-search-input" id="respStudentSearchInput" placeholder="Search by student name or enrollment..." oninput="handleResponsesSearch(this.value)">
                    </div>
                    <div class="responses-filter-chips" id="respFilterChipsWrap">
                        <!-- Populated dynamically -->
                    </div>
                    <div id="respToolbarActionsWrap" style="display:flex;align-items:center;gap:8px">
                        <!-- Populated dynamically -->
                    </div>
                </div>

                <!-- Main Content / Table Area -->
                <div class="responses-table-wrap" id="responsesTableContainer">
                    <!-- Populated dynamically -->
                </div>

                <!-- Modal Footer -->
                <div class="form-view-footer">
                    <div style="display:flex;align-items:center;gap:8px">
                        <button class="builder-back-btn" onclick="exportResponsesCSV(activeResponsesViewMode === 'single' ? activeResponsesFormId : null)" title="Export to CSV">
                            <i data-lucide="download"></i> ${isSingle ? 'Export Form CSV' : 'Export Master CSV'}
                        </button>
                        <button class="builder-back-btn" onclick="copyFormLink(activeResponsesFormId)" title="Copy student submission link">
                            <i data-lucide="share-2"></i> Copy Student Link
                        </button>
                    </div>
                    <button class="forms-action-btn btn-view-form" onclick="closeFormResponsesModal()">Close</button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    }

    window.switchResponsesModalForm = function(formId) {
        activeResponsesFormId = formId;
        renderResponsesModalFrame();
        renderResponsesModalContent();
        if (window.lucide) window.lucide.createIcons();
    };

    window.setResponsesFilter = function(filter) {
        activeResponsesFilter = filter;
        renderResponsesModalContent();
    };

    window.setResponsesViewMode = function(mode) {
        activeResponsesViewMode = mode;
        activeResponsesFilter = 'ALL';
        activeResponsesSearch = '';
        renderResponsesModalFrame();
        renderResponsesModalContent();
        if (window.lucide) window.lucide.createIcons();
    };

    window.handleResponsesSearch = function(val) {
        activeResponsesSearch = (val || '').toLowerCase().trim();
        renderResponsesModalContent();
    };

    /** Render Table Content (Selected Form View OR All Forms Master Grid) */
    function renderResponsesModalContent() {
        const allStudents = getAllStudents();
        const totalStudents = allStudents.length;
        const totalForms = forms.length;

        const currentForm = forms.find(f => f.id === activeResponsesFormId) || forms[0];
        const isSingle = activeResponsesViewMode === 'single';

        const bannerArea = document.getElementById('respFormBannerArea');
        const statsEl = document.getElementById('respStatsSummaryRow');
        const filterChipsEl = document.getElementById('respFilterChipsWrap');
        const toolbarActionsEl = document.getElementById('respToolbarActionsWrap');
        const container = document.getElementById('responsesTableContainer');

        if (!container) return;

        // =========================================================================
        // VIEW 1: SELECTED FORM ONLY ("Selected Form Filled or Not")
        // =========================================================================
        if (isSingle) {
            if (!currentForm) return;

            const formSubs = responses[currentForm.id] || [];

            // Match each student to this specific form only
            const singleRoster = allStudents.map(student => {
                const enrollStr = String(student.enroll || '').trim().toLowerCase();
                const nameStr = (student.name || '').trim().toLowerCase();
                const sub = formSubs.find(r => {
                    const rEnroll = String(r.enroll || '').trim().toLowerCase();
                    const rName = (r.studentName || '').trim().toLowerCase();
                    if (rEnroll && enrollStr && rEnroll === enrollStr) return true;
                    if (nameStr && rName && (rName === nameStr || rName.includes(nameStr) || nameStr.includes(rName))) return true;
                    return false;
                });
                return {
                    student: student,
                    isFilled: Boolean(sub),
                    submission: sub
                };
            });

            const filledCount = singleRoster.filter(s => s.isFilled).length;
            const pendingCount = totalStudents - filledCount;
            const filledPct = totalStudents > 0 ? Math.round((filledCount / totalStudents) * 100) : 0;

            // 1. Form Info Banner
            if (bannerArea) {
                bannerArea.innerHTML = `
                    <div class="form-info-banner">
                        <div class="form-info-banner-left">
                            <h4>${escapeHtml(currentForm.title)}</h4>
                            <p>${escapeHtml(currentForm.description || 'Student feedback assessment form.')}</p>
                        </div>
                        <div class="form-info-banner-right">
                            <span class="status-badge ${currentForm.status}">${currentForm.status === 'published' ? 'Published' : 'Draft'}</span>
                            <span style="font-size:12px;color:var(--vintage-ink-muted);font-weight:600">${(currentForm.questions || []).length} questions</span>
                        </div>
                    </div>
                `;
            }

            // 2. 3 Stats Cards
            if (statsEl) {
                statsEl.innerHTML = `
                    <div class="resp-stat-box">
                        <div class="resp-stat-num">${totalStudents}</div>
                        <div class="resp-stat-lbl">Total Enrolled Students</div>
                        <div class="resp-stat-progress-track">
                            <div class="resp-stat-progress-fill" style="width:100%;background:#94A3B8"></div>
                        </div>
                    </div>
                    <div class="resp-stat-box">
                        <div class="resp-stat-num green">${filledCount} <span style="font-size:13px;font-weight:600">(${filledPct}%)</span></div>
                        <div class="resp-stat-lbl">✅ Filled & Submitted</div>
                        <div class="resp-stat-progress-track">
                            <div class="resp-stat-progress-fill" style="width:${filledPct}%;background:#15803D"></div>
                        </div>
                    </div>
                    <div class="resp-stat-box">
                        <div class="resp-stat-num rose">${pendingCount} <span style="font-size:13px;font-weight:600">(${100 - filledPct}%)</span></div>
                        <div class="resp-stat-lbl">❌ Not Filled / Pending</div>
                        <div class="resp-stat-progress-track">
                            <div class="resp-stat-progress-fill" style="width:${100 - filledPct}%;background:#DC2626"></div>
                        </div>
                    </div>
                `;
            }

            // 3. Filter Chips
            if (filterChipsEl) {
                filterChipsEl.innerHTML = `
                    <button class="resp-filter-chip ${activeResponsesFilter === 'ALL' ? 'active' : ''}" onclick="setResponsesFilter('ALL')">
                        All Students (${totalStudents})
                    </button>
                    <button class="resp-filter-chip ${activeResponsesFilter === 'FILLED' ? 'active' : ''}" onclick="setResponsesFilter('FILLED')">
                        <span style="color:#15803D">●</span> Filled (${filledCount})
                    </button>
                    <button class="resp-filter-chip ${activeResponsesFilter === 'PENDING' ? 'active' : ''}" onclick="setResponsesFilter('PENDING')">
                        <span style="color:#DC2626">●</span> Not Filled (${pendingCount})
                    </button>
                `;
            }

            // 4. Batch Remind Action
            if (toolbarActionsEl) {
                toolbarActionsEl.innerHTML = `
                    <button class="btn-remind-all" onclick="sendReminderToUnfilledForForm('${currentForm.id}')" title="Send reminder to all students who have not filled this form">
                        <i data-lucide="bell-ring"></i> Remind All ${pendingCount} Pending Students
                    </button>
                `;
            }

            // 5. Filter List
            let displayList = singleRoster;
            if (activeResponsesFilter === 'FILLED') {
                displayList = displayList.filter(s => s.isFilled);
            } else if (activeResponsesFilter === 'PENDING') {
                displayList = displayList.filter(s => !s.isFilled);
            }

            if (activeResponsesSearch) {
                displayList = displayList.filter(s =>
                    (s.student.name || '').toLowerCase().includes(activeResponsesSearch) ||
                    (s.student.enroll || '').toLowerCase().includes(activeResponsesSearch) ||
                    (s.student.className || '').toLowerCase().includes(activeResponsesSearch)
                );
            }

            if (displayList.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center;padding:50px 20px;color:var(--text-muted)">
                        <i data-lucide="search-x" style="width:40px;height:40px;margin-bottom:12px;color:var(--vintage-ink-muted)"></i>
                        <p style="margin:0;font-size:15px;font-weight:600;color:var(--vintage-ink)">No matching students found</p>
                        <p style="margin:4px 0 0 0;font-size:13px">Try clearing search filters or selecting 'All Students'.</p>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <table class="responses-table">
                        <thead>
                            <tr>
                                <th style="width:36px">#</th>
                                <th style="width:130px">Enrollment</th>
                                <th>Student Name</th>
                                <th style="width:110px">Class / Batch</th>
                                <th style="width:130px">Feedback Status</th>
                                <th style="width:150px">Submission Time</th>
                                <th style="text-align:right;width:140px">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${displayList.map((item, idx) => {
                                const s = item.student;
                                const isFilled = item.isFilled;
                                const sub = item.submission;
                                const timeStr = isFilled && sub && sub.submittedAt 
                                    ? new Date(sub.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                                    : '—';

                                return `
                                    <tr>
                                        <td style="color:var(--vintage-ink-muted);font-weight:600">${idx + 1}</td>
                                        <td><code class="enroll-badge">${escapeHtml(s.enroll)}</code></td>
                                        <td><strong style="color:var(--vintage-ink);font-size:13.5px">${escapeHtml(s.name)}</strong></td>
                                        <td style="color:var(--vintage-ink-secondary)">${escapeHtml(s.className)} · ${escapeHtml(s.batch)}</td>
                                        <td>
                                            ${isFilled ? `
                                                <span class="single-status-badge filled">
                                                    <i data-lucide="check-circle-2"></i> Filled
                                                </span>
                                            ` : `
                                                <span class="single-status-badge pending">
                                                    <i data-lucide="x-circle"></i> Not Filled
                                                </span>
                                            `}
                                        </td>
                                        <td style="color:var(--vintage-ink-muted);font-size:12.5px">${timeStr}</td>
                                        <td style="text-align:right">
                                            ${isFilled && sub ? `
                                                <button class="form-mini-btn" onclick="openStudentAnswersModal('${sub.id}', '${escapeHtml(s.name)}', '${escapeHtml(s.enroll)}')">
                                                    <i data-lucide="eye"></i> View Answers
                                                </button>
                                            ` : `
                                                <button class="form-mini-btn" onclick="sendStudentReminder('${escapeHtml(s.enroll)}', '${escapeHtml(s.name)}', '${escapeHtml(currentForm.title)}')">
                                                    <i data-lucide="bell"></i> Send Reminder
                                                </button>
                                            `}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                `;
            }
        } 
        /* =============================================
           MASTER MATRIX — Cross-form spreadsheet tracking across all students
           ============================================= */
        else {
            if (bannerArea) {
                bannerArea.innerHTML = `
                    <div class="form-info-banner all-forms-guide-banner">
                        <div class="form-info-banner-left">
                            <div class="guide-tag"><i data-lucide="layers"></i> Institutional Master Matrix · All Forms</div>
                            <h4 style="margin:4px 0 2px 0">All Feedback Forms Response Tracker</h4>
                            <p style="margin:0;font-size:12.5px;color:var(--vintage-ink-muted)">
                                Track student submissions across all institutional feedback forms. Each column represents an active form.
                                Click <strong>Focus Form →</strong> to isolate a form, or click any cell to inspect answers or send reminders.
                            </p>
                        </div>
                        <div class="all-forms-legend">
                            <div class="legend-item"><span class="legend-dot filled"></span> <strong>Filled</strong> (Submitted)</div>
                            <div class="legend-item"><span class="legend-dot pending"></span> <strong>Not Filled</strong> (Pending)</div>
                        </div>
                    </div>
                `;
            }

            // Compute student matrix across all forms
            const masterRoster = allStudents.map(student => {
                const enrollStr = String(student.enroll || '').trim().toLowerCase();
                const nameStr = (student.name || '').trim().toLowerCase();

                const formsData = forms.map(f => {
                    const formSubs = responses[f.id] || [];
                    const sub = formSubs.find(r => {
                        const rEnroll = String(r.enroll || '').trim().toLowerCase();
                        const rName = (r.studentName || '').trim().toLowerCase();
                        if (rEnroll && enrollStr && rEnroll === enrollStr) return true;
                        if (nameStr && rName && (rName === nameStr || rName.includes(nameStr) || nameStr.includes(rName))) return true;
                        return false;
                    });
                    return {
                        form: f,
                        isFilled: Boolean(sub),
                        submission: sub
                    };
                });

                const filledCount = formsData.filter(fd => fd.isFilled).length;
                const isAllCompleted = totalForms > 0 && filledCount === totalForms;
                const isNoneFilled = filledCount === 0;

                return {
                    student: student,
                    formsData: formsData,
                    filledCount: filledCount,
                    pendingCount: totalForms - filledCount,
                    isAllCompleted: isAllCompleted,
                    isNoneFilled: isNoneFilled
                };
            });

            const allCompletedCount = masterRoster.filter(s => s.isAllCompleted).length;
            const pendingAnyCount = masterRoster.filter(s => !s.isAllCompleted).length;
            const noneFilledCount = masterRoster.filter(s => s.isNoneFilled).length;
            const totalSubmissions = Object.values(responses).reduce((sum, list) => sum + (list ? list.length : 0), 0);
            const institutionalCompletionPct = totalStudents > 0 ? Math.round((allCompletedCount / totalStudents) * 100) : 0;

            // 1. 4 Master Stat Boxes
            if (statsEl) {
                statsEl.innerHTML = `
                    <div class="resp-stat-box">
                        <div class="resp-stat-num">${totalStudents}</div>
                        <div class="resp-stat-lbl">Total Enrolled Students</div>
                        <div class="resp-stat-progress-track">
                            <div class="resp-stat-progress-fill" style="width:100%;background:#94A3B8"></div>
                        </div>
                    </div>
                    <div class="resp-stat-box">
                        <div class="resp-stat-num green">${allCompletedCount} <span style="font-size:13px;font-weight:600">(${institutionalCompletionPct}%)</span></div>
                        <div class="resp-stat-lbl">All ${totalForms} Forms Completed</div>
                        <div class="resp-stat-progress-track">
                            <div class="resp-stat-progress-fill" style="width:${institutionalCompletionPct}%;background:#15803D"></div>
                        </div>
                    </div>
                    <div class="resp-stat-box">
                        <div class="resp-stat-num rose">${pendingAnyCount} <span style="font-size:13px;font-weight:600">(${100 - institutionalCompletionPct}%)</span></div>
                        <div class="resp-stat-lbl">Have Pending Forms</div>
                        <div class="resp-stat-progress-track">
                            <div class="resp-stat-progress-fill" style="width:${100 - institutionalCompletionPct}%;background:#DC2626"></div>
                        </div>
                    </div>
                    <div class="resp-stat-box">
                        <div class="resp-stat-num amber">${totalSubmissions}</div>
                        <div class="resp-stat-lbl">Total Responses Recorded</div>
                        <div class="resp-stat-progress-track">
                            <div class="resp-stat-progress-fill" style="width:100%;background:#D97706"></div>
                        </div>
                    </div>
                `;
            }

            // 2. Filter Chips
            if (filterChipsEl) {
                filterChipsEl.innerHTML = `
                    <button class="resp-filter-chip ${activeResponsesFilter === 'ALL' ? 'active' : ''}" onclick="setResponsesFilter('ALL')">
                        All Students (${totalStudents})
                    </button>
                    <button class="resp-filter-chip ${activeResponsesFilter === 'COMPLETED' ? 'active' : ''}" onclick="setResponsesFilter('COMPLETED')">
                        <span style="color:#15803D">●</span> Completed All Forms (${allCompletedCount})
                    </button>
                    <button class="resp-filter-chip ${activeResponsesFilter === 'PENDING' ? 'active' : ''}" onclick="setResponsesFilter('PENDING')">
                        <span style="color:#D97706">●</span> Pending Forms (${pendingAnyCount})
                    </button>
                    <button class="resp-filter-chip ${activeResponsesFilter === 'NONE' ? 'active' : ''}" onclick="setResponsesFilter('NONE')">
                        <span style="color:#DC2626">●</span> No Forms Submitted (${noneFilledCount})
                    </button>
                `;
            }

            // 3. Batch Remind Action
            if (toolbarActionsEl) {
                toolbarActionsEl.innerHTML = `
                    <button class="btn-remind-all" onclick="remindAllPendingStudents()" title="Send reminder to all students who have any unfilled form">
                        <i data-lucide="bell-ring"></i> Remind All Pending Students (${pendingAnyCount})
                    </button>
                `;
            }

            // 4. Filter List
            let displayList = masterRoster;
            if (activeResponsesFilter === 'COMPLETED') {
                displayList = displayList.filter(s => s.isAllCompleted);
            } else if (activeResponsesFilter === 'PENDING') {
                displayList = displayList.filter(s => !s.isAllCompleted);
            } else if (activeResponsesFilter === 'NONE') {
                displayList = displayList.filter(s => s.isNoneFilled);
            }

            if (activeResponsesSearch) {
                displayList = displayList.filter(s =>
                    (s.student.name || '').toLowerCase().includes(activeResponsesSearch) ||
                    (s.student.enroll || '').toLowerCase().includes(activeResponsesSearch) ||
                    (s.student.className || '').toLowerCase().includes(activeResponsesSearch)
                );
            }

            if (displayList.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center;padding:50px 20px;color:var(--text-muted)">
                        <i data-lucide="search-x" style="width:40px;height:40px;margin-bottom:12px;color:var(--vintage-ink-muted)"></i>
                        <p style="margin:0;font-size:15px;font-weight:600;color:var(--vintage-ink)">No matching students found</p>
                        <p style="margin:4px 0 0 0;font-size:13px">Try clearing search filters or selecting 'All Students'.</p>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <table class="responses-table">
                        <thead>
                            <tr>
                                <th style="width:36px">#</th>
                                <th style="width:190px">Student Details</th>
                                <th style="width:80px">Class</th>
                                ${forms.map((f, fIdx) => {
                                    const colSubs = responses[f.id] || [];
                                    const colFilledCount = colSubs.length;
                                    const colPct = totalStudents > 0 ? Math.round((colFilledCount / totalStudents) * 100) : 0;
                                    return `
                                        <th class="master-form-col-th">
                                            <div class="col-form-badge">Form ${fIdx + 1}</div>
                                            <span class="col-form-title" title="${escapeHtml(f.title)}">${escapeHtml(f.title)}</span>
                                            <span class="col-form-stat">${colFilledCount} / ${totalStudents} filled (${colPct}%)</span>
                                            <button class="col-isolate-btn" onclick="openSingleFormResponses('${f.id}')" title="Isolate this form only">
                                                <i data-lucide="filter"></i> Focus Form →
                                            </button>
                                        </th>
                                    `;
                                }).join('')}
                                <th style="width:130px">Overall Progress</th>
                                <th style="text-align:right;width:90px">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${displayList.map((item, idx) => {
                                const s = item.student;
                                const filledCount = item.filledCount;
                                const isAllDone = item.isAllCompleted;
                                const pct = totalForms > 0 ? Math.round((filledCount / totalForms) * 100) : 0;

                                const cells = item.formsData.map(fd => {
                                    if (fd.isFilled && fd.submission) {
                                        const subDate = new Date(fd.submission.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                        return `
                                            <td>
                                                <button class="master-grid-cell filled" title="Submitted on ${subDate}. Click to view answers." onclick="openStudentAnswersModal('${fd.submission.id}', '${escapeHtml(s.name)}', '${escapeHtml(s.enroll)}')">
                                                    <i data-lucide="check-circle-2"></i> Filled <span class="cell-date">${subDate}</span>
                                                </button>
                                            </td>
                                        `;
                                    } else {
                                        return `
                                            <td>
                                                <button class="master-grid-cell pending" title="Feedback not submitted yet. Click to send reminder." onclick="sendStudentReminder('${escapeHtml(s.enroll)}', '${escapeHtml(s.name)}', '${escapeHtml(fd.form.title)}')">
                                                    <i data-lucide="x-circle"></i> Not Filled
                                                </button>
                                            </td>
                                        `;
                                    }
                                }).join('');

                                const statusTag = isAllDone 
                                    ? `<span class="grid-status-tag all-done">All Done</span>`
                                    : (filledCount > 0 
                                        ? `<span class="grid-status-tag partial">${filledCount} / ${totalForms}</span>`
                                        : `<span class="grid-status-tag none">0 / ${totalForms}</span>`);

                                return `
                                    <tr>
                                        <td style="color:var(--vintage-ink-muted);font-weight:600">${idx + 1}</td>
                                        <td>
                                            <div style="font-weight:700;color:var(--vintage-ink);font-size:13.5px">${escapeHtml(s.name)}</div>
                                            <div style="margin-top:2px"><code class="enroll-badge">${escapeHtml(s.enroll)}</code></div>
                                        </td>
                                        <td style="color:var(--vintage-ink-secondary);font-size:12.5px">${escapeHtml(s.className)}</td>
                                        ${cells}
                                        <td>
                                            <div style="display:flex;flex-direction:column;gap:3px">
                                                <div>${statusTag} <span style="font-size:11px;color:var(--vintage-ink-muted);font-weight:700">(${pct}%)</span></div>
                                                <div class="student-progress-bar-wrap">
                                                    <div class="student-progress-bar-fill ${isAllDone ? 'all-done' : (filledCount > 0 ? 'partial' : 'empty')}" style="width:${pct}%"></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style="text-align:right">
                                            ${!isAllDone ? `
                                                <button class="form-mini-btn" onclick="sendStudentReminder('${escapeHtml(s.enroll)}', '${escapeHtml(s.name)}')" title="Send reminder">
                                                    <i data-lucide="bell"></i>
                                                </button>
                                            ` : `
                                                <span class="grid-status-all-done-tag"><i data-lucide="check"></i> Done</span>
                                            `}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                `;
            }
        }

        if (window.lucide) window.lucide.createIcons();
    }

    /* =============================================
       STUDENT ANSWERS — Inspect individual feedback submissions and send reminders
       ============================================= */

    // Sends feedback reminders to all pending students for a form
    window.sendReminderToUnfilledForForm = function(formId) {
        const targetForm = forms.find(f => f.id === formId);
        if (!targetForm) return;
        const allStudents = getAllStudents();
        const subs = responses[formId] || [];
        const pendingStudents = allStudents.filter(s => {
            const enrollStr = String(s.enroll || '').trim().toLowerCase();
            const nameStr = (s.name || '').trim().toLowerCase();
            return !subs.some(r => {
                const rEnroll = String(r.enroll || '').trim().toLowerCase();
                const rName = (r.studentName || '').trim().toLowerCase();
                return (rEnroll && enrollStr && rEnroll === enrollStr) ||
                       (nameStr && rName && (rName === nameStr || rName.includes(nameStr) || nameStr.includes(rName)));
            });
        });

        if (pendingStudents.length === 0) {
            showToast(`All students have already filled "${targetForm.title}"!`, 'check-circle');
            return;
        }

        showToast(`Reminder notifications sent to ${pendingStudents.length} students for "${targetForm.title}"!`, 'bell-ring');
    };

    /** Helper: Open Student's Completed Answers */
    window.openStudentLatestAnswers = function(studentEnroll, studentName) {
        const allStudents = getAllStudents();
        const student = allStudents.find(s => String(s.enroll) === String(studentEnroll) || s.name === studentName);
        if (!student) return;

        const enrollStr = String(student.enroll || '').trim().toLowerCase();
        const nameStr = (student.name || '').trim().toLowerCase();

        const studentSubs = [];
        forms.forEach(f => {
            const list = responses[f.id] || [];
            const sub = list.find(r => {
                const rEnroll = String(r.enroll || '').trim().toLowerCase();
                const rName = (r.studentName || '').trim().toLowerCase();
                return (rEnroll && enrollStr && rEnroll === enrollStr) ||
                       (nameStr && rName && (rName === nameStr || rName.includes(nameStr) || nameStr.includes(rName)));
            });
            if (sub) {
                studentSubs.push({ form: f, sub: sub });
            }
        });

        if (studentSubs.length === 0) {
            showToast('No submitted feedback forms for this student yet.', 'alert-circle');
            return;
        }

        openStudentAnswersModal(studentSubs[0].sub.id, student.name, student.enroll);
    };

    /** Inspection Modal: View a Specific Student's Answers */
    window.openStudentAnswersModal = function(submissionId, studentName = '', enroll = '') {
        let targetSub = null;
        let targetForm = null;

        Object.keys(responses).forEach(fid => {
            const found = (responses[fid] || []).find(r => r.id === submissionId);
            if (found) {
                targetSub = found;
                targetForm = forms.find(f => f.id === fid);
            }
        });

        if (!targetSub || !targetForm) {
            showToast('Submission answers not found.', 'alert-circle');
            return;
        }

        let modal = document.getElementById('studentAnswersModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'studentAnswersModal';
            modal.className = 'form-view-overlay';
            modal.style.zIndex = '1005';
            document.body.appendChild(modal);
        }

        const displayName = studentName || targetSub.studentName;
        const displayEnroll = enroll || targetSub.enroll || 'Verified';
        const dateStr = new Date(targetSub.submittedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        modal.innerHTML = `
            <div class="form-view-card" style="max-width:680px">
                <div class="form-view-header">
                    <div>
                        <h3>${escapeHtml(displayName)} — Feedback Submission</h3>
                        <span style="font-size:11.5px;color:var(--vintage-ink-muted)">
                            Enrollment: <code>${escapeHtml(displayEnroll)}</code> · Submitted on ${dateStr}
                        </span>
                    </div>
                    <button class="card-action-icon-btn" onclick="closeStudentAnswersModal()">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <div class="form-view-body">
                    <div style="font-weight:700;color:var(--vintage-terracotta);font-size:14px;border-bottom:1px dashed var(--vintage-paper-border);padding-bottom:8px">
                        Form: ${escapeHtml(targetForm.title)}
                    </div>
                    ${(targetForm.questions || []).map((q, idx) => {
                        let answer = (targetSub.answers && targetSub.answers[q.id]) !== undefined 
                            ? targetSub.answers[q.id] 
                            : '— No answer recorded —';

                        if (Array.isArray(answer)) answer = answer.join(', ');
                        if (q.type === 'rating' && typeof answer === 'number') {
                            answer = '★'.repeat(answer) + '☆'.repeat((q.maxRating || 5) - answer) + ` (${answer} Stars)`;
                        }

                        return `
                            <div style="background:#FFFFFF;border:1px solid var(--vintage-paper-border);border-radius:8px;padding:12px 14px">
                                <div style="font-size:13.5px;font-weight:600;color:var(--vintage-ink);margin-bottom:6px">
                                    ${idx + 1}. ${escapeHtml(q.title)}
                                </div>
                                <div style="font-size:13px;color:var(--vintage-terracotta);font-weight:600;background:var(--vintage-paper);padding:8px 12px;border-radius:6px">
                                    ${escapeHtml(String(answer))}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="form-view-footer">
                    <button class="forms-action-btn btn-view-form" onclick="closeStudentAnswersModal()">Close</button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
        if (window.lucide) window.lucide.createIcons();
    };

    window.closeStudentAnswersModal = function() {
        const modal = document.getElementById('studentAnswersModal');
        if (modal) modal.style.display = 'none';
    };

    /** Send Reminder to Single Student */
    window.sendStudentReminder = function(enroll, studentName, formTitle) {
        const titleText = formTitle ? ` for "${formTitle}"` : '';
        showToast(`Reminder notification sent to ${studentName} (${enroll})${titleText}!`, 'bell');
    };

    /** Send Reminder to All Students With Pending Forms */
    window.remindAllPendingStudents = function() {
        const allStudents = getAllStudents();
        const pendingStudents = allStudents.filter(s => {
            const enrollStr = String(s.enroll || '').trim().toLowerCase();
            const nameStr = (s.name || '').trim().toLowerCase();
            return forms.some(f => {
                const list = responses[f.id] || [];
                return !list.some(r => {
                    const rEnroll = String(r.enroll || '').trim().toLowerCase();
                    const rName = (r.studentName || '').trim().toLowerCase();
                    return (rEnroll && enrollStr && rEnroll === enrollStr) ||
                           (nameStr && rName && (rName === nameStr || rName.includes(nameStr) || nameStr.includes(rName)));
                });
            });
        });

        if (pendingStudents.length === 0) {
            showToast('All students have already submitted all feedback forms!', 'check-circle');
            return;
        }

        showToast(`Reminder notifications dispatched to ${pendingStudents.length} students with pending forms!`, 'bell-ring');
    };

    window.closeFormResponsesModal = function() {
        const modal = document.getElementById('formResponsesModal');
        if (modal) modal.style.display = 'none';
    };

    /* =============================================
       CSV EXPORT — Export responses and student submission links
       ============================================= */

    // Exports feedback completion roster and submission times to CSV
    window.exportResponsesCSV = function(formId) {
        const allStudents = getAllStudents();
        const exportForms = formId ? forms.filter(f => f.id === formId) : forms;

        let headers = ['Enrollment', 'Student Name', 'Class', 'Batch', 'Total Completed Forms', 'Completion Rate'];
        exportForms.forEach(f => {
            headers.push(`"${f.title.replace(/"/g, '""')} Status"`);
            headers.push(`"${f.title.replace(/"/g, '""')} Submission Time"`);
        });

        let rows = [headers.join(',')];

        allStudents.forEach(s => {
            const enrollStr = String(s.enroll || '').trim().toLowerCase();
            const nameStr = (s.name || '').trim().toLowerCase();
            let completedCount = 0;
            let formStatusCols = [];

            exportForms.forEach(f => {
                const list = responses[f.id] || [];
                const sub = list.find(r => {
                    const rEnroll = String(r.enroll || '').trim().toLowerCase();
                    const rName = (r.studentName || '').trim().toLowerCase();
                    return (rEnroll && enrollStr && rEnroll === enrollStr) ||
                           (nameStr && rName && (rName === nameStr || rName.includes(nameStr) || nameStr.includes(rName)));
                });

                if (sub) {
                    completedCount++;
                    formStatusCols.push('"Filled"');
                    formStatusCols.push(`"${new Date(sub.submittedAt).toLocaleString('en-US')}"`);
                } else {
                    formStatusCols.push('"Not Filled"');
                    formStatusCols.push('"—"');
                }
            });

            const rateStr = `${exportForms.length > 0 ? Math.round((completedCount / exportForms.length) * 100) : 0}%`;

            let row = [
                `"${String(s.enroll).replace(/"/g, '""')}"`,
                `"${String(s.name).replace(/"/g, '""')}"`,
                `"${String(s.className).replace(/"/g, '""')}"`,
                `"${String(s.batch).replace(/"/g, '""')}"`,
                `"${completedCount} of ${exportForms.length}"`,
                `"${rateStr}"`,
                ...formStatusCols
            ];

            rows.push(row.join(','));
        });

        const csvContent = '\uFEFF' + rows.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `TrevaForms_Student_Responses_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast('Exported student feedback roster to CSV successfully!', 'download');
    };

    window.copyFormLink = function(formId) {
        const url = window.location.origin + window.location.pathname + `?form=${formId}`;
        navigator.clipboard?.writeText(url);
        showToast('Shareable form link copied to clipboard!', 'share-2');
    };

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Auto-init on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        loadState();
        // Check URL params
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('tab') === 'forms') {
            window.showFormsHub();
        }
    });

})();
