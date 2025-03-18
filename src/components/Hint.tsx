import React, { useState, useEffect } from 'react';
import { Level } from '../data/levels';
import { generateSwapHintFromCurrentGrid, SwapHint } from '../utils/hintUtils';
import './Hint.css';

interface HintProps {
  level: Level;
  foundWords: string[];
  hintsRemaining: number;
  onUseHint: () => void;
  onHintReceived: (hint: SwapHint | null) => void;
  currentGrid: any[][] | null; // Allow null for when in header
}

const Hint: React.FC<HintProps> = ({ 
  level, 
  foundWords, 
  hintsRemaining, 
  onUseHint, 
  onHintReceived,
  currentGrid 
}) => {
  const [isThinking, setIsThinking] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [headerMode, setHeaderMode] = useState(false);
  
  // Detect if we're in the header (when currentGrid is null)
  useEffect(() => {
    setHeaderMode(currentGrid === null);
  }, [currentGrid]);

  const handleHintClick = () => {
    if (hintsRemaining <= 0) {
      return;
    }
    
    if (isThinking) {
      return;
    }
    
    // Clear any previous error
    setLastError(null);
    
    // Show "thinking" state
    setIsThinking(true);
    
    try {
      // If we're in header mode but don't have grid data,
      // we need to look for it via the window object
      if (headerMode) {
        const gameGrid = typeof window !== 'undefined' ? (window as any).currentGameGrid : null;
        
        if (!gameGrid) {
          setLastError("Game grid not ready. Please try again in a moment.");
          setIsThinking(false);
          return;
        }
        
        try {
          const hint = generateSwapHintFromCurrentGrid(
            gameGrid, 
            level.validWords,
            foundWords
          );
          
          if (!hint) {
            setLastError("Sorry, no hint available for this level.");
            setIsThinking(false);
          } else {
            onUseHint(); // Decrement hint count
            onHintReceived(hint); // Send hint to parent
            setIsThinking(false);
          }
        } catch (error) {
          
          setLastError("Error generating hint. Please try again.");
          setIsThinking(false);
        }
        
        return;
      }
      
      // Add a small delay to show the "thinking" state
      setTimeout(() => {
        try {
          // We now use the current grid state instead of the level's original grid
          
          if (!currentGrid) {
            throw new Error("No current grid data available");
          }
          
          const hint = generateSwapHintFromCurrentGrid(
            currentGrid, 
            level.validWords,
            foundWords
          );
          
          if (!hint) {
            setLastError("Sorry, no hint available for this level.");
            onHintReceived(null);
          } else {
            onUseHint(); // Decrement hint count
            onHintReceived(hint); // Send hint to parent
          }
          
          setIsThinking(false);
        } catch (error) {
          
          setLastError("Error generating hint. Please try again.");
          setIsThinking(false);
          onHintReceived(null);
        }
      }, 500); // Half-second delay for feedback
    } catch (error) {
      
      setLastError("Error generating hint. Please try again.");
      setIsThinking(false);
      onHintReceived(null);
    }
  };

  return (
    <div className={`hint-container ${headerMode ? 'header-mode' : ''}`}>
      <button 
        className={`hint-button ${hintsRemaining <= 0 ? 'disabled' : ''} ${isThinking ? 'thinking' : ''} ${headerMode ? 'header-button' : ''}`}
        onClick={handleHintClick}
        disabled={hintsRemaining <= 0 || isThinking}
      >
        {isThinking ? 'Thinking...' : `Hint (${hintsRemaining})`}
      </button>
      
      {!headerMode && lastError && (
        <div className="hint-error">
          {lastError}
        </div>
      )}
    </div>
  );
};

export default Hint; 