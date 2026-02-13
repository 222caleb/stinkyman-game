import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function GameMessage({ message }) {
  return (
    <div className="h-6 flex items-center justify-center">
      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            key={message}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-yellow-300/90 text-xs font-medium tracking-wide text-center"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}