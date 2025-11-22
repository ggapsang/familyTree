# Family Tree Visualization - Developer Documentation

This document provides a technical overview of the Family Tree Visualization project. It is intended for developers who wish to understand, maintain, or extend the codebase.

## Architecture Overview

The application is designed as a **client-side only** web application that runs directly in the browser without a backend server. To support execution via the `file://` protocol (which blocks ES6 Modules due to CORS), the project uses the **Namespace Pattern**.

### Global Namespace
All application code is encapsulated within the `FamilyTreeApp` global object to prevent namespace pollution.

-   `FamilyTreeApp.Services`: Business logic and data processing.
-   `FamilyTreeApp.View`: UI rendering and DOM manipulation.
-   `FamilyTreeApp.App`: Main application controller.

## Technology Stack

-   **Cytoscape.js**: Graph visualization library.
-   **Dagre**: Directed graph layout engine for Cytoscape.
-   **SheetJS (XLSX)**: Excel file parsing.

## Directory Structure

```
FamilyTree/
├── css/
│   └── styles.css          # Global styles
├── js/
│   ├── services/           # Business logic
│   │   ├── data-loader.js  # Excel file parsing
│   │   └── graph-builder.js # Core graph construction algorithm
│   ├── view/               # Visualization
│   │   └── renderer.js     # Cytoscape.js integration
│   └── app.js              # Entry point and event wiring
├── index.html              # Main entry file
└── README.md               # This documentation
```

## Module Reference

### 1. Services (`js/services/`)

#### `FamilyTreeApp.Services.DataLoader`
Handles the ingestion of raw data from Excel files.
-   **Methods**:
    -   `readFile(file)`: Async method that reads a `File` object and returns raw JSON data.
    -   `processWorkbook(workbook)`: Validates sheet existence and extracts data.

#### `FamilyTreeApp.Services.GraphBuilder`
The core engine that transforms raw data into a graph structure suitable for Cytoscape.js.
-   **Key Responsibilities**:
    -   **Normalization**: Standardizes names to handle spacing/formatting issues.
    -   **Couple Identification**: Explicitly from data or inferred from shared children.
    -   **Depth Calculation**: Determines the generation level of each person relative to a central "pivot" node.
    -   **Positioning**: Calculates (x, y) coordinates for nodes to minimize crossing.

### 2. View (`js/view/`)

#### `FamilyTreeApp.View.Renderer`
Responsible for initializing Cytoscape.js and rendering the graph.
-   **Key Responsibilities**:
    -   **Styling**: Defines node shapes, colors (Gender, Blood/In-law status), and edge styles.
    -   **Layout**: Applies the calculated positions to the graph.

## Key Algorithms

### Depth-Based Graph Building
The project uses a custom **Depth-Based Graph Building** algorithm instead of a standard tree layout.

#### How it works:
1.  **Pivot Selection**: Identifies a "central" person (usually the one with the most connections) to serve as the anchor (Depth 0).
2.  **BFS Traversal**: Performs a Breadth-First Search from the pivot to calculate the "depth" (generation) of every other node.
    -   Parents: Depth + 1
    -   Children: Depth - 1
    -   Spouses: Same Depth
3.  **Positioning**: Groups nodes by depth and arranges them horizontally, placing spouses next to each other and siblings close to their parents.

#### Rationale (Why this approach?)
This algorithm was chosen for **Maintainability** and **Reusability**:
-   **Flexibility**: Unlike strict tree algorithms, this graph approach handles complex relationships (e.g., inter-marriage, disconnected sub-trees) more gracefully.
-   **Single Node Support**: The logic naturally handles edge cases like a **single node** (a graph with 1 node, depth 0). This makes it easy to test or start a new tree without breaking the layout engine.
-   **Decoupling**: The position logic is calculated in `GraphBuilder`, making the rendering layer (`Renderer`) purely presentational. This allows for easily swapping the visualization library (e.g., from Treant.js to Cytoscape.js) without rewriting the core logic.

## Visual Guide

### Node Styles
-   **Gender**:
    -   **Male**: Light Blue background.
    -   **Female**: Light Pink background.
-   **Status**:
    -   **Blood Relative**: Black border. (Direct descendants or ancestors)
    -   **In-law**: Red border. (Married into the family)

### Edge Styles
-   **Grey Line**: Parent-Child relationship.
-   **Red Line**: Spousal relationship.

---

## Family Tree Visualization - 개발자 문서

본 문서는 Family Tree Visualization 프로젝트의 기술적 개요를 제공합니다.

## 아키텍처 및 기술 스택

이 애플리케이션은 **Cytoscape.js**를 기반으로 한 클라이언트 사이드 웹 애플리케이션입니다.

-   **Cytoscape.js**: 그래프 시각화 엔진
-   **SheetJS (XLSX)**: 엑셀 데이터 파싱
-   **Namespace Pattern**: `FamilyTreeApp` 전역 객체를 사용하여 모듈화

## 핵심 알고리즘: Depth-Based Graph Building

이 프로젝트는 단순한 트리 구조가 아닌, **깊이 기반 그래프 생성(Depth-Based Graph Building)** 알고리즘을 사용합니다.

### 작동 원리
1.  **Pivot 선정**: 연결이 가장 많은 중심 인물을 찾아 기준점(Depth 0)으로 설정합니다.
2.  **BFS 탐색**: Pivot을 기준으로 모든 노드의 세대(Depth)를 계산합니다.
    -   부모: +1
    -   자식: -1
    -   배우자: 동일 Depth
3.  **위치 계산**: 같은 Depth의 노드들을 수평으로 배치하며, 부부와 형제 관계를 고려하여 정렬합니다.

### 이 알고리즘을 사용한 이유 (유지보수 및 재사용성)
-   **유연성**: 엄격한 트리 구조보다 복잡한 가족 관계(겹사돈 등)나 끊어진 그래프를 더 잘 처리합니다.
-   **단일 노드 지원**: **노드가 하나뿐인 경우**에도 문제없이 작동하도록 설계되었습니다. 이는 초기 데이터 입력 단계나 테스트 시에 매우 유리합니다.
-   **로직 분리**: 위치 계산 로직이 `GraphBuilder`에 집중되어 있어, 시각화 라이브러리를 교체하더라도 핵심 로직을 재사용할 수 있습니다.