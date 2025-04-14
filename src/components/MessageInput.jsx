import React, { useState, useRef } from 'react'
import { IoSend, IoImage } from 'react-icons/io5'
import { sendMessage } from '../utils/messageUtils'
import { supabase } from '../lib/supabase'

export default function MessageInput({ currentUser, selectedUser, onMessageSent, disabled }) {
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if ((!newMessage.trim() && !uploading) || sending || disabled) return

    const messageContent = newMessage.trim()
    setNewMessage('')
    setSending(true)

    try {
      const { data, error } = await sendMessage(currentUser.id, selectedUser.id, messageContent)
      if (error) throw error
      if (data) {
        onMessageSent(data)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setNewMessage(messageContent)
    } finally {
      setSending(false)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || disabled) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${currentUser.id}/${fileName}`

      const { error: uploadError, data } = await supabase.storage
        .from('message-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('message-images')
        .getPublicUrl(filePath)

      const { data: message, error: messageError } = await sendMessage(
        currentUser.id,
        selectedUser.id,
        'Image',
        'image',
        publicUrl
      )

      if (messageError) throw messageError
      if (message) {
        onMessageSent(message)
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 md:p-4 border-t flex gap-2 bg-white dark:bg-gray-800 dark:border-gray-700">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || sending || disabled}
        className={`p-2 text-gray-500 hover:text-green-500 transition-colors flex-shrink-0 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Send Image"
      >
        <IoImage size={24} />
      </button>
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder={disabled ? 'Messaging unavailable' : uploading ? 'Uploading image...' : 'Type a message...'}
        disabled={sending || uploading || disabled}
        className={`flex-1 rounded-full border border-gray-300 dark:border-gray-600 px-4 py-2 focus:outline-none focus:border-green-500 text-base md:text-lg dark:bg-gray-700 dark:text-gray-300 ${disabled ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed' : ''}`}
      />
      <button
        type="submit"
        disabled={sending || uploading || !newMessage.trim() || disabled}
        className={`${
          sending || uploading || !newMessage.trim() || disabled ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'
        } text-white rounded-full p-2 transition-colors flex-shrink-0 ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        <IoSend size={20} />
      </button>
    </form>
  )
}