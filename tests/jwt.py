import base64
import json
import time

class ExpiredSignatureError(Exception):
    pass

class InvalidTokenError(Exception):
    pass

def encode(payload, key, algorithm='HS256'):
    header = {'alg': algorithm, 'typ': 'JWT'}
    def b64(data):
        return base64.urlsafe_b64encode(json.dumps(data).encode()).rstrip(b'=').decode()
    segments = [b64(header), b64(payload)]
    signature = base64.urlsafe_b64encode((segments[0] + '.' + segments[1] + key).encode()).rstrip(b'=').decode()
    segments.append(signature)
    return '.'.join(segments)

def decode(token, key, algorithms=None):
    try:
        header_b64, payload_b64, signature = token.split('.')
    except ValueError:
        raise InvalidTokenError('Token structure')
    def b64decode(data):
        padding = '=' * (-len(data) % 4)
        return json.loads(base64.urlsafe_b64decode(data + padding).decode())
    payload = b64decode(payload_b64)
    exp = payload.get('exp')
    if exp and exp < time.time():
        raise ExpiredSignatureError('Token expired')
    return payload
