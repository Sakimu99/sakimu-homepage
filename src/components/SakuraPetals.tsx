const PETALS = [
  { left: '4%', size: 18, duration: 13, delay: 0 },
  { left: '14%', size: 12, duration: 17, delay: 3 },
  { left: '26%', size: 22, duration: 15, delay: 6 },
  { left: '38%', size: 14, duration: 19, delay: 1.5 },
  { left: '50%', size: 18, duration: 14, delay: 8 },
  { left: '62%', size: 12, duration: 18, delay: 4 },
  { left: '72%', size: 20, duration: 16, delay: 10 },
  { left: '84%', size: 14, duration: 20, delay: 2 },
  { left: '93%', size: 16, duration: 15, delay: 7 },
]

/** Decorative falling sakura petals. Render inside a relative container. */
export default function SakuraPetals() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="petal"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
