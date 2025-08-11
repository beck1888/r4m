# R4M (Read for Me)

R4M is an AI YouTube video summarizer. 

## Install

1. Clone from source
```bash
gh repo clone beck1888/r4m
```

2. Install the requirements for the backend in a virtual environment
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
```

3. Create the secrets file
```bash
cd backend/backend_helpers
touch .env.local
```

4. Add in your OpenAI API Key into the file
```env
OPENAI_API_KEY=(your key here)
```

5. Go back to the backend file
```bash
cd ..
```

6. Start the Flask server
```python
python3 app.py
```

7. Create a new terminal session

8. Go into the frontend folder and start the frontend server
```bash
cd frontend
python3 -m http.server 5520
```

9. Go to `localhost:5520` and enjoy your app!

## Notes

This is a work-in-progress and not polished. Feel free to poke at the code yourself. I may or may not self-host this on my own infra later, but then I'd need to setup proper webapp stuff. But yeah self hosting this is probably fine. Or just make a script to spin it up when you need it.

## Future ideas

- Audio overview?