/**
 * Renderer View
 * Handles DOM updates and HTML template generation.
 */
var FamilyTreeApp = FamilyTreeApp || {};
FamilyTreeApp.View = FamilyTreeApp.View || {};

FamilyTreeApp.View.Renderer = class {
    constructor() {
        this.containerId = 'tree-simple';
        this.helpTextSelector = '.help-text';
    }

    render(config) {
        document.getElementById(this.containerId).innerHTML = '';
        new Treant(config);
    }

    showError(msg) {
        document.getElementById(this.containerId).innerHTML = `<div style="color:red;padding:20px;">${msg}</div>`;
    }

    showSuccess(msg) {
        const el = document.querySelector(this.helpTextSelector);
        if (el) el.textContent = msg;
    }

    static getPersonTemplate(person, isBlood) {
        return `
            <div class="node-name">${person.name}</div>
            <div class="node-desc">${person.birthYear ? person.birthYear + '년' : ''}</div>
        `;
    }

    static getCoupleTemplate(s1, s2, s1IsBlood, s2IsBlood) {
        return `
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
        `;
    }
};
