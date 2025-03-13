import React from 'react';
import './LevelSwitcher.css';
import { levels } from '../data/levels';

interface LevelSwitcherProps {
  currentLevel: number;
  onSwitchLevel: (levelIndex: number) => void;
}

const LevelSwitcher: React.FC<LevelSwitcherProps> = ({ 
  currentLevel, 
  onSwitchLevel 
}) => {
  return (
    <div className="level-switcher">
      <h3>Test Mode: Level Switcher</h3>
      <div className="level-buttons">
        {levels.map((level, index) => (
          <button
            key={level.id}
            className={`level-button ${index === currentLevel ? 'active' : ''}`}
            onClick={() => onSwitchLevel(index)}
          >
            Level {level.id}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LevelSwitcher; 