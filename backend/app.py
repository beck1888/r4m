## Importing libs
# Project imports
from backend_helpers.urls import extract_youtube_id
from backend_helpers.youtube import fetch_transcript, get_yt_video_metadata
from backend_helpers.ai import summarize_transcript_with_openai_gpt
# External dependencies
from flask import Flask, request, jsonify, abort # Web Server

## Flask and endpoints
# Create flask app
app = Flask(__name__)

# Endpoint for getting a video's ID
@app.get("/get-video-id")
def get_video_id():
    # Parse request for url param
    url = request.args.get("url", type=str)
    # Error handling if no url is given
    if not url:
        return jsonify(error="Missing 'url' query parameter"), 400

    # Get the video id
    vid_id = extract_youtube_id(url)

    # Error handling if the url was bad
    if not vid_id:
        return jsonify(error="Unsupported or unrecognized YouTube URL", url=url), 422

    # Success, return the ID
    return jsonify(video_id=vid_id, url=url), 200

# Endpoint for getting a video's metadata
@app.get("/get-metadata")
def get_metadata():
    # Parse the url for the url param
    url = request.args.get("url", type=str)
    # No url given error handling
    if not url:
        return jsonify(error="Missing 'url' query parameter"), 400

    # Do the request
    metadata = get_yt_video_metadata(url)
    
    # Success, return transcript (assume it always works for now)
    return jsonify(metadata), 200

# Endpoint for getting a video's transcript
@app.get("/fetch-transcript")
def fetch_youtube_video_transcript():
    # Parse the url for the id param
    id = request.args.get("id", type=str)
    # No id given error handling
    if not id:
        return jsonify(error="Missing 'id' query parameter"), 400

    # Do the request
    transcript = fetch_transcript(id)

    # Error handling for blank or TranscriptDisabled responses
    if transcript is None: # Equivalent to TranscriptDisabled error from extraction function
        return jsonify(error="Video does not have a transcript", id=id), 404
    
    if len(transcript) < 1: # Blank transcript
        return jsonify(error="Transcript is blank", id=id), 404
    
    # Success, return transcript
    return jsonify(transcript=transcript), 200

# Endpoint for summarizing the video
@app.post("/summarize-video")
def do_summarize():
    # Parse input
    data = request.get_json()
    transcript = data.get("transcript")
    channel_uploader = data.get("channel_uploader")

    # Verify params were passed
    if not transcript or not channel_uploader:
        return jsonify(error="Both transcript and channel_uploader are required"), 400

    # Do your summarization
    summary = summarize_transcript_with_openai_gpt(transcript=transcript, channel_name=channel_uploader)

    return jsonify(summary=summary)

## Run the dev server
if __name__ == "__main__":
    app.run(debug=True)
