# 📘 가계도 시각화 아키텍처 가이드 (CODE_GUIDE.md)

이 문서는 **가계도 시각화 프로젝트**의 아키텍처와 핵심 로직을 개발자 관점에서 설명합니다. 프로젝트는 유지보수성과 확장성을 고려하여 **MVC (Model-View-Controller)** 패턴을 차용하여 구조화되었습니다.

---

## 🏗️ 아키텍처 개요 (Architecture Overview)

전체 애플리케이션은 데이터 처리, 비즈니스 로직, 렌더링 계층으로 명확히 분리되어 있습니다.

*   **Models**: 데이터 엔티티(`Person`, `Couple`)의 구조와 속성을 정의합니다.
*   **Services**: 핵심 비즈니스 로직을 담당합니다.
    *   `DataLoader`: 엑셀 파일 파싱 및 전처리.
    *   `GraphBuilder`: 가계도 레이아웃 알고리즘 (Depth computation, Node positioning) 수행.
*   **View**: `Cytoscape.js`를 이용한 그래프 렌더링 및 UI 인터랙션 처리를 담당합니다.
*   **Controller (App)**: 애플리케이션의 라이프사이클 관리 및 각 모듈 간의 오케스트레이션을 수행합니다.

---

## 📂 모듈별 상세 명세

### 1. `js/models/` (Data Layer)

#### 🧑 `person.js`
*   **역할**: 개별 인물 객체 모델.
*   **주요 속성**: `id` (Unique Key), `name`, `birthYear`, `gender`, `isBlood` (직계/인척 구분 플래그).
*   **설계 의도**: 향후 동명이인 처리를 위해 `id`와 `name`을 분리하여 설계했습니다. 현재는 `name`을 ID로 사용하지만, 추후 고유 ID 생성 로직 도입 시 확장이 용이합니다.

#### 💑 `couple.js`
*   **역할**: 부부 관계 객체 모델.
*   **주요 속성**: `spouse1`, `spouse2` (참조 ID), `children` (자녀 ID 리스트).
*   **Key Generation**: `[spouse1, spouse2].sort().join('&')` 방식을 사용하여 부부 관계의 유일성을 보장합니다. 순서에 상관없이 동일한 키가 생성됩니다.

---

### 2. `js/services/` (Service Layer)

#### 📄 `data-loader.js`
*   **역할**: `SheetJS (xlsx)` 라이브러리를 래핑하여 엑셀 데이터를 JSON으로 변환합니다.
*   **Heuristic Parsing**: 시트 이름이 고정되어 있지 않더라도, 컬럼명(헤더)을 분석하여 `People`, `Relations`, `Couples` 데이터를 자동으로 식별하는 로직이 포함되어 있습니다.

#### 🌳 `graph-builder.js` (Core Logic)
*   **역할**: 관계형 데이터를 시각화 가능한 그래프 구조(Nodes & Edges)와 좌표(Position)로 변환합니다.
*   **알고리즘 (Depth-Based Layout)**:
    1.  **Pivot Selection**: 연결 차수(Degree)가 가장 높은 노드를 중심점(Pivot)으로 선정합니다.
    2.  **BFS Depth Calculation**: Pivot을 기준으로 BFS 탐색을 수행하여 각 노드의 세대(Depth)를 계산합니다. (부모: +1, 자식: -1)
    3.  **Grouping & Positioning**:
        *   동일 Depth 내에서 형제(Siblings) 그룹을 형성합니다.
        *   부부 노드는 물리적으로 인접하도록 강제합니다.
        *   Edge Crossing(선 꼬임)을 최소화하기 위해 부모 노드의 위치를 고려하여 자식 노드의 X 좌표를 결정합니다.

---

### 3. `js/view/` (Presentation Layer)

#### 🎨 `renderer.js`
*   **역할**: `Cytoscape.js` 인스턴스를 관리하고 DOM에 렌더링합니다.
*   **Styling**: 노드 타입(성별, 직계 여부)에 따른 조건부 스타일링을 적용합니다.
*   **Interaction**:
    *   `WebCola` 레이아웃을 사용하여 물리 엔진 기반의 자연스러운 배치를 지원합니다.
    *   Drag 이벤트 종료 시, 현재 위치를 유지하면서 물리 시뮬레이션을 일시적으로 재가동하여 자연스러운 정렬을 유도합니다 (`lock` & `unlock` 메커니즘).

---

### 4. `js/app.js` (Application Entry)

#### 🎬 `App` Class
*   **역할**: 의존성 주입(DI) 및 초기화.
*   **Flow**: `Event Listener` 등록 -> `DataLoader` 호출 -> `GraphBuilder` 호출 -> `Renderer` 업데이트 순으로 데이터 파이프라인을 제어합니다.

---

## 💡 확장 가이드 (Extensibility)

*   **커스텀 속성 추가**: 엑셀에 새로운 컬럼(예: 직업, 사망일)이 추가될 경우, `DataLoader`에서 파싱 후 `Person` 모델 생성자에 전달하면 됩니다.
*   **레이아웃 알고리즘 변경**: `GraphBuilder`의 `computePositions` 메서드를 오버라이딩하여 다른 배치 전략(예: 방사형, 수직형)을 적용할 수 있습니다.
*   **렌더링 엔진 교체**: `Renderer` 클래스의 인터페이스(`render`, `showError`)만 유지한다면, 내부 구현을 D3.js나 Canvas API로 교체해도 다른 코드에 영향을 주지 않습니다.
