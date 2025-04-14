import React, { useState, useEffect } from 'react';
import { BsArrowLeft, BsSearch } from 'react-icons/bs';
import { supabase } from '../lib/supabase';
import Avatar from './Avatar';
import { formatLastSeen } from '../utils/userUtils';

export default function MyContactsList({ currentUserId, onBack, onSelectUser }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    if (contacts.length > 0) {
      setFilteredContacts(
        contacts.filter(contact => 
          contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          contact.email?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, contacts]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      // Get accepted friend requests where current user is involved
      const { data: friendRequests, error: friendError } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);
      
      if (friendError) throw friendError;
      
      if (!friendRequests || friendRequests.length === 0) {
        setContacts([]);
        setFilteredContacts([]);
        setLoading(false);
        return;
      }
      
      // Extract friend IDs
      const friendIds = friendRequests.map(request => 
        request.sender_id === currentUserId ? request.receiver_id : request.sender_id
      );
      
      // Get profiles for these friends
      const { data: contactProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', friendIds)
        .eq('active', true)
        .order('last_seen', { ascending: false });
      
      if (profileError) throw profileError;
      
      setContacts(contactProfiles || []);
      setFilteredContacts(contactProfiles || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
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
        <h2 className="text-xl font-semibold">My Contacts</h2>
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
            placeholder="Search contacts"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4 text-center text-gray-500">
          <p>No contacts found</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.map(contact => {
            const displayName = contact.name || contact.email.split('@')[0];
            const lastSeen = formatLastSeen(contact.last_seen);
            const isOnline = new Date(contact.last_seen) > new Date(Date.now() - 5 * 60 * 1000);
            
            return (
              <div 
                key={contact.id} 
                className="p-4 border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => onSelectUser(contact)}
              >
                <div className="flex items-center">
                  <Avatar 
                    url={contact.avatar_url}
                    name={displayName}
                    showOnlineStatus={true}
                    isOnline={isOnline}
                  />
                  <div className="ml-3">
                    <div className="font-semibold">{displayName}</div>
                    <div className="text-sm text-gray-500">
                      {isOnline ? 'Online' : `Last seen ${lastSeen}`}
                    </div>
                    {contact.about && (
                      <div className="text-xs text-gray-500 mt-1 italic">
                        {contact.about.length > 50 ? `${contact.about.substring(0, 50)}...` : contact.about}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}