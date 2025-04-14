import { supabase } from '../lib/supabase'

export async function sendFriendRequest(senderId, receiverId) {
  try {
    // First check if a request already exists in either direction
    const { data: existingRequest, error: checkError } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)

    if (checkError && checkError.code !== 'PGRST116') throw checkError
    
    // If request exists, return it
    if (existingRequest?.length > 0) {
      return { data: existingRequest[0], error: null }
    }

    // If no request exists, create new one
    const { data, error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error sending friend request:', error)
    return { 
      data: null, 
      error: new Error(
        error.code === '23505' 
          ? 'Friend request already sent'
          : 'Failed to send friend request. Please try again.'
      )
    }
  }
}

export async function getFriendshipStatus(userId1, userId2) {
  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)

    if (error && error.code !== 'PGRST116') throw error
    
    // Return first request if exists
    return { data: data?.[0] || null, error: null }
  } catch (error) {
    console.error('Error getting friendship status:', error)
    return { data: null, error }
  }
}

export async function acceptFriendRequest(requestId) {
  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .update({ 
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error accepting friend request:', error)
    return { data: null, error }
  }
}

export async function rejectFriendRequest(requestId) {
  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .update({ 
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error rejecting friend request:', error)
    return { data: null, error }
  }
}

export async function getPendingFriendRequests(userId) {
  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .select('*, profiles:sender_id(*)')
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching friend requests:', error)
    return { data: [], error }
  }
}

let friendRequestSubscription = null

export function subscribeFriendRequests(userId, callback) {
  // Clean up existing subscription if any
  if (friendRequestSubscription) {
    friendRequestSubscription.unsubscribe()
    friendRequestSubscription = null
  }

  friendRequestSubscription = supabase
    .channel(`friend_requests:${userId}`)
    .on('postgres_changes', 
      { 
        event: '*',
        schema: 'public',
        table: 'friend_requests',
        filter: `or(sender_id.eq.${userId},receiver_id.eq.${userId})`
      }, 
      callback
    )
    .subscribe()

  return friendRequestSubscription
}