import React, { useEffect, useState } from 'react';
import { useRiderStore } from './store/riderStore';
import { nativeLifecycleService } from './services/nativeLifecycle.service';
import { io } from 'socket.io-client';
import { SOCKET_EVENTS, JobNewOffer } from '@logistics/shared-types';
import { MobileAppShell } from './components/MobileAppShell';
import { HeroEspressoCard } from './components/HeroEspressoCard';
import { AvailabilityBar } from './components/AvailabilityBar';
import { CenterMissionCard } from './components/CenterMissionCard';
import { NearbySurgeRadar } from './components/NearbySurgeRadar';
import { FullMapScreen } from './components/FullMapScreen';
import { DispatchOfferSheet } from './components/sheets/DispatchOfferSheet';
import { HandoverVerifySheet } from './components/sheets/HandoverVerifySheet';
import { RiderProfileScreen } from './components/RiderProfileScreen';
import { EditProfileModal } from './components/sheets/EditProfileModal';
import { DynamicDetailSheet, DynamicDetailSheetType } from './components/sheets/DynamicDetailSheet';
import { RiderLandingScreen } from './components/RiderLandingScreen';
import { RiderAuthModal } from './components/RiderAuthModal';
import { RiderKycScreen } from './components/RiderKycScreen';
import { DeliveryHistoryScreen } from './components/DeliveryHistoryScreen';
import { RiderNavigationDrawer, DrawerNavTarget } from './components/RiderNavigationDrawer';
import { RiderCockpitMapHome } from './components/RiderCockpitMapHome';
import { RiderInboxScreen } from './components/RiderInboxScreen';
import { RiderSettingsScreen } from './components/RiderSettingsScreen';
import { DriverScoreActivityScreen } from './components/DriverScoreActivityScreen';
import { RiderEarningsDualScreen } from './components/RiderEarningsDualScreen';
import { VirtualDebtTopUpModal } from './components/sheets/VirtualDebtTopUpModal';
import { MockLocationWarningModal } from './components/MockLocationWarningModal';
import { batteryOptimizationService } from './services/batteryOptimization.service';

export function App() {
  const {
    isLoggedIn,
    riderStatus,
    tripPhase,
    authToken,
    incomingOffer,
    acceptOffer,
    receiveJobOffer,
    declineOffer,
    triggerDemoOffer,
    simulationMode,
    activeTab,
    setActiveTab,
    showToast,
    isDrawerOpen,
    setDrawerOpen,
    isAuthModalOpen,
    setAuthModalOpen,
    walletBalanceKobo,
    isDebtLocked,
    topUpWallet,
    setBatteryStatus,
    isMockLocationDetected,
    mockLocationReason,
    setMockLocation,
  } = useRiderStore();

  // Navigation and Sheet state
  const [isFullMapOpen, setIsFullMapOpen] = useState(false);
  const [isDebtTopUpOpen, setIsDebtTopUpOpen] = useState(false);
  const [isHandoverVerifyOpen, setIsHandoverVerifyOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('view') === 'verify';
  });
  const [handoverVerifyMode, setHandoverVerifyMode] = useState<'qr' | 'otp'>(() => {
    if (typeof window === 'undefined') return 'qr';
    return new URLSearchParams(window.location.search).get('verifyMode') === 'otp' ? 'otp' : 'qr';
  });
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [detailSheetType, setDetailSheetType] = useState<DynamicDetailSheetType>('personal');
  const [scoreActivityInitialTab, setScoreActivityInitialTab] = useState<'score' | 'activity'>('activity');
  const [authModalMode, setAuthModalMode] = useState<'welcome' | 'login_options' | 'login' | 'register' | 'otp_method' | 'otp'>('login');
  const [forceLandingView, setForceLandingView] = useState(false);

  // Restore saved rider session from localStorage on app boot
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedAuth = window.localStorage.getItem('bayniks_rider_auth');
        if (savedAuth) {
          const parsed = JSON.parse(savedAuth);
          if (parsed && parsed.authToken && parsed.riderUser) {
            useRiderStore.setState({
              isLoggedIn: true,
              authToken: parsed.authToken,
              riderUser: parsed.riderUser,
              riderName: parsed.riderUser.fullName || 'Rider',
              plateNumber: parsed.riderUser.plateNumber || '',
              simulationMode: false,
            });
          }
        }
      }
    } catch {}
  }, []);

  // URL query parameter support for view deep-linking & QA inspection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const phaseParam = params.get('phase');

    if (viewParam === 'drawer') {
      useRiderStore.setState({ isLoggedIn: true });
      setForceLandingView(false);
      setActiveTab('home');
      setDrawerOpen(true);
    } else if (viewParam === 'home' || viewParam === 'cockpit') {
      useRiderStore.setState({ isLoggedIn: true });
      setForceLandingView(false);
      setActiveTab('home');
    } else if (viewParam === 'landing' || viewParam === 'welcome') {
      setForceLandingView(true);
    } else if (viewParam === 'login') {
      setAuthModalMode('login');
      setAuthModalOpen(true);
    } else if (viewParam === 'register') {
      setAuthModalMode('register');
      setAuthModalOpen(true);
    } else if (viewParam === 'otp_method' || viewParam === 'method') {
      setAuthModalMode('otp_method');
      setAuthModalOpen(true);
    } else if (viewParam === 'otp') {
      setAuthModalMode('otp');
      setAuthModalOpen(true);
    } else if (viewParam === 'history') {
      setActiveTab('history');
    } else if (viewParam === 'inbox') {
      setActiveTab('inbox');
    } else if (viewParam === 'settings') {
      setActiveTab('settings');
    } else if (viewParam === 'score') {
      useRiderStore.setState({ isLoggedIn: true });
      setForceLandingView(false);
      const tabQ = params.get('tab');
      setScoreActivityInitialTab(tabQ === 'activity' ? 'activity' : 'score');
      setActiveTab('score');
    } else if (viewParam === 'activity' || viewParam === 'confirm_rate') {
      useRiderStore.setState({ isLoggedIn: true });
      setForceLandingView(false);
      setScoreActivityInitialTab('activity');
      setActiveTab('score');
    } else if (viewParam === 'earnings' || viewParam === 'earnings_dual' || viewParam === 'balances') {
      useRiderStore.setState({ isLoggedIn: true });
      setForceLandingView(false);
      setActiveTab('earnings_dual');
    } else if (viewParam === 'kyc') {
      setActiveTab('kyc');
    } else if (viewParam === 'profile') {
      setActiveTab('profile');
    } else if (viewParam === 'chat' || viewParam === 'support') {
      setActiveTab('profile');
      setDetailSheetType('support_sos');
      setIsDetailSheetOpen(true);
    } else if (viewParam === 'map') {
      setIsFullMapOpen(true);
    } else if (viewParam === 'verify') {
      const modeQ = params.get('verifyMode');
      setHandoverVerifyMode(modeQ === 'otp' ? 'otp' : 'qr');
      setIsHandoverVerifyOpen(true);
    } else if (viewParam === 'offer') {
      triggerDemoOffer();
    } else if (viewParam === 'confirm_price') {
      useRiderStore.setState({
        isLoggedIn: true,
        tripPriceConfirmation: {
          cashKobo: 40000,
          subsidyKobo: 10000,
          totalKobo: 50000,
          customerName: 'Ebi',
          tripId: 'TRIP-884920',
        },
      });
      setActiveTab('home');
    } else if (viewParam === 'debt') {
      setIsDebtTopUpOpen(true);
    } else if (viewParam === 'mock') {
      setMockLocation(true, 'Android Fake GPS provider detected');
    }

    if (phaseParam) {
      useRiderStore.setState({
        tripPhase: phaseParam as any,
        riderStatus: 'busy',
        activeOrder: {
          _id: 'ord-preview-473215090',
          trackingCode: '#473215090',
          status:
            phaseParam === 'arriving_pickup'
              ? 'rider_assigned'
              : phaseParam === 'at_pickup'
              ? 'arrived_pickup'
              : phaseParam === 'in_transit'
              ? 'in_transit'
              : 'at_dropoff',
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
  }, [setActiveTab, setDrawerOpen, setAuthModalOpen, triggerDemoOffer]);

  // Initialize native Android lifecycle: dark status bar, hide splash screen, and hardware back button
  useEffect(() => {
    nativeLifecycleService.initNativeLifecycle({
      isOfferModalOpen: () => Boolean(incomingOffer),
      onDismissOffer: () => {
        if (incomingOffer) {
          declineOffer(incomingOffer.orderId);
        }
      },
    });
  }, [incomingOffer, declineOffer]);

  // Initialize hardware battery monitoring and auto-throttling (Feature 7)
  useEffect(() => {
    batteryOptimizationService.initBatteryMonitoring().then((status) => {
      setBatteryStatus(status.levelPercent, status.isCharging);
    });
    const unsubscribe = batteryOptimizationService.addListener((status) => {
      setBatteryStatus(status.levelPercent, status.isCharging);
      if (status.isLowBatteryThrottled) {
        showToast('⚠️ Battery ≤ 15%: GPS tracking auto-throttled to 15s to conserve power');
      }
    });
    return () => {
      unsubscribe();
    };
  }, [setBatteryStatus, showToast]);

  // Socket.io real-time dispatch listener
  useEffect(() => {
    if (!authToken || simulationMode) return;

    const socketUrl = (import.meta as any).env?.VITE_WS_URL || 'http://localhost:4000';
    const socket = io(socketUrl, {
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      // connected
    });

    socket.on(SOCKET_EVENTS.JOB_NEW_OFFER, (offer: JobNewOffer) => {
      receiveJobOffer(offer);
    });

    return () => {
      socket.disconnect();
    };
  }, [authToken, simulationMode, receiveJobOffer]);

  const handleDrawerNavigate = (target: DrawerNavTarget) => {
    if (target === 'home') {
      setActiveTab('home');
    } else if (target === 'history') {
      setActiveTab('history');
    } else if (target === 'kyc') {
      setActiveTab('kyc');
    } else if (target === 'earnings') {
      setActiveTab('earnings_dual');
    } else if (target === 'bank') {
      setActiveTab('profile');
      setDetailSheetType('bank');
      setIsDetailSheetOpen(true);
    } else if (target === 'vehicle') {
      setActiveTab('profile');
      setDetailSheetType('vehicle');
      setIsDetailSheetOpen(true);
    } else if (target === 'support_sos') {
      setActiveTab('profile');
      setDetailSheetType('support_sos');
      setIsDetailSheetOpen(true);
    } else if (target === 'chat') {
      setActiveTab('profile');
      setDetailSheetType('support_sos');
      setIsDetailSheetOpen(true);
    } else if (target === 'auth') {
      setAuthModalMode('login');
      setAuthModalOpen(true);
    } else if (target === 'scheduled') {
      setActiveTab('history');
      showToast('0 open scheduled delivery requests');
    } else if (target === 'portal') {
      showToast('Opening Bayniks Rider Web Portal...');
    } else if (target === 'privacy') {
      showToast('Opening Bayniks Privacy Policy...');
    } else if ((target as any) === 'settings') {
      setActiveTab('settings');
    }
  };

  const showLanding = forceLandingView || (!isLoggedIn && activeTab === 'home');

  return (
    <MobileAppShell
      hideNav={isFullMapOpen || activeTab === 'kyc' || activeTab === 'earnings_dual' || activeTab === 'earnings' || activeTab === 'score' || showLanding}
      onOpenQr={() => {
        setHandoverVerifyMode('qr');
        setIsHandoverVerifyOpen(true);
      }}
      onSelectTab={(tab) => {
        setActiveTab(tab);
      }}
    >
      {/* Scrollable Mobile Viewport Stage: Landing, Cockpit, Inbox, Rides, Settings, Score, Earnings Dual or KYC */}
      <main className={`mobile-scroll-stage ${activeTab === 'kyc' || activeTab === 'home' || activeTab === 'history' || activeTab === 'earnings_dual' || activeTab === 'earnings' || activeTab === 'score' || showLanding ? '!p-0' : ''}`}>
        {showLanding ? (
          <RiderLandingScreen
            onSignIn={() => {
              setAuthModalMode('login');
              setAuthModalOpen(true);
            }}
            onRegister={() => {
              setAuthModalMode('register');
              setAuthModalOpen(true);
            }}
          />
        ) : (
          <>
            {activeTab === 'home' && (
              <section id="screen-home" className="tab-screen active h-full flex flex-col">
                <RiderCockpitMapHome
                  onOpenDrawer={() => setDrawerOpen(true)}
                  onOpenSafety={() => {
                    setDetailSheetType('support_sos');
                    setIsDetailSheetOpen(true);
                  }}
                  onOpenFullMap={() => setIsFullMapOpen(true)}
                  onOpenEarnings={() => {
                    setActiveTab('earnings_dual');
                  }}
                  onOpenDriverScore={(subTab) => {
                    setScoreActivityInitialTab(subTab === 'score' ? 'score' : 'activity');
                    setActiveTab('score');
                  }}
                  onOpenScheduledOrders={() => {
                    setActiveTab('history');
                  }}
                  onOpenVerification={(mode) => {
                    setHandoverVerifyMode(mode || 'qr');
                    setIsHandoverVerifyOpen(true);
                  }}
                />
              </section>
            )}

            {activeTab === 'inbox' && (
              <RiderInboxScreen
                onOpenEarnings={() => setActiveTab('earnings_dual')}
              />
            )}

            {activeTab === 'history' && (
              <DeliveryHistoryScreen onBack={() => setActiveTab('home')} />
            )}

            {activeTab === 'profile' && (
              <RiderSettingsScreen
                onOpenKyc={() => setActiveTab('kyc')}
                onOpenSupport={() => {
                  setDetailSheetType('support_sos');
                  setIsDetailSheetOpen(true);
                }}
                onOpenDrawer={() => setDrawerOpen(true)}
              />
            )}

            {activeTab === 'settings' && (
              <RiderSettingsScreen
                onOpenKyc={() => setActiveTab('kyc')}
                onOpenSupport={() => {
                  setDetailSheetType('support_sos');
                  setIsDetailSheetOpen(true);
                }}
                onOpenDrawer={() => setDrawerOpen(true)}
              />
            )}

            {activeTab === 'score' && (
              <DriverScoreActivityScreen
                initialTab={scoreActivityInitialTab}
                onBack={() => setActiveTab('home')}
              />
            )}

            {(activeTab === 'earnings_dual' || activeTab === 'earnings') && (
              <RiderEarningsDualScreen
                onBack={() => setActiveTab('home')}
                onOpenCashout={() => {
                  setDetailSheetType('cashout');
                  setIsDetailSheetOpen(true);
                }}
                onOpenHistory={() => setActiveTab('history')}
                onOpenDebtTopUp={() => setIsDebtTopUpOpen(true)}
              />
            )}

            {activeTab === 'kyc' && (
              <RiderKycScreen
                onBack={() => {
                  setForceLandingView(false);
                  setActiveTab('home');
                }}
                onComplete={() => {
                  setForceLandingView(false);
                  setActiveTab('home');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Left Navigation Sidebar Drawer */}
      <RiderNavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={handleDrawerNavigate}
      />

      {/* Dispatch Rider Login & Account Creation Modal */}
      <RiderAuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onCompleteRegistration={() => {
          setAuthModalOpen(false);
          setForceLandingView(false);
          setActiveTab('kyc');
        }}
      />

      {/* Edge-to-Edge Full-View Lagos Map Overlay (#fullMapScreen, z-index: 95) */}
      <FullMapScreen
        isOpen={isFullMapOpen}
        onClose={() => setIsFullMapOpen(false)}
        onOpenVerification={(mode) => {
          setHandoverVerifyMode(mode || 'qr');
          setIsHandoverVerifyOpen(true);
        }}
      />

      {/* 30-Second Incoming Offer Modal */}
      <DispatchOfferSheet
        isOpen={Boolean(incomingOffer)}
        onAccept={() => {
          if (incomingOffer) {
            acceptOffer(incomingOffer.orderId);
          }
        }}
        onDecline={() => {
          if (incomingOffer) {
            declineOffer(incomingOffer.orderId);
          }
        }}
      />

      {/* Proof of Delivery Handover Verification (QR Scanner & 4-Digit OTP) */}
      <HandoverVerifySheet
        isOpen={isHandoverVerifyOpen}
        initialMode={handoverVerifyMode}
        onClose={() => setIsHandoverVerifyOpen(false)}
        onVerified={(proof) => {
          showToast(`Handover Verified: ${proof}`);
          setIsHandoverVerifyOpen(false);
        }}
      />

      {/* Edit Profile & Settlement Bank Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />

      {/* Modular Dynamic Detail Sheet */}
      <DynamicDetailSheet
        isOpen={isDetailSheetOpen}
        viewType={detailSheetType}
        onClose={() => setIsDetailSheetOpen(false)}
        onOpenEditProfile={() => {
          setIsDetailSheetOpen(false);
          setIsEditProfileOpen(true);
        }}
        onOpenCashout={() => {
          setDetailSheetType('cashout');
        }}
        onOpenDebtTopUp={() => {
          setIsDebtTopUpOpen(true);
        }}
      />

      {/* Feature 2: In-App Paystack Virtual Debt Clearance Modal */}
      <VirtualDebtTopUpModal
        isOpen={isDebtTopUpOpen}
        onClose={() => setIsDebtTopUpOpen(false)}
        currentBalanceKobo={walletBalanceKobo}
        onTopUpSuccess={async (amountKobo) => {
          await topUpWallet(amountKobo);
          showToast(`Paystack payment of ₦${Math.floor(amountKobo / 100).toLocaleString('en-NG')} confirmed. Account updated!`);
        }}
      />

      {/* Feature 7: Anti-Cheat Mock Location (Fake GPS) Warning Modal */}
      <MockLocationWarningModal
        isOpen={isMockLocationDetected}
        reason={mockLocationReason || undefined}
        onDismiss={() => setMockLocation(false)}
        onRecheckLocation={() => {
          setMockLocation(false);
          showToast('Rechecking GPS sensor telemetry...');
        }}
      />
    </MobileAppShell>
  );
}

export default App;
