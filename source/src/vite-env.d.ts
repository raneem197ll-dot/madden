/// <reference types="vite/client" />

interface Window {
  claude?: { use: (name: string) => Promise<unknown> }
}
