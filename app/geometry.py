"""Pure geometry and math utilities for collision detection and vertex computation."""

from __future__ import annotations

import math


def dot_product(v1: list[float], v2: list[float]) -> float:
    """Dot product of two 2D vectors."""
    return v1[0] * v2[0] + v1[1] * v2[1]


def cross_2d(v1: list[float], v2: list[float]) -> float:
    """2D cross product (z-component of the 3D cross product)."""
    return v1[0] * v2[1] - v1[1] * v2[0]


def vec_sub(p1: list[float], p2: list[float]) -> list[float]:
    return [p1[0] - p2[0], p1[1] - p2[1]]


def vec_add(p1: list[float], p2: list[float]) -> list[float]:
    return [p1[0] + p2[0], p1[1] + p2[1]]


def lerp(start: float, end: float, t: float) -> float:
    return start + (end - start) * t


def constrain(val: float, min_val: float, max_val: float) -> float:
    if val < min_val:
        return min_val
    if val > max_val:
        return max_val
    return val


def segments_intersect(
    a1: list[float],
    a2: list[float],
    b1: list[float],
    b2: list[float],
) -> bool:
    """Check if line segment a1→a2 intersects with segment b1→b2.

    Uses the parametric intersection formula:
        t = ((b1 - a1) × s) / (r × s)
        u = ((a1 - b1) × r) / (s × r)
    where r = a2 - a1, s = b2 - b1.
    Segments intersect when 0 ≤ t ≤ 1 and 0 ≤ u ≤ 1.
    """
    r = [a2[0] - a1[0], a2[1] - a1[1]]
    s = [b2[0] - b1[0], b2[1] - b1[1]]

    r_cross_s = cross_2d(r, s)
    s_cross_r = cross_2d(s, r)

    if r_cross_s == 0 or s_cross_r == 0:
        return False

    t = cross_2d(vec_sub(b1, a1), s) / r_cross_s
    u = cross_2d(vec_sub(a1, b1), r) / s_cross_r

    return 0 <= t <= 1 and 0 <= u <= 1


def does_collide(vertices1: list[list[float]], vertices2: list[list[float]]) -> bool:
    """Check if two polygons (given as closed vertex lists) have intersecting edges."""
    for i in range(len(vertices1) - 1):
        for j in range(len(vertices2) - 1):
            if segments_intersect(
                vertices1[i],
                vertices1[i + 1],
                vertices2[j],
                vertices2[j + 1],
            ):
                return True
    return False


def get_vertices(
    x: float, y: float, width: float, height: float, rot: float
) -> list[list[float]]:
    """Compute corners of a rotated rectangle as a closed polygon (5 points)."""
    hw, hh = width / 2, height / 2
    corners = [(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)]

    sin_r = math.sin(rot)
    cos_r = math.cos(rot)

    result = [
        [cx * cos_r - cy * sin_r + x, cx * sin_r + cy * cos_r + y] for cx, cy in corners
    ]
    result.append(result[0])  # close the polygon
    return result
