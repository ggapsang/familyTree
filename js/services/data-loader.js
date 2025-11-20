/**
 * DataLoader Service
 * Handles reading and parsing of Excel files.
 */
var FamilyTreeApp = FamilyTreeApp || {};
FamilyTreeApp.Services = FamilyTreeApp.Services || {};

FamilyTreeApp.Services.DataLoader = class {
    constructor() { }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const result = this.processWorkbook(workbook);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    }

    processWorkbook(workbook) {
        if (!workbook.SheetNames || workbook.SheetNames.length < 2) {
            throw new Error('엑셀 파일에 최소 2개의 시트가 필요합니다.');
        }

        let peopleData = null;
        let relationData = null;
        let coupleData = null;

        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet);
            if (json.length === 0) continue;
            const firstRow = json[0];

            // Simple heuristic to identify sheets
            if ('이름' in firstRow && !('배우자' in firstRow)) peopleData = json;
            else if ('부모' in firstRow && '자식' in firstRow) relationData = json;
            else if ('이름' in firstRow && '배우자' in firstRow) coupleData = json;
        }

        if (!peopleData || !relationData) {
            throw new Error('데이터 시트를 찾을 수 없습니다. (이름/성별, 부모/자식 컬럼 확인 필요)');
        }

        return { peopleData, relationData, coupleData };
    }
};
