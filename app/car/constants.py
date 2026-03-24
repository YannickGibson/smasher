"""Car-related constants shared across all car submodules."""

# ── Dimensions ─────────────────────────────────────────────────────────

BASE_BODY_WIDTH = 100
BASE_BODY_HEIGHT = 200
BASE_BUMPER_WIDTH = 114
BASE_BUMPER_HEIGHT = 21

# ── Scaling limits ─────────────────────────────────────────────────────

MAX_BUMPER_SCALE = 6
MAX_BODY_SCALE = 4

# ── Scoring ────────────────────────────────────────────────────────────

FOOD_SCORE_ADDITION = 5
BASE_ADD_KILL_SCORE = 50
KILL_ADD_SCORE_PERCENTAGE = 0.2

# ── Map ────────────────────────────────────────────────────────────────

MAP_SIDE = 512 * 5  # Map width = map height = map side
