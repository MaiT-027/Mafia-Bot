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
const game_1 = __importDefault(require("./game"));
const prefix = "!";
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
        discord_js_1.GatewayIntentBits.GuildEmojisAndStickers,
        discord_js_1.GatewayIntentBits.GuildMessageReactions,
        discord_js_1.GatewayIntentBits.DirectMessages,
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
            (0, game_1.default)(client, message);
            break;
    }
}));
client.once("ready", () => {
    var _a, _b;
    (_a = client.user) === null || _a === void 0 ? void 0 : _a.setPresence({ activities: [{ name: "Listening" }] });
    console.log(`Bot Ready: ${(_b = client.user) === null || _b === void 0 ? void 0 : _b.tag}`);
});
client.login(auth_1.default);
