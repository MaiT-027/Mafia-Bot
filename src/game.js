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
exports.checkRevive = exports.Night_Police = exports.Night_Doctor = exports.Night_Mafia = exports.checkFinish = exports.Vote = exports.Day = exports.decideJob = exports.initGame = void 0;
const discord_js_1 = require("discord.js");
const MAX_PLAYERS = 2; //DEBUG 8
const jobList = {
    MAFIA_1: 1,
    MAFIA_2: 2,
    DOCTOR: 3,
    POLICE: 4,
};
const voteEmoji = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣"];
const START_TIME = 0; //DEBUG 10000
const DAY_TIME = 120000; //DEBUG 120000
const VOTE_TIME = 30000; //DEBUG 30000
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
function initGame(client, msg, currentGamingGuildList) {
    return __awaiter(this, void 0, void 0, function* () {
        if (currentGamingGuildList.includes(msg.guildId)) {
            msg.channel.send("서버에 이미 게임이 진행중입니다.");
            return;
        }
        const initMsg = yield msg.channel.send("참가할 플레이어는 👍 이모티콘을 눌러주세요(30초)!");
        initMsg.react("👍");
        currentGamingGuildList.push(msg.guildId);
        const collector = new discord_js_1.ReactionCollector(initMsg, {
            filter: (reaction, user) => {
                return (reaction.emoji.name === "👍" &&
                    !user.bot &&
                    !memberListMsg.content.includes(user.username));
            },
            time: 30000,
            max: MAX_PLAYERS,
        });
        const membersID = [];
        const memberListMsg = yield msg.channel.send("참가할 플레이어 목록 : ");
        collector.on("collect", (_reaction, user) => __awaiter(this, void 0, void 0, function* () {
            membersID.push(user.id);
            memberListMsg.edit(memberListMsg.content + " " + user.username);
        }));
        const result = yield new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            collector.on("end", (collected) => __awaiter(this, void 0, void 0, function* () {
                if (membersID.length == MAX_PLAYERS) {
                    msg.channel.send("게임이 시작됩니다.");
                    console.log(`${msg.guild.name} 서버에서 게임이 시작되었습니다.`);
                    resolve([client, msg, membersID, currentGamingGuildList]);
                }
                else {
                    msg.channel.send(`인원이 부족하여 게임을 시작할 수 없습니다. (${MAX_PLAYERS - collected.size}명 부족)`);
                    currentGamingGuildList = currentGamingGuildList.filter((element) => element !== msg.guildId);
                    resolve();
                }
            }));
        }));
        return result;
    });
}
exports.initGame = initGame;
function decideJob(client, msg, membersID, currentGamingGuildList) {
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
        msg.channel.send("직업이 모두 결정되었습니다. 10초 후 게임이 시작됩니다.");
        yield timeout(START_TIME);
        return [msg, memberObjects, currentGamingGuildList];
    });
}
exports.decideJob = decideJob;
function Day(msg, memberObjects, currentGamingGuildList) {
    return __awaiter(this, void 0, void 0, function* () {
        yield msg.channel.send("아침이 밝았습니다. 2분 동안 자유토론을 할 수 있습니다.");
        yield msg.channel.send("아침을 스킵하시려면 과반수 이상이 채팅에 '!스킵'을 입력해주세요.");
        let skipList = [];
        const skipCollector = new discord_js_1.MessageCollector(msg.channel, {
            filter: (msg, _collection) => {
                return (msg.content === "!스킵" &&
                    !skipList.includes(msg.author.id) &&
                    memberObjects.some((obj) => obj.user.id === msg.author.id));
            },
            time: DAY_TIME,
            max: memberObjects.length % 2 == 0
                ? Math.floor(memberObjects.length / 2)
                : Math.floor(memberObjects.length / 2) + 1,
        });
        skipCollector.on("collect", (msg, _collection) => {
            skipList.push(msg.author.id);
            msg.channel.send(`${msg.author.username}님이 스킵에 찬성하셨습니다.`);
        });
        const result = yield new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            skipCollector.on("end", (_collected) => __awaiter(this, void 0, void 0, function* () {
                yield msg.channel.send("아침이 끝났습니다. 투표가 진행됩니다.");
                resolve([msg, memberObjects, currentGamingGuildList]);
            }));
        }));
        return result;
    });
}
exports.Day = Day;
function Vote(msg, memberObjects, currentGamingGuildList) {
    return __awaiter(this, void 0, void 0, function* () {
        const embed = new discord_js_1.EmbedBuilder({
            title: "투표 (30초)",
            description: "추방할 사람의 번호에 맞는 이모티콘을 눌러주세요.",
        }).addFields(memberObjects.map((member, i) => {
            return { name: member.user.username, value: `${i + 1}번` };
        }));
        const embeddedMessage = yield msg.channel.send({ embeds: [embed] });
        for (let i = 0; i < memberObjects.length; i++) {
            yield embeddedMessage.react(voteEmoji[i]);
        }
        let votedMember = [];
        const votedAmount = new Array(memberObjects.length).fill(0);
        const voteEmojiCollector = new discord_js_1.ReactionCollector(embeddedMessage, {
            filter: (reaction, user) => {
                return voteEmoji.includes(reaction.emoji.name) && !user.bot;
            },
            time: VOTE_TIME,
            dispose: true,
        });
        voteEmojiCollector.on("collect", (reaction, user) => __awaiter(this, void 0, void 0, function* () {
            if (votedMember.some((member) => member.user_id === user.id))
                return;
            votedAmount[voteEmoji.indexOf(reaction.emoji.name)]++;
            votedMember.push({
                user_id: user.id,
                voted: voteEmoji.indexOf(reaction.emoji.name),
            });
            yield msg.channel.send(`${user.username}님이 ${voteEmoji.indexOf(reaction.emoji.name) + 1}번에 투표하셨습니다.`);
        }));
        voteEmojiCollector.on("remove", (reaction, user) => __awaiter(this, void 0, void 0, function* () {
            if (votedMember.find((element) => {
                return element.user_id === user.id;
            }) === undefined) {
                return;
            }
            if (votedMember.find((element) => {
                return element.user_id === user.id;
            }).voted !== voteEmoji.indexOf(reaction.emoji.name)) {
                return;
            }
            votedMember = votedMember.filter((element) => element.user_id !== user.id);
            votedAmount[voteEmoji.indexOf(reaction.emoji.name)]--;
            yield msg.channel.send(`${user.username}님이 ${voteEmoji.indexOf(reaction.emoji.name) + 1}번 투표를 취소했습니다.`);
        }));
        const result = yield new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            voteEmojiCollector.on("end", (_collected) => __awaiter(this, void 0, void 0, function* () {
                yield msg.channel.send("투표 종료. 결과를 계산 중입니다...");
                let max_vote = 0;
                let dropped_list = [];
                for (let i = 0; i < memberObjects.length; i++) {
                    if (votedAmount[i] > max_vote) {
                        max_vote = votedAmount[i];
                        dropped_list = [];
                        dropped_list.push(memberObjects[i]);
                    }
                    else if (votedAmount[i] == max_vote) {
                        dropped_list.push(memberObjects[i]);
                    }
                }
                if (max_vote == 0)
                    dropped_list = [];
                if (dropped_list.length == 1) {
                    //추방 판정
                    //최다 득표가 1명(추방)
                    yield msg.channel.send(`${dropped_list[0].user.username}님이 최다 득표로 추방되었습니다. (${max_vote}표)`);
                    if (dropped_list[0].job == jobList.MAFIA_1 ||
                        dropped_list[0].job == jobList.MAFIA_2) {
                        yield msg.channel.send("그는 마피아였습니다.");
                    }
                    memberObjects = memberObjects.filter((object) => {
                        return object !== dropped_list[0];
                    });
                }
                else if (dropped_list.length > 1) {
                    //최다 득표가 여러 명
                    yield msg.channel.send(`${dropped_list.length}명의 최다 득표자가 나와 투표가 무효 처리되었습니다. (${max_vote}표)`);
                }
                else {
                    //득표 없음(기권)
                    yield msg.channel.send("투표가 0표이므로 자동 기권 처리됩니다.");
                }
                resolve([msg, memberObjects, currentGamingGuildList]);
            }));
        }));
        return result;
    });
}
exports.Vote = Vote;
function checkFinish(msg, memberObjects, currentGamingGuildList) {
    return __awaiter(this, void 0, void 0, function* () {
        /*   let mafia_num = 0;
        for (let i = 0; i < memberObjects.length; i++) {
          if (
            memberObjects[i].job == jobList.MAFIA_1 ||
            memberObjects[i].job == jobList.MAFIA_2
          ) {
            mafia_num++;
          }
        }
      
        return await new Promise<
          | boolean
          | [msg: Message, memberObjects: memObject, currentGamingGuildList: string[]]
        >(async () => {
          let civilian_num = memberObjects.length - mafia_num;
          if (mafia_num >= civilian_num || mafia_num == 0) {
            //게임 종료
            let gameOverMessage = "게임이 종료되었습니다. ";
            const mafia_win = mafia_num == 0 ? false : true;
            if (mafia_win) {
              gameOverMessage +=
                "마피아 승리 (시민의 수가 마피아보다 적거나 같습니다.)";
            } else {
              gameOverMessage += "시민팀 승리 (마피아가 전부 제거되었습니다.)";
            }
            await msg.channel.send(gameOverMessage);
      
            currentGamingGuildList.splice(
              currentGamingGuildList.indexOf(msg.guildId),
              1
            );
            console.log(`${msg.guild.name} 서버에서 게임이 종료되었습니다.`);
            return false;
          } else {
            await msg.channel.send("밤이 찾아옵니다...");
            return [msg, memberObjects, currentGamingGuildList];
          }
         
        }); */
        yield msg.channel.send("밤이 찾아옵니다...");
        return [msg, memberObjects, currentGamingGuildList];
    });
}
exports.checkFinish = checkFinish;
function Night_Mafia(msg, memberObjects, currentGamingGuildList) {
    return __awaiter(this, void 0, void 0, function* () {
        yield msg.channel.send("마피아의 차례입니다.");
        const mafiaList = [];
        const mafiaVoteMessageList = [];
        const emojiCollectorList = [];
        const msgCollectorList = [];
        mafiaList.push(memberObjects.find((member) => member.job === jobList.MAFIA_1));
        mafiaList.push(memberObjects.find((member) => member.job === jobList.MAFIA_2));
        const embed = new discord_js_1.EmbedBuilder({
            title: "투표 (30초)",
            description: "처리할 사람의 번호에 맞는 이모티콘을 눌러주세요.",
        }).addFields(memberObjects.map((member, i) => {
            return { name: member.user.username, value: `${i + 1}번` };
        }));
        const votedAmount = [];
        for (let i = 0; i < mafiaList.length; i++) {
            mafiaVoteMessageList.push(yield mafiaList[i].dmChannel.send({ embeds: [embed] }));
            yield mafiaList[i].dmChannel.send("투표를 통해 처리할 사람을 결정해주세요.\n이 채팅방에 채팅을 입력하면 또 다른 마피아와 소통할 수 있습니다.\n투표는 취소할 수 없습니다.");
            for (let j = 0; j < memberObjects.length; j++) {
                yield mafiaVoteMessageList[i].react(voteEmoji[j]);
            }
            emojiCollectorList.push(new discord_js_1.ReactionCollector(mafiaVoteMessageList[i], {
                filter: (reaction, user) => {
                    return voteEmoji.includes(reaction.emoji.name) && !user.bot;
                },
                time: 30000,
                max: 1,
                dispose: true,
            }));
            for (let j = 0; j < mafiaList.length; j++) {
                msgCollectorList.push(new discord_js_1.MessageCollector(mafiaList[j].dmChannel, {
                    filter: (msg, _collection) => {
                        return !msg.author.bot;
                    },
                }));
            }
            emojiCollectorList[i].on("collect", (reaction, _user) => __awaiter(this, void 0, void 0, function* () {
                votedAmount.push(voteEmoji.indexOf(reaction.emoji.name));
            }));
            if (mafiaList.length === 2) {
                msgCollectorList[i].on("collect", (msg, _collection) => {
                    if (i === 0)
                        mafiaList[1].dmChannel.send(`${mafiaList[0].user.username}: ${msg.content}`);
                    else if (i === 1)
                        mafiaList[0].dmChannel.send(`${mafiaList[1].user.username}: ${msg.content}`);
                });
            }
        }
        const result = yield new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < mafiaList.length; i++) {
                emojiCollectorList[i].on("end", (_collected, reason) => __awaiter(this, void 0, void 0, function* () {
                    if (votedAmount.length === mafiaList.length)
                        resolve(votedAmount);
                    if (reason == "time")
                        resolve(votedAmount);
                }));
            }
        }));
        msgCollectorList.every((collector) => collector.stop());
        return [msg, memberObjects, currentGamingGuildList, result];
    });
}
exports.Night_Mafia = Night_Mafia;
function Night_Doctor(msg, memberObjects, currentGamingGuildList, mafiaResult) {
    return __awaiter(this, void 0, void 0, function* () {
        yield msg.channel.send("의사의 차례입니다.");
        const doctor = memberObjects.find((member) => {
            member.job == jobList.DOCTOR;
        });
        const embed = new discord_js_1.EmbedBuilder({
            title: "투표 (30초)",
            description: "치료할 사람의 번호에 맞는 이모티콘을 눌러주세요.",
        }).addFields(memberObjects.map((member, i) => {
            return { name: member.user.username, value: `${i + 1}번` };
        }));
        const embeddedMessage = yield doctor.dmChannel.send({ embeds: [embed] });
        for (let i = 0; i < memberObjects.length; i++) {
            yield embeddedMessage.react(voteEmoji[i]);
        }
        const voteEmojiCollector = new discord_js_1.ReactionCollector(embeddedMessage, {
            filter: (reaction, user) => {
                return voteEmoji.includes(reaction.emoji.name) && !user.bot;
            },
            time: 30000,
            max: 1,
            dispose: true,
        });
        const result = yield new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            voteEmojiCollector.on("end", (collected) => __awaiter(this, void 0, void 0, function* () {
                const result = voteEmoji.indexOf(collected.at(0).emoji.name);
                resolve(result);
            }));
        }));
        return [msg, memberObjects, currentGamingGuildList, mafiaResult, result];
    });
}
exports.Night_Doctor = Night_Doctor;
function Night_Police(msg, memberObjects, currentGamingGuildList, mafiaResult, doctorResult) {
    return __awaiter(this, void 0, void 0, function* () {
        yield msg.channel.send("경찰의 차례입니다.");
        const police = memberObjects.find((member) => {
            member.job == jobList.POLICE;
        });
        const embed = new discord_js_1.EmbedBuilder({
            title: "투표 (30초)",
            description: "조사할 사람의 번호에 맞는 이모티콘을 눌러주세요.",
        }).addFields(memberObjects.map((member, i) => {
            return { name: member.user.username, value: `${i + 1}번` };
        }));
        const embeddedMessage = yield police.dmChannel.send({ embeds: [embed] });
        for (let i = 0; i < memberObjects.length; i++) {
            yield embeddedMessage.react(voteEmoji[i]);
        }
        const voteEmojiCollector = new discord_js_1.ReactionCollector(embeddedMessage, {
            filter: (reaction, user) => {
                return voteEmoji.includes(reaction.emoji.name) && !user.bot;
            },
            time: 30000,
            max: 1,
            dispose: true,
        });
        yield new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            voteEmojiCollector.on("end", (collected) => __awaiter(this, void 0, void 0, function* () {
                const result = voteEmoji.indexOf(collected.at(0).emoji.name);
                if (memberObjects[result].job == jobList.MAFIA_1 ||
                    memberObjects[result].job == jobList.MAFIA_2) {
                    resolve(yield police.dmChannel.send(`${memberObjects[result].user.username}은(는) 마피아입니다.`));
                }
                else {
                    resolve(yield police.dmChannel.send(`${memberObjects[result].user.username}은(는) 마피아가 아닙니다.`));
                }
            }));
        }));
        return [
            msg,
            memberObjects,
            currentGamingGuildList,
            mafiaResult,
            doctorResult,
        ];
    });
}
exports.Night_Police = Night_Police;
function checkRevive(msg, memberObjects, currentGamingGuildList, mafiaResult, doctorResult) {
    return __awaiter(this, void 0, void 0, function* () {
        if (mafiaResult.length == 2) {
            if (mafiaResult[0] == mafiaResult[1]) {
                //투표가 같음
                if (mafiaResult[0] == doctorResult) {
                    //치료 성공
                    yield msg.channel.send("의사가 치료에 성공하였습니다.");
                }
                else {
                    yield msg.channel.send(`${memberObjects[mafiaResult[0]].user.username}이(가) 마피아에게 살해당했습니다.`);
                    memberObjects = memberObjects.filter((object) => {
                        return object != memberObjects[mafiaResult[0]];
                    });
                }
            }
            else
                yield msg.channel.send("아무 일도 일어나지 않았습니다.");
        }
        else if (mafiaResult.length == 1) {
            if (mafiaResult[0] == doctorResult) {
                //치료 성공
                yield msg.channel.send("의사가 치료에 성공하였습니다.");
            }
            else {
                yield msg.channel.send(`${memberObjects[mafiaResult[0]].user.username}이(가) 마피아에게 살해당했습니다.`);
                memberObjects = memberObjects.filter((object) => {
                    return object != memberObjects[mafiaResult[0]];
                });
            }
        }
        return [msg, memberObjects, currentGamingGuildList];
    });
}
exports.checkRevive = checkRevive;
