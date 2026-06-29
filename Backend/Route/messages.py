import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, HTTPException
from Schema.Schema import MessageCreate, MessageUpdate, MessageReaction
from Database.Supabase import supabase


router = APIRouter(prefix="/messages", tags=["Messages"])

@router.post('/newmsg')
def new_msg(message: MessageCreate):

    msg = {
        'user_id':message.user_id,
        'session_id': message.session_id,
        'sender': message.sender,
        'content': message.content
    }

    result = supabase.table('message_table').insert(msg).execute()

    return {
        'message': 'message created',
        'data': result.data
    }


@router.get('/session/{session_id}')
def all_msg(session_id: int):

    result = supabase.table('message_table') \
        .select('*') \
        .eq('session_id', session_id) \
        .order('id') \
        .execute()

    return {
        "messages": result.data
    }


@router.get('/{message_id}')
def get_msg(message_id: int):

    result = supabase.table('message_table') \
        .select('*') \
        .eq('id', message_id) \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Message not found")

    return result.data[0]


@router.put('/{message_id}')
def edit_msg(message_id: int, message: MessageUpdate):

    updated = supabase.table('message_table') \
        .update({'content': message.content}) \
        .eq('id', message_id) \
        .execute()

    if not updated.data:
        raise HTTPException(status_code=404, detail="Message not found")

    session_id = updated.data[0]['session_id']

    supabase.table('message_table') \
        .delete() \
        .eq('session_id', session_id) \
        .gt('id', message_id) \
        .execute()

    return {
        "message": "Message updated successfully"
    }


@router.delete('/{message_id}')
def delete(message_id: int):

    supabase.table('message_table') \
        .delete() \
        .eq('id', message_id) \
        .execute()

    return {
        "message": "Deleted successfully"
    }

@router.patch('/{message_id}/reaction')
def set_reaction(message_id: int, payload: MessageReaction):

    updated = supabase.table('message_table') \
        .update({'reaction': payload.reaction}) \
        .eq('id', message_id) \
        .execute()

    if not updated.data:
        raise HTTPException(status_code=404, detail="Message not found")

    return {
        "message": "Reaction updated successfully",
        "data": updated.data[0]
    }