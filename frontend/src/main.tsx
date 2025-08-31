import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'

import App from './App.tsx'
import './index.css'
import { Analytics } from '@vercel/analytics/react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
if (!PUBLISHABLE_KEY) {
    throw new Error('Missing Clerk Publishable Key (VITE_CLERK_PUBLISHABLE_KEY)')
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
            <App />
            <Analytics />
        </ClerkProvider>
    </StrictMode>
)
