import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export default function OfflineBanner() {
  const [offline, setOffline]   = useState(false);
  const [reconnected, setReconn] = useState(false);
  const slide = useRef(new Animated.Value(-60)).current;
  const was   = useRef(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const isOff = !(state.isConnected && state.isInternetReachable !== false);
      if (isOff && !was.current) {
        was.current = true; setOffline(true); setReconn(false);
        Animated.spring(slide, { toValue: 0, useNativeDriver: true }).start();
      } else if (!isOff && was.current) {
        was.current = false; setOffline(false); setReconn(true);
        setTimeout(() => {
          Animated.spring(slide, { toValue: -60, useNativeDriver: true }).start(() => setReconn(false));
        }, 2000);
      }
    });
    return () => unsub();
  }, [slide]);

  if (!offline && !reconnected) return null;
  return (
    <Animated.View style={[styles.banner, reconnected ? styles.online : styles.offline, { transform: [{ translateY: slide }] }]}>
      <Text style={styles.icon}>{offline ? '📡' : '✅'}</Text>
      <View>
        <Text style={styles.title}>{offline ? "You're offline" : 'Back online!'}</Text>
        <Text style={styles.sub}>{offline ? 'Answers will sync when reconnected' : 'Syncing…'}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner:   { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, paddingTop: 48 },
  offline:  { backgroundColor: '#1E293B' },
  online:   { backgroundColor: '#065F46' },
  icon:     { fontSize: 20 },
  title:    { fontSize: 14, fontWeight: '700', color: '#F1F5F9' },
  sub:      { fontSize: 12, color: '#94A3B8' },
});
