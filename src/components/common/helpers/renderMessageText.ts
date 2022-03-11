import { ApiMessage, ApiMessageEntityTypes } from '../../../api/types';
import {
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
import { decryptText } from '../../../modules/helpers/bridgeCrypto';
import { getGlobal } from '../../../lib/teact/teactn';
import { KEY_CHECK } from '../../../bridgeConfig';

export type { TextPart };

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
    if(!correct) console.log("[BRIDGE] WARNING: Wrong Key for message!")
  }

  var finalText = symKey ? decryptText(text, symKey, check) : text;
  // console.log("[BRIDGE]", "TRUNCATE LENGTH:", truncateLength);
  

  //PIN: Text messages are rendered here

  return renderTextWithEntities(
    trimText(text, truncateLength),
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
