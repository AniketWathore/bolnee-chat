# Bolnee Chat Application

This is a full-stack React application powered by Vite, Express, and Tailwind CSS.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

## Installation

1. Navigate to the project directory:
   ```bash
   cd bolnee
   ```
2. Install the necessary dependencies:
   ```bash
   npm install
   ```

## Running the Application

### Development Mode

To start the development server, which runs both the Vite frontend and the Express backend (via `tsx server.ts`):

```bash
npm run dev
```

The frontend will typically be available at `http://localhost:5173`.

### Production Build

To build the application for production (bundles both the Vite frontend and the Express server):

```bash
npm run build
```

To start the production server after building:

```bash
npm run start
```

### Other Available Scripts

- **`npm run preview`**: Preview the production build locally.
- **`npm run clean`**: Remove the `dist` directory and built files.
- **`npm run lint`**: Run TypeScript type checking.

## Technologies Used
- React 19
- Vite 6
- Express
- Tailwind CSS 4
- Lucide React (Icons)
- Framer Motion (Animations)


https://huggingface.co/onnx-community/Qwen3-0.6B-ONNX/tree/main/onnx