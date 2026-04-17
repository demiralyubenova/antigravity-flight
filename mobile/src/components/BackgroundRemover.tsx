import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

export interface BackgroundRemoverRef {
  processImage: (base64: string) => Promise<string>;
}

const HTML_CONTENT = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <!-- Load imgly background removal locally via CDN (module) -->
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: transparent; }
  </style>
  <script type="module">
    import { removeBackground } from 'https://esm.sh/@imgly/background-removal@1.7.0';

    // Polyfill to resolve issues with SharedArrayBuffer in some WebViews
    if (typeof SharedArrayBuffer === 'undefined') {
      window.SharedArrayBuffer = ArrayBuffer;
    }
    if (typeof crossOriginIsolated === 'undefined') {
      window.crossOriginIsolated = false;
    }

    // Keep track of active requests
    const pendingRequests = {};

    window.processImageEvent = async (requestId, base64Image) => {
      try {
        const config = {
          debug: false,
          model: 'medium',
          publicPath: 'https://unpkg.com/@imgly/background-removal-data@1.4.5/dist/',
          progress: (key, current, total) => {}
        };
        
        // 1. Convert base64 Data URL to Blob manually (fetch(dataURI) fails on iOS WebViews)
        const base64Data = base64Image.split(',')[1];
        const mimeType = base64Image.split(',')[0].split(':')[1].split(';')[0];
        const byteCharacters = atob(base64Data);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          byteArrays.push(new Uint8Array(byteNumbers));
        }
        const blob = new Blob(byteArrays, { type: mimeType });
        
        // 2. Run imgly background removal
        const resultBlob = await removeBackground(blob, config);
        
        // 3. Convert Blob back to base64 Data URL to pass to React Native
        const reader = new FileReader();
        reader.readAsDataURL(resultBlob);
        reader.onloadend = () => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            requestId,
            type: 'success',
            data: reader.result
          }));
        };
        reader.onerror = (e) => {
          throw new Error('Failed to convert processed blob to base64');
        };
      } catch (err) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          requestId,
          type: 'error',
          error: err.message || err.toString()
        }));
      }
    };
  </script>
</head>
<body></body>
</html>
`;

export const BackgroundRemover = forwardRef<BackgroundRemoverRef>((props, ref) => {
  const webviewRef = useRef<WebView>(null);
  // Store promises so we can resolve them when the webview replies
  const pendingPromises = useRef<Record<string, { resolve: (val: string) => void, reject: (err: Error) => void }>>({});
  const requestCounter = useRef(0);

  useImperativeHandle(ref, () => ({
    processImage: (base64: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (!webviewRef.current) {
          reject(new Error('WebView is not initialized'));
          return;
        }

        const requestId = `req_${requestCounter.current++}`;
        pendingPromises.current[requestId] = { resolve, reject };

        // Inject javascript to call our window.processImageEvent function
        // We pass the string safely by escaping quotes if needed, 
        // though base64 is just alphanumeric + +=/
        const script = `window.processImageEvent('${requestId}', '${base64}'); true;`;
        webviewRef.current.injectJavaScript(script);
      });
    }
  }));

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data);
      const { requestId, type, data, error } = parsed;

      const promiseHandlers = pendingPromises.current[requestId];
      if (promiseHandlers) {
        if (type === 'success') {
          promiseHandlers.resolve(data);
        } else {
          promiseHandlers.reject(new Error(error || 'Failed to remove background'));
        }
        delete pendingPromises.current[requestId];
      }
    } catch (e) {
      console.error('Failed to parse message from WebView', e, event.nativeEvent.data);
    }
  };

  return (
    <View style={styles.hidden}>
      <WebView
        ref={webviewRef}
        source={{ html: HTML_CONTENT, baseUrl: 'https://localhost' }}
        onMessage={onMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        // Prevents the webview from rendering visually
        style={styles.webview}
        // Important: keeps it alive
        startInLoadingState={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  hidden: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    zIndex: -1,
    // Keep it tiny so it doesn't block touches just in case
    width: 1,
    height: 1,
    overflow: 'hidden',
  },
  webview: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
  }
});
