import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, HTTPException
from Schema.Schema import SessionCreate,SessionUpdate
from Database.Supabase import supabase

router = APIRouter(prefix="/sessions", tags=["Sessions"])



@router.post('/newchat')
def new_chat(session:SessionCreate):
    chat={'user_id': session.user_id,
          'title':session.title}
    result=supabase.table("session_table").insert(chat).execute()
    return {
        "message": "Session created successfully",
        "session": result.data
    }

@router.get('/user/{user_id}')
def get_sessions(user_id:int):
    result=supabase.table('session_table').select('*').eq('user_id',user_id).order('id', desc=True).execute()
    return({'sessions':result.data})

@router.get('/{session_id}')
def get_session(session_id:int):
    result=supabase.table('session_table').select('*').eq('id',session_id).execute()
    if not result.data:
        raise HTTPException(status_code=404,detail="Not found")
    return result.data[0]

@router.put('/{session_id}')
def update_session(session_id:int,session:SessionUpdate):
    
    result=supabase.table('session_table').update({'title':session.title}).eq('id',session_id).execute()
    if not result.data:
        raise HTTPException(status_code=404,detail="Not found")
    
    return {
        "message": "Session updated successfully",
        "session": result.data[0]
    }


@router.delete('/{session_id}')
def delete_session(session_id:int):
    result=supabase.table('session_table').delete().eq('id',session_id).execute()
    if not result.data:
        raise HTTPException(status_code=404,detail="Not found")
    
    return {
        "message": "Session deleted successfully"
    }


