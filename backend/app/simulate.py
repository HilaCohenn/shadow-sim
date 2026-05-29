from datetime import timezone
import trimesh
from .sun import sun_position, sun_direction_vector, daylight_samples
from .shadow import project_shadow


def run_yearly_simulation(
    mesh: trimesh.Trimesh,
    lat: float,
    lon: float,
    year: int = 2024,
    step_minutes: int = 30,
) -> list[dict]:
    """
    Simulate shadows for every day of the year.
    Returns list of dicts: {day, date_str, peak_area, total_area, hours_shaded}.
    """
    import calendar
    days_in_year = 366 if calendar.isleap(year) else 365
    results = []

    for day in range(1, days_in_year + 1):
        samples = list(daylight_samples(lat, lon, year, day, step_minutes))
        areas = []
        for dt in samples:
            pos = sun_position(lat, lon, dt)
            sun_dir = sun_direction_vector(pos["altitude"], pos["azimuth"])
            area = project_shadow(mesh, sun_dir)
            areas.append(area)

        if areas:
            peak = max(areas)
            total = sum(areas) * (step_minutes / 60.0)  # area-hours
            hours = len(areas) * (step_minutes / 60.0)
        else:
            peak = total = hours = 0.0

        from datetime import datetime, timedelta
        date = datetime(year, 1, 1) + timedelta(days=day - 1)

        results.append({
            "day": day,
            "date": date.strftime("%Y-%m-%d"),
            "month": date.month,
            "peak_area": round(peak, 3),
            "total_area_hours": round(total, 3),
            "hours_shaded": round(hours, 2),
        })

    return results
