# @8bye8/bareboard

**The ultra-lightweight, framework-agnostic, headless chessboard Web Component.**

`Bareboard` is the foundational UI layer of the 8bye8 Chess Suite. It provides a mathematically perfect, drag-and-drop enabled chessboard that runs in any modern browser or framework (React, Vue, Angular, Vanilla JS).

It is completely "headless"—it handles the visual rendering, piece dragging, and promotion popups, but leaves the move validation and engine logic entirely up to you (or your companion `d4d5` engine).

---

## 🚀 Features

* **Framework Agnostic:** Built as a native Custom Web Component (`<bare-board>`).
* **Zero CSS Bleed:** Encapsulated inside a Shadow DOM. Your website's CSS won't break the board, and the board's CSS won't break your website.
* **Microscopic Footprint:** Ships with a standard "Classic" piece set, but allows lazy-loading external SVGs via CDN to keep your main JS bundle incredibly small.
* **Fully Reactive CSS:** Recolor and resize the entire board instantly using native CSS variables.
* **Type Safe:** Full TypeScript definitions exported for seamless integration.

---

## 📦 Installation

```bash
npm install @8bye8/bareboard
```

---

## 🛠️ Quick Start

Because `Bareboard` is a standard HTML Web Component, you must register it with the browser before using it in your templates.

### 1. Register the Component
Import the `register` function at the top level of your application (e.g., `main.ts`, `App.jsx`, or a `<script type="module">`).

```javascript
import { register } from '@8bye8/bareboard';

// Registers the <bare-board> HTML tag with the browser
register();
```

### 2. Render the Board
Once registered, you can use the `<bare-board>` tag exactly like a standard HTML element. Pass the board state via the `fen` attribute.

```html
<bare-board fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"></bare-board>
```

*Note for React Users: In React 19+, Custom Elements are natively supported. In older React versions, you may need to use a `ref` to bind to custom events.*

---

## 🎨 Theming & Assets (Inversion of Control)

To keep bundle sizes microscopic, `Bareboard` only bundles one default piece theme (`classic`). If you want to use custom pieces (like the `governor` theme), `Bareboard` relies on **Inversion of Control**—you provide the assets, and the board renders them.

### Option A: The CDN / URL Strategy (Recommended for smallest bundle)
Host your SVGs on a CDN or in your public folder. Pass a resolver function to the board. `Bareboard` will automatically fetch the images.

```javascript
// A function that takes a piece character ('K', 'q', 'P') and returns an image URL
const myUrlResolver = (piece) => `https://my-cdn.com/chess-pieces/governor/${piece}.svg`;
```
```html
<bare-board :pieceThemeUrl="myUrlResolver" />
```

### Option B: The Explicit Theme Map
If you prefer to bundle the SVGs directly into your own application, pass a dictionary mapping the FEN characters to your imported SVG assets.

```javascript
import wK from './my-assets/wk.svg';
import bK from './my-assets/bk.svg';
// ...

const myCustomTheme = {
  'K': wK,
  'k': bK,
  // ...
};
```
```html
<bare-board :customThemeMap="myCustomTheme" />
```

---

## 📐 Styling & CSS Variables

Because `Bareboard` uses a Shadow DOM, standard CSS targeting (like `.square { background: red; }`) will not work.

Instead, the board exposes **CSS Variables** that pierce the Shadow DOM. You can resize and recolor the board entirely from your parent application's CSS.

```css
/* In your application's global CSS or component styles */
bare-board {
  /* Board Dimensions */
  --square-size: 80px;         /* The board calculates its total size based on this */
  
  /* Board Colors */
  --light-color: #ffe9c5;      /* Light squares */
  --dark-color: #8b4513;       /* Dark squares */
}
```

---

## 📡 API Reference

### Properties / Attributes

| Attribute | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `fen` | `string` | *(Starting Position)* | The current Forsyth-Edwards Notation string. |
| `playerColor` | `'White' \| 'Black'` | `'White'` | Determines board orientation. Setting to 'Black' flips the board. |
| `doHighLightSquares`| `boolean` | `true` | Toggles the visual indicators for valid moves/captures. |
| `validMoves` | `Square[]` | `[]` | An array of valid destination squares for the currently touched piece. |
| `theme` | `string` | `'classic'` | The fallback internal theme to use if no custom map/url is provided. |

### Events

Listen to these events to connect `Bareboard` to your game logic or engine.

| Event Name | Payload | Description |
| :--- | :--- | :--- |
| `pieceTouched` | `Square` | Fired the moment a user clicks/grabs a piece. Use this to calculate `validMoves` and feed them back into the board. |
| `movePlayed` | `Move` | Fired when a user successfully drops a piece on a new square. Contains the source, target, and optional promotion piece. |

*Example (Vanilla JS):*
```javascript
const board = document.querySelector('bare-board');

board.addEventListener('movePlayed', (event) => {
  const move = event.detail; // { sourceSquare: {...}, targetSquare: {...}, promoteTo: 'Q' }
  console.log(`Move played from ${move.sourceSquare.fileIndex} to ${move.targetSquare.fileIndex}`);
});
```

---

## 🧰 Types

`Bareboard` exports strict TypeScript interfaces for seamless integration with your engine logic.

```typescript
import type { Board, Square, Move } from '@8bye8/bareboard';
```
```typescript
export interface Square {
  fileIndex: number;
  rankIndex: number;
}

export interface Move {
  sourceSquare: Square;
  targetSquare: Square;
  promoteTo?: 'Q' | 'R' | 'N' | 'B';
}
```

---

**@8bye8 Suite** - *Chess. Core. UI.*