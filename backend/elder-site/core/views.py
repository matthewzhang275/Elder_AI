from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import People


def healthcheck(request):
    return JsonResponse({"ok": True})


@csrf_exempt  # local dev convenience (since you're allowing everything anyway)
@require_http_methods(["POST"])
def create_person(request):
    """
    Expects multipart/form-data:
      - face: file
      - description: string (optional)
      - age: int
      - name: string
    """

    face = request.FILES.get("face")
    name = (request.POST.get("name") or "").strip()
    description = (request.POST.get("description") or "").strip()
    age_raw = request.POST.get("age")

    if not face:
        return JsonResponse({"ok": False, "error": "Missing 'face' file"}, status=400)
    if not name:
        return JsonResponse({"ok": False, "error": "Missing 'name'"}, status=400)
    if age_raw is None:
        return JsonResponse({"ok": False, "error": "Missing 'age'"}, status=400)

    try:
        age = int(age_raw)
    except ValueError:
        return JsonResponse({"ok": False, "error": "'age' must be an integer"}, status=400)

    person = People.objects.create(
        face=face,
        name=name,
        description=description,
        age=age,
    )

    return JsonResponse({
        "ok": True,
        "person": {
            "id": person.id,
            "name": person.name,
            "age": person.age,
            "description": person.description,
            "face": person.face.url,   # e.g. /media/faces/xxx.jpg
        }
    })

