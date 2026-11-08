import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

export interface NativeLifecycleOptions {
  isOfferModalOpen: () => boolean;
  onDismissOffer: () => void;
}

export class NativeLifecycleService {
  private isInitialized = false;

  /**
   * Initializes native Android lifecycle handlers:
   * 1. Hides splash screen smoothly without white flash.
   * 2. Sets high-contrast dark status bar.
   * 3. Intercepts hardware back button: minimizes app instead of terminating GPS foreground service.
   */
  public async initNativeLifecycle(options: NativeLifecycleOptions): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      // 1. Configure dark status bar
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#090D16' });
    } catch {
      // Ignore if not supported on platform
    }

    try {
      // 2. Hide Splash Screen after React has rendered
      await SplashScreen.hide();
    } catch {
      // Ignore if not supported
    }

    try {
      // 3. Android Hardware Back Button Interception
      await App.addListener('backButton', async () => {
        // If an incoming 30-second offer modal is showing, back button dismisses it
        if (options.isOfferModalOpen()) {
          options.onDismissOffer();
          return;
        }

        // On main dashboard, minimize the APK to keep the foreground location service active
        await App.minimizeApp();
      });
    } catch {
      // Ignore in non-native environments
    }
  }
}

export const nativeLifecycleService = new NativeLifecycleService();

