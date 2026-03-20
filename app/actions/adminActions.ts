'use server';

import { createClient } from '@supabase/supabase-js';

// VIP Client (Jo humne cart mein bhi use kiya tha)
const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
};

export async function getStoreData() {
  try {
    const supabase = getSupabaseAdmin();

    // 1. Saare products laao
    const { data: products, error: pError } = await supabase
      .from('products')
      .select('*');
    
    if (pError) throw pError;

    // 2. Saare QR Tags laao (aur unse jude kapdo ka naam bhi)
    const { data: qrTags, error: qError } = await supabase
      .from('qr_tags')
      .select(`
        id,
        status,
        products ( name, price )
      `)
      .order('id', { ascending: true }); // TAG001, TAG002 line se aayenge
      
    if (qError) throw qError;

    return { success: true, products, qrTags };
  } catch (error: any) {
    console.error("Admin Fetch Error:", error);
    return { success: false, message: error.message };
  }
}
