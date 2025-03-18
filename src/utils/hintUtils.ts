// Utility functions for providing hints in the game

import { Level } from '../data/levels';

// Interface to represent a position in the grid
interface Position {
  row: number;
  col: number;
}

// Interface for the current grid state
export interface GridState {
  grid: string[][]; // The current state of the grid
  letterToOriginalPosition: Map<string, Position>; // Maps each letter to its original position
}

// Interface to represent a swap hint
export interface SwapHint {
  position1: Position;
  position2: Position;
  wordsCreated: string[];
}

// Direction deltas for the 8 adjacent positions
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

// Check if two positions are adjacent
const areAdjacent = (pos1: Position, pos2: Position): boolean => {
  for (const [dRow, dCol] of DIRECTIONS) {
    if (pos1.row + dRow === pos2.row && pos1.col + dCol === pos2.col) {
      return true;
    }
  }
  return false;
};

// Find all possible words in the grid (horizontal and vertical)
function findAllWordsInGrid(grid: string[][], validWords: string[] = []): { 
  word: string, 
  positions: Position[], 
  isHorizontal: boolean 
}[] {
  const gridSize = grid.length;
  const words: { word: string, positions: Position[], isHorizontal: boolean }[] = [];
  const validWordsUpper = validWords.map(word => word.toUpperCase());
  
  console.log("Finding all words in grid of size", gridSize);
  
  // Helper function to check a continuous letter sequence for valid words
  const checkSequenceForWords = (sequence: string, positions: Position[], isHorizontal: boolean) => {
    // Add the whole sequence if it's at least 3 letters
    if (sequence.length >= 3) {
      words.push({ 
        word: sequence,
        positions: [...positions],
        isHorizontal
      });
      console.log(`Found ${isHorizontal ? 'horizontal' : 'vertical'} sequence: "${sequence}"`);
    }
    
    // Also check for valid words that might be substrings
    if (validWordsUpper.length > 0) {
      for (const validWord of validWordsUpper) {
        // Convert both to uppercase for case-insensitive comparison
        const sequenceUpper = sequence.toUpperCase();
        
        // Check if the sequence contains this valid word
        const startIndex = sequenceUpper.indexOf(validWord);
        if (startIndex !== -1) {
          // Found a valid word within the sequence
          const wordPositions = positions.slice(startIndex, startIndex + validWord.length);
          
          console.log(`Found valid word "${validWord}" within ${isHorizontal ? 'horizontal' : 'vertical'} sequence "${sequence}"`);
          
          words.push({
            word: validWord,
            positions: wordPositions,
            isHorizontal
          });
        }
      }
    }
  };
  
  // Check horizontal words
  for (let row = 0; row < gridSize; row++) {
    let currentWord = '';
    let positions: Position[] = [];
    
    for (let col = 0; col < gridSize; col++) {
      if (col < grid[row].length && grid[row][col] !== ' ') {
        currentWord += grid[row][col];
        positions.push({ row, col });
      } else {
        // Check this sequence for valid words
        if (currentWord.length >= 3) {
          checkSequenceForWords(currentWord, positions, true);
        }
        currentWord = '';
        positions = [];
      }
    }
    
    // Check if we found a word at the end of the row
    if (currentWord.length >= 3) {
      checkSequenceForWords(currentWord, positions, true);
    }
  }
  
  // Check vertical words
  for (let col = 0; col < gridSize; col++) {
    let currentWord = '';
    let positions: Position[] = [];
    
    for (let row = 0; row < gridSize; row++) {
      if (row < grid.length && col < grid[row].length && grid[row][col] !== ' ') {
        currentWord += grid[row][col];
        positions.push({ row, col });
      } else {
        // Check this sequence for valid words
        if (currentWord.length >= 3) {
          checkSequenceForWords(currentWord, positions, false);
        }
        currentWord = '';
        positions = [];
      }
    }
    
    // Check if we found a word at the end of the column
    if (currentWord.length >= 3) {
      checkSequenceForWords(currentWord, positions, false);
    }
  }
  
  // Look for continuous sequences of letters both horizontal and vertical
  console.log(`Found ${words.length} words/sequences in total: ${words.map(w => w.word).join(', ')}`);
  
  return words;
}

// Extract a string representation of the current grid state
function extractCurrentGridState(gameGrid: any[][]): string[][] {
  if (!gameGrid || gameGrid.length === 0) return [[]];
  
  const gridRows = gameGrid.length;
  const gridCols = gameGrid[0].length;
  const result: string[][] = Array(gridRows).fill(null).map(() => Array(gridCols).fill(' '));
  
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      if (gameGrid[row][col] && gameGrid[row][col].visible && !gameGrid[row][col].isEmpty) {
        result[row][col] = gameGrid[row][col].letter;
      } else {
        result[row][col] = ' ';
      }
    }
  }
  
  return result;
}

// Check current grid for valid words without swapping
function findValidWordsInCurrentGrid(grid: string[][], validWords: string[]): string[] {
  // Uppercase valid words for comparison
  const validWordsUpper = validWords.map(word => word.toUpperCase());
  
  // Find all words in the current grid, including valid words as substrings
  const allWords = findAllWordsInGrid(grid, validWordsUpper);
  
  // Check which ones match valid words
  const foundValidWords = allWords
    .filter(({ word }) => validWordsUpper.includes(word.toUpperCase()))
    .map(({ word }) => word.toUpperCase());
  
  console.log(`Found ${foundValidWords.length} valid words in current grid: ${foundValidWords.join(', ')}`);
  
  return foundValidWords;
}

// Directly check if swapping two letters creates valid words
function checkSwapCreatesValidWords(
  grid: string[][], 
  pos1: Position,
  pos2: Position,
  validWords: string[]
): string[] {
  // Skip if either position is empty or out of bounds
  if (pos1.row >= grid.length || pos1.col >= grid[0].length ||
      pos2.row >= grid.length || pos2.col >= grid[0].length ||
      grid[pos1.row][pos1.col] === ' ' || grid[pos2.row][pos2.col] === ' ') {
    return [];
  }
  
  console.log(`Checking swap between (${pos1.row},${pos1.col}): "${grid[pos1.row][pos1.col]}" and (${pos2.row},${pos2.col}): "${grid[pos2.row][pos2.col]}"`);
  
  // Create a test grid with swapped letters
  const testGrid = JSON.parse(JSON.stringify(grid));
  const letter1 = testGrid[pos1.row][pos1.col];
  const letter2 = testGrid[pos2.row][pos2.col];
  
  // Swap the letters
  testGrid[pos1.row][pos1.col] = letter2;
  testGrid[pos2.row][pos2.col] = letter1;
  
  console.log(`After swap: (${pos1.row},${pos1.col}): "${testGrid[pos1.row][pos1.col]}" and (${pos2.row},${pos2.col}): "${testGrid[pos2.row][pos2.col]}"`);
  
  // Find all potential words after the swap, including checking for valid words as substrings
  const allWords = findAllWordsInGrid(testGrid, validWords);
  console.log(`Found ${allWords.length} possible words after swap`);
  
  const wordsFound: string[] = [];
  
  // Check horizontal and vertical words through both positions
  for (const { word, positions } of allWords) {
    const wordText = word.toUpperCase();
    
    // Check if position1 is part of this word
    const pos1InWord = positions.some(pos => pos.row === pos1.row && pos.col === pos1.col);
    
    // Check if position2 is part of this word
    const pos2InWord = positions.some(pos => pos.row === pos2.row && pos.col === pos2.col);
    
    // Check if this is a valid word (case-insensitive comparison)
    const isValidWord = validWords.some(validWord => 
      validWord.toUpperCase() === wordText
    );
    
    console.log(`Checking word "${wordText}" - pos1 in word: ${pos1InWord}, pos2 in word: ${pos2InWord}, is valid word: ${isValidWord}`);
    
    // If either of the swapped positions is part of this word and it's a valid word
    if ((pos1InWord || pos2InWord) && isValidWord) {
      console.log(`✓ Adding valid word: "${wordText}"`);
      wordsFound.push(wordText);
    }
  }
  
  console.log(`Total valid words created by swap: ${wordsFound.length}`);
  if (wordsFound.length > 0) {
    console.log(`Words created: ${wordsFound.join(', ')}`);
  }
  
  return wordsFound;
}

// Find adjacent letter pairs that can be swapped to create valid words
function findAdjacentLetterPairs(
  grid: string[][], 
  validWords: string[]
): { pos1: Position, pos2: Position, words: string[] }[] {
  // Guard against empty grid
  if (grid.length === 0 || grid[0].length === 0) {
    console.log("Empty grid, can't find adjacent letter pairs");
    return [];
  }
  
  const gridRows = grid.length;
  const gridCols = grid[0].length;
  console.log(`Finding adjacent letter pairs in grid of size ${gridRows}x${gridCols}`);
  
  const adjacentPairs: { pos1: Position, pos2: Position, words: string[] }[] = [];
  
  // Convert validWords to uppercase for case-insensitive comparison
  const validWordsUpper = validWords.map(word => word.toUpperCase());
  
  // For each non-empty cell
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      if (row < grid.length && col < grid[row].length && grid[row][col] !== ' ' && grid[row][col] !== '') {
        // We'll only check four directions to avoid duplicates:
        // right, down, down-right, down-left
        const directionsToCheck = [
          [0, 1],   // right
          [1, 0],   // down
          [1, 1],   // down-right
          [1, -1]   // down-left
        ];
        
        for (const [dRow, dCol] of directionsToCheck) {
          const adjRow = row + dRow;
          const adjCol = col + dCol;
          
          // Skip if out of bounds
          if (adjRow < 0 || adjRow >= gridRows || adjCol < 0 || adjCol >= gridCols) continue;
          if (adjRow >= grid.length || adjCol >= grid[adjRow].length) continue;
          
          // Skip if adjacent position is empty
          if (grid[adjRow][adjCol] === ' ' || grid[adjRow][adjCol] === '') continue;
          
          console.log(`Checking adjacent positions: (${row},${col}): "${grid[row][col]}" and (${adjRow},${adjCol}): "${grid[adjRow][adjCol]}"`);
          
          // Check if swapping these two letters creates valid words
          const wordsCreated = checkSwapCreatesValidWords(
            grid, 
            { row, col }, 
            { row: adjRow, col: adjCol },
            validWordsUpper
          );
          
          // If we found at least 1 word, record this pair
          if (wordsCreated.length >= 1) {
            adjacentPairs.push({
              pos1: { row, col },
              pos2: { row: adjRow, col: adjCol },
              words: wordsCreated
            });
          }
        }
      }
    }
  }
  
  return adjacentPairs;
}

// Debug function to print the grid contents
function debugPrintGrid(grid: string[][]) {
  console.log("Grid contents:");
  for (let row = 0; row < grid.length; row++) {
    console.log(grid[row].join(' '));
  }
}

// Main function to generate a hint for a level using the current game grid
export function generateSwapHintFromCurrentGrid(
  currentGameGrid: any[][], 
  validWords: string[],
  foundWords: string[]
): SwapHint | null {
  console.log("Generating hint from current game grid");
  
  // Extract the current state of the game grid as a string grid
  const currentGridState = extractCurrentGridState(currentGameGrid);
  
  // Print grid for debugging
  debugPrintGrid(currentGridState);
  
  // Find all possible swaps that create valid words
  const adjacentPairs = findAdjacentLetterPairs(currentGridState, validWords);
  
  console.log(`Found ${adjacentPairs.length} adjacent pairs that create words:`);
  adjacentPairs.forEach((pair, i) => {
    console.log(`Pair ${i+1}: (${pair.pos1.row},${pair.pos1.col}) <-> (${pair.pos2.row},${pair.pos2.col}) creates words: ${pair.words.join(', ')}`);
  });
  
  // Convert foundWords to uppercase for case-insensitive comparison
  const foundWordsUpper = foundWords.map(word => word.toUpperCase());
  
  // Filter to only include swaps that create words the player hasn't found yet
  const validHints = adjacentPairs.filter(pair => {
    // Get words that would be created by this swap that haven't been found yet
    const newWords = pair.words.filter(word => !foundWordsUpper.includes(word));
    const result = newWords.length >= 2;
    console.log(`Checking pair (${pair.pos1.row},${pair.pos1.col}) <-> (${pair.pos2.row},${pair.pos2.col})`);
    console.log(`Words that would be created: ${pair.words.join(', ')}`);
    console.log(`Words not found yet: ${newWords.join(', ')}`);
    console.log(`Has at least 2 unfound words: ${result}`);
    return result;
  });
  
  console.log(`After filtering, found ${validHints.length} valid hints`);
  
  if (validHints.length === 0) {
    console.log("No valid hints found - returning null");
    return null;
  }
  
  // Choose a random hint from the valid options
  const randomHint = validHints[Math.floor(Math.random() * validHints.length)];
  console.log(`Selected hint: (${randomHint.pos1.row},${randomHint.pos1.col}) <-> (${randomHint.pos2.row},${randomHint.pos2.col})`);
  console.log(`Words that will be created: ${randomHint.words.join(', ')}`);
  
  // Return the hint with only the unfound words
  return {
    position1: randomHint.pos1,
    position2: randomHint.pos2,
    wordsCreated: randomHint.words.filter(word => !foundWordsUpper.includes(word))
  };
}

// Legacy function for backward compatibility
export function generateSwapHint(
  level: Level, 
  foundWords: string[]
): SwapHint | null {
  console.log("WARNING: Using legacy generateSwapHint function with level data.");
  console.log("This may not work correctly after letters have moved. Use generateSwapHintFromCurrentGrid instead.");
  
  // Create a temporary grid from level data
  const tempGrid: string[][] = [];
  for (const row of level.grid) {
    const newRow: string[] = [];
    for (const cell of row) {
      newRow.push(cell);
    }
    tempGrid.push(newRow);
  }
  
  // Find all possible swaps that create valid words
  const adjacentPairs = findAdjacentLetterPairs(tempGrid, level.validWords);
  
  // Convert foundWords to uppercase for case-insensitive comparison
  const foundWordsUpper = foundWords.map(word => word.toUpperCase());
  
  // Filter to only include swaps that create words the player hasn't found yet
  const validHints = adjacentPairs.filter(pair => {
    // Get words that would be created by this swap that haven't been found yet
    const newWords = pair.words.filter(word => !foundWordsUpper.includes(word));
    return newWords.length >= 2; // At least 2 new words should be created
  });
  
  if (validHints.length === 0) {
    return null;
  }
  
  // Choose a random hint from the valid options
  const randomHint = validHints[Math.floor(Math.random() * validHints.length)];
  
  // Return the hint with only the unfound words
  return {
    position1: randomHint.pos1,
    position2: randomHint.pos2,
    wordsCreated: randomHint.words.filter(word => !foundWordsUpper.includes(word))
  };
}

// Function to get a simpler hint - just highlight a position that needs swapping
export function getPositionHint(
  currentGameGrid: any[][],
  validWords: string[],
  foundWords: string[]
): Position | null {
  const hint = generateSwapHintFromCurrentGrid(currentGameGrid, validWords, foundWords);
  if (!hint) return null;
  
  // Randomly choose one of the two positions to highlight
  return Math.random() < 0.5 ? hint.position1 : hint.position2;
} 