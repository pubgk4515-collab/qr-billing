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
        // Step 1: Update the tags to 'free' and unlink the product
        // Isse aapka Admin Dashboard turant 'FREE' aur 'Empty' dikhayega
        const { error: tagError } = await supabase
            .from('qr_tags')
            .update({ 
                status: 'free', 
                product_id: null 
            })
            .in('id', tagIds);

        if (tagError) throw tagError;

        // Note: Agar aap sales record karne ke liye ek alag table banate ho,
        // toh uska insert code yahan aayega future mein.

        return { success: true };
    } catch (error: any) {
        console.error("Checkout Error:", error);
        return { success: false, message: "Transaction failed. Please try again." };
    }
}
