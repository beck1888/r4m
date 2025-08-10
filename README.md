# R4M (Read for Me)

## About

This project is a YouTube video summarizer. It will involve a python backend with a simple web ui. I'm creating this project with the intent to self-host it on my Raspberry Pi server (and only expose to LAN), so I'm not adding auth or other common protections. Live, laugh, use_footgun().

## Data flow

It works like this:

1. Take a URL on the frontend

2. Pass the URL to the backend

3. Get the video ID from the URL (and other validation)

4. Get the transcript for the video

5. Use OpenAI's GPT-5 model via the official API to summarize the video

6. Render the markdown summary to show the user

## Tech

Backend:
- Python
    - YouTube Transcript Fetcher
    - OpenAI API

Frontend:
- Vanilla web tech (HTML, CSS, and JS)
    - Lottie animation (possibly)

## Future

I would also like to add controls for verbosity, emoji usage, style, and a button to create an audio overview.