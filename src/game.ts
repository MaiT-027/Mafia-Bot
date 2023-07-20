import {
  Client,
  DMChannel,
  EmbedBuilder,
  Message,
  MessageCollector,
  User,
} from "discord.js";
import { ReactionCollector } from "discord.js";

const MAX_PLAYERS = 2; //DEBUG
const jobList = {
  MAFIA_1: 1,
  MAFIA_2: 2,
  DOCTOR: 3,
  POLICE: 4,
};
const voteEmoji = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣"];

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

async function initGame(
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
      return reaction.emoji.name === "👍" && !user.bot;
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

  collector.on("end", (collected) => {
    if (membersID.length == MAX_PLAYERS) {
      message.channel.send("게임이 시작됩니다.");
      decideJob(client, message, membersID, currentGamingGuildList);
      console.log(`${message.guild.name} 서버에서 게임이 시작되었습니다.`);
    } else {
      message.channel.send(
        `인원이 부족하여 게임을 시작할 수 없습니다. (${
          MAX_PLAYERS - collected.size
        }명 부족)`
      );
      currentGamingGuildList = currentGamingGuildList.filter(
        (element) => element !== message.guildId
      );
    }
  });
}

async function decideJob(
  client: Client,
  message: Message,
  membersID: string[],
  currentGamingGuildList: string[]
) {
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

  await timeout(10000);
  await Day(message, memberObjects, currentGamingGuildList);
}

async function Day(
  message: Message,
  memberObjects: { user: User; job: number; dmChannel: DMChannel }[],
  currentGamingGuildList: string[]
) {
  message.channel.send(
    "아침이 밝았습니다. 2분 동안 자유토론을 할 수 있습니다."
  );
  message.channel.send(
    "아침을 스킵하시려면 과반수 이상이 채팅에 '!스킵'을 입력해주세요."
  );

  let skipList: string[] = [];
  const skipCollector = new MessageCollector(message.channel, {
    filter: (msg, _collection) => {
      return msg.content === "!스킵" && !skipList.includes(msg.author.id);
    },
    time: 120000,
    max:
      memberObjects.length % 2 == 0
        ? memberObjects.length / 2
        : memberObjects.length / 2 + 1,
  });

  skipCollector.on("collect", (msg, _collection) => {
    skipList.push(msg.author.id);
    message.channel.send(`${msg.author.username}님이 스킵에 찬성하셨습니다.`);
  });

  skipCollector.on("end", (_collected) => {
    message.channel.send("아침이 끝났습니다. 투표가 진행됩니다.");
    Vote(message, memberObjects, currentGamingGuildList);
  });
}

async function Vote(
  msg: Message,
  memberObjects: { user: User; job: number; dmChannel: DMChannel }[],
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
    embeddedMessage.react(voteEmoji[i]);
  }

  let votedMember: { user_id: string; voted: number }[] = [];
  const votedAmount: number[] = new Array(memberObjects.length).fill(0);

  const voteEmojiCollector = new ReactionCollector(embeddedMessage, {
    filter: (reaction, user) => {
      return voteEmoji.includes(reaction.emoji.name) && !user.bot;
    },
    time: 30000,
    dispose: true,
  });

  voteEmojiCollector.on("collect", (reaction, user) => {
    if (votedMember.some((member) => member.user_id === user.id)) return;
    votedAmount[voteEmoji.indexOf(reaction.emoji.name)]++;
    votedMember.push({
      user_id: user.id,
      voted: voteEmoji.indexOf(reaction.emoji.name),
    });
    msg.channel.send(
      `${user.username}님이 ${
        voteEmoji.indexOf(reaction.emoji.name) + 1
      }번에 투표하셨습니다.`
    );
  });

  voteEmojiCollector.on("remove", (reaction, user) => {
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
    msg.channel.send(
      `${user.username}님이 ${
        voteEmoji.indexOf(reaction.emoji.name) + 1
      }번 투표를 취소했습니다.`
    );
  });

  voteEmojiCollector.on("end", (_collected) => {
    msg.channel.send("투표 종료. 결과를 계산 중입니다...");
    let max_vote = 0;
    let dropped_list: { user: User; job: number; dmChannel: DMChannel }[] = [];
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
      //최다 득표가 1명(추방)
      msg.channel.send(
        `${dropped_list[0].user.username}님이 최다 득표로 추방되었습니다. (${max_vote}표)`
      );
      if (
        dropped_list[0].job == jobList.MAFIA_1 ||
        dropped_list[0].job == jobList.MAFIA_2
      ) {
        msg.channel.send("그는 마피아였습니다.");
      }
      memberObjects = memberObjects.filter((object) => {
        return object !== dropped_list[0];
      });
    } else if (dropped_list.length > 1) {
      //최다 득표가 여러 명
      msg.channel.send(
        `${dropped_list.length}명의 최다 득표자가 나와 투표가 무효 처리되었습니다. (${max_vote}표)`
      );
    } else {
      //득표 없음(기권)
      msg.channel.send("투표가 0표이므로 자동 기권 처리됩니다.");
    }
    checkFinish(msg, memberObjects, currentGamingGuildList);
  });
}

function checkFinish(
  msg: Message,
  memberObjects: { user: User; job: number; dmChannel: DMChannel }[],
  currentGamingGuildList: string[]
) {
  let mafia_num = 0;
  for (let i = 0; i < memberObjects.length; i++) {
    if (
      memberObjects[i].job == jobList.MAFIA_1 ||
      memberObjects[i].job == jobList.MAFIA_2
    ) {
      mafia_num++;
    }
  }
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
    msg.channel.send(gameOverMessage);

    currentGamingGuildList.splice(
      currentGamingGuildList.indexOf(msg.guildId),
      1
    );
    console.log(`${msg.guild.name} 서버에서 게임이 종료되었습니다.`);
  }
}

export default initGame;
