"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, updateDoc, onSnapshot, getDoc, serverTimestamp } from "firebase/firestore"
import type { TicTacToeGame } from "@/types/tictactoe"
import TicTacToeBoard from "./tictactoe-board"
import { makeMove, checkWinner, isBoardFull, getNextPlayer } from "@/lib/tictactoe"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Loader2, 
  Trophy, 
  Share2, 
  ArrowLeft, 
  RefreshCw, 
  UserPlus, 
  Award,
  Flag,
  Hand
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from 'canvas-confetti'

interface TicTacToeGameProps {
  gameId: string
  onBack: () => void
}

export default function TicTacToeGame({ gameId, onBack }: TicTacToeGameProps) {
  const { user } = useAuth()
  const [game, setGame] = useState<TicTacToeGame | null>(null)
  const [loading, setLoading] = useState(true)
  const [gameResult, setGameResult] = useState<string | null>(null)
  const [showShareLink, setShowShareLink] = useState(false)
  const [copied, setCopied] = useState(false)

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
          
          // Trigger confetti explosion on win
          if (isWinner && !gameResult) {
            triggerConfetti();
          }
          
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
  }, [gameId, user, gameResult])

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
          toast({
            title: "Joined game",
            description: "You've joined the game as O",
          })
        }
      } catch (error) {
        console.error("Error joining game:", error)
        toast({
          title: "Error",
          description: "Failed to join the game. Please try again.",
          variant: "destructive",
        })
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
      toast({
        title: "Error",
        description: "Failed to make a move. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Forfeit the game
  const handleForfeit = async () => {
    if (!user || !game) return

    try {
      const playerSymbol = game.players.X === user.uid ? "X" : "O"
      const winner = playerSymbol === "X" ? "O" : "X"
      
      await updateDoc(doc(db, "tictactoe", gameId), {
        winner: winner,
        status: "completed",
        updatedAt: serverTimestamp(),
      })

      toast({
        title: "Game forfeited",
        description: "You've forfeited the game",
      })
    } catch (error) {
      console.error("Error forfeiting game:", error)
      toast({
        title: "Error",
        description: "Failed to forfeit the game. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Copy game link to clipboard
  const copyGameLink = () => {
    const gameLink = `${window.location.origin}/tictactoe/${gameId}`;
    navigator.clipboard.writeText(gameLink)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
          title: "Link copied!",
          description: "Game link copied to clipboard",
        })
      })
      .catch(() => {
        toast({
          title: "Failed to copy",
          description: "Could not copy link to clipboard",
          variant: "destructive",
        })
      });
  };

  // Trigger confetti animation
  const triggerConfetti = () => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // since particles fall down, start a bit higher than random
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center"
        >
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 dark:text-indigo-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Loading game...</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Connecting to the board</p>
        </motion.div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg"
        >
          <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-4">
            <Flag className="h-12 w-12 text-red-500 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3">Game not found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
            The game you're looking for doesn't exist or has been removed.
          </p>
          <Button 
            onClick={onBack} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Games
          </Button>
        </motion.div>
      </div>
    )
  }

  const playerSymbol = game.players.X === user?.uid ? "X" : "O"
  const isPlayerTurn = game.currentTurn === playerSymbol
  const isGameActive = game.status === "active"
  const isWaiting = game.status === "waiting"

  const getResultIcon = () => {
    if (!gameResult) return null;
    
    if (gameResult === "You won!") {
      return <Trophy className="h-12 w-12 text-yellow-500" />;
    } else if (gameResult === "You lost!") {
      return <Flag className="h-12 w-12 text-red-500" />;
    } else {
      return <Hand className="h-12 w-12 text-gray-500" />;
    }
  };

  const getResultColor = () => {
    if (!gameResult) return "";
    
    if (gameResult === "You won!") {
      return "from-green-500 to-emerald-700";
    } else if (gameResult === "You lost!") {
      return "from-red-500 to-pink-700";
    } else {
      return "from-gray-500 to-slate-700";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="shadow-lg border-2 border-indigo-50 dark:border-gray-700 overflow-hidden">
        <CardHeader className="relative bg-gradient-to-r from-indigo-500 to-purple-600 text-white dark:from-indigo-800 dark:to-purple-900 pb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="absolute left-4 top-4 text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <CardTitle className="text-center text-xl mt-4">
            {isWaiting 
              ? "Waiting for opponent" 
              : gameResult 
                ? gameResult 
                : "Tic Tac Toe"}
          </CardTitle>
          <CardDescription className="text-center text-white/80">
            {isWaiting 
              ? "Share the game with a friend to start playing"
              : `Game ID: ${gameId.substring(0, 8)}...`}
          </CardDescription>
          
          {isWaiting && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="absolute bottom-0 left-0 right-0 transform translate-y-1/2 flex justify-center"
            >
              <Button
                variant="secondary"
                className="shadow-lg flex items-center gap-2"
                onClick={() => setShowShareLink(!showShareLink)}
              >
                <Share2 className="h-4 w-4" />
                Share Game
              </Button>
            </motion.div>
          )}
        </CardHeader>
        
        <AnimatePresence>
          {showShareLink && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-indigo-50 dark:bg-indigo-900/20"
            >
              <div className="p-4 flex flex-col items-center">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  Share this link with a friend to invite them to play:
                </p>
                <div className="flex w-full gap-2">
                  <div className="flex-1 bg-white dark:bg-gray-800 p-2 rounded-md border border-gray-200 dark:border-gray-700 text-sm truncate">
                    {`${window.location.origin}/tictactoe/${gameId}`}
                  </div>
                  <Button 
                    variant={copied ? "default" : "outline"} 
                    size="sm" 
                    onClick={copyGameLink}
                    className={copied ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <CardContent className={`p-6 ${showShareLink ? 'pt-10' : 'pt-6'}`}>
          {/* Game result overlay */}
          {gameResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm bg-white/30 dark:bg-black/30"
            >
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className={`rounded-xl shadow-2xl bg-gradient-to-b ${getResultColor()} p-1`}
              >
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex flex-col items-center">
                  <motion.div 
                    initial={{ rotate: 0, y: 0 }}
                    animate={{ 
                      rotate: gameResult === "You won!" ? [0, -10, 10, -5, 5, 0] : 0,
                      y: gameResult === "You won!" ? [0, -5, 5, -2, 2, 0] : 0
                    }}
                    transition={{ 
                      repeat: gameResult === "You won!" ? Infinity : 0,
                      repeatDelay: 3
                    }}
                    className="mb-4"
                  >
                    {getResultIcon()}
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-100">
                    {gameResult}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
                    {gameResult === "You won!" 
                      ? "Congratulations on your victory!" 
                      : gameResult === "You lost!" 
                        ? "Better luck next time!"
                        : "It's a tie! Great minds think alike."}
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={onBack}
                      className="flex items-center gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Games
                    </Button>
                    <Button 
                      onClick={() => window.location.reload()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Play Again
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
          
          {isWaiting ? (
            <motion.div 
              className="flex flex-col items-center justify-center py-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex relative mb-6">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                  }}
                  className="absolute inset-0 bg-indigo-200 dark:bg-indigo-700/30 rounded-full scale-150 blur-xl"
                />
                <motion.div
                  animate={{
                    rotate: 360,
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 5,
                    ease: "linear",
                  }}
                  className="relative z-10"
                >
                  <Loader2 className="h-16 w-16 text-indigo-600 dark:text-indigo-400" />
                </motion.div>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Waiting for opponent to join
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
                Share the game link with a friend to start playing together
              </p>
              <div className="flex items-center justify-center gap-2 w-full">
                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-ping"></div>
                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" style={{ animationDelay: '0.2s' }}></div>
                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </motion.div>
          ) : (
            <TicTacToeBoard
              board={game.board}
              currentPlayer={game.currentTurn}
              isPlayerTurn={isPlayerTurn}
              isGameActive={isGameActive}
              onMove={handleMove}
              playerSymbol={playerSymbol}
            />
          )}
        </CardContent>
        
        {isGameActive && !gameResult && (
          <CardFooter className="flex justify-between p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
            <Button 
              variant="outline" 
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Exit
            </Button>
            
            <Button 
              variant="destructive" 
              onClick={handleForfeit}
              className="flex items-center gap-2"
            >
              <Flag className="h-4 w-4" />
              Forfeit
            </Button>
          </CardFooter>
        )}
        
        {isWaiting && (
          <CardFooter className="justify-center p-4 pt-8 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
            <Button 
              variant="outline" 
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Games
            </Button>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  )
} 