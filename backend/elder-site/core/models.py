from django.db import models


class People(models.Model):
    face = models.ImageField(upload_to="faces/")
    description = models.TextField(blank=True)
    age = models.IntegerField()
    name = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.name} ({self.age})"


class DayBlock(models.Model):
    """
    One day of timeline data:
      - date: which day this data is for
      - location: arbitrary string
      - events: JSON list of TimelineEvent objects
      - people: links directly to People rows that appear on that day
    """
    date = models.DateField(unique=True)
    location = models.CharField(max_length=255, blank=True, default="")
    events = models.JSONField(default=list, blank=True)

    people = models.ManyToManyField(People, related_name="dayblocks", blank=True)

    def __str__(self):
        return f"{self.date} @ {self.location or 'Unknown'}"

class Week(models.Model):
    """
    Week container:
      - week_id: label (like "2026-W02" or "week_1")
      - week_number: optional numeric index
      - start_date/end_date: inclusive
      - days: link to DayBlock rows
      - summary: "important stuff going on"
    """
    week_id = models.CharField(max_length=64, unique=True)
    week_number = models.IntegerField(null=True, blank=True)

    start_date = models.DateField()
    end_date = models.DateField()

    days = models.ManyToManyField(DayBlock, related_name="weeks", blank=True)
    summary = models.TextField(blank=True, default="")

    def __str__(self):
        return f"{self.week_id} ({self.start_date} → {self.end_date})"
