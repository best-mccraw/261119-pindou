import { installPrivacyGate } from './services/privacy-gate';
import { config } from './config';
App({ onLaunch() { installPrivacyGate(); if (wx.cloud && config.cloudEnv !== 'YOUR_CLOUD_ENV')
        wx.cloud.init({ env: config.cloudEnv, traceUser: false }); } });
