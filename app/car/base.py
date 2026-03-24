"""BaseCar — shared logic for all car types (players and bots)."""

from __future__ import annotations

import math

from app.car.constants import (
    BASE_ADD_KILL_SCORE,
    BASE_BODY_HEIGHT,
    BASE_BODY_WIDTH,
    BASE_BUMPER_HEIGHT,
    BASE_BUMPER_WIDTH,
    FOOD_SCORE_ADDITION,
    KILL_ADD_SCORE_PERCENTAGE,
    MAX_BODY_SCALE,
    MAX_BUMPER_SCALE,
)
from app.geometry import (
    does_collide,
    dot_product,
    get_vertices,
    lerp,
    vec_sub,
)


class BaseCar:
    active: bool
    heartbeat_info: dict

    def __init__(self) -> None:
        self.body_width: float = BASE_BODY_WIDTH
        # Starts as a square; scale_car grows height using BASE_BODY_HEIGHT
        self.body_height: float = BASE_BODY_WIDTH
        self.body_height_scale = 1.0

        self.bumper_width: float = BASE_BUMPER_WIDTH
        self.bumper_height: float = BASE_BUMPER_HEIGHT
        self.bumper_width_scale = 1.0

    def does_kill(self, victim: BaseCar) -> bool:
        return does_collide(self.get_bumper_vertices(), victim.get_body_vertices())

    def scale_car(self, score_delta: int) -> None:
        """Adjust car dimensions based on score growth.

        Uses lerp for fast growth at low scores, diminishing at high scores.
        """
        for _ in range(score_delta // 5):
            self.body_height_scale = lerp(self.body_height_scale, MAX_BODY_SCALE, 0.001)
            self.body_height = BASE_BODY_HEIGHT * self.body_height_scale

            self.bumper_width_scale = lerp(
                self.bumper_width_scale, MAX_BUMPER_SCALE * 1.5, 0.001
            )
            self.bumper_width = BASE_BUMPER_WIDTH * self.bumper_width_scale

    def get_body_vertices(self) -> list[list[float]]:
        return get_vertices(
            self.heartbeat_info["x"],
            self.heartbeat_info["y"],
            self.body_width,
            self.body_height * self.body_height_scale,
            self.heartbeat_info["rot"],
        )

    def get_bumper_vertices(self) -> list[list[float]]:
        rot = self.heartbeat_info["rot"]
        x = self.heartbeat_info["x"] - math.sin(rot) * self.body_height / 2
        y = self.heartbeat_info["y"] + math.cos(rot) * self.body_height / 2
        return get_vertices(
            x,
            y,
            self.bumper_width * self.bumper_width_scale,
            self.bumper_height,
            rot,
        )

    def add_score_for_killing(self, dead_car: BaseCar) -> None:
        self.heartbeat_info["score"] += BASE_ADD_KILL_SCORE
        self.heartbeat_info["score"] += int(
            dead_car.heartbeat_info["score"] * KILL_ADD_SCORE_PERCENTAGE
        )

    def add_score_for_eating_food(self) -> None:
        self.heartbeat_info["score"] += FOOD_SCORE_ADDITION
        self.scale_car(FOOD_SCORE_ADDITION)

    def does_eat(self, food_item: dict[str, float]) -> bool:
        """Check if a food item's center is inside the car body or bumper."""
        point = [food_item["x"], food_item["y"]]

        for vertices in (self.get_body_vertices(), self.get_bumper_vertices()):
            a, b, c = vertices[0], vertices[1], vertices[2]
            ab_af = dot_product(vec_sub(a, b), vec_sub(a, point))
            ab_ab = dot_product(vec_sub(a, b), vec_sub(a, b))
            bc_bf = dot_product(vec_sub(b, c), vec_sub(b, point))
            bc_bc = dot_product(vec_sub(b, c), vec_sub(b, c))

            if 0 <= ab_af <= ab_ab and 0 <= bc_bf <= bc_bc:
                return True

        return False
