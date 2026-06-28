from fastapi import APIRouter, HTTPException
from Schema.Schema import JournalEntryCreate, JournalEntryUpdate
from Database.Supabase import supabase

router = APIRouter(prefix="/journals", tags=["Journals"])


def normalize_date(value: str) -> str:
    if not value:
        return value
    return str(value)[:10]


def serialize_journal(row: dict) -> dict:
    if not row:
        return row
    serialized = dict(row)
    if serialized.get("entry_date"):
        serialized["entry_date"] = normalize_date(serialized["entry_date"])
    return serialized


@router.get("/user/{user_id}")
def get_user_journals(user_id: int):
    result = (
        supabase.table("journal_log")
        .select("*")
        .eq("user_id", user_id)
        .order("entry_date", desc=True)
        .execute()
    )
    return {"journals": [serialize_journal(row) for row in result.data]}


@router.post("/")
def create_journal(entry: JournalEntryCreate):
    existing = (
        supabase.table("journal_log")
        .select("*")
        .eq("user_id", entry.user_id)
        .execute()
    )
    for row in existing.data or []:
        if normalize_date(row.get("entry_date", "")) == normalize_date(entry.entry_date):
            result = (
                supabase.table("journal_log")
                .update({
                    "content": entry.content,
                    "session_id": entry.session_id,
                })
                .eq("id", row["id"])
                .execute()
            )
            if not result.data:
                raise HTTPException(status_code=400, detail="Failed to update journal entry")
            return {"message": "Journal updated", "data": serialize_journal(result.data[0])}

    payload = {
        "user_id": entry.user_id,
        "session_id": entry.session_id,
        "entry_date": normalize_date(entry.entry_date),
        "content": entry.content,
    }
    result = supabase.table("journal_log").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to save journal entry")
    return {"message": "Journal saved", "data": serialize_journal(result.data[0])}


@router.put("/{entry_id}")
def update_journal(entry_id: int, entry: JournalEntryUpdate):
    existing = supabase.table("journal_log").select("user_id").eq("id", entry_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    if existing.data[0]["user_id"] != entry.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this entry")

    result = (
        supabase.table("journal_log")
        .update({"content": entry.content})
        .eq("id", entry_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    return {"message": "Journal updated", "data": serialize_journal(result.data[0])}

@router.delete("/{entry_id}")
def delete_journal(entry_id: int, user_id: int):
    existing = supabase.table("journal_log").select("user_id").eq("id", entry_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    if existing.data[0]["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this entry")

    result = supabase.table("journal_log").delete().eq("id", entry_id).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to delete journal entry")
    return {"message": "Journal deleted", "data": serialize_journal(result.data[0])}
