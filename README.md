# Dough Lab Pro

Act as an expert Full-Stack Developer and UI/UX Designer. Build a progressive web application (PWA) called "CarpiBiga Pro" designed for professional and advanced pizza-makers. The app is for a single user (local-only), requires no authentication/login, and saves all data locally on the device via LocalStorage or IndexedDB.

### Global Localization & Internationalization (i18n)

- The application must support multiple languages. 

- **Default language:** English.

- **Supported languages:** English, Français, Italiano, Español, Português, Deutsch.

- Include a clean, easily accessible language selector toggle or dropdown in the main navigation header. All UI text, buttons, labels, notifications, and dynamic warnings must translate instantly when a language is selected.

The app must feature two main engine types for pizza dough: "Biga Contemporaine (Indirecte)" and "Direct Long à Froid (72h)".

### 1. The Core Dough Calculation Engine & Inputs

Implement an advanced thermal dynamic algorithm based on the "Trio: Time, Temperature, Yeast".

- **Smart Ingredient Converter (Reverse Calculation):**

  - The user can choose to input: **Number of dough balls needed** AND **Weight per ball (g)**.

  - The app must automatically calculate the total dough mass needed, factor in the hydration and salt percentages, and back-calculate the exact weights of total flour and total water required.

- **User Inputs Interface:**

  - Target Hydration % (e.g., 65% or 67%)

  - Salt % (default 2.5%, editable)

  - Yeast Type Toggle: Fresh Yeast (default) vs Instant Dry Yeast

  - Flour Strength (W) input field (e.g., W300, W360). If the user inputs a value under W300, display a visible but non-blocking technical warning about structural collapse risks during long fermentations.

  - Optional Ingredients Checkboxes: 

    - Diastatic Malt (slider or field from 0.5% to 1%, default 1% of total flour)

    - Olive Oil / Fats (slider or field from 1% to 3%, default 2% of total flour)

  - Storage Room/Cellar Temperature (°C) — Critical for fermentation.

  - Final target baking time (Date & Time picker).

- **Logic for Biga 80% Engine:**

  - Automatically isolates 80% of the total flour for the Biga phase at exactly 50% hydration.

  - Dynamically calculates the exact yeast weight required based on the cellar temperature input to reach perfect maturity in exactly 16 to 18 hours (using Giorilli's constants). If Instant Dry Yeast is toggled, divide the final calculated fresh yeast weight by 3.

  - If cellar temperature input is >19°C, output a thermal warning recommending a shorter cellar time or a cooler zone.

  - Outputs the exact structural breakdown for Day 2 (Refreshment): Remaining 20% flour, remaining water (bassinage), salt, and optional ingredients (Malt, Oil) calculated against total flour weight.

- **Logic for Direct Long 72h Engine:**

  - Calculates a single-mix direct dough with a low yeast ratio (0.15% fresh yeast equivalent, divided by 3 if dry yeast is selected), engineered for a multi-day cold block (4°C) spanning 3 separate baking nights.

### 2. Embedded Tool: Water Temperature Calculator (La Règle des 55)

Inside the recipe generation screen, include a dedicated, interactive component to calculate the required water temperature before mixing:

- **Inputs:** Room Temperature (°C), Flour Temperature (°C), and Mixer Friction Factor (preset default at 10°C for spiral mixers, but editable by the user).

- **Formula:** Target Water Temp = 55 - (Room Temp + Flour Temp + Friction)

- **Output:** Clearly display the exact temperature the water should be when pouring (including a visual tip like "Use ice water/ice cubes" if the output is below 6°C).

### 3. Smart Protocol Timeline & Dynamic Notification System

Once a recipe is generated, create an interactive chronological timeline mapping out the entire process across 3 physical zones: Cellar/Room, Fridge (4°C), and Final Room Temp Room.

- **Dynamic Alarms/Notifications:**

  - The app must calculate and schedule web notifications (adjustable/mutable by the user) to trigger action alerts based on the target baking time.

  - Alerts: "Start Biga Fermentation", "Refreshment & Final Kneading", "Take dough out of the fridge (Proofing start)".

  - Before entering the final room temperature stage, the app must trigger an interactive query asking: "What is your current kitchen temperature right now?". Based on the user's live answer, it dynamically recalibrates the final counter proofing time (e.g., 4 hours if 20°C, 2.5 hours if 24°C).

### 4. Active Dashboard & Professional Baking Tools

The active recipe screen must act as a real-time command center during baking sessions:

- **High-Contrast Cook Timer:** A large, easily tappable stopwatch countdown component optimized for high-heat bakes. Include customizable presets (e.g., 90s for Neapolitan, 120s for contemporary). The timer must emit a loud, distinct audio alert/beep when it hits zero.

- **Visual Progress Bars:** Step-by-step circular charts or progress bars showing time elapsed vs remaining for the active fermentation phase.

- **Bassinage Step Guidance:** On Day 2 mixing instructions, explicitly display a "Bassinage Breakdown" section indicating exactly how much water to reserve (e.g., 15% of total water) to be poured slowly during the final 3 minutes of kneading to preserve dough structure.

- **Rigenero Rescue Mode:** Include a quick-toggle "Rigenero Rescue Mode" button at the bottom of the screen for the 3rd evening of Direct Long doughs, displaying quick technical instructions on how to re-ball and retighten over-proofed/slack dough balls.

- **Secure Reset Button:** Add a prominent "Reset Active Session" button on the dashboard. Clicking this button must trigger a clear confirmation dialog prompt warning the user that it will clear the live protocol, but will NOT delete recipes stored in their favorites.

### 5. Local Recipe Manager with Media Journal (Favorites, Tests & Notes)

- **Dashboard:** A clean view showing the active running recipe and a quick-access grid for saved recipes.

- **Favorites & Tests History:** Allow the user to save any successful calculation profile with a custom name (e.g., "Biga d'Hiver 67%").

- **Interactive Notes & Photo Attachment:** Every saved recipe or logged test run must have an accessible text area where the user can type live observations. Integrate a file/camera input allowing the user to snap or upload photos of the crumb structure (alvéolage) and associate them directly with that specific baking log.

- **Export Recipe Card:** Include an "Export" button that generates a clean, single-page printable view or downloadable image of the technical sheet (including weights, timeline steps, custom notes, and the attached photo) for easy paper reference on the kitchen counter.

### 6. UI/UX Specifications & Smart Comfort

- Modern, clean, dark-mode-first aesthetic optimized for mobile screens (kitchen-friendly, high contrast, easily readable with flour on hands).

- **Hands-Free Screen Mode:** Implement the Web Wake Lock API on the active recipe and timer screens to prevent the device screen from dimming or locking while the user is actively working with dough.

- Use explicit, well-spaced data tables for raw weights (g).

- No external backend or server required. Ensure all states, languages settings, images (stored locally as base64 or object URLs), and history are strictly stored locally via device storage so the user never loses their custom settings.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://biga-pro.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/16bfb942-0541-413f-81ad-65d25ff0f7b9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
