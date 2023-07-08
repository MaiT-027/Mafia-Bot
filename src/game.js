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
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const discord_js_2 = require("discord.js");
const MAX_PLAYERS = 2; //DEBUG
const jobList = {
    MAFIA_1: 1,
    MAFIA_2: 2,
    DOCTOR: 3,
    POLICE: 4,
};
function generateUniqueRandomNumbers(max, count) {
    const numbers = [];
    while (numbers.length < count) {
        const randomNumber = Math.floor(Math.random() * max) + 1;
        if (!numbers.includes(randomNumber)) {
            numbers.push(randomNumber);
        }
    }
    return numbers;
}
function timeout(time) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}
let currentGamingGuildList = [];
function initGame(client, message) {
    return __awaiter(this, void 0, void 0, function* () {
        if (currentGamingGuildList.includes(message.guildId)) {
            message.channel.send("서버에 이미 게임이 진행중입니다.");
            return;
        }
        const initMsg = yield message.channel.send("참가할 플레이어는 👍 이모티콘을 눌러주세요(30초)!");
        initMsg.react("👍");
        currentGamingGuildList.push(message.guildId);
        const collector = new discord_js_2.ReactionCollector(initMsg, {
            filter: (reaction, user) => {
                return reaction.emoji.name === "👍" && !user.bot;
            },
            time: 30000,
            max: MAX_PLAYERS,
        });
        const membersID = [];
        const memberListMsg = yield message.channel.send("참가할 플레이어 목록 : ");
        collector.on("collect", (_reaction, user) => __awaiter(this, void 0, void 0, function* () {
            membersID.push(user.id);
            memberListMsg.edit(memberListMsg.content + " " + user.username);
        }));
        collector.on("end", (collected) => {
            if (membersID.length == MAX_PLAYERS) {
                message.channel.send("게임이 시작됩니다.");
                progressGame(client, message, membersID);
            }
            else {
                message.channel.send(`인원이 부족하여 게임을 시작할 수 없습니다. (${MAX_PLAYERS - collected.size}명 부족)`);
                currentGamingGuildList = currentGamingGuildList.filter((element) => element !== message.guildId);
            }
        });
    });
}
function progressGame(client, message, membersID) {
    return __awaiter(this, void 0, void 0, function* () {
        let memberObjects = [];
        const rand_numbers = generateUniqueRandomNumbers(MAX_PLAYERS, MAX_PLAYERS);
        for (let i = 0; i < MAX_PLAYERS; i++) {
            const user = client.users.cache.get(membersID[i]);
            const job = rand_numbers[i];
            yield user.createDM().then((dmChannel) => {
                memberObjects.push({ user, job, dmChannel });
            });
        }
        for (let i = 0; i < MAX_PLAYERS; i++) {
            let jobRevealMessage = "당신의 직업은 ";
            switch (memberObjects[i].job) {
                case jobList.MAFIA_1:
                case jobList.MAFIA_2:
                    jobRevealMessage += "마피아입니다.";
                    break;
                case jobList.DOCTOR:
                    jobRevealMessage += "의사입니다.";
                    break;
                case jobList.POLICE:
                    jobRevealMessage += "경찰입니다.";
                    break;
                default:
                    jobRevealMessage += "시민입니다.";
                    break;
            }
            memberObjects[i].dmChannel.send(jobRevealMessage);
        }
        memberObjects
            .find((member) => member.job === jobList.MAFIA_1)
            .dmChannel.send(`${memberObjects.find((member) => member.job === jobList.MAFIA_2).user
            .username}은(는) 마피아입니다.`);
        memberObjects
            .find((member) => member.job === jobList.MAFIA_2)
            .dmChannel.send(`${memberObjects.find((member) => member.job === jobList.MAFIA_1).user
            .username}은(는) 마피아입니다.`);
        message.channel.send("직업이 모두 결정되었습니다. 10초 후 게임이 시작됩니다.");
        yield timeout(10000);
        yield Day(message, memberObjects);
    });
}
function Day(message, memberObjects) {
    return __awaiter(this, void 0, void 0, function* () {
        message.channel.send("아침이 밝았습니다. 2분 동안 자유토론을 할 수 있습니다.");
        message.channel.send("아침을 스킵하시려면 과반수 이상이 채팅에 '!스킵'을 입력해주세요.");
        let skipList = [];
        const skipCollector = new discord_js_1.MessageCollector(message.channel, {
            filter: (msg, _collection) => {
                return msg.content === "!스킵" && !skipList.includes(msg.author.id);
            },
            time: 120000,
            max: MAX_PLAYERS % 2 == 0 ? MAX_PLAYERS / 2 : MAX_PLAYERS / 2 + 1,
        });
        skipCollector.on("collect", (msg, _collection) => {
            skipList.push(msg.author.id);
            message.channel.send(`${msg.author.username}님이 스킵에 찬성하셨습니다.`);
        });
        skipCollector.on("end", (_collected) => {
            message.channel.send("아침이 끝났습니다. 투표가 진행됩니다.");
            Vote(message, memberObjects);
        });
    });
}
const voteEmoji = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣"];
function Vote(msg, memberObjects) {
    return __awaiter(this, void 0, void 0, function* () {
        const embed = new discord_js_1.EmbedBuilder({
            title: "투표",
            description: "추방할 사람의 번호에 맞는 이모티콘을 눌러주세요.",
        }).addFields(memberObjects.map((member, i) => {
            return { name: member.user.username, value: `${i + 1}번` };
        }));
        const embeddedMessage = yield msg.channel.send({ embeds: [embed] });
        for (let i = 0; i < memberObjects.length; i++) {
            embeddedMessage.react(voteEmoji[i]);
        }
    });
}
exports.default = initGame;
