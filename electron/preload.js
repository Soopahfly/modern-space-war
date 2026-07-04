"use strict";

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("modernSpaceWarDesktop", {
  platform: process.platform,
  desktop: true
});
