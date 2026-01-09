# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Synapse is an "intermarket correlation brain" that builds a multi-asset correlation graph from market data and renders it as an interactive 3D network.
The repository is split into:
- A Python data engine in `data_engine/` that downloads market data, computes metrics, and emits a JSON graph.
- A Vite/React 3D frontend in `web/` that visualizes the graph and exposes interaction modes and filters.
- GitHub Actions workflows in `.github/workflows/` that periodically refresh data and deploy the static site.

## High-Level Architecture

### Data Flow

1. **Universe definition**
   - `data_engine/instruments_list.json` defines instrument universes (equities, sectors, rates, FX, commodities, crypto, etc.).
   - Each entry has at least `ticker`, `name`, and `group`. `group` is the high-level bucket used for both logic and UI sector filters.

2. **Structural priors between groups**
   - `data_engine/logic_matrix.json` is a group-level matrix specifying how strongly categories (e.g., `Energy`, `Rates`, `Crypto`) should be allowed to co-move.
   - These values are used as **AI/logic weights** to up/down-weight raw correlations between assets belonging to different groups.

3. **Data engine execution** (`data_engine/processor.py`)
   - Downloads ~2 years of adjusted close data for all tickers in `instruments_list.json` via `yfinance`.
   - Cleans the price matrix (forward/backward fill, drop all-NaN columns) and computes **log returns**.
   - For each configured timeframe in `TIMEFRAMES = {"1W": 5, "1M": 21, "3M": 63, "1Y": 252}`:
     - Computes **dynamic return** (rolling log return over the lookback window).
     - Computes **z-scores** vs a 252-day rolling mean/std of log returns.
     - Builds a **participation / centrality** signal via eigenvector centrality on the absolute correlation network.
     - Computes an **influence** metric using PCA on recent returns to estimate each asset's loading on the dominant "market mode".
   - In parallel, builds a **semantic similarity matrix**:
     - Uses `sentence-transformers` (`all-MiniLM-L6-v2`) to embed `"<name> <group>"` for every instrument.
     - Computes a cosine-similarity matrix between instruments.
   - Combines three ingredients into a **hybrid correlation matrix** for each timeframe:
     - Magnitude of Pearson correlation of returns (absolute value).
     - Semantic similarity between instruments.
     - Group-level priors from `logic_matrix.json` (up/down-weighting pairs depending on `(group_i, group_j)` score).
   - Thresholds edges (default `|value| > 0.25`) and builds an undirected `networkx` graph.
   - Derives a **maximum spanning tree** (MST) on the absolute edge weights to define the structural "skeleton" of the network and flags those links with `isSkeleton: true`.
   - Computes global graph measures such as an average absolute edge weight, which is surfaced as `system_stress`.

4. **JSON output contract**
   - The engine writes a single JSON file at:
     - `web/public/data/brain_data.json` (absolute path resolved from `data_engine/processor.py`).
   - Schema (per timeframe):
     - `timeframes[<tf>].nodes[]` — one entry per ticker with fields such as:
       - `id`/`ticker`: symbol identifier.
       - `name`: human label from `instruments_list.json`.
       - `group`: category (e.g. `Rates`, `Crypto`, `US Sectors`).
       - `power`: centrality / participation metric.
       - `community`: community id from Louvain partitioning.
       - `zScore`: standardized return signal.
       - `periodChange`: percent change over the timeframe (derived from dynamic log returns).
       - `influence`: PCA-based influence loading.
       - `price`: latest price.
     - `timeframes[<tf>].links[]` — correlation edges with:
       - `source`, `target`: ticker ids.
       - `value`: signed correlation-like strength (hybrid metric).
       - `isSkeleton`: whether the edge belongs to the MST skeleton.
     - `timeframes[<tf>].global` — global stats including:
       - `system_stress`: scaled average absolute link strength.
       - `regime`: current regime label (currently a simple string constant).
       - `last_updated`: UTC timestamp string.

5. **Frontend consumption**
   - The React app does a plain `fetch('/data/brain_data.json?...')` in `web/src/hooks/useCorrelation.js` and expects the schema above.
   - There is **no API server**; the frontend is a static app reading a versioned JSON snapshot from the `public/` folder.

6. **Automation and deployment**
   - `.github/workflows/synapse_pulse.yml` defines `Synapse Pulse (Data Update & Deploy)`:
     - Triggers on:
       - Schedule: `0 0,12 * * *` (00:00 & 12:00 UTC).
       - Manual `workflow_dispatch`.
       - Pushes to `main`.
     - Job steps:
       1. Checkout repo.
       2. Set up Python 3.9 and install data-engine dependencies via `pip install -r data_engine/requirements.txt`.
       3. Run `python data_engine/processor.py` to refresh `brain_data.json`.
       4. Commit and push `web/public/data/brain_data.json` if it changed.
       5. Set up Node.js 18, `npm install` in `web/`, and `npm run build`.
       6. Deploy `web/dist` to GitHub Pages using `peaceiris/actions-gh-pages`.
   - This job is the production source of truth for how the data engine and web build are executed together.

### Frontend Visualization Architecture (`web/`)

- **Build system**: Vite + React + Tailwind CSS.
  - `web/vite.config.js` sets `base: '/synapse/'` for GitHub Pages and:
    - Aliases `@` to `web/src`.
    - Dedupes `three`, `react`, and `react-dom` to avoid multiple instances.
    - Configures Rollup to treat `three/addons/webgpu/WebGPURenderer.js` as external to avoid build issues.
- **Entry point**:
  - `web/src/main.jsx` mounts `<App />` into `#root` and imports Tailwind-based styles from `web/src/styles/index.css`.
- **Top-level application**: `web/src/App.jsx`
  - Loads correlation data via `useCorrelation()` and manages global UI state:
    - Selected **timeframe** (`1W`, `1M`, `3M`, `1Y`).
    - Selected **control mode** (`orbit` vs `fly`), which switches between an analyst orbit camera and a pointer-lock flight mode.
    - **Theme** selection (multiple neon/terminal themes with different `up/down/base/bg` color palettes).
    - **Correlation threshold** (`minCorrelation`) and a **gravity/repulsion** slider (`nodeRepulsion`) that feed into the 3D physics configuration.
    - **Industry filters** based on `group` values from node metadata.
    - **Search** state and currently selected node for detail inspection.
  - Derives `filteredData` per timeframe by:
    - Filtering nodes by selected industries.
    - Filtering links by absolute `value >= minCorrelation` and keeping only links between visible nodes.
  - Passes this filtered snapshot plus UI state (theme, control mode, skeleton mode toggle) down to `Scene` (3D graph), `DetailPanel` (side panel), `MarketStatus` (global stress card), and `SkeletonToggle`.

- **Graph rendering**: `web/src/components/Brain/Scene.jsx`
  - Uses `react-force-graph-3d` and `three` to render the network.
  - Distinct interaction modes:
    - **Orbit mode**:
      - Standard orbital camera; nodes are labeled with `node.name`.
      - Clicking a node in 3D selects it and opens the detail panel.
      - If a node is selected, non-neighbor nodes and their links are visually dimmed to emphasize local structure.
    - **Pilot/flight mode**:
      - Uses `PointerLockControls` and manual physics integration for WASD flight with sprint.
      - Orbit controls are explicitly disabled each frame to prevent control conflicts.
      - A dynamic HUD features:
        - Central crosshair that highlights when "aimed" at a node.
        - Target acquisition logic that finds the closest, most aligned node within a distance cone.
        - Top positive/negative correlation partners for the aimed node.
        - Inline metrics (distance, z-score, participation, influence, timeframe change) for the lock-on target.
      - Clicking while a node is aimed triggers the same node selection pathway as orbit mode.
  - Node rendering:
    - Shared sphere geometry with materials derived from the current theme.
    - Node size driven by `power` (centrality), with extra pulsing when `|zScore|` is large.
    - Special material for the active/locked node, dimmed material for nodes outside the selected node's neighborhood.
  - Link rendering:
    - Visibility respects skeleton mode and focus:
      - If **skeleton mode** is on, only links with `isSkeleton: true` are drawn.
      - If a node is focused, only links incident to that node are shown.
    - Width scales with `|value|`; color encodes sign (`theme.colors.up` for positive, `theme.colors.down` for negative).
    - Directional particles reinforce flow along each edge.
  - Global post-processing:
    - Configures `UnrealBloomPass` on Vite's WebGL renderer and recomputes resolution on resize/theme changes.

- **UI components**:
  - `web/src/components/UI/DetailPanel.jsx`
    - Fixed right-side panel shown when a node is selected.
    - Shows:
      - Ticker, name, group.
      - Timeframe-specific return, z-score, participation, and influence.
      - Top ~10 strongest correlations for the selected node, with bars colored by sign.
    - Fully driven by node/link data from the JSON + current timeframe.
  - `web/src/components/UI/MarketStatus.jsx`
    - Uses `stats.system_stress` from `global` to categorize the environment into:
      - `STABLE FLOW`, `HIGH VOLATILITY`, or `CRITICAL STRESS`.
    - Renders a stress bar and a simple data integrity indicator, all themed by the current palette.
  - `web/src/components/UI/SkeletonToggle.jsx`
    - Bottom-right control to toggle between full network and MST skeleton-only view.
    - Controls `isSkeletonMode` state in `App` and thereby `Scene` link visibility.
  - `web/src/hooks/useCorrelation.js`
    - Simple hook that `fetch`es `/data/brain_data.json` with a timestamp query param to avoid browser caching and exposes `{ data, loading, error }`.

## Development Commands

The repo uses **Python** for the data engine and **Node.js** (Vite) for the frontend. The commands below assume the working directory is the repository root unless otherwise noted.

### Python Data Engine

- **Activate the dedicated data-engine virtualenv (preferred)**
  - From the repo root on Windows PowerShell:
    - `.\data_engine\venv\Scripts\activate`
  - After activation, `python` will use the environment that already contains the required packages for `processor.py`.

- **(Alternative) Install Python dependencies manually**
  - Full repo stack:
    - `pip install -r requirements.txt`
  - Data-engine-only (mirrors CI workflow):
    - `pip install -r data_engine/requirements.txt`

- **Run the data processor once (refresh brain JSON)**
  - From the repo root, after activating the virtualenv (or installing deps):
    - `python data_engine/processor.py`
  - This will:
    - Download market data for all tickers in `instruments_list.json`.
    - Recompute the multi-timeframe graph.
    - Overwrite `web/public/data/brain_data.json`.

### Frontend (Vite + React)

All commands below are run from `web/`.

- **Install Node.js dependencies**
  - `cd web`
  - `npm install`

- **Run the development server**
  - `cd web`
  - `npm run dev`
  - Serves the app with hot-reload. The frontend expects `web/public/data/brain_data.json` to exist; if it is missing, the graph will not render and `useCorrelation` will report an error.

- **Build for production**
  - `cd web`
  - `npm run build`
  - Emits the static site into `web/dist`, matching what GitHub Actions deploys.

- **Preview the production build locally**
  - `cd web`
  - `npm run preview`
  - Serves the contents of `dist` using Vite's preview server.

### Tests

- There are currently no project-level automated test scripts or configs (no `pytest` configuration in the Python side and no `test` script defined in `web/package.json`).
- If tests are added later, prefer aligning local commands with whatever is wired into GitHub Actions so that CI and local runs stay consistent.