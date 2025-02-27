/// <reference path="Interfaces.ts" />
/// <reference path="ali-mns.ts" />

import {GA} from "./GA";
import {IMQ, IMQBatch, INotifyRecvBatch} from "./Interfaces";
import {MQ} from "./MQ";
import Events from 'events';

import Promise from 'promise'
import debug0 from "debug"

const debug = debug0('ali-mns');

export class NotifyRecv implements INotifyRecvBatch {
    public constructor(mq: IMQ) {
        this._mq = mq;

        // emitter
        this._emitter = new Events.EventEmitter();

        // Google Analytics
        if (mq instanceof MQ) {
            var account = mq.getAccount();
            this._ga = new GA(account.getAccountId());
            this._ga.disableGA(!account.getGA());
        }
    }

    // 消息通知.每当有消息收到时,都调用cb回调函数
    // 如果cb返回true,那么将删除消息,否则保留消息
    public notifyRecv(cb: (ex: Error | null, msg: any) => Boolean, waitSeconds?: number, numOfMessages?: number) {
        this._signalSTOP = false;
        this._timeoutCount = 0;
        this.notifyRecvInternal(cb, waitSeconds, numOfMessages);
        // Google Analytics
        if (this._ga) this._ga.send("NotifyRecv.notifyRecv", 0, "");
    }

    // 停止消息通知
    public notifyStopP() {
        if (this._signalSTOP)
            return Promise.resolve(this._evStopped);
        // Google Analytics
        if (this._ga) this._ga.send("NotifyRecv.notifyStopP", 0, "");

        this._signalSTOP = true;
        return new Promise((resolve) => {
            this._emitter.once(this._evStopped, () => {
                resolve(this._evStopped);
            });
        });
    }

    private notifyRecvInternal(cb: (ex: Error | null, msg: any) => Boolean, waitSeconds?: number, numOfMessages?: number) {
        // This signal will be triggered by notifyStopP()
        if (this._signalSTOP) {
            debug("notifyStopped");
            this._emitter.emit(this._evStopped);
            return;
        }

        debug("notifyRecvInternal()");

        try {
            var mqBatch: IMQBatch = this._mq;
            mqBatch.recvP(waitSeconds, numOfMessages).done((dataRecv) => {
                try {
                    debug(dataRecv);
                    this._timeoutCount = 0;
                    if (cb(null, dataRecv)) {
                        this.deleteP(dataRecv)
                            .done(null, (ex) => {
                                console.log(ex);
                            });
                    }
                } catch (ex) {
                    // ignore any ex throw from cb
                    console.warn(ex);
                }
                this.notifyRecvInternal(cb, waitSeconds, numOfMessages);
            }, (ex) => {
                debug(ex);
                if ((!ex.Error) || (ex.Error.Code !== "MessageNotExist")) {
                    cb(ex, null);
                }

                if (ex) {
                    if (ex.message === "timeout") {
                        this._timeoutCount++;
                        if (this._timeoutCount > this._timeoutMax) {
                            // 极度可能网络底层断了
                            cb(new Error("NetworkBroken"), null);
                        }
                    } else if (ex.Error && ex.Error.Code === "MessageNotExist") {
                        this._timeoutCount = 0;
                    }
                }

                process.nextTick(() => {
                    this.notifyRecvInternal(cb, waitSeconds, numOfMessages);
                });
            });
        } catch (ex) {
            // ignore any ex
            console.warn(ex);
            // 过5秒重试
            debug("Retry after 5 seconds");
            setTimeout(() => {
                this.notifyRecvInternal(cb, waitSeconds, numOfMessages);
            }, 5000);
        }
    }

    private deleteP(dataRecv: any) {
        if (dataRecv) {
            if (dataRecv.Message) {
                return this._mq.deleteP(dataRecv.Message.ReceiptHandle);
            } else if (dataRecv.Messages && dataRecv.Messages.Message) {
                var rhs = new Array<any>();
                for (var i = 0; i < dataRecv.Messages.Message.length; i++) {
                    rhs.push(dataRecv.Messages.Message[i].ReceiptHandle);
                }
                var mqBatch: IMQBatch = this._mq;
                return mqBatch.deleteP(rhs);
            } else {
                return Promise.resolve(dataRecv);
            }
        } else {
            return Promise.resolve(dataRecv);
        }
    }

    private _mq: IMQ;
    private _signalSTOP = true;

    private _evStopped = "AliMNS_MQ_NOTIFY_STOPPED";
    private _emitter: any;

    // 连续timeout计数器
    // 在某种未知的原因下,网络底层链接断了
    // 这时在程序内部的重试无法促使网络重连,以后的重试都是徒劳的
    // 如果连续发生反复重试都依然timeout,那么极有可能已经发生此种情况了
    // 这时抛出NetworkBroken异常
    private _timeoutCount = 0;
    private _timeoutMax = 128;

    private _ga: GA | null = null;
}
