## Importing libs
from flask import Flask # Web Server

# Create flask app
app = Flask(__name__)

## App Routes
# Default route
@app.route("/")
def home():
    return "Hello, World!"

# Route with parameter
@app.route("/greet/<name>") 
def hello(name):
    return f"Hello, {name}!"

## Run the dev server
if __name__ == "__main__":
    app.run(debug=True)
