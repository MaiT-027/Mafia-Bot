import { Client, GatewayIntentBits } from "discord.js";
import token from "./auth";
import startGame from "./game";

const prefix = "!";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
  ],
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.author.id == client.user?.id) return;
  if (!message.content.startsWith(prefix)) return;

  const content = message.content.replace("!", "").toLowerCase();

  switch (content) {
    case "시작":
      startGame(client, message);
      break;
  }
});

client.once("ready", () => {
  client.user?.setPresence({ activities: [{ name: "Listening" }] });
  console.log(`Bot Ready: ${client.user?.tag}`);
});

client.login(token);
