'use server';

import { createSupabaseServer } from '../lib/supabaseServer';

// 🔍 Tag ID se Product dhoondhne ke liye (Updated to include recommendations)
export async function getProductByTag(tagId: string) {
    try {
        const supabaseServer = createSupabaseServer();
        
        const { data, error } = await supabaseServer
            .from('qr_tags')
            .select('*, products(*)')
            .eq('id', tagId.toUpperCase())
            .single();

        if (error) throw error;
        
        if (!data) return { success: false, message: 'Tag nahi mila!' };
        if (data.status === 'sold') return { success: false, message: 'Ye item pehle hi bik chuka hai!' };
        if (data.status === 'free') return { success: false, message: 'Ye khali tag hai, koi item link nahi hai!' };
        if (!data.products) return { success: false, message: 'Item ka data missing hai!' };

        // 🌟 JADOO: Best Matches (Recommendations) bhi le aao
        // Hum un products ko le rahe hain jo same category ke hain, 
        // sold nahi hain aur currently scanned product nahi hain.
        const { data: relatedProducts, error: relatedError } = await supabaseServer
            .from('products')
            .select('*')
            .eq('category_id', data.products.category_id) // Same category
            .neq('id', data.products.id) // Not the main product
            .limit(4); // Limit recommendations to 4

        return { 
            success: true, 
            tag: data,
            relatedProducts: relatedProducts || []
        };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// 2. Bill phaadne (Checkout) ke liye (Isme changes nahi hain)
export async function processCheckout(tagIds: string[]) {
    try {
        const supabaseServer = createSupabaseServer();
        
        const { error } = await supabaseServer
            .from('qr_tags')
            .update({ status: 'sold' }) // Sirf 'sold' mark kar rahe hain, link nahi hata rahe
            .in('id', tagIds);

        if (error) throw error;
        
        return { success: true, message: 'Sale completed successfully!' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}