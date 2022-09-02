require('dotenv').config();

const { Client, GatewayIntentBits } = require("discord.js");
const prism = require('prism-media');
const config = require("./config.js");
const {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  entersState,
  AudioPlayerStatus,
  EndBehaviorType,
} = require('@discordjs/voice')
const { Readable } = require('stream');
const { VoiceText } = require('voice-text');
const { Wit } = require('node-wit');

const witai = new Wit({ accessToken: process.env.WITAI_TOKEN });
const voiceText = new VoiceText(process.env.VOICETEXT_TOKEN);
const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ]
});
client.saturn = {
  guild: null,
  text: null,
  voice: null,
  queue: [],
}
const player = createAudioPlayer();

client.on('ready', async () => {
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const prefix = new RegExp(`^<@!?${client.user.id}> |^\\${config.prefix}`).exec(message.content);
  if (!prefix) {
    if (client.saturn.text == message.channel.id) {
      const m = message;
      client.saturn.queue.push(m);
      if (client.saturn.queue.length == 1) {
        speechText();
      }
    }
    return;
  }
  const args = message.content.slice(prefix[0].length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  if (message.guild && !message.member) await message.guild.members.fetch(message.author);

  switch (command) {
    case 'on': {
      const tvc = message.member.voice.channel;
      if (tvc == null) {
        message.reply("VCに入ってから");
        return;
      }
      if (client.saturn.voice && client.saturn.voice != tvc.id) {
        disconnectVC();
      }
      const connection = joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.guild.id,
        adapterCreator: message.channel.guild.voiceAdapterCreator
      })
      client.saturn.guild = message.guild.id;
      client.saturn.text = message.channel.id;
      client.saturn.voice = tvc.id
      connection.subscribe(player)
      connection.receiver.speaking.on("start", transcriber);
      break;
    }
    case 'off':
      disconnectVC();
      break;
    default:
      message.reply(`${config.prefix}on で開始. ${config.prefix}off で終了.`);
  }
});

client.on("voiceStateUpdate", (oldState, newState) => {
  if (client.saturn.voice == null) return;
  if (oldState.channel && oldState.channel.members.size > 0) {
    bots = oldState.channel.members.filter(member => member.user.bot);
    if (oldState.channel.members.size == bots.size) {
      disconnectVC();
    }
  }
});

async function speechText() {
  const m = client.saturn.queue.shift();
  if (m == undefined || !m) {
    return;
  }
  try {
    await speech(sanitize(m.content));
  } finally {
    speechText(client);
  }
}

async function speech(content) {
  // https://cloud.voicetext.jp/webapi/docs/api
  const texts = content.match(/.{1,200}/g);
  const msg = texts.shift();
  await voiceText.fetchBuffer(msg, {
    speaker: config.speaker,
    speed: config.speed,
    pitch: config.pitch,
  }).then(async (buffer) => {
    const stream = Readable.from(buffer);
    const resource = createAudioResource(stream);
    player.play(resource);
    await entersState(player, AudioPlayerStatus.Playing, 1e5);
  });
  await entersState(player, AudioPlayerStatus.Idle, 1e6);
  if (texts.length > 0) {
    await speech(texts.join(""));
  }
}

function sanitize(str) {
  const pat = /<@!?(\d*)>/;
  while (true) {
    const matchAllElement = str.match(pat);
    if (matchAllElement == null) break;
    str = str.replace(matchAllElement[0], client.users.resolve(matchAllElement[1]).username);
  }
  return str.replace(/https?:\/\/\S+/g, '')
    .replace(/<a?:.*?:\d+>/g, '');
};

function disconnectVC() {
  const connection = getVoiceConnection(client.saturn.guild);
  if (connection) connection.destroy();
  client.saturn.guild = null;
  client.saturn.voice = null;
  client.saturn.text = null;
}
const transcriber = (userId) => {
  const connection = getVoiceConnection(client.saturn.guild);
  const { receiver } = connection;
  const opusStream = receiver.subscribe(userId, {
    end: {
      behavior: EndBehaviorType.AfterSilence,
      duration: 300,
    },
  });
  const bufferData = [];
  opusStream
    .pipe(new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 }))
    .on("data", (data) => {
      bufferData.push(data);
    });
  opusStream.on("end", async () => {
    const user = client.users.cache.get(userId);
    if (!user) return;
    const member = client.guilds.resolve(client.saturn.guild).members.resolve(userId)
    if (!member) return;
    const stereoBuffer = Buffer.concat(bufferData);
    const monoBuffer = convertStereoToMono(stereoBuffer);
    const duration = getDurationFromMonoBuffer(monoBuffer);
    if (duration < 1 || duration > 19) return;
    const response = await witai.dictation(
      'audio/raw;encoding=signed-integer;bits=16;rate=48k;endian=little',
      Readable.from(monoBuffer)
    );
    if (response.text) {
      displayName = member.displayName.length > 10 ? member.displayName.slice(0, 10) + "..." : member.displayName;
      client.channels.cache.get(client.saturn.text).send(`${displayName}:\n　${response.text}`);
    }
  });
}

function convertStereoToMono(input) {
  const stereoData = new Int16Array(input);
  const monoData = new Int16Array(stereoData.length / 2);
  for (let i = 0, j = 0; i < stereoData.length; i += 4) {
    monoData[j] = stereoData[i];
    j += 1;
    monoData[j] = stereoData[i + 1];
    j += 1;
  }
  return Buffer.from(monoData);
}

function getDurationFromMonoBuffer(buffer) {
  const duration = buffer.length / 48000 / 2;
  return duration;
}


client.login();

