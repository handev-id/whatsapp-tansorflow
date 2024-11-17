import makeWASocket, {
  DisconnectReason,
  downloadMediaMessage,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import fs from "fs-extra";
import path from "path";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import { writeFile } from "fs/promises";

const UPLOADS_FOLDER = path.join(__dirname, "../uploads");

fs.ensureDirSync(UPLOADS_FOLDER);

async function connectToWhatsapp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth-whatsapp");

  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log(
        "Koneksi Tertutup Karna:",
        lastDisconnect?.error,
        "Koneksi Ulang...",
        shouldReconnect
      );
      if (shouldReconnect) {
        connectToWhatsapp();
      }
    } else if (connection === "connecting") {
      console.log("Connecting...");
    } else if (connection === "open") {
      console.log("Koneksi Terbuka...");
    }
  });

  sock.ev.on("messages.upsert", async (m) => {
    const message = m.messages[0];

    const sender = message.key.remoteJid;
    const receivedMessage = message.message?.conversation || "";

    if (!message.key.fromMe) {
      if (message.message?.imageMessage) {
        const buffer = await downloadMediaMessage(message, "buffer", {});

        await writeFile("file/" + sender + ".jpeg", buffer);
      }
      if (message.message?.conversation) {
        console.log("PESAN: " + message.message?.conversation);
      }
    }
  });
}

connectToWhatsapp();
