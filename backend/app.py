import os
from datetime import timedelta
from flask import Flask, send_from_directory, request, Response
from dotenv import load_dotenv
from extensions import db, mail, jwt, cors, limiter

load_dotenv(override=True)


def create_app():
    app = Flask(__name__)

    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///voting.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    secret = os.getenv("JWT_SECRET_KEY", "")
    if not secret:
        # FIX: no more hardcoded fallback secret. If missing, generate one for
        # this run only and warn loudly — tokens won't survive a restart, but
        # that's safer than shipping a secret every clone of this repo shares.
        import secrets as _secrets
        secret = _secrets.token_hex(32)
        print("[WARN] JWT_SECRET_KEY not set in .env — using a random one-off key. "
              "Set JWT_SECRET_KEY in backend/.env to keep sessions valid across restarts.")
    app.config["JWT_SECRET_KEY"] = secret if len(secret) >= 32 else secret.ljust(32, "0")

    # FIX: tokens used to never expire (JWT_ACCESS_TOKEN_EXPIRES = False).
    # A stolen/leaked token would have worked forever. 12 hours is generous
    # for a voting session but still bounds the blast radius.
    jwt_hours = int(os.getenv("JWT_EXPIRES_HOURS", "12"))
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=jwt_hours)

    app.config["MAIL_SERVER"]   = os.getenv("MAIL_SERVER",   "smtp.gmail.com")
    app.config["MAIL_PORT"]     = int(os.getenv("MAIL_PORT", 587))
    app.config["MAIL_USE_TLS"]  = os.getenv("MAIL_USE_TLS",  "True") == "True"
    app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME", "")
    app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD", "")

    upload_folder = os.path.join(os.path.dirname(__file__), "uploads")
    os.makedirs(upload_folder, exist_ok=True)
    app.config["UPLOAD_FOLDER"] = upload_folder
    app.config["CORS_HEADERS"]  = "Content-Type"

    # FIX: CORS origin is now configurable via .env (CORS_ALLOWED_ORIGINS,
    # comma-separated). Defaults to "*" so it still works out of the box for
    # ngrok/college-lab use, but can be locked down once you have a fixed
    # frontend URL — just set CORS_ALLOWED_ORIGINS=https://your-frontend-url
    origins_env = os.getenv("CORS_ALLOWED_ORIGINS", "*").strip()
    ALLOWED_ORIGINS = "*" if origins_env == "*" else [o.strip() for o in origins_env.split(",") if o.strip()]

    db.init_app(app)
    mail.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/*": {"origins": ALLOWED_ORIGINS}})
    limiter.init_app(app)

    ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    ALLOWED_HEADERS = "Content-Type, Authorization, ngrok-skip-browser-warning"

    def _origin_header():
        if ALLOWED_ORIGINS == "*":
            return "*"
        req_origin = request.headers.get("Origin", "")
        return req_origin if req_origin in ALLOWED_ORIGINS else ALLOWED_ORIGINS[0]

    @app.before_request
    def handle_before():
        if request.method == "OPTIONS":
            r = Response()
            r.headers["Access-Control-Allow-Origin"]  = _origin_header()
            r.headers["Access-Control-Allow-Headers"] = ALLOWED_HEADERS
            r.headers["Access-Control-Allow-Methods"] = ALLOWED_METHODS
            return r, 200

    @app.after_request
    def add_headers(response):
        response.headers["ngrok-skip-browser-warning"]   = "true"
        response.headers["Access-Control-Allow-Origin"]  = _origin_header()
        response.headers["Access-Control-Allow-Headers"] = ALLOWED_HEADERS
        response.headers["Access-Control-Allow-Methods"] = ALLOWED_METHODS
        return response

    from routes.student_auth  import student_auth_bp
    from routes.admin_auth    import admin_auth_bp
    from routes.elections     import election_bp
    from routes.notifications import notification_bp
    from routes.uploads       import upload_bp

    app.register_blueprint(student_auth_bp)
    app.register_blueprint(admin_auth_bp)
    app.register_blueprint(election_bp)
    app.register_blueprint(notification_bp)
    app.register_blueprint(upload_bp)

    @app.route("/uploads/<path:filename>")
    def uploaded_file(filename):
        response = send_from_directory(app.config["UPLOAD_FOLDER"], filename)
        response.headers["ngrok-skip-browser-warning"] = "true"
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"]  = "no-cache"
        response.headers["Expires"] = "0"
        return response

    with app.app_context():
        db.create_all()
        _seed_admin()

    from scheduler import start_scheduler
    start_scheduler(app)

    return app


def _seed_admin():
    """
    FIX: this used to overwrite the admin's password EVERY time the server
    started (even after the admin had changed it), and printed the plaintext
    password to the console log every restart. Now it only creates the admin
    once, on first run. To intentionally reset the admin password later, set
    ADMIN_FORCE_RESET=True in .env for one restart, then remove it.
    """
    from models.models import Admin
    from utils.helpers import hash_password

    email    = os.getenv("ADMIN_EMAIL",    "admin@college.edu")
    password = os.getenv("ADMIN_PASSWORD", "")
    force_reset = os.getenv("ADMIN_FORCE_RESET", "False") == "True"

    if not email or not password:
        print("[SEED] ADMIN_EMAIL or ADMIN_PASSWORD missing from .env — skipping seed.")
        return

    existing = Admin.query.filter_by(email=email).first()

    if not existing:
        db.session.add(Admin(email=email, password_hash=hash_password(password)))
        db.session.commit()
        print(f"[SEED] Created initial admin account: {email}")
    elif force_reset:
        existing.password_hash = hash_password(password)
        db.session.commit()
        print(f"[SEED] ADMIN_FORCE_RESET was set — admin password reset for: {email}")
        print("[SEED] Remove ADMIN_FORCE_RESET from .env now so it doesn't reset again.")
    # else: admin already exists and no reset requested — leave it alone.


if __name__ == "__main__":
    app = create_app()
    # FIX: debug mode is now off by default. Debug mode exposes the Werkzeug
    # interactive debugger (arbitrary code execution) to anyone who can
    # trigger a 500 error — fine on your own laptop, dangerous the moment
    # this is reachable over ngrok/the internet. Set FLASK_DEBUG=True in
    # .env only while developing locally.
    debug_mode = os.getenv("FLASK_DEBUG", "False") == "True"
    app.run(debug=debug_mode, host="0.0.0.0", port=5000)