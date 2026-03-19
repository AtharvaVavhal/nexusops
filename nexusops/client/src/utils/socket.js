import { io } from "socket.io-client";

const SERVER = "https://nexusops-production.up.railway.app";

export const taskSocket = io(SERVER, { autoConnect: false });
export const docSocket  = io(SERVER, { autoConnect: false });

export const connectSockets = (token) => {
  taskSocket.connect();
  docSocket.connect();
  docSocket.emit("auth", token);
};

export const disconnectSockets = () => {
  taskSocket.disconnect();
  docSocket.disconnect();
};