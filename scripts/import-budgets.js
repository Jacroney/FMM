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

// Budget data structure
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

// Function to validate budget item
function validateBudgetItem(item, index) {
  const required = ['category_type', 'category', 'quarter', 'allocated', 'spent', 'remaining'];
  const missing = required.filter(field => item[field] === undefined || item[field] === null);

  if (missing.length > 0) {
    console.warn(`⚠️  Item ${index + 1}: Missing fields: ${missing.join(', ')}`);
    return false;
  }

  // Validate numeric fields
  const numericFields = ['allocated', 'spent', 'remaining'];
  for (const field of numericFields) {
    if (typeof item[field] !== 'number' || isNaN(item[field])) {
      console.warn(`⚠️  Item ${index + 1}: ${field} must be a number`);
      return false;
    }
  }

  return true;
}

// Function to insert budgets
async function insertBudgets(budgets) {
  console.log(`📊 Preparing to insert ${budgets.length} budget items...`);

  // Validate all items first
  const validItems = [];
  const invalidItems = [];

  budgets.forEach((item, index) => {
    if (validateBudgetItem(item, index)) {
      validItems.push(item);
    } else {
      invalidItems.push({ index: index + 1, item });
    }
  });

  if (invalidItems.length > 0) {
    console.log(`\n❌ ${invalidItems.length} invalid items found:`);
    invalidItems.forEach(({ index }) => {
      console.log(`   - Item ${index}`);
    });
  }

  if (validItems.length === 0) {
    console.log('❌ No valid items to insert');
    return { success: false, inserted: 0, errors: budgets.length };
  }

  console.log(`\n✅ ${validItems.length} valid items ready for insertion`);

  try {
    // Insert all valid items in batch
    const { data, error } = await supabase
      .from('budgets')
      .insert(validItems)
      .select();

    if (error) {
      console.error('❌ Error inserting budgets:', error);
      return { success: false, inserted: 0, error: error.message };
    }

    console.log(`\n✨ Successfully inserted ${data.length} budget items!`);

    // Show summary
    const summary = data.reduce((acc, item) => {
      if (!acc[item.quarter]) {
        acc[item.quarter] = {
          count: 0,
          totalAllocated: 0,
          totalSpent: 0
        };
      }
      acc[item.quarter].count++;
      acc[item.quarter].totalAllocated += item.allocated;
      acc[item.quarter].totalSpent += item.spent;
      return acc;
    }, {});

    console.log('\n📈 Summary by Quarter:');
    Object.entries(summary).forEach(([quarter, stats]) => {
      console.log(`   ${quarter}: ${stats.count} items, $${stats.totalAllocated.toFixed(2)} allocated, $${stats.totalSpent.toFixed(2)} spent`);
    });

    return {
      success: true,
      inserted: data.length,
      skipped: invalidItems.length,
      data
    };

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return { success: false, inserted: 0, error: err.message };
  }
}

// Function to clear existing budgets (optional)
async function clearExistingBudgets() {
  const response = await new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('\n⚠️  Do you want to clear existing budget records before inserting? (yes/no): ', (answer) => {
      readline.close();
      resolve(answer.toLowerCase());
    });
  });

  if (response === 'yes' || response === 'y') {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (error) {
      console.error('❌ Error clearing budgets:', error);
      return false;
    }
    console.log('✅ Existing budgets cleared');
    return true;
  }

  return false;
}

// Main execution
async function main() {
  console.log('🚀 Starting budget import script...\n');

  if (budgetData.length === 0) {
    console.log('❌ No budget data found. Please add budget items to the budgetData array.');
    console.log('\nExample format:');
    console.log(`{
  category_type: 'Operations',
  category: 'Insurance',
  quarter: 'Q1',
  allocated: 1000.00,
  spent: 800.00,
  remaining: 200.00
}`);
    process.exit(1);
  }

  // Optional: Clear existing data
  // await clearExistingBudgets();

  // Insert new budget data
  const result = await insertBudgets(budgetData);

  if (result.success) {
    console.log('\n✅ Import completed successfully!');
    console.log(`   Total inserted: ${result.inserted}`);
    if (result.skipped > 0) {
      console.log(`   Total skipped: ${result.skipped}`);
    }
  } else {
    console.log('\n❌ Import failed');
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }

  process.exit(result.success ? 0 : 1);
}

// Run the script
main().catch(console.error);