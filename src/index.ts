import { Client, EmbedBuilder, GatewayIntentBits } from "discord.js";
import token from "./auth";
import {
  initGame,
  decideJob,
  Day,
  Vote,
  checkFinish,
  Night_Mafia,
  Night_Doctor,
  Night_Police,
  checkRevive,
} from "./game";

const prefix = "!";
let currentGamingGuildList: string[] = [];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
  ],
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.author.id == client.user?.id) return;
  if (!message.content.startsWith(prefix)) return;

  const content = message.content.replace("!", "").toLowerCase();

  switch (content) {
    case "시작":
      const initResult = await initGame(
        client,
        message,
        currentGamingGuildList
      );
      if (initResult) {
        var decideResult = await decideJob(...initResult);
        var isGaming = true;
        while (isGaming) {
          const dayResult = await Day(...decideResult);
          const voteResult = await Vote(...dayResult);
          const checkResult = await checkFinish(...voteResult);
          if (typeof checkResult === "boolean") {
            //게임 끝
            isGaming = checkResult;
          } else {
            //게임 속행
            const mafia = await Night_Mafia(...checkResult);
            const doctor = await Night_Doctor(...mafia);
            const police = await Night_Police(...doctor);
            const reviveCheckResult = await checkRevive(...police);
            const checkResult_night = await checkFinish(...reviveCheckResult);
            if (typeof checkResult_night === "boolean")
              //게임 끝
              isGaming = checkResult_night;
            else decideResult = checkResult_night; //게임 속행
          }
        }
      }
      break;
    case "help":
    case "명령어":
      const embed = new EmbedBuilder({ title: "명령어" }).addFields({
        name: "시작",
        value: "게임을 시작합니다. 8명이 필요합니다.",
      });
      message.channel.send({ embeds: [embed] });
      break;
  }
});

client.once("ready", () => {
  client.user?.setPresence({ activities: [{ name: "Listening" }] });
  console.log(`Bot Ready: ${client.user?.tag}`);
});

client.login(token);
