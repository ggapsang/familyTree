/**
 * Renderer View
 * Handles DOM updates and Cytoscape graph rendering.
 */
var FamilyTreeApp = FamilyTreeApp || {};
FamilyTreeApp.View = FamilyTreeApp.View || {};

FamilyTreeApp.View.Renderer = class {
    constructor() {
        this.containerId = 'tree-simple';
        this.helpTextSelector = '.help-text';
        this.cy = null;
    }

    render(data) {
        // data contains { elements: [], stats: {} }

        // Initialize Cytoscape
        this.cy = cytoscape({
            container: document.getElementById(this.containerId),

            elements: data.elements,

            style: [
                // Core Node Style (Person)
                {
                    selector: 'node[type="person"]',
                    style: {
                        'shape': 'rectangle',
                        'width': '120px',
                        'height': '60px',
                        'background-color': '#ffffff',
                        'border-width': 3,
                        'border-color': '#ccc', // Default
                        'label': 'data(name)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'font-size': '14px',
                        'text-wrap': 'wrap',
                        'text-max-width': '100px'
                    }
                },
                // Gender Colors (Top Border simulation via border-color for now, or full border)
                // Cytoscape doesn't support individual border side colors easily without extensions.
                // We will use border color for Blood/In-law and background or ghost node for gender?
                // Let's stick to the plan: 
                // Male: Blue-ish theme? 
                // Let's use border color for Blood/In-law (Black/Red) and text/background hint for gender.

                // Actually, user wanted "Male Blue-ish, Female Pink-ish".
                // Let's use background color for gender (light) and border for status.
                {
                    selector: 'node.male',
                    style: {
                        'background-color': '#eef6ff' // Light Blue
                    }
                },
                {
                    selector: 'node.female',
                    style: {
                        'background-color': '#fff0f5' // Light Pink
                    }
                },

                // Blood vs In-law Borders
                {
                    selector: 'node.blood',
                    style: {
                        'border-color': '#333', // Black
                        'border-width': 3
                    }
                },
                {
                    selector: 'node.inlaw',
                    style: {
                        'border-color': '#e74c3c', // Red
                        'border-width': 3
                    }
                },


                // Parent-Child Edges (general edges)
                {
                    selector: 'edge.hierarchy',
                    style: {
                        'width': 2,
                        'line-color': '#999',
                        'target-arrow-color': '#999',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'z-index': 10
                    }
                },

                // Couple Edges (Red subtle lines between spouses) - MUST come after general edge
                {
                    selector: 'edge.couple-edge',
                    style: {
                        'width': 1,
                        'line-color': '#e74c3c',
                        'opacity': 0.4,
                        'curve-style': 'straight',
                        'target-arrow-shape': 'none',
                        'z-index': 1
                    }
                }
            ],

            layout: {
                name: 'preset',
                padding: 50
            },

            wheelSensitivity: 0.2
        });

        // Add birth year to label if present
        this.cy.nodes('[type="person"]').forEach(node => {
            const birthYear = node.data('birthYear');
            if (birthYear) {
                node.style('label', `${node.data('name')}\n(${birthYear})`);
            }
        });
    }

    showError(msg) {
        document.getElementById(this.containerId).innerHTML = `<div style="color:red;padding:20px;">${msg}</div>`;
    }

    showSuccess(msg) {
        const el = document.querySelector(this.helpTextSelector);
        if (el) el.textContent = msg;
    }
};
