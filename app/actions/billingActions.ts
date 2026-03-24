'use server';

import { createSupabaseServer } from '../lib/supabaseServer';

// 1. Fetch Product Data from Tag ID
export async function getProductByTag(tagId: string) {
    const supabase = createSupabaseServer();
    
    const { data: tag, error } = await supabase
        .from('qr_tags')
        .select('*, products(*)')
        .eq('id', tagId)
        .single();

    if (error || !tag) return { success: false, message: "Tag not found in database!" };
    if (tag.status === 'sold') return { success: false, message: "This item is already sold!" };

    // Related products logic (Complete the look)
    const { data: related } = await supabase
        .from('products')
        .select('*')
        .eq('category', tag.products?.category)
        .neq('id', tag.products?.id)
        .limit(4);

    return { success: true, tag, relatedProducts: related || [] };
}

// 2. 🔥 The Master Checkout Logic: Marks items as sold and resets tags
export async function processCheckout(tagIds: string[]) {
    const supabase = createSupabaseServer();

    try {
        // 1. Pehle price pata karo un tags ki jo bik rahe hain
        const { data: tagsToSell } = await supabase
            .from('qr_tags')
            .select('*, products(price)')
            .in('id', tagIds);

        let totalAmount = 0;
        if (tagsToSell) {
            totalAmount = tagsToSell.reduce((sum, t) => sum + (t.products?.price || 0), 0);
        }

        // 2. 📝 NEW: Sale ka record register (Sales table) mein daalo
        if (totalAmount > 0) {
            await supabase.from('sales').insert({ 
                total_amount: totalAmount, 
                items_count: tagIds.length 
            });
        }

        // 3. Purana logic: Tags ko wapas FREE aur Empty kar do reuse ke liye
        const { error: tagError } = await supabase
            .from('qr_tags')
            .update({ status: 'free', product_id: null })
            .in('id', tagIds);

        if (tagError) throw tagError;

        return { success: true };
    } catch (error: any) {
        console.error("Checkout Error:", error);
        return { success: false, message: "Transaction failed." };
    }
}
