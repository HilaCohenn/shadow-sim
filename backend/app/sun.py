from datetime import datetime, timezone
from pysolar.solar import get_altitude, get_azimuth
import math


def sun_position(lat: float, lon: float, dt: datetime) -> dict:
    """Return altitude (deg) and azimuth (deg) for given location and UTC datetime."""
    alt = get_altitude(lat, lon, dt)
    az = get_azimuth(lat, lon, dt)
    return {"altitude": alt, "azimuth": az}


def sun_direction_vector(altitude_deg: float, azimuth_deg: float) -> tuple:
    """
    Convert sun alt/az to unit direction vector pointing FROM sun TOWARD origin.
    Azimuth: 0=North, 90=East, 180=South, 270=West.
    Returns (dx, dy, dz) where y=up.
    """
    alt_r = math.radians(altitude_deg)
    az_r = math.radians(azimuth_deg)
    # sun position in world coords (pointing away from origin)
    sx = math.sin(az_r) * math.cos(alt_r)
    sz = -math.cos(az_r) * math.cos(alt_r)
    sy = math.sin(alt_r)
    # direction from sun toward scene = negate
    return (-sx, -sy, -sz)


def daylight_samples(lat: float, lon: float, year: int, day_of_year: int, step_minutes: int = 30):
    """Yield UTC datetimes during daylight hours for given day, stepping every step_minutes."""
    from datetime import timedelta
    import calendar

    start_of_year = datetime(year, 1, 1, tzinfo=timezone.utc)
    base = start_of_year + timedelta(days=day_of_year - 1)

    for hour in range(24):
        for minute in range(0, 60, step_minutes):
            dt = base.replace(hour=hour, minute=minute)
            alt = get_altitude(lat, lon, dt)
            if alt > 5:  # exclude near-horizon angles to avoid unrealistically large shadow projections
                yield dt
