# -*- coding: utf-8 -*-
import bcrypt, random, string, re, os, smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# NOTE: this is an in-memory store. It resets on every server restart and
# will NOT work correctly if the app is ever run with more than one worker
# process (e.g. `gunicorn -w 4`) since each worker has its own memory. Fine
# for a single-process college deployment; if this ever needs to scale,
# move this into the database or Redis instead.
_otp_store = {}

MAX_OTP_ATTEMPTS = 5


def generate_otp():
    return "".join(random.choices(string.digits, k=6))


def set_otp(student):
    otp = generate_otp()
    _otp_store[student.id] = {
        "otp":      otp,
        "expires":  datetime.now() + timedelta(minutes=2),
        "attempts": 0,
    }
    return otp


store_otp = set_otp


def verify_otp(student, otp):
    record = _otp_store.get(student.id)
    if not record:
        return False, "OTP not found. Please request a new one."
    if datetime.now() > record["expires"]:
        _otp_store.pop(student.id, None)
        return False, "OTP has expired. Please request a new one."

    # FIX: brute-forcing a 6-digit OTP used to be unlimited. Now it locks
    # out after a handful of wrong guesses within the 2-minute window.
    if record["attempts"] >= MAX_OTP_ATTEMPTS:
        _otp_store.pop(student.id, None)
        return False, "Too many incorrect attempts. Please request a new OTP."

    if record["otp"] != otp:
        record["attempts"] += 1
        remaining = MAX_OTP_ATTEMPTS - record["attempts"]
        return False, f"Invalid OTP. {remaining} attempt(s) remaining."

    _otp_store.pop(student.id, None)
    return True, "OTP verified."


def validate_password_strength(password):
    if len(password) < 8 or len(password) > 12:
        return False, "Password must be 8-12 characters."
    if not re.search(r"[A-Z]", password): return False, "Must contain uppercase letter."
    if not re.search(r"[a-z]", password): return False, "Must contain lowercase letter."
    if not re.search(r"\d",    password): return False, "Must contain a number."
    if not re.search(r"[@$!%*?&_#]", password):
        return False, "Must contain special character (@$!%*?&_#)."
    return True, "Strong."


def hash_password(password):
    return bcrypt.hashpw(
        password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")


def check_password(plain, hashed):
    # FIX: was a bare `except:` that silently swallowed every possible
    # error (including real bugs like a corrupted hash). Now only the
    # errors we actually expect from bad/missing input are caught.
    if not plain or not hashed:
        return False
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError, AttributeError):
        return False


# ── Gmail SMTP ────────────────────────────────────────────────────────────────

def _send_email(to_email, to_name, subject, body_text):
    from dotenv import load_dotenv
    load_dotenv(override=True)

    # Strip ALL surrounding whitespace and quotes that .env might add
    mail_username = os.environ.get("MAIL_USERNAME", "").strip().strip('"').strip("'")
    mail_password = os.environ.get("MAIL_PASSWORD", "").strip().strip('"').strip("'")

    if not mail_username or not mail_password:
        print("[EMAIL ERROR] MAIL_USERNAME or MAIL_PASSWORD not set in .env")
        return

    if not to_email or "@" not in str(to_email):
        print(f"[EMAIL ERROR] Invalid recipient: '{to_email}'")
        return

    print(f"[EMAIL] Sending '{subject}' to {to_email} ...")
    try:
        msg = MIMEMultipart()
        msg["From"]    = f"eCampus Vote <{mail_username}>"
        msg["To"]      = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body_text, "plain", "utf-8"))

        with smtplib.SMTP("smtp.gmail.com", 587, timeout=20) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(mail_username, mail_password)
            server.sendmail(mail_username, to_email, msg.as_string())

        print(f"[EMAIL OK] → {to_email}")

    except smtplib.SMTPAuthenticationError:
        print("[EMAIL ERROR] Gmail auth failed — verify App Password has no quotes in .env")
    except smtplib.SMTPRecipientsRefused:
        print(f"[EMAIL ERROR] Recipient refused: {to_email}")
    except smtplib.SMTPException as e:
        print(f"[EMAIL SMTP ERROR] {e}")
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")


# ── Public helpers ────────────────────────────────────────────────────────────

def send_otp_email(to_email, name, otp):
    subject = "eCampus Vote - Your OTP"
    body = f"""Hello {name or 'Student'},

Your One-Time Password for eCampus Vote is:

  {otp}

Valid for 2 minutes. Do not share this with anyone.

- eCampus Vote Team"""
    _send_email(to_email, name, subject, body)


def send_result_email(to_email, student_name, election_title,
                      winner_name, branch, year):
    subject = f"Results: {election_title}"
    body = f"""Hello {student_name or 'Student'},

Results for '{election_title}' are out!

Winner : {winner_name}
Branch : {branch}
Year   : {year}

Thank you for participating.
- eCampus Vote Team"""
    _send_email(to_email, student_name, subject, body)


def send_election_notification_email(to_email, student_name, title, message):
    subject = f"eCampus Vote - {title}"
    body = f"""Hello {student_name or 'Student'},

{message}

- eCampus Vote Team"""
    _send_email(to_email, student_name, subject, body)