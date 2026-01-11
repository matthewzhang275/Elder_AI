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
    generate a jpg thumbnail from ~middle of the scan video and save it.
    """
    if person.face_image:
        return
    if not person.scan_video:
        return

    try:
        import cv2

        video_path = person.scan_video.path  # requires local storage
        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            cap.release()
            return

        # Try to seek to the middle of the video (or at least ~1s in)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0

        # If frame_count is known, go to middle; else go to 1 second.
        if frame_count and frame_count > 0:
            target_frame = int(frame_count * 0.5)
        else:
            target_frame = int(fps * 1.0)

        cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)

        ok, frame = cap.read()

        # Fallback: if that frame is bad/black, try a few other offsets
        if (not ok) or frame is None:
            for sec in (0.5, 1.0, 2.0, 3.0):
                cap.set(cv2.CAP_PROP_POS_MSEC, sec * 1000.0)
                ok, frame = cap.read()
                if ok and frame is not None:
                    break

        cap.release()

        if (not ok) or frame is None:
            return

        # Encode jpg
        ok2, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        if not ok2:
            return

        fname = f"person_{person.id}_thumb.jpg"
        person.face_image.save(fname, ContentFile(buf.tobytes()), save=True)

    except Exception:
        return
    
@csrf_exempt
@require_http_methods(["GET"])
def list_people(request):
    """
    Returns all people, with a thumbnail image URL taken from
    the first frame of the scan video (absolute URL).
    """
    people = People.objects.all().order_by("-id")

    out = []
    for p in people:
        _ensure_face_thumbnail(p)

        thumb_rel = p.face_image.url if p.face_image else None
        thumb_abs = request.build_absolute_uri(thumb_rel) if thumb_rel else None

        out.append({
            "id": p.id,
            "name": p.name,
            "age": p.age,
            "description": p.description,
            "thumb_url": thumb_abs,
        })

    return JsonResponse({
        "ok": True,
        "people": out,
    })
