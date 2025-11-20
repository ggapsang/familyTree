/**
 * TreeBuilder Service
 * Contains the business logic to build the family tree structure.
 */
var FamilyTreeApp = FamilyTreeApp || {};
FamilyTreeApp.Services = FamilyTreeApp.Services || {};

FamilyTreeApp.Services.TreeBuilder = class {
    constructor() {
        this.peopleMap = new Map();
        this.childrenMap = new Map();
        this.parentsMap = new Map();
        this.couples = new Map();
        this.personToCouple = new Map();
        this.finalRoots = [];
    }

    build(peopleData, relationData, coupleData) {
        this.reset();

        // 1. Initialize Maps & Process People
        this.processPeople(peopleData);

        // 2. Process Relations
        const validRelationsCount = this.processRelations(relationData);

        // 3. Identify Couples
        this.identifyCouples(coupleData);

        // 4. Find Roots
        this.findRoots();

        // 5. Build Tree Structure
        const nodeStructure = this.constructTreeStructure();

        return {
            config: {
                chart: {
                    container: "#tree-simple",
                    connectors: { type: 'step' },
                    node: { HTMLclass: 'node' }
                },
                nodeStructure: nodeStructure
            },
            stats: {
                peopleCount: this.peopleMap.size,
                relationCount: validRelationsCount
            }
        };
    }

    reset() {
        this.peopleMap.clear();
        this.childrenMap.clear();
        this.parentsMap.clear();
        this.couples.clear();
        this.personToCouple.clear();
        this.finalRoots = [];
    }

    processPeople(people) {
        people.forEach(p => {
            const name = p['이름'] ? String(p['이름']).trim() : '';
            if (name) {
                this.peopleMap.set(name, new FamilyTreeApp.Models.Person({
                    name: name,
                    birthYear: p['생년월일'],
                    gender: p['성별'] ? String(p['성별']).trim() : 'unknown'
                }));
            }
        });
    }

    processRelations(relations) {
        let count = 0;
        relations.forEach(rel => {
            const parent = rel['부모'] ? String(rel['부모']).trim() : '';
            const child = rel['자식'] ? String(rel['자식']).trim() : '';

            if (!parent || !child) return;
            count++;

            // Ensure parent/child exist in peopleMap
            if (!this.peopleMap.has(parent)) {
                this.peopleMap.set(parent, new FamilyTreeApp.Models.Person({ name: parent }));
            }
            if (!this.peopleMap.has(child)) {
                this.peopleMap.set(child, new FamilyTreeApp.Models.Person({ name: child }));
            }

            if (!this.childrenMap.has(parent)) this.childrenMap.set(parent, []);
            if (!this.childrenMap.get(parent).includes(child)) this.childrenMap.get(parent).push(child);

            if (!this.parentsMap.has(child)) this.parentsMap.set(child, []);
            if (!this.parentsMap.get(child).includes(parent)) this.parentsMap.get(child).push(parent);
        });
        return count;
    }

    identifyCouples(coupleData) {
        // 4a. Explicit Couples
        if (coupleData) {
            coupleData.forEach(row => {
                const p1 = row['이름'] ? String(row['이름']).trim() : '';
                const p2 = row['배우자'] ? String(row['배우자']).trim() : '';

                if (p1 && p2) {
                    this.ensurePersonExists(p1);
                    this.ensurePersonExists(p2);
                    this.createCouple(p1, p2);
                }
            });
        }

        // 4b. Infer Couples from Parents sharing a child
        this.parentsMap.forEach((parents, child) => {
            if (parents.length === 2) {
                const [p1, p2] = parents;
                const couple = this.createCouple(p1, p2);
                couple.addChild(child);
            }
        });
    }

    ensurePersonExists(name) {
        if (!this.peopleMap.has(name)) {
            this.peopleMap.set(name, new FamilyTreeApp.Models.Person({ name: name }));
        }
    }

    createCouple(p1, p2) {
        const key = [p1, p2].sort().join('&');
        if (!this.couples.has(key)) {
            const couple = new FamilyTreeApp.Models.Couple(p1, p2);
            this.couples.set(key, couple);
            this.personToCouple.set(p1, key);
            this.personToCouple.set(p2, key);
        }
        return this.couples.get(key);
    }

    findRoots() {
        const allNames = Array.from(this.peopleMap.keys());
        let rootCandidates = allNames.filter(name => !this.parentsMap.has(name));

        let trueRoots = rootCandidates.filter(name => {
            const coupleKey = this.personToCouple.get(name);
            if (coupleKey) {
                const couple = this.couples.get(coupleKey);
                const spouse = (couple.spouse1 === name) ? couple.spouse2 : couple.spouse1;
                if (this.parentsMap.has(spouse)) return false;
            }
            return true;
        });

        if (trueRoots.length === 0 && rootCandidates.length > 0) trueRoots = rootCandidates;
        if (trueRoots.length === 0 && allNames.length > 0) trueRoots = [allNames[0]];

        const uniqueRootKeys = new Set();
        trueRoots.forEach(name => {
            const coupleKey = this.personToCouple.get(name);
            if (coupleKey) {
                if (!uniqueRootKeys.has(coupleKey)) {
                    uniqueRootKeys.add(coupleKey);
                    this.finalRoots.push({ type: 'couple', key: coupleKey });
                }
            } else {
                if (!uniqueRootKeys.has(name)) {
                    uniqueRootKeys.add(name);
                    this.finalRoots.push({ type: 'person', key: name });
                }
            }
        });
    }

    constructTreeStructure() {
        this.processed = new Set();

        if (this.finalRoots.length === 1) {
            return this.buildNode(this.finalRoots[0].type, this.finalRoots[0].key);
        } else {
            const children = this.finalRoots.map(r => this.buildNode(r.type, r.key)).filter(n => n);
            return {
                innerHTML: '<div style="display:none"></div>',
                HTMLclass: 'node hidden-root',
                children: children
            };
        }
    }

    buildNode(type, key) {
        if (this.processed.has(key)) return null;
        this.processed.add(key);

        if (type === 'couple') {
            return this.buildCoupleNode(key);
        } else {
            return this.buildPersonNode(key);
        }
    }

    buildCoupleNode(key) {
        const couple = this.couples.get(key);
        const s1 = this.peopleMap.get(couple.spouse1);
        const s2 = this.peopleMap.get(couple.spouse2);

        this.processed.add(couple.spouse1);
        this.processed.add(couple.spouse2);

        // Determine blood relation
        let s1IsBlood = this.parentsMap.has(couple.spouse1);
        if (!s1IsBlood && this.finalRoots.some(r => r.key === key)) {
            if (s1.gender === '남') s1IsBlood = true;
        }

        let s2IsBlood = this.parentsMap.has(couple.spouse2);
        if (!s2IsBlood && this.finalRoots.some(r => r.key === key)) {
            if (s2.gender === '남') s2IsBlood = true;
        }

        // Gather children
        const childrenSet = new Set(couple.children);
        if (this.childrenMap.has(couple.spouse1)) this.childrenMap.get(couple.spouse1).forEach(c => childrenSet.add(c));
        if (this.childrenMap.has(couple.spouse2)) this.childrenMap.get(couple.spouse2).forEach(c => childrenSet.add(c));

        const childrenNodes = Array.from(childrenSet).map(childName => {
            const cKey = this.personToCouple.get(childName);
            return cKey ? this.buildNode('couple', cKey) : this.buildNode('person', childName);
        }).filter(n => n);

        return {
            innerHTML: FamilyTreeApp.View.Renderer.getCoupleTemplate(s1, s2, s1IsBlood, s2IsBlood),
            HTMLclass: 'node couple-node',
            children: childrenNodes.length > 0 ? childrenNodes : undefined
        };
    }

    buildPersonNode(key) {
        const person = this.peopleMap.get(key);
        let isBlood = this.parentsMap.has(key);

        if (!isBlood && this.finalRoots.some(r => r.key === key)) {
            if (person.gender === '남') isBlood = true;
        }

        const children = this.childrenMap.get(key);
        let childrenNodes = [];
        if (children && children.length > 0) {
            childrenNodes = children.map(childName => {
                const cKey = this.personToCouple.get(childName);
                return cKey ? this.buildNode('couple', cKey) : this.buildNode('person', childName);
            }).filter(n => n);
        }

        return {
            innerHTML: FamilyTreeApp.View.Renderer.getPersonTemplate(person, isBlood),
            HTMLclass: (person.gender === '남' ? 'node male' : 'node female') + (isBlood ? ' is-blood' : ' is-inlaw'),
            children: childrenNodes.length > 0 ? childrenNodes : undefined
        };
    }
};
