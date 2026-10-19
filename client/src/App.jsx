import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TripProvider } from './context/TripContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { Toast } from './components/common/Toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';

import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { TripWorkspacePage } from './pages/TripWorkspacePage';
import { MyTripsPage } from './pages/MyTripsPage';
import { AiConciergePage } from './pages/AiConciergePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { JoinTripPage } from './pages/JoinTripPage';

import { useLocation } from 'react-router-dom';
import { GeminiAiBubble } from './components/home/GeminiAiBubble';

function AppLayout() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/register';

  return (
    <div className="flex flex-col min-h-screen bg-brand-sand text-brand-navy selection:bg-brand-orange selection:text-white font-sans transition-colors duration-300">
      
      {/* Top Navigation - cleanly hidden on Login/Signup pages */}
      {!isAuthPage && <Navbar />}

      {/* Page Router */}
      <main className="flex-grow pb-16 lg:pb-0">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/workspace/:tripId" element={<TripWorkspacePage />} />
          <Route path="/workspace" element={<Navigate to="/workspace/trip-goa-2026" replace />} />
          <Route path="/trips" element={<MyTripsPage />} />
          <Route path="/join/:inviteCode" element={<JoinTripPage />} />
          <Route path="/join" element={<JoinTripPage />} />
          <Route path="/ai-concierge" element={<AiConciergePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/register" element={<Navigate to="/signup" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer - cleanly hidden on Login/Signup pages */}
      {!isAuthPage && <Footer />}

      {/* Cute 3D Mascot Floating AI Buddy with Backpack - Synchronized with AI Concierge */}
      {!isAuthPage && location.pathname !== '/ai-concierge' && (
        <GeminiAiBubble />
      )}

      {/* Global Real-time Toast Notifications */}
      <Toast />

    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <TripProvider>
            <AppLayout />
          </TripProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
