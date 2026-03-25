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

    // Fetch the tag and its linked product
    const { data: tag, error: tagError } = await supabase
      .from('qr_tags')
      .select('*, products(*)')
      .eq('id', tagId)
      .single();

    if (tagError || !tag) {
      return {
        success: false,
        message: tagError?.message || 'Tag not found',
      };
    }

    // If the tag is free or no product linked, treat as not found
    if (tag.status === 'free' || !tag.products) {
      return {
        success: false,
        message: 'This tag is not linked to any product',
      };
    }

    // Optionally fetch related products (same category, if exists)
    let relatedProducts = [];
    if (tag.products.category) {
      const { data: related } = await supabase
        .from('products')
        .select('*')
        .eq('category', tag.products.category)
        .neq('id', tag.products.id) // exclude the current product
        .limit(3);
      relatedProducts = related || [];
    }

    return {
      success: true,
      data: {
        tag,
        relatedProducts,
      },
    };
  } catch (error: any) {
    console.error('GetProductByTag error:', error);
    return {
      success: false,
      message: error.message || 'Server error',
    };
  }
}

// ============================================================================
// 🛒 2. PROCESS CHECKOUT (Upgraded for Database Sync & Cart Tracking)
// ============================================================================
export async function processCheckout(
  tagIds: string[], 
  cartDetails?: { 
    cartId: string; 
    paymentMethod: string; 
    customerPhone: string; 
    items: any[] 
  }
) {
  try {
    const supabase = getSupabase();

    // Fetch the tags with their products to calculate total amount
    const { data: tagsToSell, error: fetchError } = await supabase
      .from('qr_tags')
      .select('*, products(price)')
      .in('id', tagIds);

    if (fetchError) throw fetchError;

    const totalAmount = tagsToSell?.reduce((sum, t) => sum + (t.products?.price || 0), 0) || 0;

    // Create a permanent sales record
    if (totalAmount > 0) {
      const insertData: any = { 
        total_amount: totalAmount, 
        items_count: tagIds.length 
      };

      // Agar modal se naya cart details aaya hai toh unhe bhi insert karo
            // Process Checkout ke andar insertData me yeh update karein:
      if (cartDetails) {
        insertData.cart_id = cartDetails.cartId;
        insertData.payment_method = cartDetails.paymentMethod;
        insertData.customer_phone = cartDetails.customerPhone;
        insertData.purchased_items = cartDetails.items;
        // NEW: Set initial status based on payment method
        insertData.payment_status = 'awaiting_approval'; // Ab chahe ONLINE ho ya OFFLINE, dono Admin ke approval ka wait karenge

      }


      const { error: salesError } = await supabase
        .from('sales')
        .insert(insertData);

      if (salesError) throw salesError;
    }

    // Free the tags and remove product links
    const { error: tagError } = await supabase
      .from('qr_tags')
      .update({ status: 'free', product_id: null })
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

    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, sales: data };
  } catch (error: any) {
    console.error('GetSalesData error:', error);
    return { success: false, message: error.message || 'Failed to fetch sales' };
  }
}

// ============================================================================
// 🧾 4. GET SALE BY CART ID (NEW: For Admin Manual Receipt Feature)
// ============================================================================
export async function getSaleByCartId(cartId: string) {
  try {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('cart_id', cartId)
      .single();

    if (error || !data) {
      return { success: false, message: 'Order not found for this Cart ID' };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('GetSaleByCartId error:', error);
    return { success: false, message: 'Server error while fetching order' };
  }
}

// ============================================================================
// 🔄 5. CHECK PAYMENT STATUS (NEW: For Magic Flow Polling)
// ============================================================================
export async function checkPaymentStatus(cartId: string) {
  try {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('sales')
      .select('payment_status')
      .eq('cart_id', cartId)
      .single();

    if (error || !data) {
      return { success: false, message: 'Order not found' };
    }

    return { success: true, status: data.payment_status };
  } catch (error: any) {
    console.error('CheckPaymentStatus error:', error);
    return { success: false, message: 'Server error' };
  }
}
