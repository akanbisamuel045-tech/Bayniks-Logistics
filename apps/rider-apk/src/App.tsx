import React, { useEffect } from 'react';
import { useRiderStore } from './store/riderStore';
import { TopTelemetryBar } from './components/TopTelemetryBar';
import { RiderRadarMap } from './components/RiderRadarMap';
import { IncomingJobModal } from './components/IncomingJobModal';
import { ActiveDeliverySheet } from './components/ActiveDeliverySheet';
import { nativeLifecycleService } from './services/nativeLifecycle.service';
import { io } from 'socket.io-client';
import { SOCKET_EVENTS, JobNewOffer } from '@logistics/shared-types';

export function App() {
  const {
    riderStatus,
    tripPhase,
    authToken,
    receiveJobOffer,
    declineOffer,
    triggerDemoOffer,
    simulationMode,
  } = useRiderStore();

  // Initialize native Android lifecycle: dark status bar, hide splash screen, and hardware back button
  useEffect(() => {
    nativeLifecycleService.initNativeLifecycle({
      isOfferModalOpen: () => Boolean(useRiderStore.getState().incomingOffer),
      onDismissOffer: () => {
        const offer = useRiderStore.getState().incomingOffer;
        if (offer) {
          declineOffer(offer.orderId);
        }
      },
    });
  }, [declineOffer]);

  // Network recovery listeners for offline telemetry queue auto-resync
  useEffect(() => {
    const handleOnline = () => {
      useRiderStore.getState().setNetworkConnected(true);
      useRiderStore.getState().syncOfflinePings();
    };

    const handleOffline = () => {
      useRiderStore.getState().setNetworkConnected(false);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  // Socket.io integration for real-time dispatch offers & reconnect sync
  useEffect(() => {
    if (!authToken) return;

    const socket = io(window.location.origin, {
      auth: { token: authToken },
      transports: ['websocket'],
      reconnection: true,
    });

    socket.on('connect', () => {
      useRiderStore.getState().setNetworkConnected(true);
      useRiderStore.getState().syncOfflinePings();
    });

    socket.on(SOCKET_EVENTS.JOB_NEW_OFFER, (offer: JobNewOffer) => {
      receiveJobOffer(offer);
    });

    return () => {
      socket.disconnect();
    };
  }, [authToken, receiveJobOffer]);

  return (
    <div className="relative flex flex-col h-full h-[100dvh] w-full bg-black text-white overflow-hidden select-none">
      {/* Top Floating Telemetry & Status Bar */}
      <TopTelemetryBar />

      {/* Center Radar Map & Tactical View */}
      <main className="relative flex-1 w-full flex flex-col overflow-hidden">
        <RiderRadarMap />

        {/* Idle Mode Dispatcher Waiting Indicator */}
        {tripPhase === 'idle' && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-full max-w-xs px-2 flex justify-center">
            <div className="px-3.5 py-1.5 rounded-full bg-black/90 border border-zinc-800 text-[11px] font-mono font-bold text-zinc-300 backdrop-blur-md shadow-2xl flex items-center gap-2 text-center">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  riderStatus === 'available' ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'
                }`}
              />
              <span className="truncate">
                {riderStatus === 'available'
                  ? 'Listening for nearby Lagos orders...'
                  : 'You are offline (Tap status to go online)'}
              </span>
            </div>
          </div>
        )}

        {/* Quick Demo Job Offer Trigger Button (Idle & Available) */}
        {tripPhase === 'idle' && riderStatus === 'available' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
            <button
              onClick={triggerDemoOffer}
              className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/20 border-2 border-amber-300 flex items-center gap-2 transition-transform"
            >
              <span>⚡</span>
              <span>Trigger Test Dispatch Offer (30s)</span>
            </button>
          </div>
        )}
      </main>

      {/* Active Delivery Workflow Bottom Sheet */}
      <ActiveDeliverySheet />

      {/* 30-Second Incoming Offer Modal */}
      <IncomingJobModal />
    </div>
  );
}

export default App;
