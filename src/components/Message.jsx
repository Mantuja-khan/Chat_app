import React, { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { BsCheck, BsCheckAll, BsDownload } from 'react-icons/bs'
import MessageDeleteModal from './MessageDeleteModal'

export default function Message({ 
  message, 
  isOwn, 
  onDelete,
  isSelectionMode,
  isSelected,
  onSelect,
  onLongPress
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isDownloaded, setIsDownloaded] = useState(false)
  const longPressTimer = useRef(null)
  const [isLongPress, setIsLongPress] = useState(false)

  useEffect(() => {
    if (message.type === 'image') {
      const downloadedImages = JSON.parse(localStorage.getItem('downloadedImages') || '{}')
      setIsDownloaded(!!downloadedImages[message.id])
    }
  }, [message.id])

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true)
      onLongPress()
    }, 500)
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
    if (!isLongPress && isSelectionMode) {
      onSelect()
    }
    setIsLongPress(false)
  }

  const getMessageStatus = () => {
    if (isOwn) {
      return message.is_seen ? (
        <BsCheckAll className="text-sky-500" size={14} />
      ) : message.is_delivered ? (
        <BsCheckAll className="text-gray-500" size={14} />
      ) : (
        <BsCheck className="text-gray-500" size={14} />
      )
    }
    return null
  }

  const handleMessageClick = () => {
    if (isSelectionMode) {
      onSelect()
    } else if (isOwn && !message.deleted_for_everyone) {
      setShowDeleteModal(true)
    }
  }

  const handleImageDownload = async (e) => {
    e.stopPropagation()
    try {
      const response = await fetch(message.image_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `image.${blob.type.split('/')[1]}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      const downloadedImages = JSON.parse(localStorage.getItem('downloadedImages') || '{}')
      downloadedImages[message.id] = true
      localStorage.setItem('downloadedImages', JSON.stringify(downloadedImages))
      
      setIsDownloaded(true)
    } catch (error) {
      console.error('Error downloading image:', error)
      alert('Failed to download image. Please try again.')
    }
  }

  const renderContent = () => {
    if (message.deleted_for_everyone) {
      return <p className="italic text-opacity-70 text-sm">This message was deleted</p>
    }

    if (message.type === 'image') {
      return (
        <div className="relative">
          <div className={`relative ${!isOwn && !isDownloaded ? 'filter blur-sm' : ''} transition-all duration-300`}>
            <img
              src={message.image_url}
              alt="Shared image"
              className={`max-w-full rounded-lg ${imageLoaded ? 'opacity-100' : 'opacity-0'} max-h-[300px] object-contain`}
              onLoad={() => setImageLoaded(true)}
            />
          </div>
          {imageLoaded && !isOwn && !isDownloaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={handleImageDownload}
                className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-opacity-70 transition-all"
              >
                <BsDownload size={20} />
                <span>Download to View</span>
              </button>
            </div>
          )}
          {!imageLoaded && (
            <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          )}
        </div>
      )
    }

    return <p className="break-words text-sm">{message.content}</p>
  }

  return (
    <>
      <div 
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 relative`}
        onClick={handleMessageClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        {isSelectionMode && (
          <div 
            className={`absolute left-0 top-1/2 -translate-y-1/2 -ml-6 w-5 h-5 rounded-full border-2 
              ${isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}
          />
        )}
        <div
          className={`max-w-[70%] md:max-w-[50%] rounded-lg p-2.5 ${
            isOwn ? 'bg-green-500 text-white' : 'bg-white'
          } cursor-pointer hover:opacity-90 shadow-sm ${
            isSelectionMode ? 'ml-8' : ''
          }`}
        >
          {renderContent()}
          <div className="flex justify-end items-center gap-1.5 mt-1">
            <span className="text-[10px] opacity-70">
              {format(new Date(message.created_at), 'h:mm a')}
            </span>
            {getMessageStatus()}
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <MessageDeleteModal
          message={message}
          onDelete={onDelete}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </>
  )
}