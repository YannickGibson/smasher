"""BotCar — base class for all AI-controlled cars."""

from __future__ import annotations

import math

from app.car.base import BaseCar
from app.car.constants import MAP_SIDE
from app.geometry import constrain


class BotCar(BaseCar):
    NORMAL_SPEED = 0.8
    BOOST_SPEED = 2.8
    TURN_SPEED = 0.1

    def __init__(
        self,
        x: int,
        y: int,
        angle: int,
        color: str,
        name: str,
        score: int,
    ) -> None:
        super().__init__()
        self.active = True
        self.heartbeat_info = {
            "x": x,
            "y": y,
            "name": name,
            "color": color,
            "score": score,
            "rot": angle,
            "acc": 1,
            "turn": 0,
            "boost": False,
        }

        self.speed = 0.0
        self.drift_angle = 0.0
        self.x_vel = 0.0
        self.y_vel = 0.0
        self.acc_speed = self.NORMAL_SPEED

        self.scale_car(score)
        self.close_cars: dict[str, BaseCar] = {}

    def add_close_car(self, car_id: str, car: BaseCar) -> None:
        self.close_cars[car_id] = car

    def move(self, delta: float) -> None:
        info = self.heartbeat_info

        if info["boost"]:
            info["acc"] = 1

        self._rotate_by(info["turn"] * self.TURN_SPEED * delta)

        angle = info["rot"] + math.radians(90)
        self.x_vel += math.cos(angle) * self.acc_speed * -info["acc"]
        self.y_vel += math.sin(angle) * self.acc_speed * -info["acc"]
        info["rot"] += self.drift_angle * info["acc"]

        info["x"] = constrain(info["x"] + self.x_vel, -MAP_SIDE, MAP_SIDE)
        info["y"] = constrain(info["y"] + self.y_vel, -MAP_SIDE, MAP_SIDE)

        self.drift_angle *= 0.85
        self.x_vel *= 0.93
        self.y_vel *= 0.93
        self.speed *= 0.93

    def _rotate_by(self, angle: float) -> None:
        if angle == 0:
            return
        if abs(self.drift_angle) < 5 - angle / 5:
            self.drift_angle += angle / 5
        elif angle > 0:
            self.drift_angle = 5.0
        else:
            self.drift_angle = -5.0

    def boost_on(self) -> None:
        self.heartbeat_info["boost"] = True
        self.acc_speed = self.BOOST_SPEED

    def boost_off(self) -> None:
        self.heartbeat_info["boost"] = False
        self.acc_speed = self.NORMAL_SPEED
