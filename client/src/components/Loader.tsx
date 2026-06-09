import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const STEPS = ['Fetching repo', 'Parsing imports', 'Analyzing', 'Done']
// Rough pacing — the request usually lands during "Analyzing"
const STEP_DELAYS_MS = [0, 2500, 5000]

export default function Loader({ done }: { done: boolean }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timers = STEP_DELAYS_MS.map((delay, i) =>
      setTimeout(() => setStep((s) => Math.max(s, i)), delay),
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  const current = done ? STEPS.length - 1 : step

  return (
    <div className="flex flex-col items-center gap-6 py-20">
      <motion.div
        className="h-10 w-10 rounded-full border-[3px] border-neutral-200 border-t-accent"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
      />
      <ol className="flex flex-col gap-2">
        {STEPS.map((label, i) => {
          const state = i < current ? 'done' : i === current ? 'active' : 'pending'
          return (
            <motion.li
              key={label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: state === 'pending' ? 0.35 : 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 text-sm"
            >
              <span
                className={
                  state === 'done'
                    ? 'flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white'
                    : state === 'active'
                      ? 'flex h-5 w-5 items-center justify-center rounded-full border-2 border-accent'
                      : 'flex h-5 w-5 items-center justify-center rounded-full border-2 border-neutral-300'
                }
              >
                {state === 'done' ? '✓' : ''}
                {state === 'active' && (
                  <motion.span
                    className="h-2 w-2 rounded-full bg-accent"
                    animate={{ scale: [1, 0.6, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </span>
              <span className={state === 'active' ? 'font-medium text-neutral-900' : 'text-neutral-500'}>
                {label}
              </span>
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}
