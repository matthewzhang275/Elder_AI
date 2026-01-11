from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from twelvelabs import TwelveLabs


DEFAULT_MODEL = {"model_name": "pegasus1.2", "model_options": ["visual", "audio"]}


def _extract_text_generation_events(text_stream) -> str:
    """
    TwelveLabs analyze_stream yields events; we want to concatenate only the model's generated text.
    """
    chunks: List[str] = []
    for ev in text_stream:
        # Sample shows: ev.event_type == "text_generation" and ev.text
        if getattr(ev, "event_type", None) == "text_generation":
            t = getattr(ev, "text", None)
            if t:
                chunks.append(t)
    return "".join(chunks).strip()


def _safe_json_loads(s: str) -> Dict[str, Any]:
    """
    Robustly parse JSON even if the model accidentally wraps in markdown or adds text.
    - Strips ```json fences
    - Attempts to find the first '{' and last '}'
    """
    s = s.strip()

    # remove common code fences
    if s.startswith("```"):
        s = s.strip("`")
        # sometimes it becomes "json\n{...}"
        if "\n" in s:
            s = s.split("\n", 1)[1].strip()

    # try direct
    try:
        return json.loads(s)
    except Exception:
        pass

    # fallback: slice to the first {...} block
    i = s.find("{")
    j = s.rfind("}")
    if i != -1 and j != -1 and j > i:
        return json.loads(s[i : j + 1])

    raise ValueError("Could not parse JSON from TwelveLabs output")


@dataclass
class TwelveLabsConfig:
    api_key: str
    index_name: str = "elder-ai-index"
    model: Dict[str, Any] = None
    poll_interval_sec: int = 5
    max_wait_sec: int = 20 * 60  # 20 minutes


class TwelveLabsVideoAnalyzer:
    """
    One-call workflow:
      analyzer = TwelveLabsVideoAnalyzer(...)
      result = analyzer.analyze_video_url(video_url=..., video_id_hint="clip_123")

    Returns a Python dict with fields that are easy to store/parse in Django.
    """

    def __init__(self, cfg: TwelveLabsConfig):
        self.cfg = cfg
        if self.cfg.model is None:
            self.cfg.model = DEFAULT_MODEL
        self.client = TwelveLabs(api_key=cfg.api_key)
        self._index_id: Optional[str] = None

    # ---------------------------
    # Index management
    # ---------------------------
    def ensure_index(self) -> str:
        """
        Create index if needed; otherwise reuse the first one that matches by name.
        The SDK surface may differ by version; this keeps things simple.
        """
        if self._index_id:
            return self._index_id

        # Try to find existing index by name
        try:
            indexes = self.client.indexes.list()
            for idx in indexes:
                if getattr(idx, "index_name", None) == self.cfg.index_name:
                    self._index_id = idx.id
                    return self._index_id
        except Exception:
            # If list() isn't supported in your SDK version, we'll just create a new index.
            pass

        index = self.client.indexes.create(
            index_name=self.cfg.index_name,
            models=[self.cfg.model],
        )
        self._index_id = index.id
        return self._index_id

    # ---------------------------
    # Upload + index
    # ---------------------------
    def upload_asset_url(self, video_url: str):
        """
        Uploads a video by URL as an asset.
        """
        asset = self.client.assets.create(method="url", url=video_url)
        return asset

    def index_asset(self, index_id: str, asset_id: str):
        indexed_asset = self.client.indexes.indexed_assets.create(index_id=index_id, asset_id=asset_id)
        return indexed_asset

    def wait_until_ready(self, index_id: str, indexed_asset_id: str):
        """
        Poll until indexing completes.
        """
        start = time.time()
        while True:
            indexed_asset = self.client.indexes.indexed_assets.retrieve(index_id, indexed_asset_id)
            status = getattr(indexed_asset, "status", None)

            if status == "ready":
                return indexed_asset
            if status == "failed":
                raise RuntimeError("TwelveLabs indexing failed")

            if (time.time() - start) > self.cfg.max_wait_sec:
                raise TimeoutError("TwelveLabs indexing timed out")

            time.sleep(self.cfg.poll_interval_sec)

    # ---------------------------
    # Prompting
    # ---------------------------
    @staticmethod
    def build_prompt() -> str:
        """
        Strict JSON-only prompt.
        - timeline: per-second items (0..duration_sec-1)
        - actions per person each second
        - warnings if actions suggest possible health concerns
        """
        return """
Return ONLY valid JSON (no markdown, no extra text).

You are analyzing a surveillance-style video with labeled face bounding boxes and names overlaid.
Goal: produce a per-second timeline of what each identified person is doing, and flag potential health warning signs.

Rules:
- Output MUST be a single JSON object.
- Use double quotes for all keys/strings.
- No trailing commas.
- If you are unsure, put null or "unknown" with a confidence score.
- Identify people by the name label seen in the video overlay. If a face is unknown, use "Unknown".

Required JSON schema:

{
  "video": {
    "duration_sec": <int or null>,
    "people_count": <int>,
    "people": ["Name1", "Name2", ...]
  },
  "summary": {
    "one_sentence": <string>,
    "bullets": [<string>, ...]
  },
  "warnings": [
    {
      "type": <string>,                 // e.g. "fall_risk", "respiratory_distress", "confusion", "immobility", "agitation"
      "severity": <"low"|"medium"|"high">,
      "start_sec": <int>,
      "end_sec": <int>,
      "person": <string>,               // name or "Unknown"
      "evidence": <string>,             // short description of what was observed
      "confidence": <number 0..1>
    }
  ],
  "timeline": [
    {
      "t": <int>,                       // second timestamp
      "people": [
        {
          "name": <string>,
          "action": <string>,           // concise: "walking", "sitting", "standing", "lying down", "reaching", "eating", "talking", "staggering", "coughing", etc.
          "location_hint": <string>,    // e.g. "near table", "by doorway", "hallway", "unknown"
          "confidence": <number 0..1>
        }
      ]
    }
  ]
}

Interpret "warning signs" conservatively:
- Falls / collapse / sudden sitting to ground => fall_risk (high)
- Prolonged immobility / unresponsive posture => immobility (medium/high)
- Labored breathing / clutching chest => respiratory_distress (high)
- Visible confusion / wandering / repeated pacing => confusion or agitation (low/medium)
If no warnings, "warnings": [].

Now produce the JSON.
""".strip()

    def analyze_indexed_video_json(self, video_id: str, prompt: Optional[str] = None) -> Dict[str, Any]:
        """
        Runs TwelveLabs analyze_stream and returns parsed JSON dict.
        """
        if prompt is None:
            prompt = self.build_prompt()

        text_stream = self.client.analyze_stream(video_id=video_id, prompt=prompt)
        raw = _extract_text_generation_events(text_stream)
        data = _safe_json_loads(raw)

        # minimal normalization so your backend always has predictable keys
        data.setdefault("video", {})
        data["video"].setdefault("people", [])
        data["video"].setdefault("people_count", len(data["video"]["people"]) if isinstance(data["video"]["people"], list) else 0)
        data.setdefault("summary", {"one_sentence": "", "bullets": []})
        data.setdefault("warnings", [])
        data.setdefault("timeline", [])

        return data

    # ---------------------------
    # One-call public API
    # ---------------------------
    def analyze_video_url(self, *, video_url: str, video_id_hint: Optional[str] = None, prompt: Optional[str] = None) -> Dict[str, Any]:
        """
        Full pipeline:
          - ensure index
          - upload asset by URL
          - index asset
          - wait ready
          - analyze -> JSON dict

        Returns dict ready for json.dumps()/DB storage.
        """
        index_id = self.ensure_index()
        asset = self.upload_asset_url(video_url)
        indexed_asset = self.index_asset(index_id=index_id, asset_id=asset.id)
        indexed_asset = self.wait_until_ready(index_id=index_id, indexed_asset_id=indexed_asset.id)

        # TwelveLabs uses indexed_asset.id in the sample analyze_stream(video_id=...)
        result = self.analyze_indexed_video_json(video_id=indexed_asset.id, prompt=prompt)

        # attach provenance
        result["_twelvelabs"] = {
            "index_id": index_id,
            "asset_id": asset.id,
            "indexed_asset_id": indexed_asset.id,
            "video_url": video_url,
            "video_id_hint": video_id_hint,
        }
        return result
