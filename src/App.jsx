import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { initSocket, disconnectSocket } from './lib/socket'
import { initializeNotifications } from './utils/notificationUtils'
import Auth from './components/Auth'
import ChatList from './components/ChatList'
import ChatWindow from './components/ChatWindow'
import { updateUserStatus } from './utils/userUtils'
import { getUserProfile } from './utils/profileUtils'
import { useTheme } from './hooks/useTheme'
import BottomNavMenu from './components/BottomNavMenu'

export default function App() {
  const [session, setSession] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const { darkMode } = useTheme()
  const [activeView, setActiveView] = useState('chats')

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchUserProfile(session.user.id)
        initSocket(session.user.id)
        initializeNotifications()
      }
    })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session?.user) {
        fetchUserProfile(session.user.id)
        initSocket(session.user.id)
        initializeNotifications()
      } else {
        setUserProfile(null)
        disconnectSocket()
      }
    })

    if (session?.user) {
      updateUserStatus()
      const interval = setInterval(updateUserStatus, 60000)
      return () => {
        clearInterval(interval)
        disconnectSocket()
      }
    }
  }, [session?.user?.id])

  const fetchUserProfile = async (userId) => {
    const { data } = await getUserProfile(userId)
    if (data) {
      setUserProfile(data)
    }
  }

  if (!session) {
    return <Auth />
  }

  return (
    <div className={`flex h-screen ${darkMode ? 'dark' : ''}`}>
      {(!isMobile || !selectedUser) && (
        <ChatList 
          currentUser={userProfile || session.user} 
          onSelectUser={(user) => {
            setSelectedUser(user)
          }}
          activeView={activeView}
          onViewChange={setActiveView}
        />
      )}
      {(!isMobile || selectedUser) && (
        <ChatWindow 
          currentUser={userProfile || session.user} 
          selectedUser={selectedUser}
          onBack={() => setSelectedUser(null)}
          isMobile={isMobile}
        />
      )}
      {!isMobile && (
        <BottomNavMenu
          onToggleChats={() => setActiveView('chats')}
          onToggleMyContacts={() => setActiveView('contacts')}
          onToggleMembers={() => setActiveView('members')}
          onToggleFriendRequests={() => setActiveView('requests')}
          friendRequestCount={0} // You'll need to pass the actual count here
        />
      )}
    </div>
  )
}