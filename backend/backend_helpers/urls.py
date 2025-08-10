## Imports
from urllib.parse import urlparse, parse_qs # Parse YT urls

## Functions
# Get video id from URL with error handling
def extract_youtube_id(url: str) -> str | None:
    # Allow host-only inputs like "youtu.be/abc123"
    if "://" not in url:
        url = "https://" + url

    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    path = parsed.path or ""
    query = parsed.query or ""

    if host == "youtu.be":
        vid = path.lstrip("/")
        return vid or None

    if host in {"www.youtube.com", "youtube.com", "m.youtube.com"}:
        if path == "/watch":
            return parse_qs(query).get("v", [None])[0]
        parts = path.strip("/").split("/")
        if len(parts) >= 2 and parts[0] in {"embed", "v", "shorts"}:
            return parts[1]

    return None