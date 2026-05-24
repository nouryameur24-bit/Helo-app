import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import ViewShot from 'react-native-view-shot';

import { isFeatureEnabled } from '@/constants/featureFlags';
import { useProfile } from '@/hooks/useProfile';
import { logError } from '@/lib/logger';
import { exp } from '@/components/scan-party/scanPartyStyles';
import { PARTY_USED_KEY, type PartyResult, type Phase, type Theme } from '@/components/scan-party/scanPartyTypes';

import PhaseConfig from '@/components/scan-party/PhaseConfig';
import PhaseScan from '@/components/scan-party/PhaseScan';
import PhaseSummary from '@/components/scan-party/PhaseSummary';
import ExportCard from '@/components/scan-party/ExportCard';
import PaywallModal from '@/components/scan-party/PaywallModal';

export default function ScanPartyScreen() {
  if (!isFeatureEnabled('scanParty')) return <Redirect href="/" />;
  const { trimester } = useProfile();
  const [phase, setPhase] = useState<Phase>('config');
  const [selectedTheme, setSelectedTheme] = useState<Theme>('libre');
  const [results, setResults] = useState<PartyResult[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  const handleStart = useCallback(async () => {
    const used = await AsyncStorage.getItem(PARTY_USED_KEY);
    if (used === 'true') { setShowPaywall(true); return; }
    setResults([]);
    setPhase('scan');
  }, []);

  const handleScanResult = useCallback((r: PartyResult) => {
    setResults((prev) => {
      if (prev.some((p) => p.barcode === r.barcode)) return prev;
      return [...prev, r];
    });
  }, []);

  const handleFinish = useCallback(async () => {
    await AsyncStorage.setItem(PARTY_USED_KEY, 'true');
    setPhase('summary');
  }, []);

  const handleShare = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Export', "Le partage d'image n'est pas disponible sur web.");
      return;
    }
    try {
      setPhase('export');
      await new Promise((r) => setTimeout(r, 200));
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) throw new Error('Capture failed');
      setPhase('summary');
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Partager mon Scan Party' });
      } else {
        Alert.alert('Partage non disponible', "Votre appareil ne supporte pas le partage d'images.");
      }
    } catch (err) {
      logError('scanParty.share', err);
      setPhase('summary');
      Alert.alert('Erreur', "Impossible de générer l'image. Réessayez.");
    }
  }, []);

  const handleRestart = useCallback(async () => {
    const used = await AsyncStorage.getItem(PARTY_USED_KEY);
    if (used === 'true') { setShowPaywall(true); return; }
    setResults([]);
    setPhase('config');
  }, []);

  const handleUnlockPremium = useCallback(() => {
    Alert.alert('Premium', 'La fonctionnalité de paiement sera disponible prochainement.');
    setShowPaywall(false);
  }, []);

  return (
    <>
      {phase === 'config' && (
        <PhaseConfig
          onStart={handleStart}
          selectedTheme={selectedTheme}
          onSelectTheme={setSelectedTheme}
        />
      )}

      {phase === 'scan' && (
        <PhaseScan
          theme={selectedTheme}
          results={results}
          onScanResult={handleScanResult}
          onFinish={handleFinish}
          trimester={trimester ?? 2}
        />
      )}

      {(phase === 'summary' || phase === 'export') && (
        <PhaseSummary
          results={results}
          theme={selectedTheme}
          onShare={handleShare}
          onRestart={handleRestart}
        />
      )}

      {phase === 'export' && (
        <View style={exp.captureWrap} pointerEvents="none">
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1, width: 1080, height: 1920 }}>
            <ExportCard results={results} theme={selectedTheme} />
          </ViewShot>
        </View>
      )}

      {showPaywall && (
        <PaywallModal
          onClose={() => setShowPaywall(false)}
          onUnlock={handleUnlockPremium}
        />
      )}
    </>
  );
}
