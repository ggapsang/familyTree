/**
 * Renderer View
 * Handles DOM updates and Cytoscape graph rendering.
 */
var FamilyTreeApp = FamilyTreeApp || {};
FamilyTreeApp.View = FamilyTreeApp.View || {};

FamilyTreeApp.View.Renderer = class {
    /**
     * Initializes the Renderer.
     * @property {string} containerId - ID of the DOM element to render the graph in.
     * @property {string} helpTextSelector - Selector for the help text element.
     * @property {Object} cy - The Cytoscape instance.
     */
    constructor() {
        this.containerId = 'tree-simple';
        this.helpTextSelector = '.help-text';
        this.cy = null;
    }

    /**
     * Renders the family tree graph using Cytoscape.js.
     * @param {Object} data - The data object containing elements and stats.
     * @param {Array} data.elements - Array of Cytoscape elements.
     * @param {Object} data.stats - Statistics about the graph.
     */
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
                        'shape': 'ellipse',
                        'width': '100px',
                        'height': '100px',  // Same as width for perfect circle
                        'background-color': '#ffffff',
                        'border-width': 3,
                        'border-color': '#ccc', // Default
                        'label': 'data(name)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'font-size': '14px',
                        'text-wrap': 'wrap',
                        'text-max-width': '80px'
                    }
                },
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

                // Couple Edges (Red subtle lines between spouses)
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
                name: 'cola',
                animate: true,
                randomize: false,
                avoidOverlap: true,
                handleDisconnected: true,
                convergenceThreshold: 0.01,
                nodeSpacing: 50,
                edgeLength: function (edge) {
                    // Keep couple edges very short
                    if (edge.hasClass('couple-edge')) {
                        return 30;
                    }
                    return 150;
                },
                // Preserve hierarchical structure
                flow: { axis: 'y', minSeparation: 150 },
                alignment: function (node) {
                    return node.data('depth');
                },
                // Slower, smoother physics
                unconstrIter: 20,
                userConstIter: 20,
                allConstIter: 50,
                infinite: false,  // Don't run continuously
                fit: true,  // Fit on initial render only
                padding: 50
            },

            userZoomingEnabled: true,  // Enable zoom
            wheelSensitivity: 0.2
        });

        // Register Cola extension
        if (typeof cytoscape('core', 'cola') !== 'function') {
            cytoscape.use(cytoscapeCola);
        }

        // Pause physics during drag, resume after with current positions
        this.cy.on('free', 'node', () => {
            // Resume physics briefly when drag ends, using CURRENT positions
            const layout = this.cy.layout({
                name: 'cola',
                animate: true,
                animationDuration: 1000,  // Slower animation for smoother feel
                randomize: false,  // Keep current positions!
                fit: false,  // DON'T reset viewport - THIS IS THE KEY
                avoidOverlap: true,
                handleDisconnected: true,
                convergenceThreshold: 0.01,
                nodeSpacing: 50,
                edgeLength: function (edge) {
                    if (edge.hasClass('couple-edge')) {
                        return 30;
                    }
                    return 150;
                },
                flow: { axis: 'y', minSeparation: 150 },
                alignment: function (node) {
                    return node.data('depth');
                },
                // Gentler physics for smoother movement
                unconstrIter: 10,
                userConstIter: 10,
                allConstIter: 20,
                infinite: false  // Run once after drag
            });

            layout.run();
        });

        // Add birth year to label if present
        this.cy.nodes('[type="person"]').forEach(node => {
            const birthYear = node.data('birthYear');
            if (birthYear) {
                node.style('label', `${node.data('name')}\n(${birthYear})`);
            }
        });
    }

    /**
     * Displays an error message in the container.
     * @param {string} msg - The error message to display.
     */
    showError(msg) {
        document.getElementById(this.containerId).innerHTML = `<div style="color:red;padding:20px;">${msg}</div>`;
    }

    /**
     * Displays a success message in the help text area.
     * @param {string} msg - The success message to display.
     */
    showSuccess(msg) {
        const el = document.querySelector(this.helpTextSelector);
        if (el) el.textContent = msg;
    }
};
