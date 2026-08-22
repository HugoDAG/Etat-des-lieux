import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://ygqhgmfpvsmephhvynwy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncWhnbWZwdnNtZXBoaHZ5bnd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNzY4NzEsImV4cCI6MjEwMjk1Mjg3MX0.iz8TmBkzSCOen6iT-8pCcLQRrj-92dVG4X7vh5UgfPA'
)
