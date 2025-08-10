## Imports
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled

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
