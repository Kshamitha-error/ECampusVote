from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models.models import Admin
from utils.helpers import check_password
from extensions import limiter

admin_auth_bp = Blueprint("admin_auth", __name__, url_prefix="/api/admin/auth")


@admin_auth_bp.route("/login", methods=["POST"])
# FIX: admin login had no rate limit at all — the single highest-value
# account in the whole app was the easiest to brute-force.
@limiter.limit("10 per minute")
def admin_login():
    data     = request.get_json() or {}
    email    = (data.get("email")    or "").strip().lower()
    password = (data.get("password") or "")
    if not email or not password:
        return jsonify({"error": "Email and password required."}), 400
    admin = Admin.query.filter_by(email=email).first()
    if not admin:
        return jsonify({"error": "Invalid credentials."}), 401
    if not check_password(password, admin.password_hash):
        return jsonify({"error": "Invalid credentials."}), 401
    token = create_access_token(identity=f"admin:{admin.id}")
    return jsonify({"message": "Admin login successful.", "access_token": token}), 200


@admin_auth_bp.route("/verify", methods=["GET"])
@jwt_required()
def verify_admin():
    identity = get_jwt_identity()
    if not str(identity).startswith("admin:"):
        return jsonify({"error": "Unauthorized."}), 403
    return jsonify({"valid": True}), 200