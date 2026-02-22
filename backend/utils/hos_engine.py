DRIVING_MPH = 50
MAX_DRIVING_MINUTES_PER_DAY = 11 * 60
MAX_SHIFT_MINUTES_PER_DAY = 14 * 60
MINUTES_PER_DAY = 24 * 60


def _to_minutes(hours):
    return int(round(hours * 60))


def _miles_to_minutes(miles):
    hours = (miles or 0) / DRIVING_MPH
    return _to_minutes(hours)


def _segment_miles(stops, idx):
    current = stops[idx]
    nxt = stops[idx + 1]
    current_mile = current.get("mile")
    next_mile = nxt.get("mile")
    if current_mile is None or next_mile is None:
        return 0.0
    return max(0.0, float(next_mile) - float(current_mile))


def _abbr_from_label(label):
    if not label:
        return "LOC"

    token = ""
    for part in str(label).split():
        letters = "".join(ch for ch in part if ch.isalpha())
        if letters:
            token = letters
            break

    if not token:
        return "LOC"
    return token[:3].upper()


def _remark_abbr(stop):
    stop_type = str(stop.get("type", "")).lower()
    if stop_type in {"break", "fuel"}:
        mile = stop.get("mile")
        if mile is None:
            return "LOC"
        return f"MI{int(round(float(mile)))}"

    return _abbr_from_label(stop.get("label"))


def _reason_from_stop(stop):
    stop_type = str(stop.get("type", "")).lower()
    explicit_reason = stop.get("reason")
    if explicit_reason:
        return str(explicit_reason)

    if stop_type == "pickup":
        return "Pre-trip"
    if stop_type == "break":
        return "30-min break"
    if stop_type == "fuel":
        return "Fuel"
    if stop_type == "dropoff":
        return "Post-trip"
    return "Stop"


def _remark_duration_minutes(stop):
    stop_type = str(stop.get("type", "")).lower()
    explicit_duration = stop.get("duration_minutes")
    if explicit_duration is not None:
        try:
            return int(explicit_duration)
        except (TypeError, ValueError):
            pass

    if stop_type == "fuel" and stop.get("combined_break"):
        return 45
    if stop_type == "pickup":
        return 60
    if stop_type == "dropoff":
        return 60
    if stop_type == "break":
        return 30
    if stop_type == "fuel":
        return 15
    return 30


def generate_hos_logs(route, stops):
    route = route or {}
    stops = stops or []

    days = []
    day_number = 1
    current_minute = 0
    driving_today = 0
    shift_today = 0
    events = []
    remarks = []

    def push_event(status, duration):
        nonlocal current_minute, driving_today, shift_today
        if duration <= 0:
            return

        start = current_minute
        end = min(MINUTES_PER_DAY, current_minute + duration)
        actual_duration = end - start
        if actual_duration <= 0:
            return

        if events and events[-1]["status"] == status and events[-1]["end_minute"] == start:
            events[-1]["end_minute"] = end
        else:
            events.append(
                {
                    "status": status,
                    "start_minute": start,
                    "end_minute": end,
                }
            )

        if status == "driving":
            driving_today += actual_duration
            shift_today += actual_duration
        elif status == "on_duty":
            shift_today += actual_duration

        current_minute = end

    def close_day_if_needed():
        nonlocal day_number, current_minute, driving_today, shift_today, events, remarks
        if current_minute < MINUTES_PER_DAY:
            push_event("off_duty", MINUTES_PER_DAY - current_minute)

        days.append({"day": day_number, "events": events, "remarks": remarks})

        day_number += 1
        current_minute = 0
        driving_today = 0
        shift_today = 0
        events = []
        remarks = []

    def ensure_current_day():
        if current_minute >= MINUTES_PER_DAY:
            close_day_if_needed()

    def add_stop_remark(stop):
        ensure_current_day()
        if not isinstance(stop, dict):
            return
        stop_type = str(stop.get("type", "")).lower() or "stop"
        start_minute = current_minute
        end_minute = min(MINUTES_PER_DAY, start_minute + _remark_duration_minutes(stop))

        remarks.append(
            {
                "minute": start_minute,
                "start_minute": start_minute,
                "end_minute": end_minute,
                "abbr": _remark_abbr(stop),
                "stop_type": stop_type,
                "reason": _reason_from_stop(stop),
                "lng": stop.get("lng"),
                "lat": stop.get("lat"),
            }
        )

    def schedule_off_duty(minutes):
        remaining = minutes
        while remaining > 0:
            if current_minute >= MINUTES_PER_DAY:
                close_day_if_needed()
                continue
            available = MINUTES_PER_DAY - current_minute
            chunk = min(remaining, available)
            push_event("off_duty", chunk)
            remaining -= chunk
            if current_minute >= MINUTES_PER_DAY and remaining > 0:
                close_day_if_needed()

    def schedule_on_duty(minutes):
        remaining = minutes
        while remaining > 0:
            if current_minute >= MINUTES_PER_DAY:
                close_day_if_needed()
                continue

            on_duty_left = MAX_SHIFT_MINUTES_PER_DAY - shift_today
            day_left = MINUTES_PER_DAY - current_minute
            allowed = min(remaining, on_duty_left, day_left)

            if allowed <= 0:
                close_day_if_needed()
                continue

            push_event("on_duty", allowed)
            remaining -= allowed

            if remaining > 0 and (shift_today >= MAX_SHIFT_MINUTES_PER_DAY or current_minute >= MINUTES_PER_DAY):
                close_day_if_needed()

    def schedule_driving(minutes):
        remaining = minutes
        while remaining > 0:
            if current_minute >= MINUTES_PER_DAY:
                close_day_if_needed()
                continue

            driving_left = MAX_DRIVING_MINUTES_PER_DAY - driving_today
            shift_left = MAX_SHIFT_MINUTES_PER_DAY - shift_today
            day_left = MINUTES_PER_DAY - current_minute
            allowed = min(remaining, driving_left, shift_left, day_left)

            if allowed <= 0:
                close_day_if_needed()
                continue

            push_event("driving", allowed)
            remaining -= allowed

            if remaining > 0 and (
                driving_today >= MAX_DRIVING_MINUTES_PER_DAY
                or shift_today >= MAX_SHIFT_MINUTES_PER_DAY
                or current_minute >= MINUTES_PER_DAY
            ):
                close_day_if_needed()

    pickup_stop = stops[0] if stops else {"type": "pickup", "mile": 0}
    add_stop_remark(pickup_stop)
    schedule_on_duty(60)

    if len(stops) >= 2:
        for idx in range(len(stops) - 1):
            miles = _segment_miles(stops, idx)
            schedule_driving(_miles_to_minutes(miles))

            next_stop = stops[idx + 1]
            stop_type = next_stop.get("type")
            if stop_type == "break":
                add_stop_remark(next_stop)
                schedule_off_duty(30)
            elif stop_type == "fuel":
                add_stop_remark(next_stop)
                schedule_on_duty(20)
            elif stop_type == "dropoff":
                add_stop_remark(next_stop)
    else:
        schedule_driving(_miles_to_minutes(route.get("distance_miles", 0)))

    if not stops:
        add_stop_remark(
            {
                "type": "dropoff",
                "mile": route.get("distance_miles"),
            }
        )

    if stops and str(stops[-1].get("type", "")).lower() != "dropoff":
        add_stop_remark({"type": "dropoff", "mile": route.get("distance_miles")})

    schedule_on_duty(60)

    close_day_if_needed()
    return days
