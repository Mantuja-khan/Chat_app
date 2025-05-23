import React, { useRef, useEffect, useState } from 'react'
import Message from './Message'
import { deleteMessage } from '../utils/messageUtils'
import { BsTrash } from 'react-icons/bs'

export default function MessageList({ messages, currentUserId, loading }) {
  const messagesEndRef = useRef(null)
  const [selectedMessages, setSelectedMessages] = useState(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleDeleteMessage = async (messageId, type) => {
    try {
      const { error } = await deleteMessage(messageId, type, currentUserId)
      if (error) {
        console.error('Failed to delete message:', error)
      }
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  const toggleMessageSelection = (messageId) => {
    const newSelected = new Set(selectedMessages)
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId)
    } else {
      newSelected.add(messageId)
    }
    setSelectedMessages(newSelected)
    
    if (newSelected.size === 0) {
      setIsSelectionMode(false)
    }
  }

  const handleDeleteSelected = async () => {
    if (!confirm(`Delete ${selectedMessages.size} message${selectedMessages.size > 1 ? 's' : ''}?`)) {
      return
    }

    try {
      const promises = Array.from(selectedMessages).map(messageId => 
        deleteMessage(messageId, 'me', currentUserId)
      )
      await Promise.all(promises)
      setSelectedMessages(new Set())
      setIsSelectionMode(false)
    } catch (error) {
      console.error('Error deleting messages:', error)
      alert('Failed to delete some messages. Please try again.')
    }
  }

  const handleLongPress = () => {
    if (!isSelectionMode) {
      setIsSelectionMode(true)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-500">
        <div>
          <p className="mb-2">No messages yet</p>
          <p className="text-sm">Send a message to start the conversation!</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {isSelectionMode && (
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 p-2 flex justify-between items-center border-b dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {selectedMessages.size} message{selectedMessages.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedMessages(new Set())
                setIsSelectionMode(false)
              }}
              className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedMessages.size === 0}
              className="px-3 py-1 text-sm text-white bg-red-500 hover:bg-red-600 rounded flex items-center gap-1 disabled:opacity-50"
            >
              <BsTrash size={14} />
              Delete
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            isOwn={message.sender_id === currentUserId}
            onDelete={handleDeleteMessage}
            isSelectionMode={isSelectionMode}
            isSelected={selectedMessages.has(message.id)}
            onSelect={() => toggleMessageSelection(message.id)}
            onLongPress={handleLongPress}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </>
  )
}