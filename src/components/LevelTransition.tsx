import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './LevelTransition.css';

interface LevelTransitionProps {
  levelNumber: number;
  levelTheme?: string;
  onTransitionComplete: () => void;
}

const LevelTransition: React.FC<LevelTransitionProps> = ({ 
  levelNumber, 
  levelTheme,
  onTransitionComplete 
}) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    // After 2 seconds, start fading out
    const timer = setTimeout(() => {
      setVisible(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // When fade out animation completes, call the callback
  const handleAnimationComplete = () => {
    if (!visible) {
      onTransitionComplete();
    }
  };
  
  return (
    <AnimatePresence onExitComplete={handleAnimationComplete}>
      {visible && (
        <motion.div 
          className="level-transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        >
          <motion.h2
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              times: [0, 0.5, 1]
            }}
          >
            Level {levelNumber}
          </motion.h2>
          {levelTheme && <h3 className="level-transition-theme">{levelTheme}</h3>}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LevelTransition; 