from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.models import Notification
from extensions import db

notification_bp = Blueprint(
    "notifications",
    __name__,
    url_prefix="/api/notifications"
)


# ─────────────────────────────────────────────
# GET ALL NOTIFICATIONS
# ─────────────────────────────────────────────
@notification_bp.route("", methods=["GET"])
@jwt_required()
def get_notifications():
    identity = get_jwt_identity()

    if str(identity).startswith("admin:"):
        return jsonify({
            "notifications": [],
            "unread_count": 0
        }), 200

    try:
        student_id = int(identity)
    except:
        return jsonify({
            "notifications": [],
            "unread_count": 0
        }), 200

    notifications = (
        Notification.query
        .filter_by(student_id=student_id)
        .order_by(Notification.created_at.desc())
        .all()
    )

    unread_count = sum(
        1 for n in notifications if not n.is_read
    )

    return jsonify({
        "notifications": [
            n.to_dict() for n in notifications
        ],
        "unread_count": unread_count
    }), 200


# ─────────────────────────────────────────────
# MARK ALL READ
# IMPORTANT:
# MUST COME BEFORE /<int:nid>/read
# ─────────────────────────────────────────────
@notification_bp.route("/read-all", methods=["PATCH"])
@jwt_required()
def mark_all_read():
    identity = get_jwt_identity()

    if str(identity).startswith("admin:"):
        return jsonify({
            "message": "done"
        }), 200

    try:
        student_id = int(identity)
    except:
        return jsonify({
            "message": "invalid user"
        }), 400

    Notification.query.filter_by(
        student_id=student_id,
        is_read=False
    ).update({
        "is_read": True
    })

    db.session.commit()

    return jsonify({
        "message": "all notifications marked read"
    }), 200


# ─────────────────────────────────────────────
# MARK SINGLE READ
# ─────────────────────────────────────────────
@notification_bp.route("/<int:nid>/read", methods=["PATCH"])
@jwt_required()
def mark_read(nid):
    identity = get_jwt_identity()

    if str(identity).startswith("admin:"):
        return jsonify({
            "error": "Unauthorized"
        }), 403

    try:
        student_id = int(identity)
    except:
        return jsonify({
            "error": "Invalid identity"
        }), 400

    notif = Notification.query.filter_by(
        id=nid,
        student_id=student_id
    ).first_or_404()

    notif.is_read = True

    db.session.commit()

    return jsonify({
        "message": "notification marked read"
    }), 200