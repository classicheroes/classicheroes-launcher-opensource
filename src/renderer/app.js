const tokenInput =
    document.getElementById(
        "tokenInput"
    );

const showTokenButton =
    document.getElementById(
        "showTokenButton"
    );

const playButton =
    document.getElementById(
        "playButton"
    );

const status =
    document.getElementById(
        "status"
    );

const downloadStatus =
    document.getElementById(
        "downloadStatus"
    );

const downloadInfo =
    document.getElementById(
        "downloadInfo"
    );

const progressBar =
    document.getElementById(
        "progressBar"
    );

const minimizeButton =
    document.getElementById(
        "minimizeButton"
    );

const closeButton =
    document.getElementById(
        "closeButton"
    );

const plButton =
    document.getElementById(
        "plButton"
    );

const frButton =
    document.getElementById(
        "frButton"
    );

const enButton =
    document.getElementById(
        "enButton"
    );

const subtitle =
    document.getElementById(
        "subtitle"
    );

let currentLanguage = "pl";

let gameReady = false;

/*
==================================================
 TRANSLATIONS
==================================================
*/

const translations = {

    pl: {

        subtitle:
            "Wprowadź swój token sesji",

        checking:
            "Sprawdzanie gry...",

        downloading:
            "Pobieranie Classic Heroes...",

        extracting:
            "Rozpakowywanie gry...",

        complete:
            "Gra jest gotowa",

        launching:
            "Uruchamianie Classic Heroes...",

        closed:
            "Gra została zamknięta",

        error:
            "Błąd",

        play:
            "GRAJ",

        empty:
            "Wprowadź token sesji!"
    },

    fr: {

        subtitle:
            "Entrez votre token de session",

        checking:
            "Vérification du jeu...",

        downloading:
            "Téléchargement de Classic Heroes...",

        extracting:
            "Extraction du jeu...",

        complete:
            "Le jeu est prêt",

        launching:
            "Lancement de Classic Heroes...",

        closed:
            "Le jeu est fermé",

        error:
            "Erreur",

        play:
            "JOUER",

        empty:
            "Entrez votre token de session !"
    },

    en: {

        subtitle:
            "Enter your session token",

        checking:
            "Checking game...",

        downloading:
            "Downloading Classic Heroes...",

        extracting:
            "Extracting game...",

        complete:
            "Game is ready",

        launching:
            "Launching Classic Heroes...",

        closed:
            "Game closed",

        error:
            "Error",

        play:
            "PLAY",

        empty:
            "Enter your session token!"
    }
};

/*
==================================================
 LANGUAGE
==================================================
*/

function setLanguage(
    language
) {

    currentLanguage =
        language;

    const t =
        translations[
            language
        ];

    subtitle.textContent =
        t.subtitle;

    playButton.textContent =
        t.play;

    plButton.classList.toggle(
        "active",
        language === "pl"
    );

    frButton.classList.toggle(
        "active",
        language === "fr"
    );

    enButton.classList.toggle(
        "active",
        language === "en"
    );
}

plButton.addEventListener(
    "click",
    () => {

        setLanguage("pl");
    }
);

frButton.addEventListener(
    "click",
    () => {

        setLanguage("fr");
    }
);

enButton.addEventListener(
    "click",
    () => {

        setLanguage("en");
    }
);

/*
==================================================
 WINDOW
==================================================
*/

minimizeButton.addEventListener(
    "click",
    () => {

        window.launcher.minimize();
    }
);

closeButton.addEventListener(
    "click",
    () => {

        window.launcher.close();
    }
);

/*
==================================================
 TOKEN
==================================================
*/

showTokenButton.addEventListener(
    "click",
    () => {

        if (
            tokenInput.type ===
            "password"
        ) {

            tokenInput.type =
                "text";

        } else {

            tokenInput.type =
                "password";
        }
    }
);

/*
==================================================
 FORMAT
==================================================
*/

function formatBytes(
    bytes
) {

    if (
        !bytes ||
        bytes <= 0
    ) {

        return "0 MB";
    }

    return (
        bytes /
        1024 /
        1024
    ).toFixed(1) +
    " MB";
}

function formatSpeed(
    bytes
) {

    if (
        !bytes ||
        bytes <= 0
    ) {

        return "0 MB/s";
    }

    return (
        bytes /
        1024 /
        1024
    ).toFixed(1) +
    " MB/s";
}

/*
==================================================
 DOWNLOAD
==================================================
*/

window.launcher
    .onDownloadProgress(
        data => {

            const t =
                translations[
                    currentLanguage
                ];

            if (
                data.status ===
                "downloading"
            ) {

                const percent =
                    Math.min(
                        100,
                        Math.max(
                            0,
                            data.percent || 0
                        )
                    );

                progressBar.style.width =
                    `${percent}%`;

                downloadStatus.textContent =
                    t.downloading;

                downloadInfo.textContent =
                    `${percent.toFixed(0)}% • ` +
                    `${formatBytes(
                        data.downloaded
                    )}`;

                if (
                    data.speed
                ) {

                    downloadInfo.textContent +=
                        ` • ${formatSpeed(
                            data.speed
                        )}`;
                }
            }

            if (
                data.status ===
                "extracting"
            ) {

                progressBar.style.width =
                    "100%";

                downloadStatus.textContent =
                    t.extracting;

                downloadInfo.textContent =
                    "Rozpakowywanie...";
            }

            if (
                data.status ===
                "complete"
            ) {

                progressBar.style.width =
                    "100%";

                downloadStatus.textContent =
                    t.complete;

                downloadInfo.textContent =
                    "100%";

                gameReady =
                    true;

                playButton.disabled =
                    false;

                status.textContent =
                    t.complete;
            }
        }
    );

/*
==================================================
 INITIALIZE
==================================================
*/

async function initialize() {

    const t =
        translations[
            currentLanguage
        ];

    downloadStatus.textContent =
        t.checking;

    try {

        const result =
            await window.launcher
                .checkGame();

        /*
        Gra już istnieje.
        */

        if (
            result.installed
        ) {

            gameReady =
                true;

            progressBar.style.width =
                "100%";

            downloadStatus.textContent =
                t.complete;

            downloadInfo.textContent =
                "100%";

            playButton.disabled =
                false;

            status.textContent =
                t.complete;

            return;
        }

        /*
        Gra nie istnieje.
        Pobieramy ją.
        */

        await window.launcher
            .installGame();

    } catch (error) {

        console.error(
            error
        );

        downloadStatus.textContent =
            `${t.error}: ${error.message}`;

        status.textContent =
            `${t.error}: ${error.message}`;

        gameReady =
            false;

        playButton.disabled =
            true;
    }
}

/*
==================================================
 PLAY
==================================================
*/

playButton.addEventListener(
    "click",
    async () => {

        const t =
            translations[
                currentLanguage
            ];

        const token =
            tokenInput.value.trim();

        if (!token) {

            status.textContent =
                t.empty;

            return;
        }

        if (!gameReady) {

            status.textContent =
                t.error;

            return;
        }

        playButton.disabled =
            true;

        status.textContent =
            t.launching;

        try {

            await window.launcher
                .launchGame(
                    token
                );

            status.textContent =
                t.launching;

        } catch (error) {

            console.error(
                error
            );

            status.textContent =
                `${t.error}: ${error.message}`;

            playButton.disabled =
                false;
        }
    }
);

/*
==================================================
 GAME CLOSED
==================================================
*/

window.launcher
    .onGameClosed(
        () => {

            const t =
                translations[
                    currentLanguage
                ];

            status.textContent =
                t.closed;

            playButton.disabled =
                false;
        }
    );

/*
==================================================
 GAME ERROR
==================================================
*/

window.launcher
    .onGameError(
        message => {

            const t =
                translations[
                    currentLanguage
                ];

            status.textContent =
                `${t.error}: ${message}`;

            playButton.disabled =
                false;
        }
    );

/*
==================================================
 START
==================================================
*/

setLanguage("pl");

initialize();