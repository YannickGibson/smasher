"""PlayerCar — human-controlled car spawned on socket connection."""

from __future__ import annotations

import math
import random

from app.car.base import BaseCar
from app.car.constants import BASE_BODY_WIDTH, MAP_SIDE
from app.car.utils import random_color


class PlayerCar(BaseCar):
    def __init__(self) -> None:
        super().__init__()
        self.active = False
        # Centered so the player sees live action before joining
        self.heartbeat_info: dict = {"x": 0, "y": 0}

    def spawn(self, name: str) -> None:
        self.active = True
        self.heartbeat_info = {
            "name": name if name else "Smasher.ml",
            "x": random.randint(-MAP_SIDE // 2, MAP_SIDE // 2),
            "y": random.randint(-MAP_SIDE // 2, MAP_SIDE // 2),
            "score": 0,
            "rot": random.random() * math.tau,
            "acc": 0,
            "turn": 0,
            "color": random_color(),
            "boost": False,
        }
        # Reset dimensions to starting square
        self.body_width = BASE_BODY_WIDTH
        self.body_height = BASE_BODY_WIDTH
