// Luna & Alex on your phone (Expo Go).
// Opens the hosted web app full-screen. Chat, home, calls, study, timeline
// and memories all run inside; data is saved on the phone.
import { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, BackHandler, Platform, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';

// The app built by tools/build_web.py and served by GitHub Pages.
export const APP_URL = 'https://rutuja2109.github.io/luna-alex-companion/app/';

export default function App() {
  const web = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [key, setKey] = useState(0);

  // Android back button goes back inside the app first.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && web.current) { web.current.goBack(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      {!error && (
        <WebView
          key={key}
          ref={web}
          source={{ uri: APP_URL }}
          style={s.web}
          originWhitelist={['https://*']}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled={false}
          setSupportMultipleWindows={false}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={(n) => setCanGoBack(n.canGoBack)}
          onError={(e) => setError(e.nativeEvent.description || 'Could not load the app')}
          onHttpError={(e) => setError(e.nativeEvent.statusCode === 404
            ? 'The app isn’t published yet. In GitHub: Settings → Pages → Deploy from branch → main / docs.'
            : `The app server returned ${e.nativeEvent.statusCode}.`)}
        />
      )}
      {loading && !error && (
        <View style={s.cover}><ActivityIndicator size="large" color="#7d52fb" /><Text style={s.muted}>Opening Luna & Alex…</Text></View>
      )}
      {error && (
        <View style={s.cover}>
          <Text style={s.title}>Couldn’t open the app</Text>
          <Text style={s.muted}>{error}</Text>
          <Pressable style={s.btn} onPress={() => { setError(null); setLoading(true); setKey((k) => k + 1); }}>
            <Text style={s.btnText}>Try again</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060912' },
  web: { flex: 1, backgroundColor: '#060912' },
  cover: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14, backgroundColor: '#060912' },
  title: { color: '#f4f5fb', fontSize: 20, fontWeight: '600' },
  muted: { color: '#9aa3c0', fontSize: 15, textAlign: 'center', lineHeight: 21 },
  btn: { marginTop: 8, backgroundColor: '#5a4dfd', paddingHorizontal: 26, paddingVertical: 13, borderRadius: 999 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
