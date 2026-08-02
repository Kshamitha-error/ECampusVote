"""
fix_images.py  —  Run this ONCE from your backend folder.

It finds all candidate photo/logo URLs that contain 'localhost' or the wrong IP
and rewrites them to your current laptop IP so they load on all devices.

Usage:
  1. Change NEW_BASE_URL below to your current IP (run `ipconfig` to find it)
  2. Run:  python fix_images.py
"""

import sys, os, re

# ── CHANGE THIS to your current WiFi IP (run `ipconfig`) ─────────────────────
NEW_BASE_URL = "https://manipulatedly-nonvolcanic-franco.ngrok-free.dev"
# ─────────────────────────────────────────────────────────────────────────────

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import create_app
from models.models import Candidate
from extensions import db

app = create_app()

# Patterns that should be replaced — localhost variants + any 192.168.x.x old IPs
BAD_PATTERNS = [
    r"http://localhost:\d+",
    r"http://127\.0\.0\.1:\d+",
    r"http://192\.168\.\d+\.\d+:\d+",
]

def fix_url(url):
    if not url:
        return url
    for pattern in BAD_PATTERNS:
        # Replace the host:port portion but keep the path (/uploads/xxx.jpg)
        match = re.match(pattern, url)
        if match:
            path = url[len(match.group(0)):]   # e.g. /uploads/abc123.jpg
            return NEW_BASE_URL + path
    return url  # already a good URL — leave it alone

with app.app_context():
    candidates = Candidate.query.all()
    fixed = 0
    for c in candidates:
        new_photo  = fix_url(c.photo)
        new_logo   = fix_url(c.logo)

        if new_photo != c.photo or new_logo != c.logo:
            print(f"Fixing candidate id={c.id} name='{c.name}'")
            if new_photo != c.photo:
                print(f"  photo:  {c.photo}")
                print(f"       -> {new_photo}")
                c.photo = new_photo
            if new_logo != c.logo:
                print(f"  logo:   {c.logo}")
                print(f"       -> {new_logo}")
                c.logo = new_logo
            fixed += 1

    if fixed:
        db.session.commit()
        print(f"\nDone — fixed {fixed} candidate(s).")
    else:
        print("No broken URLs found — all images already look good!")