/**
 * Person Model
 * Represents an individual in the family tree.
 */
var FamilyTreeApp = FamilyTreeApp || {};
FamilyTreeApp.Models = FamilyTreeApp.Models || {};

FamilyTreeApp.Models.Person = class {
    /**
     * Creates a new Person instance.
     * @param {Object} data - The raw data object from the Excel file.
     * @param {string} data.name - The name of the person.
     * @param {string} [data.birthYear] - The birth year of the person.
     * @param {string} [data.gender] - The gender of the person ('남' or '여').
     */
    constructor(data) {
        /** @type {string} The unique identifier for the person (currently the name). */
        this.id = data.name; 
        /** @type {string} The name of the person. */
        this.name = data.name;
        /** @type {string} The birth year of the person. */
        this.birthYear = data.birthYear || '';
        /** @type {string} The gender of the person. Defaults to 'unknown'. */
        this.gender = data.gender || 'unknown';
        /** @type {boolean} Indicates if the person is a blood relative (true) or in-law (false). */
        this.isBlood = false; // Will be determined during tree building
    }
};
