from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import transaction

from datetime import datetime
import json

from .models import People, DayBlock, IndividualVideo

def healthcheck(request):
    return JsonResponse({"ok": True})

@csrf_exempt
@require_http_methods(["POST"])
def create_person(request):
    scan_video = request.FILES.get("scan_video") or request.FILES.get("face")

    name = (request.POST.get("name") or "").strip()
    description = (request.POST.get("description") or "").strip()
    age_raw = request.POST.get("age")

    if not scan_video:
        return JsonResponse({"ok": False, "error": "Missing 'scan_video' file"}, status=400)
    if not name:
        return JsonResponse({"ok": False, "error": "Missing 'name'"}, status=400)
    if age_raw is None:
        return JsonResponse({"ok": False, "error": "Missing 'age'"}, status=400)

    try:
        age = int(age_raw)
    except ValueError:
        return JsonResponse({"ok": False, "error": "'age' must be an integer"}, status=400)

    person = People.objects.create(
        name=name,
        description=description,
        age=age,
        scan_video=scan_video,
    )

    return JsonResponse({
        "ok": True,
        "person": {
            "id": person.id,
            "name": person.name,
            "age": person.age,
            "description": person.description,
            "scan_video": person.scan_video.url if person.scan_video else None,
            "face_image": person.face_image.url if person.face_image else None,
        }
    })

@transaction.atomic
def store_uploaded_video(*, date, location, camera, clip_id, title, file_obj, meta=None) -> IndividualVideo:
    day, _ = DayBlock.objects.get_or_create(date=date, location=location)

    obj, _created = IndividualVideo.objects.update_or_create(
        clip_id=clip_id,
        defaults={
            "dayblock": day,
            "camera": camera,
            "title": title or "",
            "video": file_obj,
            "meta": meta or {},
        },
    )
    return obj

from django.core.files.base import ContentFile

@csrf_exempt
@require_http_methods(["POST"])
def upload_footage(request):
    date_str = request.POST.get("date", "")
    location = request.POST.get("location", "")
    camera = request.POST.get("camera", "")
    clip_id = request.POST.get("clip_id", "")
    title = request.POST.get("title", "")
    f = request.FILES.get("video")

    if not (date_str and location and camera and clip_id and f):
        return JsonResponse({"error": "Missing required fields."}, status=400)

    try:
        date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return JsonResponse({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

    meta_raw = request.POST.get("meta", "")
    meta = {}
    if meta_raw:
        try:
            meta = json.loads(meta_raw)
        except Exception:
            meta = {}

    obj = store_uploaded_video(
        date=date,
        location=location,
        camera=camera,
        clip_id=clip_id,
        title=title,
        file_obj=f,
        meta=meta,
    )

    return JsonResponse({
        "ok": True,
        "id": obj.id,
        "clip_id": obj.clip_id,
        "video_url": obj.video.url,
        "date": date_str,
        "location": location,
        "camera": camera,
        "title": obj.title,
    })

def _ensure_face_thumbnail(person: People) -> None:
    """
    If person.face_image is missing and person.scan_video exists,
    generate a jpg thumbnail from the FIRST frame and save it to face_image.
    """
    if person.face_image:
        return
    if not person.scan_video:
        return

    # Try OpenCV first (recommended)
    try:
        import cv2  # pip install opencv-python
        import numpy as np

        video_path = person.scan_video.path  # local MEDIA_ROOT storage required

        cap = cv2.VideoCapture(video_path)
        ok, frame = cap.read()  # first frame
        cap.release()

        if not ok or frame is None:
            return

        # frame is BGR -> encode jpg
        ok2, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        if not ok2:
            return

        jpg_bytes = buf.tobytes()
        fname = f"person_{person.id}_thumb.jpg"

        person.face_image.save(fname, ContentFile(jpg_bytes), save=True)
        return

    except Exception:
        # If OpenCV isn't installed or fails, just skip thumbnail generation
        return


@csrf_exempt
@require_http_methods(["GET"])
def list_people(request):
    """
    Returns all people, but instead of returning the scan video URL,
    returns a thumbnail image URL taken from the first frame of the scan video.
    """
    people = People.objects.all().order_by("-id")

    out = []
    for p in people:
        _ensure_face_thumbnail(p)

        out.append({
            "id": p.id,
            "name": p.name,
            "age": p.age,
            "description": p.description,
            "thumb_url": p.face_image.url if p.face_image else None,
        })

    return JsonResponse({"ok": True, "people": out})