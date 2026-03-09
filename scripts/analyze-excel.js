const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Referral Log 2025 2026 2.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  
  console.log('=== WORKBOOK ANALYSIS ===\n');
  console.log('Sheet Names:', workbook.SheetNames);
  console.log('\n');
  
  workbook.SheetNames.forEach(sheetName => {
    console.log(`\n=== SHEET: ${sheetName} ===\n`);
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });
    
    console.log(`Total Rows: ${data.length}`);
    
    if (data.length > 0) {
      console.log('\nColumn Headers:');
      Object.keys(data[0]).forEach(key => {
        console.log(`  - ${key}`);
      });
      
      console.log('\nFirst 3 Rows (sample data):');
      console.log(JSON.stringify(data.slice(0, 3), null, 2));
      
      console.log('\nData Type Analysis:');
      const columns = Object.keys(data[0]);
      columns.forEach(col => {
        const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
        const types = new Set(values.map(v => typeof v));
        const uniqueCount = new Set(values).size;
        console.log(`  ${col}:`);
        console.log(`    - Types: ${Array.from(types).join(', ')}`);
        console.log(`    - Non-empty values: ${values.length}`);
        console.log(`    - Unique values: ${uniqueCount}`);
        if (uniqueCount <= 10) {
          console.log(`    - Sample values: ${Array.from(new Set(values)).slice(0, 10).join(', ')}`);
        }
      });
    }
  });
  
} catch (error) {
  console.error('Error reading Excel file:', error.message);
  process.exit(1);
}
