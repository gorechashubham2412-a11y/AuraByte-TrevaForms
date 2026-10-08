from supabase import create_client
from flask import Flask, request, jsonify

app = Flask(__name__)

SUPABASE_URL = "https://xhmpdhousonsdasolyzc.supabase.co"
SUPABASE_KEY = "sb_publishable_GnvX1KDInNAm0Ip6OSynJg_PomHcyVp"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.route('/createAccount', methods=['POST'])
@app.route('/api/register', methods=['POST'])
def register():
    data_in = request.get_json(silent=True) or request.form
    
    collegename = data_in.get('college') or data_in.get('collegename', '')
    department = data_in.get('department', '')
    fullname = data_in.get('name') or data_in.get('fullname') or data_in.get('username', '')
    password = data_in.get('password', '')
    is_coord = 1 if (data_in.get('isCoordinator') or data_in.get('isclasscoordinator')) else 0
    batch_coord = str(data_in.get('batchStartYear') or data_in.get('batchofcoordinator') or '')[:6]

    db_data = {
        "collegename": collegename,
        "department": department,
        "fullname": fullname,
        "password": password,
        "isclasscoordinator": is_coord,
        "batchofcoordinator": batch_coord
    }

    try:
        response = supabase.table("teacher_logins").insert(db_data).execute()
        return jsonify({"message": "Account created successfully in Supabase", "data": db_data}), 201
    except Exception as e:
        return jsonify({"message": f"Error saving to database: {str(e)}"}), 400


@app.route('/login', methods=['POST'])
@app.route('/api/login', methods=['POST'])
def login():
    data_in = request.get_json(silent=True) or request.form
    username = data_in.get('loginEnrollment') or data_in.get('username') or data_in.get('fullname', '')
    password = data_in.get('loginPassword') or data_in.get('password', '')

    try:
        response = supabase.table("teacher_logins").select("*").eq("fullname", username).eq("password", password).execute()
        if response.data and len(response.data) > 0:
            return jsonify({"message": "Login successful", "user": response.data[0]}), 200
        else:
            return jsonify({"message": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"message": f"Login error: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5001)