import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const excelFile = path.join(process.cwd(), '..', 'Copy of 2024-2025 Budget Updated.xlsx');

// Read the Excel file
const workbook = XLSX.readFile(excelFile);

// Get the Budget sheet
const budgetSheet = workbook.Sheets['Budget '];
const rawData = XLSX.utils.sheet_to_json(budgetSheet, {
    header: 1,
    defval: null,
    blankrows: false
});

// Extract budget items
const budgetItems = [];

// Process Fixed Costs (rows 3-5)
const fixedCostCategories = [
    { row: 3, name: 'IFC' },
    { row: 4, name: 'Nationals' }
];

// Process Operational Costs (rows 7-32)
const operationalCostCategories = [
    { row: 7, name: 'Composite' },
    { row: 8, name: 'Damages & Fines' },
    { row: 9, name: 'Families' },
    { row: 10, name: 'Formal' },
    { row: 11, name: 'Insurance' },
    { row: 12, name: 'Merchandise' },
    { row: 13, name: 'Parents Weekend' },
    { row: 14, name: 'Pre Game' },
    { row: 15, name: 'President' },
    { row: 16, name: 'Recruitment' },
    { row: 17, name: 'Social' },
    { row: 18, name: 'Stadium Clean Up' },
    { row: 19, name: 'Sundries' },
    { row: 20, name: 'Web' },
    { row: 21, name: 'Total' }
];

// Process Event Costs (rows 23-32)
const eventCostCategories = [
    { row: 23, name: 'Alumni' },
    { row: 24, name: 'Brotherhood' },
    { row: 25, name: 'House' },
    { row: 26, name: 'Intramurals' },
    { row: 27, name: 'Non Alcoholic Social' },
    { row: 28, name: 'Public Relations' },
    { row: 29, name: 'Philanthropy' },
    { row: 30, name: 'Professional' },
    { row: 31, name: 'Scholarship' },
    { row: 32, name: 'Total' }
];

// Helper function to extract quarter data
function extractQuarterData(data, rowIndex, categoryName, categoryType) {
    const row = data[rowIndex];
    if (!row) return [];

    const items = [];
    const quarters = [
        { quarter: 'Fall', allocatedCol: 1, spentCol: 8, remainingCol: 15 },
        { quarter: 'Winter', allocatedCol: 2, spentCol: 9, remainingCol: 16 },
        { quarter: 'Spring', allocatedCol: 3, spentCol: 10, remainingCol: 17 }
    ];

    quarters.forEach(q => {
        const allocated = parseFloat(row[q.allocatedCol]) || 0;
        const spent = parseFloat(row[q.spentCol]) || 0;
        const remaining = parseFloat(row[q.remainingCol]) || 0;

        // Only add if there's actual data
        if (allocated > 0 || spent > 0) {
            items.push({
                category_type: categoryType,
                category: categoryName,
                quarter: q.quarter,
                allocated: allocated,
                spent: spent,
                remaining: remaining
            });
        }
    });

    return items;
}

// Extract Fixed Costs
fixedCostCategories.forEach(cat => {
    const items = extractQuarterData(rawData, cat.row, cat.name, 'Fixed Costs');
    budgetItems.push(...items);
});

// Extract Operational Costs (skip totals)
operationalCostCategories.filter(cat => cat.name !== 'Total').forEach(cat => {
    const items = extractQuarterData(rawData, cat.row, cat.name, 'Operational Costs');
    budgetItems.push(...items);
});

// Extract Event Costs (skip totals)
eventCostCategories.filter(cat => cat.name !== 'Total').forEach(cat => {
    const items = extractQuarterData(rawData, cat.row, cat.name, 'Event Costs');
    budgetItems.push(...items);
});

// Format for JavaScript
const jsContent = `// Budget data extracted from Excel
const budgetData = ${JSON.stringify(budgetItems, null, 2)};

export default budgetData;`;

// Save to file
fs.writeFileSync('budget-data.js', jsContent);

// Display summary
console.log('📊 Budget Data Extraction Summary:');
console.log(`Total items extracted: ${budgetItems.length}`);

// Group by category type
const byType = {};
budgetItems.forEach(item => {
    if (!byType[item.category_type]) {
        byType[item.category_type] = {
            count: 0,
            totalAllocated: 0,
            totalSpent: 0
        };
    }
    byType[item.category_type].count++;
    byType[item.category_type].totalAllocated += item.allocated;
    byType[item.category_type].totalSpent += item.spent;
});

console.log('\nBy Category Type:');
Object.entries(byType).forEach(([type, stats]) => {
    console.log(`  ${type}: ${stats.count} items`);
    console.log(`    Allocated: $${stats.totalAllocated.toFixed(2)}`);
    console.log(`    Spent: $${stats.totalSpent.toFixed(2)}`);
});

// Group by quarter
const byQuarter = {};
budgetItems.forEach(item => {
    if (!byQuarter[item.quarter]) {
        byQuarter[item.quarter] = {
            count: 0,
            totalAllocated: 0,
            totalSpent: 0
        };
    }
    byQuarter[item.quarter].count++;
    byQuarter[item.quarter].totalAllocated += item.allocated;
    byQuarter[item.quarter].totalSpent += item.spent;
});

console.log('\nBy Quarter:');
Object.entries(byQuarter).forEach(([quarter, stats]) => {
    console.log(`  ${quarter}: ${stats.count} items`);
    console.log(`    Allocated: $${stats.totalAllocated.toFixed(2)}`);
    console.log(`    Spent: $${stats.totalSpent.toFixed(2)}`);
});

console.log('\n✅ Budget data saved to budget-data.js');