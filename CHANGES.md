# What was fixed

## Security
- **JWT tokens now expire** (12 hours, configurable via `JWT_EXPIRES_HOURS` in `.env`). Previously they never expired at all.
- **Removed hardcoded JWT secret fallback** — if `JWT_SECRET_KEY` is missing from `.env`, the app now generates a random one-off key and warns loudly, instead of silently using a secret that ships with the code.
- **Rate limiting is now enabled.** Admin login, student login, OTP requests, and OTP verification are all capped (10–15 requests/minute) to stop brute-force attempts. It was fully disabled before.
- **OTP brute-force lockout** — after 5 wrong guesses, the OTP is invalidated and a new one must be requested.
- **Admin password is no longer reset on every server restart**, and the plaintext password is no longer printed to the console log. To intentionally reset it, set `ADMIN_FORCE_RESET=True` in `.env` for one restart.
- **Debug mode is off by default** (`FLASK_DEBUG=False` in `.env`) — the Flask interactive debugger allows arbitrary code execution and shouldn't be reachable over ngrok/the internet.
- **CORS origin is now configurable** (`CORS_ALLOWED_ORIGINS` in `.env`), defaults to `*` so nothing breaks today, but can be locked to your real frontend URL later.
- Replaced a bare `except:` in `check_password()` with specific exception handling.

## Vote-secrecy bug (the one we discussed)
- `GET /elections/<id>`, `GET /elections/`, `GET /elections/<id>/candidates`, and `GET /elections/<id>/results` used to include real vote counts in the JSON response for *any* logged-in student, even while an election was still upcoming/ongoing. The frontend never displayed this, but it was visible in the browser's Network tab. **Now vote counts are `null` for students until the election has actually ended**, and `/results` returns `403` for students on non-ended elections. Admins are unaffected — they can still see live counts for monitoring.

## Notifications
- **Fixed a silent failure that meant almost no admin-triggered notifications were ever actually sent.** `broadcast_bg()` started a background thread with no Flask app context, so every "New Election", "Election Started", and "Election Cancelled" notification (and its email) silently failed with `Working outside of application context` — invisible unless you were watching the server console. Only the scheduler's *automatic* start/end/reminder jobs worked, because those separately wrapped their own context correctly. This is now fixed everywhere.
- **Fixed a dedup bug** where two elections sharing the same title would suppress each other's notifications. Dedup now checks title + message (which includes the actual dates), not title alone.
- **The header notification bell badge now refreshes every 30 seconds** while a student is logged in. Before, it only fetched once at login and went stale.

## Profile page bug
- `StudentProfile.jsx` called a `setUser()` from `useAuth()` that didn't exist on the context — saving a new name updated the database but the header/dashboard kept showing the old name until logging out and back in. `AuthContext.jsx` now provides a working `setUser` that updates both React state and `localStorage`.

## Frontend / config cleanup
- `frontend/src/utils/api.js` had a hardcoded local IP with a leading-space typo (`" http://10.171.129.206:5000"`). It now reads `REACT_APP_API_BASE_URL` from `frontend/.env` — update one line in `.env` instead of editing code every time you switch networks or restart ngrok.

## Housekeeping
- Moved `fix_admin.py`, `CheckStudents.py`, `Fix_Image_Urls.py`, `seed_students.py` into `backend/dev_scripts/` — these are one-off debug/setup scripts, not part of the running app. They still work the same way, just run them as `python dev_scripts/<name>.py` from the `backend/` folder now.

## Please do this one manually
- The Gmail app password in `backend/.env` was shared in a chat conversation. It's gitignored so it never touched GitHub, but as a precaution, rotate it in Google Account → Security → App Passwords, then paste the new one into `.env`.

---

### What was intentionally left as-is
- SQLite as the database — fine for a class project / small college election; swapping to Postgres/MySQL is a bigger change and only worth it if you expect heavy concurrent load.
- `/uploads/<filename>` stays public with no login required — candidate photos are meant to be publicly visible (they're shown before login on some pages), so this isn't a real information leak like the vote-count one was.
- OTPs are still stored in memory (not a database). This is fine as long as you run the Flask app as a single process, which is how you're running it today (`python app.py` / one ngrok tunnel). If you ever deploy with multiple worker processes, this would need to move to the database — flagged in a code comment in `utils/helpers.py`.
