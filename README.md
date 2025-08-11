# R4M (Read for Me)

R4M is an AI-powered YouTube video summarizer.

## Installation

1. **Clone the repository**

   ```bash
   gh repo clone beck1888/r4m
   ```

2. **Set up the backend**

   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Create the secrets file**

   ```bash
   cd backend_helpers
   touch .env.local
   ```

4. **Add your OpenAI API key** to `.env.local`

   ```env
   OPENAI_API_KEY=your_api_key_here
   ```

5. **Start the backend server**

   ```bash
   cd ..
   python3 app.py
   ```

6. **Start the frontend**
   Open a new terminal and run:

   ```bash
   cd frontend
   python3 -m http.server 5520
   ```

7. **Open the app**
   Go to `http://localhost:5520` in your browser.

## Notes

This is still a work-in-progress. Feel free to tinker with the code. I might self-host it later, but for now it's meant for local use/ demo. You can also write a quick script to spin it up whenever you need it.

## Future ideas

* Audio summaries
