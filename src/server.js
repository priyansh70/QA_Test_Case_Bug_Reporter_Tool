require('dotenv').config();
const app = require('./app');
const { initDatabase } = require('./config/db');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`\n====================================================`);
      console.log(`🚀 QA Test Suite Platform running at http://localhost:${PORT}`);
      console.log(`⚡ MVC Backend Architecture Initialized`);
      console.log(`====================================================\n`);
    });
  } catch (error) {
    console.error('Failed to start web server:', error);
    process.exit(1);
  }
}

startServer();
