import { Bot, Context, InputFile } from "grammy";
import nodemailer from "nodemailer";
import { Document } from "grammy/types";
import { type FileFlavor, hydrateFiles } from "@grammyjs/files";
import { unlinkSync } from "fs";

let missingEnvVars = [];

if (!process.env.SMTP_HOST) {
  missingEnvVars.push("SMTP_HOST");
}
if (!process.env.SMTP_USER) {
  missingEnvVars.push("SMTP_USER");
}
if (!process.env.SMTP_PASS) {
  missingEnvVars.push("SMTP_PASS");
}
if (!process.env.BOT_TOKEN) {
  missingEnvVars.push("BOT_TOKEN");
}

if (missingEnvVars.length > 0) {
  console.error(
    "Please provide the following environment variables: " +
      missingEnvVars.join(", ")
  );
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

type MyContext = FileFlavor<Context>;
const bot = new Bot<MyContext>(process.env.BOT_TOKEN as string);

// Install plugin
bot.api.config.use(hydrateFiles(bot.token));

async function sendTgDocumentToKindle(
  document: Document,
  ctx: MyContext
): Promise<void> {
  if (!ctx.message?.document) return;

  const file = await ctx.getFile();
  // Download the file to a temporary location
  const filePath = await file.download();

  const mailOptions = {
    from: `"Kindle Bot Sender" <${process.env.SMTP_USER}>`,
    to: process.env.KINDLE_EMAIL,
    subject: "Send EPUB",
    text: "Sending an EPUB to Kindle.",
    attachments: [
      {
        filename: document.file_name ?? "document.epub",
        // Attach the file to the email as a path
        path: filePath,
        contentType: "application/epub+zip",
      },
    ],
  };

  await transporter.sendMail(mailOptions).then(() => {
    // Delete the file after sending
    unlinkSync(filePath);
  });
}

bot.on(":document", (ctx) => {
  if (!ctx.message?.document) return;
  if (ctx.message.document.mime_type === "application/epub+zip") {
    ctx.reply("On it").then(() => {
      sendTgDocumentToKindle(ctx.message.document, ctx)
        .then(() => {
          ctx.reply("Done!", { reply_to_message_id: ctx.message.message_id });
        })
        .catch((e) => {
          ctx.reply(`Failed to send doc with error: ${e}`);
        });
    });
  }
});

bot.start();

bot.api.getMe().then((me) => {
  console.log(
    `Bot @${
      me.username
    } is up and running! Current date: ${new Date().toISOString()}`
  );
});
