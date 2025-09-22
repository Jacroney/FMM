import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Your Excel data
const budgetData = [
  // Fixed Costs
  { category_type: 'Fixed Costs', category: 'IFC', quarter: 'Fall', allocated: 4515, spent: 5689.62, remaining: 0 },
  { category_type: 'Fixed Costs', category: 'IFC', quarter: 'Winter', allocated: 5689.62, spent: 5080.6, remaining: 4181.25 },
  { category_type: 'Fixed Costs', category: 'IFC', quarter: 'Spring', allocated: 5080.6, spent: 11103.97, remaining: 0 },
  { category_type: 'Fixed Costs', category: 'Nationals', quarter: 'Fall', allocated: 15778.22, spent: 13361.04, remaining: -2410.71 },
  { category_type: 'Fixed Costs', category: 'Nationals', quarter: 'Winter', allocated: 10259.85, spent: 5424.41, remaining: -3727.15 },
  { category_type: 'Fixed Costs', category: 'Nationals', quarter: 'Spring', allocated: 3013.7, spent: 32778.92, remaining: 0 },

  // Operational Costs
  { category_type: 'Operational Costs', category: 'Composite', quarter: 'Fall', allocated: 312, spent: 0, remaining: 2895 },
  { category_type: 'Operational Costs', category: 'Composite', quarter: 'Spring', allocated: 2895, spent: 312, remaining: 0 },
  { category_type: 'Operational Costs', category: 'Damages & Fines', quarter: 'Fall', allocated: 2500, spent: 2801.38, remaining: 2776.36 },
  { category_type: 'Operational Costs', category: 'Damages & Fines', quarter: 'Winter', allocated: 10350, spent: 2773.64, remaining: 10224.98 },
  { category_type: 'Operational Costs', category: 'Damages & Fines', quarter: 'Spring', allocated: 5550, spent: 8175.02, remaining: 0 },
  { category_type: 'Operational Costs', category: 'Families', quarter: 'Fall', allocated: 0, spent: 207.58, remaining: 42.05 },
  { category_type: 'Operational Costs', category: 'Families', quarter: 'Winter', allocated: 350, spent: 307.95, remaining: 184.47 },
  { category_type: 'Operational Costs', category: 'Families', quarter: 'Spring', allocated: 350, spent: 515.53, remaining: 0 },
  { category_type: 'Operational Costs', category: 'Formal', quarter: 'Winter', allocated: 46425.18, spent: 16646.21, remaining: 15403.2 },
  { category_type: 'Operational Costs', category: 'Formal', quarter: 'Spring', allocated: 47184.5, spent: 107576.95, remaining: 5200.71 },
  { category_type: 'Operational Costs', category: 'Insurance', quarter: 'Fall', allocated: 6100.86, spent: 3844.53, remaining: 3026.37 },
  { category_type: 'Operational Costs', category: 'Insurance', quarter: 'Winter', allocated: 6000, spent: 3898.66, remaining: 2993.78 },
  { category_type: 'Operational Costs', category: 'Insurance', quarter: 'Spring', allocated: 0, spent: 3898.66, remaining: 0 },
  { category_type: 'Operational Costs', category: 'Merchandise', quarter: 'Fall', allocated: 6500, spent: 9024.21, remaining: 4925.69 },
  { category_type: 'Operational Costs', category: 'Merchandise', quarter: 'Winter', allocated: 5250, spent: 7049.38, remaining: -801.1 },
  { category_type: 'Operational Costs', category: 'Merchandise', quarter: 'Spring', allocated: 3850, spent: 16899.7, remaining: 500 },
  { category_type: 'Operational Costs', category: 'Parents Weekend', quarter: 'Fall', allocated: 4000, spent: 4903.42, remaining: 3500 },
  { category_type: 'Operational Costs', category: 'Parents Weekend', quarter: 'Spring', allocated: 4900, spent: 4596.58, remaining: 903.42 },
  { category_type: 'Operational Costs', category: 'Pre Game', quarter: 'Fall', allocated: 1000, spent: 1218.46, remaining: 1000 },
  { category_type: 'Operational Costs', category: 'Pre Game', quarter: 'Winter', allocated: 2000, spent: 218.46, remaining: -218.46 },
  { category_type: 'Operational Costs', category: 'Pre Game', quarter: 'Spring', allocated: 0, spent: 2000, remaining: 0 },
  { category_type: 'Operational Costs', category: 'President', quarter: 'Fall', allocated: 150, spent: 150, remaining: 150 },
  { category_type: 'Operational Costs', category: 'President', quarter: 'Winter', allocated: 150, spent: 150, remaining: 0 },
  { category_type: 'Operational Costs', category: 'President', quarter: 'Spring', allocated: 150, spent: 150, remaining: 150 },
  { category_type: 'Operational Costs', category: 'Recruitment', quarter: 'Fall', allocated: 9650, spent: 9617.5, remaining: 7275.1 },
  { category_type: 'Operational Costs', category: 'Recruitment', quarter: 'Winter', allocated: 8000, spent: 8000, remaining: 32.5 },
  { category_type: 'Operational Costs', category: 'Recruitment', quarter: 'Spring', allocated: 2350, spent: 2374.9, remaining: 0 },
  { category_type: 'Operational Costs', category: 'Social', quarter: 'Fall', allocated: 1400, spent: 2499.42, remaining: 400.58 },
  { category_type: 'Operational Costs', category: 'Social', quarter: 'Winter', allocated: 1500, spent: 1999, remaining: -499 },
  { category_type: 'Operational Costs', category: 'Social', quarter: 'Spring', allocated: 2500, spent: 3000, remaining: 500 },
  { category_type: 'Operational Costs', category: 'Stadium Clean Up', quarter: 'Fall', allocated: 2700, spent: 3775, remaining: -1075 },
  { category_type: 'Operational Costs', category: 'Sundries', quarter: 'Fall', allocated: 1400, spent: 8025.23, remaining: 174.77 },
  { category_type: 'Operational Costs', category: 'Sundries', quarter: 'Winter', allocated: 0, spent: 1575, remaining: 0 },
  { category_type: 'Operational Costs', category: 'Sundries', quarter: 'Spring', allocated: 1500, spent: 6625.23, remaining: 1500 },
  { category_type: 'Operational Costs', category: 'Web', quarter: 'Fall', allocated: 200, spent: 200, remaining: 0 },

  // Event Costs
  { category_type: 'Event Costs', category: 'Alumni', quarter: 'Fall', allocated: 250, spent: 1194.84, remaining: -944.84 },
  { category_type: 'Event Costs', category: 'Brotherhood', quarter: 'Fall', allocated: 6000, spent: 8490.01, remaining: -2490.01 },
  { category_type: 'Event Costs', category: 'Brotherhood', quarter: 'Winter', allocated: 1200, spent: 4440.01, remaining: 1200 },
  { category_type: 'Event Costs', category: 'Brotherhood', quarter: 'Spring', allocated: 2000, spent: 4050, remaining: 0 },
  { category_type: 'Event Costs', category: 'House', quarter: 'Fall', allocated: 200, spent: 499.6, remaining: -299.6 },
  { category_type: 'Event Costs', category: 'Intramurals', quarter: 'Fall', allocated: 400, spent: 400, remaining: 0 },
  { category_type: 'Event Costs', category: 'Non Alcoholic Social', quarter: 'Fall', allocated: 1200, spent: 1050.1, remaining: 1200 },
  { category_type: 'Event Costs', category: 'Non Alcoholic Social', quarter: 'Winter', allocated: 1200, spent: 1200, remaining: 149.9 },
  { category_type: 'Event Costs', category: 'Non Alcoholic Social', quarter: 'Spring', allocated: 1200, spent: 1050.1, remaining: 0 },
  { category_type: 'Event Costs', category: 'Public Relations', quarter: 'Fall', allocated: 300, spent: 600, remaining: -300 },
  { category_type: 'Event Costs', category: 'Philanthropy', quarter: 'Fall', allocated: 800, spent: 1077.76, remaining: 799.99 },
  { category_type: 'Event Costs', category: 'Philanthropy', quarter: 'Winter', allocated: 800, spent: 800, remaining: -277.76 },
  { category_type: 'Event Costs', category: 'Philanthropy', quarter: 'Spring', allocated: 800, spent: 277.77, remaining: 0 },
  { category_type: 'Event Costs', category: 'Professional', quarter: 'Fall', allocated: 500, spent: 420.64, remaining: 79.36 },
  { category_type: 'Event Costs', category: 'Scholarship', quarter: 'Fall', allocated: 0, spent: 181.21, remaining: 100 },
  { category_type: 'Event Costs', category: 'Scholarship', quarter: 'Winter', allocated: 100, spent: 100, remaining: -181.21 },
  { category_type: 'Event Costs', category: 'Scholarship', quarter: 'Spring', allocated: 100, spent: 0, remaining: 0 }
];

async function importBudgets() {
  try {
    console.log('🚀 Starting budget import...\n');

    // Step 1: Get or verify budget periods exist
    console.log('📅 Checking budget periods...');
    const { data: periods, error: periodsError } = await supabase
      .from('budget_periods')
      .select('*')
      .order('start_date');

    if (periodsError) {
      console.error('❌ Error fetching periods:', periodsError);
      return;
    }

    if (periods.length === 0) {
      console.log('⚠️  No budget periods found. Please run the create-tables.sql script first.');
      return;
    }

    // Map period names to IDs
    const periodMap = {};
    periods.forEach(p => {
      periodMap[p.name] = p.id;
    });

    console.log(`✅ Found ${periods.length} budget periods\n`);

    // Step 2: Insert budget categories
    console.log('📊 Setting up budget categories...');
    const uniqueCategories = [...new Set(budgetData.map(item =>
      JSON.stringify({ name: item.category, type: item.category_type })
    ))].map(str => JSON.parse(str));

    for (const cat of uniqueCategories) {
      const { data, error } = await supabase
        .from('budget_categories')
        .upsert({
          name: cat.name,
          type: cat.type
        }, {
          onConflict: 'name'
        })
        .select();

      if (error && !error.message.includes('duplicate')) {
        console.error(`❌ Error inserting category ${cat.name}:`, error);
      }
    }

    // Get all categories with their IDs
    const { data: categories, error: catError } = await supabase
      .from('budget_categories')
      .select('*');

    if (catError) {
      console.error('❌ Error fetching categories:', catError);
      return;
    }

    // Map category names to IDs
    const categoryMap = {};
    categories.forEach(c => {
      categoryMap[c.name] = c.id;
    });

    console.log(`✅ Set up ${categories.length} budget categories\n`);

    // Step 3: Insert budgets and expenses
    console.log('💰 Importing budget allocations and expenses...');
    let budgetCount = 0;
    let expenseCount = 0;

    for (const item of budgetData) {
      const categoryId = categoryMap[item.category];
      const periodId = periodMap[item.quarter];

      if (!categoryId || !periodId) {
        console.warn(`⚠️  Skipping item - missing category or period: ${item.category} / ${item.quarter}`);
        continue;
      }

      // Insert or update budget allocation
      if (item.allocated > 0) {
        const { data: budget, error: budgetError } = await supabase
          .from('budgets')
          .upsert({
            category_id: categoryId,
            period_id: periodId,
            allocated: item.allocated
          }, {
            onConflict: 'category_id,period_id'
          })
          .select()
          .single();

        if (budgetError) {
          console.error(`❌ Error inserting budget for ${item.category}:`, budgetError);
        } else {
          budgetCount++;

          // If there are expenses, create expense records
          if (item.spent > 0 && budget) {
            // Get the date for this period
            const period = periods.find(p => p.id === periodId);
            const transactionDate = period ? period.start_date : new Date().toISOString().split('T')[0];

            const { error: expenseError } = await supabase
              .from('expenses')
              .insert({
                budget_id: budget.id,
                category_id: categoryId,
                period_id: periodId,
                amount: item.spent,
                description: `${item.category} expenses for ${item.quarter} quarter`,
                transaction_date: transactionDate,
                status: 'completed'
              });

            if (expenseError) {
              console.error(`❌ Error inserting expense for ${item.category}:`, expenseError);
            } else {
              expenseCount++;
            }
          }
        }
      } else if (item.spent > 0) {
        // Create expense without budget allocation (for items with no allocation but with spending)
        const period = periods.find(p => p.id === periodId);
        const transactionDate = period ? period.start_date : new Date().toISOString().split('T')[0];

        const { error: expenseError } = await supabase
          .from('expenses')
          .insert({
            category_id: categoryId,
            period_id: periodId,
            amount: item.spent,
            description: `${item.category} expenses for ${item.quarter} quarter (unbudgeted)`,
            transaction_date: transactionDate,
            status: 'completed'
          });

        if (expenseError) {
          console.error(`❌ Error inserting unbudgeted expense for ${item.category}:`, expenseError);
        } else {
          expenseCount++;
        }
      }
    }

    console.log(`\n✅ Import completed!`);
    console.log(`   📊 ${budgetCount} budget allocations created`);
    console.log(`   💸 ${expenseCount} expense records created`);

    // Step 4: Show summary from view
    console.log('\n📈 Budget Summary:');
    const { data: summary, error: summaryError } = await supabase
      .from('budget_summary')
      .select('*')
      .order('period_type, period, category_type, category');

    if (!summaryError && summary) {
      const byQuarter = {};
      summary.forEach(item => {
        if (!byQuarter[item.period]) {
          byQuarter[item.period] = {
            allocated: 0,
            spent: 0,
            remaining: 0
          };
        }
        byQuarter[item.period].allocated += parseFloat(item.allocated);
        byQuarter[item.period].spent += parseFloat(item.spent);
        byQuarter[item.period].remaining += parseFloat(item.remaining);
      });

      Object.entries(byQuarter).forEach(([quarter, totals]) => {
        console.log(`\n   ${quarter}:`);
        console.log(`     Allocated: $${totals.allocated.toFixed(2)}`);
        console.log(`     Spent: $${totals.spent.toFixed(2)}`);
        console.log(`     Remaining: $${totals.remaining.toFixed(2)}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the import
importBudgets();