from django.db import models

class People(models.Model):
    name = models.CharField(max_length=255)
    age = models.IntegerField()
    description = models.TextField(blank=True)

    # 15s scan video
    scan_video = models.FileField(upload_to="people_scans/", blank=True, null=True)

    # optional: later you can store a thumbnail / face image too
    face_image = models.ImageField(upload_to="faces/", blank=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.age})"

class DayBlock(models.Model):
    date = models.DateField()
    location = models.CharField(max_length=255, blank=True, default="")
    events = models.JSONField(default=list, blank=True)
    people = models.ManyToManyField(People, related_name="dayblocks", blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["date", "location"], name="uniq_dayblock_date_location")
        ]

    def __str__(self):
        return f"{self.date} @ {self.location or 'Unknown'}"

from django.utils.text import slugify
import os

def footage_upload_path(instance, filename):
    # instance.dayblock.date is the date you selected
    d = instance.dayblock.date
    loc = slugify(instance.dayblock.location or "unknown")
    cam = instance.camera or "cam"
    clip = slugify(instance.clip_id or "clip")

    # keep original extension
    ext = os.path.splitext(filename)[1].lower() or ".mp4"

    return f"footage/{d:%Y/%m/%d}/{loc}/{cam}/{clip}{ext}"


class IndividualVideo(models.Model):
    """
    Stores the uploaded file + queryable metadata.
    File is stored in MEDIA_ROOT (or S3 if you switch storages).
    """
    CAM_CHOICES = [
        ("cam1", "Cam 1"),
        ("cam2", "Cam 2"),
        ("cam3", "Cam 3"),
        ("cam4", "Cam 4"),
    ]

    dayblock = models.ForeignKey(DayBlock, on_delete=models.CASCADE, related_name="videos")

    # your frontend sends this (Location-YYYY-MM-DD-index)
    clip_id = models.CharField(max_length=255, unique=True)

    title = models.CharField(max_length=255, blank=True, default="")
    camera = models.CharField(max_length=16, choices=CAM_CHOICES)

    # optional timing fields (fill later when you extract metadata)
    start_time = models.TimeField(null=True, blank=True)  # e.g. 13:05:12
    end_time = models.TimeField(null=True, blank=True)

    # store the file itself
    video = models.FileField(upload_to=footage_upload_path)

    # extra stuff (duration, fps, resolution, etc)
    meta = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["camera"]),
            models.Index(fields=["created_at"]),
            # dayblock already indexed by date/location; this helps fast per-day queries
            models.Index(fields=["dayblock", "camera"]),
        ]

    def __str__(self):
        return f"{self.clip_id} ({self.camera})"


class Week(models.Model):
    week_id = models.CharField(max_length=64, unique=True)
    week_number = models.IntegerField(null=True, blank=True)

    start_date = models.DateField()
    end_date = models.DateField()

    days = models.ManyToManyField(DayBlock, related_name="weeks", blank=True)
    summary = models.TextField(blank=True, default="")

    def __str__(self):
        return f"{self.week_id} ({self.start_date} → {self.end_date})"
