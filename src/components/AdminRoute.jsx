import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { adminVerifySession } from '../api'
import { clearAdminToken, isAdminLoggedIn } from '../utils/adminAuth'
import AdminLayout from './admin/AdminLayout'

export default function AdminRoute() {
  const [status, setStatus] = useState(() => (isAdminLoggedIn() ? 'checking' : 'denied'))

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      setStatus('denied')
      return undefined
    }

    let cancelled = false
    adminVerifySession()
      .then(() => {
        if (!cancelled) setStatus('ok')
      })
      .catch(() => {
        clearAdminToken()
        if (!cancelled) setStatus('denied')
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07090f]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#c4b5fd]/30 border-t-[#c4b5fd]" />
      </div>
    )
  }

  if (status === 'denied') {
    return <Navigate to="/admin/login" replace />
  }

  return <AdminLayout />
}
