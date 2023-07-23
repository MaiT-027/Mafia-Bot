import {
  Client,
  DMChannel,
  EmbedBuilder,
  Message,
  MessageCollector,
  User,
  ReactionCollector,
} from "discord.js";

const MAX_PLAYERS = 2; //DEBUG
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

type memObject = { user: User; job: number; dmChannel: DMChannel }[];

function generateUniqueRandomNumbers(max: number, count: number): number[] {
  const numbers: number[] = [];

  while (numbers.length < count) {
    const randomNumber = Math.floor(Math.random() * max) + 1;
    if (!numbers.includes(randomNumber)) {
      numbers.push(randomNumber);
    }
  }

  return numbers;
}

function timeout(time: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

export async function initGame(
  client: Client,
  message: Message,
  currentGamingGuildList: string[]
) {
  if (currentGamingGuildList.includes(message.guildId)) {
    message.channel.send("서버에 이미 게임이 진행중입니다.");
    return;
  }

  const initMsg = await message.channel.send(
    "참가할 플레이어는 👍 이모티콘을 눌러주세요(30초)!"
  );
  initMsg.react("👍");
  currentGamingGuildList.push(message.guildId);

  const collector = new ReactionCollector(initMsg, {
    filter: (reaction, user) => {
      return (
        reaction.emoji.name === "👍" &&
        !user.bot &&
        !memberListMsg.content.includes(user.username)
      );
    },
    time: 30000,
    max: MAX_PLAYERS,
  });

  const membersID: string[] = [];
  const memberListMsg = await message.channel.send("참가할 플레이어 목록 : ");

  collector.on("collect", async (_reaction, user) => {
    membersID.push(user.id);
    memberListMsg.edit(memberListMsg.content + " " + user.username);
  });

  const result = await new Promise<
    | [
        client: Client,
        message: Message,
        membersID: string[],
        currentGamingGuildList: string[]
      ]
    | void
  >(async (resolve) => {
    collector.on("end", async (collected) => {
      if (membersID.length == MAX_PLAYERS) {
        message.channel.send("게임이 시작됩니다.");
        console.log(`${message.guild.name} 서버에서 게임이 시작되었습니다.`);
        resolve([client, message, membersID, currentGamingGuildList]);
      } else {
        message.channel.send(
          `인원이 부족하여 게임을 시작할 수 없습니다. (${
            MAX_PLAYERS - collected.size
          }명 부족)`
        );
        currentGamingGuildList = currentGamingGuildList.filter(
          (element) => element !== message.guildId
        );
        resolve();
      }
    });
  });
  return result;
}

export async function decideJob(
  client: Client,
  message: Message,
  membersID: string[],
  currentGamingGuildList: string[]
): Promise<
  [message: Message, memberObjects: memObject, currentGamingGuildList: string[]]
> {
  let memberObjects: { user: User; job: number; dmChannel: DMChannel }[] = [];
  const rand_numbers = generateUniqueRandomNumbers(MAX_PLAYERS, MAX_PLAYERS);
  for (let i = 0; i < MAX_PLAYERS; i++) {
    const user = client.users.cache.get(membersID[i]);
    const job = rand_numbers[i];
    await user.createDM().then((dmChannel) => {
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
    .dmChannel.send(
      `${
        memberObjects.find((member) => member.job === jobList.MAFIA_2).user
          .username
      }은(는) 마피아입니다.`
    );
  memberObjects
    .find((member) => member.job === jobList.MAFIA_2)
    .dmChannel.send(
      `${
        memberObjects.find((member) => member.job === jobList.MAFIA_1).user
          .username
      }은(는) 마피아입니다.`
    );
  message.channel.send(
    "직업이 모두 결정되었습니다. 10초 후 게임이 시작됩니다."
  );

  await timeout(START_TIME);
  return [message, memberObjects, currentGamingGuildList];
}

export async function Day(
  message: Message,
  memberObjects: memObject,
  currentGamingGuildList: string[]
) {
  await message.channel.send(
    "아침이 밝았습니다. 2분 동안 자유토론을 할 수 있습니다."
  );
  await message.channel.send(
    "아침을 스킵하시려면 과반수 이상이 채팅에 '!스킵'을 입력해주세요."
  );

  let skipList: string[] = [];
  const skipCollector = new MessageCollector(message.channel, {
    filter: (msg, _collection) => {
      return (
        msg.content === "!스킵" &&
        !skipList.includes(msg.author.id) &&
        memberObjects.some((obj) => obj.user.id === msg.author.id)
      );
    },
    time: DAY_TIME,
    max:
      memberObjects.length % 2 == 0
        ? Math.floor(memberObjects.length / 2)
        : Math.floor(memberObjects.length / 2) + 1,
  });

  skipCollector.on("collect", (msg, _collection) => {
    skipList.push(msg.author.id);
    message.channel.send(`${msg.author.username}님이 스킵에 찬성하셨습니다.`);
  });

  const result = await new Promise<
    [
      message: Message,
      memberObjects: memObject,
      currentGamingGuildList: string[]
    ]
  >(async (resolve) => {
    skipCollector.on("end", async (_collected) => {
      await message.channel.send("아침이 끝났습니다. 투표가 진행됩니다.");
      resolve([message, memberObjects, currentGamingGuildList]);
    });
  });
  return result;
}

export async function Vote(
  msg: Message,
  memberObjects: memObject,
  currentGamingGuildList: string[]
) {
  const embed = new EmbedBuilder({
    title: "투표 (30초)",
    description: "추방할 사람의 번호에 맞는 이모티콘을 눌러주세요.",
  }).addFields(
    memberObjects.map((member, i) => {
      return { name: member.user.username, value: `${i + 1}번` };
    })
  );

  const embeddedMessage = await msg.channel.send({ embeds: [embed] });
  for (let i = 0; i < memberObjects.length; i++) {
    await embeddedMessage.react(voteEmoji[i]);
  }

  let votedMember: { user_id: string; voted: number }[] = [];
  const votedAmount: number[] = new Array(memberObjects.length).fill(0);

  const voteEmojiCollector = new ReactionCollector(embeddedMessage, {
    filter: (reaction, user) => {
      return voteEmoji.includes(reaction.emoji.name) && !user.bot;
    },
    time: VOTE_TIME,
    dispose: true,
  });

  voteEmojiCollector.on("collect", async (reaction, user) => {
    if (votedMember.some((member) => member.user_id === user.id)) return;
    votedAmount[voteEmoji.indexOf(reaction.emoji.name)]++;
    votedMember.push({
      user_id: user.id,
      voted: voteEmoji.indexOf(reaction.emoji.name),
    });
    await msg.channel.send(
      `${user.username}님이 ${
        voteEmoji.indexOf(reaction.emoji.name) + 1
      }번에 투표하셨습니다.`
    );
  });

  voteEmojiCollector.on("remove", async (reaction, user) => {
    if (
      votedMember.find((element) => {
        return element.user_id === user.id;
      }) === undefined
    ) {
      return;
    }
    if (
      votedMember.find((element) => {
        return element.user_id === user.id;
      }).voted !== voteEmoji.indexOf(reaction.emoji.name)
    ) {
      return;
    }
    votedMember = votedMember.filter((element) => element.user_id !== user.id);
    votedAmount[voteEmoji.indexOf(reaction.emoji.name)]--;
    await msg.channel.send(
      `${user.username}님이 ${
        voteEmoji.indexOf(reaction.emoji.name) + 1
      }번 투표를 취소했습니다.`
    );
  });

  const result = await new Promise<
    [
      message: Message,
      memberObjects: memObject,
      currentGamingGuildList: string[]
    ]
  >(async (resolve) => {
    voteEmojiCollector.on("end", async (_collected) => {
      await msg.channel.send("투표 종료. 결과를 계산 중입니다...");
      let max_vote = 0;
      let dropped_list: { user: User; job: number; dmChannel: DMChannel }[] =
        [];
      for (let i = 0; i < memberObjects.length; i++) {
        if (votedAmount[i] > max_vote) {
          max_vote = votedAmount[i];
          dropped_list = [];
          dropped_list.push(memberObjects[i]);
        } else if (votedAmount[i] == max_vote) {
          dropped_list.push(memberObjects[i]);
        }
      }
      if (max_vote == 0) dropped_list = [];
      if (dropped_list.length == 1) {
        //추방 판정
        //최다 득표가 1명(추방)
        await msg.channel.send(
          `${dropped_list[0].user.username}님이 최다 득표로 추방되었습니다. (${max_vote}표)`
        );
        if (
          dropped_list[0].job == jobList.MAFIA_1 ||
          dropped_list[0].job == jobList.MAFIA_2
        ) {
          await msg.channel.send("그는 마피아였습니다.");
        }
        memberObjects = memberObjects.filter((object) => {
          return object !== dropped_list[0];
        });
      } else if (dropped_list.length > 1) {
        //최다 득표가 여러 명
        await msg.channel.send(
          `${dropped_list.length}명의 최다 득표자가 나와 투표가 무효 처리되었습니다. (${max_vote}표)`
        );
      } else {
        //득표 없음(기권)
        await msg.channel.send("투표가 0표이므로 자동 기권 처리됩니다.");
      }
      resolve([msg, memberObjects, currentGamingGuildList]);
    });
  });
  return result;
}

export async function checkFinish(
  msg: Message,
  memberObjects: memObject,
  currentGamingGuildList: string[]
): Promise<
  | boolean
  | [msg: Message, memberObjects: memObject, currentGamingGuildList: string[]]
> {
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
  await msg.channel.send("밤이 찾아옵니다...");
  return [msg, memberObjects, currentGamingGuildList];
}

export async function Night_Mafia(
  msg: Message,
  memberObjects: memObject,
  currentGamingGuildList: string[]
): Promise<
  [
    message: Message,
    memberObjects: memObject,
    currentGamingGuildList: string[],
    mafiaVotedAmount: number[]
  ]
> {
  await msg.channel.send("마피아의 차례입니다.");
  const mafiaList: memObject = [];
  const mafiaVoteMessageList: Message[] = [];
  const emojiCollectorList: ReactionCollector[] = [];
  const msgCollectorList: MessageCollector[] = [];
  mafiaList.push(
    memberObjects.find((member) => member.job === jobList.MAFIA_1)
  );
  mafiaList.push(
    memberObjects.find((member) => member.job === jobList.MAFIA_2)
  );

  const embed = new EmbedBuilder({
    title: "투표 (30초)",
    description: "처리할 사람의 번호에 맞는 이모티콘을 눌러주세요.",
  }).addFields(
    memberObjects.map((member, i) => {
      return { name: member.user.username, value: `${i + 1}번` };
    })
  );

  const votedAmount: number[] = [];

  for (let i = 0; i < mafiaList.length; i++) {
    mafiaVoteMessageList.push(
      await mafiaList[i].dmChannel.send({ embeds: [embed] })
    );
    await mafiaList[i].dmChannel.send(
      "투표를 통해 처리할 사람을 결정해주세요.\n이 채팅방에 채팅을 입력하면 또 다른 마피아와 소통할 수 있습니다.\n투표는 취소할 수 없습니다."
    );
    for (let j = 0; j < memberObjects.length; j++) {
      await mafiaVoteMessageList[i].react(voteEmoji[j]);
    }

    emojiCollectorList.push(
      new ReactionCollector(mafiaVoteMessageList[i], {
        filter: (reaction, user) => {
          return voteEmoji.includes(reaction.emoji.name) && !user.bot;
        },
        time: 30000,
        max: 1,
        dispose: true,
      })
    );

    for (let j = 0; j < mafiaList.length; j++) {
      msgCollectorList.push(
        new MessageCollector(mafiaList[j].dmChannel, {
          filter: (msg, _collection) => {
            return !msg.author.bot;
          },
        })
      );
    }

    emojiCollectorList[i].on("collect", async (reaction, user) => {
      votedAmount.push(voteEmoji.indexOf(reaction.emoji.name));
      for (let j = 0; j < mafiaList.length; j++) {
        await mafiaList[j].dmChannel.send(
          `${user.username}님이 ${
            voteEmoji.indexOf(reaction.emoji.name) + 1
          }번에 투표하셨습니다.`
        );
      }
    });

    if (mafiaList.length === 2) {
      msgCollectorList[i].on("collect", (msg, _collection) => {
        if (i === 0)
          mafiaList[1].dmChannel.send(
            `${mafiaList[0].user.username}: ${msg.content}`
          );
        else if (i === 1)
          mafiaList[0].dmChannel.send(
            `${mafiaList[1].user.username}: ${msg.content}`
          );
      });
    }
  }
  const result = await new Promise<number[]>(async (resolve) => {
    for (let i = 0; i < mafiaList.length; i++) {
      emojiCollectorList[i].on("end", async (_collected, reason) => {
        if (votedAmount.length === mafiaList.length) resolve(votedAmount);
        if (reason == "time") resolve(votedAmount);
      });
    }
  });

  msgCollectorList.every((collector) => collector.stop());
  return [msg, memberObjects, currentGamingGuildList, result];
}

export async function Night_Doctor() {}
