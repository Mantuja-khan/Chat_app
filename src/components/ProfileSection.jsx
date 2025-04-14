import React, { useState, useEffect } from 'react'
import Avatar from './Avatar'
import ProfileEditModal from './ProfileEditModal'
import UserProfileModal from './UserProfileModal'
import { supabase } from '../lib/supabase'

export default function ProfileSection({ currentUser, compact = false, isEditing = false, onCloseEdit }) {
  const [user, setUser] = useState(currentUser)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    setUser(currentUser)

    const channel = supabase
      .channel(`profile-${currentUser.id}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${currentUser.id}`
        },
        (payload) => {
          setUser(payload.new)
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [currentUser])

  const displayName = user?.name || user?.email?.split('@')[0]

  if (compact) {
    return (
      <>
        <button 
          className="p-2 hover:bg-gray-100 rounded-full"
          onClick={() => setShowProfile(true)}
        >
          <Avatar 
            url={user?.avatar_url}
            name={displayName}
            size="md"
          />
        </button>
        
        {isEditing && (
          <ProfileEditModal
            user={user}
            onClose={onCloseEdit}
            onUpdate={(updatedUser) => {
              setUser(updatedUser)
              onCloseEdit()
            }}
          />
        )}

        {showProfile && (
          <UserProfileModal
            user={user}
            currentUserId={user.id}
            onClose={() => setShowProfile(false)}
            isOwnProfile={true}
          />
        )}
      </>
    )
  }

  return (
    <div className="p-4 bg-gray-50 border-b">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar 
            url={user?.avatar_url}
            name={displayName}
            size="lg"
          />
          <div>
            <div className="font-semibold">{displayName}</div>
            <div className="text-sm text-gray-500">{user?.email}</div>
          </div>
        </div>
      </div>
    </div>
  )
}