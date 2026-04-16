// app/api/campaign-blaster/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// 🛡️ Setup Supabase Admin (Needs Service Role Key for backend operations)
// Ensure these environment variables are set in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 💸 COST MATRIX (For Internal Agency Tracking Only - Not shown to Store Owners)
const COST_MINI = 0.05; // ₹0.05
const COST_FULL = 0.50; // ₹0.50

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeId, segment, customers, baseMessage, isDryRun } = body;

    // ============================================================================
    // 🛡️ STEP 0: IDEMPOTENCY LAYER (Double-Fire Protection)
    // ============================================================================
    const todayStr = new Date().toISOString().split('T');
    const campaignHash = crypto.createHash('sha256').update(`${storeId}-${segment}-${todayStr}`).digest('hex');

    if (!isDryRun) {
      // Check if campaign already fired today for this exact store & segment
      const { data: existingLog } = await supabase
        .from('campaign_logs')
        .select('id')
        .eq('idempotency_key', campaignHash)
        .single();

      if (existingLog) {
        return NextResponse.json({ 
          status: "blocked", 
          message: "Duplicate Campaign Blocked. You have already sent a campaign to this segment today." 
        }, { status: 429 });
      }
    }

    // ============================================================================
    // 🧠 STEP 1: THE MANAGER (Rule Engine - Filters out spam/low-value targets)
    // ============================================================================
    const filteredCustomers = customers.filter((c: any) => {
      // Rule 1: Prevent spam. Skip if visited recently (unless targeting VIPs explicitly)
      if (c.days_since_last_visit < 5 && segment !== 'vip') return false;
      // Rule 2: Minimum value threshold
      if (c.total_spend < 500) return false; 
      
      return true;
    });

    const skippedCount = customers.length - filteredCustomers.length;

    // ============================================================================
    // 🚀 STEP 2 & 3: THE WORKER (Mini) & CONSULTANT (Full)
    // ============================================================================
    let totalCost = 0;
    let miniCount = 0;
    let fullCount = 0;

    // Parallel execution for maximum speed
    const finalizedMessages = await Promise.all(
      filteredCustomers.map(async (customer: any) => {
        
        // 👷 ACTION: Worker (Mini) takes the first shot
        const miniResponse = await callMockGPTMini(customer, baseMessage);
        
        // ⚖️ Golden Formula: Confidence Threshold
        if (miniResponse.confidence < 0.75) {
          // Escalation: Task is too complex, send to Consultant (Full)
          const fullResponse = await callMockGPTFull(customer, baseMessage);
          totalCost += COST_FULL;
          fullCount++;
          
          return { phone: customer.phone, message: fullResponse.message };
        }

        // Mini succeeded
        totalCost += COST_MINI;
        miniCount++;
        return { phone: customer.phone, message: miniResponse.message };
      })
    );

    // ============================================================================
    // 🔥 STEP 4: DRY RUN MODE (Owner Preview - CLEAN & PROFESSIONAL)
    // ============================================================================
    if (isDryRun) {
      return NextResponse.json({
        status: "dry_run",
        insights: {
          total_audience: customers.length,
          skipped_by_rules: skippedCount, // "Saved from spamming"
          final_reach: filteredCustomers.length,
          quota_to_be_used: filteredCustomers.length, // 🔥 No AI Cost shown to owner!
        },
        preview_samples: finalizedMessages.slice(0, 2) // Show top 2 messages for UI preview
      });
    }

    // ============================================================================
    // 📊 STEP 5: LOGGING & DISPATCH (Production Fire)
    // ============================================================================
    
    // 1. Actually send the messages (e.g., Twilio / WATI Integration)
    // await sendWhatsAppMessages(finalizedMessages);

    // 2. Secret Logging for Super Admin (Tracks raw AI costs and API usage)
    const { error: logError } = await supabase.from('campaign_logs').insert({
      store_id: storeId,
      idempotency_key: campaignHash,
      target_segment: segment,
      total_audience: customers.length,
      skipped: skippedCount,
      mini_calls: miniCount, // Agency tracking
      full_calls: fullCount, // Agency tracking
      total_cost: totalCost, // Agency billing
      status: 'completed'
    });

    if (logError) console.error("Secret Logging failed:", logError);

    // Clean response for the store owner's dashboard
    return NextResponse.json({
      status: "success",
      message: `Campaign fired! Successfully dispatched to ${filteredCustomers.length} customers.`,
      quota_used: filteredCustomers.length
    });

  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

// ============================================================================
// 🤖 AI SERVICES (Mock logic - replace with actual OpenAI/Gemini fetch later)
// ============================================================================

async function callMockGPTMini(customer: any, context: string) {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // If customer is highly risky to churn, Mini gets confused (low confidence)
  const isComplex = customer.churn_prob > 70;
  const confidence = isComplex ? (Math.random() * 0.4) + 0.3 : (Math.random() * 0.2) + 0.8;

  return {
    confidence: confidence,
    message: `Hi! We noticed you love ${customer.fav_category}. ${context} Come visit us!`
  };
}

async function callMockGPTFull(customer: any, context: string) {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Full model creates a deep, personalized win-back message
  return {
    confidence: 0.99,
    message: `Hey there! It's been ${customer.days_since_last_visit} days since we last saw you. Our ${customer.fav_category} collection just got updated. We have a special "welcome back" offer just for you! ${context}`
  };
}
