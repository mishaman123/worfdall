import React, { useState, useEffect } from 'react';
import './App.css';
import GameGrid from './components/GameGrid';
import StartScreen from './components/StartScreen';
import LevelTransition from './components/LevelTransition';
import LevelIndicator from './components/LevelIndicator';
import LevelSwitcher from './components/LevelSwitcher';
import LevelCreator from './components/LevelCreator';
import { levels } from './data/levels';
import { FEATURES } from './utils/devMode';

// Game states
type GameState = 'start' | 'playing' | 'transition' | 'complete';

function App() {
  const [gameState, setGameState] = useState<GameState>('start');
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [showLevelCreator, setShowLevelCreator] = useState(false);
  
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
        console.log('Level creator opened');
        setShowLevelCreator(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showLevelCreator]);
  
  // Start the game
  const handleStartGame = () => {
    setGameState('playing');
  };
  
  // Handle level completion
  const handleLevelComplete = () => {
    console.log(`Level ${levels[currentLevelIndex].id} completed!`);
    
    // Add a small delay to ensure all animations are complete
    setTimeout(() => {
      if (currentLevelIndex < levels.length - 1) {
        // More levels to play
        console.log(`Transitioning to level ${levels[currentLevelIndex + 1].id}`);
        setGameState('transition');
      } else {
        // Game complete
        console.log('All levels completed! Game over!');
        setGameState('complete');
      }
    }, 500);
  };
  
  // Handle transition completion
  const handleTransitionComplete = () => {
    if (currentLevelIndex < levels.length - 1) {
      // Move to next level
      setCurrentLevelIndex(prev => prev + 1);
      setGameState('playing');
      console.log(`Now playing level ${currentLevelIndex + 2}`);
    }
  };
  
  // Handle level switching for testing
  const handleSwitchLevel = (levelIndex: number) => {
    setCurrentLevelIndex(levelIndex);
    setGameState('playing');
    console.log(`Switched to level ${levels[levelIndex].id} for testing`);
  };
  
  // Render content based on game state
  const renderContent = () => {
    switch (gameState) {
      case 'start':
        return <StartScreen onStart={handleStartGame} />;
      
      case 'playing':
        return (
          <>
            <LevelIndicator 
              currentLevel={levels[currentLevelIndex].id} 
              totalLevels={levels.length} 
            />
            <GameGrid 
              level={levels[currentLevelIndex]} 
              onLevelComplete={handleLevelComplete} 
            />
          </>
        );
      
      case 'transition':
        return (
          <LevelTransition 
            levelNumber={levels[currentLevelIndex + 1].id} 
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
            <h1>WORFDALL</h1>
            <p>Sawp letetrs to from worsd.</p>
          </header>
          <main>
            {renderContent()}
          </main>
          
          {/* Level Switcher for testing - only show during gameplay or at start, and only in dev mode */}
          {(gameState === 'playing' || gameState === 'start') && FEATURES.LEVEL_SWITCHER && (
            <>
              <LevelSwitcher 
                currentLevel={currentLevelIndex}
                onSwitchLevel={handleSwitchLevel}
              />
              {FEATURES.LEVEL_CREATOR && (
                <div className="keyboard-hint">
                  Press <kbd>L</kbd> to open Level Creator
                </div>
              )}
            </>
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
