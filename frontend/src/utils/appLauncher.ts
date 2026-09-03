export const executeAppCommand = (intent: string, payload: string = "") => {
  if (typeof window === "undefined") return;

  const ua = navigator.userAgent || navigator.vendor;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const encodedPayload = encodeURIComponent(payload);

  // Mapping khusus Android Intent vs iOS Scheme vs Web Fallback
  const appMap: Record<
    string,
    { iosScheme: string; androidIntent: string; webFallback: string }
  > = {
    spotify: {
      iosScheme: payload ? `spotify:search:${encodedPayload}` : "spotify://",
      androidIntent: payload
        ? `intent://search/${encodedPayload}#Intent;scheme=spotify;package=com.spotify.music;end`
        : "intent://#Intent;scheme=spotify;package=com.spotify.music;end",
      webFallback: payload
        ? `https://open.spotify.com/search/${encodedPayload}`
        : "https://open.spotify.com"
    },
    youtube: {
      iosScheme: payload
        ? `youtube://www.youtube.com/results?search_query=${encodedPayload}`
        : "youtube://",
      androidIntent: payload
        ? `intent://www.youtube.com/results?search_query=${encodedPayload}#Intent;scheme=https;package=com.google.android.youtube;end`
        : "intent://#Intent;scheme=youtube;package=com.google.android.youtube;end",
      webFallback: payload
        ? `https://www.youtube.com/results?search_query=${encodedPayload}`
        : "https://www.youtube.com"
    },
    whatsapp: {
      iosScheme: "whatsapp://",
      androidIntent: "intent://#Intent;scheme=whatsapp;package=com.whatsapp;end",
      webFallback: "https://api.whatsapp.com"
    },
    instagram: {
      iosScheme: "instagram://",
      androidIntent: "intent://#Intent;scheme=instagram;package=com.instagram.android;end",
      webFallback: "https://www.instagram.com"
    },
    mlbb: {
      iosScheme: "mobilelegends://",
      androidIntent: "intent://#Intent;scheme=mobilelegends;package=com.mobile.legends;end",
      webFallback: "https://m.mobilelegends.com"
    },
    pubg: {
      iosScheme: "igv-pubgmobile://",
      androidIntent: "intent://#Intent;scheme=pubgmobile;package=com.tencent.ig;end",
      webFallback: "https://www.pubgmobile.com"
    }
  };

  const targetApp = appMap[intent.toLowerCase()];
  if (!targetApp) return;

  if (isAndroid) {
    // Android: Gunakan Android Intent (Otomatis buka Play Store/App tanpa error popup)
    window.location.href = targetApp.androidIntent;
  } else if (isIOS) {
    // iOS: Panggil scheme, jika app tidak terpasang/diblokir, alihkan ke Web setelah 1 detik
    const start = Date.now();
    window.location.href = targetApp.iosScheme;

    setTimeout(() => {
      // Jika browser masih aktif (tidak ter-minimize ke app game), buka versi Web
      if (Date.now() - start < 1500) {
        window.location.href = targetApp.webFallback;
      }
    }, 1000);
  } else {
    // Desktop: Langsung buka versi Web di tab baru
    window.open(targetApp.webFallback, "_blank");
  }
};