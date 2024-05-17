module.exports = {
  apps: [
    {
      name: "kindle-sender-bot",
      script: "index.ts",
      interpreter: "/home/dd/.bun/bin/bun",
      exec_mode: "fork",
      watch: true,
    },
  ],
};
