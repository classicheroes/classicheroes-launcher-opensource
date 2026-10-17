const {
    contextBridge,
    ipcRenderer
} = require("electron");

contextBridge.exposeInMainWorld(
    "launcher",
    {

        minimize() {

            ipcRenderer.send(
                "window-minimize"
            );
        },

        close() {

            ipcRenderer.send(
                "window-close"
            );
        },

        checkGame() {

            return ipcRenderer.invoke(
                "check-game"
            );
        },

        installGame(
            url
        ) {

            return ipcRenderer.invoke(
                "install-game",
                url
            );
        },

        launchGame(
            token
        ) {

            return ipcRenderer.invoke(
                "launch-game",
                token
            );
        },

        onDownloadProgress(
            callback
        ) {

            ipcRenderer.on(
                "download-progress",
                (_, data) => {

                    callback(data);
                }
            );
        },

        onGameClosed(
            callback
        ) {

            ipcRenderer.on(
                "game-closed",
                () => {

                    callback();
                }
            );
        },

        onGameError(
            callback
        ) {

            ipcRenderer.on(
                "game-error",
                (_, message) => {

                    callback(message);
                }
            );
        }
    }
);