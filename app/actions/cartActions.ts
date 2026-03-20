'use server'; 

import { createClient } from '@supabase/supabase-js';

// ==========================================
// 🛠️ 1. SETUP: The VIP Supabase Admin Client
// ==========================================
// Ye function safely admin client banayega. Agar .env mein gadbad hui, toh turant bata dega.
const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("❌ Missing Supabase URL or Service Role Key in .env.local");
  }

  return createClient(url, serviceKey);
};


// ==========================================
// 🛒 2. ADD TO CART (Grahak ka item tokri mein daalna)
// ==========================================
export async function addToCartServer(sessionId: string, productId: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin
      .from('cart')
      .insert({ session_id: sessionId, product_id: productId });

    if (error) throw error;

    return { success: true, message: "Kapda tokri mein add ho gaya! 🛍️" };
  } catch (error: any) {
    console.error("addToCartServer Error:", error);
    return { success: false, message: error.message || "Failed to add item." };
  }
}


// ==========================================
// 📦 3. FETCH CART ITEMS (Cart Page ke liye data laana)
// ==========================================
export async function getCartItems(sessionId: string) {
  try {
    if (!sessionId) throw new Error("Session ID is required");

    const supabaseAdmin = getSupabaseAdmin();

    // Join query: Cart ke andar ki item ID se Product ka naam aur daam match karke laana
    const { data, error } = await supabaseAdmin
      .from('cart')
      .select(`
        id,
        products (
          id,
          name,
          price,
          image_url
        )
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false }); // Naya item sabse upar dikhega

    if (error) throw error;

    return { success: true, data: data };
  } catch (error: any) {
    console.error("getCartItems Error:", error);
    return { success: false, message: error.message || "Failed to fetch cart." };
  }
}


// ==========================================
// 🗑️ 4. REMOVE ITEM FROM CART (Delete Button)
// ==========================================
export async function removeFromCart(cartId: string) {
  try {
    if (!cartId) throw new Error("Cart ID is required");

    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin
      .from('cart')
      .delete()
      .eq('id', cartId);

    if (error) throw error;

    return { success: true, message: "Item removed from cart." };
  } catch (error: any) {
    console.error("removeFromCart Error:", error);
    return { success: false, message: error.message || "Failed to remove item." };
  }
}


// ==========================================
// 🧹 5. CLEAR ENTIRE CART (For Checkout - Future Feature)
// ==========================================
export async function clearCart(sessionId: string) {
  try {
    if (!sessionId) throw new Error("Session ID is required");

    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin
      .from('cart')
      .delete()
      .eq('session_id', sessionId);

    if (error) throw error;

    return { success: true, message: "Cart cleared successfully." };
  } catch (error: any) {
    console.error("clearCart Error:", error);
    return { success: false, message: error.message || "Failed to clear cart." };
  }
}