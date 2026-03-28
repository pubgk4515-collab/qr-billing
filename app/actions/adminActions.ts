'use server';

import { createSupabaseServer } from '../lib/supabaseServer';

// ==========================================
// 1. DATA FETCHING (DASHBOARD & INVENTORY)
// ==========================================
export async function getStoreData() {
  try {
    const supabaseServer = createSupabaseServer();
    // 🔥 FIXED: Removed the 'created_at' ordering from products since that column doesn't exist!
    const { data: products, error: pError } = await supabaseServer.from('products').select('*');
    const { data: qrTags, error: qError } = await supabaseServer.from('qr_tags').select('*, products(*)').order('id', { ascending: true });

    if (pError) throw pError;
    if (qError) throw qError;

    return { success: true, products, qrTags };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}


// ==========================================
// 2. TAG MANAGEMENT (REUSABLE LOGIC)
// ==========================================
async function getNextStartingNumber(supabaseServer: any) {
  const { data, error } = await supabaseServer.from('qr_tags').select('id').order('id', { ascending: true });
  if (error || !data) return 1;

  const existingNumbers = data.map((t: any) => parseInt(t.id.replace('TAG', ''), 10)).filter((n: number) => !isNaN(n));
  if (existingNumbers.length === 0) return 1;

  for (let i = 1; i <= Math.max(...existingNumbers); i++) {
    if (!existingNumbers.includes(i)) return i;
  }
  return Math.max(...existingNumbers) + 1;
}

export async function generateFreeTags(count: number) {
  try {
    const supabaseServer = createSupabaseServer();
    const startNum = await getNextStartingNumber(supabaseServer);
    const newTags = [];
    let currentNum = startNum;

    for (let i = 0; i < count; i++) {
      let isUnique = false;
      let tagId = '';
      while (!isUnique) {
        tagId = `TAG${currentNum.toString().padStart(3, '0')}`;
        const { data } = await supabaseServer.from('qr_tags').select('id').eq('id', tagId).single();
        if (!data) isUnique = true;
        else currentNum++;
      }
      newTags.push({ id: tagId, status: 'free', product_id: null });
      currentNum++;
    }

    const { error } = await supabaseServer.from('qr_tags').insert(newTags);
    if (error) throw error;
    return { success: true, message: `Successfully generated ${count} free tags.` };
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
  } catch (error: any) { return { success: false, message: error.message }; }
}

export async function unlinkTag(tagId: string) {
  try {
    const supabaseServer = createSupabaseServer();
    const { error } = await supabaseServer.from('qr_tags').update({ product_id: null, status: 'free' }).eq('id', tagId);
    if (error) throw error;
    return { success: true };
  } catch (error: any) { return { success: false, message: error.message }; }
}

// ==========================================
// 3. PRODUCT MANAGEMENT
// ==========================================
export async function addNewItem(name: string, price: number, imageUrl: string, tagIdToLink?: string) {
  try {
    const supabaseServer = createSupabaseServer();
    const { data: productData, error: productError } = await supabaseServer
      .from('products').insert({ name, price, image_url: imageUrl }).select().single();

    if (productError || !productData) throw productError || new Error("Failed to create product");

    if (tagIdToLink) {
      const { error: tagError } = await supabaseServer
        .from('qr_tags').update({ product_id: productData.id, status: 'active' }).eq('id', tagIdToLink);
      if (tagError) throw tagError;
    }
    return { success: true };
  } catch (error: any) { return { success: false, message: error.message }; }
}

export async function updateProduct(productId: string, name: string, price: number, imageUrl: string) {
  try {
    const supabaseServer = createSupabaseServer();
    const { error } = await supabaseServer.from('products').update({ name, price, image_url: imageUrl }).eq('id', productId);
    if (error) throw error;
    return { success: true };
  } catch (error: any) { return { success: false, message: error.message }; }
}

// ==========================================
// 4. CHECKOUT & SALES LOGIC (ONLINE + POS)
// ==========================================
export async function getOrderByCartId(cartId: string) {
  try {
    const supabaseServer = createSupabaseServer();
    // 💡 Fetching from 'sales' table exactly as per your schema
    const { data, error } = await supabaseServer.from('sales').select('*').eq('cart_id', cartId).single();
    if (error || !data) return { success: false, message: 'Order not found' };
    return { success: true, data };
  } catch (error: any) { return { success: false, message: error.message }; }
}

export async function approvePayment(cartId: string) {
  try {
    const supabaseServer = createSupabaseServer();
    // Fetch purchased items from the sales table first
    const { data: orderData, error: fetchError } = await supabaseServer.from('sales').select('purchased_items').eq('cart_id', cartId).single();
    if (fetchError || !orderData) throw new Error('Order not found');

    // Update payment status
    const { error } = await supabaseServer.from('sales').update({ payment_status: 'completed' }).eq('cart_id', cartId);
    if (error) throw error;

    // 🔥 SMART LOGIC: Free the tags since they are reusable plastic tags!
    const purchasedItems = orderData.purchased_items || [];
    for (const item of purchasedItems) {
      if (item.id) {
        await supabaseServer.from('qr_tags').update({ status: 'free', product_id: null }).eq('id', item.id);
      }
    }
    return { success: true };
  } catch (error: any) { return { success: false, message: error.message }; }
}

export async function getTagForPOS(tagId: string) {
  const supabaseServer = createSupabaseServer();
  try {
    const { data, error } = await supabaseServer.from('qr_tags').select('*, products(*)').eq('id', tagId).single();
    if (error || !data) return { success: false, message: 'Tag not found in system.' };
    if (data.status === 'free' || !data.products) return { success: false, message: 'This tag is empty (no product linked).' };
    return { success: true, data };
  } catch (err: any) { return { success: false, message: err.message }; }
}

export async function completePOSCheckout(cartItems: any[], customerPhone: string) {
  const supabaseServer = createSupabaseServer();
  try {
    const cartId = `CART-${Math.floor(1000 + Math.random() * 9000)}`;
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.products?.price || 0), 0);

    const purchasedItemsJson = cartItems.map(item => ({
      id: item.id,
      products: { id: item.products?.id, name: item.products?.name, price: item.products?.price, image_url: item.products?.image_url }
    }));

    // 💡 Inserting into 'sales' table with exactly your column names
    const { error: salesError } = await supabaseServer.from('sales').insert({
      cart_id: cartId,
      total_amount: totalAmount,
      items_count: cartItems.length,
      payment_status: 'completed',
      payment_method: 'OFFLINE',
      customer_phone: customerPhone || 'WALK-IN',
      purchased_items: purchasedItemsJson
    });

    if (salesError) throw salesError;

    // 🔥 SMART LOGIC: Free the tags immediately for reuse!
    for (const item of cartItems) {
      await supabaseServer.from('qr_tags').update({ status: 'free', product_id: null }).eq('id', item.id);
    }

    return { success: true, cartId };
  } catch (err: any) {
    console.error('POS Checkout Error:', err);
    return { success: false, message: err.message };
  }
}

// ==========================================
// 5. BULK UPLOAD (PHASE 2)
// ==========================================
export async function bulkUploadProducts(items: { name: string; price: number; imageUrl: string }[]) {
  const supabaseServer = createSupabaseServer();
  try {
    let successCount = 0;
    const startNum = await getNextStartingNumber(supabaseServer);
    let currentNum = startNum;

    for (const item of items) {
      if (!item.name || !item.price) continue;
      
      const { data: productData, error: productError } = await supabaseServer
        .from('products').insert({ name: item.name, price: item.price, image_url: item.imageUrl || null }).select().single();
        
      if (productError || !productData) continue;
      
      const uniqueTag = `TAG${currentNum.toString().padStart(3, '0')}`;
      const { error: tagError } = await supabaseServer
        .from('qr_tags').insert({ id: uniqueTag, product_id: productData.id, status: 'active' });
        
      if (!tagError) {
        successCount++;
        currentNum++;
      }
    }
    return { success: true, count: successCount, message: `Successfully added ${successCount} items.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
