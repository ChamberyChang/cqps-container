import nhentai from './nhentai';
import getSource from './getSource';
import CQ from './CQcode';
import shorten from './urlShorten/is.gd';
import { URL } from 'url';
import pixivShorten from './urlShorten/pixiv';
import logError from './logError';
const { get } = require('./axiosProxy');

let hostsI = 0;

const snDB = {
  all: 999,
  pixiv: 5,
  danbooru: 9,
  doujin: 18,
  anime: 21,
};

const exts = {
  j: 'jpg',
  p: 'png',
  g: 'gif',
};

const saucenaoApiKeyAddition = global.config.saucenaoApiKey ? { api_key: global.config.saucenaoApiKey } : {};

/**
 * saucenao搜索
 *
 * @param {string} imgURL 图片地址
 * @param {string} db 搜索库
 * @param {boolean} [debug=false] 是否调试
 * @returns Promise 返回消息、返回提示
 */
async function doSearch(imgURL, db, debug = false) {
  const hosts = global.config.saucenaoHost;
  const hostIndex = hostsI++ % hosts.length; // 决定当前使用的host
  let warnMsg = ''; // 返回提示
  let msg = global.config.bot.replys.failed; // 返回消息
  let success = false;
  let lowAcc = false;
  let excess = false;

  await getSearchResult(hosts[hostIndex], imgURL, db)
    .then(async ret => {
      const data = ret.data;

      // 如果是调试模式
      if (debug) {
        console.log(`${getTime()} saucenao[${hostIndex}] ${hosts[hostIndex]}`);
        console.log(JSON.stringify(data));
      }

      // 确保回应正确
      if (data.results && data.results.length > 0) {
        let {
          header: {
            short_remaining, // 短时剩余
            long_remaining, // 长时剩余
            similarity, // 相似度
            thumbnail, // 缩略图
          },
          data: {
            ext_urls,
            title, // 标题
            member_name, // 作者
            member_id, // 可能 pixiv uid
            eng_name, // 本子名
            jp_name, // 本子名
          },
        } = data.results[0];

        let url = ''; // 结果链接
        let source = null;
        if (ext_urls) {
          url = ext_urls[0];
          // 如果结果有多个，优先取danbooru
          for (let i = 1; i < ext_urls.length; i++) {
            if (ext_urls[i].indexOf('danbooru') !== -1) url = ext_urls[i];
          }
          url = url.replace('http://', 'https://');
          // 若为danbooru则获取来源
          source = await getSource(url).catch(() => null);
        }

        if (!title) title = url.indexOf('anidb.net') === -1 ? 'Saucenao結果' : 'AniDB';

        let doujinName = jp_name || eng_name; // 本子名

        if (member_name && member_name.length > 0) title = `\n「${title}」/「${member_name}」`;

        // 剩余搜图次数
        if (long_remaining < 20) warnMsg += `saucenao-${hostIndex}：あんたは一日${long_remaining}回の男だよ\n`;
        else if (short_remaining < 5) warnMsg += `saucenao-${hostIndex}：３０秒内${short_remaining}回をやったんじゃん\n`;
        // 相似度
        if (similarity < global.config.bot.saucenaoLowAcc) {
          lowAcc = true;
          warnMsg += `${similarity}% 似合わないそうだ\n`;
          if (global.config.bot.useAscii2dWhenLowAcc && (db === snDB.all || db === snDB.pixiv))
            warnMsg += 'ascii2dモード！\n';
        }

        // 回复的消息
        msg = await getShareText({
          url,
          title: `SauceNAO (${similarity}%)${title}`,
          thumbnail:
            global.config.bot.hideImgWhenLowAcc && similarity < global.config.bot.saucenaoLowAcc ? null : thumbnail,
          author_url: member_id && url.indexOf('pixiv.net') >= 0 ? `https://pixiv.net/u/${member_id}` : null,
          source,
        });

        success = true;

        // 如果是本子
        if (doujinName) {
          doujinName = doujinName.replace('(English)', '');
          const doujin = await nhentai(doujinName).catch(e => {
            logError(`${getTime()} [error] nhentai`);
            logError(e);
            return false;
          });
          // 有本子搜索结果的话
          if (doujin) {
            thumbnail = `https://t.nhentai.net/galleries/${doujin.media_id}/cover.${exts[doujin.images.thumbnail.t]}`;
            url = `https://nhentai.net/g/${doujin.id}/`;
          } else {
            success = false;
            warnMsg +=
              'nhentai：おうお前らクルルァについてこい\n';
          }
          msg = await getShareText({
            url,
            title: `(${similarity}%) ${doujinName}`,
            thumbnail:
              global.config.bot.hideImgWhenLowAcc && similarity < global.config.bot.saucenaoLowAcc ? null : thumbnail,
          });
        }

        // 处理返回提示
        if (warnMsg.length > 0) warnMsg = warnMsg.trim();
      } else if (data.header.message) {
        switch (data.header.message) {
          case 'Specified file no longer exists on the remote server!':
            msg = 'ワンワン鳴いてみろよ';
            break;

          case 'Problem with remote server...':
            msg = `saucenao-${hostIndex} 汚ねぇケツだなぁ！`;
            break;

          default:
            logError(data);
            msg = `saucenao-${hostIndex} ${data.header.message}`;
            break;
        }
      } else {
        logError(`${getTime()} [error] saucenao[${hostIndex}][data]`);
        logError(data);
      }
    })
    .catch(e => {
      logError(`${getTime()} [error] saucenao[${hostIndex}][request]`);
      if (e.response) {
        if (e.response.status === 429) {
          msg = `saucenao-${hostIndex} お前初めてかここは、力抜けよ`;
          excess = true;
        } else logError(e.response.data);
      } else logError(e);
    });

  return {
    success,
    msg,
    warnMsg,
    lowAcc,
    excess,
  };
}

/**
 * 链接混淆
 *
 * @param {string} url
 * @returns
 */
async function confuseURL(url) {
  const { host } = new URL(url);
  if (['danbooru.donmai.us', 'konachan.com', 'yande.re'].includes(host)) {
    const { result, path, error } = await shorten(url);
    return error ? result : `https://j.loli.best/#${path}`;
  }
  return pixivShorten(url);
}

async function getShareText({ url, title, thumbnail, author_url, source }) {
  const texts = [title];
  if (thumbnail && !global.config.bot.hideImg) texts.push(CQ.img(thumbnail));
  else texts.push(`预览：${thumbnail}`);
  if (url) texts.push(await confuseURL(url));
  if (author_url) texts.push(`作者：${await confuseURL(author_url)}`);
  if (source) texts.push(`来源：${await confuseURL(source)}`);
  return texts.join('\n');
}

/**
 * 取得搜图结果
 *
 * @param {string} host 自定义saucenao的host
 * @param {string} imgURL 欲搜索的图片链接
 * @param {number} [db=999] 搜索库
 * @returns Axios对象
 */
function getSearchResult(host, imgURL, db = 999) {
  if (host === 'saucenao.com') host = `https://${host}`;
  else if (!/^https?:\/\//.test(host)) host = `http://${host}`;
  return get(`${host}/search.php`, {
    params: {
      ...saucenaoApiKeyAddition,
      db: db,
      output_type: 2,
      numres: 3,
      url: imgURL,
    },
  });
}

function getTime() {
  return new Date().toLocaleString();
}

export default doSearch;

export { snDB };