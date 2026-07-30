'use strict';

/**
 * Google Publisher Products do not currently list Mongolian as a supported
 * primary content language. Keep AdSense disabled on Mongolian pages.
 * Direct first-party sponsor ads remain available for Free users.
 */
window.DATALINX_ADSENSE_CONFIG = Object.freeze({
  enabled: false,
  supportedLanguages: ['en'],
  client: 'ca-pub-REPLACE_WITH_YOUR_PUBLISHER_ID',
  publicSlot: 'REPLACE_WITH_PUBLIC_RESPONSIVE_AD_SLOT_ID',
  appSlot: 'REPLACE_WITH_APP_RESPONSIVE_AD_SLOT_ID'
});
