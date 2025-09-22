import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const excelFile = path.join(process.cwd(), '..', 'Copy of 2024-2025 Budget Updated.xlsx');

// Read the Excel file
const workbook = XLSX.readFile(excelFile);

// Get sheet names
console.log('Available sheets:', workbook.SheetNames);
console.log();

// Process each sheet
workbook.SheetNames.forEach((sheetName, index) => {
    console.log(`\n=== Sheet: ${sheetName} ===\n`);

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null,
        blankrows: false
    });

    // Show first 10 rows to understand structure
    console.log(`First 10 rows of "${sheetName}":`);
    jsonData.slice(0, 10).forEach((row, i) => {
        console.log(`Row ${i}:`, row);
    });

    console.log(`\nTotal rows in "${sheetName}": ${jsonData.length}`);
});

// Try to extract budget data with headers
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const dataWithHeaders = XLSX.utils.sheet_to_json(firstSheet, {
    defval: null,
    blankrows: false
});

console.log('\n=== Data with headers (first 5 items) ===');
console.log(JSON.stringify(dataWithHeaders.slice(0, 5), null, 2));

// Save to JSON for further processing
fs.writeFileSync('excel-data.json', JSON.stringify(dataWithHeaders, null, 2));
console.log('\n✅ Data saved to excel-data.json');