## Importing libs
from flask import Flask, request, jsonify # Web Server
from urllib.parse import urlparse, parse_qs # Parse YT urls

## App functions
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

## Flask and endpoints
# Create flask app
app = Flask(__name__)

# Endpoint for getting a video's ID
@app.get("/get-video-id")
def get_video_id():
    url = request.args.get("url", type=str)
    if not url:
        return jsonify(error="Missing 'url' query parameter"), 400

    vid = extract_youtube_id(url)
    if not vid:
        return jsonify(error="Unsupported or unrecognized YouTube URL", url=url), 422

    return jsonify(video_id=vid, url=url), 200

## Run the dev server
if __name__ == "__main__":
    app.run(debug=True)
