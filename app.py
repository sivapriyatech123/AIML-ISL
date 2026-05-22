from flask import Flask, render_template, redirect, url_for, request, session, Response, jsonify
import sqlite3
import threading
import json
import os
import ai.webcam as webcam
from ai.webcam import start_webcam, stop_webcam, generate_frames
from ai.text_to_speech import speak

app = Flask(__name__)
app.secret_key = "sign_language_secret_key"

# Load ISL Dictionary
try:
    with open("isl_dictionary.json", "r") as f:
        isl_dictionary = json.load(f)
except FileNotFoundError:
    isl_dictionary = {}

# ================= HOME =================
@app.route("/")
def home():
    return render_template("home.html")

# ================= ABOUT =================
@app.route("/about")
def about():
    return render_template("about.html")

# ================= FEATURES =================
@app.route("/features")
def features():
    return render_template("features.html")

# ================= SIGNUP =================
@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        name = request.form["name"]
        email = request.form["email"]
        password = request.form["password"]

        try:
            conn = sqlite3.connect("database/database.db")
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
                (name, email, password)
            )
            conn.commit()
            conn.close()
            return render_template("signup.html", success="Account created successfully!")

        except sqlite3.IntegrityError:
            return render_template("signup.html", error="Email already exists")

    return render_template("signup.html")

# ================= LOGIN =================
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]

        conn = sqlite3.connect("database/database.db")
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM users WHERE email=? AND password=?",
            (email, password)
        )
        user = cursor.fetchone()
        conn.close()

        if user:
            session["user_id"] = user[0]
            session["user_name"] = user[1]
            return redirect(url_for("translator"))
        else:
            return render_template("login.html", error="Invalid email or password")

    return render_template("login.html")

# ================= TRANSLATOR (PROTECTED) =================
@app.route("/translator")
def translator():
    if "user_id" not in session:
        return redirect(url_for("login"))
    return render_template("translator.html")

# ================= LEARNING (PROTECTED) =================
@app.route("/learning")
def learning():
    if "user_id" not in session:
        return redirect(url_for("login"))
    return render_template("learning.html")

# ================= START WEBCAM =================
@app.route("/start_webcam")
def start_webcam_route():
    if "user_id" not in session:
        return redirect(url_for("login"))

    thread = threading.Thread(target=start_webcam)
    thread.daemon = True
    thread.start()
    return "Webcam started"

# ================= VIDEO FEED =================
@app.route("/video_feed")
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

# ================= STOP WEBCAM =================
@app.route("/stop_webcam")
def stop_webcam_route():
    stop_webcam()
    return "Webcam stopped"

# ================= GET DETECTED TEXT =================
@app.route("/get_text")
def get_text():
    return webcam.detected_text

# ================= SPEAK TEXT =================
@app.route("/speak_text")
def speak_text():
    text = webcam.detected_text.strip()
    if text:
        speak(text)
        return "Speaking"
    return "No text"

@app.route("/speak_sentence")
def speak_sentence():
    text = request.args.get("text", "").strip()
    if text:
        speak(text)
        return "Speaking"
    return "No text provided"

# ================= LOGOUT =================
@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("home"))

# ================= TRANSLATE SIGN =================
@app.route("/translate_sign", methods=["POST"])
def translate_sign():
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "No text provided"}), 400

    text = data["text"].lower()
    words = text.split()
    video_list = []

    for word in words:
        if word in isl_dictionary:
            # Return the word itself as the animation key instead of the video filename
            video_list.append(word)

    return jsonify(video_list)

# ================= RUN =================
if __name__ == "__main__":
    app.run(debug=True)
