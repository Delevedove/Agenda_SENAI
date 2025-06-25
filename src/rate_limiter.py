from time import time
from functools import wraps
from collections import defaultdict
from flask import request, jsonify


_rate_limit_store = defaultdict(lambda: {'count': 0, 'reset': 0})


def _check_limit(key: str, limit: int, window: int) -> bool:
    record = _rate_limit_store[key]
    now = time()
    if now > record['reset']:
        record['count'] = 0
        record['reset'] = now + window
    record['count'] += 1
    return record['count'] <= limit


def rate_limit(limit: int = 10, window: int = 60):
    """Simple decorator to limit requests per IP within a time window."""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            key = f"{request.remote_addr}:{func.__name__}"
            if not _check_limit(key, limit, window):
                return jsonify({'erro': 'Limite de requisi\u00e7\u00f5es excedido'}), 429
            return func(*args, **kwargs)

        return wrapper

    return decorator
