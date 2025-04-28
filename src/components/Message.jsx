import React, { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { BsCheck2, BsCheck2All } from 'react-icons/bs'
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
  const [touchStartTime, setTouchStartTime] = useState(0)
  const isMobile = window.innerWidth <= 768

  useEffect(() => {
    if (message.type === 'image') {
      const downloadedImages = JSON.parse(localStorage.getItem('downloadedImages') || '{}')
      setIsDownloaded(!!downloadedImages[message.id])
    }
  }, [message.id])

  const handleTouchStart = (e) => {
    if (isMobile) {
      setTouchStartTime(Date.now())
      longPressTimer.current = setTimeout(() => {
        setIsLongPress(true)
        onLongPress()
      }, 500)
    }
  }

  const handleTouchEnd = (e) => {
    if (isMobile) {
      const touchDuration = Date.now() - touchStartTime
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
      if (!isLongPress && isSelectionMode) {
        onSelect()
      }
      setIsLongPress(false)
    }
  }

  const handleMouseDown = (e) => {
    if (!isMobile) {
      setTouchStartTime(Date.now())
    }
  }

  const handleMouseUp = (e) => {
    if (!isMobile) {
      const clickDuration = Date.now() - touchStartTime
      if (clickDuration > 250) { // Double click threshold
        onLongPress()
      } else if (isSelectionMode) {
        onSelect()
      }
    }
  }

  const getMessageStatus = () => {
    if (isOwn) {
      return message.is_seen ? (
        <BsCheck2All className="text-sky-500" size={16} />
      ) : message.is_delivered ? (
        <BsCheck2All className="text-gray-500 dark:text-gray-400" size={16} />
      ) : (
        <BsCheck2 className="text-gray-500 dark:text-gray-400" size={16} />
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
          {!imageLoaded && (
            <div className="flex items-center justify-center h-32 bg-gray-100 dark:bg-gray-700 rounded-lg">
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
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <div
          className={`max-w-[70%] md:max-w-[50%] rounded-lg p-2.5 transition-colors duration-200 ${
            isOwn 
              ? isSelected 
                ? 'bg-green-600 text-white'
                : 'bg-green-500 text-white' 
              : isSelected
                ? 'bg-gray-200 dark:bg-gray-600'
                : 'bg-white dark:bg-gray-800 dark:text-gray-200'
          } cursor-pointer hover:opacity-90 shadow-sm`}
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