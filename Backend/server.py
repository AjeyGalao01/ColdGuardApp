# ColdGuard backend: Flask + SQLite
# Install: pip install flask flask-cors
# Run:     python server.py
import sqlite3, time, random
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
DB = "coldguard.db"


def db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


with db() as c:
    c.execute("""CREATE TABLE IF NOT EXISTS readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        temperature REAL NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL)""")


def classify(t):
    # Same thresholds as the paper. Pwede palitan ng Random Forest later.
    if t < 2 or t > 8:
        return "excursion"
    if t < 2.5 or t > 7:
        return "warning"
    return "normal"


def save(temp, ts=None):
    ts = ts or int(time.time())
    with db() as c:
        c.execute(
            "INSERT INTO readings (temperature, status, created_at) VALUES (?,?,?)",
            (temp, classify(temp), ts),
        )


# ESP32 sends: {"temperature": 4.5}  (palitan ang key kung iba ang gamit ng ESP32 code)
@app.post("/readings")
def add_reading():
    data = request.get_json(force=True)
    save(float(data["temperature"]))
    return jsonify({"ok": True})


# App reads the past hour
@app.get("/readings")
def get_readings():
    since = int(time.time()) - 3600
    rows = db().execute(
        "SELECT temperature, status, created_at FROM readings "
        "WHERE created_at >= ? ORDER BY created_at",
        (since,),
    ).fetchall()
    return jsonify([dict(r) for r in rows])


# DEMO ONLY: fake data para makita agad ang chart (open /seed sa browser)
@app.get("/seed")
def seed():
    now = int(time.time())
    for i in range(120):  # 120 readings x 30 sec = 1 hour
        temp = random.uniform(3.5, 5.5)
        if i > 100:  # simulate excursion sa dulo
            temp = 5.5 + (i - 100) * 0.25
        save(round(temp, 2), now - (120 - i) * 30)
    return jsonify({"seeded": 120})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
