import React, { useState } from 'react';
import './App.css';
import GameGrid from './components/GameGrid';
import StartScreen from './components/StartScreen';
import LevelTransition from './components/LevelTransition';
import LevelIndicator from './components/LevelIndicator';
import LevelSwitcher from './components/LevelSwitcher';
import { levels } from './data/levels';

// Game states
type GameState = 'start' | 'playing' | 'transition' | 'complete';

function App() {
  const [gameState, setGameState] = useState<GameState>('start');
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  
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
  
  return (
    <div className="App">
      <header className="App-header">
        <h1>WORFDALL</h1>
        <p>Sawp letetrs to from worsd.</p>
      </header>
      <main>
        {renderContent()}
      </main>
      
      {/* Level Switcher for testing - only show during gameplay or at start */}
      {(gameState === 'playing' || gameState === 'start') && (
        <LevelSwitcher 
          currentLevel={currentLevelIndex}
          onSwitchLevel={handleSwitchLevel}
        />
      )}
    </div>
  );
}

export default App;
