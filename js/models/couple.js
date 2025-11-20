/**
 * Couple Model
 * Represents a marriage/union between two people.
 */
var FamilyTreeApp = FamilyTreeApp || {};
FamilyTreeApp.Models = FamilyTreeApp.Models || {};

FamilyTreeApp.Models.Couple = class {
    constructor(spouse1, spouse2) {
        this.spouse1 = spouse1; // Person object or name
        this.spouse2 = spouse2; // Person object or name
        this.children = []; // Array of child names (IDs)
    }

    get key() {
        return [this.spouse1, this.spouse2].sort().join('&');
    }

    addChild(childName) {
        if (!this.children.includes(childName)) {
            this.children.push(childName);
        }
    }
};
