"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const auth_1 = __importDefault(require("./auth"));
const game_1 = require("./game");
const prefix = "!";
let currentGamingGuildList = [];
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
        discord_js_1.GatewayIntentBits.GuildEmojisAndStickers,
        discord_js_1.GatewayIntentBits.GuildMessageReactions,
        discord_js_1.GatewayIntentBits.DirectMessages,
        discord_js_1.GatewayIntentBits.DirectMessageReactions,
    ],
});
client.on("messageCreate", (message) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (message.author.bot)
        return;
    if (message.author.id == ((_a = client.user) === null || _a === void 0 ? void 0 : _a.id))
        return;
    if (!message.content.startsWith(prefix))
        return;
    const content = message.content.replace("!", "").toLowerCase();
    switch (content) {
        case "시작":
            const initResult = yield (0, game_1.initGame)(client, message, currentGamingGuildList);
            if (initResult) {
                var decideResult = yield (0, game_1.decideJob)(...initResult);
                var isGaming = true;
                while (isGaming) {
                    const dayResult = yield (0, game_1.Day)(...decideResult);
                    const voteResult = yield (0, game_1.Vote)(...dayResult);
                    const checkResult = yield (0, game_1.checkFinish)(...voteResult);
                    if (typeof checkResult === "boolean") {
                        //게임 끝
                        isGaming = checkResult;
                    }
                    else {
                        //게임 속행
                        const mafia = yield (0, game_1.Night_Mafia)(...checkResult);
                        const doctor = yield (0, game_1.Night_Doctor)(...mafia);
                        const police = yield (0, game_1.Night_Police)(...doctor);
                        const reviveCheckResult = yield (0, game_1.checkRevive)(...police);
                        const checkResult_night = yield (0, game_1.checkFinish)(...reviveCheckResult);
                        if (typeof checkResult_night === "boolean")
                            //게임 끝
                            isGaming = checkResult_night;
                        else
                            decideResult = checkResult_night; //게임 속행
                    }
                }
            }
            break;
        case "help":
        case "명령어":
            const embed = new discord_js_1.EmbedBuilder({ title: "명령어" }).addFields({
                name: "시작",
                value: "게임을 시작합니다. 8명이 필요합니다.",
            });
            message.channel.send({ embeds: [embed] });
            break;
    }
}));
client.once("ready", () => {
    var _a, _b;
    (_a = client.user) === null || _a === void 0 ? void 0 : _a.setPresence({ activities: [{ name: "Listening" }] });
    console.log(`Bot Ready: ${(_b = client.user) === null || _b === void 0 ? void 0 : _b.tag}`);
});
client.login(auth_1.default);
