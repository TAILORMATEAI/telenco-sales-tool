# Telenco Energy Calculator

A sleek, multi-step wizard for calculating energy savings and commissions, built with React, Vite, Tailwind CSS, and Supabase.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

## Installation

1. Clone the repository or download the source code.
2. Install the dependencies:

```bash
npm install
```

## Environment Variables

This project uses Supabase for backend data storage (market prices and sales logs). You need to set up the following environment variables.

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open the `.env` file and fill in your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

## Running the Development Server

Start the Vite development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the port specified in your terminal).

## Building for Production

To create a production build:

```bash
npm run build
```

The compiled assets will be in the `dist` directory, ready to be deployed to any static hosting service (Vercel, Netlify, etc.).
