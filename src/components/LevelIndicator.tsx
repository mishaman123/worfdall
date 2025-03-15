import React, { useState, useEffect, useRef } from 'react';
import './LevelIndicator.css';
import { levels } from '../data/levels';
import { motion, AnimatePresence } from 'framer-motion';

interface LevelIndicatorProps {
  currentLevel: number;
  totalLevels: number;
  onSwitchLevel?: (levelIndex: number) => void;
  showLevelSwitcher?: boolean;
}

const LevelIndicator: React.FC<LevelIndicatorProps> = ({ 
  currentLevel, 
  totalLevels,
  onSwitchLevel,
  showLevelSwitcher = false
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const indicatorRef = useRef<HTMLDivElement>(null);
  
  // Handle click outside to close panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (indicatorRef.current && !indicatorRef.current.contains(event.target as Node)) {
        setIsPanelOpen(false);
      }
    };
    
    if (isPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPanelOpen]);
  
  const togglePanel = () => {
    if (showLevelSwitcher && onSwitchLevel) {
      setIsPanelOpen(!isPanelOpen);
    }
  };
  
  const handleLevelSelect = (levelIndex: number) => {
    if (onSwitchLevel) {
      // If clicking the current level, restart it
      if (levelIndex === currentLevel - 1) {
        console.log(`Restarting level ${levels[levelIndex].id}`);
      }
      
      // Always call onSwitchLevel to either switch or restart
      onSwitchLevel(levelIndex);
      setIsPanelOpen(false);
    }
  };
  
  return (
    <div 
      ref={indicatorRef}
      className={`level-indicator ${showLevelSwitcher ? 'clickable' : ''}`} 
      onClick={togglePanel}
    >
      <span className="level-text">Level {currentLevel}</span>
      <div className="level-progress">
        <div 
          className="level-progress-bar" 
          style={{ width: `${(currentLevel / totalLevels) * 100}%` }}
        ></div>
      </div>
      
      {/* Clickable indicator */}
      {showLevelSwitcher && onSwitchLevel && (
        <div className="level-switcher-indicator">
          <span className="level-switcher-arrow">
            {isPanelOpen ? '▲' : '▼'}
          </span>
        </div>
      )}
      
      {/* Level Switcher Panel */}
      <AnimatePresence>
        {isPanelOpen && showLevelSwitcher && onSwitchLevel && (
          <motion.div 
            className="level-switcher-panel"
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            transition={{ 
              duration: 0.3,
              height: { duration: 0.3 },
              opacity: { duration: 0.2 }
            }}
            data-state={isPanelOpen ? "open" : "closed"}
          >
            <motion.div
              className="level-switcher-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.05 }}
            >
              <h3>Select Level</h3>
              <div className="level-buttons">
                {levels.map((level, index) => {
                  const isActive = index === currentLevel - 1;
                  return (
                    <button
                      key={level.id}
                      className={`level-button ${isActive ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent panel from closing
                        handleLevelSelect(index);
                      }}
                      title={isActive ? "Restart level" : `Switch to level ${level.id}`}
                    >
                      Level {level.id} {isActive && <span className="restart-icon">🔄</span>}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LevelIndicator; 