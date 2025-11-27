/**
 * DAARION Messenger Types (Matrix-aware)
 */

export interface Channel {
  id: string;
  slug: string;
  name: string;
  description?: string;
  microdao_id: string;
  matrix_room_id: string;
  visibility: 'public' | 'private' | 'microdao';
  is_direct: boolean;
  is_encrypted: boolean;
  topic?: string;
  avatar_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

export interface Message {
  id: string;
  channel_id: string;
  matrix_event_id: string;
  sender_id: string;
  sender_type: 'human' | 'agent';
  content_preview: string;
  content_type: 'text' | 'image' | 'file' | 'audio' | 'video';
  thread_id?: string;
  edited_at?: string;
  deleted_at?: string;
  created_at: string;
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  member_id: string;
  member_type: 'human' | 'agent';
  matrix_user_id: string;
  role: 'owner' | 'admin' | 'member' | 'guest' | 'agent';
  can_read: boolean;
  can_write: boolean;
  can_invite: boolean;
  can_kick: boolean;
  can_create_tasks: boolean;
  matrix_power_level: number;
  invited_by?: string;
  joined_at: string;
  left_at?: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  reactor_id: string;
  reactor_type: 'human' | 'agent';
  emoji: string;
  matrix_event_id: string;
  created_at: string;
  removed_at?: string;
}

export interface ChannelCreateInput {
  slug: string;
  name: string;
  description?: string;
  microdao_id: string;
  visibility: 'public' | 'private' | 'microdao';
  is_encrypted?: boolean;
}

export interface MessageSendInput {
  text: string;
  msgtype?: 'm.text' | 'm.notice' | 'm.image' | 'm.file' | 'm.audio' | 'm.video';
  formatted_body?: string;
  reply_to?: string;
}

export interface MemberInviteInput {
  member_id: string;
  role?: 'owner' | 'admin' | 'member' | 'guest' | 'agent';
  can_read?: boolean;
  can_write?: boolean;
  can_invite?: boolean;
  can_create_tasks?: boolean;
}

export interface WebSocketMessage {
  type: 'message.created' | 'message.updated' | 'message.deleted' | 'member.joined' | 'member.left';
  message?: Message;
  member?: ChannelMember;
  channel_id?: string;
}




