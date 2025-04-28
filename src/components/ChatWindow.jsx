import React, { useState, useEffect, useRef } from 'react'
import { BsArrowLeft } from 'react-icons/bs'
import { supabase } from '../lib/supabase'
import ChatHeader from './ChatHeader'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import EmptyChatState from './EmptyChatState'
import { getMessages, subscribeToMessages } from '../utils/messageUtils'
import { isUserBlocked } from '../utils/userUtils'
import ErrorMessage from './ErrorMessage'
import { emitActiveChatUser } from '../lib/socket'

export default function ChatWindow({ currentUser, selectedUser, onBack, isMobile }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isBlocked, setIsBlocked] = useState(false)
  const messageSubscription = useRef(null)

  useEffect(() => {
    let mounted = true

    if (selectedUser) {
      fetchMessages()
      checkBlockStatus()
      
      if (messageSubscription.current) {
        messageSubscription.current.unsubscribe()
        messageSubscription.current = null
      }

      emitActiveChatUser(currentUser.id, selectedUser.id)

      messageSubscription.current = subscribeToMessages(
        currentUser.id, 
        selectedUser.id, 
        (payload) => {
          if (!mounted) return
          handleMessageUpdate(payload)
        }
      )

      // Mark messages as seen when chat window is opened
      markMessagesAsSeen()
    }

    return () => {
      mounted = false
      if (messageSubscription.current) {
        messageSubscription.current.unsubscribe()
        messageSubscription.current = null
      }
      emitActiveChatUser(currentUser.id, null)
    }
  }, [selectedUser?.id])

  const markMessagesAsSeen = async () => {
    if (!selectedUser) return

    const { error } = await supabase
      .from('messages')
      .update({ is_seen: true })
      .eq('sender_id', selectedUser.id)
      .eq('receiver_id', currentUser.id)
      .eq('is_seen', false)

    if (error) {
      console.error('Error marking messages as seen:', error)
    }
  }

  const checkBlockStatus = async () => {
    if (!selectedUser) return
    const blocked = await isUserBlocked(currentUser.id, selectedUser.id)
    setIsBlocked(blocked)
  }

  const handleMessageUpdate = (payload) => {
    if (payload.eventType === 'DELETE') {
      setMessages(prev => prev.filter(msg => msg.id !== payload.old.id))
    } else if (payload.eventType === 'UPDATE' && payload.new.deleted_for_everyone) {
      setMessages(prev => prev.map(msg => 
        msg.id === payload.new.id 
          ? { ...msg, deleted_for_everyone: true, content: 'This message was deleted' }
          : msg
      ))
    } else if (payload.eventType === 'INSERT') {
      setMessages(prev => [...prev, payload.new].sort((a, b) => 
        new Date(a.created_at) - new Date(b.created_at)
      ))
      // Mark message as seen immediately if it's from the other user
      if (payload.new.sender_id === selectedUser.id) {
        markMessagesAsSeen()
      }
    }
  }

  const fetchMessages = async () => {
    if (!selectedUser) return
    
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await getMessages(currentUser.id, selectedUser.id)
      
      if (error) throw error
      setMessages(data)
    } catch (error) {
      console.error('Error fetching messages:', error)
      setError('Unable to load messages. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleMessageSent = (newMessage) => {
    setMessages(prev => [...prev, newMessage].sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    ))
  }

  if (!selectedUser) {
    return <EmptyChatState />
  }

  return (
    <div className="flex-1 flex flex-col bg-[#efeae2] dark:bg-gray-900 relative">
      <div className="flex items-center bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
        {isMobile && (
          <button
            onClick={onBack}
            className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            aria-label="Back to chat list"
          >
            <BsArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
        )}
        <div className="flex-1">
          <ChatHeader 
            user={selectedUser} 
            currentUserId={currentUser.id}
            showOnlineStatus={!isBlocked}
          />
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchMessages} />}
      
      <div className="flex-1 overflow-y-auto">
        <MessageList 
          messages={messages}
          currentUserId={currentUser.id}
          loading={loading}
        />
      </div>
      
      <div className="sticky bottom-0 w-full bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        <MessageInput 
          currentUser={currentUser}
          selectedUser={selectedUser}
          onMessageSent={handleMessageSent}
          disabled={isBlocked}
        />
      </div>
    </div>
  )
}