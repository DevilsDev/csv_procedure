/**
 * Version: 2.5.4
 * Description: HTTP entry point. Boots the Express app on PORT (default 3000).
 * Author: Ali Kahwaji
 */

const app = require('./src/app');

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Clinisync server listening on http://localhost:${PORT}`);
});
