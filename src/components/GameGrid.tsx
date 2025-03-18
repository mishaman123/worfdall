import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './GameGrid.css';
import { Level } from '../data/levels';
import { SwapHint } from '../utils/hintUtils';

// Define the cell type
interface GridCell {
  id: string;
  letter: string;
  visible: boolean;
  selected: boolean;
  shaking: boolean;
  swapping?: boolean;
  selectedToSwap?: boolean;
  validWord?: boolean;
  invalidSwap?: boolean;
  isEmpty: boolean;
  singleWordFound?: boolean;
  fadingOut?: boolean;
  wasSwapped?: boolean;
  hintHighlight?: boolean;
}

interface GameGridProps {
  level: Level;
  onLevelComplete: () => void;
  currentHint: SwapHint | null;
  onFoundWordsUpdate: (words: string[]) => void;
}

// Generate a grid from level data and trim empty rows and columns
const generateGridFromLevel = (level: Level): { grid: GridCell[][], bounds: { minRow: number, maxRow: number, minCol: number, maxCol: number } } => {
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
    return { grid: [[]], bounds: { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 } };
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
  
  return { grid: trimmedGrid, bounds: { minRow, maxRow, minCol, maxCol } };
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

const GameGrid: React.FC<GameGridProps> = ({ level, onLevelComplete, currentHint, onFoundWordsUpdate }) => {
  const gridData = generateGridFromLevel(level);
  const [grid, setGrid] = useState<GridCell[][]>(gridData.grid);
  const [gridBounds, setGridBounds] = useState(gridData.bounds);
  const [selectedCell, setSelectedCell] = useState<{ row: number, col: number } | null>(null);
  const [validWords, setValidWords] = useState<string[]>(() => {
    const words = level.validWords.map(word => word.toUpperCase());
    console.log("Initialized valid words:", words);
    return words;
  });
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [remainingLetters, setRemainingLetters] = useState<number>(0);
  const [hintPositions, setHintPositions] = useState<{row: number, col: number}[]>([]);
  const [hintTimeout, setHintTimeout] = useState<NodeJS.Timeout | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Update parent component when found words change
  useEffect(() => {
    onFoundWordsUpdate(foundWords);
  }, [foundWords, onFoundWordsUpdate]);

  // Handle hint updates from parent
  useEffect(() => {
    if (currentHint) {
      handleHintReceived(currentHint);
    }
  }, [currentHint]);

  // Initialize the grid and count visible letters when level changes
  useEffect(() => {
    const newGridData = generateGridFromLevel(level);
    setGrid(newGridData.grid);
    setGridBounds(newGridData.bounds);
    setSelectedCell(null);
    setFoundWords([]);
    
    // Count visible letters for level completion check
    let visibleCount = 0;
    for (let i = 0; i < newGridData.grid.length; i++) {
      for (let j = 0; j < newGridData.grid[i].length; j++) {
        if (newGridData.grid[i][j].visible && !newGridData.grid[i][j].isEmpty) {
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
        // Preserve hint highlights
        const wasHinted = newGrid[i][j].hintHighlight;
        
        newGrid[i][j].selected = false;
        newGrid[i][j].shaking = false;
        newGrid[i][j].invalidSwap = false;
        newGrid[i][j].validWord = false;
        newGrid[i][j].singleWordFound = false;
        newGrid[i][j].fadingOut = false;
        newGrid[i][j].wasSwapped = false;
        
        // Restore hint highlight if it was previously set
        if (wasHinted) {
          newGrid[i][j].hintHighlight = true;
        }
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
        
        // Directly swap letters without highlighting first
        swapLetters(selectedCell.row, selectedCell.col, rowIndex, colIndex, wordPositions);
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

  // Swap letters between two cells
  const swapLetters = (
    row1: number, 
    col1: number, 
    row2: number, 
    col2: number, 
    wordPositions: { row: number, col: number }[]
  ) => {
    // Clear any hint highlights since we're doing a swap
    clearHintHighlights();
    
    // Step 1: Fade selected cells from blue to green
    const fadeGrid = JSON.parse(JSON.stringify(grid));
    
    // Mark the selected cells for the fade-to-green animation
    fadeGrid[row1][col1].selectedToSwap = true;
    fadeGrid[row2][col2].selectedToSwap = true;
    
    // Mark these cells as part of the original swap
    fadeGrid[row1][col1].wasSwapped = true;
    fadeGrid[row2][col2].wasSwapped = true;
    
    // Ensure selected state is removed to avoid animation conflicts
    fadeGrid[row1][col1].selected = false;
    fadeGrid[row2][col2].selected = false;
    
    setGrid(fadeGrid);
    setSelectedCell(null);
    
    // Step 2: After fade completes, start the swap animation
    setTimeout(() => {
      const swapGrid = JSON.parse(JSON.stringify(fadeGrid));
      
      // Mark both as swapping (for animation) but DON'T swap letters yet
      swapGrid[row1][col1].swapping = true;
      swapGrid[row2][col2].swapping = true;
      
      setGrid(swapGrid);
      
      // Step 3: Perform letter swap at scale 0
      setTimeout(() => {
        const letterSwapGrid = JSON.parse(JSON.stringify(swapGrid));
        const letter1 = letterSwapGrid[row1][col1].letter;
        const letter2 = letterSwapGrid[row2][col2].letter;
        letterSwapGrid[row1][col1].letter = letter2;
        letterSwapGrid[row2][col2].letter = letter1;
        setGrid(letterSwapGrid);
        
        // Step 4: After grow animation completes, apply cascading highlight effect
        setTimeout(() => {
          const highlightGrid = JSON.parse(JSON.stringify(letterSwapGrid));
          highlightGrid[row1][col1].swapping = false;
          highlightGrid[row2][col2].swapping = false;
          setGrid(highlightGrid);
          
          // Group word positions by orientation (horizontal or vertical)
          const horizontalWords: { row: number, col: number }[][] = [];
          const verticalWords: { row: number, col: number }[][] = [];
          
          // First, identify all unique rows and columns in the word positions
          const rows = new Set<number>();
          const cols = new Set<number>();
          
          wordPositions.forEach(pos => {
            rows.add(pos.row);
            cols.add(pos.col);
          });
          
          // Convert to arrays and sort
          const uniqueRows = Array.from(rows).sort((a, b) => a - b);
          const uniqueCols = Array.from(cols).sort((a, b) => a - b);
          
          console.log("Unique rows:", uniqueRows);
          console.log("Unique columns:", uniqueCols);
          
          // For each row, check if it contains at least 3 consecutive positions
          uniqueRows.forEach(row => {
            // Get all positions in this row
            const positionsInRow = wordPositions.filter(pos => pos.row === row)
              .sort((a, b) => a.col - b.col); // Sort by column
            
            if (positionsInRow.length >= 3) {
              // Check if these positions form a consecutive sequence
              let isConsecutive = true;
              for (let i = 1; i < positionsInRow.length; i++) {
                if (positionsInRow[i].col !== positionsInRow[i-1].col + 1) {
                  isConsecutive = false;
                  break;
                }
              }
              
              if (isConsecutive) {
                horizontalWords.push(positionsInRow);
                console.log("Found horizontal word in row", row, ":", positionsInRow);
              }
            }
          });
          
          // For each column, check if it contains at least 3 consecutive positions
          uniqueCols.forEach(col => {
            // Get all positions in this column
            const positionsInCol = wordPositions.filter(pos => pos.col === col)
              .sort((a, b) => a.row - b.row); // Sort by row
            
            if (positionsInCol.length >= 3) {
              // Check if these positions form a consecutive sequence
              let isConsecutive = true;
              for (let i = 1; i < positionsInCol.length; i++) {
                if (positionsInCol[i].row !== positionsInCol[i-1].row + 1) {
                  isConsecutive = false;
                  break;
                }
              }
              
              if (isConsecutive) {
                verticalWords.push(positionsInCol);
                console.log("Found vertical word in column", col, ":", positionsInCol);
              }
            }
          });
          
          // If we couldn't identify any words, use the original positions
          if (horizontalWords.length === 0 && verticalWords.length === 0) {
            console.log("No clear words identified, using original positions");
            horizontalWords.push(wordPositions);
          }
          
          console.log("Horizontal words:", horizontalWords);
          console.log("Vertical words:", verticalWords);
          
          // Keep track of all highlighted positions
          const highlightedPositions: { row: number, col: number }[] = [];
          
          // Process all words sequentially
          const processWords = () => {
            // Process horizontal words first - row by row, top to bottom
            const processHorizontalWords = (wordIndex: number) => {
              if (wordIndex >= horizontalWords.length) {
                // Move on to vertical words after all horizontal words are done
                processVerticalWords(0);
                return;
              }
              
              const word = horizontalWords[wordIndex];
              console.log("Processing horizontal word:", word);
              
              // Process each letter in this word
              let letterIndex = 0;
              
              const highlightNextLetter = () => {
                if (letterIndex >= word.length) {
                  // Move to the next word after a small pause
                  setTimeout(() => {
                    processHorizontalWords(wordIndex + 1);
                  }, 100);
                  return;
                }
                
                const pos = word[letterIndex];
                
                // Create a new grid with this position highlighted
                const cascadeGrid = JSON.parse(JSON.stringify(highlightGrid));
                
                // Add this position to highlighted positions
                highlightedPositions.push(pos);
                
                // Apply all highlights so far
                highlightedPositions.forEach(highlightPos => {
                  cascadeGrid[highlightPos.row][highlightPos.col].validWord = true;
                });
                
                // Update the grid
                setGrid(cascadeGrid);
                
                // Move to next letter
                letterIndex++;
                setTimeout(highlightNextLetter, 50);
              };
              
              // Start highlighting letters in this word
              highlightNextLetter();
            };
            
            // Process vertical words - column by column, left to right
            const processVerticalWords = (wordIndex: number) => {
              if (wordIndex >= verticalWords.length) {
                // All words are done, continue with fade out and fall
                finishAnimation();
                return;
              }
              
              const word = verticalWords[wordIndex];
              console.log("Processing vertical word:", word);
              
              // Process each letter in this word
              let letterIndex = 0;
              
              const highlightNextLetter = () => {
                if (letterIndex >= word.length) {
                  // Move to the next word after a small pause
                  setTimeout(() => {
                    processVerticalWords(wordIndex + 1);
                  }, 100);
                  return;
                }
                
                const pos = word[letterIndex];
                
                // Create a new grid with this position highlighted
                const cascadeGrid = JSON.parse(JSON.stringify(highlightGrid));
                
                // Add this position to highlighted positions
                highlightedPositions.push(pos);
                
                // Apply all highlights so far
                highlightedPositions.forEach(highlightPos => {
                  cascadeGrid[highlightPos.row][highlightPos.col].validWord = true;
                });
                
                // Update the grid
                setGrid(cascadeGrid);
                
                // Move to next letter
                letterIndex++;
                setTimeout(highlightNextLetter, 50);
              };
              
              // Start highlighting letters in this word
              highlightNextLetter();
            };
            
            // Start the process with the first horizontal word
            processHorizontalWords(0);
          };
          
          // Function to handle fade out and fall after all animations
          const finishAnimation = () => {
            // Extended pause before fade-out to give players more time to see the completed words
            setTimeout(() => {
              const fadingGrid = JSON.parse(JSON.stringify(highlightGrid));
              
              // Add all cells that were part of a valid word to the wordPositions array if they aren't already
              // This ensures swapped cells that are part of a valid word are included
              const allPositions = [...wordPositions];

              // Find all cells that were part of the original swap and mark them for fading
              for (let i = 0; i < fadingGrid.length; i++) {
                for (let j = 0; j < fadingGrid[i].length; j++) {
                  // Reset animation states for all cells
                  fadingGrid[i][j].selectedToSwap = false;
                  fadingGrid[i][j].swapping = false;
                  
                  // If this cell was part of the original swap but isn't in wordPositions,
                  // add it to the list of cells that need to be faded out
                  if (fadingGrid[i][j].wasSwapped && 
                      !wordPositions.some(pos => pos.row === i && pos.col === j)) {
                    allPositions.push({ row: i, col: j });
                  }
                }
              }
              
              // Combine horizontal and vertical words into a sequence for fading
              const allWords: { row: number, col: number }[][] = [...horizontalWords, ...verticalWords];
              
              // If no words were identified, use all positions as a single word
              if (allWords.length === 0 && allPositions.length > 0) {
                allWords.push(allPositions);
              }
              
              console.log("Words to fade sequentially:", allWords.length);
              
              // Process words one at a time
              const fadeWords = (wordIndex: number) => {
                if (wordIndex >= allWords.length) {
                  // All words have faded, apply gravity effect
                  setTimeout(() => {
                    const invisibleGrid = JSON.parse(JSON.stringify(fadingGrid));
                    
                    // Mark all processed positions as invisible
                    allPositions.forEach(pos => {
                      invisibleGrid[pos.row][pos.col].visible = false;
                    });
                    
                    setGrid(invisibleGrid);
                    
                    // Apply gravity effect
                    setTimeout(() => {
                      const newGrid = makeFall(invisibleGrid);
                      setGrid(newGrid);
                      const newRemainingLetters = remainingLetters - wordPositions.length;
                      setRemainingLetters(newRemainingLetters);
                      if (newRemainingLetters === 0) {
                        console.log("All letters cleared! Level complete!");
                        setTimeout(onLevelComplete, 1000);
                      }
                    }, 100);
                  }, 130);
                  return;
                }
                
                const currentWord = allWords[wordIndex];
                console.log(`Fading word ${wordIndex + 1} of ${allWords.length}`);
                
                // Create new grid for this word's fade
                const wordFadingGrid = JSON.parse(JSON.stringify(fadingGrid));
                
                // Track which positions belong to various word groups
                const fadedPositions = new Set(); // Already faded words
                const currentPositions = new Set(); // Current word to fade
                const futurePositions = new Set(); // Words that will fade later
                
                // Categorize all positions
                for (let i = 0; i < allWords.length; i++) {
                  allWords[i].forEach(pos => {
                    const posKey = `${pos.row}-${pos.col}`;
                    if (i < wordIndex) {
                      fadedPositions.add(posKey);
                    } else if (i === wordIndex) {
                      currentPositions.add(posKey);
                    } else {
                      futurePositions.add(posKey);
                    }
                  });
                }
                
                // Apply appropriate flags to each cell based on its category
                for (let i = 0; i < wordFadingGrid.length; i++) {
                  for (let j = 0; j < wordFadingGrid[i].length; j++) {
                    const posKey = `${i}-${j}`;
                    
                    // Already faded words should remain invisible
                    if (fadedPositions.has(posKey)) {
                      wordFadingGrid[i][j].visible = false;
                    }
                    // Current word gets fadingOut=true but stays validWord=true to remain green while fading
                    else if (currentPositions.has(posKey)) {
                      wordFadingGrid[i][j].validWord = true;
                      wordFadingGrid[i][j].fadingOut = true;
                    }
                    // Future words should remain green
                    else if (futurePositions.has(posKey)) {
                      wordFadingGrid[i][j].validWord = true;
                    }
                  }
                }
                
                setGrid(wordFadingGrid);
                
                // After this word's fade animation completes, mark it as invisible and move to next word
                setTimeout(() => {
                  // Mark current word as invisible before moving to next word
                  const invisibleCurrentWord = JSON.parse(JSON.stringify(wordFadingGrid));
                  currentWord.forEach(pos => {
                    invisibleCurrentWord[pos.row][pos.col].visible = false;
                  });
                  setGrid(invisibleCurrentWord);
                  
                  // Small delay before moving to next word
                  setTimeout(() => {
                    fadeWords(wordIndex + 1);
                  }, 100);
                }, 500);
              };
              
              // Start fading the first word
              fadeWords(0);
            }, 1200);
          };
          
          // Start the cascading process
          processWords();
        }, 480);
      }, 400);
    }, 500);
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

  // Clear any hint highlights
  const clearHintHighlights = () => {
    if (hintTimeout) {
      clearTimeout(hintTimeout);
      setHintTimeout(null);
    }
    
    setGrid(prevGrid => {
      return prevGrid.map(row => 
        row.map(cell => ({
          ...cell,
          hintHighlight: false
        }))
      );
    });
    
    setHintPositions([]);
  };
  
  // Handle hint received from the parent
  const handleHintReceived = (hint: SwapHint | null) => {
    if (!hint) {
      console.log('No hint received');
      return;
    }
    
    console.log('Received hint:', hint);
    
    // Clear any existing selections
    deselectAll();
    
    // Clear any existing hint highlights
    clearHintHighlights();
    
    // No need to translate positions - they're already in the current grid coordinates
    const hintPos1 = hint.position1;
    const hintPos2 = hint.position2;
    
    console.log('Hint positions:', hintPos1, hintPos2);
    
    // Choose one position randomly
    const randomPos = Math.random() < 0.5 ? hintPos1 : hintPos2;
    console.log('Randomly selected hint position:', randomPos);
    
    // Verify position coordinates are within grid bounds
    if (randomPos.row >= 0 && randomPos.row < grid.length &&
        randomPos.col >= 0 && randomPos.col < grid[0].length) {
      
      // Debug info - what letter is at this position?
      console.log(`Hint position: (${randomPos.row},${randomPos.col}) - Letter: ${grid[randomPos.row][randomPos.col].letter}`);
      
      // Set new hint position
      setHintPositions([randomPos]);
      console.log('Set hint position:', [randomPos]);
    } else {
      console.error('Hint position out of bounds:',
                   randomPos,
                   'Grid size:', grid.length, 'x', grid[0].length);
    }
  };

  // Update grid when hint positions change
  useEffect(() => {
    if (hintPositions.length > 0) {
      console.log('Applying hint highlights to positions:', hintPositions);
      
      setGrid(prevGrid => {
        const newGrid = prevGrid.map((row, rowIndex) => 
          row.map((cell, colIndex) => {
            const isHinted = hintPositions.some(pos => 
              pos.row === rowIndex && pos.col === colIndex
            );
            
            // Only create a new cell object if we're changing something
            if (isHinted !== cell.hintHighlight) {
              return {
                ...cell,
                hintHighlight: isHinted
              };
            }
            return cell;
          })
        );
        
        console.log('Updated grid with hint highlights');
        return newGrid;
      });
      
      // Clear hint after animation completes (2 seconds)
      const timeout = setTimeout(() => {
        console.log('Clearing hint highlights after animation completes');
        clearHintHighlights();
      }, 2000);
      
      setHintTimeout(timeout);
      
      // Clean up timeout on unmount
      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
      };
    }
  }, [hintPositions]);

  // Send the current grid to parent when updated
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Make current grid available to the App component
      (window as any).currentGameGrid = grid;
    }
  }, [grid]);

  return (
    <div className="game-container">
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
                          ${cell.selectedToSwap ? 'selected-to-swap' : ''}
                          ${cell.shaking ? 'shaking' : ''} 
                          ${cell.validWord ? 'valid-word' : ''} 
                          ${cell.singleWordFound ? 'single-word-found' : ''}
                          ${cell.fadingOut ? 'fading-out' : ''}
                          ${cell.invalidSwap ? 'invalid-swap' : ''}
                          ${cell.hintHighlight ? 'cell-hint' : ''}`}
                        initial={{ opacity: 1 }}
                        exit={{ 
                          opacity: 0,
                          transition: { duration: 0.3 } 
                        }}
                        animate={
                          cell.swapping 
                            ? { scale: [1, 0, 0, 1] } 
                            : {}
                        }
                        onClick={() => handleLetterClick(rowIndex, colIndex)}
                        layout="position"
                        transition={
                          cell.swapping 
                          ? { 
                              duration: 0.8,
                              ease: "easeInOut",
                              times: [0, 0.4, 0.6, 1]  // Spend more time at scale 0 to make the swap more visible
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
    </div>
  );
};

export default GameGrid; 