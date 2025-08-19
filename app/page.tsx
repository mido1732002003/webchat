'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    checkUser()
  }, [])

  if (loading) {
    return <div className="container">Loading...</div>
  }

  return (
    <div className="home-container">
      <h1>Chat App</h1>
      <p>A simple two-user chat application</p>
      <div className="home-links">
        {user ? (
          <Link href="/chat">
            <button>Go to Chat</button>
          </Link>
        ) : (
          <>
            <Link href="/sign-in">
              <button>Sign In</button>
            </Link>
            <Link href="/sign-up">
              <button>Sign Up</button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}