// The Message class
export class Msg {
    public constructor(msg: string, priority?: number, delaySeconds?: number) {

        this._msg = msg;
        if (priority && !isNaN(priority)) this._priority = priority;
        if (delaySeconds && !isNaN(delaySeconds)) this._delaySeconds = delaySeconds;
    }

    public getMsg() {
        return this._msg;
    }

    public getPriority() {
        return this._priority;
    }

    public getDelaySeconds() {
        return this._delaySeconds;
    }

    // message content
    private _msg: string;
    // message priority
    private _priority = 8;
    // message delay to visible, in seconds
    private _delaySeconds = 0;
}
