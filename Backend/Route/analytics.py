from fastapi import APIRouter, HTTPException, Query
from Database.Supabase import supabase
from datetime import datetime, timedelta, timezone
from collections import Counter
import re

def parse_date_safely(raw_val):
    if not raw_val:
        return None
    val_str = str(raw_val).strip()
    
    # 1. Matches ISO format: YYYY-MM-DD
    match_iso = re.match(r'^(\d{4})-(\d{2})-(\d{2})', val_str)
    if match_iso:
        return f"{match_iso.group(1)}-{match_iso.group(2)}-{match_iso.group(3)}"
        
    # 2. Matches slash DD/MM/YYYY
    match_slash_d = re.match(r'^(\d{2})/(\d{2})/(\d{4})', val_str)
    if match_slash_d:
        return f"{match_slash_d.group(3)}-{match_slash_d.group(2)}-{match_slash_d.group(1)}"
        
    # 3. Matches slash YYYY/MM/DD
    match_slash_y = re.match(r'^(\d{4})/(\d{2})/(\d{2})', val_str)
    if match_slash_y:
        return f"{match_slash_y.group(1)}-{match_slash_y.group(2)}-{match_slash_y.group(3)}"
        
    # Fallback: take first 10 characters
    return val_str[:10]

router = APIRouter(prefix="/analytics", tags=["Analytics"])

def calculate_raw_emotions(user_id: int, days: int):
    """Fallback: Calculate emotions on-the-fly from message_table if no snapshot exists."""
    query = supabase.table("message_table") \
        .select("emotions_label, emotions_score") \
        .eq("user_id", user_id) \
        .eq("sender", "user")
    
    if days > 0:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        query = query.gte("created_at", cutoff)
        
    result = query.execute()
    
    if not result.data:
        return {"emotions": {}, "dominant": "neutral", "total": 0}
        
    emotions = [r["emotions_label"] for r in result.data if r.get("emotions_label")]
    total = len(emotions)
    
    if total == 0:
        return {"emotions": {}, "dominant": "neutral", "total": 0}
        
    counts = dict(Counter(emotions))
    dominant = max(counts, key=counts.get)
    
    return {
        "emotions": counts,
        "dominant": dominant,
        "total": total
    }

def calculate_raw_stress(user_id: int, days: int):
    """Fallback: Calculate stress on-the-fly from message_table if no snapshot exists."""
    query = supabase.table("message_table") \
        .select("stress_level, stress_score") \
        .eq("user_id", user_id) \
        .eq("sender", "user")
        
    if days > 0:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        query = query.gte("created_at", cutoff)
        
    result = query.execute()
    
    if not result.data:
        return {
            "stress": {"Normal": 0, "Anxiety": 0, "Depression": 0, "Suicidal": 0},
            "wellness_score": 100.0,
            "total": 0
        }
        
    stress_levels = [r["stress_level"] for r in result.data if r.get("stress_level")]
    total = len(stress_levels)
    
    counts = {
        "Normal": stress_levels.count("Normal"),
        "Anxiety": stress_levels.count("Anxiety"),
        "Depression": stress_levels.count("Depression"),
        "Suicidal": stress_levels.count("Suicidal")
    }
    
    # Calculate wellness score: Normal=1.0, Anxiety=0.6, Depression=0.3, Suicidal=0.0
    if total > 0:
        score = (counts["Normal"] * 100.0 + counts["Anxiety"] * 60.0 + counts["Depression"] * 30.0) / total
        wellness_score = round(score, 1)
    else:
        wellness_score = 100.0
        
    return {
        "stress": counts,
        "wellness_score": wellness_score,
        "total": total
    }

@router.get("/user/{user_id}/emotions")
def get_user_emotions(user_id: int, days: int = Query(7)):
    try:
        # Try fetching from pre-computed snapshots first
        cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
        
        snapshot_data = []
        try:
            query = supabase.table("analytics_snapshot") \
                .select("emotion_counts, avg_emotion_score") \
                .eq("user_id", user_id)
                
            if days > 0:
                query = query.gte("snapshot_date", cutoff_date)
                
            snapshot_result = query.execute()
            snapshot_data = snapshot_result.data or []
        except Exception as e:
            print(f"Warning: Failed to fetch emotion snapshots from DB: {e}")
            snapshot_data = []
            
        # If no snapshot rows exist, fall back to calculating on-the-fly
        if not snapshot_data:
            return calculate_raw_emotions(user_id, days)
            
        # Combine snapshots
        total_counts = Counter()
        scores = []
        for row in snapshot_data:
            if row.get("emotion_counts"):
                total_counts.update(row["emotion_counts"])
            if row.get("avg_emotion_score") is not None:
                scores.append(row["avg_emotion_score"])
                
        total = sum(total_counts.values())
        if total == 0:
            return calculate_raw_emotions(user_id, days)
            
        dominant = max(total_counts, key=total_counts.get) if total_counts else "neutral"
        
        return {
            "emotions": dict(total_counts),
            "dominant": dominant,
            "total": total
        }
    except Exception as e:
        print(f"Analytics query error: {e}")
        # Fall back to raw calculation on any database schema issue
        return calculate_raw_emotions(user_id, days)

@router.get("/user/{user_id}/stress")
def get_user_stress(user_id: int, days: int = Query(7)):
    try:
        cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
        
        snapshot_data = []
        try:
            query = supabase.table("analytics_snapshot") \
                .select("stress_counts, wellness_score") \
                .eq("user_id", user_id)
                
            if days > 0:
                query = query.gte("snapshot_date", cutoff_date)
                
            snapshot_result = query.execute()
            snapshot_data = snapshot_result.data or []
        except Exception as e:
            print(f"Warning: Failed to fetch stress snapshots from DB: {e}")
            snapshot_data = []
            
        if not snapshot_data:
            return calculate_raw_stress(user_id, days)
            
        stress_totals = Counter()
        weighted_scores = []
        for row in snapshot_data:
            if row.get("stress_counts"):
                stress_totals.update(row["stress_counts"])
            if row.get("wellness_score") is not None:
                weighted_scores.append(row["wellness_score"])
                
        total = sum(stress_totals.values())
        if total == 0:
            return calculate_raw_stress(user_id, days)
            
        avg_wellness = round(sum(weighted_scores) / len(weighted_scores), 1) if weighted_scores else 100.0
        
        return {
            "stress": dict(stress_totals),
            "wellness_score": avg_wellness,
            "total": total
        }
    except Exception as e:
        print(f"Analytics query error: {e}")
        return calculate_raw_stress(user_id, days)

@router.get("/user/{user_id}/sessions-summary")
def get_user_sessions_summary(user_id: int):
    try:
        # Total sessions
        sess_result = supabase.table("session_table") \
            .select("id") \
            .eq("user_id", user_id) \
            .execute()
        total_sessions = len(sess_result.data) if sess_result.data else 0
        
        # Total messages
        msg_result = supabase.table("message_table") \
            .select("id") \
            .eq("user_id", user_id) \
            .eq("sender", "user") \
            .execute()
        total_messages = len(msg_result.data) if msg_result.data else 0
        
        # Fallback: if raw tables return 0, try analytics_snapshot for historical data
        if total_sessions == 0 and total_messages == 0:
            try:
                snap_result = supabase.table("analytics_snapshot") \
                    .select("snapshot_date, message_count") \
                    .eq("user_id", user_id) \
                    .execute()
                snap_data = snap_result.data or []
                if snap_data:
                    # Unique snapshot dates ≈ number of active session days
                    unique_dates = set(r["snapshot_date"] for r in snap_data if r.get("snapshot_date"))
                    total_sessions = len(unique_dates)
                    total_messages = sum(r.get("message_count", 0) for r in snap_data)
            except Exception as e:
                print(f"Warning: analytics_snapshot fallback failed: {e}")
        
        avg_messages = round(total_messages / total_sessions, 1) if total_sessions > 0 else 0
        
        # Generate raw daily messages count for sparkline (last 30 days)
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).date().isoformat()
        daily_msgs_result = supabase.table("message_table") \
            .select("created_at") \
            .eq("user_id", user_id) \
            .eq("sender", "user") \
            .gte("created_at", cutoff) \
            .execute()
        
        sparkline_counts = {}
        for r in daily_msgs_result.data or []:
            date_str = r["created_at"][:10]
            sparkline_counts[date_str] = sparkline_counts.get(date_str, 0) + 1
        
        # If sparkline is empty, also try analytics_snapshot for sparkline data
        if not sparkline_counts:
            try:
                snap_spark = supabase.table("analytics_snapshot") \
                    .select("snapshot_date, message_count") \
                    .eq("user_id", user_id) \
                    .gte("snapshot_date", cutoff) \
                    .execute()
                for r in snap_spark.data or []:
                    d = r.get("snapshot_date")
                    if d:
                        sparkline_counts[d] = sparkline_counts.get(d, 0) + r.get("message_count", 0)
            except Exception:
                pass
            
        # Compile lists
        sparkline = []
        for i in range(30):
            d = (datetime.now(timezone.utc) - timedelta(days=29 - i)).date().isoformat()
            sparkline.append(sparkline_counts.get(d, 0))
            
        return {
            "total_sessions": total_sessions,
            "active_sessions": total_sessions, # simple fallback
            "total_messages": total_messages,
            "avg_messages_per_session": avg_messages,
            "sparkline": sparkline
        }
    except Exception as e:
        print(f"Summary query error: {e}")
        return {
            "total_sessions": 0,
            "active_sessions": 0,
            "total_messages": 0,
            "avg_messages_per_session": 0,
            "sparkline": [0] * 30
        }

@router.get("/user/{user_id}/weekly-summary")
def get_user_weekly_summary(user_id: int):
    try:
        # Load last 8 weeks of snapshots
        cutoff = (datetime.now(timezone.utc) - timedelta(weeks=8)).date().isoformat()
        
        snapshot_data = []
        try:
            snapshot_result = supabase.table("analytics_snapshot") \
                .select("snapshot_date, emotion_counts, wellness_score, message_count") \
                .eq("user_id", user_id) \
                .gte("snapshot_date", cutoff) \
                .order("snapshot_date") \
                .execute()
            snapshot_data = snapshot_result.data or []
        except Exception as e:
            print(f"Warning: Failed to fetch weekly summary snapshots from DB: {e}")
            snapshot_data = []
            
        weeks_data = []
        heatmap_grid = [[0]*7 for _ in range(8)]
        today = datetime.now(timezone.utc)
        
        cutoff_heatmap = (today - timedelta(days=56)).date().isoformat()
        msg_heatmap = supabase.table("message_table") \
            .select("created_at, emotions_label, emotions_score, stress_level") \
            .eq("user_id", user_id) \
            .eq("sender", "user") \
            .gte("created_at", cutoff_heatmap) \
            .execute()
            
        heatmap_counts = {}
        for r in msg_heatmap.data or []:
            date_str = parse_date_safely(r.get("created_at"))
            if date_str:
                heatmap_counts[date_str] = heatmap_counts.get(date_str, 0) + 1
            
        # Align rows to start exactly on Monday of each week
        current_monday = (today - timedelta(days=today.weekday())).date()
        start_of_heatmap = current_monday - timedelta(weeks=7)
        
        for wi in range(8):
            w_start = start_of_heatmap + timedelta(weeks=wi)
            for di in range(7):
                target_d = (w_start + timedelta(days=di)).isoformat()
                heatmap_grid[wi][di] = heatmap_counts.get(target_d, 0)
        
        # 2. Check pre-computed snapshots
        if not snapshot_data:
            # Fallback: Calculate weekly data on-the-fly from raw messages
            raw_weeks = []
            for i in range(8):
                w_start = start_of_heatmap + timedelta(weeks=i)
                w_end = w_start + timedelta(days=6)
                
                # Find messages inside this week
                week_msgs = []
                for r in (msg_heatmap.data or []):
                    d_str = parse_date_safely(r.get("created_at"))
                    if d_str and w_start.isoformat() <= d_str <= w_end.isoformat():
                        week_msgs.append(r)
                        
                w_emotions = Counter()
                w_wellness = []
                w_msg = 0
                
                for r in week_msgs:
                    label = r.get("emotions_label")
                    if label:
                        w_emotions[label] += 1
                    stress = r.get("stress_level")
                    if stress:
                        # Normal=100.0, Anxiety=60.0, Depression=30.0, Suicidal=0.0
                        val = 100.0 if stress == "Normal" else 60.0 if stress == "Anxiety" else 30.0 if stress == "Depression" else 0.0
                        w_wellness.append(val)
                    w_msg += 1
                    
                top_3 = dict(w_emotions.most_common(3)) if w_emotions else {"neutral": 0}
                avg_well = round(sum(w_wellness) / len(w_wellness), 1) if w_wellness else 100.0
                
                raw_weeks.append({
                    "week_start": w_start.isoformat(),
                    "top_emotions": top_3,
                    "wellness_score": avg_well,
                    "message_count": w_msg
                })
                
            # Generate insights from raw_weeks
            this_week = raw_weeks[-1]
            prev_week = raw_weeks[-2] if len(raw_weeks) > 1 else this_week
            
            ins_emotion = "neutral"
            if this_week["top_emotions"]:
                ins_emotion = list(this_week["top_emotions"].keys())[0]
                
            change_val = this_week["message_count"] - prev_week["message_count"]
            pct_change = f"{'+' if change_val >= 0 else ''}{round(change_val / max(prev_week['message_count'], 1) * 100)}%"
            
            stress_change_val = this_week["wellness_score"] - prev_week["wellness_score"]
            stress_dir = "improved" if stress_change_val >= 0 else "declined"
            stress_pct = f"{abs(round(stress_change_val))}%"
            
            return {
                "weeks": raw_weeks,
                "heatmap": heatmap_grid,
                "insight": {
                    "emotion_change": pct_change,
                    "emotion_label": ins_emotion,
                    "stress_change": stress_pct,
                    "stress_direction": stress_dir
                }
            }
        # Parse real database records
        snapshots = snapshot_data
        
        # Build weekly objects
        for i in range(8):
            w_start = (today - timedelta(weeks=7-i)).date()
            w_end = w_start + timedelta(days=6)
            
            # Find snapshots inside this week
            week_snaps = [s for s in snapshots if w_start.isoformat() <= s["snapshot_date"] <= w_end.isoformat()]
            
            w_emotions = Counter()
            w_wellness = []
            w_msg = 0
            
            for s in week_snaps:
                if s.get("emotion_counts"):
                    w_emotions.update(s["emotion_counts"])
                if s.get("wellness_score") is not None:
                    w_wellness.append(s["wellness_score"])
                w_msg += s.get("message_count", 0)
                
            top_3 = dict(w_emotions.most_common(3)) if w_emotions else {"neutral": 0}
            avg_well = round(sum(w_wellness) / len(w_wellness), 1) if w_wellness else 100.0
            
            weeks_data.append({
                "week_start": w_start.isoformat(),
                "top_emotions": top_3,
                "wellness_score": avg_well,
                "message_count": w_msg
            })
            
        # Generate comparisons
        this_week = weeks_data[-1]
        prev_week = weeks_data[-2] if len(weeks_data) > 1 else this_week
        
        ins_emotion = "neutral"
        if this_week["top_emotions"]:
            ins_emotion = list(this_week["top_emotions"].keys())[0]
            
        change_val = this_week["message_count"] - prev_week["message_count"]
        pct_change = f"{'+' if change_val >= 0 else ''}{round(change_val / max(prev_week['message_count'], 1) * 100)}%"
        
        stress_change_val = this_week["wellness_score"] - prev_week["wellness_score"]
        stress_dir = "improved" if stress_change_val >= 0 else "declined"
        stress_pct = f"{abs(round(stress_change_val))}%"
        
        return {
            "weeks": weeks_data,
            "heatmap": heatmap_grid,
            "insight": {
                "emotion_change": pct_change,
                "emotion_label": ins_emotion,
                "stress_change": stress_pct,
                "stress_direction": stress_dir
            }
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Weekly query error: {e}")
        # Default empty return
        return {
            "weeks": [],
            "heatmap": [[0]*7 for _ in range(8)],
            "insight": {
                "emotion_change": "0%",
                "emotion_label": "stable",
                "stress_change": "0%",
                "stress_direction": "stable"
            }
        }
