"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { TicTacToeBoard as BoardType, TicTacToePlayer } from "@/types/tictactoe"
import { motion } from "framer-motion"
import { X, Circle } from "lucide-react"

interface TicTacToeBoardProps {
  board: BoardType
  currentPlayer: TicTacToePlayer
  isPlayerTurn: boolean
  isGameActive: boolean
  onMove: (row: number, col: number) => void
  playerSymbol: TicTacToePlayer
}

export default function TicTacToeBoard({
  board,
  currentPlayer,
  isPlayerTurn,
  isGameActive,
  onMove,
  playerSymbol,
}: TicTacToeBoardProps) {
  // Game board animations
  const boardVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const cellVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 }
  };
  
  // Icon for current player's turn
  const CurrentPlayerIcon = currentPlayer === "X" ? 
    <X className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> : 
    <Circle className="h-5 w-5 text-pink-600 dark:text-pink-400" />;
  
  // Render X or O with nice animations
  const renderCell = (cell: "X" | "O" | null) => {
    if (!cell) return null;
    
    return cell === "X" ? (
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="text-indigo-600 dark:text-indigo-400"
      >
        <X strokeWidth={3} className="h-10 w-10" />
      </motion.div>
    ) : (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="text-pink-600 dark:text-pink-400"
      >
        <Circle strokeWidth={3} className="h-9 w-9" />
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col items-center">
      <motion.div 
        className="mb-6 p-3 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 shadow-sm"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {isGameActive ? (
          <div className="flex items-center gap-3">
            <motion.div
              animate={{
                scale: isPlayerTurn ? [1, 1.2, 1] : 1,
                opacity: isPlayerTurn ? 1 : 0.7,
              }}
              transition={{
                repeat: isPlayerTurn ? Infinity : 0,
                repeatDelay: 1,
                duration: 1,
              }}
              className={`flex items-center justify-center p-2 rounded-full ${
                isPlayerTurn
                  ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
              }`}
            >
              {CurrentPlayerIcon}
            </motion.div>
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                {isPlayerTurn
                  ? "Your turn"
                  : "Opponent's turn"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isPlayerTurn
                  ? "Make your move"
                  : "Waiting for opponent..."}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-center font-medium text-gray-800 dark:text-gray-200">Game ended</p>
        )}
      </motion.div>
      
      <motion.div 
        className="relative grid grid-cols-3 gap-3 bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-gray-800/80 dark:to-gray-900/80 p-4 rounded-xl shadow-md mb-6"
        variants={boardVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Background grid lines */}
        <div className="absolute inset-0 flex justify-between px-4">
          <div className="w-0.5 h-full bg-indigo-200/60 dark:bg-indigo-700/30 rounded-full mx-auto"></div>
          <div className="w-0.5 h-full bg-indigo-200/60 dark:bg-indigo-700/30 rounded-full mx-auto"></div>
        </div>
        <div className="absolute inset-0 flex flex-col justify-between py-4">
          <div className="h-0.5 w-full bg-indigo-200/60 dark:bg-indigo-700/30 rounded-full my-auto"></div>
          <div className="h-0.5 w-full bg-indigo-200/60 dark:bg-indigo-700/30 rounded-full my-auto"></div>
        </div>
        
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <motion.div
              key={`${rowIndex}-${colIndex}`}
              variants={cellVariants}
              whileHover={cell === null && isPlayerTurn && isGameActive ? { scale: 1.05 } : {}}
              className="relative z-10"
            >
              <Button
                className={`relative h-20 w-20 flex items-center justify-center rounded-lg border-2 ${
                  cell === null && isPlayerTurn && isGameActive
                    ? "bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border-indigo-100 dark:border-indigo-900/50 shadow-sm hover:shadow"
                    : cell === null
                    ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    : "bg-white dark:bg-gray-800 border-transparent"
                }`}
                variant="ghost"
                disabled={
                  cell !== null || !isPlayerTurn || !isGameActive
                }
                onClick={() => onMove(rowIndex, colIndex)}
              >
                {renderCell(cell)}
                
                {/* Preview on hover */}
                {cell === null && isPlayerTurn && isGameActive && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-20 transition-opacity">
                    {playerSymbol === "X" ? 
                      <X strokeWidth={3} className="h-10 w-10 text-indigo-600 dark:text-indigo-400" /> : 
                      <Circle strokeWidth={3} className="h-9 w-9 text-pink-600 dark:text-pink-400" />
                    }
                  </div>
                )}
              </Button>
            </motion.div>
          ))
        )}
      </motion.div>
      
      <motion.div 
        className="mt-2 flex items-center justify-center gap-10 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">You</span>
          <div className={`flex items-center justify-center h-10 w-10 rounded-full ${
            playerSymbol === "X"
              ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
              : "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400"
          }`}>
            {playerSymbol === "X" ? 
              <X strokeWidth={3} className="h-6 w-6" /> : 
              <Circle strokeWidth={3} className="h-6 w-6" />
            }
          </div>
        </div>
        <div className="h-10 w-px bg-gray-200 dark:bg-gray-700"></div>
        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">Opponent</span>
          <div className={`flex items-center justify-center h-10 w-10 rounded-full ${
            playerSymbol === "X"
              ? "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400"
              : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
          }`}>
            {playerSymbol === "X" ? 
              <Circle strokeWidth={3} className="h-6 w-6" /> : 
              <X strokeWidth={3} className="h-6 w-6" />
            }
          </div>
        </div>
      </motion.div>
    </div>
  )
} 