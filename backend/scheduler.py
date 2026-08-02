from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta


def start_scheduler(app):
    scheduler = BackgroundScheduler()

    scheduler.add_job(
        lambda: _check(app),
        "interval",
        minutes=1,
        id="election_checker",
        replace_existing=True
    )

    scheduler.start()

    return scheduler


def _check(app):

    with app.app_context():

        from models.models import (
            Election,
            Student,
            Notification
        )

        from extensions import db

        from utils.helpers import (
            send_election_notification_email,
            send_result_email
        )

        now = datetime.now()

        # ─────────────────────────────────────
        # AUTO START ELECTION
        # ─────────────────────────────────────
        upcoming = Election.query.filter(
            Election.status == "upcoming",
            Election.start_time <= now
        ).all()

        for e in upcoming:

            e.status = "ongoing"

            db.session.commit()

            _broadcast(
                app,
                f"Election Live: {e.title}",
                f"'{e.title}' is now LIVE! "
                f"Vote before "
                f"{e.end_time.strftime('%d %b %Y %H:%M')}."
            )

        # ─────────────────────────────────────
        # AUTO END ELECTION
        # ─────────────────────────────────────
        ended = Election.query.filter(
            Election.status == "ongoing",
            Election.end_time <= now
        ).all()

        for e in ended:

            e.status = "ended"

            db.session.commit()

            results = sorted(
                [
                    {
                        "name": c.name,
                        "votes": len(c.votes),
                        "branch": c.branch or "",
                        "year": str(c.year or "")
                    }
                    for c in e.candidates
                ],
                key=lambda x: x["votes"],
                reverse=True
            )

            winner = results[0] if results else None

            students = Student.query.filter_by(
                is_registered=True
            ).all()

            # ADD ALL NOTIFICATIONS FIRST
            for s in students:

                msg = (
                    f"Winner of '{e.title}': "
                    f"{winner['name']} with "
                    f"{winner['votes']} votes."
                    if winner
                    else f"'{e.title}' ended."
                )

                already = Notification.query.filter_by(
                    student_id=s.id,
                    title=f"Results: {e.title}"
                ).first()

                if already:
                    continue

                db.session.add(
                    Notification(
                        student_id=s.id,
                        title=f"Results: {e.title}",
                        message=msg
                    )
                )

            # SINGLE COMMIT
            db.session.commit()

            # EMAILS SEPARATELY
            if winner:

                for s in students:

                    try:

                        send_result_email(
                            s.email,
                            s.name or "",
                            e.title,
                            winner["name"],
                            winner["branch"],
                            winner["year"]
                        )

                    except Exception as ex:

                        print(
                            f"[RESULT EMAIL ERROR] "
                            f"{s.email}: {ex}"
                        )

        # ─────────────────────────────────────
        # UPCOMING REMINDER
        # ─────────────────────────────────────
        soon = now + timedelta(hours=1)

        reminders = Election.query.filter(
            Election.status == "upcoming",
            Election.start_time >= now,
            Election.start_time <= soon
        ).all()

        for e in reminders:

            _broadcast(
                app,
                f"Reminder: {e.title}",
                f"The election '{e.title}' "
                f"starts at "
                f"{e.start_time.strftime('%d %b %Y %H:%M')}."
            )


def _broadcast(app, title, message):

    with app.app_context():

        from models.models import (
            Student,
            Notification
        )

        from extensions import db

        from utils.helpers import (
            send_election_notification_email
        )

        students = Student.query.filter_by(
            is_registered=True
        ).all()

        # ADD NOTIFICATIONS
        for s in students:

            already = Notification.query.filter_by(
                student_id=s.id,
                title=title
            ).first()

            if already:
                continue

            db.session.add(
                Notification(
                    student_id=s.id,
                    title=title,
                    message=message
                )
            )

        # SINGLE COMMIT
        db.session.commit()

        # EMAILS SEPARATELY
        for s in students:

            try:

                send_election_notification_email(
                    s.email,
                    s.name or "",
                    title,
                    message
                )

            except Exception as ex:

                print(
                    f"[EMAIL ERROR] "
                    f"{s.email}: {ex}"
                )