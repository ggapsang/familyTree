/**
 * GraphBuilder Service
 * Transforms family data into Cytoscape elements using depth-based merging.
 * This approach builds multiple family trees and merges them at a common pivot node.
 */
var FamilyTreeApp = FamilyTreeApp || {};
FamilyTreeApp.Services = FamilyTreeApp.Services || {};

FamilyTreeApp.Services.GraphBuilder = class {
    constructor() {
        this.peopleMap = new Map();
        this.couples = new Map();
        this.personToCouple = new Map();
        this.parentsMap = new Map(); // childKey -> [parentKeys]
        this.childrenMap = new Map(); // parentKey -> [childKeys]
        this.depthMap = new Map(); // personKey -> depth from pivot
        this.positionMap = new Map(); // personKey -> {x, y}
    }

    // Helper: Normalize name for keys (remove spaces and hyphens)
    normalize(name) {
        return name ? String(name).replace(/[\s-]+/g, '').trim() : '';
    }

    build(peopleData, relationData, coupleData) {
        this.reset();
        console.log("Starting Depth-Based Graph Build...");

        // 1. Process People
        this.processPeople(peopleData);

        // 2. Process Relations
        const validRelationsCount = this.processRelations(relationData);

        // 3. Identify Couples
        this.identifyCouples(coupleData);

        // 4. Determine Blood/In-law Status
        this.determineStatus();

        // 5. Find Pivot Node (central person)
        const pivotId = this.findPivotNode();
        console.log("Pivot Node:", pivotId);

        // 6. Compute Depths from Pivot
        this.computeDepths(pivotId);

        // 7. Compute Positions
        this.computePositions();

        // 8. Generate Cytoscape Elements
        const elements = this.generateElements();

        console.log(`Graph Build Complete. Nodes: ${this.peopleMap.size}, Couples: ${this.couples.size}, Relations: ${validRelationsCount}`);
        console.log("Depth Map:", Array.from(this.depthMap.entries()));

        return {
            elements: elements,
            stats: {
                peopleCount: this.peopleMap.size,
                relationCount: validRelationsCount
            }
        };
    }

    reset() {
        this.peopleMap.clear();
        this.couples.clear();
        this.personToCouple.clear();
        this.parentsMap.clear();
        this.childrenMap.clear();
        this.depthMap.clear();
        this.positionMap.clear();
    }

    processPeople(people) {
        people.forEach(p => {
            const rawName = p['이름'] ? String(p['이름']).trim() : '';
            if (rawName) {
                const key = this.normalize(rawName);
                this.peopleMap.set(key, {
                    id: key,
                    name: rawName, // Keep original for display
                    birthYear: p['생년월일'],
                    gender: p['성별'] ? String(p['성별']).trim() : 'unknown',
                    isBlood: false
                });
            }
        });
    }

    processRelations(relations) {
        let count = 0;
        relations.forEach(rel => {
            const parentRaw = rel['부모'] ? String(rel['부모']).trim() : '';
            const childRaw = rel['자식'] ? String(rel['자식']).trim() : '';

            if (!parentRaw || !childRaw) return;

            const parentKey = this.normalize(parentRaw);
            const childKey = this.normalize(childRaw);

            count++;

            this.ensurePersonExists(parentKey, parentRaw);
            this.ensurePersonExists(childKey, childRaw);

            // Update Maps
            if (!this.parentsMap.has(childKey)) this.parentsMap.set(childKey, []);
            if (!this.parentsMap.get(childKey).includes(parentKey)) this.parentsMap.get(childKey).push(parentKey);

            if (!this.childrenMap.has(parentKey)) this.childrenMap.set(parentKey, []);
            if (!this.childrenMap.get(parentKey).includes(childKey)) this.childrenMap.get(parentKey).push(childKey);
        });
        return count;
    }

    identifyCouples(coupleData) {
        // Explicit Couples
        if (coupleData) {
            coupleData.forEach(row => {
                const p1Raw = row['이름'] ? String(row['이름']).trim() : '';
                const p2Raw = row['배우자'] ? String(row['배우자']).trim() : '';

                if (p1Raw && p2Raw) {
                    const p1Key = this.normalize(p1Raw);
                    const p2Key = this.normalize(p2Raw);

                    this.ensurePersonExists(p1Key, p1Raw);
                    this.ensurePersonExists(p2Key, p2Raw);
                    this.createCouple(p1Key, p2Key);
                }
            });
        }

        // Inferred Couples (Parents sharing a child)
        this.parentsMap.forEach((parents, childKey) => {
            if (parents.length === 2) {
                this.createCouple(parents[0], parents[1]);
            }
        });
    }

    createCouple(p1Key, p2Key) {
        const key = [p1Key, p2Key].sort().join('&');
        if (!this.couples.has(key)) {
            this.couples.set(key, { id: key, spouse1: p1Key, spouse2: p2Key });
            this.personToCouple.set(p1Key, key);
            this.personToCouple.set(p2Key, key);
        }
        return this.couples.get(key);
    }

    ensurePersonExists(key, rawName) {
        if (!this.peopleMap.has(key)) {
            this.peopleMap.set(key, {
                id: key,
                name: rawName || key,
                gender: 'unknown',
                isBlood: false
            });
        }
    }

    determineStatus() {
        this.peopleMap.forEach(person => {
            const hasParents = this.parentsMap.has(person.id) && this.parentsMap.get(person.id).length > 0;

            if (hasParents) {
                person.isBlood = true;
            } else {
                if (person.gender === '남') {
                    person.isBlood = true;
                } else {
                    person.isBlood = false;
                }
            }
        });
    }

    // Find the pivot node (person with most connections - likely the central person)
    findPivotNode() {
        let maxConnections = 0;
        let pivotId = null;

        this.peopleMap.forEach((person, id) => {
            const parentCount = this.parentsMap.has(id) ? this.parentsMap.get(id).length : 0;
            const childCount = this.childrenMap.has(id) ? this.childrenMap.get(id).length : 0;
            const spouseCount = this.personToCouple.has(id) ? 1 : 0;

            const connections = parentCount + childCount + spouseCount;

            if (connections > maxConnections) {
                maxConnections = connections;
                pivotId = id;
            }
        });

        return pivotId || Array.from(this.peopleMap.keys())[0];
    }

    // Compute depth from pivot node using BFS
    computeDepths(pivotId) {
        this.depthMap.set(pivotId, 0);

        const queue = [pivotId];
        const visited = new Set([pivotId]);

        while (queue.length > 0) {
            const currentId = queue.shift();
            const currentDepth = this.depthMap.get(currentId);

            // Process parents (upward, positive depth)
            if (this.parentsMap.has(currentId)) {
                this.parentsMap.get(currentId).forEach(parentId => {
                    if (!visited.has(parentId)) {
                        visited.add(parentId);
                        this.depthMap.set(parentId, currentDepth + 1);
                        queue.push(parentId);
                    }
                });
            }

            // Process children (downward, negative depth)
            if (this.childrenMap.has(currentId)) {
                this.childrenMap.get(currentId).forEach(childId => {
                    if (!visited.has(childId)) {
                        visited.add(childId);
                        this.depthMap.set(childId, currentDepth - 1);
                        queue.push(childId);
                    }
                });
            }

            // Process spouse (same depth)
            if (this.personToCouple.has(currentId)) {
                const coupleId = this.personToCouple.get(currentId);
                const couple = this.couples.get(coupleId);
                const spouseId = couple.spouse1 === currentId ? couple.spouse2 : couple.spouse1;

                if (!visited.has(spouseId)) {
                    visited.add(spouseId);
                    this.depthMap.set(spouseId, currentDepth);
                    queue.push(spouseId);
                }
            }
        }
    }

    // Compute horizontal positions for nodes at the same depth
    computePositions() {
        // Group nodes by depth
        const depthGroups = new Map();

        this.depthMap.forEach((depth, personId) => {
            if (!depthGroups.has(depth)) {
                depthGroups.set(depth, []);
            }
            depthGroups.get(depth).push(personId);
        });

        // Assign positions
        const verticalGap = 150;
        const horizontalGap = 200;

        depthGroups.forEach((people, depth) => {
            people.forEach((personId, index) => {
                this.positionMap.set(personId, {
                    x: depth * verticalGap,
                    y: index * horizontalGap
                });
            });
        });
    }

    generateElements() {
        const elements = [];

        // 1. Couple Nodes (Compound Nodes)
        this.couples.forEach(couple => {
            elements.push({
                data: { id: couple.id, type: 'couple' },
                classes: 'couple'
            });
        });

        // 2. Person Nodes with position metadata
        this.peopleMap.forEach(person => {
            const coupleId = this.personToCouple.get(person.id);
            const position = this.positionMap.get(person.id) || { x: 0, y: 0 };
            const depth = this.depthMap.get(person.id) || 0;

            const data = {
                id: person.id,
                name: person.name,
                birthYear: person.birthYear,
                gender: person.gender,
                isBlood: person.isBlood,
                type: 'person',
                depth: depth,
                posX: position.x,
                posY: position.y
            };

            if (coupleId) {
                data.parent = coupleId;
            }

            elements.push({
                data: data,
                classes: `person ${person.gender === '남' ? 'male' : 'female'} ${person.isBlood ? 'blood' : 'inlaw'}`,
                position: { x: position.y, y: position.x } // Note: swapped for vertical layout
            });
        });

        // 3. Edges (Relations)
        this.parentsMap.forEach((parents, childId) => {
            parents.forEach(parentId => {
                const edgeId = `${parentId}->${childId}`;

                elements.push({
                    data: {
                        id: edgeId,
                        source: parentId,
                        target: childId
                    },
                    classes: 'hierarchy'
                });
            });
        });

        return elements;
    }
};
