from __future__ import annotations

import mimetypes
import os
import random
import string
import threading

from flask import Flask, render_template, request, send_from_directory
from flask_socketio import SocketIO, emit

from app.car import MAP_SIDE, PlayerCar, SimpleBotCar, random_color, random_food
from app.game_loop import heart_beat

# ── Constants ──────────────────────────────────────────────────────────

CHARACTERS = string.ascii_lowercase + string.digits

# ── App setup ──────────────────────────────────────────────────────────

mimetypes.add_type("text/css", ".css")
mimetypes.add_type("text/javascript", ".js")

app = Flask(__name__)
socketio = SocketIO(
    app,
    cors_allowed_origins=os.environ.get("CORS_ORIGINS", "*"),
)

thread_lock = threading.Lock()
heartbeat_thread = None

# ── Game state ─────────────────────────────────────────────────────────

food: dict[str, dict] = {}
cars: dict[str, PlayerCar] = {}
bots: dict[str, SimpleBotCar] = {}

# ── Helper functions ───────────────────────────────────────────────────


def random_food_id() -> str:
    return "".join(random.choices(CHARACTERS, k=8))


def spawn_bot() -> None:
    bots[random_food_id()] = SimpleBotCar(
        x=random.randint(-MAP_SIDE // 2, MAP_SIDE // 2),
        y=random.randint(-MAP_SIDE // 2, MAP_SIDE // 2),
        angle=random.randint(0, 359),
        color=random_color(),
        name="Bot Jerry",
        score=333,
    )


# ── Input validation ──────────────────────────────────────────────────

_CAR_DATA_SCHEMA: dict[str, tuple[type, ...]] = {
    "x": (int,),
    "y": (int,),
    "rot": (int, float),
    "boost": (bool,),
    "acc": (int, float),
    "turn": (int,),
}


def _is_valid_car_data(data: object) -> bool:
    return isinstance(data, dict) and all(
        key in data and isinstance(data[key], types)
        for key, types in _CAR_DATA_SCHEMA.items()
    )


# ── Socket endpoints ──────────────────────────────────────────────────


@socketio.on("myCar", namespace="/")
def update_my_car(car_data: dict) -> None:
    if request.sid in cars and _is_valid_car_data(car_data):
        info = cars[request.sid].heartbeat_info
        for key in _CAR_DATA_SCHEMA:
            info[key] = car_data[key]


@socketio.on("kill", namespace="/")
def on_kill(victim_id: str) -> None:
    if request.sid not in cars:
        return
    killer = cars[request.sid]
    if not killer.active:
        return

    if victim_id in cars:
        victim = cars[victim_id]
        if victim.active:
            victim.active = False
            killer.add_score_for_killing(victim)
            emit("dead", {"killer": killer.heartbeat_info["name"]}, room=victim_id)
            emit(
                "u killed",
                {"dead": victim.heartbeat_info["name"]},
                room=request.sid,
            )

    elif victim_id in bots:
        dead_bot = bots[victim_id]
        del bots[victim_id]
        killer.add_score_for_killing(dead_bot)
        emit(
            "u killed",
            {"dead": dead_bot.heartbeat_info["name"]},
            room=request.sid,
        )
        spawn_bot()


@socketio.on("i died", namespace="/")
def on_died(killer_id: str) -> None:
    if request.sid not in cars:
        return
    dead_car = cars[request.sid]
    if not dead_car.active:
        return

    if killer_id in cars:
        killer = cars[killer_id]
        if killer.active:
            dead_car.active = False
            killer.add_score_for_killing(dead_car)
            emit(
                "dead",
                {"killer": killer.heartbeat_info["name"]},
                room=request.sid,
            )
            emit(
                "u killed",
                {"dead": dead_car.heartbeat_info["name"]},
                room=killer_id,
            )

    # Not elif — preserves original behavior: bot kill is checked independently
    if killer_id in bots:
        killer_bot = bots[killer_id]
        dead_car.active = False
        killer_bot.add_score_for_killing(dead_car)
        emit(
            "dead",
            {"killer": killer_bot.heartbeat_info["name"]},
            room=request.sid,
        )


@socketio.on("connect", namespace="/")
def on_connect() -> None:
    cars[request.sid] = PlayerCar()


@socketio.on("join", namespace="/")
def on_join(data: dict) -> None:
    if request.sid not in cars:
        return
    car = cars[request.sid]
    car.spawn(data.get("name", ""))
    emit("join", car.heartbeat_info)


@socketio.on("eat", namespace="/")
def on_eat(food_id: str) -> None:
    if request.sid in cars and food_id in food:
        del food[food_id]
        food[random_food_id()] = random_food()
        cars[request.sid].add_score_for_eating_food()


@socketio.on("focusout", namespace="/")
def on_blur() -> None:
    if request.sid in cars:
        cars[request.sid].heartbeat_info["boost"] = False
        cars[request.sid].heartbeat_info["acc"] = 0


@socketio.on("disconnect", namespace="/")
def on_disconnect() -> None:
    cars.pop(request.sid, None)


# ── HTTP routes ────────────────────────────────────────────────────────


@app.route("/")
def index():
    global heartbeat_thread
    if heartbeat_thread is None:
        with thread_lock:
            if heartbeat_thread is None:  # double-checked locking
                heartbeat_thread = socketio.start_background_task(
                    heart_beat,
                    socketio,
                    cars,
                    bots,
                    food,
                    spawn_bot,
                )
    return render_template("index.html")


@app.route("/favicon.ico")
def favicon():
    return send_from_directory(
        os.path.join(app.root_path, "static"),
        "favicon.ico",
        mimetype="image/vnd.microsoft.icon",
    )


# ── Main ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    food.update({random_food_id(): random_food() for _ in range(100)})
    spawn_bot()
    socketio.run(app, debug=True)
