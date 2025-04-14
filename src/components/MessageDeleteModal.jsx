import React from 'react'

export default function MessageDeleteModal({ message, onDelete, onClose }) {
  const [loading, setLoading] = React.useState(false)

  const handleDeleteForMe = async () => {
    setLoading(true)
    try {
      await onDelete(message.id, 'me')
      onClose()
    } catch (error) {
      console.error('Error deleting message:', error)
      alert('Failed to delete message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteForEveryone = async () => {
    setLoading(true)
    try {
      await onDelete(message.id, 'everyone')
      onClose()
    } catch (error) {
      console.error('Error deleting message:', error)
      alert('Failed to delete message for everyone. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm">
        <h3 className="text-lg font-semibold mb-4">Delete Message</h3>
        <div className="space-y-3">
          <button
            onClick={handleDeleteForMe}
            disabled={loading}
            className="w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete for me'}
          </button>
          <button
            onClick={handleDeleteForEveryone}
            disabled={loading}
            className="w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete for everyone'}
          </button>
        </div>
        <button
          onClick={onClose}
          disabled={loading}
          className="mt-4 w-full p-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}