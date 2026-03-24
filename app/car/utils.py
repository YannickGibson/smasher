"""Utility functions for car/game-object generation."""

from __future__ import annotations

import random

from app.car.constants import MAP_SIDE


def random_color() -> str:
    return "0x{:02x}{:02x}{:02x}".format(*(random.randint(0, 255) for _ in range(3)))


def random_food() -> dict[str, int | str]:
    return {
        "x": random.randint(-MAP_SIDE, MAP_SIDE),
        "y": random.randint(-MAP_SIDE, MAP_SIDE),
        "color": random_color(),
    }
