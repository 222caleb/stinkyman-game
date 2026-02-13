import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Card from "./Card";

export default function FloatingCard({ card, from, to, onComplete, delay = 0, type = "default" }) {
  const [positions, setPositions] = useState({ from, to });

  useEffect(() => {
    setPositions({ from, to });
  }, [from, to]);

  // Different animation configs based on type
  const animationConfig = {
    play: {
      duration: 0.6,
      ease: [0.34, 1.56, 0.64, 1],
      rotate: [0, 5, -5, 0],
    },
    draw: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
      rotate: [0, 10, 0],
    },
    deal: {
      duration: 0.4,
      ease: [0.34, 1.56, 0.64, 1],
      rotate: [0, -5, 0],
    },
    default: {
      duration: 0.5,
      ease: [0.34, 1.56, 0.64, 1],
      rotate: 0,
    },
  };

  const config = animationConfig[type] || animationConfig.default;

  return (
    <motion.div
      className="fixed z-50 pointer-events-none"
      initial={{
        x: positions.from.x,
        y: positions.from.y,
        scale: 0.8,
        opacity: 0,
        rotate: 0,
      }}
      animate={{
        x: positions.to.x,
        y: positions.to.y,
        scale: 1,
        opacity: 1,
        rotate: config.rotate,
      }}
      transition={{
        duration: config.duration,
        delay,
        ease: config.ease,
      }}
      onAnimationComplete={onComplete}
    >
      <Card card={card} animate={false} />
    </motion.div>
  );
}