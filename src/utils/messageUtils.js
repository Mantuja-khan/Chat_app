import { supabase, waitForConnection, getChannel } from '../lib/supabase'
import { getSocket } from '../lib/socket'
import { showNotification } from './notificationUtils'
import { unhideContact } from './userUtils'
import { isUserBlocked } from './userUtils'

export async function getMessages(userId1, userId2) {
  if (!userId1 || !userId2) return { data: [], error: new Error('Invalid user IDs') }

  try {
    await waitForConnection()

    // Check if either user has blocked the other
    const isBlocked = await isUserBlocked(userId1, userId2)
    const isBlockedBy = await isUserBlocked(userId2, userId1)

    if (isBlocked || isBlockedBy) {
      return { data: [], error: null }
    }

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
      .order('created_at', { ascending: true })

    if (messagesError) throw messagesError

    // Mark messages as seen when fetched by receiver
    const unseenMessages = messages.filter(msg => 
      msg.receiver_id === userId1 && !msg.is_seen
    )

    if (unseenMessages.length > 0) {
      const { error: updateError } = await supabase
        .from('messages')
        .update({ is_seen: true })
        .in('id', unseenMessages.map(msg => msg.id))

      if (updateError) {
        console.error('Error marking messages as seen:', updateError)
      }

      // Emit message seen event through socket
      const socket = getSocket();
      if (socket) {
        socket.emit('messages_seen', {
          messageIds: unseenMessages.map(msg => msg.id),
          seenBy: userId1
        });
      }
    }

    const { data: deletions, error: deletionsError } = await supabase
      .from('message_deletions')
      .select('message_id')
      .eq('user_id', userId1)

    if (deletionsError && deletionsError.code !== 'PGRST204') {
      throw deletionsError
    }

    const deletedMessageIds = new Set((deletions || []).map(d => d.message_id))

    const filteredMessages = messages
      .filter(msg => !deletedMessageIds.has(msg.id))
      .map(msg => ({
        ...msg,
        deleted_for_everyone: msg.deleted_for_everyone,
        is_seen: msg.is_seen
      }))

    return { data: filteredMessages, error: null }
  } catch (error) {
    console.error('Error fetching messages:', error)
    return { data: [], error }
  }
}

export async function sendMessage(senderId, receiverId, content, type = 'text', imageUrl = null) {
  try {
    await waitForConnection()

    // Check if either user has blocked the other
    const isBlocked = await isUserBlocked(senderId, receiverId)
    const isBlockedBy = await isUserBlocked(receiverId, senderId)

    if (isBlocked || isBlockedBy) {
      throw new Error('Cannot send message: User is blocked')
    }

    // First unhide the contact if they were hidden
    await unhideContact(senderId, receiverId)

    const message = {
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      type,
      image_url: imageUrl,
      created_at: new Date().toISOString(),
      is_seen: false
    }

    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single()

    if (error) throw error

    // Emit new message through socket
    const socket = getSocket();
    if (socket) {
      socket.emit('new_message', data);
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error sending message:', error)
    return { data: null, error }
  }
}

export function subscribeToMessages(currentUserId, otherUserId, callback) {
  // Set up Socket.IO listeners
  const socket = getSocket();
  const socketListeners = {
    message_received: (message) => {
      if (
        (message.sender_id === currentUserId && message.receiver_id === otherUserId) ||
        (message.sender_id === otherUserId && message.receiver_id === currentUserId)
      ) {
        // Show notification for incoming messages
        if (message.sender_id === otherUserId) {
          handleIncomingMessage(message, otherUserId);
        }

        callback({
          eventType: 'INSERT',
          new: message
        });
      }
    },
    message_seen: ({ messageIds, seenBy }) => {
      if (seenBy === otherUserId) {
        callback({
          eventType: 'UPDATE',
          new: { is_seen: true }
        });
      }
    },
    message_deleted: (messageId) => {
      callback({
        eventType: 'DELETE',
        old: { id: messageId }
      });
    }
  };

  if (socket) {
    // Add socket listeners
    Object.entries(socketListeners).forEach(([event, handler]) => {
      socket.on(event, handler);
    });
  }

  // Set up Supabase subscription
  const channelName = `messages:${currentUserId}:${otherUserId}`;
  const channel = getChannel(channelName);

  const subscription = channel
    .on('postgres_changes', 
      { 
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `or(and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId}))`
      }, 
      (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new.deleted_for_everyone) {
          callback({
            ...payload,
            new: {
              ...payload.new,
              content: 'This message was deleted'
            }
          });
        } else {
          callback(payload);
        }
      }
    )
    .subscribe();

  // Return cleanup function
  return {
    unsubscribe: () => {
      if (socket) {
        Object.keys(socketListeners).forEach(event => {
          socket.off(event);
        });
      }
      if (subscription) {
        subscription.unsubscribe();
      }
    }
  };
}

async function handleIncomingMessage(message, senderId) {
  try {
    // Get sender's profile
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', senderId)
      .single();

    const senderName = senderProfile?.name || senderProfile?.email?.split('@')[0] || 'Someone';
    const notificationMessage = message.type === 'image' ? 
      '📷 Sent you an image' : 
      message.content.length > 50 ? 
        `${message.content.substring(0, 50)}...` : 
        message.content;

    showNotification(
      senderName,
      notificationMessage,
      message.sender_id
    );
  } catch (error) {
    console.error('Error handling incoming message:', error);
  }
}

export async function deleteMessage(messageId, type, userId) {
  try {
    await waitForConnection()

    if (type === 'everyone') {
      const { error } = await supabase
        .from('messages')
        .update({ deleted_for_everyone: true })
        .eq('id', messageId)
        .eq('sender_id', userId)

      if (error) throw error

      // Emit delete message through socket
      const socket = getSocket();
      if (socket) {
        socket.emit('delete_message', messageId);
      }
    } else {
      const { error } = await supabase
        .from('message_deletions')
        .insert({
          message_id: messageId,
          user_id: userId
        })

      if (error) throw error
    }

    return { error: null }
  } catch (error) {
    console.error('Error deleting message:', error)
    return { error }
  }
}

export async function deleteChat(currentUserId, otherUserId) {
  try {
    await waitForConnection()

    // Get all messages between the two users
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select('id')
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)

    if (fetchError) throw fetchError

    if (!messages || messages.length === 0) {
      return { error: null }
    }

    // Delete all messages between the users
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .in('id', messages.map(msg => msg.id))

    if (deleteError) throw deleteError

    // Clean up any message deletions
    const { error: cleanupError } = await supabase
      .from('message_deletions')
      .delete()
      .in('message_id', messages.map(msg => msg.id))

    if (cleanupError) throw cleanupError

    // Emit chat deleted through socket
    const socket = getSocket();
    if (socket) {
      socket.emit('chat_deleted', {
        userId: currentUserId,
        otherUserId
      });
    }

    return { error: null }
  } catch (error) {
    console.error('Error deleting chat:', error)
    return { error }
  }
}

export async function getLatestMessages(userId) {
  try {
    await waitForConnection()

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(1000) // Adjust limit as needed

    if (error) throw error

    // Group messages by conversation and get the latest for each
    const latestByConversation = data.reduce((acc, message) => {
      const otherId = message.sender_id === userId ? message.receiver_id : message.sender_id
      if (!acc[otherId] || new Date(message.created_at) > new Date(acc[otherId].created_at)) {
        acc[otherId] = message
      }
      return acc
    }, {})

    return { data: Object.values(latestByConversation), error: null }
  } catch (error) {
    console.error('Error fetching latest messages:', error)
    return { data: [], error }
  }
}

export function subscribeToNewMessages(userId, callback) {
  return supabase
    .channel(`messages:${userId}`)
    .on('postgres_changes', 
      { 
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `or(sender_id.eq.${userId},receiver_id.eq.${userId})`
      }, 
      (payload) => {
        callback(payload.new)
      }
    )
    .subscribe()
}

export function formatMessagePreview(message) {
  if (!message) return ''
  
  if (message.deleted_for_everyone) {
    return 'This message was deleted'
  }

  if (message.type === 'image') {
    return '📷 Image'
  }

  return message.content.length > 40 
    ? `${message.content.substring(0, 40)}...` 
    : message.content
}

export async function getUnreadMessageCount(userId, otherUserId) {
  try {
    await waitForConnection()

    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', otherUserId)
      .eq('receiver_id', userId)
      .eq('is_seen', false)

    if (error) throw error

    return { count: count || 0, error: null }
  } catch (error) {
    console.error('Error getting unread message count:', error)
    return { count: 0, error }
  }
}