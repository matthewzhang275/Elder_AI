from threading import Lock
from django.conf import settings

from .scan import PersonRecognizer  # import your class

_lock = Lock()
_recognizer = None

def get_recognizer() -> PersonRecognizer:
    global _recognizer
    if _recognizer is None:
        with _lock:
            if _recognizer is None:
                # ensure folder exists
                settings.FACE_DB_DIR.mkdir(parents=True, exist_ok=True)

                _recognizer = PersonRecognizer(
                    threshold=0.6,
                    model_name="VGG-Face",
                    data_file=str(settings.FACE_DB_PATH),
                )
    return _recognizer
