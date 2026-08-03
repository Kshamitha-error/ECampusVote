# -*- coding: utf-8 -*-
import bcrypt
import random
import string
import re
import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

# NOTE: this is an in-memory store. It resets on every server restart and
# will NOT work correctly if the app is ever run with more than one worker
# process (e.g. gunicorn -w 4) since each worker has its own memory. Fine
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
    # FIX: was a bare except: that silently swallowed every possible
    # error (including real bugs like a corrupted hash). Now only the
    # errors we actually expect from bad/missing input are caught.
    if not plain or not hashed:
        return False
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError, AttributeError):
        return False


# ── Brevo Email API ───────────────────────────────────────────────────────────

load_dotenv(override=True)


def _send_email(to_email, to_name, subject, body_text):
    api_key = os.environ.get("BREVO_API_KEY", "").strip()

    if not api_key:
        print("[EMAIL ERROR] BREVO_API_KEY not found in environment variables")
        return

    if not to_email or "@" not in str(to_email):
        print(f"[EMAIL ERROR] Invalid recipient: {to_email}")
        return

    sender_email = "ecampusvote23009@gmail.com"
    sender_name = "eCampus Vote"

    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json"
    }

    payload = {
        "sender": {
            "name": sender_name,
            "email": sender_email
        },
        "to": [
            {
                "email": to_email,
                "name": to_name or "Student"
            }
        ],
        "subject": subject,
        "textContent": body_text
    }

    print(f"[EMAIL] Sending '{subject}' to {to_email}...")

    try:
        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers=headers,
            json=payload,
            timeout=20
        )

        if response.status_code in (200, 201):
            print(f"[EMAIL OK] → {to_email}")
        else:
            print(f"[EMAIL ERROR] Status Code: {response.status_code}")
            print(response.text)

    except requests.exceptions.RequestException as e:
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