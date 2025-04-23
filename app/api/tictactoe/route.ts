import { NextResponse } from 'next/server'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const gameId = searchParams.get('id')
  
  if (!gameId) {
    return NextResponse.json({ error: 'Game ID is required' }, { status: 400 })
  }
  
  try {
    // Fetch the game from Firestore
    const gameDoc = await getDoc(doc(db, 'tictactoe', gameId))
    
    if (!gameDoc.exists()) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    
    return NextResponse.json(gameDoc.data())
  } catch (error) {
    console.error('Error fetching game:', error)
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    // Here you can implement logic to validate and create games
    // (Usually client-side FirebaseAuth is better for this use case,
    // but this endpoint can be used for validation or custom logic)
    
    return NextResponse.json({ message: 'Game operation successful' })
  } catch (error) {
    console.error('Error in game operation:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
} 