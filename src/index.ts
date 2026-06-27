import { defineCustomElement } from 'vue'
import BoardCe from './components/Board.ce.vue'

// Wraps the Vue component into a standard browser Custom Element
const ChessBoardElement = defineCustomElement(BoardCe)

// The function users will call to register the HTML tag
export function register() {
    if (!customElements.get('bare-board')) {
        customElements.define('bare-board', ChessBoardElement)
    }
}

export { ChessBoardElement }