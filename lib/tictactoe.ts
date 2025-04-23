import type { TicTacToeBoard, TicTacToePlayer } from "@/types/tictactoe"

// Create an empty 3x3 board
export const createEmptyBoard = (): TicTacToeBoard => [
  [null, null, null],
  [null, null, null],
  [null, null, null],
]

// Check if a player has won
export const checkWinner = (board: TicTacToeBoard): TicTacToePlayer | null => {
  // Check rows
  for (let i = 0; i < 3; i++) {
    if (board[i][0] && board[i][0] === board[i][1] && board[i][0] === board[i][2]) {
      return board[i][0] as TicTacToePlayer
    }
  }

  // Check columns
  for (let i = 0; i < 3; i++) {
    if (board[0][i] && board[0][i] === board[1][i] && board[0][i] === board[2][i]) {
      return board[0][i] as TicTacToePlayer
    }
  }

  // Check diagonals
  if (board[0][0] && board[0][0] === board[1][1] && board[0][0] === board[2][2]) {
    return board[0][0] as TicTacToePlayer
  }
  if (board[0][2] && board[0][2] === board[1][1] && board[0][2] === board[2][0]) {
    return board[0][2] as TicTacToePlayer
  }

  return null
}

// Check if the board is full (draw)
export const isBoardFull = (board: TicTacToeBoard): boolean => {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i][j] === null) {
        return false
      }
    }
  }
  return true
}

// Get the next player
export const getNextPlayer = (currentPlayer: TicTacToePlayer): TicTacToePlayer => {
  return currentPlayer === "X" ? "O" : "X"
}

// Make a move on the board
export const makeMove = (
  board: TicTacToeBoard,
  row: number,
  col: number,
  player: TicTacToePlayer
): TicTacToeBoard => {
  // Create a deep copy of the board
  const newBoard = board.map(row => [...row])
  
  // Make the move
  newBoard[row][col] = player
  
  return newBoard
} 