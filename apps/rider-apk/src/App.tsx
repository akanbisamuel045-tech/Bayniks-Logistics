import React, { useEffect, useState } from 'react';
import { useRiderStore } from './store/riderStore';
import { TopTelemetryBar } from './components/TopTelemetryBar';
import { RiderRadarMap } from './components/RiderRadarMap';
import { IncomingJobModal } from './components/IncomingJobModal';
import { ActiveDeliverySheet } from './components/ActiveDeliverySheet';
import { RiderNavigationDrawer, RiderActiveView } from './components/RiderNavigationDrawer';
import { RiderEarningsSheet } from './components/RiderEarningsSheet';
import { RiderChatSheet } from './components/RiderChatSheet';
import { RiderSupportSheet } from './components/RiderSupportSheet';
import { RiderProfileSheet } from './components/RiderProfileSheet';
import { nativeLifecycleService } from './services/nativeLifecycle.service';
import { io } from 'socket.io-client';
import { SOCKET_EVENTS, JobNewOffer } from '@logistics/shared-types';
import { Zap } from 'lucide-react';

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

  // Navigation and Sheet state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeView, setActiveView] = useState<RiderActiveView>('radar');
  const [isSunlightMode, setIsSunlightMode] = useState(false);

  // URL query parameter support for view deep-linking & QA inspection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const phaseParam = params.get('phase');
    const modeParam = params.get('mode');

    if (modeParam === 'sunlight') {
      setIsSunlightMode(true);
    }

    if (viewParam === 'drawer') {
      setIsDrawerOpen(true);
    } else if (viewParam === 'earnings' || viewParam === 'chat' || viewParam === 'support' || viewParam === 'profile') {
      setActiveView(viewParam);
    } else if (viewParam === 'offer') {
      triggerDemoOffer();
    }

    if (phaseParam) {
      useRiderStore.setState({
        tripPhase: phaseParam as any,
        riderStatus: 'busy',
        activeOrder: {
          _id: 'ord-preview-473215090',
          trackingCode: '#473215090',
          status: phaseParam === 'arriving_pickup' ? 'rider_assigned' : phaseParam === 'at_pickup' ? 'arrived_pickup' : phaseParam === 'in_transit' ? 'in_transit' : 'at_dropoff',
          vehicleType: 'bike',
          paymentMethod: 'wallet',
          totalFareKobo: 250000,
          riderEarningKobo: 200000,
          estimatedDistanceKm: 4.2,
          pickup: {
            address: 'Otigba Street, Computer Village, Ikeja, Lagos',
            landmark: 'Beside slot main building, Yellow canopy',
            location: { lat: 6.5933, lng: 3.3421 },
            contactName: 'Sarah Johnson (Sender)',
            contactPhone: '+2348021112233',
          },
          stops: [
            {
              sequenceNumber: 1,
              recipientName: 'Michael Chen (Recipient)',
              recipientPhone: '+2348034445566',
              dropoffAddress: 'Victoria Island Towers, Plot 4, Lagos',
              dropoffLandmark: 'Beside Civic Centre, Waterfront Gate',
              dropoffLocation: { lat: 6.4312, lng: 3.4256 },
              packageDescription: 'Business documents • Express Bike',
              status: 'pending',
            },
          ],
        },
      });
    }
  }, []);

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

    socket.on(SOCKET_EVENTS.CHAT_MESSAGE_RECEIVED, (msg: any) => {
      useRiderStore.getState().receiveChatMessage({
        id: msg._id || 'm-' + Date.now(),
        sender: msg.senderRole === 'rider' ? 'rider' : 'customer',
        text: msg.text,
        time: msg.createdAt
          ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'Now',
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [authToken, receiveJobOffer]);

  return (
    <div
      className={`relative flex flex-col h-full h-[100dvh] w-full overflow-hidden select-none transition-colors duration-200 ${
        isSunlightMode ? 'bg-zinc-900 text-white font-semibold' : 'bg-[#0E1013] text-white'
      }`}
    >
      {/* Top Floating Telemetry & Status Bar */}
      <TopTelemetryBar
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenEarnings={() => setActiveView('earnings')}
      />

      {/* Center Radar Map & Tactical View */}
      <main className="relative flex-1 w-full flex flex-col overflow-hidden">
        <RiderRadarMap />

        {/* Idle Mode Dispatcher Waiting Indicator */}
        {tripPhase === 'idle' && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-full max-w-xs px-2 flex justify-center">
            <div className="px-3.5 py-1.5 rounded-full bg-[#0E1013]/95 border border-zinc-800 text-[11px] font-mono font-bold text-zinc-300 backdrop-blur-md shadow-2xl flex items-center gap-2 text-center">
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
              className="px-4 py-2.5 rounded-2xl bg-[#FF6D1F] hover:bg-orange-600 active:scale-95 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-orange-500/30 border border-orange-400 flex items-center gap-2 transition-transform"
            >
              <Zap className="w-4 h-4 text-white" />
              <span>Trigger Test Dispatch Offer (30s)</span>
            </button>
          </div>
        )}
      </main>

      {/* Active Delivery Workflow Bottom Sheet */}
      <ActiveDeliverySheet
        onOpenChat={() => setActiveView('chat')}
        onOpenSupport={() => setActiveView('support')}
      />

      {/* 30-Second Incoming Offer Modal */}
      <IncomingJobModal />

      {/* Rider Navigation Drawer */}
      <RiderNavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeView={activeView}
        onSelectView={(view) => setActiveView(view)}
        isSunlightMode={isSunlightMode}
        onToggleSunlightMode={() => setIsSunlightMode(!isSunlightMode)}
      />

      {/* Shift Earnings & Cashout View */}
      <RiderEarningsSheet
        isOpen={activeView === 'earnings'}
        onClose={() => setActiveView('radar')}
      />

      {/* Customer Live Chat View */}
      <RiderChatSheet
        isOpen={activeView === 'chat'}
        onClose={() => setActiveView('radar')}
      />

      {/* 24/7 Safety & SOS Support View */}
      <RiderSupportSheet
        isOpen={activeView === 'support'}
        onClose={() => setActiveView('radar')}
      />

      {/* Rider & Vehicle Profile Settings View */}
      <RiderProfileSheet
        isOpen={activeView === 'profile'}
        onClose={() => setActiveView('radar')}
        isSunlightMode={isSunlightMode}
        onToggleSunlightMode={() => setIsSunlightMode(!isSunlightMode)}
      />
    </div>
  );
}

export default App;
