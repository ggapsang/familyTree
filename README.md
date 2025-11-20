# Family Tree Visualization - Developer Documentation

This document provides a technical overview of the Family Tree Visualization project. It is intended for developers who wish to understand, maintain, or extend the codebase.

## Architecture Overview

The application is designed as a **client-side only** web application that runs directly in the browser without a backend server. To support execution via the `file://` protocol (which blocks ES6 Modules due to CORS), the project uses the **Namespace Pattern**.

### Global Namespace
All application code is encapsulated within the `FamilyTreeApp` global object to prevent namespace pollution.

-   `FamilyTreeApp.Models`: Data entities.
-   `FamilyTreeApp.Services`: Business logic and data processing.
-   `FamilyTreeApp.View`: UI rendering and DOM manipulation.
-   `FamilyTreeApp.App`: Main application controller.

## Directory Structure

```
FamilyTree/
├── css/
│   └── styles.css          # Global styles and Treant.js overrides
├── js/
│   ├── models/             # Data entities
│   │   ├── person.js       # Individual person model
│   │   └── couple.js       # Marriage union model
│   ├── services/           # Business logic
│   │   ├── data-loader.js  # Excel file parsing (wraps XLSX)
│   │   └── tree-builder.js # Graph construction and root finding logic
│   ├── view/               # Visualization
│   │   └── renderer.js     # HTML generation and Treant.js integration
│   └── app.js              # Entry point and event wiring
├── index.html              # Main entry file
└── README.md               # This documentation
```

## Module Reference

### 1. Models (`js/models/`)

#### `FamilyTreeApp.Models.Person`
Represents a single individual in the family tree.
-   **Properties**:
    -   `id` (String): Unique identifier (currently uses `name`).
    -   `name` (String): Display name.
    -   `birthYear` (String): Birth year or date.
    -   `gender` (String): '남' (Male) or '여' (Female).
    -   `isBlood` (Boolean): Flag indicating if the person is a direct blood descendant (calculated at runtime).

#### `FamilyTreeApp.Models.Couple`
Represents a union between two `Person` objects.
-   **Properties**:
    -   `spouse1` (String): Name of the first spouse.
    -   `spouse2` (String): Name of the second spouse.
    -   `children` (Array<String>): List of child names.
-   **Methods**:
    -   `addChild(childName)`: Adds a child to the couple if not already present.
    -   `get key()`: Returns a unique string key for the couple (e.g., "Name1&Name2").

### 2. Services (`js/services/`)

#### `FamilyTreeApp.Services.DataLoader`
Handles the ingestion of raw data from Excel files.
-   **Dependencies**: `XLSX` (SheetJS library).
-   **Methods**:
    -   `readFile(file)`: Async method that reads a `File` object and returns a Promise resolving to raw JSON data (`peopleData`, `relationData`, `coupleData`).
    -   `processWorkbook(workbook)`: Internal method that validates sheet existence and extracts data.

#### `FamilyTreeApp.Services.TreeBuilder`
The core engine that transforms raw data into a hierarchical tree structure suitable for visualization.
-   **Key Responsibilities**:
    -   **Graph Construction**: Builds adjacency lists for parents and children.
    -   **Couple Inference**: Identifies couples explicitly from data or implicitly when two parents share a child.
    -   **Root Finding**: Identifies the top-most ancestor(s). Handles logic to exclude "married-in" spouses from being roots.
    -   **Bloodline Logic**: Determines who is a "blood relative" (black border) vs. "in-law" (red border).
-   **Methods**:
    -   `build(people, relations, couples)`: Main orchestration method. Returns `{ config, stats }`.

### 3. View (`js/view/`)

#### `FamilyTreeApp.View.Renderer`
Responsible for generating the HTML and initializing the visualization library.
-   **Dependencies**: `Treant.js`.
-   **Methods**:
    -   `render(config)`: Clears the container and initializes a new `Treant` instance with the provided config.
    -   `getPersonTemplate(person, isBlood)`: Static method returning HTML string for a single person node.
    -   `getCoupleTemplate(s1, s2, ...)`: Static method returning HTML string for a couple node.

### 4. Application Controller (`js/app.js`)

#### `FamilyTreeApp.App`
The glue code that initializes the application.
-   **Flow**:
    1.  Listens for `DOMContentLoaded`.
    2.  Attaches `change` event listener to the file input.
    3.  On file upload: Calls `DataLoader` -> `TreeBuilder` -> `Renderer`.

## Key Algorithms

### Root Node Identification
The `TreeBuilder` uses a heuristic to find the true root:
1.  Find all people with **no recorded parents**.
2.  Filter out individuals who are married to someone that **does** have parents (this prevents spouses of descendants from appearing as separate roots).
3.  If multiple roots exist (e.g., disconnected families), they are grouped under a hidden root node.

### Blood vs. In-law Visualization
-   **Blood Relative**: A person who has parents in the dataset OR is the primary male root.
    -   *Visual*: Black top border.
-   **In-law**: A person with no parents in the dataset who is married to a blood relative.
    -   *Visual*: Red top border.



---



## Family Tree Visualization - 개발자 문서

본 문서는 Family Tree Visualization 프로젝트의 기술적 개요를 제공합니다. 이 문서는 코드베이스를 이해·유지·확장하려는 개발자를 위한 자료입니다.

## 아키텍처 개요

이 애플리케이션은 **완전한 클라이언트 사이드 웹 애플리케이션**이며, 별도의 백엔드 서버 없이 브라우저에서 직접 실행됩니다.

브라우저의 `file://` 프로토콜은 ES6 모듈 로딩을 CORS 제한으로 막기 때문에, 프로젝트는 **네임스페이스 패턴(Namespace Pattern)** 을 사용합니다.

### 전역 네임스페이스

모든 애플리케이션 코드는 `FamilyTreeApp` 글로벌 객체 내부에 캡슐화되어 네임스페이스 오염을 방지합니다.

- `FamilyTreeApp.Models`: 데이터 엔티티    
- `FamilyTreeApp.Services`: 비즈니스 로직 및 데이터 처리
- `FamilyTreeApp.View`: UI 렌더링 및 DOM 조작
- `FamilyTreeApp.App`: 메인 애플리케이션 컨트롤러

## 디렉터리 구조

```
FamilyTree/
├── css/
│   └── styles.css
├── js/
│   ├── models/
│   │   ├── person.js
│   │   └── couple.js
│   ├── services/
│   │   ├── data-loader.js
│   │   └── tree-builder.js
│   ├── view/
│   │   └── renderer.js
│   └── app.js
├── index.html
└── README.md
```

## 모듈 레퍼런스

### 1. Models (`js/models/`)

#### `FamilyTreeApp.Models.Person`

가계도 상의 한 사람을 나타냄.

- **속성**    
    - `id`: 고유 식별자(현재는 name)
    - `name`: 표시 이름
    - `birthYear`: 출생년도 또는 날짜
    - `gender`: 남/여
    - `isBlood`: 직계 혈족 여부(런타임 계산)
#### `FamilyTreeApp.Models.Couple`

두 사람의 부부(결합) 관계 모델.

- **속성**    
    - `spouse1`
    - `spouse2`
    - `children`: 자녀 이름 배열
- **메서드**    
    - `addChild(childName)`
    - `key`: `"A&B"` 형식의 유니크 키 반환

### 2. Services (`js/services/`)

#### `FamilyTreeApp.Services.DataLoader`

엑셀 파일(XLSX)을 읽어 JSON 형태로 변환하는 역할.

- **메서드**    
    - `readFile(file)`: 비동기. 파일 → JSON 추출
    - `processWorkbook(workbook)`: 내부 메서드, 시트 존재 여부 체크 및 데이터 변환

#### `FamilyTreeApp.Services.TreeBuilder`

RAW 데이터 → 시각화 가능한 트리 구조로 변환하는 핵심 엔진.

- **주요 역할**    
    - 그래프 구성(부모-자식 인접 리스트 생성)
    - 커플(부부) 자동 추론
    - 최상위 조상(root) 식별
    - 혈족 / 혼인 관계 판정
- **주요 메서드**
    - `build(people, relations, couples)` → `{ config, stats }` 반환

### 3. View (`js/view/`)

#### `FamilyTreeApp.View.Renderer`

Treant.js 기반으로 최종 HTML을 생성하고 시각화 초기화.

- **메서드**    
    - `render(config)`
    - `getPersonTemplate(person, isBlood)`
    - `getCoupleTemplate(s1, s2, ...)`

### 4. Application Controller (`js/app.js`)

#### `FamilyTreeApp.App`

애플리케이션 초기화 및 전체 플로우 연결 담당.

- **플로우**  
    1. DOMContentLoaded 이벤트 등록
    2. 파일 업로드 이벤트 바인딩
    3. 파일 업로드 → DataLoader → TreeBuilder → Renderer 실행

## 핵심 알고리즘

### Root(최상위 조상) 식별

`TreeBuilder`는 다음 규칙을 이용하여 최상위 조상을 식별:

1. 부모가 없는 사람을 찾음    
2. 하지만 “배우자는 부모가 없음”과 겹치므로,  
    → **자녀가 있는 사람 + 그 배우자 는 root 후보에서 제외**
3. 여러 root가 존재하면(여러 가문이 섞인 파일) 숨겨진 가상 root 아래에 그룹핑    

### 혈족 vs 혼인관계 구분

- **혈족(blood)**    
    - 데이터 내에 부모 정보가 있거나
    - 최상위 남성 root
    → UI에서는 **검은색 상단 border**

- **혼인관계(in-law)**    
    - 부모 정보가 없고
    - 혈족과 결혼한 경우    
    → UI에서는 **빨간색 상단 border**

## 주요 구조와 전체 플로우 로직 설명

### A. 전체 시스템 구조

시스템은 **4개의 계층 구조**로 나뉩니다.

#### 1. Models 계층 — “데이터 구조 정의”

가족 구성원(Person), 부부 관계(Couple)에 대한 최소한의 데이터 구조를 정의.  
이 모델은 **상태 저장 X**, 단순 데이터 엔티티.

#### 2. Services 계층 — “비즈니스 로직”

가장 중요한 부분.

- **DataLoader**  
    - XLSX 파일을 읽고 표준화된 데이터(JSON 배열)로 변환
- **TreeBuilder**
    - 가계도 로직의 대부분을 처리
    - 부모-자식 그래프 구성
    - 커플 매핑 확정
    - 루트(조상) 판단        
    - 혈족 여부 계산
    - 최종 Treant.js 설정값 생성

#### 3. View(Renderer) 계층 — “UI 생성”

- TreeBuilder에서 받은 `config`를 기반으로  
    Treant.js를 초기화  
- 각 노드를 HTML 템플릿으로 변환 (사람·부부)

UI는 완전 단순: TreeBuilder의 output만 믿고 렌더링함.

#### 4. App 계층 — “이벤트 중심 제어”

- DOM 로드 감지  
- 파일 업로드 이벤트 -> DataLoader - TreeBuilder - Renderer 연결
- 실제로 로직은 거의 없고 **Glue 역할**만 수행

### B. 전체 실행 흐름 (Flow Logic)

엑셀 파일을 업로드했을 때 브라우저 내부에서 일어나는 전체 과정:

#### 1단계. 사용자가 엑셀 파일 업로드

→ App.js가 change 이벤트 감지  
→ `DataLoader.readFile(file)` 호출

#### 2단계. DataLoader가 엑셀 parsing

- SheetJS(XLSX)로 workbook 로딩  
- 시트 존재 확인
- 사람/부부/부모 관계 테이블을 JSON으로 정제하여 반환  
    → `{ peopleData, relationData, coupleData }`
#### 3단계. TreeBuilder.build() 진입

가장 중요한 단계.
TreeBuilder는 다음을 수행:
##### (1) Person 객체 생성
→ ID와 속성 정리
##### (2) Couple 객체 생성
→ 명시적으로 주어진 커플 기록 정리
##### (3) Parent/Child 관계 그래프 생성
- relations 시트를 분석하여 부모-자식 매핑
- 부모가 2명인 경우 → 자동으로 부부 관계 추론
##### (4) Root 찾기
- 부모 없는 사람을 우선 root 후보로
- 단, "배우자로만 연결된 사람"은 root에서 제거
- 여러 root면 virtual root를 만들고 그 아래에 집어넣음
##### (5) 혈족 여부 판정
- 부모가 있거나  
- 최상위 조상(특히 남성 root)
→ 혈족  
나머지는 혼인관계
##### (6) Treant.js config 생성
Renderer가 그대로 쓸 수 있는 구조로 변환
#### 4단계. Renderer.render(config) 실행

- 기존 DOM 초기화
- Treant.js에 config 전달하여 트리 그리기    
- 각 node는 HTML 템플릿(Person, Couple)을 기반으로 렌더링

#### 5단계. UI 출력 완료

브라우저 화면에 가계도가 표시됨.

## 요약

- **백엔드 없이 작동**  
- 네임스페이스 기반 구조(ES6 모듈 없이도 작동하도록)
- MVC 유사 구조
    - Models: 데이터 구조        
    - Services: 로직 핵심
    - View: 렌더링
    - App: 제어/이벤트

- TreeBuilder가 전체 로직의 중심    
- Root 계산, 혈족 판정 등의 알고리즘 포함
- Treant.js 기반으로 시각화