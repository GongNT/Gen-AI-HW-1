import { useEffect, useRef, useState } from 'react'

const COLS = 10
const ROWS = 16
const BASE_SPEED = 650

const SHAPES = {
  I: { cls: 't-0', matrix: [[1, 1, 1, 1]] },
  O: { cls: 't-1', matrix: [[1, 1], [1, 1]] },
  T: { cls: 't-2', matrix: [[0, 1, 0], [1, 1, 1]] },
  S: { cls: 't-3', matrix: [[0, 1, 1], [1, 1, 0]] },
  Z: { cls: 't-4', matrix: [[1, 1, 0], [0, 1, 1]] },
  J: { cls: 't-5', matrix: [[1, 0, 0], [1, 1, 1]] },
  L: { cls: 't-6', matrix: [[0, 0, 1], [1, 1, 1]] },
}
const TYPES = Object.keys(SHAPES)

function randomType() {
  return TYPES[Math.floor(Math.random() * TYPES.length)]
}

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

function rotateMatrix(matrix) {
  const rows = matrix.length
  const cols = matrix[0].length
  const result = Array.from({ length: cols }, () => Array(rows).fill(0))
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][rows - 1 - r] = matrix[r][c]
    }
  }
  return result
}

function spawnPiece(type) {
  const { matrix } = SHAPES[type]
  return {
    type,
    matrix,
    row: 0,
    col: Math.floor((COLS - matrix[0].length) / 2),
  }
}

function canPlace(board, matrix, row, col) {
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (!matrix[r][c]) continue
      const br = row + r
      const bc = col + c
      if (bc < 0 || bc >= COLS || br >= ROWS) return false
      if (br >= 0 && board[br][bc]) return false
    }
  }
  return true
}

function lockPiece(board, piece) {
  const next = board.map((row) => row.slice())
  const cls = SHAPES[piece.type].cls
  piece.matrix.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell) {
        const br = piece.row + r
        const bc = piece.col + c
        if (br >= 0) next[br][bc] = cls
      }
    })
  })
  return next
}

function clearLines(board) {
  const remaining = board.filter((row) => row.some((cell) => !cell))
  const cleared = ROWS - remaining.length
  const fresh = Array.from({ length: cleared }, () => Array(COLS).fill(null))
  return { board: [...fresh, ...remaining], cleared }
}

export default function TetrisGame() {
  const [board, setBoard] = useState(emptyBoard)
  const [piece, setPiece] = useState(() => spawnPiece(randomType()))
  const [nextType, setNextType] = useState(randomType)
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [running, setRunning] = useState(false)
  const containerRef = useRef(null)

  function restart() {
    setBoard(emptyBoard())
    setPiece(spawnPiece(randomType()))
    setNextType(randomType())
    setScore(0)
    setLines(0)
    setGameOver(false)
    setRunning(true)
  }

  function step() {
    if (gameOver || !running) return
    if (canPlace(board, piece.matrix, piece.row + 1, piece.col)) {
      setPiece({ ...piece, row: piece.row + 1 })
      return
    }
    // Lock and spawn next.
    const locked = lockPiece(board, piece)
    const { board: clearedBoard, cleared } = clearLines(locked)
    if (cleared > 0) {
      setScore((s) => s + cleared * cleared * 100)
      setLines((l) => l + cleared)
    }
    const next = spawnPiece(nextType)
    if (!canPlace(clearedBoard, next.matrix, next.row, next.col)) {
      setBoard(clearedBoard)
      setGameOver(true)
      setRunning(false)
      return
    }
    setBoard(clearedBoard)
    setPiece(next)
    setNextType(randomType())
  }

  useEffect(() => {
    if (gameOver || !running) return undefined
    const speed = Math.max(150, BASE_SPEED - lines * 20)
    const id = setTimeout(step, speed)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, piece, gameOver, running, lines])

  function tryMove(dr, dc) {
    if (gameOver || !running) return
    const newRow = piece.row + dr
    const newCol = piece.col + dc
    if (canPlace(board, piece.matrix, newRow, newCol)) {
      setPiece({ ...piece, row: newRow, col: newCol })
    }
  }

  function tryRotate() {
    if (gameOver || !running) return
    const rotated = rotateMatrix(piece.matrix)
    if (canPlace(board, rotated, piece.row, piece.col)) {
      setPiece({ ...piece, matrix: rotated })
    } else if (canPlace(board, rotated, piece.row, piece.col - 1)) {
      setPiece({ ...piece, matrix: rotated, col: piece.col - 1 })
    } else if (canPlace(board, rotated, piece.row, piece.col + 1)) {
      setPiece({ ...piece, matrix: rotated, col: piece.col + 1 })
    }
  }

  function hardDrop() {
    if (gameOver || !running) return
    let dropRow = piece.row
    while (canPlace(board, piece.matrix, dropRow + 1, piece.col)) dropRow += 1
    setPiece({ ...piece, row: dropRow })
  }

  function handleKeyDown(e) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(e.key)) {
      e.preventDefault()
    }
    if (!running && !gameOver && e.key !== 'Enter') return
    switch (e.key) {
      case 'ArrowLeft':
        tryMove(0, -1)
        break
      case 'ArrowRight':
        tryMove(0, 1)
        break
      case 'ArrowDown':
        tryMove(1, 0)
        break
      case 'ArrowUp':
        tryRotate()
        break
      case ' ':
        hardDrop()
        break
      default:
        break
    }
  }

  const displayBoard = board.map((row) => row.slice())
  if (!gameOver) {
    piece.matrix.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) {
          const br = piece.row + r
          const bc = piece.col + c
          if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) {
            displayBoard[br][bc] = SHAPES[piece.type].cls
          }
        }
      })
    })
  }

  return (
    <div className="tetris-panel">
      <div className="tetris-header">
        <h3>Bored? Play Tetris</h3>
        <div className="tetris-stats">
          <span>Score: {score}</span>
          <span>Lines: {lines}</span>
        </div>
      </div>

      <div className="tetris-body">
        <div
          className="tetris-board"
          tabIndex={0}
          ref={containerRef}
          onKeyDown={handleKeyDown}
        >
          {displayBoard.map((row, r) => (
            <div className="tetris-row" key={r}>
              {row.map((cell, c) => (
                <div key={c} className={`tetris-cell ${cell || ''}`} />
              ))}
            </div>
          ))}

          {!running && !gameOver && (
            <div className="tetris-overlay">
              <button onClick={restart}>Start Game</button>
              <p>Click the board, then use arrow keys. Space = hard drop.</p>
            </div>
          )}

          {gameOver && (
            <div className="tetris-overlay">
              <p>Game Over — Score {score}</p>
              <button onClick={restart}>Play Again</button>
            </div>
          )}
        </div>

        <div className="tetris-side">
          <p className="tetris-label">Next</p>
          <div className="tetris-next">
            {SHAPES[nextType].matrix.map((row, r) => (
              <div className="tetris-row" key={r}>
                {row.map((cell, c) => (
                  <div
                    key={c}
                    className={`tetris-cell mini ${cell ? SHAPES[nextType].cls : ''}`}
                  />
                ))}
              </div>
            ))}
          </div>
          <p className="tetris-controls">
            ← → move
            <br />
            ↑ rotate
            <br />
            ↓ soft drop
            <br />
            space hard drop
          </p>
        </div>
      </div>
    </div>
  )
}
