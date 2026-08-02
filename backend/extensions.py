from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db      = SQLAlchemy()
mail    = Mail()
jwt     = JWTManager()
cors    = CORS()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per hour"],
    enabled=True
)