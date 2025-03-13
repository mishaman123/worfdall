import React from 'react';
import './LevelIndicator.css';

interface LevelIndicatorProps {
  currentLevel: number;
  totalLevels: number;
}

const LevelIndicator: React.FC<LevelIndicatorProps> = ({ 
  currentLevel, 
  totalLevels 
}) => {
  return (
    <div className="level-indicator">
      <span className="level-text">Level {currentLevel}</span>
      <div className="level-progress">
        <div 
          className="level-progress-bar" 
          style={{ width: `${(currentLevel / totalLevels) * 100}%` }}
        ></div>
      </div>
    </div>
  );
};

export default LevelIndicator; 