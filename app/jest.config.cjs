module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    '^.+\\.(t|j)sx?$': ['babel-jest', { presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'] }]
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  moduleFileExtensions: ['ts','tsx','js','jsx']
}