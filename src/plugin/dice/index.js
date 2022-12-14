import _ from 'lodash';
import RandomSeed from 'random-seed';
import SanCheck from './sancheck';
import Roll from './roll';
import genDND from './genDND';
import genCOC from './genCOC';

const rand = RandomSeed.create();

/**
 * 骰子监听
 * @param {String} context 接收内容
 * @param {Boolean} reply 开启回复
 * @returns
 */
async function diceHandler(context, reply = true) {
  var msg = new String(context.message).toLowerCase();
  var res = "";
  if (msg[0] == '-' && msg[1] == '-') {
    var commands = new String(msg).substring(2, msg.length);
    if (commands[0] == 'r') {
      if (commands[1] == 'h') {
        //暗骰
        res = await Roll(new String(commands).substring(2, commands.length));
        global.replyMsg(context, "结果将私聊发送", false, reply);
        global.sendPrivateMsg(context.user_id, res, context.group_id);
        return true;
      } else if (commands[1] == 'a') {
        //检定骰D20
        res = await Assay(new String(commands).substring(2, commands.length));
        global.replyMsg(context, res, false, reply);
        return true;
      } else if (commands[1] == 'c') {
        //检定骰D100
        res = await Check(new String(commands).substring(2, commands.length));
        global.replyMsg(context, res, false, reply);
        return true;
      } else {
        //正常投点
        res = await Roll(new String(commands).substring(1, commands.length));
        global.replyMsg(context, res, false, reply);
        return true;
      }
    } else if (commands[0] == "s" && commands[1] == "c") {
      res = await SanCheck(new String(commands).substring(2, commands.length));
      global.replyMsg(context, res, false, reply);
      return true;
    } else if (commands == 'coc') {
      res = await genCOC();
      global.replyMsg(context, res, false, reply);
      return true;
    } else if (commands == 'dnd') {
      res = await genDND();
      global.replyMsg(context, res, false, reply);
      return true;
    }
  }
  return false;
}

/**
 * 检定D20
 * @param {String} i 输入
 * @returns {Promise<string>} 输出结果
 */
async function Assay(i){
  if (i != "") {
    const diceAssay = /\s((?:[1-9]?\d))$/.exec(i);
    if(diceAssay) {
      if(~~diceAssay[0] <= 20){
        const randDice = rand.intBetween(1, 20);
        var result = AssayCompare(randDice, ~~diceAssay[0], 20);
        if (result) {
          var Text = `投掷出了：${randDice.toString()}`;
          Text += `\n${result}`;
          return Text;
        }
      }
    }
  }
  return false;
}

/**
 * 检定D100
 * @param {String} i 输入
 * @returns {Promise<string>} 输出结果
 */
async function Check(i){
  if (i != "") {
    const diceCheck = /\s((?:[1-9]?\d|100))$/.exec(i);
    if(diceCheck){
      const randDice = rand.intBetween(1, 100);
      var result = CheckCompare(randDice, ~~diceCheck[0], 100);
      if(result){
        var Text = `投掷出了：${randDice.toString()}`;
        Text += `\n${result}`;
        return Text;
      }
    }
  }
  return false;
}

/**
 * 判定比较
 * @param {int} Sum 数值
 * @param {int} skill 技能
 * @param {int} SumMax 数值上限
 * @returns
 */
function AssayCompare(Sum, skill) {
  var result = '';
  if (Sum > 19 && Sum >= skill) {
    result = "**大成功**";
    return result;
  } else if (Sum < 2 && Sum < skill) {
    result = "**大失败**";
    return result;
  } else if (Sum <= 19 && Sum >= skill) {
    result = "**成功**"
    return result;
  } else if (Sum >= 2 && Sum < skill) {
    result = "**失败**";
    return result;
  } else return false;
}

/**
 * 判定比较
 * @param {int} Sum 数值
 * @param {int} skill 技能
 * @param {int} SumMax 数值上限
 * @returns
 */
function CheckCompare(Sum, skill) {
  var result = '';
  if (Sum > 95 && Sum > skill) {
    result = "**大失败**";
    return result;
  } else if (Sum <= 5 && Sum <= skill) {
    result = "**大成功**";
    return result;
  } else if (Sum <= 95 && Sum > skill * 11/10) {
    result = "**失败**"
    return result;
  } else if (Sum > skill && Sum <= skill * 11/10) {
    result = "**炼狱**";
    return result;
  } else if (Sum > skill * 9/10 && Sum <= skill) {
    result = "**困难**";
    return result;
  } else if (Sum > 5 && Sum <= skill * 9/10) {
    result = "**成功**";
    return result;
  } else return false;
}

export default diceHandler;
