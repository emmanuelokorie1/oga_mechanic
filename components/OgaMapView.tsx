import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapViewRef {
  animateToRegion: (region: MapRegion, duration?: number) => void;
}

export interface MapViewProps {
  children?: React.ReactNode;
  style?: any;
  initialRegion?: MapRegion;
  showsUserLocation?: boolean;
  onRegionChangeComplete?: (region: MapRegion) => void;
  [key: string]: any;
}

export const MapView = forwardRef<MapViewRef, MapViewProps>((props, ref) => {
  const { children, style, initialRegion, ...rest } = props;
  const webViewRef = useRef<WebView>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region: MapRegion, duration: number = 1000) => {
      if (isMapLoaded) {
        const script = `
          if (window.map) {
            window.map.flyTo([${region.latitude}, ${region.longitude}], 15, {
              duration: ${duration / 1000}
            });
          }
        `;
        webViewRef.current?.injectJavaScript(script);
      }
    },
  }));

  const markers = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      const childProps = child.props as any;
      if (childProps.coordinate) {
        return {
          lat: childProps.coordinate.latitude,
          lng: childProps.coordinate.longitude,
          type: childProps.type || 'default'
        };
      }
    }
    return null;
  })?.filter((m: any) => m !== null) || [];

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100vw; background: #f3f4f6; }
          .custom-marker {
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          }
          .van-marker { background: #111827; }
          .user-marker { background: #ef4444; }
          .default-marker { background: #ef4444; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const initialLat = ${initialRegion?.latitude || 6.465422};
          const initialLng = ${initialRegion?.longitude || 3.406448};
          
          var map = L.map('map', {
            zoomControl: false,
            attributionControl: false
          }).setView([initialLat, initialLng], 14);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

          var markers = {};
          var routeLayer = null;

          async function getRoute(p1, p2) {
            if (!p1.lat || !p1.lng || !p2.lat || !p2.lng) return;
            try {
              const response = await fetch(\`https://router.project-osrm.org/route/v1/driving/\${p1.lng},\${p1.lat};\${p2.lng},\${p2.lat}?overview=full&geometries=geojson\`);
              if (!response.ok) return;
              const data = await response.json();
              if (data.routes && data.routes.length > 0) {
                if (routeLayer) map.removeLayer(routeLayer);
                routeLayer = L.geoJSON(data.routes[0].geometry, {
                  style: { color: '#2563eb', weight: 4, opacity: 0.7 }
                }).addTo(map);
              }
            } catch (e) { console.error('Routing error:', e); }
          }

          function updateMarkers(newMarkers) {
            Object.values(markers).forEach(m => map.removeLayer(m));
            markers = {};

            newMarkers.forEach((m, i) => {
              const lat = Number(m.lat);
              const lng = Number(m.lng);
              if (isNaN(lat) || isNaN(lng)) return;

              const iconClass = m.type === 'van' ? 'van-marker' : (m.type === 'user' ? 'user-marker' : 'default-marker');
              const iconHtml = m.type === 'van' ? 
                '<svg viewBox="0 0 24 24" width="16" height="16" stroke="white" stroke-width="2" fill="none"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><path d="M16 18h3a1 1 0 0 0 1-1v-7.34a1 1 0 0 0-.29-.71l-4.42-4.42a1 1 0 0 0-.71-.29H14v8"/><circle cx="17" cy="18" r="2"/></svg>' :
                '<svg viewBox="0 0 24 24" width="16" height="16" stroke="white" stroke-width="2" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

              const customIcon = L.divIcon({
                className: 'custom-marker ' + iconClass,
                html: iconHtml,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
              });

              markers[i] = L.marker([lat, lng], { icon: customIcon }).addTo(map);
            });

            if (newMarkers.length >= 2) {
              const van = newMarkers.find(m => m.type === 'van');
              const user = newMarkers.find(m => m.type === 'user');
              if (van && user) {
                getRoute(van, user);
              }
            }

            if (newMarkers.length > 1) {
              const group = new L.featureGroup(Object.values(markers));
              map.fitBounds(group.getBounds().pad(0.2));
            }
          }

          updateMarkers(${JSON.stringify(markers)});
          window.map = map;
          window.updateMarkers = updateMarkers;

          window.addEventListener('message', function(e) {
            const data = JSON.parse(e.data);
            if (data.type === 'updateMarkers') {
              updateMarkers(data.markers);
            }
          });
          document.addEventListener('message', function(e) {
            const data = JSON.parse(e.data);
            if (data.type === 'updateMarkers') {
              updateMarkers(data.markers);
            }
          });
        </script>
      </body>
    </html>
  `;

  useEffect(() => {
    if (isMapLoaded) {
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'updateMarkers',
        markers
      }));
    }
  }, [JSON.stringify(markers), isMapLoaded]);

  return (
    <View style={[styles.map, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.map}
        onLoad={() => setIsMapLoaded(true)}
        scrollEnabled={false}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading Map...</Text>
          </View>
        )}
        renderError={() => (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Unable to load map</Text>
            <Text style={styles.errorSubtext}>Check your connection</Text>
          </View>
        )}
      />
    </View>
  );
});

export const Marker = ({ coordinate, children, rotation, style, ...props }: any) => null;
export const Callout = ({ children }: any) => null;
export const PROVIDER_DEFAULT = 'none';

const styles = StyleSheet.create({
  map: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Nunito-Bold' : 'sans-serif',
  },
  errorContainer: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Nunito-ExtraBold' : 'sans-serif',
  },
  errorSubtext: {
    color: '#6B7280',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Nunito-Medium' : 'sans-serif',
  }
});

export default MapView;
