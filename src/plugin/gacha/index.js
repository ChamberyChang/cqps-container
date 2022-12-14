import random from './random';

export default async ctx => {
  const decks = global.config.bot.gacha;
  let stop = false;

  for (const { file, regexp, freq } of decks) {
    if ([file, regexp, freq].some(v => !(typeof v === 'string' && v.length))) continue;

    const regStyle = "(^" + regexp + "$)";
    const reg = new RegExp(regStyle);
    const exec = reg.exec(ctx.message);
    if (!exec) continue;

    stop = true;

    const replyMsg = random(file, parseInt(freq, 10));
    if (replyMsg.length) global.replyMsg(ctx, replyMsg, false, true);
    break;
  }

  return stop;
};


