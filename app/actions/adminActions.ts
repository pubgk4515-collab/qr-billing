'use server';

import { createSupabaseServer } from '../lib/supabaseServer';
import { cookies } from 'next/headers'; 
import { revalidatePath } from 'next/cache';

// ==========================================
// 🏢 MULTI-TENANT HELPER FUNCTION
// ==========================================
async function getStoreId() {
  const cookieStore = await cookies();
  const cookieStoreId = cookieStore.get('store_id')?.value;

  if (!cookieStoreId) {
    throw new Error("Store ID not found! Please login again."); 
  }

  return cookieStoreId;
}


// ==========================================
// 1. DATA FETCHING (DASHBOARD & INVENTORY)
// ==========================================
export async function getStoreData() {
  try {
    const supabaseServer = createSupabaseServer();
    const storeId = await getStoreId(); // Tumhara multi-tenant helper

    // 1. Store ka slug fetch karo
    const { data: store } = await supabaseServer
      .from('stores')
      .select('slug')
      .eq('id', storeId)
      .single();

    // 2. Products aur Tags fetch karo (Ye tumhara existing code hoga)
    const { data: products } = await supabaseServer.from('products').select('*').eq('store_id', storeId);
    const { data: qrTags } = await supabaseServer.from('qr_tags').select('*, products(*)').eq('store_id', storeId);

    // 3. Return mein storeSlug bhi bhej do
    return { 
      success: true, 
      storeSlug: store?.slug || '', // 🔥 Ye line add karni hai
      products: products || [], 
      qrTags: qrTags || [] 
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ==========================================
// 2. TAG MANAGEMENT (REUSABLE LOGIC)
// ==========================================
async function getNextStartingNumber(supabaseServer: any, storeId: string) {
  const { data, error } = await supabaseServer
    .from('qr_tags').select('id').eq('store_id', storeId).order('id', { ascending: true });
    
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
    const storeId = await getStoreId();
    const startNum = await getNextStartingNumber(supabaseServer, storeId);
    const newTags = [];
    let currentNum = startNum;

    for (let i = 0; i < count; i++) {
      let isUnique = false;
      let tagId = '';
      while (!isUnique) {
        tagId = `TAG${currentNum.toString().padStart(3, '0')}`;
        const { data } = await supabaseServer.from('qr_tags').select('id').eq('id', tagId).eq('store_id', storeId).single();
        if (!data) isUnique = true;
        else currentNum++;
      }
      newTags.push({ id: tagId, status: 'free', product_id: null, store_id: storeId });
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
    const storeId = await getStoreId();
    const { error } = await supabaseServer
      .from('qr_tags').update({ product_id: productId, status: 'active' }).eq('id', tagId).eq('store_id', storeId);
    if (error) throw error;
    return { success: true };
  } catch (error: any) { return { success: false, message: error.message }; }
}

export async function unlinkTag(tagId: string) {
  try {
    const supabaseServer = createSupabaseServer();
    const storeId = await getStoreId();
    const { error } = await supabaseServer
      .from('qr_tags').update({ product_id: null, status: 'free' }).eq('id', tagId).eq('store_id', storeId);
    if (error) throw error;
    return { success: true };
  } catch (error: any) { return { success: false, message: error.message }; }
}

// ==========================================
// 3. PRODUCT MANAGEMENT
// ==========================================

// 🔥 NEW: Image upload & Tag linking function added here!
export async function addProductToTag(tagId: string, formData: FormData) {
  try {
    const supabaseServer = createSupabaseServer();
    const storeId = await getStoreId();
    
    if (!storeId) throw new Error("Store ID missing. Please login again.");

    const name = formData.get('name') as string;
    const price = parseFloat(formData.get('price') as string);
    const size = formData.get('size') as string || 'Free Size'; // 🔥 Naya Size Field
    const imageFile = formData.get('image') as File | null;

    let imageUrl = null;

    if (imageFile && imageFile.size > 0) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${storeId}_${tagId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabaseServer.storage
        .from('product-images')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabaseServer.storage
        .from('product-images')
        .getPublicUrl(fileName);

      imageUrl = publicUrlData.publicUrl;
    }

    // 🔥 Size ko database me insert kar rahe hain
    const { data: product, error: productError } = await supabaseServer
      .from('products')
      .insert([{ name, price, size, image_url: imageUrl, store_id: storeId }])
      .select()
      .single();

    if (productError) throw productError;

    const { error: tagError } = await supabaseServer
      .from('qr_tags')
      .update({ product_id: product.id, status: 'active' })
      .eq('id', tagId)
      .eq('store_id', storeId);

    if (tagError) throw tagError;
    revalidatePath('/','layout');
    return { success: true };
  } catch (error: any) {
    console.error("Add Product Error: ", error);
    return { success: false, message: error.message };
  }
}


export async function addNewItem(name: string, price: number, imageUrl: string, tagIdToLink?: string) {
  try {
    const supabaseServer = createSupabaseServer();
    const storeId = await getStoreId();
    
    const { data: productData, error: productError } = await supabaseServer
      .from('products').insert({ name, price, image_url: imageUrl, store_id: storeId }).select().single();

    if (productError || !productData) throw productError || new Error("Failed to create product");

    if (tagIdToLink) {
      const { error: tagError } = await supabaseServer
        .from('qr_tags').update({ product_id: productData.id, status: 'active' }).eq('id', tagIdToLink).eq('store_id', storeId);
      if (tagError) throw tagError;
    }
    revalidatePath('/','layout');
    return { success: true };
  } catch (error: any) { return { success: false, message: error.message }; }
}

export async function updateProduct(productId: string, name: string, price: number, imageUrl: string) {
  try {
    const supabaseServer = createSupabaseServer();
    const storeId = await getStoreId();
    const { error } = await supabaseServer
      .from('products').update({ name, price, image_url: imageUrl }).eq('id', productId).eq('store_id', storeId);
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
    const storeId = await getStoreId();
    const { data, error } = await supabaseServer
      .from('sales').select('*').eq('cart_id', cartId).eq('store_id', storeId).single();
    if (error || !data) return { success: false, message: 'Order not found' };
    return { success: true, data };
  } catch (error: any) { return { success: false, message: error.message }; }
}

export async function approvePayment(cartId: string) {
  try {
    const supabaseServer = createSupabaseServer();
    const storeId = await getStoreId();
    
    const { data: orderData, error: fetchError } = await supabaseServer
      .from('sales').select('purchased_items').eq('cart_id', cartId).eq('store_id', storeId).single();
    if (fetchError || !orderData) throw new Error('Order not found');

    const { error } = await supabaseServer
      .from('sales').update({ payment_status: 'completed' }).eq('cart_id', cartId).eq('store_id', storeId);
    if (error) throw error;

    const purchasedItems = orderData.purchased_items || [];
    for (const item of purchasedItems) {
      if (item.id) {
        await supabaseServer.from('qr_tags').update({ status: 'free', product_id: null }).eq('id', item.id).eq('store_id', storeId);
      }
    }
    return { success: true };
  } catch (error: any) { return { success: false, message: error.message }; }
}

export async function getTagForPOS(tagId: string) {
  const supabaseServer = createSupabaseServer();
  const storeId = await getStoreId();
  try {
    const { data, error } = await supabaseServer
      .from('qr_tags').select('*, products(*)').eq('id', tagId).eq('store_id', storeId).single();
    if (error || !data) return { success: false, message: 'Tag not found in system.' };
    if (data.status === 'free' || !data.products) return { success: false, message: 'This tag is empty (no product linked).' };
    return { success: true, data };
  } catch (err: any) { return { success: false, message: err.message }; }
}

export async function completePOSCheckout(cartItems: any[], customerPhone: string) {
  const supabaseServer = createSupabaseServer();
  const storeId = await getStoreId();
  try {
    const cartId = `CART-${Math.floor(1000 + Math.random() * 9000)}`;
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.products?.price || 0), 0);

    const purchasedItemsJson = cartItems.map(item => ({
      id: item.id,
      products: { id: item.products?.id, name: item.products?.name, price: item.products?.price, image_url: item.products?.image_url }
    }));

    const { error: salesError } = await supabaseServer.from('sales').insert({
      cart_id: cartId,
      total_amount: totalAmount,
      items_count: cartItems.length,
      payment_status: 'completed',
      payment_method: 'OFFLINE',
      customer_phone: customerPhone || 'WALK-IN',
      purchased_items: purchasedItemsJson,
      store_id: storeId
    });

    if (salesError) throw salesError;

    for (const item of cartItems) {
      await supabaseServer.from('qr_tags').update({ status: 'free', product_id: null }).eq('id', item.id).eq('store_id', storeId);
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
  const storeId = await getStoreId();
  try {
    let successCount = 0;
    const startNum = await getNextStartingNumber(supabaseServer, storeId);
    let currentNum = startNum;

    for (const item of items) {
      if (!item.name || !item.price) continue;
      
      const { data: productData, error: productError } = await supabaseServer
        .from('products').insert({ name: item.name, price: item.price, image_url: item.imageUrl || null, store_id: storeId }).select().single();
        
      if (productError || !productData) continue;
      
      const uniqueTag = `TAG${currentNum.toString().padStart(3, '0')}`;
      const { error: tagError } = await supabaseServer
        .from('qr_tags').insert({ id: uniqueTag, product_id: productData.id, status: 'active', store_id: storeId });
        
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

// ==========================================
// 6. DELETE TAG LOGIC
// ==========================================
export async function deleteTag(tagId: string) {
  try {
    const supabaseServer = createSupabaseServer();
    const storeId = await getStoreId();
    const { error } = await supabaseServer
      .from('qr_tags').delete().eq('id', tagId).eq('store_id', storeId);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
