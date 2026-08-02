import threading
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from models.models import Election, Candidate, Student, Notification, Vote
from extensions import db

election_bp = Blueprint("elections", __name__, url_prefix="/api/elections")


def is_admin():
    return str(get_jwt_identity()).startswith("admin:")


def get_student():
    """
    Student JWT identity = str(student.id)  (set in student_auth.py)
    Admin  JWT identity  = "admin:<id>"
    """
    identity = get_jwt_identity()
    if str(identity).startswith("admin:"):
        return None
    try:
        return Student.query.get(int(identity))
    except (ValueError, TypeError):
        return None


def broadcast(title, message):
    try:
        from utils.helpers import send_election_notification_email
        students = Student.query.filter_by(is_registered=True).all()
        for s in students:
            # FIX: dedup used to key on title alone, so two different
            # elections that happened to share a name would suppress each
            # other's notifications for anyone who'd already gotten one with
            # that title. Keying on title + message (which includes the
            # election's actual dates) makes genuinely different
            # announcements distinguishable while still preventing true
            # duplicates from piling up.
            if not Notification.query.filter_by(student_id=s.id, title=title, message=message).first():
                db.session.add(Notification(student_id=s.id, title=title, message=message))
            try:
                send_election_notification_email(s.email, s.name or "", title, message)
            except Exception as e:
                print(f"[NOTIFY ERROR] {s.email}: {e}")
        db.session.commit()
    except Exception as e:
        print(f"[BROADCAST ERROR] {e}")


def _broadcast_with_context(app, title, message):
    with app.app_context():
        broadcast(title, message)


def broadcast_bg(title, message):
    # FIX: this used to start a bare thread with no Flask app context, so
    # EVERY admin-triggered broadcast (creating, starting, or cancelling an
    # election) failed silently with "Working outside of application
    # context" — meaning no notifications and no emails ever actually went
    # out for those actions. It only worked for the scheduler's automatic
    # start/end/reminder jobs, which did wrap their own context correctly.
    # This was invisible unless you were watching the server console.
    app = current_app._get_current_object()
    threading.Thread(target=_broadcast_with_context, args=(app, title, message), daemon=True).start()


def tally(election):
    return sorted(
        [{"candidate_id": c.id, "name": c.name, "branch": c.branch, "year": c.year,
          "photo_url": c.photo_url, "votes": len(c.votes)}
         for c in election.candidates],
        key=lambda x: x["votes"], reverse=True,
    )


def sync_all_statuses():
    now = datetime.now()
    changed = False
    for e in Election.query.filter(Election.status == "upcoming", Election.start_time <= now).all():
        e.status = "ongoing"
        changed = True
    for e in Election.query.filter(Election.status == "ongoing", Election.end_time <= now).all():
        e.status = "ended"
        changed = True
    if changed:
        db.session.commit()


# ─── Create Election ──────────────────────────────────────────────────────────

@election_bp.route("/", methods=["POST"])
@jwt_required()
def create_election():
    if not is_admin():
        return jsonify({"error": "Admin access required."}), 403
    data = request.get_json()
    title = data.get("title", "").strip()
    if not title or not data.get("start_time") or not data.get("end_time"):
        return jsonify({"error": "Title, start_time, and end_time are required."}), 400
    try:
        start_str = data["start_time"].replace("T", " ").split(".")[0][:16]
        end_str   = data["end_time"].replace("T", " ").split(".")[0][:16]
        start_dt  = datetime.strptime(start_str, "%Y-%m-%d %H:%M")
        end_dt    = datetime.strptime(end_str,   "%Y-%m-%d %H:%M")
    except ValueError:
        return jsonify({"error": "Invalid date format."}), 400
    if end_dt <= start_dt:
        return jsonify({"error": "end_time must be after start_time."}), 400
    e = Election(
        title=title, description=data.get("description", ""),
        start_time=start_dt, end_time=end_dt
    )
    db.session.add(e)
    db.session.commit()
    broadcast_bg(
        f"New Election: {title}",
        f"A new election '{title}' is scheduled from "
        f"{start_dt.strftime('%d %b %Y %H:%M')} to {end_dt.strftime('%d %b %Y %H:%M')}."
    )
    return jsonify({"message": "Election created.", "election_id": e.id, "election": e.to_dict()}), 201


# ─── List / Get / Edit / Delete ───────────────────────────────────────────────

@election_bp.route("/", methods=["GET"])
@jwt_required()
def list_elections():
    sync_all_statuses()
    status = request.args.get("status")
    q = Election.query
    if status:
        q = q.filter_by(status=status)
    elections = q.order_by(Election.start_time.desc()).all()

    admin = is_admin()
    out = []
    for e in elections:
        d = e.to_dict()
        # FIX: same vote-count leak as the single-election endpoint below —
        # strip it here too for elections that haven't ended yet.
        if not admin and e.status != "ended":
            d["vote_count"] = None
        out.append(d)
    return jsonify(out), 200


@election_bp.route("/<int:eid>", methods=["GET"])
@jwt_required()
def get_election(eid):
    sync_all_statuses()
    e = Election.query.get_or_404(eid)
    d = e.to_dict()
    d["candidates"] = [c.to_dict() for c in e.candidates]

    # FIX: candidate vote_count (and the election-level vote_count above) was
    # always included in this response, even while an election was still
    # "upcoming"/"ongoing". The frontend UI never displayed it before voting
    # ended, but the raw numbers were sitting right there in the network
    # response for anyone to see in DevTools. Now the numbers are stripped
    # out for non-admins until the election has actually ended.
    if not is_admin() and e.status != "ended":
        d["vote_count"] = None
        for c in d["candidates"]:
            c["vote_count"] = None

    return jsonify(d), 200


@election_bp.route("/<int:eid>", methods=["PUT"])
@jwt_required()
def edit_election(eid):
    if not is_admin():
        return jsonify({"error": "Admin access required."}), 403
    e = Election.query.get_or_404(eid)
    if e.status == "ended":
        return jsonify({"error": "Ended elections cannot be edited."}), 400
    data = request.get_json()
    e.title       = data.get("title", e.title).strip()
    e.description = data.get("description", e.description)
    if e.status == "upcoming":
        try:
            if data.get("start_time"):
                start_str = data["start_time"].replace("T", " ").split(".")[0][:16]
                e.start_time = datetime.strptime(start_str, "%Y-%m-%d %H:%M")
            if data.get("end_time"):
                end_str = data["end_time"].replace("T", " ").split(".")[0][:16]
                e.end_time = datetime.strptime(end_str, "%Y-%m-%d %H:%M")
            if e.end_time <= e.start_time:
                return jsonify({"error": "End time must be after start time."}), 400
        except ValueError:
            return jsonify({"error": "Invalid date format."}), 400
    db.session.commit()
    return jsonify({"message": "Election updated.", "election": e.to_dict()}), 200


@election_bp.route("/<int:eid>", methods=["DELETE"])
@jwt_required()
def delete_election(eid):
    if not is_admin():
        return jsonify({"error": "Admin access required."}), 403
    e = Election.query.get_or_404(eid)
    db.session.delete(e)
    db.session.commit()
    return jsonify({"message": "Election deleted."}), 200


# ─── Candidates ───────────────────────────────────────────────────────────────

@election_bp.route("/<int:eid>/candidates", methods=["GET"])
@jwt_required()
def get_candidates_by_election(eid):
    e = Election.query.get_or_404(eid)
    candidates = [c.to_dict() for c in e.candidates]
    # FIX: same vote-count leak as get_election/list_elections.
    if not is_admin() and e.status != "ended":
        for c in candidates:
            c["vote_count"] = None
    return jsonify({"candidates": candidates}), 200


@election_bp.route("/<int:eid>/candidates", methods=["POST"])
@jwt_required()
def add_candidate_by_election(eid):
    if not is_admin():
        return jsonify({"error": "Admin access required."}), 403
    Election.query.get_or_404(eid)
    data = request.get_json()
    if not data.get("name", "").strip():
        return jsonify({"error": "Candidate name is required."}), 400
    if not data.get("photo_url", ""):
        return jsonify({"error": "Candidate photo is required."}), 400
    if not data.get("symbol_url", "") and not data.get("logo_url", ""):
        return jsonify({"error": "Candidate symbol/logo is required."}), 400
    c = Candidate(
        election_id=eid,
        name=data["name"].strip(),
        branch=data.get("branch", ""),
        year=data.get("year", ""),
        photo_url=data.get("photo_url", ""),
        symbol_url=data.get("symbol_url", data.get("logo_url", "")),
        manifesto=data.get("manifesto", ""),
        achievements=data.get("achievements", ""),
    )
    db.session.add(c)
    db.session.commit()
    return jsonify({"message": "Candidate added.", "candidate": c.to_dict()}), 201


@election_bp.route("/<int:eid>/candidates/<int:cid>", methods=["PUT"])
@jwt_required()
def edit_candidate_by_election(eid, cid):
    if not is_admin():
        return jsonify({"error": "Admin access required."}), 403
    c = Candidate.query.filter_by(id=cid, election_id=eid).first_or_404()
    data = request.get_json()
    c.name         = data.get("name",         c.name)
    c.branch       = data.get("branch",       c.branch)
    c.year         = data.get("year",         c.year)
    c.photo_url    = data.get("photo_url",    c.photo_url)
    c.symbol_url   = data.get("symbol_url",   data.get("logo_url", c.symbol_url))
    c.manifesto    = data.get("manifesto",    c.manifesto)
    c.achievements = data.get("achievements", c.achievements)
    db.session.commit()
    return jsonify({"message": "Candidate updated.", "candidate": c.to_dict()}), 200


@election_bp.route("/<int:eid>/candidates/<int:cid>", methods=["DELETE"])
@jwt_required()
def delete_candidate_by_election(eid, cid):
    if not is_admin():
        return jsonify({"error": "Admin access required."}), 403
    c = Candidate.query.filter_by(id=cid, election_id=eid).first_or_404()
    db.session.delete(c)
    db.session.commit()
    return jsonify({"message": "Candidate deleted."}), 200


@election_bp.route("/candidates", methods=["POST"])
@jwt_required()
def add_candidate():
    if not is_admin():
        return jsonify({"error": "Admin access required."}), 403
    data = request.get_json()
    eid = data.get("election_id")
    if not eid:
        return jsonify({"error": "election_id required."}), 400
    Election.query.get_or_404(eid)
    if not data.get("name", "").strip():
        return jsonify({"error": "Candidate name is required."}), 400
    if not data.get("photo_url", ""):
        return jsonify({"error": "Candidate photo is required."}), 400
    if not data.get("logo_url", "") and not data.get("symbol_url", ""):
        return jsonify({"error": "Candidate symbol/logo is required."}), 400
    c = Candidate(
        election_id=eid,
        name=data["name"].strip(),
        branch=data.get("branch", ""),
        year=data.get("year"),
        photo_url=data.get("photo_url", ""),
        symbol_url=data.get("logo_url", data.get("symbol_url", "")),
        manifesto=data.get("manifesto", ""),
        achievements=data.get("achievements", ""),
    )
    db.session.add(c)
    db.session.commit()
    return jsonify({"message": "Candidate added.", "candidate": c.to_dict()}), 201


@election_bp.route("/candidates/<int:cid>", methods=["GET"])
@jwt_required()
def get_candidate(cid):
    c = Candidate.query.get_or_404(cid)
    return jsonify(c.to_dict()), 200


@election_bp.route("/candidates/<int:cid>", methods=["PUT"])
@jwt_required()
def edit_candidate(cid):
    if not is_admin():
        return jsonify({"error": "Admin access required."}), 403
    c = Candidate.query.get_or_404(cid)
    data = request.get_json()
    c.name         = data.get("name",         c.name)
    c.branch       = data.get("branch",       c.branch)
    c.year         = data.get("year",         c.year)
    c.photo_url    = data.get("photo_url",    c.photo_url)
    c.symbol_url   = data.get("logo_url",     data.get("symbol_url", c.symbol_url))
    c.manifesto    = data.get("manifesto",    c.manifesto)
    c.achievements = data.get("achievements", c.achievements)
    db.session.commit()
    return jsonify({"message": "Candidate updated.", "candidate": c.to_dict()}), 200


@election_bp.route("/candidates/<int:cid>", methods=["DELETE"])
@jwt_required()
def delete_candidate(cid):
    if not is_admin():
        return jsonify({"error": "Admin access required."}), 403
    c = Candidate.query.get_or_404(cid)
    db.session.delete(c)
    db.session.commit()
    return jsonify({"message": "Candidate deleted."}), 200


# ─── Election Actions ─────────────────────────────────────────────────────────

@election_bp.route("/<int:eid>/start", methods=["POST"])
@jwt_required()
def start_election(eid):
    try:
        if not is_admin():
            return jsonify({"error": "Admin access required."}), 403
        e = Election.query.get_or_404(eid)
        if e.status != "upcoming":
            return jsonify({"error": f"Cannot start an election that is already '{e.status}'."}), 400
        e.status = "ongoing"
        db.session.commit()
        broadcast_bg(
            f"Election Started: {e.title}",
            f"Voting for '{e.title}' is now open! Cast your vote before {e.end_time.strftime('%d %b %Y %H:%M')}."
        )
        return jsonify({"message": "Election started.", "election": e.to_dict()}), 200
    except Exception as ex:
        db.session.rollback()
        print("START ELECTION ERROR:", ex)
        return jsonify({"error": "Failed to start election."}), 500


@election_bp.route("/<int:eid>/end", methods=["POST", "PATCH"])
@jwt_required()
def end_election(eid):
    try:
        if not is_admin():
            return jsonify({"error": "Admin access required."}), 403
        e = Election.query.get_or_404(eid)
        e.status = "ended"
        db.session.commit()

        # FIX: this endpoint never notified students that voting had ended
        # or who won — create/start/cancel all broadcast, but end_election
        # was silently skipped. Students had no way to know results were
        # ready unless they manually reopened the app and checked.
        results = tally(e)
        winner = results[0]["name"] if results else None
        broadcast_bg(
            f"Results: {e.title}",
            f"Voting for '{e.title}' has ended."
            + (f" \U0001F3C6 Winner: {winner}." if winner else "")
        )

        return jsonify({
            "message": "Election ended successfully.",
            "results": results
        }), 200
    except Exception as ex:
        db.session.rollback()
        print("END ELECTION ERROR:", ex)
        return jsonify({"error": "Failed to end election."}), 500


@election_bp.route("/<int:eid>/cancel", methods=["POST"])
@jwt_required()
def cancel_election(eid):
    try:
        if not is_admin():
            return jsonify({"error": "Admin access required."}), 403
        e = Election.query.get_or_404(eid)
        if e.status in ("ended", "cancelled"):
            return jsonify({"error": f"Cannot cancel an election that is already '{e.status}'."}), 400
        e.status = "cancelled"
        db.session.commit()
        broadcast_bg(
            f"Election Cancelled: {e.title}",
            f"The election '{e.title}' has been cancelled by the administration."
        )
        return jsonify({"message": "Election cancelled.", "election": e.to_dict()}), 200
    except Exception as ex:
        db.session.rollback()
        print("CANCEL ELECTION ERROR:", ex)
        return jsonify({"error": "Failed to cancel election."}), 500


# ─── Turnout ──────────────────────────────────────────────────────────────────

@election_bp.route("/<int:eid>/turnout", methods=["GET"])
@jwt_required()
def election_turnout(eid):
    try:
        if not is_admin():
            return jsonify({"error": "Admin access required."}), 403
        election = Election.query.get_or_404(eid)
        total_students = Student.query.filter_by(is_registered=True).count()
        votes_cast = Vote.query.filter_by(election_id=eid).count()
        percentage = round((votes_cast / total_students * 100), 1) if total_students > 0 else 0.0
        return jsonify({
            "election_id": eid,
            "total_registered_students": total_students,
            "votes_cast": votes_cast,
            "turnout_percentage": percentage,
            "results": tally(election),
        }), 200
    except Exception as ex:
        print("TURNOUT ERROR:", ex)
        return jsonify({"error": "Failed to load turnout."}), 500


# ─── Check Already Voted ──────────────────────────────────────────────────────

@election_bp.route("/<int:eid>/check-voted", methods=["GET"])
@jwt_required()
def check_voted(eid):
    try:
        if is_admin():
            return jsonify({"voted": False}), 200

        # FIX: identity = str(student.id), look up by PK not email
        student = get_student()
        if not student:
            return jsonify({"error": "Student not found."}), 404

        existing_vote = Vote.query.filter_by(
            student_id=student.id,
            election_id=eid
        ).first()

        if existing_vote:
            candidate = Candidate.query.get(existing_vote.candidate_id)
            return jsonify({
                "voted": True,
                "candidate_name": candidate.name if candidate else None
            }), 200

        return jsonify({"voted": False}), 200

    except Exception as e:
        print("CHECK VOTED ERROR:", e)
        return jsonify({"error": "Failed to check vote status."}), 500


# ─── Cast Vote ────────────────────────────────────────────────────────────────

@election_bp.route("/<int:eid>/vote", methods=["POST"])
@jwt_required()
def cast_vote(eid):
    try:
        if is_admin():
            return jsonify({"error": "Admins cannot vote."}), 403

        # FIX: identity = str(student.id), look up by PK not email
        student = get_student()
        if not student:
            return jsonify({"error": "Student not found. Please log in again."}), 404

        # sync statuses first, then re-fetch election
        sync_all_statuses()
        election = Election.query.get_or_404(eid)

        if election.status != "ongoing":
            return jsonify({
                "error": f"This election is not currently accepting votes (status: {election.status})."
            }), 400

        existing_vote = Vote.query.filter_by(
            student_id=student.id,
            election_id=eid
        ).first()
        if existing_vote:
            return jsonify({"error": "You have already voted in this election."}), 400

        data = request.get_json()
        candidate_id = data.get("candidate_id")
        if not candidate_id:
            return jsonify({"error": "candidate_id is required."}), 400

        candidate = Candidate.query.filter_by(id=candidate_id, election_id=eid).first()
        if not candidate:
            return jsonify({"error": "Invalid candidate for this election."}), 404

        vote = Vote(
            student_id=student.id,
            election_id=eid,
            candidate_id=candidate.id
        )
        db.session.add(vote)
        db.session.commit()

        return jsonify({"message": "Vote cast successfully."}), 200

    except Exception as e:
        db.session.rollback()
        print("CAST VOTE ERROR:", e)
        return jsonify({"error": "Failed to cast vote."}), 500


# ─── Election Results ─────────────────────────────────────────────────────────

@election_bp.route("/<int:eid>/results", methods=["GET"])
@jwt_required()
def election_results(eid):
    try:
        election = Election.query.get_or_404(eid)

        # FIX: this endpoint used to have NO access check at all — any
        # logged-in student could call it directly (even via browser
        # DevTools) and see live vote counts while an election was still
        # "upcoming" or "ongoing". Now: admins can always see it (they need
        # this for turnout monitoring), students only once it has ended.
        if not is_admin() and election.status != "ended":
            return jsonify({"error": "Results are available once this election has ended."}), 403

        results = tally(election)
        return jsonify({
            "election": election.to_dict(),
            "results": results
        }), 200
    except Exception as e:
        print("RESULT ERROR:", e)
        return jsonify({"error": "Failed to load results."}), 500