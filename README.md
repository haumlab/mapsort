# MapSort

Mapsort is a project that shows you different map algorithims in real time, its like those tiktoks, its got a pretty nice sound i like the sound.

## Key Features

- Live Map Integration: Fetches real-world street data dynamically using the Overpass API based on user-selected points.
- Multiple Algorithms: Supports a variety of pathfinding strategies, including:
  - A* Search (Heuristic-based)
  - Dijkstra (Shortest path)
  - Breadth-First Search (Unweighted exploration)
  - Greedy Best-First Search
  - Depth-First Search
- VS Mode: Allows for side-by-side comparison of two different algorithms running from the same start and end points. This mode highlights unique and shared path segments.
- Audio Integration: Features auditory feedback that represents the progress of the algorithm's exploration and path tracing.

## Technical Stack

- Frontend: React, Vite
- Mapping: Leaflet, React-Leaflet
- Data Source: OpenStreetMap (via Overpass API)
- Icons: Lucide-react
- Styling: Plain CSS with modern design principles

## Installation and Setup

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/haumlab/mapsort
   cd mapsort
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to the address provided by Vite (usually http://localhost:5173).

## How to Use

1. Click on the map to select a starting point. MapSort will snap to the nearest street.
2. Click again to select a destination point. The application will fetch the necessary OSM data to connect the two points.
3. Choose an algorithm (or two in VS Mode) from the sidebar.
4. Adjust the simulation speed and sound volume as desired.
5. Click 'Visualize' to watch the algorithm explore the network and find the path.
6. Click 'Reset' to clear the current points and graph data.

## Important Note

MapSort relies on public Overpass API instances. If there are connection issues or the service is under heavy load, there may be delays in fetching map data.
