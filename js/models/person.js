/**
 * Person Model
 * Represents an individual in the family tree.
 */
var FamilyTreeApp = FamilyTreeApp || {};
FamilyTreeApp.Models = FamilyTreeApp.Models || {};

FamilyTreeApp.Models.Person = class {
    constructor(data) {
        this.id = data.name; // Using name as ID for now
        this.name = data.name;
        this.birthYear = data.birthYear || '';
        this.gender = data.gender || 'unknown';
        this.isBlood = false; // Will be determined during tree building
    }
};
