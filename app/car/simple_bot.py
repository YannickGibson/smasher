"""SimpleBotCar — basic AI that chases nearby cars."""

from __future__ import annotations

from app.car.bot import BotCar


class SimpleBotCar(BotCar):
    def think(self) -> None:
        if self.close_cars:
            self.heartbeat_info["turn"] = 1
            self.boost_on()
        else:
            self.heartbeat_info["turn"] = 0
            self.boost_off()

        self.move(delta=0.95)
        self.close_cars = {}
