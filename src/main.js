const {
    app,
    BrowserWindow,
    ipcMain
} = require("electron");

const {
    spawn
} = require("child_process");

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const extract = require("extract-zip");
const DiscordRPC = require("discord-rpc");

const APP_NAME = "Classic Heroes";

const DISCORD_CLIENT_ID =
    "Discord_Bot_Id";

let mainWindow = null;
let gameProcess = null;
let antiCheatProcess = null;
let rpc = null;


/*
==================================================
 PATHS
==================================================
*/

const GAME_DIR = path.join(
    app.getPath("userData"),
    "game"
);

const ZIP_PATH = path.join(
    app.getPath("userData"),
    "ClassicHeroes.zip"
);

const ICON_PATH = path.join(
    __dirname,
    "..",
    "assets",
    "icon.ico"
);


/*
==================================================
 WINDOW
==================================================
*/

function createWindow() {

    mainWindow = new BrowserWindow({

        width: 1200,
        height: 700,

        minWidth: 1000,
        minHeight: 600,

        frame: false,
        resizable: false,

        title: APP_NAME,
        icon: ICON_PATH,

        backgroundColor: "#111111",

        webPreferences: {

            preload: path.join(
                __dirname,
                "preload.js"
            ),

            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.setTitle(APP_NAME);

    mainWindow.loadFile(
        path.join(
            __dirname,
            "renderer",
            "index.html"
        )
    );

    mainWindow.on(
        "closed",
        () => {
            mainWindow = null;
        }
    );
}


/*
==================================================
 FIND FILE RECURSIVELY
==================================================
*/

function findFileRecursive(
    directory,
    fileName
) {

    if (
        !fs.existsSync(directory)
    ) {
        return null;
    }

    let entries;

    try {

        entries =
            fs.readdirSync(
                directory,
                {
                    withFileTypes: true
                }
            );

    } catch (error) {

        console.error(
            "Directory read error:",
            error
        );

        return null;
    }

    for (
        const entry of entries
    ) {

        const fullPath =
            path.join(
                directory,
                entry.name
            );

        if (
            entry.isFile() &&
            entry.name.toLowerCase() ===
            fileName.toLowerCase()
        ) {

            return fullPath;
        }

        if (
            entry.isDirectory()
        ) {

            const found =
                findFileRecursive(
                    fullPath,
                    fileName
                );

            if (found) {
                return found;
            }
        }
    }

    return null;
}


/*
==================================================
 GAME PATH
==================================================
*/

function getGamePath() {

    return findFileRecursive(
        GAME_DIR,
        "CHeroes.exe"
    );
}


/*
==================================================
 ANTICHEAT PATH
==================================================
*/

function getAntiCheatPath() {

    /*
    ----------------------------------------------
    DEVELOPMENT
    ----------------------------------------------

    classic-heroes-launcher/
        anticheat/
            AntiCheat.exe
    */

    const developmentPath =
        path.join(
            __dirname,
            "..",
            "anticheat",
            "AntiCheat.exe"
        );


    /*
    ----------------------------------------------
    PACKAGED
    ----------------------------------------------

    Classic Heroes/
        resources/
            anticheat/
                AntiCheat.exe
    */

    const packagedPath =
        path.join(
            process.resourcesPath,
            "anticheat",
            "AntiCheat.exe"
        );


    /*
    Podczas npm start
    */

    if (
        fs.existsSync(
            developmentPath
        )
    ) {

        return developmentPath;
    }


    /*
    Po npm run build
    */

    if (
        fs.existsSync(
            packagedPath
        )
    ) {

        return packagedPath;
    }


    return null;
}


/*
==================================================
 MANIFEST
==================================================
*/

function getManifest() {

    /*
    Podczas developmentu:
    
    src/main.js
    ../manifest.json
    */

    const manifestPath =
        path.join(
            __dirname,
            "..",
            "manifest.json"
        );


    if (
        !fs.existsSync(
            manifestPath
        )
    ) {

        throw new Error(
            "Nie znaleziono manifest.json."
        );
    }


    try {

        return JSON.parse(
            fs.readFileSync(
                manifestPath,
                "utf8"
            )
        );

    } catch (error) {

        throw new Error(
            "Nieprawidłowy manifest.json."
        );
    }
}


/*
==================================================
 DISCORD RPC
==================================================
*/

async function initializeDiscord() {

    try {

        DiscordRPC.register(
            DISCORD_CLIENT_ID
        );

        rpc =
            new DiscordRPC.Client({
                transport: "ipc"
            });


        rpc.on(
            "ready",
            () => {

                console.log(
                    "Discord RPC connected."
                );

                updateDiscordLauncher();
            }
        );


        await rpc.login({

            clientId:
                DISCORD_CLIENT_ID
        });


    } catch (error) {

        console.log(
            "Discord RPC unavailable:",
            error.message
        );

        rpc = null;
    }
}


function updateDiscordLauncher() {

    if (!rpc) {
        return;
    }

    rpc.setActivity({

        details:
            "In Launcher",

        state:
            "Classic Heroes",

        largeImageKey:
            "logo",

        largeImageText:
            "Classic Heroes",

        instance:
            false
    });
}


function updateDiscordDownloading() {

    if (!rpc) {
        return;
    }

    rpc.setActivity({

        details:
            "Downloading Classic Heroes",

        state:
            "Classic Heroes Launcher",

        largeImageKey:
            "logo",

        largeImageText:
            "Classic Heroes",

        instance:
            false
    });
}


function updateDiscordPlaying() {

    if (!rpc) {
        return;
    }

    rpc.setActivity({

        details:
            "Playing Classic Heroes",

        state:
            "Classic Heroes",

        largeImageKey:
            "logo",

        largeImageText:
            "Classic Heroes",

        startTimestamp:
            Math.floor(
                Date.now() / 1000
            ),

        instance:
            false
    });
}


/*
==================================================
 SEND PROGRESS
==================================================
*/

function sendProgress(data) {

    if (!mainWindow) {
        return;
    }

    mainWindow.webContents.send(
        "download-progress",
        data
    );
}


/*
==================================================
 DOWNLOAD
==================================================
*/

function downloadFile(
    url,
    destination
) {

    return new Promise(
        (resolve, reject) => {

            const protocol =
                url.startsWith(
                    "https://"
                )
                    ? https
                    : http;


            const request =
                protocol.get(
                    url,
                    response => {

                        /*
                        Redirect
                        */

                        if (
                            response.statusCode >= 300 &&
                            response.statusCode < 400 &&
                            response.headers.location
                        ) {

                            downloadFile(
                                response.headers.location,
                                destination
                            )
                                .then(resolve)
                                .catch(reject);

                            return;
                        }


                        if (
                            response.statusCode !== 200
                        ) {

                            reject(
                                new Error(
                                    `HTTP ${response.statusCode}`
                                )
                            );

                            return;
                        }


                        const total =
                            parseInt(
                                response.headers[
                                    "content-length"
                                ] || "0",
                                10
                            );


                        let downloaded = 0;

                        const startTime =
                            Date.now();


                        const file =
                            fs.createWriteStream(
                                destination
                            );


                        response.on(
                            "data",
                            chunk => {

                                downloaded +=
                                    chunk.length;


                                const elapsed =
                                    (
                                        Date.now() -
                                        startTime
                                    ) / 1000;


                                const speed =
                                    elapsed > 0
                                        ? downloaded /
                                          elapsed
                                        : 0;


                                const percent =
                                    total > 0
                                        ? (
                                            downloaded /
                                            total
                                        ) * 100
                                        : 0;


                                sendProgress({

                                    status:
                                        "downloading",

                                    percent,

                                    downloaded,

                                    total,

                                    speed
                                });
                            }
                        );


                        response.pipe(file);


                        file.on(
                            "finish",
                            () => {

                                file.close(
                                    resolve
                                );
                            }
                        );


                        file.on(
                            "error",
                            error => {

                                try {

                                    fs.unlinkSync(
                                        destination
                                    );

                                } catch {}

                                reject(error);
                            }
                        );
                    }
                );


            request.on(
                "error",
                error => {

                    reject(error);
                }
            );
        }
    );
}


/*
==================================================
 INSTALL GAME
==================================================
*/

async function installGame() {

    const manifest =
        getManifest();


    const downloadUrl =
        manifest.downloadUrl;


    if (
        typeof downloadUrl !==
        "string"
    ) {

        throw new Error(
            "Brak downloadUrl w manifest.json."
        );
    }


    if (
        !downloadUrl.startsWith(
            "http://"
        ) &&
        !downloadUrl.startsWith(
            "https://"
        )
    ) {

        throw new Error(
            "Nieprawidłowy downloadUrl."
        );
    }


    fs.mkdirSync(
        GAME_DIR,
        {
            recursive: true
        }
    );


    /*
    Usuwamy poprzedni ZIP.
    */

    if (
        fs.existsSync(
            ZIP_PATH
        )
    ) {

        try {

            fs.unlinkSync(
                ZIP_PATH
            );

        } catch {}
    }


    updateDiscordDownloading();


    sendProgress({

        status:
            "downloading",

        percent:
            0,

        downloaded:
            0,

        total:
            0,

        speed:
            0
    });


    /*
    POBIERANIE
    */

    await downloadFile(
        downloadUrl,
        ZIP_PATH
    );


    /*
    ROZPAKOWYWANIE
    */

    sendProgress({

        status:
            "extracting",

        percent:
            100
    });


    await extract(
        ZIP_PATH,
        {
            dir:
                GAME_DIR
        }
    );


    /*
    Usuwamy ZIP.
    */

    try {

        fs.unlinkSync(
            ZIP_PATH
        );

    } catch {}


    /*
    SZUKAMY CHeroes.exe
    */

    const gamePath =
        getGamePath();


    if (!gamePath) {

        throw new Error(
            "CHeroes.exe nie znajduje się w pobranej paczce."
        );
    }


    /*
    AntiCheat NIE jest tutaj sprawdzany.
    Jest częścią launchera.
    */


    sendProgress({

        status:
            "complete",

        percent:
            100
    });


    updateDiscordLauncher();


    return {

        gamePath
    };
}


/*
==================================================
 START ANTICHEAT
==================================================
*/

function launchAntiCheat() {

    const antiCheatPath =
        getAntiCheatPath();


    if (!antiCheatPath) {

        throw new Error(
            "Nie znaleziono AntiCheat.exe w launcherze."
        );
    }


    console.log(
        "Starting AntiCheat:",
        antiCheatPath
    );


    antiCheatProcess =
        spawn(

            antiCheatPath,

            [],

            {

                cwd:
                    path.dirname(
                        antiCheatPath
                    ),

                windowsHide:
                    false,

                stdio:
                    "ignore"
            }
        );


    antiCheatProcess.on(
        "error",
        error => {

            console.error(
                "AntiCheat error:",
                error
            );
        }
    );


    antiCheatProcess.on(
        "close",
        code => {

            console.log(
                "AntiCheat closed:",
                code
            );

            antiCheatProcess =
                null;
        }
    );
}


/*
==================================================
 START GAME
==================================================
*/

function launchGame(token) {

    const gamePath =
        getGamePath();


    if (!gamePath) {

        throw new Error(
            "Nie znaleziono CHeroes.exe."
        );
    }


    const gameDirectory =
        path.dirname(
            gamePath
        );


    console.log(
        "Starting Classic Heroes:",
        gamePath
    );


    gameProcess =
        spawn(

            gamePath,

            [
                "+sessionId",
                token,
                "+magma",
                "0"
            ],

            {

                cwd:
                    gameDirectory,

                windowsHide:
                    false,

                stdio:
                    "ignore"
            }
        );


    updateDiscordPlaying();


    gameProcess.on(
        "error",
        error => {

            console.error(
                "Game error:",
                error
            );


            if (mainWindow) {

                mainWindow.webContents.send(
                    "game-error",
                    error.message
                );
            }
        }
    );


    gameProcess.on(
        "close",
        () => {

            console.log(
                "Classic Heroes closed."
            );


            gameProcess = null;


            updateDiscordLauncher();


            if (mainWindow) {

                mainWindow.webContents.send(
                    "game-closed"
                );
            }
        }
    );
}


/*
==================================================
 IPC - WINDOW
==================================================
*/

ipcMain.on(
    "window-minimize",
    () => {

        if (mainWindow) {
            mainWindow.minimize();
        }
    }
);


ipcMain.on(
    "window-close",
    () => {

        if (mainWindow) {
            mainWindow.close();
        }
    }
);


/*
==================================================
 IPC - CHECK GAME
==================================================
*/

ipcMain.handle(
    "check-game",
    () => {

        const gamePath =
            getGamePath();


        const antiCheatPath =
            getAntiCheatPath();


        return {

            installed:
                !!gamePath,

            gamePath,

            antiCheatPath
        };
    }
);


/*
==================================================
 IPC - INSTALL GAME
==================================================
*/

ipcMain.handle(
    "install-game",
    async () => {

        return await installGame();
    }
);


/*
==================================================
 IPC - LAUNCH GAME
==================================================
*/

ipcMain.handle(
    "launch-game",
    async (
        event,
        token
    ) => {

        if (
            typeof token !==
            "string"
        ) {

            throw new Error(
                "Nieprawidłowy token."
            );
        }


        token =
            token.trim();


        if (!token) {

            throw new Error(
                "Token jest pusty."
            );
        }


        if (gameProcess) {

            throw new Error(
                "Classic Heroes jest już uruchomione."
            );
        }


        /*
        Najpierw AntiCheat
        */

        launchAntiCheat();


        /*
        Następnie gra
        */

        launchGame(
            token
        );


        return true;
    }
);


/*
==================================================
 APP READY
==================================================
*/

app.setAppUserModelId(
    "com.classicheroes.launcher"
);


app.whenReady().then(
    async () => {

        createWindow();

        await initializeDiscord();
    }
);


/*
==================================================
 CLOSE
==================================================
*/

app.on(
    "before-quit",
    () => {

        /*
        Zamykamy grę,
        jeśli nadal działa.
        */

        if (gameProcess) {

            try {
                gameProcess.kill();
            } catch {}

            gameProcess = null;
        }


        /*
        Zamykamy AntiCheat.
        */

        if (antiCheatProcess) {

            try {
                antiCheatProcess.kill();
            } catch {}

            antiCheatProcess = null;
        }
    }
);


app.on(
    "window-all-closed",
    () => {

        if (
            process.platform !==
            "darwin"
        ) {

            app.quit();
        }
    }
);