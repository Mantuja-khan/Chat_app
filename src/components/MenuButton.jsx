import React, { useState, useRef, useEffect } from 'react'
import { BsThreeDotsVertical, BsArrowLeft, BsPeople, BsPersonPlus, BsPersonLinesFill, BsMoon, BsSun, BsBoxArrowRight, BsTrash, BsChatDots } from 'react-icons/bs'
import { handleLogout } from '../utils/authUtils'
import DeleteAccountModal from './DeleteAccountModal'
import { useTheme } from '../hooks/useTheme'

export default function MenuButton({ onEditProfile, onToggleFriendRequests, onToggleMyContacts, onToggleMembers, friendRequestCount = 0 }) {
  const [isOpen, setIsOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const menuRef = useRef(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const { darkMode, toggleDarkMode } = useTheme()

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleEditProfile = () => {
    onEditProfile()
    setIsOpen(false)
  }

  const handleFriendRequests = () => {
    onToggleFriendRequests()
    setIsOpen(false)
  }

  const handleMyContacts = () => {
    onToggleMyContacts()
    setIsOpen(false)
  }

  const handleMembers = () => {
    onToggleMembers()
    setIsOpen(false)
  }

  const handleThemeToggle = () => {
    toggleDarkMode()
    setIsOpen(false)
  }

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={toggleMenu}
        className={`p-2 hover:bg-gray-100 rounded-full relative ${!isMobile ? 'fixed left-4 top-4 z-50' : ''}`}
      >
        <BsThreeDotsVertical className="h-5 w-5 text-gray-600" />
        {friendRequestCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {friendRequestCount}
          </span>
        )}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40" />
      )}

      {/* Menu content */}
      <div
        className={`fixed md:absolute ${isMobile ? 'top-0' : 'top-16 left-4'} right-0 w-48 bg-white md:rounded-md shadow-lg z-50 transition-all duration-300 ${
          isMobile 
            ? `transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`
            : isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        } h-full md:h-auto`}
      >
        <div className="flex flex-col h-full">
          {/* Mobile header with back button */}
          <div className="md:hidden p-4 bg-gray-50 border-b flex items-center">
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-full mr-2"
            >
              <BsArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h3 className="text-lg font-semibold">Menu</h3>
          </div>

          {/* Menu items */}
          <div className="flex-1">
            {!isMobile && (
              <>
                <button
                  onClick={() => {
                    onToggleMembers()
                    setIsOpen(false)
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <BsChatDots className="h-5 w-5 mr-2" />
                  Chats
                </button>

                <button
                  onClick={handleMyContacts}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <BsPersonLinesFill className="h-5 w-5 mr-2" />
                  My Contacts
                </button>

                <button
                  onClick={handleMembers}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <BsPeople className="h-5 w-5 mr-2" />
                  Members
                </button>

                <button
                  onClick={handleFriendRequests}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <BsPersonPlus className="h-5 w-5 mr-2" />
                    Friend Requests
                  </div>
                  {friendRequestCount > 0 && (
                    <span className="bg-green-500 text-white text-xs rounded-full px-2 py-1">
                      {friendRequestCount}
                    </span>
                  )}
                </button>
              </>
            )}

            <button
              onClick={handleThemeToggle}
              className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
            >
              {darkMode ? (
                <>
                  <BsSun className="h-5 w-5 mr-2" />
                  Light Mode
                </>
              ) : (
                <>
                  <BsMoon className="h-5 w-5 mr-2" />
                  Dark Mode
                </>
              )}
            </button>

            <button
              onClick={handleEditProfile}
              className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
            >
              <BsPersonLinesFill className="h-5 w-5 mr-2" />
              Edit profile
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-gray-100 flex items-center"
            >
              <BsTrash className="h-5 w-5 mr-2" />
              Delete account
            </button>

            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-gray-100 flex items-center"
            >
              <BsBoxArrowRight className="h-5 w-5 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />
      )}
    </div>
  )
}