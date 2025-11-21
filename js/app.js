/**
 * Main Application Entry Point
 * Wires up the components and handles events.
 */
var FamilyTreeApp = FamilyTreeApp || {};

document.addEventListener('DOMContentLoaded', () => {
    const app = new FamilyTreeApp.App();
    app.init();
});

FamilyTreeApp.App = class {
    constructor() {
        this.dataLoader = new FamilyTreeApp.Services.DataLoader();
        this.treeBuilder = new FamilyTreeApp.Services.GraphBuilder();
        this.renderer = new FamilyTreeApp.View.Renderer();
    }

    init() {
        const fileInput = document.getElementById('excel-file');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e), false);
        }
    }

    async handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // 1. Load Data
            const { peopleData, relationData, coupleData } = await this.dataLoader.readFile(file);

            // 2. Build Graph
            const { elements, stats } = this.treeBuilder.build(peopleData, relationData, coupleData);

            // 3. Render
            console.log(`Loaded: ${stats.peopleCount} people, ${stats.relationCount} relations`);
            this.renderer.showSuccess(`데이터 로드 성공! (사람: ${stats.peopleCount}명, 관계: ${stats.relationCount}건)`);
            this.renderer.render({ elements, stats });

        } catch (error) {
            console.error('Error:', error);
            this.renderer.showError(`오류 발생: ${error.message}`);
        } finally {
            document.getElementById('excel-file').value = '';
        }
    }
};
