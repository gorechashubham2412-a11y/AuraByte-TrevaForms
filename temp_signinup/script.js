(() => {
  "use strict";

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  const scene = $("#loginScene");
  const form = $("#authForm");
  const formPanel = $("#formPanel");
  const motionPanel = $("#motionPanel");
  const paperPlane = $("#paperPlane");
  const dashboard = $("#dashboard");
  const themeToggle = $("#themeToggle");
  const passwordToggle = $("#passwordToggle");
  const confirmPasswordToggle = $("#confirmPasswordToggle");
  const switchMode = $("#switchMode");
  const submitButton = $("#submitButton");
  const submitText = $("#submitText");
  const statusMessage = $("#statusMessage");
  const toast = $("#toast");

  // Form Inputs
  const collegeInput = $("#college");
  const departmentInput = $("#department");
  const nameInput = $("#name");
  const idInput = $("#userId");
  const passwordInput = $("#password");
  const confirmPasswordInput = $("#confirmPassword");
  const isCoordinatorInput = $("#isCoordinator");
  const batchStartYear = $("#batchStartYear");
  const batchEndYear = $("#batchEndYear");
  const rememberInput = $("#remember");

  // Containers & Labels
  const coordinatorContainer = $("#coordinatorContainer");
  const coordinatorLabel = $("#coordinatorLabel");
  const batchYearContainer = $("#batchYearContainer");
  const idLabel = $("#idLabel");
  const passwordLabel = $("#passwordLabel");
  const formEyebrow = $("#formEyebrow");
  const formTitle = $("#formTitle");
  const formSubtitle = $("#formSubtitle");
  const switchPrompt = $("#switchPrompt");
  const panelTitle = $("#panelTitle");
  const panelText = $("#panelText");

  // Field Errors
  const collegeError = $("#collegeError");
  const departmentError = $("#departmentError");
  const nameError = $("#nameError");
  const idError = $("#idError");
  const passwordError = $("#passwordError");
  const confirmPasswordError = $("#confirmPasswordError");
  const batchYearError = $("#batchYearError");

  let mode = "login";
  const role = "teacher";
  let toastTimer;

  const DEMO_ACCOUNTS = {
    teacher: {
      id: "teacher123",
      password: "teacherpassword"
    },
    faculty: {
      id: "FAC-001",
      password: "faculty123"
    }
  };

  const SUPABASE_URL = "https://xhmpdhousonsdasolyzc.supabase.co";
  const SUPABASE_KEY = "sb_publishable_GnvX1KDInNAm0Ip6OSynJg_PomHcyVp";

  const REMEMBER_KEY = "auraBytesRememberedTeacherId";
  const THEME_KEY = "auraBytesTheme";

  init();

  function init() {
    loadTheme();
    loadRememberedId();
    populateBatchYears();
    bindEvents();
    setupTeacherPortalUI();
  }

  function setupTeacherPortalUI() {
    if (formEyebrow) formEyebrow.textContent = "TEACHER PORTAL";
    if (idLabel) idLabel.textContent = "Username";
    if (idInput) idInput.placeholder = mode === "login" ? "Enter username" : "Choose a username";
    if (panelTitle) panelTitle.textContent = mode === "login" ? "Your teaching workspace." : "Set up your teacher access.";
    if (panelText) panelText.textContent = "Attendance, forms, quizzes, resources and class management in one place.";
  }

  function populateBatchYears() {
    batchStartYear.innerHTML = '<option value="" disabled selected>Select year</option>';
    const currentYear = new Date().getFullYear();
    for (let year = 2020; year <= currentYear + 5; year++) {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      batchStartYear.appendChild(option);
    }
  }

  function bindEvents() {
    themeToggle.addEventListener("click", toggleTheme);
    passwordToggle.addEventListener("click", togglePassword);
    confirmPasswordToggle.addEventListener("click", toggleConfirmPassword);
    switchMode.addEventListener("click", toggleAuthMode);

    form.addEventListener("submit", handleSubmit);

    $("#dashboardLogout").addEventListener("click", resetToLogin);

    $("#privacyLink").addEventListener("click", event => {
      event.preventDefault();
      showToast("Privacy policy will be connected when the backend is added.");
    });

    isCoordinatorInput.addEventListener("change", toggleBatchYear);
    batchStartYear.addEventListener("change", () => {
      if (batchStartYear.value) {
        batchEndYear.value = Number(batchStartYear.value) + 1;
        clearFieldError(batchStartYear, batchYearError);
      }
    });

    idInput.addEventListener("input", () => clearFieldError(idInput, idError));
    passwordInput.addEventListener("input", () => clearFieldError(passwordInput, passwordError));
    collegeInput.addEventListener("change", () => clearFieldError(collegeInput, collegeError));
    departmentInput.addEventListener("change", () => clearFieldError(departmentInput, departmentError));
    nameInput.addEventListener("input", () => clearFieldError(nameInput, nameError));
    confirmPasswordInput.addEventListener("input", () => clearFieldError(confirmPasswordInput, confirmPasswordError));
  }

  function toggleBatchYear() {
    if (isCoordinatorInput.checked) {
      batchYearContainer.style.display = "block";
      coordinatorLabel.classList.add("selected");
    } else {
      batchYearContainer.style.display = "none";
      batchStartYear.value = "";
      batchEndYear.value = "";
      coordinatorLabel.classList.remove("selected");
      clearFieldError(batchStartYear, batchYearError);
    }
  }

  function toggleAuthMode() {
    mode = mode === "login" ? "create" : "login";
    scene.classList.toggle("create-mode", mode === "create");

    if (mode === "create") {
      formTitle.textContent = "Create account.";
      formSubtitle.textContent = "Set up your teacher access for the command portal.";
      passwordLabel.textContent = "Create Password";
      submitText.textContent = "Create account";
      switchPrompt.textContent = "Already have an account?";
      switchMode.textContent = "Login";
      panelTitle.textContent = "Set up your teacher access.";
      idLabel.textContent = "Username";
      idInput.placeholder = "Choose a username";
      coordinatorContainer.style.display = "block";
    } else {
      formTitle.textContent = "Welcome back.";
      formSubtitle.textContent = "Sign in to continue to Teacher Command Portal.";
      passwordLabel.textContent = "Password";
      submitText.textContent = "Login";
      switchPrompt.textContent = "Have not created an account?";
      switchMode.textContent = "Click here";
      panelTitle.textContent = "Your teaching workspace.";
      idLabel.textContent = "Username";
      idInput.placeholder = "Enter username";
      coordinatorContainer.style.display = "none";
      isCoordinatorInput.checked = false;
      toggleBatchYear();
    }

    clearErrors();
    statusMessage.textContent = "";
    requestAnimationFrame(() => {
      if (mode === "create") {
        collegeInput.focus();
      } else {
        idInput.focus();
      }
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) return;

    submitButton.disabled = true;
    statusMessage.textContent = "";

    await wait(450);

    const id = idInput.value.trim();
    const password = passwordInput.value;

    if (mode === "create") {
      await createPrototypeAccount(id, password);
      submitButton.disabled = false;
      return;
    }

    const account = await getStoredAccount("teacher", id);
    const valid = account && (
      account.passwordHash === await sha256(password) ||
      account.rawPassword === password
    );

    if (!valid) {
      passwordInput.classList.add("invalid");
      passwordError.textContent = "Username or password is incorrect.";
      statusMessage.textContent = "";
      submitButton.disabled = false;
      return;
    }

    if (rememberInput.checked) {
      localStorage.setItem(REMEMBER_KEY, id);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    beginLoginTransition();
  }

  async function createPrototypeAccount(id, password) {
    const key = `auraBytesAccount_teacher_${id.toLowerCase()}`;
    const exists = localStorage.getItem(key);

    if (exists) {
      idError.textContent = "An account with this username already exists.";
      idInput.classList.add("invalid");
      submitButton.disabled = false;
      return;
    }

    const collegeVal = collegeInput.options[collegeInput.selectedIndex]?.text || collegeInput.value;
    const departmentVal = departmentInput.options[departmentInput.selectedIndex]?.text || departmentInput.value;
    const fullNameVal = nameInput.value.trim() || id;

    const account = {
      role: "teacher",
      college: collegeVal,
      department: departmentVal,
      name: fullNameVal,
      id,
      passwordHash: await sha256(password),
      isCoordinator: isCoordinatorInput.checked,
      batchStartYear: batchStartYear.value || null,
      batchEndYear: batchEndYear.value || null,
      createdAt: new Date().toISOString()
    };

    localStorage.setItem(key, JSON.stringify(account));

    if (rememberInput.checked) {
      localStorage.setItem(REMEMBER_KEY, id);
    }

    let supabaseSaved = false;
    try {
      const supabasePayload = {
        collegename: collegeVal,
        department: departmentVal,
        fullname: fullNameVal,
        password: password,
        isclasscoordinator: isCoordinatorInput.checked ? 1 : 0,
        batchofcoordinator: batchStartYear.value ? String(batchStartYear.value).slice(0, 6) : ""
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/teacher_logins`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify(supabasePayload)
      });

      if (res.ok) {
        supabaseSaved = true;
      } else {
        const errorDetail = await res.json().catch(() => ({}));
        console.warn("Supabase insert response:", res.status, errorDetail);
        if (res.status === 401) {
          statusMessage.textContent = "Supabase 401 RLS Error: Run 'ALTER TABLE teacher_logins DISABLE ROW LEVEL SECURITY;' in Supabase SQL Editor.";
          submitButton.disabled = false;
          return;
        }
      }
    } catch (err) {
      console.warn("Supabase connection error:", err);
    }

    statusMessage.textContent = supabaseSaved
      ? "Teacher account created & synced to Supabase! Please sign in."
      : "Teacher account created! (Saved locally)";

    submitButton.disabled = false;

    setTimeout(() => {
      mode = "login";
      toggleAuthMode();
      passwordInput.value = "";
      statusMessage.textContent = supabaseSaved
        ? "Account created in Supabase. Please sign in."
        : "Account created. Please sign in.";
    }, 650);
  }

  async function getStoredAccount(accountRole, id) {
    try {
      const queryUrl = `${SUPABASE_URL}/rest/v1/teacher_logins?fullname=eq.${encodeURIComponent(id)}`;
      const res = await fetch(queryUrl, {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      });
      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0) {
          const userRow = rows[0];
          return {
            role: "teacher",
            id: userRow.fullname,
            passwordHash: await sha256(userRow.password),
            rawPassword: userRow.password
          };
        }
      }
    } catch (err) {
      console.warn("Supabase query error:", err);
    }

    const key = `auraBytesAccount_teacher_${id.toLowerCase()}`;
    const stored = localStorage.getItem(key);

    if (stored) return JSON.parse(stored);

    const demo = DEMO_ACCOUNTS.teacher || DEMO_ACCOUNTS.faculty;
    if (demo && demo.id.toLowerCase() === id.toLowerCase()) {
      return {
        role: "teacher",
        id: demo.id,
        passwordHash: await sha256(demo.password)
      };
    }

    return null;
  }

  function beginLoginTransition() {
    submitButton.disabled = true;
    submitText.textContent = "Opening...";
    statusMessage.textContent = "";

    setTimeout(() => {
      scene.classList.add("fly-away");

      setTimeout(() => {
        dashboard.classList.add("visible");
        dashboard.setAttribute("aria-hidden", "false");
      }, 520);

      setTimeout(() => {
        scene.classList.remove("fly-away");
        scene.style.display = "none";
      }, 1400);
    }, 180);
  }

  function resetToLogin() {
    dashboard.classList.remove("visible");
    dashboard.setAttribute("aria-hidden", "true");

    scene.style.display = "";
    scene.classList.remove("fly-away");
    form.reset();
    isCoordinatorInput.checked = false;
    toggleBatchYear();
    submitButton.disabled = false;
    submitText.textContent = mode === "login" ? "Login" : "Create account";
    loadRememberedId();

    setTimeout(() => idInput.focus(), 500);
  }

  function validate() {
    clearErrors();
    let valid = true;

    const id = idInput.value.trim();
    const password = passwordInput.value;

    if (mode === "create") {
      if (!collegeInput.value) {
        collegeError.textContent = "Select your college.";
        collegeInput.classList.add("invalid");
        valid = false;
      }
      if (!departmentInput.value) {
        departmentError.textContent = "Select department.";
        departmentInput.classList.add("invalid");
        valid = false;
      }
      if (!nameInput.value.trim()) {
        nameError.textContent = "Enter your full name.";
        nameInput.classList.add("invalid");
        valid = false;
      }
      if (!id) {
        idError.textContent = "Enter your username.";
        idInput.classList.add("invalid");
        valid = false;
      }
      if (!password) {
        passwordError.textContent = "Enter your password.";
        passwordInput.classList.add("invalid");
        valid = false;
      } else if (password.length < 8) {
        passwordError.textContent = "Use at least 8 characters.";
        passwordInput.classList.add("invalid");
        valid = false;
      }
      if (!confirmPasswordInput.value) {
        confirmPasswordError.textContent = "Confirm your password.";
        confirmPasswordInput.classList.add("invalid");
        valid = false;
      } else if (confirmPasswordInput.value !== password) {
        confirmPasswordError.textContent = "Passwords do not match.";
        confirmPasswordInput.classList.add("invalid");
        valid = false;
      }
      if (isCoordinatorInput.checked && !batchStartYear.value) {
        batchYearError.textContent = "Select starting year.";
        batchStartYear.classList.add("invalid");
        valid = false;
      }
    } else {
      if (!id) {
        idError.textContent = "Enter your username.";
        idInput.classList.add("invalid");
        valid = false;
      }
      if (!password) {
        passwordError.textContent = "Enter your password.";
        passwordInput.classList.add("invalid");
        valid = false;
      }
    }

    return valid;
  }

  function clearErrors() {
    [collegeInput, departmentInput, nameInput, idInput, passwordInput, confirmPasswordInput, batchStartYear].forEach(input => {
      if (input) input.classList.remove("invalid");
    });
    [collegeError, departmentError, nameError, idError, passwordError, confirmPasswordError, batchYearError].forEach(err => {
      if (err) err.textContent = "";
    });
  }

  function clearFieldError(input, error) {
    if (input) input.classList.remove("invalid");
    if (error) error.textContent = "";
  }

  function togglePassword() {
    const visible = passwordInput.type === "text";
    passwordInput.type = visible ? "password" : "text";
    passwordToggle.textContent = visible ? "Show" : "Hide";
  }

  function toggleConfirmPassword() {
    const visible = confirmPasswordInput.type === "text";
    confirmPasswordInput.type = visible ? "password" : "text";
    confirmPasswordToggle.textContent = visible ? "Show" : "Hide";
  }

  function toggleTheme() {
    const night = document.body.classList.toggle("night");
    themeToggle.setAttribute("aria-pressed", String(night));
    localStorage.setItem(THEME_KEY, night ? "night" : "day");
    document.querySelector('meta[name="theme-color"]').setAttribute("content", night ? "#0f1419" : "#eef1f4");
  }

  function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "night") {
      document.body.classList.add("night");
      themeToggle.setAttribute("aria-pressed", "true");
    }
  }

  function loadRememberedId() {
    const remembered = localStorage.getItem(REMEMBER_KEY);
    if (remembered) idInput.value = remembered;
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function sha256(value) {
    const data = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  }
})();
