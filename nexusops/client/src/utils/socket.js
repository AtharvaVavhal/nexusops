import { io } from "socket.io-client";

export const taskSocket = io("http://localhost:5002", { autoConnect: false });
export const docSocket = io("http://localhost:5003", { autoConnect: false });

export const connectSockets = (token) => {
  taskSocket.connect();
  docSocket.connect();
  docSocket.emit("auth", token);
};

export const disconnectSockets = () => {
  taskSocket.disconnect();
  docSocket.disconnect();
};
