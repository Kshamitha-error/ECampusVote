import re
import threading
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models.models import Student
from extensions import db, limiter

# FIX: limiter was imported but never actually used anywhere in this file —
# every auth endpoint (OTP, login) was fully unlimited. These caps stop
# scripted brute-force / OTP-guessing without getting in the way of a real
# student who mistypes their password a couple of times.
otp_limit   = limiter.limit("10 per minute")
login_limit = limiter.limit("10 per minute")
from utils.helpers import (
    set_otp, verify_otp, validate_password_strength,
    hash_password, check_password, send_otp_email
)

student_auth_bp = Blueprint("student_auth", __name__, url_prefix="/api/student/auth")


def _send_async(app, to, name, otp):
    with app.app_context():
        send_otp_email(to, name, otp)


def sanitize(value):
    if not value:
        return ""
    value = re.sub(r'[\u200B-\u200D\uFEFF\u00A0\u202F\u2060]', '', value)
    value = re.sub(r'[^\x20-\x7E]', '', value)
    return value.strip()


def normalize_roll(roll_no):
    return roll_no.upper().replace(" ", "").replace("-", "")


# ─── Verify Identity (new/unregistered students only) ────────────────────────

@student_auth_bp.route("/verify-identity", methods=["POST"])
@otp_limit
def verify_identity():
    data    = request.get_json() or {}
    email   = sanitize(data.get("email",   "")).lower()
    roll_no = normalize_roll(sanitize(data.get("roll_no", "")))

    if not email or not roll_no:
        return jsonify({"error": "Email and Roll Number are required."}), 400

    print(f"[LOGIN ATTEMPT] email='{email}' roll_no='{roll_no}'")

    student = Student.query.filter(
        Student.email == email,
        db.func.upper(Student.roll_no) == roll_no
    ).first()

    if not student:
        roll_with_o    = roll_no.replace("0", "O")
        roll_with_zero = roll_no.replace("O", "0")
        student = Student.query.filter(
            Student.email == email,
            db.func.upper(Student.roll_no).in_([roll_no, roll_with_o, roll_with_zero])
        ).first()

    if not student:
        by_email = Student.query.filter(Student.email == email).first()
        if by_email:
            print(f"[LOGIN FAIL] Email found but roll_no mismatch. DB='{by_email.roll_no}', got='{roll_no}'")
        else:
            print(f"[LOGIN FAIL] Email not found: '{email}'")
        return jsonify({"error": "Invalid details. Email or Roll Number does not match our records."}), 404

    # Already registered — redirect to password login
    if student.is_registered:
        return jsonify({
            "error": "already_registered",
            "message": "You are already registered. Please sign in with your password."
        }), 200

    otp = set_otp(student)
    app = current_app._get_current_object()
    threading.Thread(target=_send_async, args=(app, student.email, student.name, otp), daemon=True).start()
    return jsonify({"message": "OTP sent to your registered email.", "student_id": student.id}), 200


# ─── Forgot Password — sends OTP to registered students ──────────────────────

@student_auth_bp.route("/forgot-password", methods=["POST"])
@otp_limit
def forgot_password():
    data    = request.get_json() or {}
    email   = sanitize(data.get("email",   "")).lower()
    roll_no = normalize_roll(sanitize(data.get("roll_no", "")))

    if not email or not roll_no:
        return jsonify({"error": "Email and Roll Number are required."}), 400

    student = Student.query.filter(
        Student.email == email,
        db.func.upper(Student.roll_no) == roll_no
    ).first()

    if not student:
        roll_with_o    = roll_no.replace("0", "O")
        roll_with_zero = roll_no.replace("O", "0")
        student = Student.query.filter(
            Student.email == email,
            db.func.upper(Student.roll_no).in_([roll_no, roll_with_o, roll_with_zero])
        ).first()

    if not student:
        return jsonify({"error": "Invalid details. Email or Roll Number does not match our records."}), 404

    if not student.is_registered:
        return jsonify({"error": "This account is not registered yet. Please register first."}), 400

    otp = set_otp(student)
    app = current_app._get_current_object()
    threading.Thread(target=_send_async, args=(app, student.email, student.name, otp), daemon=True).start()
    return jsonify({"message": "OTP sent to your registered email.", "student_id": student.id}), 200


# ─── Verify OTP ───────────────────────────────────────────────────────────────

@student_auth_bp.route("/verify-otp", methods=["POST"])
@limiter.limit("15 per minute")
def verify_otp_route():
    data       = request.get_json() or {}
    student_id = data.get("student_id")
    entered    = data.get("otp", "").strip()
    if not student_id or not entered:
        return jsonify({"error": "Student ID and OTP required."}), 400
    student = Student.query.get(student_id)
    if not student:
        return jsonify({"error": "Student not found."}), 404
    ok, msg = verify_otp(student, entered)
    if not ok:
        return jsonify({"error": msg}), 400
    return jsonify({"message": msg, "student_id": student.id}), 200


# ─── Resend OTP ───────────────────────────────────────────────────────────────

@student_auth_bp.route("/resend-otp", methods=["POST"])
@otp_limit
def resend_otp():
    data    = request.get_json() or {}
    student = Student.query.get(data.get("student_id"))
    if not student:
        return jsonify({"error": "Student not found."}), 404
    otp = set_otp(student)
    app = current_app._get_current_object()
    threading.Thread(target=_send_async, args=(app, student.email, student.name, otp), daemon=True).start()
    return jsonify({"message": "New OTP sent."}), 200


# ─── Set Password (new registration) ─────────────────────────────────────────

@student_auth_bp.route("/set-password", methods=["POST"])
def set_password():
    data    = request.get_json() or {}
    student = Student.query.get(data.get("student_id"))
    if not student:
        return jsonify({"error": "Student not found."}), 404
    name = sanitize(data.get("name", ""))
    if not name:
        return jsonify({"error": "Full name is required."}), 400
    password = data.get("password", "")
    if password != data.get("confirm_password", ""):
        return jsonify({"error": "Passwords do not match."}), 400
    valid, msg = validate_password_strength(password)
    if not valid:
        return jsonify({"error": msg}), 400
    student.name          = name
    student.password_hash = hash_password(password)
    student.is_registered = True
    db.session.commit()
    token = create_access_token(identity=str(student.id))
    return jsonify({"message": "Password set.", "access_token": token, "student": student.to_dict()}), 200


# ─── Reset Password (forgot password flow) ───────────────────────────────────

@student_auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data    = request.get_json() or {}
    student = Student.query.get(data.get("student_id"))
    if not student:
        return jsonify({"error": "Student not found."}), 404
    password = data.get("password", "")
    if password != data.get("confirm_password", ""):
        return jsonify({"error": "Passwords do not match."}), 400
    valid, msg = validate_password_strength(password)
    if not valid:
        return jsonify({"error": msg}), 400
    student.password_hash = hash_password(password)
    db.session.commit()
    return jsonify({"message": "Password reset successfully."}), 200


# ─── Login ────────────────────────────────────────────────────────────────────

@student_auth_bp.route("/login", methods=["POST"])
@login_limit
def returning_login():
    data     = request.get_json() or {}
    email    = sanitize(data.get("email", "")).lower()
    password = data.get("password", "")
    if not email or not password:
        return jsonify({"error": "Email and password required."}), 400
    student = Student.query.filter_by(email=email).first()
    if not student or not student.is_registered:
        return jsonify({"error": "Account not found or not yet registered."}), 404
    if not check_password(password, student.password_hash):
        return jsonify({"error": "Incorrect password."}), 401
    token = create_access_token(identity=str(student.id))
    return jsonify({"message": "Login successful.", "access_token": token, "student": student.to_dict()}), 200


# ─── Me / Profile ─────────────────────────────────────────────────────────────

@student_auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    student = Student.query.get(int(get_jwt_identity()))
    if not student:
        return jsonify({"error": "Not found."}), 404
    return jsonify(student.to_dict()), 200


@student_auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    student = Student.query.get(int(get_jwt_identity()))
    if not student:
        return jsonify({"error": "Not found."}), 404
    data = request.get_json() or {}
    name = sanitize(data.get("name", ""))
    if name:
        student.name = name
    current_password = data.get("current_password", "")
    new_password     = data.get("new_password", "")
    if new_password:
        if not current_password:
            return jsonify({"error": "Current password is required."}), 400
        if not check_password(current_password, student.password_hash):
            return jsonify({"error": "Current password is incorrect."}), 401
        if new_password != data.get("confirm_password", ""):
            return jsonify({"error": "New passwords do not match."}), 400
        valid, msg = validate_password_strength(new_password)
        if not valid:
            return jsonify({"error": msg}), 400
        student.password_hash = hash_password(new_password)
    db.session.commit()
    return jsonify({"message": "Profile updated.", "student": student.to_dict()}), 200