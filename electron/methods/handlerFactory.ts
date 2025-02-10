import type { BrowserWindow } from 'electron';

export function pushNoticeInfoFC(win: BrowserWindow) {
    const pushNoticeInfo = (param: {
        noticeinfo: string,
        noticeinfohtml: string,
    }) => win.webContents.send('push-notice-info', param);
    return pushNoticeInfo;
}

export function updateProgressInfoFC(win: BrowserWindow) {
    const updateProgressInfo = (param: {
        fraction: number,
        indication: string,
    }) => win.webContents.send('update-progress-info', param);
    return updateProgressInfo;
}

export function pushDebugLogFC(win: BrowserWindow) {
    const pushDebugLog = (logContent: string) => win.webContents.send('push-debug-log', logContent);
    return pushDebugLog;
}