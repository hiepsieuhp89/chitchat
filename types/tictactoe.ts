import type { Timestamp } from "firebase/firestore"

export type TicTacToeCell = "X" | "O" | null
export type TicTacToeBoard = TicTacToeCell[][]
export type TicTacToePlayer = "X" | "O"
export type TicTacToeGameStatus = "waiting" | "active" | "completed" | "draw"

export interface TicTacToeGame {
  id: string
  board: TicTacToeBoard
  currentTurn: TicTacToePlayer
  players: {
    X: string // User ID who plays as X
    O: string | null // User ID who plays as O (null if waiting for player)
  }
  winner: TicTacToePlayer | null
  status: TicTacToeGameStatus
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string // User ID who created the game
} 