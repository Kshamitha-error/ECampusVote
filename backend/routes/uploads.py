import os, uuid, csv, io
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.models import Student
from extensions import db

upload_bp = Blueprint("uploads", __name__, url_prefix="/api/uploads")

ALLOWED = {"png", "jpg", "jpeg", "gif", "webp"}

def is_admin():
    return str(get_jwt_identity()).startswith("admin:")

def allowed(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED


@upload_bp.route("/image", methods=["POST"])
@jwt_required()
def upload_image():
    if not is_admin():
        return jsonify({"error": "Admin access required."}), 403
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400
    f = request.files["file"]
    if not f.filename or not allowed(f.filename):
        return jsonify({"error": "Only image files allowed (jpg, png, gif, webp)."}), 400

    ext = f.filename.rsplit(".", 1)[1].lower()
    if ext == "jpeg":
        ext = "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    save_path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)

    try:
        from PIL import Image
        img = Image.open(f)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
            ext = "jpg"
            filename = f"{uuid.uuid4().hex}.jpg"
            save_path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
        img.thumbnail((800, 800), Image.LANCZOS)
        img.save(save_path, quality=85, optimize=True)
    except ImportError:
        f.seek(0)
        f.save(save_path)
    except Exception:
        f.seek(0)
        f.save(save_path)

    return jsonify({"url": f"/uploads/{filename}"}), 201


@upload_bp.route("/students-csv", methods=["POST"])
@jwt_required()
def upload_students_csv():
    if not is_admin():
        return jsonify({"error": "Admin access required."}), 403
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400
    f = request.files["file"]
    if not f.filename.endswith(".csv"):
        return jsonify({"error": "Only CSV files allowed."}), 400

    stream = io.StringIO(f.stream.read().decode("utf-8"))
    reader = csv.DictReader(stream)

    added, skipped, errors = [], [], []
    for i, row in enumerate(reader, start=2):
        email    = (row.get("email")   or row.get("Email")   or "").strip().lower()
        roll_no  = (row.get("roll_no") or row.get("Roll No") or row.get("rollno") or "").strip()
        branch   = (row.get("branch")  or row.get("Branch")  or "").strip()
        year_raw = (row.get("year")    or row.get("Year")    or "").strip()
        year     = int(year_raw) if year_raw.isdigit() and 1 <= int(year_raw) <= 4 else None

        if not email or not roll_no:
            errors.append(f"Row {i}: missing email or roll_no")
            continue
        if Student.query.filter_by(email=email).first():
            skipped.append(email)
            continue
        db.session.add(Student(email=email, roll_no=roll_no, branch=branch or None, year=year))
        added.append(email)

    db.session.commit()
    return jsonify({
        "message": f"{len(added)} added, {len(skipped)} already existed, {len(errors)} errors.",
        "added":   added,
        "skipped": skipped,
        "errors":  errors,
    }), 200


@upload_bp.route("/students/stats", methods=["GET"])
@jwt_required()
def student_stats():
    if not is_admin():
        return jsonify({"error": "Admin access required."}), 403
    total      = Student.query.count()
    registered = Student.query.filter(Student.password_hash.isnot(None)).count()
    return jsonify({"total": total, "registered": registered, "not_registered": total - registered}), 200


@upload_bp.route("/students", methods=["GET"])
@jwt_required()
def list_students():
    if not is_admin():
        return jsonify({"error": "Admin access required."}), 403
    page     = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)
    search   = request.args.get("search", "").strip()

    query = Student.query
    if search:
        like = f"%{search}%"
        query = query.filter(
            db.or_(Student.email.ilike(like), Student.roll_no.ilike(like),
                   Student.name.ilike(like))
        )

    total    = query.count()
    pages    = (total + per_page - 1) // per_page
    students = query.order_by(Student.id.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        "students": [
            {"id": s.id, "email": s.email, "roll_no": s.roll_no,
             "name": s.name or "", "branch": s.branch or "", "year": s.year,
             "registered": s.password_hash is not None}
            for s in students
        ],
        "total": total, "page": page, "per_page": per_page, "pages": pages,
    }), 200


@upload_bp.route("/students/<int:student_id>", methods=["DELETE"])
@jwt_required()
def delete_student(student_id):
    if not is_admin():
        return jsonify({"error": "Admin access required."}), 403
    student = Student.query.get_or_404(student_id)
    db.session.delete(student)
    db.session.commit()
    return jsonify({"message": "Student removed."}), 200


@upload_bp.route("/students/bulk-delete", methods=["POST"])
@jwt_required()
def bulk_delete_students():
    if not is_admin():
        return jsonify({"error": "Admin access required."}), 403
    data = request.get_json() or {}
    ids  = data.get("ids", [])
    if not ids:
        return jsonify({"error": "No IDs provided."}), 400
    Student.query.filter(Student.id.in_(ids)).delete(synchronize_session=False)
    db.session.commit()
    return jsonify({"message": f"{len(ids)} students removed."}), 200


@upload_bp.route("/students/rollover/preview", methods=["GET"])
@jwt_required()
def rollover_preview():
    if not is_admin():
        return jsonify({"error": "Admin access required."}), 403
    counts = {str(y): Student.query.filter_by(year=y).count() for y in range(1, 5)}
    return jsonify(counts), 200


@upload_bp.route("/students/rollover/remove-passouts", methods=["POST"])
@jwt_required()
def remove_passouts():
    if not is_admin():
        return jsonify({"error": "Admin access required."}), 403
    n = Student.query.filter_by(year=4).delete()
    db.session.commit()
    return jsonify({"message": f"{n} 4th-year students removed."}), 200


@upload_bp.route("/students/rollover/upgrade-years", methods=["POST"])
@jwt_required()
def upgrade_years():
    if not is_admin():
        return jsonify({"error": "Admin access required."}), 403
    for old, new in [(3, 4), (2, 3), (1, 2)]:
        Student.query.filter_by(year=old).update({"year": new})
    db.session.commit()
    return jsonify({"message": "Years upgraded successfully."}), 200


@upload_bp.route("/students/reset-all", methods=["DELETE"])
@jwt_required()
def reset_all_students():
    if not is_admin():
        return jsonify({"error": "Admin access required."}), 403
    data    = request.get_json() or {}
    confirm = data.get("confirm", "")
    if confirm != "DELETE":
        return jsonify({"error": "Type DELETE to confirm."}), 400
    n = Student.query.delete()
    db.session.commit()
    return jsonify({"message": f"All {n} students removed."}), 200