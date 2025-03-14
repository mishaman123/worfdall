import React, { useState, useEffect } from 'react';
import { Level } from '../data/levels';
import './LevelCreator.css';

interface LevelCreatorProps {
  onClose: () => void;
}

const LevelCreator: React.FC<LevelCreatorProps> = ({ onClose }) => {
  const [wordInput, setWordInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [generatedLevel, setGeneratedLevel] = useState<Level | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  // Debug visualization state
  const [debugSteps, setDebugSteps] = useState<Array<{
    description: string;
    grid: string[][];
    highlightPositions?: Array<{row: number, col: number, color: string}>;
  }>>([]);
  const [currentDebugStep, setCurrentDebugStep] = useState<number>(0);
  const [showDebugControls, setShowDebugControls] = useState<boolean>(false);

  // Add event listener for Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Add keyboard navigation for debug steps
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!showDebugControls || debugSteps.length === 0) return;
      
      if (event.key === 'ArrowLeft') {
        // Move to previous step
        setCurrentDebugStep(prev => Math.max(0, prev - 1));
      } else if (event.key === 'ArrowRight') {
        // Move to next step
        setCurrentDebugStep(prev => Math.min(debugSteps.length - 1, prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDebugControls, debugSteps.length]);

  // Handle word input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setWordInput(e.target.value);
    setError(null);
  };

  // Parse words from input
  const parseWords = (input: string): string[] => {
    return input
      .split('\n')
      .map(word => word.trim().toUpperCase())
      .filter(word => word.length > 0);
  };

  // Validate words
  const validateWords = (words: string[]): boolean => {
    if (words.length === 0) {
      setError('Please enter at least two words.');
      return false;
    }

    if (words.length % 2 !== 0) {
      setError('Please enter an even number of words.');
      return false;
    }

    return true;
  };

  // Create an empty grid
  const createEmptyGrid = (size: number): string[][] => {
    return Array(size).fill(null).map(() => Array(size).fill(' '));
  };

  // Check if a position has support below it (either another letter or the bottom of the grid)
  const isPositionSupportedByGravity = (
    grid: string[][],
    row: number,
    col: number
  ): boolean => {
    const gridSize = grid.length;
    
    // If the position is at the bottom of the grid, it's supported
    if (row === gridSize - 1) {
      return true;
    }
    
    // If there's a letter directly below this position, it's supported
    if (grid[row + 1][col] !== ' ') {
      return true;
    }
    
    // Otherwise, the position is not supported
    return false;
  };

  // Check if a word can be placed at the specified position
  const isValidPosition = (
    grid: string[][],
    word: string,
    row: number,
    col: number,
    isHorizontal: boolean,
    isFirstPair: boolean
  ): boolean => {
    const gridSize = grid.length;
    
    // Check if the word fits within the grid
    if (isHorizontal) {
      if (col + word.length > gridSize) {
        return false;
      }
    } else {
      if (row + word.length > gridSize) {
        return false;
      }
    }
    
    // For the first pair, we just need to check if the position is valid
    if (isFirstPair) {
      return true;
    }
    
    // For subsequent pairs, we need to check if the word overlaps with existing letters
    let hasOverlap = false;
    
    for (let i = 0; i < word.length; i++) {
      const checkRow = isHorizontal ? row : row + i;
      const checkCol = isHorizontal ? col + i : col;
      
      // If this position already has a letter, check if it's the same as the word's letter
      if (grid[checkRow][checkCol] !== ' ') {
        hasOverlap = true;
      }
      
      // Check if this position is supported by gravity
      // For horizontal words, we'll check if at least one position has support
      // For vertical words, only the bottom letter needs to be supported
      if (isHorizontal) {
        // For horizontal words, we'll track if any position has support
        // This check will be done after the loop
      } else if (i === word.length - 1) {
        // For vertical words, only check the bottom letter
        if (!isPositionSupportedByGravity(grid, checkRow, checkCol) && grid[checkRow][checkCol] === ' ') {
          return false; // Bottom position not supported and doesn't have a letter already
        }
      }
    }
    
    // For horizontal words, check if at least one position has support
    if (isHorizontal) {
      let supportCount = 0;
      for (let i = 0; i < word.length; i++) {
        const checkRow = row;
        const checkCol = col + i;
        
        // If this position has support or already has a letter, it's valid
        if (isPositionSupportedByGravity(grid, checkRow, checkCol) || grid[checkRow][checkCol] !== ' ') {
          supportCount++;
        }
      }
      
      // Require ALL positions to have support for horizontal words
      if (supportCount < word.length) {
        return false; // Not all positions have support
      }
    }
    
    return hasOverlap;
  };

  // Place a word in the grid
  const placeWord = (
    grid: string[][], 
    row: number, 
    col: number, 
    word: string, 
    isHorizontal: boolean
  ): string[][] => {
    const newGrid = JSON.parse(JSON.stringify(grid));
    
    for (let i = 0; i < word.length; i++) {
      const placeRow = isHorizontal ? row : row + i;
      const placeCol = isHorizontal ? col + i : col;
      newGrid[placeRow][placeCol] = word[i];
    }
    
    return newGrid;
  };

  // Shift letters upward to avoid overlaps with new word positions
  const shiftLettersToAvoidOverlaps = (
    grid: string[][],
    col: number,
    newWordPositions: Array<{row: number, col: number}>
  ): string[][] => {
    console.log(`[shiftLettersToAvoidOverlaps] Processing column ${col}`);
    
    const newGrid = JSON.parse(JSON.stringify(grid));
    const gridSize = grid.length;
    
    // Find the new word positions in this column
    const newWordPositionsInColumn = newWordPositions.filter(p => p.col === col);
    
    if (newWordPositionsInColumn.length === 0) {
      console.log(`[shiftLettersToAvoidOverlaps] No new word positions in column ${col}, no need to shift`);
      return newGrid;
    }
    
    // Collect all existing letters in this column
    const existingLetters: Array<{row: number, letter: string}> = [];
    for (let row = 0; row < gridSize; row++) {
      if (newGrid[row][col] !== ' ') {
        existingLetters.push({row, letter: newGrid[row][col]});
        newGrid[row][col] = ' '; // Clear this position
      }
    }
    
    if (existingLetters.length === 0) {
      console.log(`[shiftLettersToAvoidOverlaps] No existing letters in column ${col}, no need to shift`);
      return newGrid;
    }
    
    console.log(`[shiftLettersToAvoidOverlaps] Found ${existingLetters.length} existing letters in column ${col}`);
    
    // Sort letters by row (top to bottom) to maintain their relative order
    existingLetters.sort((a, b) => a.row - b.row);
    
    // Find overlapping positions
    const overlappingPositions = newWordPositionsInColumn.filter(pos => 
      existingLetters.some(letter => letter.row === pos.row)
    );
    
    console.log(`[shiftLettersToAvoidOverlaps] Found ${overlappingPositions.length} overlapping positions in column ${col}`);
    
    // Find the lowest row that has an overlap
    const lowestOverlapRow = overlappingPositions.length > 0 
      ? Math.max(...overlappingPositions.map(pos => pos.row))
      : -1;
    
    console.log(`[shiftLettersToAvoidOverlaps] Lowest overlap row: ${lowestOverlapRow}`);
    
    // Separate letters into those that need to be shifted and those that don't
    const lettersToShift = existingLetters.filter(letter => letter.row <= lowestOverlapRow);
    const lettersToKeep = existingLetters.filter(letter => letter.row > lowestOverlapRow);
    
    console.log(`[shiftLettersToAvoidOverlaps] Letters to shift: ${lettersToShift.length}, Letters to keep: ${lettersToKeep.length}`);
    
    // Place letters that don't need to be shifted
    for (const {row, letter} of lettersToKeep) {
      newGrid[row][col] = letter;
      console.log(`[shiftLettersToAvoidOverlaps] Kept letter '${letter}' at original row ${row} (below overlap)`);
    }
    
    // For letters that need to be shifted, we'll use a simpler approach
    // that preserves the original order of all letters
    if (lettersToShift.length > 0) {
      // Calculate the total number of shifts needed
      // This is the number of new word positions at or above the lowest letter to shift
      const totalShifts = newWordPositionsInColumn.filter(pos => 
        pos.row <= lettersToShift[lettersToShift.length - 1].row
      ).length;
      
      console.log(`[shiftLettersToAvoidOverlaps] Total shifts needed: ${totalShifts}`);
      
      // Place all letters to shift, maintaining their relative order
      // but shifting them all up by the same amount
      let currentRow = lettersToShift[0].row - totalShifts;
      
      for (const {row, letter} of lettersToShift) {
        // If we've shifted beyond the top of the grid, we can't place this letter
        if (currentRow < 0) {
          console.log(`[shiftLettersToAvoidOverlaps] WARNING - Letter '${letter}' from row ${row} would be shifted beyond the top of the grid`);
          currentRow++;
          continue;
        }
        
        // Place the letter
        newGrid[currentRow][col] = letter;
        console.log(`[shiftLettersToAvoidOverlaps] Moved letter '${letter}' from row ${row} to row ${currentRow} (shifted by ${row - currentRow} rows)`);
        
        // Move to the next row
        currentRow++;
      }
    }
    
    return newGrid;
  };

  // Shift letters upward to resolve overlaps
  const shiftLettersUpward = (grid: string[][], affectedColumns: number[]): string[][] => {
    console.log(`[shiftLettersUpward] Shifting letters in columns: ${affectedColumns.join(', ')}`);
    
    const newGrid = JSON.parse(JSON.stringify(grid));
    const gridSize = grid.length;
    
    for (const col of affectedColumns) {
      // Collect all existing letters in this column
      const existingLetters: Array<{row: number, letter: string}> = [];
      for (let row = 0; row < gridSize; row++) {
        if (newGrid[row][col] !== ' ') {
          existingLetters.push({row, letter: newGrid[row][col]});
          newGrid[row][col] = ' '; // Clear this position
        }
      }
      
      if (existingLetters.length === 0) {
        console.log(`[shiftLettersUpward] Column ${col}: No existing letters, no need to shift`);
        continue;
      }
      
      console.log(`[shiftLettersUpward] Column ${col}: Found ${existingLetters.length} existing letters to potentially shift`);
      
      // Sort letters by row (top to bottom) to maintain their relative order
      existingLetters.sort((a, b) => a.row - b.row);
      
      // Find overlapping positions (where there are letters in adjacent rows)
      const overlappingPositions: number[] = [];
      for (let i = 0; i < existingLetters.length - 1; i++) {
        if (existingLetters[i + 1].row - existingLetters[i].row === 1) {
          overlappingPositions.push(existingLetters[i].row);
        }
      }
      
      if (overlappingPositions.length === 0) {
        console.log(`[shiftLettersUpward] Column ${col}: No overlapping positions, placing letters back unchanged`);
        // Place letters back unchanged
        for (const {row, letter} of existingLetters) {
          newGrid[row][col] = letter;
        }
        continue;
      }
      
      console.log(`[shiftLettersUpward] Column ${col}: Found ${overlappingPositions.length} overlapping positions`);
      
      // Place letters back, shifting up one row at a time if needed
      for (let i = 0; i < existingLetters.length; i++) {
        const {row, letter} = existingLetters[i];
        let newRow = row;
        
        // If this row is in the overlapping positions, or is above an overlapping position,
        // shift it up by one row
        if (overlappingPositions.includes(row) || 
            overlappingPositions.some(overlapRow => row < overlapRow)) {
          newRow = Math.max(0, row - 1);
        }
        
        newGrid[newRow][col] = letter;
        console.log(`[shiftLettersUpward] Column ${col}: Moved letter '${letter}' from row ${row} to row ${newRow}`);
      }
    }
    
    return newGrid;
  };

  // Find adjacent positions
  const findAdjacentPositions = (
    grid: string[][], 
    word1Positions: { row: number; col: number }[], 
    word2Positions: { row: number; col: number }[]
  ): { pos1: { row: number; col: number }; pos2: { row: number; col: number } }[] => {
    console.log(`[findAdjacentPositions] Checking for adjacent positions between ${word1Positions.length} and ${word2Positions.length} positions`);
    
    const adjacentPairs: { pos1: { row: number; col: number }; pos2: { row: number; col: number } }[] = [];
    
    for (const pos1 of word1Positions) {
      for (const pos2 of word2Positions) {
        // Check if positions are adjacent (horizontally or vertically)
        const isAdjacent = 
          (Math.abs(pos1.row - pos2.row) === 1 && pos1.col === pos2.col) || 
          (Math.abs(pos1.col - pos2.col) === 1 && pos1.row === pos2.row);
        
        if (isAdjacent) {
          console.log(`[findAdjacentPositions] Found adjacent positions: (${pos1.row}, ${pos1.col}) and (${pos2.row}, ${pos2.col})`);
          adjacentPairs.push({ pos1, pos2 });
        }
      }
    }
    
    console.log(`[findAdjacentPositions] Total adjacent pairs found: ${adjacentPairs.length}`);
    return adjacentPairs;
  };

  // Swap two adjacent letters
  const swapLetters = (
    grid: string[][], 
    pos1: { row: number; col: number }, 
    pos2: { row: number; col: number }
  ): string[][] => {
    const newGrid = JSON.parse(JSON.stringify(grid));
    
    // Check if the letters are the same
    if (newGrid[pos1.row][pos1.col] === newGrid[pos2.row][pos2.col]) {
      console.log(`[swapLetters] WARNING: Attempted to swap identical letters '${newGrid[pos1.row][pos1.col]}' at positions (${pos1.row}, ${pos1.col}) and (${pos2.row}, ${pos2.col})`);
      return newGrid; // Return unchanged grid if letters are identical
    }
    
    const temp = newGrid[pos1.row][pos1.col];
    newGrid[pos1.row][pos1.col] = newGrid[pos2.row][pos2.col];
    newGrid[pos2.row][pos2.col] = temp;
    
    return newGrid;
  };

  // Apply gravity to pull all letters down as far as possible
  const applyGravity = (grid: string[][]): string[][] => {
    console.log(`[applyGravity] Applying gravity to pull letters down`);
    
    const gridSize = grid.length;
    const newGrid = createEmptyGrid(gridSize);
    
    // Process each column independently
    for (let col = 0; col < gridSize; col++) {
      const letters: string[] = [];
      
      // Collect all letters in this column (from top to bottom)
      for (let row = 0; row < gridSize; row++) {
        if (grid[row][col] !== ' ') {
          letters.push(grid[row][col]);
        }
      }
      
      // Skip if no letters in this column
      if (letters.length === 0) continue;
      
      console.log(`[applyGravity] Column ${col}: Found ${letters.length} letters to pull down`);
      
      // Place letters at the bottom of the grid
      for (let i = 0; i < letters.length; i++) {
        const targetRow = gridSize - letters.length + i;
        newGrid[targetRow][col] = letters[i];
      }
    }
    
    return newGrid;
  };

  // Place a pair of words in the grid
  const placePair = (
    grid: string[][],
    word1: string,
    word2: string,
    isHorizontal: boolean,
    isFirstPair: boolean
  ): { 
    success: boolean; 
    newGrid: string[][]; 
    debugInfo?: {
      word1Positions: Array<{row: number, col: number}>;
      word2Positions: Array<{row: number, col: number}>;
      preGravityGrid: string[][];
      preShiftGrid?: string[][];
      swappedPositions?: {pos1: {row: number, col: number}, pos2: {row: number, col: number}};
    } 
  } => {
    console.log(`[placePair] Placing pair: ${word1}, ${word2}, horizontal: ${isHorizontal}, firstPair: ${isFirstPair}`);
    
    const gridSize = grid.length;
    
    // For the first pair, use the special placement logic
    if (isFirstPair) {
      let newGrid = JSON.parse(JSON.stringify(grid));
      console.log(`[placePair] Using first pair placement logic`);
      
      if (isHorizontal) {
        // For horizontal orientation, place the longer word below the shorter word
        const [shorterWord, longerWord] = word1.length <= word2.length ? [word1, word2] : [word2, word1];
        
        // Calculate starting column for shorter word to ensure it's above the longer word
        const startColLonger = Math.floor(Math.random() * (gridSize - longerWord.length));
        const maxStartColShorter = startColLonger + longerWord.length - shorterWord.length;
        const minStartColShorter = startColLonger;
        const startColShorter = Math.floor(Math.random() * (maxStartColShorter - minStartColShorter + 1)) + minStartColShorter;
        
        // Place at the bottom of the grid
        const rowLonger = gridSize - 1;
        const rowShorter = rowLonger - 1;
        
        console.log(`[placePair] Placing first pair horizontally: ${shorterWord} at (${rowShorter}, ${startColShorter}), ${longerWord} at (${rowLonger}, ${startColLonger})`);
        
        // Place words in grid
        for (let i = 0; i < shorterWord.length; i++) {
          newGrid[rowShorter][startColShorter + i] = shorterWord[i];
        }
        
        for (let i = 0; i < longerWord.length; i++) {
          newGrid[rowLonger][startColLonger + i] = longerWord[i];
        }
        
        // Find adjacent positions between the two words
        const word1Positions: { row: number; col: number }[] = [];
        const word2Positions: { row: number; col: number }[] = [];
        
        // Determine which word is word1 and which is word2 based on the shorter/longer assignment
        if (word1.length <= word2.length) {
          // word1 is the shorter word
          for (let i = 0; i < shorterWord.length; i++) {
            word1Positions.push({ row: rowShorter, col: startColShorter + i });
          }
          for (let i = 0; i < longerWord.length; i++) {
            word2Positions.push({ row: rowLonger, col: startColLonger + i });
          }
        } else {
          // word2 is the shorter word
          for (let i = 0; i < shorterWord.length; i++) {
            word2Positions.push({ row: rowShorter, col: startColShorter + i });
          }
          for (let i = 0; i < longerWord.length; i++) {
            word1Positions.push({ row: rowLonger, col: startColLonger + i });
          }
        }
        
        // Find adjacent positions
        const adjacentPairs = findAdjacentPositions(newGrid, word1Positions, word2Positions);
        
        console.log(`[placePair] Found ${adjacentPairs.length} adjacent positions for first pair`);
        
        if (adjacentPairs.length > 0) {
          // Filter out pairs with identical letters
          const validPairs = adjacentPairs.filter(pair => 
            newGrid[pair.pos1.row][pair.pos1.col] !== newGrid[pair.pos2.row][pair.pos2.col]
          );
          
          console.log(`[placePair] Found ${validPairs.length} valid adjacent pairs (excluding identical letters)`);
          
          if (validPairs.length > 0) {
            // Randomly select a valid adjacent pair to swap
            const randomPairIndex = Math.floor(Math.random() * validPairs.length);
            const { pos1, pos2 } = validPairs[randomPairIndex];
            
            console.log(`[placePair] Swapping letters at (${pos1.row}, ${pos1.col}) and (${pos2.row}, ${pos2.col})`);
            
            // Save the pre-gravity grid for debugging
            const preGravityGrid = JSON.parse(JSON.stringify(newGrid));
            
            // Swap the letters
            newGrid = swapLetters(newGrid, pos1, pos2);
            
            return { 
              success: true, 
              newGrid,
              debugInfo: {
                word1Positions,
                word2Positions,
                preGravityGrid,
                preShiftGrid: preGravityGrid, // For first pair, preShiftGrid is the same as preGravityGrid
                swappedPositions: { pos1, pos2 }
              }
            };
          } else {
            console.log(`[placePair] ERROR: No valid adjacent positions found (all have identical letters)`);
            return { success: false, newGrid: grid };
          }
        } else {
          console.log(`[placePair] ERROR: No adjacent positions found for first pair`);
          return { success: false, newGrid: grid };
        }
      } else {
        // For vertical orientation, place both words with their bottom letters at the bottom of the grid
        const maxCol = gridSize - 2; // Leave space for two words side by side
        const col1 = Math.floor(Math.random() * maxCol);
        const col2 = col1 + 1;
        
        // Calculate rows so that bottom letters are at the bottom of the grid
        const row1 = gridSize - word1.length;
        const row2 = gridSize - word2.length;
        
        console.log(`[placePair] Placing first pair vertically: ${word1} at (${row1}, ${col1}), ${word2} at (${row2}, ${col2})`);
        
        // Place words in grid
        for (let i = 0; i < word1.length; i++) {
          newGrid[row1 + i][col1] = word1[i];
        }
        
        for (let i = 0; i < word2.length; i++) {
          newGrid[row2 + i][col2] = word2[i];
        }
        
        // Find positions of the two words
        const word1Positions: { row: number; col: number }[] = [];
        const word2Positions: { row: number; col: number }[] = [];
        
        for (let i = 0; i < word1.length; i++) {
          word1Positions.push({ row: row1 + i, col: col1 });
        }
        
        for (let i = 0; i < word2.length; i++) {
          word2Positions.push({ row: row2 + i, col: col2 });
        }
        
        // Find adjacent positions
        const adjacentPairs = findAdjacentPositions(newGrid, word1Positions, word2Positions);
        
        console.log(`[placePair] Found ${adjacentPairs.length} adjacent positions for first pair`);
        
        if (adjacentPairs.length > 0) {
          // Filter out pairs with identical letters
          const validPairs = adjacentPairs.filter(pair => 
            newGrid[pair.pos1.row][pair.pos1.col] !== newGrid[pair.pos2.row][pair.pos2.col]
          );
          
          console.log(`[placePair] Found ${validPairs.length} valid adjacent pairs (excluding identical letters)`);
          
          if (validPairs.length > 0) {
            // Randomly select a valid adjacent pair to swap
            const randomPairIndex = Math.floor(Math.random() * validPairs.length);
            const { pos1, pos2 } = validPairs[randomPairIndex];
            
            console.log(`[placePair] Swapping letters at (${pos1.row}, ${pos1.col}) and (${pos2.row}, ${pos2.col})`);
            
            // Save the pre-gravity grid for debugging
            const preGravityGrid = JSON.parse(JSON.stringify(newGrid));
            
            // Swap the letters
            newGrid = swapLetters(newGrid, pos1, pos2);
            
            return { 
              success: true, 
              newGrid,
              debugInfo: {
                word1Positions,
                word2Positions,
                preGravityGrid,
                preShiftGrid: preGravityGrid, // For first pair, preShiftGrid is the same as preGravityGrid
                swappedPositions: { pos1, pos2 }
              }
            };
          } else {
            console.log(`[placePair] ERROR: No valid adjacent positions found (all have identical letters)`);
            return { success: false, newGrid: grid };
          }
        } else {
          console.log(`[placePair] ERROR: No adjacent positions found for first pair`);
          return { success: false, newGrid: grid };
        }
      }
    } else {
      // For subsequent pairs, we need to find positions where the words overlap with existing letters
      console.log(`[placePair] Using subsequent pair placement logic`);
      
      // Try random positions with a focus on creating overlaps
      const maxAttempts = 1000;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (attempt % 100 === 0) {
          console.log(`[placePair] Placement attempt ${attempt}/${maxAttempts}`);
        }
        
        // Generate random positions
        const row1 = Math.floor(Math.random() * (gridSize - (isHorizontal ? 1 : word1.length)));
        const col1 = Math.floor(Math.random() * (gridSize - (isHorizontal ? word1.length : 1)));
        
        let row2, col2;
        if (isHorizontal) {
          row2 = row1 + 1;
          col2 = col1;
        } else {
          row2 = row1;
          col2 = col1 + 1;
        }
        
        // Skip if out of bounds
        if (row2 >= gridSize || col2 >= gridSize) continue;
        
        // For horizontal words, check if all positions have support below
        if (isHorizontal) {
          let allPositionsSupported = true;
          
          // Check word1
          for (let i = 0; i < word1.length; i++) {
            if (!isPositionSupportedByGravity(grid, row1, col1 + i) && grid[row1][col1 + i] === ' ') {
              allPositionsSupported = false;
              break;
            }
          }
          
          // Check word2
          if (allPositionsSupported) {
            for (let i = 0; i < word2.length; i++) {
              if (!isPositionSupportedByGravity(grid, row2, col2 + i) && grid[row2][col2 + i] === ' ') {
                allPositionsSupported = false;
                break;
              }
            }
          }
          
          if (!allPositionsSupported) {
            continue; // Skip this position if not all positions are supported
          }
        }
        
        // Check if positions are valid (must have at least one overlap with existing letters)
        if (!isValidPosition(grid, word1, row1, col1, isHorizontal, false)) continue;
        if (!isValidPosition(grid, word2, row2, col2, isHorizontal, false)) continue;
        
        console.log(`[placePair] Found valid positions - word1: ${word1} at (${row1}, ${col1}), word2: ${word2} at (${row2}, ${col2})`);
        
        // Create a test grid for analysis
        let testGrid = JSON.parse(JSON.stringify(grid));
        
        // Track columns that will have new letters and how many letters will be added to each column
        const columnsToShift = new Map<number, number>();
        
        // Track positions of the new words
        const newWordPositions: Array<{row: number, col: number}> = [];
        
        // Analyze word1 placement
        for (let i = 0; i < word1.length; i++) {
          const placeRow = isHorizontal ? row1 : row1 + i;
          const placeCol = isHorizontal ? col1 + i : col1;
          
          newWordPositions.push({row: placeRow, col: placeCol});
          
          // If this position already has a letter, it's an overlap
          if (testGrid[placeRow][placeCol] !== ' ') {
            const count = columnsToShift.get(placeCol) || 0;
            columnsToShift.set(placeCol, count + 1);
          }
        }
        
        // Analyze word2 placement
        for (let i = 0; i < word2.length; i++) {
          const placeRow = isHorizontal ? row2 : row2 + i;
          const placeCol = isHorizontal ? col2 + i : col2;
          
          newWordPositions.push({row: placeRow, col: placeCol});
          
          // If this position already has a letter and it's not already counted from word1
          if (testGrid[placeRow][placeCol] !== ' ' && 
              !newWordPositions.some(p => p.row === placeRow && p.col === placeCol && 
                                         p.row === (isHorizontal ? row1 : row1 + i) && 
                                         p.col === (isHorizontal ? col1 + i : col1))) {
            const count = columnsToShift.get(placeCol) || 0;
            columnsToShift.set(placeCol, count + 1);
          }
        }
        
        console.log(`[placePair] Columns to shift: ${Array.from(columnsToShift.keys()).join(', ')}`);
        
        // Save the grid state before shifting letters upward (for debugging)
        const preShiftGrid = JSON.parse(JSON.stringify(testGrid));
        
        // If there are columns to shift, shift them before placing the new words
        if (columnsToShift.size > 0) {
          // Shift letters upward in affected columns BEFORE placing the new words
          for (const [col, shiftCount] of Array.from(columnsToShift.entries())) {
            console.log(`[placePair] Processing column ${col} for shifting`);
            
            // Use the new function to shift letters upward to avoid overlaps
            testGrid = shiftLettersToAvoidOverlaps(testGrid, col, newWordPositions);
          }
        }
        
        // Save the grid state before placing the new words (for debugging)
        const preWordPlacementGrid = JSON.parse(JSON.stringify(testGrid));
        
        // Now place the new words
        // Place word1
        for (let i = 0; i < word1.length; i++) {
          const placeRow = isHorizontal ? row1 : row1 + i;
          const placeCol = isHorizontal ? col1 + i : col1;
          testGrid[placeRow][placeCol] = word1[i];
        }
        
        // Place word2
        for (let i = 0; i < word2.length; i++) {
          const placeRow = isHorizontal ? row2 : row2 + i;
          const placeCol = isHorizontal ? col2 + i : col2;
          testGrid[placeRow][placeCol] = word2[i];
        }
        
        // Find positions of both words after placement
        const word1Positions: { row: number; col: number }[] = [];
        const word2Positions: { row: number; col: number }[] = [];
        
        if (isHorizontal) {
          for (let j = 0; j < word1.length; j++) {
            word1Positions.push({ row: row1, col: col1 + j });
          }
          for (let j = 0; j < word2.length; j++) {
            word2Positions.push({ row: row2, col: col2 + j });
          }
        } else {
          for (let j = 0; j < word1.length; j++) {
            word1Positions.push({ row: row1 + j, col: col1 });
          }
          for (let j = 0; j < word2.length; j++) {
            word2Positions.push({ row: row2 + j, col: col2 });
          }
        }
        
        // Find adjacent positions
        const adjacentPairs = findAdjacentPositions(testGrid, word1Positions, word2Positions);
        
        if (adjacentPairs.length > 0) {
          // Filter out pairs with identical letters
          const validPairs = adjacentPairs.filter(pair => 
            testGrid[pair.pos1.row][pair.pos1.col] !== testGrid[pair.pos2.row][pair.pos2.col]
          );
          
          if (validPairs.length > 0) {
            // Randomly select a valid adjacent pair to swap
            const randomPairIndex = Math.floor(Math.random() * validPairs.length);
            const { pos1, pos2 } = validPairs[randomPairIndex];
            
            console.log(`[placePair] Swapping letters at (${pos1.row}, ${pos1.col}) and (${pos2.row}, ${pos2.col})`);
            
            // Save the pre-gravity grid for debugging
            const preGravityGrid = JSON.parse(JSON.stringify(testGrid));
            
            // Swap the letters
            testGrid = swapLetters(testGrid, pos1, pos2);
            
            // Debug: Print the grid after placing this pair
            console.log(`[placePair] Grid after placing and swapping:`);
            testGrid.forEach((row: string[], rowIndex: number) => {
              console.log(`Row ${rowIndex}: ${row.join('')}`);
            });
            
            return { 
              success: true, 
              newGrid: testGrid,
              debugInfo: {
                word1Positions,
                word2Positions,
                preGravityGrid,
                preShiftGrid,
                swappedPositions: { pos1, pos2 }
              }
            };
          } else {
            console.log(`[placePair] No valid adjacent pairs found (all have identical letters)`);
          }
        } else {
          console.log(`[placePair] No adjacent positions found between words`);
        }
      }
      
      console.log(`[placePair] ERROR: Failed to place pair after all attempts`);
      return { success: false, newGrid: grid };
    }
  };

  // Generate a level
  const generateLevel = () => {
    const words = parseWords(wordInput);
    
    if (!validateWords(words)) {
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      console.log(`[generateLevel] Starting level generation with ${words.length} words`);
      
      // Reset debug steps
      const newDebugSteps: Array<{
        description: string;
        grid: string[][];
        highlightPositions?: Array<{row: number, col: number, color: string}>;
      }> = [];
      
      // Create empty grid
      const gridSize = 20;
      let grid = createEmptyGrid(gridSize);
      
      // Add initial empty grid to debug steps
      newDebugSteps.push({
        description: "Initial empty grid",
        grid: JSON.parse(JSON.stringify(grid))
      });
      
      // Randomize word order and pair them
      const shuffledWords = [...words].sort(() => Math.random() - 0.5);
      const wordPairs: [string, string][] = [];
      
      for (let i = 0; i < shuffledWords.length; i += 2) {
        wordPairs.push([shuffledWords[i], shuffledWords[i + 1]]);
      }
      
      console.log(`[generateLevel] Created ${wordPairs.length} word pairs`);
      
      // Place word pairs in the grid
      for (let pairIndex = 0; pairIndex < wordPairs.length; pairIndex++) {
        const [word1, word2] = wordPairs[pairIndex];
        const isFirstPair = pairIndex === 0;
        
        console.log(`[generateLevel] Placing pair ${pairIndex + 1}/${wordPairs.length}: ${word1}, ${word2}`);
        
        // Try both orientations
        let placementSuccess = false;
        let placementDetails: {
          isHorizontal: boolean;
          word1Positions: Array<{row: number, col: number}>;
          word2Positions: Array<{row: number, col: number}>;
          preGravityGrid: string[][];
          preShiftGrid?: string[][];
          swappedPositions?: {pos1: {row: number, col: number}, pos2: {row: number, col: number}};
        } | null = null;
        
        // For the first pair, always place horizontally
        // For subsequent pairs, randomly decide whether to try horizontal or vertical first (50/50 chance)
        if (isFirstPair) {
          // Always try horizontal for the first pair
          console.log(`[generateLevel] Trying horizontal orientation for first pair`);
          const { success: horizontalSuccess, newGrid: horizontalGrid, debugInfo: horizontalDebugInfo } = 
            placePair(grid, word1, word2, true, isFirstPair);
          
          if (horizontalSuccess && horizontalDebugInfo) {
            grid = horizontalGrid;
            placementSuccess = true;
            placementDetails = {
              isHorizontal: true,
              ...horizontalDebugInfo
            };
            console.log(`[generateLevel] Successfully placed first pair horizontally`);
          } else {
            console.log(`[generateLevel] ERROR: Failed to place first pair horizontally`);
          }
        } else {
          // For subsequent pairs, use the 50/50 random orientation approach
          const tryHorizontalFirst = Math.random() < 0.5;
          
          if (tryHorizontalFirst) {
            // Try horizontal first
            console.log(`[generateLevel] Trying horizontal orientation for pair ${pairIndex + 1}`);
            const { success: horizontalSuccess, newGrid: horizontalGrid, debugInfo: horizontalDebugInfo } = 
              placePair(grid, word1, word2, true, isFirstPair);
            
            if (horizontalSuccess && horizontalDebugInfo) {
              grid = horizontalGrid;
              placementSuccess = true;
              placementDetails = {
                isHorizontal: true,
                ...horizontalDebugInfo
              };
              console.log(`[generateLevel] Successfully placed pair ${pairIndex + 1} horizontally`);
            } else {
              // Try vertical
              console.log(`[generateLevel] Trying vertical orientation for pair ${pairIndex + 1}`);
              const { success: verticalSuccess, newGrid: verticalGrid, debugInfo: verticalDebugInfo } = 
                placePair(grid, word1, word2, false, isFirstPair);
              
              if (verticalSuccess && verticalDebugInfo) {
                grid = verticalGrid;
                placementSuccess = true;
                placementDetails = {
                  isHorizontal: false,
                  ...verticalDebugInfo
                };
                console.log(`[generateLevel] Successfully placed pair ${pairIndex + 1} vertically`);
              }
            }
          } else {
            // Try vertical first
            console.log(`[generateLevel] Trying vertical orientation for pair ${pairIndex + 1}`);
            const { success: verticalSuccess, newGrid: verticalGrid, debugInfo: verticalDebugInfo } = 
              placePair(grid, word1, word2, false, isFirstPair);
            
            if (verticalSuccess && verticalDebugInfo) {
              grid = verticalGrid;
              placementSuccess = true;
              placementDetails = {
                isHorizontal: false,
                ...verticalDebugInfo
              };
              console.log(`[generateLevel] Successfully placed pair ${pairIndex + 1} vertically`);
            } else {
              // Try horizontal
              console.log(`[generateLevel] Trying horizontal orientation for pair ${pairIndex + 1}`);
              const { success: horizontalSuccess, newGrid: horizontalGrid, debugInfo: horizontalDebugInfo } = 
                placePair(grid, word1, word2, true, isFirstPair);
              
              if (horizontalSuccess && horizontalDebugInfo) {
                grid = horizontalGrid;
                placementSuccess = true;
                placementDetails = {
                  isHorizontal: true,
                  ...horizontalDebugInfo
                };
                console.log(`[generateLevel] Successfully placed pair ${pairIndex + 1} horizontally`);
              }
            }
          }
        }
        
        if (!placementSuccess) {
          console.log(`[generateLevel] ERROR: Failed to place pair ${pairIndex + 1}`);
          setError(`Failed to place word pair: ${word1}, ${word2}. Try different words or fewer pairs.`);
          setIsGenerating(false);
          return;
        }
        
        // Add debug steps for this pair placement
        if (placementDetails) {
          // Step 1: Show where the words will be placed (highlighted)
          if (placementDetails!.preShiftGrid && !isFirstPair) {
            // For subsequent pairs, show the grid before shifting letters upward
            const newWordPositions: Array<{row: number, col: number}> = [];
            
            // Calculate positions for word1
            if (placementDetails!.isHorizontal) {
              for (let i = 0; i < word1.length; i++) {
                newWordPositions.push({ 
                  row: placementDetails!.word1Positions[0].row, 
                  col: placementDetails!.word1Positions[0].col + i 
                });
              }
            } else {
              for (let i = 0; i < word1.length; i++) {
                newWordPositions.push({ 
                  row: placementDetails!.word1Positions[0].row + i, 
                  col: placementDetails!.word1Positions[0].col 
                });
              }
            }
            
            // Calculate positions for word2
            if (placementDetails!.isHorizontal) {
              for (let i = 0; i < word2.length; i++) {
                newWordPositions.push({ 
                  row: placementDetails!.word2Positions[0].row, 
                  col: placementDetails!.word2Positions[0].col + i 
                });
              }
            } else {
              for (let i = 0; i < word2.length; i++) {
                newWordPositions.push({ 
                  row: placementDetails!.word2Positions[0].row + i, 
                  col: placementDetails!.word2Positions[0].col 
                });
              }
            }
            
            newDebugSteps.push({
              description: `Pair ${pairIndex + 1}: ${word1}, ${word2} - Before shifting letters upward`,
              grid: JSON.parse(JSON.stringify(placementDetails!.preShiftGrid)),
              highlightPositions: newWordPositions.map(pos => ({
                row: pos.row,
                col: pos.col,
                color: 'red'
              }))
            });
          }
          
          const allPositions = [...placementDetails!.word1Positions, ...placementDetails!.word2Positions];
          newDebugSteps.push({
            description: `Pair ${pairIndex + 1}: ${word1}, ${word2} - Planned positions (${placementDetails!.isHorizontal ? 'horizontal' : 'vertical'})`,
            grid: JSON.parse(JSON.stringify(placementDetails!.preGravityGrid)),
            highlightPositions: allPositions.map(pos => ({
              row: pos.row,
              col: pos.col,
              color: placementDetails!.word1Positions.some(p => p.row === pos.row && p.col === pos.col) ? 'blue' : 'green'
            }))
          });
          
          // Step 2: Show the grid after placement but before gravity (with swapped letters highlighted)
          if (placementDetails!.swappedPositions) {
            newDebugSteps.push({
              description: `Pair ${pairIndex + 1}: Letters swapped between positions`,
              grid: JSON.parse(JSON.stringify(placementDetails!.preGravityGrid)),
              highlightPositions: [
                { row: placementDetails!.swappedPositions.pos1.row, col: placementDetails!.swappedPositions.pos1.col, color: 'orange' },
                { row: placementDetails!.swappedPositions.pos2.row, col: placementDetails!.swappedPositions.pos2.col, color: 'orange' }
              ]
            });
          }
        }
        
        // Apply gravity after each pair placement
        console.log(`[generateLevel] Applying gravity after placing pair ${pairIndex + 1}`);
        const preGravityGrid = JSON.parse(JSON.stringify(grid));
        grid = applyGravity(grid);
        
        // Step 3: Show the grid after gravity is applied
        newDebugSteps.push({
          description: `Pair ${pairIndex + 1}: After applying gravity`,
          grid: JSON.parse(JSON.stringify(grid))
        });
        
        // Debug: Print the grid after placing this pair
        console.log(`[generateLevel] Grid after placing pair ${pairIndex + 1} and applying gravity:`);
        grid.forEach((row, rowIndex) => {
          console.log(`Row ${rowIndex}: ${row.join('')}`);
        });
      }
      
      // Final gravity application is redundant but kept for clarity
      console.log(`[generateLevel] Applying final gravity to grid`);
      grid = applyGravity(grid);
      
      // Add final grid to debug steps
      newDebugSteps.push({
        description: "Final grid",
        grid: JSON.parse(JSON.stringify(grid))
      });
      
      // Debug: Print the grid after applying gravity
      console.log(`[generateLevel] Final grid after applying gravity:`);
      grid.forEach((row, rowIndex) => {
        console.log(`Row ${rowIndex}: ${row.join('')}`);
      });
      
      console.log('[generateLevel] Level generation complete');
      
      // Set debug steps and show controls
      setDebugSteps(newDebugSteps);
      setCurrentDebugStep(0);
      setShowDebugControls(true);
      
      // Create the level object
      const newLevel: Level = {
        id: 0, // This will be set by the user when adding to levels.ts
        name: "Generated Level",
        theme: "Generated Theme",
        grid: grid,
        validWords: words
      };
      
      setGeneratedLevel(newLevel);
    } catch (err) {
      console.error('[generateLevel] Error generating level:', err);
      setError(`Error generating level: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Format level as code
  const formatLevelAsCode = (level: Level): string => {
    const gridString = level.grid
      .map(row => 
        `    [${row.map(cell => `'${cell}'`).join(', ')}]`
      )
      .join(',\n');
    
    const wordsString = level.validWords
      .map(word => `    "${word}"`)
      .join(',\n');
    
    return `export const levelX: Level = {
  id: X, // Replace with the next level number
  name: "Level X", // Replace with appropriate name
  grid: [
${gridString}
  ],
  validWords: [
${wordsString}
  ]
};`;
  };

  return (
    <div className="level-creator-container">
      <div className="level-creator-header">
        <h2>Level Creator</h2>
        <button 
          className="level-creator-close-btn"
          onClick={onClose}
          title="Close Level Creator (Esc)"
        >
          ×
        </button>
      </div>
      
      <div className="creator-section">
        <label htmlFor="word-input">Enter Words (one per line):</label>
        <p className="helper-text">
          Enter an even number of words to create a level. Words will be paired and placed in the grid with 
          letters swapped between pairs to create a puzzle. The player will need to identify and swap the 
          correct letters to form the original words.
        </p>
        <textarea 
          id="word-input"
          value={wordInput}
          onChange={handleInputChange}
          placeholder="Enter words here, one per line. For example:
APPLE
BANANA
ORANGE
GRAPE
MANGO
PEACH"
          rows={10}
          disabled={isGenerating}
        />
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="button-group">
          <button 
            onClick={generateLevel}
            disabled={isGenerating}
            className="generate-button"
          >
            {isGenerating ? 'Generating...' : 'Generate Level'}
          </button>
          
          <button onClick={onClose} className="close-button">
            Close <span className="shortcut-hint">(Esc)</span>
          </button>
        </div>
      </div>
      
      {generatedLevel && (
        <div className="result-section">
          <h3>Generated Level</h3>
          
          {showDebugControls && debugSteps.length > 0 && (
            <div className="debug-controls">
              <h4>Debug Visualization</h4>
              <p className="debug-description">{debugSteps[currentDebugStep].description}</p>
              
              <div className="debug-grid-preview">
                {debugSteps[currentDebugStep].grid.map((row, rowIndex) => (
                  <div key={rowIndex} className="grid-row">
                    {row.map((cell, colIndex) => {
                      // Check if this cell should be highlighted
                      const highlight = debugSteps[currentDebugStep].highlightPositions?.find(
                        pos => pos.row === rowIndex && pos.col === colIndex
                      );
                      
                      return (
                        <div 
                          key={`${rowIndex}-${colIndex}`} 
                          className={`grid-cell ${cell !== ' ' ? 'filled' : ''} ${highlight ? 'highlighted' : ''}`}
                          style={highlight ? { backgroundColor: highlight.color } : {}}
                        >
                          {cell}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              
              <div className="debug-navigation">
                <button 
                  onClick={() => setCurrentDebugStep(Math.max(0, currentDebugStep - 1))}
                  disabled={currentDebugStep === 0}
                >
                  Previous Step <span className="shortcut-hint">(←)</span>
                </button>
                <span className="debug-step-counter">
                  Step {currentDebugStep + 1} of {debugSteps.length}
                </span>
                <button 
                  onClick={() => setCurrentDebugStep(Math.min(debugSteps.length - 1, currentDebugStep + 1))}
                  disabled={currentDebugStep === debugSteps.length - 1}
                >
                  Next Step <span className="shortcut-hint">(→)</span>
                </button>
              </div>
            </div>
          )}
          
          <div className="grid-preview">
            {generatedLevel.grid.map((row, rowIndex) => (
              <div key={rowIndex} className="grid-row">
                {row.map((cell, colIndex) => (
                  <div 
                    key={`${rowIndex}-${colIndex}`} 
                    className={`grid-cell ${cell !== ' ' ? 'filled' : ''}`}
                  >
                    {cell}
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          <div className="code-output">
            <h4>Code to Copy:</h4>
            <pre>{formatLevelAsCode(generatedLevel)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default LevelCreator;