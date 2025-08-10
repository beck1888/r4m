## Importing libs
# Project imports
from backend_helpers.urls import extract_youtube_id
# External dependencies
from flask import Flask, request, jsonify # Web Server

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
