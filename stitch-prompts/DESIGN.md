# Design System Document: The Celestial Pharmacopeia

## 1. Overview & Creative North Star
**The Creative North Star: "The Ethereal Clinic"**
This design system moves beyond the cold, sterile nature of traditional medical portals to create an experience that feels both authoritative and otherworldly. It draws inspiration from the Penacony aesthetic—where high-society elegance meets dreamscape technology. 

We break the "template" look by rejecting standard rounded rectangles and rigid grids. Instead, we utilize **Asymmetric Geometric Precision**: a layout language defined by diagonal clipped corners, layered glass surfaces, and a high-contrast interplay between medical data and editorial typography. The atmosphere must remain serious and protective, yet visually breathtaking.

---

## 2. Colors & Surface Logic

### The Color Palette
- **Primary (`primary`):** #C84B7C (Crimson Pink) – Used for vital actions and branding markers.
- **Secondary (`secondary`):** #D4A853 (Golden) – Reserved for prestige elements, certifications, and high-tier accents.
- **Tertiary (`tertiary`):** #CBC2DD (Muted Lavender) – Used for supportive data visualization.
- **Surface/Background (`surface`):** #0D0B14 – A deep, "cosmic" purple-black that provides the canvas.

### The "No-Line" Rule
Standard 1px borders are strictly prohibited for structural sectioning. Boundaries between sections must be defined by:
1.  **Tonal Shifts:** Transitioning from `surface` to `surface_container_low`.
2.  **Backdrop Blurs:** Using the card background `rgba(26, 22, 37, 0.6)` with a `12px` blur to let background particles bleed through.
3.  **Negative Space:** Utilizing the spacing scale to create psychological boundaries.

### Glass & Gradient Rule
To achieve "Anime Elegance," main CTAs and Hero sections must not use flat colors. Apply a subtle 135-degree linear gradient (e.g., `primary` to `primary_container`). Floating UI elements must utilize glassmorphism to feel like "holographic displays" within the Penacony dreamscape.

---

## 3. Typography: Editorial Authority
The typography system juxtaposes the grace of the humanities with the precision of science.

- **Display & Headlines (`notoSerif`):** Use for major section titles and medical category names. This serif choice conveys "Yakuten" (Pharmacopeia) heritage and traditional medical authority.
- **Body & Titles (`manrope`):** A high-readability sans-serif for clinical descriptions and patient instructions. It balances the serif’s weight with modern clarity.
- **Data Labels (`spaceGrotesk`):** A monospace font used for chemical compounds, dosages, and technical IDs. This reinforces the "medical data" aspect of the system.

*Hierarchy Note:* Always maintain high contrast. A `display-lg` headline should feel monumental against a `body-sm` disclaimer.

---

## 4. Elevation & Depth: Tonal Layering

### The Layering Principle
Avoid "Drop Shadows" in the traditional sense. Depth is achieved by stacking:
*   **Level 0 (Base):** `surface` (#0D0B14)
*   **Level 1 (Section):** `surface_container_low`
*   **Level 2 (Floating Card):** Card background with `backdrop-filter: blur(12px)` and `outline_variant` at 20% opacity.

### The "Ghost Border" Fallback
Where separation is critical for accessibility, use a **Ghost Border**. This is a 1px stroke using `outline_variant` (#564147) set to **20% opacity**. This creates a "shimmer" effect on the edge of the clipped corners rather than a hard cage.

### Geometric Signature
All cards and primary containers must feature **Diagonal Clipped Corners**.
- **Clip Path:** `polygon(0 0, 95% 0, 100% 5%, 100% 100%, 5% 100%, 0 95%)`
- This creates the signature Penacony tech-cut on the top-right and bottom-left.

---

## 5. Components

### Buttons (The "Command" Units)
*   **Primary:** Clipped-corner shape. Background: `linear-gradient(135deg, #C84B7C, #E76395)`. Text: `on_primary` (Bold).
*   **Secondary:** Ghost style. Transparent background, `secondary` (#D4A853) Ghost Border, and `secondary` text.
*   **States:** On hover, increase `backdrop-filter` blur and add a subtle glow using `surface_tint`.

### Medical Information Cards
*   **Constraint:** No internal dividers.
*   **Layout:** Use `title-lg` for the medication name and `label-md` (Monospace) for the dosage.
*   **Background:** The signature glass effect (`rgba(26, 22, 37, 0.6)`).
*   **Accent:** A 2px vertical gold stripe (`secondary`) only on the left side of "Critical Warning" cards.

### Input Fields (The "Terminal" Style)
*   **Base:** Bottom-border only (Ghost Border style).
*   **Focus State:** The bottom border transforms into a `primary` gradient. 
*   **Micro-copy:** Helper text must use `label-sm` in `text-secondary`.

### New Component: The "Particle Scrim"
Backgrounds should not be static. Use a canvas layer with floating "Light Particles" in `primary` and `secondary` colors at 5% opacity to simulate the Penacony atmosphere behind the glass UI.

---

## 6. Do’s and Don’ts

### Do:
*   **Use Asymmetry:** Place medical imagery or decorative gold elements off-center to create visual interest.
*   **Embrace the Blur:** Let the deep purple background bleed through your glass panels.
*   **Respect the Serif:** Use `notoSerif` for anything that needs to feel "Official" or "Historic."

### Don't:
*   **Don't use Rounded Corners:** The `Roundedness Scale` is strictly `0px`. Everything is sharp, clipped, or rectangular.
*   **Don't use Solid Red for Errors:** Use the `Danger Red` gradient (`#F44336` to `#D32F2F`) to maintain the "High-End" aesthetic even in error states.
*   **Don't Over-illuminate:** Keep the background dark (`#0D0B14`). Light should feel like it's coming from the UI elements themselves, like a glowing terminal in a dark room.
*   **Don't use Standard Dividers:** Use vertical spacing or a shift from `surface_container_low` to `surface_container_high` to separate content blocks.