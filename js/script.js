document.getElementById('excel-file').addEventListener('change', handleFileUpload, false);

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        processWorkbook(workbook);
        document.getElementById('excel-file').value = '';
    };
    reader.readAsArrayBuffer(file);
}

function processWorkbook(workbook) {
    try {
        if (!workbook.SheetNames || workbook.SheetNames.length < 2) {
            showError('엑셀 파일에 최소 2개의 시트가 필요합니다.');
            return;
        }

        let peopleData = null;
        let relationData = null;
        let coupleData = null;

        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet);
            if (json.length === 0) continue;
            const firstRow = json[0];
            if ('이름' in firstRow && !('배우자' in firstRow)) peopleData = json;
            else if ('부모' in firstRow && '자식' in firstRow) relationData = json;
            else if ('이름' in firstRow && '배우자' in firstRow) coupleData = json;
        }

        if (!peopleData || !relationData) {
            showError('데이터 시트를 찾을 수 없습니다. (이름/성별, 부모/자식 컬럼 확인 필요)');
            return;
        }

        const { config, stats } = buildTreeConfig(peopleData, relationData, coupleData);

        console.log(`Loaded: ${stats.peopleCount} people, ${stats.relationCount} relations`);
        showSuccess(`데이터 로드 성공! (사람: ${stats.peopleCount}명, 관계: ${stats.relationCount}건)`);

        renderTree(config);

    } catch (error) {
        console.error('Error:', error);
        showError(`오류 발생: ${error.message}`);
    }
}

function buildTreeConfig(people, relations, coupleData) {
    // 1. Initialize Maps
    const peopleMap = new Map();
    const childrenMap = new Map();
    const parentsMap = new Map();

    // 2. Process People (Handle whitespace)
    people.forEach(p => {
        const name = p['이름'] ? String(p['이름']).trim() : '';
        if (name) {
            peopleMap.set(name, {
                name: name,
                birthYear: p['생년월일'],
                gender: p['성별'] ? String(p['성별']).trim() : 'unknown'
            });
        }
    });

    // 3. Process Relations (Build Graph)
    let validRelationsCount = 0;
    relations.forEach(rel => {
        const parent = rel['부모'] ? String(rel['부모']).trim() : '';
        const child = rel['자식'] ? String(rel['자식']).trim() : '';

        if (!parent || !child) return;
        validRelationsCount++;

        // Ensure parent exists in peopleMap (even if missing from People sheet)
        if (!peopleMap.has(parent)) {
            peopleMap.set(parent, { name: parent, gender: 'unknown' });
        }
        // Ensure child exists
        if (!peopleMap.has(child)) {
            peopleMap.set(child, { name: child, gender: 'unknown' });
        }

        if (!childrenMap.has(parent)) childrenMap.set(parent, []);
        if (!childrenMap.get(parent).includes(child)) childrenMap.get(parent).push(child);

        if (!parentsMap.has(child)) parentsMap.set(child, []);
        if (!parentsMap.get(child).includes(parent)) parentsMap.get(child).push(parent);
    });

    // 4. Identify Couples (Parents sharing a child OR Explicit Couples)
    const couples = new Map();
    const personToCouple = new Map();

    // 4a. Explicit Couples from Sheet 3
    if (coupleData) {
        coupleData.forEach(row => {
            const p1 = row['이름'] ? String(row['이름']).trim() : '';
            const p2 = row['배우자'] ? String(row['배우자']).trim() : '';

            if (p1 && p2) {
                // Ensure both exist in peopleMap
                if (!peopleMap.has(p1)) peopleMap.set(p1, { name: p1, gender: 'unknown' });
                if (!peopleMap.has(p2)) peopleMap.set(p2, { name: p2, gender: 'unknown' });

                const key = [p1, p2].sort().join('&');
                if (!couples.has(key)) {
                    couples.set(key, { spouse1: p1, spouse2: p2, children: [] });
                    personToCouple.set(p1, key);
                    personToCouple.set(p2, key);
                }
            }
        });
    }

    // 4b. Infer Couples from Parents sharing a child
    parentsMap.forEach((parents, child) => {
        if (parents.length === 2) {
            const [p1, p2] = parents;
            const key = [p1, p2].sort().join('&');

            if (!couples.has(key)) {
                couples.set(key, { spouse1: p1, spouse2: p2, children: [] });
                personToCouple.set(p1, key);
                personToCouple.set(p2, key);
            }

            if (!couples.get(key).children.includes(child)) {
                couples.get(key).children.push(child);
            }
        }
    });

    // 5. Find Roots (Nodes with NO parents)
    const allNames = Array.from(peopleMap.keys());
    let rootCandidates = allNames.filter(name => !parentsMap.has(name));

    // Filter out spouses who are married to someone that HAS parents
    // (This prevents married-in spouses from being separate roots)
    let trueRoots = rootCandidates.filter(name => {
        const coupleKey = personToCouple.get(name);
        if (coupleKey) {
            const couple = couples.get(coupleKey);
            const spouse = (couple.spouse1 === name) ? couple.spouse2 : couple.spouse1;
            // If spouse has parents, I am likely not the main root
            if (parentsMap.has(spouse)) return false;
        }
        return true;
    });

    // If we filtered everyone out (circular?), revert
    if (trueRoots.length === 0 && rootCandidates.length > 0) trueRoots = rootCandidates;
    if (trueRoots.length === 0 && allNames.length > 0) trueRoots = [allNames[0]]; // Fallback

    // Group roots by couple to avoid duplicates
    const uniqueRootKeys = new Set();
    const finalRoots = [];

    trueRoots.forEach(name => {
        const coupleKey = personToCouple.get(name);
        if (coupleKey) {
            if (!uniqueRootKeys.has(coupleKey)) {
                uniqueRootKeys.add(coupleKey);
                finalRoots.push({ type: 'couple', key: coupleKey });
            }
        } else {
            if (!uniqueRootKeys.has(name)) {
                uniqueRootKeys.add(name);
                finalRoots.push({ type: 'person', key: name });
            }
        }
    });

    console.log('Roots found:', finalRoots);

    // 6. Build Tree Function
    const processed = new Set();

    function buildNode(type, key) {
        if (processed.has(key)) return null;
        processed.add(key);

        if (type === 'couple') {
            const couple = couples.get(key);
            const s1 = peopleMap.get(couple.spouse1);
            const s2 = peopleMap.get(couple.spouse2);

            // Mark spouses as processed
            processed.add(couple.spouse1);
            processed.add(couple.spouse2);

            // Determine blood relation status (Has parents?)
            // Special Rule: If it's a Root Node (no parents), Male = Blood, Female = In-law
            let s1IsBlood = parentsMap.has(couple.spouse1);
            if (!s1IsBlood && finalRoots.some(r => r.key === key)) {
                // If I am part of a root couple and have no parents
                if (s1.gender === '남') s1IsBlood = true;
            }

            let s2IsBlood = parentsMap.has(couple.spouse2);
            if (!s2IsBlood && finalRoots.some(r => r.key === key)) {
                if (s2.gender === '남') s2IsBlood = true;
            }

            const node = {
                innerHTML: `
                    <div class="couple-container">
                        <div class="person-box ${s1.gender === '남' ? 'male' : 'female'} ${s1IsBlood ? 'is-blood' : 'is-inlaw'}">
                            <div class="node-name">${s1.name}</div>
                            <div class="node-desc">${s1.birthYear ? s1.birthYear + '년' : ''}</div>
                        </div>
                        <div class="couple-connector"></div>
                        <div class="person-box ${s2.gender === '남' ? 'male' : 'female'} ${s2IsBlood ? 'is-blood' : 'is-inlaw'}">
                            <div class="node-name">${s2.name}</div>
                            <div class="node-desc">${s2.birthYear ? s2.birthYear + '년' : ''}</div>
                        </div>
                    </div>
                `,
                HTMLclass: 'node couple-node'
            };

            // Gather children
            const childrenSet = new Set(couple.children);
            if (childrenMap.has(couple.spouse1)) childrenMap.get(couple.spouse1).forEach(c => childrenSet.add(c));
            if (childrenMap.has(couple.spouse2)) childrenMap.get(couple.spouse2).forEach(c => childrenSet.add(c));

            if (childrenSet.size > 0) {
                node.children = Array.from(childrenSet).map(childName => {
                    const cKey = personToCouple.get(childName);
                    return cKey ? buildNode('couple', cKey) : buildNode('person', childName);
                }).filter(n => n);
            };

            const children = childrenMap.get(key);
            if (children && children.length > 0) {
                node.children = children.map(childName => {
                    const cKey = personToCouple.get(childName);
                    return cKey ? buildNode('couple', cKey) : buildNode('person', childName);
                }).filter(n => n);
            }
            return node;
        } else {
            const person = peopleMap.get(key);
            let isBlood = parentsMap.has(key);

            // Special Rule for Single Root
            if (!isBlood && finalRoots.some(r => r.key === key)) {
                if (person.gender === '남') isBlood = true;
            }

            const node = {
                innerHTML: `
                    <div class="node-name">${person.name}</div>
                    <div class="node-desc">${person.birthYear ? person.birthYear + '년' : ''}</div>
                `,
                HTMLclass: (person.gender === '남' ? 'node male' : 'node female') + (isBlood ? ' is-blood' : ' is-inlaw')
            };

            const children = childrenMap.get(key);
            if (children && children.length > 0) {
                node.children = children.map(childName => {
                    const cKey = personToCouple.get(childName);
                    return cKey ? buildNode('couple', cKey) : buildNode('person', childName);
                }).filter(n => n);
            }
            return node;
        }
    }

    // 7. Construct Final Structure
    let nodeStructure;

    if (finalRoots.length === 1) {
        nodeStructure = buildNode(finalRoots[0].type, finalRoots[0].key);
    } else {
        // Multiple roots: Create a container
        const children = finalRoots.map(r => buildNode(r.type, r.key)).filter(n => n);
        nodeStructure = {
            innerHTML: '<div style="display:none"></div>', // Hidden root
            HTMLclass: 'node hidden-root',
            children: children
        };
    }

    if (!nodeStructure) {
        return {
            config: createEmptyConfig(),
            stats: { peopleCount: 0, relationCount: 0 }
        };
    }

    return {
        config: {
            chart: {
                container: "#tree-simple",
                connectors: { type: 'step' },
                node: { HTMLclass: 'node' },
            },
            nodeStructure: nodeStructure
        },
        stats: {
            peopleCount: peopleMap.size,
            relationCount: validRelationsCount
        }
    };
}

function createEmptyConfig() {
    return {
        chart: { container: "#tree-simple" },
        nodeStructure: { innerHTML: '<div>No Data</div>' }
    };
}

function renderTree(config) {
    document.getElementById('tree-simple').innerHTML = '';
    new Treant(config);
}

function showError(msg) {
    document.getElementById('tree-simple').innerHTML = `<div style="color:red;padding:20px;">${msg}</div>`;
}

function showSuccess(msg) {
    const el = document.querySelector('.help-text');
    if (el) el.textContent = msg;
}
