#!/usr/bin/env python3
"""
Combine intervals.icu data into a single LLM-friendly JSON file.
Extracts key metrics from activity streams while keeping file size manageable.
"""

import json
import os
import random
import string
from datetime import datetime
from pathlib import Path
from typing import Any


def generate_export_id() -> str:
    """Generate a random 5-digit alphanumeric identifier."""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=5))

# Find the most recent download folder
DATA_DIR = Path(__file__).parent.parent / "data"


def find_latest_download(folder_path: str | None = None) -> Path:
    """Find the most recent download folder or use specified path."""
    if folder_path:
        return Path(folder_path)

    folders = [f for f in DATA_DIR.iterdir() if f.is_dir()]
    if not folders:
        raise FileNotFoundError("No download folders found in data/")
    return max(folders, key=lambda f: f.stat().st_mtime)


def load_json(path: Path) -> Any:
    """Load a JSON file."""
    with open(path) as f:
        return json.load(f)


def extract_splits_from_stream(activity_id: str, streams: list) -> list[dict]:
    """
    Extract per-kilometer splits from activity streams.
    Returns list of {km, pace_min_per_km, avg_hr, avg_cadence, elevation_gain}
    """
    # Build a lookup by stream type
    stream_data = {s["type"]: s["data"] for s in streams}

    if "distance" not in stream_data or "time" not in stream_data:
        return []

    distance = stream_data["distance"]
    time = stream_data["time"]
    heartrate = stream_data.get("heartrate", [])
    cadence = stream_data.get("cadence", [])
    altitude = stream_data.get("altitude") or stream_data.get("fixed_altitude", [])

    splits = []
    km = 1
    last_idx = 0
    last_time = 0
    last_alt = altitude[0] if altitude else 0

    for i, dist in enumerate(distance):
        if dist >= km * 1000:
            # Calculate split metrics
            elapsed = time[i] - last_time
            pace = elapsed / 60  # minutes per km

            # Average HR for this split
            hr_slice = heartrate[last_idx:i+1] if heartrate else []
            avg_hr = sum(hr_slice) / len(hr_slice) if hr_slice else None

            # Average cadence for this split
            cad_slice = cadence[last_idx:i+1] if cadence else []
            avg_cad = sum(c for c in cad_slice if c) / len([c for c in cad_slice if c]) if cad_slice else None

            # Elevation gain for this split
            alt_slice = altitude[last_idx:i+1] if altitude else []
            elev_gain = 0
            if alt_slice:
                for j in range(1, len(alt_slice)):
                    if alt_slice[j] > alt_slice[j-1]:
                        elev_gain += alt_slice[j] - alt_slice[j-1]

            splits.append({
                "km": km,
                "pace_min_per_km": round(pace, 2),
                "avg_hr": round(avg_hr) if avg_hr else None,
                "avg_cadence": round(avg_cad) if avg_cad else None,
                "elevation_gain_m": round(elev_gain, 1)
            })

            last_idx = i
            last_time = time[i]
            km += 1

    return splits


def extract_peak_efforts(streams: list, activity_type: str) -> dict:
    """
    Extract peak efforts (best pace/power for various durations).
    Returns {peak_1min, peak_5min, peak_10min, peak_20min}
    """
    stream_data = {s["type"]: s["data"] for s in streams}

    if "time" not in stream_data:
        return {}

    time = stream_data["time"]
    velocity = stream_data.get("velocity_smooth", [])
    heartrate = stream_data.get("heartrate", [])

    if not velocity:
        return {}

    peaks = {}
    durations = [60, 300, 600, 1200]  # 1min, 5min, 10min, 20min
    duration_names = ["1min", "5min", "10min", "20min"]

    for dur, name in zip(durations, duration_names):
        best_pace = None
        best_hr = None

        # Sliding window to find best average
        for i in range(len(time)):
            # Find end of window
            end_idx = None
            for j in range(i, len(time)):
                if time[j] - time[i] >= dur:
                    end_idx = j
                    break

            if end_idx is None:
                break

            # Calculate average velocity in window
            window_vel = velocity[i:end_idx+1]
            avg_vel = sum(v for v in window_vel if v) / len([v for v in window_vel if v]) if window_vel else 0

            if avg_vel > 0:
                pace = (1000 / avg_vel) / 60  # min/km
                if best_pace is None or pace < best_pace:
                    best_pace = pace
                    if heartrate:
                        hr_window = heartrate[i:end_idx+1]
                        best_hr = sum(hr_window) / len(hr_window) if hr_window else None

        if best_pace:
            peaks[f"peak_{name}"] = {
                "pace_min_per_km": round(best_pace, 2),
                "avg_hr": round(best_hr) if best_hr else None
            }

    return peaks


def extract_hr_zones_detail(streams: list, hr_zones: list) -> dict:
    """
    Calculate detailed HR zone distribution from streams.
    """
    stream_data = {s["type"]: s["data"] for s in streams}
    heartrate = stream_data.get("heartrate", [])

    if not heartrate or not hr_zones:
        return {}

    zone_times = [0] * len(hr_zones)

    for hr in heartrate:
        if hr:
            for i, zone_max in enumerate(hr_zones):
                if hr < zone_max:
                    zone_times[i] += 1
                    break

    total = sum(zone_times)
    if total == 0:
        return {}

    return {
        f"zone_{i+1}_pct": round(100 * t / total, 1)
        for i, t in enumerate(zone_times) if t > 0
    }


def process_activity(activity: dict, streams: list | None) -> dict:
    """
    Process a single activity, extracting key metrics and stream summaries.
    """
    # Core fields to keep
    result = {
        "id": activity.get("id"),
        "date": activity.get("start_date_local", "")[:10],
        "time": activity.get("start_date_local", "")[11:16],
        "type": activity.get("type"),
        "name": activity.get("name"),
        "description": activity.get("description"),

        # Distance and time
        "distance_km": round(activity.get("distance", 0) / 1000, 2),
        "moving_time_min": round(activity.get("moving_time", 0) / 60, 1),
        "elapsed_time_min": round(activity.get("elapsed_time", 0) / 60, 1),

        # Pace/Speed
        "avg_pace_min_per_km": round((activity.get("moving_time", 0) / 60) / (activity.get("distance", 1) / 1000), 2) if activity.get("distance") else None,
        "avg_speed_kmh": round(activity.get("average_speed", 0) * 3.6, 1) if activity.get("average_speed") else None,
        "max_speed_kmh": round(activity.get("max_speed", 0) * 3.6, 1) if activity.get("max_speed") else None,
        "gap_pace": activity.get("gap"),  # Grade adjusted pace

        # Heart rate
        "avg_hr": activity.get("average_heartrate"),
        "max_hr": activity.get("max_heartrate"),
        "hr_zone_times_sec": activity.get("icu_hr_zone_times"),

        # Cadence
        "avg_cadence": round(activity.get("average_cadence", 0), 1) if activity.get("average_cadence") else None,

        # Elevation
        "elevation_gain_m": round(activity.get("total_elevation_gain", 0), 0),
        "elevation_loss_m": round(activity.get("total_elevation_loss", 0), 0),

        # Training metrics
        "training_load": activity.get("icu_training_load"),
        "trimp": round(activity.get("trimp", 0), 1) if activity.get("trimp") else None,
        "calories": activity.get("calories"),

        # Fitness context
        "ctl_fitness": round(activity.get("icu_ctl", 0), 1) if activity.get("icu_ctl") else None,
        "atl_fatigue": round(activity.get("icu_atl", 0), 1) if activity.get("icu_atl") else None,

        # Pace zones (time in each zone)
        "pace_zone_times_sec": activity.get("pace_zone_times"),

        # Device
        "device": activity.get("device_name"),

        # Flags
        "is_race": activity.get("race", False),
        "is_commute": activity.get("commute", False),
    }

    # Extract stream-based metrics if available
    if streams:
        # Per-km splits
        if activity.get("type") == "Run":
            splits = extract_splits_from_stream(activity["id"], streams)
            if splits:
                result["km_splits"] = splits

        # Peak efforts
        peaks = extract_peak_efforts(streams, activity.get("type", ""))
        if peaks:
            result["peak_efforts"] = peaks

    # Remove None values to keep JSON clean
    return {k: v for k, v in result.items() if v is not None}


def process_wellness(wellness: list) -> list[dict]:
    """
    Process wellness data, keeping key fields.
    """
    processed = []

    for day in wellness:
        record = {
            "date": day.get("id"),

            # Fitness/Fatigue
            "ctl_fitness": round(day.get("ctl", 0), 1),
            "atl_fatigue": round(day.get("atl", 0), 1),
            "tsb_form": round(day.get("ctl", 0) - day.get("atl", 0), 1),
            "ramp_rate": round(day.get("rampRate", 0), 2),
            "training_load": day.get("ctlLoad"),

            # Vitals
            "resting_hr": day.get("restingHR"),
            "hrv": day.get("hrv"),
            "hrv_sdnn": day.get("hrvSDNN"),
            "weight_kg": day.get("weight"),
            "vo2max": day.get("vo2max"),

            # Sleep
            "sleep_hours": round(day.get("sleepSecs", 0) / 3600, 1) if day.get("sleepSecs") else None,
            "sleep_score": day.get("sleepScore"),
            "sleep_quality": day.get("sleepQuality"),

            # Activity
            "steps": day.get("steps"),

            # Subjective
            "soreness": day.get("soreness"),
            "fatigue": day.get("fatigue"),
            "stress": day.get("stress"),
            "mood": day.get("mood"),
            "motivation": day.get("motivation"),
            "readiness": day.get("readiness"),

            # Sport-specific fitness
            "sport_info": day.get("sportInfo"),
        }

        # Remove None values
        processed.append({k: v for k, v in record.items() if v is not None})

    return processed


def process_calendar_events(events: list) -> list[dict]:
    """
    Process calendar events (planned workouts, notes).
    """
    processed = []

    for event in events:
        record = {
            "id": event.get("id"),
            "date": event.get("start_date_local", "")[:10],
            "type": event.get("type"),
            "category": event.get("category"),
            "name": event.get("name"),
            "description": event.get("description"),
            "planned_distance_km": round(event.get("distance", 0) / 1000, 2) if event.get("distance") else None,
            "planned_duration_min": round(event.get("moving_time", 0) / 60, 1) if event.get("moving_time") else None,
            "planned_load": event.get("icu_training_load"),
            "completed": event.get("paired_activity_id") is not None,
            "paired_activity_id": event.get("paired_activity_id"),
        }

        processed.append({k: v for k, v in record.items() if v is not None})

    return processed


def calculate_summary_stats(activities: list, wellness: list) -> dict:
    """
    Calculate overall summary statistics for the period.
    """
    runs = [a for a in activities if a.get("type") == "Run"]
    rides = [a for a in activities if a.get("type") in ["Ride", "VirtualRide"]]

    def sum_field(items, field):
        return sum(i.get(field, 0) or 0 for i in items)

    def avg_field(items, field):
        vals = [i.get(field) for i in items if i.get(field)]
        return round(sum(vals) / len(vals), 1) if vals else None

    # Date range
    dates = sorted([a.get("date") for a in activities if a.get("date")])
    wellness_dates = sorted([w.get("date") for w in wellness if w.get("date")])

    return {
        "period": {
            "start": dates[0] if dates else None,
            "end": dates[-1] if dates else None,
            "days": len(set(wellness_dates)),
        },
        "totals": {
            "activities": len(activities),
            "runs": len(runs),
            "rides": len(rides),
            "total_distance_km": round(sum_field(activities, "distance_km"), 1),
            "total_time_hours": round(sum_field(activities, "moving_time_min") / 60, 1),
            "total_elevation_m": round(sum_field(activities, "elevation_gain_m"), 0),
            "total_training_load": round(sum_field(activities, "training_load"), 0),
            "total_calories": round(sum_field(activities, "calories"), 0),
        },
        "running": {
            "count": len(runs),
            "distance_km": round(sum_field(runs, "distance_km"), 1),
            "time_hours": round(sum_field(runs, "moving_time_min") / 60, 1),
            "avg_pace_min_per_km": avg_field(runs, "avg_pace_min_per_km"),
            "avg_hr": avg_field(runs, "avg_hr"),
            "elevation_gain_m": round(sum_field(runs, "elevation_gain_m"), 0),
        },
        "cycling": {
            "count": len(rides),
            "distance_km": round(sum_field(rides, "distance_km"), 1),
            "time_hours": round(sum_field(rides, "moving_time_min") / 60, 1),
            "avg_speed_kmh": avg_field(rides, "avg_speed_kmh"),
            "avg_hr": avg_field(rides, "avg_hr"),
        },
        "fitness_trend": {
            "ctl_start": wellness[0].get("ctl_fitness") if wellness else None,
            "ctl_end": wellness[-1].get("ctl_fitness") if wellness else None,
            "ctl_change": round(wellness[-1].get("ctl_fitness", 0) - wellness[0].get("ctl_fitness", 0), 1) if len(wellness) >= 2 else None,
            "avg_resting_hr": avg_field(wellness, "resting_hr"),
            "avg_sleep_hours": avg_field(wellness, "sleep_hours"),
            "avg_steps": round(avg_field(wellness, "steps") or 0, 0),
        }
    }


def main():
    import sys

    # Accept folder path as command line argument
    folder_path = sys.argv[1] if len(sys.argv) > 1 else None

    # Find and load data
    folder = find_latest_download(folder_path)
    print(f"Loading data from: {folder}")

    activities = load_json(folder / "activities-detailed.json")
    wellness = load_json(folder / "wellness.json")
    calendar = load_json(folder / "calendar-events.json")
    athlete = load_json(folder / "athlete.json")

    # Load streams (optional, may be large)
    streams_file = folder / "activity-streams.json"
    streams = {}
    if streams_file.exists():
        print("Loading activity streams (this may take a moment)...")
        streams = load_json(streams_file)

    # Process data
    print("Processing activities...")
    processed_activities = []
    for activity in activities:
        activity_streams = streams.get(activity["id"], [])
        processed_activities.append(process_activity(activity, activity_streams))

    print("Processing wellness data...")
    processed_wellness = process_wellness(wellness)

    print("Processing calendar events...")
    processed_calendar = process_calendar_events(calendar)

    print("Calculating summary statistics...")
    summary = calculate_summary_stats(processed_activities, processed_wellness)

    # Build final output
    export_id = generate_export_id()
    output = {
        "export_id": export_id,
        "generated": datetime.now().isoformat(),
        "athlete": {
            "name": athlete.get("name"),
            "id": athlete.get("id"),
        },
        "summary": summary,
        "activities": sorted(processed_activities, key=lambda x: x.get("date", ""), reverse=True),
        "wellness": sorted(processed_wellness, key=lambda x: x.get("date", ""), reverse=True),
        "planned_workouts": [e for e in processed_calendar if e.get("category") == "WORKOUT"],
    }

    # Save output with export_id in filename
    output_file = folder / f"llm-ready-{export_id}.json"
    with open(output_file, "w") as f:
        json.dump(output, f, indent=2)

    # Print summary
    print(f"\n{'='*60}")
    print(f"OUTPUT SUMMARY - Export ID: {export_id}")
    print(f"{'='*60}")
    print(f"File: {output_file}")
    print(f"Size: {output_file.stat().st_size / 1024:.1f} KB")
    print(f"Export ID: {export_id}")
    print(f"\nContains:")
    print(f"  - {len(processed_activities)} activities with detailed metrics")
    print(f"  - {len(processed_wellness)} wellness records")
    print(f"  - {len(output['planned_workouts'])} planned workouts")
    print(f"  - Per-km splits for {sum(1 for a in processed_activities if 'km_splits' in a)} runs")
    print(f"  - Peak efforts for {sum(1 for a in processed_activities if 'peak_efforts' in a)} activities")
    print(f"\nSummary stats:")
    print(f"  - Period: {summary['period']['start']} to {summary['period']['end']}")
    print(f"  - Total distance: {summary['totals']['total_distance_km']} km")
    print(f"  - CTL change: {summary['fitness_trend']['ctl_start']} → {summary['fitness_trend']['ctl_end']}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
