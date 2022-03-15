import { ApiMessage, ApiMessageEntityTypes, ApiUserReaction, ApiReactions } from '../../../api/types';
import {
  checkIfReactionAdded,
  getMessageSummaryDescription,
  getMessageSummaryEmoji,
  getMessageSummaryText,
  getMessageText,
  TRUNCATED_SUMMARY_LENGTH,
} from '../../../modules/helpers';
import { LangFn } from '../../../hooks/useLang';
import renderText from './renderText';
import { renderTextWithEntities, TextPart } from './renderTextWithEntities';
import trimText from '../../../util/trimText';
import { decryptText, decryptTextConfirmEncryption, EncryptionStatus } from '../../../modules/helpers/bridgeCrypto';
import { getGlobal, setGlobal } from '../../../lib/teact/teactn';
import { KEY_CHECK } from '../../../bridgeConfig';
import { buildMessageReactions } from '../../../api/gramjs/apiBuilders/messages';
import { Api } from '../../../lib/gramjs';
import { selectChatMessage } from '../../../modules/selectors/messages';
import { selectChat } from '../../../modules/selectors/chats';
import { areDeepEqual } from '../../../util/areDeepEqual';
import { updateChatMessage } from '../../../modules/reducers';
import { notifyAboutMessage } from '../../../util/notifications';
import { updater } from '../../../api/gramjs/updater';

export type { TextPart };

export function renderMessageTextConfirmEncryption(
  message: ApiMessage,
  highlight?: string,
  shouldRenderHqEmoji?: boolean,
  isSimple?: boolean,
  truncateLength?: number,
) {
  const { text, entities } = message.content.text || {};

  var symKey;
  var global = getGlobal();
  if(global.bridge && global.bridge.symKeys){
    symKey = global.bridge.symKeys[message.chatId];
  }
  if (!text) {
    const contentNotSupportedText = getMessageText(message);
    return contentNotSupportedText ? [trimText(contentNotSupportedText, truncateLength)] : undefined;
  }


  var status: EncryptionStatus = 'not_encrypted';

  var finalText;
  if(symKey){
    var result = decryptTextConfirmEncryption(text, symKey);
    finalText = result.text;
    status = result.status;
  }else{
    finalText = text;
    //setOfflineReaction("‼️");
  }

  //PIN: Text messages are rendered here

  return {
    textParts: renderTextWithEntities(
      trimText(finalText, truncateLength),
      entities,
      highlight,
      shouldRenderHqEmoji,
      undefined,
      message.id,
      isSimple,
    ),
    status
  }
}

export function renderMessageText(
  message: ApiMessage,
  highlight?: string,
  shouldRenderHqEmoji?: boolean,
  isSimple?: boolean,
  truncateLength?: number,
) {
  const { text, entities } = message.content.text || {};

  var symKey;
  var global = getGlobal();
  if(global.bridge && global.bridge.symKeys){
    symKey = global.bridge.symKeys[message.chatId];
  }
  if (!text) {
    const contentNotSupportedText = getMessageText(message);
    return contentNotSupportedText ? [trimText(contentNotSupportedText, truncateLength)] : undefined;
  }


  var check;
  //SETTING: use key check
  if(KEY_CHECK) check = (correct: boolean) => {
    if(!correct) console.log("[BRIDGE] WARNING: Wrong Key for message!");
  }

  var finalText;
  if(symKey){
    finalText = decryptText(text, symKey, check);
  }else{
    finalText = text;
  }
  // console.log("[BRIDGE]", "TRUNCATE LENGTH:", truncateLength);
  
  //PIN: Text messages are rendered here

  return renderTextWithEntities(
    trimText(finalText, truncateLength),
    entities,
    highlight,
    shouldRenderHqEmoji,
    undefined,
    message.id,
    isSimple,
  );
}

export function renderMessageSummary(
  lang: LangFn,
  message: ApiMessage,
  noEmoji = false,
  highlight?: string,
  truncateLength = TRUNCATED_SUMMARY_LENGTH,
): TextPart[] {
  let { entities } = message.content.text || {};

  const hasSpoilers = entities?.some((e) => e.type === ApiMessageEntityTypes.Spoiler);
  if (!hasSpoilers) {
    const text = trimText(getMessageSummaryText(lang, message, noEmoji), truncateLength);

    if (highlight) {
      return renderText(text, ['emoji', 'highlight'], { highlight });
    } else {
      return renderText(text);
    }
  }

  const emoji = !noEmoji && getMessageSummaryEmoji(message);
  const emojiWithSpace = emoji ? `${emoji} ` : '';

  const text = renderMessageText(message, highlight, undefined, true, truncateLength);
  const description = getMessageSummaryDescription(lang, message, text);

  return [
    emojiWithSpace,
    ...(Array.isArray(description) ? description : [description]),
  ].filter<TextPart>(Boolean);
}
