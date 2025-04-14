import React, { useState, useEffect } from 'react';
import { BsArrowLeft, BsSearch } from 'react-icons/bs';
import { supabase } from '../lib/supabase';
import Avatar from './Avatar';
import { formatLastSeen } from '../utils/userUtils';
import FriendRequestButton from './FriendRequestButton';
import { getFriendshipStatus } from '../utils/friendUtils';

export default function MembersList({ currentUserId, onBack }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [friendships, setFriendships] = useState({});

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (members.length > 0) {
      setFilteredMembers(
        members.filter(member => 
          member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.email?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, members]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUserId)
        .eq('active', true)
        .order('last_seen', { ascending: false });
      
      if (error) throw error;
      
      // Fetch friendship status for all members
      const friendshipData = {};
      for (const member of data || []) {
        const { data: status } = await getFriendshipStatus(currentUserId, member.id);
        friendshipData[member.id] = status;
      }
      
      setFriendships(friendshipData);
      setMembers(data || []);
      setFilteredMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSent = () => {
    // Refresh the members list to update UI
    fetchMembers();
  };

  return (
    <div className="bg-white flex flex-col h-full">
      <div className="p-4 bg-gray-50 border-b flex items-center">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full mr-2"
        >
          <BsArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h2 className="text-xl font-semibold">Members</h2>
      </div>

      <div className="p-3 border-b">
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <BsSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Search members"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4 text-center text-gray-500">
          <p>No members found</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {filteredMembers.map(member => {
            const displayName = member.name || member.email.split('@')[0];
            const lastSeen = formatLastSeen(member.last_seen);
            const isOnline = new Date(member.last_seen) > new Date(Date.now() - 5 * 60 * 1000);
            const isFriend = friendships[member.id]?.status === 'accepted';
            
            return (
              <div key={member.id} className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Avatar 
                      url={member.avatar_url}
                      name={displayName}
                      showOnlineStatus={true}
                      isOnline={isOnline}
                    />
                    <div className="ml-3">
                      <div className="font-semibold">{displayName}</div>
                      <div className="text-sm text-gray-500">
                        {isOnline ? 'Online' : `Last seen ${lastSeen}`}
                      </div>
                      {member.about && (
                        <div className="text-xs text-gray-500 mt-1 italic">
                          {member.about.length > 50 ? `${member.about.substring(0, 50)}...` : member.about}
                        </div>
                      )}
                    </div>
                  </div>
                  {isFriend ? (
                    <button
                      className="px-4 py-2 bg-green-100 text-green-600 rounded-lg"
                    >
                      Friends
                    </button>
                  ) : (
                    <FriendRequestButton
                      currentUserId={currentUserId}
                      otherUserId={member.id}
                      onRequestSent={handleRequestSent}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}