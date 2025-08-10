# Importing libs
from flask import Flask # Web Server

# Create flask app
app = Flask(__name__)

# App Routes
@app.route("/")
def home():
    return "Hello, World!"

# Run the dev server
if __name__ == "__main__":
    app.run(debug=True)
