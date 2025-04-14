import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getUsers, subscribeToUserChanges } from '../utils/userUtils'
import { handleLogout } from '../utils/authUtils'
import { getLatestMessages, subscribeToNewMessages, getUnreadMessageCount } from '../utils/messageUtils'
import { subscribeFriendRequests, getPendingFriendRequests } from '../utils/friendUtils'
import UserListItem from './UserListItem'
import ProfileSection from './ProfileSection'
import ErrorMessage from './ErrorMessage'
import SearchBar from './SearchBar'
import MenuButton from './MenuButton'
import FriendRequestList from './FriendRequestList'
import BottomNavbar from './BottomNavbar'
import MembersList from './MembersList'
import MyContactsList from './MyContactsList'
import { BsArrowLeft } from 'react-icons/bs'

export default function ChatList({ currentUser, onSelectUser, activeView, onViewChange }) {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [latestMessages, setLatestMessages] = useState({})
  const [unreadCounts, setUnreadCounts] = useState({})
  const [friendRequests, setFriendRequests] = useState([])
  const [friendIds, setFriendIds] = useState([])
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    let mounted = true
    let subscriptions = []

    const initializeSubscriptions = async () => {
      try {
        await fetchFriendIds()
        await fetchUsers()
        await fetchLatestMessages()
        await fetchUnreadCounts()
        await fetchFriendRequests()

        if (!mounted) return

        const userSub = subscribeToUserChanges((payload) => {
          if (payload.eventType === 'UPDATE' && mounted) {
            setUsers(prevUsers => 
              prevUsers.map(user => 
                user.id === payload.new.id ? { ...user, ...payload.new } : user
              )
            )
          }
        })
        subscriptions.push(userSub)

        const messageSub = subscribeToNewMessages(currentUser.id, async (message) => {
          if (mounted) {
            setLatestMessages(prev => ({
              ...prev,
              [message.sender_id === currentUser.id ? message.receiver_id : message.sender_id]: message
            }))
            await fetchUnreadCounts()
            fetchUsers(true)
          }
        })
        subscriptions.push(messageSub)

        const friendSub = subscribeFriendRequests(currentUser.id, (payload) => {
          if (!mounted) return
          
          if (payload.eventType === 'INSERT') {
            fetchFriendRequests()
          } else if (payload.eventType === 'UPDATE' && payload.new.status === 'accepted') {
            fetchFriendRequests()
            fetchFriendIds()
            fetchUsers(true)
          }
        })
        subscriptions.push(friendSub)
      } catch (error) {
        console.error('Error initializing subscriptions:', error)
        if (mounted) {
          setError('Failed to initialize chat. Please try refreshing the page.')
        }
      }
    }

    initializeSubscriptions()

    return () => {
      mounted = false
      subscriptions.forEach(sub => sub?.unsubscribe?.())
    }
  }, [currentUser.id])

  const fetchUnreadCounts = async () => {
    try {
      const counts = {}
      for (const user of users) {
        const { count } = await getUnreadMessageCount(currentUser.id, user.id)
        counts[user.id] = count
      }
      setUnreadCounts(counts)
    } catch (error) {
      console.error('Error fetching unread counts:', error)
    }
  }

  const fetchFriendIds = async () => {
    try {
      const { data: friendRequests, error: friendError } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);
      
      if (friendError) throw friendError;
      
      const ids = friendRequests ? friendRequests.map(request => 
        request.sender_id === currentUser.id ? request.receiver_id : request.sender_id
      ) : [];
      
      setFriendIds(ids);
      return ids;
    } catch (error) {
      console.error('Error fetching friend IDs:', error);
      return [];
    }
  };

  const fetchUsers = async (includeHidden = false) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await getUsers(currentUser.id, searchQuery, includeHidden, friendIds)
      if (error) throw error
      setUsers(data)
      setFilteredUsers(data)
    } catch (error) {
      setError('Failed to load users. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchLatestMessages = async () => {
    try {
      const { data, error } = await getLatestMessages(currentUser.id)
      if (error) throw error
      
      const messagesMap = {}
      data.forEach(message => {
        const otherUserId = message.sender_id === currentUser.id ? message.receiver_id : message.sender_id
        messagesMap[otherUserId] = message
      })
      
      setLatestMessages(messagesMap)
    } catch (error) {
      console.error('Error fetching latest messages:', error)
    }
  }

  const fetchFriendRequests = async () => {
    try {
      const { data, error } = await getPendingFriendRequests(currentUser.id)
      if (error) throw error
      setFriendRequests(data || [])
    } catch (error) {
      console.error('Error fetching friend requests:', error)
    }
  }

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      fetchUsers()
    }, 300)
    return () => clearTimeout(debounceTimeout)
  }, [searchQuery, friendIds])

  const handleUserRemoved = (userId) => {
    setLatestMessages(prev => {
      const newMessages = { ...prev }
      delete newMessages[userId]
      return newMessages
    })

    if (!searchQuery) {
      setUsers(prev => prev.filter(user => user.id !== userId))
      setFilteredUsers(prev => prev.filter(user => user.id !== userId))
    }
  }

  const handleFriendRequestHandled = (requestId, status) => {
    setFriendRequests(prev => prev.filter(request => request.id !== requestId))
    if (status === 'accepted') {
      fetchFriendIds().then(() => {
        fetchUsers(true)
      })
    }
  }

  const renderContent = () => {
    switch (activeView) {
      case 'requests':
        return (
          <div className="flex-1 flex flex-col">
            <div className="p-4 bg-gray-50 border-b flex items-center">
              <button
                onClick={() => onViewChange('chats')}
                className="p-2 hover:bg-gray-100 rounded-full mr-2"
              >
                <BsArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h2 className="text-xl font-semibold">Friend Requests</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <FriendRequestList 
                requests={friendRequests} 
                onRequestHandled={handleFriendRequestHandled} 
              />
            </div>
          </div>
        )

      case 'contacts':
        return (
          <MyContactsList 
            currentUserId={currentUser.id} 
            onBack={() => onViewChange('chats')}
            onSelectUser={(user) => {
              onSelectUser(user)
              onViewChange('chats')
            }}
          />
        )

      case 'members':
        return (
          <MembersList 
            currentUserId={currentUser.id} 
            onBack={() => onViewChange('chats')}
          />
        )

      default:
        return (
          <>
            <div className="flex items-center p-2 bg-gray-50 border-b">
              <ProfileSection 
                currentUser={currentUser} 
                compact={true} 
                isEditing={showProfileEdit}
                onCloseEdit={() => setShowProfileEdit(false)}
              />
              <div className="flex-1 px-2">
                <SearchBar 
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search or start new chat"
                />
              </div>
              <MenuButton 
                onEditProfile={() => setShowProfileEdit(true)}
                onToggleFriendRequests={() => onViewChange('requests')}
                onToggleMyContacts={() => onViewChange('contacts')}
                onToggleMembers={() => onViewChange('members')}
                friendRequestCount={friendRequests.length}
              />
            </div>

            {error && <ErrorMessage message={error} onRetry={() => fetchUsers()} />}

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                  <p className="mb-2">No chats found</p>
                  <p className="text-sm">Start a new conversation or check your friend requests</p>
                </div>
              ) : (
                filteredUsers.map(user => (
                  <UserListItem
                    key={user.id}
                    user={user}
                    onSelect={() => {
                      onSelectUser(user)
                      setUnreadCounts(prev => ({ ...prev, [user.id]: 0 }))
                    }}
                    currentUserId={currentUser.id}
                    lastMessage={latestMessages[user.id]}
                    onRemoved={() => handleUserRemoved(user.id)}
                    unreadCount={unreadCounts[user.id] || 0}
                  />
                ))
              )}
            </div>
          </>
        )
    }
  }

  return (
    <div className="bg-white w-full md:w-1/3 border-r flex flex-col h-full">
      {renderContent()}
      
      {isMobile && (
        <BottomNavbar 
          onToggleChats={() => onViewChange('chats')}
          onToggleMyContacts={() => onViewChange('contacts')}
          onToggleMembers={() => onViewChange('members')}
          onToggleFriendRequests={() => onViewChange('requests')}
          friendRequestCount={friendRequests.length}
          activeTab={activeView}
        />
      )}
      
      {isMobile && <div className="h-16"></div>}
    </div>
  )
}