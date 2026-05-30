import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // This tells Vite to make 'process' available in your browser code
  define: {
    'process.env': {} 
  }
})