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
// 🛒 2. PROCESS CHECKOUT
// ============================================================================
export async function processCheckout(tagIds: string[]) {
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
      const { error: salesError } = await supabase
        .from('sales')
        .insert({ total_amount: totalAmount, items_count: tagIds.length });

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