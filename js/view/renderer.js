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
                // Viewport Background
                {
                    selector: 'core',
                    style: {
                        'background-color': '#000000'
                    }
                },
                // Core Node Style (Person)
                {
                    selector: 'node[type="person"]',
                    style: {
                        'shape': 'ellipse',
                        'width': '50px',
                        'height': '50px',  // Same as width for perfect circle
                        'background-color': '#ffffff',
                        'border-width': 3,
                        'border-color': '#ffffff',
                        'label': 'data(name)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'font-size': '14px',
                        'text-wrap': 'wrap',
                        'text-max-width': '80px',
                        'opacity': 0.8,
                        'shadow-blur': 10,
                        'shadow-color': '#ffffff',
                        'shadow-opacity': 0.5,
                        'shadow-offset-x': 0,
                        'shadow-offset-y': 0
                    }
                },
                {
                    selector: 'node.male',
                    style: {
                        'background-color': '#ffffff'
                    }
                },
                {
                    selector: 'node.female',
                    style: {
                        'background-color': '#ffffff'
                    }
                },

                // Blood vs In-law Borders
                {
                    selector: 'node.blood',
                    style: {
                        'border-color': '#ffffff',
                        'border-width': 3,
                        'opacity': 0.8,
                        'shadow-blur': 10,
                        'shadow-color': '#ffffff',
                        'shadow-opacity': 0.5,
                        'shadow-offset-x': 0,
                        'shadow-offset-y': 0
                    }
                },
                {
                    selector: 'node.inlaw',
                    style: {
                        'border-color': '#ffffff',
                        'border-width': 3,
                        'opacity': 0.8,
                        'shadow-blur': 10,
                        'shadow-color': '#ffffff',
                        'shadow-opacity': 0.5,
                        'shadow-offset-x': 0,
                        'shadow-offset-y': 0
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
                        'width': 2,
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
                // Preserve hierarchical structure INITIALLY
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

        // Store the layout configuration for reuse
        const baseLayoutConfig = {
            name: 'cola',
            animate: true,
            randomize: false,
            fit: false, // CRITICAL: Never reset zoom on interaction
            avoidOverlap: true,
            handleDisconnected: true,
            nodeSpacing: 50,
            edgeLength: function (edge) {
                if (edge.hasClass('couple-edge')) return 30;
                return 150;
            },
            // Remove flow/alignment constraints to allow free movement
            flow: undefined,
            alignment: undefined,
            infinite: false
        };

        // 1. On Grab (Start Drag): Wake up physics
        this.cy.on('grab', 'node', () => {
            const layout = this.cy.layout({
                ...baseLayoutConfig,
                infinite: true, // Keep running while dragging
                animationDuration: 0 // Instant reaction
            });
            layout.run();
        });

        // 2. On Free (End Drag): Settle gently
        this.cy.on('free', 'node', () => {
            const layout = this.cy.layout({
                ...baseLayoutConfig,
                infinite: false, // Run once to settle
                animationDuration: 500, // Smooth settle
                convergenceThreshold: 0.01
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
