from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from supabase import create_client
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder="Frontend", static_url_path="")
CORS(app)


@app.route("/")
def frontend():
    return send_from_directory(app.static_folder, "Loginpage.html")


# -----------------------------
# SUPABASE CONNECTION
# -----------------------------

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# -----------------------------
# REGISTER
# -----------------------------

@app.route("/api/register", methods=["POST"])
def register():

    data = request.get_json()
    if not isinstance(data, dict):
        return jsonify({
            "message": "Please submit valid account details."
        }), 400

    username = data.get("username")
    name = data.get("name")
    enrollment = data.get("enrollmentNumber")
    email = data.get("email")
    password = data.get("password")

    required_fields = (username, name, enrollment, email)
    if (
        not all(isinstance(value, str) and value.strip() for value in required_fields)
        or not isinstance(password, str)
        or not password
    ):
        return jsonify({
            "message": "Please fill in every required field."
        }), 400

    if not enrollment.isdigit() or len(enrollment) != 12:
        return jsonify({
            "message": "Enrollment number must contain exactly 12 digits."
        }), 400

    username = username.strip()
    name = name.strip()
    email = email.strip()
    enrollment_number = int(enrollment)

    existing_username = supabase.table("user") \
        .select("User_id") \
        .eq("user_name", username) \
        .execute()
    existing_email = supabase.table("user") \
        .select("User_id") \
        .eq("Email", email) \
        .execute()
    existing_enrollment = supabase.table("user") \
        .select("User_id") \
        .eq("Enrollment", enrollment_number) \
        .execute()

    if existing_username.data or existing_email.data or existing_enrollment.data:
        return jsonify({
            "message": "Username, email or enrollment number already exists."
        }), 409

    hashed_password = generate_password_hash(password)

    user = {
        "user_name": username,
        "Name": name,
        "Enrollment": enrollment_number,
        "Email": email,
        "Password": hashed_password,
        "IsAdmin": 0
    }

    result = supabase.table("user").insert(user).execute()

    if not result.data:
        return jsonify({
            "message": "Failed to create account."
        }), 500

    return jsonify({
        "message": "Account created successfully."
    }), 201


# -----------------------------
# LOGIN
# -----------------------------

@app.route("/api/login", methods=["POST"])
def login():

    data = request.get_json()
    if not isinstance(data, dict):
        return jsonify({
            "message": "Please enter your enrollment number and password."
        }), 400

    enrollment = data.get("enrollmentNumber")
    password = data.get("password")

    if (
        not isinstance(enrollment, str)
        or not enrollment.strip()
        or not enrollment.strip().isdigit()
        or not isinstance(password, str)
        or not password
    ):
        return jsonify({
            "message": "Please enter your enrollment number and password."
        }), 400

    result = supabase.table("user") \
        .select("User_id,user_name,Name,Enrollment,Email,Password,IsAdmin") \
        .eq("Enrollment", int(enrollment.strip())) \
        .execute()

    if not result.data:
        return jsonify({
            "message": "Username or password is incorrect."
        }), 401

    user = result.data[0]
    stored_password = user["Password"]
    is_hashed_password = isinstance(stored_password, str) and stored_password.startswith(
        ("scrypt:", "pbkdf2:")
    )
    password_matches = (
        check_password_hash(stored_password, password)
        if is_hashed_password
        else isinstance(stored_password, str) and stored_password == password
    )

    if not password_matches:
        return jsonify({
            "message": "Username or password is incorrect."
        }), 401

    if not is_hashed_password:
        supabase.table("user") \
            .update({"Password": generate_password_hash(password)}) \
            .eq("User_id", user["User_id"]) \
            .execute()

    return jsonify({
        "message": "Login successful.",
        "user": {
            "id": user["User_id"],
            "username": user["user_name"],
            "name": user["Name"],
            "enrollment": user["Enrollment"],
            "email": user["Email"],
            "isAdmin": 1 if user.get("IsAdmin") in (1, "1", True) else 0
        }
    }), 200


# -----------------------------
# RUN SERVER
# -----------------------------

if __name__ == "__main__":
    app.run(debug=True, port=int(os.getenv("PORT", "5001")))