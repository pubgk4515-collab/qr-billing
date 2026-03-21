'use server';

import { createSupabaseServer } from '../lib/supabaseServer';

// 1. Tag ID se Product dhoondhne ke liye
export async function getProductByTag(tagId: string) {
    try {
        const supabaseServer = createSupabaseServer();
        
        // Tag aur usse juda product ek sath le aao
        const { data, error } = await supabaseServer
            .from('qr_tags')
            .select('*, products(*)')
            .eq('id', tagId.toUpperCase()) // TAG001 (Capital mein)
            .single();

        if (error) throw error;
        
        if (!data) return { success: false, message: 'Tag nahi mila!' };
        if (data.status === 'sold') return { success: false, message: 'Ye item pehle hi bik chuka hai!' };
        if (data.status === 'free') return { success: false, message: 'Ye khali tag hai, koi item link nahi hai!' };
        if (!data.products) return { success: false, message: 'Item ka data missing hai!' };

        return { success: true, tag: data };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// 2. Bill phaadne (Checkout) ke liye
export async function processCheckout(tagIds: string[]) {
    try {
        const supabaseServer = createSupabaseServer();
        
        // Jo items bik gaye, unke tags ko 'sold' mark kar do
        const { error } = await supabaseServer
            .from('qr_tags')
            .update({ status: 'sold', product_id: null }) // Sold mark kiya aur product link hata diya taaki baad mein reuse ho sake
            .in('id', tagIds);

        if (error) throw error;
        
        return { success: true, message: 'Sale completed successfully!' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}