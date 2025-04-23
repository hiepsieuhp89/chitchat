"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { 
  doc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp 
} from "firebase/firestore"
import type { TicTacToeGame } from "@/types/tictactoe"
import { makeMove, checkWinner, isBoardFull, getNextPlayer } from "@/lib/tictactoe"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Circle, Loader2, X } from "lucide-react"

interface InChatTicTacToeProps {
  gameId: string
  isOwnMessage: boolean
}

export default function InChatTicTacToe({ gameId, isOwnMessage }: InChatTicTacToeProps) {
  const { user } = useAuth()
  const [game, setGame] = useState<TicTacToeGame | null>(null)
  const [loading, setLoading] = useState(true)
  const [gameResult, setGameResult] = useState<string | null>(null)

  // Subscribe to game updates
  useEffect(() => {
    if (!gameId || !user) return

    const unsubscribe = onSnapshot(doc(db, "tictactoe", gameId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        // Parse the board from JSON string to an array
        const parsedBoard = data.board ? JSON.parse(data.board) : null;
        
        const gameData = { 
          id: doc.id, 
          ...data,
          board: parsedBoard // Replace the JSON string with parsed board
        } as TicTacToeGame;
        
        setGame(gameData);

        // Check for game results
        if (gameData.status === "completed" && gameData.winner) {
          const isWinner = (gameData.players.X === user.uid && gameData.winner === "X") ||
                          (gameData.players.O === user.uid && gameData.winner === "O")
          setGameResult(isWinner ? "You won!" : "You lost!")
        } else if (gameData.status === "draw") {
          setGameResult("It's a draw!")
        } else {
          setGameResult(null)
        }
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [gameId, user])

  // Join the game if there's no opponent
  useEffect(() => {
    const joinGame = async () => {
      if (!user || !game || loading) return
      
      // If user is already a player or game is not waiting for players, do nothing
      if (
        game.players.X === user.uid || 
        game.players.O === user.uid || 
        game.status !== "waiting" ||
        (game.players.X && game.players.O)
      ) {
        return
      }

      try {
        // Join as player O if spot is available
        if (!game.players.O) {
          await updateDoc(doc(db, "tictactoe", gameId), {
            "players.O": user.uid,
            status: "active",
            updatedAt: serverTimestamp(),
          })
        }
      } catch (error) {
        console.error("Error joining game:", error)
      }
    }

    joinGame()
  }, [game, gameId, loading, user])

  // Handle making a move
  const handleMove = async (row: number, col: number) => {
    if (!user || !game) return
    
    // Ensure it's the player's turn and the cell is empty
    const playerSymbol = game.players.X === user.uid ? "X" : "O"
    if (
      game.currentTurn !== playerSymbol || 
      game.board[row][col] !== null ||
      game.status !== "active"
    ) {
      return
    }

    try {
      const newBoard = makeMove(game.board, row, col, playerSymbol)
      const winner = checkWinner(newBoard)
      const isDraw = !winner && isBoardFull(newBoard)
      const nextPlayer = getNextPlayer(playerSymbol)
      
      const updates: any = {
        // Convert board back to JSON string for storage
        board: JSON.stringify(newBoard),
        currentTurn: nextPlayer,
        updatedAt: serverTimestamp(),
      }

      // Check for game end conditions
      if (winner) {
        updates.winner = winner
        updates.status = "completed"
      } else if (isDraw) {
        updates.status = "draw"
      }

      await updateDoc(doc(db, "tictactoe", gameId), updates)
    } catch (error) {
      console.error("Error making move:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading game...</p>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="text-center p-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">Game not found</p>
      </div>
    )
  }

  const playerSymbol = game.players.X === user?.uid ? "X" : "O"
  const isPlayerTurn = game.currentTurn === playerSymbol
  const isGameActive = game.status === "active"
  const isWaiting = game.status === "waiting"
  const isPlayerInGame = game.players.X === user?.uid || game.players.O === user?.uid

  return (
    <div className={`rounded-lg p-3 max-w-xs mx-auto ${isOwnMessage ? "" : "bg-white dark:bg-gray-800 border dark:border-gray-700"}`}>
      <div className="mb-2 text-center">
        <h3 className={`text-sm font-semibold mb-1 ${isOwnMessage ? "text-white" : "text-gray-900 dark:text-gray-100"}`}>
          Tic Tac Toe
        </h3>
        
        {gameResult ? (
          <Badge variant={gameResult.includes("won") ? "default" : gameResult.includes("draw") ? "outline" : "destructive"}>
            {gameResult}
          </Badge>
        ) : isWaiting ? (
          <Badge variant="outline">Waiting for opponent</Badge>
        ) : isPlayerInGame ? (
          <div className="flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isPlayerTurn ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}></div>
            <span className={`text-xs ${isOwnMessage ? "text-white" : "text-gray-600 dark:text-gray-300"}`}>
              {isPlayerTurn ? "Your turn" : "Opponent's turn"}
            </span>
          </div>
        ) : (
          <span className={`text-xs ${isOwnMessage ? "text-white" : "text-gray-600 dark:text-gray-300"}`}>
            Game in progress
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-2 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 p-2 rounded-lg shadow-inner justify-center text-center items-center">
        {game.board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              className={`aspect-square w-full max-w-[80px] mx-auto flex items-center justify-center text-2xl md:text-3xl font-bold rounded-lg transition-all duration-200 ${
                cell === null && isPlayerTurn && isGameActive && isPlayerInGame
                  ? "hover:bg-indigo-200 dark:hover:bg-indigo-700 hover:scale-105 bg-white/90 dark:bg-gray-800/90 border-2 border-indigo-300 dark:border-indigo-600 shadow-lg"
                  : cell === null 
                    ? "bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700"
                    : "bg-gray-50/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-700"
              }`}
              disabled={
                cell !== null || !isPlayerTurn || !isGameActive || !isPlayerInGame
              }
              onClick={() => handleMove(rowIndex, colIndex)}
            >
              {cell && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className={`${
                    cell === "X"
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-pink-600 dark:text-pink-400"
                  }`}
                >
                  {cell === "X" ? (
                    <X className="h-8 w-8 md:h-10 md:w-10" />
                  ) : (
                    <Circle className="h-8 w-8 md:h-10 md:w-10" />
                  )}
                </motion.div>
              )}
            </button>
          ))
        )}
      </div>
      
      {!isPlayerInGame && isWaiting && (
        <Button 
          size="sm" 
          className="w-full mt-2 text-xs"
          onClick={async () => {
            if (!user) return
            try {
              await updateDoc(doc(db, "tictactoe", gameId), {
                "players.O": user.uid,
                status: "active",
                updatedAt: serverTimestamp(),
              })
            } catch (error) {
              console.error("Error joining game:", error)
            }
          }}
        >
          Join Game
        </Button>
      )}
    </div>
  )
} 