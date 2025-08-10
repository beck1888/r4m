## Imports
from youtube_transcript_api import YouTubeTranscriptApi

## Functions
def fetch_transcript(video_id: str) -> str:
    transcript_fetcher = YouTubeTranscriptApi()
    fetched = transcript_fetcher.fetch(video_id)
    transcript = " ".join(snippet.text for snippet in fetched) # Extract just the string parts
    return transcript

## Testing it
def main():
    t = fetch_transcript('fHRS_NOs24w')
    print(t)

if __name__ == '__main__':
    main()