'use server';

import { createSupabaseServer } from '../lib/supabaseServer';

export async function getProductByTag(tagId: string) {
    try {
        const supabaseServer = createSupabaseServer();
        
        // 1. Tag aur Product safely fetch karo
        const { data, error } = await supabaseServer
            .from('qr_tags')
            .select('*, products(*)')
            .eq('id', tagId.toUpperCase())
            .single();

        // Agar tag hi nahi mila ya error aaya
        if (error || !data) {
            return { success: false, message: 'Invalid Tag: Ye QR Code database mein nahi hai.' };
        }
        
        // Tag status checks
        if (data.status === 'sold') return { success: false, message: 'Ye item pehle hi bik chuka hai!' };
        if (data.status === 'free' || !data.products) return { success: false, message: 'Ye tag khali hai, ispar kapda link nahi hai!' };

        // 2. Safely Matches (Recommendations) Dhoondo
        let related = [];
        try {
            // Hum check kar rahe hain ki database mein 'category' column hai ya 'category_id'
            const catColumn = data.products.category ? 'category' : (data.products.category_id ? 'category_id' : null);
            const catValue = data.products.category || data.products.category_id;

            if (catColumn && catValue) {
                const { data: relData } = await supabaseServer
                    .from('products')
                    .select('*')
                    .eq(catColumn, catValue)
                    .neq('id', data.products.id)
                    .limit(4);
                
                if (relData) related = relData;
            }
        } catch (relErr) {
            // Agar related dhoondhne mein error aaya, toh usko ignore karo, crash mat hone do
            console.error("Recommendations fail hui", relErr);
        }

        return { 
            success: true, 
            tag: data,
            relatedProducts: related
        };
    } catch (error: any) {
        // SABSE BADA FIX: Yahan se kabhi error THROW nahi hoga, UI ko safe message jayega
        return { success: false, message: 'Server issue: ' + error.message };
    }
}

export async function processCheckout(tagIds: string[]) {
    try {
        const supabaseServer = createSupabaseServer();
        const { error } = await supabaseServer
            .from('qr_tags')
            .update({ status: 'sold' })
            .in('id', tagIds);

        if (error) return { success: false, message: error.message };
        return { success: true, message: 'Sale completed successfully!' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}