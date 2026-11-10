# Castellum — 3D Architectural Castle Diorama Builder

A comprehensive, tactile 3D architectural castle diorama builder built with **Three.js**, **React**, **TypeScript**, and **Tailwind CSS**, optimized for instant global edge deployment on **Vercel**.

## Architectural & Diorama Features

- **Procedural Curtain Walls & Auto-Gatehouses**: Draw snapping or freeform wall chains with corner bartizan turrets, crenellations, machicolations, and climbing ivy. Painting a cobblestone or courtyard path under any wall automatically carves a vaulted stone portcullis archway.
- **Modular Towers & Keeps**: Place and vertically stack round, octagonal, or square towers onto keeps and roofs, complete with conical spires, French château hips, bell cupolas, crow-stepped gables, half-timbered upper stories, dormers, finials, and smoking stone chimneys.
- **Terrain-Aware Foundations**: Masonry plinths and bridge piers dynamically extend down into uneven hills, cliffs, and water moats so structures sit solidly on any terrain.
- **Terrain, Moats & Paving Brushes**: Sculpt hills, terraces, plateaus, smooth valleys, and crag cliffs; carve shimmering reflective moats with animated shoreline foam; paint cobblestone roads and courtyard flagstones.
- **Surface-Snapped Details**: Attach Gothic lancet windows, rose windows, shuttered windows, oak portals, iron portcullis gates, timber balconies, oriel bays, fluttering heraldic banners, lanterns, fire braziers, and ivy directly onto any wall, tower, or keep surface normal.
- **Living World & Atmosphere**: Circling doves, grazing sheep, twinkling twilight fireflies, curling chimney smoke, procedural Web Audio ambient soundscapes & tactile stone foley, smooth 24-hour sun/moon cycle with glowing candlelight bloom, 5 weather moods (Clear, Mist, Rain, Autumn Drift, Winter Frost), and Photo Mode with PNG snapshot export.
- **5 Curated Starter Dioramas + Saves & Blueprints**: Start in *Montclair Citadel*, *Lochhaven Water Keep*, *Sunspire Abbey*, *Highcliff Watch*, or *Verdant Meadow*, with full Undo/Redo, browser save slots, and `.castle.json` import/export.

## Development & Vercel Deployment

```bash
npm install
npm run dev       # Local Vite dev server
npm run build     # Type-check and build production bundle to dist/
```

This repository includes `vercel.json` configured for Vite static asset caching and SPA routing on Vercel.
