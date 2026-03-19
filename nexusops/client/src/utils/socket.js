import { io } from "socket.io-client";

export const taskSocket = io("https://amiable-optimism-production-b40a.up.railway.app", { autoConnect: false });
export const docSocket  = io("https://superb-trust-production.up.railway.app",  { autoConnect: false });

export const connectSockets = (token) => {
  taskSocket.connect();
  docSocket.connect();
  docSocket.emit("auth", token);
};

export const disconnectSockets = () => {
  taskSocket.disconnect();
  docSocket.disconnect();
};