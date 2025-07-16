module.exports = {
  proxy: "localhost:3000",
  port: 3001,
  open: true,
  files: [
    "public/**/*.html",
    "public/**/*.css", 
    "public/**/*.js"
  ],
  ignore: [
    "node_modules"
  ],
  reloadDelay: 100,
  reloadDebounce: 100,
  reloadThrottle: 0,
  notify: false,
  ui: false
}; 