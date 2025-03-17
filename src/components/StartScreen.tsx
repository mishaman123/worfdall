import React from 'react';
import './StartScreen.css';

interface StartScreenProps {
  onStart: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  return (
    <div className="start-screen">
      <div className="instructions">
        <h2>How to Play:</h2>
        <p>1. Swap adjacent letters to form words.</p>
        <p>2. Valid words will be cleared.</p>
        <p>3. Clear all words to complete the level.</p>
      </div>
      <button className="start-button" onClick={onStart}>
        Start Game
      </button>
    </div>
  );
};

export default StartScreen; 