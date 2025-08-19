'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'
import { Message, Profile } from '@/types'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export default function Chat() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [partnerEmail, setPartnerEmail] = useState('')
  const [partner, setPartner] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/sign-in')
      } else {
        setUser(user)
        setLoading(false)
      }
    }
    checkUser()
  }, [router])

  useEffect(() => {
    if (!user || !partner) return

    // Fetch existing messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partner.id}),and(sender_id.eq.${partner.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setMessages(data)
      }
    }

    fetchMessages()

    // Set up realtime subscription
    const channel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id},receiver_id=eq.${partner.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          if (payload.new) {
            setMessages(prev => [...prev, payload.new as Message])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${partner.id},receiver_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          if (payload.new) {
            setMessages(prev => [...prev, payload.new as Message])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, partner])

  const handleSelectPartner = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!partnerEmail.trim()) return

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', partnerEmail.trim())
      .single()

    if (error || !data) {
      setError('User not found')
      return
    }

    if (data.id === user?.id) {
      setError('Cannot chat with yourself')
      return
    }

    setPartner(data)
    setMessages([])
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !partner || !user || sending) return

    setSending(true)
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: partner.id,
      content: newMessage.trim(),
    })

    if (!error) {
      setNewMessage('')
    }
    setSending(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return <div className="container">Loading...</div>
  }

  if (!user) {
    return (
      <div className="container">
        <p>Please sign in to access chat.</p>
        <Link href="/sign-in">Go to Sign In</Link>
      </div>
    )
  }

  return (
    <>
      <header className="header">
        <div className="header-content">
          <h1>Chat App</h1>
          <button onClick={handleSignOut}>Log Out</button>
        </div>
      </header>
      
      <div className="chat-container">
        <div className="partner-selector">
          <form className="partner-form" onSubmit={handleSelectPartner}>
            <input
              type="email"
              placeholder="Enter partner's email"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              required
            />
            <button type="submit">Start Chat</button>
          </form>
          {error && <div className="error">{error}</div>}
          {partner && (
            <p style={{ marginTop: '10px', color: '#999' }}>
              Chatting with: {partner.email}
            </p>
          )}
        </div>

        {partner && (
          <div className="chat-box">
            <div className="messages-container">
              {messages.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666' }}>
                  No messages yet. Start the conversation!
                </p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message ${
                      message.sender_id === user.id
                        ? 'message-sent'
                        : 'message-received'
                    }`}
                  >
                    <div>{message.content}</div>
                    <div className="message-time">
                      {formatTime(message.created_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <form
              className="message-input-container"
              onSubmit={handleSendMessage}
            >
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sending}
              />
              <button type="submit" disabled={sending || !newMessage.trim()}>
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  )
}
