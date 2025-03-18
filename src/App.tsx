import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import GameGrid from './components/GameGrid';
import StartScreen from './components/StartScreen';
import LevelTransition from './components/LevelTransition';
import LevelIndicator from './components/LevelIndicator';
import LevelCreator from './components/LevelCreator';
import { levels } from './data/levels';
import { FEATURES } from './utils/devMode';
import { motion, AnimatePresence } from 'framer-motion';
import Hint from './components/Hint';
import { SwapHint } from './utils/hintUtils';

// Game states
type GameState = 'start' | 'playing' | 'transition' | 'complete';

function App() {
  const [gameState, setGameState] = useState<GameState>('start');
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [showLevelCreator, setShowLevelCreator] = useState(false);
  const [isGridAnimating, setIsGridAnimating] = useState(false);
  const prevLevelIndexRef = useRef(currentLevelIndex);
  const [hintsRemaining, setHintsRemaining] = useState(3); // Hints state moved to App level
  const [currentHint, setCurrentHint] = useState<SwapHint | null>(null);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [currentGrid, setCurrentGrid] = useState<any[][] | null>(null);
  
  // Secret keypress to show level creator - only in dev mode
  useEffect(() => {
    // Only set up the listener if the LEVEL_CREATOR feature is enabled
    if (!FEATURES.LEVEL_CREATOR) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if the target is the body (not an input or textarea)
      const isInputElement = 
        event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement;
      
      if (event.key === 'l' && !isInputElement && !showLevelCreator) {
        setShowLevelCreator(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showLevelCreator]);
  
  // Reset found words when level changes
  useEffect(() => {
    setFoundWords([]);
  }, [currentLevelIndex]);
  
  // Start the game
  const handleStartGame = () => {
    setGameState('playing');
  };
  
  // Handle level completion
  const handleLevelComplete = () => {
    // Add a small delay to ensure all animations are complete
    setTimeout(() => {
      if (currentLevelIndex < levels.length - 1) {
        // More levels to play
        setGameState('transition');
      } else {
        // Game complete
        setGameState('complete');
      }
    }, 500);
  };
  
  // Handle transition completion
  const handleTransitionComplete = () => {
    // Move to the next level
    setCurrentLevelIndex(prevIndex => prevIndex + 1);
    setGameState('playing');
    
    // Reset grid animation state after a short delay
    setTimeout(() => {
      setIsGridAnimating(false);
    }, 300); // Match this with the exit animation duration
  };
  
  // Handle level switching
  const handleSwitchLevel = (levelIndex: number) => {
    // Always animate the grid out, whether restarting or switching
    setIsGridAnimating(true);
    prevLevelIndexRef.current = currentLevelIndex;
    
    // Check if we're restarting the current level
    const isRestart = levelIndex === currentLevelIndex;
    
    // After fade out, update or restart the level
    setTimeout(() => {
      if (isRestart) {
        // For restart, we don't need to change the currentLevelIndex
        // Just ensure we're in playing state
        setGameState('playing');
      } else {
        // For level switch, update the level index
        setCurrentLevelIndex(levelIndex);
        setGameState('playing');
      }
      
      // Reset hints back to 3 when switching or restarting level
      setHintsRemaining(3);
      
      // After a short delay, fade in the new/restarted grid
      setTimeout(() => {
        setIsGridAnimating(false);
      }, 50);
    }, 300); // Match this with the exit animation duration
  };

  // Handle using a hint
  const handleUseHint = () => {
    if (hintsRemaining > 0) {
      setHintsRemaining(prev => prev - 1);
    }
  };

  // Handle hint received from the Hint component
  const handleHintReceived = (hint: SwapHint | null) => {
    setCurrentHint(hint);
  };
  
  // Update found words
  const handleFoundWordsUpdate = (words: string[]) => {
    setFoundWords(words);
  };
  
  // Get the current game grid from the window object (set by GameGrid)
  useEffect(() => {
    const checkForGrid = () => {
      if (typeof window !== 'undefined' && (window as any).currentGameGrid) {
        setCurrentGrid((window as any).currentGameGrid);
      }
    };
    
    // Check initially
    checkForGrid();
    
    // Set up interval to check periodically
    const interval = setInterval(checkForGrid, 1000);
    
    return () => clearInterval(interval);
  }, [gameState]);
  
  // Render content based on game state
  const renderContent = () => {
    switch (gameState) {
      case 'start':
        return (
          <>
            {FEATURES.LEVEL_SWITCHER && (
              <LevelIndicator 
                currentLevel={1} 
                totalLevels={levels.length} 
                onSwitchLevel={handleSwitchLevel}
                showLevelSwitcher={true}
              />
            )}
            <StartScreen onStart={handleStartGame} />
          </>
        );
      
      case 'playing':
        return (
          <>
            <div className="game-header">
              <LevelIndicator 
                currentLevel={levels[currentLevelIndex].id} 
                totalLevels={levels.length} 
                onSwitchLevel={FEATURES.LEVEL_SWITCHER ? handleSwitchLevel : undefined}
                showLevelSwitcher={FEATURES.LEVEL_SWITCHER}
              />
              
              <div className="level-theme-container">
                <h2 className="level-theme">{levels[currentLevelIndex].theme}</h2>
              </div>
            </div>
            
            <AnimatePresence mode="wait">
              {!isGridAnimating && (
                <motion.div
                  key={`grid-${currentLevelIndex}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <GameGrid 
                    key={`game-grid-${currentLevelIndex}`}
                    level={levels[currentLevelIndex]} 
                    onLevelComplete={handleLevelComplete}
                    currentHint={currentHint}
                    onFoundWordsUpdate={handleFoundWordsUpdate}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        );
      
      case 'transition':
        return (
          <LevelTransition 
            levelNumber={levels[currentLevelIndex + 1].id} 
            levelTheme={levels[currentLevelIndex + 1].theme}
            onTransitionComplete={handleTransitionComplete} 
          />
        );
      
      case 'complete':
        return (
          <div className="game-complete">
            <h1>Congratulations!</h1>
            <p>You've completed all levels!</p>
            <button 
              className="restart-button" 
              onClick={() => {
                setCurrentLevelIndex(0);
                setGameState('start');
              }}
            >
              Play Again
            </button>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  // Handle closing the level creator
  const handleCloseLevelCreator = () => {
    setShowLevelCreator(false);
  };
  
  return (
    <div className="App">
      {/* Only show the header and main content when Level Creator is not active */}
      {!showLevelCreator && (
        <>
          <header className="App-header">
            <div className="header-left">
              {gameState === 'playing' && (
                <Hint 
                  level={levels[currentLevelIndex]}
                  foundWords={foundWords}
                  hintsRemaining={hintsRemaining}
                  onUseHint={handleUseHint}
                  onHintReceived={handleHintReceived}
                  currentGrid={currentGrid}
                />
              )}
            </div>
            
            <div className="header-center">
              <h1>WORFDALL</h1>
              <p>Sawp letetrs to from worsd.</p>
            </div>
            
            <div className="header-right">
              {/* This space intentionally left empty for balance */}
            </div>
          </header>
          <main>
            {renderContent()}
          </main>
          
          {/* Level Creator hint - only show during gameplay or at start, and only in dev mode */}
          {(gameState === 'playing' || gameState === 'start') && FEATURES.LEVEL_CREATOR && (
            <div className="keyboard-hint">
              Press <kbd>L</kbd> to open Level Creator
            </div>
          )}
        </>
      )}
      
      {/* Level Creator - only show when toggled and only in dev mode */}
      {showLevelCreator && FEATURES.LEVEL_CREATOR && (
        <LevelCreator onClose={handleCloseLevelCreator} />
      )}
    </div>
  );
}

export default App;
