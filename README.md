# 🌊 Bus Broadcaster 🌊

💧 A gritty, lo-fi UHF-themed stealth + resource-management simulation 💧

You are operating a hacked-together broadcast rig inside a bus, trying to keep the signal alive while staying hidden in the mist. Manage power, heat, noise, and attention — and keep the data flowing. 🫧

## 🐚 Vision
**Bus Broadcaster** blends:
- **Resource management**: power draw, battery/fuel, heat, maintenance.
- **Stealth / cat-and-mouse**: avoid detection while you transmit across the waves.
- **Lo-fi UHF aesthetic**: scanlines, static bursts, chunky UI panels, diesel hum.

## 🌊 Tech Stack (initial)
- **Engine:** Phaser.js (browser-first, easy GitHub Pages deployment)
- **Language:** JavaScript (upgrade path to TypeScript)
- **Hosting:** GitHub Pages

## 🐚 Repository Structure
```
/BusBroadcaster
  /src      # game engine + logic
  /assets   # sprites, audio, data
  /docs     # design doc + lore
```

## 💧 Getting Started (dev)
This repo starts as a static site, flowing from the root.

1. Run a local server from the repo root:
   - `python3 -m http.server 5173`
2. Open:
   - `http://localhost:5173/`

## 🫧 GitHub Pages
Once enabled, the live build will be available via GitHub Pages, surfacing to the web.

## 🐚 Roadmap (MVP)
- Boot scene + main loop
- UHF UI overlay (signal strength / noise / heat)
- Basic resource loop (power + heat)
- Basic detection loop (attention meter + consequences)

## 🌊 License
TBD.

---
*Be like water, my friend. It can flow or it can crash.* 🌊
