const API_BASE_URL = window.location.protocol === "file:"
    ? "http://127.0.0.1:5001"
    : "";
const REMEMBER_KEY = "trevaEnrollment";

function showCreateAccount() {
    document.getElementById("loginView").classList.remove("active");
    document.getElementById("createView").classList.add("active");
}

function showLogin() {
    document.getElementById("createView").classList.remove("active");
    document.getElementById("loginView").classList.add("active");
}

function showPassword(inputId, button) {
    const input = document.getElementById(inputId);
    const isPassword = input.type === "password";

    input.type = isPassword ? "text" : "password";
    button.innerText = isPassword ? "HIDE" : "SHOW";
}

function showMessage(element, text, type) {
    element.className = `message ${type}`;
    element.textContent = text;
}

async function postJson(path, payload) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    let result;
    try {
        result = await response.json();
    } catch {
        throw new Error(
            "The server returned an unexpected response. Start main.py and open the page at http://127.0.0.1:5001."
        );
    }

    if (!response.ok) {
        throw new Error(result.message || "The request could not be completed.");
    }

    return result;
}

function requestErrorMessage(error) {
    if (error instanceof TypeError) {
        return "Unable to connect. Make sure the server is running on http://127.0.0.1:5001.";
    }

    return error.message || "The request could not be completed. Please try again.";
}

document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const enrollment = document.getElementById("loginEnrollment").value.trim();
    const password = document.getElementById("loginPassword").value;
    const message = document.getElementById("loginMessage");

    submitButton.disabled = true;
    showMessage(message, "Signing in...", "pending");

    try {
        const result = await postJson("/api/login", {
            enrollmentNumber: enrollment,
            password
        });

        let rememberFailed = false;
        try {
            if (document.getElementById("remember").checked) {
                localStorage.setItem(REMEMBER_KEY, enrollment);
            } else {
                localStorage.removeItem(REMEMBER_KEY);
            }
        } catch (error) {
            console.warn("Unable to save the remembered enrollment number.", error);
            rememberFailed = true;
        }

        const welcome = `Welcome back, ${result.user.name || result.user.username}. Login successful.`;
        showMessage(
            message,
            rememberFailed ? `${welcome} Your enrollment number could not be saved.` : welcome,
            "success"
        );
    } catch (error) {
        showMessage(message, requestErrorMessage(error), "error");
    } finally {
        submitButton.disabled = false;
    }
});

document.getElementById("createForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const enrollment = document.getElementById("enrollment").value.trim();
    const message = document.getElementById("createMessage");

    submitButton.disabled = true;
    showMessage(message, "Creating your account...", "pending");

    try {
        const result = await postJson("/api/register", {
            name: document.getElementById("name").value.trim(),
            username: document.getElementById("username").value.trim(),
            enrollmentNumber: enrollment,
            email: document.getElementById("email").value.trim(),
            password: document.getElementById("password").value
        });

        form.reset();
        document.getElementById("loginEnrollment").value = enrollment;
        showLogin();
        showMessage(document.getElementById("loginMessage"), result.message, "success");
    } catch (error) {
        showMessage(message, requestErrorMessage(error), "error");
    } finally {
        submitButton.disabled = false;
    }
});

try {
    const rememberedEnrollment = localStorage.getItem(REMEMBER_KEY);
    if (rememberedEnrollment) {
        document.getElementById("loginEnrollment").value = rememberedEnrollment;
        document.getElementById("remember").checked = true;
    }
} catch (error) {
    console.warn("Unable to load the remembered enrollment number.", error);
}

function toggleTheme() {
    document.body.classList.toggle("night");
}
