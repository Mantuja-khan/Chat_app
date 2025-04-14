import React from 'react'

export default function AuthFooter({ isSignUp, onToggleMode }) {
  return (
    <div className="p-6 bg-gray-50 border-t text-center">
      <p className="text-gray-600">
        {isSignUp ? 'Already have an account?' : 'Need an account?'}
        <button
          onClick={onToggleMode}
          className="ml-2 text-green-600 hover:text-green-700 font-medium focus:outline-none"
        >
          {isSignUp ? 'Sign In' : 'Sign Up'}
        </button>
      </p>
    </div>
  )
}
