import { motion } from 'framer-motion';

export default function LoginSuccessOverlay() {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="flex flex-col items-center gap-6"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Circle */}
        <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-green-500/20 border-4 border-green-400">
          <svg
            viewBox="0 0 52 52"
            className="w-16 h-16"
            fill="none"
            stroke="#4ade80"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M14 27 L22 35 L38 18"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2, ease: 'easeInOut' }}
            />
          </svg>
        </div>

        {/* Text */}
        <motion.p
          className="text-white text-xl font-semibold tracking-wide"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          Login Successful!
        </motion.p>
        <motion.p
          className="text-white/60 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.3 }}
        >
          Redirecting to your dashboard…
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
