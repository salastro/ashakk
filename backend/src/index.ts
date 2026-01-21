import { createApp } from './server';

const { httpServer } = createApp();

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
    console.log(`🎮 Ashakk server running on port ${PORT}`);
});
