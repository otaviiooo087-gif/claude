import { io } from 'socket.io-client';

// Mesma origem — em dev o Vite faz proxy de /socket.io para o backend (:3001).
export const socket = io({ autoConnect: true });
