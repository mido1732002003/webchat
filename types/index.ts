export interface Profile {
  id: string
  email: string
  created_at: string
}

export interface Message {
  id: number
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
}