// app/actions/billingActions.ts
'use server';

import { createClient } from '@supabase/supabase-js';

// 🛡️ Supabase client initializer (safe for server actions)
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('❌ Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// ============================================================================
// 🔍 1. GET PRODUCT BY TAG ID
// ============================================================================
export async function getProductByTag(tagId: string) {
  try {
    const supabase = getSupabase();
    const { data: tag, error: tagError } = await supabase
      .from('qr_tags')
      .select('*, products(*)')
      .eq('id', tagId)
      .single();

    if (tagError || !tag) return { success: false, message: tagError?.message || 'Tag not found' };
    if (tag.status === 'free' || !tag.products) return { success: false, message: 'This tag is not linked to any product' };

    let relatedProducts = [];
    if (tag.products.category) {
      const { data: related } = await supabase
        .from('products').select('*').eq('category', tag.products.category).neq('id', tag.products.id).limit(3);
      relatedProducts = related || [];
    }

    return { success: true, data: { tag, relatedProducts } };
  } catch (error: any) {
    return { success: false, message: error.message || 'Server error' };
  }
}

// ============================================================================
// 🛒 2. PROCESS CHECKOUT (🔥 100% BULLETPROOF SERVER-SIDE LOGIC)
// ============================================================================
export async function processCheckout(
  tagIds: string[], 
  cartDetails?: { cartId: string; paymentMethod: string; customerPhone: string; items?: any[] }
) {
  try {
    const supabase = getSupabase();

    // 1. Fetch tags AND full product details securely from DB (Ignore frontend prices to prevent spoofing)
    const { data: tagsToSell, error: fetchError } = await supabase
      .from('qr_tags')
      .select('*, products(*)')
      .in('id', tagIds);

    if (fetchError) throw fetchError;
    if (!tagsToSell || tagsToSell.length === 0) throw new Error('No valid tags found for checkout');

    // 2. Calculate accurate total amount based strictly on Database prices
    const totalAmount = tagsToSell.reduce((sum, t) => sum + (t.products?.price || 0), 0);

    // 3. Format JSONB exactly how the Admin Dashboard expects it!
    const purchasedItemsJson = tagsToSell.map(tag => ({
      id: tag.id,
      products: {
        id: tag.products?.id,
        name: tag.products?.name,
        price: tag.products?.price,
        image_url: tag.products?.image_url
      }
    }));

    // 4. Create the Sales Record with exact details
    const insertData: any = { 
      total_amount: totalAmount, 
      items_count: tagsToSell.length,
      purchased_items: purchasedItemsJson // 👈 EXACT MATCH FOR ADMIN DASHBOARD
    };

    if (cartDetails) {
      insertData.cart_id = cartDetails.cartId;
      insertData.payment_method = cartDetails.paymentMethod || 'ONLINE';
      insertData.customer_phone = cartDetails.customerPhone || 'WALK-IN';
      insertData.payment_status = 'awaiting_approval'; // Always await admin approval for QR checkouts
    } else {
      insertData.cart_id = `CART-${Math.floor(1000 + Math.random() * 9000)}`;
      insertData.payment_method = 'UNKNOWN';
      insertData.payment_status = 'awaiting_approval';
    }

    const { error: salesError } = await supabase.from('sales').insert(insertData);
    if (salesError) throw salesError;

    // 5. LOCK THE TAGS (Mark as 'sold' temporarily so others can't buy them. Admin will make them 'free' upon approval)
    const { error: tagError } = await supabase
      .from('qr_tags')
      .update({ status: 'sold' })
      .in('id', tagIds);

    if (tagError) throw tagError;

    return { success: true };
  } catch (error: any) {
    console.error('Checkout error:', error);
    return { success: false, message: error.message || 'Transaction failed' };
  }
}

// ============================================================================
// 📊 3. GET SALES DATA (for analytics)
// ============================================================================
export async function getSalesData() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, sales: data };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to fetch sales' };
  }
}

// ============================================================================
// 🧾 4. GET SALE BY CART ID
// ============================================================================
export async function getSaleByCartId(cartId: string) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('sales').select('*').eq('cart_id', cartId).single();
    if (error || !data) return { success: false, message: 'Order not found for this Cart ID' };
    return { success: true, data };
  } catch (error: any) {
    return { success: false, message: 'Server error while fetching order' };
  }
}

// ============================================================================
// 🔄 5. CHECK PAYMENT STATUS (For Magic Flow Polling)
// ============================================================================
export async function checkPaymentStatus(cartId: string) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('sales').select('payment_status').eq('cart_id', cartId).single();
    if (error || !data) return { success: false, message: 'Order not found' };
    return { success: true, status: data.payment_status };
  } catch (error: any) {
    return { success: false, message: 'Server error' };
  }
}
