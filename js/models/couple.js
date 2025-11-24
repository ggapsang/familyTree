/**
 * Couple Model
 * Represents a marriage/union between two people.
 */
var FamilyTreeApp = FamilyTreeApp || {};
FamilyTreeApp.Models = FamilyTreeApp.Models || {};

FamilyTreeApp.Models.Couple = class {
    /**
     * Creates a new Couple instance.
     * @param {string} spouse1 - The ID (name) of the first spouse.
     * @param {string} spouse2 - The ID (name) of the second spouse.
     * @property {string} spouse1 - The ID of the first spouse.
     * @property {string} spouse2 - The ID of the second spouse.
     * @property {string[]} children - Array of child IDs (names).
     */
    constructor(spouse1, spouse2) {
        this.spouse1 = spouse1;
        this.spouse2 = spouse2;
        this.children = [];
    }

    /**
     * Generates a unique key for the couple.
     * The key is formed by sorting the spouse IDs and joining them with '&'.
     * @return {string} The unique key for the couple.
     */
    get key() {
        return [this.spouse1, this.spouse2].sort().join('&');
    }

    /**
     * Adds a child to the couple.
     * @param {string} childName - The ID (name) of the child to add.
     */
    addChild(childName) {
        if (!this.children.includes(childName)) {
            this.children.push(childName);
        }
    }
};
