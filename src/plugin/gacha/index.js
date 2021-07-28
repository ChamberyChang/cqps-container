import _ from 'lodash';
import random from './random';

export default ctx => {
  const decks = global.config.bot.gacha;
  let stop = false;

  for (let { file, regexp, freq } of decks) {
    if ([file, regexp, freq].some(v => !(typeof v === 'string' && v.length))) continue;

    const reg = new RegExp(regexp);
    const exec = reg.exec(ctx.message);
    if (!exec) continue;

    stop = true;

    const replyMsg = random( file, freq );
    if (replyMsg.length) global.replyMsg(ctx, replyMsg, true);
    break;
  }

  return stop;
};


