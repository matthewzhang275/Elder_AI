# views.py (FULL FILE — copy/paste)

from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
from datetime import datetime

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files import File
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import DayBlock, IndividualVideo, People
from .recognizer_service import get_recognizer
from .twelvelabs_analyzer import TwelveLabsConfig, TwelveLabsVideoAnalyzer

def run_twelvelabs_on_processed_video(request, video_abs_url: str, clip_id: str):
    cfg = TwelveLabsConfig(
        api_key=settings.TWELVELABS_API_KEY,
        index_name="elder-ai-index",
    )
    analyzer = TwelveLabsVideoAnalyzer(cfg)
    result = analyzer.analyze_video_url(video_url=video_abs_url, video_id_hint=clip_id)
    return result
# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------
def _resolve_ffmpeg() -> str | None:
    """
    Returns an executable path for ffmpeg or None if not found.

    Priority:
      1) settings.FFMPEG_PATH
      2) env var FFMPEG_PATH
      3) PATH lookup ("ffmpeg")
    """
    ff = getattr(settings, "FFMPEG_PATH", None) or os.getenv("FFMPEG_PATH") or "ffmpeg"

    # If they provided an explicit path, validate it.
    if ff != "ffmpeg":
        return ff if os.path.exists(ff) else None

    # Otherwise look on PATH.
    return shutil.which("ffmpeg")


def _process_uploaded_video_to_processed_file(uploaded_file, clip_id: str) -> tuple[File, str, str]:
    """
    Takes request.FILES["video"] (UploadedFile), writes it to a temp input mp4,
    runs recognizer.process_video() to temp output mp4,
    returns:
      (django_file_handle_for_output_mp4, output_filename, output_temp_path)

    NOTE:
      - Caller must close the returned File and delete output_temp_path after saving.
    """
    recognizer = get_recognizer()

    # temp input path
    in_tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
    in_path = in_tmp.name
    in_tmp.close()

    # temp output path
    out_tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
    out_path = out_tmp.name
    out_tmp.close()

    try:
        # Write upload -> temp input
        with open(in_path, "wb") as f:
            for chunk in uploaded_file.chunks():
                f.write(chunk)

        # Process -> temp output (draw boxes + names)
        recognizer.process_video(
            in_path,
            output_path=out_path,
            show_preview=False,
        )

        # Wrap output as Django File
        out_name = f"{clip_id}_processed.mp4" if clip_id else "processed.mp4"
        django_file = File(open(out_path, "rb"))
        return django_file, out_name, out_path

    finally:
        # Always delete input temp
        try:
            os.remove(in_path)
        except OSError:
            pass


# ---------------------------------------------------------
# Health
# ---------------------------------------------------------
def healthcheck(request):
    return JsonResponse({"ok": True})


# ---------------------------------------------------------
# People
# ---------------------------------------------------------
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

    # 1) Save the person + uploaded video to disk
    person = People.objects.create(
        name=name,
        description=description,
        age=age,
        scan_video=scan_video,
    )

    # 2) Register this person into the persistent DB using the saved file path
    recognizer = get_recognizer()

    # tune these as you want
    frame_interval = 10
    max_frames = 30

    results = recognizer.register_person_from_video(
        video_path=person.scan_video.path,
        name=person.name,
        frame_interval=frame_interval,
        max_frames=max_frames,
    )

    return JsonResponse(
        {
            "ok": True,
            "person": {
                "id": person.id,
                "name": person.name,
                "age": person.age,
                "description": person.description,
                "scan_video": person.scan_video.url if person.scan_video else None,
                "face_image": person.face_image.url if getattr(person, "face_image", None) else None,
            },
            "register": results,
            "face_db": str(getattr(person, "scan_video", None) and recognizer.data_file),
        }
    )


def _ensure_face_thumbnail(person: People) -> None:
    """
    If person.face_image is missing and person.scan_video exists,
    generate a jpg thumbnail from ~middle of the scan video and save it.

    Requires: ffmpeg installed and scan_video stored locally (MEDIA_ROOT).
    """
    if person.face_image:
        return
    if not person.scan_video:
        return

    ffmpeg = _resolve_ffmpeg()
    if not ffmpeg:
        return

    try:
        video_path = person.scan_video.path
    except Exception:
        return

    if not video_path or not os.path.exists(video_path):
        return

    ts = 1.0
    try:
        import cv2

        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 0
        frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
        cap.release()
        if fps > 0 and frame_count > 0:
            ts = max(0.5, (frame_count / fps) * 0.5)
    except Exception:
        ts = 1.0

    cmd = [
        ffmpeg,
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        str(ts),
        "-i",
        video_path,
        "-frames:v",
        "1",
        "-q:v",
        "2",
        "-f",
        "image2pipe",
        "-vcodec",
        "mjpeg",
        "pipe:1",
    ]

    try:
        jpg_bytes = subprocess.check_output(cmd, stderr=subprocess.STDOUT)
    except Exception:
        return

    if not jpg_bytes or len(jpg_bytes) < 2000:
        return

    fname = f"person_{person.id}_thumb.jpg"
    person.face_image.save(fname, ContentFile(jpg_bytes), save=True)


@csrf_exempt
@require_http_methods(["GET"])
def list_people(request):
    people = People.objects.all().order_by("-id")

    out = []
    for p in people:
        _ensure_face_thumbnail(p)

        thumb_rel = p.face_image.url if p.face_image else None
        thumb_abs = request.build_absolute_uri(thumb_rel) if thumb_rel else None

        out.append(
            {
                "id": p.id,
                "name": p.name,
                "age": p.age,
                "description": p.description,
                "thumb_url": thumb_abs,
            }
        )

    return JsonResponse({"ok": True, "people": out})


# ---------------------------------------------------------
# Footage Upload + Query
# ---------------------------------------------------------
@transaction.atomic
def store_uploaded_video(*, date, location, camera, clip_id, title, file_obj, meta=None) -> IndividualVideo:
    """
    Stores ONLY the PROCESSED video (file_obj) into IndividualVideo.video.
    If the clip_id already exists, replaces the previous stored file (deletes it first).
    """
    day, _ = DayBlock.objects.get_or_create(date=date, location=location)

    obj, _created = IndividualVideo.objects.get_or_create(clip_id=clip_id)

    # update metadata fields
    obj.dayblock = day
    obj.camera = camera
    obj.title = title or ""
    obj.meta = meta or {}

    # Replace existing processed file cleanly
    if obj.video:
        try:
            obj.video.delete(save=False)
        except Exception:
            pass

    # Save processed mp4 into obj.video
    # file_obj is a Django File (already opened)
    obj.video.save(getattr(file_obj, "name", f"{clip_id}_processed.mp4"), file_obj, save=True)

    return obj


@csrf_exempt
@require_http_methods(["POST"])
def upload_footage(request):
    """
    Uploads a raw video, processes it immediately (bounding boxes + names),
    stores ONLY the processed video in IndividualVideo.video.
    """
    date_str = request.POST.get("date", "")
    location = request.POST.get("location", "")
    camera = request.POST.get("camera", "")
    clip_id = request.POST.get("clip_id", "")
    title = request.POST.get("title", "")
    f = request.FILES.get("video")

    print(
        "[upload_footage] got:",
        {
            "date_str": date_str,
            "location": location,
            "camera": camera,
            "clip_id": clip_id,
            "title": title,
            "file_name": getattr(f, "name", None),
        },
    )

    if not (date_str and location and camera and clip_id and f):
        return JsonResponse({"ok": False, "error": "Missing required fields."}, status=400)

    try:
        date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return JsonResponse({"ok": False, "error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

    meta_raw = request.POST.get("meta", "")
    meta = {}
    if meta_raw:
        try:
            meta = json.loads(meta_raw)
        except Exception:
            meta = {}

    # ---- PROCESS FIRST (temp files), THEN STORE ONLY PROCESSED ----
    processed_file = None
    out_temp_path = None
    try:
        processed_file, out_name, out_temp_path = _process_uploaded_video_to_processed_file(f, clip_id=clip_id)

        # Make sure the saved name is stable (not the temp filename)
        processed_file.name = out_name

        obj = store_uploaded_video(
            date=date,
            location=location,
            camera=camera,
            clip_id=clip_id,
            title=title,
            file_obj=processed_file,  # ✅ processed video only
            meta=meta,
        )

    finally:
        # close open handle
        if processed_file is not None:
            try:
                processed_file.close()
            except Exception:
                pass

        # delete processed temp output
        if out_temp_path:
            try:
                os.remove(out_temp_path)
            except OSError:
                pass

    return JsonResponse(
        {
            "ok": True,
            "id": obj.id,
            "clip_id": obj.clip_id,
            "video_url": obj.video.url,  # ✅ now points to processed mp4
            "date": date_str,
            "location": location,
            "camera": camera,
            "title": obj.title,
        }
    )


# ---------------------------------------------------------
# Footage Thumbnail (ffmpeg) + list endpoint
# ---------------------------------------------------------
def _thumb_url(request, video_id: int) -> str:
    return request.build_absolute_uri(reverse("footage_thumbnail", args=[video_id]))


@csrf_exempt
@require_http_methods(["GET"])
def footage_thumbnail(request, video_id: int):
    """
    GET /api/footage/thumb/<id>/
    Returns image/jpeg extracted with ffmpeg.
    """
    v = get_object_or_404(IndividualVideo.objects.select_related("dayblock"), id=video_id)

    if not v.video:
        return HttpResponse("Video missing", status=404)

    ffmpeg = _resolve_ffmpeg()
    if not ffmpeg:
        print("[thumb] ❌ ffmpeg not found. Install it or set settings.FFMPEG_PATH / env FFMPEG_PATH.")
        return HttpResponse("ffmpeg not found (install it or set FFMPEG_PATH)", status=500)

    try:
        video_path = v.video.path
    except Exception:
        print("[thumb] ❌ no local path for video_id:", video_id, "name:", getattr(v.video, "name", None))
        return HttpResponse("Video not available on local storage", status=404)

    if not video_path or not os.path.exists(video_path):
        print("[thumb] ❌ file missing:", video_path)
        return HttpResponse("Video file missing", status=404)

    ts = 1.0
    try:
        import cv2

        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 0
        frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
        cap.release()
        if fps > 0 and frame_count > 0:
            ts = max(0.5, (frame_count / fps) * 0.5)
    except Exception:
        ts = 1.0

    cmd = [
        ffmpeg,
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        str(ts),
        "-i",
        video_path,
        "-frames:v",
        "1",
        "-q:v",
        "2",
        "-f",
        "image2pipe",
        "-vcodec",
        "mjpeg",
        "pipe:1",
    ]

    try:
        jpg_bytes = subprocess.check_output(cmd, stderr=subprocess.STDOUT)
    except FileNotFoundError as e:
        print("[thumb] ❌ ffmpeg FileNotFoundError:", repr(e), "ffmpeg=", ffmpeg)
        return HttpResponse("ffmpeg executable not found", status=500)
    except subprocess.CalledProcessError as e:
        print("[thumb] ❌ ffmpeg failed:", e.output.decode("utf-8", "ignore")[:500])
        return HttpResponse("Thumbnail extraction failed", status=500)
    except Exception as e:
        print("[thumb] ❌ exception:", repr(e))
        return HttpResponse("Thumbnail extraction failed", status=500)

    if not jpg_bytes or len(jpg_bytes) < 1500:
        print("[thumb] ❌ thumbnail empty/small:", len(jpg_bytes) if jpg_bytes else 0)
        return HttpResponse("Thumbnail empty", status=500)

    resp = HttpResponse(jpg_bytes, content_type="image/jpeg")
    resp["Cache-Control"] = "public, max-age=3600"
    return resp


@csrf_exempt
@require_http_methods(["GET"])
def get_all_individual_videos(request):
    """
    GET /api/footage/all/?date=YYYY-MM-DD&location=Some%20Place&placement=0
    """
    date_str = (request.GET.get("date") or "").strip()
    location = (request.GET.get("location") or "").strip()
    placement_raw = (request.GET.get("placement") or "0").strip()

    print(
        "[footage] raw query params:",
        {"date": date_str, "location": location, "placement": placement_raw},
    )

    if not date_str or not location:
        print("[footage] ❌ missing date or location")
        return JsonResponse({"ok": False, "error": "Missing required query params: date, location"}, status=400)

    try:
        date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        print("[footage] ❌ invalid date format:", date_str)
        return JsonResponse({"ok": False, "error": "Invalid date. Use YYYY-MM-DD"}, status=400)

    try:
        placement = int(placement_raw)
        if placement < 0:
            placement = 0
    except ValueError:
        placement = 0

    PAGE_SIZE = 4
    offset = placement * PAGE_SIZE
    limit = offset + PAGE_SIZE

    print(
        "[footage] parsed params:",
        {
            "date": date.isoformat(),
            "location": location,
            "placement": placement,
            "offset": offset,
            "limit": limit,
        },
    )

    qs = (
        IndividualVideo.objects.filter(dayblock__date=date, dayblock__location=location)
        .select_related("dayblock")
        .order_by("camera", "id")
    )

    total = qs.count()
    print("[footage] total matching videos:", total)

    page = list(qs[offset:limit])
    print("[footage] returning clip_ids:", [v.clip_id for v in page])

    videos_out = []
    for v in page:
        video_rel = v.video.url if v.video else None
        video_abs = request.build_absolute_uri(video_rel) if video_rel else None

        videos_out.append(
            {
                "id": v.id,
                "clip_id": v.clip_id,
                "title": v.title,
                "camera": v.camera,
                "date": v.dayblock.date.isoformat(),
                "location": v.dayblock.location,
                "video_url": video_abs,
                "thumb_url": _thumb_url(request, v.id),
                "meta": v.meta or {},
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }
        )

    return JsonResponse(
        {
            "ok": True,
            "debug": {
                "filters": {"date": date_str, "location": location},
                "placement": placement,
                "page_size": PAGE_SIZE,
                "offset": offset,
                "limit": limit,
                "returned_count": len(videos_out),
                "total_matching": total,
                "returned_clip_ids": [v["clip_id"] for v in videos_out],
            },
            "date": date_str,
            "location": location,
            "placement": placement,
            "page_size": PAGE_SIZE,
            "total": total,
            "has_more": (offset + PAGE_SIZE) < total,
            "videos": videos_out,
        }
    )
