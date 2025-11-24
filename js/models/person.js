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
     * @property {string} id - The unique identifier for the person (currently the name).
     * @property {string} name - The name of the person.
     * @property {string} birthYear - The birth year of the person.
     * @property {string} gender - The gender of the person. Defaults to 'unknown'.
     * @property {boolean} isBlood - Indicates if the person is a blood relative (true) or in-law (false).
     */
    constructor(data) {
        this.id = data.name;
        this.name = data.name;
        this.birthYear = data.birthYear || '';
        this.gender = data.gender || 'unknown';
        this.isBlood = false; // Will be determined during tree building
    }
};
