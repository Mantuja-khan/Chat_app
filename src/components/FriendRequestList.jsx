import React from 'react';
import { UserPlus, Check, X } from 'lucide-react';
import Avatar from './Avatar';
import { acceptFriendRequest, rejectFriendRequest } from '../utils/friendUtils';

export default function FriendRequestList({ requests, onRequestHandled }) {
  const handleAccept = async (requestId) => {
    const { error } = await acceptFriendRequest(requestId);
    if (!error) {
      onRequestHandled?.(requestId, 'accepted');
    }
  };

  const handleReject = async (requestId) => {
    const { error } = await rejectFriendRequest(requestId);
    if (!error) {
      onRequestHandled?.(requestId, 'rejected');
    }
  };

  if (!requests?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-500 bg-gray-50 rounded-lg">
        <UserPlus className="w-12 h-12 mb-4 text-gray-400" />
        <p className="text-lg md:text-xl font-medium">No Pending Requests</p>
        <p className="text-sm md:text-base mt-2">When someone adds you, they'll appear here</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:gap-6">
      {requests.map((request) => (
        <div 
          key={request.id} 
          className="group flex flex-col sm:flex-row items-center sm:justify-between p-4 sm:p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100"
        >
          <div className="flex items-center space-x-4 mb-4 sm:mb-0">
            <div className="relative">
              <Avatar 
                url={request.profiles.avatar_url}
                name={request.profiles.name || request.profiles.email}
                size="lg"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <div className="text-center sm:text-left">
              <div className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {request.profiles.name || request.profiles.email.split('@')[0]}
              </div>
              <div className="text-sm sm:text-base text-gray-500">
                Sent you a friend request
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3 w-full sm:w-auto">
            <button
              onClick={() => handleAccept(request.id)}
              className="flex-1 sm:flex-none flex items-center justify-center px-6 py-2 bg-blue-600 text-white text-sm sm:text-base font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200"
            >
              <Check className="w-4 h-4 mr-2" />
              Accept
            </button>
            <button
              onClick={() => handleReject(request.id)}
              className="flex-1 sm:flex-none flex items-center justify-center px-6 py-2 border border-gray-200 text-gray-700 text-sm sm:text-base font-medium rounded-lg hover:bg-gray-50 focus:ring-4 focus:ring-gray-100 transition-all duration-200"
            >
              <X className="w-4 h-4 mr-2" />
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}