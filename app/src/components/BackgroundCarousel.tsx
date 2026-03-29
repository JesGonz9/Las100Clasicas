import { useState, useEffect } from 'react'

const IMAGES = ['/riglos.webp', '/torresanta.webp', '/urriello.webp']
const INTERVAL = 10000 // 10 seconds

interface Props {
  overlay?: string
  fixed?: boolean
}

export function BackgroundCarousel({ overlay = 'bg-white/80 backdrop-blur-[3px]', fixed = true }: Props) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % IMAGES.length)
    }, INTERVAL)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className={`${fixed ? 'fixed -z-10' : 'absolute z-0'} inset-0`}>
      {IMAGES.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ease-in-out"
          style={{
            backgroundImage: `url('${src}')`,
            opacity: i === current ? 1 : 0,
          }}
        />
      ))}
      <div className={`absolute inset-0 ${overlay}`} />
    </div>
  )
}
