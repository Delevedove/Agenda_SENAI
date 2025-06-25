from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

__all__ = [
    "db",
    "RefreshToken",
]

from .refresh_token import RefreshToken
