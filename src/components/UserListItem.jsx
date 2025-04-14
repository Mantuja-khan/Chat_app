import React from 'react'
import { formatLastSeen } from '../utils/userUtils'
import { formatMessagePreview } from '../utils/messageUtils'
import Avatar from './Avatar'
import { BsCheck, BsCheckAll } from 'react-icons/bs'

export default function UserListItem({ user, onSelect, currentUserId, lastMessage, onRemoved, unreadCount }) {
  const displayName = user?.active ? (user?.name || user?.email?.split('@')[0]) : 'V-Chat User'
  const lastSeen = formatLastSeen(user?.last_seen)
  const isOnline = user?.active && new Date(user?.last_seen) > new Date(Date.now() - 5 * 60 * 1000)

  const messagePreview = lastMessage ? formatMessagePreview(lastMessage) : ''
  const messageTime = lastMessage ? formatLastSeen(lastMessage.created_at) : ''
  const isMessageSeen = lastMessage?.is_seen
  const isOwnMessage = lastMessage?.sender_id === currentUserId

  if (!user) return null

  return (
    <div
      onClick={onSelect}
      className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${!user.active ? 'opacity-70' : ''}`}
    >
      <div className="flex items-center">
        <div className="relative">
          <Avatar 
            url={user.active ? user.avatar_url : null}
            name={displayName}
            size="lg"
            showOnlineStatus={user.active}
            isOnline={isOnline}
          />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
              {unreadCount}
            </div>
          )}
        </div>
        <div className="ml-4 flex-1">
          <div className="flex justify-between items-center">
            <span className="font-semibold">{displayName}</span>
            {messageTime && (
              <span className="text-xs text-gray-500">{messageTime}</span>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span className={`text-sm ${isOwnMessage ? 'text-gray-500' : (!isMessageSeen ? 'text-gray-900 font-semibold' : 'text-gray-500')} truncate max-w-[70%]`}>
              {messagePreview || (isOnline ? 'Online' : `Last seen ${lastSeen}`)}
            </span>
            {isOwnMessage && lastMessage && (
              <span className={isMessageSeen ? "text-sky-500" : "text-gray-500"}>
                {isMessageSeen ? <BsCheckAll size={16} /> : <BsCheck size={16} />}
              </span>
            )}
          </div>
          {!user.active && (
            <span className="text-xs text-red-500">Account deleted</span>
          )}
        </div>
      </div>
    </div>
  )
}