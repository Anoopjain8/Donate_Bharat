module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  setupFiles: ['./tests/setup.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
};
