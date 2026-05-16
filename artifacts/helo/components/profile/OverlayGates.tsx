import React, { useEffect } from 'react';
import { BreastfeedingTransition } from '@/components/BreastfeedingTransition';
import { NotificationPermissionScreen } from '@/components/NotificationPermissionScreen';
import { useBreastfeeding } from '@/hooks/useBreastfeeding';
import { useNotifications } from '@/hooks/useNotifications';

export function OverlayGates() {
  const {
    showPermissionScreen,
    setShowPermissionScreen,
    requestPermission,
    dismissPermissionScreen,
    triggerPermissionScreenIfNeeded,
  } = useNotifications();

  useEffect(() => {
    triggerPermissionScreenIfNeeded();
  }, [triggerPermissionScreenIfNeeded]);

  const {
    showTransition: showBFTransition,
    changedProductsCount: bfChangedCount,
    dismissTransition: dismissBFTransition,
  } = useBreastfeeding();

  return (
    <>
      <NotificationPermissionScreen
        visible={showPermissionScreen}
        onAllow={async () => {
          await requestPermission();
          setShowPermissionScreen(false);
        }}
        onSkip={dismissPermissionScreen}
      />
      <BreastfeedingTransition
        visible={showBFTransition}
        changedProductsCount={bfChangedCount}
        onDismiss={dismissBFTransition}
      />
    </>
  );
}
