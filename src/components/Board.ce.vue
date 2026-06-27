<script setup lang="ts">
import { computed, type PropType, ref, watch, onMounted } from 'vue'
import type { Board, Square, Move } from '../types'
import c_wK from '@/assets/classic/wk.svg'
import c_wQ from '@/assets/classic/wq.svg'
import c_wR from '@/assets/classic/wr.svg'
import c_wB from '@/assets/classic/wb.svg'
import c_wN from '@/assets/classic/wn.svg'
import c_wP from '@/assets/classic/wp.svg'

import c_bK from '@/assets/classic/bk.svg'
import c_bQ from '@/assets/classic/bq.svg'
import c_bR from '@/assets/classic/br.svg'
import c_bB from '@/assets/classic/bb.svg'
import c_bN from '@/assets/classic/bn.svg'
import c_bP from '@/assets/classic/bp.svg'

const builtInThemes: Record<string, Record<string, any>> = {
  classic: {
    'K': c_wK, 'Q': c_wQ, 'R': c_wR, 'B': c_wB, 'N': c_wN, 'P': c_wP,
    'k': c_bK, 'q': c_bQ, 'r': c_bR, 'b': c_bB, 'n': c_bN, 'p': c_bP,
  },
}

const props = defineProps({
  wasmUrl: {
    type: String,
  },
  fen: {
    type: String,
    default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  },
  doHighLightSquares: {
    type: Boolean,
    default: true,
  },
  validMoves: {
    type: Array<Square>,
    default: () => []
  },
  playerColor: {
    type: String,
    default: 'White',
  },
  theme: {
    type: String,
    default: 'classic',
  },
  pieceThemeUrl: {
    type: Function as PropType<(piece: string) => string>,
    required: false
  },
  flipped: {
    type: Boolean,
    default: false,
  },
  enableSound: {
    type: [Boolean, String],
    default: false,
    validator: (value: any) => {
      return ['true', 'false', true, false].includes(value);
    }
  },
  moveSoundUrl: {
    type: String,
    default: '',
  },
  enableClickToMove: { type: Boolean, default: true },
})

const activeColor = computed(() => {
  const parts = props.fen.trim().split(' ')
  return parts[1] || 'w'
})

const enPassantTargetSquare = ref<Square | null>(null)
const promotionRank = ref(-1)
const promotionFile = ref(-1)
const promotionSourceRank = ref(-1)
const promotionSourceFile = ref(-1)

const promotionChoices = ['Q', 'R', 'N', 'B'] as const

const rankNumberDisplayFile = computed(() => {
  if (props.flipped) {
    return 7
  }
  return 0
})

const fileCharacterDisplayRank = computed(() => {
  if (props.flipped) {
    return 0
  }
  return 7
})

const emit = defineEmits<{
  (e: 'movePlayed', move: Move): void
  (e: 'pieceTouched', sourceSquare: Square): void
}>()
const grid = ref<Board>(loadFEN(props.fen))
const validMovesSet = ref(new Set())
const activeSquare = ref<{ rankIndex: number, fileIndex: number } | null>(null)

watch(
    () => props.validMoves,
    (squares: Square[]) => {
      validMovesSet.value.clear();
      if (Array.isArray(squares)) {
        squares.forEach((square) => {
          validMovesSet.value.add(getAlgebraicSquare(square));
        });
      }
    },
    { immediate: true }
);

watch(
    () => props.fen,
    (newFen) => {
      grid.value = loadFEN(newFen)
    },
)

function getAlgebraicSquare(square: Square): string {
  return `${fileCharacter(square.fileIndex)}${7 - square.rankIndex + 1}`
}

function getSquareFromAlgebraicSquare(sq: string): Square {
  const fileIndex = sq[0].charCodeAt(0) - 97
  const rankIndex = 8 - Number(sq[1])
  return { fileIndex, rankIndex }
}

function isValidMove(fileIndex: number, rankIndex: number): boolean {
  return validMovesSet.value.has(
      getAlgebraicSquare({ fileIndex, rankIndex }),
  )
}

function loadFEN(fen: string): Board {
  const parts = fen.trim().split(' ')
  const piecePlacement = parts[0]
  const enPassant = parts[3] || '-'

  if (enPassant != '-') {
    enPassantTargetSquare.value = getSquareFromAlgebraicSquare(enPassant)
  }

  const newBoard: Board = Array.from({ length: 8 }, () => Array(8).fill(null))
  const ranks = piecePlacement.split('/')

  ranks.forEach((rankStr, rankIndex) => {
    let fileIndex = 0
    for (const char of rankStr) {
      const emptySquares = parseInt(char, 10)
      if (!isNaN(emptySquares)) {
        fileIndex += emptySquares
      } else {
        newBoard[rankIndex][fileIndex] = char
        fileIndex++
      }
    }
  })

  return newBoard
}

const activeDrag = ref<{
  piece: string
  fromRank: number
  fromFile: number
  x: number
  y: number
  isDeselectClick: boolean
} | null>(null)

let sharedAudioCtx: AudioContext | null = null;

onMounted(() => {
  if (!props.enableSound || props.moveSoundUrl) return;

  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioCtx = new AudioContext();
    // State is naturally 'suspended' here due to browser policies
  } catch (e) {
    console.warn("Web Audio API not supported", e);
  }
})

function wakeUpAudio() {
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
}

function attemptMove(fromRank: number, fromFile: number, toRank: number, toFile: number, piece: string): boolean {
  if (!isValidMove(toFile, toRank)) return false

  // Promotion check
  if ((piece === 'P' && toRank === 0) || (piece === 'p' && toRank === 7)) {
    promotionRank.value = toRank
    promotionFile.value = toFile
    promotionSourceRank.value = fromRank
    promotionSourceFile.value = fromFile
    validMovesSet.value = new Set()
    return true
  }

  grid.value[fromRank][fromFile] = null
  grid.value[toRank][toFile] = piece

  const movePlayed: Move = {
    sourceSquare: { fileIndex: fromFile, rankIndex: fromRank },
    targetSquare: { fileIndex: toFile, rankIndex: toRank },
  }
  setTimeout(() => {
    emit('movePlayed', movePlayed)
    playMoveSound()
  }, 0)

  return true
}

function startDrag(event: MouseEvent, piece: string, rankIndex: number, fileIndex: number) {
  event.preventDefault()

  let isDeselectClick = false;

  if (props.enableClickToMove && activeSquare.value) {
    const activeRank = activeSquare.value.rankIndex
    const activeFile = activeSquare.value.fileIndex
    const selectedPiece = grid.value[activeRank][activeFile]

    if (activeRank === rankIndex && activeFile === fileIndex) {
      isDeselectClick = true;
    }

    if (isValidMove(fileIndex, rankIndex)) {
      if (selectedPiece) {
        attemptMove(activeRank, activeFile, rankIndex, fileIndex, selectedPiece)
      }
      activeSquare.value = null
      return
    }
  }

  const isWhitePiece = piece === piece.toUpperCase()
  const isWhiteTurn = activeColor.value === 'w'

  if (isWhitePiece !== isWhiteTurn) {
    if (props.enableClickToMove) {
      activeSquare.value = null
      validMovesSet.value.clear()
    }
    return
  }

  if (props.enableClickToMove) {
    activeSquare.value = { rankIndex, fileIndex }
  }

  activeDrag.value = {
    piece,
    fromRank: rankIndex,
    fromFile: fileIndex,
    x: event.clientX,
    y: event.clientY,
    isDeselectClick
  }

  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)

  const fromRank = activeDrag.value.fromRank
  const fromFile = activeDrag.value.fromFile

  setTimeout(() => {
    emit('pieceTouched', {
      fileIndex: fromFile,
      rankIndex: fromRank,
    })
  }, 0)
}

function onDragMove(event: MouseEvent) {
  if (!activeDrag.value) return
  activeDrag.value.x = event.clientX
  activeDrag.value.y = event.clientY
}

function onDragEnd(event: MouseEvent) {
  if (!activeDrag.value) return

  const isDeselectClick = activeDrag.value.isDeselectClick;

  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)

  const fromRank = activeDrag.value.fromRank
  const fromFile = activeDrag.value.fromFile
  const piece = activeDrag.value.piece
  const path = event.composedPath() as HTMLElement[]
  const squareEl = path.find((el) => el.classList && el.classList.contains('grid__rank__square'))

  activeDrag.value = null

  if (squareEl) {
    const toRank = Number(squareEl.getAttribute('data-rank'))
    const toFile = Number(squareEl.getAttribute('data-file'))

    if (toRank !== fromRank || toFile !== fromFile) {
      // This is a real drag, so we ignore the isDeselectClick flag.
      const moved = attemptMove(fromRank, fromFile, toRank, toFile, piece)
      if (!moved) {
        // Snap back if invalid
        grid.value[fromRank][fromFile] = piece
      }
      activeSquare.value = null
    } else {
      // It was a click so we drop the piece on the exact same square!
      grid.value[fromRank][fromFile] = piece

      // If the piece was already active when we clicked it, deselect it now.
      if (isDeselectClick) {
        activeSquare.value = null
        validMovesSet.value.clear()
      }
    }
  } else {
    // Snap back if dropped outside the board
    grid.value[fromRank][fromFile] = piece
  }
}

function onSquareClick(rankIndex: number, fileIndex: number) {
  if (!props.enableClickToMove || !activeSquare.value) return
  if (grid.value[rankIndex][fileIndex] !== null) return

  const fromRank = activeSquare.value.rankIndex
  const fromFile = activeSquare.value.fileIndex
  const selectedPiece = grid.value[fromRank][fromFile]

  if (selectedPiece && isValidMove(fileIndex, rankIndex)) {
    attemptMove(fromRank, fromFile, rankIndex, fileIndex, selectedPiece)
    activeSquare.value = null
  } else {
    activeSquare.value = null
    validMovesSet.value.clear()
  }
}

function onPromote(event: MouseEvent, promotionPiece: Move['promoteTo']) {
  let movePlayed: Move = {
    sourceSquare: { fileIndex: promotionSourceFile.value, rankIndex: promotionSourceRank.value },
    targetSquare: { fileIndex: promotionFile.value, rankIndex: promotionRank.value },
    promoteTo: promotionPiece,
  }

  emit('movePlayed', movePlayed)
  playMoveSound()

  grid.value[promotionSourceRank.value][promotionSourceFile.value] = null
  grid.value[promotionRank.value][promotionFile.value] =
      promotionRank.value === 0 ? promotionPiece : promotionPiece.toLowerCase()

  promotionRank.value = -1
  promotionFile.value = -1
}

function cancelPromotion() {
  promotionRank.value = -1
  promotionFile.value = -1
  promotionSourceRank.value = -1
  promotionSourceFile.value = -1
}

function isLightSquare(fileIndex: number, rankIndex: number): boolean {
  return (fileIndex + rankIndex) % 2 === 0
}

function fileCharacter(fileIndex: number): string {
  return String.fromCharCode(97 + fileIndex)
}

function getPopoverClass(rankIndex: number): string {
  const isPhysicalTop = props.flipped ? rankIndex === 7 : rankIndex === 0
  return isPhysicalTop ? 'promotion-choices--down' : 'promotion-choices--up'
}

function getPieceImage(piece: string): string {
  if (props.pieceThemeUrl) {
    return props.pieceThemeUrl(piece)
  }
  const selectedTheme = builtInThemes[props.theme] || builtInThemes['classic']
  return selectedTheme[piece]
}

function playMoveSound() {
  if (!props.enableSound) return

  if (props.moveSoundUrl) {
    const audio = new Audio(props.moveSoundUrl)
    audio.play().catch((err) => console.warn('Audio blocked:', err))
    return
  }

  try {
    if (!sharedAudioCtx) return;

    const osc = sharedAudioCtx.createOscillator();
    const gainNode = sharedAudioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, sharedAudioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, sharedAudioCtx.currentTime + 0.05);

    gainNode.gain.setValueAtTime(1, sharedAudioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, sharedAudioCtx.currentTime + 0.1);

    osc.connect(gainNode);
    gainNode.connect(sharedAudioCtx.destination);

    osc.start();
    osc.stop(sharedAudioCtx.currentTime + 0.1);
  } catch (e) {
    console.warn("Synth failed:", e);
  }
}
</script>

<template>
  <div
      class="bareboard-wrapper"
      @pointerdown.capture.once="wakeUpAudio"
  >
    <div
        class="promotion-overlay"
        v-if="promotionRank !== -1"
        @mousedown.stop="cancelPromotion"
    ></div>
    <div class="grid" :class="[flipped ? 'flipped' : '']" :style="{
      position: 'relative',
      zIndex: promotionRank !== -1 ? 1000 : 1,
      pointerEvents: promotionRank !== -1 ? 'none' : 'auto',
    }">
      <div
          v-for="(rank, rankIndex) in grid"
          class="grid__rank"

      >
        <div
            v-for="(square, fileIndex) in rank"
            :key="`${rankIndex}${fileIndex}`"
            class="grid__rank__square"
            @mousedown="onSquareClick(rankIndex, fileIndex)"
            :style="{
        zIndex: promotionRank === rankIndex && promotionFile === fileIndex ? 200 : 'auto',
        pointerEvents: promotionRank === rankIndex && promotionFile === fileIndex ? 'auto' : 'inherit'
      }"
            :class="[
        isLightSquare(fileIndex, rankIndex)
          ? 'grid__rank__square--light'
          : 'grid__rank__square--dark',

        flipped ? 'flipped' : '',
        {
          'grid__rank__square--active':
            enableClickToMove && activeSquare?.rankIndex === rankIndex && activeSquare?.fileIndex === fileIndex
        },
        {
          'grid__rank__square--valid-move':
            isValidMove(fileIndex, rankIndex) && doHighLightSquares && square === null,
        },

        {
          'grid__rank__square--valid-capture':
            isValidMove(fileIndex, rankIndex) && doHighLightSquares && square !== null,
        },
      ]"
            :data-rank="rankIndex"
            :data-file="fileIndex"
        >
          <div
              class="promotion-choices"
              v-if="promotionRank === rankIndex && promotionFile === fileIndex"
              :class="getPopoverClass(rankIndex)"
          >
            <div
                class="promotion-choices__choice"
                v-for="choice in promotionChoices"
                :key="choice"
                @mousedown.stop="onPromote($event, choice)"
            >
              <img
                  :src="getPieceImage(activeColor === 'w' ? choice : choice.toLowerCase())"
                  alt=""
                  draggable="false"
              />
            </div>
            <div class="promotion-choices__cancel" @mousedown.stop="cancelPromotion">✕</div>
          </div>
          <h4 v-if="rankIndex === fileCharacterDisplayRank" class="grid__rank__square__file">
            {{ fileCharacter(fileIndex) }}
          </h4>
          <h4 v-if="fileIndex === rankNumberDisplayFile" class="grid__rank__square__rank">
            {{ 7 - rankIndex + 1 }}
          </h4>
          <img
              v-if="square !== null"
              :src="getPieceImage(square)"
              alt=""
              @mousedown="startDrag($event, square, rankIndex, fileIndex)"
              :style="{
          opacity:
            activeDrag?.fromRank === rankIndex && activeDrag?.fromFile === fileIndex
              ? '0.2'
              : '1',
        }"
          />
        </div>
      </div>
    </div>
    <img
        v-if="activeDrag"
        :src="getPieceImage(activeDrag.piece)"
        class="floating-piece"
        :style="{ left: activeDrag.x + 'px', top: activeDrag.y + 'px' }"
        draggable="false"
        alt=""
    />
  </div>
</template>

<style lang="scss">
:host {
  --light-color: #ffe9c5;
  --dark-color: #8b4513;
  --square-size: 80px;
}

.grid {
  --border-width: calc(var(--square-size) * 0.025);
  display: grid;
  grid-template-rows: repeat(8, 1fr);
  border: var(--border-width) solid #333;
  width: max-content;
  user-select: none;
  -webkit-user-select: none;
  &__rank {
    display: grid;
    grid-template-columns: repeat(8, max-content);
    gap: 0;
    &__square {
      position: relative;
      width: var(--square-size);
      height: var(--square-size);
      border: var(--border-width) solid #333;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: calc(var(--square-size) * 0.2);

      &--active {
        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(255, 255, 0, 0.4);
          z-index: 10;
          pointer-events: none;
        }
      }

      &--valid-move {
        cursor: pointer;
        &::after {
          content: '';
          position: absolute;
          width: calc(var(--square-size) * 0.3);
          height: calc(var(--square-size) * 0.3);
          border-radius: 50%;
          background-color: rgba(0, 0, 0, 0.2);
          z-index: 50;
          pointer-events: none;
        }
      }

      &--valid-capture {
        cursor: pointer;
        &::after {
          content: '';
          position: absolute;
          width: calc(var(--square-size) * 0.85);
          height: calc(var(--square-size) * 0.85);
          border-radius: 50%;
          border: calc(var(--square-size) * 0.08) solid rgba(0, 0, 0, 0.2);
          background-color: transparent;
          z-index: 50;
          pointer-events: none;
        }
      }

      h4 {
        margin: 0;
        line-height: 1;
      }

      &--light {
        background-color: var(--light-color);
        color: var(--dark-color);
      }
      &--dark {
        background-color: var(--dark-color);
        color: var(--light-color);
      }
      &__rank {
        position: absolute;
        top: 0.2em;
        left: 0.2em;
        font-size: 0.9em;
        user-select: none;
      }
      &__file {
        position: absolute;
        bottom: 0.2em;
        right: 0.2em;
        font-size: 0.9em;
        user-select: none;
      }
      img {
        width: var(--square-size);
        height: var(--square-size);
        position: relative;
        z-index: 100;
        cursor: grab;
        -webkit-user-drag: none;
      }
    }
  }
}

.flipped {
  rotate: 180deg;
}

.floating-piece {
  position: fixed;
  width: var(--square-size);
  height: var(--square-size);
  pointer-events: none;
  z-index: 9999;
  transform: translate(-50%, -50%);
  opacity: 1;
  filter: drop-shadow(0px 10px 10px rgba(0, 0, 0, 0.5));
}

.promotion-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 999;
  cursor: default;
}

.promotion-choices {
  position: absolute;
  box-sizing: border-box;
  left: calc(var(--border-width) * -1);
  right: calc(var(--border-width) * -1);
  width: auto;
  display: flex;
  z-index: 1000;
  background-color: white;
  overflow: hidden;
  border-radius: calc(var(--square-size) * 0.05);
  box-shadow: 0 calc(var(--square-size) * 0.1) calc(var(--square-size) * 0.25) rgba(0, 0, 0, 0.4);

  &--down {
    top: calc(var(--border-width) * -1);
    flex-direction: column;
  }

  &--up {
    bottom: calc(var(--border-width) * -1);
    flex-direction: column-reverse;
  }

  &__choice {
    width: 100%;
    height: calc(var(--square-size) + (var(--border-width) * 2));
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: transparent;
    cursor: pointer;

    &:hover {
      background-color: #f0f0f0;
    }

    img {
      width: 80%;
      height: 80%;
      object-fit: contain;
      transform: none;
    }
  }

  &__cancel {
    width: 100%;
    height: calc(var(--square-size) * 0.35);
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f2f2f2;
    cursor: pointer;
    color: #666;
    font-size: calc(var(--square-size) * 0.25);
    font-family: sans-serif;
    font-weight: bold;
    border-top: 1px solid #ddd;

    &:hover {
      background-color: #e0e0e0;
      color: #000;
    }
  }
}
</style>