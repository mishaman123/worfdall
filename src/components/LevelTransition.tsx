import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './LevelTransition.css';

interface LevelTransitionProps {
  levelNumber: number;
  onTransitionComplete: () => void;
}

const LevelTransition: React.FC<LevelTransitionProps> = ({ 
  levelNumber, 
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
          <h2>Level {levelNumber}</h2>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LevelTransition; 