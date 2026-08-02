from datetime import datetime
from extensions import db


class Student(db.Model):
    __tablename__ = "students"
    id            = db.Column(db.Integer, primary_key=True)
    email         = db.Column(db.String(255), unique=True, nullable=False)
    roll_no       = db.Column(db.String(50),  nullable=False)
    name          = db.Column(db.String(255), nullable=True)
    branch        = db.Column(db.String(100), nullable=True)   # NEW
    year          = db.Column(db.Integer,     nullable=True)    # NEW: 1/2/3/4
    password_hash = db.Column(db.String(255), nullable=True)
    is_registered = db.Column(db.Boolean,     default=False)
    created_at    = db.Column(db.DateTime,    default=datetime.now)

    votes         = db.relationship("Vote",         backref="student", lazy=True)
    notifications = db.relationship("Notification", backref="student", lazy=True)

    def to_dict(self):
        return {
            "id":            self.id,
            "email":         self.email,
            "roll_no":       self.roll_no,
            "name":          self.name,
            "branch":        self.branch,
            "year":          self.year,
            "is_registered": self.is_registered,
        }


class Admin(db.Model):
    __tablename__ = "admins"
    id            = db.Column(db.Integer, primary_key=True)
    email         = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at    = db.Column(db.DateTime,    default=datetime.now)


class Election(db.Model):
    __tablename__ = "elections"
    id            = db.Column(db.Integer,  primary_key=True)
    title         = db.Column(db.String(255), nullable=False)
    description   = db.Column(db.Text,       nullable=True)
    start_time    = db.Column(db.DateTime,   nullable=False)
    end_time      = db.Column(db.DateTime,   nullable=False)
    status        = db.Column(db.String(20), default="upcoming")  # upcoming/ongoing/ended/cancelled
    created_at    = db.Column(db.DateTime,   default=datetime.now)

    candidates    = db.relationship("Candidate",    backref="election", lazy=True, cascade="all, delete-orphan")
    votes         = db.relationship("Vote",         backref="election", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id":              self.id,
            "title":           self.title,
            "description":     self.description,
            "start_time":      self.start_time.strftime("%Y-%m-%dT%H:%M") if self.start_time else None,
            "end_time":        self.end_time.strftime("%Y-%m-%dT%H:%M")   if self.end_time   else None,
            "status":          self.status,
            "candidate_count": len(self.candidates),
            "vote_count":      len(self.votes),
        }


class Candidate(db.Model):
    __tablename__ = "candidates"
    id            = db.Column(db.Integer, primary_key=True)
    election_id   = db.Column(db.Integer, db.ForeignKey("elections.id"), nullable=False)
    name          = db.Column(db.String(255), nullable=False)
    branch        = db.Column(db.String(100), nullable=True)
    year          = db.Column(db.String(10),  nullable=True)
    photo_url     = db.Column(db.String(500), nullable=True)
    symbol_url    = db.Column(db.String(500), nullable=True)
    manifesto     = db.Column(db.Text,        nullable=True)
    achievements  = db.Column(db.Text,        nullable=True)

    votes         = db.relationship("Vote", backref="candidate", lazy=True)

    def to_dict(self):
        return {
            "id":           self.id,
            "election_id":  self.election_id,
            "name":         self.name,
            "branch":       self.branch,
            "year":         self.year,
            "photo_url":    self.photo_url,
            "logo_url":     self.symbol_url,
            "symbol_url":   self.symbol_url,
            "manifesto":    self.manifesto,
            "achievements": self.achievements,
            "vote_count":   len(self.votes),
        }


class Vote(db.Model):
    __tablename__  = "votes"
    __table_args__ = (db.UniqueConstraint("student_id", "election_id", name="one_vote_per_election"),)
    id             = db.Column(db.Integer, primary_key=True)
    student_id     = db.Column(db.Integer, db.ForeignKey("students.id"),   nullable=False)
    election_id    = db.Column(db.Integer, db.ForeignKey("elections.id"),  nullable=False)
    candidate_id   = db.Column(db.Integer, db.ForeignKey("candidates.id"), nullable=False)
    voted_at       = db.Column(db.DateTime, default=datetime.now)


class Notification(db.Model):
    __tablename__ = "notifications"
    id            = db.Column(db.Integer, primary_key=True)
    student_id    = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    title         = db.Column(db.String(255), nullable=False)
    message       = db.Column(db.Text,        nullable=False)
    is_read       = db.Column(db.Boolean,     default=False)
    created_at    = db.Column(db.DateTime,    default=datetime.now)

    def to_dict(self):
        return {
            "id":         self.id,
            "student_id": self.student_id,
            "title":      self.title,
            "message":    self.message,
            "is_read":    self.is_read,
            "created_at": self.created_at.strftime("%Y-%m-%dT%H:%M:%S") if self.created_at else None,
        }