'use server';

import { createSupabaseServer } from '../lib/supabaseServer';

export async function getStoreData() {
  try {
    const supabaseServer = createSupabaseServer();
    const { data: products, error: pError } = await supabaseServer.from('products').select('*');
    const { data: qrTags, error: qError } = await supabaseServer.from('qr_tags').select(`*, products(*)`).order('id');

    if (pError) throw pError;
    if (qError) throw qError;

    return { success: true, products, qrTags };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 🚀 GAP FINDER LOGIC (Always finds the first missing tag)
async function getNextStartingNumber(supabaseServer: any) {
  try {
    const { data, error } = await supabaseServer.from('qr_tags').select('id');
    if (error) throw error;

    if (data && data.length > 0) {
      const existingNumbers = data
        .map((tag: any) => parseInt(String(tag?.id || '').replace(/\D/g, ''), 10))
        .filter((num: number) => !isNaN(num))
        .sort((a: number, b: number) => a - b);

      let nextNum = 1;
      for (const num of existingNumbers) {
        if (num === nextNum) nextNum++;
        else if (num > nextNum) break;
      }
      return nextNum;
    }
  } catch (err) {
    console.error("Error calculating next tag number:", err);
  }
  return 1;
}

export async function addNewItem(name: string, price: number, imageUrl: string) {
  try {
    const supabaseServer = createSupabaseServer();

    const { data: product, error: productError } = await supabaseServer
      .from('products')
      .insert([{ name, price, image_url: imageUrl || null }])
      .select()
      .single();

    if (productError) throw productError;

    const { data: freeTag } = await supabaseServer
      .from('qr_tags')
      .select('*')
      .eq('status', 'free')
      .order('id', { ascending: true }) 
      .limit(1)
      .single();

    let assignedTagId = '';

    if (freeTag) {
      assignedTagId = freeTag.id;
      await supabaseServer.from('qr_tags').update({ product_id: product.id, status: 'active' }).eq('id', freeTag.id);
    } else {
      const nextNum = await getNextStartingNumber(supabaseServer);
      assignedTagId = `TAG${nextNum.toString().padStart(3, '0')}`;
      await supabaseServer.from('qr_tags').insert([{ id: assignedTagId, product_id: product.id, status: 'active' }]);
    }

    return { success: true, message: `Item linked to ${assignedTagId}` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function generateFreeTags(count: number) {
  try {
    const supabaseServer = createSupabaseServer();
    
    for (let i = 0; i < count; i++) {
      const nextNum = await getNextStartingNumber(supabaseServer);
      const newTagId = `TAG${nextNum.toString().padStart(3, '0')}`;
      await supabaseServer.from('qr_tags').insert([{ id: newTagId, status: 'free' }]);
    }
    
    return { success: true, message: `${count} Tags generated!` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ✨ UPDATE PRODUCT (Naya Function Edit ke liye)
export async function updateProduct(productId: string, name: string, price: number, imageUrl: string) {
  try {
    const supabaseServer = createSupabaseServer();
    const { error } = await supabaseServer
      .from('products')
      .update({ name, price, image_url: imageUrl || null })
      .eq('id', productId);
      
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function linkTagToProduct(tagId: string, productId: string) {
    try {
        const supabaseServer = createSupabaseServer();
        const { error } = await supabaseServer.from('qr_tags').update({ product_id: productId, status: 'active' }).eq('id', tagId);
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function unlinkTag(tagId: string) {
    try {
        const supabaseServer = createSupabaseServer();
        const { error } = await supabaseServer.from('qr_tags').update({ product_id: null, status: 'free' }).eq('id', tagId);
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// ============================================================================
// 🏦 NEW: MAGIC FLOW APPROVAL ACTIONS (Admin Panel)
// ============================================================================

export async function getOrderByCartId(cartId: string) {
  try {
    const supabaseServer = createSupabaseServer();
    const { data, error } = await supabaseServer
      .from('sales')
      .select('*')
      .eq('cart_id', cartId)
      .single();
      
    if (error || !data) throw new Error('Order not found for this Cart ID');
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function approvePayment(cartId: string) {
  try {
    const supabaseServer = createSupabaseServer();
    const { error } = await supabaseServer
      .from('sales')
      .update({ payment_status: 'completed' })
      .eq('cart_id', cartId);
      
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
