import { createApp } from './server';

const { httpServer } = createApp();

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Allow network access

httpServer.listen(Number(PORT), HOST, () => {
    console.log(`🎮 Ashakk server running on http://${HOST}:${PORT}`);
    console.log(`📱 Access from other devices: http://192.168.1.8:${PORT}`);
});
