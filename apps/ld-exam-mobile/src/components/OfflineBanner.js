import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);
  const translateY = useRef(new Animated.Value(-60)).current;
  const wasOffline = useRef(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);

      if (offline && !wasOffline.current) {
        wasOffline.current = true;
        setIsOffline(true);
        setJustReconnected(false);
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
      } else if (!offline && wasOffline.current) {
        wasOffline.current = false;
        setIsOffline(false);
        setJustReconnected(true);
        // Show "back online" briefly then slide away
        setTimeout(() => {
          Animated.spring(translateY, { toValue: -60, useNativeDriver: true, tension: 80, friction: 12 }).start(() => {
            setJustReconnected(false);
          });
        }, 2200);
      }
    });
    return () => unsub();
  }, [translateY]);

  if (!isOffline && !justReconnected) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        justReconnected ? styles.bannerOnline : styles.bannerOffline,
        { transform: [{ translateY }] },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={isOffline ? 'You are offline' : 'Back online'}
    >
      <Text style={styles.icon}>{isOffline ? '📡' : '✅'}</Text>
      <View>
        <Text style={styles.title}>
          {isOffline ? 'You\'re offline' : 'Back online!'}
        </Text>
        <Text style={styles.sub}>
          {isOffline
            ? 'Practice continues — answers will sync when reconnected'
            : 'Syncing your progress…'
          }
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingTop: 48,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  bannerOffline: { backgroundColor: '#1E293B' },
  bannerOnline:  { backgroundColor: '#065F46' },
  icon:  { fontSize: 22 },
  title: { fontSize: 14, fontWeight: '700', color: '#F1F5F9', lineHeight: 20 },
  sub:   { fontSize: 12, color: '#94A3B8', lineHeight: 16 },
});
