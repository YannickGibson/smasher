"""Game heartbeat loop and its helper functions.

Extracted from app.py to keep the main module focused on Flask routes
and socket-event handlers.  The heart_beat() function is the single
entry-point; everything else is an internal helper.
"""

from __future__ import annotations

import itertools
from typing import TYPE_CHECKING

from app.car import random_color
from app.geometry import constrain

if TYPE_CHECKING:
    from collections.abc import Callable, Mapping

    from flask_socketio import SocketIO

    from app.car import BotCar, PlayerCar, SimpleBotCar

# ── Constants ──────────────────────────────────────────────────────────

HEARTBEAT_INTERVAL = 0.03
VIEW_DISTANCE_X = 950
VIEW_DISTANCE_Y = 530
COLLISION_DETECTION_DISTANCE = 500
SCOREBOARD_MAX_ENTRIES = 7
MIN_VIEW_SCALE = 0.01


# ── View / visibility helpers ──────────────────────────────────────────


def is_in_view(
    origin_x: float,
    origin_y: float,
    view_x: float,
    view_y: float,
    target_x: float,
    target_y: float,
) -> bool:
    """AABB check: is (target_x, target_y) inside the view rectangle?"""
    return (
        origin_x - view_x < target_x < origin_x + view_x
        and origin_y - view_y < target_y < origin_y + view_y
    )


def compute_view(score: float, active: bool) -> tuple[float, float]:
    """Return (view_x, view_y) — the half-dimensions of the viewport."""
    if active:
        scale = constrain(1 - score / 4000, MIN_VIEW_SCALE, 1)
        multiplier = 1 / scale
    else:
        multiplier = 2.0
    return VIEW_DISTANCE_X * multiplier, VIEW_DISTANCE_Y * multiplier


# ── Scoreboard ─────────────────────────────────────────────────────────


def build_scoreboard(
    cars: Mapping[str, PlayerCar],
    bots: Mapping[str, BotCar],
) -> tuple[dict[str, list], list[float] | None]:
    """Gather scores from all active entities, return top-N + best position."""
    best_score = -1
    best_pos: list[float] | None = None
    entries: list[tuple[str, str, int]] = []

    for entity_id, entity in itertools.chain(cars.items(), bots.items()):
        if not entity.active:
            continue
        info = entity.heartbeat_info
        entries.append((entity_id, info["name"], info["score"]))
        if info["score"] > best_score:
            best_score = info["score"]
            best_pos = [info["x"], info["y"]]

    entries.sort(key=lambda e: e[2], reverse=True)
    scoreboard = {
        eid: [name, score]
        for eid, name, score in entries[:SCOREBOARD_MAX_ENTRIES]
    }
    return scoreboard, best_pos


# ── Validation ─────────────────────────────────────────────────────────


def validate_car_positions(cars: dict[str, PlayerCar]) -> None:
    """Deactivate cars whose coordinates are not valid numbers."""
    for car in cars.values():
        try:
            float(car.heartbeat_info["x"])
            float(car.heartbeat_info["y"])
        except (ValueError, TypeError, KeyError):
            car.active = False


# ── Collision handlers ─────────────────────────────────────────────────


def handle_player_bot_collisions(
    car_id: str,
    car: PlayerCar,
    bots: dict[str, SimpleBotCar],
    cars_to_display: dict[str, dict],
    view_x: float,
    view_y: float,
    socketio: SocketIO,
    spawn_bot_fn: Callable[[], None],
) -> None:
    """Process visibility and collisions between a single player and all bots."""
    car_info = car.heartbeat_info

    for bot_id, bot in dict(bots).items():  # snapshot — bots may be mutated
        bot_info = bot.heartbeat_info

        if is_in_view(
            car_info["x"], car_info["y"], view_x, view_y,
            bot_info["x"], bot_info["y"],
        ):
            cars_to_display[bot_id] = bot_info

        # Only run expensive collision checks for nearby entities
        if (
            abs(car_info["x"] - bot_info["x"]) >= COLLISION_DETECTION_DISTANCE
            or abs(car_info["y"] - bot_info["y"]) >= COLLISION_DETECTION_DISTANCE
        ):
            continue

        car.heartbeat_info["color"] = random_color()

        if not car.active:
            continue

        bot.add_close_car(car_id, car)

        if bot.does_kill(car):
            car.active = False
            bot.add_score_for_killing(car)
            socketio.emit("dead", {"killer": bot_info["name"]}, room=car_id)

        elif car.does_kill(bot):
            car.add_score_for_killing(bot)
            socketio.emit("u killed", {"dead": bot_info["name"]}, room=car_id)
            del bots[bot_id]
            spawn_bot_fn()


def collect_visible_cars(
    own_id: str,
    own_info: dict,
    cars: dict[str, PlayerCar],
    cars_to_display: dict[str, dict],
    view_x: float,
    view_y: float,
) -> None:
    """Add other active players within view distance to the display dict."""
    for car_id, car in cars.items():
        if car_id == own_id or not car.active:
            continue
        info = car.heartbeat_info
        if is_in_view(
            own_info["x"], own_info["y"], view_x, view_y, info["x"], info["y"],
        ):
            cars_to_display[car_id] = info


def collect_visible_food(
    own_info: dict,
    food: dict[str, dict],
    view_x: float,
    view_y: float,
) -> dict[str, dict]:
    """Return subset of food items within view distance."""
    return {
        fid: f
        for fid, f in food.items()
        if is_in_view(
            own_info["x"], own_info["y"], view_x, view_y, f["x"], f["y"],
        )
    }


def handle_bot_bot_collisions(bots: dict[str, SimpleBotCar]) -> None:
    """Process bot-vs-bot collisions, then advance each bot's AI."""
    for bot_id, bot in list(bots.items()):
        if bot_id not in bots:  # may have been killed earlier this tick
            continue

        bot_info = bot.heartbeat_info
        view_x, view_y = compute_view(bot_info["score"], active=True)

        for other_id, other_bot in list(bots.items()):
            if bot_id == other_id or other_id not in bots:
                continue

            other_info = other_bot.heartbeat_info
            if is_in_view(
                other_info["x"], other_info["y"],
                view_x, view_y,
                bot_info["x"], bot_info["y"],
            ):
                bot.add_close_car(other_id, other_bot)

                if bot.does_kill(other_bot):
                    bot.add_score_for_killing(other_bot)
                    del bots[other_id]

        bot.think()


# ── Main heartbeat loop ───────────────────────────────────────────────


def heart_beat(
    socketio: SocketIO,
    cars: dict[str, PlayerCar],
    bots: dict[str, SimpleBotCar],
    food: dict[str, dict],
    spawn_bot_fn: Callable[[], None],
) -> None:
    """Server tick — runs in a background greenlet/thread forever."""
    while True:
        socketio.sleep(HEARTBEAT_INTERVAL)

        validate_car_positions(cars)
        scoreboard, best_pos = build_scoreboard(cars, bots)

        for car_id, car in cars.items():
            car_info = car.heartbeat_info
            view_x, view_y = compute_view(
                car_info.get("score", 0), car.active,
            )

            personal_info: dict = {}
            if car.active:
                personal_info = {
                    "score": car_info["score"],
                    "scoreboard": scoreboard,
                    "bestPlayerPos": best_pos,
                }

            cars_to_display: dict[str, dict] = {}

            handle_player_bot_collisions(
                car_id, car, bots, cars_to_display,
                view_x, view_y, socketio, spawn_bot_fn,
            )

            collect_visible_cars(
                car_id, car_info, cars, cars_to_display, view_x, view_y,
            )

            food_to_display = collect_visible_food(
                car_info, food, view_x, view_y,
            )

            socketio.emit("heartBeat", {
                "cars": cars_to_display,
                "food": food_to_display,
                "info": personal_info,
            }, room=car_id)

        handle_bot_bot_collisions(bots)
