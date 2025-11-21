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
        console.log("Position Map:", Array.from(this.positionMap.entries()));
        console.log("Total Elements:", elements.length);

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

        console.log(`Depth computation complete. Total nodes with depth: ${this.depthMap.size}`);
    }

    // Compute horizontal positions for nodes at the same depth
    // Uses intelligent alignment to minimize edge crossings
    computePositions() {
        // Group nodes by depth
        const depthGroups = new Map();

        this.depthMap.forEach((depth, personId) => {
            if (!depthGroups.has(depth)) {
                depthGroups.set(depth, []);
            }
            depthGroups.get(depth).push(personId);
        });

        const verticalGap = 150;
        const horizontalGap = 120; // Reduced from 200 for more compact layout

        // Sort depths from highest (ancestors) to lowest (descendants)
        const sortedDepths = Array.from(depthGroups.keys()).sort((a, b) => b - a);

        // Process each depth level
        sortedDepths.forEach(depth => {
            const people = depthGroups.get(depth);

            // Build family groups at this depth
            const familyGroups = this.buildFamilyGroups(people, depth);

            // Position family groups, considering parent positions
            this.positionFamilyGroups(familyGroups, depth, verticalGap, horizontalGap);
        });
    }

    // Build family groups: siblings together (couples are handled during positioning)
    buildFamilyGroups(people, depth) {
        const processed = new Set();
        const groups = [];

        // Group siblings (people with same parents)
        const siblingGroups = new Map();
        people.forEach(personId => {
            const parents = this.parentsMap.get(personId) || [];
            if (parents.length === 0) return; // Skip people with no parents

            const parentKey = [...parents].sort().join('&');

            if (!siblingGroups.has(parentKey)) {
                siblingGroups.set(parentKey, []);
            }
            siblingGroups.get(parentKey).push(personId);
        });

        // Add sibling groups with intelligent sorting
        siblingGroups.forEach((siblings, parentKey) => {
            if (siblings.length > 0) {
                // Sort siblings: more children → left, merge points → right
                const sortedSiblings = siblings.sort((a, b) => {
                    const aChildren = (this.childrenMap.get(a) || []).length;
                    const bChildren = (this.childrenMap.get(b) || []).length;
                    const aHasSpouse = this.personToCouple.has(a);
                    const bHasSpouse = this.personToCouple.has(b);

                    // Priority 1: Merge points (has spouse) → right (higher index)
                    if (aHasSpouse && !bHasSpouse) return 1;  // a goes right
                    if (!aHasSpouse && bHasSpouse) return -1; // b goes right

                    // Priority 2: Among non-merge-points, more children → left (lower index)
                    if (aChildren !== bChildren) {
                        return bChildren - aChildren; // Descending order (more children first)
                    }

                    // Default: maintain original order
                    return 0;
                });

                groups.push({
                    type: 'siblings',
                    members: sortedSiblings,
                    parentKey: parentKey
                });
                sortedSiblings.forEach(s => processed.add(s));
            }
        });

        // Add remaining singles
        people.forEach(personId => {
            if (!processed.has(personId)) {
                groups.push({
                    type: 'single',
                    members: [personId]
                });
            }
        });

        console.log(`Depth ${depth} - Family Groups:`, groups.map(g => ({
            type: g.type,
            members: g.members.map(m => this.peopleMap.get(m)?.name),
            childCounts: g.members.map(m => (this.childrenMap.get(m) || []).length),
            hasSpouse: g.members.map(m => this.personToCouple.has(m))
        })));

        return groups;
    }

    // Position family groups to minimize edge crossings
    positionFamilyGroups(groups, depth, verticalGap, horizontalGap) {
        // Calculate ideal position for each group based on parent positions
        const groupsWithPositions = groups.map(group => {
            let idealY = 0;
            let hasParentPosition = false;

            // Calculate center of parents
            group.members.forEach(personId => {
                const parents = this.parentsMap.get(personId) || [];
                parents.forEach(parentId => {
                    const parentPos = this.positionMap.get(parentId);
                    if (parentPos) {
                        idealY += parentPos.y;
                        hasParentPosition = true;
                    }
                });
            });

            if (hasParentPosition) {
                const parentCount = group.members.reduce((count, personId) => {
                    return count + (this.parentsMap.get(personId) || []).length;
                }, 0);
                idealY = parentCount > 0 ? idealY / parentCount : 0;
            }

            return {
                group: group,
                idealY: idealY,
                hasParentPosition: hasParentPosition
            };
        });

        // Sort groups by ideal position
        groupsWithPositions.sort((a, b) => {
            // Groups with parent positions come first, sorted by position
            if (a.hasParentPosition && !b.hasParentPosition) return -1;
            if (!a.hasParentPosition && b.hasParentPosition) return 1;
            return a.idealY - b.idealY;
        });

        // Assign actual positions
        let currentY = 0;

        groupsWithPositions.forEach(({ group, idealY, hasParentPosition }) => {
            // Try to position near ideal if possible
            if (hasParentPosition && currentY < idealY) {
                currentY = Math.max(currentY, idealY - (group.members.length * horizontalGap / 2));
            }

            // Position members of this group
            if (group.type === 'siblings' || group.type === 'single') {
                const positionedInCouple = new Set(); // Track people already positioned as part of a couple

                group.members.forEach(personId => {
                    if (positionedInCouple.has(personId)) return; // Skip if already positioned

                    // Check if this person is in a couple at this depth
                    const coupleId = this.personToCouple.get(personId);
                    let isCouple = false;
                    let spouseId = null;

                    if (coupleId) {
                        const couple = this.couples.get(coupleId);
                        spouseId = couple.spouse1 === personId ? couple.spouse2 : couple.spouse1;

                        // Check if spouse is at the same depth
                        if (this.depthMap.get(spouseId) === this.depthMap.get(personId)) {
                            isCouple = true;
                        }
                    }

                    // Position this person
                    this.positionMap.set(personId, {
                        x: this.depthMap.get(personId) * 150, // verticalGap
                        y: currentY
                    });

                    if (isCouple && spouseId) {
                        // Position spouse next to this person
                        this.positionMap.set(spouseId, {
                            x: this.depthMap.get(spouseId) * 150,
                            y: currentY + 0.5 * horizontalGap // Tighter couple spacing
                        });
                        currentY += 1.6 * horizontalGap; // Total space for couple
                        positionedInCouple.add(spouseId); // Mark spouse as positioned
                    } else {
                        currentY += horizontalGap; // Normal spacing for single person
                    }
                });
            }
        });
    }

    generateElements() {
        const elements = [];

        // 1. Person Nodes with position metadata
        this.peopleMap.forEach(person => {
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

            elements.push({
                data: data,
                classes: `person ${person.gender === '남' ? 'male' : 'female'} ${person.isBlood ? 'blood' : 'inlaw'}`,
                position: { x: position.y, y: -position.x } // Inverted y to put ancestors at top
            });
        });

        // 2. Couple Edges (Red undirected edges between spouses)
        this.couples.forEach(couple => {
            elements.push({
                data: {
                    id: `couple-${couple.id}`,
                    source: couple.spouse1,
                    target: couple.spouse2
                },
                classes: 'couple-edge'
            });
        });

        // 3. Parent-Child Edges (Relations)
        this.parentsMap.forEach((parents, childId) => {
            // Check if both parents are a couple
            if (parents.length === 2) {
                const coupleKey = [parents[0], parents[1]].sort().join('&');

                if (this.couples.has(coupleKey)) {
                    // Parents are a couple - create single edge from first parent (father) to child
                    const edgeId = `${parents[0]}->${childId}`;

                    elements.push({
                        data: {
                            id: edgeId,
                            source: parents[0], // Use first parent instead of couple node
                            target: childId
                        },
                        classes: 'hierarchy'
                    });
                } else {
                    // Parents are not a couple - create separate edges
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
                }
            } else {
                // Single parent - create edge from parent to child
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
            }
        });

        return elements;
    }
};
