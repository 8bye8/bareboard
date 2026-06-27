// src/types.ts

export type Board = (string | null)[][]
export type Square = {
    rankIndex: number
    fileIndex: number
}
export type Move = {
    sourceSquare: Square
    targetSquare: Square
    promoteTo?: 'Q' | 'q' | 'N' | 'n' | 'B' | 'b' | 'R' | 'r'
}
