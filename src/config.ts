export default {
  paths: {
    gameDir: "C:\\Riot Games\\League of Legends\\Game",

    ritoBin: "./bins/ritobin/ritobin_cli.exe",
    modTool: "./bins/cslol-tools/mod-tools.exe",
    wadTool: "./bins/wadtools.exe",

    install: ".local/out-install",
    overlay: ".local/out-overlay",

    cacheRef: "content-metadata.json",

    cache: {
      ckey: ".local/data-cache/.key",
      game: ".local/data-cache/s1-game",
      text: ".local/data-cache/s2-text",
    },

    temp: {
      mods: ".local/data-temp/s3-mods",
      done: ".local/data-temp/s4-done",
    },
  },
};
