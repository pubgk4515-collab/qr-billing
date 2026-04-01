// actions/authActions.ts
'use server';

import { createSupabaseServer } from '../lib/supabaseServer';
import { cookies } from 'next/headers';

export async function loginStore(phone: string, passcode: string) {
  try {
    const supabase = createSupabaseServer();
    
    // Database mein check karo ki is number aur passcode ka koi store hai ya nahi
    const { data: store, error } = await supabase
      .from('stores')
      .select('id, name')
      .eq('owner_phone', phone)
      .eq('passcode', passcode)
      .single();

        if (error) {
      // Yeh asli error screen par dikhayega
      return { success: false, message: `Supabase Error: ${error.message}` }; 
    }
    if (!store) {
      return { success: false, message: 'No match found in database.' };
    }


    // 🔥 SECRET WEAPON: HTTP-Only Cookie set kar rahe hain (7 din ke liye)
    const cookieStore = await cookies();
    cookieStore.set('store_id', store.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 Days
      path: '/',
    });

    return { success: true, storeName: store.name };
  } catch (error: any) {
    return { success: false, message: 'Something went wrong on our end.' };
  }
}
