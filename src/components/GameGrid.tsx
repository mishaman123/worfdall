import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './GameGrid.css';
import { Level } from '../data/levels';

// Define the cell type
interface GridCell {
  id: string;
  letter: string;
  visible: boolean;
  selected: boolean;
  shaking: boolean;
  swapping?: boolean;
  validWord?: boolean;
  invalidSwap?: boolean;
  isEmpty: boolean;
  singleWordFound?: boolean;
}

interface GameGridProps {
  level: Level;
  onLevelComplete: () => void;
}

// Generate a grid from level data and trim empty rows and columns
const generateGridFromLevel = (level: Level): GridCell[][] => {
  // First, create the full grid
  const fullGrid: GridCell[][] = [];
  for (let i = 0; i < level.grid.length; i++) {
    const row: GridCell[] = [];
    for (let j = 0; j < level.grid[i].length; j++) {
      const letter = level.grid[i][j];
      const isEmpty = letter === ' ';
      row.push({
        id: `${i}-${j}`,
        letter: isEmpty ? '' : letter,
        visible: !isEmpty,
        selected: false,
        shaking: false,
        isEmpty: isEmpty
      });
    }
    fullGrid.push(row);
  }
  
  // Find the bounds of non-empty cells
  let minRow = fullGrid.length;
  let maxRow = -1;
  let minCol = fullGrid[0].length;
  let maxCol = -1;
  
  // First pass: find the actual bounds of content
  for (let i = 0; i < fullGrid.length; i++) {
    for (let j = 0; j < fullGrid[i].length; j++) {
      if (fullGrid[i][j].visible && !fullGrid[i][j].isEmpty) {
        minRow = Math.min(minRow, i);
        maxRow = Math.max(maxRow, i);
        minCol = Math.min(minCol, j);
        maxCol = Math.max(maxCol, j);
      }
    }
  }
  
  // If no content found, return empty grid
  if (minRow > maxRow || minCol > maxCol) {
    console.log("No visible content found in grid");
    return [[]];
  }
  
  // Create the trimmed grid with only the content
  const trimmedGrid: GridCell[][] = [];
  for (let i = minRow; i <= maxRow; i++) {
    const row: GridCell[] = [];
    for (let j = minCol; j <= maxCol; j++) {
      // Preserve the original grid coordinates in the id
      const cell = { ...fullGrid[i][j], id: `${i}-${j}` };
      row.push(cell);
    }
    trimmedGrid.push(row);
  }
  
  console.log(`Trimmed grid from ${fullGrid.length}x${fullGrid[0].length} to ${trimmedGrid.length}x${trimmedGrid[0].length}`);
  console.log(`Content bounds: rows ${minRow}-${maxRow}, cols ${minCol}-${maxCol}`);
  
  return trimmedGrid;
};

// Check if two positions are adjacent
const areAdjacent = (pos1: { row: number, col: number }, pos2: { row: number, col: number }): boolean => {
  // Check if they're in the same row and columns differ by 1
  if (pos1.row === pos2.row && Math.abs(pos1.col - pos2.col) === 1) {
    return true;
  }
  // Check if they're in the same column and rows differ by 1
  if (pos1.col === pos2.col && Math.abs(pos1.row - pos2.row) === 1) {
    return true;
  }
  return false;
};

// Get adjacent positions
const getAdjacentPositions = (row: number, col: number, maxRows: number, maxCols: number): { row: number, col: number }[] => {
  const positions: { row: number, col: number }[] = [];
  
  // Check above
  if (row > 0) {
    positions.push({ row: row - 1, col });
  }
  
  // Check below
  if (row < maxRows - 1) {
    positions.push({ row: row + 1, col });
  }
  
  // Check left
  if (col > 0) {
    positions.push({ row, col: col - 1 });
  }
  
  // Check right
  if (col < maxCols - 1) {
    positions.push({ row, col: col + 1 });
  }
  
  return positions;
};

// Extract original grid coordinates from cell id
const getOriginalCoordinates = (id: string): { row: number, col: number } => {
  const [row, col] = id.split('-').map(Number);
  return { row, col };
};

const GameGrid: React.FC<GameGridProps> = ({ level, onLevelComplete }) => {
  const [grid, setGrid] = useState<GridCell[][]>(generateGridFromLevel(level));
  const [selectedCell, setSelectedCell] = useState<{ row: number, col: number } | null>(null);
  const [validWords, setValidWords] = useState<string[]>(() => {
    const words = level.validWords.map(word => word.toUpperCase());
    console.log("Initialized valid words:", words);
    return words;
  });
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [remainingLetters, setRemainingLetters] = useState<number>(0);
  const gridRef = useRef<HTMLDivElement>(null);

  // Initialize the grid and count visible letters when level changes
  useEffect(() => {
    const newGrid = generateGridFromLevel(level);
    setGrid(newGrid);
    setSelectedCell(null);
    setFoundWords([]);
    
    // Count visible letters for level completion check
    let visibleCount = 0;
    for (let i = 0; i < newGrid.length; i++) {
      for (let j = 0; j < newGrid[i].length; j++) {
        if (newGrid[i][j].visible && !newGrid[i][j].isEmpty) {
          visibleCount++;
        }
      }
    }
    setRemainingLetters(visibleCount);
    console.log(`Level loaded with ${visibleCount} visible letters`);
    
    // Update valid words
    setValidWords(level.validWords.map(word => word.toUpperCase()));
  }, [level]);

  // For debugging
  useEffect(() => {
    console.log("Valid words in state:", validWords);
  }, [validWords]);

  // For debugging remaining letters
  useEffect(() => {
    console.log(`Remaining letters: ${remainingLetters}`);
    // Don't trigger level completion here
  }, [remainingLetters]);

  // Check for level completion
  useEffect(() => {
    // Only proceed if remainingLetters is 0
    if (remainingLetters !== 0) return;
    
    // Double-check by counting visible letters in the grid
    let visibleCount = 0;
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        if (grid[i][j].visible && !grid[i][j].isEmpty) {
          visibleCount++;
        }
      }
    }
    
    console.log(`Level completion check: Counted ${visibleCount} visible letters`);
    
    // Only complete the level if there are truly no visible letters
    if (visibleCount === 0 && grid.length > 0) {
      console.log("Level complete check: All letters cleared!");
      setTimeout(() => {
        onLevelComplete();
      }, 1000);
    } else if (visibleCount > 0 && remainingLetters === 0) {
      // Correct the count if there's a mismatch
      console.log(`Correcting remaining letters count to ${visibleCount}`);
      setRemainingLetters(visibleCount);
    }
  }, [remainingLetters, grid, onLevelComplete]);

  // Handle click outside the grid to deselect
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (gridRef.current && !gridRef.current.contains(event.target as Node) && selectedCell) {
        deselectAll();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedCell]);

  // Deselect all cells and reset states
  const deselectAll = () => {
    const newGrid = JSON.parse(JSON.stringify(grid));
    for (let i = 0; i < newGrid.length; i++) {
      for (let j = 0; j < newGrid[i].length; j++) {
        newGrid[i][j].selected = false;
        newGrid[i][j].shaking = false;
        newGrid[i][j].invalidSwap = false;
        newGrid[i][j].validWord = false;
        newGrid[i][j].singleWordFound = false;
      }
    }
    setGrid(newGrid);
    setSelectedCell(null);
  };

  // Make adjacent cells shake
  const shakeAdjacentCells = (row: number, col: number) => {
    const newGrid = JSON.parse(JSON.stringify(grid));
    const adjacentPositions = getAdjacentPositions(row, col, grid.length, grid[0].length);
    
    // Set shaking to true for adjacent cells
    adjacentPositions.forEach(pos => {
      if (newGrid[pos.row][pos.col].visible && !newGrid[pos.row][pos.col].isEmpty) {
        newGrid[pos.row][pos.col].shaking = true;
      }
    });
    
    setGrid(newGrid);
    
    // Reset shaking after animation completes
    setTimeout(() => {
      const resetGrid = JSON.parse(JSON.stringify(grid));
      for (let i = 0; i < resetGrid.length; i++) {
        for (let j = 0; j < resetGrid[i].length; j++) {
          resetGrid[i][j].shaking = false;
        }
      }
      setGrid(resetGrid);
    }, 500);
  };

  // Show invalid swap animation
  const showInvalidSwap = (row1: number, col1: number, row2: number, col2: number) => {
    const newGrid = JSON.parse(JSON.stringify(grid));
    
    // Mark both cells as invalid
    newGrid[row1][col1].invalidSwap = true;
    newGrid[row2][col2].invalidSwap = true;
    
    setGrid(newGrid);
    
    // Reset after animation
    setTimeout(() => {
      deselectAll();
    }, 600);
  };

  // Check if swapping two letters creates valid words
  const checkValidWordsAfterSwap = (row1: number, col1: number, row2: number, col2: number): { 
    isValid: boolean, 
    wordPositions: { row: number, col: number }[],
    wordsFound: string[]
  } => {
    // Create a temporary grid with the swapped letters
    const tempGrid = JSON.parse(JSON.stringify(grid));
    const letter1 = tempGrid[row1][col1].letter;
    const letter2 = tempGrid[row2][col2].letter;
    tempGrid[row1][col1].letter = letter2;
    tempGrid[row2][col2].letter = letter1;
    
    const wordPositions: { row: number, col: number }[] = [];
    const wordsFound: string[] = [];
    let foundValidWords = 0;
    
    // Check horizontal words
    const checkHorizontal = (row: number, col: number) => {
      // Find the start of the potential word
      let startCol = col;
      while (startCol > 0 && tempGrid[row][startCol - 1].visible && !tempGrid[row][startCol - 1].isEmpty) {
        startCol--;
      }
      
      // Find the end of the potential word
      let endCol = col;
      while (endCol < tempGrid[0].length - 1 && tempGrid[row][endCol + 1].visible && !tempGrid[row][endCol + 1].isEmpty) {
        endCol++;
      }
      
      // Extract the word
      if (endCol - startCol >= 2) { // At least 3 letters
        let extractedString = '';
        const positions: { row: number, col: number }[] = [];
        for (let c = startCol; c <= endCol; c++) {
          extractedString += tempGrid[row][c].letter.toUpperCase();
          positions.push({ row, col: c });
        }
        
        // Debug log
        console.log(`Checking horizontal string: "${extractedString}" at row ${row}, cols ${startCol}-${endCol}`);
        
        // Check if any valid word appears in the extracted string
        for (const validWord of validWords) {
          if (extractedString.includes(validWord)) {
            console.log(`Found valid word "${validWord}" in "${extractedString}"`);
            
            // Find the start and end positions of the valid word
            const startIndex = extractedString.indexOf(validWord);
            const endIndex = startIndex + validWord.length - 1;
            
            // Get the positions for just the valid word
            const validWordPositions = positions.slice(startIndex, startIndex + validWord.length);
            
            console.log(`Valid word positions: ${JSON.stringify(validWordPositions)}`);
            
            foundValidWords++;
            wordPositions.push(...validWordPositions);
            wordsFound.push(validWord);
            
            // We found a valid word, no need to check for more in this string
            break;
          }
        }
      }
    };
    
    // Check vertical words
    const checkVertical = (row: number, col: number) => {
      // Find the start of the potential word
      let startRow = row;
      while (startRow > 0 && tempGrid[startRow - 1][col].visible && !tempGrid[startRow - 1][col].isEmpty) {
        startRow--;
      }
      
      // Find the end of the potential word
      let endRow = row;
      while (endRow < tempGrid.length - 1 && tempGrid[endRow + 1][col].visible && !tempGrid[endRow + 1][col].isEmpty) {
        endRow++;
      }
      
      // Extract the word
      if (endRow - startRow >= 2) { // At least 3 letters
        let extractedString = '';
        const positions: { row: number, col: number }[] = [];
        for (let r = startRow; r <= endRow; r++) {
          extractedString += tempGrid[r][col].letter.toUpperCase();
          positions.push({ row: r, col });
        }
        
        // Debug log
        console.log(`Checking vertical string: "${extractedString}" at col ${col}, rows ${startRow}-${endRow}`);
        
        // Check if any valid word appears in the extracted string
        for (const validWord of validWords) {
          if (extractedString.includes(validWord)) {
            console.log(`Found valid word "${validWord}" in "${extractedString}"`);
            
            // Find the start and end positions of the valid word
            const startIndex = extractedString.indexOf(validWord);
            const endIndex = startIndex + validWord.length - 1;
            
            // Get the positions for just the valid word
            const validWordPositions = positions.slice(startIndex, startIndex + validWord.length);
            
            console.log(`Valid word positions: ${JSON.stringify(validWordPositions)}`);
            
            foundValidWords++;
            wordPositions.push(...validWordPositions);
            wordsFound.push(validWord);
            
            // We found a valid word, no need to check for more in this string
            break;
          }
        }
      }
    };
    
    // Check for words at both swapped positions
    checkHorizontal(row1, col1);
    checkVertical(row1, col1);
    checkHorizontal(row2, col2);
    checkVertical(row2, col2);
    
    // Debug log
    console.log("Found valid words:", foundValidWords);
    console.log("Word positions:", wordPositions);
    
    return { 
      isValid: foundValidWords >= 2, // Require at least two valid words
      wordPositions,
      wordsFound
    };
  };

  // Handle letter click
  const handleLetterClick = (rowIndex: number, colIndex: number) => {
    // Ignore clicks on empty cells
    if (grid[rowIndex][colIndex].isEmpty) {
      return;
    }
    
    // Create a deep copy of the grid
    const newGrid = JSON.parse(JSON.stringify(grid));
    
    // If no cell is selected, select this one
    if (!selectedCell) {
      newGrid[rowIndex][colIndex].selected = true;
      setGrid(newGrid);
      setSelectedCell({ row: rowIndex, col: colIndex });
      return;
    }
    
    // If this is the same cell that's already selected, deselect it
    if (selectedCell.row === rowIndex && selectedCell.col === colIndex) {
      deselectAll();
      return;
    }
    
    // Check if the clicked cell is adjacent to the selected cell
    if (areAdjacent(selectedCell, { row: rowIndex, col: colIndex })) {
      // Check if swapping creates valid words
      const { isValid, wordPositions, wordsFound } = checkValidWordsAfterSwap(
        selectedCell.row, 
        selectedCell.col, 
        rowIndex, 
        colIndex
      );
      
      if (isValid) {
        // Add found words to the list
        setFoundWords(prev => [...prev, ...wordsFound]);
        
        // Highlight valid words, then swap and clear
        highlightValidWords(wordPositions, () => {
          swapLetters(selectedCell.row, selectedCell.col, rowIndex, colIndex, wordPositions);
        });
      } else if (wordsFound.length === 1) {
        // Found one word but need two - show feedback
        showSingleWordFeedback(wordPositions);
      } else {
        // Show invalid swap animation
        showInvalidSwap(selectedCell.row, selectedCell.col, rowIndex, colIndex);
      }
    } else {
      // Shake adjacent cells to indicate they must be clicked
      shakeAdjacentCells(selectedCell.row, selectedCell.col);
    }
  };

  // Show feedback when only one word is found
  const showSingleWordFeedback = (wordPositions: { row: number, col: number }[]) => {
    const newGrid = JSON.parse(JSON.stringify(grid));
    
    // Highlight the single word found
    wordPositions.forEach(pos => {
      newGrid[pos.row][pos.col].singleWordFound = true;
    });
    
    setGrid(newGrid);
    
    // Reset after animation
    setTimeout(() => {
      deselectAll();
    }, 1000);
  };

  // Highlight valid words before clearing
  const highlightValidWords = (wordPositions: { row: number, col: number }[], callback: () => void) => {
    const newGrid = JSON.parse(JSON.stringify(grid));
    
    // Mark cells in valid words
    wordPositions.forEach(pos => {
      newGrid[pos.row][pos.col].validWord = true;
    });
    
    setGrid(newGrid);
    
    // After highlighting, proceed with callback
    setTimeout(callback, 600);
  };

  // Swap letters between two cells
  const swapLetters = (
    row1: number, 
    col1: number, 
    row2: number, 
    col2: number, 
    wordPositions: { row: number, col: number }[]
  ) => {
    const newGrid = JSON.parse(JSON.stringify(grid));
    
    // Store the letters
    const letter1 = newGrid[row1][col1].letter;
    const letter2 = newGrid[row2][col2].letter;
    
    // Swap the letters
    newGrid[row1][col1].letter = letter2;
    newGrid[row2][col2].letter = letter1;
    
    // Mark both as swapping (for animation)
    newGrid[row1][col1].swapping = true;
    newGrid[row2][col2].swapping = true;
    
    // Reset selection and valid word highlights
    for (let i = 0; i < newGrid.length; i++) {
      for (let j = 0; j < newGrid[i].length; j++) {
        newGrid[i][j].selected = false;
        newGrid[i][j].validWord = false;
      }
    }
    
    setGrid(newGrid);
    setSelectedCell(null);
    
    // After swap animation completes, make word letters fade out
    setTimeout(() => {
      const updatedGrid = JSON.parse(JSON.stringify(newGrid));
      
      // Reset swapping state
      updatedGrid[row1][col1].swapping = false;
      updatedGrid[row2][col2].swapping = false;
      
      // Make all letters in valid words invisible
      wordPositions.forEach(pos => {
        updatedGrid[pos.row][pos.col].visible = false;
      });
      
      // Update remaining letters count
      const clearedLetters = wordPositions.length;
      console.log(`Clearing ${clearedLetters} letters`);
      setRemainingLetters(prev => {
        const newCount = prev - clearedLetters;
        console.log(`New remaining letter count: ${newCount}`);
        return newCount;
      });
      
      setGrid(updatedGrid);
      
      // After fade-out animation, make letters fall
      setTimeout(() => {
        const fallenGrid = makeFall(updatedGrid);
        setGrid(fallenGrid);
      }, 300);
    }, 800);
  };

  // Make letters fall down to fill empty spaces
  const makeFall = (currentGrid: GridCell[][]) => {
    const newGrid = JSON.parse(JSON.stringify(currentGrid));
    
    // For each column
    for (let col = 0; col < newGrid[0].length; col++) {
      // Start from the second-to-last row and move upward
      for (let row = newGrid.length - 2; row >= 0; row--) {
        // If the current cell is visible and not empty
        if (newGrid[row][col].visible && !newGrid[row][col].isEmpty) {
          // Check if there's an invisible cell below
          let emptyRow = row + 1;
          while (emptyRow < newGrid.length && !newGrid[emptyRow][col].visible && !newGrid[emptyRow][col].isEmpty) {
            emptyRow++;
          }
          emptyRow--; // Move back to the last empty cell
          
          // If there's an empty cell below, move the current letter down
          if (emptyRow > row) {
            // Preserve the original grid coordinates in the id
            const originalCoords = getOriginalCoordinates(newGrid[row][col].id);
            newGrid[emptyRow][col] = { 
              ...newGrid[row][col], 
              id: originalCoords ? `${originalCoords.row}-${originalCoords.col}` : `${emptyRow}-${col}` 
            };
            newGrid[row][col].visible = false;
          }
        }
      }
    }
    
    // Double-check if all letters are cleared
    setTimeout(() => {
      // Count visible letters after falling
      let visibleCount = 0;
      for (let i = 0; i < newGrid.length; i++) {
        for (let j = 0; j < newGrid[i].length; j++) {
          if (newGrid[i][j].visible && !newGrid[i][j].isEmpty) {
            visibleCount++;
          }
        }
      }
      
      console.log(`After falling: counted ${visibleCount} visible letters`);
      
      // If count doesn't match remainingLetters, update it
      if (visibleCount !== remainingLetters) {
        console.log(`Correcting remaining letters count from ${remainingLetters} to ${visibleCount}`);
        setRemainingLetters(visibleCount);
      }
      
      // If no visible letters remain, ensure level completion is triggered
      if (visibleCount === 0 && newGrid.length > 0) {
        console.log("No visible letters remain after falling. Level complete!");
        setRemainingLetters(0);
      }
    }, 500);
    
    return newGrid;
  };

  return (
    <div className="game-grid" ref={gridRef}>
      <AnimatePresence>
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="grid-row">
            {row.map((cell, colIndex) => (
              <div 
                key={`position-${rowIndex}-${colIndex}`} 
                className={`grid-cell-position ${cell.isEmpty ? 'empty-cell' : ''}`}
              >
                <AnimatePresence>
                  {cell.visible && !cell.isEmpty && (
                    <motion.div
                      className={`grid-cell 
                        ${cell.selected ? 'selected' : ''} 
                        ${cell.shaking ? 'shaking' : ''} 
                        ${cell.validWord ? 'valid-word' : ''} 
                        ${cell.singleWordFound ? 'single-word-found' : ''}
                        ${cell.invalidSwap ? 'invalid-swap' : ''}`}
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => handleLetterClick(rowIndex, colIndex)}
                      layout="position"
                      animate={cell.swapping ? { scale: [1, 1.1, 1] } : {}}
                      transition={cell.swapping 
                        ? { 
                            duration: 0.8, 
                            ease: "easeInOut" 
                          } 
                        : { 
                            type: "spring", 
                            stiffness: 300, 
                            damping: 30 
                          }
                      }
                    >
                      {cell.letter}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default GameGrid; 