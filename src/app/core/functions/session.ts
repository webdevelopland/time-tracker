import * as Proto from 'src/proto';
import { Session } from '@/core/type';
import {
  timestampToDuration,
  timestampToTime,
  timestampToDate,
} from '@/core/functions';

export function getSessions(bubble: Proto.Bubble, cb?: Function): Session[] {
  const sessions: Session[] = [];
  let start: number;
  let sessionDuration: number = 0;
  let skip: boolean;
  let n: number = 1;
  const sessionList: Proto.Session[] = bubble.getSessionList();
  sessionList.forEach((session, index) => {
    const nextSession: Proto.Session = sessionList[index + 1];
    skip = false;
    if (nextSession) {
      const breakDuration: number = nextSession.getStartedMs() - session.getEndedMs();
      if (breakDuration < 1000 * 60 * 5) {
        skip = true;
      }
    }
    sessionDuration += session.getEndedMs() - session.getStartedMs();
    if (!start) {
      start = session.getStartedMs();
    }
    if (skip) {
      return;
    }
    sessions.push({
      index: n,
      start: timestampToTime(start),
      end: timestampToTime(session.getEndedMs()),
      duration: timestampToDuration(sessionDuration),
      date: getSessionDate(session, sessionList[index - 1], n),
    });
    start = undefined;
    n++;
    if (index !== sessionList.length - 1) {
      sessionDuration = 0;
    }
  });
  if (cb) {
    cb(sessionDuration);
  }
  return sessions;
}

function getSessionDate(session: Proto.Session, prevSession: Proto.Session, n: number): string {
  if (!prevSession || n === 1 || (prevSession && !isOnSameDay(
    session.getStartedMs(),
    session.getEndedMs(),
    prevSession.getEndedMs(),
  ))) {
    return timestampToDate(session.getEndedMs());
  } else {
    return '';
  }
}

function isOnSameDay(ms1: number, ms2: number, ms3: number): boolean {
  const date1 = new Date(ms1);
  const date2 = new Date(ms2);
  const date3 = new Date(ms3);
  return date1.getDate() === date2.getDate() && date2.getDate() === date3.getDate();
}
