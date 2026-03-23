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

        if (error || !data) {
            return { success: false, message: 'Invalid Tag: Ye QR Code database mein nahi hai.' };
        }
        
        if (data.status === 'sold') return { success: false, message: 'Ye item pehle hi bik chuka hai!' };
        if (data.status === 'free' || !data.products) return { success: false, message: 'Ye tag khali hai!' };

        // 2. Safely Matches (Recommendations) Dhoondo
        let related = [];
        try {
            const catColumn = data.products?.category ? 'category' : (data.products?.category_id ? 'category_id' : null);
            const catValue = data.products?.category || data.products?.category_id;

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
            console.error("Recommendations fail hui", relErr);
        }

        // 🔥 SABSE BADA FIX: JSON Serialization
        // Ye line ensure karegi ki database ke complex objects plain text mein convert ho jayein
        // Jisse Vercel production mein 500 Error kabhi nahi dega!
        const safeData = JSON.parse(JSON.stringify(data));
        const safeRelated = JSON.parse(JSON.stringify(related));

        return { 
            success: true, 
            tag: safeData,
            relatedProducts: safeRelated
        };
    } catch (error: any) {
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