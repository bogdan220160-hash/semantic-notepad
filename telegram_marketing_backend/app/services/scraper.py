from telethon import TelegramClient
from telethon.tl.functions.channels import JoinChannelRequest
from telethon.tl.functions.messages import ImportChatInviteRequest, CheckChatInviteRequest
from telethon.tl.functions.contacts import ResolveUsernameRequest
import logging
import re

logger = logging.getLogger(__name__)

async def scrape_group_members(client: TelegramClient, group_link: str, limit: int = 100, only_usernames: bool = False, active_only: bool = False):
    """
    Scrape members from a public group or private invite link.
    """
    print(f"DEBUG: Scraping link: {group_link}", flush=True)
    try:
        entity = None
        
        # Check for private invite link
        if "joinchat" in group_link or "+" in group_link:
            try:
                hash_val = group_link.split("+")[-1]
                if "joinchat" in group_link:
                    hash_val = group_link.split("joinchat/")[1].split("/")[0]
                
                print(f"DEBUG: Detected invite link, hash: {hash_val}")
                try:
                    await client(ImportChatInviteRequest(hash_val))
                    print("DEBUG: Joined via invite link")
                except Exception as e:
                    print(f"DEBUG: Join failed (maybe already member): {e}")
                    
                # Now get entity (it should be in dialogs now)
                # We might need to check updates or just search dialogs?
                # For now, let's try CheckChatInviteRequest to get the title/id
                invite_info = await client(CheckChatInviteRequest(hash_val))
                entity = invite_info.chat
            except Exception as e:
                print(f"DEBUG: Invite link processing failed: {e}")
                
        if not entity:
            # Check if group_link is an ID (integer)
            if group_link.lstrip('-').isdigit():
                try:
                    print(f"DEBUG: Resolving by ID: {group_link}")
                    entity = await client.get_entity(int(group_link))
                except Exception as e:
                    print(f"DEBUG: Failed to resolve by ID: {e}")

        if not entity:
            # Public username logic
            username = group_link
            if "t.me/" in username:
                username = username.split("t.me/")[-1]
            if "@" in username:
                username = username.replace("@", "")
            
            # Remove any query parameters or slashes
            username = username.split("?")[0].split("/")[0]
            
            print(f"DEBUG: Resolving username: {username}")
            
            try:
                entity = await client.get_entity(username)
            except ValueError:
                print("DEBUG: get_entity failed, trying ResolveUsernameRequest")
                try:
                    result = await client(ResolveUsernameRequest(username))
                    entity = result.chats[0]
                except Exception as e:
                    print(f"DEBUG: ResolveUsernameRequest failed: {e}")
                    raise ValueError(f"Could not resolve entity: {username}")

            # Try to join the group
            try:
                print(f"DEBUG: Joining group: {username}")
                await client(JoinChannelRequest(entity))
            except Exception as e:
                print(f"DEBUG: Could not join group (might already be member): {e}")

        if not entity:
             raise ValueError("Could not resolve entity")

        print(f"DEBUG: Entity resolved: {entity.id} - {getattr(entity, 'title', 'No Title')}")

        participants = []
        
        # Use iter_participants for optimized fetching
        # We don't pass 'limit' to iter_participants if we have filters, 
        # because we need 'limit' number of *matching* users, not just any users.
        # We handle the limit check manually in the loop.
        try:
            from telethon.tl.types import ChannelParticipantsSearch
            print("DEBUG: Starting iter_participants with ChannelParticipantsSearch('')")
            async for user in client.iter_participants(entity, filter=ChannelParticipantsSearch('')):
                if user.bot:
                    continue

                # Filter by username if requested
                if only_usernames and not user.username:
                    continue
                
                # Filter by active status if requested
                if active_only:
                    from telethon.tl.types import UserStatusOnline, UserStatusRecently
                    is_active = isinstance(user.status, (UserStatusOnline, UserStatusRecently))
                    if not is_active:
                        continue

                participants.append({
                    "id": user.id,
                    "username": user.username,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "phone": user.phone,
                    "status": str(user.status) # Debug info
                })
                
                if len(participants) >= limit:
                    break
        except Exception as e:
            print(f"DEBUG: iter_participants failed: {e}")
            import traceback
            traceback.print_exc()
            # Fallback to interaction scraping will happen if participants is empty

        # If no participants found (e.g. it's a Channel), try scraping interactions
        if not participants:
            print("DEBUG: No participants found via standard method. Trying interaction scraping (Reactions/Comments)...")
            participants = await scrape_channel_interactions(client, entity, limit, only_usernames, active_only)

        return participants
        
    except Exception as e:
        logger.error(f"Scraping error: {e}")
        print(f"DEBUG: Scraping error: {e}")
        raise e

async def scrape_channel_interactions(client: TelegramClient, entity, limit: int, only_usernames: bool, active_only: bool):
    """
    Scrape users who interacted with the channel (reactions, comments).
    """
    from telethon.tl.functions.messages import GetMessageReactionsListRequest
    from telethon.tl.types import InputPeerChannel
    
    participants = {} # Use dict to avoid duplicates: id -> user_dict
    
    # Get last 100 messages
    async for message in client.iter_messages(entity, limit=100):
        if len(participants) >= limit:
            break
            
        if not message:
            continue

        # 1. Check for reactions
        try:
            if message.reactions:
                # Get reactors
                # Note: This request might be limited by Telegram
                result = await client(GetMessageReactionsListRequest(
                    peer=entity,
                    id=message.id,
                    limit=100
                ))
                
                for user in result.users:
                    if user.id in participants:
                        continue
                    if user.bot:
                        continue
                    if only_usernames and not user.username:
                        continue
                        
                    # For reactors, we might not get full status immediately, but usually we do
                    if active_only:
                        from telethon.tl.types import UserStatusOnline, UserStatusRecently
                        is_active = isinstance(user.status, (UserStatusOnline, UserStatusRecently))
                        if not is_active:
                            continue
                            
                    participants[user.id] = {
                        "id": user.id,
                        "username": user.username,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "phone": user.phone,
                        "status": str(user.status)
                    }
        except Exception as e:
            print(f"DEBUG: Failed to get reactions for msg {message.id}: {e}")

        # 2. Check for comments (replies)
        # If the channel has a discussion group, messages have replies
        try:
            if message.replies and message.replies.replies > 0:
                async for reply in client.iter_messages(entity, reply_to=message.id, limit=50):
                    if not reply.sender:
                        continue
                    
                    # Sender might be a User or Channel (if commenting as channel)
                    # We only want Users
                    from telethon.tl.types import User
                    if isinstance(reply.sender, User):
                        user = reply.sender
                        if user.id in participants:
                            continue
                        if user.bot:
                            continue
                        if only_usernames and not user.username:
                            continue
                        
                        if active_only:
                            from telethon.tl.types import UserStatusOnline, UserStatusRecently
                            is_active = isinstance(user.status, (UserStatusOnline, UserStatusRecently))
                            if not is_active:
                                continue

                        participants[user.id] = {
                            "id": user.id,
                            "username": user.username,
                            "first_name": user.first_name,
                            "last_name": user.last_name,
                            "phone": user.phone,
                            "status": str(user.status)
                        }
        except Exception as e:
            print(f"DEBUG: Failed to get comments for msg {message.id}: {e}")
            
    return list(participants.values())[:limit]
