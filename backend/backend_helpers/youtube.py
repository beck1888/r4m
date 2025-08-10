## Imports
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled
import yt_dlp

## Functions
def fetch_transcript(video_id: str) -> str | None:
    """
    Returns the text transcript of a YouTube video, if available.

    Args:
        video_id (str): The id only of the video.

    Returns:
        str or None: The transcript of the video, or None if there is no transcript available.
    """

    transcript_fetcher = YouTubeTranscriptApi() # Create fetcher

    # Try to fetch a transcript
    try:
        fetched = transcript_fetcher.fetch(video_id)
    except TranscriptsDisabled:
        return None # No transcript available
    
    # If there is a transcript, re-assemble it into one string
    transcript = " ".join(snippet.text for snippet in fetched) # Extract just the string parts
    return transcript

def get_yt_video_metadata(url: str) -> dict[str, str]:
    """
    Gets various useful metadata points about a YouTube video.
    
    Args:
        url (str): The url for the video.
        
    Returns:
        metadata (dict): A dictionary with the following keys:
            - title
            - uploader
            - channel_url
            - duration
            - upload_date
            - description
            - thumbnail
    """
    with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
        info = ydl.extract_info(url, download=False)
        return {
            "title": info.get("title"),
            "uploader": info.get("uploader"),
            "channel_url": info.get('channel_url'),
            "duration": info.get("duration"),
            "upload_date": info.get("upload_date"),
            "description": info.get("description"),
            "thumbnail": info.get("thumbnail"),
        }
