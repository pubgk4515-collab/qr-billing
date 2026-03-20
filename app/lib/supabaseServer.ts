import { createClient } from '@supabase/supabase-js'

export function createSupabaseServer() {
  return createClient(
    "https://eepeoigqkblhqrzpbhqv.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcGVvaWdxa2JsaHFyenBiaHF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDk2MTIsImV4cCI6MjA4OTQ4NTYxMn0.9EdwhnDjQT2MKnr3RSiLgn5IHqYCxHDIql1AIqM327o"
  )
}