const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Data from requirements
const people = [
    { "이름": "이상현", "생년월일": 1989, "성별": "남" },
    { "이름": "이윤정", "생년월일": 1991, "성별": "여" },
    { "이름": "이민우", "생년월일": 1961, "성별": "남" },
    { "이름": "신동화", "생년월일": 1962, "성별": "여" },
    { "이름": "이종수", "생년월일": 1905, "성별": "남" },
    { "이름": "전일분", "생년월일": 1907, "성별": "여" },
    { "이름": "이봉우", "생년월일": 1951, "성별": "남" },
    { "이름": "이상진", "생년월일": 1978, "성별": "남" }
];

const relations = [
    { "부모": "이민우", "자식": "이상현" },
    { "부모": "이민우", "자식": "이윤정" },
    { "부모": "신동화", "자식": "이상현" },
    { "부모": "신동화", "자식": "이윤정" },
    { "부모": "이종수", "자식": "이민우" },
    { "부모": "이종수", "자식": "이봉우" },
    { "부모": "이봉우", "자식": "이상진" }
];

// Create workbook
const wb = XLSX.utils.book_new();

// Create sheets
const wsPeople = XLSX.utils.json_to_sheet(people);
const wsRelations = XLSX.utils.json_to_sheet(relations);

// Add sheets to workbook
XLSX.utils.book_append_sheet(wb, wsPeople, "People");
XLSX.utils.book_append_sheet(wb, wsRelations, "Relationships");

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Write file
const filePath = path.join(dataDir, 'sample_family.xlsx');
XLSX.writeFile(wb, filePath);

console.log(`Sample Excel file created at: ${filePath}`);
