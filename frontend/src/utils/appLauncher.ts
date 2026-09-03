export function executeAppCommand(intent: string, payload?: string): boolean {
  // Cek apakah user sedang membuka lewat HP Android
  const isAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
  let targetUri = "";
  let isWebFallback = false;

  const encodedPayload = encodeURIComponent(payload || "");

  switch (intent) {
    case "spotify":
      // Protokol 'spotify:' langsung membuka aplikasi Spotify Desktop di Windows/Mac maupun HP
      targetUri = payload
        ? `spotify:search:${encodedPayload}`
        : `spotify:`;
      break;

    case "youtube":
      if (isAndroid) {
        targetUri = payload
          ? `vnd.youtube://results?search_query=${encodedPayload}`
          : "vnd.youtube://";
      } else {
        // Di laptop, jika ada query panggil YouTube Web search
        targetUri = payload
          ? `https://www.youtube.com/results?search_query=${encodedPayload}`
          : "https://www.youtube.com";
        isWebFallback = true;
      }
      break;

    case "whatsapp":
      // 'whatsapp://' akan membuka aplikasi WhatsApp Desktop di Windows/Mac & App di HP
      if (isAndroid) {
        targetUri = payload ? `whatsapp://send?text=${encodedPayload}` : "whatsapp://app";
      } else {
        targetUri = payload ? `whatsapp://send?text=${encodedPayload}` : "whatsapp://";
      }
      break;

    case "instagram":
      targetUri = isAndroid ? "instagram://app" : "https://www.instagram.com";
      if (!isAndroid) isWebFallback = true;
      break;

    case "mlbb":
      targetUri = "intent://#Intent;package=com.mobile.legends;scheme=mobilelegends;end";
      break;

    case "pubg":
      targetUri = "intent://#Intent;package=com.tencent.ig;scheme=pubgmobile;end";
      break;

    default:
      return false;
  }

  // Jika berupa skema aplikasi native (seperti spotify:, whatsapp://), jalankan via location.href
  // agar Windows/Android langsung membuka aplikasinya tanpa membuat tab kosong di browser.
  if (!isWebFallback) {
    window.location.href = targetUri;
  } else {
    window.open(targetUri, "_blank");
  }

  return true;
}