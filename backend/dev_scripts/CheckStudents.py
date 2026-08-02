import sys
sys.path.insert(0, '.')
from app import create_app

app = create_app()
with app.app_context():
    from models.models import Student
    students = Student.query.all()
    print(f"\nTotal students in database: {len(students)}\n")
    print(f"{'Email':<40} {'Roll No':<20} {'Registered'}")
    print("-" * 70)
    for s in students:
        print(f"{s.email:<40} {s.roll_no:<20} {s.is_registered}")