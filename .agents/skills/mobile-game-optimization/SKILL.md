---
name: mobile-game-optimization
description: >-
  Architectural patterns and implementation runbook for making HTML5 Canvas,
  Web Audio, and single-page web games fully responsive and optimized for mobile
  devices (iOS Safari, Android Chrome).
---

# Mobile-First Web Game Optimization Runbook

Use this skill when adapting desktop browser games, Canvas simulations, or Web Audio applications for mobile devices.

## 1. Touch & Pointer Handling (Unifying Mouse and Touch)
- Always use the **Pointer Events API** (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`) instead of separate `touchstart`/`mousedown` listeners.
- Add `touch-action: none;` on the `<canvas>` element to prevent default mobile scroll/pinch gestures from hijacking game interaction.
- Enforce a minimum touch target size of **44x44px** for all buttons, pills, and interactive canvas nodes.

## 2. Dynamic Viewport & Mobile Safe Areas
- Never rely solely on `100vh` or `100%` for fullscreen game shells on mobile. Mobile address bars dynamically resize the viewport.
- Use `100dvh` (Dynamic Viewport Height) with fallback:
  ```css
  .game-container {
    height: 100vh;
    height: 100dvh;
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }
  ```

## 3. Crisp Retina / High-DPI Canvas Scaling
- Mobile screens have high pixel density (`window.devicePixelRatio >= 2`).
- Prevent blurry rendering by scaling the internal canvas bitmap while constraining the CSS display size:
  ```javascript
  function resizeCanvasForMobile(canvas, ctx) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }
  ```

## 4. Mobile Web Audio Auto-Play Policy Unlock
- iOS and Android suspend any `AudioContext` created before user interaction.
- Implement an audio unlock gate on the first user interaction:
  ```javascript
  function initOrUnlockAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }
  window.addEventListener('pointerdown', initOrUnlockAudio, { once: true });
  ```

## 5. Responsive Data Layouts: Tables to Cards
- Complex multi-column desktop tables cannot fit on vertical mobile screens.
- Use media queries or CSS Container Queries (`@container`) to collapse table rows into stacked card views or collapsible accordions on screens under `768px`.
